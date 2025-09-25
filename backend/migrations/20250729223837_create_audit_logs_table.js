/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // TEMPORARILY DISABLED - audit_logs table already exists
  console.log('⚠️  Audit logs migration skipped - table already exists');
  return Promise.resolve();
  
  return knex.schema.createTableIfNotExists('audit_logs', function(table) {
    table.increments('id').primary();
    table.string('event_type', 100).notNullable().index();
    table.uuid('user_id').nullable().index().references('id').inTable('users').onDelete('SET NULL');
    table.string('user_email', 255).nullable().index();
    table.string('ip_address', 45).nullable(); // IPv6 compatible
    table.text('user_agent').nullable();
    table.string('resource_type', 50).nullable().index();
    table.string('resource_id', 100).nullable().index();
    table.text('old_values').nullable();
    table.text('new_values').nullable();
    table.text('additional_data').nullable();
    table.enum('severity', ['low', 'medium', 'high', 'critical']).defaultTo('medium').index();
    table.boolean('success').defaultTo(true).index();
    table.text('error_message').nullable();
    table.string('request_path', 500).nullable();
    table.string('request_method', 10).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).index();
    
    // Composite indexes for common queries
    table.index(['user_id', 'created_at']);
    table.index(['event_type', 'created_at']);
    table.index(['severity', 'created_at']);
    table.index(['success', 'created_at']);
    table.index(['resource_type', 'resource_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('audit_logs');
};
