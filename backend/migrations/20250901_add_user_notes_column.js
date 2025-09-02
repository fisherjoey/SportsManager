/**
 * Add user notes column migration
 * 
 * Adds a notes column to the users table for admin notes and comments
 * Sets up proper permissions for viewing/editing user notes
 */

exports.up = async function(knex) {
  console.log('Adding user notes column...');

  // Add notes column to users table
  await knex.schema.alterTable('users', function(table) {
    table.text('notes');
    table.index('notes'); // For searching notes
  });

  console.log('✅ User notes column added successfully');
};

exports.down = async function(knex) {
  console.log('Removing user notes column...');

  await knex.schema.alterTable('users', function(table) {
    table.dropColumn('notes');
  });

  console.log('✅ User notes column removed');
};