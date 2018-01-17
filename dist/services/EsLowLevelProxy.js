'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.updateFile = undefined;var _request = require('request');var _request2 = _interopRequireDefault(_request);
var _config = require('../config');var _config2 = _interopRequireDefault(_config);
var _base64Stream = require('base64-stream');var _base64Stream2 = _interopRequireDefault(_base64Stream);
var _BufferToChunks = require('../utils/BufferToChunks');var _BufferToChunks2 = _interopRequireDefault(_BufferToChunks);
var _EsQueryBuilder = require('../utils/EsQueryBuilder');var EsQueryBuilder = _interopRequireWildcard(_EsQueryBuilder);
var _SliceBuffer = require('../utils/SliceBuffer');var _SliceBuffer2 = _interopRequireDefault(_SliceBuffer);
var _streamifier = require('streamifier');
var _combinedStream = require('combined-stream2');var _combinedStream2 = _interopRequireDefault(_combinedStream);function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;} else {var newObj = {};if (obj != null) {for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];}}newObj.default = obj;return newObj;}}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var ENC_UTF8 = 'utf-8';

var bodyToStream = function bodyToStream(body, contentToken, data) {
    var stringifiedBody = JSON.stringify(body);
    var start = stringifiedBody.indexOf(contentToken);

    var prefix = stringifiedBody.substring(0, start - 1);
    var suffix = stringifiedBody.substring(start + contentToken.length + 1);

    var contentRequestStream = _combinedStream2.default.create();
    var dataStream = (0, _streamifier.createReadStream)(data);

    contentRequestStream.append(Buffer.from(prefix, ENC_UTF8));
    contentRequestStream.append(dataStream);
    contentRequestStream.append(Buffer.from(suffix, ENC_UTF8));

    return contentRequestStream;
};

/**
    * Low level update by query implememntation to bypass large JSON files problem 
    */
var updateFile = exports.updateFile = function updateFile(indexName, fileId, data) {
    var fullIndexName = EsQueryBuilder.getFullIndexName(indexName);

    var contentToken = '@content';
    var body = {
        doc: contentToken,
        doc_as_upsert: true };


    var bodyStream = bodyToStream(body, contentToken, data);

    return new Promise(function (resolve, reject) {
        bodyStream.pipe(_request2.default.post({
            url: _config2.default.elasticSearchUrl + '/' + fullIndexName + '/' + _config2.default.esFileTypeName + '/' + fileId + '/_update?retry_on_conflict=5&refresh=true',
            headers: {
                'Content-Type': 'application/json' } },

        function (err, resp, body) {
            if (err) {
                reject(err);
                return;
            }

            var response = JSON.parse(resp.body);

            if (response.result === 'updated' || response.result === 'created') {
                resolve(response.result);
                return;
            }

            reject(response);
        }));

    });
};
//# sourceMappingURL=EsLowLevelProxy.js.map