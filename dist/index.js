'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _http = require('http');var _http2 = _interopRequireDefault(_http);
var _moment = require('moment');var _moment2 = _interopRequireDefault(_moment);
var _express = require('express');var _express2 = _interopRequireDefault(_express);
var _cors = require('cors');var _cors2 = _interopRequireDefault(_cors);
var _bodyParser = require('body-parser');var _bodyParser2 = _interopRequireDefault(_bodyParser);
var _api = require('./api');var _api2 = _interopRequireDefault(_api);
var _config = require('./config');var _config2 = _interopRequireDefault(_config);
var _expressNtlm = require('express-ntlm');var _expressNtlm2 = _interopRequireDefault(_expressNtlm);
var _services = require('./services');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var createLogRecord = function createLogRecord(type, message) {return {
		type: type,
		source_id: 'webapi',
		message: message };};


var app = (0, _express2.default)();

app.server = _http2.default.createServer(app);

app.use((0, _cors2.default)({
	credentials: true,
	origin: true }));


app.use(_bodyParser2.default.json({
	limit: _config2.default.bodyLimit }));


var destroy = function destroy() {return (
		Promise.all([
		_services.CrawlerSchedulerService.destroy(storage),
		_services.PipelineService.destroy(storage)]).

		then(function () {return process.exit();}));};

// connect to storage
_services.StorageService.initializeStorage().
then(function (storage) {
	return _services.AuthService.init(storage).
	then(function () {return _services.CrawlerSchedulerService.init(storage);}).
	then(function () {return _services.MongoProxy.getExternalNERs(storage.mongoDb);}).
	then(function (externalNERs) {return _services.PipelineService.init(storage, externalNERs);}).
	then(function () {return _services.MongoProxy.initDefaultTaggingRules(storage.mongoDb);}).
	then(function () {
		process.on('SIGTERM', destroy);
		process.on('SIGINT', destroy);

		app.use('/api', (0, _api2.default)({ config: _config2.default, storage: storage }));
		app.use((0, _services.ErrorHandlerService)(storage.elasticSearch));
		app.server.listen(process.env.PORT || _config2.default.localPort);

		console.log('Started on ' + app.server.address().address + ':' + app.server.address().port);
		_services.EsProxy.indexLogItem(
		storage.elasticSearch,
		createLogRecord('info', 'Started on ' + app.server.address().address + ':' + app.server.address().port));

	});
}).
catch(function (err) {
	console.error('Catastrophic failure! ' + err.toString());
	process.exit(1);
});exports.default =

app;
//# sourceMappingURL=index.js.map