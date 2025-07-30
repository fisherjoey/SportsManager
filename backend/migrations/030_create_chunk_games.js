exports.up = function(knex) {
  return knex.schema.createTable('chunk_games', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('chunk_id').notNullable().references('id').inTable('game_chunks').onDelete('CASCADE');
    table.uuid('game_id').notNullable().references('id').inTable('games').onDelete('CASCADE');
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);

    // Indexes
    table.index(['chunk_id']);
    table.index(['game_id']);
    table.index(['sort_order']);

    // Unique constraint to prevent duplicate game-chunk relationships
    table.unique(['chunk_id', 'game_id'], 'unique_chunk_game');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('chunk_games');
};