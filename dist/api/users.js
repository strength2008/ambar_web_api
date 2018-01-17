'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _extends = Object.assign || function (target) {for (var i = 1; i < arguments.length; i++) {var source = arguments[i];for (var key in source) {if (Object.prototype.hasOwnProperty.call(source, key)) {target[key] = source[key];}}}return target;};var _express = require('express');
var _ErrorResponse = require('../utils/ErrorResponse');var _ErrorResponse2 = _interopRequireDefault(_ErrorResponse);
var _services = require('../services');
var _moment = require('moment');var _moment2 = _interopRequireDefault(_moment);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var isStrongPassword = function isStrongPassword(password) {
    var re = /^(?=(.*[A-Z])+)(?=(.*[0-9])+)(?=(.*[a-z])+).{8,}$/;
    return re.test(password);
};
var isValidEmail = function isValidEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
};exports.default =

function (_ref) {var config = _ref.config,storage = _ref.storage;
    var api = (0, _express.Router)();

    /**     
                                        * @api {post} api/users/login Login  
                                        * @apiGroup Users                
                                        * 
                                        * @apiParam {String} email     User Email
                                        * @apiParam {String} password     User Password
                                        * 
                                        * @apiSuccessExample HTTP/1.1 200 OK     
                                      {  
                                      "token": "504d44935c2ccefb557fd49636a73239147b3895db2f2f...",
                                      "ttl": "604800"
                                      }   
                                        * 
                                        * * @apiErrorExample {json} HTTP/1.1 400 BadRequest
                                        * Bad request
                                        * 
                                        * * @apiErrorExample {json} HTTP/1.1 404 NotFound
                                        * User with specified email not found
                                        * 
                                        * * @apiErrorExample {json} HTTP/1.1 409 Conflict
                                        * User is not in active state
                                        * 
                                        * * @apiErrorExample {json} HTTP/1.1 401 Unauthorized
                                        * Wrong password
                                        */
    api.post('/login', function (req, res, next) {var _req$body =
        req.body,email = _req$body.email,password = _req$body.password;

        if (!email || !password) {
            res.status(400).json(new _ErrorResponse2.default('Bad request'));
            return;
        }

        var normalizedEmail = email.toLowerCase().trim();

        _services.MongoProxy.getUserByEmail(storage.mongoDb, normalizedEmail).
        then(function (user) {
            if (!user) {
                res.status(404).json(new _ErrorResponse2.default('User with specified email not found'));
                return;
            }

            if (user.state != 'active') {
                res.status(409).json(new _ErrorResponse2.default('User is not in active state'));
                return;
            }

            return _services.CryptoService.getPasswordHash(password, user.password_salt).
            then(function (passwordHash) {
                if (passwordHash != user.password_hash) {
                    res.status(401).json(new _ErrorResponse2.default('Wrong password'));
                    return;
                }var _AuthService$generate =

                _services.AuthService.generateUserToken(storage, normalizedEmail),emailToken = _AuthService$generate.emailToken,ttl = _AuthService$generate.ttl;

                res.status(200).json({ token: emailToken, ttl: ttl });
                return;
            });
        }).
        catch(next);
    });

    /**     
         * @api {post} api/users/logout Logout  
         * @apiGroup Users                
         * 
         * @apiHeader {String} ambar-email User email
         * @apiHeader {String} ambar-email-token User token     
         * 
         * @apiErrorExample {json} HTTP/1.1 401 Unauthorized
         * Unauthorized
         */
    api.post('/logout', _services.AuthService.ensureAuthenticated(storage), function (req, res, next) {
        var token = _services.AuthService.extractTokenFromHeaders(req);

        try {
            _services.CacheProxy.removeToken(storage.redis, token);
            res.sendStatus(200);
        }
        catch (err) {
            next(err);
        }
    });


    var CECheckUserCreateAllowed = function CECheckUserCreateAllowed(userCount) {return userCount > 0 ? false : true;};

    /**
                                                                                                                          * Create User
                                                                                                                          */
    api.post('/', function (req, res, next) {var _req$body2 =
        req.body,name = _req$body2.name,email = _req$body2.email,langAnalyzer = _req$body2.langAnalyzer;

        if (!name || !email || !isValidEmail(email) || !langAnalyzer) {
            res.status(400).json(new _ErrorResponse2.default('Bad request'));
        }

        var normalizedEmail = email.toLowerCase().trim();

        var userPlan = config.mode === 'cloud' ? 'free' : config.defaultAccountPlan;
        var userLangAnalyzer = config.mode === 'cloud' ? langAnalyzer : config.defaultAccountLangAnalyzer;

        _services.MongoProxy.getUsersCount(storage.mongoDb, config.defaultAccountEmail).
        then(function (usersCount) {
            var checkUserCreateAllowed = typeof ENTERPEDITCheckUserCreateAllowed !== 'undefined' ? ENTERPEDITCheckUserCreateAllowed : CECheckUserCreateAllowed;

            if (!checkUserCreateAllowed(usersCount)) {
                res.status(409).json(new _ErrorResponse2.default('Only one user account allowed for Ambar CE'));
                return;
            }

            return _services.MongoProxy.getUserByEmail(storage.mongoDb, normalizedEmail).
            then(function (user) {
                if (user && user.state === 'active') {
                    res.status(409).json(new _ErrorResponse2.default('User with provided email already exists'));
                    return;
                }

                return _services.AuthService.generateNewUser(name, normalizedEmail, userLangAnalyzer, userPlan).
                then(function (generatedUser) {
                    return _services.MongoProxy.createUpdateUser(storage.mongoDb, generatedUser).
                    then(function () {
                        return _services.MandrillProxy.sendSetPasswordEmail(
                        normalizedEmail,
                        generatedUser.set_password_key,
                        generatedUser.set_password_key_expiration,
                        name);
                    }).
                    then(function () {
                        res.sendStatus(200);
                    });
                });
            });
        }).
        catch(next);
    });

    /**
          * Set Password
          */
    api.post('/password/set', function (req, res, next) {var _req$body3 =
        req.body,email = _req$body3.email,password = _req$body3.password,setPasswordKey = _req$body3.setPasswordKey;

        if (!email || !password || !setPasswordKey || !isStrongPassword(password)) {
            res.status(400).json(new _ErrorResponse2.default('Bad request'));
        }

        var normalizedEmail = email.toLowerCase().trim();

        _services.MongoProxy.getUserByEmail(storage.mongoDb, normalizedEmail).
        then(function (user) {
            if (!user) {
                res.status(404).json(new _ErrorResponse2.default('User with specified email not found'));
                return;
            }

            if (!user.set_password_key || user.set_password_key != setPasswordKey) {
                res.status(401).json(new _ErrorResponse2.default('Wrong link'));
                return;
            }

            if (_services.DateTimeService.parseDateTime(user.set_password_key_expiration) < (0, _moment2.default)()) {
                res.status(408).json(new _ErrorResponse2.default('The link has expired'));
                return;
            }

            var salt = _services.CryptoService.generateRandom();

            return _services.CryptoService.getPasswordHash(password, salt).
            then(function (passwordHash) {
                var updatedUser = _extends({},
                user, {
                    password_hash: passwordHash,
                    password_salt: salt,
                    state: 'active',
                    set_password_key_expiration: null,
                    set_password_key: null });


                return _services.MongoProxy.createUpdateUser(storage.mongoDb, updatedUser);
            }).
            then(function () {
                if (user.state === 'new' && config.mode === 'cloud') {
                    var indexName = _services.AuthService.getUserIndex(user.email);
                    return _services.EsProxy.createUserIndex(storage.elasticSearch, indexName, user.lang_analyzer);
                }
            }).
            then(function () {var _AuthService$generate2 =
                _services.AuthService.generateUserToken(storage, user.email),emailToken = _AuthService$generate2.emailToken,ttl = _AuthService$generate2.ttl;

                res.status(200).json({ token: emailToken, ttl: ttl });
            });
        }).
        catch(next);
    });

    /**
         * Set Password is allowed
         */
    api.post('/password/set/allowed', function (req, res, next) {var _req$body4 =
        req.body,email = _req$body4.email,setPasswordKey = _req$body4.setPasswordKey;

        if (!email || !setPasswordKey) {
            res.status(400).json(new _ErrorResponse2.default('Bad request'));
        }

        var normalizedEmail = email.toLowerCase().trim();

        _services.MongoProxy.getUserByEmail(storage.mongoDb, normalizedEmail).
        then(function (user) {
            if (!user) {
                res.status(404).json(new _ErrorResponse2.default('User with specified email not found'));
                return;
            }

            if (!user.set_password_key || user.set_password_key != setPasswordKey) {
                res.status(401).json(new _ErrorResponse2.default('Wrong link'));
                return;
            }

            if (_services.DateTimeService.parseDateTime(user.set_password_key_expiration) < (0, _moment2.default)()) {
                res.status(408).json(new _ErrorResponse2.default('The link has expired'));
                return;
            }

            res.sendStatus(200);
        }).
        catch(next);
    });

    /**
         * Reset Password
         */
    api.post('/password/reset', function (req, res, next) {var
        email = req.body.email;

        if (!email) {
            res.status(400).json(new _ErrorResponse2.default('Bad request'));
        }

        var normalizedEmail = email.toLowerCase().trim();

        _services.MongoProxy.getUserByEmail(storage.mongoDb, normalizedEmail).
        then(function (user) {
            if (!user) {
                res.status(404).json(new _ErrorResponse2.default('User with specified email not found'));
                return;
            }

            var updatedUser = _extends({}, user, _services.AuthService.generateSetPasswordFields());

            return _services.MongoProxy.createUpdateUser(storage.mongoDb, updatedUser).
            then(function () {
                return _services.MandrillProxy.sendSetPasswordEmail(
                normalizedEmail,
                updatedUser.set_password_key,
                updatedUser.set_password_key_expiration,
                user.name);
            }).
            then(function () {
                res.sendStatus(200);
            });
        }).
        catch(next);
    });

    /**
         * Check auth
         */
    api.get('/check', _services.AuthService.ensureAuthenticated(storage), function (req, res, next) {
        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email);
        res.status(200).json({ routes: _services.AuthService.getAllowedUiRoutes(config, req) });
    });

    /**
          * Change Password
          */
    api.post('/password/change', _services.AuthService.ensureAuthenticated(storage), function (req, res, next) {var _req$body5 =
        req.body,password = _req$body5.password,newPassword = _req$body5.newPassword;

        if (!password || !newPassword || !isStrongPassword(newPassword)) {
            res.status(400).json(new _ErrorResponse2.default('Bad request'));
            return;
        }

        var email = _services.AuthService.extractEmailFromHeaders(req);

        _services.MongoProxy.getUserByEmail(storage.mongoDb, email).
        then(function (user) {
            if (!user) {
                res.status(404).json(new _ErrorResponse2.default('User with specified email not found'));
                return;
            }

            if (user.state != 'active') {
                res.status(409).json(new _ErrorResponse2.default('User is not in active state'));
                return;
            }

            return _services.CryptoService.getPasswordHash(password, user.password_salt).
            then(function (passwordHash) {
                if (passwordHash != user.password_hash) {
                    res.status(401).json(new _ErrorResponse2.default('Wrong current password'));
                    return;
                }

                var newSalt = _services.CryptoService.generateRandom();

                return _services.CryptoService.getPasswordHash(newPassword, newSalt).
                then(function (newPasswordHash) {
                    var updatedUser = _extends({}, user, { password_hash: newPasswordHash, password_salt: newSalt });
                    return _services.MongoProxy.createUpdateUser(storage.mongoDb, updatedUser);
                }).
                then(function () {
                    res.sendStatus(200);
                });
            });
        }).
        catch(next);
    });

    /**
         * Get user info by email
         */
    api.get('/', _services.AuthService.ensureAuthenticated(storage), function (req, res, next) {
        var email = _services.AuthService.extractEmailFromHeaders(req);

        _services.MongoProxy.getUserByEmail(storage.mongoDb, email).
        then(function (user) {
            if (!user) {
                res.status(404).json(new _ErrorResponse2.default('User with specified email not found'));
                return;
            }

            var indexName = _services.AuthService.getUserIndex(email);

            _services.CacheProxy.getEsIndexContentSize(storage.redis, storage.elasticSearch, indexName).
            then(function (userBytes) {

                var result = {
                    name: user.name,
                    email: user.email,
                    state: user.state,
                    created: user.created,
                    lang_analyzer: user.lang_analyzer,
                    plan: user.plan,
                    storage_max: user.storage_max,
                    storage_used: userBytes,
                    isDefaultUser: user.email === config.defaultAccountEmail };


                res.status(200).json(result);
            });
        }).
        catch(next);
    });

    /**
         * Delete user
         */
    api.delete('/', _services.AuthService.ensureAuthenticated(storage), function (req, res, next) {
        var email = _services.AuthService.extractEmailFromHeaders(req);
        var indexName = _services.AuthService.getUserIndex(email.toLowerCase().trim());
        var token = _services.AuthService.extractTokenFromHeaders(req);

        _services.MongoProxy.getUserByEmail(storage.mongoDb, email).
        then(function (user) {
            if (!user) {
                res.status(404).json(new _ErrorResponse2.default('User with specified email not found'));
                return;
            }

            var userIndexName = user.index_name;

            if (userIndexName != indexName) {
                res.status(500).json(new _ErrorResponse2.default('User indexes from token and internal storage did not match!'));
                return;
            }

            if (config.mode === 'cloud') {
                return _services.EsProxy.deleteUserIndex(storage.elasticSearch, indexName).
                then(function () {return _services.MongoProxy.deleteUser(storage.mongoDb, user);}).
                then(function () {return _services.MongoProxy.removeCrawlerSettingsByIndexName(storage.mongoDb, indexName);}).
                then(function () {
                    _services.CacheProxy.removeToken(storage.redis, token);
                    _services.CacheProxy.removeEsIndexContentSize(storage.redis, indexName);
                    _services.CacheProxy.removeEsIndexContentMaxSize(storage.redis, indexName);
                    res.sendStatus(200);
                });
            } else
            {
                return _services.MongoProxy.deleteUser(storage.mongoDb, user).
                then(function () {
                    _services.CacheProxy.removeToken(storage.redis, token);
                    res.sendStatus(200);
                });
            }
        }).
        catch(next);
    });

    return api;
};
//# sourceMappingURL=users.js.map