'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _express = require('express');
var _moment = require('moment');var _moment2 = _interopRequireDefault(_moment);
var _ErrorResponse = require('../utils/ErrorResponse');var _ErrorResponse2 = _interopRequireDefault(_ErrorResponse);
var _services = require('../services');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var MIN_THRESHOLD_CONTENT_TYPE = 0.05;
var DAYS_SPAN = 30;exports.default =

function (_ref) {var config = _ref.config,storage = _ref.storage;
    var api = (0, _express.Router)();

    api.use(_services.AuthService.ensureAuthenticated(storage));

    var buildProcRateStats = function buildProcRateStats(esResponse) {
        var procRate = {
            data: [],
            names: [] };


        var names = new Set();
        var dates = [];

        esResponse.proc_rate.buckets.forEach(function (dateBucket) {
            dateBucket.source.buckets.forEach(function (nameBucket) {
                names.add(nameBucket.key);
            });
        });

        procRate.names = Array.from(names);

        var dateSpan = DAYS_SPAN - 1;
        while (dateSpan >= 0) {
            dates.push((0, _moment2.default)().startOf('day').add(-dateSpan, 'days'));
            dateSpan--;
        }

        dates.forEach(function (date) {
            var dateItem = {
                date: date.format('YYYY-MM-DD') };

            names.forEach(function (name) {
                dateItem[name] = 0;
                var esDateBucket = esResponse.proc_rate.buckets.find(function (bucket) {return (0, _moment2.default)(bucket.key).startOf('day').isSame(date);});
                if (esDateBucket) {
                    var esNameBucket = esDateBucket.source.buckets.find(function (bucket) {return bucket.key == name;});
                    if (esNameBucket) {
                        dateItem[name] = esNameBucket.doc_count;
                    }
                }
            });
            procRate.data.push(dateItem);
        });

        return procRate;
    };

    var buildContentTypeStats = function buildContentTypeStats(esResponse) {
        var contentTypeTotal = esResponse.content_type.buckets.reduce(function (sum, bucket) {
            return sum + bucket.doc_count;
        }, 0);

        var contentType = {
            total: contentTypeTotal,
            minThreshold: MIN_THRESHOLD_CONTENT_TYPE * contentTypeTotal,
            data: esResponse.content_type.buckets.map(function (bucket) {return { name: bucket.key, value: bucket.doc_count, sizeDataInBytes: bucket.size };}) };


        return contentType;
    };

    var buildProcTotalStats = function buildProcTotalStats(esResponse) {
        var procTotalStats = {
            totalCount: esResponse.proc_total.count,
            sizeDataInBytes: {
                sum: esResponse.proc_total.sum,
                avg: esResponse.proc_total.avg,
                min: esResponse.proc_total.min,
                max: esResponse.proc_total.max } };



        return procTotalStats;
    };

    var esStatsToView = function esStatsToView(esResponse) {
        var res = {
            contentType: buildContentTypeStats(esResponse),
            procRate: buildProcRateStats(esResponse),
            procTotal: buildProcTotalStats(esResponse) };


        return res;
    };

    /**     
        * @api {get} api/stats Get Statistics     
        * @apiGroup Statistics          
        * 
        * @apiHeader {String} ambar-email User email
        * @apiHeader {String} ambar-email-token User token
        * 
        * @apiSuccessExample {json} HTTP/1.1 200 OK
        *  {
        *  "contentType": {
        *    "total": 2,
        *    "minThreshold": 0.1,
        *    "data": [
        *      {
        *        "name": "application/msword",
        *        "value": 1,
        *        "sizeDataInBytes": {
        *          "count": 1,
        *          "min": 91681,
        *          "max": 91681,
        *          "avg": 91681,
        *          "sum": 91681
        *        }
        *      }      
        *    ]
        *  },
        *  "procRate": {
        *    "data": [     
        *      {
        *        "date": "2017-04-13",
        *        "default": 0
        *      },
        *      {
        *        "date": "2017-04-14",
        *        "default": 2
        *      }
        *    ],
        *    "names": [
        *      "default"
        *    ]
        *  },
        *  "procTotal": {
        *    "totalCount": 2,
        *    "sizeDataInBytes": {
        *      "sum": 147522,
        *      "avg": 73761,
        *      "min": 55841,
        *      "max": 91681
        *    }
        *  }
        *}
        * 
        */
    api.get('/', function (req, res, next) {
        var email = _services.AuthService.extractEmailFromHeaders(req);

        _services.EsProxy.getStats(storage.elasticSearch, _services.AuthService.getUserIndex(email)).
        then(function (response) {return res.status(200).json(esStatsToView(response.aggregations));}).
        catch(next);
    });

    return api;
};
//# sourceMappingURL=stats.js.map