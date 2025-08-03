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

describe('Enhanced Expenses API', () => {
  let testUser;
  let authToken;
  let adminUser;
  let adminToken;
  let testCategory;
  let testPaymentMethod;
  let testPurchaseOrder;
  let testCreditCard;

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

    // Create test payment method
    const [paymentMethod] = await db('payment_methods').insert({
      organization_id: user.id,  
      name: 'Test Reimbursement Method',
      type: 'person_reimbursement',
      is_active: true,
      requires_approval: true,
      auto_approval_limit: 100.00,
      created_by: admin.id,
      updated_by: admin.id
    }).returning('*');

    testPaymentMethod = paymentMethod;

    // Create test purchase order
    const [purchaseOrder] = await db('purchase_orders').insert({
      organization_id: user.id,
      po_number: 'PO-TEST-001',
      vendor_name: 'Test Vendor',
      description: 'Test purchase order',
      estimated_amount: 500.00,
      status: 'approved',
      requested_by: admin.id,
      line_items: JSON.stringify([
        { description: 'Test Item', quantity: 1, unitPrice: 500, totalPrice: 500 }
      ]),
      created_by: admin.id,
      updated_by: admin.id
    }).returning('*');

    testPurchaseOrder = purchaseOrder;

    // Create test company credit card
    const [creditCard] = await db('company_credit_cards').insert({
      organization_id: user.id,
      card_name: 'Test Company Card',
      card_type: 'visa',
      last_four_digits: '1234',
      is_active: true,
      expiration_date: '2026-12-31',
      primary_holder_id: admin.id,
      created_by: admin.id,
      updated_by: admin.id
    }).returning('*');

    testCreditCard = creditCard;
  });

  afterAll(async () => {
    // Clean up test data
    await db('expense_categories').where('organization_id', testUser.id).del();
    await db('payment_methods').where('organization_id', testUser.id).del();
    await db('purchase_orders').where('organization_id', testUser.id).del();
    await db('company_credit_cards').where('organization_id', testUser.id).del();
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
        .field('paymentMethodId', testPaymentMethod.id)
        .field('businessPurpose', 'Testing expense upload')
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

  describe('Enhanced Payment Method Integration', () => {
    let testReceipt;

    beforeEach(async () => {
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'payment-test.jpg',
        file_path: '/tmp/payment-test.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'payment-hash',
        processing_status: 'processed'
      }).returning('*');

      testReceipt = receipt;
    });

    afterEach(async () => {
      if (testReceipt) {
        await db('expense_receipts').where('id', testReceipt.id).del();
      }
    });

    test('should upload receipt with payment method selection', async () => {
      receiptProcessingService.saveReceiptFile.mockResolvedValue({
        id: 'receipt-payment-123',
        original_filename: 'receipt-payment.jpg',
        file_size: 1024,
        uploaded_at: new Date(),
        processing_status: 'uploaded'
      });

      const testFilePath = path.join(__dirname, 'receipt-payment.jpg');
      await fs.writeFile(testFilePath, 'payment test content');

      const response = await request(app)
        .post('/api/expenses/receipts/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('receipt', testFilePath)
        .field('description', 'Test expense with payment method')
        .field('paymentMethodId', testPaymentMethod.id)
        .field('businessPurpose', 'Office supplies')
        .field('projectCode', 'PROJ-001')
        .field('expenseUrgency', 'normal')
        .expect(201);

      expect(response.body.receipt.paymentMethodId).toBe(testPaymentMethod.id);
      expect(response.body.receipt.businessPurpose).toBe('Office supplies');
      expect(response.body.workflow).toBeDefined();

      await fs.remove(testFilePath);
    });

    test('should validate payment method exists and is active', async () => {
      const testFilePath = path.join(__dirname, 'invalid-payment.jpg');
      await fs.writeFile(testFilePath, 'test content');

      const response = await request(app)
        .post('/api/expenses/receipts/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('receipt', testFilePath)
        .field('paymentMethodId', '00000000-0000-0000-0000-000000000000')
        .expect(400);

      expect(response.body.error).toBe('Invalid payment method');

      await fs.remove(testFilePath);
    });

    test('should trigger approval workflow based on payment method settings', async () => {
      // Create high-value payment method that requires approval
      const [highValueMethod] = await db('payment_methods').insert({
        organization_id: testUser.id,
        name: 'High Value Method',
        type: 'direct_vendor',
        is_active: true,
        requires_approval: true,
        auto_approval_limit: 50.00,
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      receiptProcessingService.saveReceiptFile.mockResolvedValue({
        id: 'receipt-approval-123',
        original_filename: 'receipt-approval.jpg',
        file_size: 1024,
        uploaded_at: new Date(),
        processing_status: 'uploaded'
      });

      const testFilePath = path.join(__dirname, 'receipt-approval.jpg');
      await fs.writeFile(testFilePath, 'approval test content');

      const response = await request(app)
        .post('/api/expenses/receipts/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('receipt', testFilePath)
        .field('description', 'High-value expense')
        .field('paymentMethodId', highValueMethod.id)
        .field('businessPurpose', 'Major purchase')
        .expect(201);

      expect(response.body.workflow).toBeDefined();
      expect(response.body.workflow.workflowName).toBeDefined();
      expect(response.body.requiresApproval).toBe(true);

      await fs.remove(testFilePath);
      await db('payment_methods').where('id', highValueMethod.id).del();
    });
  });

  describe('GET /api/expenses/payment-methods', () => {
    test('should list available payment methods for user', async () => {
      const response = await request(app)
        .get('/api/expenses/payment-methods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.paymentMethods).toHaveLength(1);
      expect(response.body.paymentMethods[0].name).toBe('Test Reimbursement Method');
      expect(response.body.paymentMethods[0].type).toBe('person_reimbursement');
      expect(response.body.paymentMethods[0].requiresApproval).toBe(true);
    });

    test('should filter payment methods by type', async () => {
      // Create additional payment method
      await db('payment_methods').insert({
        organization_id: testUser.id,
        name: 'Test Credit Card Method',
        type: 'credit_card',
        is_active: true,
        requires_approval: false,
        created_by: adminUser.id,
        updated_by: adminUser.id
      });

      const response = await request(app)
        .get('/api/expenses/payment-methods?type=person_reimbursement')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.paymentMethods).toHaveLength(1);
      expect(response.body.paymentMethods[0].type).toBe('person_reimbursement');
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/expenses/payment-methods')
        .expect(401);
    });
  });

  describe('Enhanced Approval Workflow', () => {
    let testReceipt, testExpenseData, testApproval;

    beforeEach(async () => {
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'enhanced-approval.jpg',
        file_path: '/tmp/enhanced-approval.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'enhanced-hash',
        processing_status: 'processed'
      }).returning('*');

      testReceipt = receipt;

      const [expenseData] = await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'Enhanced Vendor',
        total_amount: 750.00,
        transaction_date: '2024-01-15',
        payment_method_id: testPaymentMethod.id,
        payment_status: 'pending_approval'
      }).returning('*');

      testExpenseData = expenseData;

      const [approval] = await db('expense_approvals').insert({
        expense_data_id: expenseData.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        stage_number: 1,
        total_stages: 2,
        stage_status: 'pending',
        required_approvers: JSON.stringify([
          { id: adminUser.id, name: 'Admin User', role: 'admin' }
        ]),
        stage_started_at: new Date(),
        approval_limit: 1000.00,
        approval_conditions: JSON.stringify({
          requiresBusinessJustification: true,
          requiresReceiptValidation: true
        })
      }).returning('*');

      testApproval = approval;
    });

    afterEach(async () => {
      if (testReceipt) {
        await db('expense_receipts').where('id', testReceipt.id).del();
      }
    });

    test('should approve expense with enhanced workflow', async () => {
      const approvalData = {
        status: 'approved',
        notes: 'Approved with conditions',
        approvedAmount: 750.00,
        paymentReference: 'PAY-2024-001'
      };

      const response = await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(approvalData)
        .expect(200);

      expect(response.body.message).toBe('Expense approved successfully');
      expect(response.body.approval.status).toBe('approved');
      expect(response.body.workflowProgression).toBeDefined();

      // Check if workflow progressed to next stage or completed
      const updatedApproval = await db('expense_approvals')
        .where('id', testApproval.id)
        .first();
      expect(updatedApproval.stage_status).toBe('approved');
    });

    test('should require additional information', async () => {
      const approvalData = {
        status: 'requires_information',
        notes: 'Need more details about business purpose',
        requiredInformation: [
          'detailed_business_justification',
          'project_code_confirmation',
          'manager_pre_approval'
        ]
      };

      const response = await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(approvalData)
        .expect(200);

      expect(response.body.message).toBe('Additional information requested');
      expect(response.body.requiredInformation).toHaveLength(3);

      // Verify expense status updated
      const updated = await db('expense_data')
        .where('id', testExpenseData.id)
        .first();
      expect(updated.payment_status).toBe('requires_information');
    });
  });

  describe('Expense Analytics and Reporting', () => {
    beforeEach(async () => {
      // Create test expenses with different payment methods and statuses
      const receipts = await Promise.all([
        db('expense_receipts').insert({
          user_id: testUser.id,
          organization_id: testUser.id,
          original_filename: 'analytics1.jpg',
          file_path: '/tmp/analytics1.jpg',
          file_type: 'image',
          mime_type: 'image/jpeg',
          file_size: 1024,
          file_hash: 'analytics-hash-1',
          processing_status: 'processed'
        }).returning('*'),
        db('expense_receipts').insert({
          user_id: testUser.id,
          organization_id: testUser.id,
          original_filename: 'analytics2.jpg',
          file_path: '/tmp/analytics2.jpg',
          file_type: 'image',
          mime_type: 'image/jpeg',
          file_size: 1024,
          file_hash: 'analytics-hash-2',
          processing_status: 'processed'
        }).returning('*')
      ]);

      await Promise.all([
        db('expense_data').insert({
          receipt_id: receipts[0][0].id,
          user_id: testUser.id,
          organization_id: testUser.id,
          vendor_name: 'Analytics Vendor 1',
          total_amount: 125.00,
          transaction_date: '2024-01-15',
          payment_method_id: testPaymentMethod.id,
          payment_status: 'approved',
          category_id: testCategory.id
        }),
        db('expense_data').insert({
          receipt_id: receipts[1][0].id,
          user_id: testUser.id,
          organization_id: testUser.id,
          vendor_name: 'Analytics Vendor 2',
          total_amount: 275.50,
          transaction_date: '2024-01-16',
          payment_method_id: testPaymentMethod.id,
          payment_status: 'pending_approval',
          category_id: testCategory.id
        })
      ]);
    });

    test('should generate payment method analytics', async () => {
      const response = await request(app)
        .get('/api/expenses/reports?groupBy=paymentMethod')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.breakdown).toBeDefined();
      expect(response.body.summary.totalExpenses).toBe(400.50);
      expect(response.body.summary.approvedAmount).toBe(125.00);
      expect(response.body.summary.pendingAmount).toBe(275.50);
    });

    test('should generate workflow status analytics', async () => {
      const response = await request(app)
        .get('/api/expenses/reports?groupBy=approvalStatus')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.breakdown).toHaveProperty('approved');
      expect(response.body.breakdown).toHaveProperty('pending_approval');
      expect(response.body.summary.averageApprovalTime).toBeDefined();
    });

    test('should filter analytics by payment method', async () => {
      const response = await request(app)
        .get(`/api/expenses/reports?paymentMethodId=${testPaymentMethod.id}&groupBy=status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.filters.paymentMethodId).toBe(testPaymentMethod.id);
      expect(response.body.summary.totalExpenses).toBeGreaterThan(0);
    });
  });
});