/**
 * Add user notes column migration
 * 
 * Adds a notes column to the users table for admin notes and comments
 * Sets up proper permissions for viewing/editing user notes
 */

exports.up = async function(knex) {
  console.log('Adding user notes column...');

  // Get existing columns
  const existingColumns = await knex('users').columnInfo();

  // Add notes column to users table if it doesn't exist
  if (!existingColumns.notes) {
    await knex.schema.alterTable('users', function(table) {
      table.text('notes');
    });
    console.log('✅ User notes column added successfully');
  } else {
    console.log('⚠️  User notes column already exists, skipping');
  }
};

exports.down = async function(knex) {
  console.log('Removing user notes column...');

  await knex.schema.alterTable('users', function(table) {
    table.dropColumn('notes');
  });

  console.log('✅ User notes column removed');
};