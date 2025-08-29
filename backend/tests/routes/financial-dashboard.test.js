const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const financialDashboardRoutes = require('../../src/routes/financial-dashboard');
const { authenticateToken, requireAnyRole } = require('../../src/middleware/auth');
const { asyncHandler } = require('../../src/middleware/errorHandling');

// Mock database
const mockDb = {
  select: jest.fn(() => mockDb),
  join: jest.fn(() => mockDb),
  leftJoin: jest.fn(() => mockDb),
  where: jest.fn(() => mockDb),
  whereBetween: jest.fn(() => mockDb),
  whereRaw: jest.fn(() => mockDb),
  whereNull: jest.fn(() => mockDb),
  groupBy: jest.fn(() => mockDb),
  orderBy: jest.fn(() => mockDb),
  sum: jest.fn(() => mockDb),
  count: jest.fn(() => mockDb),
  limit: jest.fn(() => mockDb),
  raw: jest.fn(() => 'MOCK_RAW'),
  first: jest.fn(),
  clone: jest.fn(() => mockDb),
  modify: jest.fn(() => mockDb)
};

// Mock the database module
jest.mock('../../src/config/database', () => {
  return jest.fn((table) => {
    mockDb.tableName = table;
    return mockDb;
  });
});

const db = require('../../src/config/database');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/financial-dashboard', financialDashboardRoutes);

describe('Financial Dashboard API', () => {
  let authToken;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create test JWT token
    authToken = jwt.sign(
      { 
        userId: 'test-user-id', 
        email: 'admin@test.com', 
        role: 'admin',
        roles: ['admin'] 
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Mock auth middleware to always pass
    jest.spyOn(require('../../src/middleware/auth'), 'authenticateToken')
      .mockImplementation((req, res, next) => {
        req.user = { userId: 'test-user-id', role: 'admin', roles: ['admin'] };
        next();
      });

    jest.spyOn(require('../../src/middleware/auth'), 'requireAnyRole')
      .mockImplementation((roles) => (req, res, next) => next());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/financial-dashboard', () => {
    it('should return comprehensive financial dashboard data', async () => {
      // Mock database responses
      mockDb.first
        .mockResolvedValueOnce({ total_wages: '1500.00' }) // getSummaryMetrics - wages
        .mockResolvedValueOnce({ count: '10' }) // getSummaryMetrics - game count
        .mockResolvedValueOnce({ total: '1500.00' }) // getRefereeWages - total paid
        .mockResolvedValueOnce({ total: '500.00' }) // getRefereeWages - total pending
        .mockResolvedValueOnce({ count: '0' }) // getPendingApprovals - expenses
        .mockResolvedValueOnce({ count: '2' }); // getPendingApprovals - assignments

      // Mock other query results
      mockDb.count = jest.fn().mockReturnValue(mockDb);
      
      // Mock complex query results
      db.mockImplementation((table) => {
        if (table === 'game_assignments as ga') {
          return {
            ...mockDb,
            join: jest.fn(() => ({
              ...mockDb,
              join: jest.fn(() => ({
                ...mockDb,
                whereBetween: jest.fn(() => ({
                  ...mockDb,
                  where: jest.fn(() => ({
                    ...mockDb,
                    groupBy: jest.fn(() => ({
                      ...mockDb,
                      select: jest.fn(() => ({
                        ...mockDb,
                        orderBy: jest.fn(() => ({
                          ...mockDb,
                          limit: jest.fn(() => Promise.resolve([
                            {
                              id: 'user1',
                              name: 'John Referee',
                              email: 'john@test.com',
                              games_count: '5',
                              total_wages: '750.00',
                              avg_wage: '150.00'
                            }
                          ]))
                        }))
                      }))
                    }))
                  }))
                }))
              }))
            }))
          };
        }
        
        if (table === 'expense_data as ed') {
          return {
            ...mockDb,
            leftJoin: jest.fn(() => ({
              ...mockDb,
              whereBetween: jest.fn(() => ({
                ...mockDb,
                where: jest.fn(() => ({
                  ...mockDb,
                  groupBy: jest.fn(() => ({
                    ...mockDb,
                    select: jest.fn(() => ({
                      ...mockDb,
                      orderBy: jest.fn(() => Promise.resolve([
                        {
                          id: 'cat1',
                          name: 'Operations',
                          description: 'Operational expenses',
                          transaction_count: '2',
                          total_amount: '250.00',
                          avg_amount: '125.00'
                        }
                      ]))
                    }))
                  }))
                }))
              }))
            }))
          };
        }

        // Default mock for games table
        if (table === 'games') {
          return {
            ...mockDb,
            whereBetween: jest.fn(() => ({
              ...mockDb,
              groupBy: jest.fn(() => ({
                ...mockDb,
                select: jest.fn(() => ({
                  ...mockDb,
                  orderBy: jest.fn(() => Promise.resolve([
                    {
                      date: new Date('2025-08-08'),
                      game_count: 2,
                      revenue: 300
                    }
                  ]))
                }))
              }))
            }))
          };
        }

        return mockDb;
      });

      const response = await request(app)
        .get('/api/financial-dashboard?period=30')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('refereeWages');
      expect(response.body).toHaveProperty('expenseCategories');
      expect(response.body).toHaveProperty('recentTransactions');
      expect(response.body).toHaveProperty('revenueTrends');
      expect(response.body).toHaveProperty('budgetUtilization');
      expect(response.body).toHaveProperty('pendingApprovals');
      expect(response.body).toHaveProperty('dateRange');

      // Verify summary structure
      expect(response.body.summary).toHaveProperty('totalRevenue');
      expect(response.body.summary).toHaveProperty('totalWages');
      expect(response.body.summary).toHaveProperty('totalExpenses');
      expect(response.body.summary).toHaveProperty('netIncome');
      expect(response.body.summary).toHaveProperty('gameCount');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database to throw error
      mockDb.first.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/financial-dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Should return default values when database fails
      expect(response.body.summary.totalRevenue).toBe(0);
      expect(response.body.summary.totalWages).toBe(0);
      expect(response.body.summary.totalExpenses).toBe(0);
    });

    it('should require authentication', async () => {
      // Remove auth mock
      jest.restoreAllMocks();

      const response = await request(app)
        .get('/api/financial-dashboard');

      expect(response.status).toBe(401);
    });

    it('should handle custom date ranges', async () => {
      mockDb.first.mockResolvedValue({ total_wages: '0' });
      
      const startDate = '2025-07-01';
      const endDate = '2025-07-31';

      const response = await request(app)
        .get(`/api/financial-dashboard?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.dateRange).toHaveProperty('start');
      expect(response.body.dateRange).toHaveProperty('end');
    });
  });

  describe('GET /api/financial-dashboard/referee-payments', () => {
    it('should return referee payment details', async () => {
      // Mock referee payments query
      db.mockImplementation(() => ({
        join: jest.fn(() => ({
          join: jest.fn(() => ({
            leftJoin: jest.fn(() => ({
              select: jest.fn(() => ({
                whereBetween: jest.fn(() => ({
                  where: jest.fn(() => ({
                    orderBy: jest.fn(() => Promise.resolve([
                      {
                        assignment_id: 'assign1',
                        game_id: 'game1',
                        game_number: 'G001',
                        game_date: '2025-08-08',
                        game_time: '10:00',
                        location: 'Field 1',
                        referee_id: 'ref1',
                        referee_name: 'John Referee',
                        referee_email: 'john@test.com',
                        wage_per_game: '150.00',
                        assignment_status: 'completed',
                        position: 'Center Referee',
                        league_name: 'Premier League',
                        payment_status: 'paid'
                      }
                    ]))
                  }))
                }))
              }))
            }))
          }))
        }))
      }));

      const response = await request(app)
        .get('/api/financial-dashboard/referee-payments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('payments');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('totalPaid');
      expect(response.body.summary).toHaveProperty('totalPending');
      expect(response.body.summary).toHaveProperty('totalGames');
      expect(response.body.summary).toHaveProperty('uniqueReferees');
    });

    it('should filter payments by date range', async () => {
      db.mockImplementation(() => ({
        join: jest.fn(() => ({
          join: jest.fn(() => ({
            leftJoin: jest.fn(() => ({
              select: jest.fn(() => ({
                whereBetween: jest.fn((field, range) => {
                  expect(field).toBe('g.date');
                  expect(range).toEqual(['2025-07-01', '2025-07-31']);
                  return {
                    orderBy: jest.fn(() => Promise.resolve([]))
                  };
                })
              }))
            }))
          }))
        }))
      }));

      const response = await request(app)
        .get('/api/financial-dashboard/referee-payments?startDate=2025-07-01&endDate=2025-07-31')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter payments by referee', async () => {
      const refereeId = 'test-referee-id';
      
      db.mockImplementation(() => ({
        join: jest.fn(() => ({
          join: jest.fn(() => ({
            leftJoin: jest.fn(() => ({
              select: jest.fn(() => ({
                where: jest.fn((field, value) => {
                  if (field === 'u.id') {
                    expect(value).toBe(refereeId);
                  }
                  return {
                    orderBy: jest.fn(() => Promise.resolve([]))
                  };
                })
              }))
            }))
          }))
        }))
      }));

      const response = await request(app)
        .get(`/api/financial-dashboard/referee-payments?refereeId=${refereeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter payments by status', async () => {
      db.mockImplementation(() => ({
        join: jest.fn(() => ({
          join: jest.fn(() => ({
            leftJoin: jest.fn(() => ({
              select: jest.fn(() => ({
                where: jest.fn((field, value) => {
                  if (field === 'ga.status') {
                    expect(value).toBe('completed');
                  }
                  return {
                    orderBy: jest.fn(() => Promise.resolve([]))
                  };
                })
              }))
            }))
          }))
        }))
      }));

      const response = await request(app)
        .get('/api/financial-dashboard/referee-payments?status=paid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Financial Dashboard Helper Functions', () => {
    // We can't directly test the internal functions, but we can test their effects
    // through the main endpoint with specific mock scenarios

    it('should handle empty expense data', async () => {
      // Mock empty expense results
      db.mockImplementation((table) => {
        if (table === 'expense_data as ed' || table === 'expense_data') {
          throw new Error('Table does not exist');
        }
        return mockDb;
      });
      
      mockDb.first.mockResolvedValue({ total_wages: '0' });

      const response = await request(app)
        .get('/api/financial-dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.expenseCategories).toEqual([]);
    });

    it('should calculate net income correctly', async () => {
      mockDb.first
        .mockResolvedValueOnce({ total_wages: '1000.00' }) // wages
        .mockResolvedValueOnce({ count: '10' }) // game count
        .mockResolvedValueOnce({ total: '1000.00' }) // total paid wages
        .mockResolvedValueOnce({ total: '0' }); // pending wages

      // Mock expense data
      db.mockImplementation((table) => {
        if (table === 'expense_data') {
          return {
            ...mockDb,
            whereBetween: jest.fn(() => ({
              ...mockDb,
              where: jest.fn(() => ({
                ...mockDb,
                sum: jest.fn(() => ({
                  ...mockDb,
                  first: jest.fn(() => Promise.resolve({ total_expenses: '500.00' }))
                }))
              }))
            }))
          };
        }
        return mockDb;
      });

      const response = await request(app)
        .get('/api/financial-dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      const { totalRevenue, totalWages, totalExpenses, netIncome } = response.body.summary;
      
      // Revenue = 10 games * $150 = $1500
      // Net Income = Revenue - Wages - Expenses = $1500 - $1000 - $500 = $0
      expect(netIncome).toBe(totalRevenue - totalWages - totalExpenses);
    });

    it('should handle budget utilization calculation', async () => {
      mockDb.first.mockResolvedValue({ total: '5000.00' });

      const response = await request(app)
        .get('/api/financial-dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.budgetUtilization).toHaveProperty('budgets');
      expect(response.body.budgetUtilization).toHaveProperty('totalAllocated');
      expect(response.body.budgetUtilization).toHaveProperty('totalSpent');
      expect(response.body.budgetUtilization).toHaveProperty('overallUtilization');
    });
  });
});