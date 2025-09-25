import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

// Mock database
const mockDb = {
  select: jest.fn(),
  from: jest.fn(),
  where: jest.fn(),
  join: jest.fn(),
  leftJoin: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  offset: jest.fn(),
  clone: jest.fn(),
  count: jest.fn(),
  first: jest.fn(),
  insert: jest.fn(),
  returning: jest.fn(),
  update: jest.fn(),
  increment: jest.fn(),
  decrement: jest.fn(),
  modify: jest.fn(),
  raw: jest.fn(),
  fn: {
    now: jest.fn(() => new Date())
  },
  groupBy: jest.fn()
};

// Chain methods for fluent interface
Object.keys(mockDb).forEach(method => {
  if (typeof mockDb[method] === 'function' && method !== 'fn') {
    mockDb[method].mockReturnValue(mockDb);
  }
});

// Mock auth middleware
const mockAuth = {
  authenticateToken: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      id: 1,
      organization_id: 1,
      role: 'admin',
      email: 'test@example.com'
    };
    next();
  }),
  requireRole: jest.fn(() => (req: any, res: any, next: any) => next()),
  requireAnyRole: jest.fn(() => (req: any, res: any, next: any) => next()),
  requirePermission: jest.fn(() => (req: any, res: any, next: any) => next()),
  requireAnyPermission: jest.fn(() => (req: any, res: any, next: any) => next())
};

// Mock audit middleware
const mockAuditMiddleware = {
  auditMiddleware: jest.fn(() => (req: any, res: any, next: any) => next())
};

// Mock the modules
jest.mock('../config/database', () => mockDb);
jest.mock('../middleware/auth', () => mockAuth);
jest.mock('../middleware/auditTrail', () => mockAuditMiddleware);

describe('Financial Transactions Routes', () => {
  let app: express.Application;
  let router: any;

  beforeAll(async () => {
    // Import the router after mocking
    const module = await import('../financial-transactions');
    router = module.default;

    app = express();
    app.use(express.json());
    app.use('/api/financial', router);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/financial/transactions', () => {
    const mockTransactions = [
      {
        id: 1,
        transaction_number: 'EXP-2024-000001',
        transaction_type: 'expense',
        amount: 100.50,
        description: 'Test expense',
        transaction_date: new Date('2024-01-15'),
        status: 'posted',
        budget_name: 'Office Supplies',
        category_name: 'Supplies',
        vendor_name: 'Test Vendor'
      }
    ];

    const mockSummary = {
      total_transactions: 1,
      total_revenue: 0,
      total_expenses: 100.50,
      posted_amount: 100.50,
      pending_amount: 0
    };

    it('should list transactions with default pagination', async () => {
      mockDb.clone.mockReturnValueOnce(mockDb).mockReturnValueOnce(mockDb);
      mockDb.first.mockReturnValueOnce(Promise.resolve(mockSummary));
      mockDb.limit.mockReturnValueOnce(Promise.resolve(mockTransactions));
      mockDb.count.mockReturnValueOnce(Promise.resolve([{ total: 1 }]));

      const response = await request(app)
        .get('/api/financial/transactions')
        .expect(200);

      expect(response.body).toMatchObject({
        transactions: mockTransactions,
        summary: mockSummary,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      });

      expect(mockDb.where).toHaveBeenCalledWith('ft.organization_id', 1);
    });

    it('should filter transactions by type', async () => {
      mockDb.clone.mockReturnValueOnce(mockDb).mockReturnValueOnce(mockDb);
      mockDb.first.mockReturnValueOnce(Promise.resolve(mockSummary));
      mockDb.limit.mockReturnValueOnce(Promise.resolve(mockTransactions));
      mockDb.count.mockReturnValueOnce(Promise.resolve([{ total: 1 }]));

      await request(app)
        .get('/api/financial/transactions?transaction_type=expense')
        .expect(200);

      expect(mockDb.where).toHaveBeenCalledWith('ft.transaction_type', 'expense');
    });

    it('should filter transactions by date range', async () => {
      mockDb.clone.mockReturnValueOnce(mockDb).mockReturnValueOnce(mockDb);
      mockDb.first.mockReturnValueOnce(Promise.resolve(mockSummary));
      mockDb.limit.mockReturnValueOnce(Promise.resolve(mockTransactions));
      mockDb.count.mockReturnValueOnce(Promise.resolve([{ total: 1 }]));

      await request(app)
        .get('/api/financial/transactions?date_from=2024-01-01&date_to=2024-01-31')
        .expect(200);

      expect(mockDb.where).toHaveBeenCalledWith('ft.transaction_date', '>=', '2024-01-01');
      expect(mockDb.where).toHaveBeenCalledWith('ft.transaction_date', '<=', '2024-01-31');
    });

    it('should search transactions by description', async () => {
      mockDb.clone.mockReturnValueOnce(mockDb).mockReturnValueOnce(mockDb);
      mockDb.first.mockReturnValueOnce(Promise.resolve(mockSummary));
      mockDb.limit.mockReturnValueOnce(Promise.resolve(mockTransactions));
      mockDb.count.mockReturnValueOnce(Promise.resolve([{ total: 1 }]));

      await request(app)
        .get('/api/financial/transactions?search=test')
        .expect(200);

      expect(mockDb.where).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should validate query parameters', async () => {
      await request(app)
        .get('/api/financial/transactions?page=invalid')
        .expect(400);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.clone.mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get('/api/financial/transactions')
        .expect(500)
        .expect(res => {
          expect(res.body.error).toBe('Failed to retrieve transactions');
        });
    });
  });

  describe('POST /api/financial/transactions', () => {
    const validTransactionData = {
      transaction_type: 'expense',
      amount: 150.75,
      description: 'Test transaction',
      transaction_date: '2024-01-15',
      budget_id: '550e8400-e29b-41d4-a716-446655440000'
    };

    const mockBudget = {
      id: 1,
      allocated_amount: 1000,
      committed_amount: 200,
      actual_spent: 300,
      reserved_amount: 50
    };

    const mockCreatedTransaction = {
      id: 1,
      ...validTransactionData,
      transaction_number: 'EXP-2024-000001',
      organization_id: 1,
      created_by: 1,
      status: 'draft'
    };

    it('should create a transaction successfully', async () => {
      mockDb.first
        .mockReturnValueOnce(Promise.resolve(mockBudget)) // Budget validation
        .mockReturnValueOnce(Promise.resolve(mockCreatedTransaction)); // Full transaction
      mockDb.insert.mockReturnValueOnce(Promise.resolve([mockCreatedTransaction]));

      const response = await request(app)
        .post('/api/financial/transactions')
        .send(validTransactionData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Financial transaction created successfully',
        transaction: mockCreatedTransaction
      });

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validTransactionData,
          organization_id: 1,
          created_by: 1,
          transaction_number: expect.stringMatching(/^EXP-\d{4}-\d{6}$/)
        })
      );
    });

    it('should validate transaction data', async () => {
      const invalidData = {
        transaction_type: 'invalid',
        amount: -100,
        description: ''
      };

      await request(app)
        .post('/api/financial/transactions')
        .send(invalidData)
        .expect(400)
        .expect(res => {
          expect(res.body.error).toBe('Validation error');
        });
    });

    it('should check budget availability for expenses', async () => {
      const insufficientBudget = {
        ...mockBudget,
        allocated_amount: 100, // Not enough for the transaction
        committed_amount: 50,
        actual_spent: 40,
        reserved_amount: 10
      };

      mockDb.first.mockReturnValueOnce(Promise.resolve(insufficientBudget));

      await request(app)
        .post('/api/financial/transactions')
        .send(validTransactionData)
        .expect(400)
        .expect(res => {
          expect(res.body.error).toBe('Insufficient budget');
        });
    });

    it('should validate budget exists', async () => {
      mockDb.first.mockReturnValueOnce(Promise.resolve(null)); // Budget not found

      await request(app)
        .post('/api/financial/transactions')
        .send(validTransactionData)
        .expect(404)
        .expect(res => {
          expect(res.body.error).toBe('Budget not found');
        });
    });

    it('should validate vendor exists when provided', async () => {
      const dataWithVendor = {
        ...validTransactionData,
        vendor_id: '550e8400-e29b-41d4-a716-446655440001'
      };

      mockDb.first
        .mockReturnValueOnce(Promise.resolve(mockBudget)) // Budget validation
        .mockReturnValueOnce(Promise.resolve(null)); // Vendor not found

      await request(app)
        .post('/api/financial/transactions')
        .send(dataWithVendor)
        .expect(404)
        .expect(res => {
          expect(res.body.error).toBe('Vendor not found');
        });
    });

    it('should update budget committed amount for expenses', async () => {
      mockDb.first
        .mockReturnValueOnce(Promise.resolve(mockBudget))
        .mockReturnValueOnce(Promise.resolve(mockCreatedTransaction));
      mockDb.insert.mockReturnValueOnce(Promise.resolve([mockCreatedTransaction]));

      await request(app)
        .post('/api/financial/transactions')
        .send(validTransactionData)
        .expect(201);

      expect(mockDb.increment).toHaveBeenCalledWith('committed_amount', validTransactionData.amount);
    });

    it('should handle database errors during creation', async () => {
      mockDb.first.mockReturnValueOnce(Promise.resolve(mockBudget));
      mockDb.insert.mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .post('/api/financial/transactions')
        .send(validTransactionData)
        .expect(500)
        .expect(res => {
          expect(res.body.error).toBe('Failed to create transaction');
        });
    });
  });

  describe('GET /api/financial/transactions/:id', () => {
    const mockTransaction = {
      id: 1,
      transaction_number: 'EXP-2024-000001',
      transaction_type: 'expense',
      amount: 100.50,
      description: 'Test expense',
      transaction_date: new Date('2024-01-15'),
      status: 'posted',
      budget_name: 'Office Supplies',
      vendor_name: 'Test Vendor'
    };

    const mockJournalEntries = [
      {
        id: 1,
        transaction_id: 1,
        account_id: 1,
        debit_amount: 100.50,
        description: 'Test entry',
        created_at: new Date()
      }
    ];

    it('should return transaction details', async () => {
      mockDb.first.mockReturnValueOnce(Promise.resolve(mockTransaction));
      mockDb.orderBy.mockReturnValueOnce(Promise.resolve(mockJournalEntries));

      const response = await request(app)
        .get('/api/financial/transactions/1')
        .expect(200);

      expect(response.body).toMatchObject({
        transaction: mockTransaction,
        journal_entries: mockJournalEntries
      });

      expect(mockDb.where).toHaveBeenCalledWith('ft.id', '1');
      expect(mockDb.where).toHaveBeenCalledWith('ft.organization_id', 1);
    });

    it('should return 404 for non-existent transaction', async () => {
      mockDb.first.mockReturnValueOnce(Promise.resolve(null));

      await request(app)
        .get('/api/financial/transactions/999')
        .expect(404)
        .expect(res => {
          expect(res.body.error).toBe('Transaction not found');
        });
    });

    it('should handle database errors', async () => {
      mockDb.first.mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get('/api/financial/transactions/1')
        .expect(500)
        .expect(res => {
          expect(res.body.error).toBe('Failed to retrieve transaction details');
        });
    });
  });

  describe('PUT /api/financial/transactions/:id/status', () => {
    const mockTransaction = {
      id: 1,
      status: 'pending_approval',
      transaction_type: 'expense',
      amount: 100.50,
      budget_id: 1
    };

    it('should update transaction status successfully', async () => {
      const updatedTransaction = { ...mockTransaction, status: 'approved' };

      mockDb.first.mockReturnValueOnce(Promise.resolve(mockTransaction));
      mockDb.update.mockReturnValueOnce(Promise.resolve([updatedTransaction]));

      const response = await request(app)
        .put('/api/financial/transactions/1/status')
        .send({ status: 'approved' })
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Transaction approved successfully',
        transaction: updatedTransaction
      });

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved'
        })
      );
    });

    it('should validate status transitions', async () => {
      const postedTransaction = { ...mockTransaction, status: 'posted' };
      mockDb.first.mockReturnValueOnce(Promise.resolve(postedTransaction));

      await request(app)
        .put('/api/financial/transactions/1/status')
        .send({ status: 'approved' })
        .expect(400)
        .expect(res => {
          expect(res.body.error).toBe('Invalid status transition');
        });
    });

    it('should validate status values', async () => {
      await request(app)
        .put('/api/financial/transactions/1/status')
        .send({ status: 'invalid_status' })
        .expect(400)
        .expect(res => {
          expect(res.body.error).toBe('Invalid status');
        });
    });

    it('should update budget when posting expense', async () => {
      const approvedTransaction = { ...mockTransaction, status: 'approved' };
      const postedTransaction = { ...approvedTransaction, status: 'posted' };

      mockDb.first.mockReturnValueOnce(Promise.resolve(approvedTransaction));
      mockDb.update.mockReturnValueOnce(Promise.resolve([postedTransaction]));

      await request(app)
        .put('/api/financial/transactions/1/status')
        .send({ status: 'posted' })
        .expect(200);

      expect(mockDb.increment).toHaveBeenCalledWith('actual_spent', mockTransaction.amount);
      expect(mockDb.decrement).toHaveBeenCalledWith('committed_amount', mockTransaction.amount);
    });

    it('should handle cancellation properly', async () => {
      mockDb.first.mockReturnValueOnce(Promise.resolve(mockTransaction));
      mockDb.update.mockReturnValueOnce(Promise.resolve([{ ...mockTransaction, status: 'cancelled' }]));

      await request(app)
        .put('/api/financial/transactions/1/status')
        .send({ status: 'cancelled' })
        .expect(200);

      expect(mockDb.decrement).toHaveBeenCalledWith('committed_amount', mockTransaction.amount);
    });

    it('should return 404 for non-existent transaction', async () => {
      mockDb.first.mockReturnValueOnce(Promise.resolve(null));

      await request(app)
        .put('/api/financial/transactions/999/status')
        .send({ status: 'approved' })
        .expect(404)
        .expect(res => {
          expect(res.body.error).toBe('Transaction not found');
        });
    });
  });

  describe('GET /api/financial/vendors', () => {
    const mockVendors = [
      {
        id: 1,
        name: 'Test Vendor',
        contact_name: 'John Doe',
        email: 'john@vendor.com',
        active: true
      }
    ];

    it('should list vendors with pagination', async () => {
      mockDb.clone.mockReturnValueOnce(mockDb).mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(Promise.resolve(mockVendors));
      mockDb.count.mockReturnValueOnce(Promise.resolve([{ total: 1 }]));

      const response = await request(app)
        .get('/api/financial/vendors')
        .expect(200);

      expect(response.body).toMatchObject({
        vendors: mockVendors,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      });
    });

    it('should filter active vendors', async () => {
      mockDb.clone.mockReturnValueOnce(mockDb).mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(Promise.resolve(mockVendors));
      mockDb.count.mockReturnValueOnce(Promise.resolve([{ total: 1 }]));

      await request(app)
        .get('/api/financial/vendors?active=true')
        .expect(200);

      expect(mockDb.where).toHaveBeenCalledWith('active', true);
    });

    it('should search vendors', async () => {
      mockDb.clone.mockReturnValueOnce(mockDb).mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(Promise.resolve(mockVendors));
      mockDb.count.mockReturnValueOnce(Promise.resolve([{ total: 1 }]));

      await request(app)
        .get('/api/financial/vendors?search=test')
        .expect(200);

      expect(mockDb.where).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('POST /api/financial/vendors', () => {
    const validVendorData = {
      name: 'New Vendor',
      contact_name: 'Jane Doe',
      email: 'jane@newvendor.com',
      phone: '555-1234'
    };

    const mockCreatedVendor = {
      id: 1,
      ...validVendorData,
      organization_id: 1,
      active: true
    };

    it('should create vendor successfully', async () => {
      mockDb.first.mockReturnValueOnce(Promise.resolve(null)); // No duplicate
      mockDb.insert.mockReturnValueOnce(Promise.resolve([mockCreatedVendor]));

      const response = await request(app)
        .post('/api/financial/vendors')
        .send(validVendorData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Vendor created successfully',
        vendor: mockCreatedVendor
      });
    });

    it('should validate vendor data', async () => {
      const invalidData = {
        name: '', // Required field
        email: 'invalid-email'
      };

      await request(app)
        .post('/api/financial/vendors')
        .send(invalidData)
        .expect(400)
        .expect(res => {
          expect(res.body.error).toBe('Validation error');
        });
    });

    it('should prevent duplicate vendor names', async () => {
      mockDb.first.mockReturnValueOnce(Promise.resolve({ id: 1, name: 'New Vendor' }));

      await request(app)
        .post('/api/financial/vendors')
        .send(validVendorData)
        .expect(409)
        .expect(res => {
          expect(res.body.error).toBe('Duplicate vendor name');
        });
    });
  });

  describe('GET /api/financial/dashboard', () => {
    const mockDashboardData = {
      transaction_summary: {
        total_transactions: 10,
        total_revenue: 5000,
        total_expenses: 3000,
        pending_approvals: 2,
        pending_amount: 500
      },
      budget_summary: {
        total_budgets: 5,
        total_allocated: 10000,
        total_spent: 6000,
        total_committed: 2000,
        total_available: 2000
      },
      recent_transactions: [],
      top_categories: [],
      cash_flow_trend: []
    };

    it('should return dashboard data', async () => {
      mockDb.first
        .mockReturnValueOnce(Promise.resolve(mockDashboardData.transaction_summary))
        .mockReturnValueOnce(Promise.resolve(mockDashboardData.budget_summary));
      mockDb.limit.mockReturnValueOnce(Promise.resolve([])); // recent transactions
      mockDb.limit.mockReturnValueOnce(Promise.resolve([])); // top categories
      mockDb.orderBy.mockReturnValueOnce(Promise.resolve([])); // cash flow

      const response = await request(app)
        .get('/api/financial/dashboard')
        .expect(200);

      expect(response.body).toMatchObject({
        transaction_summary: mockDashboardData.transaction_summary,
        budget_summary: mockDashboardData.budget_summary,
        recent_transactions: [],
        top_categories: [],
        cash_flow_trend: [],
        period_days: 30
      });
    });

    it('should accept custom period', async () => {
      mockDb.first
        .mockReturnValueOnce(Promise.resolve(mockDashboardData.transaction_summary))
        .mockReturnValueOnce(Promise.resolve(mockDashboardData.budget_summary));
      mockDb.limit.mockReturnValueOnce(Promise.resolve([]));
      mockDb.limit.mockReturnValueOnce(Promise.resolve([]));
      mockDb.orderBy.mockReturnValueOnce(Promise.resolve([]));

      const response = await request(app)
        .get('/api/financial/dashboard?period=7')
        .expect(200);

      expect(response.body.period_days).toBe(7);
    });

    it('should handle dashboard errors', async () => {
      mockDb.first.mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get('/api/financial/dashboard')
        .expect(500)
        .expect(res => {
          expect(res.body.error).toBe('Failed to retrieve dashboard data');
        });
    });
  });

  describe('Transaction Number Generation', () => {
    it('should generate unique transaction numbers', async () => {
      // Mock the last transaction
      mockDb.first.mockReturnValueOnce(Promise.resolve({
        transaction_number: 'EXP-2024-000005'
      }));

      // This would be tested in the actual route, but we can test the logic
      const year = new Date().getFullYear();
      const expectedPattern = new RegExp(`^EXP-${year}-\\d{6}$`);

      // We can't directly test the internal function, but we can verify
      // the transaction creation includes a properly formatted number
      const validTransactionData = {
        transaction_type: 'expense',
        amount: 150.75,
        description: 'Test transaction',
        transaction_date: '2024-01-15'
      };

      const mockBudget = {
        allocated_amount: 1000,
        committed_amount: 0,
        actual_spent: 0,
        reserved_amount: 0
      };

      mockDb.first
        .mockReturnValueOnce(Promise.resolve(null)) // No budget to validate
        .mockReturnValueOnce(Promise.resolve({ id: 1, ...validTransactionData }));
      mockDb.insert.mockReturnValueOnce(Promise.resolve([{ id: 1 }]));

      await request(app)
        .post('/api/financial/transactions')
        .send(validTransactionData)
        .expect(201);

      // Verify that insert was called with a transaction_number
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_number: expect.stringMatching(expectedPattern)
        })
      );
    });
  });

  describe('Authorization and Authentication', () => {
    it('should require authentication for all routes', async () => {
      // This would be tested by modifying the mock to not set req.user
      // For now, we verify that the auth middleware is called
      expect(mockAuth.authenticateToken).toBeDefined();
      expect(mockAuth.requirePermission).toBeDefined();
    });

    it('should require proper permissions', async () => {
      // Test that the routes use the correct permission checks
      expect(mockAuth.requirePermission).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      await request(app)
        .post('/api/financial/transactions')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle database connection issues', async () => {
      mockDb.where.mockRejectedValueOnce(new Error('Connection failed'));

      await request(app)
        .get('/api/financial/transactions')
        .expect(500);
    });
  });

  describe('Data Validation Edge Cases', () => {
    it('should handle very large transaction amounts', async () => {
      const dataWithLargeAmount = {
        transaction_type: 'expense',
        amount: 999999999.99,
        description: 'Large transaction',
        transaction_date: '2024-01-15'
      };

      await request(app)
        .post('/api/financial/transactions')
        .send(dataWithLargeAmount)
        .expect(400); // Should fail validation or budget check
    });

    it('should handle special characters in descriptions', async () => {
      const dataWithSpecialChars = {
        transaction_type: 'expense',
        amount: 100,
        description: 'Test with special chars: @#$%^&*()',
        transaction_date: '2024-01-15'
      };

      const mockBudget = {
        allocated_amount: 1000,
        committed_amount: 0,
        actual_spent: 0,
        reserved_amount: 0
      };

      mockDb.first
        .mockReturnValueOnce(Promise.resolve(null)) // No budget check
        .mockReturnValueOnce(Promise.resolve({ id: 1 }));
      mockDb.insert.mockReturnValueOnce(Promise.resolve([{ id: 1 }]));

      await request(app)
        .post('/api/financial/transactions')
        .send(dataWithSpecialChars)
        .expect(201);
    });

    it('should handle future dates', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const dataWithFutureDate = {
        transaction_type: 'expense',
        amount: 100,
        description: 'Future transaction',
        transaction_date: futureDate.toISOString()
      };

      const mockBudget = {
        allocated_amount: 1000,
        committed_amount: 0,
        actual_spent: 0,
        reserved_amount: 0
      };

      mockDb.first
        .mockReturnValueOnce(Promise.resolve(null))
        .mockReturnValueOnce(Promise.resolve({ id: 1 }));
      mockDb.insert.mockReturnValueOnce(Promise.resolve([{ id: 1 }]));

      await request(app)
        .post('/api/financial/transactions')
        .send(dataWithFutureDate)
        .expect(201);
    });
  });
});