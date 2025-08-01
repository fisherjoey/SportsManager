const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');
const { generateToken } = require('../../src/middleware/auth');

describe('Payment Methods API', () => {
  let testUser, adminUser, managerUser;
  let userToken, adminToken, managerToken;
  let testPaymentMethod;

  beforeAll(async () => {
    // Create test users
    const [user] = await db('users').insert({
      email: 'user@example.com',
      password_hash: 'hashed',
      role: 'referee',
      first_name: 'Test',
      last_name: 'User'
    }).returning('*');

    const [admin] = await db('users').insert({
      email: 'admin@example.com',
      password_hash: 'hashed',
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User'
    }).returning('*');

    const [manager] = await db('users').insert({
      email: 'manager@example.com',
      password_hash: 'hashed',
      role: 'manager',
      first_name: 'Manager',
      last_name: 'User'
    }).returning('*');

    testUser = user;
    adminUser = admin;
    managerUser = manager;

    userToken = generateToken({ id: user.id, email: user.email, role: user.role });
    adminToken = generateToken({ id: admin.id, email: admin.email, role: admin.role });
    managerToken = generateToken({ id: manager.id, email: manager.email, role: manager.role });
  });

  afterAll(async () => {
    // Clean up test data
    await db('payment_methods').where('organization_id', adminUser.id).del();
    await db('users').whereIn('id', [testUser.id, adminUser.id, managerUser.id]).del();
  });

  beforeEach(async () => {
    // Clean up payment methods before each test
    await db('payment_methods').where('organization_id', adminUser.id).del();
  });

  describe('GET /api/payment-methods', () => {
    beforeEach(async () => {
      // Create test payment methods
      const [paymentMethod] = await db('payment_methods').insert({
        organization_id: adminUser.id,
        name: 'Test Reimbursement',
        type: 'person_reimbursement',
        description: 'Test payment method for reimbursements',
        is_active: true,
        requires_approval: true,
        auto_approval_limit: 100.00,
        required_fields: JSON.stringify(['receipt', 'business_purpose']),
        accounting_code: 'REIMB-001',
        cost_center: 'IT',
        spending_limit: 500.00,
        spending_period: 'monthly',
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testPaymentMethod = paymentMethod;
    });

    test('should list payment methods for authenticated user', async () => {
      const response = await request(app)
        .get('/api/payment-methods')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.paymentMethods).toHaveLength(1);
      expect(response.body.paymentMethods[0].name).toBe('Test Reimbursement');
      expect(response.body.paymentMethods[0].type).toBe('person_reimbursement');
      expect(response.body.paymentMethods[0].isActive).toBe(true);
      expect(response.body.paymentMethods[0].requiredFields).toEqual(['receipt', 'business_purpose']);
      expect(response.body.pagination).toBeDefined();
    });

    test('should filter payment methods by type', async () => {
      // Create additional payment method of different type
      await db('payment_methods').insert({
        organization_id: adminUser.id,
        name: 'Test Credit Card',
        type: 'credit_card',
        description: 'Test credit card payment method',
        is_active: true,
        requires_approval: false,
        created_by: adminUser.id,
        updated_by: adminUser.id
      });

      const response = await request(app)
        .get('/api/payment-methods?type=person_reimbursement')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.paymentMethods).toHaveLength(1);
      expect(response.body.paymentMethods[0].type).toBe('person_reimbursement');
    });

    test('should filter payment methods by active status', async () => {
      // Create inactive payment method
      await db('payment_methods').insert({
        organization_id: adminUser.id,
        name: 'Inactive Method',
        type: 'purchase_order',
        is_active: false,
        created_by: adminUser.id,
        updated_by: adminUser.id
      });

      const response = await request(app)
        .get('/api/payment-methods?isActive=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.paymentMethods).toHaveLength(1);
      expect(response.body.paymentMethods[0].isActive).toBe(true);
    });

    test('should search payment methods by name', async () => {
      const response = await request(app)
        .get('/api/payment-methods?search=Test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.paymentMethods).toHaveLength(1);
      expect(response.body.paymentMethods[0].name).toContain('Test');
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/api/payment-methods?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.total).toBe(1);
    });

    test('should respect user restrictions for non-admin users', async () => {
      // Update payment method with user restrictions
      await db('payment_methods')
        .where('id', testPaymentMethod.id)
        .update({
          user_restrictions: JSON.stringify({
            allowedRoles: ['admin'],
            allowedUsers: []
          })
        });

      const response = await request(app)
        .get('/api/payment-methods')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.paymentMethods).toHaveLength(0);
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/payment-methods')
        .expect(401);
    });

    test('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/payment-methods?type=invalid_type')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toBe('Invalid query parameters');
    });
  });

  describe('POST /api/payment-methods', () => {
    const validPaymentMethod = {
      name: 'New Payment Method',
      type: 'person_reimbursement',
      description: 'A new payment method for testing',
      isActive: true,
      requiresApproval: true,
      autoApprovalLimit: 150.00,
      requiredFields: ['receipt', 'description'],
      accountingCode: 'TEST-001',
      costCenter: 'ADMIN',
      spendingLimit: 1000.00,
      spendingPeriod: 'monthly'
    };

    test('should create payment method as admin', async () => {
      const response = await request(app)
        .post('/api/payment-methods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPaymentMethod)
        .expect(201);

      expect(response.body.message).toBe('Payment method created successfully');
      expect(response.body.paymentMethod.name).toBe(validPaymentMethod.name);
      expect(response.body.paymentMethod.type).toBe(validPaymentMethod.type);
      expect(response.body.paymentMethod.requiredFields).toEqual(validPaymentMethod.requiredFields);

      // Verify in database
      const created = await db('payment_methods')
        .where('name', validPaymentMethod.name)
        .first();
      expect(created).toBeDefined();
      expect(created.organization_id).toBe(adminUser.id);
    });

    test('should validate payment method data', async () => {
      const invalidPaymentMethod = {
        name: '', // Empty name
        type: 'invalid_type', // Invalid type
        autoApprovalLimit: -10 // Negative limit
      };

      const response = await request(app)
        .post('/api/payment-methods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPaymentMethod)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    test('should prevent duplicate payment method names', async () => {
      // Create first payment method
      await request(app)
        .post('/api/payment-methods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPaymentMethod)
        .expect(201);

      // Try to create another with same name
      const response = await request(app)
        .post('/api/payment-methods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPaymentMethod)
        .expect(409);

      expect(response.body.error).toBe('Payment method with this name already exists');
    });

    test('should require admin role', async () => {
      await request(app)
        .post('/api/payment-methods')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validPaymentMethod)
        .expect(403);
    });

    test('should require authentication', async () => {
      await request(app)
        .post('/api/payment-methods')
        .send(validPaymentMethod)
        .expect(401);
    });

    test('should handle complex approval workflow configuration', async () => {
      const complexPaymentMethod = {
        ...validPaymentMethod,
        name: 'Complex Workflow Method',
        approvalWorkflow: {
          stages: [
            {
              name: 'Manager Approval',
              approvers: ['manager'],
              conditions: { maxAmount: 1000 }
            },
            {
              name: 'Finance Approval',
              approvers: ['finance'],
              conditions: { minAmount: 500 }
            }
          ]
        },
        userRestrictions: {
          allowedRoles: ['admin', 'manager'],
          allowedUsers: [testUser.id]
        }
      };

      const response = await request(app)
        .post('/api/payment-methods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(complexPaymentMethod)
        .expect(201);

      expect(response.body.paymentMethod.approvalWorkflow).toEqual(complexPaymentMethod.approvalWorkflow);
      expect(response.body.paymentMethod.userRestrictions).toEqual(complexPaymentMethod.userRestrictions);
    });
  });

  describe('GET /api/payment-methods/:id', () => {
    beforeEach(async () => {
      const [paymentMethod] = await db('payment_methods').insert({
        organization_id: adminUser.id,
        name: 'Detail Test Method',
        type: 'credit_card',
        description: 'Payment method for detail testing',
        is_active: true,
        requires_approval: false,
        integration_config: JSON.stringify({ cardProvider: 'Visa' }),
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testPaymentMethod = paymentMethod;
    });

    test('should get payment method details', async () => {
      const response = await request(app)
        .get(`/api/payment-methods/${testPaymentMethod.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.paymentMethod.id).toBe(testPaymentMethod.id);
      expect(response.body.paymentMethod.name).toBe('Detail Test Method');
      expect(response.body.paymentMethod.integrationConfig).toEqual({ cardProvider: 'Visa' });
    });

    test('should return 404 for non-existent payment method', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .get(`/api/payment-methods/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    test('should enforce user restrictions for non-admin users', async () => {
      // Update with user restrictions
      await db('payment_methods')
        .where('id', testPaymentMethod.id)
        .update({
          user_restrictions: JSON.stringify({
            allowedUsers: [adminUser.id],
            allowedRoles: []
          })
        });

      await request(app)
        .get(`/api/payment-methods/${testPaymentMethod.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    test('should allow access based on user role restrictions', async () => {
      // Update with role restrictions
      await db('payment_methods')
        .where('id', testPaymentMethod.id)
        .update({
          user_restrictions: JSON.stringify({
            allowedUsers: [],
            allowedRoles: ['referee']
          })
        });

      const response = await request(app)
        .get(`/api/payment-methods/${testPaymentMethod.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.paymentMethod.id).toBe(testPaymentMethod.id);
    });

    test('should require authentication', async () => {
      await request(app)
        .get(`/api/payment-methods/${testPaymentMethod.id}`)
        .expect(401);
    });
  });

  describe('PUT /api/payment-methods/:id', () => {
    beforeEach(async () => {
      const [paymentMethod] = await db('payment_methods').insert({
        organization_id: adminUser.id,
        name: 'Update Test Method',
        type: 'purchase_order',
        description: 'Payment method for update testing',
        is_active: true,
        requires_approval: true,
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testPaymentMethod = paymentMethod;
    });

    test('should update payment method as admin', async () => {
      const updateData = {
        name: 'Updated Payment Method',
        description: 'Updated description',
        isActive: false,
        autoApprovalLimit: 200.00,
        spendingLimit: 2000.00
      };

      const response = await request(app)
        .put(`/api/payment-methods/${testPaymentMethod.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Payment method updated successfully');
      expect(response.body.paymentMethod.name).toBe(updateData.name);
      expect(response.body.paymentMethod.isActive).toBe(false);
      expect(response.body.paymentMethod.autoApprovalLimit).toBe(200.00);

      // Verify in database
      const updated = await db('payment_methods')
        .where('id', testPaymentMethod.id)
        .first();
      expect(updated.name).toBe(updateData.name);
      expect(updated.is_active).toBe(false);
    });

    test('should validate update data', async () => {
      const invalidUpdate = {
        type: 'invalid_type',
        autoApprovalLimit: -50
      };

      const response = await request(app)
        .put(`/api/payment-methods/${testPaymentMethod.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    test('should prevent duplicate names during update', async () => {
      // Create another payment method
      await db('payment_methods').insert({
        organization_id: adminUser.id,
        name: 'Another Method',
        type: 'direct_vendor',
        created_by: adminUser.id,
        updated_by: adminUser.id
      });

      const response = await request(app)
        .put(`/api/payment-methods/${testPaymentMethod.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Another Method' })
        .expect(409);

      expect(response.body.error).toBe('Payment method with this name already exists');
    });

    test('should return 404 for non-existent payment method', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .put(`/api/payment-methods/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Update' })
        .expect(404);
    });

    test('should require admin role', async () => {
      await request(app)
        .put(`/api/payment-methods/${testPaymentMethod.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Unauthorized Update' })
        .expect(403);
    });

    test('should require authentication', async () => {
      await request(app)
        .put(`/api/payment-methods/${testPaymentMethod.id}`)
        .send({ name: 'Unauthenticated Update' })
        .expect(401);
    });
  });

  describe('DELETE /api/payment-methods/:id', () => {
    beforeEach(async () => {
      const [paymentMethod] = await db('payment_methods').insert({
        organization_id: adminUser.id,
        name: 'Delete Test Method',
        type: 'person_reimbursement',
        description: 'Payment method for delete testing',
        is_active: true,
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testPaymentMethod = paymentMethod;
    });

    test('should hard delete unused payment method', async () => {
      const response = await request(app)
        .delete(`/api/payment-methods/${testPaymentMethod.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Payment method deleted successfully');
      expect(response.body.deleted).toBe(true);

      // Verify deletion in database
      const deleted = await db('payment_methods')
        .where('id', testPaymentMethod.id)
        .first();
      expect(deleted).toBeUndefined();
    });

    test('should soft delete payment method in use', async () => {
      // Create expense data referencing this payment method
      await db('expense_data').insert({
        receipt_id: '00000000-0000-0000-0000-000000000001',
        user_id: testUser.id,
        organization_id: adminUser.id,
        payment_method_id: testPaymentMethod.id,
        vendor_name: 'Test Vendor',
        total_amount: 25.00,
        transaction_date: '2024-01-15'
      });

      const response = await request(app)
        .delete(`/api/payment-methods/${testPaymentMethod.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Payment method deactivated successfully (in use by existing expenses)');
      expect(response.body.deactivated).toBe(true);

      // Verify soft deletion in database
      const deactivated = await db('payment_methods')
        .where('id', testPaymentMethod.id)
        .first();
      expect(deactivated.is_active).toBe(false);
    });

    test('should return 404 for non-existent payment method', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .delete(`/api/payment-methods/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    test('should require admin role', async () => {
      await request(app)
        .delete(`/api/payment-methods/${testPaymentMethod.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    test('should require authentication', async () => {
      await request(app)
        .delete(`/api/payment-methods/${testPaymentMethod.id}`)
        .expect(401);
    });
  });

  describe('GET /api/payment-methods/:id/rules', () => {
    beforeEach(async () => {
      const [paymentMethod] = await db('payment_methods').insert({
        organization_id: adminUser.id,
        name: 'Rules Test Method',
        type: 'credit_card',
        is_active: true,
        requires_approval: true,
        auto_approval_limit: 250.00,
        spending_limit: 1500.00,
        approval_workflow: JSON.stringify({
          stages: [
            { name: 'Manager', limit: 500 },
            { name: 'Finance', limit: 2000 }
          ]
        }),
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      testPaymentMethod = paymentMethod;
    });

    test('should get approval rules for payment method', async () => {
      const response = await request(app)
        .get(`/api/payment-methods/${testPaymentMethod.id}/rules`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.paymentMethodId).toBe(testPaymentMethod.id);
      expect(response.body.approvalRules.requiresApproval).toBe(true);
      expect(response.body.approvalRules.autoApprovalLimit).toBe(250.00);
      expect(response.body.approvalRules.spendingLimit).toBe(1500.00);
      expect(response.body.approvalRules.workflow).toEqual({
        stages: [
          { name: 'Manager', limit: 500 },
          { name: 'Finance', limit: 2000 }
        ]
      });
    });

    test('should return 404 for non-existent payment method', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .get(`/api/payment-methods/${fakeId}/rules`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    test('should require authentication', async () => {
      await request(app)
        .get(`/api/payment-methods/${testPaymentMethod.id}/rules`)
        .expect(401);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed JSON in stored fields', async () => {
      // Insert payment method with malformed JSON (simulate data corruption)
      await db.raw(`
        INSERT INTO payment_methods (
          organization_id, name, type, approval_workflow, 
          required_fields, user_restrictions, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        adminUser.id, 'Malformed JSON Method', 'person_reimbursement',
        'invalid json', 'invalid json', 'invalid json',
        adminUser.id, adminUser.id
      ]);

      // Should handle gracefully and not crash
      const response = await request(app)
        .get('/api/payment-methods')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.paymentMethods).toHaveLength(1);
    });

    test('should handle extremely large query parameters', async () => {
      const largeSearch = 'x'.repeat(1000);
      
      await request(app)
        .get(`/api/payment-methods?search=${largeSearch}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    test('should handle concurrent payment method creation', async () => {
      const paymentMethodData = {
        name: 'Concurrent Test Method',
        type: 'person_reimbursement'
      };

      // Simulate concurrent requests
      const requests = Array(3).fill().map(() =>
        request(app)
          .post('/api/payment-methods')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(paymentMethodData)
      );

      const responses = await Promise.allSettled(requests);
      
      // One should succeed, others should fail with duplicate error
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failed = responses.filter(r => r.status === 'fulfilled' && r.value.status === 409);
      
      expect(successful).toHaveLength(1);
      expect(failed.length).toBeGreaterThan(0);
    });
  });
});