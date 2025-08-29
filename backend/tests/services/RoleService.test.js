/**
 * RoleService Test Suite
 * 
 * Comprehensive tests for the RoleService functionality including:
 * - CRUD operations for roles
 * - Permission assignment/removal
 * - User role management
 * - Role activation/deactivation
 * - Safety checks and validation
 */

const RoleService = require('../../src/services/RoleService');
const db = require('../../src/config/database');

describe('RoleService', () => {
  let roleService;
  let testRoleId;
  let testUserId;
  let testPermissionIds = [];

  beforeAll(async () => {
    roleService = new RoleService();
    
    // Create test permissions
    const permissions = await db('permissions')
      .insert([
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'test_permission_1',
          code: 'TEST_PERM_1',
          description: 'Test permission 1',
          category: 'test',
          active: true
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'test_permission_2',
          code: 'TEST_PERM_2',
          description: 'Test permission 2',
          category: 'test',
          active: true
        }
      ])
      .returning('*');

    testPermissionIds = permissions.map(p => p.id);

    // Create test user
    const [user] = await db('users')
      .insert({
        id: '550e8400-e29b-41d4-a716-446655440010',
        email: 'test@example.com',
        password_hash: 'test',
        name: 'Test User',
        role: 'referee',
        active: true
      })
      .returning('*');

    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testRoleId) {
      await db('role_permissions').where('role_id', testRoleId).del();
      await db('user_roles').where('role_id', testRoleId).del();
      await db('roles').where('id', testRoleId).del();
    }
    
    await db('permissions').whereIn('id', testPermissionIds).del();
    await db('users').where('id', testUserId).del();
  });

  describe('Role CRUD Operations', () => {
    test('should create a new role', async () => {
      const roleData = {
        name: 'Test Role',
        code: 'TEST_ROLE',
        description: 'A test role for testing',
        category: 'test',
        system_role: false,
        active: true
      };

      const role = await roleService.createRole(roleData, testPermissionIds);

      expect(role).toBeDefined();
      expect(role.name).toBe('Test Role');
      expect(role.code).toBe('TEST_ROLE');
      expect(role.permissions).toHaveLength(2);
      expect(role.permissions.map(p => p.id)).toEqual(expect.arrayContaining(testPermissionIds));

      testRoleId = role.id;
    });

    test('should get role with permissions', async () => {
      const role = await roleService.getRoleWithPermissions(testRoleId);

      expect(role).toBeDefined();
      expect(role.id).toBe(testRoleId);
      expect(role.permissions).toHaveLength(2);
      expect(role.permissions[0]).toHaveProperty('name');
      expect(role.permissions[0]).toHaveProperty('code');
    });

    test('should update role', async () => {
      const updateData = {
        description: 'Updated test role description',
        active: false
      };

      const updatedRole = await roleService.updateRole(testRoleId, updateData);

      expect(updatedRole.description).toBe('Updated test role description');
      expect(updatedRole.active).toBe(false);
    });

    test('should update role with new permissions', async () => {
      const updateData = {
        description: 'Role with single permission'
      };

      const updatedRole = await roleService.updateRole(
        testRoleId, 
        updateData, 
        [testPermissionIds[0]] // Only first permission
      );

      expect(updatedRole.permissions).toHaveLength(1);
      expect(updatedRole.permissions[0].id).toBe(testPermissionIds[0]);
    });

    test('should throw error when getting non-existent role', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440099';
      
      await expect(roleService.getRoleWithPermissions(fakeId))
        .rejects
        .toThrow('Role not found');
    });
  });

  describe('Permission Management', () => {
    test('should assign permissions to role', async () => {
      // Remove existing permissions first
      await roleService.removePermissionsFromRole(testRoleId, testPermissionIds);

      // Assign new permissions
      await roleService.assignPermissionsToRole(testRoleId, testPermissionIds);

      const role = await roleService.getRoleWithPermissions(testRoleId);
      expect(role.permissions).toHaveLength(2);
    });

    test('should remove permissions from role', async () => {
      const removedCount = await roleService.removePermissionsFromRole(
        testRoleId, 
        [testPermissionIds[0]]
      );

      expect(removedCount).toBe(1);

      const role = await roleService.getRoleWithPermissions(testRoleId);
      expect(role.permissions).toHaveLength(1);
      expect(role.permissions[0].id).toBe(testPermissionIds[1]);
    });

    test('should handle assignment of invalid permissions', async () => {
      const invalidPermissionId = '550e8400-e29b-41d4-a716-446655440099';

      await expect(
        roleService.assignPermissionsToRole(testRoleId, [invalidPermissionId])
      ).rejects.toThrow('Invalid permission IDs');
    });

    test('should ignore duplicate permission assignments', async () => {
      // Assign same permission twice
      await roleService.assignPermissionsToRole(testRoleId, [testPermissionIds[0]]);
      await roleService.assignPermissionsToRole(testRoleId, [testPermissionIds[0]]);

      const role = await roleService.getRoleWithPermissions(testRoleId);
      const permission1Count = role.permissions.filter(p => p.id === testPermissionIds[0]).length;
      
      expect(permission1Count).toBe(1); // Should only appear once
    });
  });

  describe('Role Status Management', () => {
    test('should activate role', async () => {
      const activatedRole = await roleService.setRoleStatus(testRoleId, true);
      
      expect(activatedRole.active).toBe(true);
    });

    test('should deactivate role', async () => {
      const deactivatedRole = await roleService.setRoleStatus(testRoleId, false);
      
      expect(deactivatedRole.active).toBe(false);
    });

    test('should prevent deactivating system roles', async () => {
      // Create a system role
      const systemRole = await roleService.createRole({
        name: 'System Test Role',
        code: 'SYS_TEST',
        description: 'System role for testing',
        system_role: true,
        active: true
      });

      await expect(
        roleService.setRoleStatus(systemRole.id, false)
      ).rejects.toThrow('Cannot deactivate system roles');

      // Clean up
      await db('roles').where('id', systemRole.id).del();
    });
  });

  describe('User Role Management', () => {
    beforeAll(async () => {
      // Assign test role to test user
      await db('user_roles').insert({
        user_id: testUserId,
        role_id: testRoleId,
        created_at: new Date()
      });
    });

    afterAll(async () => {
      await db('user_roles').where('user_id', testUserId).del();
    });

    test('should get users with role', async () => {
      const result = await roleService.getUsersWithRole(testRoleId, {
        page: 1,
        limit: 10
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(testUserId);
      expect(result.data[0].email).toBe('test@example.com');
      expect(result.pagination.total).toBe(1);
    });

    test('should paginate users with role', async () => {
      const result = await roleService.getUsersWithRole(testRoleId, {
        page: 1,
        limit: 1
      });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPreviousPage).toBe(false);
    });
  });

  describe('Role Metadata and Statistics', () => {
    test('should get roles with metadata', async () => {
      const roles = await roleService.getRolesWithMetadata({
        includeInactive: true
      });

      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThan(0);

      const testRole = roles.find(r => r.id === testRoleId);
      expect(testRole).toBeDefined();
      expect(testRole.permission_count).toBeGreaterThan(0);
      expect(testRole.user_count).toBeGreaterThan(0);
    });

    test('should filter active roles only', async () => {
      const activeRoles = await roleService.getRolesWithMetadata({
        includeInactive: false
      });

      const allRoles = await roleService.getRolesWithMetadata({
        includeInactive: true
      });

      expect(activeRoles.length).toBeLessThanOrEqual(allRoles.length);
    });
  });

  describe('Role Deletion Safety', () => {
    test('should check if role can be deleted', async () => {
      const safetyCheck = await roleService.canDeleteRole(testRoleId);
      
      // Should not be deletable because it has assigned users
      expect(safetyCheck.canDelete).toBe(false);
      expect(safetyCheck.reason).toContain('user(s)');
    });

    test('should prevent deletion of roles with users', async () => {
      await expect(
        roleService.deleteRole(testRoleId, { force: false })
      ).rejects.toThrow('user(s)');
    });

    test('should allow forced deletion of roles with users', async () => {
      // Create a temporary role for deletion testing
      const tempRole = await roleService.createRole({
        name: 'Temp Delete Role',
        code: 'TEMP_DEL',
        description: 'Temporary role for deletion testing',
        system_role: false,
        active: true
      });

      // Assign to user
      await db('user_roles').insert({
        user_id: testUserId,
        role_id: tempRole.id,
        created_at: new Date()
      });

      // Force delete should work
      const deleted = await roleService.deleteRole(tempRole.id, { force: true });
      expect(deleted).toBe(true);

      // Verify role is gone
      await expect(
        roleService.getRoleWithPermissions(tempRole.id)
      ).rejects.toThrow('not found');

      // Verify user-role relationship is removed
      const userRoles = await db('user_roles')
        .where({ user_id: testUserId, role_id: tempRole.id });
      expect(userRoles).toHaveLength(0);
    });

    test('should prevent deletion of system roles', async () => {
      // Create a system role
      const systemRole = await roleService.createRole({
        name: 'System Delete Test Role',
        code: 'SYS_DEL_TEST',
        description: 'System role for deletion testing',
        system_role: true,
        active: true
      });

      const safetyCheck = await roleService.canDeleteRole(systemRole.id);
      expect(safetyCheck.canDelete).toBe(false);
      expect(safetyCheck.reason).toBe('Cannot delete system roles');

      // Clean up
      await db('roles').where('id', systemRole.id).del();
    });
  });

  describe('Role Hierarchy', () => {
    test('should get role hierarchy', async () => {
      const hierarchy = await roleService.getRoleHierarchy(testRoleId);
      
      expect(Array.isArray(hierarchy)).toBe(true);
      expect(hierarchy).toHaveLength(1); // Currently just returns the role itself
      expect(hierarchy[0].id).toBe(testRoleId);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Test with invalid UUID format
      await expect(
        roleService.getRoleWithPermissions('invalid-uuid')
      ).rejects.toThrow();
    });

    test('should handle transaction rollbacks', async () => {
      // Mock a database error during role creation
      const originalInsert = db.prototype.insert;
      const mockQuery = {
        insert: jest.fn().mockRejectedValue(new Error('Database error')),
        returning: jest.fn().mockReturnThis()
      };

      const mockDb = jest.fn(() => mockQuery);
      const mockWithTransaction = jest.fn((callback) => {
        const mockTrx = {
          commit: jest.fn(),
          rollback: jest.fn()
        };
        return callback(mockTrx).catch(error => {
          mockTrx.rollback();
          throw error;
        });
      });

      roleService.withTransaction = mockWithTransaction;

      await expect(
        roleService.createRole({
          name: 'Error Test Role',
          code: 'ERROR_TEST',
          description: 'Role that will fail to create'
        })
      ).rejects.toThrow('Database error');
    });
  });
});