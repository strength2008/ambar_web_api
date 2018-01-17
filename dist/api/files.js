'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _slicedToArray = function () {function sliceIterator(arr, i) {var _arr = [];var _n = true;var _d = false;var _e = undefined;try {for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {_arr.push(_s.value);if (i && _arr.length === i) break;}} catch (err) {_d = true;_e = err;} finally {try {if (!_n && _i["return"]) _i["return"]();} finally {if (_d) throw _e;}}return _arr;}return function (arr, i) {if (Array.isArray(arr)) {return arr;} else if (Symbol.iterator in Object(arr)) {return sliceIterator(arr, i);} else {throw new TypeError("Invalid attempt to destructure non-iterable instance");}};}();var _express = require('express');
var _ErrorResponse = require('../utils/ErrorResponse');var _ErrorResponse2 = _interopRequireDefault(_ErrorResponse);
var _services = require('../services');











var _MetaBuilder = require('../utils/MetaBuilder');var MetaBuilder = _interopRequireWildcard(_MetaBuilder);
var _AmbarCrawlerSettingsBuilder = require('../models/AmbarCrawlerSettingsBuilder');var AmbarCrawlerSettingsBuilder = _interopRequireWildcard(_AmbarCrawlerSettingsBuilder);function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;} else {var newObj = {};if (obj != null) {for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];}}newObj.default = obj;return newObj;}}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var generateMetaId = function generateMetaId(source_id, full_name, created_datetime, updated_datetime) {
    return _services.CryptoService.getSha256('' + source_id + full_name + created_datetime + updated_datetime);
};

var generateFileId = function generateFileId(source_id, full_name) {
    return _services.CryptoService.getSha256('' + source_id + full_name);
};

var generateExtractedTextFileName = function generateExtractedTextFileName(sha) {return 'text_' + sha;};exports.default =

function (_ref) {var config = _ref.config,storage = _ref.storage;
    var api = (0, _express.Router)();

    //////////////// CALLED FROM CRAWLERS ////////////////////////////////////
    /**
    * Check if partial meta exist in ES     
    */
    api.post('/meta/exists/:index', _services.AuthService.ensureAuthenticatedAsService(storage), function (req, res, next) {var _req$body =
        req.body,full_name = _req$body.full_name,updated_datetime = _req$body.updated_datetime,created_datetime = _req$body.created_datetime,source_id = _req$body.source_id,indexName = req.params.index;

        if (!full_name || !updated_datetime || !created_datetime || !source_id || !indexName) {
            res.status(400).json(new _ErrorResponse2.default('Required field is missing'));
            return;
        }

        var metaId = generateMetaId(source_id, full_name, created_datetime, updated_datetime);

        _services.CacheProxy.checkIfMetaIdExists(storage.redis, indexName, metaId).
        then(function (redisResult) {
            if (redisResult) {
                return 200;
            }

            return _services.EsProxy.checkIfMetaIdExists(storage.elasticSearch, indexName, metaId).
            then(function (exists) {
                if (exists) {
                    _services.CacheProxy.addMetaId(storage.redis, indexName, metaId);
                    return 200;
                }
                return 404;
            });
        }).
        then(function (statusToSend) {
            res.sendStatus(statusToSend);
        }).
        catch(next);
    });

    /**
         * Enqueue meta for specified sha (enqueuing message to pipeline)
         */
    api.post('/meta/:index/:sha/:size/:uid', _services.AuthService.ensureAuthenticatedAsService(storage), function (req, res, next) {var
        requestBody = req.body,_req$params = req.params,sha = _req$params.sha,indexName = _req$params.index,size = _req$params.size,crawlerUid = _req$params.uid;

        var fileSize = parseInt(size);

        if (!requestBody) {
            res.status(400).json(new _ErrorResponse2.default('Empty request'));
            return;
        }

        var meta = MetaBuilder.buildMeta(requestBody);

        if (!meta || !sha || !indexName) {
            res.status(400).json(new _ErrorResponse2.default('Invalid request'));
            return;
        }

        Promise.all([
        _services.CacheProxy.getEsIndexContentSize(storage.redis, storage.elasticSearch, indexName),
        _services.CacheProxy.getEsIndexContentMaxSize(storage.redis, storage.mongoDb, indexName)]).

        then(function (_ref2) {var _ref3 = _slicedToArray(_ref2, 2),indexSize = _ref3[0],indexMaxSize = _ref3[1];
            if (indexSize + fileSize > indexMaxSize && indexMaxSize != -1) {
                res.sendStatus(507);
                return;
            }

            _services.CacheProxy.setEsIndexContentSize(storage.redis, indexName, indexSize + fileSize);

            return _services.QueueProxy.enqueuePipelineMessage(storage, { sha: sha, fileId: generateFileId(meta.source_id, meta.full_name), indexName: indexName, crawlerUid: crawlerUid, meta: meta }).
            then(function () {
                _services.CacheProxy.addMetaId(storage.redis, indexName, meta.id);
                res.sendStatus(200);
            });
        }).
        catch(next);
    });

    /*
        * Check if parsed content exists
        */
    api.head('/content/:sha/parsed', _services.AuthService.ensureAuthenticatedAsService(storage), function (req, res, next) {
        var sha = req.params.sha;

        var fileName = generateExtractedTextFileName(sha);

        _services.GridFsProxy.checkIfFileExist(storage.mongoDb, fileName).
        then(function (found) {return found ? sha : null;}).
        then(function (sha) {
            if (!sha) {
                res.sendStatus(404);
                return;
            }

            res.sendStatus(302);
        }).
        catch(next);
    });

    /**
         * Create content
         */
    api.post('/content/:sha', _services.AuthService.ensureAuthenticatedAsService(storage), _services.FileUploader, function (req, res, next) {var
        clientHash = req.params.sha,files = req.files;
        var fileContent = Buffer.isBuffer(files[0].buffer) && Buffer.byteLength(files[0].buffer) > 0 ? files[0].buffer : new Buffer(0);
        var serverHash = _services.CryptoService.getSha256(fileContent);

        if (serverHash.toLowerCase() !== clientHash.toLowerCase()) {
            res.status(400).json(new _ErrorResponse2.default('Server hash isn\'t equal client hash. Server hash: \'' + serverHash + '\''));
            return;
        }

        _services.GridFsProxy.checkIfFileExist(storage.mongoDb, serverHash).
        then(function (found) {
            if (found) {
                res.sendStatus(302);
                return;
            }

            return _services.GridFsProxy.uploadFile(storage.mongoDb, serverHash, fileContent).
            then(function () {return res.sendStatus(201);});
        }).
        catch(next);
    });

    //////////////// CALLED FROM PIPELINE ////////////////////////////////////
    /**
     * Get file content by sha
     */
    api.get('/content/:sha', _services.AuthService.ensureAuthenticatedAsService(storage), function (req, res, next) {
        var sha = req.params.sha;

        _services.GridFsProxy.checkIfFileExist(storage.mongoDb, sha).
        then(function (found) {return found ? sha : null;}).
        then(function (sha) {
            if (!sha) {
                res.sendStatus(404);
                return;
            }

            res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': 'attachment; filename*=UTF-8\'\'' + encodeURIComponent(sha) });


            _services.GridFsProxy.downloadFile(storage.mongoDb, sha).pipe(res);

            return;
        }).
        catch(next);
    });

    /**
         * Delete file content by sha
         */
    api.delete('/content/:sha', _services.AuthService.ensureAuthenticatedAsService(storage), function (req, res, next) {
        var sha = req.params.sha;

        _services.GridFsProxy.checkIfFileExist(storage.mongoDb, sha).
        then(function (found) {return found ? sha : null;}).
        then(function (sha) {
            if (!sha) {
                res.sendStatus(404);
                return;
            }

            return _services.GridFsProxy.removeFile(storage.mongoDb, sha).
            then(function () {return res.sendStatus(200);});
        }).
        catch(next);
    });

    /**
         * Get parsed file content by sha
         */
    api.get('/content/:sha/parsed', _services.AuthService.ensureAuthenticatedAsService(storage), function (req, res, next) {
        var sha = req.params.sha;

        var fileName = generateExtractedTextFileName(sha);

        _services.GridFsProxy.checkIfFileExist(storage.mongoDb, fileName).
        then(function (found) {return found ? fileName : null;}).
        then(function (fileName) {
            if (!fileName) {
                res.sendStatus(404);
                return;
            }

            res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': 'attachment; filename*=UTF-8\'\'' + encodeURIComponent(fileName) });


            _services.GridFsProxy.downloadFile(storage.mongoDb, fileName).pipe(res);

            return;
        }).
        catch(next);
    });

    /**
         * Get file content fields from ES
         */
    api.get('/content/:indexName/:sha/fields', _services.AuthService.ensureAuthenticatedAsService(storage), function (req, res, next) {var _req$params2 =
        req.params,indexName = _req$params2.indexName,sha = _req$params2.sha;

        _services.EsProxy.getFileBySha(storage.elasticSearch, indexName, sha).
        then(function (ambarFile) {
            if (!ambarFile) {
                res.sendStatus(404);
                return;
            }

            res.status(200).json(ambarFile.content);
        }).
        catch(next);
    });

    /**
         * Get full file meta from ES
         */
    api.get('/file/:indexName/:fileId/meta', _services.AuthService.ensureAuthenticatedAsService(storage), function (req, res, next) {var _req$params3 =
        req.params,indexName = _req$params3.indexName,fileId = _req$params3.fileId;

        _services.EsProxy.getFileByFileId(storage.elasticSearch, indexName, fileId).
        then(function (ambarFile) {
            if (!ambarFile) {
                res.sendStatus(404);
                return;
            }

            res.status(200).json(ambarFile);
        }).
        catch(next);
    });


    /**
         * Update or create ambar file
        */
    api.post('/file/:indexName/:fileId/processed', _services.AuthService.ensureAuthenticatedAsService(storage), _services.FileUploader, function (req, res, next) {var _req$params4 =
        req.params,indexName = _req$params4.indexName,fileId = _req$params4.fileId,files = req.files;

        var file = Buffer.isBuffer(files[0].buffer) && Buffer.byteLength(files[0].buffer) > 0 ? files[0].buffer : new Buffer(0);

        _services.EsLowLevelProxy.updateFile(indexName, fileId, file).
        then(function (result) {
            if (result === 'created') {
                res.sendStatus(201);
                return;
            }

            if (result === 'updated') {
                res.sendStatus(200);
                return;
            }

            throw new Error(result);
        }).
        catch(next);
    });

    /**
         * Upload parsed text to GridFS
        */
    api.post('/content/:sha/extracted', _services.AuthService.ensureAuthenticatedAsService(storage), _services.FileUploader, function (req, res, next) {var
        sha = req.params.sha,files = req.files;

        var extractedTextFileName = generateExtractedTextFileName(sha);

        var file = Buffer.isBuffer(files[0].buffer) && Buffer.byteLength(files[0].buffer) > 0 ? files[0].buffer : new Buffer(0);

        _services.GridFsProxy.uploadPlainTextFile(storage.mongoDb, extractedTextFileName, file).
        then(function () {
            res.sendStatus(200);
        }).
        catch(next);
    });

    api.delete('/autotagsandnes/:indexName/:fileId', _services.AuthService.ensureAuthenticatedAsService(storage), function (req, res, next) {var _req$params5 =
        req.params,indexName = _req$params5.indexName,fileId = _req$params5.fileId;

        _services.EsProxy.deleteAutoTagsAndNamedEntities(storage.elasticSearch, indexName, fileId).
        then(function (results) {
            res.sendStatus(200);
        }).
        catch(next);
    });

    //////////////// CALLED FROM UI ///////////////////////////////////////////   
    /**     
     * @api {get} api/files/direct/:fileId/source Download File Source by File Id    
     * @apiGroup Files                
     *  
     * @apiHeader {String} ambar-email User email
     * @apiHeader {String} ambar-email-token User token
     * 
     * @apiSuccessExample HTTP/1.1 200 OK     
     * Octet-Stream
     * 
     * @apiErrorExample {json} HTTP/1.1 404 Not Found
     * File meta or content not found
     */
    api.get('/direct/:fileId/source', _services.AuthService.ensureAuthenticated(storage), function (req, res, next) {
        var fileId = req.params.fileId;

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        _services.EsProxy.getFileByFileId(storage.elasticSearch, indexName, fileId, false).
        then(function (file) {
            if (file === null) {
                res.status(404).json(new _ErrorResponse2.default('File meta not found'));
                return;
            }

            return _services.GridFsProxy.checkIfFileExist(storage.mongoDb, file.sha256).
            then(function (fileExsists) {return {
                    fileExsists: fileExsists,
                    fileMeta: file.meta,
                    fileSha: file.sha256,
                    fileType: file.content.type };}).

            then(function (result) {
                if (!result.fileExsists) {
                    res.status(404).json(new _ErrorResponse2.default('File content not found'));
                    return;
                }var

                fileName = result.fileMeta.short_name,fileSha = result.fileSha,fileType = result.fileType;

                res.writeHead(200, {
                    'Content-Type': fileType,
                    'Content-Disposition': 'attachment; filename*=UTF-8\'\'' + encodeURIComponent(fileName) });


                _services.GridFsProxy.downloadFile(storage.mongoDb, fileSha).pipe(res);
            });
        }).
        catch(next);
    });

    /**     
         * @api {get} api/files/direct/:fileId/text Get Parsed Text From File by File Id    
         * @apiGroup Files                
         *  
         * @apiHeader {String} ambar-email User email
         * @apiHeader {String} ambar-email-token User token
         * 
         * @apiSuccessExample HTTP/1.1 200 OK     
         * Octet-Stream
         * 
         * @apiErrorExample {json} HTTP/1.1 404 Not Found
         * File meta or content not found
         */
    api.get('/direct/:fileId/text', _services.AuthService.ensureAuthenticated(storage), function (req, res, next) {
        var fileId = req.params.fileId;

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        _services.EsProxy.getFileByFileId(storage.elasticSearch, indexName, fileId, false).
        then(function (file) {
            if (file === null) {
                res.status(404).json(new _ErrorResponse2.default('File meta not found'));
                return;
            }

            var extractedTextFileName = generateExtractedTextFileName(file.sha256);

            return _services.GridFsProxy.checkIfFileExist(storage.mongoDb, extractedTextFileName).
            then(function (fileExsists) {return {
                    fileExsists: fileExsists,
                    fileMeta: file.meta,
                    fileType: 'text/plain' };}).

            then(function (result) {
                if (!result.fileExsists) {
                    res.status(404).json(new _ErrorResponse2.default('Parsed content not found'));
                    return;
                }var

                fileName = result.fileMeta.short_name,fileType = result.fileType;

                res.writeHead(200, {
                    'Content-Type': fileType,
                    'Content-Disposition': 'attachment; filename*=UTF-8\'\'' + encodeURIComponent(fileName + '.txt') });


                _services.GridFsProxy.downloadFile(storage.mongoDb, extractedTextFileName).pipe(res);
            });
        }).
        catch(next);
    });

    /**     
         * @api {get} api/files/direct/:fileId/meta Get File Meta by File Id    
         * @apiGroup Files  
         *             
         * @apiHeader {String} ambar-email User email
         * @apiHeader {String} ambar-email-token User token
         * 
         * @apiSuccessExample HTTP/1.1 200 OK     
         * Octet-Stream
         * 
         * @apiErrorExample {json} HTTP/1.1 404 Not Found
         * File meta or content not found
         */
    api.get('/direct/:fileId/meta', _services.AuthService.ensureAuthenticated(storage), function (req, res, next) {
        var fileId = req.params.fileId;

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        _services.EsProxy.getFileByFileId(storage.elasticSearch, indexName, fileId).
        then(function (file) {
            if (file === null) {
                res.status(404).json(new _ErrorResponse2.default('File meta not found'));
                return;
            }

            res.status(200).json(file);
        }).
        catch(next);
    });

    /**     
          * @api {get} api/files/:uri Download File Content by Secure Uri    
          * @apiGroup Files                
          *  
          * @apiSuccessExample HTTP/1.1 200 OK     
          * Octet-Stream
          * 
          * @apiErrorExample {json} HTTP/1.1 404 Not Found
          * File meta or content not found
          */
    api.get('/:id', function (req, res, next) {
        var uri = req.params.id;

        var result = void 0;

        try {
            result = _services.CryptoService.decryptDownloadUri(uri);
        } catch (err) {
            res.status(400).json(new _ErrorResponse2.default('Uri is broken'));
            return;
        }var _result =

        result,fileId = _result.fileId,indexName = _result.indexName;

        _services.EsProxy.getFileByFileId(storage.elasticSearch, indexName, fileId, false).
        then(function (file) {
            if (file === null) {
                res.status(404).json(new _ErrorResponse2.default('File meta not found'));
                return;
            }

            return _services.GridFsProxy.checkIfFileExist(storage.mongoDb, file.sha256).
            then(function (fileExsists) {return {
                    fileExsists: fileExsists,
                    fileMeta: file.meta,
                    fileSha: file.sha256,
                    fileType: file.content.type };}).

            then(function (result) {
                if (!result.fileExsists) {
                    res.status(404).json(new _ErrorResponse2.default('File content not found'));
                    return;
                }var

                fileName = result.fileMeta.short_name,fileSha = result.fileSha,fileType = result.fileType;

                res.writeHead(200, {
                    'Content-Type': fileType,
                    'Content-Disposition': 'attachment; filename*=UTF-8\'\'' + encodeURIComponent(fileName) });


                _services.GridFsProxy.downloadFile(storage.mongoDb, fileSha).pipe(res);
            });
        }).
        catch(next);
    });

    /**     
          * @api {get} api/files/:uri/text Download Parsed Text by Secure Uri    
          * @apiGroup Files                
          *  
          * @apiSuccessExample HTTP/1.1 200 OK     
          * Octet-Stream
          * 
          * @apiErrorExample {json} HTTP/1.1 404 Not Found
          * File meta or content not found
          */
    api.get('/:id/text', function (req, res, next) {
        var uri = req.params.id;

        var result = void 0;
        try {
            result = _services.CryptoService.decryptDownloadUri(uri);
        } catch (err) {
            res.status(400).json(new _ErrorResponse2.default('Uri is broken'));
            return;
        }var _result2 =

        result,fileId = _result2.fileId,indexName = _result2.indexName;

        _services.EsProxy.getFileByFileId(storage.elasticSearch, indexName, fileId, false).
        then(function (file) {
            if (file === null) {
                res.status(404).json(new _ErrorResponse2.default('File meta not found'));
                return;
            }

            var extractedTextFileName = generateExtractedTextFileName(file.sha256);

            return _services.GridFsProxy.checkIfFileExist(storage.mongoDb, extractedTextFileName).
            then(function (fileExsists) {return {
                    fileExsists: fileExsists,
                    fileMeta: file.meta,
                    fileType: 'text/plain' };}).

            then(function (result) {
                if (!result.fileExsists) {
                    res.status(404).json(new _ErrorResponse2.default('Parsed content not found'));
                    return;
                }var

                fileName = result.fileMeta.short_name,fileType = result.fileType;

                res.writeHead(200, {
                    'Content-Type': fileType,
                    'Content-Disposition': 'attachment; filename*=UTF-8\'\'' + encodeURIComponent(fileName + '.txt') });


                _services.GridFsProxy.downloadFile(storage.mongoDb, extractedTextFileName).pipe(res);
            });
        }).
        catch(next);
    });

    /**     
            * @api {post} api/files/uiupload/:filename Upload File  
            * @apiGroup Files      
            * @apiDescription New source named `uiupload` with description `Automatically created on UI upload` will be created if source didn't exist.
            *          
            * @apiHeader {String} ambar-email User email
            * @apiHeader {String} ambar-email-token User token
            * 
            * @apiExample {curl} Upload File test.txt
            * curl -X POST \
            * http://ambar_api_address/api/files/uiupload/test.txt \
            * -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' \  
            * -F file=@test.txt
            * 
            * @apiSuccessExample {json} HTTP/1.1 200 OK     
            * { "fileId": xxxxx }
            * 
            * @apiErrorExample {json} HTTP/1.1 400 Bad Request
            * Wrong request data
            * 
            * @apiErrorExample {json} HTTP/1.1 404 Not Found
            * File meta or content not found
            */
    api.post('/uiupload/:fileName', _services.AuthService.ensureAuthenticated(storage), _services.FileUploader, function (req, res, next) {var
        fileName = req.params.fileName,files = req.files;

        var sourceId = 'ui-upload';
        var fileContent = Buffer.isBuffer(files[0].buffer) && Buffer.byteLength(files[0].buffer) > 0 ? files[0].buffer : new Buffer(0);
        var size = Buffer.byteLength(fileContent);

        if (size == 0) {
            res.status(400).json(new _ErrorResponse2.default('File is empty!'));
            return;
        }

        var sha = _services.CryptoService.getSha256(fileContent);
        var meta = MetaBuilder.buildShortMeta(fileName, sourceId);

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        Promise.all([
        _services.CacheProxy.getEsIndexContentSize(storage.redis, storage.elasticSearch, indexName),
        _services.CacheProxy.getEsIndexContentMaxSize(storage.redis, storage.mongoDb, indexName)]).

        then(function (_ref4) {var _ref5 = _slicedToArray(_ref4, 2),indexSize = _ref5[0],indexMaxSize = _ref5[1];
            if (indexSize + size > indexMaxSize && indexMaxSize != -1) {
                res.sendStatus(507);
                return;
            }

            _services.CacheProxy.setEsIndexContentSize(storage.redis, indexName, indexSize + size);

            return _services.MongoProxy.getBucketById(storage.mongoDb, indexName, sourceId).
            then(function (bucket) {
                if (!bucket) {
                    return _services.MongoProxy.createBucket(storage.mongoDb, { id: sourceId, index_name: indexName, description: 'Automatically created on UI upload' });
                }
                return true;
            }).
            then(function () {return _services.GridFsProxy.checkIfFileExist(storage.mongoDb, sha);}).
            then(function (found) {
                if (!found) {
                    return _services.GridFsProxy.uploadFile(storage.mongoDb, sha, fileContent);
                }
            }).
            then(function () {return _services.QueueProxy.enqueuePipelineMessage(storage, { sha: sha, indexName: indexName, fileId: generateFileId(meta.source_id, meta.full_name), crawlerUid: 'Default', meta: meta });}).
            then(function () {
                _services.CacheProxy.addMetaId(storage.redis, indexName, meta.id);
                res.status(200).json({ fileId: generateFileId(meta.source_id, meta.full_name) });
            });
        }).
        catch(next);
    });

    /**     
            * @api {put} api/files/hide/:fileId Hide File  
            * @apiGroup Files      
            * @apiDescription Hide file by file id
            *  
            * @apiHeader {String} ambar-email User email
            * @apiHeader {String} ambar-email-token User token
            * 
            * @apiSuccessExample {json} HTTP/1.1 200 OK     
            * HTTP/1.1 200 OK
            * 
            * @apiErrorExample {json} HTTP/1.1 404 NotFound
            * File not found
            */
    api.put('/hide/:fileId', _services.AuthService.ensureAuthenticated(storage), function (req, res, next) {
        var fileId = req.params.fileId;

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        _services.EsProxy.checkIfFileExists(storage.elasticSearch, indexName, fileId).
        then(function (fileExists) {
            if (!fileExists) {
                res.sendStatus(404);
                return;
            }

            return _services.EsProxy.hideFile(storage.elasticSearch, indexName, fileId).
            then(function () {return res.sendStatus(200);});
        }).
        catch(next);

    });

    /**     
            * @api {put} api/files/unhide/:fileId Unhide File  
            * @apiGroup Files      
            * @apiDescription Unhide file by file id
            *  
            * @apiHeader {String} ambar-email User email
            * @apiHeader {String} ambar-email-token User token
            * 
            * @apiSuccessExample {json} HTTP/1.1 200 OK     
            * HTTP/1.1 200 OK
            * 
            * @apiErrorExample {json} HTTP/1.1 404 NotFound
            * File not found
            */
    api.put('/unhide/:fileId', _services.AuthService.ensureAuthenticated(storage), function (req, res, next) {
        var fileId = req.params.fileId;

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        _services.EsProxy.checkIfFileExists(storage.elasticSearch, indexName, fileId).
        then(function (fileExists) {
            if (!fileExists) {
                res.sendStatus(404);
                return;
            }

            return _services.EsProxy.unHideFile(storage.elasticSearch, indexName, fileId).
            then(function () {return res.sendStatus(200);}).
            catch(function (err) {
                if (err.statusCode && err.statusCode == 404) {
                    res.sendStatus(200);
                    return;
                }

                throw new Error(err);
            });
        }).
        catch(next);
    });

    return api;
};
//# sourceMappingURL=files.js.map