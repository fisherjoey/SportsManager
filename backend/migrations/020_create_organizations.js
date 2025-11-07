/**
 * Create organizations table
 * This is the base table for multi-tenancy support
 */

exports.up = async function(knex) {
  console.log('Creating organizations table...');

  await knex.schema.createTable('organizations', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('slug', 100).unique().notNullable();
    table.text('description');
    table.string('logo_url');
    table.json('settings').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    // Indexes
    table.index('slug');
    table.index('is_active');
  });

  // Insert default organization
  await knex('organizations').insert({
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Default Organization',
    slug: 'default',
    settings: JSON.stringify({ is_default: true }),
    is_active: true,
    created_at: knex.fn.now(),
    updated_at: knex.fn.now()
  });

  console.log('✅ Organizations table created with default organization');
};

exports.down = async function(knex) {
  console.log('Dropping organizations table...');
  await knex.schema.dropTableIfExists('organizations');
  console.log('✅ Organizations table dropped');
};
