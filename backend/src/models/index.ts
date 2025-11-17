// Export all models
export { default as User } from './User';
export type { IUser, UserRole } from '../types';
export { default as Complaint } from './Complaint';
export type { IComplaint, ComplaintCategory, ComplaintSeverity, ComplaintStatus } from '../types';
export { default as Department } from './Department';
export type { IDepartment } from '../types';
export { default as Analytics } from './Analytics';
export type { IAnalytics } from '../types';

// Re-export types for convenience
export * from '../types';