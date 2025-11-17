import mongoose, { Schema } from 'mongoose';
import { IAnalytics } from '../types';

const categoryStatSchema = new Schema({
  name: {
    type: String,
    required: true,
    enum: ['lake_encroachment', 'tank_encroachment', 'government_land', 'forest_land', 'water_body', 'public_property', 'other']
  },
  count: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const hotspotSchema = new Schema({
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: function(coords: number[]) {
        return coords.length === 2 &&
               coords[0] >= 74 && coords[0] <= 80 && // Longitude bounds for Telangana
               coords[1] >= 15 && coords[1] <= 20;   // Latitude bounds for Telangana
      },
      message: 'Coordinates must be within Telangana state boundaries'
    }
  },
  complaintCount: {
    type: Number,
    required: true,
    min: 1
  }
}, { _id: false });

const analyticsSchema = new Schema<IAnalytics>({
  date: {
    type: Date,
    required: [true, 'Date is required'],
    unique: true,
    index: true
  },
  district: {
    type: String,
    required: [true, 'District is required'],
    enum: [
      'Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad', 'Jagtial',
      'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy',
      'Karimnagar', 'Khammam', 'Kumuram Bheem', 'Mahabubabad', 'Mahabubnagar',
      'Mancherial', 'Medak', 'Medchal Malkajgiri', 'Mulugu', 'Nagarkurnool',
      'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli',
      'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet',
      'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri',
      'ALL' // Special value for state-wide analytics
    ]
  },
  complaintCount: {
    type: Number,
    required: [true, 'Complaint count is required'],
    min: 0,
    default: 0
  },
  resolvedCount: {
    type: Number,
    required: [true, 'Resolved count is required'],
    min: 0,
    default: 0
  },
  categories: [categoryStatSchema],
  hotspots: [hotspotSchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
analyticsSchema.index({ date: 1, district: 1 }, { unique: true });
analyticsSchema.index({ district: 1, date: -1 });
analyticsSchema.index({ date: -1 });
analyticsSchema.index({ complaintCount: -1 });
analyticsSchema.index({ resolvedCount: -1 });

// Virtual properties
analyticsSchema.virtual('resolutionRate').get(function() {
  if (this.complaintCount === 0) return 0;
  return Math.round((this.resolvedCount / this.complaintCount) * 100 * 10) / 10; // Round to 1 decimal place
});

analyticsSchema.virtual('pendingCount').get(function() {
  return this.complaintCount - this.resolvedCount;
});

analyticsSchema.virtual('dominantCategory').get(function() {
  if (!this.categories || this.categories.length === 0) return null;
  return this.categories.reduce((prev, current) =>
    (prev.count > current.count) ? prev : current
  );
});

analyticsSchema.virtual('totalHotspotComplaints').get(function() {
  if (!this.hotspots) return 0;
  return this.hotspots.reduce((sum, hotspot) => sum + hotspot.complaintCount, 0);
});

// Static methods

// Get analytics by date range and district
analyticsSchema.statics.getByDateRange = function(
  startDate: Date,
  endDate: Date,
  district?: string
) {
  const query: any = {
    date: { $gte: startDate, $lte: endDate }
  };

  if (district && district !== 'ALL') {
    query.district = district;
  }

  return this.find(query).sort({ date: -1 });
};

// Get state-wide analytics
analyticsSchema.statics.getStateAnalytics = function(startDate: Date, endDate: Date) {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
    district: 'ALL'
  }).sort({ date: -1 });
};

// Generate daily analytics from complaints
analyticsSchema.statics.generateDailyAnalytics = function(date: Date = new Date()) {
  const Complaint = mongoose.model('Complaint');

  // Get start and end of the day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return Promise.all([
    // State-wide analytics
    Complaint.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalComplaints: { $sum: 1 },
          resolvedComplaints: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          categories: {
            $push: {
              name: '$category',
              count: 1
            }
          },
          hotspots: {
            $push: {
              coordinates: '$location.coordinates',
              count: 1
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalComplaints: 1,
          resolvedComplaints: 1,
          categories: {
            $reduce: {
              input: '$categories',
              initialValue: [],
              in: {
                $concatArrays: [
                  '$$value',
                  [
                    {
                      name: '$$this.name',
                      count: 1
                    }
                  ]
                ]
              }
            }
          },
          hotspots: 1
        }
      }
    ]),

    // District-wise analytics
    Complaint.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: '$location.district',
          totalComplaints: { $sum: 1 },
          resolvedComplaints: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          categories: {
            $push: {
              name: '$category',
              count: 1
            }
          }
        }
      }
    ])
  ]).then(([stateAnalytics, districtAnalytics]) => {
    const results = [];

    // Process state-wide analytics
    if (stateAnalytics.length > 0) {
      const stateData = stateAnalytics[0];
      const processedCategories = processCategories(stateData.categories);
      const processedHotspots = processHotspots(stateData.hotspots);

      results.push({
        date: startOfDay,
        district: 'ALL',
        complaintCount: stateData.totalComplaints,
        resolvedCount: stateData.resolvedComplaints,
        categories: processedCategories,
        hotspots: processedHotspots
      });
    }

    // Process district-wise analytics
    districtAnalytics.forEach(district => {
      const processedCategories = processCategories(district.categories);

      results.push({
        date: startOfDay,
        district: district._id,
        complaintCount: district.totalComplaints,
        resolvedCount: district.resolvedComplaints,
        categories: processedCategories,
        hotspots: []
      });
    });

    return results;
  });
};

// Helper function to process categories
function processCategories(categories: any[]): any[] {
  const categoryMap = new Map();

  categories.forEach(cat => {
    const existing = categoryMap.get(cat.name) || { name: cat.name, count: 0 };
    existing.count += 1;
    categoryMap.set(cat.name, existing);
  });

  return Array.from(categoryMap.values());
}

// Helper function to process hotspots
function processHotspots(hotspots: any[]): any[] {
  const hotspotMap = new Map();

  hotspots.forEach(hs => {
    const key = hs.coordinates.join(',');
    const existing = hotspotMap.get(key) || {
      coordinates: hs.coordinates,
      complaintCount: 0
    };
    existing.complaintCount += 1;
    hotspotMap.set(key, existing);
  });

  return Array.from(hotspotMap.values());
}

// Get trending categories (last 30 days)
analyticsSchema.statics.getTrendingCategories = function(district?: string) {
  const Complaint = mongoose.model('Complaint');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const matchStage: any = {
    createdAt: { $gte: thirtyDaysAgo }
  };

  if (district && district !== 'ALL') {
    matchStage['location.district'] = district;
  }

  return Complaint.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        resolved: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Get monthly trends
analyticsSchema.statics.getMonthlyTrends = function(months: number = 12, district?: string) {
  const matchStage: any = {};

  if (district && district !== 'ALL') {
    matchStage.district = district;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' }
        },
        totalComplaints: { $sum: '$complaintCount' },
        totalResolved: { $sum: '$resolvedCount' }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: months }
  ]);
};

// Get performance metrics
analyticsSchema.statics.getPerformanceMetrics = function(startDate: Date, endDate: Date) {
  const Complaint = mongoose.model('Complaint');

  return Complaint.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'resolved'
      }
    },
    {
      $group: {
        _id: '$location.district',
        avgResolutionTime: {
          $avg: {
            $divide: [
              { $subtract: ['$actualResolution', '$createdAt'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        },
        totalResolved: { $sum: 1 }
      }
    },
    { $sort: { avgResolutionTime: 1 } }
  ]);
};

// Generate analytics and save
analyticsSchema.statics.generateAndSave = async function(date: Date = new Date()) {
  try {
    const analyticsData = await this.generateDailyAnalytics(date);
    const savedRecords = [];

    for (const data of analyticsData) {
      const existing = await this.findOne({
        date: data.date,
        district: data.district
      });

      if (existing) {
        // Update existing record
        Object.assign(existing, data);
        await existing.save();
        savedRecords.push(existing);
      } else {
        // Create new record
        const newRecord = await this.create(data);
        savedRecords.push(newRecord);
      }
    }

    return savedRecords;
  } catch (error) {
    console.error('Error generating analytics:', error);
    throw error;
  }
};

// Validation middleware
analyticsSchema.pre('save', function(next) {
  // Validate that resolved count doesn't exceed total complaints
  if (this.resolvedCount > this.complaintCount) {
    return next(new Error('Resolved count cannot exceed total complaint count'));
  }

  // Validate categories sum matches total complaints
  if (this.categories && this.categories.length > 0) {
    const categorySum = this.categories.reduce((sum, cat) => sum + cat.count, 0);
    if (categorySum > this.complaintCount) {
      return next(new Error('Category counts cannot exceed total complaint count'));
    }
  }

  next();
});

// Export the model
export const Analytics = mongoose.model<IAnalytics>('Analytics', analyticsSchema);
export default Analytics;