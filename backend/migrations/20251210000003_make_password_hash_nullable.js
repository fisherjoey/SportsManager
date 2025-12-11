/**
 * Make password_hash nullable for Clerk authentication
 *
 * This migration makes the password_hash field nullable to support
 * users who authenticate exclusively via Clerk (no local password).
 */

exports.up = async function(knex) {
  console.log('Making password_hash nullable for Clerk authentication...');

  await knex.schema.alterTable('users', function(table) {
    // Make password_hash nullable
    table.string('password_hash').nullable().alter();
  });

  console.log('✅ password_hash is now nullable');
};

exports.down = async function(knex) {
  console.log('Reverting password_hash to notNullable...');

  await knex.schema.alterTable('users', function(table) {
    // Revert to notNullable (this may fail if there are null values)
    table.string('password_hash').notNullable().alter();
  });

  console.log('✅ password_hash is now notNullable');
};
