import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { IUser, UserRole } from '../types';

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number starting with 6-9']
  },
  aadhaar: {
    type: String,
    required: [true, 'Aadhaar number is required'],
    unique: true,
    validate: {
      validator: function(v: string) {
        // Validate Aadhaar format (12 digits, optional spaces)
        return /^\d{12}$|^\d{4}\s\d{4}\s\d{4}$/.test(v.replace(/\s/g, ''));
      },
      message: 'Please enter a valid 12-digit Aadhaar number'
    }
  },
  role: {
    type: String,
    enum: ['citizen', 'admin', 'official', 'superadmin'],
    default: 'citizen',
    required: true
  },
  department: {
    type: String,
    trim: true,
    required: function(this: IUser) {
      return this.role === 'official';
    },
    validate: {
      validator: function(v: string) {
        // Only validate department if it exists
        if (!v) return true;
        return v.length > 0 && v.length <= 100;
      },
      message: 'Department name must be between 1 and 100 characters'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  passwordHash: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters long'],
    required: function(this: IUser) {
      return this.role !== 'citizen' || process.env.NODE_ENV === 'development';
    }
  },
  lastLoginAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.passwordHash;
      delete ret.aadhaar; // Don't expose aadhaar in JSON
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret.passwordHash;
      delete ret.aadhaar;
      return ret;
    }
  }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ aadhaar: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) {
    return next();
  }

  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance methods

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Get masked Aadhaar (show only last 4 digits)
userSchema.methods.getMaskedAadhaar = function(): string {
  if (!this.aadhaar) return '';
  const cleanAadhaar = this.aadhaar.replace(/\s/g, '');
  return `XXXXXXXX${cleanAadhaar.slice(-4)}`;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function(): string {
  const resetToken = crypto.randomBytes(32).toString('hex');

  // In a real implementation, you would store this hashed token with an expiry
  // For now, we'll return the token directly (NOT RECOMMENDED FOR PRODUCTION)
  return resetToken;
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function(): string {
  const verifyToken = crypto.randomBytes(32).toString('hex');
  return verifyToken;
};

// Static methods

// Find user by email or phone
userSchema.statics.findByEmailOrPhone = function(identifier: string) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { phone: identifier }
    ],
    isActive: true
  });
};

// Find active users by role
userSchema.statics.findActiveByRole = function(role: UserRole) {
  return this.find({
    role: role,
    isActive: true
  }).sort({ createdAt: -1 });
};

// Find officials by department
userSchema.statics.findOfficialsByDepartment = function(department: string) {
  return this.find({
    role: 'official',
    department: department,
    isActive: true
  }).sort({ createdAt: -1 });
};

// Check if email exists
userSchema.statics.emailExists = async function(email: string): Promise<boolean> {
  const user = await this.findOne({ email: email.toLowerCase() });
  return !!user;
};

// Check if phone exists
userSchema.statics.phoneExists = async function(phone: string): Promise<boolean> {
  const user = await this.findOne({ phone: phone });
  return !!user;
};

// Check if aadhaar exists
userSchema.statics.aadhaarExists = async function(aadhaar: string): Promise<boolean> {
  const cleanAadhaar = aadhaar.replace(/\s/g, '');
  const user = await this.findOne({ aadhaar: cleanAadhaar });
  return !!user;
};

// Virtual for user's full profile
userSchema.virtual('profile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    department: this.department,
    emailVerified: this.emailVerified,
    phoneVerified: this.phoneVerified,
    maskedAadhaar: this.getMaskedAadhaar(),
    createdAt: this.createdAt
  };
});

// Validation middleware
userSchema.pre('save', function(next) {
  // Validate phone number format
  if (this.phone && !/^[6-9]\d{9}$/.test(this.phone)) {
    return next(new Error('Invalid phone number format'));
  }

  // Validate email format
  if (this.email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(this.email)) {
    return next(new Error('Invalid email format'));
  }

  // Validate aadhaar format
  if (this.aadhaar && !/^\d{12}$|^\d{4}\s\d{4}\s\d{4}$/.test(this.aadhaar.replace(/\s/g, ''))) {
    return next(new Error('Invalid Aadhaar number format'));
  }

  next();
});

// Export the model
export const User = mongoose.model<IUser>('User', userSchema);
export default User;