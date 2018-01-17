'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.buildDropboxCrawlerSettings = exports.buildCrawlerSettings = exports.getIndexNameFromCrawlerUid = exports.getCrawlerUid = undefined;var _cron = require('cron');
var _config = require('../config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var ensurePropertyIsDefined = function ensurePropertyIsDefined(data, property) {
    if (!data.hasOwnProperty(property)) {
        throw new Error('Property \'' + property + '\' undefined');
    }
};

var ensurePropertiesAreDefined = function ensurePropertiesAreDefined(data, properties) {
    properties.forEach(function (p) {return ensurePropertyIsDefined(data, p);});
};

var ensurePropertyIsNotEmpty = function ensurePropertyIsNotEmpty(data, property) {
    if (data[property] === '') {
        throw new Error('Property \'' + property + '\' is empty');
    }
};

var getCrawlerUid = exports.getCrawlerUid = function getCrawlerUid(crawlerId, indexName) {return crawlerId + '_' + indexName;};
var getIndexNameFromCrawlerUid = exports.getIndexNameFromCrawlerUid = function getIndexNameFromCrawlerUid(crawlerUid) {return crawlerUid.split('_')[1];};

var buildCrawlerSettings = exports.buildCrawlerSettings = function buildCrawlerSettings(data) {
    var CRAWLER_TYPES = ['smb', 'dropbox', 'ftp', 'ftps', 'imap'];
    var AUTH_TYPES = ['ntlm', 'oauth', 'basic'];
    var CRAWLER_ID_REGEX = /^[0-9a-zA-Z\-]+$/gim;var


    id =








    data.id,description = data.description,type = data.type,locations = data.locations,file_regex = data.file_regex,credentials = data.credentials,schedule = data.schedule,max_file_size_bytes = data.max_file_size_bytes,verbose = data.verbose,index_name = data.index_name;

    ensurePropertiesAreDefined(
    data, ['id',
    'description',
    'type',
    'locations',
    'file_regex',
    'credentials',
    'schedule',
    'max_file_size_bytes',
    'verbose',
    'index_name']);


    ensurePropertyIsNotEmpty(data, 'id');
    ensurePropertyIsNotEmpty(data, 'index_name');

    var uid = getCrawlerUid(id, index_name);

    if (!CRAWLER_ID_REGEX.test(id)) {
        throw new Error('Please provide correct crawler id! Only letters and numbers allowed.');
    }

    ensurePropertyIsNotEmpty(data, 'type');
    if (CRAWLER_TYPES.indexOf(type) === -1) {
        throw new Error('Unrecognized crawler type ' + type + '. Allowed types are: ' + CRAWLER_TYPES.toString());
    }

    locations.forEach(function (l) {
        ensurePropertiesAreDefined(l, ['host_name', 'ip_address', 'location']);
        l.location = type != 'smb' ? l.location.replace('//', '') : l.location;
        l.location = l.location == '/' ? '' : l.location;
    });

    ensurePropertyIsNotEmpty(data, 'file_regex');

    ensurePropertiesAreDefined(credentials, ['auth_type', 'login', 'password', 'token']);

    if (AUTH_TYPES.indexOf(credentials.auth_type) === -1) {
        throw new Error('Unrecognized auth type ' + credentials.auth_type + '. Allowed types are: ' + AUTH_TYPES.toString());
    }

    ensurePropertiesAreDefined(schedule, ['is_active', 'cron_schedule']);
    ensurePropertyIsNotEmpty(schedule, 'cron_schedule');

    //Validating cron_schedule
    try {
        new _cron.CronJob(schedule.cron_schedule, function () {return {};});
    } catch (ex) {
        throw new Error('Cron schedule is invalid. Error: ' + ex.toString());
    }

    return {
        id: id,
        uid: uid,
        description: description,
        type: type,
        index_name: index_name,
        locations: locations,
        file_regex: file_regex,
        credentials: credentials,
        schedule: schedule,
        max_file_size_bytes: max_file_size_bytes,
        verbose: verbose,
        is_removed: false };

};

var buildDropboxCrawlerSettings = exports.buildDropboxCrawlerSettings = function buildDropboxCrawlerSettings(id, indexName, accountId, token, locations) {
    var uid = getCrawlerUid(id, indexName);

    var settings =
    {
        id: id,
        uid: uid,
        description: 'Dropbox crawler',
        type: 'dropbox',
        index_name: indexName,
        locations: locations.map(function (location) {
            return {
                host_name: '',
                ip_address: '',
                location: location };

        }),
        file_regex: '(\\.doc[a-z]*$)|(\\.xls[a-z]*$)|(\\.txt$)|(\\.csv$)|(\\.htm[a-z]*$)|(\\.ppt[a-z]*$)|(\\.pdf$)|(\\.msg$)|(\\.zip$)|(\\.eml$)|(\\.rtf$)|(\\.md$)|(\\.png$)|(\\.bmp$)|(\\.tif[f]*$)|(\\.jp[e]*g$)',
        credentials: {
            auth_type: 'oauth',
            login: accountId,
            password: '',
            token: token },

        schedule: {
            is_active: true,
            cron_schedule: '*/15 * * * *' },

        max_file_size_bytes: 10000000,
        verbose: true,
        is_removed: false };


    return settings;
};
//# sourceMappingURL=AmbarCrawlerSettingsBuilder.js.map