/**
 * Add Resource RBAC Fields Migration
 * 
 * Adds new fields to existing resources and resource_categories tables
 * to support enhanced RBAC functionality, versioning, and management features.
 * 
 * New fields for resources:
 * - version_number: Current version of the resource
 * - is_draft: Whether the resource is in draft state
 * - published_at: When the resource was first published
 * - published_by: Who published the resource
 * - last_accessed_at: Last time the resource was accessed
 * - access_count: Total number of times the resource was accessed
 * 
 * New fields for resource_categories:
 * - created_by: Who created the category
 * - managed_by: Primary manager of the category
 * - visibility: Visibility level (public, private, restricted)
 */

exports.up = async function(knex) {
  // Add new fields to resources table
  await knex.schema.alterTable('resources', function(table) {
    // Version and publishing fields
    table.integer('version_number')
      .defaultTo(1)
      .comment('Current version number of the resource');
    table.boolean('is_draft')
      .defaultTo(true)
      .comment('Whether the resource is in draft state');
    table.timestamp('published_at')
      .nullable()
      .comment('When the resource was first published');
    table.uuid('published_by')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .comment('User who published the resource');
    
    // Access tracking fields
    table.timestamp('last_accessed_at')
      .nullable()
      .comment('Last time the resource was accessed');
    table.integer('access_count')
      .defaultTo(0)
      .comment('Total number of times the resource was accessed');
    
    // Indexes for new fields
    table.index(['version_number'], 'resources_version_number_idx');
    table.index(['is_draft'], 'resources_is_draft_idx');
    table.index(['published_at'], 'resources_published_at_idx');
    table.index(['published_by'], 'resources_published_by_idx');
    table.index(['last_accessed_at'], 'resources_last_accessed_idx');
    table.index(['access_count'], 'resources_access_count_idx');
  });
  
  // Add new fields to resource_categories table
  await knex.schema.alterTable('resource_categories', function(table) {
    // Management fields
    table.uuid('created_by')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .comment('User who created the category');
    table.uuid('managed_by')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .comment('Primary manager of the category');
    
    // Visibility control
    table.string('visibility', 20)
      .defaultTo('public')
      .comment('Visibility level: public, private, restricted');
    
    // Indexes for new fields
    table.index(['created_by'], 'resource_categories_created_by_idx');
    table.index(['managed_by'], 'resource_categories_managed_by_idx');
    table.index(['visibility'], 'resource_categories_visibility_idx');
  });

  console.log('✓ Added RBAC fields to resources and resource_categories tables');
};

exports.down = async function(knex) {
  // Remove added fields from resources table
  await knex.schema.alterTable('resources', function(table) {
    table.dropColumn('version_number');
    table.dropColumn('is_draft');
    table.dropColumn('published_at');
    table.dropColumn('published_by');
    table.dropColumn('last_accessed_at');
    table.dropColumn('access_count');
  });
  
  // Remove added fields from resource_categories table
  await knex.schema.alterTable('resource_categories', function(table) {
    table.dropColumn('created_by');
    table.dropColumn('managed_by');
    table.dropColumn('visibility');
  });

  console.log('✓ Removed RBAC fields from resources and resource_categories tables');
};