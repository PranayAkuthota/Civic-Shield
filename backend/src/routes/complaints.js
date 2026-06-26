"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _expressValidator = require("express-validator");
var _models = require("../models");
var _auth = require("../middleware/auth");
var _logger = require("../utils/logger");
const router = (0, _express.Router)();

// Validation rules
const createComplaintValidation = [(0, _expressValidator.body)('title').trim().isLength({
  min: 10,
  max: 200
}).withMessage('Title must be between 10 and 200 characters'), (0, _expressValidator.body)('description').trim().isLength({
  min: 50,
  max: 2000
}).withMessage('Description must be between 50 and 2000 characters'), (0, _expressValidator.body)('category').isIn(['lake_encroachment', 'tank_encroachment', 'government_land', 'forest_land', 'water_body', 'public_property', 'other']).withMessage('Invalid category specified'), (0, _expressValidator.body)('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity specified'), (0, _expressValidator.body)('location.address').trim().notEmpty().withMessage('Address is required'), (0, _expressValidator.body)('location.coordinates').isArray({
  min: 2,
  max: 2
}).withMessage('Coordinates must be an array with [longitude, latitude]'), (0, _expressValidator.body)('location.coordinates.*').isFloat().withMessage('Coordinates must be numbers'), (0, _expressValidator.body)('location.district').isIn(['Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Kumuram Bheem', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri']).withMessage('Invalid district specified'), (0, _expressValidator.body)('location.mandal').trim().notEmpty().withMessage('Mandal is required'), (0, _expressValidator.body)('location.village').trim().notEmpty().withMessage('Village is required'), (0, _expressValidator.body)('isAnonymous').optional().isBoolean().withMessage('isAnonymous must be a boolean'), (0, _expressValidator.body)('publicVisibility').optional().isBoolean().withMessage('publicVisibility must be a boolean')];
const updateComplaintValidation = [(0, _expressValidator.body)('title').optional().trim().isLength({
  min: 10,
  max: 200
}).withMessage('Title must be between 10 and 200 characters'), (0, _expressValidator.body)('description').optional().trim().isLength({
  min: 50,
  max: 2000
}).withMessage('Description must be between 50 and 2000 characters'), (0, _expressValidator.body)('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity specified'), (0, _expressValidator.body)('priority').optional().isInt({
  min: 1,
  max: 10
}).withMessage('Priority must be between 1 and 10')];
const updateStatusValidation = [(0, _expressValidator.body)('status').isIn(['under_review', 'investigation', 'resolved', 'rejected', 'closed', 'reopened']).withMessage('Invalid status specified'), (0, _expressValidator.body)('comment').trim().notEmpty().withMessage('Comment is required for status update')];
const assignValidation = [(0, _expressValidator.body)('officialId').trim().notEmpty().withMessage('Official ID is required')];
const feedbackValidation = [(0, _expressValidator.body)('rating').isInt({
  min: 1,
  max: 5
}).withMessage('Rating must be between 1 and 5'), (0, _expressValidator.body)('comment').optional().trim().isLength({
  max: 1000
}).withMessage('Comment cannot exceed 1000 characters')];

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

// Create new complaint
router.post('/', _auth.authenticateToken, createComplaintValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      severity,
      location,
      isAnonymous,
      publicVisibility
    } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User ID not found'
      });
      return;
    }

    // Create complaint
    const complaint = new _models.Complaint({
      title,
      description,
      category,
      severity,
      location,
      filedBy: userId,
      isAnonymous: isAnonymous || false,
      publicVisibility: publicVisibility !== false,
      // Default to true
      evidenceFiles: [],
      // Will be updated when files are uploaded
      statusHistory: [{
        status: 'filed',
        updatedBy: userId,
        comment: 'Complaint filed successfully',
        timestamp: new Date()
      }]
    });
    await complaint.save();
    _logger.logger.info(`Complaint created: ${complaint.complaintId} by user ${userId}`);
    res.status(201).json({
      success: true,
      data: {
        complaint: await complaint.populate('filedBy', 'name email')
      },
      message: 'Complaint filed successfully'
    });
  } catch (error) {
    _logger.logger.error('Create complaint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create complaint'
    });
  }
});

// Get complaints with filtering and pagination
router.get('/', _auth.authenticateToken, async (req, res) => {
  try {
    const {
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      category,
      severity,
      district,
      dateFrom,
      dateTo,
      assignedTo,
      my
    } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = {};

    // User-specific filter
    if (my === 'true' && req.user?.role === 'citizen') {
      query.filedBy = req.user.id;
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Severity filter
    if (severity) {
      query.severity = severity;
    }

    // District filter
    if (district) {
      query['location.district'] = district;
    }

    // Assigned to filter
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo);
      }
    }

    // Visibility filter based on user role
    if (req.user?.role === 'citizen') {
      // Citizens can only see their own complaints or public resolved complaints
      query.$or = [{
        filedBy: req.user.id
      }, {
        publicVisibility: true,
        status: 'resolved'
      }];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [complaints, total] = await Promise.all([_models.Complaint.find(query).populate('filedBy', 'name email').populate('assignedTo', 'name email').populate('currentHandler', 'name email').sort(sortOptions).skip(skip).limit(limitNum), _models.Complaint.countDocuments(query)]);
    const totalPages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      data: {
        complaints,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    });
  } catch (error) {
    _logger.logger.error('Get complaints error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get complaints'
    });
  }
});

// Get single complaint by ID
router.get('/:id', _auth.authenticateToken, async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const complaint = await _models.Complaint.findById(id).populate('filedBy', 'name email').populate('assignedTo', 'name email').populate('currentHandler', 'name email').populate('statusHistory.updatedBy', 'name email').populate('feedback.userId', 'name email');
    if (!complaint) {
      res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
      return;
    }

    // Check if user can view this complaint
    if (!complaint.canBeViewedBy(req.user?.id || '', req.user?.role || '')) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }
    res.json({
      success: true,
      data: {
        complaint
      }
    });
  } catch (error) {
    _logger.logger.error('Get complaint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get complaint'
    });
  }
});

// Update complaint (only by the user who filed it or admin)
router.put('/:id', _auth.authenticateToken, updateComplaintValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const {
      title,
      description,
      severity,
      priority
    } = req.body;
    const complaint = await _models.Complaint.findById(id);
    if (!complaint) {
      res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
      return;
    }

    // Check permissions
    const isOwner = complaint.filedBy.toString() === req.user?.id;
    const isAdmin = ['admin', 'superadmin'].includes(req.user?.role || '');
    if (!isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Only the complaint owner or admin can update this complaint'
      });
      return;
    }

    // Only allow updates if complaint is still 'filed'
    if (complaint.status !== 'filed' && !isAdmin) {
      res.status(400).json({
        success: false,
        error: 'Cannot update complaint after it has been processed'
      });
      return;
    }

    // Update fields
    if (title) complaint.title = title;
    if (description) complaint.description = description;
    if (severity) complaint.severity = severity;
    if (priority) complaint.priority = priority;
    await complaint.save();
    _logger.logger.info(`Complaint updated: ${complaint.complaintId} by user ${req.user?.id}`);
    res.json({
      success: true,
      data: {
        complaint: await complaint.populate('filedBy', 'name email')
      },
      message: 'Complaint updated successfully'
    });
  } catch (error) {
    _logger.logger.error('Update complaint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update complaint'
    });
  }
});

// Update complaint status (officials and admins only)
router.post('/:id/status', _auth.authenticateToken, (0, _auth.authorizeRoles)('official', 'admin', 'superadmin'), updateStatusValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const {
      status,
      comment
    } = req.body;
    const complaint = await _models.Complaint.findById(id);
    if (!complaint) {
      res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
      return;
    }

    // Check if user is assigned to this complaint or is admin
    const isAssigned = complaint.assignedTo?.toString() === req.user?.id;
    const isAdmin = ['admin', 'superadmin'].includes(req.user?.role || '');
    if (!isAssigned && !isAdmin) {
      if (req.user?.role === 'official' && !complaint.assignedTo) {
        // Auto-assign to the official taking action
        complaint.assignedTo = req.user.id;
        complaint.currentHandler = req.user.id;
      } else {
        res.status(403).json({
          success: false,
          error: 'Only assigned officials or admins can update complaint status'
        });
        return;
      }
    }

    // Update status
    complaint.addStatusHistory(status, req.user?.id || '', comment);
    await complaint.save();
    _logger.logger.info(`Complaint status updated: ${complaint.complaintId} to ${status} by ${req.user?.id}`);
    res.json({
      success: true,
      data: {
        complaint: await complaint.populate(['statusHistory.updatedBy', 'filedBy', 'assignedTo'], 'name email')
      },
      message: 'Complaint status updated successfully'
    });
  } catch (error) {
    _logger.logger.error('Update complaint status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update complaint status'
    });
  }
});

// Assign complaint to official (admins only)
router.post('/:id/assign', _auth.authenticateToken, (0, _auth.authorizeRoles)('admin', 'superadmin'), assignValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const {
      officialId
    } = req.body;
    const [complaint, official] = await Promise.all([_models.Complaint.findById(id), _models.User.findById(officialId)]);
    if (!complaint) {
      res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
      return;
    }
    if (!official || official.role !== 'official') {
      res.status(404).json({
        success: false,
        error: 'Official not found'
      });
      return;
    }
    complaint.assignTo(officialId, req.user?.id || '');
    await complaint.save();
    _logger.logger.info(`Complaint assigned: ${complaint.complaintId} to official ${officialId} by ${req.user?.id}`);
    res.json({
      success: true,
      data: {
        complaint: await complaint.populate(['assignedTo', 'currentHandler'], 'name email')
      },
      message: 'Complaint assigned successfully'
    });
  } catch (error) {
    _logger.logger.error('Assign complaint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign complaint'
    });
  }
});

// Add feedback to complaint
router.post('/:id/feedback', _auth.authenticateToken, feedbackValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const {
      rating,
      comment
    } = req.body;
    const complaint = await _models.Complaint.findById(id);
    if (!complaint) {
      res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
      return;
    }

    // Only allow feedback if complaint is resolved and user is the one who filed it
    if (complaint.status !== 'resolved') {
      res.status(400).json({
        success: false,
        error: 'Can only add feedback to resolved complaints'
      });
      return;
    }
    if (complaint.filedBy.toString() !== req.user?.id) {
      res.status(403).json({
        success: false,
        error: 'Only the complaint owner can add feedback'
      });
      return;
    }

    // Check if user already provided feedback
    const existingFeedback = complaint.feedback.find(f => f.userId.toString() === req.user?.id);
    if (existingFeedback) {
      res.status(400).json({
        success: false,
        error: 'Feedback already provided for this complaint'
      });
      return;
    }

    // Add feedback
    complaint.feedback.push({
      userId: req.user?.id || '',
      rating,
      comment,
      createdAt: new Date()
    });
    await complaint.save();
    _logger.logger.info(`Feedback added for complaint: ${complaint.complaintId} by ${req.user?.id}`);
    res.json({
      success: true,
      data: {
        complaint: await complaint.populate('feedback.userId', 'name email')
      },
      message: 'Feedback added successfully'
    });
  } catch (error) {
    _logger.logger.error('Add feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add feedback'
    });
  }
});

// Search complaints
router.get('/search', _auth.authenticateToken, async (req, res) => {
  try {
    const {
      q: query,
      district,
      category,
      page = '1',
      limit = '10'
    } = req.query;
    if (!query) {
      res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
      return;
    }
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build search query
    let searchQuery = {
      $and: []
    };

    // Text search
    searchQuery.$and.push({
      $or: [{
        title: {
          $regex: query,
          $options: 'i'
        }
      }, {
        description: {
          $regex: query,
          $options: 'i'
        }
      }, {
        'location.address': {
          $regex: query,
          $options: 'i'
        }
      }, {
        'location.village': {
          $regex: query,
          $options: 'i'
        }
      }, {
        'location.mandal': {
          $regex: query,
          $options: 'i'
        }
      }]
    });

    // Additional filters
    if (district) {
      searchQuery.$and.push({
        'location.district': district
      });
    }
    if (category) {
      searchQuery.$and.push({
        category
      });
    }

    // Visibility filter for citizens
    if (req.user?.role === 'citizen') {
      searchQuery.$and.push({
        $or: [{
          filedBy: req.user.id
        }, {
          publicVisibility: true,
          status: 'resolved'
        }]
      });
    }
    const [complaints, total] = await Promise.all([_models.Complaint.find(searchQuery).populate('filedBy', 'name email').populate('assignedTo', 'name email').sort({
      createdAt: -1
    }).skip(skip).limit(limitNum), _models.Complaint.countDocuments(searchQuery)]);
    const totalPages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      data: {
        complaints,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        },
        searchQuery: query
      }
    });
  } catch (error) {
    _logger.logger.error('Search complaints error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search complaints'
    });
  }
});
var _default = exports.default = router;