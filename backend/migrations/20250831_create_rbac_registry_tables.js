/**
 * Create RBAC Registry Tables
 * 
 * These tables store auto-discovered resources that need permission configuration:
 * - rbac_pages: Page routes discovered from the app directory
 * - rbac_endpoints: API endpoints discovered from route files  
 * - rbac_functions: Functions that may require permission checks
 * - rbac_scan_history: History of automated scans
 */

exports.up = async function(knex) {
  console.log('Creating RBAC registry tables...')

  // Table for discovered pages
  await knex.schema.createTable('rbac_pages', table => {
    table.increments('id').primary()
    table.string('page_path', 255).notNullable().unique()
    table.string('page_name', 255).notNullable()
    table.string('page_category', 100).defaultTo('General')
    table.text('page_description').nullable()
    table.json('suggested_permissions').nullable() // JSON array of suggested permissions
    table.boolean('is_protected').defaultTo(false) // Whether page has protection checks
    table.boolean('auto_detected').defaultTo(true) // Was this auto-discovered?
    table.boolean('needs_configuration').defaultTo(true) // Needs admin configuration
    table.timestamp('configured_at').nullable() // When it was configured
    table.timestamps(true, true) // created_at, updated_at
    
    // Indexes
    table.index('page_category')
    table.index('auto_detected')
    table.index('needs_configuration')
  })

  // Table for discovered API endpoints
  await knex.schema.createTable('rbac_endpoints', table => {
    table.increments('id').primary()
    table.string('method', 10).notNullable() // GET, POST, etc.
    table.string('endpoint_path', 255).notNullable()
    table.string('controller', 255).nullable() // Source file/controller
    table.string('action', 100).nullable() // Handler function name
    table.json('suggested_permissions').nullable() // JSON array of suggested permissions
    table.enum('risk_level', ['low', 'medium', 'high', 'critical']).defaultTo('medium')
    table.boolean('auto_detected').defaultTo(true)
    table.boolean('needs_configuration').defaultTo(true)
    table.timestamp('configured_at').nullable()
    table.timestamps(true, true)
    
    // Unique constraint on method + path
    table.unique(['method', 'endpoint_path'])
    
    // Indexes
    table.index('risk_level')
    table.index('auto_detected')
    table.index('needs_configuration')
  })

  // Table for discovered functions
  await knex.schema.createTable('rbac_functions', table => {
    table.increments('id').primary()
    table.string('function_name', 255).notNullable()
    table.string('module_path', 500).notNullable() // Relative path to the module
    table.string('category', 100).defaultTo('general') // games, users, etc.
    table.json('suggested_permissions').nullable()
    table.enum('risk_level', ['low', 'medium', 'high', 'critical']).defaultTo('medium')
    table.boolean('auto_detected').defaultTo(true)
    table.boolean('needs_configuration').defaultTo(true)
    table.timestamp('configured_at').nullable()
    table.timestamps(true, true)
    
    // Unique constraint on function + module
    table.unique(['function_name', 'module_path'])
    
    // Indexes
    table.index('category')
    table.index('risk_level')
    table.index('needs_configuration')
  })

  // Table for scan history and statistics
  await knex.schema.createTable('rbac_scan_history', table => {
    table.increments('id').primary()
    table.timestamp('scan_started_at').notNullable()
    table.timestamp('scan_completed_at').nullable()
    table.integer('duration_ms').nullable() // Scan duration in milliseconds
    table.integer('pages_found').defaultTo(0)
    table.integer('endpoints_found').defaultTo(0)
    table.integer('functions_found').defaultTo(0)
    table.integer('new_items_registered').defaultTo(0)
    table.json('scan_summary').nullable() // Detailed scan results
    table.enum('scan_type', ['automated', 'manual', 'startup']).defaultTo('manual')
    table.enum('status', ['running', 'completed', 'failed']).defaultTo('running')
    table.text('error_message').nullable()
    table.timestamps(true, true)
    
    // Indexes
    table.index('scan_started_at')
    table.index('scan_type')
    table.index('status')
  })

  // Table for configuration templates
  await knex.schema.createTable('rbac_configuration_templates', table => {
    table.increments('id').primary()
    table.string('template_name', 255).notNullable().unique()
    table.text('template_description').nullable()
    table.enum('resource_type', ['page', 'endpoint', 'function']).notNullable()
    table.json('permission_mapping').notNullable() // Rules for auto-assigning permissions
    table.json('categorization_rules').nullable() // Rules for categorizing resources
    table.boolean('is_active').defaultTo(true)
    table.timestamps(true, true)
    
    table.index('resource_type')
    table.index('is_active')
  })

  console.log('✅ RBAC registry tables created successfully')

  // Insert default configuration templates
  await knex('rbac_configuration_templates').insert([
    {
      template_name: 'Admin Pages',
      template_description: 'Configuration template for admin pages',
      resource_type: 'page',
      permission_mapping: JSON.stringify({
        'admin': ['roles:read'],
        'user': ['users:read'],
        'settings': ['settings:read'],
        'permission': ['roles:manage']
      }),
      categorization_rules: JSON.stringify({
        'admin': 'Administration',
        'user': 'Administration', 
        'settings': 'Administration'
      })
    },
    {
      template_name: 'API Endpoints',
      template_description: 'Configuration template for API endpoints',
      resource_type: 'endpoint',
      permission_mapping: JSON.stringify({
        'GET': { action: 'read' },
        'POST': { action: 'create' },
        'PUT': { action: 'update' },
        'PATCH': { action: 'update' },
        'DELETE': { action: 'delete' }
      }),
      categorization_rules: JSON.stringify({
        '/api/admin': 'critical',
        '/api/users': 'high',
        '/api/games': 'medium'
      })
    },
    {
      template_name: 'Sensitive Functions',
      template_description: 'Configuration template for functions requiring permissions',
      resource_type: 'function',
      permission_mapping: JSON.stringify({
        'delete': { risk: 'high', permission: 'delete' },
        'admin': { risk: 'critical', permission: 'manage' },
        'create': { risk: 'medium', permission: 'create' },
        'update': { risk: 'medium', permission: 'update' }
      }),
      categorization_rules: JSON.stringify({
        'admin': 'critical',
        'delete': 'high',
        'manage': 'critical'
      })
    }
  ])

  console.log('✅ Default configuration templates inserted')
}

exports.down = async function(knex) {
  console.log('Dropping RBAC registry tables...')
  
  await knex.schema.dropTableIfExists('rbac_configuration_templates')
  await knex.schema.dropTableIfExists('rbac_scan_history')
  await knex.schema.dropTableIfExists('rbac_functions')
  await knex.schema.dropTableIfExists('rbac_endpoints')
  await knex.schema.dropTableIfExists('rbac_pages')
  
  console.log('✅ RBAC registry tables dropped')
}