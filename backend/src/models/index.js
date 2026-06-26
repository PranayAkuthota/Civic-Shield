"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  User: true,
  Complaint: true,
  Department: true,
  Analytics: true
};
Object.defineProperty(exports, "Analytics", {
  enumerable: true,
  get: function () {
    return _Analytics.default;
  }
});
Object.defineProperty(exports, "Complaint", {
  enumerable: true,
  get: function () {
    return _Complaint.default;
  }
});
Object.defineProperty(exports, "Department", {
  enumerable: true,
  get: function () {
    return _Department.default;
  }
});
Object.defineProperty(exports, "User", {
  enumerable: true,
  get: function () {
    return _User.default;
  }
});
var _User = _interopRequireDefault(require("./User"));
var _Complaint = _interopRequireDefault(require("./Complaint"));
var _Department = _interopRequireDefault(require("./Department"));
var _Analytics = _interopRequireDefault(require("./Analytics"));
var _types = require("../types");
Object.keys(_types).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _types[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _types[key];
    }
  });
});
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }