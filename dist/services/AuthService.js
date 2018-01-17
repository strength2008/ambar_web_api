'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.ensureAuthenticatedAsService = exports.ensureAuthenticated = exports.init = exports.generateSetPasswordFields = exports.generateNewUser = exports.generateUserToken = exports.generateServiceToken = exports.extractEmailFromHeaders = exports.extractTokenFromHeaders = exports.getUserIndex = exports.isSettingsPageAllowed = exports.getAllowedUiRoutes = exports.DEFAULT_SET_PASSWORD_KEY_TTL_DAYS = exports.DEFAULT_TOKEN_TTL_SECONDS = undefined;var _extends = Object.assign || function (target) {for (var i = 1; i < arguments.length; i++) {var source = arguments[i];for (var key in source) {if (Object.prototype.hasOwnProperty.call(source, key)) {target[key] = source[key];}}}return target;};var _index = require('./index');
var _ErrorResponse = require('../utils/ErrorResponse');var _ErrorResponse2 = _interopRequireDefault(_ErrorResponse);
var _config = require('../config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var DEFAULT_TOKEN_TTL_SECONDS = exports.DEFAULT_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
var DEFAULT_SET_PASSWORD_KEY_TTL_DAYS = exports.DEFAULT_SET_PASSWORD_KEY_TTL_DAYS = 7;

var getStorageMax = function getStorageMax(plan) {return plan === 'free' ? 1024 * 1024 * 1024 : -1;};

var UI_SEARCH_PAGE_LOCATION = '/';
var UI_SETTINGS_PAGE_LOCATION = '/settings';
var UI_STAT_PAGE_LOCATION = '/statistics';
var UI_ACCOUNT_PAGE_LOCATION = '/account';

var calculateToken = function calculateToken(email, emailToken) {return !email || !emailToken ? null : 'atk:' + _index.CryptoService.getSha256(email + '|' + emailToken);};

var getAllowedUiRoutes = exports.getAllowedUiRoutes = function getAllowedUiRoutes(config, req) {
    var routes = {
        uiRoutes: [
        UI_SEARCH_PAGE_LOCATION,
        UI_STAT_PAGE_LOCATION,
        UI_ACCOUNT_PAGE_LOCATION,
        isSettingsPageAllowed(config, req) ? UI_SETTINGS_PAGE_LOCATION : undefined] };



    return routes;
};

var isSettingsPageAllowed = exports.isSettingsPageAllowed = function isSettingsPageAllowed(config, req) {
    var email = extractEmailFromHeaders(req);

    return email === config.defaultAccountEmail || config.mode != 'cloud';
};

var getUserIndex = exports.getUserIndex = function getUserIndex(email) {return _config2.default.mode === 'cloud' ? _index.CryptoService.getSha1(email.toLowerCase()) : _index.CryptoService.getSha1(_config2.default.defaultAccountEmail.toLowerCase());};

var checkIfKeyPresentAndNotEmpty = function checkIfKeyPresentAndNotEmpty(key, dictionary) {
    if (!(key in dictionary)) {return false;}
    if (!dictionary[key]) {return false;}
    if (dictionary[key] == '') {return false;}
    return true;
};

var extractTokenFromHeaders = exports.extractTokenFromHeaders = function extractTokenFromHeaders(req) {
    if (!checkIfKeyPresentAndNotEmpty('ambar-email', req.headers) || !checkIfKeyPresentAndNotEmpty('ambar-email-token', req.headers)) {
        return null;
    }
    var email = req.headers['ambar-email'].toLowerCase();
    var emailToken = req.headers['ambar-email-token'];
    return calculateToken(email, emailToken);
};

var extractEmailFromHeaders = exports.extractEmailFromHeaders = function extractEmailFromHeaders(req) {return checkIfKeyPresentAndNotEmpty('ambar-email', req.headers) ? req.headers['ambar-email'].toLowerCase() : _config2.default.defaultAccountEmail;};

var generateServiceToken = exports.generateServiceToken = function generateServiceToken(storage, serviceId) {
    var serviceToken = _index.CryptoService.generateRandom();
    var token = calculateToken(serviceId, serviceToken);
    _index.CacheProxy.addServiceToken(storage.redis, token);
    return serviceToken;
};

var generateUserToken = exports.generateUserToken = function generateUserToken(storage, email) {
    var emailToken = _index.CryptoService.generateRandom();
    var token = calculateToken(email, emailToken);
    _index.CacheProxy.addToken(storage.redis, token, DEFAULT_TOKEN_TTL_SECONDS);
    return { emailToken: emailToken, ttl: DEFAULT_TOKEN_TTL_SECONDS };
};

var generateNewUser = exports.generateNewUser = function generateNewUser(name, email, langAnalyzer, plan) {return new Promise(function (resolve, reject) {
        var setPasswordKey = _index.CryptoService.generateRandom(64);

        resolve(_extends({
            name: name,
            email: email,
            lang_analyzer: langAnalyzer,
            plan: plan,
            storage_max: getStorageMax(plan),
            password_hash: null,
            password_salt: null,
            role: _config2.default.defaultAccountRole,
            state: 'new',
            index_name: getUserIndex(email) },
        generateSetPasswordFields(), {
            created: _index.DateTimeService.getCurrentDateTime() }));

    });};

var generateSetPasswordFields = exports.generateSetPasswordFields = function generateSetPasswordFields() {
    return {
        set_password_key: _index.CryptoService.generateRandom(64),
        set_password_key_expiration: _index.DateTimeService.getCurrentDateTimeAddDays(DEFAULT_SET_PASSWORD_KEY_TTL_DAYS) };

};

var generateDefaultUser = function generateDefaultUser(name, email, password, langAnalyzer, plan) {return new Promise(function (resolve, reject) {
        var salt = _index.CryptoService.generateRandom();

        generateNewUser(name, email, langAnalyzer, plan).
        then(function (user) {return (
                resolve(_extends({},
                user, {
                    password_hash: '',
                    password_salt: '',
                    state: 'active',
                    set_password_key: null,
                    set_password_key_expiration: null })));}).


        catch(function (err) {reject(err);});
    });};

var generateDefaultUserRole = function generateDefaultUserRole() {return {
        name: 'admin',
        acc_type: 'allow_all',
        acc_rules: [] };};


var init = exports.init = function init(storage) {return new Promise(function (resolve, reject) {
        _index.MongoProxy.getUserByEmail(storage.mongoDb, _config2.default.defaultAccountEmail).
        then(function (user) {
            if (user) {
                resolve();
                return;
            }
            return generateDefaultUser(_config2.default.defaultAccountName, _config2.default.defaultAccountEmail, _config2.default.defaultAccountPassword, _config2.default.defaultAccountLangAnalyzer, _config2.default.defaultAccountPlan).
            then(function (generatedUser) {return _index.MongoProxy.createUpdateUser(storage.mongoDb, generatedUser);}).
            then(function () {return _index.MongoProxy.createUpdateUserRole(storage.mongoDb, generateDefaultUserRole());}).
            then(function () {return _index.EsProxy.createUserIndex(
                storage.elasticSearch,
                getUserIndex(_config2.default.defaultAccountEmail),
                _config2.default.defaultAccountLangAnalyzer);}).
            then(function () {return resolve();});
        }).
        catch(function (err) {reject(err);});
    });};

var ensureAuthenticated = exports.ensureAuthenticated = function ensureAuthenticated(storage) {return function (req, res, next) {
        if (_config2.default.auth != 'basic') {
            next();
            return;
        }

        var token = extractTokenFromHeaders(req);

        if (!token) {
            res.status(401).json(new _ErrorResponse2.default('Unauthorized'));
            return;
        }

        _index.CacheProxy.checkIfTokenExists(storage.redis, token).
        then(function (exists) {
            if (!exists) {
                res.status(401).json(new _ErrorResponse2.default('Unauthorized'));
                return;
            }
            next();
        }).
        catch(function () {
            res.status(500).json(new _ErrorResponse2.default('Cache error'));
        });
    };};

var ensureAuthenticatedAsService = exports.ensureAuthenticatedAsService = function ensureAuthenticatedAsService(storage) {return function (req, res, next) {
        if (_config2.default.auth != 'basic') {
            next();
            return;
        }

        var caller = extractEmailFromHeaders(req);
        var serviceRegex = new RegExp('^(' + _config2.default.pipelineContainerPrefix + '|' + _config2.default.crawlerContainerPrefix + ')[0-9]{1,}');

        if (!serviceRegex.test(caller)) {
            res.status(401).json(new _ErrorResponse2.default('Unauthorized'));
            return;
        }

        var token = extractTokenFromHeaders(req);

        if (!token) {
            res.status(401).json(new _ErrorResponse2.default('Unauthorized'));
            return;
        }

        _index.CacheProxy.checkIfTokenExists(storage.redis, token).
        then(function (exists) {
            if (!exists) {
                res.status(401).json(new _ErrorResponse2.default('Unauthorized'));
                return;
            }
            next();
        }).
        catch(function () {
            res.status(500).json(new _ErrorResponse2.default('Cache error'));
        });
    };};
//# sourceMappingURL=AuthService.js.map