const request = require('supertest');
const app = require('../../src/app');
const db = require('../setup');
const jwt = require('jsonwebtoken');

describe('Auth Middleware', () => {
  let validToken, expiredToken, invalidToken, adminToken, refereeToken;

  beforeEach(async () => {
    // Get valid tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@refassign.com',
        password: 'password'
      });
    adminToken = adminLogin.body.data.token;

    const refereeLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'mike@referee.com',
        password: 'password'
      });
    refereeToken = refereeLogin.body.data.token;
    validToken = refereeToken;

    // Create expired token
    expiredToken = jwt.sign(
      { 
        userId: refereeLogin.body.data.user.id,
        email: 'mike@referee.com',
        role: 'referee'
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '-1h' } // Already expired
    );

    // Create invalid token
    invalidToken = jwt.sign(
      { userId: 999, email: 'invalid@test.com' },
      'wrong-secret'
    );
  });

  describe('Authentication Required Routes', () => {
    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });

    it('should reject request with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });

    it('should reject request with expired token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should reject request with invalid token signature', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should reject request with completely invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer completely-invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });
  });

  describe('Admin Authorization', () => {
    it('should allow admin access to admin-only routes', async () => {
      const response = await request(app)
        .get('/api/referees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny referee access to admin-only routes', async () => {
      const response = await request(app)
        .get('/api/referees')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Admin access required');
    });

    it('should deny access to admin routes without token', async () => {
      const response = await request(app)
        .get('/api/referees')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('User Context', () => {
    it('should properly set user context for authenticated requests', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('mike@referee.com');
      expect(response.body.data.user.role).toBe('referee');
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should properly set admin context for admin requests', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('admin@refassign.com');
      expect(response.body.data.user.role).toBe('admin');
    });
  });

  describe('Token Edge Cases', () => {
    it('should handle token with non-existent user', async () => {
      // Create token for non-existent user
      const nonExistentUserToken = jwt.sign(
        { 
          userId: 99999,
          email: 'nonexistent@test.com',
          role: 'referee'
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${nonExistentUserToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should handle token with missing required fields', async () => {
      // Create token without userId
      const incompleteToken = jwt.sign(
        { 
          email: 'test@example.com',
          role: 'referee'
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${incompleteToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should handle empty Bearer token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });

    it('should handle Bearer token with only spaces', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer    ')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin to access all game management functions', async () => {
      // Test creating game
      const createResponse = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          homeTeam: 'Test Home',
          awayTeam: 'Test Away',
          date: '2024-12-31',
          time: '20:00',
          location: 'Test Arena',
          level: 'Adult',
          payRate: 100.00
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);

      // Test updating game
      const gameId = createResponse.body.data.game.id;
      const updateResponse = await request(app)
        .put(`/api/games/${gameId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ homeTeam: 'Updated Home' })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);

      // Test deleting game
      const deleteResponse = await request(app)
        .delete(`/api/games/${gameId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
    });

    it('should restrict referee access to appropriate functions only', async () => {
      // Referee should be able to view games
      const viewResponse = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${refereeToken}`)
        .expect(200);

      expect(viewResponse.body.success).toBe(true);

      // Referee should NOT be able to create games
      const createResponse = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${refereeToken}`)
        .send({
          homeTeam: 'Test Home',
          awayTeam: 'Test Away',
          date: '2024-12-31',
          time: '20:00',
          location: 'Test Arena',
          level: 'Adult',
          payRate: 100.00
        })
        .expect(403);

      expect(createResponse.body.success).toBe(false);
    });
  });
});