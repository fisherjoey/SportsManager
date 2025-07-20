exports.up = function(knex) {
  return knex.schema.createTable('game_assignments', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('game_id').references('id').inTable('games').onDelete('CASCADE');
    table.uuid('referee_id').references('id').inTable('referees').onDelete('CASCADE');
    table.uuid('position_id').references('id').inTable('positions');
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.uuid('assigned_by').references('id').inTable('users');
    table.enu('status', ['assigned', 'accepted', 'declined', 'completed']).defaultTo('assigned');
    table.timestamps(true, true);
    
    table.unique(['game_id', 'position_id']);
    table.unique(['game_id', 'referee_id']);
    table.index(['game_id']);
    table.index(['referee_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('game_assignments');
};