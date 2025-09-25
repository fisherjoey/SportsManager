exports.up = function(knex) {
  return knex.schema.alterTable('referees', function(table) {
    table.uuid('referee_level_id').references('id').inTable('referee_levels');
    table.integer('years_experience').defaultTo(0);
    table.integer('games_refereed_season').defaultTo(0);
    table.decimal('evaluation_score', 4, 2); // Latest evaluation score
    table.text('notes'); // Admin notes about referee
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('referees', function(table) {
    table.dropColumn('referee_level_id');
    table.dropColumn('years_experience');
    table.dropColumn('games_refereed_season');
    table.dropColumn('evaluation_score');
    table.dropColumn('notes');
  });
};