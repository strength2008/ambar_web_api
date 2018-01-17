'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.sendSetPasswordEmail = undefined;var _mandrill = require('mandrill-api/mandrill');var _mandrill2 = _interopRequireDefault(_mandrill);
var _index = require('./index');
var _config = require('../config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var sendSetPasswordEmail = exports.sendSetPasswordEmail = function sendSetPasswordEmail(email, setPasswordKey, setPasswordKeyExpiration, name) {
    var mandrillClient = new _mandrill2.default.Mandrill(_config2.default.mandrillKey);
    var url = _config2.default.feUrl + '/set-password?email=' + encodeURIComponent(email) + '&token=' + encodeURIComponent(setPasswordKey);
    var setPasswordKeyExpirationFormatted = _index.DateTimeService.parseDateTime(setPasswordKeyExpiration).format('YYYY-MM-DD HH:mm');

    return new Promise(function (resolve, reject) {return (
            mandrillClient.messages.sendTemplate(
            {
                template_name: "ambar-cloud-set-your-password",
                template_content: {},
                message: {
                    from_email: 'hello@ambar.cloud',
                    from_name: 'Ambar Team',
                    subject: 'Ambar: Set Your Password',
                    to: [
                    { email: email }],

                    global_merge_vars: [
                    {
                        name: "activate_url",
                        content: url },

                    {
                        name: "activate_url_expiration",
                        content: setPasswordKeyExpirationFormatted },

                    {
                        name: "user_name",
                        content: name }] } },



            function (result) {
                resolve(result);
            }, function (e) {
                reject(e);
            }));});

};
//# sourceMappingURL=MandrillProxy.js.map