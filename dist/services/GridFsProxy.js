'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.downloadFile = exports.removeFile = exports.checkIfFileExist = exports.uploadPlainTextFile = exports.uploadFile = undefined;var _gridfsStream = require('gridfs-stream');var _gridfsStream2 = _interopRequireDefault(_gridfsStream);
var _mongodb = require('mongodb');var _mongodb2 = _interopRequireDefault(_mongodb);
var _streamifier = require('streamifier');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var createGridFsInstance = function createGridFsInstance(mongoDbInstance) {
    return (0, _gridfsStream2.default)(mongoDbInstance, _mongodb2.default);
};

var uploadFile = exports.uploadFile = function uploadFile(mongo, fileName, buffer) {return new Promise(function (resolve, reject) {
        var gfs = createGridFsInstance(mongo);

        var writeStream = gfs.createWriteStream({ filename: fileName, mode: 'w' });

        writeStream.on('close', function (result) {return resolve(result);});
        writeStream.on('error', function (error) {return reject(error);});

        (0, _streamifier.createReadStream)(buffer).pipe(writeStream);
    });};

var uploadPlainTextFile = exports.uploadPlainTextFile = function uploadPlainTextFile(mongo, fileName, buffer) {return new Promise(function (resolve, reject) {
        var gfs = createGridFsInstance(mongo);

        var writeStream = gfs.createWriteStream({ filename: fileName, mode: 'w', content_type: 'text/plain' });

        writeStream.on('close', function (result) {return resolve(result);});
        writeStream.on('error', function (error) {return reject(error);});

        (0, _streamifier.createReadStream)(buffer).pipe(writeStream);
    });};

var checkIfFileExist = exports.checkIfFileExist = function checkIfFileExist(mongo, fileName) {return new Promise(function (resolve, reject) {
        var gfs = createGridFsInstance(mongo);

        gfs.exist({ filename: fileName }, function (err, found) {
            if (err) {
                reject(err);
                return;
            }

            resolve(found);
        });
    });};

var removeFile = exports.removeFile = function removeFile(mongo, fileName) {return new Promise(function (resolve, reject) {
        var gfs = createGridFsInstance(mongo);

        gfs.remove({ filename: fileName }, function (err, gridStore) {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });};

var downloadFile = exports.downloadFile = function downloadFile(mongo, fileName) {
    var gfs = createGridFsInstance(mongo);
    var readStream = gfs.createReadStream({ filename: fileName });
    return readStream;
};
//# sourceMappingURL=GridFsProxy.js.map