const request = require('supertest');
const path = require('path');
const fs = require('fs-extra');
const app = require('../../src/app');
const db = require('../../src/config/database');
const { generateToken } = require('../../src/middleware/auth');
const approvalWorkflowService = require('../../src/services/approvalWorkflowService');
const paymentMethodService = require('../../src/services/paymentMethodService');

// Mock the queue processor and receipt processing service
jest.mock('../../src/services/queueProcessor', () => ({
  addReceiptProcessingJob: jest.fn().mockResolvedValue({ id: 'job-123' })
}));

jest.mock('../../src/services/receiptProcessingService', () => ({
  saveReceiptFile: jest.fn(),
  deleteReceipt: jest.fn()
}));

const receiptProcessingService = require('../../src/services/receiptProcessingService');

describe('Expense Payment Method Integration Tests', () => {
  let testUser, adminUser, managerUser;
  let userToken, adminToken, managerToken;
  let testPaymentMethods;
  let testPurchaseOrder;
  let testCreditCard;
  let testCategory;

  beforeAll(async () => {
    // Create test users
    const [user] = await db('users').insert({
      email: 'integration-user@example.com',
      password_hash: 'hashed',
      role: 'referee',
      first_name: 'Integration',
      last_name: 'User'
    }).returning('*');

    const [admin] = await db('users').insert({
      email: 'integration-admin@example.com',
      password_hash: 'hashed',
      role: 'admin',
      first_name: 'Integration',
      last_name: 'Admin'
    }).returning('*');

    const [manager] = await db('users').insert({
      email: 'integration-manager@example.com',
      password_hash: 'hashed',
      role: 'manager',
      first_name: 'Integration',
      last_name: 'Manager'
    }).returning('*');

    testUser = user;
    adminUser = admin;
    managerUser = manager;

    userToken = generateToken({ id: user.id, email: user.email, role: user.role });
    adminToken = generateToken({ id: admin.id, email: admin.email, role: admin.role });
    managerToken = generateToken({ id: manager.id, email: manager.email, role: manager.role });

    // Create test category
    const [category] = await db('expense_categories').insert({
      organization_id: user.id,
      name: 'Integration Test Category',
      code: 'INTEG',
      keywords: JSON.stringify(['integration', 'test']),
      active: true
    }).returning('*');

    testCategory = category;

    // Create test payment methods
    const paymentMethods = await Promise.all([
      // Auto-approval reimbursement method
      db('payment_methods').insert({
        organization_id: user.id,
        name: 'Auto Approval Reimbursement',
        type: 'person_reimbursement',
        is_active: true,
        requires_approval: false,
        auto_approval_limit: 200.00,
        spending_limit: 1000.00,
        required_fields: JSON.stringify(['receipt', 'business_purpose']),
        created_by: admin.id,
        updated_by: admin.id
      }).returning('*'),
      
      // Standard reimbursement requiring approval
      db('payment_methods').insert({
        organization_id: user.id,
        name: 'Standard Reimbursement',
        type: 'person_reimbursement',
        is_active: true,
        requires_approval: true,
        auto_approval_limit: 100.00,
        spending_limit: 2000.00,
        required_fields: JSON.stringify(['receipt', 'business_purpose']),
        created_by: admin.id,
        updated_by: admin.id
      }).returning('*'),
      
      // Credit card method
      db('payment_methods').insert({
        organization_id: user.id,
        name: 'Company Credit Card',
        type: 'credit_card',
        is_active: true,
        requires_approval: false,
        auto_approval_limit: 500.00,
        spending_limit: 5000.00,
        required_fields: JSON.stringify(['receipt']),
        created_by: admin.id,
        updated_by: admin.id
      }).returning('*'),
      
      // Purchase order method
      db('payment_methods').insert({
        organization_id: user.id,
        name: 'Purchase Order Method',
        type: 'purchase_order',
        is_active: true,
        requires_approval: true,
        requires_purchase_order: true,
        spending_limit: null,
        required_fields: JSON.stringify(['purchase_order_id', 'receipt']),
        created_by: admin.id,
        updated_by: admin.id
      }).returning('*'),
      
      // High-value direct vendor method
      db('payment_methods').insert({
        organization_id: user.id,
        name: 'Direct Vendor Payment',
        type: 'direct_vendor',
        is_active: true,
        requires_approval: true,
        auto_approval_limit: 0.00, // Always requires approval
        spending_limit: 10000.00,
        required_fields: JSON.stringify(['receipt', 'vendor_details']),
        created_by: admin.id,
        updated_by: admin.id
      }).returning('*')
    ]);

    testPaymentMethods = {
      autoApproval: paymentMethods[0][0],
      standard: paymentMethods[1][0],
      creditCard: paymentMethods[2][0],
      purchaseOrder: paymentMethods[3][0],
      directVendor: paymentMethods[4][0]
    };

    // Create test purchase order
    const [purchaseOrder] = await db('purchase_orders').insert({
      organization_id: user.id,
      po_number: 'PO-INTEG-001',
      vendor_name: 'Integration Test Vendor',
      description: 'Test purchase order for integration',
      estimated_amount: 1000.00,
      status: 'approved',
      requested_by: admin.id,
      line_items: JSON.stringify([
        { description: 'Test Item', quantity: 1, unitPrice: 1000, totalPrice: 1000 }
      ]),
      created_by: admin.id,
      updated_by: admin.id
    }).returning('*');

    testPurchaseOrder = purchaseOrder;

    // Create test company credit card
    const [creditCard] = await db('company_credit_cards').insert({
      organization_id: user.id,
      card_name: 'Integration Test Card',
      card_type: 'visa',
      last_four_digits: '9999',
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
    await db('expense_approvals').where('organization_id', testUser.id).del();
    await db('expense_data').where('organization_id', testUser.id).del();
    await db('expense_receipts').where('organization_id', testUser.id).del();
    await db('expense_categories').where('organization_id', testUser.id).del();
    await db('payment_methods').where('organization_id', testUser.id).del();
    await db('purchase_orders').where('organization_id', testUser.id).del();
    await db('company_credit_cards').where('organization_id', testUser.id).del();
    await db('users').whereIn('id', [testUser.id, adminUser.id, managerUser.id]).del();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Auto-Approval Workflow Integration', () => {
    test('should auto-approve low-value expense with auto-approval payment method', async () => {
      // Mock successful file save
      receiptProcessingService.saveReceiptFile.mockResolvedValue({
        id: 'auto-approval-receipt-123',
        original_filename: 'auto-approval-test.jpg',
        file_size: 1024,
        uploaded_at: new Date(),
        processing_status: 'uploaded'
      });

      const testFilePath = path.join(__dirname, 'auto-approval-test.jpg');
      await fs.writeFile(testFilePath, 'auto approval test content');

      const response = await request(app)
        .post('/api/expenses/receipts/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('receipt', testFilePath)
        .field('description', 'Small office expense')
        .field('paymentMethodId', testPaymentMethods.autoApproval.id)
        .field('businessPurpose', 'Office supplies for daily operations')
        .field('expenseUrgency', 'normal')
        .expect(201);

      expect(response.body.workflow).toBeDefined();
      expect(response.body.workflow.autoApproved).toBe(true);
      expect(response.body.workflow.workflowType).toBe('auto_approval');
      
      // Verify receipt was saved with payment method
      expect(receiptProcessingService.saveReceiptFile).toHaveBeenCalledWith(
        expect.objectContaining({
          originalname: 'auto-approval-test.jpg'
        }),
        testUser.id,
        testUser.id,
        expect.objectContaining({
          paymentMethodId: testPaymentMethods.autoApproval.id,
          businessPurpose: 'Office supplies for daily operations'
        })
      );

      await fs.remove(testFilePath);
    });

    test('should require approval for amount exceeding auto-approval limit', async () => {
      receiptProcessingService.saveReceiptFile.mockResolvedValue({
        id: 'high-value-receipt-123',
        original_filename: 'high-value-test.jpg',
        file_size: 1024,
        uploaded_at: new Date(),
        processing_status: 'uploaded'
      });

      // Create expense data that exceeds auto-approval limit
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'high-value-test.jpg',
        file_path: '/tmp/high-value-test.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'high-value-hash',
        processing_status: 'processed'
      }).returning('*');

      const [expenseData] = await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'High Value Vendor',
        total_amount: 300.00, // Exceeds auto-approval limit of 200
        transaction_date: '2024-01-15',
        category_id: testCategory.id,
        business_purpose: 'High value purchase'
      }).returning('*');

      // Assign payment method
      const paymentResponse = await request(app)
        .post(`/api/expenses/receipts/${receipt.id}/payment-method`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethodId: testPaymentMethods.autoApproval.id,
          expenseUrgency: 'normal'
        })
        .expect(200);

      expect(paymentResponse.body.workflow.autoApproved).toBeUndefined();
      expect(paymentResponse.body.workflow.totalStages).toBeGreaterThan(0);
      expect(paymentResponse.body.expenseData.paymentStatus).toBe('pending_approval');
    });
  });

  describe('Standard Approval Workflow Integration', () => {
    test('should create multi-stage approval workflow for standard payment method', async () => {
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'standard-approval.jpg',
        file_path: '/tmp/standard-approval.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'standard-hash',
        processing_status: 'processed'
      }).returning('*');

      const [expenseData] = await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'Standard Vendor',
        total_amount: 750.00,
        transaction_date: '2024-01-15',
        category_id: testCategory.id,
        business_purpose: 'Standard business expense'
      }).returning('*');

      const response = await request(app)
        .post(`/api/expenses/receipts/${receipt.id}/payment-method`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethodId: testPaymentMethods.standard.id,
          expenseUrgency: 'normal'
        })
        .expect(200);

      expect(response.body.workflow.totalStages).toBeGreaterThan(0);
      expect(response.body.workflow.stages[0].stageName).toBe('Manager Approval');
      
      // Verify approval records were created
      const approvals = await db('expense_approvals')
        .where('expense_data_id', expenseData.id);
      
      expect(approvals.length).toBeGreaterThan(0);
      expect(approvals[0].stage_status).toBe('pending');
      expect(approvals[0].stage_started_at).toBeDefined();
    });

    test('should progress workflow through approval stages', async () => {
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'workflow-progression.jpg',
        file_path: '/tmp/workflow-progression.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'workflow-hash',
        processing_status: 'processed'
      }).returning('*');

      const [expenseData] = await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'Workflow Vendor',
        total_amount: 1500.00, // High enough for multi-stage approval
        transaction_date: '2024-01-15',
        payment_method_id: testPaymentMethods.standard.id,
        payment_status: 'pending_approval'
      }).returning('*');

      // Create workflow
      const workflow = await approvalWorkflowService.determineWorkflow(
        expenseData,
        testPaymentMethods.standard,
        testUser
      );

      const approvals = await approvalWorkflowService.createApprovalWorkflow(
        expenseData.id,
        workflow,
        testUser
      );

      // Approve first stage
      const firstApprovalResponse = await request(app)
        .post(`/api/expenses/receipts/${receipt.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved',
          notes: 'First stage approved',
          approvedAmount: 1500.00
        })
        .expect(200);

      expect(firstApprovalResponse.body.message).toBe('Expense approved successfully');

      // Check if workflow progressed
      const updatedApprovals = await db('expense_approvals')
        .where('expense_data_id', expenseData.id)
        .orderBy('stage_number');

      expect(updatedApprovals[0].stage_status).toBe('approved');
      
      // If multi-stage, second stage should be started
      if (updatedApprovals.length > 1) {
        expect(updatedApprovals[1].stage_status).toBe('pending');
        expect(updatedApprovals[1].stage_started_at).toBeDefined();
      }
    });
  });

  describe('Credit Card Payment Integration', () => {
    test('should handle credit card expense with transaction tracking', async () => {
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'credit-card-expense.jpg',
        file_path: '/tmp/credit-card-expense.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'cc-hash',
        processing_status: 'processed'
      }).returning('*');

      const [expenseData] = await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'Travel Agency',
        total_amount: 450.00,
        transaction_date: '2024-01-15',
        category_id: testCategory.id,
        business_purpose: 'Business travel expense'
      }).returning('*');

      const response = await request(app)
        .post(`/api/expenses/receipts/${receipt.id}/payment-method`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethodId: testPaymentMethods.creditCard.id,
          creditCardId: testCreditCard.id,
          expenseUrgency: 'normal',
          vendorPaymentDetails: {
            transactionId: 'CC-TXN-12345',
            cardLastFour: '9999'
          }
        })
        .expect(200);

      expect(response.body.expenseData.creditCardId).toBe(testCreditCard.id);
      expect(response.body.expenseData.paymentStatus).toBe('approved'); // Auto-approved for credit card
      
      // Verify expense data was updated with credit card info
      const updated = await db('expense_data')
        .where('id', expenseData.id)
        .first();
      
      expect(updated.credit_card_id).toBe(testCreditCard.id);
      expect(updated.payment_method_id).toBe(testPaymentMethods.creditCard.id);
    });

    test('should validate credit card spending limits', async () => {
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'high-cc-expense.jpg',
        file_path: '/tmp/high-cc-expense.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'high-cc-hash',
        processing_status: 'processed'
      }).returning('*');

      const [expenseData] = await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'Expensive Vendor',
        total_amount: 6000.00, // Exceeds credit card spending limit
        transaction_date: '2024-01-15',
        category_id: testCategory.id
      }).returning('*');

      const response = await request(app)
        .post(`/api/expenses/receipts/${receipt.id}/payment-method`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethodId: testPaymentMethods.creditCard.id,
          creditCardId: testCreditCard.id,
          expenseUrgency: 'normal'
        })
        .expect(400);

      expect(response.body.error).toContain('spending limit');
    });
  });

  describe('Purchase Order Integration', () => {
    test('should validate purchase order requirements', async () => {
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'po-expense.jpg',
        file_path: '/tmp/po-expense.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'po-hash',
        processing_status: 'processed'
      }).returning('*');

      const [expenseData] = await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'PO Vendor',
        total_amount: 800.00,
        transaction_date: '2024-01-15',
        category_id: testCategory.id
      }).returning('*');

      const response = await request(app)
        .post(`/api/expenses/receipts/${receipt.id}/payment-method`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethodId: testPaymentMethods.purchaseOrder.id,
          purchaseOrderId: testPurchaseOrder.id,
          expenseUrgency: 'normal'
        })
        .expect(200);

      expect(response.body.expenseData.purchaseOrderId).toBe(testPurchaseOrder.id);
      expect(response.body.workflow.totalStages).toBeGreaterThan(0); // PO method requires approval
    });

    test('should reject purchase order payment without valid PO', async () => {
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'invalid-po.jpg',
        file_path: '/tmp/invalid-po.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'invalid-po-hash',
        processing_status: 'processed'
      }).returning('*');

      const [expenseData] = await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'Invalid PO Vendor',
        total_amount: 500.00,
        transaction_date: '2024-01-15'
      }).returning('*');

      const response = await request(app)
        .post(`/api/expenses/receipts/${receipt.id}/payment-method`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethodId: testPaymentMethods.purchaseOrder.id
          // Missing required purchaseOrderId
        })
        .expect(400);

      expect(response.body.error).toContain('purchase order');
    });
  });

  describe('Payment Method Auto-Detection Integration', () => {
    test('should auto-detect appropriate payment method from receipt data', async () => {
      const receiptData = {
        vendor_name: 'American Express Travel',
        total_amount: 275.50,
        category_id: testCategory.id,
        raw_ocr_text: 'AMERICAN EXPRESS credit card payment for business travel'
      };

      const suggestions = await paymentMethodService.detectPaymentMethod(
        receiptData,
        testUser,
        { urgency: 'normal' }
      );

      expect(suggestions.length).toBeGreaterThan(0);
      
      // Credit card method should be suggested for travel with credit card keywords
      const creditCardSuggestion = suggestions.find(
        s => s.paymentMethod.type === 'credit_card'
      );
      expect(creditCardSuggestion).toBeDefined();
      expect(creditCardSuggestion.confidence).toBeGreaterThan(0.3);
      expect(creditCardSuggestion.reasons).toContain(
        expect.stringMatching(/keyword match/i)
      );
    });

    test('should suggest different methods based on amount and context', async () => {
      const lowValueReceipt = {
        vendor_name: 'Office Supply Store',
        total_amount: 45.00,
        category_id: testCategory.id,
        raw_ocr_text: 'Receipt for office supplies purchased with personal funds'
      };

      const lowValueSuggestions = await paymentMethodService.detectPaymentMethod(
        lowValueReceipt,
        testUser
      );

      // Should prefer auto-approval methods for low value
      const autoApprovalSuggestions = lowValueSuggestions.filter(
        s => s.paymentMethod.autoApprovalLimit >= 45.00
      );
      expect(autoApprovalSuggestions.length).toBeGreaterThan(0);

      const highValueReceipt = {
        vendor_name: 'Equipment Supplier',
        total_amount: 2500.00,
        category_id: testCategory.id,
        raw_ocr_text: 'Invoice for computer equipment purchase'
      };

      const highValueSuggestions = await paymentMethodService.detectPaymentMethod(
        highValueReceipt,
        testUser
      );

      // Should suggest purchase order or direct vendor for high value
      const highValueMethods = highValueSuggestions.filter(
        s => s.paymentMethod.type === 'purchase_order' || s.paymentMethod.type === 'direct_vendor'
      );
      expect(highValueMethods.length).toBeGreaterThan(0);
    });
  });

  describe('Bulk Expense Processing Integration', () => {
    test('should process multiple expenses with same payment method', async () => {
      const bulkExpenses = {
        paymentMethodId: testPaymentMethods.autoApproval.id,
        expenses: [
          {
            receiptId: '00000000-0000-0000-0000-000000000001',
            amount: 25.50,
            vendorName: 'Coffee Shop',
            transactionDate: '2024-01-15',
            description: 'Team meeting refreshments',
            businessPurpose: 'Team building'
          },
          {
            receiptId: '00000000-0000-0000-0000-000000000002',
            amount: 45.75,
            vendorName: 'Office Supply Store',
            transactionDate: '2024-01-16',
            description: 'Stationery and supplies',
            businessPurpose: 'Office operations'
          },
          {
            receiptId: '00000000-0000-0000-0000-000000000003',
            amount: 125.00,
            vendorName: 'Tech Store',
            transactionDate: '2024-01-17',
            description: 'USB cables and adapters',
            businessPurpose: 'IT equipment'
          }
        ]
      };

      const response = await request(app)
        .post('/api/expenses/bulk-create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkExpenses)
        .expect(201);

      expect(response.body.created).toHaveLength(3);
      expect(response.body.summary.totalAmount).toBe(196.25);
      expect(response.body.summary.autoApproved).toBe(3); // All under auto-approval limit
      
      // Verify all expenses were created with correct payment method
      response.body.created.forEach(expense => {
        expect(expense.paymentMethodId).toBe(testPaymentMethods.autoApproval.id);
        expect(expense.paymentStatus).toBe('approved');
      });
    });

    test('should handle mixed approval requirements in bulk processing', async () => {
      const mixedExpenses = {
        paymentMethodId: testPaymentMethods.standard.id,
        expenses: [
          {
            receiptId: '00000000-0000-0000-0000-000000000004',
            amount: 75.00, // Under auto-approval limit
            vendorName: 'Small Vendor',
            transactionDate: '2024-01-15',
            description: 'Small expense'
          },
          {
            receiptId: '00000000-0000-0000-0000-000000000005',
            amount: 250.00, // Over auto-approval limit
            vendorName: 'Medium Vendor',
            transactionDate: '2024-01-16',
            description: 'Medium expense'
          }
        ]
      };

      const response = await request(app)
        .post('/api/expenses/bulk-create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mixedExpenses)
        .expect(201);

      expect(response.body.created).toHaveLength(2);
      expect(response.body.summary.autoApproved).toBe(1);
      expect(response.body.summary.requiresApproval).toBe(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle payment method validation failures gracefully', async () => {
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'invalid-method.jpg',
        file_path: '/tmp/invalid-method.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'invalid-hash',
        processing_status: 'processed'
      }).returning('*');

      const [expenseData] = await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'Error Test Vendor',
        total_amount: 100.00,
        transaction_date: '2024-01-15'
      }).returning('*');

      // Try to use non-existent payment method
      const response = await request(app)
        .post(`/api/expenses/receipts/${receipt.id}/payment-method`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethodId: '00000000-0000-0000-0000-000000000000',
          expenseUrgency: 'normal'
        })
        .expect(400);

      expect(response.body.error).toContain('payment method');
    });

    test('should handle approval workflow service failures', async () => {
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'workflow-error.jpg',
        file_path: '/tmp/workflow-error.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'workflow-error-hash',
        processing_status: 'processed'
      }).returning('*');

      const [expenseData] = await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'Workflow Error Vendor',
        total_amount: 500.00,
        transaction_date: '2024-01-15',
        payment_method_id: testPaymentMethods.standard.id,
        payment_status: 'pending_approval'
      }).returning('*');

      // Create approval with invalid approver
      const [approval] = await db('expense_approvals').insert({
        expense_data_id: expenseData.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        stage_number: 1,
        total_stages: 1,
        stage_status: 'pending',
        required_approvers: JSON.stringify([
          { id: 'invalid-user-id', name: 'Invalid User', role: 'admin' }
        ])
      }).returning('*');

      // Try to approve with wrong user
      const response = await request(app)
        .post(`/api/expenses/receipts/${receipt.id}/approve`)
        .set('Authorization', `Bearer ${userToken}`) // Not authorized approver
        .send({
          status: 'approved',
          notes: 'Should fail'
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    test('should handle concurrent payment method assignments', async () => {
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'concurrent-test.jpg',
        file_path: '/tmp/concurrent-test.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024,
        file_hash: 'concurrent-hash',
        processing_status: 'processed'
      }).returning('*');

      const [expenseData] = await db('expense_data').insert({
        receipt_id: receipt.id,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'Concurrent Vendor',
        total_amount: 150.00,
        transaction_date: '2024-01-15'
      }).returning('*');

      // Simulate concurrent requests
      const requests = Array(3).fill().map(() =>
        request(app)
          .post(`/api/expenses/receipts/${receipt.id}/payment-method`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            paymentMethodId: testPaymentMethods.autoApproval.id,
            expenseUrgency: 'normal'
          })
      );

      const responses = await Promise.allSettled(requests);
      
      // Only one should succeed
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      expect(successful).toHaveLength(1);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle payment method detection for multiple expenses efficiently', async () => {
      const startTime = Date.now();
      
      const expenseDataList = Array(10).fill().map((_, i) => ({
        vendor_name: `Vendor ${i}`,
        total_amount: 50 + (i * 10),
        category_id: testCategory.id,
        raw_ocr_text: `Receipt ${i} for business expense`
      }));

      const allSuggestions = await Promise.all(
        expenseDataList.map(data => 
          paymentMethodService.detectPaymentMethod(data, testUser)
        )
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (under 2 seconds)
      expect(duration).toBeLessThan(2000);
      expect(allSuggestions).toHaveLength(10);
      allSuggestions.forEach(suggestions => {
        expect(suggestions.length).toBeGreaterThan(0);
      });
    });

    test('should handle approval workflow creation for high-volume scenarios', async () => {
      const startTime = Date.now();

      // Create multiple expenses requiring approval
      const receipts = await Promise.all(
        Array(5).fill().map(async (_, i) => {
          const [receipt] = await db('expense_receipts').insert({
            user_id: testUser.id,
            organization_id: testUser.id,
            original_filename: `perf-test-${i}.jpg`,
            file_path: `/tmp/perf-test-${i}.jpg`,
            file_type: 'image',
            mime_type: 'image/jpeg',
            file_size: 1024,
            file_hash: `perf-hash-${i}`,
            processing_status: 'processed'
          }).returning('*');

          const [expenseData] = await db('expense_data').insert({
            receipt_id: receipt.id,
            user_id: testUser.id,
            organization_id: testUser.id,
            vendor_name: `Performance Vendor ${i}`,
            total_amount: 200 + (i * 50),
            transaction_date: '2024-01-15'
          }).returning('*');

          return { receipt, expenseData };
        })
      );

      // Assign payment methods concurrently
      const assignments = await Promise.all(
        receipts.map(({ receipt }) =>
          request(app)
            .post(`/api/expenses/receipts/${receipt.id}/payment-method`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              paymentMethodId: testPaymentMethods.standard.id,
              expenseUrgency: 'normal'
            })
        )
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);
      assignments.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.workflow).toBeDefined();
      });
    });
  });
});