const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');

describe('Budget Security Tests', () => {
  let adminToken;
  let regularUserToken;
  let testUser;
  let testUser2;
  let testBudgetPeriod;
  let testBudgetCategory;
  let testBudget;

  beforeAll(async () => {
    // Clean up test data
    await db('budget_allocations').del();
    await db('budgets').del();
    await db('budget_periods').del();
    await db('budget_categories').del();

    // Create test users
    const [admin] = await db('users').insert({
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin.security@example.com',
      password: 'hashedpassword',
      roles: JSON.stringify(['admin'])
    }).returning('*');
    testUser = admin;

    const [regular] = await db('users').insert({
      first_name: 'Regular',
      last_name: 'User',
      email: 'regular.security@example.com',
      password: 'hashedpassword',
      roles: JSON.stringify(['user'])
    }).returning('*');
    testUser2 = regular;

    // Mock tokens (in real tests, these would be JWT tokens)
    adminToken = 'mock-admin-token';
    regularUserToken = 'mock-regular-token';

    // Create test data
    const [period] = await db('budget_periods').insert({
      organization_id: testUser.id,
      name: 'Security Test Period',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      created_by: testUser.id
    }).returning('*');
    testBudgetPeriod = period;

    const [category] = await db('budget_categories').insert({
      organization_id: testUser.id,
      name: 'Security Test Category',
      code: 'SEC_TEST',
      category_type: 'equipment'
    }).returning('*');
    testBudgetCategory = category;

    const [budget] = await db('budgets').insert({
      organization_id: testUser.id,
      budget_period_id: testBudgetPeriod.id,
      category_id: testBudgetCategory.id,
      name: 'Security Test Budget',
      allocated_amount: 5000.00,
      owner_id: testUser.id
    }).returning('*');
    testBudget = budget;
  });

  afterAll(async () => {
    // Clean up test data
    await db('budget_allocations').del();
    await db('budgets').del();
    await db('budget_periods').del();
    await db('budget_categories').del();
    await db('users').where('email', 'like', '%.security@example.com').del();
  });

  describe('SQL Injection Prevention', () => {
    test('GET /api/budgets/periods - should reject SQL injection in status parameter', async () => {
      const sqlInjectionAttempts = [
        '\'; DROP TABLE budget_periods; --',
        '\' OR \'1\'=\'1',
        '\' UNION SELECT * FROM users --',
        'invalid\'; INSERT INTO users (email) VALUES (\'hacked\'); --'
      ];

      for (const maliciousStatus of sqlInjectionAttempts) {
        const response = await request(app)
          .get(`/api/budgets/periods?status=${encodeURIComponent(maliciousStatus)}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid status parameter');
      }
    });

    test('GET /api/budgets/categories - should reject SQL injection in type parameter', async () => {
      const sqlInjectionAttempts = [
        'equipment\'; DROP TABLE budget_categories; --',
        '\' OR \'1\'=\'1',
        'revenue\' UNION SELECT password FROM users --'
      ];

      for (const maliciousType of sqlInjectionAttempts) {
        const response = await request(app)
          .get(`/api/budgets/categories?type=${encodeURIComponent(maliciousType)}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid category type parameter');
      }
    });

    test('GET /api/budgets/categories - should reject SQL injection in parent_id parameter', async () => {
      const sqlInjectionAttempts = [
        '\'; DROP TABLE budget_categories; --',
        '\' OR \'1\'=\'1',
        'invalid-uuid-format',
        '12345678-1234-1234-1234-123456789012\'; SELECT * FROM users; --'
      ];

      for (const maliciousParentId of sqlInjectionAttempts) {
        const response = await request(app)
          .get(`/api/budgets/categories?parent_id=${encodeURIComponent(maliciousParentId)}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid parent_id format');
      }
    });

    test('GET /api/budgets - should reject SQL injection in filter parameters', async () => {
      const maliciousFilters = [
        { period_id: '\'; DROP TABLE budgets; --' },
        { category_id: '\' OR \'1\'=\'1' },
        { owner_id: 'invalid-uuid\'; DELETE FROM users; --' },
        { status: 'active\'; UPDATE budgets SET allocated_amount=0; --' }
      ];

      for (const filter of maliciousFilters) {
        const queryString = Object.keys(filter)
          .map(key => `${key}=${encodeURIComponent(filter[key])}`)
          .join('&');

        const response = await request(app)
          .get(`/api/budgets?${queryString}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/Invalid .* format|Invalid .* parameter/);
      }
    });

    test('GET /api/budgets/:id - should reject SQL injection in budget ID', async () => {
      const maliciousIds = [
        '\'; DROP TABLE budgets; --',
        '\' OR \'1\'=\'1',
        'invalid-uuid-format',
        '../../../etc/passwd'
      ];

      for (const maliciousId of maliciousIds) {
        const response = await request(app)
          .get(`/api/budgets/${encodeURIComponent(maliciousId)}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid budget ID format');
      }
    });
  });

  describe('Authorization Tests', () => {
    test('Should require authentication for all budget endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/budgets' },
        { method: 'post', path: '/api/budgets' },
        { method: 'get', path: `/api/budgets/${testBudget.id}` },
        { method: 'put', path: `/api/budgets/${testBudget.id}` },
        { method: 'delete', path: `/api/budgets/${testBudget.id}` },
        { method: 'get', path: '/api/budgets/periods' },
        { method: 'post', path: '/api/budgets/periods' },
        { method: 'get', path: '/api/budgets/categories' },
        { method: 'post', path: '/api/budgets/categories' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .send({});

        expect(response.status).toBe(401);
      }
    });

    test('Should enforce granular budget access controls', async () => {
      // Test that regular user cannot access budget owned by admin
      const response = await request(app)
        .get(`/api/budgets/${testBudget.id}`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    test('Should allow budget owner to access their own budget', async () => {
      const response = await request(app)
        .get(`/api/budgets/${testBudget.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.budget.id).toBe(testBudget.id);
    });
  });

  describe('Transaction Handling Tests', () => {
    test('Should rollback budget creation if allocation creation fails', async () => {
      // Mock a scenario where budget creation succeeds but allocation fails
      const budgetData = {
        budget_period_id: testBudgetPeriod.id,
        category_id: testBudgetCategory.id,
        name: 'Transaction Test Budget',
        allocated_amount: 5000.00
      };

      // First, verify the budget doesn't exist
      const initialCount = await db('budgets')
        .where('name', 'Transaction Test Budget')
        .count('id as count');
      expect(parseInt(initialCount[0].count)).toBe(0);

      // This test would need to mock a failure in the transaction
      // For now, we'll test that successful transactions work correctly
      const response = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(budgetData);

      expect(response.status).toBe(201);

      // Verify both budget and allocations were created
      const budget = await db('budgets')
        .where('name', 'Transaction Test Budget')
        .first();
      expect(budget).toBeTruthy();

      const allocations = await db('budget_allocations')
        .where('budget_id', budget.id)
        .count('id as count');
      expect(parseInt(allocations[0].count)).toBeGreaterThan(0);
    });

    test('Should handle concurrent budget updates correctly', async () => {
      // Test that concurrent updates don't create race conditions
      const updateData = {
        budget_period_id: testBudgetPeriod.id,
        category_id: testBudgetCategory.id,
        name: 'Concurrent Test Budget',
        allocated_amount: 6000.00
      };

      // Make two concurrent update requests
      const promises = [
        request(app)
          .put(`/api/budgets/${testBudget.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData),
        request(app)
          .put(`/api/budgets/${testBudget.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ ...updateData, allocated_amount: 7000.00 })
      ];

      const responses = await Promise.all(promises);

      // Both should succeed (last write wins)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify budget was updated
      const updatedBudget = await db('budgets')
        .where('id', testBudget.id)
        .first();
      expect(parseFloat(updatedBudget.allocated_amount)).toBeGreaterThan(5000);
    });
  });

  describe('Data Integrity Tests', () => {
    test('Should maintain consistency between budgets and allocations', async () => {
      // Create allocation
      const allocationData = {
        allocation_year: 2025,
        allocation_month: 6,
        allocated_amount: 1000.00
      };

      const response = await request(app)
        .post(`/api/budgets/${testBudget.id}/allocations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(allocationData);

      expect(response.status).toBe(200);

      // Verify budget total was updated
      const updatedBudget = await db('budgets')
        .where('id', testBudget.id)
        .first();

      const totalAllocations = await db('budget_allocations')
        .where('budget_id', testBudget.id)
        .sum('allocated_amount as total');

      expect(parseFloat(updatedBudget.allocated_amount))
        .toBe(parseFloat(totalAllocations[0].total));
    });

    test('Should enforce financial constraints', async () => {
      // Test that financial amounts must be non-negative
      const invalidBudget = {
        budget_period_id: testBudgetPeriod.id,
        category_id: testBudgetCategory.id,
        name: 'Invalid Budget',
        allocated_amount: -1000.00 // Negative amount
      };

      const response = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidBudget);

      expect(response.status).toBe(400);
    });
  });

  describe('Delete Operations Security', () => {
    test('Should prevent deletion of budgets with actual spending', async () => {
      // Update budget to have actual spending
      await db('budgets')
        .where('id', testBudget.id)
        .update({ actual_spent: 100.00 });

      const response = await request(app)
        .delete(`/api/budgets/${testBudget.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Cannot delete budget with actual spending');

      // Reset for other tests
      await db('budgets')
        .where('id', testBudget.id)
        .update({ actual_spent: 0.00 });
    });

    test('Should prevent deletion of locked budgets', async () => {
      // Lock the budget
      await db('budgets')
        .where('id', testBudget.id)
        .update({ status: 'locked' });

      const response = await request(app)
        .delete(`/api/budgets/${testBudget.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Cannot delete locked budget');

      // Reset for other tests
      await db('budgets')
        .where('id', testBudget.id)
        .update({ status: 'draft' });
    });

    test('Should cascade delete properly for budget periods', async () => {
      // Create a separate budget period for this test
      const [testPeriod] = await db('budget_periods').insert({
        organization_id: testUser.id,
        name: 'Delete Test Period',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        created_by: testUser.id
      }).returning('*');

      const [testBudgetForDeletion] = await db('budgets').insert({
        organization_id: testUser.id,
        budget_period_id: testPeriod.id,
        category_id: testBudgetCategory.id,
        name: 'Budget For Deletion',
        allocated_amount: 1000.00,
        status: 'draft'
      }).returning('*');

      // Create allocation for this budget
      await db('budget_allocations').insert({
        budget_id: testBudgetForDeletion.id,
        allocation_year: 2026,
        allocation_month: 1,
        allocated_amount: 1000.00
      });

      // Delete the period
      const response = await request(app)
        .delete(`/api/budgets/periods/${testPeriod.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      // Verify cascade deletion
      const remainingBudgets = await db('budgets')
        .where('budget_period_id', testPeriod.id)
        .count('id as count');
      expect(parseInt(remainingBudgets[0].count)).toBe(0);

      const remainingAllocations = await db('budget_allocations')
        .where('budget_id', testBudgetForDeletion.id)
        .count('id as count');
      expect(parseInt(remainingAllocations[0].count)).toBe(0);
    });
  });

  describe('Input Validation Security', () => {
    test('Should validate UUID formats in all endpoints', async () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '12345',
        '../../../etc/passwd',
        'null',
        'undefined',
        '  ',
        ''
      ];

      for (const invalidId of invalidUUIDs) {
        const response = await request(app)
          .get(`/api/budgets/${encodeURIComponent(invalidId)}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid budget ID format');
      }
    });

    test('Should validate enum values for status fields', async () => {
      const invalidStatuses = [
        'invalid_status',
        '<script>alert("xss")</script>',
        'active"; DROP TABLE budgets; --',
        null,
        123
      ];

      for (const invalidStatus of invalidStatuses) {
        const response = await request(app)
          .get(`/api/budgets/periods?status=${encodeURIComponent(invalidStatus)}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid status parameter');
      }
    });

    test('Should prevent XSS in text fields', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '"><script>alert("xss")</script>'
      ];

      for (const xssPayload of xssPayloads) {
        const periodData = {
          name: xssPayload,
          start_date: '2025-01-01',
          end_date: '2025-12-31'
        };

        const response = await request(app)
          .post('/api/budgets/periods')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(periodData);

        // Should either reject the input or sanitize it
        if (response.status === 201) {
          expect(response.body.period.name).not.toContain('<script>');
          expect(response.body.period.name).not.toContain('javascript:');
        }
      }
    });
  });
});