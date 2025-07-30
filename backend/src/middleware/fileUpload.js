const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');

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
  // Additional security checks
  if (req.file) {
    const file = req.file;
    
    // Check file size again (double check)
    const maxSize = parseInt(process.env.MAX_RECEIPT_SIZE || '10485760');
    if (file.size > maxSize) {
      return res.status(413).json({
        error: 'File too large',
        maxSize: `${maxSize / 1024 / 1024}MB`
      });
    }

    // Validate file extension matches mime type
    const extension = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;
    
    const validCombinations = {
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.gif': ['image/gif'],
      '.webp': ['image/webp'],
      '.pdf': ['application/pdf']
    };

    if (!validCombinations[extension] || !validCombinations[extension].includes(mimeType)) {
      // Clean up uploaded file
      fs.remove(file.path).catch(console.error);
      return res.status(400).json({
        error: 'File extension does not match file type',
        extension,
        mimeType
      });
    }

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

// Virus scanning middleware (placeholder for future implementation)
const virusScan = async (req, res, next) => {
  // TODO: Implement virus scanning with ClamAV or similar
  // For now, just basic file validation
  
  if (req.file) {
    try {
      // Check if file exists and is readable
      await fs.access(req.file.path, fs.constants.R_OK);
      
      // Basic file header validation
      const buffer = await fs.readFile(req.file.path, { start: 0, end: 10 });
      
      // Check for common malicious patterns (very basic)
      const maliciousPatterns = [
        Buffer.from([0x4D, 0x5A]), // MZ (executable)
        Buffer.from('<?php', 'ascii'), // PHP
        Buffer.from('<script', 'ascii') // Script tag
      ];
      
      for (const pattern of maliciousPatterns) {
        if (buffer.includes(pattern)) {
          await fs.remove(req.file.path);
          return res.status(400).json({
            error: 'File failed security scan',
            reason: 'Potentially malicious content detected'
          });
        }
      }
    } catch (error) {
      console.error('Virus scan error:', error);
      if (req.file.path) {
        await fs.remove(req.file.path).catch(console.error);
      }
      return res.status(500).json({
        error: 'Security scan failed'
      });
    }
  }
  
  next();
};

module.exports = {
  receiptUploader: createReceiptUploader(),
  fileUploadSecurity,
  handleUploadErrors,
  virusScan
};