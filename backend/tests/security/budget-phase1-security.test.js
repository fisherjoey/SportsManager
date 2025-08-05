const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');

describe('Budget System Phase 1 Security Tests', () => {
  let authToken;
  let organizationId;
  let budgetPeriodId;
  let budgetCategoryId;
  let testBudgetId;

  beforeAll(async () => {
    // Set up test data
    const user = await db('users').insert({
      email: 'test@example.com',
      password: 'hashedpassword',
      roles: ['admin'],
      organization_id: db.raw('gen_random_uuid()')
    }).returning('*');

    organizationId = user[0].organization_id;
    
    // Get auth token (mock for testing)
    authToken = 'test-token';

    // Create test budget period
    const period = await db('budget_periods').insert({
      organization_id: organizationId,
      name: 'Test Period',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      created_by: user[0].id
    }).returning('*');
    budgetPeriodId = period[0].id;

    // Create test budget category
    const category = await db('budget_categories').insert({
      organization_id: organizationId,
      name: 'Test Category',
      code: 'TEST',
      category_type: 'operating_expenses'
    }).returning('*');
    budgetCategoryId = category[0].id;

    // Create test budget
    const budget = await db('budgets').insert({
      organization_id: organizationId,
      budget_period_id: budgetPeriodId,
      category_id: budgetCategoryId,
      name: 'Test Budget',
      allocated_amount: 10000
    }).returning('*');
    testBudgetId = budget[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await db('budgets').where('organization_id', organizationId).del();
    await db('budget_categories').where('organization_id', organizationId).del();
    await db('budget_periods').where('organization_id', organizationId).del();
    await db('users').where('organization_id', organizationId).del();
    await db.destroy();
  });

  describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in budget listing period_id filter', async () => {
      const maliciousInput = '\'; DROP TABLE budgets; --';
      
      const response = await request(app)
        .get(`/api/budgets?period_id=${encodeURIComponent(maliciousInput)}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid period_id format');
      
      // Verify budgets table still exists
      const budgets = await db('budgets').select('id').limit(1);
      expect(budgets).toBeDefined();
    });

    test('should prevent SQL injection in budget listing category_id filter', async () => {
      const maliciousInput = '1\' UNION SELECT * FROM users --';
      
      const response = await request(app)
        .get(`/api/budgets?category_id=${encodeURIComponent(maliciousInput)}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid category_id format');
    });

    test('should prevent SQL injection in budget listing status filter', async () => {
      const maliciousInput = 'active\'; DROP TABLE users; --';
      
      const response = await request(app)
        .get(`/api/budgets?status=${encodeURIComponent(maliciousInput)}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid status parameter');
    });

    test('should prevent SQL injection in budget detail endpoint', async () => {
      const maliciousInput = '1\'; DROP TABLE budgets; --';
      
      const response = await request(app)
        .get(`/api/budgets/${maliciousInput}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid budget ID format');
    });
  });

  describe('Authorization Boundary Testing', () => {
    test('should prevent access to budgets from different organization', async () => {
      // Create another organization's budget
      const otherUser = await db('users').insert({
        email: 'other@example.com',
        password: 'hashedpassword',
        roles: ['admin'],
        organization_id: db.raw('gen_random_uuid()')
      }).returning('*');

      const otherBudget = await db('budgets').insert({
        organization_id: otherUser[0].organization_id,
        budget_period_id: budgetPeriodId, // Same period but different org
        category_id: budgetCategoryId,
        name: 'Other Org Budget',
        allocated_amount: 5000
      }).returning('*');

      const response = await request(app)
        .get(`/api/budgets/${otherBudget[0].id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Budget not found');
      
      // Clean up
      await db('budgets').where('id', otherBudget[0].id).del();
      await db('users').where('id', otherUser[0].id).del();
    });

    test('should prevent updating locked budgets', async () => {
      // Lock the test budget
      await db('budgets').where('id', testBudgetId).update({ status: 'locked' });

      const response = await request(app)
        .put(`/api/budgets/${testBudgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          budget_period_id: budgetPeriodId,
          category_id: budgetCategoryId,
          name: 'Updated Locked Budget',
          allocated_amount: 15000
        });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Budget locked');
      
      // Reset budget status
      await db('budgets').where('id', testBudgetId).update({ status: 'draft' });
    });

    test('should prevent deleting budgets with actual spending', async () => {
      // Add actual spending to budget
      await db('budgets').where('id', testBudgetId).update({ actual_spent: 1000 });

      const response = await request(app)
        .delete(`/api/budgets/${testBudgetId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot delete budget with actual spending');
      
      // Reset spending
      await db('budgets').where('id', testBudgetId).update({ actual_spent: 0 });
    });
  });

  describe('Input Validation Testing', () => {
    test('should validate UUID format in all endpoints', async () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123-456-789',
        'invalid-uuid-format',
        '00000000-0000-0000-0000-000000000000', // All zeros
        'g0000000-0000-0000-0000-000000000000'  // Invalid character
      ];

      for (const invalidUUID of invalidUUIDs) {
        const response = await request(app)
          .get(`/api/budgets/${invalidUUID}`)
          .set('Authorization', `Bearer ${authToken}`);
        
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid budget ID format');
      }
    });

    test('should validate budget creation input', async () => {
      const invalidInputs = [
        { allocated_amount: -1000 }, // Negative amount
        { budget_period_id: 'invalid-uuid' }, // Invalid UUID
        { category_id: null }, // Required field missing
        { name: '' }, // Empty name
        { allocated_amount: 'not-a-number' } // Invalid number
      ];

      for (const invalidInput of invalidInputs) {
        const response = await request(app)
          .post('/api/budgets')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            budget_period_id: budgetPeriodId,
            category_id: budgetCategoryId,
            name: 'Test Budget',
            allocated_amount: 10000,
            ...invalidInput // Override with invalid data
          });
        
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Error Information Leakage Prevention', () => {
    test('should not leak sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/budgets/nonexistent-budget-id')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body.error).not.toContain('SELECT');
      expect(response.body.error).not.toContain('FROM');
      expect(response.body.error).not.toContain('WHERE');
      expect(response.body.error).not.toContain('database');
      expect(response.body.error).not.toContain('table');
    });

    test('should not expose internal database structure in validation errors', async () => {
      const response = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
        });
      
      expect(response.status).toBe(400);
      expect(response.body.details).not.toContain('column');
      expect(response.body.details).not.toContain('constraint');
      expect(response.body.details).not.toContain('relation');
    });
  });

  describe('Transaction Integrity Testing', () => {
    test('should rollback budget creation on allocation failure', async () => {
      const initialBudgetCount = await db('budgets')
        .where('organization_id', organizationId)
        .count('id as count');

      // Mock a database error during allocation creation
      const originalInsert = db.insert;
      db.insert = jest.fn().mockImplementation(() => {
        throw new Error('Simulated allocation failure');
      });

      const response = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          budget_period_id: budgetPeriodId,
          category_id: budgetCategoryId,
          name: 'Transaction Test Budget',
          allocated_amount: 10000
        });
      
      expect(response.status).toBe(500);
      
      // Verify no budget was created due to rollback
      const finalBudgetCount = await db('budgets')
        .where('organization_id', organizationId)
        .count('id as count');
      
      expect(finalBudgetCount[0].count).toBe(initialBudgetCount[0].count);
      
      // Restore original method
      db.insert = originalInsert;
    });
  });

  describe('Data Consistency Validation', () => {
    test('should ensure available amount is calculated consistently', async () => {
      // Update budget with known values
      await db('budgets').where('id', testBudgetId).update({
        allocated_amount: 10000,
        committed_amount: 2000,
        actual_spent: 3000,
        reserved_amount: 1000
      });

      const response = await request(app)
        .get(`/api/budgets/${testBudgetId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      
      // Available should be: 10000 - 2000 - 3000 - 1000 = 4000
      expect(response.body.budget.calculated_available).toBe(4000);
    });

    test('should enforce budget amount constraints', async () => {
      const response = await request(app)
        .put(`/api/budgets/${testBudgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          budget_period_id: budgetPeriodId,
          category_id: budgetCategoryId,
          name: 'Constraint Test Budget',
          allocated_amount: 1000, // Less than current spending
          committed_amount: 2000,
          actual_spent: 3000 // This would violate constraints
        });
      
      // Should either reject the update or handle it gracefully
      expect([400, 422, 500]).toContain(response.status);
    });
  });
});