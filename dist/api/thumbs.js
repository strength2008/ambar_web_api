'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _express = require('express');
var _ErrorResponse = require('../utils/ErrorResponse');var _ErrorResponse2 = _interopRequireDefault(_ErrorResponse);
var _services = require('../services');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}exports.default =

function (_ref) {var config = _ref.config,storage = _ref.storage;
    var api = (0, _express.Router)();

    /**     
                                      * @api {post} api/thumbs/:id Add or Update Thumbnail     
                                      * @apiGroup Thumbnails                
                                      *  
                                      * @apiSuccessExample HTTP/1.1 200 OK     
                                      * HTTP/1.1 200 OK
                                      * 
                                      * @apiErrorExample {json} HTTP/1.1 400 Bad Request
                                      * Request body is empty
                                      */
    api.post('/:id', _services.AuthService.ensureAuthenticated(storage), _services.FileUploader, function (req, res, next) {var
        thumbId = req.params.id,files = req.files;

        if (!files) {
            res.status(400).json(new _ErrorResponse2.default('Request body is empty'));
            return;
        }

        var fileContent = Buffer.byteLength(files[0].buffer) > 0 ? files[0].buffer : new Buffer(0);

        _services.MongoProxy.createThumbnail(storage.mongoDb, thumbId, fileContent).
        then(function (result) {
            res.sendStatus(200);
        }).
        catch(next);
    });

    /**     
         * @api {get} api/thumbs/:id Get Thumbnail by Id   
         * @apiGroup Thumbnails                
         *  
         * @apiSuccessExample HTTP/1.1 200 OK     
         * Octet-Stream
         * 
         * @apiErrorExample {json} HTTP/1.1 404 NotFound
         * HTTP/1.1 404 NotFound
         */

    api.get('/:id', function (req, res, next) {var
        thumbId = req.params.id;

        _services.MongoProxy.getThumbnailById(storage.mongoDb, thumbId).
        then(function (thumb) {
            if (!thumb) {
                res.sendStatus(404);
                return;
            }

            res.status(200).
            header({
                'Content-Type': 'image/jpeg',
                'Content-Disposition': 'attachment; filename*=UTF-8\'\'' + encodeURIComponent(thumbId) + '.jpeg' }).

            send(thumb.data.buffer);
        }).
        catch(next);
    });

    return api;
};
//# sourceMappingURL=thumbs.js.map