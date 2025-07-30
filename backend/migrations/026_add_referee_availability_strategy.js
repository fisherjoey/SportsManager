/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasReferees = await knex.schema.hasTable('referees');
  if (hasReferees) {
    return knex.schema.alterTable('referees', function(table) {
      table.enu('availability_strategy', ['WHITELIST', 'BLACKLIST']).defaultTo('BLACKLIST');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasReferees = await knex.schema.hasTable('referees');
  if (hasReferees) {
    return knex.schema.alterTable('referees', function(table) {
      table.dropColumn('availability_strategy');
    });
  }
};