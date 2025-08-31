/**
 * Resource Category Permissions Migration
 * 
 * Creates the resource_category_permissions table to manage role-based permissions
 * at the category level for resource management.
 * 
 * This table allows fine-grained control over what roles can do within specific
 * resource categories (view, create, edit, delete, manage).
 */

exports.up = async function(knex) {
  return knex.schema.createTable('resource_category_permissions', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('category_id')
      .notNullable()
      .references('id')
      .inTable('resource_categories')
      .onDelete('CASCADE')
      .comment('Reference to resource category');
    table.uuid('role_id')
      .notNullable()
      .references('id')
      .inTable('roles')
      .onDelete('CASCADE')
      .comment('Reference to role');
    
    // Permission flags
    table.boolean('can_view').defaultTo(true).comment('Can view resources in this category');
    table.boolean('can_create').defaultTo(false).comment('Can create new resources in this category');
    table.boolean('can_edit').defaultTo(false).comment('Can edit existing resources in this category');
    table.boolean('can_delete').defaultTo(false).comment('Can delete resources in this category');
    table.boolean('can_manage').defaultTo(false).comment('Can manage category settings and permissions');
    
    // Audit fields
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.uuid('created_by')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .comment('User who created this permission');
    
    // Constraints
    table.unique(['category_id', 'role_id'], { indexName: 'resource_category_permissions_unique' });
    
    // Indexes for performance
    table.index(['category_id'], 'resource_category_permissions_category_idx');
    table.index(['role_id'], 'resource_category_permissions_role_idx');
    table.index(['created_at'], 'resource_category_permissions_created_idx');
  });
};

exports.down = async function(knex) {
  return knex.schema.dropTableIfExists('resource_category_permissions');
};