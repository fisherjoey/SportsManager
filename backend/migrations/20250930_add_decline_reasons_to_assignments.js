/**
 * Migration: Add decline reason tracking to game_assignments
 *
 * This migration adds fields to track why a referee declined an assignment:
 * - decline_reason: Free text explanation from referee
 * - decline_category: Predefined category for analytics
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('game_assignments', function(table) {
    // Add decline_reason field for free text explanation
    table.text('decline_reason')
      .nullable()
      .comment('Reason provided by referee for declining assignment');

    // Add decline_category for categorized tracking
    table.string('decline_category', 100)
      .nullable()
      .comment('Categorized decline reason: unavailable, conflict, distance, level, other');

    // Add index for filtering by decline category (useful for analytics)
    table.index('decline_category', 'game_assignments_decline_category_index');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('game_assignments', function(table) {
    // Drop the index first
    table.dropIndex('decline_category', 'game_assignments_decline_category_index');

    // Drop the columns
    table.dropColumn('decline_reason');
    table.dropColumn('decline_category');
  });
};
