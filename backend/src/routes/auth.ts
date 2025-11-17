import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, UserRole } from '../models';
import { AuthenticatedRequest, ApiResponse, JwtPayload } from '../types';
import { authenticateToken, validateRefreshToken, authorizeRoles } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit mobile number'),
  body('aadhaar')
    .matches(/^\d{12}$/)
    .withMessage('Aadhaar must be 12 digits'),
  body('role')
    .optional()
    .isIn(['citizen', 'admin', 'official', 'superadmin'])
    .withMessage('Invalid role specified'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name cannot exceed 100 characters'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email or phone is required'),
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

const resetPasswordValidation = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Generate JWT tokens
const generateTokens = (user: any): { accessToken: string; refreshToken: string } => {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  const jwtExpire = process.env.JWT_EXPIRE || '24h';
  const refreshExpire = process.env.JWT_REFRESH_EXPIRE || '7d';

  if (!jwtSecret || !refreshSecret) {
    throw new Error('JWT secrets are not configured');
  }

  const payload: JwtPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    department: user.department
  };

  const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpire } as SignOptions);
  const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: refreshExpire } as SignOptions);

  return { accessToken, refreshToken };
};

// Handle validation errors
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
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
router.post('/register', registerValidation, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { name, email, phone, aadhaar, role = 'citizen', department, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmailOrPhone(email);
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'User with this email or phone already exists'
      });
      return;
    }

    // Check if aadhaar already exists
    const aadhaarExists = await User.aadhaarExists(aadhaar);
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
    const userData: any = {
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

    const user = new User(userData);
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    logger.info(`New user registered: ${email} (${role})`);

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
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login user
router.post('/login', loginValidation, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    // Find user by email or phone
    const user = await User.findByEmailOrPhone(identifier);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // For citizens without password, allow login with identifier only
    if (user.role === 'citizen' && !user.passwordHash) {
      const { accessToken, refreshToken } = generateTokens(user);

      logger.info(`Citizen logged in: ${user.email}`);

      res.json({
        success: true,
        data: {
          user: user.profile,
          accessToken,
          refreshToken
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
    const { accessToken, refreshToken } = generateTokens(user);

    logger.info(`User logged in: ${user.email} (${user.role})`);

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
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Refresh access token
router.post('/refresh-token', validateRefreshToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const { accessToken, refreshToken } = generateTokens(user);

    logger.info(`Token refreshed for: ${user.email}`);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken
      },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
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
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit mobile number')
], handleValidationErrors, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User ID not found'
      });
      return;
    }

    const user = await User.findById(userId);
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
      const existingUser = await User.findOne({ phone, _id: { $ne: userId } });
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'Phone number already in use'
        });
        return;
      }
      user.phone = phone;
    }

    await user.save();

    logger.info(`Profile updated for: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: user.profile
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Change password
router.post('/change-password', authenticateToken, [
  body('currentPassword')
    .trim()
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
], handleValidationErrors, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User ID not found'
      });
      return;
    }

    const user = await User.findById(userId);
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
    await user.save();

    logger.info(`Password changed for: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

// Forgot password
router.post('/forgot-password', forgotPasswordValidation, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
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
    await user.save();

    // TODO: Send email with reset token
    logger.info(`Password reset requested for: ${email}, token: ${resetToken}`);

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
    });
  }
});

// Reset password
router.post('/reset-password', resetPasswordValidation, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    // TODO: Validate reset token and find user
    // This is a simplified implementation
    // In production, you would store hashed tokens with expiry

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

// Admin route to create user
router.post('/admin/create-user', authenticateToken, authorizeRoles('admin', 'superadmin'), [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit mobile number'),
  body('aadhaar')
    .matches(/^\d{12}$/)
    .withMessage('Aadhaar must be 12 digits'),
  body('role')
    .isIn(['citizen', 'admin', 'official', 'superadmin'])
    .withMessage('Invalid role specified'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], handleValidationErrors, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, phone, aadhaar, role, department, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmailOrPhone(email);
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
    const userData: any = {
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

    const user = new User(userData);
    await user.save();

    logger.info(`Admin created user: ${email} (${role}) by ${req.user?.email}`);

    res.status(201).json({
      success: true,
      data: {
        user: user.profile
      },
      message: 'User created successfully'
    });
  } catch (error) {
    logger.error('Admin create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

export default router;