/**
 * Resource Category Managers Migration
 * 
 * Creates the resource_category_managers table to assign specific users
 * as managers for resource categories.
 * 
 * This table allows for granular management assignments where specific users
 * can be designated as managers for particular categories, regardless of their
 * global role permissions.
 */

exports.up = async function(knex) {
  return knex.schema.createTable('resource_category_managers', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('category_id')
      .notNullable()
      .references('id')
      .inTable('resource_categories')
      .onDelete('CASCADE')
      .comment('Reference to resource category being managed');
    table.uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .comment('Reference to user assigned as manager');
    
    // Manager role and assignment details
    table.string('role', 50)
      .defaultTo('manager')
      .comment('Type of management role (manager, moderator, contributor)');
    table.uuid('assigned_by')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .comment('User who assigned this management role');
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    
    // Optional expiration for temporary assignments
    table.timestamp('expires_at')
      .nullable()
      .comment('Optional expiration date for temporary management assignments');
    table.boolean('is_active')
      .defaultTo(true)
      .comment('Whether this management assignment is currently active');
    
    // Constraints
    table.unique(['category_id', 'user_id'], { indexName: 'resource_category_managers_unique' });
    
    // Indexes for performance
    table.index(['category_id'], 'resource_category_managers_category_idx');
    table.index(['user_id'], 'resource_category_managers_user_idx');
    table.index(['assigned_by'], 'resource_category_managers_assigned_by_idx');
    table.index(['is_active'], 'resource_category_managers_active_idx');
    table.index(['expires_at'], 'resource_category_managers_expires_idx');
    table.index(['role'], 'resource_category_managers_role_idx');
  });
};

exports.down = async function(knex) {
  return knex.schema.dropTableIfExists('resource_category_managers');
};