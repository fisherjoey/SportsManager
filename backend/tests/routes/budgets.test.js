const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');

describe('Budget Management API', () => {
  let adminToken;
  let testUser;
  let testBudgetPeriod;
  let testBudgetCategory;
  let testBudget;

  beforeAll(async () => {
    // Clean up test data
    await db('budget_allocations').del();
    await db('budgets').del();
    await db('budget_periods').del();
    await db('budget_categories').del();

    // Create test user
    const [user] = await db('users').insert({
      first_name: 'Test',
      last_name: 'Admin',
      email: 'test.budget@example.com',
      password: 'hashedpassword',
      roles: JSON.stringify(['admin'])
    }).returning('*');
    testUser = user;

    // Get token (mock authentication)
    adminToken = 'mock-admin-token';
  });

  afterAll(async () => {
    // Clean up
    await db('budget_allocations').del();
    await db('budgets').del();
    await db('budget_periods').del();
    await db('budget_categories').del();
    await db('users').where('id', testUser.id).del();
  });

  describe('Budget Periods', () => {
    test('POST /api/budgets/periods - should create budget period', async () => {
      const periodData = {
        name: '2025 Test Budget',
        description: 'Test budget period',
        start_date: '2025-01-01',
        end_date: '2025-12-31'
      };

      const response = await request(app)
        .post('/api/budgets/periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(periodData)
        .expect(201);

      expect(response.body.period).toMatchObject({
        name: periodData.name,
        description: periodData.description,
        status: 'draft'
      });

      testBudgetPeriod = response.body.period;
    });

    test('GET /api/budgets/periods - should list budget periods', async () => {
      const response = await request(app)
        .get('/api/budgets/periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.periods).toHaveLength(1);
      expect(response.body.periods[0].name).toBe('2025 Test Budget');
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      });
    });

    test('POST /api/budgets/periods - should reject overlapping periods', async () => {
      const overlappingPeriod = {
        name: 'Overlapping Budget',
        description: 'This should fail',
        start_date: '2025-06-01',
        end_date: '2025-12-31'
      };

      await request(app)
        .post('/api/budgets/periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(overlappingPeriod)
        .expect(409);
    });
  });

  describe('Budget Categories', () => {
    test('POST /api/budgets/categories - should create budget category', async () => {
      const categoryData = {
        name: 'Test Equipment',
        code: 'TEST_EQUIP',
        description: 'Test equipment category',
        category_type: 'equipment',
        color_code: '#3B82F6',
        sort_order: 1
      };

      const response = await request(app)
        .post('/api/budgets/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData)
        .expect(201);

      expect(response.body.category).toMatchObject({
        name: categoryData.name,
        code: categoryData.code,
        category_type: categoryData.category_type,
        color_code: categoryData.color_code
      });

      testBudgetCategory = response.body.category;
    });

    test('GET /api/budgets/categories - should list budget categories', async () => {
      const response = await request(app)
        .get('/api/budgets/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.categories).toHaveLength(1);
      expect(response.body.categories[0].name).toBe('Test Equipment');
    });

    test('POST /api/budgets/categories - should reject duplicate code', async () => {
      const duplicateCategory = {
        name: 'Duplicate Test',
        code: 'TEST_EQUIP', // Same code as above
        category_type: 'equipment'
      };

      await request(app)
        .post('/api/budgets/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateCategory)
        .expect(409);
    });

    test('GET /api/budgets/categories?hierarchy=true - should return hierarchical structure', async () => {
      // Create parent category
      const [parentCategory] = await db('budget_categories').insert({
        organization_id: testUser.id,
        name: 'Parent Category',
        code: 'PARENT',
        category_type: 'equipment',
        active: true
      }).returning('*');

      // Create child category
      await db('budget_categories').insert({
        organization_id: testUser.id,
        name: 'Child Category',
        code: 'CHILD',
        category_type: 'equipment',
        parent_id: parentCategory.id,
        active: true
      });

      const response = await request(app)
        .get('/api/budgets/categories?hierarchy=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const parentInResponse = response.body.categories.find(c => c.code === 'PARENT');
      expect(parentInResponse.children).toHaveLength(1);
      expect(parentInResponse.children[0].code).toBe('CHILD');
    });
  });

  describe('Budgets', () => {
    test('POST /api/budgets - should create budget', async () => {
      const budgetData = {
        budget_period_id: testBudgetPeriod.id,
        category_id: testBudgetCategory.id,
        name: 'Test Budget',
        description: 'Test budget description',
        allocated_amount: 5000.00,
        variance_rules: {
          warning_threshold: 80,
          critical_threshold: 100
        }
      };

      const response = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(budgetData)
        .expect(201);

      expect(response.body.budget).toMatchObject({
        name: budgetData.name,
        allocated_amount: '5000.00',
        status: 'draft'
      });

      testBudget = response.body.budget;
    });

    test('GET /api/budgets - should list budgets with summary', async () => {
      const response = await request(app)
        .get('/api/budgets?include_summary=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.budgets).toHaveLength(1);
      expect(response.body.summary).toMatchObject({
        total_budgets: '1',
        total_allocated: '5000.00'
      });
    });

    test('GET /api/budgets/:id - should get budget details', async () => {
      const response = await request(app)
        .get(`/api/budgets/${testBudget.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.budget.id).toBe(testBudget.id);
      expect(response.body.allocations).toBeInstanceOf(Array);
      expect(response.body.recent_transactions).toBeInstanceOf(Array);
      expect(response.body.alerts).toBeInstanceOf(Array);
    });

    test('PUT /api/budgets/:id - should update budget', async () => {
      const updateData = {
        ...testBudget,
        name: 'Updated Test Budget',
        allocated_amount: 6000.00
      };

      const response = await request(app)
        .put(`/api/budgets/${testBudget.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.budget.name).toBe('Updated Test Budget');
      expect(response.body.budget.allocated_amount).toBe('6000.00');
    });

    test('POST /api/budgets - should reject duplicate budget in same period/category', async () => {
      const duplicateBudget = {
        budget_period_id: testBudgetPeriod.id,
        category_id: testBudgetCategory.id,
        name: 'Updated Test Budget', // Same name as updated budget
        allocated_amount: 1000.00
      };

      await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateBudget)
        .expect(409);
    });
  });

  describe('Budget Allocations', () => {
    test('POST /api/budgets/:id/allocations - should create/update allocation', async () => {
      const allocationData = {
        allocation_year: 2025,
        allocation_month: 6,
        allocated_amount: 500.00,
        notes: 'June allocation test'
      };

      const response = await request(app)
        .post(`/api/budgets/${testBudget.id}/allocations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(allocationData)
        .expect(200);

      expect(response.body.allocation).toMatchObject({
        allocation_year: 2025,
        allocation_month: 6,
        allocated_amount: '500.00',
        notes: 'June allocation test'
      });
    });

    test('GET /api/budgets?include_allocations=true - should include allocations', async () => {
      const response = await request(app)
        .get('/api/budgets?include_allocations=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const budget = response.body.budgets[0];
      expect(budget.allocations).toBeInstanceOf(Array);
      expect(budget.allocations.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Tests', () => {
    test('POST /api/budgets/periods - should validate required fields', async () => {
      const invalidData = {
        name: '', // Empty name
        start_date: '2025-01-01'
        // Missing end_date
      };

      await request(app)
        .post('/api/budgets/periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });

    test('POST /api/budgets/categories - should validate category type', async () => {
      const invalidCategory = {
        name: 'Invalid Category',
        code: 'INVALID',
        category_type: 'invalid_type' // Invalid enum value
      };

      await request(app)
        .post('/api/budgets/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidCategory)
        .expect(400);
    });

    test('POST /api/budgets - should validate budget amount', async () => {
      const invalidBudget = {
        budget_period_id: testBudgetPeriod.id,
        category_id: testBudgetCategory.id,
        name: 'Negative Budget',
        allocated_amount: -1000.00 // Negative amount
      };

      await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidBudget)
        .expect(400);
    });
  });

  describe('Authorization Tests', () => {
    test('POST /api/budgets/periods - should require authentication', async () => {
      const periodData = {
        name: 'Unauthorized Budget',
        start_date: '2026-01-01',
        end_date: '2026-12-31'
      };

      await request(app)
        .post('/api/budgets/periods')
        .send(periodData)
        .expect(401);
    });

    test('GET /api/budgets - should work with authentication', async () => {
      await request(app)
        .get('/api/budgets')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Filtering and Pagination', () => {
    test('GET /api/budgets?period_id=... - should filter by period', async () => {
      const response = await request(app)
        .get(`/api/budgets?period_id=${testBudgetPeriod.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.budgets).toHaveLength(1);
      expect(response.body.budgets[0].budget_period_id).toBe(testBudgetPeriod.id);
    });

    test('GET /api/budgets?category_id=... - should filter by category', async () => {
      const response = await request(app)
        .get(`/api/budgets?category_id=${testBudgetCategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.budgets).toHaveLength(1);
      expect(response.body.budgets[0].category_id).toBe(testBudgetCategory.id);
    });

    test('GET /api/budgets?page=1&limit=5 - should paginate results', async () => {
      const response = await request(app)
        .get('/api/budgets?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 5
      });
    });
  });
});