/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Add is_white_whistle field to users table
  await knex.schema.table('users', function(table) {
    table.boolean('is_white_whistle').defaultTo(false);
  });

  // Set white whistle status for existing junior/rookie level referees
  // For now, we'll set any referees with 'Recreational' level to white whistle
  // This will be properly handled when we update the level system
  const recreationalReferees = await knex('users')
    .whereNotNull('referee_level_id')
    .where('role', 'referee');
  
  // We'll handle this properly in the seed data - just add the column for now
  console.log(`Added is_white_whistle field to users table. ${recreationalReferees.length} referee records found.`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.table('users', function(table) {
    table.dropColumn('is_white_whistle');
  });
};
