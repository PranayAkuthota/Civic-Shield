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

// Get high-level analytics
router.get('/', _auth.authenticateToken, (0, _auth.authorizeRoles)('admin', 'superadmin', 'official'), async (req, res) => {
  try {
    const {
      district,
      timeRange = '30'
    } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    // Get analytics data using model methods
    let analyticsData;
    if (district) {
      analyticsData = await _models.Analytics.getByDateRange(startDate, endDate, district);
    } else {
      analyticsData = await _models.Analytics.getStateAnalytics(startDate, endDate);
    }

    // Also fetch realtime summary from complaints collection
    const summaryMatch = district ? {
      'location.district': district
    } : {};
    const realtimeSummary = await _models.Complaint.aggregate([{
      $match: summaryMatch
    }, {
      $group: {
        _id: '$status',
        count: {
          $sum: 1
        }
      }
    }]);
    const formattedSummary = {
      total: 0,
      resolved: 0,
      pending: 0,
      investigation: 0
    };
    realtimeSummary.forEach(item => {
      formattedSummary.total += item.count;
      if (item._id === 'resolved' || item._id === 'closed') {
        formattedSummary.resolved += item.count;
      } else if (item._id === 'investigation') {
        formattedSummary.investigation += item.count;
      } else {
        formattedSummary.pending += item.count;
      }
    });
    res.json({
      success: true,
      data: {
        historical: analyticsData,
        summary: formattedSummary
      }
    });
  } catch (error) {
    _logger.logger.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});
var _default = exports.default = router;
