'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.getTags = exports.removeTag = exports.addTag = exports.setCurrentCrawlerTask = exports.getCurrentCrawlerTask = exports.removeEsIndexContentMaxSize = exports.setEsIndexContentMaxSize = exports.getEsIndexContentMaxSize = exports.removeEsIndexContentSize = exports.setEsIndexContentSize = exports.getEsIndexContentSize = exports.addServiceToken = exports.removeToken = exports.addToken = exports.checkIfTokenExists = exports.addMetaId = exports.checkIfMetaIdExists = undefined;var _index = require('./index');

var checkIfMetaIdExists = exports.checkIfMetaIdExists = function checkIfMetaIdExists(redis, indexName, metaId) {return redis.getAsync('meta:' + indexName + metaId);};
var addMetaId = exports.addMetaId = function addMetaId(redis, indexName, metaId) {redis.set('meta:' + indexName + metaId, _index.DateTimeService.getCurrentDateTime());};

var checkIfTokenExists = exports.checkIfTokenExists = function checkIfTokenExists(redis, token) {return redis.getAsync(token);};
var addToken = exports.addToken = function addToken(redis, token, ttlSeconds) {
    redis.set(token, _index.DateTimeService.getCurrentDateTime());
    redis.expire(token, ttlSeconds);
};
var removeToken = exports.removeToken = function removeToken(redis, token) {
    redis.del(token);
};
var addServiceToken = exports.addServiceToken = function addServiceToken(redis, token) {
    redis.set(token, _index.DateTimeService.getCurrentDateTime());
};

var CONTENT_SETTINGS_EXPIRATION_SECONDS = 10 * 60;

var getEsIndexContentSize = exports.getEsIndexContentSize = function getEsIndexContentSize(redis, elasticSearch, indexName) {return new Promise(function (resolve, reject) {
        redis.getAsync('size:' + indexName).
        then(function (res) {
            if (res) {
                resolve(parseInt(res));
                return;
            }

            return _index.EsProxy.getShortStats(elasticSearch, indexName).
            then(function (stats) {
                var indexSize = stats.aggregations ?
                stats.aggregations.proc_total ?
                stats.aggregations.proc_total.sum ?
                stats.aggregations.proc_total.sum :
                0 :
                0 :
                0;
                redis.set('size:' + indexName, indexSize);
                resolve(parseInt(indexSize));
            });
        }).
        catch(function (err) {return reject(err);});
    });};
var setEsIndexContentSize = exports.setEsIndexContentSize = function setEsIndexContentSize(redis, indexName, size) {redis.set('size:' + indexName, size);};
var removeEsIndexContentSize = exports.removeEsIndexContentSize = function removeEsIndexContentSize(redis, indexName) {redis.del('size:' + indexName);};

var getEsIndexContentMaxSize = exports.getEsIndexContentMaxSize = function getEsIndexContentMaxSize(redis, mongo, indexName) {return new Promise(function (resolve, reject) {
        redis.getAsync('maxsize:' + indexName).
        then(function (res) {
            if (res) {
                resolve(parseInt(res));
                return;
            }

            return _index.MongoProxy.getUserByIndexName(mongo, indexName).
            then(function (user) {
                if (user) {
                    redis.set('maxsize:' + indexName, user.storage_max);
                    redis.expire('maxsize:' + indexName, CONTENT_SETTINGS_EXPIRATION_SECONDS);
                    resolve(parseInt(user.storage_max));
                    return;
                }

                reject(new Error('User with specified index not found'));
            });
        }).
        catch(function (err) {return reject(err);});
    });};
var setEsIndexContentMaxSize = exports.setEsIndexContentMaxSize = function setEsIndexContentMaxSize(redis, indexName, size) {redis.set('maxsize:' + indexName, size);};
var removeEsIndexContentMaxSize = exports.removeEsIndexContentMaxSize = function removeEsIndexContentMaxSize(redis, indexName) {redis.del('maxsize:' + indexName);};

var getCurrentCrawlerTask = exports.getCurrentCrawlerTask = function getCurrentCrawlerTask(redis, crawlerName) {return redis.getAsync('crawlertask:' + crawlerName);};
var setCurrentCrawlerTask = exports.setCurrentCrawlerTask = function setCurrentCrawlerTask(redis, crawlerName, taskUid) {redis.set('crawlertask:' + crawlerName, taskUid);};

var addTag = exports.addTag = function addTag(redis, elasticSearch, indexName, fileId, tag) {return new Promise(function (resolve, reject) {
        _index.EsProxy.indexTag(elasticSearch, indexName, fileId, tag).
        then(function (esResult) {return (
                hasTagsInRedis(redis, indexName).
                then(function (hasTags) {
                    if (hasTags && esResult.result == 'created') {
                        return getTagFilesCount(redis, indexName, tag.name, tag.type).
                        then(function (filesCount) {
                            setTagFilesCount(redis, indexName, tag.name, tag.type, filesCount + 1);
                        });
                    }
                    return Promise.resolve();
                }));}).
        then(function () {return getTags(redis, elasticSearch, indexName);}).
        then(function (tags) {return resolve(tags);}).
        catch(function (err) {return reject(err);});
    });};

var removeTag = exports.removeTag = function removeTag(redis, elasticSearch, indexName, fileId, tag) {return new Promise(function (resolve, reject) {
        _index.EsProxy.deleteTag(elasticSearch, indexName, fileId, tag.id).
        then(function () {return hasTagsInRedis(redis, indexName);}).
        then(function (hasTags) {
            if (hasTags) {
                return getTagFilesCount(redis, indexName, tag.name, tag.type).
                then(function (filesCount) {
                    setTagFilesCount(redis, indexName, tag.name, tag.type, filesCount - 1);
                });
            }
            return Promise.resolve();
        }).
        then(function () {return getTags(redis, elasticSearch, indexName);}).
        then(function (tags) {return resolve(tags);}).
        catch(function (err) {return reject(err);});
    });};

var transformTagsStat = function transformTagsStat(redisResp) {return !redisResp ? [] : Object.keys(redisResp).map(function (tagName) {return {
            name: tagName.split(' ')[1],
            type: tagName.split(' ')[0],
            filesCount: parseInt(redisResp[tagName]) };}).
    sort(function (tagA, tagB) {return tagB.filesCount - tagA.filesCount;});};

var hasTagsInRedis = function hasTagsInRedis(redis, indexName) {return new Promise(function (resolve, reject) {
        redis.existsAsync('tags:' + indexName).
        then(function (res) {return resolve(res == 1 ? true : false);}).
        catch(function (err) {return reject(err);});
    });};

var getTagFilesCount = function getTagFilesCount(redis, indexName, tagName, tagType) {return redis.hgetAsync('tags:' + indexName, tagType + ' ' + tagName).then(function (filesCount) {
        return !filesCount ? 0 : parseInt(filesCount);
    });};
var setTagFilesCount = function setTagFilesCount(redis, indexName, tagName, tagType, filesCount) {
    if (filesCount == 0) {
        redis.hdel('tags:' + indexName, tagType + ' ' + tagName);
        return;
    }

    redis.hset('tags:' + indexName, tagType + ' ' + tagName, filesCount);
};

var getTags = exports.getTags = function getTags(redis, elasticSearch, indexName) {return new Promise(function (resolve, reject) {
        hasTagsInRedis(redis, indexName).
        then(function (hasTags) {
            if (!hasTags) {
                return setTagsFromEs(redis, elasticSearch, indexName);
            }
            return Promise.resolve();
        }).
        then(function () {return redis.hgetallAsync('tags:' + indexName);}).
        then(function (redisResult) {
            resolve(transformTagsStat(redisResult));
        }).
        catch(function (err) {return reject(err);});
    });};

var setTagsFromEs = function setTagsFromEs(redis, elasticSearch, indexName) {return new Promise(function (resolve, reject) {
        _index.EsProxy.getTagsStat(elasticSearch, indexName).
        then(function (tags) {
            if (tags.length == 0) {
                resolve();
                return;
            }

            var tagsArray = [];
            var idx = 0;

            tags.forEach(function (tag) {
                tagsArray[idx] = tag.type + ' ' + tag.name;
                idx++;
                tagsArray[idx] = tag.filesCount;
                idx++;
            });

            redis.hmset('tags:' + indexName, tagsArray, function (err, res) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(res);
            });
        }).
        catch(function (err) {return reject(err);});
    });};
//# sourceMappingURL=CacheProxy.js.map