exports.up = function(knex) {
  return knex.schema.alterTable('referees', function(table) {
    table.dropColumn('level');
    table.decimal('wage_per_game', 8, 2).defaultTo(0);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('referees', function(table) {
    table.dropColumn('wage_per_game');
    table.string('level').notNullable().defaultTo('Recreational');
  });
};