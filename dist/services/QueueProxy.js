'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.initRabbit = exports.enqueueCrawlerMessage = exports.enqueuePipelineMessage = exports.AMBAR_CRAWLER_MESSAGE_DEFAULT_TTL = exports.AMBAR_CRAWLER_EXCHANGE = exports.AMBAR_CRAWLER_QUEUE_MAX_PRIORITY = exports.AMBAR_CRAWLER_QUEUE = exports.AMBAR_PIPELINE_WAITING_QUEUE_TTL = exports.AMBAR_PIPELINE_WAITING_EXCHANGE = exports.AMBAR_PIPELINE_WAITING_QUEUE = exports.AMBAR_PIPELINE_EXCHANGE = exports.AMBAR_PIPELINE_QUEUE_MAX_PRIORITY = exports.AMBAR_PIPELINE_QUEUE = undefined;var _amqplib = require('amqplib');var _amqplib2 = _interopRequireDefault(_amqplib);
var _index = require('./index');
var _moment = require('moment');var _moment2 = _interopRequireDefault(_moment);
var _config = require('../config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var AMBAR_PIPELINE_QUEUE = exports.AMBAR_PIPELINE_QUEUE = "AMBAR_PIPELINE_QUEUE";
var AMBAR_PIPELINE_QUEUE_MAX_PRIORITY = exports.AMBAR_PIPELINE_QUEUE_MAX_PRIORITY = 2;
var AMBAR_PIPELINE_EXCHANGE = exports.AMBAR_PIPELINE_EXCHANGE = "AMBAR_PIPELINE_EXCHANGE";
var AMBAR_PIPELINE_WAITING_QUEUE = exports.AMBAR_PIPELINE_WAITING_QUEUE = "AMBAR_PIPELINE_WAITING_QUEUE";
var AMBAR_PIPELINE_WAITING_EXCHANGE = exports.AMBAR_PIPELINE_WAITING_EXCHANGE = "AMBAR_PIPELINE_WAITING_EXCHANGE";

var AMBAR_PIPELINE_WAITING_QUEUE_TTL = exports.AMBAR_PIPELINE_WAITING_QUEUE_TTL = 60 * 60 * 1000;

var AMBAR_CRAWLER_QUEUE = exports.AMBAR_CRAWLER_QUEUE = "AMBAR_CRAWLER_QUEUE";
var AMBAR_CRAWLER_QUEUE_MAX_PRIORITY = exports.AMBAR_CRAWLER_QUEUE_MAX_PRIORITY = 10;
var AMBAR_CRAWLER_EXCHANGE = exports.AMBAR_CRAWLER_EXCHANGE = "AMBAR_CRAWLER_EXCHANGE";

var AMBAR_CRAWLER_MESSAGE_DEFAULT_TTL = exports.AMBAR_CRAWLER_MESSAGE_DEFAULT_TTL = 10 * 1000;

var getPipelineMessagePriority = function getPipelineMessagePriority(storage, fileName) {return new Promise(function (resolve, reject) {
		var regex = /(\.jp[e]*g$)|(\.png$)|(\.bmp$)|(\.tif[f]*$)|(\.pdf$)/i;
		var priority = regex.test(fileName) ? 1 : 2;
		resolve(priority);
	});};

var enqueuePipelineMessage = exports.enqueuePipelineMessage = function enqueuePipelineMessage(storage, message) {return new Promise(function (resolve, reject) {
		var fileName = message.meta.short_name;

		storage.rabbit.createConfirmChannel().
		then(function (channel) {
			return getPipelineMessagePriority(storage, fileName).
			then(function (priority) {
				channel.publish(AMBAR_PIPELINE_EXCHANGE, '', Buffer.from(JSON.stringify(message)), { persistent: true, priority: priority });
				return channel.waitForConfirms().
				then(function () {return channel.close();});
			});
		}).
		then(function () {return resolve();}).
		catch(function (err) {return reject(err);});
	});};

var getCrawlerMessagePriority = function getCrawlerMessagePriority(storage, crawlerUid) {return new Promise(function (resolve, reject) {
		_index.MongoProxy.getCrawlerSettingsByCrawlerUid(storage.mongoDb, crawlerUid).
		then(function (settings) {
			if (!settings.schedule.isActive) {
				resolve(AMBAR_CRAWLER_QUEUE_MAX_PRIORITY);
				return;
			}

			var lastRunMsAgo = _index.DateTimeService.getDateTimeDifferenceFromNow(settings.last_run_time);
			var scheduleIntervalMs = _index.DateTimeService.getCronIntervalInMs(settings.schedule.cron_schedule);

			if (!lastRunMsAgo) {
				resolve(AMBAR_CRAWLER_QUEUE_MAX_PRIORITY);
				return;
			}

			var delayedIntervals = Math.trunc(lastRunMsAgo / scheduleIntervalMs) + 1;

			if (delayedIntervals >= AMBAR_CRAWLER_QUEUE_MAX_PRIORITY) {
				resolve(AMBAR_CRAWLER_QUEUE_MAX_PRIORITY);
				return;
			}

			resolve(delayedIntervals);
		}).
		catch(function (err) {return reject(err);});
	});};

var enqueueCrawlerMessage = exports.enqueueCrawlerMessage = function enqueueCrawlerMessage(storage, message) {var ttl = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : AMBAR_CRAWLER_MESSAGE_DEFAULT_TTL;return new Promise(function (resolve, reject) {
		var crawlerUid = message.uid;

		storage.rabbit.createConfirmChannel().
		then(function (channel) {
			return getCrawlerMessagePriority(storage, crawlerUid).
			then(function (priority) {
				channel.publish(AMBAR_CRAWLER_EXCHANGE, '', Buffer.from(JSON.stringify(message)), { expiration: ttl, priority: priority });
				return channel.waitForConfirms().
				then(function () {return channel.close();});
			});
		}).
		then(function () {return resolve();}).
		catch(function (err) {return reject(err);});
	});};

var initRabbit = exports.initRabbit = new Promise(function (resolve, reject) {
	_amqplib2.default.connect(_config2.default.rabbitHost + '?heartbeat=60').
	then(function (conn) {
		conn.on('error', function (err) {
			console.error('Rabbit error!');
			throw err;
		});

		return conn.createChannel().
		then(function (channel) {
			channel.assertExchange(AMBAR_PIPELINE_EXCHANGE, 'fanout', { durable: false }).
			then(function () {return channel.assertExchange(AMBAR_PIPELINE_WAITING_EXCHANGE,
				'fanout', { durable: false });}).
			then(function () {return channel.assertQueue(AMBAR_PIPELINE_QUEUE,
				{ durable: false, arguments: { 'x-dead-letter-exchange': AMBAR_PIPELINE_WAITING_EXCHANGE, 'x-max-priority': AMBAR_PIPELINE_QUEUE_MAX_PRIORITY } });}).
			then(function () {return channel.assertQueue(AMBAR_PIPELINE_WAITING_QUEUE,
				{ durable: false, arguments: { 'x-dead-letter-exchange': AMBAR_PIPELINE_EXCHANGE, 'x-message-ttl': AMBAR_PIPELINE_WAITING_QUEUE_TTL } });}).
			then(function () {return channel.bindQueue(AMBAR_PIPELINE_QUEUE,
				AMBAR_PIPELINE_EXCHANGE);}).
			then(function () {return channel.bindQueue(AMBAR_PIPELINE_WAITING_QUEUE,
				AMBAR_PIPELINE_WAITING_EXCHANGE);}).
			then(function () {return channel.assertExchange(AMBAR_CRAWLER_EXCHANGE, 'fanout', { durable: false });}).
			then(function () {return channel.assertQueue(AMBAR_CRAWLER_QUEUE, { durable: false, arguments: { 'x-max-priority': AMBAR_CRAWLER_QUEUE_MAX_PRIORITY } });}).
			then(function () {return channel.bindQueue(AMBAR_CRAWLER_QUEUE,
				AMBAR_CRAWLER_EXCHANGE);}).
			then(function () {return channel.close();});
		}).
		then(function () {return resolve(conn);});
	}).
	catch(function (err) {return reject(err);});
});
//# sourceMappingURL=QueueProxy.js.map