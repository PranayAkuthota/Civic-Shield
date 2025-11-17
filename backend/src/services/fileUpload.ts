import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { FileUploadResult } from '../types';
import { logger } from '../utils/logger';

// File type configurations
export const ALLOWED_FILE_TYPES = {
  image: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSize: 10 * 1024 * 1024 // 10MB
  },
  document: {
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    extensions: ['.pdf', '.doc', '.docx'],
    maxSize: 15 * 1024 * 1024 // 15MB
  },
  video: {
    mimeTypes: ['video/mp4', 'video/avi', 'video/mpeg', 'video/quicktime'],
    extensions: ['.mp4', '.avi', '.mpeg', '.mov'],
    maxSize: 100 * 1024 * 1024 // 100MB
  },
  audio: {
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'],
    extensions: ['.mp3', '.wav', '.ogg'],
    maxSize: 20 * 1024 * 1024 // 20MB
  }
};

// Get file category from MIME type
export const getFileCategory = (mimeType: string): string | null => {
  for (const [category, config] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (config.mimeTypes.includes(mimeType)) {
      return category;
    }
  }
  return null;
};

// Validate file type and size
export const validateFile = (file: Express.Multer.File): { valid: boolean; error?: string } => {
  const category = getFileCategory(file.mimetype);

  if (!category) {
    return { valid: false, error: 'File type not allowed' };
  }

  const config = ALLOWED_FILE_TYPES[category as keyof typeof ALLOWED_FILE_TYPES];
  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${Math.round(config.maxSize / (1024 * 1024))}MB`
    };
  }

  return { valid: true };
};

// Generate unique filename
export const generateUniqueFilename = (originalName: string): string => {
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${name}_${timestamp}_${random}${ext}`;
};

// Multer configuration for memory storage
const storage = multer.memoryStorage();

// Multer file filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const validation = validateFile(file);
  if (validation.valid) {
    cb(null, true);
  } else {
    cb(new Error(validation.error));
  }
};

// Create multer upload middleware
export const createUploadMiddleware = (maxFiles: number = 5) => {
  return multer({
    storage,
    fileFilter,
    limits: {
      files: maxFiles,
      fileSize: 100 * 1024 * 1024, // 100MB max per file
      fieldSize: 2 * 1024 * 1024 // 2MB max field size
    }
  });
};

// Mock file upload service (for development without S3)
export class FileUploadService {
  private uploadDir: string;

  constructor(uploadDir: string = './uploads') {
    this.uploadDir = uploadDir;
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File, complaintId?: string): Promise<FileUploadResult> {
    try {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate unique filename
      const filename = generateUniqueFilename(file.originalname);
      const filePath = complaintId
        ? path.join(this.uploadDir, complaintId, filename)
        : path.join(this.uploadDir, filename);

      // Create directory if it doesn't exist
      if (complaintId) {
        await fs.mkdir(path.join(this.uploadDir, complaintId), { recursive: true });
      }

      // Write file to disk
      await fs.writeFile(filePath, file.buffer);

      // Generate file URL (in production, this would be a cloud storage URL)
      const fileUrl = `/uploads/${complaintId ? `${complaintId}/` : ''}${filename}`;

      logger.info(`File uploaded: ${filename}, size: ${file.size}, type: ${file.mimetype}`);

      return {
        filename,
        originalName: file.originalname,
        url: fileUrl,
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      logger.error('File upload error:', error);
      throw error;
    }
  }

  async uploadMultipleFiles(files: Express.Multer.File[], complaintId?: string): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, complaintId);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to upload file ${file.originalname}:`, error);
        // Continue with other files even if one fails
      }
    }

    return results;
  }

  async deleteFile(filename: string, complaintId?: string): Promise<boolean> {
    try {
      const filePath = complaintId
        ? path.join(this.uploadDir, complaintId, filename)
        : path.join(this.uploadDir, filename);

      await fs.unlink(filePath);
      logger.info(`File deleted: ${filename}`);
      return true;
    } catch (error) {
      logger.error('File deletion error:', error);
      return false;
    }
  }

  async getFileInfo(filename: string, complaintId?: string): Promise<{ exists: boolean; stats?: any }> {
    try {
      const filePath = complaintId
        ? path.join(this.uploadDir, complaintId, filename)
        : path.join(this.uploadDir, filename);

      const stats = await fs.stat(filePath);
      return { exists: true, stats };
    } catch (error) {
      return { exists: false };
    }
  }

  async createComplaintDirectory(complaintId: string): Promise<void> {
    try {
      const dirPath = path.join(this.uploadDir, complaintId);
      await fs.mkdir(dirPath, { recursive: true });
      logger.info(`Created complaint directory: ${complaintId}`);
    } catch (error) {
      logger.error('Failed to create complaint directory:', error);
      throw error;
    }
  }

  async deleteComplaintDirectory(complaintId: string): Promise<boolean> {
    try {
      const dirPath = path.join(this.uploadDir, complaintId);
      await fs.rmdir(dirPath, { recursive: true });
      logger.info(`Deleted complaint directory: ${complaintId}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete complaint directory:', error);
      return false;
    }
  }
}

// AWS S3 File Upload Service (for production)
export class S3FileUploadService {
  private s3: any;
  private bucketName: string;
  private bucketRegion: string;

  constructor() {
    // Initialize AWS SDK
    // This is a placeholder - in production, you would properly initialize AWS SDK
    this.bucketName = process.env.AWS_S3_BUCKET || 'telangana-properties-evidence';
    this.bucketRegion = process.env.AWS_REGION || 'ap-south-1';

    // Initialize S3 client
    try {
      const AWS = require('aws-sdk');
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: this.bucketRegion
      });
    } catch (error) {
      logger.warn('AWS SDK not available, falling back to local storage');
    }
  }

  async uploadFile(file: Express.Multer.File, complaintId?: string): Promise<FileUploadResult> {
    try {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate unique filename
      const filename = generateUniqueFilename(file.originalname);
      const key = complaintId
        ? `${complaintId}/${filename}`
        : filename;

      // Upload to S3
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'private'
      };

      const result = await this.s3.upload(params).promise();

      logger.info(`File uploaded to S3: ${key}, size: ${file.size}`);

      return {
        filename,
        originalName: file.originalname,
        url: result.Location,
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      logger.error('S3 file upload error:', error);
      throw error;
    }
  }

  async uploadMultipleFiles(files: Express.Multer.File[], complaintId?: string): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, complaintId);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to upload file ${file.originalname} to S3:`, error);
      }
    }

    return results;
  }

  async deleteFile(filename: string, complaintId?: string): Promise<boolean> {
    try {
      const key = complaintId
        ? `${complaintId}/${filename}`
        : filename;

      const params = {
        Bucket: this.bucketName,
        Key: key
      };

      await this.s3.deleteObject(params).promise();
      logger.info(`File deleted from S3: ${key}`);
      return true;
    } catch (error) {
      logger.error('S3 file deletion error:', error);
      return false;
    }
  }

  async getSignedUrl(filename: string, complaintId?: string, expiresIn: number = 3600): Promise<string> {
    try {
      const key = complaintId
        ? `${complaintId}/${filename}`
        : filename;

      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn
      };

      return this.s3.getSignedUrl('getObject', params);
    } catch (error) {
      logger.error('S3 signed URL generation error:', error);
      throw error;
    }
  }
}

// Export the appropriate service based on environment
export const fileUploadService = process.env.NODE_ENV === 'production'
  ? new S3FileUploadService()
  : new FileUploadService();

// File upload middleware
export const uploadSingle = createUploadMiddleware(1).single('file');
export const uploadMultiple = createUploadMiddleware(5).array('files', 5);

// Middleware to handle file upload errors
export const handleUploadError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files uploaded'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field'
      });
    }
  }

  if (error.message.includes('File type not allowed')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  next(error);
};