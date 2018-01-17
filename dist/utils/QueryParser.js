'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.parseEsStringQuery = undefined;var _services = require('../services');

var PHRASE_REGEX = /\"([^\"]+)\"/gim;
var MAX_WORDS_TO_PERMUTE = 4;

var FILE_NAME_QUERY = /((^|\s)filename:)([^\s]*)/im;

var SOURCE_QUERY = /((^|\s)source:)([a-zA-Z0-9\-\,\*]*)/im;

var SIZE_GTE_QUERY = /((^|\s)size>[=]{0,1})([0-9]*)([k|m]{0,1})/im;
var SIZE_LTE_QUERY = /((^|\s)size<[=]{0,1})([0-9]*)([k|m]{0,1})/im;

var AUTHOR_QUERY = /((^|\s)author:)([^\s]*)/im;

var WHEN_QUERY = /((^|\s)when:)((today)|(yesterday)|(thisweek)|(thismonth)|(thisyear))/im;

var TAGS_QUERY = /((^|\s)tags:)([^\s]*)/im;

var SHOW_QUERY = /((^|\s)show:)((removed)|(all))/im;

var NAMED_ENTITIES_QUERY = /(^|\s)entities:(((\"[^\"]+\")(\,){0,1})+)/im;

var normalizeString = function normalizeString(string) {return string.replace(/[\s]+/gi, ' ').trim();};

var multiplySize = function multiplySize(size, multiplier) {
    if (multiplier.toLowerCase() === 'k') {
        return size * 1024;
    }
    if (multiplier.toLowerCase() === 'm') {
        return size * 1024 * 1024;
    }
    return size;
};

var parseEsStringQuery = exports.parseEsStringQuery = function parseEsStringQuery(query) {
    var content = '';
    var name = '';
    var source = [];
    var author = '';
    var size = { gte: null, lte: null };
    var when = { gte: null, lte: null };
    var tags = [];
    var namedEntities = [];

    content = normalizeString(query.replace(FILE_NAME_QUERY, '').replace(SOURCE_QUERY, '').replace(SIZE_GTE_QUERY, '').replace(SIZE_LTE_QUERY, '').replace(AUTHOR_QUERY, '').replace(WHEN_QUERY, '').replace(TAGS_QUERY, '').replace(SHOW_QUERY, '')).replace(NAMED_ENTITIES_QUERY, '');

    var namedEntitiesMatch = query.match(NAMED_ENTITIES_QUERY);
    if (namedEntitiesMatch && namedEntitiesMatch[2]) {
        var entitiesRegex = /\"([^\"]+)\"/gim;
        var entity = void 0;
        while (entity = entitiesRegex.exec(namedEntitiesMatch[2])) {
            if (entity[1]) {namedEntities.push(entity[1]);}
        }
    }

    var authorMatch = query.match(AUTHOR_QUERY);
    if (authorMatch && authorMatch[3]) {
        author = authorMatch[3];
    }

    var nameMatch = query.match(FILE_NAME_QUERY);
    if (nameMatch && nameMatch[3]) {
        name = nameMatch[3];
    }

    var sourceMatch = query.match(SOURCE_QUERY);
    if (sourceMatch && sourceMatch[3]) {
        source = sourceMatch[3].split(',');
    }

    var tagsMatch = query.match(TAGS_QUERY);
    if (tagsMatch && tagsMatch[3]) {
        tags = tagsMatch[3].split(',');
    }

    var whenMatch = query.match(WHEN_QUERY);
    if (whenMatch && whenMatch[3]) {
        switch (whenMatch[3].toLowerCase()) {
            case 'today':{
                    when.gte = _services.DateTimeService.getStartOfToday();
                }break;
            case 'yesterday':{
                    when.gte = _services.DateTimeService.getStartOfYesterday();
                    when.lte = _services.DateTimeService.getStartOfToday();
                }break;
            case 'thisweek':{
                    when.gte = _services.DateTimeService.getStartOfThisWeek();
                }break;
            case 'thismonth':{
                    when.gte = _services.DateTimeService.getStartOfThisMonth();
                }break;
            case 'thisyear':{
                    when.gte = _services.DateTimeService.getStartOfThisYear();
                }break;}

    }

    var sizeGteMatch = query.match(SIZE_GTE_QUERY);
    if (sizeGteMatch && sizeGteMatch[3]) {
        size.gte = parseInt(sizeGteMatch[3]);
        if (sizeGteMatch[4] && sizeGteMatch[4] !== '') {
            size.gte = multiplySize(size.gte, sizeGteMatch[4]);
        }
    }

    var sizeLteMatch = query.match(SIZE_LTE_QUERY);
    if (sizeLteMatch && sizeLteMatch[3]) {
        size.lte = parseInt(sizeLteMatch[3]);
        if (sizeLteMatch[4] && sizeLteMatch[4] !== '') {
            size.lte = multiplySize(size.lte, sizeLteMatch[4]);
        }
    }

    var withoutHiddenMarkOnly = false;
    var withHiddenMarkOnly = true;

    var showMatch = query.match(SHOW_QUERY);
    if (showMatch && showMatch[3]) {
        switch (showMatch[3].toLowerCase()) {
            case 'all':{
                    withHiddenMarkOnly = false;
                }break;
            case 'removed':{
                    withoutHiddenMarkOnly = true;
                    withHiddenMarkOnly = false;
                }break;}

    }
    return {
        content: content,
        name: name,
        source: source,
        size: size,
        author: author,
        when: when,
        tags: tags,
        namedEntities: namedEntities,
        withoutHiddenMarkOnly: withoutHiddenMarkOnly,
        withHiddenMarkOnly: withHiddenMarkOnly };

};
//# sourceMappingURL=QueryParser.js.map