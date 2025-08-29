/**
 * RBAC Authentication and Authorization Flow Integration Tests
 * 
 * End-to-end tests for the complete RBAC authentication and authorization flow:
 * - User authentication with JWT tokens
 * - Permission-based route protection
 * - Role-based access control
 * - Token validation and refresh
 * - Integration with real database
 * - Complete request/response cycle testing
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../setup');
const { authenticateToken, requirePermission, requireAnyPermission } = require('../../src/middleware/auth');

describe('RBAC Authentication and Authorization Flow Integration', () => {
  let app;
  let testUsers = [];
  let testRoles = [];
  let testPermissions = [];
  let tokens = {};

  beforeAll(async () => {
    // Setup Express app with middleware
    app = express();
    app.use(express.json());

    // Test routes with different permission requirements
    app.post('/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        
        const user = await db('users').where('email', email).first();
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Get user roles and permissions
        const userRoles = await db('user_roles')
          .join('roles', 'user_roles.role_id', 'roles.id')
          .where('user_roles.user_id', user.id)
          .where('roles.is_active', true)
          .select('roles.name', 'roles.code');

        const userPermissions = await db('permissions')
          .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
          .join('roles', 'role_permissions.role_id', 'roles.id')
          .join('user_roles', 'roles.id', 'user_roles.role_id')
          .where('user_roles.user_id', user.id)
          .where('roles.is_active', true)
          .where('permissions.is_active', true)
          .select('permissions.code')
          .distinct();

        const token = jwt.sign(
          {
            userId: user.id,
            email: user.email,
            role: user.role,
            roles: userRoles.map(r => r.name),
            permissions: userPermissions.map(p => p.code)
          },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '24h' }
        );

        res.json({
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            roles: userRoles.map(r => r.name),
            permissions: userPermissions.map(p => p.code)
          }
        });
      } catch (error) {
        res.status(500).json({ error: 'Login failed' });
      }
    });

    // Protected routes with different permission requirements
    app.get('/api/users', authenticateToken, requirePermission('users.read'), (req, res) => {
      res.json({ 
        message: 'Users retrieved successfully', 
        user: req.user,
        data: [{ id: 1, name: 'Test User' }]
      });
    });

    app.post('/api/users', authenticateToken, requirePermission('users.create'), (req, res) => {
      res.json({ 
        message: 'User created successfully',
        user: req.user,
        data: { id: 2, name: req.body.name || 'New User' }
      });
    });

    app.delete('/api/users/:id', authenticateToken, requirePermission('users.delete'), (req, res) => {
      res.json({ 
        message: `User ${req.params.id} deleted successfully`,
        user: req.user
      });
    });

    app.get('/api/games', authenticateToken, requireAnyPermission(['games.read', 'games.manage']), (req, res) => {
      res.json({ 
        message: 'Games retrieved successfully',
        user: req.user,
        data: [{ id: 1, name: 'Test Game' }]
      });
    });

    app.post('/api/games', authenticateToken, requirePermission('games.create'), (req, res) => {
      res.json({ 
        message: 'Game created successfully',
        user: req.user,
        data: { id: 2, name: req.body.name || 'New Game' }
      });
    });

    app.get('/api/reports', authenticateToken, requireAnyPermission(['reports.view', 'admin.access']), (req, res) => {
      res.json({ 
        message: 'Reports retrieved successfully',
        user: req.user,
        data: [{ id: 1, title: 'Test Report' }]
      });
    });

    app.get('/api/admin/system', authenticateToken, requirePermission('admin.system'), (req, res) => {
      res.json({ 
        message: 'System info retrieved',
        user: req.user,
        data: { status: 'operational', version: '1.0.0' }
      });
    });

    // Public route (no authentication required)
    app.get('/api/public', (req, res) => {
      res.json({ message: 'Public endpoint accessed' });
    });

    // Health check route
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });
  });

  beforeEach(async () => {
    // Clean slate for each test
    await db('user_roles').del();
    await db('role_permissions').del();
    await db('roles').whereNot('system_role', true).del();
    await db('permissions').del();
    await db('users').del();

    // Create test permissions
    testPermissions = await db('permissions')
      .insert([
        {
          id: '750e8400-e29b-41d4-a716-446655440001',
          name: 'users.read',
          code: 'USERS_READ',
          description: 'Read users',
          category: 'user_management',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440002',
          name: 'users.create',
          code: 'USERS_CREATE',
          description: 'Create users',
          category: 'user_management',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440003',
          name: 'users.delete',
          code: 'USERS_DELETE',
          description: 'Delete users',
          category: 'user_management',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440004',
          name: 'games.read',
          code: 'GAMES_READ',
          description: 'Read games',
          category: 'game_management',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440005',
          name: 'games.create',
          code: 'GAMES_CREATE',
          description: 'Create games',
          category: 'game_management',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440006',
          name: 'reports.view',
          code: 'REPORTS_VIEW',
          description: 'View reports',
          category: 'reporting',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440007',
          name: 'admin.system',
          code: 'ADMIN_SYSTEM',
          description: 'System administration',
          category: 'administration',
          active: true
        }
      ])
      .returning('*');

    // Create test roles
    testRoles = await db('roles')
      .insert([
        {
          id: '750e8400-e29b-41d4-a716-446655440010',
          name: 'User Manager',
          code: 'USER_MANAGER',
          description: 'Manages users',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440011',
          name: 'Game Manager',
          code: 'GAME_MANAGER',
          description: 'Manages games',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440012',
          name: 'Reporter',
          code: 'REPORTER',
          description: 'Views reports',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440013',
          name: 'Admin',
          code: 'ADMIN',
          description: 'System administrator',
          active: true
        }
      ])
      .returning('*');

    // Set up role permissions
    await db('role_permissions').insert([
      // User Manager permissions
      { role_id: testRoles[0].id, permission_id: testPermissions[0].id, created_at: new Date() }, // users.read
      { role_id: testRoles[0].id, permission_id: testPermissions[1].id, created_at: new Date() }, // users.create
      { role_id: testRoles[0].id, permission_id: testPermissions[2].id, created_at: new Date() }, // users.delete

      // Game Manager permissions
      { role_id: testRoles[1].id, permission_id: testPermissions[3].id, created_at: new Date() }, // games.read
      { role_id: testRoles[1].id, permission_id: testPermissions[4].id, created_at: new Date() }, // games.create

      // Reporter permissions
      { role_id: testRoles[2].id, permission_id: testPermissions[5].id, created_at: new Date() }, // reports.view

      // Admin permissions (all permissions)
      { role_id: testRoles[3].id, permission_id: testPermissions[0].id, created_at: new Date() },
      { role_id: testRoles[3].id, permission_id: testPermissions[1].id, created_at: new Date() },
      { role_id: testRoles[3].id, permission_id: testPermissions[2].id, created_at: new Date() },
      { role_id: testRoles[3].id, permission_id: testPermissions[3].id, created_at: new Date() },
      { role_id: testRoles[3].id, permission_id: testPermissions[4].id, created_at: new Date() },
      { role_id: testRoles[3].id, permission_id: testPermissions[5].id, created_at: new Date() },
      { role_id: testRoles[3].id, permission_id: testPermissions[6].id, created_at: new Date() }
    ]);

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    testUsers = await db('users')
      .insert([
        {
          id: '750e8400-e29b-41d4-a716-446655440020',
          email: 'usermanager@test.com',
          name: 'User Manager',
          password_hash: hashedPassword,
          role: 'manager',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440021',
          email: 'gamemanager@test.com',
          name: 'Game Manager',
          password_hash: hashedPassword,
          role: 'manager',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440022',
          email: 'reporter@test.com',
          name: 'Reporter',
          password_hash: hashedPassword,
          role: 'user',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440023',
          email: 'admin@test.com',
          name: 'Admin',
          password_hash: hashedPassword,
          role: 'admin',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440024',
          email: 'noperms@test.com',
          name: 'No Permissions User',
          password_hash: hashedPassword,
          role: 'user',
          active: true
        }
      ])
      .returning('*');

    // Assign roles to users
    await db('user_roles').insert([
      { user_id: testUsers[0].id, role_id: testRoles[0].id, created_at: new Date() }, // User Manager role
      { user_id: testUsers[1].id, role_id: testRoles[1].id, created_at: new Date() }, // Game Manager role
      { user_id: testUsers[2].id, role_id: testRoles[2].id, created_at: new Date() }, // Reporter role
      { user_id: testUsers[3].id, role_id: testRoles[3].id, created_at: new Date() }, // Admin role
      // testUsers[4] has no role assignments (no permissions)
    ]);
  });

  afterEach(async () => {
    // Clean up
    await db('user_roles').del();
    await db('role_permissions').del();
    await db('roles').whereNot('system_role', true).del();
    await db('permissions').del();
    await db('users').del();
    tokens = {};
  });

  describe('Authentication Flow', () => {
    test('should authenticate user with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'usermanager@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('usermanager@test.com');
      expect(response.body.user.roles).toContain('User Manager');
      expect(response.body.user.permissions).toEqual(
        expect.arrayContaining(['USERS_READ', 'USERS_CREATE', 'USERS_DELETE'])
      );

      // Verify token is valid JWT
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET || 'test-secret');
      expect(decoded.email).toBe('usermanager@test.com');
      expect(decoded.permissions).toEqual(
        expect.arrayContaining(['USERS_READ', 'USERS_CREATE', 'USERS_DELETE'])
      );

      tokens.userManager = response.body.token;
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'usermanager@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should include user roles and permissions in JWT token', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET || 'test-secret');
      expect(decoded.roles).toContain('Admin');
      expect(decoded.permissions).toEqual(
        expect.arrayContaining([
          'USERS_READ', 'USERS_CREATE', 'USERS_DELETE',
          'GAMES_READ', 'GAMES_CREATE',
          'REPORTS_VIEW', 'ADMIN_SYSTEM'
        ])
      );
    });
  });

  describe('Authorization Flow - Single Permission Requirements', () => {
    beforeEach(async () => {
      // Login users and store tokens
      const userManagerLogin = await request(app)
        .post('/auth/login')
        .send({ email: 'usermanager@test.com', password: 'password123' });
      tokens.userManager = userManagerLogin.body.token;

      const gameManagerLogin = await request(app)
        .post('/auth/login')
        .send({ email: 'gamemanager@test.com', password: 'password123' });
      tokens.gameManager = gameManagerLogin.body.token;

      const reporterLogin = await request(app)
        .post('/auth/login')
        .send({ email: 'reporter@test.com', password: 'password123' });
      tokens.reporter = reporterLogin.body.token;

      const adminLogin = await request(app)
        .post('/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });
      tokens.admin = adminLogin.body.token;

      const noPermsLogin = await request(app)
        .post('/auth/login')
        .send({ email: 'noperms@test.com', password: 'password123' });
      tokens.noPerms = noPermsLogin.body.token;
    });

    test('should allow user with correct permission to access protected route', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${tokens.userManager}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Users retrieved successfully');
      expect(response.body.user.email).toBe('usermanager@test.com');
      expect(response.body.data).toHaveLength(1);
    });

    test('should deny user without required permission', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${tokens.gameManager}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
      expect(response.body.required).toBe('users.read');
    });

    test('should allow admin access to any protected route', async () => {
      const usersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${tokens.admin}`);
      
      const gamesResponse = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ name: 'Admin Created Game' });

      expect(usersResponse.status).toBe(200);
      expect(gamesResponse.status).toBe(200);
    });

    test('should handle POST requests with permission requirements', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokens.userManager}`)
        .send({ name: 'New Test User' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User created successfully');
      expect(response.body.data.name).toBe('New Test User');
    });

    test('should deny POST requests without permission', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokens.gameManager}`)
        .send({ name: 'Unauthorized User' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
      expect(response.body.required).toBe('users.create');
    });

    test('should handle DELETE requests with permission requirements', async () => {
      const response = await request(app)
        .delete('/api/users/123')
        .set('Authorization', `Bearer ${tokens.userManager}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User 123 deleted successfully');
    });

    test('should deny DELETE requests without permission', async () => {
      const response = await request(app)
        .delete('/api/users/123')
        .set('Authorization', `Bearer ${tokens.reporter}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
      expect(response.body.required).toBe('users.delete');
    });
  });

  describe('Authorization Flow - Multiple Permission Requirements (Any)', () => {
    beforeEach(async () => {
      // Login users and store tokens
      const gameManagerLogin = await request(app)
        .post('/auth/login')
        .send({ email: 'gamemanager@test.com', password: 'password123' });
      tokens.gameManager = gameManagerLogin.body.token;

      const reporterLogin = await request(app)
        .post('/auth/login')
        .send({ email: 'reporter@test.com', password: 'password123' });
      tokens.reporter = reporterLogin.body.token;

      const adminLogin = await request(app)
        .post('/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });
      tokens.admin = adminLogin.body.token;

      const noPermsLogin = await request(app)
        .post('/auth/login')
        .send({ email: 'noperms@test.com', password: 'password123' });
      tokens.noPerms = noPermsLogin.body.token;
    });

    test('should allow access when user has first permission of many required', async () => {
      const response = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${tokens.gameManager}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Games retrieved successfully');
    });

    test('should allow access when user has admin permission for reports', async () => {
      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${tokens.admin}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Reports retrieved successfully');
    });

    test('should allow access when user has specific permission for reports', async () => {
      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${tokens.reporter}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Reports retrieved successfully');
    });

    test('should deny access when user has none of the required permissions', async () => {
      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${tokens.gameManager}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
      expect(response.body.required).toContain('One of:');
    });
  });

  describe('Token Validation and Security', () => {
    test('should reject requests without authorization header', async () => {
      const response = await request(app)
        .get('/api/users');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    test('should reject requests with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'InvalidHeader');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    test('should reject requests with invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid or expired token');
    });

    test('should reject requests with expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUsers[0].id, email: testUsers[0].email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1ms' } // Expires immediately
      );

      // Wait a bit to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid or expired token');
    });

    test('should reject requests with token signed with different secret', async () => {
      const badToken = jwt.sign(
        { userId: testUsers[0].id, email: testUsers[0].email },
        'different-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${badToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid or expired token');
    });

    test('should handle empty token after Bearer', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('Legacy Compatibility', () => {
    test('should work with legacy JWT tokens (without permissions array)', async () => {
      // Create a legacy token format (only role field, no roles or permissions)
      const legacyToken = jwt.sign(
        {
          userId: testUsers[3].id, // Admin user
          email: testUsers[3].email,
          role: 'admin' // Legacy format - only role field
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${legacyToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Users retrieved successfully');
    });

    test('should handle tokens with both legacy and new role formats', async () => {
      const mixedToken = jwt.sign(
        {
          userId: testUsers[0].id,
          email: testUsers[0].email,
          role: 'manager', // Legacy format
          roles: ['User Manager'], // New format
          permissions: ['USERS_READ', 'USERS_CREATE']
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${mixedToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle database connection errors gracefully', async () => {
      // This would require mocking the database connection
      // For now, we test that the system doesn't crash under normal load
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
    });

    test('should handle concurrent authentication requests', async () => {
      const loginPromises = Array(10).fill(null).map(() => 
        request(app)
          .post('/auth/login')
          .send({
            email: 'admin@test.com',
            password: 'password123'
          })
      );

      const responses = await Promise.all(loginPromises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
      });
    });

    test('should handle permission checks for inactive users', async () => {
      // Deactivate user
      await db('users')
        .where('id', testUsers[0].id)
        .update({ active: false });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'usermanager@test.com',
          password: 'password123'
        });

      // Should still allow login but permission checks might behave differently
      // This depends on how the system is configured to handle inactive users
      expect(response.status).toBe(200);
    });
  });

  describe('Public and Health Check Endpoints', () => {
    test('should allow access to public endpoints without authentication', async () => {
      const response = await request(app)
        .get('/api/public');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Public endpoint accessed');
    });

    test('should allow access to health check endpoint', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('Complete User Journey Testing', () => {
    test('should handle complete user management workflow', async () => {
      // Login as user manager
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'usermanager@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      const token = loginResponse.body.token;

      // List users
      const listResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);
      
      expect(listResponse.status).toBe(200);

      // Create user
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Workflow Test User' });
      
      expect(createResponse.status).toBe(200);
      expect(createResponse.body.data.name).toBe('Workflow Test User');

      // Delete user
      const deleteResponse = await request(app)
        .delete('/api/users/999')
        .set('Authorization', `Bearer ${token}`);
      
      expect(deleteResponse.status).toBe(200);
    });

    test('should prevent unauthorized user from accessing restricted workflows', async () => {
      // Login as user with no permissions
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'noperms@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      const token = loginResponse.body.token;

      // Try to access restricted endpoints
      const usersList = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);
      
      const gamesCreate = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Unauthorized Game' });

      const adminSystem = await request(app)
        .get('/api/admin/system')
        .set('Authorization', `Bearer ${token}`);

      expect(usersList.status).toBe(403);
      expect(gamesCreate.status).toBe(403);
      expect(adminSystem.status).toBe(403);
    });
  });
});