'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _package = require('../../package.json');
var _express = require('express');
var _files = require('./files');var _files2 = _interopRequireDefault(_files);
var _crawlers = require('./crawlers');var _crawlers2 = _interopRequireDefault(_crawlers);
var _logs = require('./logs');var _logs2 = _interopRequireDefault(_logs);
var _search = require('./search');var _search2 = _interopRequireDefault(_search);
var _stats = require('./stats');var _stats2 = _interopRequireDefault(_stats);
var _sources = require('./sources');var _sources2 = _interopRequireDefault(_sources);
var _thumbs = require('./thumbs');var _thumbs2 = _interopRequireDefault(_thumbs);
var _users = require('./users');var _users2 = _interopRequireDefault(_users);
var _tags = require('./tags');var _tags2 = _interopRequireDefault(_tags);
var _entities = require('./entities');var _entities2 = _interopRequireDefault(_entities);
var _services = require('../services');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}exports.default =

function (_ref) {var config = _ref.config,storage = _ref.storage;
	var api = (0, _express.Router)();

	api.use('/files', (0, _files2.default)({ config: config, storage: storage }));
	api.use('/crawlers', (0, _crawlers2.default)({ config: config, storage: storage }));
	api.use('/sources', (0, _sources2.default)({ config: config, storage: storage }));
	api.use('/logs', (0, _logs2.default)({ config: config, storage: storage }));
	api.use('/search', (0, _search2.default)({ config: config, storage: storage }));
	api.use('/stats', (0, _stats2.default)({ config: config, storage: storage }));
	api.use('/thumbs', (0, _thumbs2.default)({ config: config, storage: storage }));
	api.use('/users', (0, _users2.default)({ config: config, storage: storage }));
	api.use('/tags', (0, _tags2.default)({ config: config, storage: storage }));
	api.use('/entities', (0, _entities2.default)({ config: config, storage: storage }));

	api.get('/', function (req, res, next) {
		res.json({
			version: _package.version,
			mode: config.mode,
			auth: config.auth,
			preserveOriginals: config.preserveOriginals == "true" ? true : false,
			analytics: {
				token: config.analyticsToken },

			integrations: {
				dropbox: {
					dropboxClientId: config.dropboxClientId,
					dropboxRedirectUri: config.dropboxRedirectUri } },


			uiLang: config.uiLang });

	});

	return api;
};
//# sourceMappingURL=index.js.map