/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('payment_methods', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    
    // Payment method details
    table.string('name').notNullable(); // "Employee Reimbursement", "Corporate Amex", etc.
    table.enum('type', [
      'person_reimbursement',  // Direct reimbursement to person
      'purchase_order',        // Purchase order workflow
      'credit_card',          // Company credit card
      'direct_vendor'         // Direct payment to vendor
    ]).notNullable();
    
    table.text('description'); // Additional details about the payment method
    table.boolean('is_active').defaultTo(true);
    table.boolean('requires_approval').defaultTo(true);
    table.boolean('requires_purchase_order').defaultTo(false);
    
    // Approval configuration
    table.decimal('auto_approval_limit', 10, 2); // Auto-approve under this amount
    table.json('approval_workflow'); // JSON defining approval steps and limits
    table.json('required_fields'); // What fields are required for this payment method
    
    // Integration settings
    table.json('integration_config'); // Configuration for external systems
    table.string('accounting_code'); // For accounting system integration
    table.string('cost_center'); // Default cost center
    
    // Usage restrictions
    table.json('allowed_categories'); // Which expense categories can use this method
    table.json('user_restrictions'); // Which users/roles can use this method
    table.decimal('spending_limit', 10, 2); // Optional spending limit
    table.string('spending_period'); // 'daily', 'weekly', 'monthly', 'yearly'
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by'); // Admin who created this payment method
    table.uuid('updated_by'); // Admin who last updated this payment method
    
    // Foreign key constraints
    table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.foreign('updated_by').references('id').inTable('users').onDelete('SET NULL');
    
    // Indexes
    table.index(['organization_id', 'is_active']);
    table.index(['type', 'is_active']);
    table.index('name');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('payment_methods');
};