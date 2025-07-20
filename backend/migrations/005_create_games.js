exports.up = function(knex) {
  return knex.schema.createTable('games', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('home_team_id').references('id').inTable('teams');
    table.uuid('away_team_id').references('id').inTable('teams');
    table.string('home_team_name').notNullable();
    table.string('away_team_name').notNullable();
    table.date('game_date').notNullable();
    table.time('game_time').notNullable();
    table.string('location').notNullable();
    table.string('postal_code', 10).notNullable();
    table.enu('level', ['Recreational', 'Competitive', 'Elite']).notNullable();
    table.decimal('pay_rate', 10, 2).notNullable();
    table.enu('status', ['assigned', 'unassigned', 'up-for-grabs', 'completed', 'cancelled']).defaultTo('unassigned');
    table.timestamps(true, true);
    
    table.index(['game_date']);
    table.index(['status']);
    table.index(['level']);
    table.index(['postal_code']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('games');
};