/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('expense_data', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('receipt_id').notNullable();
    table.uuid('user_id').notNullable();
    table.uuid('organization_id').notNullable();
    
    // Extracted expense data
    table.string('vendor_name');
    table.text('vendor_address');
    table.string('vendor_phone');
    table.decimal('total_amount', 10, 2);
    table.decimal('tax_amount', 10, 2);
    table.decimal('subtotal_amount', 10, 2);
    table.date('transaction_date');
    table.string('transaction_time');
    table.string('receipt_number');
    table.string('payment_method'); // cash, card, check, etc.
    
    // Categorization
    table.uuid('category_id');
    table.string('category_name'); // Denormalized for performance
    table.text('description'); // User or AI generated description
    table.json('line_items'); // Detailed item breakdown
    
    // Business context
    table.string('business_purpose');
    table.string('project_code');
    table.string('department');
    table.boolean('reimbursable').defaultTo(true);
    
    // AI processing metadata
    table.json('ai_extracted_fields'); // Raw AI extraction results
    table.decimal('extraction_confidence', 3, 2); // Overall confidence score 0-1
    table.json('field_confidence_scores'); // Per-field confidence scores
    table.boolean('requires_manual_review').defaultTo(false);
    
    // Validation and correction
    table.boolean('manually_corrected').defaultTo(false);
    table.json('corrections_made'); // Track what was corrected
    table.uuid('corrected_by'); // User who made corrections
    table.timestamp('corrected_at');
    
    // Timestamps
    table.timestamp('extracted_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Foreign key constraints
    table.foreign('receipt_id').references('id').inTable('expense_receipts').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('category_id').references('id').inTable('expense_categories').onDelete('SET NULL');
    table.foreign('corrected_by').references('id').inTable('users').onDelete('SET NULL');
    
    // Indexes
    table.index(['user_id', 'transaction_date']);
    table.index(['organization_id', 'category_id']);
    table.index(['transaction_date', 'total_amount']);
    table.index('requires_manual_review');
    table.index('manually_corrected');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('expense_data');
};