import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import fs from 'fs-extra';
import crypto from 'crypto';
import path from 'path';

// Mock dependencies
jest.mock('pg');
jest.mock('fs-extra');
jest.mock('crypto');
jest.mock('../../config/database');
jest.mock('../../services/receiptProcessingService');
jest.mock('../../services/approvalWorkflowService');
jest.mock('../../services/paymentMethodService');
jest.mock('../../middleware/responseCache');
jest.mock('../../config/queue');

// Import the modules after mocking
import db from '../../config/database';
import receiptProcessingService from '../../services/receiptProcessingService';
import approvalWorkflowService from '../../services/approvalWorkflowService';
import paymentMethodService from '../../services/paymentMethodService';
import { clearUserCache } from '../../middleware/responseCache';
import { createQueue } from '../../config/queue';

// Test setup
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock user for authentication
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  organization_id: 'org-123',
  roles: ['admin']
};

// Mock JWT token
const mockToken = jwt.sign(mockUser, 'test-secret');

// Mock database and services
const mockDb = {
  transaction: jest.fn(),
  where: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  first: jest.fn(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  clone: jest.fn().mockReturnThis(),
  count: jest.fn().mockReturnThis(),
  modify: jest.fn().mockReturnThis(),
  fn: { now: jest.fn() }
};

(db as jest.Mocked<any>) = mockDb;

const mockQueue = {
  add: jest.fn(),
  process: jest.fn()
};

(createQueue as jest.MockedFunction<typeof createQueue>).mockReturnValue(mockQueue as any);

// Test data
const mockReceipt = {
  id: 'receipt-123',
  user_id: 'user-123',
  organization_id: 'org-123',
  original_filename: 'test-receipt.pdf',
  file_path: '/uploads/test-receipt.pdf',
  file_type: 'pdf',
  mime_type: 'application/pdf',
  file_size: 1024,
  file_hash: 'abc123',
  processing_status: 'uploaded',
  uploaded_at: new Date(),
  processing_metadata: JSON.stringify({})
};

const mockExpenseData = {
  id: 'expense-123',
  receipt_id: 'receipt-123',
  user_id: 'user-123',
  organization_id: 'org-123',
  vendor_name: 'Test Vendor',
  total_amount: 100.00,
  transaction_date: new Date(),
  category_id: 'category-123',
  payment_method_id: 'payment-123',
  payment_status: 'pending'
};

describe('Expenses Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default database mocks
    mockDb.transaction.mockImplementation(async (callback) => {
      return await callback(mockDb);
    });

    // Mock file operations
    (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue(Buffer.from('test'));
    (fs.remove as jest.MockedFunction<typeof fs.remove>).mockResolvedValue();
    (fs.pathExists as jest.MockedFunction<typeof fs.pathExists>).mockResolvedValue(true);

    // Mock crypto operations
    const mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('abc123')
    };
    (crypto.createHash as jest.MockedFunction<typeof crypto.createHash>).mockReturnValue(mockHash as any);
    (crypto.randomUUID as jest.MockedFunction<typeof crypto.randomUUID>).mockReturnValue('new-uuid');
  });

  describe('POST /receipts/upload', () => {
    it('should successfully upload a receipt with valid data', async () => {
      // Arrange
      const mockFile = {
        originalname: 'test-receipt.pdf',
        path: '/uploads/test-receipt.pdf',
        mimetype: 'application/pdf',
        size: 1024
      };

      const uploadData = {
        description: 'Test expense',
        businessPurpose: 'Business meeting',
        projectCode: 'PROJ-001'
      };

      // Mock database operations
      mockDb.where.mockReturnValue({ first: jest.fn().mockResolvedValue(null) }); // No duplicate
      mockDb.insert.mockReturnValue({ returning: jest.fn().mockResolvedValue([mockReceipt]) });

      // Mock receipt processing
      (receiptProcessingService.processReceipt as jest.MockedFunction<any>).mockResolvedValue({
        extractedData: {
          vendor: 'Test Vendor',
          amount: 100.00,
          confidence: 0.9
        },
        totalProcessingTime: 2000,
        warnings: [],
        errors: []
      });

      // Import and mount routes after mocks are set up
      const expensesRouter = require('../expenses').default;
      app.use('/api/expenses', expensesRouter);

      // Act & Assert
      const response = await request(app)
        .post('/api/expenses/receipts/upload')
        .set('Authorization', `Bearer ${mockToken}`)
        .attach('receipt', Buffer.from('test pdf content'), 'test-receipt.pdf')
        .field('description', uploadData.description)
        .field('businessPurpose', uploadData.businessPurpose)
        .field('projectCode', uploadData.projectCode)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Receipt uploaded and processed successfully');
      expect(response.body).toHaveProperty('receipt');
      expect(response.body.receipt).toHaveProperty('id');
      expect(response.body.receipt).toHaveProperty('filename', 'test-receipt.pdf');
      expect(response.body).toHaveProperty('processing');
      expect(response.body.processing).toHaveProperty('success', true);
    });

    it('should return 400 when no file is uploaded', async () => {
      // Import and mount routes
      const expensesRouter = require('../expenses').default;
      app.use('/api/expenses', expensesRouter);

      const response = await request(app)
        .post('/api/expenses/receipts/upload')
        .set('Authorization', `Bearer ${mockToken}`)
        .field('description', 'Test without file')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'No file uploaded');
    });

    it('should return 409 when duplicate receipt is detected', async () => {
      // Arrange
      const mockFile = {
        originalname: 'duplicate-receipt.pdf',
        path: '/uploads/duplicate-receipt.pdf',
        mimetype: 'application/pdf',
        size: 1024
      };

      // Mock duplicate detection
      mockDb.where.mockReturnValue({
        first: jest.fn().mockResolvedValue({ id: 'existing-receipt-123' })
      });

      // Import and mount routes
      const expensesRouter = require('../expenses').default;
      app.use('/api/expenses', expensesRouter);

      const response = await request(app)
        .post('/api/expenses/receipts/upload')
        .set('Authorization', `Bearer ${mockToken}`)
        .attach('receipt', Buffer.from('test pdf content'), 'duplicate-receipt.pdf')
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Duplicate receipt');
      expect(response.body).toHaveProperty('existingReceiptId', 'existing-receipt-123');
    });

    it('should handle processing failures gracefully', async () => {
      // Arrange
      const mockFile = {
        originalname: 'failing-receipt.pdf',
        path: '/uploads/failing-receipt.pdf',
        mimetype: 'application/pdf',
        size: 1024
      };

      // Mock database operations
      mockDb.where.mockReturnValue({ first: jest.fn().mockResolvedValue(null) });
      mockDb.insert.mockReturnValue({ returning: jest.fn().mockResolvedValue([mockReceipt]) });

      // Mock processing failure
      (receiptProcessingService.processReceipt as jest.MockedFunction<any>).mockRejectedValue(
        new Error('Processing failed')
      );

      // Mock status update
      mockDb.update.mockResolvedValue([]);

      // Import and mount routes
      const expensesRouter = require('../expenses').default;
      app.use('/api/expenses', expensesRouter);

      const response = await request(app)
        .post('/api/expenses/receipts/upload')
        .set('Authorization', `Bearer ${mockToken}`)
        .attach('receipt', Buffer.from('test pdf content'), 'failing-receipt.pdf')
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Receipt uploaded successfully, but AI processing failed');
      expect(response.body).toHaveProperty('processing');
      expect(response.body.processing).toHaveProperty('success', false);
      expect(response.body.processing).toHaveProperty('error', 'Processing failed');
    });
  });

  describe('GET /receipts', () => {
    it('should return paginated receipts list', async () => {
      // Arrange
      const mockReceipts = [
        {
          id: 'receipt-1',
          original_filename: 'receipt1.pdf',
          uploaded_at: new Date(),
          processing_status: 'processed',
          file_type: 'pdf',
          file_size: 1024,
          vendor_name: 'Vendor 1',
          total_amount: 100.00,
          transaction_date: new Date(),
          category_name: 'Office Supplies',
          extraction_confidence: 0.9,
          line_items: JSON.stringify([])
        }
      ];

      const mockCount = [{ count: '1' }];

      // Mock database operations
      const mockQuery = {
        leftJoin: jest.fn().mockReturnThis(),
        modify: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockCount[0]),
        clone: jest.fn().mockReturnThis()
      };

      mockDb.where.mockReturnValue(mockQuery);

      // Mock parallel execution
      Promise.all = jest.fn().mockResolvedValue([mockCount, mockReceipts]);

      // Import and mount routes
      const expensesRouter = require('../expenses').default;
      app.use('/api/expenses', expensesRouter);

      const response = await request(app)
        .get('/api/expenses/receipts')
        .set('Authorization', `Bearer ${mockToken}`)
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body).toHaveProperty('receipts');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 20);
    });

    it('should apply status filter correctly', async () => {
      // Mock database operations
      const mockQuery = {
        leftJoin: jest.fn().mockReturnThis(),
        modify: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: '0' }),
        clone: jest.fn().mockReturnThis()
      };

      mockDb.where.mockReturnValue(mockQuery);
      Promise.all = jest.fn().mockResolvedValue([[{ count: '0' }], []]);

      // Import and mount routes
      const expensesRouter = require('../expenses').default;
      app.use('/api/expenses', expensesRouter);

      const response = await request(app)
        .get('/api/expenses/receipts')
        .set('Authorization', `Bearer ${mockToken}`)
        .query({ status: 'processed' })
        .expect(200);

      expect(response.body).toHaveProperty('receipts');
      expect(Array.isArray(response.body.receipts)).toBe(true);
    });
  });

  describe('GET /receipts/:id', () => {
    it('should return receipt details for valid ID', async () => {
      // Arrange
      const receiptId = 'receipt-123';
      const mockReceiptWithData = {
        ...mockReceipt,
        vendor_name: 'Test Vendor',
        total_amount: 100.00,
        transaction_date: new Date(),
        extraction_confidence: 0.9,
        line_items: JSON.stringify([])
      };

      const mockProcessingLogs = [
        {
          receipt_id: receiptId,
          started_at: new Date(),
          completed_at: new Date(),
          status: 'completed'
        }
      ];

      // Mock database operations
      const mockQuery = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockReceiptWithData),
        orderBy: jest.fn().mockReturnThis()
      };

      mockDb.where.mockReturnValue(mockQuery);
      mockDb.orderBy.mockResolvedValue(mockProcessingLogs);

      // Import and mount routes
      const expensesRouter = require('../expenses').default;
      app.use('/api/expenses', expensesRouter);

      const response = await request(app)
        .get(`/api/expenses/receipts/${receiptId}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('receipt');
      expect(response.body).toHaveProperty('processingLogs');
      expect(response.body.receipt).toHaveProperty('id', receiptId);
    });

    it('should return 404 for non-existent receipt', async () => {
      // Mock database operations
      const mockQuery = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      };

      mockDb.where.mockReturnValue(mockQuery);

      // Import and mount routes
      const expensesRouter = require('../expenses').default;
      app.use('/api/expenses', expensesRouter);

      const response = await request(app)
        .get('/api/expenses/receipts/non-existent-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Receipt not found');
    });
  });

  describe('DELETE /receipts/:id', () => {
    it('should successfully delete a receipt', async () => {
      // Mock receipt processing service
      (receiptProcessingService.deleteReceipt as jest.MockedFunction<any>).mockResolvedValue(undefined);

      // Import and mount routes
      const expensesRouter = require('../expenses').default;
      app.use('/api/expenses', expensesRouter);

      const response = await request(app)
        .delete('/api/expenses/receipts/receipt-123')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Receipt deleted successfully');
      expect(receiptProcessingService.deleteReceipt).toHaveBeenCalledWith('receipt-123', 'user-123');
    });

    it('should return 404 when receipt not found', async () => {
      // Mock receipt processing service to throw error
      (receiptProcessingService.deleteReceipt as jest.MockedFunction<any>).mockRejectedValue(
        new Error('Receipt not found or access denied')
      );

      // Import and mount routes
      const expensesRouter = require('../expenses').default;
      app.use('/api/expenses', expensesRouter);

      const response = await request(app)
        .delete('/api/expenses/receipts/non-existent-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Receipt not found');
    });
  });

  describe('GET /categories', () => {
    it('should return expense categories with caching', async () => {
      // Arrange
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Office Supplies',
          code: 'OFFICE',
          color_code: '#3B82F6',
          keywords: JSON.stringify(['office', 'supplies', 'paper'])
        },
        {
          id: 'cat-2',
          name: 'Travel',
          code: 'TRAVEL',
          color_code: '#8B5CF6',
          keywords: JSON.stringify(['travel', 'hotel', 'flight'])
        }
      ];

      // Mock database operations
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockCategories)
      };

      mockDb.where.mockReturnValue(mockQuery);

      // Import and mount routes
      const expensesRouter = require('../expenses').default;
      app.use('/api/expenses', expensesRouter);

      const response = await request(app)
        .get('/api/expenses/categories')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(response.body.categories.length).toBeGreaterThan(0);

      // Check that keywords are parsed from JSON
      response.body.categories.forEach((category: any) => {
        expect(Array.isArray(category.keywords)).toBe(true);
      });
    });

    it('should return fallback categories when database fails', async () => {
      // Mock database failure
      mockDb.where.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // Import and mount routes
      const expensesRouter = require('../expenses').default;
      app.use('/api/expenses', expensesRouter);

      const response = await request(app)
        .get('/api/expenses/categories')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(response.body.categories.length).toBe(5); // Fallback categories

      // Verify fallback category structure
      const firstCategory = response.body.categories[0];
      expect(firstCategory).toHaveProperty('id');
      expect(firstCategory).toHaveProperty('name');
      expect(firstCategory).toHaveProperty('code');
      expect(firstCategory).toHaveProperty('color_code');
      expect(firstCategory).toHaveProperty('keywords');
    });
  });

  describe('POST /:id/approve', () => {
    it('should successfully approve an expense', async () => {
      // Arrange
      const expenseId = 'expense-123';
      const approvalData = {
        status: 'approved',
        notes: 'Approved for payment',
        approvedAmount: 100.00
      };

      const mockPendingApproval = {
        id: 'approval-123',
        expense_data_id: expenseId,
        stage_status: 'pending',
        required_approvers: JSON.stringify([{ id: 'user-123', name: 'Test User' }])
      };

      const mockUpdatedApproval = {
        ...mockPendingApproval,
        stage_status: 'approved',
        approved_amount: 100.00,
        approval_notes: 'Approved for payment'
      };

      // Mock database operations
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockPendingApproval)
      };

      mockDb.where.mockReturnValue(mockQuery);

      // Mock approval workflow service
      (approvalWorkflowService.processApprovalDecision as jest.MockedFunction<any>).mockResolvedValue(mockUpdatedApproval);
      (approvalWorkflowService.getApprovalHistory as jest.MockedFunction<any>).mockResolvedValue([mockUpdatedApproval]);

      // Import and mount routes
      const expensesRouter = require('../expenses').default;
      app.use('/api/expenses', expensesRouter);

      const response = await request(app)
        .post(`/api/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(approvalData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Expense approved successfully');
      expect(response.body).toHaveProperty('approval');
      expect(response.body).toHaveProperty('workflow');
    });

    it('should return 404 when no pending approval found', async () => {
      // Mock database operations
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      };

      mockDb.where.mockReturnValue(mockQuery);

      // Import and mount routes
      const expensesRouter = require('../expenses').default;
      app.use('/api/expenses', expensesRouter);

      const response = await request(app)
        .post('/api/expenses/non-existent-expense/approve')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ status: 'approved' })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'No pending approval found for this user');
    });
  });
});