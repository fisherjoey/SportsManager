/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('expense_approvals', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('expense_data_id').notNullable();
    table.uuid('receipt_id').notNullable();
    table.uuid('user_id').notNullable(); // User who submitted
    table.uuid('organization_id').notNullable();
    
    // Approval workflow
    table.enum('status', [
      'pending',
      'approved',
      'rejected',
      'requires_information',
      'cancelled'
    ]).defaultTo('pending');
    
    table.uuid('approver_id'); // User who approved/rejected
    table.text('approval_notes');
    table.text('rejection_reason');
    table.json('required_information'); // What additional info is needed
    
    // Approval metadata
    table.decimal('approved_amount', 10, 2); // May differ from requested
    table.decimal('requested_amount', 10, 2);
    table.string('approval_level'); // For multi-level approvals
    table.integer('approval_sequence').defaultTo(1);
    
    // Business context
    table.string('expense_policy_version');
    table.json('policy_violations'); // Any policy violations detected
    table.boolean('auto_approved').defaultTo(false);
    table.text('auto_approval_reason');
    
    // Timestamps
    table.timestamp('submitted_at').defaultTo(knex.fn.now());
    table.timestamp('approved_at');
    table.timestamp('rejected_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Foreign key constraints
    table.foreign('expense_data_id').references('id').inTable('expense_data').onDelete('CASCADE');
    table.foreign('receipt_id').references('id').inTable('expense_receipts').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('approver_id').references('id').inTable('users').onDelete('SET NULL');
    
    // Indexes
    table.index(['organization_id', 'status']);
    table.index(['user_id', 'status']);
    table.index(['approver_id', 'status']);
    table.index('submitted_at');
    table.index('auto_approved');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('expense_approvals');
};