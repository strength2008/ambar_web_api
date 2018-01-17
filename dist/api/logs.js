'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _express = require('express');
var _ErrorResponse = require('../utils/ErrorResponse');var _ErrorResponse2 = _interopRequireDefault(_ErrorResponse);
var _services = require('../services');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var DEFAULT_RECORDS_COUNT = 10;
var MAX_RECORDS_COUNT = 100;exports.default =


function (_ref) {var config = _ref.config,storage = _ref.storage;
    var api = (0, _express.Router)();

    api.use(_services.AuthService.ensureAuthenticated(storage));

    /**
                                                                  * Submit log record
                                                                  */
    api.post('/', function (req, res) {var
        logItem = req.body;

        if (!logItem) {
            res.status(400).json(new _ErrorResponse2.default('Bad request'));
            return;
        }

        res.sendStatus(200); //Immediately send response
        _services.EsProxy.indexLogItem(storage.elasticSearch, logItem);
    });

    /**
         * Get log records
         */
    api.get('/', function (req, res, next) {var _req$query =
        req.query,_req$query$recordsCou = _req$query.recordsCount,recordsCount = _req$query$recordsCou === undefined ? DEFAULT_RECORDS_COUNT : _req$query$recordsCou,sourceId = _req$query.sourceId;

        if (recordsCount > MAX_RECORDS_COUNT && recordsCount <= 0) {
            res.status(400).json(new _ErrorResponse2.default('RecordsCount should be greater than 0 and lower than ' + MAX_RECORDS_COUNT));
            return;
        }

        if (!sourceId) {
            res.status(400).json(new _ErrorResponse2.default('sourceId is required'));
            return;
        }

        _services.EsProxy.getLastLogRecords(storage.elasticSearch, sourceId, recordsCount).
        then(function (response) {return res.status(200).json(response);}).
        catch(next);
    });

    return api;
};
//# sourceMappingURL=logs.js.map