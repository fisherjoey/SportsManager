/**
 * @fileoverview Comprehensive Authentication Routes Tests
 * Tests all authentication endpoints with extensive edge cases
 * Critical for system security and user management
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const knex = require('knex');
const config = require('../../knexfile');

// Create test database connection
const testDb = knex(config.test);

// Mock the database module to use test database
jest.mock('../../src/config/database', () => testDb);

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Import auth routes after mocking database
  const authRoutes = require('../../src/routes/auth');
  app.use('/api/auth', authRoutes);
  
  return app;
};

describe('Authentication Routes - Comprehensive Tests', () => {
  let app;

  beforeAll(async () => {
    await testDb.migrate.latest();
  });

  beforeEach(async () => {
    app = createTestApp();
    
    // Clean up test data
    await testDb.raw('TRUNCATE TABLE game_assignments CASCADE');
    await testDb.raw('TRUNCATE TABLE games CASCADE');
    await testDb.raw('TRUNCATE TABLE teams CASCADE');
    await testDb.raw('TRUNCATE TABLE leagues CASCADE');
    await testDb.raw('TRUNCATE TABLE referees CASCADE');
    await testDb.raw('TRUNCATE TABLE users CASCADE');
    await testDb.raw('TRUNCATE TABLE referee_levels CASCADE');
    
    // Set test environment
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_EXPIRES_IN = '24h';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
  });

  afterAll(async () => {
    await testDb.destroy();
  });

  describe('POST /api/auth/login', () => {
    let testUser;
    const testPassword = 'password123';

    beforeEach(async () => {
      const passwordHash = await bcrypt.hash(testPassword, 12);
      [testUser] = await testDb('users').insert({
        email: 'test@login.com',
        password_hash: passwordHash,
        role: 'referee',
        name: 'Test User',
        phone: '(555) 123-4567',
        location: 'Test City',
        postal_code: 'T1S 1A1',
        is_available: true
      }).returning('*');
    });

    describe('Successful Login', () => {
      it('should login with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@login.com',
            password: testPassword
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user.email).toBe('test@login.com');
        expect(response.body.data.user.role).toBe('referee');
        expect(response.body.data.user).not.toHaveProperty('password_hash');
      });

      it('should return JWT token with correct payload', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@login.com',
            password: testPassword
          });

        const token = response.body.data.token;
        const decoded = jwt.verify(token, 'test-secret-key');

        expect(decoded).toHaveProperty('userId', testUser.id);
        expect(decoded).toHaveProperty('email', 'test@login.com');
        expect(decoded).toHaveProperty('role', 'referee');
        expect(decoded).toHaveProperty('roles');
        expect(decoded).toHaveProperty('exp');
        expect(decoded).toHaveProperty('iat');
      });

      it('should handle admin login', async () => {
        const adminPasswordHash = await bcrypt.hash('adminpass', 12);
        await testDb('users').insert({
          email: 'admin@test.com',
          password_hash: adminPasswordHash,
          role: 'admin',
          name: 'Admin User'
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@test.com',
            password: 'adminpass'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.user.role).toBe('admin');
      });

      it('should include referee data for referee users', async () => {
        // Create referee record
        await testDb('referees').insert({
          user_id: testUser.id
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@login.com',
            password: testPassword
          });

        expect(response.status).toBe(200);
        expect(response.body.data.user).toHaveProperty('referee_id');
        expect(response.body.data.user).toHaveProperty('referee');
        expect(response.body.data.user.referee).toHaveProperty('name', 'Test User');
        expect(response.body.data.user.referee).toHaveProperty('phone', '(555) 123-4567');
      });

      it('should handle users with roles array', async () => {
        await testDb('users')
          .where('id', testUser.id)
          .update({ roles: ['referee', 'evaluator'] });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@login.com',
            password: testPassword
          });

        expect(response.status).toBe(200);
        expect(response.body.data.user.roles).toEqual(['referee', 'evaluator']);
      });
    });

    describe('Login Validation', () => {
      it('should reject missing email', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            password: testPassword
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('email');
      });

      it('should reject missing password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@login.com'
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('password');
      });

      it('should reject invalid email format', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'invalid-email',
            password: testPassword
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('email');
      });

      it('should reject password shorter than 6 characters', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@login.com',
            password: '12345' // Too short
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('password');
      });

      it('should reject empty request body', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });

      it('should reject malformed JSON', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .set('Content-Type', 'application/json')
          .send('{ invalid json }');

        expect(response.status).toBe(400);
      });
    });

    describe('Authentication Failures', () => {
      it('should reject non-existent user', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: testPassword
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Invalid credentials');
      });

      it('should reject wrong password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@login.com',
            password: 'wrongpassword'
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Invalid credentials');
      });

      it('should be case-sensitive for email', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'TEST@LOGIN.COM', // Different case
            password: testPassword
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Invalid credentials');
      });

      it('should handle SQL injection attempts in email', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: "test@login.com'; DROP TABLE users; --",
            password: testPassword
          });

        expect(response.status).toBe(400); // Should fail validation
        
        // Verify users table still exists
        const users = await testDb('users').select('*');
        expect(users.length).toBeGreaterThan(0);
      });

      it('should handle extremely long password attempts', async () => {
        const longPassword = 'a'.repeat(10000);
        
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@login.com',
            password: longPassword
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Invalid credentials');
      });
    });

    describe('Rate Limiting & Security', () => {
      it('should handle multiple rapid login attempts', async () => {
        const promises = Array(5).fill().map(() =>
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@login.com',
              password: 'wrongpassword'
            })
        );

        const responses = await Promise.all(promises);
        
        // All should return 401 (not rate limited in test)
        responses.forEach(response => {
          expect(response.status).toBe(401);
        });
      });

      it('should not leak user existence through timing', async () => {
        const start1 = Date.now();
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: testPassword
          });
        const time1 = Date.now() - start1;

        const start2 = Date.now();
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@login.com',
            password: 'wrongpassword'
          });
        const time2 = Date.now() - start2;

        // Times should be similar (both should hash password)
        const timeDiff = Math.abs(time1 - time2);
        expect(timeDiff).toBeLessThan(100); // Allow 100ms difference
      });
    });

    describe('Edge Cases', () => {
      it('should handle user with null password_hash', async () => {
        await testDb('users').insert({
          email: 'nullpass@test.com',
          password_hash: null,
          role: 'referee',
          name: 'Null Pass User'
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nullpass@test.com',
            password: 'anypassword'
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Invalid credentials');
      });

      it('should handle user with empty password_hash', async () => {
        await testDb('users').insert({
          email: 'emptypass@test.com',
          password_hash: '',
          role: 'referee',
          name: 'Empty Pass User'
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'emptypass@test.com',
            password: 'anypassword'
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Invalid credentials');
      });

      it('should handle Unicode characters in email and password', async () => {
        const unicodePassword = 'пароль123';
        const unicodePasswordHash = await bcrypt.hash(unicodePassword, 12);
        
        await testDb('users').insert({
          email: 'тест@example.com',
          password_hash: unicodePasswordHash,
          role: 'referee',
          name: 'Unicode User'
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'тест@example.com',
            password: unicodePassword
          });

        expect(response.status).toBe(200);
        expect(response.body.data.user.name).toBe('Unicode User');
      });

      it('should handle very long email addresses', async () => {
        const longEmail = 'a'.repeat(250) + '@test.com';
        
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: longEmail,
            password: testPassword
          });

        expect(response.status).toBe(401); // User doesn't exist
      });
    });

    describe('Database Connection Issues', () => {
      it('should handle database connection errors gracefully', async () => {
        // Mock database to throw error
        const originalQuery = testDb.raw;
        testDb.raw = jest.fn().mockRejectedValue(new Error('Database connection failed'));

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@login.com',
            password: testPassword
          });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');

        // Restore original function
        testDb.raw = originalQuery;
      });
    });
  });

  describe('POST /api/auth/register', () => {
    let refereeLevel;

    beforeEach(async () => {
      [refereeLevel] = await testDb('referee_levels').insert({
        name: 'Recreational',
        wage_amount: 45.00
      }).returning('*');
    });

    describe('Successful Registration', () => {
      it('should register admin user successfully', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'admin@register.com',
            password: 'password123',
            role: 'admin'
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data.user.email).toBe('admin@register.com');
        expect(response.body.data.user.role).toBe('admin');
      });

      it('should register referee user with complete data', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'referee@register.com',
            password: 'password123',
            role: 'referee',
            referee_data: {
              name: 'Test Referee',
              phone: '(555) 123-4567',
              level: 'Recreational',
              location: 'Test City',
              postal_code: 'T1S 1A1',
              max_distance: 30
            }
          });

        expect(response.status).toBe(201);
        expect(response.body.data.user.role).toBe('referee');
        expect(response.body.data.user).toHaveProperty('referee_id');
        expect(response.body.data.user.referee.name).toBe('Test Referee');
        expect(response.body.data.user.referee.phone).toBe('(555) 123-4567');
      });

      it('should hash password correctly', async () => {
        const password = 'testpassword123';
        
        await request(app)
          .post('/api/auth/register')
          .send({
            email: 'hashtest@register.com',
            password: password,
            role: 'admin'
          });

        const user = await testDb('users').where('email', 'hashtest@register.com').first();
        expect(user.password_hash).toBeDefined();
        expect(user.password_hash).not.toBe(password);
        
        // Verify password can be verified
        const isValid = await bcrypt.compare(password, user.password_hash);
        expect(isValid).toBe(true);
      });

      it('should set default values for referee fields', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'defaults@register.com',
            password: 'password123',
            role: 'referee',
            referee_data: {
              name: 'Test Referee',
              level: 'Recreational',
              postal_code: 'T1S 1A1'
              // Missing optional fields
            }
          });

        expect(response.status).toBe(201);
        expect(response.body.data.user.referee.max_distance).toBe(25); // Default value
      });
    });

    describe('Registration Validation', () => {
      it('should reject missing email', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            password: 'password123',
            role: 'admin'
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('email');
      });

      it('should reject invalid email format', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'invalid-email',
            password: 'password123',
            role: 'admin'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('email');
      });

      it('should reject short password', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@register.com',
            password: '123', // Too short
            role: 'admin'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('password');
      });

      it('should reject invalid role', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@register.com',
            password: 'password123',
            role: 'invalid_role'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('role');
      });

      it('should require referee_data for referee role', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'referee@register.com',
            password: 'password123',
            role: 'referee'
            // Missing referee_data
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('referee_data');
      });

      it('should reject referee_data for admin role', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'admin@register.com',
            password: 'password123',
            role: 'admin',
            referee_data: {
              name: 'Should not be allowed',
              level: 'Recreational',
              postal_code: 'T1S 1A1'
            }
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('referee_data');
      });

      it('should validate referee level', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'referee@register.com',
            password: 'password123',
            role: 'referee',
            referee_data: {
              name: 'Test Referee',
              level: 'InvalidLevel',
              postal_code: 'T1S 1A1'
            }
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('level');
      });

      it('should validate max_distance range', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'referee@register.com',
            password: 'password123',
            role: 'referee',
            referee_data: {
              name: 'Test Referee',
              level: 'Recreational',
              postal_code: 'T1S 1A1',
              max_distance: 500 // Too large
            }
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('max_distance');
      });

      it('should validate postal_code length', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'referee@register.com',
            password: 'password123',
            role: 'referee',
            referee_data: {
              name: 'Test Referee',
              level: 'Recreational',
              postal_code: 'T1S 1A1 EXTRA LONG' // Too long
            }
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('postal_code');
      });
    });

    describe('Duplicate Registration', () => {
      beforeEach(async () => {
        await testDb('users').insert({
          email: 'existing@test.com',
          password_hash: await bcrypt.hash('password123', 12),
          role: 'admin',
          name: 'Existing User'
        });
      });

      it('should reject duplicate email registration', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'existing@test.com',
            password: 'password123',
            role: 'admin'
          });

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('already exists');
      });

      it('should be case-insensitive for duplicate email check', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'EXISTING@TEST.COM', // Different case
            password: 'password123',
            role: 'admin'
          });

        expect(response.status).toBe(409);
      });
    });

    describe('Database Constraints', () => {
      it('should handle transaction rollback on referee creation failure', async () => {
        // Mock referees table to fail
        const originalInsert = testDb('referees').insert;
        testDb.fn.mockImplementationOnce(() => {
          throw new Error('Referee creation failed');
        });

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'rollback@test.com',
            password: 'password123',
            role: 'referee',
            referee_data: {
              name: 'Test Referee',
              level: 'Recreational',
              postal_code: 'T1S 1A1'
            }
          });

        expect(response.status).toBe(500);

        // Verify user was not created (transaction rolled back)
        const user = await testDb('users').where('email', 'rollback@test.com').first();
        expect(user).toBeUndefined();
      });
    });
  });

  describe('GET /api/auth/me', () => {
    let testUser, authToken;

    beforeEach(async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      [testUser] = await testDb('users').insert({
        email: 'me@test.com',
        password_hash: passwordHash,
        role: 'referee',
        name: 'Me Test User'
      }).returning('*');

      authToken = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        'test-secret-key',
        { expiresIn: '1h' }
      );
    });

    it('should return current user data', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('me@test.com');
      expect(response.body.data.user.name).toBe('Me Test User');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        'test-secret-key',
        { expiresIn: '-1h' } // Expired
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });
  });
});