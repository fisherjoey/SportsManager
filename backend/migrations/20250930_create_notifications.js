/**
 * Migration: Create notifications and notification_preferences tables
 * Purpose: In-app notification system for game assignments and status updates
 * Date: 2025-09-30
 * Phase: 3 (In-App Notifications)
 */

exports.up = function(knex) {
  return knex.schema
    .createTable('notifications', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('type', 50).notNullable().comment('Type: assignment, status_change, reminder, system');
      table.string('title', 255).notNullable();
      table.text('message').notNullable();
      table.string('link', 500).nullable().comment('Deep link to relevant page');
      table.jsonb('metadata').nullable().comment('Additional data: game_id, assignment_id, etc.');
      table.boolean('is_read').defaultTo(false);
      table.timestamp('read_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());

      // Indexes for efficient queries
      table.index(['user_id', 'is_read'], 'notifications_user_unread_index');
      table.index(['user_id', 'created_at'], 'notifications_user_created_index');
      table.index('type', 'notifications_type_index');
    })
    .createTable('notification_preferences', function(table) {
      table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
      table.boolean('email_assignments').defaultTo(true).comment('Send email for new assignments');
      table.boolean('email_reminders').defaultTo(true).comment('Send email game reminders');
      table.boolean('email_status_changes').defaultTo(true).comment('Send email when referee accepts/declines');
      table.boolean('sms_assignments').defaultTo(true).comment('Send SMS for new assignments');
      table.boolean('sms_reminders').defaultTo(true).comment('Send SMS game reminders');
      table.boolean('in_app_enabled').defaultTo(true).comment('Show in-app notifications');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('notification_preferences')
    .dropTableIfExists('notifications');
};
