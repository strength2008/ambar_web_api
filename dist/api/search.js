'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _extends = Object.assign || function (target) {for (var i = 1; i < arguments.length; i++) {var source = arguments[i];for (var key in source) {if (Object.prototype.hasOwnProperty.call(source, key)) {target[key] = source[key];}}}return target;};var _express = require('express');
var _ErrorResponse = require('../utils/ErrorResponse');var _ErrorResponse2 = _interopRequireDefault(_ErrorResponse);
var _QueryParser = require('../utils/QueryParser');var QueryParser = _interopRequireWildcard(_QueryParser);
var _services = require('../services');
var _striptags = require('striptags');var _striptags2 = _interopRequireDefault(_striptags);function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;} else {var newObj = {};if (obj != null) {for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];}}newObj.default = obj;return newObj;}}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var DEFAULT_PAGE = 0;
var DEFAULT_SIZE = 10;
var MAX_SIZE = 200;

var hrTimeToMilliSeconds = function hrTimeToMilliSeconds(hrTime) {return (hrTime[0] * 1e9 + hrTime[1]) / 1e6;};exports.default =

function (_ref) {var config = _ref.config,storage = _ref.storage;
    var api = (0, _express.Router)();

    api.use(_services.AuthService.ensureAuthenticated(storage));

    /**
                                                                  * @api {get} api/search Search For Documents By Query     
                                                                  * @apiGroup Search
                                                                  *      
                                                                  * @apiParam {String} query URI_ENCODED query string. Check details of query syntax [here](https://blog.ambar.cloud/mastering-ambar-search-queries/).
                                                                  * @apiParam {Number} [page=0] page to return 
                                                                  * @apiParam {Number} [size=10] number of results to return per page. Maximum is 100.
                                                                  *
                                                                  * @apiHeader {String} ambar-email User email.
                                                                  * @apiHeader {String} ambar-email-token User token.
                                                                  * 
                                                                  * @apiExample {curl} Search For `John`
                                                                  *     curl -i http://ambar_api_address/api/search?query=John
                                                                  * 
                                                                  * @apiSuccessExample {json} HTTP/1.1 200 OK
                                                                  *
                                                                  * @apiErrorExample {json} HTTP/1.1 400 BadRequest
                                                                  * HTTP/1.1 400 BadRequest
                                                                  */
    api.get('/', function (req, res, next) {var _req$query =
        req.query,queryStr = _req$query.query,_req$query$page = _req$query.page,pageStr = _req$query$page === undefined ? DEFAULT_PAGE : _req$query$page,_req$query$size = _req$query.size,sizeStr = _req$query$size === undefined ? DEFAULT_SIZE : _req$query$size;
        var page = parseInt(pageStr);
        var size = parseInt(sizeStr);
        var query = decodeURI(queryStr);

        if (!Number.isInteger(page) || page < 0) {
            res.status(400).json(new _ErrorResponse2.default('Page is invalid'));
            return;
        }

        if (!Number.isInteger(size) || size < 1 || size > MAX_SIZE) {
            res.status(400).json(new _ErrorResponse2.default('Size is invalid'));
            return;
        }

        var parsedQuery = QueryParser.parseEsStringQuery(query);

        var startTime = process.hrtime();
        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        _services.EsProxy.searchFiles(storage.elasticSearch, indexName, parsedQuery, page, size).
        then(function (results) {return res.status(200).json(_extends({},
            results, {
                hits: results.hits.
                map(function (hit) {
                    hit.meta['download_uri'] = _services.CryptoService.encryptDownloadUri(indexName, hit.file_id);
                    return hit;
                }),
                took: hrTimeToMilliSeconds(process.hrtime(startTime)) }));}).

        catch(next);
    });

    /**
         * @api {get} api/search/tree Get documents tree by query  
         * @apiGroup Search
         *      
         * @apiParam {String} query URI_ENCODED query string. Check details of query syntax [here](https://blog.ambar.cloud/mastering-ambar-search-queries/).
         *
         * @apiHeader {String} ambar-email User email.
         * @apiHeader {String} ambar-email-token User token.
         * 
         *     curl -i http://ambar_api_address/api/search/tree?query=John
         * 
         * @apiSuccessExample {json} HTTP/1.1 200 OK
         *
         * @apiErrorExample {json} HTTP/1.1 400 BadRequest
         * HTTP/1.1 400 BadRequest
         */
    api.get('/tree', function (req, res, next) {var
        queryStr = req.query.query;
        var query = decodeURI(queryStr);

        var parsedQuery = QueryParser.parseEsStringQuery(query);

        var startTime = process.hrtime();
        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        _services.EsProxy.getFilesTreeByQuery(storage.elasticSearch, indexName, parsedQuery).
        then(function (results) {return res.status(200).json(_extends({},
            results, {
                took: hrTimeToMilliSeconds(process.hrtime(startTime)) }));}).

        catch(next);
    });

    /**
         * @api {get} api/search/stats Get documents stats by query  
         * @apiGroup Search
         *      
         * @apiParam {String} query URI_ENCODED query string. Check details of query syntax [here](https://blog.ambar.cloud/mastering-ambar-search-queries/).
         *
         * @apiHeader {String} ambar-email User email.
         * @apiHeader {String} ambar-email-token User token.
         * 
         *     curl -i http://ambar_api_address/api/search/stats?query=John
         * 
         * @apiSuccessExample {json} HTTP/1.1 200 OK
         *
         * @apiErrorExample {json} HTTP/1.1 400 BadRequest
         * HTTP/1.1 400 BadRequest
         */
    api.get('/stats', function (req, res, next) {var
        queryStr = req.query.query;
        var query = decodeURI(queryStr);

        var parsedQuery = QueryParser.parseEsStringQuery(query);

        var startTime = process.hrtime();
        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        _services.EsProxy.getFilesStatsByQuery(storage.elasticSearch, indexName, parsedQuery).
        then(function (results) {return res.status(200).json(_extends({},
            results, {
                took: hrTimeToMilliSeconds(process.hrtime(startTime)) }));}).

        catch(next);
    });

    /**     
         * @api {get} api/search/:fileId Retrieve File Highlight by Query and fileId     
         * @apiGroup Search
         * 
         * @apiDescription This method is useful for getting higlights of large files > 30 MB
         * 
         * @apiParam {String} fileId file fileId
         * @apiParam {String} query query string
         * 
         * @apiHeader {String} ambar-email User email.
         * @apiHeader {String} ambar-email-token User token.
         * 
         * @apiExample {curl} Retrieve Higlights for File with fileId `318be2290125e0a6cfb7229133ba3c4632068ae04942ed5c7c660718d9d41eb3`
         *     curl -i http://ambar:8004/api/search/318be2290125e0a6cfb7229133ba3c4632068ae04942ed5c7c660718d9d41eb3?query=John
         *  
         * @apiSuccessExample {json} HTTP/1.1 200 OK
         *
         * @apiErrorExample {json} HTTP/1.1 400 BadRequest
         * HTTP/1.1 400 BadRequest
         */
    api.get('/:fileId', function (req, res, next) {var
        fileId = req.params.fileId,query = req.query.query;

        if (!query || query === '') {
            res.status(400).json(new _ErrorResponse2.default('Query is empty'));
            return;
        }

        var parsedQuery = QueryParser.parseEsStringQuery(query);

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        _services.EsProxy.getFileHighlightByFileId(storage.elasticSearch, indexName, parsedQuery, fileId).
        then(function (hit) {
            var highlight = hit.content && hit.content.highlight ? hit.content.highlight : null;
            if (!highlight) {
                highlight = { 'text': [''] };
            }

            res.status(200).json({ highlight: highlight });

            return;
        }).
        catch(next);
    });

    /**     
         * @api {get} api/search/:fileId/full Retrieve Full File Highlight by Query and fileId     
         * @apiGroup Search
         * 
         * @apiDescription This method is useful for getting higlights of large files > 30 MB
         * 
         * @apiParam {String} fileId file fileId
         * @apiParam {String} query query string
         * 
         * @apiHeader {String} ambar-email User email.
         * @apiHeader {String} ambar-email-token User token.
         * 
         * @apiExample {curl} Retrieve Full Higlight for File with fileId `318be2290125e0a6cfb7229133ba3c4632068ae04942ed5c7c660718d9d41eb3`
         *     curl -i http://ambar:8004/api/search/318be2290125e0a6cfb7229133ba3c4632068ae04942ed5c7c660718d9d41eb3/full?query=John
         *  
         * @apiSuccessExample {json} HTTP/1.1 200 OK
         *       Aesop, by some strange accident it seems to have entirely<br/>disappeared, and to have been lost sight of. His name is<br/>mentioned by Avienus; by Suidas, a celebrated critic, at the<br/>close of the eleventh century, who gives in his lexicon several<br/>isolated verses of his version of the fables; and by <em>John</em><br/>Tzetzes, a grammarian and poet of Constantinople, who lived<br/>during the latter half of the twelfth century. Nevelet, in the<br/>preface to the volume which we have described, points out that<br/>the Fables of Planudes could not be the work of Aesop, as they<br/>contain a reference in two places to Holy
         * 
         * @apiErrorExample {json} HTTP/1.1 400 BadRequest
         * HTTP/1.1 400 BadRequest
         */
    api.get('/:fileId/full', function (req, res, next) {var
        fileId = req.params.fileId,query = req.query.query;

        if (!query || query === '') {
            res.status(400).json(new _ErrorResponse2.default('Query is empty'));
            return;
        }

        var parsedQuery = QueryParser.parseEsStringQuery(query);

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        _services.EsProxy.getFullFileHighlightByFileId(storage.elasticSearch, indexName, parsedQuery, fileId).
        then(function (hit) {
            res.status(200).json(hit);

            return;
        }).
        catch(next);
    });

    return api;
};
//# sourceMappingURL=search.js.map