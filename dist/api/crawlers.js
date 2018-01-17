'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _extends = Object.assign || function (target) {for (var i = 1; i < arguments.length; i++) {var source = arguments[i];for (var key in source) {if (Object.prototype.hasOwnProperty.call(source, key)) {target[key] = source[key];}}}return target;};var _express = require('express');
var _ErrorResponse = require('../utils/ErrorResponse');var _ErrorResponse2 = _interopRequireDefault(_ErrorResponse);
var _services = require('../services');
var _AmbarCrawlerSettingsBuilder = require('../models/AmbarCrawlerSettingsBuilder');var AmbarCrawlerSettingsBuilder = _interopRequireWildcard(_AmbarCrawlerSettingsBuilder);function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;} else {var newObj = {};if (obj != null) {for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];}}newObj.default = obj;return newObj;}}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var UNDEFINED_STATE = 'undefined';
var DROPBOX_CRAWLER_ID = 'Dropbox';exports.default =

function (_ref) {var config = _ref.config,storage = _ref.storage;
    var api = (0, _express.Router)();

    api.use(_services.AuthService.ensureAuthenticated(storage));

    var crawlerSettingsToUserView = function crawlerSettingsToUserView(crawlerSettings, state) {
        return _extends({},
        crawlerSettings, {
            credentials: _extends({},
            crawlerSettings.credentials, {
                token: crawlerSettings.credentials.token != '' ? '******' : '',
                password: crawlerSettings.credentials.password != '' ? '******' : '' }),

            state: state || UNDEFINED_STATE,
            last_run_time: undefined,
            last_run_time_diff: undefined,
            index_name: undefined,
            is_removed: undefined,
            _id: undefined });

    };

    var crawlerSettingsToShortUserView = function crawlerSettingsToShortUserView(crawlerSettings, state) {
        return {
            id: crawlerSettings.id,
            last_run_time: crawlerSettings.last_run_time,
            last_run_time_diff: crawlerSettings.last_run_time ? _services.DateTimeService.getDateTimeDifferenceFromNowInHumanForm(crawlerSettings.last_run_time) : undefined,
            state: state || UNDEFINED_STATE,
            locations: crawlerSettings.locations };

    };

    ////////////// CALLED FROM UI ACCOUNT PAGE //////////////
    /**
     * Get Dropbox crawler
     */
    api.get('/account/dropbox', function (req, res, next) {
        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        var crawlerUid = AmbarCrawlerSettingsBuilder.getCrawlerUid(DROPBOX_CRAWLER_ID, indexName);

        _services.MongoProxy.getCrawlerSettingsByCrawlerUid(storage.mongoDb, crawlerUid).
        then(function (crawlerSettings) {
            if (!crawlerSettings) {
                res.sendStatus(404);
                return;
            }

            return _services.CrawlerSchedulerService.getCrawlerStateBySettingsUid(storage, crawlerUid).
            then(function (state) {
                var crawler = crawlerSettingsToShortUserView(crawlerSettings, state);
                res.status(200).json(crawler);
            });
        }).
        catch(function (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json(new _ErrorResponse2.default(err.message));
            } else {
                next(err);
            }
        });
    });

    /**
         * Create Dropbox crawler
         */
    api.post('/account/dropbox', function (req, res, next) {var
        body = req.body;

        if (!body) {
            res.status(400).json(new _ErrorResponse2.default('Request body is empty'));
            return;
        }var

        accountId = body.accountId,token = body.token,locations = body.locations;

        if (!accountId || !token || !locations) {
            res.status(400).json(new _ErrorResponse2.default('Please provice account id, token and locations'));
            return;
        }

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        var crawlerUid = AmbarCrawlerSettingsBuilder.getCrawlerUid(DROPBOX_CRAWLER_ID, indexName);

        var settings = AmbarCrawlerSettingsBuilder.buildDropboxCrawlerSettings(DROPBOX_CRAWLER_ID, indexName, accountId, token, locations);

        _services.MongoProxy.getCrawlerSettingsByCrawlerUid(storage.mongoDb, settings.uid).
        then(function (result) {
            if (result) {
                res.status(400).json(new _ErrorResponse2.default('Crawler with uid \'' + settings.id + '\' already exists'));
                return;
            }

            return _services.MongoProxy.createCrawlerSettings(storage.mongoDb, settings).
            then(function () {
                return _services.QueueProxy.enqueueCrawlerMessage(storage, { uid: settings.uid });
            }).
            then(function () {
                if (settings.schedule.is_active) {
                    return _services.CrawlerSchedulerService.createNewJob(storage, settings);
                }
            }).
            then(function () {return res.sendStatus(201);});

        }).
        catch(next);
    });

    /**
         * Delete Dropbox crawler
         */
    api.delete('/account/dropbox/delete', function (req, res, next) {
        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        var crawlerUid = AmbarCrawlerSettingsBuilder.getCrawlerUid(DROPBOX_CRAWLER_ID, indexName);

        _services.MongoProxy.getCrawlerSettingsByCrawlerUid(storage.mongoDb, crawlerUid).
        then(function (crawler) {
            if (!crawler || crawler.is_removed) {
                res.sendStatus(404);
                return;
            }

            return _services.MongoProxy.removeCrawlerSettingsByCrawlerUid(storage.mongoDb, crawlerUid).
            then(function () {return _services.CrawlerSchedulerService.tryRemoveJob(crawlerUid);}).
            then(function () {return _services.DropboxProxy.tryDisableToken(crawler.credentials.token);}).
            then(function (result) {return res.sendStatus(200);});
        }).
        catch(next);
    });

    ////////////// CALLED FROM UI SETTING PAGE //////////////

    /**
     * Add or Update crawler settings (uid is calculated by user email->indexName)
     */
    api.post('/:id', function (req, res, next) {var
        crawlerId = req.params.id,body = req.body;

        if (!_services.AuthService.isSettingsPageAllowed(config, req)) {
            res.status(403).json(new _ErrorResponse2.default('Forbidden'));
            return;
        }

        if (!body) {
            res.status(400).json(new _ErrorResponse2.default('Request body is empty'));
            return;
        }

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        body.id = crawlerId;
        body.index_name = indexName;

        var settings = void 0;
        try {
            /// Here crawler unique id is generated (settings.uid)
            settings = AmbarCrawlerSettingsBuilder.buildCrawlerSettings(body);
        } catch (err) {
            res.status(400).json(new _ErrorResponse2.default(err));
            return;
        }

        _services.MongoProxy.getCrawlerSettingsByCrawlerUid(storage.mongoDb, settings.uid).
        then(function (result) {
            if (!result) {
                return _services.MongoProxy.createCrawlerSettings(storage.mongoDb, settings).
                then(function () {
                    if (settings.schedule.is_active) {
                        return _services.CrawlerSchedulerService.createNewJob(storage, settings);
                    }
                }).
                then(function () {return res.sendStatus(201);});
            }

            return !result.is_removed ?
            _services.MongoProxy.updateCrawlerSettings(storage.mongoDb, settings).
            then(function () {return _services.CrawlerSchedulerService.tryRemoveJob(settings.uid);}).
            then(function () {
                if (settings.schedule.is_active) {
                    return _services.CrawlerSchedulerService.createNewJob(storage, settings);
                }
            }).
            then(function () {return res.sendStatus(200);}) :
            res.status(400).json(new _ErrorResponse2.default('Can\'t update settings for removed crawler \'' + settings.id + '\''));
        }).
        catch(next);
    });

    /**
         * Delete crawler container and its settings (uid is calculated by user email->indexName)
         */
    api.delete('/:id', function (req, res, next) {var
        crawlerId = req.params.id;

        if (!_services.AuthService.isSettingsPageAllowed(config, req)) {
            res.status(403).json(new _ErrorResponse2.default('Forbidden'));
            return;
        }

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        var crawlerUid = AmbarCrawlerSettingsBuilder.getCrawlerUid(crawlerId, indexName);

        _services.MongoProxy.getCrawlerSettingsByCrawlerUid(storage.mongoDb, crawlerUid).
        then(function (result) {
            if (result === null || result.is_removed) {
                res.sendStatus(404);
                return;
            }

            return _services.MongoProxy.removeCrawlerSettingsByCrawlerUid(storage.mongoDb, crawlerUid).
            then(function () {return _services.CrawlerSchedulerService.tryRemoveJob(crawlerUid);}).
            then(function (result) {return res.sendStatus(200);});
        }).
        catch(next);
    });

    /**
         * Get crawlers list (for user, by index name)
         */
    api.get('/', function (req, res, next) {
        if (!_services.AuthService.isSettingsPageAllowed(config, req)) {
            res.status(403).json(new _ErrorResponse2.default('Forbidden'));
            return;
        }

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        _services.MongoProxy.getCrawlersSettingsByIndexName(storage.mongoDb, indexName).
        then(function (crawlerSettings) {
            var promises = crawlerSettings.map(function (cs) {return (
                    _services.CrawlerSchedulerService.getCrawlerStateBySettingsUid(storage, cs.uid).
                    then(function (state) {
                        return crawlerSettingsToUserView(cs, state);
                    }));});


            return Promise.all(promises).
            then(function (crawlers) {
                res.status(200).json(crawlers.sort(function (a, b) {return a.id.localeCompare(b.id);}));
            });
        }).
        catch(next);
    });

    /**
         * Get crawler settings by id (uid is calculated by user email->indexName)
         */
    api.get('/:id', function (req, res, next) {var
        crawlerId = req.params.id;

        if (!_services.AuthService.isSettingsPageAllowed(config, req)) {
            res.status(403).json(new _ErrorResponse2.default('Forbidden'));
            return;
        }

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        var crawlerUid = AmbarCrawlerSettingsBuilder.getCrawlerUid(crawlerId, indexName);

        _services.MongoProxy.getCrawlerSettingsByCrawlerUid(storage.mongoDb, crawlerUid).
        then(function (crawlerSettings) {
            if (!crawlerSettings || crawlerSettings.is_removed) {
                res.sendStatus(404);
                return;
            }

            return _services.CrawlerSchedulerService.getCrawlerStateBySettingsUid(storage, crawlerUid).
            then(function (state) {
                res.status(200).json(crawlerSettingsToUserView(crawlerSettings, state));
            });
        }).
        catch(next);
    });

    /**
         * Start crawler by id (uid is calculated by user email->indexName)
         */
    api.put('/:id/start', function (req, res, next) {var
        crawlerId = req.params.id;

        if (!_services.AuthService.isSettingsPageAllowed(config, req)) {
            res.status(403).json(new _ErrorResponse2.default('Forbidden'));
            return;
        }

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        var crawlerUid = AmbarCrawlerSettingsBuilder.getCrawlerUid(crawlerId, indexName);

        _services.QueueProxy.enqueueCrawlerMessage(storage, { uid: crawlerUid }).
        then(function (result) {return res.sendStatus(200);}).
        catch(next);
    });

    /**
         * Stop crawler by id (uid is calculated by user email->indexName)
         */
    api.put('/:id/stop', function (req, res, next) {var
        crawlerId = req.params.id;

        if (!_services.AuthService.isSettingsPageAllowed(config, req)) {
            res.status(403).json(new _ErrorResponse2.default('Forbidden'));
            return;
        }

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        var crawlerUid = AmbarCrawlerSettingsBuilder.getCrawlerUid(crawlerId, indexName);

        _services.CrawlerSchedulerService.getExecutingCrawlerContainerNameBySettingsUid(storage, crawlerUid).
        then(function (crawlerContainerName) {
            if (!crawlerContainerName) {
                res.sendStatus(200);
                return;
            }

            return _services.DockerProxy.stopCrawlerContainer(crawlerContainerName).
            then(function (result) {
                _services.CacheProxy.setCurrentCrawlerTask(storage.redis, crawlerContainerName, '');
                return _services.DockerProxy.startCrawlerContainer(crawlerContainerName);
            }).
            then(function (result) {
                res.sendStatus(200);
            }).
            catch(function (err) {
                if (err.statusCode && (err.statusCode === 304 || err.statusCode === 404)) {
                    res.sendStatus(err.statusCode);
                } else {
                    next(err);
                }
            });
        });
    });

    ////////////// CALLED BY CRAWLERS ONLY //////////////

    /**
     * Get crawler settings by uid
     */
    api.get('/settings/uid/:uid', function (req, res, next) {var
        crawlerUid = req.params.uid;

        _services.MongoProxy.getCrawlerSettingsByCrawlerUid(storage.mongoDb, crawlerUid).
        then(function (crawlerSettings) {
            if (!crawlerSettings || crawlerSettings.is_removed) {
                res.sendStatus(404);
                return;
            }

            res.status(200).json(crawlerSettings);
        }).
        catch(next);
    });

    /**
         * Report start working on a job
         */
    api.post('/report/start/:uid', function (req, res, next) {var
        crawlerUid = req.params.uid;

        var containerName = _services.AuthService.extractEmailFromHeaders(req);

        _services.CrawlerSchedulerService.getExecutingCrawlerContainerNameBySettingsUid(storage, crawlerUid).
        then(function (crawlerContainerName) {
            if (crawlerContainerName) {
                res.sendStatus(409);
                return;
            }

            return _services.MongoProxy.updateCrawlerSettingsLastRunTime(storage.mongoDb, crawlerUid, _services.DateTimeService.getCurrentDateTime()).
            then(function () {
                _services.CacheProxy.setCurrentCrawlerTask(storage.redis, containerName, crawlerUid);
                res.sendStatus(200);
                return;
            });
        }).
        catch(next);
    });

    /**
         * Report finish working on a job
         */
    api.post('/report/finish', function (req, res, next) {
        var containerName = _services.AuthService.extractEmailFromHeaders(req);

        _services.CacheProxy.setCurrentCrawlerTask(storage.redis, containerName, '');

        res.sendStatus(200);
    });

    return api;
};
//# sourceMappingURL=crawlers.js.map