/**
 * RBAC (Role-Based Access Control) System Migration - Phase 1
 * 
 * Creates the foundational database tables for a flexible permission system:
 * - roles: Defines system roles (Admin, Referee Coordinator, etc.)
 * - permissions: Defines granular permissions (games:read, assignments:create, etc.)
 * - role_permissions: Many-to-many relationship between roles and permissions
 * - user_roles: Many-to-many relationship between users and roles
 * 
 * This migration maintains backward compatibility with the existing role system
 * and provides the foundation for GUI-based role management.
 */

exports.up = async function(knex) {
  // Create roles table
  await knex.schema.createTable('roles', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).unique().notNullable().comment('Role name (e.g., Admin, Referee Coordinator)');
    table.text('description').comment('Detailed description of the role and its responsibilities');
    table.boolean('is_active').defaultTo(true).notNullable().comment('Whether this role is currently active');
    table.boolean('is_system').defaultTo(false).notNullable().comment('System roles cannot be deleted');
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index(['is_active']);
    table.index(['name']);
  });

  // Create permissions table
  await knex.schema.createTable('permissions', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).unique().notNullable().comment('Permission identifier (e.g., games:read, assignments:create)');
    table.string('category', 50).notNullable().comment('Permission category (games, assignments, referees, etc.)');
    table.text('description').comment('Human-readable description of what this permission allows');
    table.boolean('is_system').defaultTo(false).notNullable().comment('System permissions cannot be deleted');
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index(['category']);
    table.index(['name']);
  });

  // Create role_permissions junction table
  await knex.schema.createTable('role_permissions', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    
    // Ensure unique role-permission combinations
    table.unique(['role_id', 'permission_id']);
    
    // Indexes for performance
    table.index(['role_id']);
    table.index(['permission_id']);
  });

  // Create user_roles junction table
  await knex.schema.createTable('user_roles', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.uuid('assigned_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('expires_at').comment('Optional expiration date for temporary role assignments');
    table.boolean('is_active').defaultTo(true).notNullable();
    
    // Ensure unique user-role combinations
    table.unique(['user_id', 'role_id']);
    
    // Indexes for performance
    table.index(['user_id']);
    table.index(['role_id']);
    table.index(['is_active']);
    table.index(['expires_at']);
  });

  console.log('✓ RBAC system tables created successfully');
};

exports.down = async function(knex) {
  // Drop tables in reverse order to handle foreign key constraints
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('roles');
  
  console.log('✓ RBAC system tables dropped successfully');
};