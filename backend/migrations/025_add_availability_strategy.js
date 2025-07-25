async function up(knex) {
  // Add availability_strategy enum type
  await knex.raw("CREATE TYPE availability_strategy_enum AS ENUM ('WHITELIST', 'BLACKLIST')");
  
  // Add availability_strategy column to organization_settings
  await knex.schema.table('organization_settings', (table) => {
    table.specificType('availability_strategy', 'availability_strategy_enum').defaultTo('BLACKLIST');
  });
  
  // Make is_available nullable in referee_availability table
  await knex.schema.alterTable('referee_availability', (table) => {
    table.boolean('is_available').nullable().alter();
  });
  
  // Update existing records to maintain current behavior (BLACKLIST mode)
  // In BLACKLIST mode: 
  // - No entry = available (assumed)
  // - is_available = true = explicitly available (redundant but allowed)
  // - is_available = false = explicitly unavailable
  
  // Convert existing true values to null (since BLACKLIST assumes available by default)
  await knex('referee_availability')
    .where('is_available', true)
    .update('is_available', null);
}

async function down(knex) {
  // Restore is_available to non-nullable with default true
  await knex('referee_availability')
    .whereNull('is_available')
    .update('is_available', true);
  
  await knex.schema.alterTable('referee_availability', (table) => {
    table.boolean('is_available').notNullable().defaultTo(true).alter();
  });
  
  // Remove availability_strategy column
  await knex.schema.table('organization_settings', (table) => {
    table.dropColumn('availability_strategy');
  });
  
  // Drop enum type
  await knex.raw('DROP TYPE IF EXISTS availability_strategy_enum');
}

module.exports = { up, down };