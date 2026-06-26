"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _models = require("../models");
var _auth = require("../middleware/auth");
var _logger = require("../utils/logger");
const router = (0, _express.Router)();

// Get all users (Admins only)
router.get('/', _auth.authenticateToken, (0, _auth.authorizeRoles)('admin', 'superadmin'), async (req, res) => {
  try {
    const {
      role,
      department,
      page = '1',
      limit = '20'
    } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    let query = {};
    if (role) query.role = role;
    if (department) query.department = department;
    const [users, total] = await Promise.all([_models.User.find(query).select('-passwordHash -aadhaar') // Don't send sensitive info
    .sort({
      createdAt: -1
    }).skip(skip).limit(limitNum), _models.User.countDocuments(query)]);
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    _logger.logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Update user role
router.put('/:id/role', _auth.authenticateToken, (0, _auth.authorizeRoles)('admin', 'superadmin'), async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const {
      role,
      department
    } = req.body;
    const user = await _models.User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Only superadmin can make someone an admin
    if (role === 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Only superadmin can grant admin role'
      });
    }
    user.role = role;
    if (role === 'official' && department) {
      user.department = department;
    } else if (role !== 'official') {
      user.department = undefined;
    }
    await user.save();
    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        user: await user.profile
      }
    });
  } catch (error) {
    _logger.logger.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user role'
    });
  }
});
var _default = exports.default = router;
