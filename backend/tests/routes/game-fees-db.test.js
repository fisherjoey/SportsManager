const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const gameFeesRoutes = require('../../src/routes/game-fees');
const db = require('../setup'); // Use test database

const app = express();
app.use(express.json());
app.use('/api/game-fees', gameFeesRoutes);

describe('Game Fees API - Database Integration', () => {
  let authToken;
  let adminUser;
  let referee1;
  let testGame;
  let testGameFee;

  beforeEach(async () => {
    // Get test users from database
    adminUser = await db('users').where({ email: 'admin@test.com' }).first();
    referee1 = await db('users').where({ email: 'referee1@test.com' }).first();
    
    // Get a test game
    testGame = await db('games').first();

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

    // Clean up any existing game fees for the test game
    await db('game_fees').where('game_id', testGame.id).del();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    // Clean up test data
    if (testGame) {
      await db('game_fees').where('game_id', testGame.id).del();
    }
  });

  describe('POST /api/game-fees', () => {
    it('should create a new game fee with valid data', async () => {
      const gameFeeData = {
        gameId: testGame.id,
        amount: 150.00,
        paymentStatus: 'pending',
        paymentMethod: 'credit_card',
        notes: 'Test fee'
      };

      const response = await request(app)
        .post('/api/game-fees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameFeeData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.gameFee).toBeDefined();
      expect(response.body.gameFee.amount).toBe(150);
      expect(response.body.gameFee.paymentStatus).toBe('pending');
      expect(response.body.gameFee.gameId).toBe(testGame.id);
      
      // Verify record was created in database
      const createdFee = await db('game_fees').where('game_id', testGame.id).first();
      expect(createdFee).toBeDefined();
      expect(parseFloat(createdFee.amount)).toBe(150);
    });

    it('should auto-set payment date when status is paid', async () => {
      const gameFeeData = {
        gameId: testGame.id,
        amount: 200.00,
        paymentStatus: 'paid',
        paymentMethod: 'check'
      };

      const response = await request(app)
        .post('/api/game-fees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameFeeData);

      expect(response.status).toBe(201);
      expect(response.body.gameFee.paymentDate).toBeDefined();
      expect(response.body.gameFee.paymentStatus).toBe('paid');
    });

    it('should reject invalid amount', async () => {
      const gameFeeData = {
        gameId: testGame.id,
        amount: -50.00
      };

      const response = await request(app)
        .post('/api/game-fees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameFeeData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Amount must be greater than 0');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/game-fees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Game ID and amount are required');
    });

    it('should reject non-existent game', async () => {
      const gameFeeData = {
        gameId: '00000000-0000-0000-0000-000000000000',
        amount: 150.00
      };

      const response = await request(app)
        .post('/api/game-fees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameFeeData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Game not found');
    });

    it('should reject duplicate game fee', async () => {
      // Create first fee
      const gameFeeData = {
        gameId: testGame.id,
        amount: 150.00
      };

      await request(app)
        .post('/api/game-fees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameFeeData);

      // Try to create another fee for same game
      const response = await request(app)
        .post('/api/game-fees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameFeeData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Game fee already exists for this game. Use PUT to update.');
    });

    it('should require admin or finance role', async () => {
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
        .post('/api/game-fees')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          gameId: testGame.id,
          amount: 150.00
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/game-fees', () => {
    beforeEach(async () => {
      // Create test game fee
      testGameFee = await db('game_fees').insert({
        game_id: testGame.id,
        amount: 150.00,
        payment_status: 'pending',
        payment_method: 'credit_card',
        notes: 'Test fee for integration test',
        recorded_by: adminUser.id
      }).returning('*').then(rows => rows[0]);
    });

    it('should return list of game fees with game details', async () => {
      const response = await request(app)
        .get('/api/game-fees')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.gameFees).toBeDefined();
      expect(Array.isArray(response.body.gameFees)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      
      if (response.body.gameFees.length > 0) {
        const fee = response.body.gameFees[0];
        expect(fee).toHaveProperty('id');
        expect(fee).toHaveProperty('amount');
        expect(fee).toHaveProperty('paymentStatus');
        expect(fee).toHaveProperty('game');
        expect(fee.game).toHaveProperty('date');
        expect(fee.game).toHaveProperty('location');
      }
    });

    it('should support status filtering', async () => {
      const response = await request(app)
        .get('/api/game-fees?status=pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.gameFees.forEach(fee => {
        expect(fee.paymentStatus).toBe('pending');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/game-fees?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/game-fees');

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/token|authentication/i);
    });
  });

  describe('PUT /api/game-fees/:id', () => {
    beforeEach(async () => {
      // Create test game fee
      testGameFee = await db('game_fees').insert({
        game_id: testGame.id,
        amount: 150.00,
        payment_status: 'pending',
        payment_method: 'credit_card',
        recorded_by: adminUser.id
      }).returning('*').then(rows => rows[0]);
    });

    it('should update game fee with valid data', async () => {
      const updateData = {
        amount: 200.00,
        paymentStatus: 'paid',
        paymentMethod: 'check',
        notes: 'Updated payment method'
      };

      const response = await request(app)
        .put(`/api/game-fees/${testGameFee.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.gameFee.amount).toBe(200);
      expect(response.body.gameFee.paymentStatus).toBe('paid');
      expect(response.body.gameFee.paymentMethod).toBe('check');
      
      // Verify database was updated
      const updatedFee = await db('game_fees').where('id', testGameFee.id).first();
      expect(parseFloat(updatedFee.amount)).toBe(200);
      expect(updatedFee.payment_status).toBe('paid');
    });

    it('should auto-set payment date when status changes to paid', async () => {
      const response = await request(app)
        .put(`/api/game-fees/${testGameFee.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paymentStatus: 'paid' });

      expect(response.status).toBe(200);
      expect(response.body.gameFee.paymentDate).toBeDefined();
    });

    it('should reject invalid amount', async () => {
      const response = await request(app)
        .put(`/api/game-fees/${testGameFee.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: -100 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Amount must be greater than 0');
    });

    it('should handle non-existent game fee', async () => {
      const response = await request(app)
        .put('/api/game-fees/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 200 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Game fee not found');
    });
  });

  describe('GET /api/game-fees/stats', () => {
    beforeEach(async () => {
      // Create multiple test game fees for stats
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      // Create a recent game to ensure we have fees in the period
      const recentGame = await db('games').insert({
        game_date: pastDate.toISOString().split('T')[0],
        game_time: '19:00',
        location: 'Test Location',
        postal_code: 'V5K 1A1',
        level: 'Competitive',
        pay_rate: 45.00
      }).returning('*').then(rows => rows[0]);

      await db('game_fees').insert([
        {
          game_id: recentGame.id,
          amount: 150.00,
          payment_status: 'paid',
          payment_method: 'credit_card',
          payment_date: pastDate,
          recorded_by: adminUser.id
        },
        {
          game_id: testGame.id,
          amount: 200.00,
          payment_status: 'pending',
          payment_method: 'check',
          recorded_by: adminUser.id
        }
      ]);
    });

    it('should return comprehensive fee statistics', async () => {
      const response = await request(app)
        .get('/api/game-fees/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalFees');
      expect(response.body).toHaveProperty('paidFees');
      expect(response.body).toHaveProperty('pendingFees');
      expect(response.body).toHaveProperty('overdueFees');
      expect(response.body).toHaveProperty('revenueByLevel');
      expect(response.body).toHaveProperty('paymentMethods');
      expect(response.body).toHaveProperty('collectionRate');

      expect(typeof response.body.totalFees.amount).toBe('number');
      expect(typeof response.body.totalFees.count).toBe('number');
      expect(typeof response.body.collectionRate).toBe('number');
      expect(Array.isArray(response.body.revenueByLevel)).toBe(true);
      expect(Array.isArray(response.body.paymentMethods)).toBe(true);
    });

    it('should support period parameter', async () => {
      const response = await request(app)
        .get('/api/game-fees/stats?period=7')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.period).toBe(7);
    });

    it('should require admin or finance role', async () => {
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
        .get('/api/game-fees/stats')
        .set('Authorization', `Bearer ${refereeToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Error handling and robustness', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/api/game-fees')
        .set('Authorization', `Bearer ${authToken}`)
        .send('invalid json');

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(600);
    });

    it('should handle invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/game-fees')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
    });

    it('should maintain consistent response structure', async () => {
      const response = await request(app)
        .get('/api/game-fees')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('gameFees');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('pages');
    });
  });

  describe('Database integration', () => {
    it('should work with existing games table', async () => {
      const games = await db('games').select('id').limit(5);
      expect(games.length).toBeGreaterThan(0);

      const response = await request(app)
        .get('/api/game-fees')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should maintain data integrity with foreign keys', async () => {
      // Create a game fee
      const gameFeeData = {
        gameId: testGame.id,
        amount: 150.00
      };

      const response = await request(app)
        .post('/api/game-fees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameFeeData);

      expect(response.status).toBe(201);
      
      // Verify the fee references the correct game
      const fee = await db('game_fees').where('game_id', testGame.id).first();
      expect(fee).toBeDefined();
      expect(fee.game_id).toBe(testGame.id);
    });

    it('should handle missing teams gracefully', async () => {
      // Even if teams don't exist, the API should work
      const response = await request(app)
        .get('/api/game-fees')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      if (response.body.gameFees.length > 0) {
        response.body.gameFees.forEach(fee => {
          expect(fee.game).toHaveProperty('homeTeam');
          expect(fee.game).toHaveProperty('awayTeam');
          // Teams might be 'TBD' if not assigned
        });
      }
    });
  });
});