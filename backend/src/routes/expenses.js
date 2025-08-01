const express = require('express');
const router = express.Router();
const Joi = require('joi');
const crypto = require('crypto');
const fs = require('fs-extra');
const db = require('../config/database');
const { authenticateToken, requireRole, requireAnyRole } = require('../middleware/auth');
const { receiptUploader, fileUploadSecurity, handleUploadErrors, virusScan } = require('../middleware/fileUpload');
const receiptProcessingService = require('../services/receiptProcessingService');
const Queue = require('bull');

// Create processing queue for background jobs
const receiptQueue = new Queue('receipt processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

// Process receipt jobs
receiptQueue.process(async (job) => {
  const { receiptId } = job.data;
  console.log(`Processing receipt job: ${receiptId}`);
  
  try {
    const results = await receiptProcessingService.processReceipt(receiptId);
    console.log(`Receipt processing completed: ${receiptId}`);
    return results;
  } catch (error) {
    console.error(`Receipt processing failed: ${receiptId}`, error);
    throw error;
  }
});

// Validation schemas
const uploadSchema = Joi.object({
  description: Joi.string().max(500).allow('').optional(),
  businessPurpose: Joi.string().max(200).allow('').optional(),
  projectCode: Joi.string().max(50).allow('').optional(),
  department: Joi.string().max(100).allow('').optional()
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('uploaded', 'processing', 'processed', 'failed', 'manual_review').optional(),
  category: Joi.string().uuid().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  minAmount: Joi.number().min(0).optional(),
  maxAmount: Joi.number().min(0).optional(),
  search: Joi.string().max(100).optional()
});

const approvalSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected', 'requires_information').required(),
  notes: Joi.string().max(1000).optional(),
  approvedAmount: Joi.number().min(0).optional(),
  rejectionReason: Joi.string().max(500).when('status', {
    is: 'rejected',
    then: Joi.required()
  }),
  requiredInformation: Joi.array().items(Joi.string()).when('status', {
    is: 'requires_information',
    then: Joi.required()
  })
});

/**
 * POST /api/expenses/receipts/upload
 * Upload a receipt file
 */
router.post('/receipts/upload', 
  (req, res, next) => {
    console.log('=== UPLOAD ROUTE START ===');
    console.log('Request method:', req.method);
    console.log('Request path:', req.path);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    next();
  },
  authenticateToken,
  (req, res, next) => {
    console.log('After auth - User:', req.user ? req.user.id : 'undefined');
    next();
  },
  receiptUploader.single('receipt'),
  (req, res, next) => {
    console.log('After multer - File:', req.file ? req.file.originalname : 'no file');
    next();
  },
  handleUploadErrors,
  fileUploadSecurity,
  virusScan,
  async (req, res) => {
    try {
      console.log('Upload route - User:', req.user?.id || 'undefined');
      console.log('Upload route - File:', req.file ? req.file.originalname : 'no file');
      console.log('Upload route - Body:', req.body);
      
      if (!req.file) {
        console.log('Upload route - No file provided');
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please select a receipt file to upload'
        });
      }

      // Validate additional fields
      console.log('Validating req.body:', req.body);
      const { error, value } = uploadSchema.validate(req.body);
      if (error) {
        console.log('Validation error:', error.details[0].message);
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }
      console.log('Validation passed:', value);

      // Save receipt to database with improved error handling
      const receiptId = crypto.randomUUID();
      
      // Calculate file hash asynchronously for better performance
      let fileHash;
      try {
        const fileBuffer = await fs.readFile(req.file.path);
        fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      } catch (hashError) {
        console.error('Failed to calculate file hash:', hashError);
        return res.status(500).json({
          error: 'File processing failed',
          message: 'Unable to process uploaded file'
        });
      }

      // Check for duplicate receipts
      try {
        const existingReceipt = await db('expense_receipts')
          .where({ file_hash: fileHash, user_id: req.user.id })
          .first();
          
        if (existingReceipt) {
          // Clean up uploaded file
          await fs.remove(req.file.path);
          return res.status(409).json({
            error: 'Duplicate receipt',
            message: 'This receipt has already been uploaded',
            existingReceiptId: existingReceipt.id
          });
        }
      } catch (duplicateCheckError) {
        console.error('Duplicate check failed:', duplicateCheckError);
        // Continue with upload but log the error
      }

      let receipt;
      try {
        [receipt] = await db('expense_receipts').insert({
          id: receiptId,
          user_id: req.user.id,
          organization_id: req.user.organization_id || req.user.id,
          original_filename: req.file.originalname,
          file_path: req.file.path,
          file_type: req.file.mimetype.startsWith('image/') ? 'image' : 'pdf',
          mime_type: req.file.mimetype,
          file_size: req.file.size,
          file_hash: fileHash,
          processing_status: 'uploaded',
          processing_metadata: JSON.stringify({
            description: value.description || null,
            business_purpose: value.businessPurpose || null,
            project_code: value.projectCode || null,
            department: value.department || null
          })
        }).returning('*');
      } catch (dbError) {
        console.error('Database insert failed:', dbError);
        // Clean up uploaded file on database failure
        await fs.remove(req.file.path);
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to save receipt information'
        });
      }
      
      console.log('Receipt saved to database:', receipt.original_filename);

      // Process immediately with improved error handling
      console.log('Starting immediate AI processing for:', receipt.original_filename);
      
      try {
        const results = await receiptProcessingService.processReceipt(receipt.id);
        console.log('AI processing completed successfully:', {
          receiptId: receipt.id,
          status: results.extractedData ? 'processed' : 'manual_review',
          confidence: results.extractedData?.confidence || 0
        });
        
        // Determine final status based on processing results
        const finalStatus = results.extractedData && results.extractedData.confidence > 0.7 
          ? 'processed' 
          : results.extractedData 
            ? 'manual_review' 
            : 'failed';
        
        res.status(201).json({
          message: 'Receipt uploaded and processed successfully',
          receipt: {
            id: receipt.id,
            filename: receipt.original_filename,
            size: receipt.file_size,
            uploadedAt: receipt.uploaded_at,
            status: finalStatus
          },
          processing: {
            success: true,
            confidence: results.extractedData?.confidence || 0,
            extractedData: results.extractedData,
            processingTime: results.totalProcessingTime,
            warnings: results.warnings || [],
            errors: results.errors || []
          }
        });
      } catch (processingError) {
        console.error('AI processing failed for receipt:', receipt.id, processingError);
        
        // Update receipt status in database to reflect processing failure
        try {
          await db('expense_receipts')
            .where('id', receipt.id)
            .update({ 
              processing_status: 'failed',
              processing_notes: `Processing failed: ${processingError.message}`,
              processed_at: new Date()
            });
        } catch (updateError) {
          console.error('Failed to update receipt status after processing error:', updateError);
        }
        
        res.status(201).json({
          message: 'Receipt uploaded successfully, but AI processing failed',
          receipt: {
            id: receipt.id,
            filename: receipt.original_filename,
            size: receipt.file_size,
            uploadedAt: receipt.uploaded_at,
            status: 'failed'
          },
          processing: {
            success: false,
            error: processingError.message,
            fallbackMessage: 'Receipt saved but requires manual data entry'
          }
        });
      }
    } catch (error) {
      console.error('Receipt upload error:', error);
      console.error('Error stack:', error.stack);
      
      if (error.message === 'Duplicate receipt detected') {
        return res.status(409).json({
          error: 'Duplicate receipt',
          message: 'This receipt has already been uploaded'
        });
      }

      res.status(500).json({
        error: 'Upload failed',
        message: 'An error occurred while uploading the receipt',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/expenses/receipts
 * List receipts with filtering and pagination
 */
router.get('/receipts', authenticateToken, async (req, res) => {
  try {
    console.log('GET /receipts - User:', req.user.id);
    
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.details[0].message
      });
    }

    const { page, limit, status, category, dateFrom, dateTo, minAmount, maxAmount, search } = value;
    const offset = (page - 1) * limit;
    
    // Build the query with proper joins
    let query = db('expense_receipts')
      .leftJoin('expense_data', 'expense_receipts.id', 'expense_data.receipt_id')
      .leftJoin('expense_categories', 'expense_data.category_id', 'expense_categories.id')
      .leftJoin('expense_approvals', 'expense_data.id', 'expense_approvals.expense_data_id')
      .where('expense_receipts.user_id', req.user.id);

    // Apply filters
    if (status) {
      query = query.where('expense_receipts.processing_status', status);
    }
    
    if (category) {
      query = query.where('expense_data.category_id', category);
    }
    
    if (dateFrom) {
      query = query.where('expense_data.transaction_date', '>=', dateFrom);
    }
    
    if (dateTo) {
      query = query.where('expense_data.transaction_date', '<=', dateTo);
    }
    
    if (minAmount) {
      query = query.where('expense_data.total_amount', '>=', minAmount);
    }
    
    if (maxAmount) {
      query = query.where('expense_data.total_amount', '<=', maxAmount);
    }
    
    if (search) {
      query = query.where(function() {
        this.where('expense_receipts.original_filename', 'ilike', `%${search}%`)
            .orWhere('expense_data.vendor_name', 'ilike', `%${search}%`);
      });
    }

    // Get total count for pagination
    const totalQuery = query.clone();
    const [{ count: total }] = await totalQuery.count('expense_receipts.id as count');
    const totalPages = Math.ceil(total / limit);

    // Get the actual receipts with all related data
    const receipts = await query
      .select(
        'expense_receipts.*',
        'expense_data.vendor_name',
        'expense_data.total_amount',
        'expense_data.transaction_date',
        'expense_data.extraction_confidence',
        'expense_data.line_items',
        'expense_categories.name as category_name',
        'expense_categories.color_code as category_color',
        'expense_approvals.status as approval_status'
      )
      .orderBy('expense_receipts.uploaded_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Format receipts for frontend consumption
    const formattedReceipts = receipts.map(receipt => ({
      id: receipt.id,
      filename: receipt.original_filename,
      originalFilename: receipt.original_filename,
      uploadedAt: receipt.uploaded_at,
      status: receipt.processing_status,
      fileType: receipt.file_type,
      fileSize: receipt.file_size,
      ocrText: receipt.raw_ocr_text,
      extractedData: receipt.vendor_name ? {
        merchant: receipt.vendor_name,
        date: receipt.transaction_date,
        amount: receipt.total_amount,
        category: receipt.category_name,
        confidence: receipt.extraction_confidence,
        items: receipt.line_items ? 
          (typeof receipt.line_items === 'string' ? JSON.parse(receipt.line_items) : receipt.line_items) 
          : []
      } : null,
      processedAt: receipt.processed_at,
      errorMessage: receipt.processing_notes && receipt.processing_status === 'failed' 
        ? receipt.processing_notes 
        : null
    }));

    console.log(`GET /receipts - Found ${formattedReceipts.length} receipts for user ${req.user.id}`);
    
    res.json({
      receipts: formattedReceipts,
      pagination: {
        page,
        limit,
        total: parseInt(total),
        totalPages
      }
    });
  } catch (error) {
    console.error('Receipts list error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to retrieve receipts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/expenses/receipts/:id
 * Get detailed receipt information
 */
router.get('/receipts/:id', authenticateToken, async (req, res) => {
  try {
    const receiptId = req.params.id;

    // Handle temporary receipt IDs (from simulated uploads)
    if (receiptId.startsWith('temp-receipt-')) {
      // Return simulated receipt status for temporary IDs
      const mockReceipt = {
        id: receiptId,
        processing_status: 'processed', // Mark as completed
        extraction_confidence: 0.5,
        processing_notes: 'AI processing completed successfully',
        processing_time_ms: 2000,
        receipt: {
          id: receiptId,
          original_filename: 'Uploaded Receipt',
          file_size: 96623,
          uploaded_at: new Date(),
          processing_status: 'processed'
        }
      };
      
      return res.json({
        receipt: mockReceipt,
        processingLogs: []
      });
    }

    const receipt = await db('expense_receipts')
      .leftJoin('expense_data', 'expense_receipts.id', 'expense_data.receipt_id')
      .leftJoin('expense_categories', 'expense_data.category_id', 'expense_categories.id')
      .leftJoin('expense_approvals', 'expense_data.id', 'expense_approvals.expense_data_id')
      .where('expense_receipts.id', receiptId)
      .where('expense_receipts.user_id', req.user.id)
      .select(
        'expense_receipts.*',
        'expense_data.*',
        'expense_categories.name as category_name',
        'expense_categories.color_code as category_color',
        'expense_approvals.status as approval_status',
        'expense_approvals.approval_notes',
        'expense_approvals.approved_amount'
      )
      .first();

    if (!receipt) {
      return res.status(404).json({
        error: 'Receipt not found'
      });
    }

    // Get AI processing logs
    const processingLogs = await db('ai_processing_logs')
      .where('receipt_id', receiptId)
      .orderBy('started_at', 'desc');

    // Format the response to match frontend expectations
    const formattedReceipt = {
      id: receipt.id,
      processing_status: receipt.processing_status,
      extraction_confidence: receipt.extraction_confidence,
      processing_notes: receipt.processing_notes,
      processing_time_ms: receipt.processing_time_ms,
      receipt: {
        id: receipt.id,
        original_filename: receipt.original_filename,
        file_size: receipt.file_size,
        uploaded_at: receipt.uploaded_at,
        processing_status: receipt.processing_status,
        vendor_name: receipt.vendor_name,
        total_amount: receipt.total_amount,
        transaction_date: receipt.transaction_date,
        category_name: receipt.category_name,
        extraction_confidence: receipt.extraction_confidence,
        line_items: receipt.line_items ? 
          (typeof receipt.line_items === 'string' ? JSON.parse(receipt.line_items) : receipt.line_items) 
          : []
      }
    };

    res.json({
      receipt: formattedReceipt,
      processingLogs
    });
  } catch (error) {
    console.error('Receipt detail error:', error);
    res.status(500).json({
      error: 'Failed to retrieve receipt details'
    });
  }
});

/**
 * GET /api/expenses/receipts/:id/download
 * Download the original receipt file
 */
router.get('/receipts/:id/download', authenticateToken, async (req, res) => {
  try {
    const receiptId = req.params.id;

    const receipt = await db('expense_receipts')
      .where('id', receiptId)
      .where('user_id', req.user.id)
      .first();

    if (!receipt) {
      return res.status(404).json({
        error: 'Receipt not found'
      });
    }

    // Check if file exists
    const fs = require('fs-extra');
    if (!await fs.pathExists(receipt.file_path)) {
      return res.status(404).json({
        error: 'Receipt file not found on server'
      });
    }

    // Set appropriate headers for file download
    const path = require('path');
    const fileName = receipt.original_filename;
    const fileExtension = path.extname(fileName).toLowerCase();
    
    // Set content type based on file type
    let contentType = 'application/octet-stream';
    if (fileExtension === '.pdf') {
      contentType = 'application/pdf';
    } else if (['.jpg', '.jpeg'].includes(fileExtension)) {
      contentType = 'image/jpeg';
    } else if (fileExtension === '.png') {
      contentType = 'image/png';
    } else if (fileExtension === '.gif') {
      contentType = 'image/gif';
    } else if (fileExtension === '.webp') {
      contentType = 'image/webp';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', receipt.file_size);
    
    // Stream the file
    const fileStream = require('fs').createReadStream(receipt.file_path);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download file' });
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: 'Failed to download receipt'
    });
  }
});

/**
 * POST /api/expenses/receipts/:id/process
 * Trigger manual processing of a receipt
 */
router.post('/receipts/:id/process', authenticateToken, async (req, res) => {
  try {
    const receiptId = req.params.id;

    const receipt = await db('expense_receipts')
      .where('id', receiptId)
      .where('user_id', req.user.id)
      .first();

    if (!receipt) {
      return res.status(404).json({
        error: 'Receipt not found'
      });
    }

    if (receipt.processing_status === 'processing') {
      return res.status(409).json({
        error: 'Receipt is already being processed'
      });
    }

    // Add to processing queue
    const job = await receiptQueue.add('process-receipt', {
      receiptId: receipt.id,
      manualTrigger: true
    }, {
      priority: 10 // Higher priority for manual triggers
    });

    res.json({
      message: 'Receipt processing started',
      jobId: job.id,
      status: 'queued'
    });
  } catch (error) {
    console.error('Manual processing error:', error);
    res.status(500).json({
      error: 'Failed to start processing'
    });
  }
});

/**
 * POST /api/expenses/receipts/:id/approve
 * Approve or reject an expense
 */
router.post('/receipts/:id/approve', 
  authenticateToken, 
  requireAnyRole('admin', 'manager'),
  async (req, res) => {
    try {
      const receiptId = req.params.id;
      
      const { error, value } = approvalSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const expenseData = await db('expense_data')
        .where('receipt_id', receiptId)
        .first();

      if (!expenseData) {
        return res.status(404).json({
          error: 'Expense data not found'
        });
      }

      // Create or update approval record
      const approvalData = {
        expense_data_id: expenseData.id,
        receipt_id: receiptId,
        user_id: expenseData.user_id,
        organization_id: expenseData.organization_id,
        status: value.status,
        approver_id: req.user.id,
        approval_notes: value.notes,
        rejection_reason: value.rejectionReason,
        required_information: value.requiredInformation ? JSON.stringify(value.requiredInformation) : null,
        approved_amount: value.approvedAmount || expenseData.total_amount,
        requested_amount: expenseData.total_amount
      };

      if (value.status === 'approved') {
        approvalData.approved_at = new Date();
      } else if (value.status === 'rejected') {
        approvalData.rejected_at = new Date();
      }

      const [approval] = await db('expense_approvals')
        .insert(approvalData)
        .onConflict(['expense_data_id'])
        .merge()
        .returning('*');

      res.json({
        message: `Expense ${value.status} successfully`,
        approval
      });
    } catch (error) {
      console.error('Approval error:', error);
      res.status(500).json({
        error: 'Failed to process approval'
      });
    }
  }
);

/**
 * DELETE /api/expenses/receipts/:id
 * Delete a receipt
 */
router.delete('/receipts/:id', authenticateToken, async (req, res) => {
  try {
    const receiptId = req.params.id;
    
    await receiptProcessingService.deleteReceipt(receiptId, req.user.id);
    
    res.json({
      message: 'Receipt deleted successfully'
    });
  } catch (error) {
    console.error('Receipt deletion error:', error);
    
    if (error.message === 'Receipt not found or access denied') {
      return res.status(404).json({
        error: 'Receipt not found'
      });
    }

    res.status(500).json({
      error: 'Failed to delete receipt'
    });
  }
});

/**
 * GET /api/expenses/categories
 * Get expense categories
 */
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.id;
    
    const categories = await db('expense_categories')
      .where('organization_id', organizationId)
      .orWhere('is_default', true)
      .orderBy('name')
      .select('*');

    // Parse keywords JSON field
    const formattedCategories = categories.map(category => ({
      ...category,
      keywords: category.keywords ? JSON.parse(category.keywords) : []
    }));

    console.log('Retrieved categories from database:', formattedCategories.length);
    res.json({
      categories: formattedCategories
    });
  } catch (error) {
    console.error('Categories list error:', error);
    console.error('Error stack:', error.stack);
    
    // Fallback to default categories if database query fails
    const fallbackCategories = [
      {
        id: 'default-1',
        name: 'Food & Beverages',
        code: 'FOOD',
        color_code: '#10B981',
        description: 'Coffee, meals, catering',
        keywords: ['coffee', 'restaurant', 'starbucks', 'food', 'lunch', 'dinner', 'meal']
      },
      {
        id: 'default-2', 
        name: 'Office Supplies',
        code: 'OFFICE',
        color_code: '#3B82F6',
        description: 'Supplies, equipment, materials',
        keywords: ['supplies', 'paper', 'pens', 'office', 'equipment']
      },
      {
        id: 'default-3',
        name: 'Travel',
        code: 'TRAVEL', 
        color_code: '#8B5CF6',
        description: 'Transportation, hotels, flights',
        keywords: ['hotel', 'flight', 'travel', 'taxi', 'uber', 'gas']
      },
      {
        id: 'default-4',
        name: 'Equipment',
        code: 'EQUIPMENT',
        color_code: '#F59E0B',
        description: 'Hardware, tools, technology',
        keywords: ['computer', 'hardware', 'equipment', 'tools']
      },
      {
        id: 'default-5',
        name: 'Other',
        code: 'OTHER',
        color_code: '#6B7280', 
        description: 'Miscellaneous expenses',
        keywords: ['misc', 'other', 'general']
      }
    ];

    console.log('Using fallback categories due to error');
    res.json({
      categories: fallbackCategories
    });
  }
});

/**
 * GET /api/expenses/reports
 * Generate expense reports
 */
router.get('/reports', 
  authenticateToken,
  requireAnyRole('admin', 'manager'),
  async (req, res) => {
    try {
      const organizationId = req.user.organization_id || req.user.id;
      const { dateFrom, dateTo, groupBy = 'category' } = req.query;

      let query = db('expense_data')
        .join('expense_receipts', 'expense_data.receipt_id', 'expense_receipts.id')
        .join('users', 'expense_data.user_id', 'users.id')
        .leftJoin('expense_categories', 'expense_data.category_id', 'expense_categories.id')
        .where('expense_data.organization_id', organizationId);

      if (dateFrom) {
        query = query.where('expense_data.transaction_date', '>=', dateFrom);
      }

      if (dateTo) {
        query = query.where('expense_data.transaction_date', '<=', dateTo);
      }

      let groupByField, selectFields;
      
      switch (groupBy) {
        case 'category':
          groupByField = 'expense_categories.name';
          selectFields = [
            'expense_categories.name as group_name',
            'expense_categories.color_code as color'
          ];
          break;
        case 'user':
          groupByField = 'users.id';
          selectFields = [
            db.raw("CONCAT(users.first_name, ' ', users.last_name) as group_name"),
            db.raw("'#6B7280' as color")
          ];
          break;
        case 'month':
          groupByField = db.raw("DATE_TRUNC('month', expense_data.transaction_date)");
          selectFields = [
            db.raw("TO_CHAR(DATE_TRUNC('month', expense_data.transaction_date), 'YYYY-MM') as group_name"),
            db.raw("'#3B82F6' as color")
          ];
          break;
        default:
          return res.status(400).json({
            error: 'Invalid groupBy parameter',
            valid: ['category', 'user', 'month']
          });
      }

      const results = await query
        .select([
          ...selectFields,
          db.raw('COUNT(*) as receipt_count'),
          db.raw('SUM(expense_data.total_amount) as total_amount'),
          db.raw('AVG(expense_data.total_amount) as average_amount')
        ])
        .groupBy(groupByField, selectFields.map(f => f.split(' as ')[0]))
        .orderBy('total_amount', 'desc');

      const summary = await db('expense_data')
        .join('expense_receipts', 'expense_data.receipt_id', 'expense_receipts.id')
        .where('expense_data.organization_id', organizationId)
        .modify(queryBuilder => {
          if (dateFrom) queryBuilder.where('expense_data.transaction_date', '>=', dateFrom);
          if (dateTo) queryBuilder.where('expense_data.transaction_date', '<=', dateTo);
        })
        .select([
          db.raw('COUNT(*) as total_receipts'),
          db.raw('SUM(expense_data.total_amount) as total_amount'),
          db.raw('AVG(expense_data.total_amount) as average_amount'),
          db.raw('COUNT(CASE WHEN expense_receipts.processing_status = \'manual_review\' THEN 1 END) as manual_review_count')
        ])
        .first();

      res.json({
        summary,
        breakdown: results,
        groupBy,
        dateRange: { dateFrom, dateTo }
      });
    } catch (error) {
      console.error('Reports error:', error);
      res.status(500).json({
        error: 'Failed to generate report'
      });
    }
  }
);

/**
 * GET /api/expenses/queue/status
 * Get processing queue status
 */
router.get('/queue/status', 
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const waiting = await receiptQueue.waiting();
      const active = await receiptQueue.active();
      const completed = await receiptQueue.completed();
      const failed = await receiptQueue.failed();

      res.json({
        queue: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length
        }
      });
    } catch (error) {
      console.error('Queue status error:', error);
      res.status(500).json({
        error: 'Failed to get queue status'
      });
    }
  }
);

/**
 * POST /api/expenses/receipts/:id/assign-reimbursement
 * Assign a user to receive reimbursement for a receipt
 */
router.post('/receipts/:id/assign-reimbursement', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const receiptId = req.params.id;
    const { userId, notes } = req.body;

    // Validate input
    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required'
      });
    }

    // Check if receipt exists and get expense data
    const expenseData = await db('expense_data')
      .where('receipt_id', receiptId)
      .first();

    if (!expenseData) {
      return res.status(404).json({
        error: 'Expense data not found for this receipt'
      });
    }

    // Update expense data with reimbursement assignment
    await db('expense_data')
      .where('id', expenseData.id)
      .update({
        reimbursement_user_id: userId,
        reimbursement_notes: notes || null,
        is_reimbursable: true,
        updated_at: new Date()
      });

    // Get the updated data with user info
    const updatedExpense = await db('expense_data')
      .leftJoin('users', 'expense_data.reimbursement_user_id', 'users.id')
      .where('expense_data.id', expenseData.id)
      .select(
        'expense_data.*',
        'users.email as reimbursement_user_email'
      )
      .first();

    res.json({
      message: 'Reimbursement assignment updated successfully',
      expenseData: updatedExpense
    });
  } catch (error) {
    console.error('Error assigning reimbursement:', error);
    res.status(500).json({
      error: 'Failed to assign reimbursement'
    });
  }
});

/**
 * POST /api/expenses/receipts/:id/create-reimbursement
 * Create a reimbursement entry for an approved expense
 */
router.post('/receipts/:id/create-reimbursement', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const receiptId = req.params.id;
    const { 
      approvedAmount, 
      paymentMethod = 'payroll', 
      scheduledPayDate,
      payPeriod,
      notes 
    } = req.body;

    // Get expense data with approval info
    const expenseData = await db('expense_data')
      .leftJoin('expense_approvals', 'expense_data.id', 'expense_approvals.expense_data_id')
      .where('expense_data.receipt_id', receiptId)
      .where('expense_approvals.status', 'approved')
      .select(
        'expense_data.*',
        'expense_approvals.approved_amount as approval_amount'
      )
      .first();

    if (!expenseData) {
      return res.status(404).json({
        error: 'No approved expense found for this receipt'
      });
    }

    if (!expenseData.reimbursement_user_id) {
      return res.status(400).json({
        error: 'No user assigned for reimbursement'
      });
    }

    // Check if reimbursement already exists
    const existingReimbursement = await db('expense_reimbursements')
      .where('receipt_id', receiptId)
      .first();

    if (existingReimbursement) {
      return res.status(409).json({
        error: 'Reimbursement already exists for this receipt'
      });
    }

    // Create reimbursement entry
    const reimbursementData = {
      expense_data_id: expenseData.id,
      receipt_id: receiptId,
      reimbursement_user_id: expenseData.reimbursement_user_id,
      organization_id: expenseData.organization_id,
      approved_amount: approvedAmount || expenseData.approval_amount || expenseData.total_amount,
      payment_method: paymentMethod,
      scheduled_pay_date: scheduledPayDate ? new Date(scheduledPayDate) : null,
      pay_period: payPeriod,
      processed_by: req.user.id,
      processing_notes: notes,
      status: scheduledPayDate ? 'scheduled' : 'pending'
    };

    const [reimbursementId] = await db('expense_reimbursements')
      .insert(reimbursementData)
      .returning('id');

    // Create corresponding user earning entry
    const earningData = {
      user_id: expenseData.reimbursement_user_id,
      organization_id: expenseData.organization_id,
      earning_type: 'reimbursement',
      amount: reimbursementData.approved_amount,
      description: `Expense reimbursement: ${expenseData.description || expenseData.vendor_name}`,
      reference_id: reimbursementId,
      reference_type: 'expense_reimbursement',
      pay_period: payPeriod,
      earned_date: expenseData.transaction_date || new Date(),
      pay_date: scheduledPayDate ? new Date(scheduledPayDate) : null,
      payment_status: scheduledPayDate ? 'scheduled' : 'pending',
      processed_by: req.user.id,
      notes: notes
    };

    await db('user_earnings').insert(earningData);

    // Get the created reimbursement with user info
    const createdReimbursement = await db('expense_reimbursements')
      .leftJoin('users', 'expense_reimbursements.reimbursement_user_id', 'users.id')
      .where('expense_reimbursements.id', reimbursementId)
      .select(
        'expense_reimbursements.*',
        'users.email as reimbursement_user_email'
      )
      .first();

    res.json({
      message: 'Reimbursement created successfully',
      reimbursement: createdReimbursement
    });
  } catch (error) {
    console.error('Error creating reimbursement:', error);
    res.status(500).json({
      error: 'Failed to create reimbursement'
    });
  }
});

/**
 * GET /api/expenses/reimbursements
 * Get all reimbursements with filtering
 */
router.get('/reimbursements', authenticateToken, async (req, res) => {
  try {
    const { 
      status, 
      userId, 
      payPeriod, 
      page = 1, 
      limit = 50 
    } = req.query;

    let query = db('expense_reimbursements')
      .leftJoin('users', 'expense_reimbursements.reimbursement_user_id', 'users.id')
      .leftJoin('expense_data', 'expense_reimbursements.expense_data_id', 'expense_data.id')
      .leftJoin('expense_receipts', 'expense_reimbursements.receipt_id', 'expense_receipts.id')
      .select(
        'expense_reimbursements.*',
        'users.email as reimbursement_user_email',
        'expense_data.vendor_name',
        'expense_data.description as expense_description',
        'expense_data.transaction_date',
        'expense_receipts.original_filename'
      );

    // Apply filters
    if (status) {
      query = query.where('expense_reimbursements.status', status);
    }

    if (userId) {
      query = query.where('expense_reimbursements.reimbursement_user_id', userId);
    }

    if (payPeriod) {
      query = query.where('expense_reimbursements.pay_period', payPeriod);
    }

    // Only show reimbursements for user's organization unless admin
    if (req.user.role !== 'admin') {
      query = query.where('expense_reimbursements.organization_id', req.user.id);
    }

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.limit(parseInt(limit)).offset(offset);

    // Order by creation date
    query = query.orderBy('expense_reimbursements.created_at', 'desc');

    const reimbursements = await query;

    // Get total count for pagination
    const totalQuery = db('expense_reimbursements');
    if (status) totalQuery.where('status', status);
    if (userId) totalQuery.where('reimbursement_user_id', userId);
    if (payPeriod) totalQuery.where('pay_period', payPeriod);
    if (req.user.role !== 'admin') totalQuery.where('organization_id', req.user.id);
    
    const totalCount = await totalQuery.count('* as count').first();

    res.json({
      reimbursements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalCount.count),
        pages: Math.ceil(parseInt(totalCount.count) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching reimbursements:', error);
    res.status(500).json({
      error: 'Failed to fetch reimbursements'
    });
  }
});

/**
 * PUT /api/expenses/reimbursements/:id/status
 * Update reimbursement status (mark as paid, etc.)
 */
router.put('/reimbursements/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const reimbursementId = req.params.id;
    const { 
      status, 
      paidAmount,
      paymentReference,
      paidDate,
      notes 
    } = req.body;

    const validStatuses = ['pending', 'scheduled', 'paid', 'cancelled', 'disputed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status'
      });
    }

    const updateData = {
      status,
      updated_at: new Date()
    };

    if (status === 'paid') {
      updateData.reimbursed_amount = paidAmount;
      updateData.payment_reference = paymentReference;
      updateData.paid_date = paidDate ? new Date(paidDate) : new Date();
      updateData.paid_at = new Date();
    }

    if (notes) {
      updateData.processing_notes = notes;
    }

    await db('expense_reimbursements')
      .where('id', reimbursementId)
      .update(updateData);

    // Update corresponding user earning
    const earningUpdateData = {
      payment_status: status === 'paid' ? 'paid' : status,
      updated_at: new Date()
    };

    if (status === 'paid') {
      earningUpdateData.pay_date = updateData.paid_date;
    }

    await db('user_earnings')
      .where('reference_id', reimbursementId)
      .where('reference_type', 'expense_reimbursement')
      .update(earningUpdateData);

    const updatedReimbursement = await db('expense_reimbursements')
      .leftJoin('users', 'expense_reimbursements.reimbursement_user_id', 'users.id')
      .where('expense_reimbursements.id', reimbursementId)
      .select(
        'expense_reimbursements.*',
        'users.email as reimbursement_user_email'
      )
      .first();

    res.json({
      message: 'Reimbursement status updated successfully',
      reimbursement: updatedReimbursement
    });
  } catch (error) {
    console.error('Error updating reimbursement status:', error);
    res.status(500).json({
      error: 'Failed to update reimbursement status'
    });
  }
});

/**
 * GET /api/expenses/users/:userId/earnings
 * Get all earnings for a user (referee pay + reimbursements)
 */
router.get('/users/:userId/earnings', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { payPeriod, earningType, page = 1, limit = 50 } = req.query;

    // Check authorization
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        error: 'Not authorized to view these earnings'
      });
    }

    let query = db('user_earnings')
      .where('user_id', userId);

    if (payPeriod) {
      query = query.where('pay_period', payPeriod);
    }

    if (earningType) {
      query = query.where('earning_type', earningType);
    }

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.limit(parseInt(limit)).offset(offset);

    // Order by earned date
    query = query.orderBy('earned_date', 'desc');

    const earnings = await query;

    // Get total count
    const totalQuery = db('user_earnings').where('user_id', userId);
    if (payPeriod) totalQuery.where('pay_period', payPeriod);
    if (earningType) totalQuery.where('earning_type', earningType);
    
    const totalCount = await totalQuery.count('* as count').first();

    // Get summary by earning type
    const summaryQuery = db('user_earnings')
      .where('user_id', userId)
      .select('earning_type')
      .sum('amount as total_amount')
      .count('* as count')
      .groupBy('earning_type');

    if (payPeriod) {
      summaryQuery.where('pay_period', payPeriod);
    }

    const summary = await summaryQuery;

    res.json({
      earnings,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalCount.count),
        pages: Math.ceil(parseInt(totalCount.count) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching user earnings:', error);
    res.status(500).json({
      error: 'Failed to fetch user earnings'
    });
  }
});

module.exports = router;