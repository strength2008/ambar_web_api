'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _slicedToArray = function () {function sliceIterator(arr, i) {var _arr = [];var _n = true;var _d = false;var _e = undefined;try {for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {_arr.push(_s.value);if (i && _arr.length === i) break;}} catch (err) {_d = true;_e = err;} finally {try {if (!_n && _i["return"]) _i["return"]();} finally {if (_d) throw _e;}}return _arr;}return function (arr, i) {if (Array.isArray(arr)) {return arr;} else if (Symbol.iterator in Object(arr)) {return sliceIterator(arr, i);} else {throw new TypeError("Invalid attempt to destructure non-iterable instance");}};}();var _extends = Object.assign || function (target) {for (var i = 1; i < arguments.length; i++) {var source = arguments[i];for (var key in source) {if (Object.prototype.hasOwnProperty.call(source, key)) {target[key] = source[key];}}}return target;};var _express = require('express');
var _ErrorResponse = require('../utils/ErrorResponse');var _ErrorResponse2 = _interopRequireDefault(_ErrorResponse);
var _services = require('../services');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}function _toConsumableArray(arr) {if (Array.isArray(arr)) {for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {arr2[i] = arr[i];}return arr2;} else {return Array.from(arr);}}

var concatBucketsAndCrawlers = function concatBucketsAndCrawlers(buckets, crawlers) {return [].concat(_toConsumableArray(

    buckets.map(function (bucket) {return _extends({}, bucket, { type: 'bucket' });})), _toConsumableArray(
    crawlers.map(function (crawler) {return { id: crawler.id, description: crawler.description, type: 'crawler' };})));};exports.default =


function (_ref) {var config = _ref.config,storage = _ref.storage;
    var api = (0, _express.Router)();

    api.use(_services.AuthService.ensureAuthenticated(storage));

    /**     
                                                                  * @api {get} api/sources/ Get Available Sources
                                                                  * @apiDescription Get Available Sources (Crawlers Included)     
                                                                  * @apiGroup Sources                
                                                                  *  
                                                                  * @apiHeader {String} ambar-email User email.
                                                                  * @apiHeader {String} ambar-email-token User token.
                                                                  * 
                                                                  * @apiSuccessExample {json}  HTTP/1.1 200 OK
                                                                  *    [
                                                                  *       {
                                                                  *           "id": "Default",
                                                                  *           "description": "Automatically created on UI upload",
                                                                  *           "type": "bucket"
                                                                  *       }, 
                                                                  *       {
                                                                  *           "id": "Books",
                                                                  *           "description": "Books crawler",
                                                                  *           "type": "crawler"
                                                                  *       },
                                                                  *       {
                                                                  *           "id": "Dropbox",
                                                                  *           "description": "Dropbox Crawler",
                                                                  *           "type": "crawler"
                                                                  *       }
                                                                  *   ]
                                                                  * 
                                                                  */
    api.get('/', function (req, res, next) {
        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        Promise.all([
        _services.MongoProxy.getCrawlersSettingsByIndexName(storage.mongoDb, indexName),
        _services.MongoProxy.getBucketsByIndexName(storage.mongoDb, indexName)]).

        then(function (_ref2) {var _ref3 = _slicedToArray(_ref2, 2),crawlers = _ref3[0],buckets = _ref3[1];
            res.status(200).json(concatBucketsAndCrawlers(buckets, crawlers));
        }).
        catch(next);
    });

    return api;
};
//# sourceMappingURL=sources.js.map