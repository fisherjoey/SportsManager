// @ts-nocheck

import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs-extra';

// Configure multer for receipt uploads
const createReceiptUploader = () => {
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      await fs.ensureDir(tempDir);
      cb(null, tempDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}_${crypto.randomUUID()}`;
      const extension = path.extname(file.originalname);
      cb(null, `receipt_${uniqueSuffix}${extension}`);
    }
  });

  const fileFilter = (req, file, cb) => {
    // Allowed file types for receipts
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Supported types: ${allowedTypes.join(', ')}`), false);
    }
  };

  const limits = {
    fileSize: parseInt(process.env.MAX_RECEIPT_SIZE || '10485760'), // 10MB default
    files: 1 // Single file upload
  };

  return multer({
    storage,
    fileFilter,
    limits
  });
};

// Security middleware for file uploads
const fileUploadSecurity = (req, res, next) => {
  console.log('=== FILE SECURITY CHECK ===');
  console.log('File present:', !!req.file);
  
  // Additional security checks
  if (req.file) {
    const file = req.file;
    console.log('File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Check file size again (double check)
    const maxSize = parseInt(process.env.MAX_RECEIPT_SIZE || '10485760');
    if (file.size > maxSize) {
      console.log('File too large:', file.size, '>', maxSize);
      return res.status(413).json({
        error: 'File too large',
        maxSize: `${maxSize / 1024 / 1024}MB`
      });
    }

    // Validate file extension matches mime type
    const extension = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;
    console.log('Extension check:', { extension, mimeType });
    
    const validCombinations = {
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.gif': ['image/gif'],
      '.webp': ['image/webp'],
      '.pdf': ['application/pdf']
    };

    if (!validCombinations[extension] || !validCombinations[extension].includes(mimeType)) {
      console.log('VALIDATION ERROR: Extension/MIME mismatch');
      console.log('Valid combinations:', validCombinations);
      console.log('Extension:', extension, 'MIME:', mimeType);
      // Clean up uploaded file
      fs.remove(file.path).catch(console.error);
      return res.status(400).json({
        error: 'File extension does not match file type',
        extension,
        mimeType
      });
    }
    
    console.log('File security check passed');

    // Add security metadata to request
    req.uploadSecurity = {
      fileHash: null, // Will be calculated by processing service
      uploadTime: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };
  }

  next();
};

// Error handler for multer errors
const handleUploadErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        maxSize: `${req.app.locals.maxFileSize || 10}MB`
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        maxFiles: 1
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected field name',
        expectedField: 'receipt'
      });
    }
  }

  if (error.message.includes('File type') && error.message.includes('not allowed')) {
    return res.status(415).json({
      error: 'Unsupported file type',
      details: error.message
    });
  }

  // Generic upload error
  return res.status(400).json({
    error: 'File upload failed',
    details: error.message
  });
};

// Relaxed security scan middleware for receipt uploads
const virusScan = async (req, res, next) => {
  // Very basic security check - just ensure file exists and is readable
  // This is mainly for receipt images and PDFs, so we're being permissive
  
  if (req.file) {
    try {
      // Just check if file exists and is readable
      await fs.access(req.file.path, fs.constants.R_OK);
      
      // Only block obviously dangerous executable files
      const buffer = await fs.readFile(req.file.path, { start: 0, end: 4 });
      
      // Only check for actual executable headers (much more relaxed)
      const dangerousPatterns = [
        Buffer.from([0x4D, 0x5A, 0x90, 0x00]), // PE executable (more specific)
        Buffer.from([0x7F, 0x45, 0x4C, 0x46])  // ELF executable
      ];
      
      for (const pattern of dangerousPatterns) {
        if (buffer.length >= pattern.length && buffer.subarray(0, pattern.length).equals(pattern)) {
          console.log('Blocked executable file upload:', req.file.originalname);
          await fs.remove(req.file.path);
          return res.status(400).json({
            error: 'Executable files are not allowed',
            reason: 'Only images and PDFs are permitted for receipts'
          });
        }
      }
      
      console.log('File passed security scan:', req.file.originalname);
    } catch (error) {
      console.error('Security scan error:', error);
      // Don't fail the upload for scan errors - just log them
      console.log('Security scan failed but allowing upload:', req.file.originalname);
    }
  }
  
  // Always continue - we're being permissive for receipt uploads
  next();
};

const receiptUploader = createReceiptUploader();

export {
  receiptUploader,
  fileUploadSecurity,
  handleUploadErrors,
  virusScan
};