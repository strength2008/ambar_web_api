'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.initializeStorage = undefined;var _slicedToArray = function () {function sliceIterator(arr, i) {var _arr = [];var _n = true;var _d = false;var _e = undefined;try {for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {_arr.push(_s.value);if (i && _arr.length === i) break;}} catch (err) {_d = true;_e = err;} finally {try {if (!_n && _i["return"]) _i["return"]();} finally {if (_d) throw _e;}}return _arr;}return function (arr, i) {if (Array.isArray(arr)) {return arr;} else if (Symbol.iterator in Object(arr)) {return sliceIterator(arr, i);} else {throw new TypeError("Invalid attempt to destructure non-iterable instance");}};}();var _mongodb = require('mongodb');
var _elasticsearch = require('elasticsearch');var _elasticsearch2 = _interopRequireDefault(_elasticsearch);
var _redis = require('redis');var _redis2 = _interopRequireDefault(_redis);
var _bluebird = require('bluebird');var _bluebird2 = _interopRequireDefault(_bluebird);
var _index = require('./index.js');
var _config = require('../config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var initializeStorage = exports.initializeStorage = function initializeStorage() {return new Promise(function (resolve, reject) {
		var esClient = new _elasticsearch2.default.Client({
			host: _config2.default.elasticSearchUrl });


		_bluebird2.default.promisifyAll(_redis2.default.RedisClient.prototype);
		_bluebird2.default.promisifyAll(_redis2.default.Multi.prototype);

		var redisClient = _redis2.default.createClient({ host: _config2.default.redisHost, port: _config2.default.redisPort });

		var mongoPromise = new Promise(function (resolve, reject) {
			_mongodb.MongoClient.connect(_config2.default.mongoDbUrl, function (err, db) {
				if (err) {
					console.error(err);
					reject(err);
				}
				resolve(db);
			});
		});

		Promise.all([mongoPromise, _index.QueueProxy.initRabbit, _index.EsProxy.createLogIndexIfNotExist(esClient)]).
		then(function (_ref) {var _ref2 = _slicedToArray(_ref, 2),mongoConnection = _ref2[0],rabbitConnection = _ref2[1];
			var result = {
				elasticSearch: esClient,
				mongoDb: mongoConnection,
				redis: redisClient,
				rabbit: rabbitConnection };

			resolve(result);
		}).
		catch(function (err) {return reject(err);});
	});};
//# sourceMappingURL=StorageService.js.map