'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _createClass = function () {function defineProperties(target, props) {for (var i = 0; i < props.length; i++) {var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);}}return function (Constructor, protoProps, staticProps) {if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;};}();

var _stream = require('stream');function _classCallCheck(instance, Constructor) {if (!(instance instanceof Constructor)) {throw new TypeError("Cannot call a class as a function");}}function _possibleConstructorReturn(self, call) {if (!self) {throw new ReferenceError("this hasn't been initialised - super() hasn't been called");}return call && (typeof call === "object" || typeof call === "function") ? call : self;}function _inherits(subClass, superClass) {if (typeof superClass !== "function" && superClass !== null) {throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);}subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;}var

DivideToChunks = function (_Transform) {_inherits(DivideToChunks, _Transform);


    function DivideToChunks() {var chunkSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1024 * 3;_classCallCheck(this, DivideToChunks);var _this = _possibleConstructorReturn(this, (DivideToChunks.__proto__ || Object.getPrototypeOf(DivideToChunks)).call(this));

        _this.chunkSize = chunkSize;return _this;
    }_createClass(DivideToChunks, [{ key: '_transform', value: function _transform(

        chunk, enc, cb) {

            if (!Buffer.isBuffer(chunk))
            throw new Error('Chunk is not Buffer');

            var chunkLength = Buffer.byteLength(chunk);

            if (chunkLength > this.chunkSize) {
                var partsCount = Math.ceil(chunkLength / this.chunkSize);

                for (var i = 0; i < partsCount; i++) {
                    var startPos = i * this.chunkSize;
                    var endPos = startPos + this.chunkSize > chunkLength ?
                    chunkLength :
                    startPos + this.chunkSize;

                    this.push(chunk.slice(startPos, endPos));
                }
            } else {
                this.push(chunk);
            }

            cb();
        } }]);return DivideToChunks;}(_stream.Transform);exports.default =


DivideToChunks;
//# sourceMappingURL=BufferToChunks.js.map