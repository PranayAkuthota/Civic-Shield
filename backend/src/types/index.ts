import { Request } from 'express';
import { Document, Types } from 'mongoose';

// Base MongoDB document interface
export interface BaseDocument extends Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// User-related types
export interface IUser extends BaseDocument {
  name: string;
  email: string;
  phone: string;
  aadhaar: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  passwordHash?: string;
  lastLoginAt?: Date;
}

export type UserRole = 'citizen' | 'admin' | 'official' | 'superadmin';

export interface ILocation {
  address: string;
  coordinates: [number, number]; // [longitude, latitude]
  district: string;
  mandal: string;
  village: string;
}

export interface IEvidenceFile {
  filename: string;
  originalName: string;
  fileType: string;
  url: string;
  uploadedAt: Date;
  size: number;
  mimeType: string;
}

export interface IStatusHistory {
  status: ComplaintStatus;
  updatedBy: Types.ObjectId;
  comment: string;
  timestamp: Date;
}

export interface IFeedback {
  userId: Types.ObjectId;
  rating: number; // 1-5
  comment: string;
  createdAt: Date;
}

export interface IComplaint extends BaseDocument {
  complaintId: string;
  filedBy: Types.ObjectId;
  title: string;
  description: string;
  category: ComplaintCategory;
  severity: ComplaintSeverity;
  location: ILocation;
  evidenceFiles: IEvidenceFile[];
  status: ComplaintStatus;
  assignedTo?: Types.ObjectId;
  currentHandler?: Types.ObjectId;
  statusHistory: IStatusHistory[];
  feedback: IFeedback[];
  isAnonymous: boolean;
  priority?: number;
  estimatedResolution?: Date;
  actualResolution?: Date;
  publicVisibility: boolean;
}

export type ComplaintCategory =
  | 'lake_encroachment'
  | 'tank_encroachment'
  | 'government_land'
  | 'forest_land'
  | 'water_body'
  | 'public_property'
  | 'other';

export type ComplaintSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ComplaintStatus =
  | 'filed'
  | 'under_review'
  | 'investigation'
  | 'resolved'
  | 'rejected'
  | 'closed'
  | 'reopened';

export interface IDepartment extends BaseDocument {
  name: string;
  description: string;
  jurisdiction: string;
  headOfDepartment: Types.ObjectId;
  officials: Types.ObjectId[];
  isActive: boolean;
  departmentCode: string;
}

export interface IAnalytics extends BaseDocument {
  date: Date;
  district: string;
  complaintCount: number;
  resolvedCount: number;
  categories: {
    name: ComplaintCategory;
    count: number;
  }[];
  hotspots: {
    coordinates: [number, number];
    complaintCount: number;
  }[];
}

// API Request/Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ComplaintFilters {
  status?: ComplaintStatus;
  category?: ComplaintCategory;
  severity?: ComplaintSeverity;
  district?: string;
  dateFrom?: string;
  dateTo?: string;
  assignedTo?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    department?: string;
  };
}

// JWT Payload
export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  department?: string;
  iat?: number;
  exp?: number;
}

// File upload types
export interface FileUploadResult {
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
}

// Notification types
export interface NotificationData {
  userId: string;
  type: 'email' | 'sms' | 'push';
  subject: string;
  message: string;
  data?: any;
}

// Analytics types
export interface DistrictStats {
  district: string;
  totalComplaints: number;
  resolvedComplaints: number;
  pendingComplaints: number;
  averageResolutionTime: number;
  hotspots: {
    coordinates: [number, number];
    count: number;
  }[];
}

export interface SystemStats {
  totalUsers: number;
  totalComplaints: number;
  resolvedComplaints: number;
  averageResolutionTime: number;
  activeComplaints: number;
  userSatisfactionScore: number;
}