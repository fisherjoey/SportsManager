/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // TEMPORARILY DISABLED - This migration has conflicts
  // TODO: Split this into multiple smaller migrations
  console.log('⚠️  Migration 055 temporarily disabled to fix conflicts');
  return Promise.resolve();
  
  // First, enhance the existing expense_approvals table
  await knex.schema
    // First, enhance the existing expense_approvals table
    .alterTable('expense_approvals', function(table) {
      // Multi-stage approval support
      table.uuid('workflow_id'); // Reference to approval workflow template
      table.integer('stage_number').defaultTo(1); // Which stage of approval this is
      table.integer('total_stages').defaultTo(1); // Total number of stages in workflow
      table.boolean('is_parallel_approval').defaultTo(false); // Can multiple people approve at once?
      table.json('required_approvers'); // List of required approvers for this stage
      table.json('actual_approvers'); // List of people who actually approved
      
      // Enhanced status tracking
      table.enum('stage_status', [
        'pending',              // Waiting for approval at this stage
        'approved',             // This stage is approved
        'rejected',             // This stage was rejected
        'skipped',             // This stage was skipped
        'delegated',           // Approval was delegated to someone else
        'escalated',           // Escalated to higher authority
        'timed_out'            // Approval timed out
      ]).defaultTo('pending');
      
      // Delegation and escalation
      table.uuid('delegated_to'); // Who approval was delegated to
      table.uuid('delegated_by'); // Who delegated the approval
      table.timestamp('delegated_at');
      table.text('delegation_reason');
      table.uuid('escalated_to'); // Who it was escalated to
      table.timestamp('escalated_at');
      table.text('escalation_reason');
      
      // Timing and deadlines
      table.timestamp('stage_started_at'); // When this stage started
      table.timestamp('stage_deadline'); // When this stage must be completed
      table.integer('escalation_hours'); // Hours before escalation
      table.boolean('deadline_extended').defaultTo(false);
      table.timestamp('extended_deadline');
      table.text('extension_reason');
      
      // Approval conditions and rules
      table.json('approval_conditions'); // Conditions that must be met
      table.boolean('conditions_met').defaultTo(false);
      table.json('condition_evaluations'); // Results of condition checks
      table.decimal('approval_limit', 10, 2); // Approval limit for this approver
      table.boolean('exceeds_limit').defaultTo(false);
      
      // Notification and communication
      table.json('notification_settings'); // How to notify approvers
      table.timestamp('last_notification_sent');
      table.integer('notification_count').defaultTo(0);
      table.json('communication_log'); // Log of all communications
      
      // Risk assessment and flags
      table.string('risk_level').defaultTo('low'); // low, medium, high, critical
      table.json('risk_factors'); // What makes this risky
      table.boolean('requires_additional_review').defaultTo(false);
      table.json('review_flags'); // Flags that require attention
      
      // Foreign key constraints for new fields
      table.foreign('delegated_to').references('id').inTable('users').onDelete('SET NULL');
      table.foreign('delegated_by').references('id').inTable('users').onDelete('SET NULL');
      table.foreign('escalated_to').references('id').inTable('users').onDelete('SET NULL');
      
      // Indexes for performance
      table.index(['stage_number', 'stage_status']);
      table.index(['workflow_id', 'stage_number']);
      table.index(['stage_deadline', 'stage_status']);
      table.index(['risk_level', 'stage_status']);
      table.index(['escalated_at', 'stage_status']);
      table.index('requires_additional_review');
    })
    
    // Create approval workflows table for templates (if it doesn't exist)
    .createTableIfNotExists('approval_workflows', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      
      // Workflow identification
      table.string('name').notNullable(); // "Standard Expense Approval", "High Value Purchase", etc.
      table.text('description');
      table.string('workflow_type').defaultTo('expense'); // expense, purchase_order, budget, etc.
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_default').defaultTo(false);
      
      // Trigger conditions
      table.json('trigger_conditions'); // When this workflow applies
      table.decimal('amount_threshold_min', 10, 2); // Minimum amount for this workflow
      table.decimal('amount_threshold_max', 10, 2); // Maximum amount for this workflow
      table.json('category_restrictions'); // Which categories this applies to
      table.json('user_restrictions'); // Which users this applies to
      table.json('payment_method_restrictions'); // Which payment methods trigger this
      
      // Workflow definition
      table.json('workflow_stages'); // Definition of all approval stages
      table.integer('total_stages').notNullable();
      table.boolean('allow_parallel_approval').defaultTo(false);
      table.boolean('allow_delegation').defaultTo(true);
      table.integer('default_escalation_hours').defaultTo(48);
      
      // Notification settings
      table.json('notification_config'); // How notifications are sent
      table.boolean('send_reminders').defaultTo(true);
      table.integer('reminder_frequency_hours').defaultTo(24);
      table.integer('max_reminders').defaultTo(3);
      
      // Timestamps and audit
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.uuid('created_by');
      table.uuid('updated_by');
      
      // Foreign key constraints will be added separately if columns exist
      // Note: Skip foreign keys here since table might already exist without these columns
      
      // Indexes
      table.index(['organization_id', 'is_active']);
      table.index(['workflow_type', 'is_active']);
      table.index(['amount_threshold_min', 'amount_threshold_max']);
      table.index('is_default');
    })
  
  // Create approval_workflows table if it doesn't exist
  const workflowTableExists = await knex.schema.hasTable('approval_workflows');
  if (!workflowTableExists) {
    await knex.schema.createTable('approval_workflows', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      
      // Workflow identification
      table.string('name').notNullable(); // "Standard Expense Approval", "High Value Purchase", etc.
      table.text('description');
      table.string('workflow_type').defaultTo('expense'); // expense, purchase_order, budget, etc.
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_default').defaultTo(false);
      
      // Trigger conditions
      table.json('trigger_conditions'); // When this workflow applies
      table.decimal('amount_threshold_min', 10, 2); // Minimum amount for this workflow
      table.decimal('amount_threshold_max', 10, 2); // Maximum amount for this workflow
      table.json('category_restrictions'); // Which categories this applies to
      table.json('user_restrictions'); // Which users this applies to
      table.json('payment_method_restrictions'); // Which payment methods trigger this
      
      // Workflow definition
      table.json('workflow_stages'); // Definition of all approval stages
      table.integer('total_stages').notNullable();
      table.boolean('allow_parallel_approval').defaultTo(false);
      table.boolean('allow_delegation').defaultTo(true);
      table.integer('default_escalation_hours').defaultTo(48);
      
      // Notification settings
      table.json('notification_config');
      table.boolean('send_reminders').defaultTo(true);
      table.integer('reminder_frequency_hours').defaultTo(24);
      table.integer('max_reminders').defaultTo(3);
      
      // Timestamps and audit
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.uuid('created_by');
      table.uuid('updated_by');
      
      // Foreign key constraints for new table only
      table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.foreign('updated_by').references('id').inTable('users').onDelete('SET NULL');
      
      // Indexes
      table.index(['organization_id', 'is_active']);
      table.index(['workflow_type', 'is_active']);
      table.index(['amount_threshold_min', 'amount_threshold_max']);
      table.index('is_default');
    })
  }
  
  // Create approval stage definitions table
  await knex.schema.createTable('approval_stage_definitions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('workflow_id').notNullable();
      
      // Stage identification
      table.integer('stage_number').notNullable();
      table.string('stage_name').notNullable(); // "Manager Approval", "Finance Review", etc.
      table.text('stage_description');
      table.boolean('is_required').defaultTo(true);
      
      // Approver configuration
      table.json('approver_rules'); // Rules for who can approve at this stage
      table.boolean('requires_all_approvers').defaultTo(false); // OR vs AND logic
      table.integer('minimum_approvers').defaultTo(1);
      table.json('fallback_approvers'); // Backup approvers if primary unavailable
      
      // Stage conditions
      table.json('stage_conditions'); // Conditions that must be met
      table.decimal('approval_limit', 10, 2); // Maximum amount this stage can approve
      table.boolean('can_modify_amount').defaultTo(false);
      table.boolean('can_add_conditions').defaultTo(false);
      
      // Timing and escalation
      table.integer('stage_deadline_hours').defaultTo(48);
      table.integer('escalation_hours').defaultTo(24);
      table.json('escalation_rules'); // Who to escalate to and when
      table.boolean('auto_approve_on_timeout').defaultTo(false);
      
      // Timestamps
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign key constraints
      table.foreign('workflow_id').references('id').inTable('approval_workflows').onDelete('CASCADE');
      
      // Indexes
      table.index(['workflow_id', 'stage_number']);
      table.index('is_required');
      
      // Unique constraint
      table.unique(['workflow_id', 'stage_number']);
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTable('approval_stage_definitions')
    .dropTable('approval_workflows')
    .alterTable('expense_approvals', function(table) {
      // Drop foreign key constraints
      table.dropForeign(['delegated_to']);
      table.dropForeign(['delegated_by']);
      table.dropForeign(['escalated_to']);
      
      // Drop all added columns
      table.dropColumn('workflow_id');
      table.dropColumn('stage_number');
      table.dropColumn('total_stages');
      table.dropColumn('is_parallel_approval');
      table.dropColumn('required_approvers');
      table.dropColumn('actual_approvers');
      table.dropColumn('stage_status');
      table.dropColumn('delegated_to');
      table.dropColumn('delegated_by');
      table.dropColumn('delegated_at');
      table.dropColumn('delegation_reason');
      table.dropColumn('escalated_to');
      table.dropColumn('escalated_at');
      table.dropColumn('escalation_reason');
      table.dropColumn('stage_started_at');
      table.dropColumn('stage_deadline');
      table.dropColumn('escalation_hours');
      table.dropColumn('deadline_extended');
      table.dropColumn('extended_deadline');
      table.dropColumn('extension_reason');
      table.dropColumn('approval_conditions');
      table.dropColumn('conditions_met');
      table.dropColumn('condition_evaluations');
      table.dropColumn('approval_limit');
      table.dropColumn('exceeds_limit');
      table.dropColumn('notification_settings');
      table.dropColumn('last_notification_sent');
      table.dropColumn('notification_count');
      table.dropColumn('communication_log');
      table.dropColumn('risk_level');
      table.dropColumn('risk_factors');
      table.dropColumn('requires_additional_review');
      table.dropColumn('review_flags');
    });
};