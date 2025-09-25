exports.up = function(knex) {
  return knex.schema.alterTable('game_assignments', function(table) {
    table.decimal('calculated_wage', 8, 2); // Final calculated wage for this assignment
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('game_assignments', function(table) {
    table.dropColumn('calculated_wage');
  });
};