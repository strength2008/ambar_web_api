'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.getCronIntervalInMs = exports.isSame = exports.getDateTimeDifferenceFromNow = exports.getDateTimeDifferenceFromNowInHumanForm = exports.parseDateTime = exports.getStartOfThisYear = exports.getStartOfThisMonth = exports.getStartOfThisWeek = exports.getStartOfYesterday = exports.getStartOfToday = exports.getCurrentDateTimeMinusMinutes = exports.getCurrentDateTimeAddDays = exports.getCurrentDateTime = undefined;var _moment = require('moment');var _moment2 = _interopRequireDefault(_moment);
var _cronParser = require('cron-parser');var _cronParser2 = _interopRequireDefault(_cronParser);
var _config = require('../config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var getCurrentDateTime = exports.getCurrentDateTime = function getCurrentDateTime() {return (0, _moment2.default)().format(_config2.default.dateTimeFormat);};
var getCurrentDateTimeAddDays = exports.getCurrentDateTimeAddDays = function getCurrentDateTimeAddDays(days) {return (0, _moment2.default)().add(days, 'days').format(_config2.default.dateTimeFormat);};
var getCurrentDateTimeMinusMinutes = exports.getCurrentDateTimeMinusMinutes = function getCurrentDateTimeMinusMinutes(minutes) {return (0, _moment2.default)().subtract({ minutes: minutes }).format(_config2.default.dateTimeFormat);};
var getStartOfToday = exports.getStartOfToday = function getStartOfToday() {return (0, _moment2.default)().startOf('day').format(_config2.default.dateTimeFormat);};
var getStartOfYesterday = exports.getStartOfYesterday = function getStartOfYesterday() {return (0, _moment2.default)().subtract({ days: 1 }).startOf('day').format(_config2.default.dateTimeFormat);};
var getStartOfThisWeek = exports.getStartOfThisWeek = function getStartOfThisWeek() {return (0, _moment2.default)().startOf('isoWeek').format(_config2.default.dateTimeFormat);};
var getStartOfThisMonth = exports.getStartOfThisMonth = function getStartOfThisMonth() {return (0, _moment2.default)().startOf('month').format(_config2.default.dateTimeFormat);};
var getStartOfThisYear = exports.getStartOfThisYear = function getStartOfThisYear() {return (0, _moment2.default)().startOf('year').format(_config2.default.dateTimeFormat);};
var parseDateTime = exports.parseDateTime = function parseDateTime(dateStr) {return (0, _moment2.default)(dateStr, _config2.default.dateTimeFormat, true);};
var getDateTimeDifferenceFromNowInHumanForm = exports.getDateTimeDifferenceFromNowInHumanForm = function getDateTimeDifferenceFromNowInHumanForm(dateStr) {return _moment2.default.duration((0, _moment2.default)().diff((0, _moment2.default)(dateStr, _config2.default.dateTimeFormat, true))).humanize();};
var getDateTimeDifferenceFromNow = exports.getDateTimeDifferenceFromNow = function getDateTimeDifferenceFromNow(dateStr) {return (0, _moment2.default)().diff((0, _moment2.default)(dateStr, _config2.default.dateTimeFormat, true));};
var isSame = exports.isSame = function isSame(dateA, dateB) {return parseDateTime(dateA).isSame(parseDateTime(dateB));};
var getCronIntervalInMs = exports.getCronIntervalInMs = function getCronIntervalInMs(cronSchedule) {
    var interval = _cronParser2.default.parseExpression(cronSchedule);
    var nextRun = interval.next()._date;
    var nextNextRun = interval.next()._date;
    return (0, _moment2.default)(nextNextRun).diff(nextRun);
};
//# sourceMappingURL=DateTimeService.js.map