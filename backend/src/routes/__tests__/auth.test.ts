/**
 * @fileoverview Comprehensive unit tests for Auth routes
 * @description Tests authentication endpoints including login, register, profile, and token refresh
 * with proper security measures, validation, rate limiting, and error handling
 */

import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

// Mock dependencies
const mockDb = {
  where: jest.fn(() => mockDb),
  join: jest.fn(() => mockDb),
  select: jest.fn(() => mockDb),
  first: jest.fn(),
  insert: jest.fn(),
  returning: jest.fn(() => mockDb),
  transaction: jest.fn(),
  // For the main query method
  then: jest.fn()
};

const mockTransaction = {
  commit: jest.fn(),
  rollback: jest.fn(),
  insert: jest.fn(() => mockTransaction),
  returning: jest.fn(() => mockTransaction)
};

const mockMiddleware = {
  authLimiter: jest.fn((req: any, res: any, next: any) => next()),
  registrationLimiter: jest.fn((req: any, res: any, next: any) => next()),
  passwordResetLimiter: jest.fn((req: any, res: any, next: any) => next()),
  sanitizeAll: jest.fn((req: any, res: any, next: any) => next()),
  asyncHandler: jest.fn((handler: any) => handler),
  authenticateToken: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      roles: ['referee']
    };
    next();
  }),
  getUserPermissions: jest.fn()
};

const mockAuditTrail = {
  createAuditLog: jest.fn(),
  AUDIT_EVENTS: {
    AUTH_LOGIN_SUCCESS: 'auth_login_success',
    AUTH_LOGIN_FAILURE: 'auth_login_failure',
    AUTH_REGISTER: 'auth_register'
  }
};

const mockLocationService = {
  createOrUpdateUserLocation: jest.fn()
};

const mockProductionMonitor = {
  logCriticalPath: jest.fn()
};

// Mock bcrypt
jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    compare: jest.fn(),
    hash: jest.fn()
  }
}));

// Mock JWT
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jest.fn(),
    verify: jest.fn()
  }
}));

// Mock modules
jest.unstable_mockModule('../../config/database', () => ({
  default: mockDb
}));

jest.unstable_mockModule('../../middleware/auth', () => ({
  authenticateToken: mockMiddleware.authenticateToken,
  getUserPermissions: mockMiddleware.getUserPermissions
}));

jest.unstable_mockModule('../../middleware/rateLimiting', () => ({
  authLimiter: mockMiddleware.authLimiter,
  registrationLimiter: mockMiddleware.registrationLimiter,
  passwordResetLimiter: mockMiddleware.passwordResetLimiter
}));

jest.unstable_mockModule('../../middleware/sanitization', () => ({
  sanitizeAll: mockMiddleware.sanitizeAll
}));

jest.unstable_mockModule('../../middleware/errorHandling', () => ({
  asyncHandler: mockMiddleware.asyncHandler,
  AuthenticationError: class AuthenticationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'AuthenticationError';
    }
  },
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  }
}));

jest.unstable_mockModule('../../middleware/auditTrail', () => ({
  createAuditLog: mockAuditTrail.createAuditLog,
  AUDIT_EVENTS: mockAuditTrail.AUDIT_EVENTS
}));

jest.unstable_mockModule('../../services/LocationDataService', () => ({
  default: class MockLocationDataService {
    createOrUpdateUserLocation = mockLocationService.createOrUpdateUserLocation;
  }
}));

jest.unstable_mockModule('../../utils/monitor', () => ({
  ProductionMonitor: mockProductionMonitor
}));

// Setup environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';

// Create mock app
const app = express();
app.use(express.json());

// Import the router after mocking
const authRouter = (await import('../auth.js')).default;
app.use('/api/auth', authRouter);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock database
    mockDb.first.mockResolvedValue(null);
    mockDb.insert.mockResolvedValue([]);
    mockDb.returning.mockReturnValue(mockDb);
    mockDb.transaction.mockResolvedValue(mockTransaction);
    mockDb.then.mockImplementation((callback: Function) => callback([]));

    // Reset transaction mocks
    mockTransaction.commit.mockResolvedValue();
    mockTransaction.rollback.mockResolvedValue();
    mockTransaction.insert.mockResolvedValue([]);
    mockTransaction.returning.mockReturnValue(mockTransaction);

    // Reset auth functions
    mockMiddleware.getUserPermissions.mockResolvedValue(['games:view', 'assignments:view']);

    // Reset bcrypt mocks
    bcrypt.compare = jest.fn() as any;
    bcrypt.hash = jest.fn() as any;
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    // Reset JWT mocks
    jwt.sign = jest.fn() as any;
    jwt.verify = jest.fn() as any;
    (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');
  });

  describe('POST /api/auth/login', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password_hash: 'hashed-password',
      role: 'referee',
      name: 'Test User',
      phone: '123-456-7890',
      location: 'Toronto',
      postal_code: 'M5V 3A8',
      max_distance: 25,
      is_available: true,
      wage_per_game: 50,
      referee_level_id: 'level-1',
      year_started_refereeing: 2020,
      games_refereed_season: 15,
      evaluation_score: 4.5,
      notes: 'Test notes',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z'
    };

    const mockUserRoles = [
      { name: 'referee', id: 'role-1' }
    ];

    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('should login successfully with valid credentials', async () => {
      mockDb.first
        .mockResolvedValueOnce(mockUser) // User lookup
        .mockResolvedValueOnce(mockUserRoles); // Roles lookup

      mockDb.then.mockImplementation((callback: Function) => callback(mockUserRoles));

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.token).toBe('mock-jwt-token');
      expect(response.body.user).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          roles: ['referee'],
          permissions: ['games:view', 'assignments:view'],
          name: mockUser.name,
          phone: mockUser.phone
        })
      );

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          roles: ['referee']
        }),
        'test-secret-key',
        { expiresIn: '7d' }
      );

      expect(mockAuditTrail.createAuditLog).toHaveBeenCalledWith({
        event_type: mockAuditTrail.AUDIT_EVENTS.AUTH_LOGIN_SUCCESS,
        user_id: mockUser.id,
        user_email: mockUser.email,
        ip_address: expect.any(String),
        user_agent: expect.any(String),
        success: true
      });
    });

    it('should fail login with invalid email', async () => {
      mockDb.first.mockResolvedValue(null); // User not found

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toBeDefined();
      expect(mockAuditTrail.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: mockAuditTrail.AUDIT_EVENTS.AUTH_LOGIN_FAILURE,
          user_email: loginData.email,
          success: false,
          error_message: 'Invalid credentials - user not found'
        })
      );
    });

    it('should fail login with invalid password', async () => {
      mockDb.first.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toBeDefined();
      expect(mockAuditTrail.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: mockAuditTrail.AUDIT_EVENTS.AUTH_LOGIN_FAILURE,
          user_id: mockUser.id,
          user_email: mockUser.email,
          success: false,
          error_message: 'Invalid credentials - wrong password'
        })
      );
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        })
        .expect(400);

      expect(response.body).toBeDefined();
    });

    it('should validate password minimum length', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: '123'
        })
        .expect(400);

      expect(response.body).toBeDefined();
    });

    it('should handle missing user permissions gracefully', async () => {
      mockDb.first.mockResolvedValue(mockUser);
      mockDb.then.mockImplementation((callback: Function) => callback([]));
      mockMiddleware.getUserPermissions.mockRejectedValue(new Error('Permission service down'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.user.permissions).toEqual([]);
    });

    it('should handle missing user roles gracefully', async () => {
      mockDb.first.mockResolvedValue(mockUser);
      mockDb.then.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.user.roles).toEqual([]);
    });

    it('should apply rate limiting', async () => {
      mockMiddleware.authLimiter.mockImplementation((req: any, res: any, next: any) => {
        res.status(429).json({ error: 'Too many login attempts' });
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429);

      expect(response.body.error).toBe('Too many login attempts');
    });

    it('should sanitize input data', async () => {
      mockDb.first.mockResolvedValue(mockUser);
      mockDb.then.mockImplementation((callback: Function) => callback([]));

      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(mockMiddleware.sanitizeAll).toHaveBeenCalled();
    });

    it('should limit roles in JWT token to prevent size issues', async () => {
      const manyRoles = Array(10).fill(0).map((_, i) => ({ name: `role-${i}`, id: `id-${i}` }));
      mockDb.first.mockResolvedValue(mockUser);
      mockDb.then.mockImplementation((callback: Function) => callback(manyRoles));

      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: expect.arrayContaining([
            'role-0', 'role-1', 'role-2', 'role-3', 'role-4'
          ])
        }),
        'test-secret-key',
        { expiresIn: '7d' }
      );
    });
  });

  describe('POST /api/auth/register', () => {
    const registerData = {
      email: 'newuser@example.com',
      password: 'password123',
      role: 'referee',
      name: 'New User',
      phone: '123-456-7890',
      location: 'Toronto',
      postal_code: 'M5V 3A8',
      max_distance: 25,
      referee_level_id: 'level-1',
      year_started_refereeing: 2023,
      notes: 'New referee'
    };

    const mockNewUser = {
      id: 'new-user-123',
      email: registerData.email,
      role: registerData.role,
      name: registerData.name,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z'
    };

    it('should register new referee successfully', async () => {
      mockDb.first.mockResolvedValue(null); // No existing user
      mockDb.insert.mockResolvedValue([mockNewUser]);
      mockTransaction.insert.mockResolvedValue([mockNewUser]);

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: mockNewUser.id,
          email: mockNewUser.email,
          roles: [],
          permissions: ['games:view', 'assignments:view']
        })
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockTransaction.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerData.email,
          password_hash: 'hashed-password',
          role: 'referee',
          name: registerData.name
        })
      );

      expect(mockAuditTrail.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: mockAuditTrail.AUDIT_EVENTS.AUTH_REGISTER,
          user_id: mockNewUser.id,
          user_email: registerData.email,
          success: true
        })
      );
    });

    it('should register admin user with minimal data', async () => {
      const adminData = {
        email: 'admin@example.com',
        password: 'adminpass123',
        role: 'admin'
      };

      mockDb.first.mockResolvedValue(null);
      mockDb.insert.mockResolvedValue([{ ...mockNewUser, role: 'admin' }]);
      mockTransaction.insert.mockResolvedValue([{ ...mockNewUser, role: 'admin' }]);

      const response = await request(app)
        .post('/api/auth/register')
        .send(adminData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockTransaction.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: adminData.email,
          role: 'admin'
        })
      );
    });

    it('should reject registration with existing email', async () => {
      mockDb.first.mockResolvedValue({ id: 'existing-user', email: registerData.email });

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(400);

      expect(response.body).toBeDefined();
    });

    it('should validate required fields for referee role', async () => {
      const incompleteData = {
        email: 'referee@example.com',
        password: 'password123',
        role: 'referee'
        // Missing required name and postal_code for referee
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body).toBeDefined();
    });

    it('should validate email format', async () => {
      const invalidData = {
        ...registerData,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toBeDefined();
    });

    it('should validate password minimum length', async () => {
      const invalidData = {
        ...registerData,
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toBeDefined();
    });

    it('should validate role values', async () => {
      const invalidData = {
        ...registerData,
        role: 'invalid-role'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toBeDefined();
    });

    it('should apply registration rate limiting', async () => {
      mockMiddleware.registrationLimiter.mockImplementation((req: any, res: any, next: any) => {
        res.status(429).json({ error: 'Too many registration attempts' });
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(429);

      expect(response.body.error).toBe('Too many registration attempts');
    });

    it('should handle transaction rollback on error', async () => {
      mockDb.first.mockResolvedValue(null);
      mockTransaction.insert.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(500);

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should create location data for referees asynchronously', async () => {
      mockDb.first.mockResolvedValue(null);
      mockDb.insert.mockResolvedValue([mockNewUser]);
      mockTransaction.insert.mockResolvedValue([mockNewUser]);

      await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(201);

      // Allow async operation to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockLocationService.createOrUpdateUserLocation).toHaveBeenCalledWith(
        mockNewUser.id,
        registerData.location
      );
    });

    it('should handle location service errors gracefully', async () => {
      mockDb.first.mockResolvedValue(null);
      mockDb.insert.mockResolvedValue([mockNewUser]);
      mockTransaction.insert.mockResolvedValue([mockNewUser]);
      mockLocationService.createOrUpdateUserLocation.mockRejectedValue(new Error('Location service error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(201);

      // Allow async operation to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create location data'),
        'Location service error'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('GET /api/auth/me', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'referee',
      name: 'Test User',
      phone: '123-456-7890',
      location: 'Toronto',
      postal_code: 'M5V 3A8',
      max_distance: 25,
      is_available: true,
      wage_per_game: 50,
      referee_level_id: 'level-1',
      year_started_refereeing: 2020,
      games_refereed_season: 15,
      evaluation_score: 4.5,
      notes: 'Test notes',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z'
    };

    const mockUserRoles = [
      { name: 'referee', id: 'role-1' }
    ];

    it('should return user profile successfully', async () => {
      mockDb.first.mockResolvedValue(mockUser);
      mockDb.then.mockImplementation((callback: Function) => callback(mockUserRoles));

      const response = await request(app)
        .get('/api/auth/me')
        .expect(200);

      expect(response.body.user).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          roles: ['referee'],
          permissions: ['games:view', 'assignments:view'],
          name: mockUser.name,
          phone: mockUser.phone
        })
      );
    });

    it('should require authentication', async () => {
      mockMiddleware.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Not authenticated' });
      });

      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });

    it('should handle missing user in request', async () => {
      mockMiddleware.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        req.user = null;
        next();
      });

      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Not authenticated');
    });

    it('should handle user not found in database', async () => {
      mockDb.first.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/me')
        .expect(404);

      expect(response.body.user).toEqual({});
    });

    it('should handle permissions service errors gracefully', async () => {
      mockDb.first.mockResolvedValue(mockUser);
      mockDb.then.mockImplementation((callback: Function) => callback([]));
      mockMiddleware.getUserPermissions.mockRejectedValue(new Error('Permissions service error'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const response = await request(app)
        .get('/api/auth/me')
        .expect(200);

      expect(response.body.user.permissions).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get user permissions for profile:',
        'Permissions service error'
      );

      consoleSpy.mockRestore();
    });

    it('should handle roles service errors gracefully', async () => {
      mockDb.first.mockResolvedValue(mockUser);
      mockDb.then.mockRejectedValue(new Error('Roles service error'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const response = await request(app)
        .get('/api/auth/me')
        .expect(200);

      expect(response.body.user.roles).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get user roles for profile:',
        'Roles service error'
      );

      consoleSpy.mockRestore();
    });

    it('should handle database errors', async () => {
      mockDb.first.mockRejectedValue(new Error('Database connection error'));

      const response = await request(app)
        .get('/api/auth/me')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/auth/refresh-permissions', () => {
    it('should refresh user permissions successfully', async () => {
      const freshPermissions = ['games:view', 'games:create', 'assignments:view'];
      mockMiddleware.getUserPermissions.mockResolvedValue(freshPermissions);

      const response = await request(app)
        .post('/api/auth/refresh-permissions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.permissions).toEqual(freshPermissions);
      expect(response.body.message).toBe('Permissions refreshed successfully');
      expect(mockMiddleware.getUserPermissions).toHaveBeenCalledWith('test-user-id', false);
    });

    it('should require authentication', async () => {
      mockMiddleware.authenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Access token required' });
      });

      const response = await request(app)
        .post('/api/auth/refresh-permissions')
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });

    it('should handle permissions service errors', async () => {
      mockMiddleware.getUserPermissions.mockRejectedValue(new Error('Permissions service down'));

      const response = await request(app)
        .post('/api/auth/refresh-permissions')
        .expect(500);

      expect(response.body).toBeDefined();
    });
  });

  describe('Security Features', () => {
    it('should use secure password hashing with salt rounds', async () => {
      const registerData = {
        email: 'secure@example.com',
        password: 'securepass123',
        role: 'referee',
        name: 'Secure User',
        postal_code: 'M5V 3A8'
      };

      mockDb.first.mockResolvedValue(null);
      mockDb.insert.mockResolvedValue([{ id: 'user-1' }]);
      mockTransaction.insert.mockResolvedValue([{ id: 'user-1' }]);

      await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(201);

      expect(bcrypt.hash).toHaveBeenCalledWith('securepass123', 12);
    });

    it('should not include sensitive data in JWT token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'sensitive-hash',
        role: 'referee'
      };

      mockDb.first.mockResolvedValue(mockUser);
      mockDb.then.mockImplementation((callback: Function) => callback([]));

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.not.objectContaining({
          password_hash: expect.any(String),
          permissions: expect.any(Array)
        }),
        'test-secret-key',
        { expiresIn: '7d' }
      );
    });

    it('should log security events for monitoring', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        role: 'referee'
      };

      mockDb.first.mockResolvedValue(mockUser);
      mockDb.then.mockImplementation((callback: Function) => callback([]));

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);

      expect(mockProductionMonitor.logCriticalPath).toHaveBeenCalledWith(
        'auth.login',
        expect.objectContaining({
          userId: mockUser.id,
          roles: expect.any(Array),
          ip: expect.any(String)
        })
      );
    });

    it('should sanitize all input data', async () => {
      const loginData = {
        email: '<script>alert("xss")</script>@test.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401); // Will fail due to invalid email format

      expect(mockMiddleware.sanitizeAll).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should wrap handlers with async error handling', async () => {
      // Verify that all route handlers are wrapped with asyncHandler
      expect(mockMiddleware.asyncHandler).toHaveBeenCalledTimes(4); // 4 route handlers
    });

    it('should handle validation errors properly', async () => {
      const invalidLogin = {
        email: 'not-an-email',
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidLogin)
        .expect(400);

      expect(response.body).toBeDefined();
    });

    it('should handle database connection errors', async () => {
      mockDb.first.mockRejectedValue(new Error('Connection refused'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(500);

      expect(response.body).toBeDefined();
    });

    it('should handle JWT signing errors', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        role: 'referee'
      };

      mockDb.first.mockResolvedValue(mockUser);
      mockDb.then.mockImplementation((callback: Function) => callback([]));
      (jwt.sign as jest.Mock).mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(500);

      expect(response.body).toBeDefined();
    });
  });
});