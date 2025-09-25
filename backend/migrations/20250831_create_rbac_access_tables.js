/**
 * @fileoverview Database migration for complete RBAC access control tables
 * 
 * Creates tables for managing:
 * - Page/view access per role
 * - API endpoint access per role
 * - Feature flags per role
 * - Data access scopes per role
 */

exports.up = function(knex) {
  return knex.schema
    // Page/View access control table
    .createTable('role_page_access', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.uuid('role_id').notNullable()
        .references('id').inTable('roles')
        .onDelete('CASCADE')
      table.string('page_path', 255).notNullable() // e.g., 'admin-users', 'games'
      table.string('page_name', 255).notNullable()
      table.string('page_category', 100) // 'Sports Management', 'Administration', etc
      table.string('page_description', 500)
      table.boolean('can_access').defaultTo(false)
      table.jsonb('conditions') // Optional conditions for access
      table.timestamps(true, true)
      
      // Unique constraint to prevent duplicate entries
      table.unique(['role_id', 'page_path'])
      
      // Indexes for performance
      table.index('role_id')
      table.index('page_path')
      table.index(['role_id', 'can_access'])
    })
    
    // API endpoint access control table
    .createTable('role_api_access', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.uuid('role_id').notNullable()
        .references('id').inTable('roles')
        .onDelete('CASCADE')
      table.string('http_method', 10).notNullable() // GET, POST, PUT, DELETE, PATCH
      table.string('endpoint_pattern', 255).notNullable() // e.g., '/api/users/:id'
      table.string('endpoint_category', 100) // 'Users', 'Games', 'Reports', etc
      table.string('endpoint_description', 500)
      table.boolean('can_access').defaultTo(false)
      table.integer('rate_limit') // requests per minute, NULL = no special limit
      table.jsonb('conditions') // Optional conditions for access
      table.timestamps(true, true)
      
      // Unique constraint
      table.unique(['role_id', 'http_method', 'endpoint_pattern'])
      
      // Indexes for performance
      table.index('role_id')
      table.index(['http_method', 'endpoint_pattern'])
      table.index(['role_id', 'can_access'])
    })
    
    // Feature flags per role
    .createTable('role_features', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.uuid('role_id').notNullable()
        .references('id').inTable('roles')
        .onDelete('CASCADE')
      table.string('feature_code', 100).notNullable() // e.g., 'ai_assignments', 'bulk_import'
      table.string('feature_name', 255).notNullable()
      table.string('feature_category', 100)
      table.string('feature_description', 500)
      table.boolean('is_enabled').defaultTo(false)
      table.jsonb('configuration') // Feature-specific configuration
      table.timestamps(true, true)
      
      // Unique constraint
      table.unique(['role_id', 'feature_code'])
      
      // Indexes
      table.index('role_id')
      table.index('feature_code')
      table.index(['role_id', 'is_enabled'])
    })
    
    // Data access scopes
    .createTable('role_data_scopes', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.uuid('role_id').notNullable()
        .references('id').inTable('roles')
        .onDelete('CASCADE')
      table.string('entity_type', 100).notNullable() // 'games', 'users', 'referees', etc
      table.string('scope_type', 50).notNullable() // 'own', 'team', 'organization', 'all'
      table.jsonb('conditions') // Additional filters/conditions
      table.string('description', 500)
      table.boolean('is_active').defaultTo(true)
      table.timestamps(true, true)
      
      // Indexes
      table.index('role_id')
      table.index('entity_type')
      table.index(['role_id', 'entity_type', 'is_active'])
    })
    
    // Access control change audit log
    .createTable('access_control_audit', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      table.uuid('user_id').notNullable()
        .references('id').inTable('users')
      table.string('action_type', 50).notNullable() // 'grant', 'revoke', 'modify'
      table.string('resource_type', 50).notNullable() // 'page', 'api', 'feature', 'scope'
      table.uuid('role_id')
        .references('id').inTable('roles')
        .onDelete('SET NULL')
      table.string('resource_identifier', 255) // page path, api endpoint, etc
      table.jsonb('old_value')
      table.jsonb('new_value')
      table.string('reason', 500)
      table.string('ip_address', 45)
      table.string('user_agent', 255)
      table.timestamp('created_at').defaultTo(knex.fn.now())
      
      // Indexes for audit queries
      table.index('user_id')
      table.index('role_id')
      table.index('action_type')
      table.index('resource_type')
      table.index('created_at')
    })
}

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('access_control_audit')
    .dropTableIfExists('role_data_scopes')
    .dropTableIfExists('role_features')
    .dropTableIfExists('role_api_access')
    .dropTableIfExists('role_page_access')
}