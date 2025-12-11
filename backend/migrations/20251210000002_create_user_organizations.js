/**
 * Create user_organizations junction table
 *
 * This migration creates a many-to-many relationship between users and organizations,
 * allowing users to belong to multiple organizations with different roles and statuses.
 */

exports.up = async function(knex) {
  console.log('Creating user_organizations junction table...');

  // Check if table already exists
  if (await knex.schema.hasTable('user_organizations')) {
    console.log('⏭ user_organizations table already exists, skipping');
    return;
  }

  await knex.schema.createTable('user_organizations', function(table) {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign keys
    table.uuid('user_id').notNullable();
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    table.uuid('organization_id').notNullable();
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');

    // Organization membership fields
    table.boolean('is_primary').defaultTo(false);
    table.string('role', 50).defaultTo('member').comment('Organization-level role: owner, admin, member');
    table.string('status', 20).defaultTo('active');
    table.timestamp('joined_at').defaultTo(knex.fn.now());

    // Invitation tracking
    table.uuid('invited_by');
    table.foreign('invited_by').references('id').inTable('users');

    // Timestamps
    table.timestamps(true, true);

    // Constraints
    table.unique(['user_id', 'organization_id']);

    // Indexes
    table.index('user_id', 'idx_user_organizations_user');
    table.index('organization_id', 'idx_user_organizations_org');
    table.index('status', 'idx_user_organizations_status');
  });

  console.log('✅ user_organizations junction table created successfully');
};

exports.down = async function(knex) {
  console.log('Dropping user_organizations junction table...');

  await knex.schema.dropTableIfExists('user_organizations');

  console.log('✅ user_organizations junction table dropped');
};
