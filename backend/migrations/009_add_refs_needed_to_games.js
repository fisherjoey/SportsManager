exports.up = function(knex) {
  return knex.schema.alterTable('games', function(table) {
    table.integer('refs_needed').notNullable().defaultTo(3);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('games', function(table) {
    table.dropColumn('refs_needed');
  });
};