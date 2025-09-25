exports.up = function(knex) {
  return knex.schema.alterTable('games', function(table) {
    table.decimal('wage_multiplier', 4, 2).defaultTo(1.0);
    table.text('wage_multiplier_reason'); // Optional reason for multiplier
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('games', function(table) {
    table.dropColumn('wage_multiplier');
    table.dropColumn('wage_multiplier_reason');
  });
};