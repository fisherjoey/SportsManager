/**
 * Migration: Remove redundant available_amount field from budgets table
 * The available amount should be calculated dynamically, not stored
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    // Remove the redundant available_amount column
    // This will be calculated as: allocated_amount - committed_amount - actual_spent - reserved_amount
    await trx.schema.alterTable('budgets', function(table) {
      table.dropColumn('available_amount');
    });

    // Add constraints to ensure financial data integrity
    await trx.raw(`
      ALTER TABLE budgets 
      ADD CONSTRAINT check_budget_amounts 
      CHECK (
        allocated_amount >= 0 AND
        committed_amount >= 0 AND
        actual_spent >= 0 AND
        reserved_amount >= 0 AND
        (committed_amount + actual_spent + reserved_amount) <= allocated_amount
      )
    `);

    // Add index for performance on financial calculations
    await trx.schema.alterTable('budgets', function(table) {
      table.index(['allocated_amount', 'committed_amount', 'actual_spent', 'reserved_amount'], 'idx_budget_financial_amounts');
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    // Remove the constraint
    await trx.raw('ALTER TABLE budgets DROP CONSTRAINT IF EXISTS check_budget_amounts');
    
    // Remove the index
    await trx.schema.alterTable('budgets', function(table) {
      table.dropIndex(['allocated_amount', 'committed_amount', 'actual_spent', 'reserved_amount'], 'idx_budget_financial_amounts');
    });

    // Restore the available_amount column
    await trx.schema.alterTable('budgets', function(table) {
      table.decimal('available_amount', 12, 2).defaultTo(0);
    });

    // Recalculate available amounts
    await trx.raw(`
      UPDATE budgets 
      SET available_amount = allocated_amount - committed_amount - actual_spent - reserved_amount
    `);
  });
};