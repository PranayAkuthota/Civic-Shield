"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateFile = exports.uploadSingle = exports.uploadMultiple = exports.handleUploadError = exports.getFileCategory = exports.generateUniqueFilename = exports.fileUploadService = exports.createUploadMiddleware = exports.S3FileUploadService = exports.FileUploadService = exports.ALLOWED_FILE_TYPES = void 0;
var _multer = _interopRequireDefault(require("multer"));
var _crypto = _interopRequireDefault(require("crypto"));
var _path = _interopRequireDefault(require("path"));
var _promises = _interopRequireDefault(require("fs/promises"));
var _logger = require("../utils/logger");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// File type configurations
const ALLOWED_FILE_TYPES = exports.ALLOWED_FILE_TYPES = {
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
const getFileCategory = mimeType => {
  for (const [category, config] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (config.mimeTypes.includes(mimeType)) {
      return category;
    }
  }
  return null;
};

// Validate file type and size
exports.getFileCategory = getFileCategory;
const validateFile = file => {
  const category = getFileCategory(file.mimetype);
  if (!category) {
    return {
      valid: false,
      error: 'File type not allowed'
    };
  }
  const config = ALLOWED_FILE_TYPES[category];
  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${Math.round(config.maxSize / (1024 * 1024))}MB`
    };
  }
  return {
    valid: true
  };
};

// Generate unique filename
exports.validateFile = validateFile;
const generateUniqueFilename = originalName => {
  const ext = _path.default.extname(originalName);
  const name = _path.default.basename(originalName, ext);
  const timestamp = Date.now();
  const random = _crypto.default.randomBytes(8).toString('hex');
  return `${name}_${timestamp}_${random}${ext}`;
};

// Multer configuration for memory storage
exports.generateUniqueFilename = generateUniqueFilename;
const storage = _multer.default.memoryStorage();

// Multer file filter
const fileFilter = (req, file, cb) => {
  const validation = validateFile(file);
  if (validation.valid) {
    cb(null, true);
  } else {
    cb(new Error(validation.error));
  }
};

// Create multer upload middleware
const createUploadMiddleware = (maxFiles = 5) => {
  return (0, _multer.default)({
    storage,
    fileFilter,
    limits: {
      files: maxFiles,
      fileSize: 100 * 1024 * 1024,
      // 100MB max per file
      fieldSize: 2 * 1024 * 1024 // 2MB max field size
    }
  });
};

// Mock file upload service (for development without S3)
exports.createUploadMiddleware = createUploadMiddleware;
class FileUploadService {
  constructor(uploadDir = './uploads') {
    this.uploadDir = uploadDir;
    this.ensureUploadDirectory();
  }
  async ensureUploadDirectory() {
    try {
      await _promises.default.access(this.uploadDir);
    } catch {
      await _promises.default.mkdir(this.uploadDir, {
        recursive: true
      });
    }
  }
  async uploadFile(file, complaintId) {
    try {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate unique filename
      const filename = generateUniqueFilename(file.originalname);
      const filePath = complaintId ? _path.default.join(this.uploadDir, complaintId, filename) : _path.default.join(this.uploadDir, filename);

      // Create directory if it doesn't exist
      if (complaintId) {
        await _promises.default.mkdir(_path.default.join(this.uploadDir, complaintId), {
          recursive: true
        });
      }

      // Write file to disk
      await _promises.default.writeFile(filePath, file.buffer);

      // Generate file URL (in production, this would be a cloud storage URL)
      const fileUrl = `/uploads/${complaintId ? `${complaintId}/` : ''}${filename}`;
      _logger.logger.info(`File uploaded: ${filename}, size: ${file.size}, type: ${file.mimetype}`);
      return {
        filename,
        originalName: file.originalname,
        url: fileUrl,
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      _logger.logger.error('File upload error:', error);
      throw error;
    }
  }
  async uploadMultipleFiles(files, complaintId) {
    const results = [];
    for (const file of files) {
      try {
        const result = await this.uploadFile(file, complaintId);
        results.push(result);
      } catch (error) {
        _logger.logger.error(`Failed to upload file ${file.originalname}:`, error);
        // Continue with other files even if one fails
      }
    }
    return results;
  }
  async deleteFile(filename, complaintId) {
    try {
      const filePath = complaintId ? _path.default.join(this.uploadDir, complaintId, filename) : _path.default.join(this.uploadDir, filename);
      await _promises.default.unlink(filePath);
      _logger.logger.info(`File deleted: ${filename}`);
      return true;
    } catch (error) {
      _logger.logger.error('File deletion error:', error);
      return false;
    }
  }
  async getFileInfo(filename, complaintId) {
    try {
      const filePath = complaintId ? _path.default.join(this.uploadDir, complaintId, filename) : _path.default.join(this.uploadDir, filename);
      const stats = await _promises.default.stat(filePath);
      return {
        exists: true,
        stats
      };
    } catch (error) {
      return {
        exists: false
      };
    }
  }
  async createComplaintDirectory(complaintId) {
    try {
      const dirPath = _path.default.join(this.uploadDir, complaintId);
      await _promises.default.mkdir(dirPath, {
        recursive: true
      });
      _logger.logger.info(`Created complaint directory: ${complaintId}`);
    } catch (error) {
      _logger.logger.error('Failed to create complaint directory:', error);
      throw error;
    }
  }
  async deleteComplaintDirectory(complaintId) {
    try {
      const dirPath = _path.default.join(this.uploadDir, complaintId);
      await _promises.default.rmdir(dirPath, {
        recursive: true
      });
      _logger.logger.info(`Deleted complaint directory: ${complaintId}`);
      return true;
    } catch (error) {
      _logger.logger.error('Failed to delete complaint directory:', error);
      return false;
    }
  }
}

// AWS S3 File Upload Service (for production)
exports.FileUploadService = FileUploadService;
class S3FileUploadService {
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
      _logger.logger.warn('AWS SDK not available, falling back to local storage');
    }
  }
  async uploadFile(file, complaintId) {
    try {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate unique filename
      const filename = generateUniqueFilename(file.originalname);
      const key = complaintId ? `${complaintId}/${filename}` : filename;

      // Upload to S3
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'private'
      };
      const result = await this.s3.upload(params).promise();
      _logger.logger.info(`File uploaded to S3: ${key}, size: ${file.size}`);
      return {
        filename,
        originalName: file.originalname,
        url: result.Location,
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      _logger.logger.error('S3 file upload error:', error);
      throw error;
    }
  }
  async uploadMultipleFiles(files, complaintId) {
    const results = [];
    for (const file of files) {
      try {
        const result = await this.uploadFile(file, complaintId);
        results.push(result);
      } catch (error) {
        _logger.logger.error(`Failed to upload file ${file.originalname} to S3:`, error);
      }
    }
    return results;
  }
  async deleteFile(filename, complaintId) {
    try {
      const key = complaintId ? `${complaintId}/${filename}` : filename;
      const params = {
        Bucket: this.bucketName,
        Key: key
      };
      await this.s3.deleteObject(params).promise();
      _logger.logger.info(`File deleted from S3: ${key}`);
      return true;
    } catch (error) {
      _logger.logger.error('S3 file deletion error:', error);
      return false;
    }
  }
  async getSignedUrl(filename, complaintId, expiresIn = 3600) {
    try {
      const key = complaintId ? `${complaintId}/${filename}` : filename;
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn
      };
      return this.s3.getSignedUrl('getObject', params);
    } catch (error) {
      _logger.logger.error('S3 signed URL generation error:', error);
      throw error;
    }
  }
}

// Export the appropriate service based on environment
exports.S3FileUploadService = S3FileUploadService;
const fileUploadService = exports.fileUploadService = process.env.NODE_ENV === 'production' ? new S3FileUploadService() : new FileUploadService();

// File upload middleware
const uploadSingle = exports.uploadSingle = createUploadMiddleware(1).single('file');
const uploadMultiple = exports.uploadMultiple = createUploadMiddleware(5).array('files', 5);

// Middleware to handle file upload errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof _multer.default.MulterError) {
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
exports.handleUploadError = handleUploadError;