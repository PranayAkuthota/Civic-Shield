import mongoose, { Schema } from 'mongoose';
import { IDepartment } from '../types';

const departmentSchema = new Schema<IDepartment>({
  name: {
    type: String,
    required: [true, 'Department name is required'],
    trim: true,
    maxlength: [200, 'Department name cannot exceed 200 characters'],
    unique: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  jurisdiction: {
    type: String,
    required: [true, 'Jurisdiction is required'],
    enum: [
      'state', // State-wide department
      'district', // District-level department
      'regional', // Regional department covering multiple districts
      'municipal', // Municipal corporation
      'panchayat'  // Gram panchayat level
    ]
  },
  headOfDepartment: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Head of department is required']
  },
  officials: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  departmentCode: {
    type: String,
    required: [true, 'Department code is required'],
    unique: true,
    uppercase: true,
    match: [/^[A-Z]{2,6}$/, 'Department code must be 2-6 uppercase letters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
departmentSchema.index({ name: 1 });
departmentSchema.index({ departmentCode: 1 });
departmentSchema.index({ jurisdiction: 1 });
departmentSchema.index({ headOfDepartment: 1 });
departmentSchema.index({ isActive: 1 });
departmentSchema.index({ createdAt: -1 });

// Virtual properties
departmentSchema.virtual('officialCount').get(function() {
  return this.officials ? this.officials.length : 0;
});

departmentSchema.virtual('totalMembers').get(function() {
  const count = 1; // Head of department
  return count + (this.officials ? this.officials.length : 0);
});

// Instance methods

// Add official to department
departmentSchema.methods.addOfficial = function(officialId: string) {
  if (!this.officials) {
    this.officials = [];
  }
  if (!this.officials.includes(officialId)) {
    this.officials.push(officialId);
  }
};

// Remove official from department
departmentSchema.methods.removeOfficial = function(officialId: string) {
  if (this.officials) {
    this.officials = this.officials.filter(id => id.toString() !== officialId);
  }
};

// Check if user is head of department
departmentSchema.methods.isHeadOfDepartment = function(userId: string): boolean {
  return this.headOfDepartment ? this.headOfDepartment.toString() === userId : false;
};

// Check if user is an official in this department
departmentSchema.methods.isOfficial = function(userId: string): boolean {
  if (!this.officials) return false;
  return this.officials.some(id => id.toString() === userId);
};

// Check if user has department access (head or official)
departmentSchema.methods.hasAccess = function(userId: string): boolean {
  return this.isHeadOfDepartment(userId) || this.isOfficial(userId);
};

// Static methods

// Find by jurisdiction
departmentSchema.statics.findByJurisdiction = function(jurisdiction: string) {
  return this.find({
    jurisdiction: jurisdiction,
    isActive: true
  }).sort({ name: 1 });
};

// Find departments where user has access
departmentSchema.statics.findByUserAccess = function(userId: string) {
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { headOfDepartment: userId },
          { officials: userId }
        ]
      }
    ]
  }).sort({ name: 1 });
};

// Find active departments
departmentSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Validate department exists
departmentSchema.statics.departmentExists = async function(departmentId: string): Promise<boolean> {
  const dept = await this.findById(departmentId);
  return !!dept && dept.isActive;
};

// Get department by code
departmentSchema.statics.findByCode = function(code: string) {
  return this.findOne({
    departmentCode: code.toUpperCase(),
    isActive: true
  });
};

// Pre-save middleware
departmentSchema.pre('save', function(next) {
  // Ensure department code is uppercase
  if (this.departmentCode) {
    this.departmentCode = this.departmentCode.toUpperCase();
  }

  // Validate department code format
  if (this.departmentCode && !/^[A-Z]{2,6}$/.test(this.departmentCode)) {
    return next(new Error('Department code must be 2-6 uppercase letters'));
  }

  next();
});

// Pre-remove middleware to clean up references
departmentSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    const User = mongoose.model('User');

    // Remove department reference from officials
    if (this.officials && this.officials.length > 0) {
      await User.updateMany(
        { _id: { $in: this.officials } },
        { $unset: { department: 1 } }
      );
    }

    // Remove department reference from head of department
    if (this.headOfDepartment) {
      await User.updateOne(
        { _id: this.headOfDepartment },
        { $unset: { department: 1 } }
      );
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Static method to seed default departments
departmentSchema.statics.seedDefaultDepartments = async function() {
  const defaultDepartments = [
    {
      name: 'Revenue Department',
      description: 'Handles land records, revenue collection, and land dispute resolution',
      jurisdiction: 'state',
      departmentCode: 'REV'
    },
    {
      name: 'Forest Department',
      description: 'Protects forest lands and handles forest-related encroachments',
      jurisdiction: 'state',
      departmentCode: 'FOR'
    },
    {
      name: 'Irrigation Department',
      description: 'Manages water bodies, irrigation systems, and water resource projects',
      jurisdiction: 'state',
      departmentCode: 'IRR'
    },
    {
      name: 'Municipal Administration',
      description: 'Handles urban land management and municipal properties',
      jurisdiction: 'municipal',
      departmentCode: 'MUN'
    },
    {
      name: 'Panchayat Raj',
      description: 'Manages rural land and village-level properties',
      jurisdiction: 'panchayat',
      departmentCode: 'PAN'
    },
    {
      name: 'Police Department',
      description: 'Handles illegal encroachment cases with criminal elements',
      jurisdiction: 'district',
      departmentCode: 'POL'
    }
  ];

  try {
    const User = mongoose.model('User');
    // In a real implementation, you would find actual officials to assign
    // For now, we'll create departments without assigned heads

    for (const dept of defaultDepartments) {
      const existing = await this.findOne({ departmentCode: dept.departmentCode });
      if (!existing) {
        await this.create(dept);
      }
    }
  } catch (error) {
    console.error('Error seeding default departments:', error);
  }
};

// Export the model
export const Department = mongoose.model<IDepartment>('Department', departmentSchema);
export default Department;