import mongoose, { Schema } from 'mongoose';
import { IComplaint, ComplaintCategory, ComplaintSeverity, ComplaintStatus, ILocation, IEvidenceFile, IStatusHistory, IFeedback } from '../types';

const locationSchema = new Schema<ILocation>({
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  coordinates: {
    type: [Number],
    required: [true, 'Coordinates are required'],
    validate: {
      validator: function(coords: number[]) {
        return coords.length === 2 &&
               coords[0] >= 74 && coords[0] <= 80 && // Longitude bounds for Telangana
               coords[1] >= 15 && coords[1] <= 20;   // Latitude bounds for Telangana
      },
      message: 'Coordinates must be within Telangana state boundaries'
    }
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
      'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri'
    ]
  },
  mandal: {
    type: String,
    required: [true, 'Mandal is required'],
    trim: true,
    maxlength: [100, 'Mandal name cannot exceed 100 characters']
  },
  village: {
    type: String,
    required: [true, 'Village is required'],
    trim: true,
    maxlength: [100, 'Village name cannot exceed 100 characters']
  }
}, { _id: false });

const evidenceFileSchema = new Schema<IEvidenceFile>({
  filename: {
    type: String,
    required: [true, 'Filename is required']
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    maxlength: [255, 'Original filename cannot exceed 255 characters']
  },
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    enum: ['image', 'document', 'video', 'audio']
  },
  url: {
    type: String,
    required: [true, 'File URL is required']
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: [1, 'File size must be greater than 0'],
    max: [104857600, 'File size cannot exceed 100MB'] // 100MB max
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required']
  }
}, { _id: false });

const statusHistorySchema = new Schema<IStatusHistory>({
  status: {
    type: String,
    enum: ['filed', 'under_review', 'investigation', 'resolved', 'rejected', 'closed', 'reopened'],
    required: [true, 'Status is required']
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Updated by user is required']
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const feedbackSchema = new Schema<IFeedback>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Feedback comment cannot exceed 1000 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const complaintSchema = new Schema<IComplaint>({
  complaintId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'COMP' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    }
  },
  filedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Filed by user is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    minlength: [10, 'Title must be at least 10 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    minlength: [50, 'Description must be at least 50 characters']
  },
  category: {
    type: String,
    enum: ['lake_encroachment', 'tank_encroachment', 'government_land', 'forest_land', 'water_body', 'public_property', 'other'],
    required: [true, 'Category is required']
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: [true, 'Severity is required'],
    default: 'medium'
  },
  location: {
    type: locationSchema,
    required: [true, 'Location is required']
  },
  evidenceFiles: [evidenceFileSchema],
  status: {
    type: String,
    enum: ['filed', 'under_review', 'investigation', 'resolved', 'rejected', 'closed', 'reopened'],
    default: 'filed',
    required: true
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  currentHandler: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  statusHistory: [statusHistorySchema],
  feedback: [feedbackSchema],
  isAnonymous: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    min: [1, 'Priority must be at least 1'],
    max: [10, 'Priority cannot exceed 10'],
    default: 5
  },
  estimatedResolution: {
    type: Date,
    validate: {
      validator: function(this: IComplaint, value: Date) {
        if (!value) return true;
        return value > new Date();
      },
      message: 'Estimated resolution date must be in the future'
    }
  },
  actualResolution: {
    type: Date
  },
  publicVisibility: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Hide sensitive information if anonymous
      if (ret.isAnonymous) {
        ret.filedBy = undefined;
      }
      return ret;
    }
  }
});

// Indexes for performance
complaintSchema.index({ complaintId: 1 });
complaintSchema.index({ filedBy: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ severity: 1 });
complaintSchema.index({ 'location.district': 1 });
complaintSchema.index({ 'location.coordinates': '2dsphere' }); // Geospatial index
complaintSchema.index({ assignedTo: 1 });
complaintSchema.index({ currentHandler: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ priority: -1 });
complaintSchema.index({ publicVisibility: 1 });

// Compound indexes
complaintSchema.index({ status: 1, 'location.district': 1 });
complaintSchema.index({ category: 1, status: 1 });
complaintSchema.index({ severity: 1, status: 1 });

// Virtual properties
complaintSchema.virtual('daysOpen').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
});

complaintSchema.virtual('resolutionTime').get(function() {
  if (!this.actualResolution || !this.createdAt) return null;
  const resolution = new Date(this.actualResolution);
  const created = new Date(this.createdAt);
  return Math.floor((resolution.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
});

complaintSchema.virtual('isOverdue').get(function() {
  if (!this.estimatedResolution) return false;
  return new Date() > this.estimatedResolution && this.status !== 'resolved' && this.status !== 'closed';
});

// Instance methods

// Add status to history
complaintSchema.methods.addStatusHistory = function(
  status: ComplaintStatus,
  updatedBy: string,
  comment: string
) {
  this.statusHistory.push({
    status,
    updatedBy,
    comment,
    timestamp: new Date()
  });
  this.status = status;

  // Update timestamps for resolved complaints
  if (status === 'resolved' || status === 'closed') {
    this.actualResolution = new Date();
  }
};

// Assign complaint to official
complaintSchema.methods.assignTo = function(officialId: string, assignedBy: string) {
  this.assignedTo = officialId;
  this.currentHandler = officialId;
  this.status = 'under_review';
  this.addStatusHistory('under_review', assignedBy, 'Complaint assigned to official');
};

// Get average rating
complaintSchema.methods.getAverageRating = function(): number {
  if (this.feedback.length === 0) return 0;
  const total = this.feedback.reduce((sum: number, f: IFeedback) => sum + f.rating, 0);
  return Math.round((total / this.feedback.length) * 10) / 10;
};

// Check if user can view this complaint
complaintSchema.methods.canBeViewedBy = function(userId: string, userRole: string): boolean {
  // Anonymous complaints can be viewed by anyone
  if (this.isAnonymous && this.publicVisibility) return true;

  // User who filed the complaint
  if (this.filedBy.toString() === userId) return true;

  // Assigned officials
  if (this.assignedTo && this.assignedTo.toString() === userId) return true;

  // Current handler
  if (this.currentHandler && this.currentHandler.toString() === userId) return true;

  // Admins and superadmins
  if (userRole === 'admin' || userRole === 'superadmin') return true;

  // Public visibility for non-anonymous complaints
  if (this.publicVisibility && this.status === 'resolved') return true;

  return false;
};

// Static methods

// Find complaints by user
complaintSchema.statics.findByUser = function(userId: string, includeAnonymous: boolean = true) {
  const query: any = { filedBy: userId };
  if (!includeAnonymous) {
    query.isAnonymous = false;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Find complaints by district
complaintSchema.statics.findByDistrict = function(district: string) {
  return this.find({ 'location.district': district }).sort({ createdAt: -1 });
};

// Find complaints within radius (geospatial)
complaintSchema.statics.findWithinRadius = function(longitude: number, latitude: number, radiusKm: number) {
  return this.find({
    'location.coordinates': {
      $geoWithin: {
        $centerSphere: [[longitude, latitude], radiusKm / 6371] // Earth's radius in km
      }
    }
  }).sort({ createdAt: -1 });
};

// Find overdue complaints
complaintSchema.statics.findOverdue = function() {
  return this.find({
    status: { $nin: ['resolved', 'closed', 'rejected'] },
    estimatedResolution: { $lt: new Date() }
  }).sort({ priority: -1, createdAt: 1 });
};

// Get statistics by category
complaintSchema.statics.getCategoryStats = function(district?: string) {
  const matchStage: any = {};
  if (district) {
    matchStage['location.district'] = district;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$category',
        total: { $sum: 1 },
        resolved: {
          $sum: {
            $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
          }
        },
        avgResolutionTime: {
          $avg: {
            $cond: [
              { $and: [{ $ne: ['$actualResolution', null] }, { $ne: ['$createdAt', null] }] },
              {
                $divide: [
                  { $subtract: ['$actualResolution', '$createdAt'] },
                  1000 * 60 * 60 * 24 // Convert to days
                ]
              },
              null
            ]
          }
        }
      }
    }
  ]);
};

// Validation middleware
complaintSchema.pre('save', function(next) {
  // Validate coordinates are within reasonable bounds
  if (this.location.coordinates) {
    const [lng, lat] = this.location.coordinates;
    if (lng < 68 || lng > 98 || lat < 6 || lat > 38) {
      return next(new Error('Coordinates are outside Indian subcontinent boundaries'));
    }
  }

  // Auto-set priority based on severity if not explicitly set
  if (!this.priority) {
    const priorityMap = { low: 2, medium: 5, high: 7, critical: 9 };
    this.priority = priorityMap[this.severity] || 5;
  }

  // Auto-set estimated resolution based on severity
  if (!this.estimatedResolution) {
    const now = new Date();
    const resolutionDays = { low: 30, medium: 21, high: 14, critical: 7 };
    this.estimatedResolution = new Date(now.getTime() + (resolutionDays[this.severity] || 21) * 24 * 60 * 60 * 1000);
  }

  next();
});

// Export the model
export const Complaint = mongoose.model<IComplaint>('Complaint', complaintSchema);
export default Complaint;