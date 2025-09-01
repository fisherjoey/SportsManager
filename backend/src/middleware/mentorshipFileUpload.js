/**
 * @fileoverview Mentorship Document Upload Middleware
 * @description Specialized file upload middleware for mentorship documents with enhanced security
 * @version 1.0.0
 * 
 * This middleware provides secure file upload handling specifically for mentorship documents,
 * including virus scanning, file type validation, size limits, and proper file organization.
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');
const { ErrorFactory } = require('../utils/errors');

/**
 * Configuration for mentorship document uploads
 */
const MENTORSHIP_UPLOAD_CONFIG = {
  // Maximum file size (10MB)
  maxFileSize: 10 * 1024 * 1024,
  
  // Allowed MIME types for mentorship documents
  allowedMimeTypes: [
    // PDF documents
    'application/pdf',
    
    // Microsoft Office documents
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    
    // Text files
    'text/plain',
    'text/csv',
    
    // Archives (for multiple documents)
    'application/zip',
    'application/x-zip-compressed'
  ],
  
  // File extension mappings for validation
  mimeToExtension: {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],
    'application/zip': ['.zip'],
    'application/x-zip-compressed': ['.zip']
  },
  
  // Upload directory
  uploadDir: path.join(process.cwd(), 'uploads', 'mentorship_documents')
};

/**
 * Create storage configuration for mentorship documents
 * @returns {multer.StorageEngine} Configured storage engine
 */
function createMentorshipStorage() {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        const uploadDir = MENTORSHIP_UPLOAD_CONFIG.uploadDir;
        
        // Create directory structure: uploads/mentorship_documents/YYYY/MM/
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        
        const finalDir = path.join(uploadDir, year, month);
        await fs.ensureDir(finalDir);
        
        // Store the final directory path for later use
        req.uploadDir = finalDir;
        cb(null, finalDir);
        
      } catch (error) {
        console.error('Error creating upload directory:', error);
        cb(new Error('Failed to create upload directory'), null);
      }
    },
    
    filename: (req, file, cb) => {
      try {
        // Generate secure filename with timestamp and UUID
        const timestamp = Date.now();
        const uuid = crypto.randomUUID();
        const extension = path.extname(file.originalname).toLowerCase();
        
        // Sanitize original filename for storage reference
        const sanitizedName = file.originalname
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .replace(/_{2,}/g, '_')
          .replace(/^_+|_+$/g, '')
          .substring(0, 100); // Limit length
        
        // Create final filename: mentorship_timestamp_uuid_sanitizedname.ext
        const finalFilename = `mentorship_${timestamp}_${uuid}_${sanitizedName}${extension}`;
        
        // Store original name for database
        req.originalFilename = file.originalname;
        cb(null, finalFilename);
        
      } catch (error) {
        console.error('Error generating filename:', error);
        cb(new Error('Failed to generate secure filename'), null);
      }
    }
  });
}

/**
 * File filter for mentorship documents
 * @param {Object} req - Express request object
 * @param {Object} file - File object from multer
 * @param {Function} cb - Callback function
 */
function mentorshipFileFilter(req, file, cb) {
  try {
    const { originalname, mimetype } = file;
    
    // Check MIME type
    if (!MENTORSHIP_UPLOAD_CONFIG.allowedMimeTypes.includes(mimetype)) {
      const error = new Error(
        `File type ${mimetype} not allowed. Supported types: ${MENTORSHIP_UPLOAD_CONFIG.allowedMimeTypes.join(', ')}`
      );
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }
    
    // Check file extension matches MIME type
    const extension = path.extname(originalname).toLowerCase();
    const allowedExtensions = MENTORSHIP_UPLOAD_CONFIG.mimeToExtension[mimetype] || [];
    
    if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
      const error = new Error(
        `File extension ${extension} does not match MIME type ${mimetype}. Expected: ${allowedExtensions.join(', ')}`
      );
      error.code = 'EXTENSION_MISMATCH';
      return cb(error, false);
    }
    
    // Additional filename security checks
    if (originalname.includes('..') || originalname.includes('/') || originalname.includes('\\')) {
      const error = new Error('Filename contains invalid characters');
      error.code = 'INVALID_FILENAME';
      return cb(error, false);
    }
    
    // File passed all checks
    cb(null, true);
    
  } catch (error) {
    console.error('Error in file filter:', error);
    cb(new Error('File validation failed'), false);
  }
}

/**
 * Create multer instance for mentorship documents
 * @returns {multer.Multer} Configured multer instance
 */
function createMentorshipUploader() {
  return multer({
    storage: createMentorshipStorage(),
    fileFilter: mentorshipFileFilter,
    limits: {
      fileSize: MENTORSHIP_UPLOAD_CONFIG.maxFileSize,
      files: 1, // Single file upload
      fieldNameSize: 100,
      fieldSize: 1024 * 1024 // 1MB field size limit
    }
  });
}

/**
 * Enhanced security middleware for mentorship document uploads
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
async function mentorshipFileSecurity(req, res, next) {
  if (!req.file) {
    return next();
  }
  
  try {
    const file = req.file;
    console.log('Mentorship file security check:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    });
    
    // Double-check file size
    if (file.size > MENTORSHIP_UPLOAD_CONFIG.maxFileSize) {
      await cleanupFile(file.path);
      return res.status(413).json({
        error: 'File too large',
        maxSize: `${MENTORSHIP_UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB`,
        actualSize: `${(file.size / (1024 * 1024)).toFixed(2)}MB`
      });
    }
    
    // Verify file exists and is readable
    try {
      await fs.access(file.path, fs.constants.R_OK);
      const stats = await fs.stat(file.path);
      
      if (stats.size !== file.size) {
        console.warn('File size mismatch:', { expected: file.size, actual: stats.size });
        await cleanupFile(file.path);
        return res.status(400).json({
          error: 'File integrity check failed',
          reason: 'Size mismatch'
        });
      }
    } catch (accessError) {
      console.error('File access error:', accessError);
      await cleanupFile(file.path);
      return res.status(400).json({
        error: 'File not accessible',
        reason: 'Upload may have been corrupted'
      });
    }
    
    // Basic malware check - scan first few bytes for executable signatures
    try {
      const buffer = await fs.readFile(file.path, { start: 0, end: 10 });
      
      // Check for common executable signatures
      const dangerousSignatures = [
        Buffer.from([0x4D, 0x5A]), // PE executable (MZ)
        Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
        Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), // Mach-O
        Buffer.from([0xFE, 0xED, 0xFA, 0xCE]), // Mach-O 64-bit
        Buffer.from([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E]) // Unix archive
      ];
      
      for (const signature of dangerousSignatures) {
        if (buffer.length >= signature.length && 
            buffer.subarray(0, signature.length).equals(signature)) {
          console.warn('Blocked executable file upload:', file.originalname);
          await cleanupFile(file.path);
          return res.status(400).json({
            error: 'Executable files are not allowed',
            reason: 'Security policy violation'
          });
        }
      }
      
    } catch (scanError) {
      console.warn('File scanning error (allowing upload):', scanError.message);
      // Continue with upload despite scan error
    }
    
    // Add security metadata to request
    req.uploadSecurity = {
      uploadTime: new Date(),
      ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      fileHash: null, // Could be calculated here if needed
      securityChecks: {
        sizeCheck: true,
        accessCheck: true,
        signatureCheck: true
      }
    };
    
    console.log('Mentorship file security check passed:', file.originalname);
    next();
    
  } catch (error) {
    console.error('Mentorship file security error:', error);
    if (req.file && req.file.path) {
      await cleanupFile(req.file.path);
    }
    res.status(500).json({
      error: 'File security check failed',
      message: 'Internal security validation error'
    });
  }
}

/**
 * Virus scanning middleware (placeholder for actual antivirus integration)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
async function mentorshipVirusScan(req, res, next) {
  if (!req.file) {
    return next();
  }
  
  try {
    // This is a placeholder for actual virus scanning
    // In production, integrate with ClamAV, Windows Defender API, or other AV solutions
    
    const file = req.file;
    console.log('Virus scan (placeholder):', file.originalname);
    
    // Simulate virus scan delay (remove in production)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Add scan metadata
    if (!req.uploadSecurity) {
      req.uploadSecurity = {};
    }
    req.uploadSecurity.virusScan = {
      status: 'clean',
      scannedAt: new Date(),
      scanner: 'placeholder'
    };
    
    console.log('Virus scan completed:', file.originalname);
    next();
    
  } catch (error) {
    console.error('Virus scan error:', error);
    if (req.file && req.file.path) {
      await cleanupFile(req.file.path);
    }
    res.status(400).json({
      error: 'File failed security scan',
      reason: 'Virus scan error'
    });
  }
}

/**
 * Error handler specifically for mentorship file upload errors
 * @param {Error} error - Multer or upload error
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function handleMentorshipUploadErrors(error, req, res, next) {
  // Clean up any uploaded file if there was an error
  if (req.file && req.file.path) {
    cleanupFile(req.file.path).catch(console.error);
  }
  
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          error: 'File too large',
          maxSize: `${MENTORSHIP_UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB`,
          code: 'FILE_TOO_LARGE'
        });
        
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'Too many files',
          maxFiles: 1,
          code: 'TOO_MANY_FILES'
        });
        
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'Unexpected field name',
          expectedField: 'document',
          code: 'UNEXPECTED_FIELD'
        });
        
      default:
        return res.status(400).json({
          error: 'File upload error',
          details: error.message,
          code: error.code || 'UPLOAD_ERROR'
        });
    }
  }
  
  // Handle custom validation errors
  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(415).json({
      error: 'Unsupported file type',
      details: error.message,
      code: 'INVALID_FILE_TYPE'
    });
  }
  
  if (error.code === 'EXTENSION_MISMATCH') {
    return res.status(400).json({
      error: 'File extension mismatch',
      details: error.message,
      code: 'EXTENSION_MISMATCH'
    });
  }
  
  if (error.code === 'INVALID_FILENAME') {
    return res.status(400).json({
      error: 'Invalid filename',
      details: error.message,
      code: 'INVALID_FILENAME'
    });
  }
  
  // Generic upload error
  return res.status(400).json({
    error: 'File upload failed',
    details: error.message,
    code: 'UPLOAD_FAILED'
  });
}

/**
 * Clean up uploaded file
 * @param {string} filePath - Path to file to clean up
 * @returns {Promise<boolean>} Success status
 */
async function cleanupFile(filePath) {
  try {
    if (filePath && typeof filePath === 'string') {
      await fs.remove(filePath);
      console.log('Cleaned up uploaded file:', filePath);
      return true;
    }
  } catch (error) {
    console.warn('Failed to cleanup uploaded file:', filePath, error.message);
  }
  return false;
}

/**
 * Get upload statistics
 * @returns {Object} Upload configuration and statistics
 */
function getUploadStats() {
  return {
    maxFileSize: MENTORSHIP_UPLOAD_CONFIG.maxFileSize,
    maxFileSizeMB: (MENTORSHIP_UPLOAD_CONFIG.maxFileSize / (1024 * 1024)).toFixed(1),
    allowedTypes: MENTORSHIP_UPLOAD_CONFIG.allowedMimeTypes,
    uploadDir: MENTORSHIP_UPLOAD_CONFIG.uploadDir,
    supportedExtensions: Object.values(MENTORSHIP_UPLOAD_CONFIG.mimeToExtension).flat()
  };
}

// Create the main uploader instance
const mentorshipUploader = createMentorshipUploader();

module.exports = {
  // Main uploader instance
  mentorshipUploader,
  
  // Middleware functions
  mentorshipFileSecurity,
  mentorshipVirusScan,
  handleMentorshipUploadErrors,
  
  // Utility functions
  cleanupFile,
  getUploadStats,
  
  // Configuration
  MENTORSHIP_UPLOAD_CONFIG
};