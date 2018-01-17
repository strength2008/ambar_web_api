'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.startPipelineContainer = exports.tryRemovePipelineContainer = exports.createPipelineContainer = exports.getCrawlerContainerState = exports.restartCrawlerContainer = exports.stopCrawlerContainer = exports.startCrawlerContainer = exports.tryRemoveCrawlerContainer = exports.checkIfCrawlerContainerExists = exports.getCrawlerContainers = exports.createCrawlerContainer = undefined;var _extends = Object.assign || function (target) {for (var i = 1; i < arguments.length; i++) {var source = arguments[i];for (var key in source) {if (Object.prototype.hasOwnProperty.call(source, key)) {target[key] = source[key];}}}return target;};var _dockerode = require('dockerode');var _dockerode2 = _interopRequireDefault(_dockerode);
var _config = require('../config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var CRAWLER_PREFIX = 'ambar_crawler';
var PIPELINE_PREFIX = 'ambar_pipeline';

var AMBAR_INTERNAL_NETWORK = 'ambar_internal_network';

var dockerClient = new _dockerode2.default({ socketPath: '/var/run/docker.sock' });

var generateCrawlerContainerName = function generateCrawlerContainerName(uid) {return CRAWLER_PREFIX + '_' + uid;};
var generatePipelineContainerName = function generatePipelineContainerName(name) {return PIPELINE_PREFIX + '_' + name;};

//// CRAWLERS /////////////////////////////////////////////////////////////////////

var createCrawlerContainer = exports.createCrawlerContainer = function createCrawlerContainer(name, apiToken) {return new Promise(function (resolve, reject) {
        var env = ['AMBAR_API_URL=' + _config2.default.apiUrl, 'AMBAR_API_TOKEN=' + apiToken, 'AMBAR_RABBIT_HOST=' + _config2.default.rabbitHost, 'AMBAR_CRAWLER_NAME=' + name];

        dockerClient.createContainer({
            Image: _config2.default.dockerRepo + '/' + _config2.default.crawlerImageName,
            name: generateCrawlerContainerName(name),
            Env: env,
            HostConfig: {
                RestartPolicy: { Name: 'always', MaximumRetryCount: 0 },
                NetworkMode: AMBAR_INTERNAL_NETWORK } },


        function (err, container) {
            if (err) {
                reject(err);
                return;
            }
            resolve(container);
        });
    });};

var getCrawlerContainers = exports.getCrawlerContainers = function getCrawlerContainers() {return getContainers(CRAWLER_PREFIX);};

var checkIfCrawlerContainerExists = exports.checkIfCrawlerContainerExists = function checkIfCrawlerContainerExists(name) {return checkIfContainerExists(CRAWLER_PREFIX, name);};

var tryRemoveCrawlerContainer = exports.tryRemoveCrawlerContainer = function tryRemoveCrawlerContainer(name) {return tryRemoveContainer(CRAWLER_PREFIX, name);};

var startCrawlerContainer = exports.startCrawlerContainer = function startCrawlerContainer(name) {return startContainerByName(CRAWLER_PREFIX, name);};

var stopCrawlerContainer = exports.stopCrawlerContainer = function stopCrawlerContainer(name) {return stopContainerByName(CRAWLER_PREFIX, name);};

var restartCrawlerContainer = exports.restartCrawlerContainer = function restartCrawlerContainer(name) {return restartContainerByName(CRAWLER_PREFIX, name);};

var getCrawlerContainerState = exports.getCrawlerContainerState = function getCrawlerContainerState(name) {return getContainerStateByName(CRAWLER_PREFIX, name);};

//// PIPELINES ////////////////////////////////////////////////////////////////////

var createPipelineContainer = exports.createPipelineContainer = function createPipelineContainer(apiToken, name, externalNERs) {return new Promise(function (resolve, reject) {
        var env = ['AMBAR_API_URL=' + _config2.default.apiUrl, 'AMBAR_API_TOKEN=' + apiToken, 'AMBAR_RABBIT_HOST=' + _config2.default.rabbitHost, 'AMBAR_PIPELINE_NAME=' + name, 'OCR_PDF_MAX_PAGE_COUNT=' + _config2.default.ocrPdfMaxPageCount, 'OCR_PDF_SYMBOLS_PER_PAGE_THRESHOLD=' + _config2.default.ocrPdfSymbolsPerPageThreshold, 'EXTERNAL_NERS=' + JSON.stringify(externalNERs), 'NER_ENABLED=' + _config2.default.nerEnabled, 'PRESERVE_ORIGINALS=' + _config2.default.preserveOriginals];

        dockerClient.createContainer({
            Image: _config2.default.dockerRepo + '/' + _config2.default.pipelineImageName,
            name: generatePipelineContainerName(name),
            Env: env,
            HostConfig: {
                RestartPolicy: { Name: 'always', MaximumRetryCount: 0 },
                NetworkMode: AMBAR_INTERNAL_NETWORK } },


        function (err, container) {
            if (err) {
                reject(err);
                return;
            }
            resolve(container);
        });
    });};

var tryRemovePipelineContainer = exports.tryRemovePipelineContainer = function tryRemovePipelineContainer(name) {return tryRemoveContainer(PIPELINE_PREFIX, name);};

var startPipelineContainer = exports.startPipelineContainer = function startPipelineContainer(name) {return startContainerByName(PIPELINE_PREFIX, name);};

///////////////////////////////////////////////////////////////////////////////////

var getContainers = function getContainers(prefix) {return new Promise(function (resolve, reject) {return (
            dockerClient.listContainers({ all: true }, function (err, containers) {
                if (err) {
                    reject(err);
                    return;
                }

                var result = containers.
                filter(function (c) {return c.Names.length === 1 && c.Names.some(function (n) {return n.startsWith('/' + prefix);});}).
                map(function (c) {return _extends({}, c, { Names: [c.Names[0].replace('/' + prefix + '_', '')] });});

                resolve(result);
            }));});};


var checkIfContainerExists = function checkIfContainerExists(prefix, containerName) {return new Promise(function (resolve, reject) {return (
            getContainers(prefix).
            then(function (containers) {
                var filteredContainers = containers.filter(function (c) {return c.Names.some(function (n) {return n === containerName;});});

                resolve(filteredContainers.length !== 0);
            }).
            catch(function (err) {return reject(err);}));});};


var tryRemoveContainer = function tryRemoveContainer(prefix, name) {return new Promise(function (resolve, reject) {return (
            checkIfContainerExists(prefix, name).
            then(function (exist) {
                if (!exist) {
                    resolve();
                    return;
                }

                return removeContainer(prefix, name).
                then(function (res) {
                    resolve(res);
                });
            }).
            catch(function (err) {return reject(err);}));});};


var getContainerIdByName = function getContainerIdByName(prefix, containerName) {return new Promise(function (resolve, reject) {return (
            getContainers(prefix).
            then(function (containers) {
                var filteredContainers = containers.
                filter(function (c) {return c.Names.some(function (n) {return n === containerName;});});

                if (!filteredContainers || filteredContainers.length === 0) {
                    throw {
                        statusCode: 404,
                        message: 'Container with name ' + containerName + ' not found' };

                }

                resolve(filteredContainers[0].Id);
            }).
            catch(function (err) {return reject(err);}));});};


var removeContainer = function removeContainer(prefix, name) {return new Promise(function (resolve, reject) {return (
            getContainerIdByName(prefix, name).
            then(function (id) {return dockerClient.getContainer(id).remove({ force: true }, function (err, data) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });}).
            catch(function (err) {return reject(err);}));});};


var startContainerByName = function startContainerByName(prefix, name) {return new Promise(function (resolve, reject) {return (
            getContainerIdByName(prefix, name).
            then(function (id) {
                dockerClient.getContainer(id).start(function (err, data) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(data);
                });
            }).
            catch(function (err) {return reject(err);}));});};


var stopContainerByName = function stopContainerByName(prefix, name) {return new Promise(function (resolve, reject) {return (
            getContainerIdByName(prefix, name).
            then(function (id) {
                dockerClient.getContainer(id).stop(function (err, data) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(data);
                });
            }).
            catch(function (err) {return reject(err);}));});};


var restartContainerByName = function restartContainerByName(prefix, name) {return new Promise(function (resolve, reject) {return (
            getContainerIdByName(prefix, name).
            then(function (id) {
                dockerClient.getContainer(id).restart(function (err, data) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(data);
                });
            }).
            catch(function (err) {return reject(err);}));});};


var getContainerStateByName = function getContainerStateByName(prefix, name) {return new Promise(function (resolve, reject) {return (
            getContainerIdByName(prefix, name).
            then(function (id) {return dockerClient.getContainer(id).inspect(function (err, data) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(data);
                });}).

            catch(function (err) {return reject(err);}));});};
//# sourceMappingURL=DockerProxy.js.map