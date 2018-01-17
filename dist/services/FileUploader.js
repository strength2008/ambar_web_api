'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _multer = require('multer');var _multer2 = _interopRequireDefault(_multer);
var _ErrorResponse = require('../utils/ErrorResponse');var _ErrorResponse2 = _interopRequireDefault(_ErrorResponse);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var MAX_FILE_SIZE_MB = 512;
var MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

var upload = (0, _multer2.default)({
    limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
        files: 1 } });



var uploader = function uploader(req, res, next) {return upload.any()(req, res, function (err) {
        if (err) {
            switch (err.code) {
                case 'LIMIT_FILE_SIZE':
                    res.status(400).json(new _ErrorResponse2.default('File is too large (> ' + MAX_FILE_SIZE_MB + ' Mb)'));
                    break;
                default:
                    res.status(500).json(new _ErrorResponse2.default(err.message));}

        } else {
            var files = req.files;

            if (!files || files.length === 0 || files.some(function (f) {return !f.buffer;})) {
                res.status(400).json(new _ErrorResponse2.default('No files are attached or some attachments are empty'));
                return;
            }

            next();
        }
    });};exports.default =

uploader;
//# sourceMappingURL=FileUploader.js.map