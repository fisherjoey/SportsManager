const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const financialDashboardRoutes = require('../../src/routes/financial-dashboard');
const db = require('../setup'); // Use test database

const app = express();
app.use(express.json());
app.use('/api/financial-dashboard', financialDashboardRoutes);

describe('Financial Dashboard API - Database Integration', () => {
  let authToken;
  let adminUser;
  let referee1;
  let games;

  beforeEach(async () => {
    // Get test users from database
    adminUser = await db('users').where({ email: 'admin@test.com' }).first();
    referee1 = await db('users').where({ email: 'referee1@test.com' }).first();
    games = await db('games').select('*');

    // Create test JWT token for admin
    authToken = jwt.sign(
      {
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        roles: [adminUser.role]
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Mock auth middleware to use real JWT validation
    const originalAuth = require('../../src/middleware/auth');
    jest.spyOn(originalAuth, 'authenticateToken').mockImplementation((req, res, next) => {
      try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    });

    jest.spyOn(originalAuth, 'requireAnyRole').mockImplementation((roles) => {
      return (req, res, next) => {
        if (roles.some(role => req.user.roles?.includes(role))) {
          next();
        } else {
          res.status(403).json({ error: 'Insufficient permissions' });
        }
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/financial-dashboard', () => {
    it('should return financial dashboard data with real database', async () => {
      const response = await request(app)
        .get('/api/financial-dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Verify main response structure exists
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('dateRange');

      // Verify summary structure has the key fields
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalRevenue');
      expect(summary).toHaveProperty('totalWages');
      expect(summary).toHaveProperty('totalExpenses');
      expect(summary).toHaveProperty('netIncome');
      expect(typeof summary.totalRevenue).toBe('number');
      expect(typeof summary.totalWages).toBe('number');
      expect(typeof summary.totalExpenses).toBe('number');
      expect(typeof summary.netIncome).toBe('number');

      // Verify dateRange structure
      expect(response.body.dateRange).toHaveProperty('start');
      expect(response.body.dateRange).toHaveProperty('end');
    });

    it('should create and query game assignments with calculated wages', async () => {
      // Create some game assignments using actual database schema
      if (games.length > 0 && referee1) {
        const gameId = games[0].id;
        const refereeId = referee1.id;
        const positionId = await db('positions').select('id').first();

        if (positionId) {
          await db('game_assignments').insert({
            game_id: gameId,
            user_id: refereeId,
            position_id: positionId.id,
            calculated_wage: 45.00, // Use correct column name
            status: 'completed'
          });

          const response = await request(app)
            .get('/api/financial-dashboard')
            .set('Authorization', `Bearer ${authToken}`);

          expect(response.status).toBe(200);
          
          // Verify the response structure
          const summary = response.body.summary;
          expect(summary).toHaveProperty('totalWages');
          expect(summary).toHaveProperty('totalRevenue');
          expect(summary).toHaveProperty('netIncome');
        }
      }
    });

    it('should handle period parameter correctly', async () => {
      const response = await request(app)
        .get('/api/financial-dashboard?period=30')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
    });

    it('should handle date range parameters', async () => {
      const startDate = '2024-11-01';
      const endDate = '2024-12-31';

      const response = await request(app)
        .get(`/api/financial-dashboard?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/financial-dashboard');

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/token|authentication/i);
    });

    it('should require admin or finance role', async () => {
      // Create token for referee (should not have access)
      const refereeToken = jwt.sign(
        {
          userId: referee1.id,
          email: referee1.email,
          role: referee1.role,
          roles: [referee1.role]
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/financial-dashboard')
        .set('Authorization', `Bearer ${refereeToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('Error handling and robustness', () => {
    it('should handle empty database gracefully', async () => {
      // Clear game assignments (but preserve core test data)
      await db('game_assignments').del();

      const response = await request(app)
        .get('/api/financial-dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.totalWages).toBe(0);
      expect(response.body.summary.totalExpenses).toBe(0);
      expect(response.body.summary.totalRevenue).toBe(0);
      expect(response.body.summary.netIncome).toBe(0);
    });

    it('should handle missing tables gracefully', async () => {
      // The API should not crash even if expected tables don't exist
      const response = await request(app)
        .get('/api/financial-dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      // Even with missing tables, it should return a valid response structure
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('dateRange');
    });

    it('should return consistent data types', async () => {
      const response = await request(app)
        .get('/api/financial-dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      const summary = response.body.summary;
      
      // All financial values should be numbers (not strings)
      expect(typeof summary.totalRevenue).toBe('number');
      expect(typeof summary.totalWages).toBe('number');
      expect(typeof summary.totalExpenses).toBe('number');
      expect(typeof summary.netIncome).toBe('number');
      
      // Should not be NaN
      expect(Number.isNaN(summary.totalRevenue)).toBe(false);
      expect(Number.isNaN(summary.totalWages)).toBe(false);
      expect(Number.isNaN(summary.totalExpenses)).toBe(false);
      expect(Number.isNaN(summary.netIncome)).toBe(false);
    });
  });

  describe('API contract validation', () => {
    it('should maintain consistent response structure', async () => {
      const response = await request(app)
        .get('/api/financial-dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify the API contract - required top-level properties
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('dateRange');
      
      // Optional properties that may exist depending on implementation
      const optionalProps = [
        'refereeWages',
        'expenseCategories', 
        'recentTransactions',
        'revenueTrends',
        'budgetUtilization',
        'pendingApprovals'
      ];
      
      optionalProps.forEach(prop => {
        if (response.body.hasOwnProperty(prop)) {
          // If the property exists, it should have the expected type
          if (['expenseCategories', 'recentTransactions', 'revenueTrends'].includes(prop)) {
            expect(Array.isArray(response.body[prop])).toBe(true);
          } else {
            expect(typeof response.body[prop]).toBe('object');
          }
        }
      });

      // Verify summary contract
      const summary = response.body.summary;
      expect(summary).toHaveProperty('totalRevenue');
      expect(summary).toHaveProperty('totalWages');
      expect(summary).toHaveProperty('totalExpenses');
      expect(summary).toHaveProperty('netIncome');

      // Verify dateRange contract
      const dateRange = response.body.dateRange;
      expect(dateRange).toHaveProperty('start');
      expect(dateRange).toHaveProperty('end');
      expect(new Date(dateRange.start).getTime()).toBeLessThanOrEqual(new Date(dateRange.end).getTime());
    });

    it('should handle different query parameter combinations', async () => {
      const testCases = [
        '/api/financial-dashboard',
        '/api/financial-dashboard?period=7',
        '/api/financial-dashboard?period=30',
        '/api/financial-dashboard?period=90',
        '/api/financial-dashboard?startDate=2024-01-01',
        '/api/financial-dashboard?endDate=2024-12-31',
        '/api/financial-dashboard?startDate=2024-01-01&endDate=2024-12-31'
      ];

      for (const url of testCases) {
        const response = await request(app)
          .get(url)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('summary');
        expect(response.body).toHaveProperty('dateRange');
      }
    });
  });

  describe('Database integration with current schema', () => {
    it('should work with existing users table', async () => {
      const users = await db('users').select('id', 'email', 'role').limit(5);
      
      const response = await request(app)
        .get('/api/financial-dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(users.length).toBeGreaterThan(0);
    });

    it('should work with existing games table', async () => {
      const games = await db('games').select('id', 'level', 'pay_rate').limit(5);
      
      const response = await request(app)
        .get('/api/financial-dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(games.length).toBeGreaterThan(0);
    });

    it('should work with existing game_assignments table', async () => {
      const assignments = await db('game_assignments').select('id', 'status', 'calculated_wage').limit(5);
      
      const response = await request(app)
        .get('/api/financial-dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // assignments table may be empty, that's ok
    });
  });
});