'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.destroy = exports.init = undefined;var _index = require('./index');
var _config = require('../config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}function _toConsumableArray(arr) {if (Array.isArray(arr)) {for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {arr2[i] = arr[i];}return arr2;} else {return Array.from(arr);}}

var generatePipelineName = function generatePipelineName(index) {return '' + _config2.default.pipelineContainerPrefix + index;};

var init = exports.init = function init(storage, externalNERs) {return new Promise(function (resolve, reject) {
        var pipelinesPromises = [].concat(_toConsumableArray(Array(_config2.default.pipelineCount))).map(function (item, index) {
            var pipelineName = generatePipelineName(index);

            return _index.DockerProxy.tryRemovePipelineContainer(pipelineName).
            then(function () {
                var token = _index.AuthService.generateServiceToken(storage, pipelineName);
                return _index.DockerProxy.createPipelineContainer(token, pipelineName, externalNERs);
            }).
            then(function () {
                return _index.DockerProxy.startPipelineContainer(pipelineName);
            });
        });

        Promise.all(pipelinesPromises).
        then(function () {
            console.log('Pipeline initialized');
            _index.EsProxy.indexLogItem(
            storage.elasticSearch,
            createLogRecord('info', 'Pipeline initialized'));

            resolve(true);
        }).
        catch(function (err) {
            console.error('Failed to initialize pipeline. ' + err.toString());
            _index.EsProxy.indexLogItem(
            storage.elasticSearch,
            createLogRecord('error', 'Failed to initialize pipeline. ' + err.toString()));

            reject(err);
        });
    });};

var destroy = exports.destroy = function destroy(storage) {return new Promise(function (resolve, reject) {
        var pipelinesPromises = [].concat(_toConsumableArray(Array(_config2.default.pipelineCount))).map(function (item, index) {
            var pipelineName = generatePipelineName(index);
            return _index.DockerProxy.tryRemovePipelineContainer(pipelineName);
        });

        Promise.all(pipelinesPromises).
        then(function () {
            console.log('Pipeline destroyed');
            _index.EsProxy.indexLogItem(
            storage.elasticSearch,
            createLogRecord('info', 'Pipeline destroyed'));

            resolve(true);
        }).
        catch(function (err) {
            console.error('Failed to destroy pipeline. ' + err.toString());
            _index.EsProxy.indexLogItem(
            storage.elasticSearch,
            createLogRecord('error', 'Failed to destroy pipeline. ' + err.toString()));

            reject(err);
        });
    });};

var createLogRecord = function createLogRecord(type, message) {return {
        type: type,
        source_id: 'webapi',
        message: message };};
//# sourceMappingURL=PipelineService.js.map