'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.tryDisableToken = exports.disableToken = undefined;var _dropbox = require('dropbox');var _dropbox2 = _interopRequireDefault(_dropbox);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var disableToken = exports.disableToken = function disableToken(token) {return new Promise(function (resolve, reject) {
        var dbx = new _dropbox2.default({ accessToken: token });
        dbx.authTokenRevoke().
        then(function () {return resolve();}).
        catch(function (err) {return reject(err);});
    });};

var tryDisableToken = exports.tryDisableToken = function tryDisableToken(token) {return new Promise(function (resolve, reject) {
        var dbx = new _dropbox2.default({ accessToken: token });
        dbx.authTokenRevoke().
        then(function () {return resolve(true);}).
        catch(function (err) {return resolve(false);});
    });};
//# sourceMappingURL=DropboxProxy.js.map