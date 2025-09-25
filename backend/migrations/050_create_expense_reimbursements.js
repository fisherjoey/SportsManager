/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // First, add reimbursement_user_id to expense_data table
    .alterTable('expense_data', function(table) {
      table.uuid('reimbursement_user_id'); // Who gets reimbursed (can be different from submitter)
      table.text('reimbursement_notes'); // Notes about reimbursement
      table.boolean('is_reimbursable').defaultTo(true); // Whether this expense should be reimbursed
      
      // Foreign key to users table
      table.foreign('reimbursement_user_id').references('id').inTable('users').onDelete('SET NULL');
      table.index('reimbursement_user_id');
    })
    // Create expense_reimbursements table for tracking payments
    .createTable('expense_reimbursements', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('expense_data_id').notNullable();
      table.uuid('receipt_id').notNullable();
      table.uuid('reimbursement_user_id').notNullable(); // Who receives the reimbursement
      table.uuid('organization_id').notNullable();
      
      // Reimbursement details
      table.decimal('approved_amount', 10, 2).notNullable(); // Amount approved for reimbursement
      table.decimal('reimbursed_amount', 10, 2); // Actual amount paid (may differ)
      
      // Reimbursement status
      table.enum('status', [
        'pending',          // Waiting to be processed
        'scheduled',        // Scheduled for next pay period
        'paid',            // Reimbursement has been paid
        'cancelled',       // Reimbursement cancelled
        'disputed'         // Reimbursement disputed
      ]).defaultTo('pending');
      
      // Payment tracking
      table.string('payment_method'); // 'payroll', 'check', 'direct_deposit', 'cash'
      table.string('payment_reference'); // Check number, transaction ID, etc.
      table.date('scheduled_pay_date'); // When it should be paid
      table.date('paid_date'); // When it was actually paid
      
      // Processing info
      table.uuid('processed_by'); // Admin who processed the reimbursement
      table.text('processing_notes');
      table.json('payment_details'); // Additional payment metadata
      
      // Integration with payroll
      table.string('pay_period'); // Which pay period this belongs to
      table.boolean('included_in_payroll').defaultTo(false); // Whether it's been added to payroll
      table.uuid('payroll_batch_id'); // Reference to payroll batch if applicable
      
      // Timestamps
      table.timestamp('scheduled_at'); // When it was scheduled for payment
      table.timestamp('paid_at'); // When payment was completed
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign key constraints
      table.foreign('expense_data_id').references('id').inTable('expense_data').onDelete('CASCADE');
      table.foreign('receipt_id').references('id').inTable('expense_receipts').onDelete('CASCADE');
      table.foreign('reimbursement_user_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('processed_by').references('id').inTable('users').onDelete('SET NULL');
      
      // Indexes
      table.index(['reimbursement_user_id', 'status']);
      table.index(['organization_id', 'status']);
      table.index(['pay_period', 'status']);
      table.index(['scheduled_pay_date', 'status']);
      table.index('paid_date');
      table.index('included_in_payroll');
    })
    // Create user_earnings table to track all earnings (referee pay + reimbursements)
    .createTable('user_earnings', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable();
      table.uuid('organization_id').notNullable();
      
      // Earnings details
      table.enum('earning_type', [
        'referee_pay',      // Payment for refereeing games
        'reimbursement',    // Expense reimbursement
        'bonus',           // Performance bonus
        'adjustment',      // Manual adjustment
        'other'           // Other types of earnings
      ]).notNullable();
      
      table.decimal('amount', 10, 2).notNullable();
      table.string('description').notNullable(); // Description of the earning
      
      // Reference to source
      table.uuid('reference_id'); // ID of game_assignment, expense_reimbursement, etc.
      table.string('reference_type'); // 'game_assignment', 'expense_reimbursement', etc.
      
      // Pay period tracking
      table.string('pay_period').notNullable(); // Which pay period this belongs to
      table.date('earned_date').notNullable(); // When this was earned
      table.date('pay_date'); // When this will be/was paid
      
      // Payment status
      table.enum('payment_status', [
        'pending',
        'scheduled',
        'paid',
        'cancelled'
      ]).defaultTo('pending');
      
      table.uuid('processed_by'); // Admin who processed this earning
      table.text('notes');
      
      // Timestamps
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign key constraints
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('processed_by').references('id').inTable('users').onDelete('SET NULL');
      
      // Indexes
      table.index(['user_id', 'pay_period']);
      table.index(['user_id', 'earning_type']);
      table.index(['organization_id', 'pay_period']);
      table.index(['earned_date', 'payment_status']);
      table.index(['reference_id', 'reference_type']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTable('user_earnings')
    .dropTable('expense_reimbursements')
    .alterTable('expense_data', function(table) {
      table.dropColumn('reimbursement_user_id');
      table.dropColumn('reimbursement_notes');
      table.dropColumn('is_reimbursable');
    });
};