'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.removeJob = exports.tryRemoveJob = exports.createNewJob = exports.destroy = exports.init = exports.getExecutingCrawlerContainerNameBySettingsUid = exports.getCrawlerStateBySettingsUid = undefined;var _cron = require('cron');
var _config = require('../config');var _config2 = _interopRequireDefault(_config);
var _index = require('./index');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}function _toConsumableArray(arr) {if (Array.isArray(arr)) {for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {arr2[i] = arr[i];}return arr2;} else {return Array.from(arr);}}

var runningJobs = new Map();

var generateCrawlerName = function generateCrawlerName(index) {return '' + _config2.default.crawlerContainerPrefix + index;};

var getCrawlerStateBySettingsUid = exports.getCrawlerStateBySettingsUid = function getCrawlerStateBySettingsUid(storage, settingsUid) {return new Promise(function (resolve, reject) {
        var redisPromises = [].concat(_toConsumableArray(Array(_config2.default.crawlerCount))).map(function (item, index) {
            return _index.CacheProxy.getCurrentCrawlerTask(storage.redis, generateCrawlerName(index));
        });
        Promise.all(redisPromises).
        then(function (results) {
            results.forEach(function (value, index, array) {
                if (value === settingsUid) {
                    resolve('running');
                    return;
                }
            });
            resolve('idle');
        });
    });};

var getExecutingCrawlerContainerNameBySettingsUid = exports.getExecutingCrawlerContainerNameBySettingsUid = function getExecutingCrawlerContainerNameBySettingsUid(storage, settingsUid) {return new Promise(function (resolve, reject) {
        var redisPromises = [].concat(_toConsumableArray(Array(_config2.default.crawlerCount))).map(function (item, index) {
            var crawlerName = generateCrawlerName(index);
            return _index.CacheProxy.getCurrentCrawlerTask(storage.redis, crawlerName).
            then(function (taskUid) {
                return { crawlerName: crawlerName, uid: taskUid };
            });
        });
        Promise.all(redisPromises).
        then(function (results) {
            results.forEach(function (value, index, array) {
                if (value.uid === settingsUid) {
                    resolve(value.crawlerName);
                    return;
                }
            });
            resolve(null);
        });
    });};

var getCrawlerPromises = function getCrawlerPromises(storage) {
    return [].concat(_toConsumableArray(Array(_config2.default.crawlerCount))).map(function (item, index) {
        var crawlerName = generateCrawlerName(index);

        return _index.DockerProxy.tryRemoveCrawlerContainer(crawlerName).
        then(function () {
            var token = _index.AuthService.generateServiceToken(storage, crawlerName);
            return _index.DockerProxy.createCrawlerContainer(crawlerName, token);
        }).
        then(function () {return _index.CacheProxy.setCurrentCrawlerTask(storage.redis, crawlerName, '');}).
        then(function () {
            return _index.DockerProxy.startCrawlerContainer(crawlerName);
        });
    });
};

var init = exports.init = function init(storage) {return new Promise(function (resolve, reject) {
        var crawlerPromises = getCrawlerPromises(storage);

        Promise.all(crawlerPromises).
        then(function () {
            return _index.MongoProxy.getCrawlersSettings(storage.mongoDb);
        }).
        then(function (crawlers) {
            crawlers.filter(function (c) {return c.schedule.is_active;}).forEach(function (crawler, index, array) {
                createNewJob(storage, crawler);
                console.log('Job for crawler ' + crawler.uid + ' created');
            });
            return;
        }).
        then(function () {
            console.log('Crawler schedule service initialized');
            _index.EsProxy.indexLogItem(
            storage.elasticSearch,
            createLogRecord('info', 'Crawler schedule service initialized'));

            resolve(true);
        }).
        catch(function (err) {
            console.error('Failed to initialize crawler scheduler service. ' + err.toString());
            _index.EsProxy.indexLogItem(
            storage.elasticSearch,
            createLogRecord('error', 'Failed to initialize crawler scheduler service. ' + err.toString()));

            reject(err);
        });
    });};

var destroy = exports.destroy = function destroy(storage) {return new Promise(function (resolve, reject) {
        _index.MongoProxy.getCrawlersSettings(storage.mongoDb).
        then(function (crawlers) {
            crawlers.filter(function (c) {return c.schedule.is_active;}).forEach(function (c) {return tryRemoveJob(c.uid);});

            var crawlerPromises = crawlers.
            map(function (c) {return _index.DockerProxy.tryRemoveCrawlerContainer(c.uid);});

            return crawlerPromises;
        }).
        then(function (crawlerPromises) {return Promise.all(crawlerPromises);}).
        then(function () {
            console.log('Crawler schedule service destroyed');
            _index.EsProxy.indexLogItem(
            storage.elasticSearch,
            createLogRecord('info', 'Crawler schedule service destroyed'));

            resolve(true);
        }).
        catch(function (err) {
            console.error('Failed to destroy scheduler service. ' + err.toString());
            _index.EsProxy.indexLogItem(
            storage.elasticSearch,
            createLogRecord('error', 'Failed to destroy scheduler service. ' + err.toString()));

            reject(err);
        });
    });};

var createNewJob = exports.createNewJob = function createNewJob(storage, crawler) {

    if (runningJobs.has(crawler.uid)) {
        throw new Error('Can\'t add job ' + crawler.uid + ', because it already exists');
    }

    var job = new _cron.CronJob({
        cronTime: crawler.schedule.cron_schedule,
        onTick: function onTick() {return enqueueJob(storage, crawler.uid);},
        start: true });


    runningJobs.set(crawler.uid, job);
};

var tryRemoveJob = exports.tryRemoveJob = function tryRemoveJob(crawlerUid) {
    if (!runningJobs.has(crawlerUid)) {
        return;
    }

    var job = runningJobs.get(crawlerUid);
    job.stop();
    runningJobs.delete(crawlerUid);
};

var removeJob = exports.removeJob = function removeJob(crawlerUid) {
    if (!runningJobs.has(crawlerUid)) {
        throw new Error('Can\'t remove job ' + crawlerUid + ', because it doesn\'t exist');
    }

    tryRemoveJob(crawlerUid);
};

var createLogRecord = function createLogRecord(type, message) {return {
        type: type,
        source_id: 'webapi',
        message: message };};


var enqueueJob = function enqueueJob(storage, crawlerUid) {
    _index.QueueProxy.enqueueCrawlerMessage(storage, { uid: crawlerUid }).
    then(function () {
        console.log('Job \'' + crawlerUid + '\' enqueued');
        _index.EsProxy.indexLogItem(
        storage.elasticSearch,
        createLogRecord('info', 'Job \'' + crawlerUid + '\' enqueued'));
    }).
    catch(function (err) {
        console.error('Failed to enqueue job \'' + crawlerUid + '\'. Error: ' + err.toString());
        _index.EsProxy.indexLogItem(
        storage.elasticSearch,
        createLogRecord('error', 'Failed to enqueue job \'' + crawlerUid + '\'. Error: ' + err.toString()));
    });

};
//# sourceMappingURL=CrawlerSchedulerService.js.map