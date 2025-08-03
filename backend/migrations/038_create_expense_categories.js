/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('expense_categories', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    
    // Category information
    table.string('name').notNullable();
    table.string('code').notNullable(); // For accounting integration
    table.text('description');
    table.string('color_code').defaultTo('#6B7280'); // Hex color for UI
    table.string('icon').defaultTo('receipt'); // Icon identifier for UI
    
    // Category hierarchy
    table.uuid('parent_category_id'); // For subcategories
    table.integer('sort_order').defaultTo(0);
    
    // AI categorization rules
    table.json('keywords'); // Keywords for auto-categorization
    table.json('vendor_patterns'); // Vendor name patterns
    table.json('amount_ranges'); // Amount range hints
    table.boolean('ai_enabled').defaultTo(true);
    
    // Business rules
    table.boolean('requires_approval').defaultTo(false);
    table.decimal('approval_threshold', 10, 2); // Amount requiring approval
    table.boolean('reimbursable').defaultTo(true);
    table.boolean('taxable').defaultTo(true);
    
    // Status and metadata
    table.boolean('active').defaultTo(true);
    table.json('metadata'); // Additional category-specific data
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Foreign key constraints
    table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('parent_category_id').references('id').inTable('expense_categories').onDelete('SET NULL');
    
    // Unique constraints
    table.unique(['organization_id', 'name']);
    table.unique(['organization_id', 'code']);
    
    // Indexes
    table.index(['organization_id', 'active']);
    table.index('parent_category_id');
    table.index('ai_enabled');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('expense_categories');
};