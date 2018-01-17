'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.createUpdateUserRole = exports.getUsersCount = exports.deleteUser = exports.createUpdateUser = exports.getUserByIndexName = exports.getUserByEmail = exports.getUsers = exports.createThumbnail = exports.getThumbnailById = exports.createBucket = exports.getBucketById = exports.getBucketsByIndexName = exports.removeCrawlerSettingsByIndexName = exports.removeCrawlerSettingsByCrawlerUid = exports.updateCrawlerSettingsLastRunTime = exports.updateCrawlerSettings = exports.createCrawlerSettings = exports.getCrawlerSettingsByCrawlerUid = exports.getCrawlersSettingsByIndexName = exports.getCrawlersSettings = exports.getTaggingRules = exports.initDefaultTaggingRules = exports.getExternalNERs = undefined;var _extends = Object.assign || function (target) {for (var i = 1; i < arguments.length; i++) {var source = arguments[i];for (var key in source) {if (Object.prototype.hasOwnProperty.call(source, key)) {target[key] = source[key];}}}return target;};var _mongodb = require('mongodb');
var _moment = require('moment');var _moment2 = _interopRequireDefault(_moment);
var _config = require('../config');var _config2 = _interopRequireDefault(_config);
var _index = require('./index');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var CRAWLER_DATA = 'crawler_data';
var BUCKET_DATA = 'bucket_data';
var THUMBNAIL_DATA = 'thumbnail_data';
var USER_DATA = 'user_data';
var USER_ROLE_DATA = 'user_role_data';
var AUTO_TAGGING_RULE_DATA = 'auto_tagging_rule_data';
var EXTERNAL_NER_DATA = 'external_ner_data';

// EXTERNAL NERS
var getExternalNERs = exports.getExternalNERs = function getExternalNERs(db) {return new Promise(function (resolve, reject) {
        db.collection(EXTERNAL_NER_DATA).
        find().
        toArray(
        function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};

//TAGGING RULES
var initDefaultTaggingRules = exports.initDefaultTaggingRules = function initDefaultTaggingRules(db) {return new Promise(function (resolve, reject) {
        var promises = _config2.default.defaultTaggingRules.map(function (taggingRule) {return (
                new Promise(function (iResolve, iReject) {
                    var ruleId = _index.CryptoService.getSha1('taggingRule_' + taggingRule.name);

                    db.collection(AUTO_TAGGING_RULE_DATA).
                    updateOne({ id: ruleId }, _extends({}, taggingRule, { id: ruleId }), { upsert: true }, function (err, result) {
                        if (err) {
                            iReject(err);
                            return;
                        }

                        iResolve(result);
                    });
                }));});

        Promise.all(promises).
        then(function () {return resolve();}).
        catch(function (err) {return reject(err);});
    });};

var getTaggingRules = exports.getTaggingRules = function getTaggingRules(db) {return new Promise(function (resolve, reject) {
        db.collection(AUTO_TAGGING_RULE_DATA).
        find().
        toArray(
        function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};
//////////////////////////////////////////////////////////////////////////////////////

// CRAWLERS
var getCrawlersSettings = exports.getCrawlersSettings = function getCrawlersSettings(db) {return new Promise(function (resolve, reject) {
        db.collection(CRAWLER_DATA).
        find({ is_removed: false }).
        toArray(
        function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};

var getCrawlersSettingsByIndexName = exports.getCrawlersSettingsByIndexName = function getCrawlersSettingsByIndexName(db, indexName) {return new Promise(function (resolve, reject) {
        db.collection(CRAWLER_DATA).
        find({ is_removed: false, index_name: indexName }).
        toArray(
        function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};

var getCrawlerSettingsByCrawlerUid = exports.getCrawlerSettingsByCrawlerUid = function getCrawlerSettingsByCrawlerUid(db, crawlerUid) {return new Promise(function (resolve, reject) {
        db.collection(CRAWLER_DATA).
        findOne(
        { uid: crawlerUid },
        function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};

var createCrawlerSettings = exports.createCrawlerSettings = function createCrawlerSettings(db, settings) {return new Promise(function (resolve, reject) {
        db.collection(CRAWLER_DATA).
        insertOne(settings, function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};

var updateCrawlerSettings = exports.updateCrawlerSettings = function updateCrawlerSettings(db, settings) {return new Promise(function (resolve, reject) {
        db.collection(CRAWLER_DATA).
        updateOne(
        { uid: settings.uid },
        settings,
        function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });

    });};

var updateCrawlerSettingsLastRunTime = exports.updateCrawlerSettingsLastRunTime = function updateCrawlerSettingsLastRunTime(db, crawlerUid, lastRunTime) {return new Promise(function (resolve, reject) {
        db.collection(CRAWLER_DATA).
        updateOne(
        { uid: crawlerUid },
        { $set: { last_run_time: lastRunTime } },
        function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });

    });};

var removeCrawlerSettingsByCrawlerUid = exports.removeCrawlerSettingsByCrawlerUid = function removeCrawlerSettingsByCrawlerUid(db, crawlerUid) {return new Promise(function (resolve, reject) {
        db.collection(CRAWLER_DATA).
        deleteOne(
        { uid: crawlerUid },
        null,
        function (err, result) {
            if (err) {
                reject(err);
                return;
            }
            resolve(result);
        });
    });};

var removeCrawlerSettingsByIndexName = exports.removeCrawlerSettingsByIndexName = function removeCrawlerSettingsByIndexName(db, indexName) {return new Promise(function (resolve, reject) {
        db.collection(CRAWLER_DATA).
        deleteMany(
        { index_name: indexName },
        null,
        function (err, result) {
            if (err) {
                reject(err);
                return;
            }
            resolve(result);
        });
    });};
//////////////////////////////////////////////////////////////////////////////////////

// BUCKETS
var getBucketsByIndexName = exports.getBucketsByIndexName = function getBucketsByIndexName(db, indexName) {return new Promise(function (resolve, reject) {
        db.collection(BUCKET_DATA).
        find({ index_name: indexName }).
        toArray(
        function (err, result) {
            if (err) {
                reject(err);
                return;
            }
            resolve(result);
        });
    });};

var getBucketById = exports.getBucketById = function getBucketById(db, indexName, bucketId) {return new Promise(function (resolve, reject) {
        db.collection(BUCKET_DATA).
        findOne(
        { id: bucketId, index_name: indexName },
        function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};

var createBucket = exports.createBucket = function createBucket(db, bucket) {return new Promise(function (resolve, reject) {
        db.collection(BUCKET_DATA).
        insertOne(bucket, function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};
//////////////////////////////////////////////////////////////////////////////////////

// THUMBNAILS
var getThumbnailById = exports.getThumbnailById = function getThumbnailById(db, thumbId) {return new Promise(function (resolve, reject) {
        db.collection(THUMBNAIL_DATA).
        findOne(
        { id: thumbId },
        function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};

var createThumbnail = exports.createThumbnail = function createThumbnail(db, thumbId, thumbData) {return new Promise(function (resolve, reject) {
        db.collection(THUMBNAIL_DATA).
        updateOne({ id: thumbId }, { id: thumbId, data: thumbData }, { upsert: true }, function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};
//////////////////////////////////////////////////////////////////////////////////////

// USERS
var getUsers = exports.getUsers = function getUsers(db) {return new Promise(function (resolve, reject) {
        db.collection(USER_DATA).
        find().
        toArray(
        function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};

var getUserByEmail = exports.getUserByEmail = function getUserByEmail(db, email) {return new Promise(function (resolve, reject) {
        db.collection(USER_DATA).
        findOne(
        { email: email },
        function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};

var getUserByIndexName = exports.getUserByIndexName = function getUserByIndexName(db, indexName) {return new Promise(function (resolve, reject) {
        db.collection(USER_DATA).
        findOne(
        { index_name: indexName },
        function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};

var createUpdateUser = exports.createUpdateUser = function createUpdateUser(db, user) {return new Promise(function (resolve, reject) {
        db.collection(USER_DATA).
        updateOne({ email: user.email }, user, { upsert: true }, function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};

var deleteUser = exports.deleteUser = function deleteUser(db, user) {return new Promise(function (resolve, reject) {
        db.collection(USER_DATA).
        deleteOne({ email: user.email },
        null,
        function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};

var getUsersCount = exports.getUsersCount = function getUsersCount(db, defaultEmail) {return new Promise(function (resolve, reject) {
        db.collection(USER_DATA).
        count({
            email: { $ne: defaultEmail } },

        function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};
//////////////////////////////////////////////////////////////////////////////////////

/// ROLES
var createUpdateUserRole = exports.createUpdateUserRole = function createUpdateUserRole(db, role) {return new Promise(function (resolve, reject) {
        db.collection(USER_ROLE_DATA).
        updateOne({ name: role.name }, role, { upsert: true }, function (err, result) {
            if (err) {
                reject(err);
                return;
            }

            resolve(result);
        });
    });};
//# sourceMappingURL=MongoProxy.js.map