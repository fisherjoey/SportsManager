/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('expense_receipts', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.uuid('organization_id').notNullable();
    
    // File information
    table.string('original_filename').notNullable();
    table.string('file_path').notNullable();
    table.string('file_type').notNullable(); // 'pdf', 'image'
    table.string('mime_type').notNullable();
    table.integer('file_size').notNullable(); // in bytes
    table.string('file_hash').notNullable(); // for duplicate detection
    
    // Processing status
    table.enum('processing_status', [
      'uploaded',
      'processing',
      'processed',
      'failed',
      'manual_review'
    ]).defaultTo('uploaded');
    table.text('processing_notes'); // Error messages, manual review notes
    
    // OCR and AI processing results
    table.text('raw_ocr_text');
    table.json('ai_confidence_scores'); // Store confidence scores for each field
    table.json('processing_metadata'); // Store additional processing info
    
    // Timestamps
    table.timestamp('uploaded_at').defaultTo(knex.fn.now());
    table.timestamp('processed_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Foreign key constraints
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Indexes
    table.index(['user_id', 'processing_status']);
    table.index(['organization_id', 'uploaded_at']);
    table.index('file_hash'); // for duplicate detection
    table.index('processing_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('expense_receipts');
};