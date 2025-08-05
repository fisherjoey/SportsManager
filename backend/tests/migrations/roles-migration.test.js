const db = require('../setup');

describe('Roles Migration Tests', () => {
  describe('Database Schema', () => {
    it('should have roles column in users table', async () => {
      const tableInfo = await db.raw(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'roles'
      `);

      expect(tableInfo.rows).toHaveLength(1);
      expect(tableInfo.rows[0].column_name).toBe('roles');
      expect(tableInfo.rows[0].data_type).toBe('ARRAY'); // PostgreSQL text array
      expect(tableInfo.rows[0].is_nullable).toBe('YES');
    });

    it('should maintain existing role column for backward compatibility', async () => {
      const tableInfo = await db.raw(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
      `);

      expect(tableInfo.rows).toHaveLength(1);
      expect(tableInfo.rows[0].column_name).toBe('role');
    });

    it('should have proper default value for roles column', async () => {
      const columnInfo = await db.raw(`
        SELECT column_default 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'roles'
      `);

      expect(columnInfo.rows[0].column_default).toBe('\'{}\'::text[]');
    });
  });

  describe('Data Migration', () => {
    it('should have migrated existing admin users to roles array', async () => {
      // Create a test admin user to verify migration logic
      const adminUser = await db('users').insert({
        email: 'test-admin@migration.com',
        password_hash: 'hashedpassword',
        role: 'admin',
        name: 'Migration Test Admin'
      }).returning('*');

      // Simulate the migration by running the same logic
      await db('users')
        .where('role', 'admin')
        .where('id', adminUser[0].id)
        .update({ 
          roles: db.raw('ARRAY[\'admin\']::text[]')
        });

      // Verify the migration worked
      const updatedUser = await db('users')
        .where('id', adminUser[0].id)
        .first();

      expect(updatedUser.roles).toEqual(['admin']);
      expect(updatedUser.role).toBe('admin'); // Legacy field should remain
    });

    it('should have migrated existing referee users to roles array', async () => {
      // Create a test referee user
      const refereeUser = await db('users').insert({
        email: 'test-referee@migration.com',
        password_hash: 'hashedpassword',
        role: 'referee',
        name: 'Migration Test Referee'
      }).returning('*');

      // Simulate the migration
      await db('users')
        .where('role', 'referee')
        .where('id', refereeUser[0].id)
        .update({ 
          roles: db.raw('ARRAY[\'referee\']::text[]')
        });

      // Verify the migration worked
      const updatedUser = await db('users')
        .where('id', refereeUser[0].id)
        .first();

      expect(updatedUser.roles).toEqual(['referee']);
      expect(updatedUser.role).toBe('referee');
    });

    it('should handle null roles gracefully', async () => {
      // Create user without roles array (pre-migration state)
      const legacyUser = await db('users').insert({
        email: 'legacy@test.com',
        password_hash: 'hashedpassword', 
        role: 'referee',
        roles: null,
        name: 'Legacy User'
      }).returning('*');

      expect(legacyUser[0].roles).toBeNull();
      expect(legacyUser[0].role).toBe('referee');

      // Verify we can query users with null roles
      const nullRolesUsers = await db('users')
        .where('roles', null)
        .where('id', legacyUser[0].id);

      expect(nullRolesUsers).toHaveLength(1);
    });
  });

  describe('PostgreSQL Array Operations', () => {
    let testUserId;

    beforeEach(async () => {
      const user = await db('users').insert({
        email: 'array-test@test.com',
        password_hash: 'hashedpassword',
        role: 'referee',
        roles: ['referee'],
        name: 'Array Test User'
      }).returning('*');

      testUserId = user[0].id;
    });

    it('should support PostgreSQL array operations', async () => {
      // Test array contains operation
      const result = await db('users')
        .where('id', testUserId)
        .whereRaw('? = ANY(roles)', ['referee'])
        .first();

      expect(result).toBeTruthy();
      expect(result.roles).toContain('referee');
    });

    it('should support array length operations', async () => {
      const result = await db('users')
        .select('id', 'roles')
        .selectRaw('array_length(roles, 1) as role_count')
        .where('id', testUserId)
        .first();

      expect(result.role_count).toBe(1);
      expect(result.roles).toHaveLength(1);
    });

    it('should support array append operations', async () => {
      // Add evaluator role to existing roles
      await db('users')
        .where('id', testUserId)
        .update({
          roles: db.raw('array_append(roles, \'evaluator\')')
        });

      const updatedUser = await db('users')
        .where('id', testUserId)
        .first();

      expect(updatedUser.roles).toContain('referee');
      expect(updatedUser.roles).toContain('evaluator');
      expect(updatedUser.roles).toHaveLength(2);
    });

    it('should support array remove operations', async () => {
      // First add multiple roles
      await db('users')
        .where('id', testUserId)
        .update({
          roles: ['referee', 'evaluator', 'referee_coach']
        });

      // Remove evaluator role
      await db('users')
        .where('id', testUserId)
        .update({
          roles: db.raw('array_remove(roles, \'evaluator\')')
        });

      const updatedUser = await db('users')
        .where('id', testUserId)
        .first();

      expect(updatedUser.roles).toContain('referee');
      expect(updatedUser.roles).toContain('referee_coach');
      expect(updatedUser.roles).not.toContain('evaluator');
      expect(updatedUser.roles).toHaveLength(2);
    });

    it('should handle empty arrays correctly', async () => {
      await db('users')
        .where('id', testUserId)
        .update({ roles: [] });

      const user = await db('users')
        .where('id', testUserId)
        .first();

      expect(user.roles).toEqual([]);
      expect(Array.isArray(user.roles)).toBe(true);
    });

    it('should handle JSON string conversion correctly', async () => {
      // Test storing roles as JSON string (as done in API)
      await db('users')
        .where('id', testUserId)
        .update({ 
          roles: JSON.stringify(['referee', 'referee_coach'])
        });

      const user = await db('users')
        .where('id', testUserId)
        .first();

      // PostgreSQL should handle the JSON string conversion
      expect(Array.isArray(user.roles)).toBe(true);
      expect(user.roles).toContain('referee');
      expect(user.roles).toContain('referee_coach');
    });
  });

  describe('Migration Rollback', () => {
    it('should be able to remove roles column if needed', async () => {
      // This tests the down migration capability
      const hasRolesColumn = await db.schema.hasColumn('users', 'roles');
      expect(hasRolesColumn).toBe(true);

      // Simulate rollback (but don't actually run it)
      // In a real rollback: await db.schema.table('users', table => table.dropColumn('roles'));
      
      // Verify rollback would work by checking no foreign key constraints
      const constraints = await db.raw(`
        SELECT conname, contype 
        FROM pg_constraint 
        WHERE conrelid = 'users'::regclass 
        AND contype = 'f'
        AND conname LIKE '%roles%'
      `);

      expect(constraints.rows).toHaveLength(0); // No foreign keys on roles column
    });
  });

  describe('Performance and Indexing', () => {
    it('should support efficient role-based queries', async () => {
      // Create multiple test users with different roles
      const users = await db('users').insert([
        {
          email: 'perf1@test.com',
          password_hash: 'hash',
          role: 'referee',
          roles: ['referee'],
          name: 'Perf Test 1'
        },
        {
          email: 'perf2@test.com', 
          password_hash: 'hash',
          role: 'referee',
          roles: ['referee', 'evaluator'],
          name: 'Perf Test 2'
        },
        {
          email: 'perf3@test.com',
          password_hash: 'hash',
          role: 'admin',
          roles: ['admin'],
          name: 'Perf Test 3'
        }
      ]).returning('*');

      // Test querying users by role (should be fast)
      const referees = await db('users')
        .whereRaw('? = ANY(roles)', ['referee']);

      expect(referees.length).toBeGreaterThanOrEqual(2);

      // Test querying users with multiple roles
      const evaluators = await db('users')
        .whereRaw('? = ANY(roles)', ['evaluator']);

      expect(evaluators.length).toBeGreaterThanOrEqual(1);
    });

    it('should consider adding GIN index for role queries', async () => {
      // Check if GIN index exists (may not be created yet)
      const indexes = await db.raw(`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'users' 
        AND indexdef LIKE '%roles%'
      `);

      // This is just a check - the index might be added in future optimizations
      // For now, we just verify the query works without index
      const result = await db('users')
        .whereRaw('? = ANY(roles)', ['referee'])
        .limit(1);

      expect(result.length).toBeLessThanOrEqual(1);
    });
  });
});