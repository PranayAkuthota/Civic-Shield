import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JwtPayload, UserRole } from '../types';
import { User } from '../models';
import { logger } from '../utils/logger';

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
      logger.error('JWT_SECRET is not configured');
      res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    // Verify user still exists and is active
    const user = await User.findById(decoded.id);
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
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token has expired'
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
      return;
    }

    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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
export const authorizeDepartment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
    logger.error('Department authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
};

// Optional authentication - doesn't fail if no token provided
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        logger.error('JWT_SECRET is not configured');
        next();
        return;
      }

      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      const user = await User.findById(decoded.id);

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
    logger.debug('Optional authentication failed:', error);
    next();
  }
};

// Resource ownership check
export const checkOwnership = (resourceField: string = 'filedBy') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
      logger.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        error: 'Ownership check failed'
      });
    }
  };
};

// API key authentication for external services
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
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
export const validateRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
      return;
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      logger.error('JWT_REFRESH_SECRET is not configured');
      res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
      return;
    }

    const decoded = jwt.verify(refreshToken, refreshSecret) as JwtPayload;
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
      return;
    }

    // Attach user to request for use in refresh token controller
    (req as any).user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Refresh token has expired'
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
      return;
    }

    logger.error('Refresh token validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Refresh token validation failed'
    });
  }
};