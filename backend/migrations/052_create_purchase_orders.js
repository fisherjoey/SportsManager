/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('purchase_orders', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('po_number').notNullable(); // Auto-generated or manual PO number
    
    // Requestor information
    table.uuid('requested_by').notNullable(); // User who requested the PO
    table.uuid('department_id'); // Department requesting the purchase
    table.string('cost_center');
    table.string('project_code');
    
    // Vendor information
    table.string('vendor_name').notNullable();
    table.text('vendor_address');
    table.string('vendor_phone');
    table.string('vendor_email');
    table.string('vendor_contact_person');
    table.string('vendor_tax_id'); // Tax ID or business registration number
    
    // Purchase details
    table.text('description').notNullable(); // Description of what's being purchased
    table.decimal('estimated_amount', 10, 2).notNullable();
    table.decimal('actual_amount', 10, 2); // Filled when invoice is received
    table.date('requested_delivery_date');
    table.date('actual_delivery_date');
    table.text('delivery_address');
    table.json('line_items'); // Detailed breakdown of items being purchased
    
    // Approval workflow
    table.enum('status', [
      'draft',           // Being prepared
      'pending_approval', // Waiting for approval
      'approved',        // Approved and ready to send
      'sent_to_vendor',  // PO has been sent to vendor
      'acknowledged',    // Vendor has acknowledged receipt
      'in_progress',     // Order is being fulfilled
      'partially_received', // Some items received
      'received',        // All items received
      'invoiced',        // Invoice received from vendor
      'paid',           // Invoice has been paid
      'cancelled',      // PO was cancelled
      'closed'          // PO is closed
    ]).defaultTo('draft');
    
    table.uuid('approved_by'); // Who approved the PO
    table.timestamp('approved_at');
    table.text('approval_notes');
    table.json('approval_history'); // Track multi-level approvals
    
    // Budget and accounting
    table.uuid('budget_id'); // Reference to budget if applicable
    table.string('account_code'); // Accounting code for this purchase
    table.boolean('budget_approved').defaultTo(false);
    table.decimal('budget_impact', 10, 2); // How much this affects the budget
    
    // Terms and conditions
    table.string('payment_terms'); // Net 30, COD, etc.
    table.text('special_instructions');
    table.json('terms_and_conditions'); // Standard T&Cs
    table.boolean('requires_receipt').defaultTo(true);
    table.boolean('requires_invoice').defaultTo(true);
    
    // Integration and tracking
    table.string('external_po_id'); // PO ID in external system
    table.json('vendor_response'); // Vendor's response/acknowledgment
    table.json('delivery_tracking'); // Shipping/delivery tracking info
    table.json('invoice_details'); // Invoice information when received
    
    // Emergency/priority settings
    table.boolean('is_emergency').defaultTo(false);
    table.string('priority_level').defaultTo('normal'); // low, normal, high, urgent
    table.text('emergency_justification');
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('sent_to_vendor_at');
    table.timestamp('acknowledged_at');
    table.timestamp('delivered_at');
    table.timestamp('invoiced_at');
    table.timestamp('paid_at');
    
    // Foreign key constraints
    table.foreign('organization_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('requested_by').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('approved_by').references('id').inTable('users').onDelete('SET NULL');
    table.foreign('budget_id').references('id').inTable('budgets').onDelete('SET NULL');
    
    // Indexes
    table.index(['organization_id', 'status']);
    table.index(['requested_by', 'status']);
    table.index('po_number');
    table.index(['vendor_name', 'status']);
    table.index(['requested_delivery_date', 'status']);
    table.index(['created_at', 'status']);
    table.index('is_emergency');
    table.index('priority_level');
    
    // Unique constraint on PO number within organization
    table.unique(['organization_id', 'po_number']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('purchase_orders');
};