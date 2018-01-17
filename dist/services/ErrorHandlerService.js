'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _index = require('./index');
var _ErrorResponse = require('../utils/ErrorResponse');var _ErrorResponse2 = _interopRequireDefault(_ErrorResponse);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}exports.default =

function (esClient) {return function (err, req, res, next) {
        console.error(err);

        var message = err instanceof Error ?
        err.message + '\n ' + err.stack :
        typeof err === 'string' || err instanceof String ? err : JSON.stringify(err);

        _index.EsProxy.indexLogItem(esClient, {
            created_datetime: _index.DateTimeService.getCurrentDateTime(),
            source_id: 'webapi',
            type: 'error',
            message: message });


        if (res.headersSent) {
            return next(err);
        }

        res.status(500).json(new _ErrorResponse2.default(message));
    };};
//# sourceMappingURL=ErrorHandlerService.js.map