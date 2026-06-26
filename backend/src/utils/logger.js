"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.logger = exports.httpLogger = exports.createLogger = exports.Logger = exports.LogLevel = void 0;
var _morgan = _interopRequireDefault(require("morgan"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// Custom log levels
let LogLevel = exports.LogLevel = /*#__PURE__*/function (LogLevel) {
  LogLevel["ERROR"] = "error";
  LogLevel["WARN"] = "warn";
  LogLevel["INFO"] = "info";
  LogLevel["DEBUG"] = "debug";
  return LogLevel;
}({});

// Logger class for structured logging
class Logger {
  constructor(context = 'App') {
    this.context = context;
  }
  formatMessage(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${metaString}`;
  }
  error(message, meta) {
    console.error(this.formatMessage(LogLevel.ERROR, message, meta));
  }
  warn(message, meta) {
    console.warn(this.formatMessage(LogLevel.WARN, message, meta));
  }
  info(message, meta) {
    console.log(this.formatMessage(LogLevel.INFO, message, meta));
  }
  debug(message, meta) {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage(LogLevel.DEBUG, message, meta));
    }
  }
}

// Default logger instance
exports.Logger = Logger;
const logger = exports.logger = new Logger();

// Morgan middleware for HTTP request logging
const httpLogger = exports.httpLogger = (0, _morgan.default)((tokens, req, res) => {
  const status = tokens.status(req, res);
  const method = tokens.method(req, res);
  const url = tokens.url(req, res);
  const responseTime = tokens['response-time'](req, res);
  const userAgent = req.get('User-Agent');
  const ip = req.ip || req.connection.remoteAddress;
  const logData = {
    method,
    url,
    status: parseInt(status || '0'),
    responseTime: parseFloat(responseTime || '0'),
    ip,
    userAgent,
    userId: req.user?.id
  };

  // Log based on status code
  if (parseInt(status || '0') >= 400) {
    logger.error('HTTP Request Error', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
  return `${method} ${url} ${status} ${responseTime}ms`;
});

// Create context-specific loggers
const createLogger = context => {
  return new Logger(context);
};
exports.createLogger = createLogger;