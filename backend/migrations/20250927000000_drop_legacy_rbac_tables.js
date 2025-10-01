/**
 * Migration: Drop Legacy RBAC Tables
 *
 * ⚠️  WARNING: This migration performs IRREVERSIBLE data loss!
 *
 * This migration drops the legacy `permissions` and `role_permissions` tables
 * after successful migration to Cerbos authorization system.
 *
 * Prerequisites:
 * - All routes have been migrated to Cerbos (completed in previous phases)
 * - All services have been updated to use Cerbos instead of database permissions
 * - Legacy permission middleware has been removed
 * - Admin permission routes have been removed or refactored
 *
 * ⚠️  CRITICAL: Verify no code references these tables before running!
 * Run: grep -r "permissions\|role_permissions" backend/src/
 *
 * Tables to be dropped:
 * - role_permissions (junction table - dropped first due to foreign keys)
 * - permissions (parent table - dropped second)
 *
 * Note: The `roles` and `user_roles` tables are preserved as they may still
 * be needed for user management and Cerbos principal attributes.
 */

exports.up = async function(knex) {
  console.log('🚨 WARNING: Starting drop of legacy RBAC tables...');
  console.log('This will permanently delete all permission data!');

  try {
    // Safety check: Verify tables exist before attempting to drop
    const hasRolePermissionsTable = await knex.schema.hasTable('role_permissions');
    const hasPermissionsTable = await knex.schema.hasTable('permissions');

    if (!hasRolePermissionsTable && !hasPermissionsTable) {
      console.log('ℹ️  Legacy RBAC tables already removed, nothing to do');
      return;
    }

    // Log current data for reference (before deletion)
    if (hasPermissionsTable) {
      const permissionCount = await knex('permissions').count('* as count').first();
      console.log(`📊 Current permissions count: ${permissionCount.count}`);
    }

    if (hasRolePermissionsTable) {
      const rolePermissionCount = await knex('role_permissions').count('* as count').first();
      console.log(`📊 Current role-permission assignments: ${rolePermissionCount.count}`);
    }

    // Step 1: Drop role_permissions table (has foreign key to permissions)
    if (hasRolePermissionsTable) {
      console.log('🗑️  Dropping role_permissions table...');
      await knex.schema.dropTable('role_permissions');
      console.log('✅ role_permissions table dropped successfully');
    }

    // Step 2: Drop permissions table
    if (hasPermissionsTable) {
      console.log('🗑️  Dropping permissions table...');
      await knex.schema.dropTable('permissions');
      console.log('✅ permissions table dropped successfully');
    }

    console.log('');
    console.log('🎉 Legacy RBAC tables successfully removed!');
    console.log('📝 Note: All authorization now handled by Cerbos');
    console.log('⚠️  This change is IRREVERSIBLE - permission data has been permanently deleted');

  } catch (error) {
    console.error('❌ Error dropping legacy RBAC tables:', error);
    console.error('💡 This may indicate active references to these tables still exist');
    console.error('   Please verify all code has been migrated to Cerbos before running this migration');
    throw error;
  }
};

exports.down = async function(knex) {
  console.log('⚠️  WARNING: Attempting to rollback legacy RBAC table drop...');
  console.log('');
  console.log('❌ ROLLBACK NOT POSSIBLE');
  console.log('The original permission data has been permanently deleted.');
  console.log('');
  console.log('To restore basic table structure (WITHOUT data):');
  console.log('1. Run the original RBAC creation migration: 20250829_create_rbac_system.js');
  console.log('2. Re-seed permissions using: seeds/016_rbac_system_seed.js');
  console.log('3. Manually reassign role permissions as needed');
  console.log('');
  console.log('⚠️  However, this will conflict with Cerbos authorization!');
  console.log('    Only do this if you are reverting the entire Cerbos migration.');

  // Recreate basic table structure (but warn user about data loss)
  console.log('');
  console.log('Creating empty table structure for emergency rollback...');

  try {
    // Recreate permissions table (basic structure only)
    await knex.schema.createTable('permissions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 100).unique().notNullable().comment('Permission identifier (e.g., games:read, assignments:create)');
      table.string('category', 50).notNullable().comment('Permission category (games, assignments, referees, etc.)');
      table.text('description').comment('Human-readable description of what this permission allows');
      table.boolean('is_system').defaultTo(false).notNullable().comment('System permissions cannot be deleted');
      table.timestamps(true, true);

      table.index(['category']);
      table.index(['name']);
    });

    // Recreate role_permissions table (basic structure only)
    await knex.schema.createTable('role_permissions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
      table.uuid('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');

      table.unique(['role_id', 'permission_id']);
      table.index(['role_id']);
      table.index(['permission_id']);
    });

    console.log('✅ Empty table structure recreated');
    console.log('⚠️  Tables are empty - you must re-seed data manually');

  } catch (error) {
    console.error('❌ Error recreating table structure:', error);
    throw error;
  }
};