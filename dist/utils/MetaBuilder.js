'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.buildShortMeta = exports.buildMeta = undefined;var _services = require('../services');

var FILE_EXTENSION_REGEX = /(?:\.([^.]+))?$/;

var generateMetaId = function generateMetaId(source_id, full_name, created_datetime, updated_datetime) {
    return _services.CryptoService.getSha256('' + source_id + full_name + created_datetime + updated_datetime);
};

var buildMeta = exports.buildMeta = function buildMeta(data) {var
    short_name = data.short_name,full_name = data.full_name,extension = data.extension,extra = data.extra,created_datetime = data.created_datetime,updated_datetime = data.updated_datetime,source_id = data.source_id;

    if (!short_name ||
    !full_name ||
    !source_id ||
    !extension ||
    !created_datetime ||
    !updated_datetime) {
        return null;
    }

    var meta = {
        id: generateMetaId(source_id, full_name, created_datetime, updated_datetime),
        short_name: short_name.toLowerCase(),
        full_name: full_name.toLowerCase(),
        source_id: source_id,
        extension: extension,
        created_datetime: created_datetime,
        updated_datetime: updated_datetime,
        extra: extra,
        indexed_datetime: _services.DateTimeService.getCurrentDateTime() };


    return meta;
};

var buildShortMeta = exports.buildShortMeta = function buildShortMeta(shortName, sourceId) {

    var short_name = shortName.toLowerCase();
    var full_name = '//' + sourceId.toLowerCase() + '/' + shortName.toLowerCase();
    var source_id = sourceId;
    var extension = '';
    var calculatedExtension = FILE_EXTENSION_REGEX.exec(short_name);
    if (calculatedExtension && calculatedExtension.length > 0) {
        extension = calculatedExtension[0];
    }
    var created_datetime = _services.DateTimeService.getCurrentDateTime();
    var updated_datetime = _services.DateTimeService.getCurrentDateTime();
    var extra = [];

    var meta = {
        id: generateMetaId(source_id, full_name, created_datetime, updated_datetime),
        short_name: short_name,
        full_name: full_name,
        source_id: source_id,
        extension: extension,
        created_datetime: created_datetime,
        updated_datetime: updated_datetime,
        extra: extra,
        indexed_datetime: _services.DateTimeService.getCurrentDateTime() };


    return meta;
};
//# sourceMappingURL=MetaBuilder.js.map