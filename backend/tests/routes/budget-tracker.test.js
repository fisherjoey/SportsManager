const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const budgetTrackerRoutes = require('../../src/routes/budget-tracker');

// Mock database
const mockDb = {
  join: jest.fn(() => mockDb),
  leftJoin: jest.fn(() => mockDb),
  where: jest.fn(() => mockDb),
  whereRaw: jest.fn(() => mockDb),
  groupBy: jest.fn(() => mockDb),
  select: jest.fn(() => mockDb),
  sum: jest.fn(() => mockDb),
  first: jest.fn(),
  raw: jest.fn(() => 'MOCK_RAW')
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
app.use('/api/budget-tracker', budgetTrackerRoutes);

describe('Budget Tracker API', () => {
  let authToken;
  const mockUser = {
    userId: 'test-user-id',
    email: 'admin@test.com',
    role: 'admin',
    roles: ['admin']
  };

  const mockFinanceUser = {
    userId: 'finance-user-id',
    email: 'finance@test.com',
    role: 'finance',
    roles: ['finance']
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create test JWT token
    authToken = jwt.sign(
      mockUser,
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Mock auth middleware
    jest.spyOn(require('../../src/middleware/auth'), 'authenticateToken')
      .mockImplementation((req, res, next) => {
        req.user = mockUser;
        next();
      });

    jest.spyOn(require('../../src/middleware/auth'), 'requireAnyRole')
      .mockImplementation((roles) => (req, res, next) => {
        // Check if user has required role
        const hasRole = roles.some(role => mockUser.roles.includes(role));
        if (!hasRole) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/budget-tracker/utilization', () => {
    it('should return budget utilization data for admin user', async () => {
      // Mock wage spending query
      const mockWageSpending = { total: '2500.00' };
      
      // Mock expense spending query
      const mockExpenseSpending = [
        { name: 'Operations', total: '750.00' },
        { name: 'Equipment', total: '300.00' }
      ];

      // Set up database mocks
      db.mockImplementation((table) => {
        if (table === 'game_assignments as ga') {
          return {
            join: jest.fn(() => ({
              join: jest.fn(() => ({
                whereRaw: jest.fn(() => ({
                  whereRaw: jest.fn(() => ({
                    where: jest.fn(() => ({
                      sum: jest.fn(() => ({
                        first: jest.fn(() => Promise.resolve(mockWageSpending))
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
            leftJoin: jest.fn(() => ({
              whereRaw: jest.fn(() => ({
                whereRaw: jest.fn(() => ({
                  where: jest.fn(() => ({
                    groupBy: jest.fn(() => ({
                      select: jest.fn(() => Promise.resolve(mockExpenseSpending))
                    }))
                  }))
                }))
              }))
            }))
          };
        }

        return mockDb;
      });

      const response = await request(app)
        .get('/api/budget-tracker/utilization')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('budgets');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('period');

      // Verify budget structure
      expect(response.body.budgets).toHaveLength(4);
      expect(response.body.budgets[0]).toHaveProperty('category', 'Referee Wages');
      expect(response.body.budgets[0]).toHaveProperty('allocated', 50000);
      expect(response.body.budgets[0]).toHaveProperty('spent', 2500);
      expect(response.body.budgets[0]).toHaveProperty('percentage', 5);
      expect(response.body.budgets[0]).toHaveProperty('color', '#0088FE');

      // Verify summary structure
      expect(response.body.summary).toHaveProperty('totalAllocated', 73000);
      expect(response.body.summary).toHaveProperty('totalSpent');
      expect(response.body.summary).toHaveProperty('overallUtilization');
      expect(response.body.summary).toHaveProperty('remainingBudget');
      expect(response.body.summary).toHaveProperty('categoriesOverBudget', 0);
      expect(response.body.summary).toHaveProperty('categoriesNearLimit', 0);

      // Verify period structure
      expect(response.body.period).toHaveProperty('month');
      expect(response.body.period).toHaveProperty('year');
      expect(response.body.period).toHaveProperty('monthName');
      expect(typeof response.body.period.month).toBe('number');
      expect(typeof response.body.period.year).toBe('number');
      expect(typeof response.body.period.monthName).toBe('string');
    });

    it('should allow finance user access', async () => {
      // Mock finance user
      jest.spyOn(require('../../src/middleware/auth'), 'authenticateToken')
        .mockImplementation((req, res, next) => {
          req.user = mockFinanceUser;
          next();
        });

      jest.spyOn(require('../../src/middleware/auth'), 'requireAnyRole')
        .mockImplementation((roles) => (req, res, next) => {
          const hasRole = roles.some(role => mockFinanceUser.roles.includes(role));
          if (!hasRole) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
          next();
        });

      // Mock database queries
      db.mockImplementation(() => ({
        join: jest.fn(() => ({
          join: jest.fn(() => ({
            whereRaw: jest.fn(() => ({
              whereRaw: jest.fn(() => ({
                where: jest.fn(() => ({
                  sum: jest.fn(() => ({
                    first: jest.fn(() => Promise.resolve({ total: '0' }))
                  }))
                }))
              }))
            }))
          }))
        }))
      }));

      const response = await request(app)
        .get('/api/budget-tracker/utilization')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny access to non-admin/non-finance users', async () => {
      // Mock regular user
      const regularUser = {
        userId: 'regular-user-id',
        email: 'user@test.com',
        role: 'user',
        roles: ['user']
      };

      jest.spyOn(require('../../src/middleware/auth'), 'authenticateToken')
        .mockImplementation((req, res, next) => {
          req.user = regularUser;
          next();
        });

      jest.spyOn(require('../../src/middleware/auth'), 'requireAnyRole')
        .mockImplementation((roles) => (req, res, next) => {
          const hasRole = roles.some(role => regularUser.roles.includes(role));
          if (!hasRole) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
          next();
        });

      const response = await request(app)
        .get('/api/budget-tracker/utilization')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should handle wage spending calculation errors gracefully', async () => {
      // Mock database to throw error for wage spending
      db.mockImplementation((table) => {
        if (table === 'game_assignments as ga') {
          return {
            join: jest.fn(() => {
              throw new Error('Database connection failed');
            })
          };
        }
        
        // Mock successful expense query
        if (table === 'expense_data as ed') {
          return {
            leftJoin: jest.fn(() => ({
              whereRaw: jest.fn(() => ({
                whereRaw: jest.fn(() => ({
                  where: jest.fn(() => ({
                    groupBy: jest.fn(() => ({
                      select: jest.fn(() => Promise.resolve([]))
                    }))
                  }))
                }))
              }))
            }))
          };
        }

        return mockDb;
      });

      const response = await request(app)
        .get('/api/budget-tracker/utilization')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Should still return default budget data even if wage calculation fails
      expect(response.body.budgets[0].spent).toBe(0);
      expect(response.body.budgets[0].percentage).toBe(0);
    });

    it('should handle expense spending calculation errors gracefully', async () => {
      // Mock successful wage query
      db.mockImplementation((table) => {
        if (table === 'game_assignments as ga') {
          return {
            join: jest.fn(() => ({
              join: jest.fn(() => ({
                whereRaw: jest.fn(() => ({
                  whereRaw: jest.fn(() => ({
                    where: jest.fn(() => ({
                      sum: jest.fn(() => ({
                        first: jest.fn(() => Promise.resolve({ total: '1000.00' }))
                      }))
                    }))
                  }))
                }))
              }))
            }))
          };
        }
        
        // Mock database error for expenses
        if (table === 'expense_data as ed') {
          return {
            leftJoin: jest.fn(() => {
              throw new Error('Expense table not found');
            })
          };
        }

        return mockDb;
      });

      const response = await request(app)
        .get('/api/budget-tracker/utilization')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Should have wage spending but no expense spending
      expect(response.body.budgets[0].spent).toBe(1000);
      expect(response.body.budgets[0].percentage).toBe(2);
      expect(response.body.budgets[1].spent).toBe(0); // Operations should remain 0
    });

    it('should calculate budget percentages correctly', async () => {
      const mockWageSpending = { total: '25000.00' }; // 50% of Referee Wages budget
      const mockExpenseSpending = [
        { name: 'Operations', total: '8000.00' } // 80% of Operations budget
      ];

      db.mockImplementation((table) => {
        if (table === 'game_assignments as ga') {
          return {
            join: jest.fn(() => ({
              join: jest.fn(() => ({
                whereRaw: jest.fn(() => ({
                  whereRaw: jest.fn(() => ({
                    where: jest.fn(() => ({
                      sum: jest.fn(() => ({
                        first: jest.fn(() => Promise.resolve(mockWageSpending))
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
            leftJoin: jest.fn(() => ({
              whereRaw: jest.fn(() => ({
                whereRaw: jest.fn(() => ({
                  where: jest.fn(() => ({
                    groupBy: jest.fn(() => ({
                      select: jest.fn(() => Promise.resolve(mockExpenseSpending))
                    }))
                  }))
                }))
              }))
            }))
          };
        }

        return mockDb;
      });

      const response = await request(app)
        .get('/api/budget-tracker/utilization')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Check Referee Wages budget (50% utilization)
      expect(response.body.budgets[0].spent).toBe(25000);
      expect(response.body.budgets[0].percentage).toBe(50);
      
      // Check Operations budget (should be 80% + original amount)
      const operationsBudget = response.body.budgets.find(b => b.category === 'Operations');
      expect(operationsBudget.spent).toBe(8000);
      expect(operationsBudget.percentage).toBe(80);

      // Check summary calculations
      expect(response.body.summary.totalSpent).toBe(33000); // 25000 + 8000
      expect(response.body.summary.overallUtilization).toBeCloseTo(45.21, 1); // 33000/73000 * 100
      expect(response.body.summary.remainingBudget).toBe(40000); // 73000 - 33000
      expect(response.body.summary.categoriesNearLimit).toBe(1); // Operations at 80%
    });

    it('should detect over-budget categories', async () => {
      const mockWageSpending = { total: '55000.00' }; // 110% of Referee Wages budget
      const mockExpenseSpending = [
        { name: 'Operations', total: '12000.00' } // 120% of Operations budget
      ];

      db.mockImplementation((table) => {
        if (table === 'game_assignments as ga') {
          return {
            join: jest.fn(() => ({
              join: jest.fn(() => ({
                whereRaw: jest.fn(() => ({
                  whereRaw: jest.fn(() => ({
                    where: jest.fn(() => ({
                      sum: jest.fn(() => ({
                        first: jest.fn(() => Promise.resolve(mockWageSpending))
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
            leftJoin: jest.fn(() => ({
              whereRaw: jest.fn(() => ({
                whereRaw: jest.fn(() => ({
                  where: jest.fn(() => ({
                    groupBy: jest.fn(() => ({
                      select: jest.fn(() => Promise.resolve(mockExpenseSpending))
                    }))
                  }))
                }))
              }))
            }))
          };
        }

        return mockDb;
      });

      const response = await request(app)
        .get('/api/budget-tracker/utilization')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.categoriesOverBudget).toBe(2); // Both categories over 100%
      expect(response.body.summary.categoriesNearLimit).toBe(0); // None between 75-100%
    });

    it('should require authentication', async () => {
      jest.restoreAllMocks();

      const response = await request(app)
        .get('/api/budget-tracker/utilization');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/budget-tracker/categories', () => {
    it('should return budget categories for authorized users', async () => {
      const response = await request(app)
        .get('/api/budget-tracker/categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('categories');
      expect(response.body.categories).toHaveLength(6);
      
      // Check first category structure
      expect(response.body.categories[0]).toHaveProperty('id', 1);
      expect(response.body.categories[0]).toHaveProperty('name', 'Referee Wages');
      expect(response.body.categories[0]).toHaveProperty('description');

      // Check that all expected categories are present
      const categoryNames = response.body.categories.map(c => c.name);
      expect(categoryNames).toContain('Referee Wages');
      expect(categoryNames).toContain('Operations');
      expect(categoryNames).toContain('Equipment');
      expect(categoryNames).toContain('Administration');
      expect(categoryNames).toContain('Marketing');
      expect(categoryNames).toContain('Travel');
    });

    it('should deny access to unauthorized users', async () => {
      const regularUser = {
        userId: 'regular-user-id',
        email: 'user@test.com',
        role: 'user',
        roles: ['user']
      };

      jest.spyOn(require('../../src/middleware/auth'), 'authenticateToken')
        .mockImplementation((req, res, next) => {
          req.user = regularUser;
          next();
        });

      jest.spyOn(require('../../src/middleware/auth'), 'requireAnyRole')
        .mockImplementation((roles) => (req, res, next) => {
          const hasRole = roles.some(role => regularUser.roles.includes(role));
          if (!hasRole) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
          next();
        });

      const response = await request(app)
        .get('/api/budget-tracker/categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    it('should require authentication', async () => {
      jest.restoreAllMocks();

      const response = await request(app)
        .get('/api/budget-tracker/categories');

      expect(response.status).toBe(401);
    });
  });

  describe('Date and Period Handling', () => {
    it('should use correct month and year in calculations', async () => {
      const currentDate = new Date();
      const expectedMonth = currentDate.getMonth() + 1;
      const expectedYear = currentDate.getFullYear();

      db.mockImplementation((table) => {
        if (table === 'game_assignments as ga') {
          return {
            join: jest.fn(() => ({
              join: jest.fn(() => ({
                whereRaw: jest.fn((sql, params) => {
                  if (sql.includes('EXTRACT(MONTH')) {
                    expect(params[0]).toBe(expectedMonth);
                  }
                  if (sql.includes('EXTRACT(YEAR')) {
                    expect(params[0]).toBe(expectedYear);
                  }
                  return {
                    whereRaw: jest.fn(() => ({
                      where: jest.fn(() => ({
                        sum: jest.fn(() => ({
                          first: jest.fn(() => Promise.resolve({ total: '0' }))
                        }))
                      }))
                    }))
                  };
                })
              }))
            }))
          };
        }

        return {
          leftJoin: jest.fn(() => ({
            whereRaw: jest.fn(() => ({
              whereRaw: jest.fn(() => ({
                where: jest.fn(() => ({
                  groupBy: jest.fn(() => ({
                    select: jest.fn(() => Promise.resolve([]))
                  }))
                }))
              }))
            }))
          }))
        };
      });

      const response = await request(app)
        .get('/api/budget-tracker/utilization')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.period.month).toBe(expectedMonth);
      expect(response.body.period.year).toBe(expectedYear);
    });
  });
});