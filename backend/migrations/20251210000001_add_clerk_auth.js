/**
 * Add Clerk authentication support to users table
 *
 * This migration adds the clerk_id field to support Clerk authentication
 * alongside existing email/password authentication.
 */

exports.up = async function(knex) {
  console.log('Adding Clerk authentication support to users table...');

  // Check if clerk_id column already exists
  const hasClerkId = await knex.schema.hasColumn('users', 'clerk_id');

  if (!hasClerkId) {
    await knex.schema.alterTable('users', function(table) {
      // Add clerk_id column with unique constraint
      table.string('clerk_id', 255).unique();

      // Add index for faster lookups
      table.index('clerk_id', 'idx_users_clerk_id');
    });
    console.log('✅ Clerk authentication support added successfully');
  } else {
    console.log('⏭ clerk_id column already exists, skipping');
  }
};

exports.down = async function(knex) {
  console.log('Removing Clerk authentication support from users table...');

  await knex.schema.alterTable('users', function(table) {
    // Drop index first
    table.dropIndex('clerk_id', 'idx_users_clerk_id');

    // Drop column
    table.dropColumn('clerk_id');
  });

  console.log('✅ Clerk authentication support removed');
};
