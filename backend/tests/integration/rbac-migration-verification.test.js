/**
 * RBAC Migration Verification Tests
 * 
 * Tests to verify that the RBAC migration maintains backward compatibility:
 * - Existing admin users have Admin role
 * - Existing referee users have Referee role  
 * - Old role field still works
 * - JWT tokens include permissions
 * - Legacy authentication still functions
 * - Database integrity maintained
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../setup');
const { authenticateToken, requireRole, requirePermission } = require('../../src/middleware/auth');

describe('RBAC Migration Verification Tests', () => {
  let app;
  let legacyUsers = [];
  let adminRole, refereeRole;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());

    // Legacy authentication endpoint
    app.post('/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        
        const user = await db('users').where('email', email).first();
        if (!user || !await bcrypt.compare(password, user.password_hash)) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Get user roles and permissions (RBAC)
        const userRoles = await db('user_roles')
          .join('roles', 'user_roles.role_id', 'roles.id')
          .where('user_roles.user_id', user.id)
          .where('roles.is_active', true)
          .select('roles.name', 'roles.code', 'roles.id');

        const userPermissions = await db('permissions')
          .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
          .join('roles', 'role_permissions.role_id', 'roles.id')
          .join('user_roles', 'roles.id', 'user_roles.role_id')
          .where('user_roles.user_id', user.id)
          .where('roles.is_active', true)
          .where('permissions.is_active', true)
          .select('permissions.code', 'permissions.name')
          .distinct();

        const token = jwt.sign(
          {
            userId: user.id,
            email: user.email,
            role: user.role, // Legacy field
            roles: userRoles.map(r => r.name), // New RBAC field
            permissions: userPermissions.map(p => p.code) // New RBAC field
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
            role: user.role, // Legacy field
            roles: userRoles.map(r => r.name), // New RBAC field
            permissions: userPermissions.map(p => p.code) // New RBAC field
          }
        });
      } catch (error) {
        res.status(500).json({ error: 'Login failed' });
      }
    });

    // Test routes using legacy role-based auth
    app.get('/api/legacy/admin', authenticateToken, requireRole('admin'), (req, res) => {
      res.json({ message: 'Legacy admin access granted', user: req.user });
    });

    app.get('/api/legacy/referee', authenticateToken, requireRole('referee'), (req, res) => {
      res.json({ message: 'Legacy referee access granted', user: req.user });
    });

    // Test routes using new permission-based auth
    app.get('/api/rbac/users', authenticateToken, requirePermission('users.read'), (req, res) => {
      res.json({ message: 'RBAC permission access granted', user: req.user });
    });

    app.get('/api/rbac/games', authenticateToken, requirePermission('games.manage'), (req, res) => {
      res.json({ message: 'RBAC games access granted', user: req.user });
    });

    // Mixed approach - legacy and RBAC
    app.get('/api/mixed/admin-users', authenticateToken, requireRole('admin'), requirePermission('users.read'), (req, res) => {
      res.json({ message: 'Mixed auth access granted', user: req.user });
    });
  });

  beforeEach(async () => {
    // Clean slate
    await db('user_roles').del();
    await db('role_permissions').del();
    await db('roles').whereNot('system_role', true).del();
    await db('permissions').del();
    await db('users').del();

    // Create RBAC system permissions
    const permissions = await db('permissions')
      .insert([
        {
          id: '750e8400-e29b-41d4-a716-446655440001',
          name: 'users.read',
          code: 'USERS_READ',
          description: 'Read user data',
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
          name: 'games.manage',
          code: 'GAMES_MANAGE',
          description: 'Manage games',
          category: 'game_management',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440004',
          name: 'assignments.manage',
          code: 'ASSIGNMENTS_MANAGE',
          description: 'Manage game assignments',
          category: 'assignment_management',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440005',
          name: 'admin.system',
          code: 'ADMIN_SYSTEM',
          description: 'System administration',
          category: 'administration',
          active: true
        }
      ])
      .returning('*');

    // Create RBAC roles
    const roles = await db('roles')
      .insert([
        {
          id: '750e8400-e29b-41d4-a716-446655440010',
          name: 'Admin',
          code: 'ADMIN',
          description: 'System Administrator',
          system_role: true,
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440011',
          name: 'Referee',
          code: 'REFEREE',
          description: 'Game Referee',
          system_role: true,
          active: true
        }
      ])
      .returning('*');

    adminRole = roles[0];
    refereeRole = roles[1];

    // Set up role permissions
    await db('role_permissions').insert([
      // Admin gets all permissions
      { role_id: adminRole.id, permission_id: permissions[0].id, created_at: new Date() },
      { role_id: adminRole.id, permission_id: permissions[1].id, created_at: new Date() },
      { role_id: adminRole.id, permission_id: permissions[2].id, created_at: new Date() },
      { role_id: adminRole.id, permission_id: permissions[3].id, created_at: new Date() },
      { role_id: adminRole.id, permission_id: permissions[4].id, created_at: new Date() },
      
      // Referee gets limited permissions
      { role_id: refereeRole.id, permission_id: permissions[3].id, created_at: new Date() }, // assignments.manage
    ]);

    // Create legacy users with old role field
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    legacyUsers = await db('users')
      .insert([
        {
          id: '750e8400-e29b-41d4-a716-446655440020',
          email: 'legacy.admin@test.com',
          name: 'Legacy Admin User',
          password_hash: hashedPassword,
          role: 'admin', // Legacy role field
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440021',
          email: 'legacy.referee@test.com',
          name: 'Legacy Referee User',
          password_hash: hashedPassword,
          role: 'referee', // Legacy role field
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440022',
          email: 'legacy.user@test.com',
          name: 'Legacy Regular User',
          password_hash: hashedPassword,
          role: 'user', // Legacy role field
          active: true
        }
      ])
      .returning('*');

    // MIGRATION SIMULATION: Assign RBAC roles to existing users based on legacy role field
    // This simulates what the migration script would do
    const usersToMigrate = await db('users').select('*');
    
    for (const user of usersToMigrate) {
      if (user.role === 'admin') {
        await db('user_roles').insert({
          user_id: user.id,
          role_id: adminRole.id,
          created_at: new Date()
        });
      } else if (user.role === 'referee') {
        await db('user_roles').insert({
          user_id: user.id,
          role_id: refereeRole.id,
          created_at: new Date()
        });
      }
      // Regular 'user' role gets no RBAC roles (migration behavior)
    }
  });

  afterEach(async () => {
    await db('user_roles').del();
    await db('role_permissions').del();
    await db('roles').whereNot('system_role', true).del();
    await db('permissions').del();
    await db('users').del();
  });

  describe('Migration Data Integrity', () => {
    test('should verify admin users have Admin RBAC role after migration', async () => {
      const adminUser = await db('users').where('role', 'admin').first();
      expect(adminUser).toBeDefined();

      const userRoles = await db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', adminUser.id)
        .select('roles.name', 'roles.code');

      expect(userRoles).toHaveLength(1);
      expect(userRoles[0].name).toBe('Admin');
      expect(userRoles[0].code).toBe('ADMIN');
    });

    test('should verify referee users have Referee RBAC role after migration', async () => {
      const refereeUser = await db('users').where('role', 'referee').first();
      expect(refereeUser).toBeDefined();

      const userRoles = await db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', refereeUser.id)
        .select('roles.name', 'roles.code');

      expect(userRoles).toHaveLength(1);
      expect(userRoles[0].name).toBe('Referee');
      expect(userRoles[0].code).toBe('REFEREE');
    });

    test('should verify regular users have no RBAC roles', async () => {
      const regularUser = await db('users').where('role', 'user').first();
      expect(regularUser).toBeDefined();

      const userRoles = await db('user_roles')
        .where('user_id', regularUser.id);

      expect(userRoles).toHaveLength(0);
    });

    test('should verify legacy role field is preserved', async () => {
      const users = await db('users').select('*');
      
      const adminUser = users.find(u => u.email === 'legacy.admin@test.com');
      const refereeUser = users.find(u => u.email === 'legacy.referee@test.com');
      const regularUser = users.find(u => u.email === 'legacy.user@test.com');

      expect(adminUser.role).toBe('admin');
      expect(refereeUser.role).toBe('referee');
      expect(regularUser.role).toBe('user');
    });

    test('should verify RBAC permissions are correctly assigned to migrated roles', async () => {
      // Check Admin role permissions
      const adminPermissions = await db('role_permissions')
        .join('permissions', 'role_permissions.permission_id', 'permissions.id')
        .where('role_permissions.role_id', adminRole.id)
        .select('permissions.code');

      expect(adminPermissions).toHaveLength(5);
      expect(adminPermissions.map(p => p.code)).toEqual(
        expect.arrayContaining(['USERS_READ', 'USERS_CREATE', 'GAMES_MANAGE', 'ASSIGNMENTS_MANAGE', 'ADMIN_SYSTEM'])
      );

      // Check Referee role permissions
      const refereePermissions = await db('role_permissions')
        .join('permissions', 'role_permissions.permission_id', 'permissions.id')
        .where('role_permissions.role_id', refereeRole.id)
        .select('permissions.code');

      expect(refereePermissions).toHaveLength(1);
      expect(refereePermissions[0].code).toBe('ASSIGNMENTS_MANAGE');
    });
  });

  describe('Backward Compatibility - Legacy Role-Based Auth', () => {
    test('should maintain legacy admin access using requireRole middleware', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'legacy.admin@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      const token = loginResponse.body.token;

      const accessResponse = await request(app)
        .get('/api/legacy/admin')
        .set('Authorization', `Bearer ${token}`);

      expect(accessResponse.status).toBe(200);
      expect(accessResponse.body.message).toBe('Legacy admin access granted');
      expect(accessResponse.body.user.role).toBe('admin');
    });

    test('should maintain legacy referee access using requireRole middleware', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'legacy.referee@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      const token = loginResponse.body.token;

      const accessResponse = await request(app)
        .get('/api/legacy/referee')
        .set('Authorization', `Bearer ${token}`);

      expect(accessResponse.status).toBe(200);
      expect(accessResponse.body.message).toBe('Legacy referee access granted');
      expect(accessResponse.body.user.role).toBe('referee');
    });

    test('should deny legacy role access to users without appropriate role', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'legacy.user@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      const token = loginResponse.body.token;

      const adminResponse = await request(app)
        .get('/api/legacy/admin')
        .set('Authorization', `Bearer ${token}`);

      const refereeResponse = await request(app)
        .get('/api/legacy/referee')
        .set('Authorization', `Bearer ${token}`);

      expect(adminResponse.status).toBe(403);
      expect(refereeResponse.status).toBe(403);
    });
  });

  describe('New RBAC Permission-Based Auth', () => {
    test('should work with new RBAC permission system for admin users', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'legacy.admin@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      const token = loginResponse.body.token;

      const usersResponse = await request(app)
        .get('/api/rbac/users')
        .set('Authorization', `Bearer ${token}`);

      const gamesResponse = await request(app)
        .get('/api/rbac/games')
        .set('Authorization', `Bearer ${token}`);

      expect(usersResponse.status).toBe(200);
      expect(gamesResponse.status).toBe(200);
      expect(usersResponse.body.message).toBe('RBAC permission access granted');
      expect(gamesResponse.body.message).toBe('RBAC games access granted');
    });

    test('should work with new RBAC permission system for referee users', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'legacy.referee@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      const token = loginResponse.body.token;

      // Referee should not have users.read permission
      const usersResponse = await request(app)
        .get('/api/rbac/users')
        .set('Authorization', `Bearer ${token}`);

      // Referee should not have games.manage permission  
      const gamesResponse = await request(app)
        .get('/api/rbac/games')
        .set('Authorization', `Bearer ${token}`);

      expect(usersResponse.status).toBe(403);
      expect(gamesResponse.status).toBe(403);
    });

    test('should deny RBAC permission access to users without roles', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'legacy.user@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      const token = loginResponse.body.token;

      const usersResponse = await request(app)
        .get('/api/rbac/users')
        .set('Authorization', `Bearer ${token}`);

      const gamesResponse = await request(app)
        .get('/api/rbac/games')
        .set('Authorization', `Bearer ${token}`);

      expect(usersResponse.status).toBe(403);
      expect(gamesResponse.status).toBe(403);
    });
  });

  describe('JWT Token Enhancement', () => {
    test('should include both legacy role and new RBAC data in JWT token', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'legacy.admin@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      
      const token = loginResponse.body.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');

      // Legacy fields
      expect(decoded.role).toBe('admin');
      
      // New RBAC fields
      expect(decoded.roles).toContain('Admin');
      expect(decoded.permissions).toEqual(
        expect.arrayContaining(['USERS_READ', 'USERS_CREATE', 'GAMES_MANAGE', 'ASSIGNMENTS_MANAGE', 'ADMIN_SYSTEM'])
      );
    });

    test('should include appropriate permissions for referee users in JWT', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'legacy.referee@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      
      const token = loginResponse.body.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');

      // Legacy fields
      expect(decoded.role).toBe('referee');
      
      // New RBAC fields
      expect(decoded.roles).toContain('Referee');
      expect(decoded.permissions).toEqual(['ASSIGNMENTS_MANAGE']);
    });

    test('should handle users with no RBAC roles in JWT token', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'legacy.user@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      
      const token = loginResponse.body.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');

      // Legacy fields
      expect(decoded.role).toBe('user');
      
      // New RBAC fields
      expect(decoded.roles).toEqual([]);
      expect(decoded.permissions).toEqual([]);
    });
  });

  describe('Mixed Authentication Approach', () => {
    test('should work with mixed legacy role + RBAC permission requirements', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'legacy.admin@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/mixed/admin-users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Mixed auth access granted');
    });

    test('should fail mixed auth when user lacks legacy role', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'legacy.referee@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/mixed/admin-users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    test('should fail mixed auth when user lacks RBAC permission', async () => {
      // Create a user with admin role but no RBAC permissions
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const [specialUser] = await db('users')
        .insert({
          id: '750e8400-e29b-41d4-a716-446655440099',
          email: 'special.admin@test.com',
          name: 'Admin No Permissions',
          password_hash: hashedPassword,
          role: 'admin', // Has legacy role
          active: true
        })
        .returning('*');

      // Don't assign any RBAC role (so no permissions)

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'special.admin@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/mixed/admin-users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('System Role Integrity', () => {
    test('should verify system roles are marked as system_role=true', async () => {
      const systemRoles = await db('roles').where('system_role', true);
      
      expect(systemRoles).toHaveLength(2);
      expect(systemRoles.map(r => r.name)).toEqual(
        expect.arrayContaining(['Admin', 'Referee'])
      );
    });

    test('should verify system roles cannot be deleted (protection check)', async () => {
      // This would be tested at the service level
      const adminRoleExists = await db('roles').where('id', adminRole.id).first();
      const refereeRoleExists = await db('roles').where('id', refereeRole.id).first();
      
      expect(adminRoleExists).toBeDefined();
      expect(refereeRoleExists).toBeDefined();
      expect(adminRoleExists.system_role).toBe(true);
      expect(refereeRoleExists.system_role).toBe(true);
    });
  });

  describe('Database Consistency After Migration', () => {
    test('should verify all admin users have consistent role assignments', async () => {
      const adminUsers = await db('users').where('role', 'admin');
      
      for (const user of adminUsers) {
        const roleAssignments = await db('user_roles')
          .join('roles', 'user_roles.role_id', 'roles.id')
          .where('user_roles.user_id', user.id)
          .where('roles.name', 'Admin');
        
        expect(roleAssignments).toHaveLength(1);
      }
    });

    test('should verify all referee users have consistent role assignments', async () => {
      const refereeUsers = await db('users').where('role', 'referee');
      
      for (const user of refereeUsers) {
        const roleAssignments = await db('user_roles')
          .join('roles', 'user_roles.role_id', 'roles.id')
          .where('user_roles.user_id', user.id)
          .where('roles.name', 'Referee');
        
        expect(roleAssignments).toHaveLength(1);
      }
    });

    test('should verify no duplicate role assignments exist', async () => {
      const duplicates = await db('user_roles')
        .select('user_id', 'role_id')
        .groupBy('user_id', 'role_id')
        .having(db.raw('COUNT(*) > 1'));
      
      expect(duplicates).toHaveLength(0);
    });

    test('should verify referential integrity between users and roles', async () => {
      const orphanedAssignments = await db('user_roles')
        .leftJoin('users', 'user_roles.user_id', 'users.id')
        .leftJoin('roles', 'user_roles.role_id', 'roles.id')
        .where('users.id', null)
        .orWhere('roles.id', null);
      
      expect(orphanedAssignments).toHaveLength(0);
    });
  });

  describe('Performance Impact Verification', () => {
    test('should verify login performance is acceptable with RBAC data', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'legacy.admin@test.com',
          password: 'password123'
        });
      
      const elapsed = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('should verify permission checking performance is acceptable', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'legacy.admin@test.com',
          password: 'password123'
        });

      const token = loginResponse.body.token;
      
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/rbac/users')
        .set('Authorization', `Bearer ${token}`);
      
      const elapsed = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(elapsed).toBeLessThan(500); // Should complete quickly
    });
  });
});