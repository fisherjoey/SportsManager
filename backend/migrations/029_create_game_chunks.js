exports.up = function(knex) {
  return knex.schema.createTable('game_chunks', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('location').notNullable();
    table.date('date').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.uuid('assigned_referee_id').references('id').inTable('users').onDelete('SET NULL');
    table.integer('total_referees_needed').notNullable().defaultTo(0);
    table.integer('game_count').notNullable().defaultTo(0);
    table.text('notes');
    table.enum('status', ['unassigned', 'assigned', 'completed', 'cancelled']).defaultTo('unassigned');
    table.uuid('created_by').references('id').inTable('users');
    table.uuid('assigned_by').references('id').inTable('users');
    table.timestamp('assigned_at');
    table.timestamps(true, true);

    // Indexes for queries
    table.index(['location']);
    table.index(['date']);
    table.index(['status']);
    table.index(['assigned_referee_id']);
    table.index(['created_by']);

    // Composite index for location and date filtering
    table.index(['location', 'date'], 'location_date_index');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('game_chunks');
};