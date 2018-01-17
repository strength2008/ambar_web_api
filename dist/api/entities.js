'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _extends = Object.assign || function (target) {for (var i = 1; i < arguments.length; i++) {var source = arguments[i];for (var key in source) {if (Object.prototype.hasOwnProperty.call(source, key)) {target[key] = source[key];}}}return target;};var _express = require('express');
var _ErrorResponse = require('../utils/ErrorResponse');var _ErrorResponse2 = _interopRequireDefault(_ErrorResponse);
var _services = require('../services');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}







var generateEntityId = function generateEntityId(indexName, fileId, entityName, entityPosition) {
    return _services.CryptoService.getSha256('entity_' + indexName.trim().toLowerCase() + fileId.trim().toLowerCase() + entityName.trim().toLowerCase() + entityPosition.start + entityPosition.length);
};exports.default =

function (_ref) {var config = _ref.config,storage = _ref.storage;
    var api = (0, _express.Router)();

    //////////////// CALLED FROM PIPELINE OR EXTERNAL NER ////////////////////////////////////
    /**
    * Add named entity for specified file id
    */
    api.post('/service/:indexName/:fileId/index', _services.AuthService.ensureAuthenticatedAsService(storage), function (req, res, next) {var _req$params =
        req.params,fileId = _req$params.fileId,indexName = _req$params.indexName,entities = req.body.entities;

        if (!fileId || !indexName || !entities) {
            res.status(400).json(new _ErrorResponse2.default('Required field is missing'));
            return;
        }

        if (entities.length === 0) {
            res.status(400).json(new _ErrorResponse2.default('Please specify entities array!'));
            return;
        }

        entities.forEach(function (entity) {var _entity =
            entity,position = _entity.position,type = _entity.type,name = _entity.name;

            if (!position || !type || !name) {
                res.status(400).json(new _ErrorResponse2.default('Required field is missing'));
                return;
            }

            if (name.indexOf('"') > 0) {
                res.status(400).json(new _ErrorResponse2.default('Named entity name can not contain semicolon (")!'));
                return;
            }

            var entityId = generateEntityId(indexName, fileId, name, position);

            entity = _extends({},
            entity, { id: entityId,
                position: position,
                name: name.toLowerCase(),
                type: type.toLowerCase() });

        });

        _services.EsProxy.indexNamedEntities(storage.elasticSearch, indexName, fileId, entities).
        then(function () {
            res.sendStatus(200);
        }).
        catch(next);
    });

    return api;
};
//# sourceMappingURL=entities.js.map