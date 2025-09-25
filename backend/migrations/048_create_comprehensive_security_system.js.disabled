/**
 * Migration for comprehensive enterprise security system
 * Includes MFA, session management, security monitoring, and enhanced RBAC
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    // User Sessions Table - Advanced session management
    await trx.schema.createTable('user_sessions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('session_token', 255).notNullable().unique().index();
      table.string('refresh_token', 255).notNullable().unique().index();
      table.string('device_fingerprint', 255).nullable();
      table.string('ip_address', 45).notNullable().index();
      table.text('user_agent').nullable();
      table.json('location_data').nullable(); // Geolocation info
      table.boolean('is_active').defaultTo(true).index();
      table.timestamp('expires_at').notNullable().index();
      table.timestamp('last_activity').defaultTo(knex.fn.now()).index();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Composite indexes for performance
      table.index(['user_id', 'is_active']);
      table.index(['expires_at', 'is_active']);
    });

    // Multi-Factor Authentication Settings
    await trx.schema.createTable('mfa_settings', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.boolean('is_enabled').defaultTo(false).index();
      table.enum('method', ['totp', 'sms', 'email', 'backup_codes']).notNullable();
      table.text('secret_key').nullable(); // Encrypted TOTP secret
      table.string('phone_number', 20).nullable();
      table.json('backup_codes').nullable(); // Array of hashed backup codes
      table.integer('failed_attempts').defaultTo(0);
      table.timestamp('locked_until').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.unique(['user_id', 'method']);
      table.index(['user_id', 'is_enabled']);
    });

    // Security Events Monitoring
    await trx.schema.createTable('security_events', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('event_type', 100).notNullable().index();
      table.enum('severity', ['low', 'medium', 'high', 'critical']).notNullable().index();
      table.string('ip_address', 45).notNullable().index();
      table.text('user_agent').nullable();
      table.json('event_data').nullable(); // Detailed event information
      table.string('risk_score', 10).nullable().index(); // LOW, MEDIUM, HIGH, CRITICAL
      table.boolean('is_resolved').defaultTo(false).index();
      table.uuid('resolved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.text('resolution_notes').nullable();
      table.timestamp('resolved_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now()).index();
      
      // Performance indexes
      table.index(['event_type', 'severity', 'created_at']);
      table.index(['user_id', 'created_at']);
      table.index(['is_resolved', 'severity']);
    });

    // Login Attempts Tracking (Brute Force Protection)
    await trx.schema.createTable('login_attempts', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('identifier', 255).notNullable().index(); // Email or IP
      table.string('ip_address', 45).notNullable().index();
      table.boolean('successful').notNullable().index();
      table.string('failure_reason', 100).nullable();
      table.text('user_agent').nullable();
      table.timestamp('attempted_at').defaultTo(knex.fn.now()).index();
      
      // Composite indexes for rate limiting queries
      table.index(['identifier', 'attempted_at']);
      table.index(['ip_address', 'attempted_at']);
      table.index(['successful', 'attempted_at']);
    });

    // Enhanced Permission System
    await trx.schema.createTable('permissions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 100).notNullable().unique();
      table.string('resource', 50).notNullable().index(); // financial, organizational, games, etc.
      table.string('action', 50).notNullable().index(); // create, read, update, delete, etc.
      table.text('description').nullable();
      table.json('conditions').nullable(); // Conditional permissions
      table.boolean('is_active').defaultTo(true).index();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.unique(['resource', 'action']);
      table.index(['resource', 'is_active']);
    });

    // Role Permissions Mapping
    await trx.schema.createTable('role_permissions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
      table.uuid('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');
      table.json('constraints').nullable(); // Additional constraints on permission
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.unique(['role_id', 'permission_id']);
      table.index('role_id');
      table.index('permission_id');
    });

    // User-Specific Permissions (Override role permissions)
    await trx.schema.createTable('user_permissions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');
      table.boolean('granted').notNullable(); // true = grant, false = deny
      table.json('constraints').nullable();
      table.uuid('granted_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('expires_at').nullable().index();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.unique(['user_id', 'permission_id']);
      table.index(['user_id', 'granted']);
      table.index(['expires_at']);
    });

    // Encrypted Data Fields Management
    await trx.schema.createTable('encrypted_fields', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('table_name', 100).notNullable();
      table.string('field_name', 100).notNullable();
      table.string('record_id', 100).notNullable();
      table.text('encrypted_value').notNullable();
      table.string('encryption_key_id', 100).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.unique(['table_name', 'field_name', 'record_id']);
      table.index(['table_name', 'record_id']);
    });

    // Security Configuration Settings
    await trx.schema.createTable('security_configurations', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('setting_key', 100).notNullable().unique();
      table.json('setting_value').notNullable();
      table.text('description').nullable();
      table.boolean('is_active').defaultTo(true).index();
      table.uuid('updated_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // Security Incidents
    await trx.schema.createTable('security_incidents', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('title', 255).notNullable();
      table.text('description').notNullable();
      table.enum('severity', ['low', 'medium', 'high', 'critical']).notNullable().index();
      table.enum('status', ['open', 'investigating', 'resolved', 'closed']).defaultTo('open').index();
      table.uuid('affected_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.json('affected_resources').nullable(); // Array of affected resources
      table.uuid('assigned_to').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.json('timeline').nullable(); // Array of timeline events
      table.json('evidence').nullable(); // Links to evidence, logs, etc.
      table.text('resolution').nullable();
      table.timestamp('detected_at').notNullable().index();
      table.timestamp('resolved_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.index(['status', 'severity']);
      table.index(['assigned_to', 'status']);
    });

    // Data Access Logs (For sensitive data access tracking)
    await trx.schema.createTable('data_access_logs', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('resource_type', 50).notNullable().index(); // financial, employee, etc.
      table.string('resource_id', 100).notNullable().index();
      table.string('action', 50).notNullable().index(); // view, export, modify
      table.json('accessed_fields').nullable(); // Which specific fields were accessed
      table.string('access_reason', 255).nullable(); // Business justification
      table.string('ip_address', 45).notNullable();
      table.text('user_agent').nullable();
      table.timestamp('accessed_at').defaultTo(knex.fn.now()).index();
      
      table.index(['user_id', 'accessed_at']);
      table.index(['resource_type', 'action', 'accessed_at']);
    });

    // Enhanced indexes on existing audit_logs table
    await trx.raw(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_resource 
      ON audit_logs(user_id, resource_type, created_at);
    `);
    
    await trx.raw(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address 
      ON audit_logs(ip_address, created_at);
    `);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    // Drop indexes first
    await trx.raw('DROP INDEX IF EXISTS idx_audit_logs_user_resource');
    await trx.raw('DROP INDEX IF EXISTS idx_audit_logs_ip_address');
    
    // Drop tables in reverse order
    await trx.schema.dropTableIfExists('data_access_logs');
    await trx.schema.dropTableIfExists('security_incidents');
    await trx.schema.dropTableIfExists('security_configurations');
    await trx.schema.dropTableIfExists('encrypted_fields');
    await trx.schema.dropTableIfExists('user_permissions');
    await trx.schema.dropTableIfExists('role_permissions');
    await trx.schema.dropTableIfExists('permissions');
    await trx.schema.dropTableIfExists('login_attempts');
    await trx.schema.dropTableIfExists('security_events');
    await trx.schema.dropTableIfExists('mfa_settings');
    await trx.schema.dropTableIfExists('user_sessions');
  });
};