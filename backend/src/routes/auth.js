"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _expressValidator = require("express-validator");
var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));
var _models = require("../models");
var _auth = require("../middleware/auth");
var _logger = require("../utils/logger");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// @ts-nocheck

const router = (0, _express.Router)();

// Validation rules
const registerValidation = [(0, _expressValidator.body)('name').trim().isLength({
  min: 2,
  max: 100
}).withMessage('Name must be between 2 and 100 characters'), (0, _expressValidator.body)('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'), (0, _expressValidator.body)('phone').matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit mobile number'), (0, _expressValidator.body)('aadhaar').matches(/^\d{12}$/).withMessage('Aadhaar must be 12 digits'), (0, _expressValidator.body)('role').optional().isIn(['citizen', 'admin', 'official', 'superadmin']).withMessage('Invalid role specified'), (0, _expressValidator.body)('department').optional().trim().isLength({
  max: 100
}).withMessage('Department name cannot exceed 100 characters'), (0, _expressValidator.body)('password').optional().isLength({
  min: 6
}).withMessage('Password must be at least 6 characters long')];
const loginValidation = [(0, _expressValidator.body)().custom((value, {
  req
}) => {
  if (!req.body.identifier && !(req.body.aadhaar && req.body.phone)) {
    throw new Error('Provide identifier OR aadhaar + phone');
  }
  return true;
})];
const forgotPasswordValidation = [(0, _expressValidator.body)('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')];
const resetPasswordValidation = [(0, _expressValidator.body)('token').trim().notEmpty().withMessage('Reset token is required'), (0, _expressValidator.body)('password').isLength({
  min: 6
}).withMessage('Password must be at least 6 characters long')];

// Generate JWT tokens
const generateTokens = user => {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  const jwtExpire = process.env.JWT_EXPIRE || '24h';
  const refreshExpire = process.env.JWT_REFRESH_EXPIRE || '7d';
  if (!jwtSecret || !refreshSecret) {
    throw new Error('JWT secrets are not configured');
  }
  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    department: user.department
  };
  const accessToken = _jsonwebtoken.default.sign(payload, jwtSecret, {
    expiresIn: jwtExpire
  });
  const refreshToken = _jsonwebtoken.default.sign(payload, refreshSecret, {
    expiresIn: refreshExpire
  });
  return {
    accessToken,
    refreshToken
  };
};

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = (0, _expressValidator.validationResult)(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    res.status(400).json({
      success: false,
      error: errorMessages.join(', ')
    });
    return;
  }
  next();
};

// Register user
router.post('/register', registerValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      aadhaar,
      role = 'citizen',
      department,
      password
    } = req.body;

    // Check if user already exists
    const existingUser = await _models.User.findByEmailOrPhone(email);
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'User with this email or phone already exists'
      });
      return;
    }

    // Check if aadhaar already exists
    const aadhaarExists = await _models.User.aadhaarExists(aadhaar);
    if (aadhaarExists) {
      res.status(409).json({
        success: false,
        error: 'Aadhaar number already registered'
      });
      return;
    }

    // Validate department requirement for officials
    if (role === 'official' && !department) {
      res.status(400).json({
        success: false,
        error: 'Department is required for officials'
      });
      return;
    }

    // Create user
    const userData = {
      name,
      email,
      phone,
      aadhaar,
      role,
      isActive: true,
      emailVerified: false,
      phoneVerified: false
    };
    if (role === 'official') {
      userData.department = department;
    }

    // Only require password for non-citizens in development
    if (role !== 'citizen' || password) {
      userData.passwordHash = password;
    }
    const user = new _models.User(userData);
    console.log("Saving user:", userData); await user.save();

    // Generate tokens
    const {
      accessToken,
      refreshToken
    } = generateTokens(user);
    _logger.logger.info(`New user registered: ${email} (${role})`);
    res.status(201).json({
      success: true,
      data: {
        user: user.profile,
        accessToken,
        refreshToken
      },
      message: 'Registration successful'
    });
  } catch (error) {
    _logger.logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login user
router.post('/login', loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      identifier,
      password,
      aadhaar,
      phone
    } = req.body;
    let user;

    // Case 1: Email/Phone login
    if (identifier) {
      user = await _models.User.findByEmailOrPhone(identifier);
    }

    // Case 2: Aadhaar + Phone login
    else if (aadhaar && phone) {
      user = await _models.User.findOne({
        aadhaar,
        phone
      });
    }
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // For citizens without password, allow login with identifier only
    if (aadhaar && phone && user.role === 'citizen') {
      const tokens = generateTokens(user);
      _logger.logger.info(`Citizen logged in: ${user.email}`);
      res.json({
        success: true,
        data: {
          user: user.profile,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        },
        message: 'Login successful'
      });
      return;
    }

    // Verify password for users with passwords
    if (user.passwordHash) {
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
        return;
      }
    } else {
      res.status(401).json({
        success: false,
        error: 'Password is required for this user type'
      });
      return;
    }

    // Generate tokens
    const {
      accessToken,
      refreshToken
    } = generateTokens(user);
    _logger.logger.info(`User logged in: ${user.email} (${user.role})`);
    res.json({
      success: true,
      data: {
        user: user.profile,
        accessToken,
        refreshToken
      },
      message: 'Login successful'
    });
  } catch (error) {
    _logger.logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Refresh access token
router.post('/refresh-token', _auth.validateRefreshToken, async (req, res) => {
  try {
    const user = req.user;
    const {
      accessToken,
      refreshToken
    } = generateTokens(user);
    _logger.logger.info(`Token refreshed for: ${user.email}`);
    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken
      },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    _logger.logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

// Get user profile
router.get('/profile', _auth.authenticateToken, async (req, res) => {
  try {
    const user = await _models.User.findById(req.user?.id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }
    res.json({
      success: true,
      data: {
        user: user.profile
      }
    });
  } catch (error) {
    _logger.logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

// Update user profile
router.put('/profile', _auth.authenticateToken, [(0, _expressValidator.body)('name').optional().trim().isLength({
  min: 2,
  max: 100
}).withMessage('Name must be between 2 and 100 characters'), (0, _expressValidator.body)('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit mobile number')], handleValidationErrors, async (req, res) => {
  try {
    const {
      name,
      phone
    } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User ID not found'
      });
      return;
    }
    const user = await _models.User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Update fields
    if (name) user.name = name;
    if (phone) {
      // Check if phone is already used by another user
      const existingUser = await _models.User.findOne({
        phone,
        _id: {
          $ne: userId
        }
      });
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'Phone number already in use'
        });
        return;
      }
      user.phone = phone;
    }
    console.log("Saving user:", userData); await user.save();
    _logger.logger.info(`Profile updated for: ${user.email}`);
    res.json({
      success: true,
      data: {
        user: user.profile
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    _logger.logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Change password
router.post('/change-password', _auth.authenticateToken, [(0, _expressValidator.body)('currentPassword').trim().notEmpty().withMessage('Current password is required'), (0, _expressValidator.body)('newPassword').isLength({
  min: 6
}).withMessage('New password must be at least 6 characters long')], handleValidationErrors, async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword
    } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User ID not found'
      });
      return;
    }
    const user = await _models.User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }
    if (!user.passwordHash) {
      res.status(400).json({
        success: false,
        error: 'No password set for this account'
      });
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
      return;
    }

    // Update password
    user.passwordHash = newPassword;
    console.log("Saving user:", userData); await user.save();
    _logger.logger.info(`Password changed for: ${user.email}`);
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    _logger.logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

// Forgot password
router.post('/forgot-password', forgotPasswordValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      email
    } = req.body;
    const user = await _models.User.findOne({
      email: email.toLowerCase()
    });
    if (!user) {
      // Don't reveal if user exists
      res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      });
      return;
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    console.log("Saving user:", userData); await user.save();

    // TODO: Send email with reset token
    _logger.logger.info(`Password reset requested for: ${email}, token: ${resetToken}`);
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent'
    });
  } catch (error) {
    _logger.logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
    });
  }
});

// Reset password
router.post('/reset-password', resetPasswordValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      token,
      password
    } = req.body;

    // TODO: Validate reset token and find user
    // This is a simplified implementation
    // In production, you would store hashed tokens with expiry

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    _logger.logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

// Admin route to create user
router.post('/admin/create-user', _auth.authenticateToken, (0, _auth.authorizeRoles)('admin', 'superadmin'), [(0, _expressValidator.body)('name').trim().isLength({
  min: 2,
  max: 100
}).withMessage('Name must be between 2 and 100 characters'), (0, _expressValidator.body)('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'), (0, _expressValidator.body)('phone').matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit mobile number'), (0, _expressValidator.body)('aadhaar').matches(/^\d{12}$/).withMessage('Aadhaar must be 12 digits'), (0, _expressValidator.body)('role').isIn(['citizen', 'admin', 'official', 'superadmin']).withMessage('Invalid role specified'), (0, _expressValidator.body)('password').isLength({
  min: 6
}).withMessage('Password must be at least 6 characters long')], handleValidationErrors, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      aadhaar,
      role,
      department,
      password
    } = req.body;

    // Check if user already exists
    const existingUser = await _models.User.findByEmailOrPhone(email);
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'User with this email or phone already exists'
      });
      return;
    }

    // Validate department requirement for officials
    if (role === 'official' && !department) {
      res.status(400).json({
        success: false,
        error: 'Department is required for officials'
      });
      return;
    }

    // Create user
    const userData = {
      name,
      email,
      phone,
      aadhaar,
      role,
      passwordHash: password,
      isActive: true,
      emailVerified: true,
      phoneVerified: true
    };
    if (role === 'official') {
      userData.department = department;
    }
    const user = new _models.User(userData);
    console.log("Saving user:", userData); await user.save();
    _logger.logger.info(`Admin created user: ${email} (${role}) by ${req.user?.email}`);
    res.status(201).json({
      success: true,
      data: {
        user: user.profile
      },
      message: 'User created successfully'
    });
  } catch (error) {
    _logger.logger.error('Admin create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});
var _default = exports.default = router;