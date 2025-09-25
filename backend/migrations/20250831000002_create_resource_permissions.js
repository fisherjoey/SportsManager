/**
 * Resource Permissions Migration
 * 
 * Creates the resource_permissions table to manage role-based permissions
 * at the individual resource level.
 * 
 * This table allows fine-grained control over what roles can do with specific
 * resources (view, edit, delete, manage), overriding category-level permissions.
 */

exports.up = async function(knex) {
  return knex.schema.createTable('resource_permissions', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('resource_id')
      .notNullable()
      .references('id')
      .inTable('resources')
      .onDelete('CASCADE')
      .comment('Reference to specific resource');
    table.uuid('role_id')
      .notNullable()
      .references('id')
      .inTable('roles')
      .onDelete('CASCADE')
      .comment('Reference to role');
    
    // Permission flags (resource-level permissions don't include 'can_create')
    table.boolean('can_view').defaultTo(true).comment('Can view this specific resource');
    table.boolean('can_edit').defaultTo(false).comment('Can edit this specific resource');
    table.boolean('can_delete').defaultTo(false).comment('Can delete this specific resource');
    table.boolean('can_manage').defaultTo(false).comment('Can manage permissions for this resource');
    
    // Audit fields
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.uuid('created_by')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .comment('User who created this permission');
    
    // Constraints
    table.unique(['resource_id', 'role_id'], { indexName: 'resource_permissions_unique' });
    
    // Indexes for performance
    table.index(['resource_id'], 'resource_permissions_resource_idx');
    table.index(['role_id'], 'resource_permissions_role_idx');
    table.index(['created_at'], 'resource_permissions_created_idx');
  });
};

exports.down = async function(knex) {
  return knex.schema.dropTableIfExists('resource_permissions');
};