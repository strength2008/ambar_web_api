'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _createClass = function () {function defineProperties(target, props) {for (var i = 0; i < props.length; i++) {var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);}}return function (Constructor, protoProps, staticProps) {if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;};}();
var _stream = require('stream');function _classCallCheck(instance, Constructor) {if (!(instance instanceof Constructor)) {throw new TypeError("Cannot call a class as a function");}}function _possibleConstructorReturn(self, call) {if (!self) {throw new ReferenceError("this hasn't been initialised - super() hasn't been called");}return call && (typeof call === "object" || typeof call === "function") ? call : self;}function _inherits(subClass, superClass) {if (typeof superClass !== "function" && superClass !== null) {throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);}subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;}var

SliceBuffer = function (_Transform) {_inherits(SliceBuffer, _Transform);







    function SliceBuffer(startBytesToPass, endBytesToPass) {_classCallCheck(this, SliceBuffer);var _this = _possibleConstructorReturn(this, (SliceBuffer.__proto__ || Object.getPrototypeOf(SliceBuffer)).call(this));

        _this.startBytesToPass = startBytesToPass;
        _this.endBytesToPass = endBytesToPass;

        _this.m = Math.max(_this.startBytesToPass, _this.endBytesToPass);

        _this.tempBuffer = Buffer.alloc(0);
        _this.prevBuffer = Buffer.alloc(0);
        _this.isFirst = true;return _this;
    }_createClass(SliceBuffer, [{ key: '_transform', value: function _transform(

        chunk, enc, cb) {

            if (Buffer.byteLength(this.prevBuffer) > 0) {
                this.push(this.prevBuffer);
            }

            if (!Buffer.isBuffer(chunk)) {
                throw new Error('Chunk is not Buffer');
            }

            if (Buffer.byteLength(this.tempBuffer) < this.m) {
                this.tempBuffer = Buffer.concat([this.tempBuffer, chunk]);
            } else {
                if (this.isFirst) {
                    this.tempBuffer = this.tempBuffer.slice(this.startBytesToPass);
                    this.isFirst = false;
                }

                this.prevBuffer = Buffer.from(this.tempBuffer);
                this.tempBuffer = Buffer.from(chunk);
            }

            cb();
        } }, { key: '_flush', value: function _flush(

        cb) {
            this.push(this.prevBuffer);
            this.tempBuffer = this.tempBuffer.slice(0, Buffer.byteLength(this.tempBuffer) - this.endBytesToPass);
            this.push(this.tempBuffer);

            cb();
        } }]);return SliceBuffer;}(_stream.Transform);exports.default =


SliceBuffer;
//# sourceMappingURL=SliceBuffer.js.map