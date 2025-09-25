/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('games', function(table) {
    // Add game_type column with predefined values
    table.enu('game_type', ['Community', 'Club', 'Tournament', 'Private Tournament']).defaultTo('Community');
    
    // Add index for performance
    table.index(['game_type']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('games', function(table) {
    table.dropIndex(['game_type']);
    table.dropColumn('game_type');
  });
};
