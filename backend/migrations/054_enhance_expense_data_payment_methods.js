/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('expense_data', function(table) {
    // Payment method relationships
    table.uuid('payment_method_id'); // Foreign key to payment_methods table
    table.uuid('purchase_order_id'); // Optional: for PO expenses
    table.uuid('credit_card_id'); // Optional: for credit card expenses
    
    // Payment method type enum (denormalized for performance)
    table.enum('payment_method_type', [
      'person_reimbursement',  // Direct reimbursement to person
      'purchase_order',        // Purchase order workflow
      'credit_card',          // Company credit card
      'direct_vendor'         // Direct payment to vendor
    ]);
    
    // Enhanced payment tracking
    table.string('payment_reference'); // Transaction ID, check number, etc.
    table.string('payment_status').defaultTo('pending'); // pending, approved, paid, rejected
    table.date('payment_due_date'); // When payment is due
    table.date('payment_date'); // When payment was made
    table.uuid('payment_approved_by'); // Who approved the payment
    table.timestamp('payment_approved_at');
    
    // Purchase order specific fields
    table.string('po_line_item_id'); // Which line item on the PO this relates to
    table.boolean('po_pre_approved').defaultTo(false); // Was this pre-approved via PO?
    
    // Credit card specific fields
    table.string('credit_card_transaction_id'); // Transaction ID from credit card
    table.date('credit_card_statement_date'); // Which statement this appears on
    table.boolean('credit_card_reconciled').defaultTo(false); // Has this been reconciled?
    table.uuid('reconciled_by'); // Who reconciled this transaction
    table.timestamp('reconciled_at');
    
    // Vendor payment specific fields
    table.string('vendor_invoice_number'); // Invoice number from vendor
    table.date('vendor_invoice_date'); // Date on vendor invoice
    table.string('vendor_payment_method'); // How vendor prefers payment
    table.string('vendor_payment_terms'); // Net 30, COD, etc.
    table.json('vendor_payment_details'); // Bank details, payment instructions
    
    // Enhanced business context
    table.boolean('requires_additional_approval').defaultTo(false);
    table.json('approval_requirements'); // What additional approvals are needed
    table.string('expense_urgency').defaultTo('normal'); // low, normal, high, urgent
    table.text('urgency_justification'); // Why this is urgent
    
    // Compliance and audit
    table.boolean('requires_compliance_review').defaultTo(false);
    table.json('compliance_flags'); // Any compliance issues flagged
    table.uuid('compliance_reviewed_by'); // Who reviewed for compliance
    table.timestamp('compliance_reviewed_at');
    table.text('compliance_notes');
    
    // Tax and accounting enhancements
    table.boolean('is_tax_deductible').defaultTo(true);
    table.decimal('tax_deductible_amount', 10, 2); // Amount that's tax deductible
    table.string('tax_classification'); // Business, personal, mixed
    table.json('tax_implications'); // Detailed tax implications
    
    // Foreign key constraints
    table.foreign('payment_method_id').references('id').inTable('payment_methods').onDelete('SET NULL');
    table.foreign('purchase_order_id').references('id').inTable('purchase_orders').onDelete('SET NULL');
    table.foreign('credit_card_id').references('id').inTable('company_credit_cards').onDelete('SET NULL');
    table.foreign('payment_approved_by').references('id').inTable('users').onDelete('SET NULL');
    table.foreign('reconciled_by').references('id').inTable('users').onDelete('SET NULL');
    table.foreign('compliance_reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    
    // Additional indexes for performance
    table.index(['payment_method_id', 'payment_status']);
    table.index(['purchase_order_id', 'po_pre_approved']);
    table.index(['credit_card_id', 'credit_card_reconciled']);
    table.index(['payment_method_type', 'payment_status']);
    table.index(['payment_due_date', 'payment_status']);
    table.index(['expense_urgency', 'payment_status']);
    table.index('requires_additional_approval');
    table.index('requires_compliance_review');
    table.index(['vendor_invoice_date', 'payment_status']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('expense_data', function(table) {
    // Drop foreign key constraints first
    table.dropForeign(['payment_method_id']);
    table.dropForeign(['purchase_order_id']);
    table.dropForeign(['credit_card_id']);
    table.dropForeign(['payment_approved_by']);
    table.dropForeign(['reconciled_by']);
    table.dropForeign(['compliance_reviewed_by']);
    
    // Drop columns
    table.dropColumn('payment_method_id');
    table.dropColumn('purchase_order_id');
    table.dropColumn('credit_card_id');
    table.dropColumn('payment_method_type');
    table.dropColumn('payment_reference');
    table.dropColumn('payment_status');
    table.dropColumn('payment_due_date');
    table.dropColumn('payment_date');
    table.dropColumn('payment_approved_by');
    table.dropColumn('payment_approved_at');
    table.dropColumn('po_line_item_id');
    table.dropColumn('po_pre_approved');
    table.dropColumn('credit_card_transaction_id');
    table.dropColumn('credit_card_statement_date');
    table.dropColumn('credit_card_reconciled');
    table.dropColumn('reconciled_by');
    table.dropColumn('reconciled_at');
    table.dropColumn('vendor_invoice_number');
    table.dropColumn('vendor_invoice_date');
    table.dropColumn('vendor_payment_method');
    table.dropColumn('vendor_payment_terms');
    table.dropColumn('vendor_payment_details');
    table.dropColumn('requires_additional_approval');
    table.dropColumn('approval_requirements');
    table.dropColumn('expense_urgency');
    table.dropColumn('urgency_justification');
    table.dropColumn('requires_compliance_review');
    table.dropColumn('compliance_flags');
    table.dropColumn('compliance_reviewed_by');
    table.dropColumn('compliance_reviewed_at');
    table.dropColumn('compliance_notes');
    table.dropColumn('is_tax_deductible');
    table.dropColumn('tax_deductible_amount');
    table.dropColumn('tax_classification');
    table.dropColumn('tax_implications');
  });
};