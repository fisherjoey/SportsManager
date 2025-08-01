/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('company_credit_cards', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    
    // Card identification (encrypted/masked for security)
    table.string('card_name').notNullable(); // Display name like "Corporate Amex Gold"
    table.string('card_type').notNullable(); // 'visa', 'mastercard', 'amex', 'discover'
    table.string('last_four_digits', 4).notNullable(); // Last 4 digits for identification
    table.string('card_network'); // Card network identifier
    table.string('issuing_bank'); // Bank that issued the card
    
    // Card holder and assignment
    table.uuid('primary_holder_id'); // Primary card holder (employee)
    table.string('cardholder_name'); // Name on the card
    table.json('authorized_users'); // List of user IDs who can use this card
    table.boolean('is_shared_card').defaultTo(false); // Can multiple people use it?
    
    // Card status and limits
    table.boolean('is_active').defaultTo(true);
    table.date('expiration_date');
    table.decimal('credit_limit', 10, 2);
    table.decimal('available_credit', 10, 2); // Updated from statements
    table.decimal('current_balance', 10, 2); // Current outstanding balance
    
    // Spending controls
    table.decimal('monthly_limit', 10, 2); // Monthly spending limit
    table.decimal('transaction_limit', 10, 2); // Per-transaction limit
    table.json('category_limits'); // Spending limits by expense category
    table.json('merchant_restrictions'); // Allowed/blocked merchants
    table.boolean('requires_receipt').defaultTo(true);
    table.boolean('requires_pre_approval').defaultTo(false);
    
    // Statement and reconciliation
    table.date('statement_closing_date'); // When statements close
    table.date('payment_due_date'); // When payment is due
    table.string('statement_frequency').defaultTo('monthly'); // monthly, bi-weekly, etc.
    table.json('auto_reconciliation_rules'); // Rules for matching transactions
    
    // Integration settings
    table.string('external_card_id'); // ID in external system (bank API, etc.)
    table.json('integration_config'); // Configuration for bank API integration
    table.string('accounting_code'); // Default accounting code for transactions
    table.string('cost_center'); // Default cost center
    
    // Notification and alerts
    table.json('notification_settings'); // Who gets alerts for this card
    table.decimal('alert_threshold', 10, 2); // Alert when spending exceeds this
    table.boolean('fraud_monitoring').defaultTo(true);
    table.json('spending_alerts'); // Custom spending alert rules
    
    // Emergency and security
    table.boolean('is_emergency_card').defaultTo(false);
    table.boolean('is_blocked').defaultTo(false);
    table.text('block_reason');
    table.timestamp('blocked_at');
    table.uuid('blocked_by');
    
    // Timestamps and audit
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('activated_at');
    table.timestamp('deactivated_at');
    table.uuid('created_by'); // Admin who added this card
    table.uuid('updated_by'); // Admin who last updated this card
    
    // Foreign key constraints
    table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('primary_holder_id').references('id').inTable('users').onDelete('SET NULL');
    table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.foreign('updated_by').references('id').inTable('users').onDelete('SET NULL');
    table.foreign('blocked_by').references('id').inTable('users').onDelete('SET NULL');
    
    // Indexes
    table.index(['organization_id', 'is_active']);
    table.index(['primary_holder_id', 'is_active']);
    table.index('card_name');
    table.index(['last_four_digits', 'card_type']);
    table.index('expiration_date');
    table.index('is_shared_card');
    table.index('statement_closing_date');
    table.index('is_emergency_card');
    table.index('is_blocked');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('company_credit_cards');
};