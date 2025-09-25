const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authenticateToken, requireAnyRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandling');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/receipts');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  }
});

/**
 * GET /api/receipts
 * Get all receipts for the current user or all receipts for admins
 */
router.get('/', authenticateToken, requireAnyRole('admin', 'finance'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, startDate, endDate } = req.query;
  const offset = (page - 1) * limit;

  let query = db('expense_receipts as r')
    .select(
      'r.id',
      'r.file_path as filename',
      'r.original_filename',
      'r.file_type',
      'r.file_size',
      'r.processing_status as status',
      'r.created_at as uploaded_at',
      'r.processed_at',
      'r.raw_ocr_text as ocr_text',
      'r.processing_metadata',
      'r.processing_notes',
      'r.extraction_confidence',
      'u.name as uploaded_by'
    )
    .leftJoin('users as u', 'r.user_id', 'u.id')
    .orderBy('r.created_at', 'desc');

  // Non-admin users can only see their own receipts
  if (req.user.role !== 'admin') {
    query = query.where('r.user_id', req.user.userId);
  }

  // Apply filters
  if (status) {
    query = query.where('r.processing_status', status);
  }

  if (startDate && endDate) {
    query = query.whereBetween('r.created_at', [startDate, endDate]);
  }

  // Get total count for pagination
  const totalQuery = db('expense_receipts as r')
    .leftJoin('users as u', 'r.user_id', 'u.id')
    .modify((q) => {
      if (req.user.role !== 'admin') {
        q.where('r.user_id', req.user.userId);
      }
      if (status) {
        q.where('r.processing_status', status);
      }
      if (startDate && endDate) {
        q.whereBetween('r.created_at', [startDate, endDate]);
      }
    })
    .count('r.id as count')
    .first();
  
  const dataQuery = query.limit(limit).offset(offset);

  const [totalResult, receipts] = await Promise.all([totalQuery, dataQuery]);
  const total = parseInt(totalResult.count);

  res.json({
    receipts: receipts.map(receipt => ({
      id: receipt.id,
      filename: receipt.filename,
      originalFilename: receipt.original_filename,
      fileType: receipt.file_type,
      fileSize: receipt.file_size,
      status: receipt.status,
      uploadedAt: receipt.uploaded_at,
      processedAt: receipt.processed_at,
      uploadedBy: receipt.uploaded_by,
      ocrText: receipt.ocr_text,
      extractedData: receipt.processing_metadata,
      confidence: receipt.extraction_confidence,
      errorMessage: receipt.processing_notes
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * POST /api/receipts/upload
 * Upload a new receipt
 */
router.post('/upload', authenticateToken, requireAnyRole('admin', 'finance'), upload.single('receipt'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { originalname, filename, mimetype, size } = req.file;

  // Insert receipt record into database
  const receiptId = await db('expense_receipts').insert({
    user_id: req.user.userId,
    file_path: filename,
    original_filename: originalname,
    file_type: path.extname(originalname).substring(1),
    file_size: size,
    file_hash: filename, // Simple hash for now
    processing_status: 'uploaded'
  }).returning('id');

  const receipt = {
    id: receiptId[0].id,
    filename,
    originalFilename: originalname,
    fileType: path.extname(originalname).substring(1),
    fileSize: size,
    status: 'uploaded',
    uploadedAt: new Date().toISOString()
  };

  // In a real implementation, you would trigger OCR processing here
  // For now, we'll simulate processing by updating the status after a delay
  setTimeout(async () => {
    try {
      await simulateReceiptProcessing(receiptId[0].id, originalname);
    } catch (error) {
      console.error('Error in simulated processing:', error);
    }
  }, 2000);

  res.json({
    success: true,
    receipt
  });
}));

/**
 * GET /api/receipts/:id
 * Get a specific receipt
 */
router.get('/:id', authenticateToken, requireAnyRole('admin', 'finance'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  let query = db('expense_receipts as r')
    .select(
      'r.*',
      'u.name as uploaded_by'
    )
    .leftJoin('users as u', 'r.user_id', 'u.id')
    .where('r.id', id);

  // Non-admin users can only access their own receipts
  if (req.user.role !== 'admin') {
    query = query.where('r.user_id', req.user.userId);
  }

  const receipt = await query.first();

  if (!receipt) {
    return res.status(404).json({ error: 'Receipt not found' });
  }

  res.json({
    id: receipt.id,
    filename: receipt.file_path,
    originalFilename: receipt.original_filename,
    fileType: receipt.file_type,
    fileSize: receipt.file_size,
    status: receipt.processing_status,
    uploadedAt: receipt.created_at,
    processedAt: receipt.processed_at,
    uploadedBy: receipt.uploaded_by,
    ocrText: receipt.raw_ocr_text,
    extractedData: receipt.processing_metadata,
    confidence: receipt.extraction_confidence,
    errorMessage: receipt.processing_notes
  });
}));

/**
 * DELETE /api/receipts/:id
 * Delete a receipt
 */
router.delete('/:id', authenticateToken, requireAnyRole('admin', 'finance'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get receipt info first
  let query = db('expense_receipts').where('id', id);
  
  // Non-admin users can only delete their own receipts
  if (req.user.role !== 'admin') {
    query = query.where('user_id', req.user.userId);
  }

  const receipt = await query.first();

  if (!receipt) {
    return res.status(404).json({ error: 'Receipt not found' });
  }

  // Delete the file from filesystem
  const filePath = path.join(__dirname, '../../uploads/receipts', receipt.file_path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Delete from database
  await db('expense_receipts').where('id', id).del();

  res.json({ success: true });
}));

/**
 * Simulate receipt processing (OCR and data extraction)
 * In a real implementation, this would integrate with OCR services like Google Vision API, AWS Textract, etc.
 */
async function simulateReceiptProcessing(receiptId, filename) {
  try {
    // Update status to processing
    await db('expense_receipts').where('id', receiptId).update({
      processing_status: 'processing',
      processed_at: db.fn.now()
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Simulate OCR and extraction results
    const mockData = {
      raw_ocr_text: `Sample OCR text for ${filename}\n\nMerchant: Coffee Shop ABC\nDate: ${new Date().toISOString().split('T')[0]}\nAmount: $15.99\nCategory: Meals & Entertainment`,
      processing_metadata: {
        merchant: 'Coffee Shop ABC',
        date: new Date().toISOString().split('T')[0],
        amount: 15.99,
        category: 'Meals & Entertainment'
      },
      extraction_confidence: 0.85,
      processing_status: 'processed',
      processing_notes: 'Successfully processed'
    };

    // Update with extracted data
    await db('expense_receipts').where('id', receiptId).update(mockData);

  } catch (error) {
    console.error('Receipt processing error:', error);
    await db('expense_receipts').where('id', receiptId).update({
      processing_status: 'failed',
      processing_notes: 'Processing failed: ' + error.message,
      processed_at: db.fn.now()
    });
  }
}

module.exports = router;