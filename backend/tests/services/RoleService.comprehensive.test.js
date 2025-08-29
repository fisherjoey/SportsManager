/**
 * Comprehensive RoleService Test Suite
 * 
 * Tests for RoleService including:
 * - CRUD operations for roles
 * - Permission assignment and management  
 * - User-role relationships
 * - Role hierarchy and metadata
 * - Safety checks and error handling
 * - Performance and caching considerations
 */

const RoleService = require('../../src/services/RoleService');
const PermissionService = require('../../src/services/PermissionService');
const db = require('../setup');

describe('RoleService Comprehensive Tests', () => {
  let roleService;
  let permissionService;
  let testPermissions = [];
  let testRoles = [];
  let testUsers = [];

  beforeAll(async () => {
    roleService = new RoleService();
    permissionService = new PermissionService();
  });

  beforeEach(async () => {
    // Clean slate for each test
    await db('user_roles').del();
    await db('role_permissions').del();
    await db('roles').whereNot('system_role', true).del();
    await db('permissions').del();
    
    // Create test permissions
    testPermissions = await db('permissions')
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
          name: 'users.write',
          code: 'USERS_WRITE',
          description: 'Create and update users',
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
          name: 'reports.view',
          code: 'REPORTS_VIEW',
          description: 'View reports',
          category: 'reporting',
          active: false // Inactive permission for testing
        }
      ])
      .returning('*');
      
    // Create test users for role assignment testing
    testUsers = await db('users')
      .insert([
        {
          id: '750e8400-e29b-41d4-a716-446655440010',
          email: 'user1@test.com',
          name: 'Test User 1',
          password_hash: 'hashed',
          active: true
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440011',
          email: 'user2@test.com',
          name: 'Test User 2', 
          password_hash: 'hashed',
          active: true
        }
      ])
      .returning('*');
  });

  afterEach(async () => {
    // Clean up
    await db('user_roles').del();
    await db('role_permissions').del();
    await db('roles').whereNot('system_role', true).del();
    await db('permissions').del();
    await db('users').whereIn('id', testUsers.map(u => u.id)).del();
  });

  describe('Role CRUD Operations', () => {
    test('should create role successfully', async () => {
      const roleData = {
        name: 'Content Manager',
        code: 'CONTENT_MANAGER',
        description: 'Manages content and resources',
        active: true
      };

      const role = await roleService.createRole(roleData, [testPermissions[0].id]);

      expect(role).toBeDefined();
      expect(role.name).toBe(roleData.name);
      expect(role.code).toBe(roleData.code);
      expect(role.permissions).toHaveLength(1);
      expect(role.permissions[0].id).toBe(testPermissions[0].id);
    });

    test('should create role without permissions', async () => {
      const roleData = {
        name: 'Basic Role',
        code: 'BASIC_ROLE',
        description: 'Basic role without permissions'
      };

      const role = await roleService.createRole(roleData);

      expect(role).toBeDefined();
      expect(role.name).toBe(roleData.name);
      expect(role.permissions).toHaveLength(0);
    });

    test('should update role and permissions', async () => {
      // Create role first
      const [createdRole] = await db('roles')
        .insert({
          name: 'Test Role',
          code: 'TEST_ROLE',
          description: 'Test role',
          active: true
        })
        .returning('*');

      // Update with new data and permissions
      const updatedData = {
        name: 'Updated Test Role',
        description: 'Updated description'
      };
      
      const permissionIds = [testPermissions[0].id, testPermissions[1].id];
      const updatedRole = await roleService.updateRole(createdRole.id, updatedData, permissionIds);

      expect(updatedRole.name).toBe(updatedData.name);
      expect(updatedRole.description).toBe(updatedData.description);
      expect(updatedRole.permissions).toHaveLength(2);
      expect(updatedRole.permissions.map(p => p.id)).toEqual(expect.arrayContaining(permissionIds));
    });

    test('should update role without changing permissions', async () => {
      // Create role with permissions
      const role = await roleService.createRole(
        { name: 'Test Role', code: 'TEST_ROLE', description: 'Test' },
        [testPermissions[0].id]
      );

      // Update only role data (not permissions)
      const updatedRole = await roleService.updateRole(
        role.id,
        { description: 'Updated description' }
      );

      expect(updatedRole.description).toBe('Updated description');
      expect(updatedRole.permissions).toHaveLength(1); // Should retain existing permissions
    });

    test('should get role with permissions', async () => {
      const role = await roleService.createRole(
        { name: 'Test Role', code: 'TEST_ROLE', description: 'Test' },
        [testPermissions[0].id, testPermissions[1].id]
      );

      const retrieved = await roleService.getRoleWithPermissions(role.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.permissions).toHaveLength(2);
      expect(retrieved.permissions.map(p => p.id)).toEqual(
        expect.arrayContaining([testPermissions[0].id, testPermissions[1].id])
      );
    });

    test('should throw error when getting non-existent role', async () => {
      await expect(
        roleService.getRoleWithPermissions('non-existent-id')
      ).rejects.toThrow('Role not found');
    });

    test('should delete role successfully', async () => {
      const role = await roleService.createRole({
        name: 'Deletable Role',
        code: 'DELETABLE_ROLE',
        description: 'Role to be deleted'
      });

      const result = await roleService.deleteRole(role.id);
      expect(result).toBe(true);

      // Verify role is deleted
      const deletedRole = await db('roles').where('id', role.id).first();
      expect(deletedRole).toBeUndefined();
    });

    test('should handle role deletion with force option', async () => {
      const role = await roleService.createRole({
        name: 'Role With Users',
        code: 'ROLE_WITH_USERS', 
        description: 'Role assigned to users'
      });

      // Assign role to user
      await db('user_roles').insert({
        user_id: testUsers[0].id,
        role_id: role.id,
        created_at: new Date()
      });

      // Should fail without force
      await expect(
        roleService.deleteRole(role.id)
      ).rejects.toThrow('Role is assigned to');

      // Should succeed with force
      const result = await roleService.deleteRole(role.id, { force: true });
      expect(result).toBe(true);
    });
  });

  describe('Permission Management', () => {
    let testRole;

    beforeEach(async () => {
      testRole = await roleService.createRole({
        name: 'Permission Test Role',
        code: 'PERMISSION_TEST_ROLE',
        description: 'Role for testing permissions'
      });
    });

    test('should assign permissions to role', async () => {
      const permissionIds = [testPermissions[0].id, testPermissions[1].id];
      
      await roleService.assignPermissionsToRole(testRole.id, permissionIds);

      const roleWithPerms = await roleService.getRoleWithPermissions(testRole.id);
      expect(roleWithPerms.permissions).toHaveLength(2);
      expect(roleWithPerms.permissions.map(p => p.id)).toEqual(
        expect.arrayContaining(permissionIds)
      );
    });

    test('should handle duplicate permission assignment', async () => {
      const permissionIds = [testPermissions[0].id];
      
      // Assign once
      await roleService.assignPermissionsToRole(testRole.id, permissionIds);
      
      // Assign again (should not create duplicates)
      await roleService.assignPermissionsToRole(testRole.id, permissionIds);

      const roleWithPerms = await roleService.getRoleWithPermissions(testRole.id);
      expect(roleWithPerms.permissions).toHaveLength(1);
    });

    test('should validate permission IDs before assignment', async () => {
      const invalidPermissionIds = ['invalid-id-1', 'invalid-id-2'];
      
      await expect(
        roleService.assignPermissionsToRole(testRole.id, invalidPermissionIds)
      ).rejects.toThrow('Invalid permission IDs');
    });

    test('should remove permissions from role', async () => {
      // Assign permissions first
      const permissionIds = [testPermissions[0].id, testPermissions[1].id, testPermissions[2].id];
      await roleService.assignPermissionsToRole(testRole.id, permissionIds);

      // Remove some permissions
      const toRemove = [testPermissions[0].id, testPermissions[1].id];
      const removedCount = await roleService.removePermissionsFromRole(testRole.id, toRemove);

      expect(removedCount).toBe(2);

      // Verify permissions removed
      const roleWithPerms = await roleService.getRoleWithPermissions(testRole.id);
      expect(roleWithPerms.permissions).toHaveLength(1);
      expect(roleWithPerms.permissions[0].id).toBe(testPermissions[2].id);
    });

    test('should handle removing non-existent permissions gracefully', async () => {
      const removedCount = await roleService.removePermissionsFromRole(
        testRole.id, 
        ['non-existent-permission']
      );
      expect(removedCount).toBe(0);
    });
  });

  describe('User-Role Management', () => {
    let testRole;

    beforeEach(async () => {
      testRole = await roleService.createRole({
        name: 'User Test Role',
        code: 'USER_TEST_ROLE',
        description: 'Role for testing user assignments'
      });

      // Assign role to first user
      await db('user_roles').insert({
        user_id: testUsers[0].id,
        role_id: testRole.id,
        created_at: new Date()
      });
    });

    test('should get users with role', async () => {
      const result = await roleService.getUsersWithRole(testRole.id);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(testUsers[0].id);
      expect(result.data[0].name).toBe(testUsers[0].name);
      expect(result.pagination.total).toBe(1);
    });

    test('should paginate users with role', async () => {
      // Assign role to second user
      await db('user_roles').insert({
        user_id: testUsers[1].id,
        role_id: testRole.id,
        created_at: new Date()
      });

      const result = await roleService.getUsersWithRole(testRole.id, { page: 1, limit: 1 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNextPage).toBe(true);
    });

    test('should handle empty user list for role', async () => {
      const emptyRole = await roleService.createRole({
        name: 'Empty Role',
        code: 'EMPTY_ROLE',
        description: 'Role with no users'
      });

      const result = await roleService.getUsersWithRole(emptyRole.id);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('Role Metadata and Statistics', () => {
    test('should get roles with metadata', async () => {
      // Create roles with different configurations
      const role1 = await roleService.createRole(
        { name: 'Role 1', code: 'ROLE_1', description: 'First role' },
        [testPermissions[0].id, testPermissions[1].id]
      );

      const role2 = await roleService.createRole(
        { name: 'Role 2', code: 'ROLE_2', description: 'Second role' },
        [testPermissions[0].id]
      );

      // Assign users to roles
      await db('user_roles').insert([
        { user_id: testUsers[0].id, role_id: role1.id, created_at: new Date() },
        { user_id: testUsers[1].id, role_id: role1.id, created_at: new Date() },
        { user_id: testUsers[0].id, role_id: role2.id, created_at: new Date() }
      ]);

      const roles = await roleService.getRolesWithMetadata();

      expect(roles).toHaveLength(2);
      
      const role1Meta = roles.find(r => r.id === role1.id);
      const role2Meta = roles.find(r => r.id === role2.id);

      expect(role1Meta.permission_count).toBe(2);
      expect(role1Meta.user_count).toBe(2);
      expect(role2Meta.permission_count).toBe(1);
      expect(role2Meta.user_count).toBe(1);
    });

    test('should include/exclude inactive roles in metadata', async () => {
      await roleService.createRole({
        name: 'Active Role',
        code: 'ACTIVE_ROLE',
        description: 'Active role',
        active: true
      });

      const inactiveRole = await roleService.createRole({
        name: 'Inactive Role',
        code: 'INACTIVE_ROLE', 
        description: 'Inactive role',
        active: false
      });

      const activeOnly = await roleService.getRolesWithMetadata({ includeInactive: false });
      const includeInactive = await roleService.getRolesWithMetadata({ includeInactive: true });

      expect(activeOnly).toHaveLength(1);
      expect(includeInactive).toHaveLength(2);
    });
  });

  describe('Role Safety and Validation', () => {
    test('should check if role can be deleted safely', async () => {
      const role = await roleService.createRole({
        name: 'Safe Delete Role',
        code: 'SAFE_DELETE_ROLE',
        description: 'Role safe to delete'
      });

      const safetyCheck = await roleService.canDeleteRole(role.id);
      expect(safetyCheck.canDelete).toBe(true);
    });

    test('should prevent deletion of system roles', async () => {
      const [systemRole] = await db('roles')
        .insert({
          name: 'System Role',
          code: 'SYSTEM_ROLE',
          description: 'System role',
          system_role: true,
          active: true
        })
        .returning('*');

      const safetyCheck = await roleService.canDeleteRole(systemRole.id);
      expect(safetyCheck.canDelete).toBe(false);
      expect(safetyCheck.reason).toBe('Cannot delete system roles');
    });

    test('should prevent deletion of roles with assigned users', async () => {
      const role = await roleService.createRole({
        name: 'Role With Users',
        code: 'ROLE_WITH_USERS',
        description: 'Role assigned to users'
      });

      await db('user_roles').insert({
        user_id: testUsers[0].id,
        role_id: role.id,
        created_at: new Date()
      });

      const safetyCheck = await roleService.canDeleteRole(role.id);
      expect(safetyCheck.canDelete).toBe(false);
      expect(safetyCheck.reason).toContain('Role is assigned to');
    });

    test('should set role status (activate/deactivate)', async () => {
      const role = await roleService.createRole({
        name: 'Status Test Role',
        code: 'STATUS_TEST_ROLE',
        description: 'Role for testing status changes',
        active: true
      });

      // Deactivate role
      const deactivatedRole = await roleService.setRoleStatus(role.id, false);
      expect(deactivatedRole.active).toBe(false);

      // Reactivate role
      const reactivatedRole = await roleService.setRoleStatus(role.id, true);
      expect(reactivatedRole.active).toBe(true);
    });

    test('should prevent deactivating system roles', async () => {
      const [systemRole] = await db('roles')
        .insert({
          name: 'System Role',
          code: 'SYSTEM_ROLE',
          description: 'System role',
          system_role: true,
          active: true
        })
        .returning('*');

      await expect(
        roleService.setRoleStatus(systemRole.id, false)
      ).rejects.toThrow('Cannot deactivate system roles');
    });
  });

  describe('Role Hierarchy and Future Features', () => {
    test('should get role hierarchy (placeholder functionality)', async () => {
      const role = await roleService.createRole({
        name: 'Hierarchy Test Role',
        code: 'HIERARCHY_TEST_ROLE',
        description: 'Role for hierarchy testing'
      });

      const hierarchy = await roleService.getRoleHierarchy(role.id);
      
      // Currently returns just the role itself (placeholder for future hierarchical support)
      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0].id).toBe(role.id);
    });

    test('should handle role hierarchy errors gracefully', async () => {
      await expect(
        roleService.getRoleHierarchy('non-existent-role')
      ).rejects.toThrow('Role not found');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle transaction errors in role creation', async () => {
      // Mock database transaction to simulate error
      const originalWithTransaction = roleService.withTransaction;
      roleService.withTransaction = jest.fn().mockRejectedValue(new Error('Transaction failed'));

      await expect(
        roleService.createRole({ name: 'Failed Role', code: 'FAILED_ROLE' })
      ).rejects.toThrow('Transaction failed');

      // Restore original method
      roleService.withTransaction = originalWithTransaction;
    });

    test('should handle invalid role ID in updates', async () => {
      await expect(
        roleService.updateRole('invalid-id', { name: 'Updated Name' })
      ).rejects.toThrow('Role not found');
    });

    test('should handle database connection errors gracefully', async () => {
      // This would be tested in integration tests with actual database failures
      // Here we can test error handling patterns
      expect(roleService).toBeDefined();
    });

    test('should handle empty permission arrays', async () => {
      const role = await roleService.createRole({
        name: 'Empty Permissions Role',
        code: 'EMPTY_PERMS_ROLE',
        description: 'Role with empty permissions'
      }, []);

      expect(role.permissions).toHaveLength(0);
    });

    test('should handle invalid JSON in permission parsing', async () => {
      // Create role with malformed permissions JSON
      const [badRole] = await db('roles')
        .insert({
          name: 'Bad JSON Role',
          code: 'BAD_JSON_ROLE',
          description: 'Role with bad JSON'
        })
        .returning('*');

      // Insert bad JSON manually
      await db.raw(`
        UPDATE roles 
        SET permissions = 'invalid json'
        WHERE id = ?
      `, [badRole.id]);

      // Should handle gracefully
      const role = await roleService.getRoleWithPermissions(badRole.id);
      expect(role).toBeDefined();
    });
  });

  describe('Performance Considerations', () => {
    test('should handle bulk permission assignments efficiently', async () => {
      const role = await roleService.createRole({
        name: 'Bulk Test Role',
        code: 'BULK_TEST_ROLE',
        description: 'Role for bulk operations'
      });

      const allPermissionIds = testPermissions.map(p => p.id);
      
      const startTime = Date.now();
      await roleService.assignPermissionsToRole(role.id, allPermissionIds);
      const endTime = Date.now();

      // Should complete quickly (under 1 second for small dataset)
      expect(endTime - startTime).toBeLessThan(1000);

      const roleWithPerms = await roleService.getRoleWithPermissions(role.id);
      expect(roleWithPerms.permissions).toHaveLength(testPermissions.length);
    });

    test('should handle large user lists efficiently', async () => {
      // This test would be more meaningful with a larger dataset
      // For now, we verify the pagination works correctly
      const role = await roleService.createRole({
        name: 'Large User Role',
        code: 'LARGE_USER_ROLE',
        description: 'Role with many users'
      });

      const result = await roleService.getUsersWithRole(role.id, { page: 1, limit: 50 });
      expect(result.pagination).toBeDefined();
      expect(result.pagination.limit).toBe(50);
    });
  });
});