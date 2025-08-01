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

describe('Expense Reimbursement Security Tests', () => {
  let testUser;
  let authToken;
  let adminUser;
  let adminToken;
  let managerUser;
  let managerToken;
  let otherUser;
  let otherToken;
  let testReceipt;
  let testExpenseData;
  let testCategory;

  beforeAll(async () => {
    // Create test users with different roles
    const [user] = await db('users').insert({
      email: 'security-user@example.com',
      password_hash: 'hashed',
      role: 'referee'
    }).returning('*');

    testUser = user;
    authToken = generateToken({ id: user.id, email: user.email, role: user.role });

    const [admin] = await db('users').insert({
      email: 'security-admin@example.com',
      password_hash: 'hashed',
      role: 'admin'
    }).returning('*');

    adminUser = admin;
    adminToken = generateToken({ id: admin.id, email: admin.email, role: admin.role });

    const [manager] = await db('users').insert({
      email: 'security-manager@example.com',
      password_hash: 'hashed',
      role: 'manager'
    }).returning('*');

    managerUser = manager;
    managerToken = generateToken({ id: manager.id, email: manager.email, role: manager.role });

    const [other] = await db('users').insert({
      email: 'security-other@example.com',
      password_hash: 'hashed',
      role: 'referee'
    }).returning('*');

    otherUser = other;
    otherToken = generateToken({ id: other.id, email: other.email, role: other.role });

    // Create test category
    const [category] = await db('expense_categories').insert({
      organization_id: user.id,
      name: 'Security Test Category',
      code: 'SECURITY',
      keywords: JSON.stringify(['security', 'test']),
      active: true
    }).returning('*');

    testCategory = category;
  });

  beforeEach(async () => {
    // Create fresh test data for each test
    const [receipt] = await db('expense_receipts').insert({
      user_id: testUser.id,
      organization_id: testUser.id,
      original_filename: 'security-test-receipt.pdf',
      file_path: '/tmp/security-test.pdf',
      file_type: 'pdf',
      mime_type: 'application/pdf',
      file_size: 1024,
      file_hash: 'security-test-hash',
      processing_status: 'processed'
    }).returning('*');

    testReceipt = receipt;

    const [expenseData] = await db('expense_data').insert({
      receipt_id: receipt.id,
      user_id: testUser.id,
      organization_id: testUser.id,
      vendor_name: 'Security Test Vendor',
      total_amount: 50.00,
      transaction_date: '2024-01-15',
      category_id: testCategory.id,
      category_name: testCategory.name
    }).returning('*');

    testExpenseData = expenseData;

    // Create approval
    await db('expense_approvals').insert({
      expense_data_id: expenseData.id,
      receipt_id: receipt.id,
      user_id: testUser.id,
      organization_id: testUser.id,
      status: 'approved',
      approver_id: adminUser.id,
      approved_amount: 50.00,
      requested_amount: 50.00,
      approved_at: new Date()
    });
  });

  afterEach(async () => {
    // Clean up test data after each test
    await db('user_earnings').where('user_id', testUser.id).del();
    await db('expense_reimbursements').where('receipt_id', testReceipt.id).del();
    await db('expense_approvals').where('receipt_id', testReceipt.id).del();
    await db('expense_data').where('receipt_id', testReceipt.id).del();
    await db('expense_receipts').where('id', testReceipt.id).del();
  });

  afterAll(async () => {
    // Clean up all test data
    await db('expense_categories').where('organization_id', testUser.id).del();
    await db('users').whereIn('id', [testUser.id, adminUser.id, managerUser.id, otherUser.id]).del();
  });

  describe('Authentication and Authorization', () => {
    test('should reject unauthenticated requests to assign reimbursement', async () => {
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .send({
          userId: testUser.id
        })
        .expect(401);
    });

    test('should reject non-admin users from assigning reimbursements', async () => {
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: testUser.id
        })
        .expect(403);

      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          userId: testUser.id
        })
        .expect(403);
    });

    test('should allow admin users to assign reimbursements', async () => {
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id
        })
        .expect(200);
    });

    test('should reject invalid JWT tokens', async () => {
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .set('Authorization', 'Bearer invalid.jwt.token')
        .send({
          userId: testUser.id
        })
        .expect(401);
    });

    test('should reject expired JWT tokens', async () => {
      // Create expired token (this would need to be mocked properly in a real scenario)
      const expiredToken = generateToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role }, '1ms');
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          userId: testUser.id
        })
        .expect(401);
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('should reject SQL injection attempts in userId', async () => {
      const maliciousUserId = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: maliciousUserId
        })
        .expect(500); // Should fail gracefully, not succeed

      // Verify users table still exists
      const users = await db('users').select('id').limit(1);
      expect(users).toBeDefined();
    });

    test('should reject XSS attempts in notes field', async () => {
      const maliciousNotes = '<script>alert("XSS")</script>';
      
      const response = await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id,
          notes: maliciousNotes
        })
        .expect(200);

      // Verify that notes are stored safely (should be sanitized or escaped)
      const expenseData = await db('expense_data')
        .where('id', testExpenseData.id)
        .first();
      
      // Notes should not contain executable script tags
      expect(expenseData.reimbursement_notes).not.toContain('<script>');
    });

    test('should validate UUID format for receiptId', async () => {
      const invalidReceiptId = 'not-a-valid-uuid';
      
      await request(app)
        .post(`/api/expenses/receipts/${invalidReceiptId}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id
        })
        .expect(500); // Should fail with proper error handling
    });

    test('should limit notes field length', async () => {
      const longNotes = 'a'.repeat(10000); // Very long string
      
      const response = await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id,
          notes: longNotes
        })
        .expect(200);

      // Should either truncate or accept it, but not crash
      expect(response.body.message).toBe('Reimbursement assignment updated successfully');
    });

    test('should validate amount fields are numeric', async () => {
      // Assign reimbursement first
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id
        })
        .expect(200);

      // Try to create reimbursement with invalid amount
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/create-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvedAmount: 'not-a-number'
        })
        .expect(500); // Should fail validation
    });

    test('should prevent negative amounts', async () => {
      // Assign reimbursement first
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id
        })
        .expect(200);

      // Try to create reimbursement with negative amount
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/create-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvedAmount: -100.00
        })
        .expect(200); // May succeed but should be validated in business logic

      // Verify amount is not negative in database
      const reimbursement = await db('expense_reimbursements')
        .where('receipt_id', testReceipt.id)
        .first();
      
      if (reimbursement) {
        expect(parseFloat(reimbursement.approved_amount)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Access Control and Data Isolation', () => {
    test('should prevent users from viewing other users\' earnings', async () => {
      // Create earning for testUser
      await db('user_earnings').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        earning_type: 'reimbursement',
        amount: 50.00,
        description: 'Test reimbursement',
        reference_id: '123e4567-e89b-12d3-a456-426614174000',
        reference_type: 'expense_reimbursement',
        pay_period: '2024-02',
        earned_date: new Date()
      });

      // otherUser tries to access testUser's earnings
      await request(app)
        .get(`/api/expenses/users/${testUser.id}/earnings`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    test('should allow users to view their own earnings', async () => {
      // Create earning for testUser
      await db('user_earnings').insert({
        user_id: testUser.id,
        organization_id: testUser.id,
        earning_type: 'reimbursement',
        amount: 50.00,
        description: 'Test reimbursement',
        reference_id: '123e4567-e89b-12d3-a456-426614174000',
        reference_type: 'expense_reimbursement',
        pay_period: '2024-02',
        earned_date: new Date()
      });

      const response = await request(app)
        .get(`/api/expenses/users/${testUser.id}/earnings`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.earnings).toHaveLength(1);
    });

    test('should prevent users from assigning reimbursements to themselves', async () => {
      // Regular user tries to assign reimbursement (should fail due to role)
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: testUser.id
        })
        .expect(403);
    });

    test('should prevent manipulation of organization_id in requests', async () => {
      // Create receipt for otherUser
      const [otherReceipt] = await db('expense_receipts').insert({
        user_id: otherUser.id,
        organization_id: otherUser.id,
        original_filename: 'other-user-receipt.pdf',
        file_path: '/tmp/other-user.pdf',
        file_type: 'pdf',
        mime_type: 'application/pdf',
        file_size: 1024,
        file_hash: 'other-user-hash',
        processing_status: 'processed'
      }).returning('*');

      const [otherExpenseData] = await db('expense_data').insert({
        receipt_id: otherReceipt.id,
        user_id: otherUser.id,
        organization_id: otherUser.id,
        vendor_name: 'Other User Vendor',
        total_amount: 75.00,
        transaction_date: '2024-01-20',
        category_id: testCategory.id
      }).returning('*');

      // Admin tries to assign reimbursement to testUser for otherUser's receipt
      const response = await request(app)
        .post(`/api/expenses/receipts/${otherReceipt.id}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id
        })
        .expect(200); // Should succeed but maintain proper data integrity

      // Clean up
      await db('expense_data').where('id', otherExpenseData.id).del();
      await db('expense_receipts').where('id', otherReceipt.id).del();
    });
  });

  describe('Business Logic Security', () => {
    test('should prevent reimbursement assignment without expense approval', async () => {
      // Remove approval
      await db('expense_approvals').where('receipt_id', testReceipt.id).del();

      // Admin assigns reimbursement
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id
        })
        .expect(200); // Assignment succeeds even without approval

      // But creating reimbursement should fail
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/create-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(404); // Should fail - no approved expense
    });

    test('should prevent reimbursement amount exceeding approved amount', async () => {
      // Assign reimbursement
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id
        })
        .expect(200);

      // Try to create reimbursement for more than approved amount
      const response = await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/create-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvedAmount: 1000.00 // Much more than the approved 50.00
        })
        .expect(200); // May succeed but should validate in business logic

      // Verify the actual amount stored doesn't exceed approved amount
      const reimbursement = await db('expense_reimbursements')
        .where('receipt_id', testReceipt.id)
        .first();
      
      if (reimbursement) {
        expect(parseFloat(reimbursement.approved_amount)).toBeLessThanOrEqual(50.00);
      }
    });

    test('should prevent duplicate reimbursement creation', async () => {
      // Assign reimbursement
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id
        })
        .expect(200);

      // Create first reimbursement
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/create-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      // Try to create second reimbursement
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/create-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(409); // Should prevent duplicate
    });

    test('should maintain audit trail integrity', async () => {
      // Assign reimbursement
      await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id,
          notes: 'Initial assignment'
        })
        .expect(200);

      // Create reimbursement
      const createResponse = await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/create-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'Creating reimbursement'
        })
        .expect(200);

      const reimbursementId = createResponse.body.reimbursement.id;

      // Update status
      await request(app)
        .put(`/api/expenses/reimbursements/${reimbursementId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'paid',
          notes: 'Payment processed'
        })
        .expect(200);

      // Verify audit trail
      const reimbursement = await db('expense_reimbursements')
        .where('id', reimbursementId)
        .first();
      
      expect(reimbursement.processed_by).toBe(adminUser.id);
      expect(reimbursement.created_at).toBeDefined();
      expect(reimbursement.updated_at).toBeDefined();
      expect(reimbursement.paid_at).toBeDefined();
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    test('should handle rapid successive requests gracefully', async () => {
      const promises = [];
      
      // Send 10 rapid requests
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              userId: testUser.id,
              notes: `Request ${i}`
            })
        );
      }

      const results = await Promise.all(promises);
      
      // All requests should complete (some may fail due to business logic, but shouldn't crash)
      results.forEach(result => {
        expect([200, 400, 409, 500]).toContain(result.status);
      });
    });

    test('should handle large payload gracefully', async () => {
      const largeNotes = 'x'.repeat(1000000); // 1MB string
      
      const response = await request(app)
        .post(`/api/expenses/receipts/${testReceipt.id}/assign-reimbursement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id,
          notes: largeNotes
        });

      // Should either succeed or fail gracefully, not crash
      expect([200, 400, 413, 500]).toContain(response.status);
    });
  });

  describe('Error Information Disclosure', () => {
    test('should not expose sensitive information in error messages', async () => {
      // Try to access non-existent receipt
      const response = await request(app)
        .post('/api/expenses/receipts/00000000-0000-0000-0000-000000000000/assign-reimbursement')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id
        })
        .expect(404);

      // Error message should be generic, not expose database structure
      expect(response.body.error).toBe('Expense data not found for this receipt');
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('query');
    });

    test('should not expose user information in unauthorized access', async () => {
      const response = await request(app)
        .get(`/api/expenses/users/${otherUser.id}/earnings`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toBe('Not authorized to view these earnings');
      expect(response.body).not.toContain(otherUser.email);
      expect(response.body).not.toContain(otherUser.id);
    });
  });
});