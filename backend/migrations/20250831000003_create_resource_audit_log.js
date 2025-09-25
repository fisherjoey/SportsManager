/**
 * Resource Audit Log Migration
 * 
 * Creates the resource_audit_log table to track all actions performed
 * on resources and resource categories for compliance and auditing purposes.
 * 
 * This table maintains a comprehensive audit trail of who did what, when,
 * and what changes were made to resources and categories.
 */

exports.up = async function(knex) {
  return knex.schema.createTable('resource_audit_log', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Resource references (nullable to handle both resources and categories)
    table.uuid('resource_id')
      .nullable()
      .references('id')
      .inTable('resources')
      .onDelete('SET NULL')
      .comment('Reference to resource (null for category actions)');
    table.uuid('category_id')
      .nullable()
      .references('id')
      .inTable('resource_categories')
      .onDelete('SET NULL')
      .comment('Reference to category (null for resource-only actions)');
    
    // Actor information
    table.uuid('user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .comment('User who performed the action');
    
    // Action details
    table.string('action', 50)
      .notNullable()
      .comment('Action performed (create, update, delete, view, download, etc.)');
    
    // Change tracking
    table.jsonb('changes')
      .nullable()
      .comment('JSON object containing before/after values for updates');
    
    // Additional metadata
    table.jsonb('metadata')
      .nullable()
      .defaultTo('{}')
      .comment('Additional context like IP address, user agent, etc.');
    
    // Timestamp
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes for performance
    table.index(['resource_id'], 'resource_audit_log_resource_idx');
    table.index(['category_id'], 'resource_audit_log_category_idx');
    table.index(['user_id'], 'resource_audit_log_user_idx');
    table.index(['action'], 'resource_audit_log_action_idx');
    table.index(['created_at'], 'resource_audit_log_created_idx');
    
    // Composite indexes for common queries
    table.index(['resource_id', 'created_at'], 'resource_audit_log_resource_time_idx');
    table.index(['user_id', 'created_at'], 'resource_audit_log_user_time_idx');
  });
};

exports.down = async function(knex) {
  return knex.schema.dropTableIfExists('resource_audit_log');
};