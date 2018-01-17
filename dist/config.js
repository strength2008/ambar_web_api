'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _extends = Object.assign || function (target) {for (var i = 1; i < arguments.length; i++) {var source = arguments[i];for (var key in source) {if (Object.prototype.hasOwnProperty.call(source, key)) {target[key] = source[key];}}}return target;};var _minimist = require('minimist');var _minimist2 = _interopRequireDefault(_minimist);
var _url = require('url');var _url2 = _interopRequireDefault(_url);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var defaultConfig = {
	"localPort": 8080,
	"bodyLimit": "1024mb",
	"corsHeaders": ["Link"],
	"mongoDbUrl": "mongodb://ambar:27017/ambar_data",
	"elasticSearchUrl": "http://ambar:9200",
	"redisHost": "ambar",
	"redisPort": "6379",
	"dateTimeFormat": "YYYY-MM-DD HH:mm:ss.SSS",
	"esLogIndexName": "ambar_log_record_data",
	"esLogTypeName": "ambar_log_record",
	"esFileIndexName": "ambar_file_data",
	"esFileTypeName": "ambar_file",
	"esFileTagTypeName": "ambar_file_tag",
	"esFileNamedEntityTypeName": "ambar_file_named_entity",
	"esFileHiddenMarkTypeName": "ambar_file_hidden_mark",
	"crawlerContainerPrefix": "c",
	"pipelineContainerPrefix": "p",
	"apiUrl": "http://ambar:8004",
	"feUrl": "http://ambar",
	"mandrillKey": "uQzk-jUPZIuqSjRN2FfjjQ",
	"rabbitHost": "amqp://ambar",
	"dropboxClientId": "",
	"dropboxRedirectUri": "",

	"nerEnabled": "true",

	"auth": "none",

	"uiLang": "en",

	"preserveOriginals": "true",

	"defaultAccountName": "Administrator",
	"defaultAccountEmail": "admin",
	"defaultAccountPassword": "admin",
	"defaultAccountPlan": "unlim",
	"defaultAccountLangAnalyzer": "ambar_en",
	"defaultAccountRole": "admin",

	"analyticsToken": "",

	"ocrPdfMaxPageCount": 1000,
	"ocrPdfSymbolsPerPageThreshold": 100,

	"dockerRepo": "ambar",
	"crawlerImageName": "ambar-crawler:latest",
	"pipelineImageName": "ambar-pipeline:latest",

	"defaultTaggingRules": [] };


var intParamsList = ['pipelineCount', 'crawlerCount', 'ocrPdfMaxPageCount', 'ocrPdfSymbolsPerPageThreshold', 'localPort'];

var freeConfig = {
	pipelineCount: 1,
	crawlerCount: 1,
	mode: 'ce' };








var config = null;

var init = function init() {
	var options = (0, _minimist2.default)(process.argv.slice(2));

	Object.keys(options).forEach(function (key) {
		if (intParamsList.includes(key)) {
			options[key] = parseInt(options[key]);
		}
	});

	if (typeof ENTERPEDITconfig !== 'undefined') {
		config = _extends({},
		defaultConfig,

		options);

	} else
	{
		config = _extends({},
		defaultConfig,
		options,
		freeConfig);

	}
	return config;
};exports.default =

function () {
	return config === null ?
	init() :
	config;
}();
//# sourceMappingURL=config.js.map