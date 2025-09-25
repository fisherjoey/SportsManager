/**
 * Resource Versions Migration
 * 
 * Creates the resource_versions table to maintain version history
 * of all resources for change tracking and rollback capabilities.
 * 
 * This table allows the system to track all changes made to resources
 * over time and provides the ability to restore previous versions.
 */

exports.up = async function(knex) {
  return knex.schema.createTable('resource_versions', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('resource_id')
      .notNullable()
      .references('id')
      .inTable('resources')
      .onDelete('CASCADE')
      .comment('Reference to the resource this version belongs to');
    
    // Version information
    table.integer('version_number')
      .notNullable()
      .comment('Sequential version number starting from 1');
    
    // Snapshot of resource data at this version
    table.string('title', 255).comment('Resource title at this version');
    table.text('description').comment('Resource description at this version');
    table.text('content').comment('Resource content at this version');
    table.jsonb('metadata')
      .defaultTo('{}')
      .comment('Resource metadata at this version');
    
    // Version metadata
    table.uuid('created_by')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .comment('User who created this version');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.text('change_summary').comment('Summary of changes made in this version');
    
    // Constraints
    table.unique(['resource_id', 'version_number'], { indexName: 'resource_versions_unique' });
    
    // Indexes for performance
    table.index(['resource_id'], 'resource_versions_resource_idx');
    table.index(['resource_id', 'version_number'], 'resource_versions_resource_version_idx');
    table.index(['created_by'], 'resource_versions_created_by_idx');
    table.index(['created_at'], 'resource_versions_created_at_idx');
  });
};

exports.down = async function(knex) {
  return knex.schema.dropTableIfExists('resource_versions');
};