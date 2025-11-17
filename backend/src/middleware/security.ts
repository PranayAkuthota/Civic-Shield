import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from '../utils/logger';

// Rate limiting configurations
export const createRateLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        success: false,
        error: message
      });
    }
  });
};

// General rate limiter
export const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

// Strict rate limiter for sensitive endpoints
export const strictLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 requests per windowMs
  'Too many attempts from this IP, please try again later.'
);

// Authentication rate limiter
export const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // limit each IP to 10 auth requests per windowMs
  'Too many authentication attempts, please try again later.'
);

// File upload rate limiter
export const uploadLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  20, // limit each IP to 20 file uploads per hour
  'Too many file uploads, please try again later.'
);

// CORS configuration
export const configureCors = (req: Request, res: Response, next: NextFunction): void => {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://telangana.gov.in',
    'https://www.telangana.gov.in'
  ];

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
export const securityHeaders = helmet({
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
      manifestSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for compatibility
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
});

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
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
      logger.error('HTTP Request Error', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

// Input validation middleware
export const validateInput = (req: Request, res: Response, next: NextFunction): void => {
  // Check for common injection patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // XSS
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=/gi, // Event handlers
    /union\s+select/gi, // SQL injection
    /drop\s+table/gi, // SQL injection
    /--/g, // SQL comment
    /\/\*[\s\S]*?\*\//g, // SQL block comment
  ];

  const checkObject = (obj: any): boolean => {
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
    logger.warn(`Suspicious input detected from IP: ${req.ip}, Path: ${req.path}`);
    res.status(400).json({
      success: false,
      error: 'Invalid input detected'
    });
    return;
  }

  next();
};

// Content size limiter
export const contentSizeLimiter = (maxSize: number = 10 * 1024 * 1024) => { // 10MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0');

    if (contentLength > maxSize) {
      logger.warn(`Content size exceeded: ${contentLength} bytes from IP: ${req.ip}`);
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
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress;

    if (!allowedIPs.includes(clientIP || '')) {
      logger.warn(`Access denied for IP: ${clientIP}, Path: ${req.path}`);
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
export const compressResponses = compression({
  filter: (req: Request, res: Response) => {
    // Don't compress responses that are already compressed
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Don't compress very small responses
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9)
  threshold: 1024, // Only compress responses larger than 1KB
});

// Health check endpoint middleware
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
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
        (healthStatus as any).database = 'connected';
      } else {
        (healthStatus as any).database = 'disconnected';
      }
    } catch (error) {
      (healthStatus as any).database = 'not_available';
    }

    res.status(200).json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      success: false,
      error: 'Service unavailable'
    });
  }
};

// API versioning middleware
export const apiVersion = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('API-Version', 'v1');
  next();
};

// Error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Unhandled error:', {
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
    ...(isDevelopment && { stack: error.stack })
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`
  });
};