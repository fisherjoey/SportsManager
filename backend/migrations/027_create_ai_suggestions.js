exports.up = function(knex) {
  return knex.schema.createTable('ai_suggestions', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('game_id').notNullable().references('id').inTable('games').onDelete('CASCADE');
    table.uuid('referee_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('confidence_score', 3, 2).notNullable().checkBetween([0, 1]);
    table.text('reasoning');
    table.decimal('proximity_score', 3, 2).checkBetween([0, 1]);
    table.decimal('availability_score', 3, 2).checkBetween([0, 1]);
    table.decimal('experience_score', 3, 2).checkBetween([0, 1]);
    table.decimal('performance_score', 3, 2).checkBetween([0, 1]);
    table.enum('status', ['pending', 'accepted', 'rejected', 'expired']).defaultTo('pending');
    table.text('rejection_reason');
    table.uuid('created_by').references('id').inTable('users');
    table.uuid('processed_by').references('id').inTable('users');
    table.timestamp('processed_at');
    table.timestamps(true, true);

    // Indexes for performance
    table.index(['game_id']);
    table.index(['referee_id']);
    table.index(['status']);
    table.index(['confidence_score']);
    table.index(['created_at']);

    // Unique constraint to prevent duplicate suggestions
    table.unique(['game_id', 'referee_id', 'status'], 'unique_active_suggestion');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('ai_suggestions');
};