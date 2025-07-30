/**
 * Migration: Create financial tracking and transaction management system
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    // Create financial transactions table
    await trx.schema.createTable('financial_transactions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.uuid('budget_id'); // Link to budget if applicable
      table.uuid('expense_data_id'); // Link to expense receipts
      table.uuid('payroll_assignment_id'); // Link to referee payroll
      table.string('transaction_number').notNullable(); // Auto-generated
      table.enum('transaction_type', [
        'expense',
        'revenue',
        'payroll',
        'transfer',
        'adjustment',
        'refund'
      ]).notNullable();
      table.decimal('amount', 12, 2).notNullable();
      table.string('description').notNullable();
      table.date('transaction_date').notNullable();
      table.string('reference_number'); // Check number, invoice number, etc.
      table.uuid('vendor_id');
      table.uuid('created_by').notNullable();
      table.enum('status', [
        'draft',
        'pending_approval',
        'approved',
        'posted',
        'cancelled',
        'voided'
      ]).defaultTo('draft');
      table.json('metadata'); // Additional transaction data
      table.timestamp('posted_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('budget_id').references('id').inTable('budgets').onDelete('SET NULL');
      table.foreign('expense_data_id').references('id').inTable('expense_data').onDelete('SET NULL');
      table.foreign('payroll_assignment_id').references('id').inTable('game_assignments').onDelete('SET NULL');
      table.foreign('created_by').references('id').inTable('users').onDelete('CASCADE');
      
      // Indexes
      table.index(['organization_id', 'transaction_date']);
      table.index(['budget_id']);
      table.index(['status']);
      table.index(['transaction_type']);
      table.unique(['organization_id', 'transaction_number']);
    });

    // Create vendors table for financial tracking
    await trx.schema.createTable('vendors', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.string('name').notNullable();
      table.string('contact_name');
      table.string('email');
      table.string('phone');
      table.text('address');
      table.string('tax_id'); // Tax ID or EIN
      table.string('payment_terms'); // Net 30, etc.
      table.json('payment_methods'); // Check, ACH, etc.
      table.boolean('active').defaultTo(true);
      table.json('metadata'); // Additional vendor data
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      
      // Indexes
      table.index(['organization_id', 'active']);
      table.index(['name']);
    });

    // Create cash flow forecasts
    await trx.schema.createTable('cash_flow_forecasts', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.uuid('budget_period_id').notNullable();
      table.integer('forecast_year').notNullable();
      table.integer('forecast_month').notNullable();
      table.decimal('projected_income', 12, 2).defaultTo(0);
      table.decimal('projected_expenses', 12, 2).defaultTo(0);
      table.decimal('projected_payroll', 12, 2).defaultTo(0);
      table.decimal('net_cash_flow', 12, 2).defaultTo(0);
      table.decimal('running_balance', 12, 2).defaultTo(0);
      table.json('assumptions'); // Forecasting assumptions
      table.decimal('confidence_score', 3, 2); // 0.00-1.00
      table.boolean('is_actual').defaultTo(false); // True when month is complete
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('budget_period_id').references('id').inTable('budget_periods').onDelete('CASCADE');
      
      // Indexes
      table.index(['organization_id', 'forecast_year', 'forecast_month']);
      table.unique(['budget_period_id', 'forecast_year', 'forecast_month']);
    });

    // Create budget variance alerts
    await trx.schema.createTable('budget_alerts', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.uuid('budget_id').notNullable();
      table.enum('alert_type', [
        'overspend_warning',
        'overspend_critical',
        'underspend_warning',
        'forecast_variance',
        'approval_required',
        'budget_expired'
      ]).notNullable();
      table.string('title').notNullable();
      table.text('message').notNullable();
      table.decimal('threshold_value', 12, 2);
      table.decimal('current_value', 12, 2);
      table.decimal('variance_percentage', 5, 2);
      table.enum('severity', ['low', 'medium', 'high', 'critical']).notNullable();
      table.boolean('is_acknowledged').defaultTo(false);
      table.uuid('acknowledged_by');
      table.timestamp('acknowledged_at');
      table.boolean('is_resolved').defaultTo(false);
      table.timestamp('resolved_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('budget_id').references('id').inTable('budgets').onDelete('CASCADE');
      table.foreign('acknowledged_by').references('id').inTable('users').onDelete('SET NULL');
      
      // Indexes
      table.index(['organization_id', 'is_acknowledged', 'severity']);
      table.index(['budget_id', 'alert_type']);
      table.index(['created_at']);
    });

    // Add foreign key to vendors table for financial transactions
    await trx.schema.alterTable('financial_transactions', function(table) {
      table.foreign('vendor_id').references('id').inTable('vendors').onDelete('SET NULL');
    });

    // Update expense_data table to link with budgets
    await trx.schema.alterTable('expense_data', function(table) {
      table.uuid('budget_id').after('category_id');
      table.uuid('transaction_id').after('budget_id');
      table.foreign('budget_id').references('id').inTable('budgets').onDelete('SET NULL');
      table.foreign('transaction_id').references('id').inTable('financial_transactions').onDelete('SET NULL');
      table.index(['budget_id']);
    });

    // Update game_assignments table to track payroll transactions
    await trx.schema.alterTable('game_assignments', function(table) {
      table.uuid('payroll_transaction_id').after('calculated_wage');
      table.enum('payment_status', ['pending', 'approved', 'paid', 'cancelled']).defaultTo('pending').after('payroll_transaction_id');
      table.date('payment_date').after('payment_status');
      table.foreign('payroll_transaction_id').references('id').inTable('financial_transactions').onDelete('SET NULL');
      table.index(['payment_status']);
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    // Remove foreign key constraints and columns from existing tables
    await trx.schema.alterTable('game_assignments', function(table) {
      table.dropForeign(['payroll_transaction_id']);
      table.dropColumn('payroll_transaction_id');
      table.dropColumn('payment_status');
      table.dropColumn('payment_date');
    });

    await trx.schema.alterTable('expense_data', function(table) {
      table.dropForeign(['budget_id']);
      table.dropForeign(['transaction_id']);
      table.dropColumn('budget_id');
      table.dropColumn('transaction_id');
    });

    // Drop new tables
    await trx.schema.dropTableIfExists('budget_alerts');
    await trx.schema.dropTableIfExists('cash_flow_forecasts');
    await trx.schema.dropTableIfExists('financial_transactions');
    await trx.schema.dropTableIfExists('vendors');
  });
};