const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');
const jwt = require('jsonwebtoken');

// Helper function to generate JWT tokens for testing
const generateToken = (user, expiresIn = '1d') => {
  return jwt.sign(
    { 
      userId: user.id, 
      id: user.id, // Add both for compatibility
      email: user.email, 
      role: user.role,
      roles: user.roles || [user.role]
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn }
  );
};

describe('Expense Reimbursement Workflow Integration Tests', () => {
  let testUser;
  let authToken;
  let adminUser;
  let adminToken;
  let testCategory;

  beforeAll(async () => {
    // Create test users
    const [user] = await db('users').insert({
      email: 'workflow-user@example.com',
      password_hash: 'hashed',
      role: 'referee'
    }).returning('*');

    testUser = user;
    authToken = generateToken({ id: user.id, email: user.email, role: user.role });

    const [admin] = await db('users').insert({
      email: 'workflow-admin@example.com',
      password_hash: 'hashed',
      role: 'admin'
    }).returning('*');

    adminUser = admin;
    adminToken = generateToken({ id: admin.id, email: admin.email, role: admin.role });

    // Create test category
    const [category] = await db('expense_categories').insert({
      organization_id: user.id,
      name: 'Workflow Test Category',
      code: 'WORKFLOW',
      keywords: JSON.stringify(['workflow', 'test']),
      active: true
    }).returning('*');

    testCategory = category;
  });

  afterAll(async () => {
    // Clean up all test data
    await db('user_earnings').where('user_id', testUser.id).del();
    await db('expense_reimbursements').where('reimbursement_user_id', testUser.id).del();
    await db('expense_approvals').where('user_id', testUser.id).del();
    await db('expense_data').where('user_id', testUser.id).del();
    await db('expense_receipts').where('user_id', testUser.id).del();
    await db('expense_categories').where('organization_id', testUser.id).del();
    await db('users').whereIn('id', [testUser.id, adminUser.id]).del();
  });

  describe('Complete Reimbursement Workflow', () => {
    let receiptId;
    let expenseDataId;
    let reimbursementId;

    test('Step 1: Create receipt and expense data', async () => {
      // Create receipt
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'workflow-receipt.pdf',
        file_path: '/tmp/workflow-receipt.pdf',
        file_type: 'pdf',
        mime_type: 'application/pdf',
        file_size: 2048,
        file_hash: 'workflow-hash',
        processing_status: 'processed'
      }).returning('*');

      receiptId = receipt.id;

      // Create expense data
      const [expenseData] = await db('expense_data').insert({
        receipt_id: receiptId,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'Workflow Vendor',
        total_amount: 150.75,
        transaction_date: '2024-01-15',
        category_id: testCategory.id,
        category_name: testCategory.name,
        description: 'Business lunch for client meeting'
      }).returning('*');

      expenseDataId = expenseData.id;

      expect(receiptId).toBeDefined();
      expect(expenseDataId).toBeDefined();
    });

    test('Step 2: Admin approves the expense', async () => {
      const response = await request(app)
        .post(`/api/expenses/receipts/${receiptId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved',
          notes: 'Approved for reimbursement',
          approvedAmount: 150.75
        })
        .expect(200);

      expect(response.body.message).toBe('Expense approved successfully');
      expect(response.body.approval.status).toBe('approved');
      expect(parseFloat(response.body.approval.approved_amount)).toBe(150.75);

      // Verify approval in database
      const approval = await db('expense_approvals')
        .where('expense_data_id', expenseDataId)
        .first();
      
      expect(approval.status).toBe('approved');
      expect(parseFloat(approval.approved_amount)).toBe(150.75);
    });

    test('Step 3: Admin assigns reimbursement to user', async () => {
      const response = await request(app)
        .post(`/api/expenses/receipts/${receiptId}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id,
          notes: 'Assigning reimbursement to employee who submitted expense'
        })
        .expect(200);

      expect(response.body.message).toBe('Reimbursement assignment updated successfully');
      expect(response.body.expenseData.reimbursement_user_id).toBe(testUser.id);
      expect(response.body.expenseData.is_reimbursable).toBe(true);

      // Verify assignment in database
      const expenseData = await db('expense_data')
        .where('id', expenseDataId)
        .first();
      
      expect(expenseData.reimbursement_user_id).toBe(testUser.id);
      expect(expenseData.is_reimbursable).toBe(true);
    });

    test('Step 4: Admin creates reimbursement entry', async () => {
      const response = await request(app)
        .post(`/api/expenses/receipts/${receiptId}/create-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvedAmount: 150.75,
          paymentMethod: 'direct_deposit',
          scheduledPayDate: '2024-02-15',
          payPeriod: '2024-02',
          notes: 'Scheduled for direct deposit in February pay period'
        })
        .expect(200);

      expect(response.body.message).toBe('Reimbursement created successfully');
      expect(response.body.reimbursement.status).toBe('scheduled');
      expect(parseFloat(response.body.reimbursement.approved_amount)).toBe(150.75);
      expect(response.body.reimbursement.payment_method).toBe('direct_deposit');

      reimbursementId = response.body.reimbursement.id;

      // Verify reimbursement in database
      const reimbursement = await db('expense_reimbursements')
        .where('id', reimbursementId)
        .first();
      
      expect(reimbursement.status).toBe('scheduled');
      expect(parseFloat(reimbursement.approved_amount)).toBe(150.75);
      expect(reimbursement.reimbursement_user_id).toBe(testUser.id);

      // Verify user earning was created
      const earning = await db('user_earnings')
        .where('reference_id', reimbursementId)
        .where('reference_type', 'expense_reimbursement')
        .first();
      
      expect(earning).toBeDefined();
      expect(parseFloat(earning.amount)).toBe(150.75);
      expect(earning.earning_type).toBe('reimbursement');
      expect(earning.payment_status).toBe('scheduled');
    });

    test('Step 5: Admin processes payment', async () => {
      const response = await request(app)
        .put(`/api/expenses/reimbursements/${reimbursementId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'paid',
          paidAmount: 150.75,
          paymentReference: 'DD-2024-02-15-001',
          paidDate: '2024-02-15',
          notes: 'Direct deposit processed successfully'
        })
        .expect(200);

      expect(response.body.message).toBe('Reimbursement status updated successfully');
      expect(response.body.reimbursement.status).toBe('paid');
      expect(parseFloat(response.body.reimbursement.reimbursed_amount)).toBe(150.75);
      expect(response.body.reimbursement.payment_reference).toBe('DD-2024-02-15-001');

      // Verify final state in database
      const reimbursement = await db('expense_reimbursements')
        .where('id', reimbursementId)
        .first();
      
      expect(reimbursement.status).toBe('paid');
      expect(parseFloat(reimbursement.reimbursed_amount)).toBe(150.75);
      expect(reimbursement.payment_reference).toBe('DD-2024-02-15-001');
      expect(reimbursement.paid_at).toBeDefined();

      // Verify user earning was updated
      const earning = await db('user_earnings')
        .where('reference_id', reimbursementId)
        .where('reference_type', 'expense_reimbursement')
        .first();
      
      expect(earning.payment_status).toBe('paid');
    });

    test('Step 6: Verify complete audit trail', async () => {
      // Check all related records exist and are properly linked
      const receipt = await db('expense_receipts').where('id', receiptId).first();
      const expenseData = await db('expense_data').where('receipt_id', receiptId).first();
      const approval = await db('expense_approvals').where('expense_data_id', expenseDataId).first();
      const reimbursement = await db('expense_reimbursements').where('receipt_id', receiptId).first();
      const earning = await db('user_earnings')
        .where('reference_id', reimbursementId)
        .where('reference_type', 'expense_reimbursement')
        .first();

      // Verify all records exist
      expect(receipt).toBeDefined();
      expect(expenseData).toBeDefined();
      expect(approval).toBeDefined();
      expect(reimbursement).toBeDefined();
      expect(earning).toBeDefined();

      // Verify proper linking
      expect(expenseData.receipt_id).toBe(receiptId);
      expect(approval.expense_data_id).toBe(expenseDataId);
      expect(reimbursement.expense_data_id).toBe(expenseDataId);
      expect(earning.reference_id).toBe(reimbursementId);

      // Verify final states
      expect(receipt.processing_status).toBe('processed');
      expect(approval.status).toBe('approved');
      expect(reimbursement.status).toBe('paid');
      expect(earning.payment_status).toBe('paid');
    });

    test('Step 7: User can view their earnings', async () => {
      const response = await request(app)
        .get(`/api/expenses/users/${testUser.id}/earnings`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.earnings).toHaveLength(1);
      
      const reimbursementEarning = response.body.earnings[0];
      expect(reimbursementEarning.earning_type).toBe('reimbursement');
      expect(parseFloat(reimbursementEarning.amount)).toBe(150.75);
      expect(reimbursementEarning.payment_status).toBe('paid');
      expect(reimbursementEarning.description).toContain('reimbursement');
    });
  });

  describe('Cross-User Authorization Workflow', () => {
    let employeeUser, employeeToken;
    let managerUser, managerToken;
    let receiptId;

    beforeAll(async () => {
      // Create employee user
      const [employee] = await db('users').insert({
        email: 'employee@example.com',
        password_hash: 'hashed',
        role: 'referee'
      }).returning('*');

      employeeUser = employee;
      employeeToken = generateToken({ id: employee.id, email: employee.email, role: employee.role });

      // Create manager user
      const [manager] = await db('users').insert({
        email: 'manager@example.com',
        password_hash: 'hashed',
        role: 'manager'
      }).returning('*');

      managerUser = manager;
      managerToken = generateToken({ id: manager.id, email: manager.email, role: manager.role });
    });

    afterAll(async () => {
      // Clean up
      await db('user_earnings').where('user_id', managerUser.id).del();
      await db('expense_reimbursements').where('reimbursement_user_id', managerUser.id).del();
      await db('expense_approvals').where('user_id', employeeUser.id).del();
      await db('expense_data').where('user_id', employeeUser.id).del();
      await db('expense_receipts').where('user_id', employeeUser.id).del();
      await db('users').whereIn('id', [employeeUser.id, managerUser.id]).del();
    });

    test('Employee submits expense, manager gets reimbursement', async () => {
      // Employee creates receipt and expense
      const [receipt] = await db('expense_receipts').insert({
        user_id: employeeUser.id,
        organization_id: employeeUser.id,
        original_filename: 'cross-user-receipt.pdf',
        file_path: '/tmp/cross-user-receipt.pdf',
        file_type: 'pdf',
        mime_type: 'application/pdf',
        file_size: 1024,
        file_hash: 'cross-user-hash',
        processing_status: 'processed'
      }).returning('*');

      receiptId = receipt.id;

      const [expenseData] = await db('expense_data').insert({
        receipt_id: receiptId,
        user_id: employeeUser.id,
        organization_id: employeeUser.id,
        vendor_name: 'Cross User Vendor',
        total_amount: 75.00,
        transaction_date: '2024-01-20',
        category_id: testCategory.id,
        description: 'Employee expense, manager reimbursement'
      }).returning('*');

      // Admin approves expense
      await request(app)
        .post(`/api/expenses/receipts/${receiptId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved',
          approvedAmount: 75.00
        })
        .expect(200);

      // Admin assigns reimbursement to manager (different from submitter)
      const assignResponse = await request(app)
        .post(`/api/expenses/receipts/${receiptId}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: managerUser.id,
          notes: 'Manager paid for employee expense, reimbursing manager'
        })
        .expect(200);

      expect(assignResponse.body.expenseData.reimbursement_user_id).toBe(managerUser.id);

      // Create reimbursement for manager
      const reimbursementResponse = await request(app)
        .post(`/api/expenses/receipts/${receiptId}/create-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvedAmount: 75.00,
          paymentMethod: 'check',
          payPeriod: '2024-02'
        })
        .expect(200);

      expect(reimbursementResponse.body.reimbursement.reimbursement_user_id).toBe(managerUser.id);

      // Verify manager has the earning, not the employee
      const managerEarnings = await request(app)
        .get(`/api/expenses/users/${managerUser.id}/earnings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(managerEarnings.body.earnings).toHaveLength(1);
      expect(parseFloat(managerEarnings.body.earnings[0].amount)).toBe(75.00);

      const employeeEarnings = await request(app)
        .get(`/api/expenses/users/${employeeUser.id}/earnings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(employeeEarnings.body.earnings).toHaveLength(0);
    });
  });

  describe('Error Recovery Workflows', () => {
    let receiptId, expenseDataId;

    beforeEach(async () => {
      // Create test data
      const [receipt] = await db('expense_receipts').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        original_filename: 'error-test-receipt.pdf',
        file_path: '/tmp/error-test-receipt.pdf',
        file_type: 'pdf',
        mime_type: 'application/pdf',
        file_size: 1024,
        file_hash: 'error-test-hash',
        processing_status: 'processed'
      }).returning('*');

      receiptId = receipt.id;

      const [expenseData] = await db('expense_data').insert({
        receipt_id: receiptId,
        user_id: testUser.id,
        organization_id: testUser.id,
        vendor_name: 'Error Test Vendor',
        total_amount: 100.00,
        transaction_date: '2024-01-25',
        category_id: testCategory.id
      }).returning('*');

      expenseDataId = expenseData.id;
    });

    afterEach(async () => {
      // Clean up
      await db('user_earnings').where('user_id', testUser.id).del();
      await db('expense_reimbursements').where('receipt_id', receiptId).del();
      await db('expense_approvals').where('receipt_id', receiptId).del();
      await db('expense_data').where('id', expenseDataId).del();
      await db('expense_receipts').where('id', receiptId).del();
    });

    test('Should handle rejected expense workflow', async () => {
      // Admin rejects expense
      const rejectResponse = await request(app)
        .post(`/api/expenses/receipts/${receiptId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'rejected',
          rejectionReason: 'Insufficient documentation'
        })
        .expect(200);

      expect(rejectResponse.body.approval.status).toBe('rejected');

      // Try to assign reimbursement (should fail since expense is rejected)
      await request(app)
        .post(`/api/expenses/receipts/${receiptId}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id
        })
        .expect(200); // This will still work, but reimbursement creation should fail

      // Try to create reimbursement (should fail)
      const reimbursementResponse = await request(app)
        .post(`/api/expenses/receipts/${receiptId}/create-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(404);

      expect(reimbursementResponse.body.error).toBe('No approved expense found for this receipt');
    });

    test('Should handle cancelled reimbursement workflow', async () => {
      // Approve expense
      await request(app)
        .post(`/api/expenses/receipts/${receiptId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved',
          approvedAmount: 100.00
        })
        .expect(200);

      // Assign and create reimbursement
      await request(app)
        .post(`/api/expenses/receipts/${receiptId}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id
        })
        .expect(200);

      const createResponse = await request(app)
        .post(`/api/expenses/receipts/${receiptId}/create-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      const reimbursementId = createResponse.body.reimbursement.id;

      // Cancel reimbursement
      const cancelResponse = await request(app)
        .put(`/api/expenses/reimbursements/${reimbursementId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'cancelled',
          notes: 'Cancelled due to budget constraints'
        })
        .expect(200);

      expect(cancelResponse.body.reimbursement.status).toBe('cancelled');

      // Verify user earning is also cancelled
      const earning = await db('user_earnings')
        .where('reference_id', reimbursementId)
        .where('reference_type', 'expense_reimbursement')
        .first();
      
      expect(earning.payment_status).toBe('cancelled');
    });
  });

  describe('Performance and Concurrency Tests', () => {
    test('Should handle multiple simultaneous reimbursement assignments', async () => {
      // Create multiple receipts
      const receipts = [];
      for (let i = 0; i < 5; i++) {
        const [receipt] = await db('expense_receipts').insert({
          user_id: testUser.id,
          organization_id: testUser.id,
          original_filename: `concurrent-receipt-${i}.pdf`,
          file_path: `/tmp/concurrent-receipt-${i}.pdf`,
          file_type: 'pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          file_hash: `concurrent-hash-${i}`,
          processing_status: 'processed'
        }).returning('*');

        await db('expense_data').insert({
          receipt_id: receipt.id,
          user_id: testUser.id,
          organization_id: testUser.id,
          vendor_name: `Concurrent Vendor ${i}`,
          total_amount: (i + 1) * 25.00,
          transaction_date: '2024-01-30',
          category_id: testCategory.id
        });

        // Approve expense
        await db('expense_approvals').insert({
          expense_data_id: receipt.id, // Using receipt.id as a proxy for expense_data.id
          receipt_id: receipt.id,
          user_id: testUser.id,
          organization_id: testUser.id,
          status: 'approved',
          approver_id: adminUser.id,
          approved_amount: (i + 1) * 25.00,
          requested_amount: (i + 1) * 25.00,
          approved_at: new Date()
        });

        receipts.push(receipt);
      }

      // Assign reimbursements concurrently
      const assignmentPromises = receipts.map(receipt => 
        request(app)
          .post(`/api/expenses/receipts/${receipt.id}/assign-reimbursement`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userId: testUser.id,
            notes: 'Concurrent assignment test'
          })
      );

      const results = await Promise.all(assignmentPromises);
      
      // All assignments should succeed
      results.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Reimbursement assignment updated successfully');
      });

      // Clean up
      for (const receipt of receipts) {
        await db('expense_approvals').where('receipt_id', receipt.id).del();
        await db('expense_data').where('receipt_id', receipt.id).del();
        await db('expense_receipts').where('id', receipt.id).del();
      }
    });
  });
});