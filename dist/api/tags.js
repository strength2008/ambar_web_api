'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _express = require('express');
var _ErrorResponse = require('../utils/ErrorResponse');var _ErrorResponse2 = _interopRequireDefault(_ErrorResponse);
var _services = require('../services');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}








var AUTO_TAG_TYPE = 'auto';
var SOURCE_TAG_TYPE = 'source';
var MANUAL_TAG_TYPE = 'manual';

var generateTagId = function generateTagId(indexName, fileId, tagType, tagName) {
    return _services.CryptoService.getSha256('tag_' + indexName.trim().toLowerCase() + fileId.trim().toLowerCase() + tagType.trim().toLowerCase() + tagName.trim().toLowerCase());
};exports.default =

function (_ref) {var config = _ref.config,storage = _ref.storage;
    var api = (0, _express.Router)();

    //////////////// CALLED FROM UI ////////////////////////////////////
    /**     
     * @api {get} api/tags/ Get Tags 
     * @apiGroup Tags                
     *  
     * @apiHeader {String} ambar-email User email
     * @apiHeader {String} ambar-email-token User token
     * 
     * 
     * @apiSuccessExample HTTP/1.1 200 OK     
    [  
      {  
         "name":"ocr",
         "filesCount":3
      },
      {  
         "name":"test",
         "filesCount":2
      },
      {  
         "name":"pdf",
         "filesCount":1
      }
    ]
     * 
     */
    api.get('/', _services.AuthService.ensureAuthenticated(storage), function (req, res, next) {
        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);

        _services.CacheProxy.getTags(storage.redis, storage.elasticSearch, indexName).
        then(function (tags) {
            res.status(200).json(tags);
        }).
        catch(next);
    });

    /**     
            * @api {post} api/tags/:fileId/:tagType/:tagName Add Tag For File   
            * @apiGroup Tags                
            *  
            * @apiHeader {String} ambar-email User email
            * @apiHeader {String} ambar-email-token User token
            * 
            * @apiParam {String} fileId     File Id to add tag to.
            * @apiParam {String} tagType    Tag type to add.
            * @apiParam {String} tagName    Tag name to add.
            * 
            * @apiSuccessExample HTTP/1.1 200 OK     
        {  
          "tagId":"e9536a83e64ff03617ab0379d835ac7bbf213bafb95cb42907a56e735472d4fc",
          "tags":[  
             {  
                "name":"ocr",
                "filesCount":3
             },
             {  
                "name":"test",
                "filesCount":2
             },
             {  
                "name":"pdf",
                "filesCount":1
             }
          ]
        }
            * 
            */
    api.post('/:fileId/:tagType/:tagName', _services.AuthService.ensureAuthenticated(storage), function (req, res, next) {var _req$params =
        req.params,fileId = _req$params.fileId,tagType = _req$params.tagType,tagName = _req$params.tagName;

        if (!tagName || !fileId || !tagType || tagType.toLowerCase() != MANUAL_TAG_TYPE) {
            res.status(400).json(new _ErrorResponse2.default('Required field is missing'));
            return;
        }

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);
        var type = tagType.toLowerCase();
        var tagId = generateTagId(indexName, fileId, type, tagName);

        var tag = {
            id: tagId,
            type: type.toLowerCase(),
            name: tagName.trim().toLowerCase() };


        _services.CacheProxy.addTag(storage.redis, storage.elasticSearch, indexName, fileId, tag).
        then(function (tags) {
            res.status(200).json({ tagId: tagId, tags: tags });
        }).
        catch(next);
    });

    /**     
          * @api {delete} api/tags/:fileId/:tagType/:tagName Delete Tag From File   
          * @apiGroup Tags                
          *  
          * @apiHeader {String} ambar-email User email
          * @apiHeader {String} ambar-email-token User token
          * 
          * @apiParam {String} fileId     File Id to delete tag from.
          * @apiParam {String} tagType    Tag type to delete.
          * @apiParam {String} tagName    Tag name to delete.
          * 
          * @apiSuccessExample HTTP/1.1 200 OK     
        {  
        "tags":[  
            {  
              "name":"ocr",
              "filesCount":3
           },
           {  
              "name":"test",
              "filesCount":2
           },
           {  
              "name":"pdf",
              "filesCount":1
           }
        ]
        }   
          * 
          */
    api.delete('/:fileId/:tagType/:tagName', _services.AuthService.ensureAuthenticated(storage), function (req, res, next) {var _req$params2 =
        req.params,fileId = _req$params2.fileId,tagType = _req$params2.tagType,tagName = _req$params2.tagName;

        if (!fileId || !tagName || !tagType) {
            res.status(400).json(new _ErrorResponse2.default('Required field is missing'));
            return;
        }

        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);
        var type = tagType.toLowerCase();
        var tagId = generateTagId(indexName, fileId, type, tagName);

        var tag = {
            id: tagId,
            type: type.toLowerCase(),
            name: tagName.trim().toLowerCase() };


        _services.CacheProxy.removeTag(storage.redis, storage.elasticSearch, indexName, fileId, tag).
        then(function (tags) {
            res.status(200).json({ tags: tags });
        }).
        catch(next);
    });

    //////////////// CALLED FROM PIPELINE ////////////////////////////////////
    /**
    * Add tag for specified file id
    */
    api.post('/service/:indexName/:fileId/:tagType/:tagName', _services.AuthService.ensureAuthenticatedAsService(storage), function (req, res, next) {var _req$params3 =
        req.params,fileId = _req$params3.fileId,indexName = _req$params3.indexName,tagName = _req$params3.tagName,tagType = _req$params3.tagType;

        if (!tagName || !fileId || !indexName || !tagType || tagType.toLowerCase() != AUTO_TAG_TYPE && tagType.toLowerCase() != SOURCE_TAG_TYPE) {
            res.status(400).json(new _ErrorResponse2.default('Required field is missing'));
            return;
        }

        var type = tagType.toLowerCase();
        var tagId = generateTagId(indexName, fileId, type, tagName);

        var tag = {
            id: tagId,
            type: type,
            name: tagName.toLowerCase() };


        _services.CacheProxy.addTag(storage.redis, storage.elasticSearch, indexName, fileId, tag).
        then(function (tags) {
            res.sendStatus(200);
        }).
        catch(next);
    });

    /**
        * Get tagging rules
        */
    api.get('/service/taggingrules', _services.AuthService.ensureAuthenticatedAsService(storage), function (req, res, next) {
        _services.MongoProxy.getTaggingRules(storage.mongoDb).
        then(function (rules) {
            res.status(200).json(rules);
        }).
        catch(next);
    });

    return api;
};
//# sourceMappingURL=tags.js.map