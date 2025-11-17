// Export all models
export { default as User, IUser } from './User';
export { default as Complaint, IComplaint, ComplaintCategory, ComplaintSeverity, ComplaintStatus } from './Complaint';
export { default as Department, IDepartment } from './Department';
export { default as Analytics, IAnalytics } from './Analytics';

// Re-export types for convenience
export * from '../types';