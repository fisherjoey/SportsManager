/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.all([
    // Add cost fields to locations table
    knex.schema.alterTable('locations', (table) => {
      table.decimal('hourly_rate', 8, 2).nullable().comment('Hourly rate for this location');
      table.decimal('game_rate', 8, 2).nullable().comment('Flat rate per game for this location');
      table.text('cost_notes').nullable().comment('Additional cost information');
    }),
    
    // Add cost fields to games table
    knex.schema.alterTable('games', (table) => {
      table.decimal('location_cost', 8, 2).nullable().comment('Cost for using the location (overrides location default)');
      table.text('cost_notes').nullable().comment('Notes about game costs');
    })
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return Promise.all([
    // Remove cost fields from locations table
    knex.schema.alterTable('locations', (table) => {
      table.dropColumn('hourly_rate');
      table.dropColumn('game_rate');
      table.dropColumn('cost_notes');
    }),
    
    // Remove cost fields from games table
    knex.schema.alterTable('games', (table) => {
      table.dropColumn('location_cost');
      table.dropColumn('cost_notes');
    })
  ]);
};