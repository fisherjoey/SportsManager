/**
 * Migration: Create comprehensive budget management system
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    // Create budget periods table
    await trx.schema.createTable('budget_periods', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.string('name').notNullable(); // e.g., "2025 Budget", "Spring Season 2025"
      table.text('description');
      table.date('start_date').notNullable();
      table.date('end_date').notNullable();
      table.enum('status', ['draft', 'active', 'closed', 'archived']).defaultTo('draft');
      table.boolean('is_template').defaultTo(false);
      table.uuid('created_by').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('created_by').references('id').inTable('users').onDelete('CASCADE');
      
      // Indexes
      table.index(['organization_id', 'status']);
      table.index(['start_date', 'end_date']);
    });

    // Create budget categories (hierarchical structure)
    await trx.schema.createTable('budget_categories', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.string('name').notNullable();
      table.string('code').notNullable(); // Accounting code
      table.text('description');
      table.uuid('parent_id'); // For hierarchical categories
      table.integer('sort_order').defaultTo(0);
      table.boolean('active').defaultTo(true);
      table.enum('category_type', [
        'revenue',
        'operating_expenses',
        'payroll',
        'equipment',
        'facilities',
        'travel',
        'marketing',
        'admin',
        'other'
      ]).notNullable();
      table.string('color_code', 7); // Hex color for UI
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('parent_id').references('id').inTable('budget_categories').onDelete('SET NULL');
      
      // Indexes
      table.index(['organization_id', 'active']);
      table.index(['parent_id']);
      table.unique(['organization_id', 'code']);
    });

    // Create main budgets table
    await trx.schema.createTable('budgets', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.uuid('budget_period_id').notNullable();
      table.uuid('category_id').notNullable();
      table.string('name').notNullable();
      table.text('description');
      table.decimal('allocated_amount', 12, 2).defaultTo(0);
      table.decimal('committed_amount', 12, 2).defaultTo(0);
      table.decimal('actual_spent', 12, 2).defaultTo(0);
      table.decimal('reserved_amount', 12, 2).defaultTo(0);
      table.decimal('available_amount', 12, 2).defaultTo(0);
      table.enum('status', ['draft', 'approved', 'active', 'locked', 'closed']).defaultTo('draft');
      table.json('variance_rules'); // Alert thresholds and rules
      table.json('seasonal_patterns'); // For forecasting
      table.uuid('owner_id'); // Budget owner/manager
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('budget_period_id').references('id').inTable('budget_periods').onDelete('CASCADE');
      table.foreign('category_id').references('id').inTable('budget_categories').onDelete('CASCADE');
      table.foreign('owner_id').references('id').inTable('users').onDelete('SET NULL');
      
      // Indexes
      table.index(['organization_id', 'status']);
      table.index(['budget_period_id', 'category_id']);
      table.index(['owner_id']);
    });

    // Create budget allocations for monthly/quarterly breakdowns
    await trx.schema.createTable('budget_allocations', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('budget_id').notNullable();
      table.integer('allocation_year').notNullable();
      table.integer('allocation_month').notNullable(); // 1-12
      table.decimal('allocated_amount', 12, 2).defaultTo(0);
      table.decimal('actual_amount', 12, 2).defaultTo(0);
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('budget_id').references('id').inTable('budgets').onDelete('CASCADE');
      
      // Indexes
      table.index(['budget_id', 'allocation_year', 'allocation_month']);
      table.unique(['budget_id', 'allocation_year', 'allocation_month']);
    });

    // Create budget approvals workflow
    await trx.schema.createTable('budget_approvals', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('budget_id').notNullable();
      table.uuid('requested_by').notNullable();
      table.uuid('approver_id');
      table.enum('approval_type', ['initial', 'revision', 'increase', 'transfer']).notNullable();
      table.enum('status', ['pending', 'approved', 'rejected', 'requires_info']).defaultTo('pending');
      table.decimal('requested_amount', 12, 2);
      table.decimal('approved_amount', 12, 2);
      table.text('request_notes');
      table.text('approval_notes');
      table.timestamp('requested_at').defaultTo(knex.fn.now());
      table.timestamp('approved_at');
      table.timestamp('rejected_at');
      
      // Foreign keys
      table.foreign('budget_id').references('id').inTable('budgets').onDelete('CASCADE');
      table.foreign('requested_by').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('approver_id').references('id').inTable('users').onDelete('SET NULL');
      
      // Indexes
      table.index(['budget_id', 'status']);
      table.index(['approver_id', 'status']);
      table.index(['requested_at']);
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    await trx.schema.dropTableIfExists('budget_approvals');
    await trx.schema.dropTableIfExists('budget_allocations');
    await trx.schema.dropTableIfExists('budgets');
    await trx.schema.dropTableIfExists('budget_categories');
    await trx.schema.dropTableIfExists('budget_periods');
  });
};