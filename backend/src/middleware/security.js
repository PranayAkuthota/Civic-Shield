"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateInput = exports.uploadLimiter = exports.strictLimiter = exports.securityHeaders = exports.requestLogger = exports.notFoundHandler = exports.ipWhitelist = exports.healthCheck = exports.generalLimiter = exports.errorHandler = exports.createRateLimiter = exports.contentSizeLimiter = exports.configureCors = exports.compressResponses = exports.authLimiter = exports.apiVersion = void 0;
var _expressRateLimit = _interopRequireDefault(require("express-rate-limit"));
var _helmet = _interopRequireDefault(require("helmet"));
var _compression = _interopRequireDefault(require("compression"));
var _logger = require("../utils/logger");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// Rate limiting configurations
const createRateLimiter = (windowMs, max, message) => {
  return (0, _expressRateLimit.default)({
    windowMs,
    max,
    message: {
      success: false,
      error: message
    },
    standardHeaders: true,
    // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,
    // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      _logger.logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        success: false,
        error: message
      });
    }
  });
};

// General rate limiter
exports.createRateLimiter = createRateLimiter;
const generalLimiter = exports.generalLimiter = createRateLimiter(15 * 60 * 1000,
// 15 minutes
100,
// limit each IP to 100 requests per windowMs
'Too many requests from this IP, please try again later.');

// Strict rate limiter for sensitive endpoints
const strictLimiter = exports.strictLimiter = createRateLimiter(15 * 60 * 1000,
// 15 minutes
5,
// limit each IP to 5 requests per windowMs
'Too many attempts from this IP, please try again later.');

// Authentication rate limiter
const authLimiter = exports.authLimiter = createRateLimiter(15 * 60 * 1000,
// 15 minutes
10,
// limit each IP to 10 auth requests per windowMs
'Too many authentication attempts, please try again later.');

// File upload rate limiter
const uploadLimiter = exports.uploadLimiter = createRateLimiter(60 * 60 * 1000,
// 1 hour
20,
// limit each IP to 20 file uploads per hour
'Too many file uploads, please try again later.');

// CORS configuration
const configureCors = (req, res, next) => {
  const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:3000', 'https://telangana.gov.in', 'https://www.telangana.gov.in'];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
};

// Security headers configuration
exports.configureCors = configureCors;
const securityHeaders = exports.securityHeaders = (0, _helmet.default)({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  // Disable for compatibility
  hsts: {
    maxAge: 31536000,
    // 1 year
    includeSubDomains: true,
    preload: true
  }
});

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length')
    };
    if (res.statusCode >= 400) {
      _logger.logger.error('HTTP Request Error', logData);
    } else {
      _logger.logger.info('HTTP Request', logData);
    }
  });
  next();
};

// Input validation middleware
exports.requestLogger = requestLogger;
const validateInput = (req, res, next) => {
  // Check for common injection patterns
  const suspiciousPatterns = [/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  // XSS
  /javascript:/gi,
  // JavaScript protocol
  /on\w+\s*=/gi,
  // Event handlers
  /union\s+select/gi,
  // SQL injection
  /drop\s+table/gi,
  // SQL injection
  /--/g,
  // SQL comment
  /\/\*[\s\S]*?\*\//g // SQL block comment
  ];
  const checkObject = obj => {
    if (typeof obj === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(obj));
    }
    if (Array.isArray(obj)) {
      return obj.some(item => checkObject(item));
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkObject(value));
    }
    return false;
  };

  // Check body, query, and params
  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    _logger.logger.warn(`Suspicious input detected from IP: ${req.ip}, Path: ${req.path}`);
    res.status(400).json({
      success: false,
      error: 'Invalid input detected'
    });
    return;
  }
  next();
};

// Content size limiter
exports.validateInput = validateInput;
const contentSizeLimiter = (maxSize = 10 * 1024 * 1024) => {
  // 10MB default
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > maxSize) {
      _logger.logger.warn(`Content size exceeded: ${contentLength} bytes from IP: ${req.ip}`);
      res.status(413).json({
        success: false,
        error: `Content size exceeds maximum allowed size of ${maxSize} bytes`
      });
      return;
    }
    next();
  };
};

// IP whitelist middleware (for admin endpoints)
exports.contentSizeLimiter = contentSizeLimiter;
const ipWhitelist = allowedIPs => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    if (!allowedIPs.includes(clientIP || '')) {
      _logger.logger.warn(`Access denied for IP: ${clientIP}, Path: ${req.path}`);
      res.status(403).json({
        success: false,
        error: 'Access denied from this IP address'
      });
      return;
    }
    next();
  };
};

// Compress responses
exports.ipWhitelist = ipWhitelist;
const compressResponses = exports.compressResponses = (0, _compression.default)({
  filter: (req, res) => {
    // Don't compress responses that are already compressed
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Don't compress very small responses
    return _compression.default.filter(req, res);
  },
  level: 6,
  // Compression level (1-9)
  threshold: 1024 // Only compress responses larger than 1KB
});

// Health check endpoint middleware
const healthCheck = async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    // Check database connection (if mongoose is available)
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        healthStatus.database = 'connected';
      } else {
        healthStatus.database = 'disconnected';
      }
    } catch (error) {
      healthStatus.database = 'not_available';
    }
    res.status(200).json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    _logger.logger.error('Health check error:', error);
    res.status(503).json({
      success: false,
      error: 'Service unavailable'
    });
  }
};

// API versioning middleware
exports.healthCheck = healthCheck;
const apiVersion = (req, res, next) => {
  res.setHeader('API-Version', 'v1');
  next();
};

// Error handling middleware
exports.apiVersion = apiVersion;
const errorHandler = (error, req, res, next) => {
  _logger.logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && {
      stack: error.stack
    })
  });
};

// 404 handler
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`
  });
};
exports.notFoundHandler = notFoundHandler;