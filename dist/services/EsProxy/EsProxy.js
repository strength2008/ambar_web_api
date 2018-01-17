'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.deleteAutoTagsAndNamedEntities = exports.deleteUserIndex = exports.createUserIndex = exports.createLogIndexIfNotExist = exports.getLastLogRecords = exports.indexLogItem = exports.deleteTag = exports.indexTag = exports.indexNamedEntities = exports.unHideFile = exports.hideFile = exports.getFileBySha = exports.getFileByFileId = exports.checkIfFileExists = exports.checkIfMetaIdExists = exports.getFullFileHighlightByFileId = exports.getFileHighlightByFileId = exports.searchFiles = exports.getFilesStatsByQuery = exports.getFilesTreeByQuery = exports.getTagsStat = exports.getShortStats = exports.getStats = undefined;var _extends = Object.assign || function (target) {for (var i = 1; i < arguments.length; i++) {var source = arguments[i];for (var key in source) {if (Object.prototype.hasOwnProperty.call(source, key)) {target[key] = source[key];}}}return target;};var _striptags = require('striptags');var _striptags2 = _interopRequireDefault(_striptags);
var _config = require('../../config');var _config2 = _interopRequireDefault(_config);
var _index = require('../index');
var _EsQueryBuilder = require('../../utils/EsQueryBuilder');var EsQueryBuilder = _interopRequireWildcard(_EsQueryBuilder);
var _AmbarLogMapping = require('./AmbarLogMapping.json');var AmbarLogMapping = _interopRequireWildcard(_AmbarLogMapping);
var _AmbarFileDataMapping = require('./AmbarFileDataMapping.json');var AmbarFileDataMapping = _interopRequireWildcard(_AmbarFileDataMapping);function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;} else {var newObj = {};if (obj != null) {for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];}}newObj.default = obj;return newObj;}}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var MAPPING_ANALYZER_REGEX = /\$\{ANALYZER\}/g;
var MIN_THRESHOLD_EXTENSION = 0.05;

var getHiddenMarkId = function getHiddenMarkId(fileId) {return _index.CryptoService.getSha256('hiddenmark_' + fileId);};

var normalizeHitsScore = function normalizeHitsScore(hits, maxScore) {return hits.map(function (hit) {return _extends({},
        hit, {
            _score: hit._score / maxScore });});};


var getStats = exports.getStats = function getStats(esClient, indexName) {return new Promise(function (resolve, reject) {return (
            esClient.search({
                index: EsQueryBuilder.getFullIndexName(indexName),
                type: _config2.default.esFileTypeName,
                body: EsQueryBuilder.getStatsQuery() }).

            then(function (result) {
                resolve(result);
            }).
            catch(function (err) {return reject(err);}));});};


var transformTagsStat = function transformTagsStat(esResponse) {
    var resp = [];

    esResponse.aggregations.tags.buckets.forEach(function (tag) {
        tag.type.buckets.forEach(function (tagType) {
            resp.push({ name: tag.key, type: tagType.key, filesCount: tagType.doc_count });
        });
    });

    return resp;
};

var mergeAnalyzedFieldsHighlight = function mergeAnalyzedFieldsHighlight(highlight) {
    if (!highlight) {
        return highlight;
    }

    Object.keys(highlight).filter(function (key) {return (/\.analyzed$/.test(key));}).forEach(function (key) {
        var originalKey = key.replace(/\.analyzed$/, '');
        if (!highlight[originalKey]) {
            highlight[originalKey] = [];
        }
        highlight[originalKey].concat(highlight[key]);
        delete highlight[key];
    });

    return highlight;
};

var highlightEntitiesInHitContentHighlights = function highlightEntitiesInHitContentHighlights(hit) {
    if (!hit.content) {
        return hit;
    }

    if (!hit.content.highlight) {
        return hit;
    }

    if (!hit.content.highlight.text) {
        return hit;
    }

    if (hit.content.highlight.text.length != 1) {
        throw new Error('Entities can not be highlighted in partial highlights!');
    }

    if (hit.named_entities.length == 0) {
        return hit;
    }

    var HIGHLIGHT_EM_OPEN_TAG = '<em>';
    var HIGHLIGHT_EM_CLOSE_TAG = '</em>';

    var ENTITY_EM_OPEN_TAG = '<em class="entity">';
    var ENTITY_EM_CLOSE_TAG = '</em>';

    var EM_OPEN_TAG_LENGTH = HIGHLIGHT_EM_OPEN_TAG.length;
    var EM_CLOSE_TAG_LENGTH = HIGHLIGHT_EM_CLOSE_TAG.length;

    var EM_OPEN_TAG_REGEX = /\<em\>/gim;
    var EM_CLOSE_TAG_REGEX = /\<\/em\>/gim;

    var text = hit.content.highlight.text[0];

    var opened = EM_OPEN_TAG_REGEX.exec(text);
    var closed = EM_CLOSE_TAG_REGEX.exec(text);

    // collect all highlights positions
    var highlight = [];

    while (opened && closed) {
        var offset = highlight.length * EM_OPEN_TAG_LENGTH + highlight.length * EM_CLOSE_TAG_LENGTH;
        highlight.push({ type: 'HL', start: opened.index - offset, end: EM_CLOSE_TAG_REGEX.lastIndex - EM_OPEN_TAG_LENGTH - EM_CLOSE_TAG_LENGTH - offset });
        opened = EM_OPEN_TAG_REGEX.exec(text);
        closed = EM_CLOSE_TAG_REGEX.exec(text);
    }

    // clear text from highlights
    var clearedText = text.replace(EM_OPEN_TAG_REGEX, '').replace(EM_CLOSE_TAG_REGEX, '');

    // collect all named entitites positions
    hit.named_entities.forEach(function (entity) {return highlight.push({ type: 'NE', start: entity.position.start, end: entity.position.start + entity.position.length });});

    // sort all items to be inserted
    highlight = highlight.sort(function (a, b) {return a.end < b.end ? 1 : -1;}).map(function (hl, idx) {return _extends({}, hl, { id: idx });});

    var coordsData = [];
    highlight.forEach(function (hl) {
        coordsData.push({
            coord: hl.end,
            coordType: 'e',
            type: hl.type,
            id: hl.id });

        coordsData.push({
            coord: hl.start,
            coordType: 's',
            type: hl.type,
            id: hl.id });

    });

    coordsData.sort(function (a, b) {
        if (a.coord == b.coord) {
            return a.id < b.id ? 1 : -1;
        }
        return a.coord < b.coord ? 1 : -1;
    });

    var resultText = [];
    var lastSlicePosition = clearedText.length;
    var lastHlCoord = void 0;
    var tagsToInsert = [];

    var flushTagsToInsert = function flushTagsToInsert(startIdx) {
        tagsToInsert.filter(function (t) {return t.start >= startIdx;}).sort(function (a, b) {return a.start > b.start ? 1 : -1;}).forEach(function (t) {
            resultText.push(clearedText.slice(t.start, lastSlicePosition));
            resultText.push(t.type === 'HL' ? HIGHLIGHT_EM_OPEN_TAG : ENTITY_EM_OPEN_TAG);
            lastSlicePosition = t.start;
        });
        tagsToInsert = tagsToInsert.filter(function (t) {return t.start < startIdx;});
    };

    var insertTag = function insertTag(coord) {
        resultText.push(clearedText.slice(coord.coord, lastSlicePosition));
        resultText.push(coord.coordType == 'e' ?
        ENTITY_EM_CLOSE_TAG :
        coord.type === 'HL' ?
        HIGHLIGHT_EM_OPEN_TAG :
        ENTITY_EM_OPEN_TAG);
        lastSlicePosition = coord.coord;
        lastHlCoord = coord;
    };var _loop = function _loop(

    i) {
        if (coordsData[i].coordType == 'e') {
            flushTagsToInsert(coordsData[i].coord);
            insertTag(coordsData[i]);
        } else
        {(function () {
                var currentHl = highlight.find(function (hl) {return hl.id === coordsData[i].id;});
                var intersectingHls = highlight.
                filter(function (hl) {return hl.id != currentHl.id && hl.start <= currentHl.start && hl.end >= currentHl.start && hl.end <= currentHl.end;}).
                sort(function (a, b) {return a.start > b.start ? 1 : -1;});

                if (intersectingHls.length === 0) {
                    flushTagsToInsert(coordsData[i].coord);
                    insertTag(coordsData[i]);
                } else
                {
                    tagsToInsert.push({ type: currentHl.type, start: intersectingHls[0].start });
                }})();
        }};for (var i = 0; i < coordsData.length; i++) {_loop(i);
    }

    flushTagsToInsert(0);
    resultText.push(clearedText.slice(0, lastSlicePosition));
    resultText.reverse();

    hit.content.highlight.text[0] = resultText.join('');

    return hit;
};

var normalizeHitContentHighlights = function normalizeHitContentHighlights(hit) {
    var ALLOWED_TAGS = ['br', 'em', 'em class=\"entity\"'];
    var SEPARATOR_TAG = '<br/>';
    var SPACE_CHAR = ' ';
    var EMPTY_CHAR = '';

    if (!hit.content) {
        return hit;
    }

    if (!hit.content.highlight) {
        return hit;
    }

    if (!hit.content.highlight.text) {
        return hit;
    }

    hit.content.highlight.text = hit.content.highlight.text.map(function (hl) {
        var strippedHl = hl.
        replace(/\</gim, '&lt;').
        replace(/\>/gim, '&gt;');

        ALLOWED_TAGS.forEach(function (tag) {
            strippedHl = strippedHl.
            replace(new RegExp('(&lt;' + tag + '&gt;)', 'gim'), '<' + tag + '>').
            replace(new RegExp('(&lt;' + tag + '/&gt;)', 'gim'), '<' + tag + '/>').
            replace(new RegExp('(&lt;/' + tag + '&gt;)', 'gim'), '</' + tag + '>');
        });

        strippedHl = strippedHl.replace(/(?:\r\n|\r|\n)/gi, SEPARATOR_TAG).
        replace(/(<br\s*\/?>(\s*)){2,}/gi, SEPARATOR_TAG).
        replace(/((&nbsp;)+)/gi, SPACE_CHAR).
        replace(/(?:\t)+/gi, SPACE_CHAR).
        replace(/[\s]+/gi, SPACE_CHAR);

        return strippedHl;
    });

    return hit;
};

var transformHit = function transformHit(hit) {
    var transformedHit = _extends({},
    hit._source, {
        named_entities: [],
        named_entities_distinct: [],
        tags: [],
        score: hit._score,
        hidden_mark: undefined });


    var highlight = mergeAnalyzedFieldsHighlight(hit.highlight);

    if (highlight) {
        Object.keys(highlight).forEach(function (key) {
            if (key.startsWith('meta.')) {
                if (!transformedHit.meta.highlight) {
                    transformedHit.meta.highlight = {};
                }
                transformedHit.meta.highlight[key.replace('meta.', '')] = highlight[key];
            }
            if (key.startsWith('content.')) {
                if (!transformedHit.content.highlight) {
                    transformedHit.content.highlight = {};
                }
                transformedHit.content.highlight[key.replace('content.', '')] = highlight[key];
            }
        });
    }

    if (hit.inner_hits && hit.inner_hits.ambar_file_tag) {
        transformedHit.tags = hit.inner_hits.ambar_file_tag.hits.hits.map(function (hit) {
            var tag = hit._source;
            return hit.highlight ? _extends({}, hit._source, { highlight: hit.highlight }) : hit._source;
        });
    }

    if (hit.inner_hits && hit.inner_hits.ambar_file_hidden_mark && hit.inner_hits.ambar_file_hidden_mark.hits.hits.length > 0) {
        transformedHit.hidden_mark = hit.inner_hits.ambar_file_hidden_mark.hits.hits[0]._source;
    }

    if (hit.inner_hits && hit.inner_hits.ambar_file_named_entity && hit.inner_hits.ambar_file_named_entity.hits.hits.length > 0) {
        transformedHit.named_entities = hit.inner_hits.ambar_file_named_entity.hits.hits.map(function (hit) {return hit._source;});
        transformedHit.named_entities.forEach(function (entity) {
            var foundEntity = transformedHit.named_entities_distinct.find(function (ent) {return ent.name === entity.name;});

            if (foundEntity) {
                foundEntity.count = foundEntity.count + 1;
            } else {
                transformedHit.named_entities_distinct.push(_extends({}, entity, { position: undefined, indexed_datetime: undefined, id: undefined, count: 1 }));
            }
        });
        transformedHit.named_entities_distinct = transformedHit.named_entities_distinct.sort(function (a, b) {return a.count - b.count;});
    }

    return transformedHit;
};

var getPathType = function getPathType(fullPath) {return (/\/$/g.test(fullPath) ? 'folder' : 'file');};
var getPathDepth = function getPathDepth(fullPath) {return getPathType(fullPath) === 'folder' ?
    fullPath.match(/\//g).length - 3 :
    fullPath.match(/\//g).length - 2;};
var getParentPath = function getParentPath(fullPath) {return getPathType(fullPath) === 'file' ?
    fullPath.slice(0, fullPath.lastIndexOf('/') + 1) :
    fullPath.slice(0, fullPath.slice(0, -1).lastIndexOf('/') + 1);};
var getPathName = function getPathName(fullPath) {return getPathType(fullPath) === 'file' ?
    fullPath.slice(fullPath.lastIndexOf('/') + 1) :
    fullPath.slice(fullPath.slice(0, fullPath.length - 1).lastIndexOf('/') + 1, -1);};
var calculateTreeNodeChildrenCount = function calculateTreeNodeChildrenCount(treeNode) {return treeNode.children.length > 0 ?
    treeNode.children.reduce(function (sum, node) {return sum + node.hits_count;}, 0) :
    0;};

var normalizeTreeAggregationResult = function normalizeTreeAggregationResult(esResult) {
    var result = {
        total: esResult.hits.total,
        tree: [] };


    var plainTree = esResult.aggregations.full_name_parts.buckets
    //.filter(bucket => getPathType(bucket.key) != 'file')
    .map(function (bucket) {return {
            path: bucket.key,
            name: getPathName(bucket.key),
            parent_path: getParentPath(bucket.key),
            depth: getPathDepth(bucket.key),
            type: getPathDepth(bucket.key) === 0 ? 'source' : getPathType(bucket.key),
            thumb_available: getPathType(bucket.key) === 'file' ?
            bucket.thumb_available.buckets[0].key === 1 ?
            true :
            false :
            null,
            file_id: getPathType(bucket.key) === 'file' ?
            bucket.file_id.buckets[0].key :
            null,
            content_type: getPathType(bucket.key) === 'file' ?
            bucket.content_type.buckets[0].key :
            null,
            sha256: getPathType(bucket.key) === 'file' ?
            bucket.sha256.buckets[0].key :
            null,
            hits_count: bucket.doc_count,
            children: [] };});


    plainTree.
    filter(function (node) {return node.depth > 0;}).
    forEach(function (node) {return (
            plainTree.
            filter(function (treeNode) {return treeNode.depth === node.depth - 1;}).
            filter(function (treeNode) {return treeNode.path === node.parent_path;}).
            forEach(function (treeNode) {return treeNode.children.push(node);}));});

    plainTree.
    filter(function (treeNode) {return treeNode.type != 'file';}).
    filter(function (treeNode) {return treeNode.children.length > 0;}).
    filter(function (treeNode) {return calculateTreeNodeChildrenCount(treeNode) != treeNode.hits_count;}).
    forEach(function (treeNode) {return treeNode.children.push({
            path: treeNode.path + '...',
            name: '...',
            parent_path: treeNode.path,
            depth: treeNode.depth + 1,
            type: 'mixed',
            thumb_available: null,
            file_id: null,
            content_type: null,
            sha256: null,
            hits_count: treeNode.hits_count - calculateTreeNodeChildrenCount(treeNode),
            children: [] });});


    return _extends({}, result, { tree: plainTree.filter(function (node) {return node.depth === 0;}) });
};

var normalizeStatsAggregationResult = function normalizeStatsAggregationResult(esResult) {
    var result = {
        total: esResult.hits.total,
        summary: {},
        tags: {},
        named_entities: {} };


    result.summary = {
        data: esResult.aggregations.summary };


    result.extensions = {
        total: esResult.hits.total,
        data: esResult.aggregations.extensions.buckets.
        filter(function (bucket) {return bucket.doc_count > MIN_THRESHOLD_EXTENSION * esResult.hits.total;}).
        map(function (bucket) {return {
                extension: bucket.key,
                hits_percent: bucket.doc_count / esResult.hits.total * 100,
                hits_count: bucket.doc_count };}) };


    var presentExtensionsHitsCount = result.extensions.data.reduce(function (sum, bucket) {return sum + bucket.hits_count;}, 0);
    if (presentExtensionsHitsCount < esResult.hits.total) {
        result.extensions.data.push({
            extension: 'Others',
            hits_percent: (esResult.hits.total - presentExtensionsHitsCount) / esResult.hits.total * 100,
            hits_count: esResult.hits.total - presentExtensionsHitsCount });

    }

    result.named_entities = {
        total: esResult.aggregations.named_entities.doc_count,
        data: esResult.aggregations.named_entities.names.buckets.
        map(function (bucket) {return {
                name: bucket.key,
                type: bucket.types.buckets[0].key,
                hits_percent: bucket.doc_count / esResult.aggregations.named_entities.doc_count * 100,
                hits_count: bucket.doc_count };}) };



    result.tags = {
        total: esResult.aggregations.tags.doc_count,
        data: esResult.aggregations.tags.names.buckets.
        map(function (bucket) {return {
                name: bucket.key,
                type: bucket.types.buckets[0].key,
                hits_percent: bucket.doc_count / esResult.aggregations.tags.doc_count * 100,
                hits_count: bucket.doc_count };}) };



    return result;
};

var getShortStats = exports.getShortStats = function getShortStats(esClient, indexName) {return new Promise(function (resolve, reject) {return (
            esClient.search({
                index: EsQueryBuilder.getFullIndexName(indexName),
                type: _config2.default.esFileTypeName,
                body: EsQueryBuilder.getShortStatsQuery() }).

            then(function (result) {
                resolve(result);
            }).
            catch(function (err) {return reject(err);}));});};


var getTagsStat = exports.getTagsStat = function getTagsStat(esClient, indexName) {return new Promise(function (resolve, reject) {return (
            esClient.search({
                index: EsQueryBuilder.getFullIndexName(indexName),
                type: _config2.default.esFileTagTypeName,
                body: EsQueryBuilder.getTagsStatsQuery() }).

            then(function (result) {
                resolve(transformTagsStat(result));
            }).
            catch(function (err) {return reject(err);}));});};


var getFilesTreeByQuery = exports.getFilesTreeByQuery = function getFilesTreeByQuery(esClient, indexName, request) {return new Promise(function (resolve, reject) {
        esClient.search({
            index: EsQueryBuilder.getFullIndexName(indexName),
            type: _config2.default.esFileTypeName,
            body: EsQueryBuilder.getFilesTreeQuery(request) }).

        then(function (result) {return resolve(normalizeTreeAggregationResult(result));}).
        catch(function (err) {return reject(err);});
    });};

var getFilesStatsByQuery = exports.getFilesStatsByQuery = function getFilesStatsByQuery(esClient, indexName, request) {return new Promise(function (resolve, reject) {
        esClient.search({
            index: EsQueryBuilder.getFullIndexName(indexName),
            type: _config2.default.esFileTypeName,
            body: EsQueryBuilder.getFilesStatsQuery(request) }).

        then(function (result) {return resolve(normalizeStatsAggregationResult(result));}).
        catch(function (err) {return reject(err);});
    });};

var searchFiles = exports.searchFiles = function searchFiles(esClient, indexName, request, from, size) {
    var fullIndexName = EsQueryBuilder.getFullIndexName(indexName);

    var requests = [
    { index: fullIndexName, type: _config2.default.esFileTypeName },
    EsQueryBuilder.getFilesWithHighlightsQuery(request, from * size, size),
    { index: fullIndexName, type: _config2.default.esFileTypeName },
    EsQueryBuilder.getFilesWithoutHighlightsQuery(request, from * size, size)];


    return new Promise(function (resolve, reject) {return (
            esClient.msearch({
                body: requests }).

            then(function (results) {
                var result = results.responses;
                var maxScore = Math.max(result[0].hits.max_score, result[1].hits.max_score);

                var resultHits = normalizeHitsScore(result[0].hits.hits, maxScore).
                concat(normalizeHitsScore(result[1].hits.hits, maxScore)).
                sort(function (a, b) {return b._score - a._score;}).
                map(function (hit) {return normalizeHitContentHighlights(transformHit(hit));}).
                filter(function (hit) {return hit.content.highlight &&
                    hit.content.highlight.text &&
                    hit.content.highlight.text.length > 0 &&
                    !hit.content.highlight.text.some(function (text) {return (/<em>/.test(text));}) &&
                    !hit.meta.highlight &&
                    !hit.content.highlight.author &&
                    request.content != '*' &&
                    request.content != '' ?
                    false :
                    true;});

                resolve({
                    total: result[0].hits.total + result[1].hits.total,
                    hits: resultHits });

            }).
            catch(function (err) {return reject(err);}));});

};

var getFileHighlightByFileId = exports.getFileHighlightByFileId = function getFileHighlightByFileId(esClient, indexName, request, fileId) {return new Promise(function (resolve, reject) {
        esClient.search({
            index: EsQueryBuilder.getFullIndexName(indexName),
            type: _config2.default.esFileTypeName,
            body: EsQueryBuilder.getFileHighlightQuery(request, fileId) }).

        then(function (result) {
            if (result.hits.hits && result.hits.hits.length === 1) {
                resolve(
                normalizeHitContentHighlights(
                transformHit(result.hits.hits[0])));


            } else
            {
                resolve({});
            }
        }).
        catch(function (err) {return reject(err);});
    });};

var getFullFileHighlightByFileId = exports.getFullFileHighlightByFileId = function getFullFileHighlightByFileId(esClient, indexName, request, fileId) {return new Promise(function (resolve, reject) {
        esClient.search({
            index: EsQueryBuilder.getFullIndexName(indexName),
            type: _config2.default.esFileTypeName,
            body: EsQueryBuilder.getFullFileHighlightQuery(request, fileId) }).

        then(function (result) {
            if (result.hits.hits && result.hits.hits.length === 1) {
                resolve(
                normalizeHitContentHighlights(
                highlightEntitiesInHitContentHighlights(
                transformHit(result.hits.hits[0]))));



            } else
            {
                resolve({});
            }
        }).
        catch(function (err) {return reject(err);});
    });};

var checkIfMetaIdExists = exports.checkIfMetaIdExists = function checkIfMetaIdExists(esClient, indexName, metaId) {return new Promise(function (resolve, reject) {
        esClient.search({
            index: EsQueryBuilder.getFullIndexName(indexName),
            type: _config2.default.esFileTypeName,
            _source: false,
            body: {
                query: {
                    term: { 'meta.id': metaId } } } }).



        then(function (result) {return resolve(result.hits.total > 0 ? true : false);}).
        catch(function (err) {return reject(err);});
    });};

var checkIfFileExists = exports.checkIfFileExists = function checkIfFileExists(esClient, indexName, fileId) {return new Promise(function (resolve, reject) {
        esClient.get({
            index: EsQueryBuilder.getFullIndexName(indexName),
            type: _config2.default.esFileTypeName,
            _source: false,
            id: fileId }).

        then(function (result) {
            resolve(result.found);
        }).
        catch(function (err) {
            if (err.statusCode == 404) {
                resolve(false);
                return;
            }
            reject(err);
        });
    });};

var getFileByFileId = exports.getFileByFileId = function getFileByFileId(esClient, indexName, fileId) {var includeChildren = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;return new Promise(function (resolve, reject) {
        esClient.search({
            index: EsQueryBuilder.getFullIndexName(indexName),
            type: _config2.default.esFileTypeName,
            body: {
                query: {
                    bool: {
                        must: [
                        { term: { 'file_id': fileId } }],

                        should: includeChildren ? [
                        {
                            has_child: {
                                type: 'ambar_file_tag',
                                query: {
                                    match_all: {} },

                                inner_hits: {} } },


                        {
                            has_child: {
                                type: 'ambar_file_named_entity',
                                query: {
                                    match_all: {} },

                                inner_hits: {} } },


                        {
                            has_child: {
                                type: 'ambar_file_hidden_mark',
                                query: {
                                    match_all: {} },

                                inner_hits: {} } }] :


                        [],
                        minimum_should_match: 0 } } } }).




        then(function (result) {return resolve(result.hits.total > 0 ? normalizeHitContentHighlights(transformHit(result.hits.hits[0])) : null);}).
        catch(function (err) {return reject(err);});
    });};

var getFileBySha = exports.getFileBySha = function getFileBySha(esClient, indexName, sha) {return new Promise(function (resolve, reject) {
        esClient.search({
            index: EsQueryBuilder.getFullIndexName(indexName),
            type: _config2.default.esFileTypeName,
            body: {
                from: 0,
                size: 1,
                query: {
                    term: { 'sha256': sha } } } }).



        then(function (result) {return resolve(result.hits.total > 0 ? normalizeHitContentHighlights(transformHit(result.hits.hits[0])) : null);}).
        catch(function (err) {return reject(err);});
    });};

var hideFile = exports.hideFile = function hideFile(esClient, indexName, fileId) {return new Promise(function (resolve, reject) {
        var hiddenMark = {
            id: getHiddenMarkId(fileId),
            indexed_datetime: _index.DateTimeService.getCurrentDateTime() };


        esClient.index({
            index: EsQueryBuilder.getFullIndexName(indexName),
            type: _config2.default.esFileHiddenMarkTypeName,
            parent: fileId,
            refresh: true,
            id: hiddenMark.id,
            body: hiddenMark }).

        then(function (res) {return resolve(res);}).
        catch(function (err) {return reject(err);});
    });};

var unHideFile = exports.unHideFile = function unHideFile(esClient, indexName, fileId) {return new Promise(function (resolve, reject) {
        var hiddenMarkId = getHiddenMarkId(fileId);

        esClient.delete({
            index: EsQueryBuilder.getFullIndexName(indexName),
            type: _config2.default.esFileHiddenMarkTypeName,
            routing: fileId,
            refresh: true,
            id: hiddenMarkId }).

        then(function (res) {return resolve(res);}).
        catch(function (err) {return reject(err);});
    });};

var indexNamedEntities = exports.indexNamedEntities = function indexNamedEntities(esClient, indexName, fileId, entities) {return new Promise(function (resolve, reject) {
        var payload = [];

        entities.forEach(function (entity) {
            payload.push({ index: { _index: EsQueryBuilder.getFullIndexName(indexName), _type: _config2.default.esFileNamedEntityTypeName, _id: entity.id, _parent: fileId } });
            payload.push(_extends({}, entity, { indexed_datetime: _index.DateTimeService.getCurrentDateTime() }));
        });

        esClient.bulk({
            body: payload }).

        then(function (res) {
            if (!res.errors) {
                resolve(res);
                return;
            }
            reject(res);
        }).
        catch(function (err) {return reject(err);});
    });};

var indexTag = exports.indexTag = function indexTag(esClient, indexName, fileId, tag) {return new Promise(function (resolve, reject) {
        tag.indexed_datetime = _index.DateTimeService.getCurrentDateTime();
        esClient.index({
            index: EsQueryBuilder.getFullIndexName(indexName),
            type: _config2.default.esFileTagTypeName,
            parent: fileId,
            refresh: true,
            id: tag.id,
            body: tag }).

        then(function (res) {return resolve(res);}).
        catch(function (err) {return reject(err);});
    });};

var deleteTag = exports.deleteTag = function deleteTag(esClient, indexName, fileId, tagId) {return new Promise(function (resolve, reject) {
        esClient.delete({
            index: EsQueryBuilder.getFullIndexName(indexName),
            type: _config2.default.esFileTagTypeName,
            routing: fileId,
            refresh: true,
            id: tagId }).

        then(function (res) {return resolve(res);}).
        catch(function (err) {return reject(err);});
    });};

var indexLogItem = exports.indexLogItem = function indexLogItem(esClient, logItem) {
    logItem.indexed_datetime = _index.DateTimeService.getCurrentDateTime();
    esClient.index({
        index: _config2.default.esLogIndexName,
        type: _config2.default.esLogTypeName,
        body: logItem });

};

var getLastLogRecords = exports.getLastLogRecords = function getLastLogRecords(esClient, sourceId, numberOfRecords) {return new Promise(function (resolve, reject) {
        var query = {
            from: 0,
            size: numberOfRecords,
            sort: { created_datetime: { order: 'desc' } } };

        if (sourceId) {
            query.query = {
                term: { source_id: sourceId } };

        }
        return esClient.search({
            index: _config2.default.esLogIndexName,
            type: _config2.default.esLogTypeName,
            body: query }).

        then(function (result) {return resolve(result.hits.hits.map(function (hit) {return hit._source;}).reverse());}).
        catch(function (err) {return reject(err);});
    });};

var createLogIndexIfNotExist = exports.createLogIndexIfNotExist = function createLogIndexIfNotExist(esClient) {return new Promise(function (resolve, reject) {
        esClient.indices.create({
            index: 'ambar_log_record_data',
            body: AmbarLogMapping }).

        then(function (result) {return resolve();}).
        catch(function (err) {
            if (err.status === 400) {
                resolve(); // Log index already exists
                return;
            }

            reject(err);
        });
    });};

var createUserIndex = exports.createUserIndex = function createUserIndex(esClient, indexName, langAnalyzer) {return new Promise(function (resolve, reject) {
        var userMappings = JSON.parse(JSON.stringify(_extends({}, AmbarFileDataMapping)).replace(MAPPING_ANALYZER_REGEX, langAnalyzer));

        esClient.indices.create({
            index: EsQueryBuilder.getFullIndexName(indexName),
            body: userMappings }).

        then(function (result) {return resolve(result);}).
        catch(function (err) {return reject(err);});
    });};

var deleteUserIndex = exports.deleteUserIndex = function deleteUserIndex(esClient, indexName) {return new Promise(function (resolve, reject) {
        esClient.indices.delete({
            index: EsQueryBuilder.getFullIndexName(indexName) }).

        then(function (result) {return resolve(result);}).
        catch(function (err) {return reject(err);});
    });};

var deleteAutoTagsAndNamedEntities = exports.deleteAutoTagsAndNamedEntities = function deleteAutoTagsAndNamedEntities(esClient, indexName, fileId) {return new Promise(function (resolve, reject) {
        Promise.all([deleteAutoTags(esClient, indexName, fileId),
        deleteNamedEntities(esClient, indexName, fileId)]).
        then(function (results) {return resolve(results);}).
        catch(function (err) {return reject(err);});
    });};

var deleteAutoTags = function deleteAutoTags(esClient, indexName, fileId) {return new Promise(function (resolve, reject) {
        esClient.deleteByQuery({
            index: EsQueryBuilder.getFullIndexName(indexName),
            type: _config2.default.esFileTagTypeName,
            body: {
                query: {
                    bool: {
                        must: [
                        {
                            parent_id: {
                                type: "ambar_file_tag",
                                id: fileId } },


                        {
                            bool: {
                                should: [
                                {
                                    term: {
                                        type: 'auto' } },


                                {
                                    term: {
                                        type: 'source' } }] } }] } } } }).










        then(function (res) {return resolve(res);}).
        catch(function (err) {return reject(err);});
    });};

var deleteNamedEntities = function deleteNamedEntities(esClient, indexName, fileId) {return new Promise(function (resolve, reject) {
        esClient.deleteByQuery({
            index: EsQueryBuilder.getFullIndexName(indexName),
            type: _config2.default.esFileNamedEntityTypeName,
            body: {
                query: {
                    parent_id: {
                        type: "ambar_file_named_entity",
                        id: fileId } } } }).




        then(function (res) {return resolve(res);}).
        catch(function (err) {return reject(err);});
    });};
//# sourceMappingURL=EsProxy.js.map