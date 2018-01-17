'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.decryptDownloadUri = exports.encryptDownloadUri = exports.generateRandom = exports.getPasswordHash = exports.getSha1 = exports.getSha256 = undefined;var _crypto = require('crypto');var _crypto2 = _interopRequireDefault(_crypto);
var _bluebird = require('bluebird');var _bluebird2 = _interopRequireDefault(_bluebird);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var pbkdf2 = _bluebird2.default.promisify(_crypto2.default.pbkdf2);

var DOWNLOAD_URI_CIPHER_KEY = 'BfeZp2UV';

var getSha256 = exports.getSha256 = function getSha256(data) {return _crypto2.default.createHash('sha256').update(data).digest('hex');};
var getSha1 = exports.getSha1 = function getSha1(data) {return _crypto2.default.createHash('sha1').update(data).digest('hex');};

var getPasswordHash = exports.getPasswordHash = function getPasswordHash(password, salt) {return pbkdf2(password, salt, 8192, 512, 'sha512').then(function (hash) {return hash.toString('hex');});};

var generateRandom = exports.generateRandom = function generateRandom() {var length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 256;return _crypto2.default.randomBytes(length).toString('hex');};

var encryptDownloadUri = exports.encryptDownloadUri = function encryptDownloadUri(indexName, fileId) {
    var cipher = _crypto2.default.createCipher('aes192', DOWNLOAD_URI_CIPHER_KEY);
    var uri = { indexName: indexName, fileId: fileId };

    return cipher.update(JSON.stringify(uri), 'utf8', 'hex') + cipher.final('hex');
};

var decryptDownloadUri = exports.decryptDownloadUri = function decryptDownloadUri(uri) {
    var decipher = _crypto2.default.createDecipher('aes192', DOWNLOAD_URI_CIPHER_KEY);
    var decryptedUri = decipher.update(uri, 'hex', 'utf8') + decipher.final('utf8');

    return JSON.parse(decryptedUri);
};
//# sourceMappingURL=CryptoService.js.map