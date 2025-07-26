/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('referees', function(table) {
    table.enu('availability_strategy', ['WHITELIST', 'BLACKLIST']).defaultTo('BLACKLIST');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('referees', function(table) {
    table.dropColumn('availability_strategy');
  });
};