import express, { Response, NextFunction } from 'express';
import Joi from 'joi';
import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import {
  AuthenticatedRequest,
  ReceiptUploadRequest,
  ReceiptUploadResponse,
  ReceiptQueryParams,
  ReceiptListResponse,
  FormattedReceipt,
  ApprovalRequest,
  BulkExpenseRequest,
  PaymentMethodSelectionRequest,
  ExpenseCreationRequest,
  ReimbursementCreationRequest,
  ReimbursementStatusUpdateRequest,
  ExpenseReceipt,
  ExpenseData,
  ExpenseCategory,
  LineItem,
  ProcessingResult,
  ExtractedData,
  QueueJob,
  QueueStatus,
  ApprovalDecision,
  WorkflowInfo,
  ExpenseApproval,
  ApprovalHistoryItem,
  ExpenseError
} from '../types/expenses.types';

const router = express.Router();

// Import dependencies
import db from '../config/database';
import {
  authenticateToken
} from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import {
  receiptUploader,
  fileUploadSecurity,
  handleUploadErrors,
  virusScan
} from '../middleware/fileUpload';
import receiptProcessingService from '../services/receiptProcessingService';
import approvalWorkflowService from '../services/ApprovalWorkflowService';
import paymentMethodService from '../services/paymentMethodService';
import { referenceCache, clearUserCache } from '../middleware/responseCache';
import { createQueue } from '../config/queue';

// Create processing queue for background jobs
const receiptQueue = createQueue('receipt processing', {
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
receiptQueue.process(async (job: any) => {
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
const uploadSchema = Joi.object<ReceiptUploadRequest>({
  description: Joi.string().max(500).allow('').optional(),
  businessPurpose: Joi.string().max(200).allow('').optional(),
  projectCode: Joi.string().max(50).allow('').optional(),
  department: Joi.string().max(100).allow('').optional(),
  paymentMethodId: Joi.string().uuid().optional(),
  purchaseOrderId: Joi.string().uuid().optional(),
  creditCardId: Joi.string().uuid().optional(),
  expenseUrgency: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  urgencyJustification: Joi.string().max(1000).optional()
});

const querySchema = Joi.object<ReceiptQueryParams>({
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

const approvalSchema = Joi.object<ApprovalRequest>({
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
  }),
  paymentDueDate: Joi.date().optional(),
  paymentReference: Joi.string().max(100).optional()
});

const bulkExpenseSchema = Joi.object<BulkExpenseRequest>({
  paymentMethodId: Joi.string().uuid().required(),
  expenses: Joi.array().items(Joi.object({
    receiptId: Joi.string().uuid().required(),
    amount: Joi.number().min(0).required(),
    vendorName: Joi.string().max(200).required(),
    transactionDate: Joi.date().required(),
    categoryId: Joi.string().uuid().optional(),
    description: Joi.string().max(500).optional(),
    businessPurpose: Joi.string().max(200).optional(),
    projectCode: Joi.string().max(50).optional(),
    creditCardTransactionId: Joi.string().max(100).optional(),
    vendorInvoiceNumber: Joi.string().max(100).optional()
  })).min(1).max(100)
});

const paymentMethodSelectionSchema = Joi.object<PaymentMethodSelectionRequest>({
  paymentMethodId: Joi.string().uuid().required(),
  purchaseOrderId: Joi.string().uuid().optional(),
  creditCardId: Joi.string().uuid().optional(),
  expenseUrgency: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  urgencyJustification: Joi.string().max(1000).optional(),
  vendorPaymentDetails: Joi.object().optional()
});

// Helper functions
const calculateFileHash = async (filePath: string): Promise<string> => {
  try {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  } catch (error) {
    console.error('Failed to calculate file hash:', error);
    throw new Error('Unable to process uploaded file');
  }
};

const parseLineItems = (lineItems: string | LineItem[] | null): LineItem[] => {
  if (!lineItems) {return [];}

  try {
    return typeof lineItems === 'string' ? JSON.parse(lineItems) : lineItems;
  } catch (parseError) {
    console.warn('Failed to parse line items:', parseError);
    return [];
  }
};

const formatReceipt = (receipt: any): FormattedReceipt => {
  const parsedLineItems = parseLineItems(receipt.line_items);

  return {
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
      items: parsedLineItems
    } : undefined,
    processedAt: receipt.processed_at,
    errorMessage: receipt.processing_notes && receipt.processing_status === 'failed'
      ? receipt.processing_notes
      : undefined
  };
};

/**
 * POST /api/expenses/receipts/upload
 * Upload a receipt file
 */
router.post('/receipts/upload',
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log('=== UPLOAD ROUTE START ===');
    console.log('Request method:', (req as any).method);
    console.log('Request path:', (req as any).path);
    console.log('Content-Type:', (req as any).headers['content-type']);
    console.log('Authorization header:', (req as any).headers.authorization ? 'Present' : 'Missing');
    next();
  },
  authenticateToken,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log('After auth - User:', req.user ? req.user.id : 'undefined');
    next();
  },
  receiptUploader.single('receipt'),
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log('After multer - File:', req.file ? req.file.originalname : 'no file');
    next();
  },
  handleUploadErrors,
  fileUploadSecurity,
  virusScan,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      console.log('Upload route - User:', req.user?.id || 'undefined');
      console.log('Upload route - File:', req.file ? req.file.originalname : 'no file');
      console.log('Upload route - Body:', (req as any).body);

      if (!req.file) {
        console.log('Upload route - No file provided');
        res.status(400).json({
          error: 'No file uploaded',
          message: 'Please select a receipt file to upload'
        });
        return;
      }

      // Validate additional fields
      console.log('Validating req.body:', (req as any).body);
      const { error, value } = uploadSchema.validate((req as any).body);
      if (error) {
        console.log('Validation error:', error.details[0].message);
        res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
        return;
      }
      console.log('Validation passed:', value);

      // Save receipt to database with improved error handling
      const receiptId = crypto.randomUUID();

      // Calculate file hash asynchronously for better performance
      const fileHash = await calculateFileHash((req as any).file.path);

      // Check for duplicate receipts
      try {
        const existingReceipt = await db('expense_receipts')
          .where('file_hash', fileHash)
          .where('user_id', (req as any).user.id)
          .first();

        if (existingReceipt) {
          // Clean up uploaded file
          await fs.remove((req as any).file.path);
          res.status(409).json({
            error: 'Duplicate receipt',
            message: 'This receipt has already been uploaded',
            existingReceiptId: (existingReceipt as any).id
          });
          return;
        }
      } catch (duplicateCheckError) {
        console.error('Duplicate check failed:', duplicateCheckError);
        // Continue with upload but log the error
      }

      let receipt: any;
      try {
        [receipt] = await db('expense_receipts').insert({
          id: receiptId,
          user_id: (req as any).user.id,
          organization_id: (req as any).user.organization_id || (req as any).user.id,
          original_filename: (req as any).file.originalname,
          file_path: (req as any).file.path,
          file_type: (req as any).file.mimetype.startsWith('image/') ? 'image' : 'pdf',
          mime_type: (req as any).file.mimetype,
          file_size: (req as any).file.size,
          file_hash: fileHash,
          processing_status: 'uploaded',
          processing_metadata: JSON.stringify({
            description: value.description || null,
            business_purpose: value.businessPurpose || null,
            project_code: value.projectCode || null,
            department: value.department || null,
            payment_method_id: value.paymentMethodId || null,
            purchase_order_id: value.purchaseOrderId || null,
            credit_card_id: value.creditCardId || null,
            expense_urgency: value.expenseUrgency || 'normal',
            urgency_justification: value.urgencyJustification || null
          })
        } as any).returning('*');
      } catch (dbError) {
        console.error('Database insert failed:', dbError);
        // Clean up uploaded file on database failure
        await fs.remove((req as any).file.path);
        res.status(500).json({
          error: 'Database error',
          message: 'Failed to save receipt information'
        });
        return;
      }

      console.log('Receipt saved to database:', receipt.original_filename);

      // Process immediately with improved error handling
      console.log('Starting immediate AI processing for:', receipt.original_filename);

      try {
        const results: ProcessingResult = await receiptProcessingService.processReceipt(receipt.id);
        console.log('AI processing completed successfully:', {
          receiptId: receipt.id,
          status: results.extractedData ? 'processed' : 'manual_review',
          confidence: results.extractedData?.confidence || 0
        });

        // Determine final status based on processing results
        const finalStatus = results.extractedData && results.extractedData.confidence && results.extractedData.confidence > 0.7
          ? 'processed'
          : results.extractedData
            ? 'manual_review'
            : 'failed';

        // PERFORMANCE OPTIMIZATION: Clear user cache when new receipt is added
        clearUserCache((req as any).user.id);

        const response: ReceiptUploadResponse = {
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
        };

        res.status(201).json(response);
      } catch (processingError) {
        console.error('AI processing failed for receipt:', receipt.id, processingError);

        // Update receipt status in database to reflect processing failure
        try {
          await db('expense_receipts')
            .where('id', receipt.id)
            .update({
              processing_status: 'failed',
              processing_notes: `Processing failed: ${(processingError as Error).message}`,
              processed_at: new Date()
            } as any);
        } catch (updateError) {
          console.error('Failed to update receipt status after processing error:', updateError);
        }

        const response: ReceiptUploadResponse = {
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
            error: (processingError as Error).message,
            fallbackMessage: 'Receipt saved but requires manual data entry'
          }
        };

        res.status(201).json(response);
      }
    } catch (error) {
      console.error('Receipt upload error:', error);
      console.error('Error stack:', (error as Error).stack);

      if ((error as Error).message === 'Duplicate receipt detected') {
        res.status(409).json({
          error: 'Duplicate receipt',
          message: 'This receipt has already been uploaded'
        });
        return;
      }

      res.status(500).json({
        error: 'Upload failed',
        message: 'An error occurred while uploading the receipt',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
);

/**
 * GET /api/expenses/receipts
 * List receipts with filtering and pagination - OPTIMIZED VERSION
 * Requires: expenses:read permission
 */
router.get('/receipts',
  authenticateToken,
  requireCerbosPermission({
    resource: 'expense',
    action: 'view:list',
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      console.log('GET /receipts - User:', (req as any).user.id);

      const { error, value } = querySchema.validate((req as any).query);
      if (error) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: error.details[0].message
        });
        return;
      }

      const { page, limit, status, category, dateFrom, dateTo, minAmount, maxAmount, search } = value;
      const offset = (page! - 1) * limit!;

      // PERFORMANCE OPTIMIZATION: Use more efficient query structure
      // Start with the most selective filter first (user_id)
      let baseQuery = db('expense_receipts')
        .where('expense_receipts.user_id', (req as any).user.id);

      // Apply status filter early for better index usage
      if (status) {
        baseQuery = baseQuery.where('expense_receipts.processing_status', status);
      }

      // OPTIMIZATION: Get count and data in parallel to reduce response time
      const countPromise = baseQuery.clone()
        .leftJoin('expense_data', 'expense_receipts.id', 'expense_data.receipt_id')
        .leftJoin('expense_categories', 'expense_data.category_id', 'expense_categories.id')
        .modify(queryBuilder => {
          // Apply all filters to count query
          if (category) {
            queryBuilder.where('expense_data.category_id', category);
          }
          if (dateFrom) {
            queryBuilder.where('expense_data.transaction_date', '>=', dateFrom);
          }
          if (dateTo) {
            queryBuilder.where('expense_data.transaction_date', '<=', dateTo);
          }
          if (minAmount) {
            queryBuilder.where('expense_data.total_amount', '>=', minAmount);
          }
          if (maxAmount) {
            queryBuilder.where('expense_data.total_amount', '<=', maxAmount);
          }
          if (search) {
            queryBuilder.where(function() {
              this.where('expense_receipts.original_filename', 'ilike', `%${search}%`)
                .orWhere('expense_data.vendor_name', 'ilike', `%${search}%`);
            });
          }
        })
        .count('expense_receipts.id as count')
        .first();

      // OPTIMIZATION: Build main query with better join order and selective fields
      const dataPromise = baseQuery.clone()
        .leftJoin('expense_data', 'expense_receipts.id', 'expense_data.receipt_id')
        .leftJoin('expense_categories', 'expense_data.category_id', 'expense_categories.id')
        .leftJoin('expense_approvals', 'expense_data.id', 'expense_approvals.expense_data_id')
        .modify(queryBuilder => {
          // Apply all filters
          if (category) {
            queryBuilder.where('expense_data.category_id', category);
          }
          if (dateFrom) {
            queryBuilder.where('expense_data.transaction_date', '>=', dateFrom);
          }
          if (dateTo) {
            queryBuilder.where('expense_data.transaction_date', '<=', dateTo);
          }
          if (minAmount) {
            queryBuilder.where('expense_data.total_amount', '>=', minAmount);
          }
          if (maxAmount) {
            queryBuilder.where('expense_data.total_amount', '<=', maxAmount);
          }
          if (search) {
            queryBuilder.where(function() {
              this.where('expense_receipts.original_filename', 'ilike', `%${search}%`)
                .orWhere('expense_data.vendor_name', 'ilike', `%${search}%`);
            });
          }
        })
        .select(
          // OPTIMIZATION: Select only required fields to reduce data transfer
          'expense_receipts.id',
          'expense_receipts.original_filename',
          'expense_receipts.uploaded_at',
          'expense_receipts.processing_status',
          'expense_receipts.file_type',
          'expense_receipts.file_size',
          'expense_receipts.raw_ocr_text',
          'expense_receipts.processed_at',
          'expense_receipts.processing_notes',
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
        .limit(limit!)
        .offset(offset);

      // Execute queries in parallel
      const [countResult, receipts] = await Promise.all([countPromise, dataPromise]);

      const total = parseInt((countResult as any).count as string);
      const totalPages = Math.ceil(total / limit!);

      // OPTIMIZATION: Efficient data transformation with minimal parsing
      const formattedReceipts: FormattedReceipt[] = receipts.map(formatReceipt);

      const response: ReceiptListResponse = {
        receipts: formattedReceipts,
        pagination: {
          page: page!,
          limit: limit!,
          total,
          totalPages
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Receipts list error:', error);
      console.error('Error stack:', (error as Error).stack);
      res.status(500).json({
        error: 'Failed to retrieve receipts',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
);

/**
 * GET /api/expenses/receipts/:id
 * Get detailed receipt information
 */
router.get('/receipts/:id',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const receiptId = (req as any).params.id;

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

        res.json({
          receipt: mockReceipt,
          processingLogs: []
        });
        return;
      }

      const receipt = await db('expense_receipts')
        .leftJoin('expense_data', 'expense_receipts.id', 'expense_data.receipt_id')
        .leftJoin('expense_categories', 'expense_data.category_id', 'expense_categories.id')
        .leftJoin('expense_approvals', 'expense_data.id', 'expense_approvals.expense_data_id')
        .where('expense_receipts.id', receiptId)
        .where('expense_receipts.user_id', (req as any).user.id)
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
        res.status(404).json({
          error: 'Receipt not found'
        });
        return;
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
          line_items: receipt.line_items ? parseLineItems(receipt.line_items) : []
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
  }
);

export default router;