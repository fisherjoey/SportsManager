/**
 * Migration: Add Performance Indexes for Expense System
 * 
 * This migration adds optimized indexes for the expense and reimbursement system
 * to improve query performance based on common access patterns.
 */

exports.up = async function(knex) {
  // TEMPORARILY DISABLED - Column conflicts with existing schema
  console.log('⚠️  Expense performance indexes migration skipped - column mismatches');
  return Promise.resolve();
  
  console.log('Creating expense system performance indexes...');

  // Check which tables exist and create indexes accordingly
  const tables = await knex.raw(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  `);
  
  const existingTables = tables.rows.map(row => row.table_name);

  // Expense receipts indexes for common queries
  if (existingTables.includes('expense_receipts')) {
    await knex.schema.raw(`
      -- Critical indexes for expense receipts table
      CREATE INDEX IF NOT EXISTS idx_expense_receipts_user_status 
      ON expense_receipts(user_id, processing_status);
      
      CREATE INDEX IF NOT EXISTS idx_expense_receipts_uploaded_at 
      ON expense_receipts(uploaded_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_expense_receipts_user_uploaded 
      ON expense_receipts(user_id, uploaded_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_expense_receipts_org_status 
      ON expense_receipts(organization_id, processing_status) 
      WHERE organization_id IS NOT NULL;
    `);
  }

  // Expense data indexes for filtering and searching
  if (existingTables.includes('expense_data')) {
    await knex.schema.raw(`
      -- Expense data performance indexes
      CREATE INDEX IF NOT EXISTS idx_expense_data_receipt_id 
      ON expense_data(receipt_id);
      
      CREATE INDEX IF NOT EXISTS idx_expense_data_user_date 
      ON expense_data(user_id, transaction_date DESC);
      
      CREATE INDEX IF NOT EXISTS idx_expense_data_category_amount 
      ON expense_data(category_id, total_amount) 
      WHERE category_id IS NOT NULL;
      
      CREATE INDEX IF NOT EXISTS idx_expense_data_vendor_search 
      ON expense_data USING gin(to_tsvector('english', vendor_name)) 
      WHERE vendor_name IS NOT NULL;
      
      CREATE INDEX IF NOT EXISTS idx_expense_data_amount_range 
      ON expense_data(total_amount, transaction_date) 
      WHERE total_amount IS NOT NULL;
    `);
  }

  // Expense categories indexes for reference data
  if (existingTables.includes('expense_categories')) {
    await knex.schema.raw(`
      -- Expense categories indexes
      CREATE INDEX IF NOT EXISTS idx_expense_categories_org_active 
      ON expense_categories(organization_id, is_active) 
      WHERE is_active = true;
      
      CREATE INDEX IF NOT EXISTS idx_expense_categories_default 
      ON expense_categories(is_default) 
      WHERE is_default = true;
    `);
  }

  // Expense approvals indexes for workflow
  if (existingTables.includes('expense_approvals')) {
    await knex.schema.raw(`
      -- Expense approvals workflow indexes
      CREATE INDEX IF NOT EXISTS idx_expense_approvals_status_date 
      ON expense_approvals(status, created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_expense_approvals_approver_date 
      ON expense_approvals(approver_id, created_at DESC) 
      WHERE approver_id IS NOT NULL;
      
      CREATE INDEX IF NOT EXISTS idx_expense_approvals_org_status 
      ON expense_approvals(organization_id, status);
    `);
  }

  // Expense reimbursements indexes for payment tracking
  if (existingTables.includes('expense_reimbursements')) {
    await knex.schema.raw(`
      -- Expense reimbursements indexes
      CREATE INDEX IF NOT EXISTS idx_expense_reimbursements_user_status 
      ON expense_reimbursements(reimbursement_user_id, status);
      
      CREATE INDEX IF NOT EXISTS idx_expense_reimbursements_org_period 
      ON expense_reimbursements(organization_id, pay_period) 
      WHERE pay_period IS NOT NULL;
      
      CREATE INDEX IF NOT EXISTS idx_expense_reimbursements_payment_date 
      ON expense_reimbursements(scheduled_pay_date) 
      WHERE scheduled_pay_date IS NOT NULL;
      
      CREATE INDEX IF NOT EXISTS idx_expense_reimbursements_created_date 
      ON expense_reimbursements(created_at DESC);
    `);
  }

  // User earnings indexes for payroll
  if (existingTables.includes('user_earnings')) {
    await knex.schema.raw(`
      -- User earnings indexes for payroll queries
      CREATE INDEX IF NOT EXISTS idx_user_earnings_user_period 
      ON user_earnings(user_id, pay_period, earning_type);
      
      CREATE INDEX IF NOT EXISTS idx_user_earnings_payment_status 
      ON user_earnings(payment_status, pay_date) 
      WHERE pay_date IS NOT NULL;
      
      CREATE INDEX IF NOT EXISTS idx_user_earnings_reference 
      ON user_earnings(reference_type, reference_id) 
      WHERE reference_id IS NOT NULL;
    `);
  }

  // AI processing logs indexes for monitoring
  if (existingTables.includes('ai_processing_logs')) {
    await knex.schema.raw(`
      -- AI processing logs indexes
      CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_receipt_date 
      ON ai_processing_logs(receipt_id, started_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_status_date 
      ON ai_processing_logs(status, started_at DESC);
    `);
  }

  console.log('✅ Expense system performance indexes created successfully');
};

exports.down = function(knex) {
  return knex.schema.raw(`
    -- Drop all expense system performance indexes
    DROP INDEX IF EXISTS idx_ai_processing_logs_status_date;
    DROP INDEX IF EXISTS idx_ai_processing_logs_receipt_date;
    DROP INDEX IF EXISTS idx_user_earnings_reference;
    DROP INDEX IF EXISTS idx_user_earnings_payment_status;
    DROP INDEX IF EXISTS idx_user_earnings_user_period;
    DROP INDEX IF EXISTS idx_expense_reimbursements_created_date;
    DROP INDEX IF EXISTS idx_expense_reimbursements_payment_date;
    DROP INDEX IF EXISTS idx_expense_reimbursements_org_period;
    DROP INDEX IF EXISTS idx_expense_reimbursements_user_status;
    DROP INDEX IF EXISTS idx_expense_approvals_org_status;
    DROP INDEX IF EXISTS idx_expense_approvals_approver_date;
    DROP INDEX IF EXISTS idx_expense_approvals_status_date;
    DROP INDEX IF EXISTS idx_expense_categories_default;
    DROP INDEX IF EXISTS idx_expense_categories_org_active;
    DROP INDEX IF EXISTS idx_expense_data_amount_range;
    DROP INDEX IF EXISTS idx_expense_data_vendor_search;
    DROP INDEX IF EXISTS idx_expense_data_category_amount;
    DROP INDEX IF EXISTS idx_expense_data_user_date;
    DROP INDEX IF EXISTS idx_expense_data_receipt_id;
    DROP INDEX IF EXISTS idx_expense_receipts_org_status;
    DROP INDEX IF EXISTS idx_expense_receipts_user_uploaded;
    DROP INDEX IF EXISTS idx_expense_receipts_uploaded_at;
    DROP INDEX IF EXISTS idx_expense_receipts_user_status;
  `);
};