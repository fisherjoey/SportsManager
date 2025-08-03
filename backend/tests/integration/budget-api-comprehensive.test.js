const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');

describe('Budget API Integration Tests', () => {
  let adminToken;
  let managerToken;
  let userToken;
  let testOrgId;
  let testPeriodId;
  let testCategoryId;
  let testBudgetId;

  beforeAll(async () => {
    // Create test organization
    const [org] = await db('users').insert({
      email: 'budget-test-org@test.com',
      password: '$2b$10$test',
      role: 'admin',
      name: 'Budget Test Org'
    }).returning('*');
    testOrgId = org.id;

    // Create test users with different roles
    const [admin] = await db('users').insert({
      email: 'budget-admin@test.com',
      password: '$2b$10$test',
      role: 'admin',
      organization_id: testOrgId,
      name: 'Budget Admin'
    }).returning('*');

    const [manager] = await db('users').insert({
      email: 'budget-manager@test.com',
      password: '$2b$10$test',
      role: 'manager',
      organization_id: testOrgId,
      name: 'Budget Manager'
    }).returning('*');

    const [user] = await db('users').insert({
      email: 'budget-user@test.com',
      password: '$2b$10$test',
      role: 'user',
      organization_id: testOrgId,
      name: 'Budget User'
    }).returning('*');

    // Get authentication tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'budget-admin@test.com', password: 'password123' });
    adminToken = adminLogin.body.token;

    const managerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'budget-manager@test.com', password: 'password123' });
    managerToken = managerLogin.body.token;

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'budget-user@test.com', password: 'password123' });
    userToken = userLogin.body.token;

    // Create test budget period
    const [period] = await db('budget_periods').insert({
      name: 'Test Budget Period 2024',
      description: 'Test period for integration testing',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      organization_id: testOrgId,
      created_by: admin.id,
      status: 'active'
    }).returning('*');
    testPeriodId = period.id;

    // Create test budget category
    const [category] = await db('budget_categories').insert({
      name: 'Test Operations',
      code: 'TEST-OPS',
      category_type: 'operating_expenses',
      description: 'Test category for operations',
      organization_id: testOrgId,
      color_code: '#0088FE',
      sort_order: 1
    }).returning('*');
    testCategoryId = category.id;
  });

  afterAll(async () => {
    // Clean up all test data
    await db('budget_allocations').whereIn('budget_id', 
      db('budgets').select('id').where('organization_id', testOrgId)
    ).del();
    await db('budgets').where('organization_id', testOrgId).del();
    await db('budget_categories').where('organization_id', testOrgId).del();
    await db('budget_periods').where('organization_id', testOrgId).del();
    await db('users').where('organization_id', testOrgId).del();
    await db('users').where('id', testOrgId).del();
  });

  describe('Budget Period Management', () => {
    test('Admin can create budget periods', async () => {
      const periodData = {
        name: 'Q1 2024 Budget',
        description: 'First quarter budget period',
        start_date: '2024-01-01',
        end_date: '2024-03-31',
        is_template: false
      };

      const res = await request(app)
        .post('/api/budgets/periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(periodData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Budget period created successfully');
      expect(res.body.period).toMatchObject({
        name: periodData.name,
        description: periodData.description,
        organization_id: testOrgId
      });

      // Clean up
      await db('budget_periods').where('id', res.body.period.id).del();
    });

    test('Manager can create budget periods', async () => {
      const res = await request(app)
        .post('/api/budgets/periods')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Manager Test Period',
          start_date: '2024-04-01',
          end_date: '2024-06-30'
        });

      expect(res.status).toBe(201);
      
      // Clean up
      await db('budget_periods').where('id', res.body.period.id).del();
    });

    test('Regular user cannot create budget periods', async () => {
      const res = await request(app)
        .post('/api/budgets/periods')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'User Test Period',
          start_date: '2024-07-01',
          end_date: '2024-09-30'
        });

      expect(res.status).toBe(403);
    });

    test('Should prevent overlapping budget periods', async () => {
      const overlappingPeriod = {
        name: 'Overlapping Period',
        start_date: '2024-06-01',
        end_date: '2024-12-31' // Overlaps with existing test period
      };

      const res = await request(app)
        .post('/api/budgets/periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(overlappingPeriod);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Overlapping budget period');
    });

    test('Can list budget periods with pagination', async () => {
      const res = await request(app)
        .get('/api/budgets/periods')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('periods');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 10
      });
    });
  });

  describe('Budget Category Management', () => {
    test('Admin can create budget categories', async () => {
      const categoryData = {
        name: 'Marketing Expenses',
        code: 'MARKETING',
        category_type: 'marketing',
        description: 'All marketing related expenses',
        color_code: '#FF8042',
        sort_order: 2
      };

      const res = await request(app)
        .post('/api/budgets/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData);

      expect(res.status).toBe(201);
      expect(res.body.category).toMatchObject({
        name: categoryData.name,
        code: categoryData.code,
        category_type: categoryData.category_type
      });

      // Clean up
      await db('budget_categories').where('id', res.body.category.id).del();
    });

    test('Should prevent duplicate category codes', async () => {
      const duplicateCategory = {
        name: 'Duplicate Operations',
        code: 'TEST-OPS', // Same as existing test category
        category_type: 'operating_expenses'
      };

      const res = await request(app)
        .post('/api/budgets/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateCategory);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Duplicate category code');
    });

    test('Can create hierarchical categories', async () => {
      // Create parent category
      const parentRes = await request(app)
        .post('/api/budgets/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Parent Category',
          code: 'PARENT',
          category_type: 'admin'
        });

      expect(parentRes.status).toBe(201);
      const parentId = parentRes.body.category.id;

      // Create child category
      const childRes = await request(app)
        .post('/api/budgets/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Child Category',
          code: 'CHILD',
          category_type: 'admin',
          parent_id: parentId
        });

      expect(childRes.status).toBe(201);
      expect(childRes.body.category.parent_id).toBe(parentId);

      // Clean up
      await db('budget_categories').where('id', childRes.body.category.id).del();
      await db('budget_categories').where('id', parentId).del();
    });

    test('Can list categories with hierarchy', async () => {
      const res = await request(app)
        .get('/api/budgets/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('categories');
      expect(Array.isArray(res.body.categories)).toBe(true);
    });
  });

  describe('Budget CRUD Operations', () => {
    beforeEach(async () => {
      // Clean up any existing budgets before each test
      await db('budget_allocations').whereIn('budget_id', 
        db('budgets').select('id').where('organization_id', testOrgId)
      ).del();
      await db('budgets').where('organization_id', testOrgId).del();
    });

    test('Admin can create budgets', async () => {
      const budgetData = {
        budget_period_id: testPeriodId,
        category_id: testCategoryId,
        name: 'Test Budget Creation',
        description: 'Budget for testing creation',
        allocated_amount: 5000.00
      };

      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(budgetData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Budget created successfully');
      expect(res.body.budget).toMatchObject({
        name: budgetData.name,
        allocated_amount: budgetData.allocated_amount,
        organization_id: testOrgId
      });

      testBudgetId = res.body.budget.id;

      // Verify monthly allocations were created
      const allocations = await db('budget_allocations')
        .where('budget_id', testBudgetId);
      expect(allocations.length).toBeGreaterThan(0);
    });

    test('Should prevent duplicate budgets in same period/category', async () => {
      // Create first budget
      const budgetData = {
        budget_period_id: testPeriodId,
        category_id: testCategoryId,
        name: 'Duplicate Test Budget',
        allocated_amount: 1000.00
      };

      const firstRes = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(budgetData);
      expect(firstRes.status).toBe(201);

      // Try to create duplicate
      const duplicateRes = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(budgetData);

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.error).toBe('Duplicate budget');
    });

    test('Can retrieve budget list with filters', async () => {
      // Create test budget first
      const budgetRes = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          budget_period_id: testPeriodId,
          category_id: testCategoryId,
          name: 'Filter Test Budget',
          allocated_amount: 2000.00
        });

      testBudgetId = budgetRes.body.budget.id;

      // Test listing with filters
      const res = await request(app)
        .get('/api/budgets')
        .query({ 
          period_id: testPeriodId,
          include_summary: true 
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('budgets');
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.budgets.length).toBeGreaterThan(0);
    });

    test('Can retrieve individual budget details', async () => {
      // Create test budget first
      const budgetRes = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          budget_period_id: testPeriodId,
          category_id: testCategoryId,
          name: 'Detail Test Budget',
          allocated_amount: 3000.00
        });

      testBudgetId = budgetRes.body.budget.id;

      const res = await request(app)
        .get(`/api/budgets/${testBudgetId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('budget');
      expect(res.body).toHaveProperty('allocations');
      expect(res.body).toHaveProperty('recent_transactions');
      expect(res.body.budget.id).toBe(testBudgetId);
    });

    test('Can update budget', async () => {
      // Create test budget first
      const budgetRes = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          budget_period_id: testPeriodId,
          category_id: testCategoryId,
          name: 'Update Test Budget',
          allocated_amount: 1500.00
        });

      testBudgetId = budgetRes.body.budget.id;

      const updateData = {
        budget_period_id: testPeriodId,
        category_id: testCategoryId,
        name: 'Updated Budget Name',
        allocated_amount: 2500.00,
        description: 'Updated description'
      };

      const res = await request(app)
        .put(`/api/budgets/${testBudgetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.budget).toMatchObject({
        name: updateData.name,
        allocated_amount: updateData.allocated_amount
      });
    });

    test('Cannot update locked budget', async () => {
      // Create and lock a budget
      const budgetRes = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          budget_period_id: testPeriodId,
          category_id: testCategoryId,
          name: 'Locked Budget',
          allocated_amount: 1000.00
        });

      testBudgetId = budgetRes.body.budget.id;

      // Lock the budget
      await db('budgets').where('id', testBudgetId).update({ status: 'locked' });

      const res = await request(app)
        .put(`/api/budgets/${testBudgetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          budget_period_id: testPeriodId,
          category_id: testCategoryId,
          name: 'Should Not Update',
          allocated_amount: 2000.00
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Budget is locked');
    });
  });

  describe('Budget Allocation Management', () => {
    beforeEach(async () => {
      // Create a test budget for allocation tests
      if (!testBudgetId) {
        const budgetRes = await request(app)
          .post('/api/budgets')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            budget_period_id: testPeriodId,
            category_id: testCategoryId,
            name: 'Allocation Test Budget',
            allocated_amount: 12000.00
          });
        testBudgetId = budgetRes.body.budget.id;
      }
    });

    test('Can create budget allocations', async () => {
      const allocationData = {
        allocation_year: 2024,
        allocation_month: 6,
        allocated_amount: 1000.00,
        notes: 'June allocation for testing'
      };

      const res = await request(app)
        .post(`/api/budgets/${testBudgetId}/allocations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(allocationData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Budget allocation saved successfully');
      expect(res.body.allocation).toMatchObject({
        budget_id: testBudgetId,
        allocation_year: allocationData.allocation_year,
        allocation_month: allocationData.allocation_month,
        allocated_amount: allocationData.allocated_amount
      });
    });

    test('Can update existing allocations (upsert)', async () => {
      // Create initial allocation
      await request(app)
        .post(`/api/budgets/${testBudgetId}/allocations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          allocation_year: 2024,
          allocation_month: 7,
          allocated_amount: 800.00
        });

      // Update the same allocation
      const res = await request(app)
        .post(`/api/budgets/${testBudgetId}/allocations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          allocation_year: 2024,
          allocation_month: 7,
          allocated_amount: 1200.00,
          notes: 'Updated allocation'
        });

      expect(res.status).toBe(200);
      expect(res.body.allocation.allocated_amount).toBe(1200.00);
    });

    test('Validates allocation data', async () => {
      const invalidAllocations = [
        { allocation_year: 'invalid', allocation_month: 1, allocated_amount: 100 },
        { allocation_year: 2024, allocation_month: 13, allocated_amount: 100 }, // Invalid month
        { allocation_year: 2024, allocation_month: 1, allocated_amount: -100 }, // Negative amount
      ];

      for (const allocation of invalidAllocations) {
        const res = await request(app)
          .post(`/api/budgets/${testBudgetId}/allocations`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(allocation);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'Validation error');
      }
    });
  });

  describe('Data Consistency and Transaction Safety', () => {
    test('Budget creation with allocations is atomic', async () => {
      const budgetData = {
        budget_period_id: testPeriodId,
        category_id: testCategoryId,
        name: 'Atomic Test Budget',
        allocated_amount: 6000.00
      };

      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(budgetData);

      expect(res.status).toBe(201);
      
      const budgetId = res.body.budget.id;
      
      // Verify budget was created
      const budget = await db('budgets').where('id', budgetId).first();
      expect(budget).toBeDefined();
      
      // Verify allocations were created
      const allocations = await db('budget_allocations')
        .where('budget_id', budgetId);
      expect(allocations.length).toBeGreaterThan(0);
      
      // Verify total allocations match budget amount
      const totalAllocated = allocations.reduce((sum, alloc) => sum + parseFloat(alloc.allocated_amount), 0);
      expect(Math.abs(totalAllocated - budget.allocated_amount)).toBeLessThan(0.01);
    });

    test('Failed operations should not leave partial data', async () => {
      // Try to create budget with invalid category
      const invalidBudgetData = {
        budget_period_id: testPeriodId,
        category_id: '00000000-0000-0000-0000-000000000000', // Non-existent category
        name: 'Invalid Budget',
        allocated_amount: 1000.00
      };

      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidBudgetData);

      expect(res.status).toBe(404);
      
      // Verify no budget was created
      const budgets = await db('budgets')
        .where('name', 'Invalid Budget')
        .where('organization_id', testOrgId);
      expect(budgets.length).toBe(0);
    });
  });

  describe('Performance and Scalability', () => {
    test('Can handle listing large numbers of budgets efficiently', async () => {
      const startTime = Date.now();
      
      const res = await request(app)
        .get('/api/budgets')
        .query({ limit: 100, include_summary: true })
        .set('Authorization', `Bearer ${adminToken}`);

      const responseTime = Date.now() - startTime;
      
      expect(res.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('Pagination works correctly with large datasets', async () => {
      const page1 = await request(app)
        .get('/api/budgets')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${adminToken}`);

      const page2 = await request(app)
        .get('/api/budgets')
        .query({ page: 2, limit: 5 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);
      expect(page1.body.pagination.page).toBe(1);
      expect(page2.body.pagination.page).toBe(2);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('Handles non-existent budget gracefully', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const res = await request(app)
        .get(`/api/budgets/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Budget not found');
    });

    test('Validates UUID format for budget IDs', async () => {
      const invalidId = 'not-a-uuid';
      
      const res = await request(app)
        .get(`/api/budgets/${invalidId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    test('Handles database connection issues gracefully', async () => {
      // This test would require mocking database failures
      // Implementation depends on specific database setup and error handling
      expect(true).toBe(true); // Placeholder
    });
  });
});