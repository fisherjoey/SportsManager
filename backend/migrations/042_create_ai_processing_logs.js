/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('ai_processing_logs', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('receipt_id').notNullable();
    table.uuid('user_id').notNullable();
    table.uuid('organization_id').notNullable();
    
    // AI Service information
    table.string('service_type').notNullable(); // 'ocr', 'llm', 'categorization'
    table.string('service_provider').notNullable(); // 'google_vision', 'openai', etc.
    table.string('model_version');
    table.string('api_version');
    
    // Processing details
    table.enum('status', [
      'started',
      'completed',
      'failed',
      'timeout',
      'rate_limited'
    ]).notNullable();
    
    table.text('input_data'); // What was sent to the AI service
    table.json('output_data'); // What was received
    table.text('error_message');
    table.integer('processing_time_ms'); // How long it took
    
    // Cost tracking
    table.decimal('tokens_used', 12, 0); // For LLM services
    table.decimal('cost_usd', 8, 4); // Estimated cost
    table.json('usage_metadata'); // Additional usage metrics
    
    // Quality metrics
    table.decimal('confidence_score', 3, 2); // 0-1 confidence score
    table.json('quality_metrics'); // Service-specific quality data
    table.boolean('requires_retry').defaultTo(false);
    table.integer('retry_count').defaultTo(0);
    
    // Timestamps
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Foreign key constraints
    table.foreign('receipt_id').references('id').inTable('expense_receipts').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Indexes
    table.index(['receipt_id', 'service_type']);
    table.index(['organization_id', 'started_at']);
    table.index(['service_type', 'status']);
    table.index('started_at'); // For cost reporting
    table.index('requires_retry');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('ai_processing_logs');
};