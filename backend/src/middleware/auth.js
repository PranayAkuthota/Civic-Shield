"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateRefreshToken = exports.optionalAuth = exports.checkOwnership = exports.authorizeRoles = exports.authorizeDepartment = exports.authenticateToken = exports.authenticateApiKey = void 0;
var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));
var _models = require("../models");
var _logger = require("../utils/logger");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token is required'
      });
      return;
    }
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      _logger.logger.error('JWT_SECRET is not configured');
      res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
      return;
    }

    // Verify token
    const decoded = _jsonwebtoken.default.verify(token, jwtSecret);

    // Verify user still exists and is active
    const user = await _models.User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
      return;
    }

    // Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      department: decoded.department
    };

    // Update last login time
    user.lastLoginAt = new Date();
    await user.save();
    next();
  } catch (error) {
    if (error instanceof _jsonwebtoken.default.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token has expired'
      });
      return;
    }
    if (error instanceof _jsonwebtoken.default.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
      return;
    }
    _logger.logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};
exports.authenticateToken = authenticateToken;
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
      return;
    }
    next();
  };
};

// Department-specific access control
exports.authorizeRoles = authorizeRoles;
const authorizeDepartment = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Superadmins and admins can access everything
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
      next();
      return;
    }

    // Citizens cannot access department-specific resources
    if (req.user.role === 'citizen') {
      res.status(403).json({
        success: false,
        error: 'Access denied for citizens'
      });
      return;
    }

    // Officials must have a department
    if (!req.user.department) {
      res.status(403).json({
        success: false,
        error: 'No department assigned'
      });
      return;
    }
    next();
  } catch (error) {
    _logger.logger.error('Department authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
};

// Optional authentication - doesn't fail if no token provided
exports.authorizeDepartment = authorizeDepartment;
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        _logger.logger.error('JWT_SECRET is not configured');
        next();
        return;
      }
      const decoded = _jsonwebtoken.default.verify(token, jwtSecret);
      const user = await _models.User.findById(decoded.id);
      if (user && user.isActive) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          department: decoded.department
        };
      }
    }
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    _logger.logger.debug('Optional authentication failed:', error);
    next();
  }
};

// Resource ownership check
exports.optionalAuth = optionalAuth;
const checkOwnership = (resourceField = 'filedBy') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Admins and superadmins can access everything
      if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        next();
        return;
      }

      // For other routes, we need to check the specific resource
      // This is typically handled in the route controller
      next();
    } catch (error) {
      _logger.logger.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        error: 'Ownership check failed'
      });
    }
  };
};

// API key authentication for external services
exports.checkOwnership = checkOwnership;
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  if (!apiKey || !validApiKeys.includes(apiKey)) {
    res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
    return;
  }
  next();
};

// Refresh token validation
exports.authenticateApiKey = authenticateApiKey;
const validateRefreshToken = async (req, res, next) => {
  try {
    const {
      refreshToken
    } = req.body;
    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
      return;
    }
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      _logger.logger.error('JWT_REFRESH_SECRET is not configured');
      res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
      return;
    }
    const decoded = _jsonwebtoken.default.verify(refreshToken, refreshSecret);
    const user = await _models.User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
      return;
    }

    // Attach user to request for use in refresh token controller
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof _jsonwebtoken.default.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Refresh token has expired'
      });
      return;
    }
    if (error instanceof _jsonwebtoken.default.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
      return;
    }
    _logger.logger.error('Refresh token validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Refresh token validation failed'
    });
  }
};
exports.validateRefreshToken = validateRefreshToken;