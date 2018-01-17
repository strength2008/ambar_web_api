'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.getFilesStatsQuery = exports.getFilesTreeQuery = exports.getFullFileHighlightQuery = exports.getFileHighlightQuery = exports.getFilesWithoutHighlightsQuery = exports.getFilesWithHighlightsQuery = exports.getShortStatsQuery = exports.getStatsQuery = exports.getTagsStatsQuery = exports.getFullIndexName = exports.AMBAR_FILE_INDEX_PREFIX = undefined;var _extends = Object.assign || function (target) {for (var i = 1; i < arguments.length; i++) {var source = arguments[i];for (var key in source) {if (Object.prototype.hasOwnProperty.call(source, key)) {target[key] = source[key];}}}return target;};var _config = require('../config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var FULL_FILE_FRAGMENT_SIZE = 10 * 1024 * 1024;
var FRAGMENT_SIZE = 500;
var NUMBER_OF_FRAGMENTS = 50;
var PHRASE_LIMIT = 1024;
var LARGE_FILE_SIZE_BYTES = 50000000;
var MAX_TAGS_TO_RETRIEVE = 100;
var MAX_NES_TO_RETRIEVE = 500;
var MAX_TAGS_TO_RETRIEVE_IN_AGG = 50;
var MAX_NES_TO_RETRIEVE_IN_AGG = 50;

/////////////////////////////////////// Index Name /////////////////////////////////////////////////////////

var AMBAR_FILE_INDEX_PREFIX = exports.AMBAR_FILE_INDEX_PREFIX = _config2.default.esFileIndexName + '_';

var getFullIndexName = exports.getFullIndexName = function getFullIndexName(indexName) {return '' + AMBAR_FILE_INDEX_PREFIX + indexName;};

/////////////////////////////////////// Tags queries ///////////////////////////////////////////////////////

var getTagsStatsQuery = exports.getTagsStatsQuery = function getTagsStatsQuery() {return (
        {
            from: 0,
            size: 0,
            aggs: {
                tags: {
                    terms: { field: 'name', size: MAX_TAGS_TO_RETRIEVE },
                    aggs: { type: { terms: { field: 'type' } } } } } });};




/////////////////////////////////////// Stats queries ///////////////////////////////////////////////////////

var getStatsQuery = exports.getStatsQuery = function getStatsQuery() {return (
        {
            "from": 0,
            "size": 0,
            "aggs": {
                "content_type": {
                    "terms": { "field": "content.type" },
                    "aggs": {
                        "size": { "stats": { "field": "content.size" } } } },


                "proc_rate": {
                    "date_histogram": {
                        "field": "indexed_datetime",
                        "interval": "day" },

                    "aggs": {
                        "source": {
                            "terms": { "field": "meta.source_id" } } } },



                "proc_total": {
                    "stats": { "field": "content.size" } } } });};





var getShortStatsQuery = exports.getShortStatsQuery = function getShortStatsQuery() {return (
        {
            "from": 0,
            "size": 0,
            "aggs": {
                "proc_total": {
                    "stats": { "field": "content.size" } } } });};





/////////////////////////////////////// Search queries //////////////////////////////////////////////////////

var getFilesWithHighlightsQuery = exports.getFilesWithHighlightsQuery = function getFilesWithHighlightsQuery(request, from, size) {return getFilesQuery(request, from, size, true, false, true);};
var getFilesWithoutHighlightsQuery = exports.getFilesWithoutHighlightsQuery = function getFilesWithoutHighlightsQuery(request, from, size) {return getFilesQuery(request, from, size, false, true, false);};
var getFileHighlightQuery = exports.getFileHighlightQuery = function getFileHighlightQuery(request, fileId) {return getFilesQuery(request, 0, 1, false, false, true, fileId);};
var getFullFileHighlightQuery = exports.getFullFileHighlightQuery = function getFullFileHighlightQuery(request, fileId) {return getFilesQuery(request, 0, 1, false, false, true, fileId, true);};
var getFilesTreeQuery = exports.getFilesTreeQuery = function getFilesTreeQuery(request) {var _getBoolSubqueries =
    getBoolSubqueries(request, false, false),mustList = _getBoolSubqueries.mustList,contentShouldList = _getBoolSubqueries.contentShouldList,tagQueriesList = _getBoolSubqueries.tagQueriesList,neQueriesList = _getBoolSubqueries.neQueriesList;

    return {
        from: 0,
        size: 0,
        query: {
            bool: {
                must: mustList } },


        aggs: {
            full_name_parts: {
                terms: {
                    field: 'meta.full_name_parts',
                    size: 200 },

                aggs: {
                    file_id: {
                        terms: {
                            field: 'file_id',
                            size: 1 } },


                    thumb_available: {
                        terms: {
                            field: 'content.thumb_available',
                            size: 1 } },


                    content_type: {
                        terms: {
                            field: 'content.type',
                            size: 1 } },


                    sha256: {
                        terms: {
                            field: 'sha256',
                            size: 1 } } } } } };






};
var getFilesStatsQuery = exports.getFilesStatsQuery = function getFilesStatsQuery(request) {var _getBoolSubqueries2 =
    getBoolSubqueries(request, false, false),mustList = _getBoolSubqueries2.mustList,contentShouldList = _getBoolSubqueries2.contentShouldList,tagQueriesList = _getBoolSubqueries2.tagQueriesList,neQueriesList = _getBoolSubqueries2.neQueriesList;

    return {
        from: 0,
        size: 0,
        query: {
            bool: {
                must: mustList } },


        aggs: {
            extensions: {
                terms: { "field": "meta.extension" } },

            summary: {
                stats: { "field": "content.size" } },

            tags: {
                children: {
                    type: _config2.default.esFileTagTypeName },

                aggs: {
                    names: {
                        terms: {
                            field: 'name',
                            size: MAX_TAGS_TO_RETRIEVE_IN_AGG },

                        aggs: {
                            types: {
                                terms: {
                                    field: 'type',
                                    size: 1 } } } } } },






            named_entities: {
                children: {
                    type: _config2.default.esFileNamedEntityTypeName },

                aggs: {
                    names: {
                        terms: {
                            field: 'name',
                            size: MAX_NES_TO_RETRIEVE_IN_AGG },

                        aggs: {
                            types: {
                                terms: {
                                    field: 'type',
                                    size: 1 } } } } } } } };








};

var isWildcardQuery = function isWildcardQuery(query) {return (/[\*\?]/g.test(query));};

var getBoolSubqueries = function getBoolSubqueries(queries, onlySmallFiles, onlyLargeFiles) {var fileId = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    var mustList = [];
    var contentShouldList = [];
    var tagQueriesList = [];
    var neQueriesList = [];

    if (queries.content && queries.content != '') {
        contentShouldList.push({
            simple_query_string: {
                query: queries.content,
                fields: ['content.text', 'content.author.analyzed', 'meta.source_id.analyzed', 'meta.full_name.analyzed'],
                default_operator: 'and' } });


    }

    if (fileId && fileId != '') {
        mustList.push({ term: { file_id: fileId } });
    }

    if (onlySmallFiles) {
        mustList.push({ range: { 'content.size': { lt: LARGE_FILE_SIZE_BYTES } } });
    }

    if (onlyLargeFiles) {
        mustList.push({ range: { 'content.size': { gte: LARGE_FILE_SIZE_BYTES } } });
    }

    mustList.push({ term: { 'content.state': 'processed' } });

    if (queries.name && queries.name != '') {
        mustList.push(isWildcardQuery(queries.name) ? { wildcard: { 'meta.full_name': queries.name.toLowerCase() } } : { match: { 'meta.full_name.analyzed': queries.name } });
    }

    if (queries.author && queries.author != '') {
        mustList.push(isWildcardQuery(queries.author) ? { wildcard: { 'content.author': queries.author.toLowerCase() } } : { match: { 'content.author.analyzed': queries.author } });
    }

    if (queries.source && queries.source.length > 0) {
        var sourceShouldList = queries.source.map(function (source) {return isWildcardQuery(source) ? { wildcard: { 'meta.source_id': source.toLowerCase() } } : { match: { 'meta.source_id.analyzed': source } };});
        mustList.push({
            bool: {
                should: sourceShouldList,
                minimum_should_match: 1 } });


    }

    if (queries.size && queries.size.gte) {
        mustList.push({ range: { 'content.size': { gte: queries.size.gte } } });
    }

    if (queries.size && queries.size.lte) {
        mustList.push({ range: { 'content.size': { lte: queries.size.lte } } });
    }

    if (queries.when && queries.when.gte) {
        mustList.push({ range: { 'meta.updated_datetime': { gte: queries.when.gte } } });
    }

    if (queries.when && queries.when.lte) {
        mustList.push({ range: { 'meta.updated_datetime': { lte: queries.when.lte } } });
    }

    if (queries.tags && queries.tags.length > 0) {
        queries.tags.forEach(function (tag) {
            tagQueriesList.push({
                term: {
                    name: tag } });


        });
    }

    if (tagQueriesList.length > 0) {
        tagQueriesList.forEach(function (tagQuery) {
            mustList.push({
                has_child: {
                    type: _config2.default.esFileTagTypeName,
                    query: tagQuery } });


        });
    }

    if (queries.namedEntities && queries.namedEntities.length > 0) {
        queries.namedEntities.forEach(function (ne) {
            neQueriesList.push({
                term: {
                    name: ne } });


        });
    }

    if (neQueriesList.length > 0) {
        neQueriesList.forEach(function (neQuery) {
            mustList.push({
                has_child: {
                    type: _config2.default.esFileNamedEntityTypeName,
                    query: neQuery } });


        });
    }

    if (contentShouldList.length > 0) {
        mustList.push({
            bool: {
                should: contentShouldList,
                minimum_should_match: 1 } });


    }

    if (queries.withoutHiddenMarkOnly) {
        mustList.push({
            bool: {
                must: [
                {
                    has_child: {
                        type: _config2.default.esFileHiddenMarkTypeName,
                        query: {
                            match_all: {} } } }] } });






    }

    if (queries.withHiddenMarkOnly) {
        mustList.push({
            bool: {
                must_not: [
                {
                    has_child: {
                        type: _config2.default.esFileHiddenMarkTypeName,
                        query: {
                            match_all: {} } } }] } });






    }

    return {
        mustList: mustList,
        contentShouldList: contentShouldList,
        tagQueriesList: tagQueriesList,
        neQueriesList: neQueriesList };

};

var getFilesQuery = function getFilesQuery(queries, from, size, onlySmallFiles, onlyLargeFiles, includeContentHighlight) {var fileId = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : null;var fullFileHighlight = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : false;var _getBoolSubqueries3 =
    getBoolSubqueries(queries, onlySmallFiles, onlyLargeFiles, fileId),mustList = _getBoolSubqueries3.mustList,contentShouldList = _getBoolSubqueries3.contentShouldList,tagQueriesList = _getBoolSubqueries3.tagQueriesList,neQueriesList = _getBoolSubqueries3.neQueriesList;

    var highlightFields = {
        'content.author': {
            pre_tags: [''],
            post_tags: [''],
            fragment_size: FRAGMENT_SIZE,
            number_of_fragments: NUMBER_OF_FRAGMENTS },

        'content.author.analyzed': {
            pre_tags: [''],
            post_tags: [''],
            fragment_size: FRAGMENT_SIZE,
            number_of_fragments: NUMBER_OF_FRAGMENTS },

        'meta.full_name': {
            pre_tags: [''],
            post_tags: [''],
            fragment_size: FRAGMENT_SIZE,
            number_of_fragments: NUMBER_OF_FRAGMENTS },

        'meta.source_id': {
            pre_tags: [''],
            post_tags: [''],
            fragment_size: FRAGMENT_SIZE,
            number_of_fragments: NUMBER_OF_FRAGMENTS },

        'meta.full_name.analyzed': {
            pre_tags: [''],
            post_tags: [''],
            fragment_size: FRAGMENT_SIZE,
            number_of_fragments: NUMBER_OF_FRAGMENTS },

        'meta.source_id.analyzed': {
            pre_tags: [''],
            post_tags: [''],
            fragment_size: FRAGMENT_SIZE,
            number_of_fragments: NUMBER_OF_FRAGMENTS } };



    if (includeContentHighlight) {
        highlightFields = _extends({},
        highlightFields, { 'content.text': {
                highlight_query: {
                    bool: {
                        should: contentShouldList,
                        minimum_should_match: 1 } },


                type: 'fvh',
                fragment_size: fullFileHighlight ? FULL_FILE_FRAGMENT_SIZE : FRAGMENT_SIZE,
                number_of_fragments: fullFileHighlight ? 1 : NUMBER_OF_FRAGMENTS,
                phrase_limit: fullFileHighlight ? undefined : PHRASE_LIMIT,
                no_match_size: fullFileHighlight ? FULL_FILE_FRAGMENT_SIZE : FRAGMENT_SIZE } });


    }

    var resultingQuery = {
        from: from,
        size: size,
        query: {
            bool: {
                must: mustList,
                should: [
                {
                    has_child: {
                        type: _config2.default.esFileTagTypeName,
                        query: {
                            match_all: {} },

                        inner_hits: {
                            from: 0,
                            size: MAX_TAGS_TO_RETRIEVE,
                            highlight: {
                                fields: {
                                    'name': {
                                        pre_tags: [''],
                                        post_tags: [''],
                                        fragment_size: FRAGMENT_SIZE,
                                        number_of_fragments: NUMBER_OF_FRAGMENTS,
                                        highlight_query: {
                                            bool: {
                                                should: tagQueriesList } } } },




                                require_field_match: true } } } },




                {
                    has_child: {
                        type: _config2.default.esFileNamedEntityTypeName,
                        query: {
                            match_all: {} },

                        inner_hits: {
                            from: 0,
                            size: MAX_NES_TO_RETRIEVE } } },



                {
                    has_child: {
                        type: _config2.default.esFileHiddenMarkTypeName,
                        query: {
                            match_all: {} },

                        inner_hits: {
                            from: 0,
                            size: 1 } } }],




                minimum_should_match: 0 } },


        highlight: {
            order: 'score',
            fields: highlightFields,
            require_field_match: true } };



    return resultingQuery;
};

///////////////////////////////////////////////////////////////////////////////////////////////////////
//# sourceMappingURL=EsQueryBuilder.js.map