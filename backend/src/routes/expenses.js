const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
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
  description: Joi.string().max(500).optional(),
  businessPurpose: Joi.string().max(200).optional(),
  projectCode: Joi.string().max(50).optional(),
  department: Joi.string().max(100).optional()
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
  authenticate,
  receiptUploader.single('receipt'),
  handleUploadErrors,
  fileUploadSecurity,
  virusScan,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please select a receipt file to upload'
        });
      }

      // Validate additional fields
      const { error, value } = uploadSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      // Save receipt file
      const receipt = await receiptProcessingService.saveReceiptFile(
        req.file, 
        req.user.id, 
        req.user.organization_id || req.user.id
      );

      // Add to processing queue for background processing
      const job = await receiptQueue.add('process-receipt', {
        receiptId: receipt.id,
        metadata: value
      }, {
        delay: 1000 // Small delay to ensure database consistency
      });

      res.status(201).json({
        message: 'Receipt uploaded successfully',
        receipt: {
          id: receipt.id,
          filename: receipt.original_filename,
          size: receipt.file_size,
          uploadedAt: receipt.uploaded_at,
          status: receipt.processing_status
        },
        jobId: job.id
      });
    } catch (error) {
      console.error('Receipt upload error:', error);
      
      if (error.message === 'Duplicate receipt detected') {
        return res.status(409).json({
          error: 'Duplicate receipt',
          message: 'This receipt has already been uploaded'
        });
      }

      res.status(500).json({
        error: 'Upload failed',
        message: 'An error occurred while uploading the receipt'
      });
    }
  }
);

/**
 * GET /api/expenses/receipts
 * List receipts with filtering and pagination
 */
router.get('/receipts', authenticate, async (req, res) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.details[0].message
      });
    }

    const { page, limit, status, category, dateFrom, dateTo, minAmount, maxAmount, search } = value;
    const offset = (page - 1) * limit;

    // Build query
    let query = db('expense_receipts')
      .leftJoin('expense_data', 'expense_receipts.id', 'expense_data.receipt_id')
      .leftJoin('expense_categories', 'expense_data.category_id', 'expense_categories.id')
      .where('expense_receipts.user_id', req.user.id)
      .select(
        'expense_receipts.*',
        'expense_data.vendor_name',
        'expense_data.total_amount',
        'expense_data.transaction_date',
        'expense_data.category_name',
        'expense_categories.color_code as category_color'
      );

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
        this.where('expense_data.vendor_name', 'ilike', `%${search}%`)
            .orWhere('expense_receipts.original_filename', 'ilike', `%${search}%`)
            .orWhere('expense_data.description', 'ilike', `%${search}%`);
      });
    }

    // Get total count
    const countQuery = query.clone();
    const [{ count: total }] = await countQuery.count('expense_receipts.id as count');

    // Get paginated results
    const receipts = await query
      .orderBy('expense_receipts.uploaded_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      receipts,
      pagination: {
        page,
        limit,
        total: parseInt(total),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Receipts list error:', error);
    res.status(500).json({
      error: 'Failed to retrieve receipts'
    });
  }
});

/**
 * GET /api/expenses/receipts/:id
 * Get detailed receipt information
 */
router.get('/receipts/:id', authenticate, async (req, res) => {
  try {
    const receiptId = req.params.id;

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

    res.json({
      receipt,
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
 * POST /api/expenses/receipts/:id/process
 * Trigger manual processing of a receipt
 */
router.post('/receipts/:id/process', authenticate, async (req, res) => {
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
  authenticate, 
  authorize(['admin', 'manager']),
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
router.delete('/receipts/:id', authenticate, async (req, res) => {
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
router.get('/categories', authenticate, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.id;

    const categories = await db('expense_categories')
      .where({ organization_id: organizationId, active: true })
      .orderBy('sort_order')
      .orderBy('name');

    res.json({
      categories
    });
  } catch (error) {
    console.error('Categories list error:', error);
    res.status(500).json({
      error: 'Failed to retrieve categories'
    });
  }
});

/**
 * GET /api/expenses/reports
 * Generate expense reports
 */
router.get('/reports', 
  authenticate,
  authorize(['admin', 'manager']),
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
  authenticate,
  authorize(['admin']),
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

module.exports = router;