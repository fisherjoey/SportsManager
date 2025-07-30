const request = require('supertest');
const path = require('path');
const fs = require('fs-extra');
const app = require('../../src/app');
const db = require('../../src/config/database');
const { generateToken } = require('../../src/middleware/auth');

// Mock the queue processor
jest.mock('../../src/services/queueProcessor', () => ({
  addReceiptProcessingJob: jest.fn().mockResolvedValue({ id: 'job-123' })
}));

// Mock receipt processing service
jest.mock('../../src/services/receiptProcessingService', () => ({
  saveReceiptFile: jest.fn(),
  deleteReceipt: jest.fn()
}));

const receiptProcessingService = require('../../src/services/receiptProcessingService');

describe('Expenses API', () => {
  let testUser;
  let authToken;
  let adminUser;
  let adminToken;
  let testCategory;

  beforeAll(async () => {
    // Create test user
    const [user] = await db('users').insert({
      email: 'test@example.com',
      password_hash: 'hashed',
      role: 'referee'
    }).returning('*');

    testUser = user;
    authToken = generateToken({ id: user.id, email: user.email, role: user.role });

    // Create admin user
    const [admin] = await db('users').insert({
      email: 'admin@example.com',
      password_hash: 'hashed',
      role: 'admin'
    }).returning('*');

    adminUser = admin;
    adminToken = generateToken({ id: admin.id, email: admin.email, role: admin.role });

    // Create test category
    const [category] = await db('expense_categories').insert({
      organization_id: user.id,
      name: 'Test Category',
      code: 'TEST',
      keywords: JSON.stringify(['test']),
      active: true
    }).returning('*');

    testCategory = category;
  });

  afterAll(async () => {
    // Clean up test data
    await db('expense_categories').where('organization_id', testUser.id).del();
    await db('users').whereIn('id', [testUser.id, adminUser.id]).del();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/expenses/receipts/upload', () => {
    test('should upload receipt successfully', async () => {
      // Mock successful file save
      receiptProcessingService.saveReceiptFile.mockResolvedValue({
        id: 'receipt-123',
        original_filename: 'test-receipt.jpg',
        file_size: 1024,
        uploaded_at: new Date(),
        processing_status: 'uploaded'
      });

      // Create a test file
      const testFilePath = path.join(__dirname, 'test-receipt.jpg');
      await fs.writeFile(testFilePath, 'dummy image content');

      const response = await request(app)
        .post('/api/expenses/receipts/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('receipt', testFilePath)
        .field('description', 'Test expense')
        .expect(201);

      expect(response.body.message).toBe('Receipt uploaded successfully');
      expect(response.body.receipt.id).toBe('receipt-123');
      expect(response.body.jobId).toBe('job-123');

      // Verify service was called
      expect(receiptProcessingService.saveReceiptFile).toHaveBeenCalledWith(
        expect.objectContaining({
          originalname: 'test-receipt.jpg'
        }),
        testUser.id,
        testUser.id
      );

      // Clean up test file
      await fs.remove(testFilePath);
    });

    test('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/expenses/receipts/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBe('No file uploaded');
    });

    test('should reject unsupported file type', async () => {
      const testFilePath = path.join(__dirname, 'test-file.txt');
      await fs.writeFile(testFilePath, 'text content');

      const response = await request(app)
        .post('/api/expenses/receipts/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('receipt', testFilePath)
        .expect(415);

      expect(response.body.error).toBe('Unsupported file type');

      await fs.remove(testFilePath);
    });

    test('should require authentication', async () => {
      await request(app)
        .post('/api/expenses/receipts/upload')
        .expect(401);
    });

    test('should handle duplicate receipts', async () => {
      receiptProcessingService.saveReceiptFile.mockRejectedValue(
        new Error('Duplicate receipt detected')
      );

      const testFilePath = path.join(__dirname, 'duplicate-receipt.jpg');
      await fs.writeFile(testFilePath, 'dummy image content');

      const response = await request(app)
        .post('/api/expenses/receipts/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('receipt', testFilePath)
        .expect(409);

      expect(response.body.error).toBe('Duplicate receipt');

      await fs.remove(testFilePath);
    });
  });

  describe('GET /api/expenses/receipts', () => {
    let testReceipt;

    beforeEach(async () => {
      // Create test receipt
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'test-receipt.jpg',
        file_path: '/tmp/test.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'test-hash',
        processing_status: 'processed'
      }).returning('*');

      testReceipt = receipt;

      // Create corresponding expense data
      await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'Test Vendor',
        total_amount: 25.50,
        transaction_date: '2024-01-15',
        category_id: testCategory.id,
        category_name: testCategory.name
      });
    });

    afterEach(async () => {
      if (testReceipt) {
        await db('expense_receipts').where('id', testReceipt.id).del();
      }
    });

    test('should list user receipts', async () => {
      const response = await request(app)
        .get('/api/expenses/receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.receipts).toHaveLength(1);
      expect(response.body.receipts[0].id).toBe(testReceipt.id);
      expect(response.body.receipts[0].vendor_name).toBe('Test Vendor');
      expect(response.body.pagination).toBeDefined();
    });

    test('should filter receipts by status', async () => {
      const response = await request(app)
        .get('/api/expenses/receipts?status=processed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.receipts).toHaveLength(1);
      expect(response.body.receipts[0].processing_status).toBe('processed');
    });

    test('should filter receipts by amount range', async () => {
      const response = await request(app)
        .get('/api/expenses/receipts?minAmount=20&maxAmount=30')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.receipts).toHaveLength(1);
    });

    test('should search receipts by vendor name', async () => {
      const response = await request(app)
        .get('/api/expenses/receipts?search=Test%20Vendor')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.receipts).toHaveLength(1);
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/api/expenses/receipts?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/expenses/receipts')
        .expect(401);
    });
  });

  describe('GET /api/expenses/receipts/:id', () => {
    let testReceipt;

    beforeEach(async () => {
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'detail-test.jpg',
        file_path: '/tmp/detail-test.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'detail-hash',
        processing_status: 'processed'
      }).returning('*');

      testReceipt = receipt;

      await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'Detail Vendor',
        total_amount: 15.75,
        transaction_date: '2024-01-20'
      });
    });

    afterEach(async () => {
      if (testReceipt) {
        await db('expense_receipts').where('id', testReceipt.id).del();
      }
    });

    test('should get receipt details', async () => {
      const response = await request(app)
        .get(`/api/expenses/receipts/${testReceipt.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.receipt.id).toBe(testReceipt.id);
      expect(response.body.receipt.vendor_name).toBe('Detail Vendor');
      expect(response.body.processingLogs).toBeDefined();
    });

    test('should return 404 for non-existent receipt', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .get(`/api/expenses/receipts/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should not allow access to other user receipts', async () => {
      // Create receipt for different user
      const [otherUser] = await db('users').insert({
        email: 'other@example.com',
        password_hash: 'hashed',
        role: 'admin'
      }).returning('*');

      const [otherReceipt] = await db('expense_receipts').insert({
        user_id: otherUser.id,
        organization_id: otherUser.id,
        original_filename: 'other-receipt.jpg',
        file_path: '/tmp/other.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'other-hash',
        processing_status: 'uploaded'
      }).returning('*');

      await request(app)
        .get(`/api/expenses/receipts/${otherReceipt.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Clean up
      await db('expense_receipts').where('id', otherReceipt.id).del();
      await db('users').where('id', otherUser.id).del();
    });
  });

  describe('POST /api/expenses/receipts/:id/approve', () => {
    let testReceipt, testExpenseData;

    beforeEach(async () => {
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'approval-test.jpg',
        file_path: '/tmp/approval-test.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'approval-hash',
        processing_status: 'processed'
      }).returning('*');

      testReceipt = receipt;

      const [expenseData] = await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'Approval Vendor',
        total_amount: 50.00,
        transaction_date: '2024-01-25'
      }).returning('*');

      testExpenseData = expenseData;
    });

    afterEach(async () => {
      if (testReceipt) {
        await db('expense_receipts').where('id', testReceipt.id).del();
      }
    });

    test('should approve expense as admin', async () => {
      const response = await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved',
          notes: 'Approved for payment',
          approvedAmount: 50.00
        })
        .expect(200);

      expect(response.body.message).toBe('Expense approved successfully');
      expect(response.body.approval.status).toBe('approved');

      // Verify approval record was created
      const approval = await db('expense_approvals')
        .where('expense_data_id', testExpenseData.id)
        .first();
      
      expect(approval.status).toBe('approved');
      expect(approval.approver_id).toBe(adminUser.id);
    });

    test('should reject expense as admin', async () => {
      const response = await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'rejected',
          rejectionReason: 'Invalid receipt'
        })
        .expect(200);

      expect(response.body.message).toBe('Expense rejected successfully');
    });

    test('should require admin role', async () => {
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'approved'
        })
        .expect(403);
    });

    test('should validate approval data', async () => {
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'invalid_status'
        })
        .expect(400);
    });
  });

  describe('DELETE /api/expenses/receipts/:id', () => {
    test('should delete receipt', async () => {
      receiptProcessingService.deleteReceipt.mockResolvedValue();

      const response = await request(app)
        .delete('/api/expenses/receipts/test-receipt-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Receipt deleted successfully');
      expect(receiptProcessingService.deleteReceipt).toHaveBeenCalledWith(
        'test-receipt-id',
        testUser.id
      );
    });

    test('should handle receipt not found', async () => {
      receiptProcessingService.deleteReceipt.mockRejectedValue(
        new Error('Receipt not found or access denied')
      );

      await request(app)
        .delete('/api/expenses/receipts/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/expenses/categories', () => {
    test('should list expense categories', async () => {
      const response = await request(app)
        .get('/api/expenses/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.categories).toHaveLength(1);
      expect(response.body.categories[0].name).toBe('Test Category');
      expect(response.body.categories[0].active).toBe(true);
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/expenses/categories')
        .expect(401);
    });
  });

  describe('GET /api/expenses/reports', () => {
    let testReceipt;

    beforeEach(async () => {
      // Create test data for reports
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'report-test.jpg',
        file_path: '/tmp/report-test.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'report-hash',
        processing_status: 'processed'
      }).returning('*');

      testReceipt = receipt;

      await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'Report Vendor',
        total_amount: 75.25,
        transaction_date: '2024-01-30',
        category_id: testCategory.id
      });
    });

    afterEach(async () => {
      if (testReceipt) {
        await db('expense_receipts').where('id', testReceipt.id).del();
      }
    });

    test('should generate expense reports as admin', async () => {
      const response = await request(app)
        .get('/api/expenses/reports?groupBy=category')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.summary).toBeDefined();
      expect(response.body.breakdown).toBeDefined();
      expect(response.body.groupBy).toBe('category');
    });

    test('should filter reports by date range', async () => {
      const response = await request(app)
        .get('/api/expenses/reports?dateFrom=2024-01-01&dateTo=2024-01-31&groupBy=month')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.dateRange.dateFrom).toBe('2024-01-01');
      expect(response.body.dateRange.dateTo).toBe('2024-01-31');
    });

    test('should require admin or manager role', async () => {
      await request(app)
        .get('/api/expenses/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    test('should validate groupBy parameter', async () => {
      await request(app)
        .get('/api/expenses/reports?groupBy=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});