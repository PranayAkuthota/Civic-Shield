import { Router, Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { authenticateToken } from '../middleware/auth';
import { uploadSingle, uploadMultiple, handleUploadError, fileUploadService, getFileCategory } from '../services/fileUpload';
import { Complaint } from '../models';
import { logger } from '../utils/logger';
import { uploadLimiter } from '../middleware/security';

const router = Router();

// Upload single file (general purpose)
router.post('/single', authenticateToken, uploadLimiter, uploadSingle, handleUploadError, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
      return;
    }

    const result = await fileUploadService.uploadFile(req.file);

    logger.info(`Single file uploaded by ${req.user?.email}: ${result.filename}`);

    res.status(201).json({
      success: true,
      data: {
        file: result
      },
      message: 'File uploaded successfully'
    });
  } catch (error) {
    logger.error('Single file upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file'
    });
  }
});

// Upload multiple files
router.post('/multiple', authenticateToken, uploadLimiter, uploadMultiple, handleUploadError, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
      return;
    }

    const results = await fileUploadService.uploadMultipleFiles(req.files);

    logger.info(`Multiple files uploaded by ${req.user?.email}: ${results.length} files`);

    res.status(201).json({
      success: true,
      data: {
        files: results
      },
      message: `${results.length} files uploaded successfully`
    });
  } catch (error) {
    logger.error('Multiple files upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload files'
    });
  }
});

// Upload files for a specific complaint
router.post('/complaint/:complaintId', authenticateToken, uploadLimiter, uploadMultiple, handleUploadError, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { complaintId } = req.params;

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
      return;
    }

    // Verify complaint exists and user has access
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
      return;
    }

    // Check if user can upload files to this complaint
    const isOwner = complaint.filedBy.toString() === req.user?.id;
    const isAdmin = ['admin', 'superadmin'].includes(req.user?.role || '');
    const isAssignedOfficial = complaint.assignedTo?.toString() === req.user?.id;

    if (!isOwner && !isAdmin && !isAssignedOfficial) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    // Create complaint directory if it doesn't exist
    await fileUploadService.createComplaintDirectory?.(complaintId);

    // Upload files
    const results = await fileUploadService.uploadMultipleFiles(req.files, complaintId);

    // Update complaint with new evidence files
    const evidenceFiles = results.map(file => ({
      filename: file.filename,
      originalName: file.originalName,
      fileType: fileUploadService.getFileCategory?.(file.mimeType) || 'document',
      url: file.url,
      uploadedAt: new Date(),
      size: file.size,
      mimeType: file.mimeType
    }));

    complaint.evidenceFiles.push(...evidenceFiles);
    await complaint.save();

    logger.info(`Files uploaded for complaint ${complaintId} by ${req.user?.email}: ${results.length} files`);

    res.status(201).json({
      success: true,
      data: {
        files: results,
        complaint: await complaint.populate('filedBy', 'name email')
      },
      message: `${results.length} files uploaded to complaint successfully`
    });
  } catch (error) {
    logger.error('Complaint file upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload files to complaint'
    });
  }
});

// Get file information
router.get('/info/:filename', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filename } = req.params;
    const { complaintId } = req.query;

    const fileInfo = await fileUploadService.getFileInfo(filename, complaintId as string);

    if (!fileInfo.exists) {
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        filename,
        exists: true,
        stats: fileInfo.stats
      }
    });
  } catch (error) {
    logger.error('File info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file information'
    });
  }
});

// Download file (serves file from local storage)
router.get('/download/:filename', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filename } = req.params;
    const { complaintId } = req.query;

    // Check if user has access to the file
    if (complaintId) {
      const complaint = await Complaint.findById(complaintId);
      if (!complaint) {
        res.status(404).json({
          success: false,
          error: 'Complaint not found'
        });
        return;
      }

      // Check if file belongs to complaint
      const fileExists = complaint.evidenceFiles.some(file => file.filename === filename);
      if (!fileExists) {
        res.status(404).json({
          success: false,
          error: 'File not found in this complaint'
        });
        return;
      }

      // Check access permissions
      const canView = complaint.canBeViewedBy(req.user?.id || '', req.user?.role || '');
      if (!canView) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }
    }

    const filePath = complaintId
      ? `./uploads/${complaintId}/${filename}`
      : `./uploads/${filename}`;

    const fs = require('fs');
    const path = require('path');

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
      return;
    }

    // Get file info
    const stats = fs.statSync(filePath);
    const fileContent = fs.readFileSync(filePath);

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(fileContent);

    logger.info(`File downloaded: ${filename} by ${req.user?.email}`);
  } catch (error) {
    logger.error('File download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

// Delete file
router.delete('/:filename', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filename } = req.params;
    const { complaintId } = req.query;

    if (complaintId) {
      // Verify complaint and permissions
      const complaint = await Complaint.findById(complaintId);
      if (!complaint) {
        res.status(404).json({
          success: false,
          error: 'Complaint not found'
        });
        return;
      }

      // Check if user can delete files from this complaint
      const isOwner = complaint.filedBy.toString() === req.user?.id;
      const isAdmin = ['admin', 'superadmin'].includes(req.user?.role || '');

      if (!isOwner && !isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Only the complaint owner or admin can delete files'
        });
        return;
      }

      // Remove file from complaint evidence
      complaint.evidenceFiles = complaint.evidenceFiles.filter(
        file => file.filename !== filename
      );
      await complaint.save();
    }

    // Delete file from storage
    const deleted = await fileUploadService.deleteFile(filename, complaintId as string);

    if (deleted) {
      logger.info(`File deleted: ${filename} by ${req.user?.email}`);

      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete file'
      });
    }
  } catch (error) {
    logger.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file'
    });
  }
});

// Get supported file types and limits
router.get('/config', (req, res) => {
  const { ALLOWED_FILE_TYPES } = require('../services/fileUpload');

  res.json({
    success: true,
    data: {
      supportedTypes: ALLOWED_FILE_TYPES,
      maxFiles: 5,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: Object.values(ALLOWED_FILE_TYPES).flatMap(config => config.mimeTypes)
    }
  });
});

export default router;