const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');

describe('Financial Transactions API', () => {
  let adminToken;
  let testUser;
  let testBudget;
  let testVendor;
  let testTransaction;

  beforeAll(async () => {
    // Clean up test data
    await db('financial_transactions').del();
    await db('vendors').del();
    await db('budgets').del();
    await db('budget_periods').del();
    await db('budget_categories').del();

    // Create test user
    const [user] = await db('users').insert({
      first_name: 'Test',
      last_name: 'Financial',
      email: 'test.financial@example.com',
      password: 'hashedpassword',
      roles: JSON.stringify(['admin'])
    }).returning('*');
    testUser = user;

    // Create test budget infrastructure
    const [period] = await db('budget_periods').insert({
      organization_id: testUser.id,
      name: 'Test Period',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      status: 'active',
      created_by: testUser.id
    }).returning('*');

    const [category] = await db('budget_categories').insert({
      organization_id: testUser.id,
      name: 'Test Category',
      code: 'TEST',
      category_type: 'operating_expenses',
      active: true
    }).returning('*');

    const [budget] = await db('budgets').insert({
      organization_id: testUser.id,
      budget_period_id: period.id,
      category_id: category.id,
      name: 'Test Budget',
      allocated_amount: 10000.00,
      status: 'active'
    }).returning('*');
    testBudget = budget;

    // Create test vendor
    const [vendor] = await db('vendors').insert({
      organization_id: testUser.id,
      name: 'Test Vendor Co.',
      contact_name: 'John Vendor',
      email: 'john@testvendor.com',
      payment_terms: 'Net 30'
    }).returning('*');
    testVendor = vendor;

    adminToken = 'mock-admin-token';
  });

  afterAll(async () => {
    // Clean up
    await db('financial_transactions').del();
    await db('vendors').del();
    await db('budgets').del();
    await db('budget_periods').del();
    await db('budget_categories').del();
    await db('users').where('id', testUser.id).del();
  });

  describe('Financial Transactions', () => {
    test('POST /api/financial/transactions - should create financial transaction', async () => {
      const transactionData = {
        budget_id: testBudget.id,
        transaction_type: 'expense',
        amount: 500.00,
        description: 'Test expense transaction',
        transaction_date: '2025-01-15',
        vendor_id: testVendor.id,
        reference_number: 'INV-001'
      };

      const response = await request(app)
        .post('/api/financial/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body.transaction).toMatchObject({
        transaction_type: 'expense',
        amount: '500.00',
        description: 'Test expense transaction',
        status: 'draft'
      });

      expect(response.body.transaction.transaction_number).toMatch(/^EXP-2025-\d{6}$/);
      testTransaction = response.body.transaction;
    });

    test('GET /api/financial/transactions - should list transactions with filtering', async () => {
      const response = await request(app)
        .get('/api/financial/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].transaction_type).toBe('expense');
      expect(response.body.summary).toMatchObject({
        total_transactions: '1',
        total_expenses: '500.00'
      });
    });

    test('GET /api/financial/transactions?transaction_type=expense - should filter by type', async () => {
      const response = await request(app)
        .get('/api/financial/transactions?transaction_type=expense')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].transaction_type).toBe('expense');
    });

    test('GET /api/financial/transactions/:id - should get transaction details', async () => {
      const response = await request(app)
        .get(`/api/financial/transactions/${testTransaction.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.transaction.id).toBe(testTransaction.id);
      expect(response.body.transaction.vendor_name).toBe('Test Vendor Co.');
      expect(response.body.journal_entries).toBeInstanceOf(Array);
    });

    test('PUT /api/financial/transactions/:id/status - should update transaction status', async () => {
      const response = await request(app)
        .put(`/api/financial/transactions/${testTransaction.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved', notes: 'Approved for payment' })
        .expect(200);

      expect(response.body.transaction.status).toBe('approved');
    });

    test('PUT /api/financial/transactions/:id/status - should reject invalid status transition', async () => {
      await request(app)
        .put(`/api/financial/transactions/${testTransaction.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'voided' }) // Can't go from approved to voided directly
        .expect(400);
    });

    test('POST /api/financial/transactions - should reject transaction exceeding budget', async () => {
      const largeTransaction = {
        budget_id: testBudget.id,
        transaction_type: 'expense',
        amount: 15000.00, // Exceeds budget of 10,000
        description: 'Large expense that should fail',
        transaction_date: '2025-01-16',
        vendor_id: testVendor.id
      };

      await request(app)
        .post('/api/financial/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(largeTransaction)
        .expect(400);
    });

    test('POST /api/financial/transactions - should create revenue transaction', async () => {
      const revenueTransaction = {
        transaction_type: 'revenue',
        amount: 2500.00,
        description: 'Test revenue transaction',
        transaction_date: '2025-01-20',
        reference_number: 'REV-001'
      };

      const response = await request(app)
        .post('/api/financial/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(revenueTransaction)
        .expect(201);

      expect(response.body.transaction.transaction_type).toBe('revenue');
      expect(response.body.transaction.transaction_number).toMatch(/^REV-2025-\d{6}$/);
    });
  });

  describe('Vendors', () => {
    test('POST /api/financial/vendors - should create vendor', async () => {
      const vendorData = {
        name: 'New Test Vendor',
        contact_name: 'Jane Smith',
        email: 'jane@newtestvendor.com',
        phone: '(555) 123-4567',
        payment_terms: 'Net 15',
        payment_methods: ['check', 'ach']
      };

      const response = await request(app)
        .post('/api/financial/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(vendorData)
        .expect(201);

      expect(response.body.vendor).toMatchObject({
        name: 'New Test Vendor',
        contact_name: 'Jane Smith',
        payment_terms: 'Net 15'
      });
    });

    test('GET /api/financial/vendors - should list vendors', async () => {
      const response = await request(app)
        .get('/api/financial/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.vendors).toHaveLength(2); // Original + newly created
      expect(response.body.vendors[0].name).toBeTruthy();
    });

    test('GET /api/financial/vendors?search=New - should search vendors', async () => {
      const response = await request(app)
        .get('/api/financial/vendors?search=New')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.vendors).toHaveLength(1);
      expect(response.body.vendors[0].name).toContain('New');
    });

    test('POST /api/financial/vendors - should reject duplicate vendor name', async () => {
      const duplicateVendor = {
        name: 'Test Vendor Co.', // Same as existing vendor
        contact_name: 'Different Contact'
      };

      await request(app)
        .post('/api/financial/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateVendor)
        .expect(409);
    });
  });

  describe('Dashboard', () => {
    test('GET /api/financial/dashboard - should return dashboard data', async () => {
      const response = await request(app)
        .get('/api/financial/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transaction_summary');
      expect(response.body).toHaveProperty('budget_summary');
      expect(response.body).toHaveProperty('recent_transactions');
      expect(response.body).toHaveProperty('top_categories');
      expect(response.body).toHaveProperty('cash_flow_trend');
      expect(response.body.period_days).toBe(30);
    });

    test('GET /api/financial/dashboard?period=7 - should return 7-day dashboard', async () => {
      const response = await request(app)
        .get('/api/financial/dashboard?period=7')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.period_days).toBe(7);
    });
  });

  describe('Validation Tests', () => {
    test('POST /api/financial/transactions - should validate required fields', async () => {
      const invalidTransaction = {
        // Missing transaction_type
        amount: 100.00,
        description: 'Invalid transaction'
      };

      await request(app)
        .post('/api/financial/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidTransaction)
        .expect(400);
    });

    test('POST /api/financial/transactions - should validate transaction type', async () => {
      const invalidTransaction = {
        transaction_type: 'invalid_type',
        amount: 100.00,
        description: 'Invalid transaction',
        transaction_date: '2025-01-15'
      };

      await request(app)
        .post('/api/financial/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidTransaction)
        .expect(400);
    });

    test('POST /api/financial/transactions - should validate negative amounts', async () => {
      const negativeTransaction = {
        transaction_type: 'expense',
        amount: -100.00,
        description: 'Negative amount transaction',
        transaction_date: '2025-01-15'
      };

      await request(app)
        .post('/api/financial/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(negativeTransaction)
        .expect(400);
    });

    test('POST /api/financial/vendors - should validate vendor email', async () => {
      const invalidVendor = {
        name: 'Email Test Vendor',
        email: 'invalid-email' // Invalid email format
      };

      await request(app)
        .post('/api/financial/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidVendor)
        .expect(400);
    });
  });

  describe('Date Filtering', () => {
    test('GET /api/financial/transactions?date_from=2025-01-01&date_to=2025-01-31 - should filter by date range', async () => {
      const response = await request(app)
        .get('/api/financial/transactions?date_from=2025-01-01&date_to=2025-01-31')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Should include our test transactions from January
      expect(response.body.transactions.length).toBeGreaterThan(0);
    });

    test('GET /api/financial/transactions?date_from=2025-02-01 - should filter future dates', async () => {
      const response = await request(app)
        .get('/api/financial/transactions?date_from=2025-02-01')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Should be empty as our test transactions are in January
      expect(response.body.transactions).toHaveLength(0);
    });
  });

  describe('Amount Filtering', () => {
    test('GET /api/financial/transactions?min_amount=400&max_amount=600 - should filter by amount range', async () => {
      const response = await request(app)
        .get('/api/financial/transactions?min_amount=400&max_amount=600')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.transactions.forEach(transaction => {
        const amount = parseFloat(transaction.amount);
        expect(amount).toBeGreaterThanOrEqual(400);
        expect(amount).toBeLessThanOrEqual(600);
      });
    });
  });

  describe('Authorization Tests', () => {
    test('POST /api/financial/transactions - should require authentication', async () => {
      const transactionData = {
        transaction_type: 'expense',
        amount: 100.00,
        description: 'Unauthorized transaction',
        transaction_date: '2025-01-15'
      };

      await request(app)
        .post('/api/financial/transactions')
        .send(transactionData)
        .expect(401);
    });

    test('GET /api/financial/dashboard - should require authentication', async () => {
      await request(app)
        .get('/api/financial/dashboard')
        .expect(401);
    });
  });
});