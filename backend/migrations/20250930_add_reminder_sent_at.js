/**
 * Migration: Add reminder_sent_at to game_assignments
 * Purpose: Track when SMS/email reminders have been sent to prevent duplicate reminders
 * Date: 2025-09-30
 */

exports.up = function(knex) {
  return knex.schema.table('game_assignments', function(table) {
    table.timestamp('reminder_sent_at')
      .nullable()
      .comment('Timestamp when game reminder was sent to referee');

    // Add index for efficient reminder query
    table.index('reminder_sent_at', 'game_assignments_reminder_sent_at_index');
  });
};

exports.down = function(knex) {
  return knex.schema.table('game_assignments', function(table) {
    table.dropIndex('reminder_sent_at', 'game_assignments_reminder_sent_at_index');
    table.dropColumn('reminder_sent_at');
  });
};
