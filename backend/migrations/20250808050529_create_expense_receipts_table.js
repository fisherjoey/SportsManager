/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('expense_receipts', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('file_path').notNullable();
    table.string('original_filename').notNullable();
    table.string('file_type').notNullable();
    table.integer('file_size').notNullable();
    table.string('file_hash');
    table.string('processing_status').defaultTo('uploaded');
    table.text('raw_ocr_text');
    table.jsonb('processing_metadata');
    table.text('processing_notes');
    table.decimal('extraction_confidence', 5, 2);
    table.timestamp('processed_at');
    table.timestamps(true, true);
    
    table.index('user_id');
    table.index('processing_status');
    table.index('created_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('expense_receipts');
};