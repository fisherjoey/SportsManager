async function up(knex) {
  // Create enum type
  await knex.raw("CREATE TYPE payment_model_enum AS ENUM ('INDIVIDUAL', 'FLAT_RATE')");
  
  // Create table
  await knex.schema.createTable('organization_settings', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('organization_name', 255).notNullable().defaultTo('Sports Organization');
    table.specificType('payment_model', 'payment_model_enum').defaultTo('INDIVIDUAL');
    table.decimal('default_game_rate', 8, 2).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  
  // Insert default record
  await knex('organization_settings').insert({
    organization_name: 'Sports Organization',
    payment_model: 'INDIVIDUAL',
    default_game_rate: null
  });
}

async function down(knex) {
  await knex.schema.dropTableIfExists('organization_settings');
  await knex.raw('DROP TYPE IF EXISTS payment_model_enum');
}

module.exports = { up, down };