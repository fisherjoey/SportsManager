/**
 * Migration: Create financial controls, analytics, and AI-powered features
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    // Create spending limits and controls
    await trx.schema.createTable('spending_limits', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.uuid('user_id'); // Limit for specific user
      table.uuid('role_id'); // Limit for role
      table.uuid('budget_category_id'); // Limit for category
      table.string('limit_name').notNullable();
      table.enum('limit_type', [
        'daily',
        'weekly',
        'monthly',
        'quarterly',
        'yearly',
        'per_transaction',
        'total_budget'
      ]).notNullable();
      table.decimal('limit_amount', 12, 2).notNullable();
      table.decimal('warning_threshold', 12, 2); // Warn at this amount
      table.boolean('requires_approval').defaultTo(false);
      table.json('approval_rules'); // Who can approve overrides
      table.boolean('is_active').defaultTo(true);
      table.date('effective_from');
      table.date('effective_until');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('budget_category_id').references('id').inTable('budget_categories').onDelete('CASCADE');
      
      // Indexes
      table.index(['organization_id', 'is_active']);
      table.index(['user_id']);
      table.index(['budget_category_id']);
    });

    // Create approval workflows
    await trx.schema.createTable('approval_workflows', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.string('workflow_name').notNullable();
      table.enum('workflow_type', [
        'expense_approval',
        'budget_approval',
        'payroll_approval',
        'vendor_approval',
        'journal_entry_approval'
      ]).notNullable();
      table.json('conditions'); // When this workflow applies
      table.json('approval_steps'); // Sequential approval steps
      table.boolean('is_active').defaultTo(true);
      table.integer('priority').defaultTo(0); // For workflow ordering
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      
      // Indexes
      table.index(['organization_id', 'workflow_type', 'is_active']);
    });

    // Create approval requests tracking
    await trx.schema.createTable('approval_requests', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.uuid('workflow_id').notNullable();
      table.uuid('requested_by').notNullable();
      table.enum('request_type', [
        'expense',
        'budget_change',
        'payroll',
        'vendor',
        'journal_entry',
        'limit_override'
      ]).notNullable();
      table.uuid('reference_id').notNullable(); // ID of the record being approved
      table.string('reference_table').notNullable(); // Table name
      table.decimal('amount', 12, 2);
      table.text('request_reason');
      table.enum('status', [
        'pending',
        'in_review',
        'approved',
        'rejected',
        'withdrawn',
        'expired'
      ]).defaultTo('pending');
      table.integer('current_step').defaultTo(1);
      table.json('approval_history'); // Track each approval step
      table.timestamp('requested_at').defaultTo(knex.fn.now());
      table.timestamp('completed_at');
      table.date('expires_at');
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('workflow_id').references('id').inTable('approval_workflows').onDelete('CASCADE');
      table.foreign('requested_by').references('id').inTable('users').onDelete('CASCADE');
      
      // Indexes
      table.index(['organization_id', 'status']);
      table.index(['requested_by']);
      table.index(['reference_id', 'reference_table']);
    });

    // Create financial analytics and KPIs
    await trx.schema.createTable('financial_kpis', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.string('kpi_name').notNullable();
      table.enum('kpi_type', [
        'budget_variance',
        'cash_flow_trend',
        'expense_trend',
        'payroll_efficiency',
        'cost_per_game',
        'revenue_growth',
        'profit_margin',
        'custom'
      ]).notNullable();
      table.decimal('current_value', 12, 4);
      table.decimal('target_value', 12, 4);
      table.decimal('previous_value', 12, 4);
      table.string('unit'); // %, $, ratio, etc.
      table.enum('trend', ['up', 'down', 'stable']).defaultTo('stable');
      table.decimal('trend_percentage', 5, 2);
      table.integer('calculation_period_days').defaultTo(30);
      table.json('calculation_config'); // How to calculate this KPI
      table.timestamp('last_calculated_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      
      // Indexes
      table.index(['organization_id', 'kpi_type']);
      table.index(['last_calculated_at']);
    });

    // Create AI-powered budget forecasts and insights
    await trx.schema.createTable('budget_forecasts', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.uuid('budget_id').notNullable();
      table.enum('forecast_type', [
        'monthly_spend',
        'seasonal_pattern',
        'year_end_projection',
        'variance_prediction',
        'cash_flow_forecast'
      ]).notNullable();
      table.json('forecast_data'); // Predicted values over time
      table.decimal('confidence_score', 3, 2); // 0.00-1.00
      table.json('influencing_factors'); // What affects this forecast
      table.json('model_metadata'); // AI model information
      table.timestamp('forecast_date').defaultTo(knex.fn.now());
      table.date('forecast_period_start');
      table.date('forecast_period_end');
      table.boolean('is_active').defaultTo(true);
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('budget_id').references('id').inTable('budgets').onDelete('CASCADE');
      
      // Indexes
      table.index(['organization_id', 'forecast_type']);
      table.index(['budget_id', 'is_active']);
    });

    // Create AI insights and recommendations
    await trx.schema.createTable('financial_insights', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.enum('insight_type', [
        'cost_savings_opportunity',
        'budget_optimization',
        'expense_pattern_anomaly',
        'cash_flow_warning',
        'seasonal_trend',
        'efficiency_recommendation',
        'fraud_alert'
      ]).notNullable();
      table.string('title').notNullable();
      table.text('description').notNullable();
      table.text('recommendation');
      table.decimal('potential_impact', 12, 2); // Estimated financial impact
      table.enum('priority', ['low', 'medium', 'high', 'critical']).notNullable();
      table.enum('status', [
        'new',
        'reviewed',
        'implemented',
        'dismissed',
        'archived'
      ]).defaultTo('new');
      table.json('supporting_data'); // Data that supports this insight
      table.json('action_items'); // Suggested actions
      table.boolean('created_by_ai').defaultTo(true); // Generated by AI
      table.uuid('reviewed_by');
      table.timestamp('reviewed_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at');
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
      
      // Indexes
      table.index(['organization_id', 'status', 'priority']);
      table.index(['insight_type']);
      table.index(['created_at']);
    });

    // Create financial dashboard configurations
    await trx.schema.createTable('financial_dashboards', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.uuid('user_id'); // Personal dashboard
      table.string('dashboard_name').notNullable();
      table.enum('dashboard_type', [
        'executive_summary',
        'budget_manager',
        'expense_tracker',
        'payroll_overview',
        'cash_flow_monitor',
        'custom'
      ]).notNullable();
      table.json('widget_config'); // Dashboard layout and widgets
      table.json('filters'); // Default filters
      table.boolean('is_default').defaultTo(false);
      table.boolean('is_shared').defaultTo(false);
      table.json('sharing_permissions'); // Who can view/edit
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      
      // Indexes
      table.index(['organization_id', 'dashboard_type']);
      table.index(['user_id', 'is_default']);
    });

    // Create audit trail for financial changes
    await trx.schema.createTable('financial_audit_trail', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.uuid('user_id').notNullable();
      table.string('table_name').notNullable();
      table.uuid('record_id').notNullable();
      table.enum('action', ['create', 'update', 'delete', 'approve', 'reject']).notNullable();
      table.json('old_values'); // Previous values
      table.json('new_values'); // New values
      table.text('reason'); // Reason for change
      table.string('ip_address');
      table.string('user_agent');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      
      // Indexes
      table.index(['organization_id', 'table_name', 'record_id']);
      table.index(['user_id', 'created_at']);
      table.index(['action', 'created_at']);
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    await trx.schema.dropTableIfExists('financial_audit_trail');
    await trx.schema.dropTableIfExists('financial_dashboards');
    await trx.schema.dropTableIfExists('financial_insights');
    await trx.schema.dropTableIfExists('budget_forecasts');
    await trx.schema.dropTableIfExists('financial_kpis');
    await trx.schema.dropTableIfExists('approval_requests');
    await trx.schema.dropTableIfExists('approval_workflows');
    await trx.schema.dropTableIfExists('spending_limits');
  });
};