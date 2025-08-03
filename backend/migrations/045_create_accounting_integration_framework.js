/**
 * Migration: Create accounting software integration framework
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    // Create chart of accounts
    await trx.schema.createTable('chart_of_accounts', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.string('account_number').notNullable();
      table.string('account_name').notNullable();
      table.enum('account_type', [
        'asset',
        'liability',
        'equity',
        'revenue',
        'expense',
        'cost_of_goods_sold'
      ]).notNullable();
      table.enum('account_subtype', [
        'current_asset',
        'fixed_asset',
        'current_liability',
        'long_term_liability',
        'equity',
        'operating_revenue',
        'other_revenue',
        'operating_expense',
        'other_expense',
        'cost_of_goods_sold'
      ]).notNullable();
      table.uuid('parent_account_id'); // For sub-accounts
      table.text('description');
      table.boolean('is_active').defaultTo(true);
      table.boolean('system_account').defaultTo(false); // Cannot be deleted
      table.string('external_id'); // ID in external accounting system
      table.json('mapping_rules'); // Rules for automatic transaction mapping
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('parent_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      
      // Indexes
      table.index(['organization_id', 'is_active']);
      table.index(['account_type', 'account_subtype']);
      table.unique(['organization_id', 'account_number']);
    });

    // Create accounting integrations configuration
    await trx.schema.createTable('accounting_integrations', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.enum('provider', [
        'quickbooks_online',
        'quickbooks_desktop',
        'xero',
        'sage',
        'freshbooks',
        'wave',
        'manual'
      ]).notNullable();
      table.string('provider_name').notNullable(); // Display name
      table.json('connection_config'); // Encrypted connection details
      table.json('sync_settings'); // What to sync, frequency, etc.
      table.enum('sync_status', [
        'disconnected',
        'connected',
        'syncing',
        'error',
        'paused'
      ]).defaultTo('disconnected');
      table.timestamp('last_sync_at');
      table.text('last_sync_error');
      table.boolean('auto_sync').defaultTo(false);
      table.integer('sync_frequency_hours').defaultTo(24); // How often to sync
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      
      // Indexes
      table.index(['organization_id', 'is_active']);
      table.index(['sync_status']);
    });

    // Create journal entries for accounting integration
    await trx.schema.createTable('journal_entries', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.uuid('transaction_id'); // Link to financial_transactions
      table.string('entry_number').notNullable(); // Auto-generated
      table.date('entry_date').notNullable();
      table.string('reference').notNullable(); // Reference to source document
      table.text('description').notNullable();
      table.decimal('total_debits', 12, 2).defaultTo(0);
      table.decimal('total_credits', 12, 2).defaultTo(0);
      table.enum('status', [
        'draft',
        'pending_review',
        'approved',
        'posted',
        'reversed'
      ]).defaultTo('draft');
      table.uuid('created_by').notNullable();
      table.uuid('approved_by');
      table.timestamp('approved_at');
      table.timestamp('posted_at');
      table.string('external_id'); // ID in external accounting system
      table.timestamp('synced_at');
      table.json('sync_metadata');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('transaction_id').references('id').inTable('financial_transactions').onDelete('CASCADE');
      table.foreign('created_by').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('approved_by').references('id').inTable('users').onDelete('SET NULL');
      
      // Indexes
      table.index(['organization_id', 'status']);
      table.index(['entry_date']);
      table.unique(['organization_id', 'entry_number']);
    });

    // Create journal entry line items
    await trx.schema.createTable('journal_entry_lines', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('journal_entry_id').notNullable();
      table.uuid('account_id').notNullable();
      table.text('description');
      table.decimal('debit_amount', 12, 2).defaultTo(0);
      table.decimal('credit_amount', 12, 2).defaultTo(0);
      table.string('reference'); // Additional reference for this line
      table.json('dimensions'); // Department, project, class, etc.
      table.integer('line_number').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('journal_entry_id').references('id').inTable('journal_entries').onDelete('CASCADE');
      table.foreign('account_id').references('id').inTable('chart_of_accounts').onDelete('CASCADE');
      
      // Indexes
      table.index(['journal_entry_id', 'line_number']);
      table.index(['account_id']);
    });

    // Create sync logs for tracking integration activity
    await trx.schema.createTable('accounting_sync_logs', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.uuid('integration_id').notNullable();
      table.enum('sync_type', [
        'full_sync',
        'incremental_sync',
        'manual_sync',
        'transaction_sync',
        'account_sync',
        'vendor_sync'
      ]).notNullable();
      table.enum('status', [
        'started',
        'in_progress',
        'completed',
        'failed',
        'partial'
      ]).notNullable();
      table.timestamp('started_at').defaultTo(knex.fn.now());
      table.timestamp('completed_at');
      table.integer('records_processed').defaultTo(0);
      table.integer('records_success').defaultTo(0);
      table.integer('records_failed').defaultTo(0);
      table.text('error_message');
      table.json('sync_details'); // Detailed sync information
      table.json('error_details'); // Detailed error information
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('integration_id').references('id').inTable('accounting_integrations').onDelete('CASCADE');
      
      // Indexes
      table.index(['organization_id', 'started_at']);
      table.index(['integration_id', 'status']);
    });

    // Create financial reporting configurations
    await trx.schema.createTable('financial_reports_config', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.string('report_name').notNullable();
      table.enum('report_type', [
        'profit_loss',
        'balance_sheet',
        'cash_flow',
        'budget_variance',
        'expense_summary',
        'payroll_summary',
        'custom'
      ]).notNullable();
      table.json('report_config'); // Report structure and settings
      table.json('filters'); // Default filters
      table.boolean('is_template').defaultTo(false);
      table.boolean('is_active').defaultTo(true);
      table.uuid('created_by').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('created_by').references('id').inTable('users').onDelete('CASCADE');
      
      // Indexes
      table.index(['organization_id', 'report_type']);
      table.index(['is_active']);
    });

    // Add chart of accounts mapping to existing tables
    await trx.schema.alterTable('budget_categories', function(table) {
      table.uuid('default_account_id').after('color_code');
      table.foreign('default_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
    });

    await trx.schema.alterTable('financial_transactions', function(table) {
      table.uuid('debit_account_id').after('metadata');
      table.uuid('credit_account_id').after('debit_account_id');
      table.foreign('debit_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
      table.foreign('credit_account_id').references('id').inTable('chart_of_accounts').onDelete('SET NULL');
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
    await trx.schema.alterTable('financial_transactions', function(table) {
      table.dropForeign(['debit_account_id']);
      table.dropForeign(['credit_account_id']);
      table.dropColumn('debit_account_id');
      table.dropColumn('credit_account_id');
    });

    await trx.schema.alterTable('budget_categories', function(table) {
      table.dropForeign(['default_account_id']);
      table.dropColumn('default_account_id');
    });

    // Drop new tables in reverse order
    await trx.schema.dropTableIfExists('financial_reports_config');
    await trx.schema.dropTableIfExists('accounting_sync_logs');
    await trx.schema.dropTableIfExists('journal_entry_lines');
    await trx.schema.dropTableIfExists('journal_entries');
    await trx.schema.dropTableIfExists('accounting_integrations');
    await trx.schema.dropTableIfExists('chart_of_accounts');
  });
};