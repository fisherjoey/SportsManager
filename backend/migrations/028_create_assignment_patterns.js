exports.up = function(knex) {
  return knex.schema.createTable('assignment_patterns', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('referee_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('referee_name').notNullable();
    table.string('day_of_week').notNullable(); // Monday, Tuesday, etc.
    table.string('location').notNullable();
    table.string('time_slot').notNullable(); // e.g., "10:00", "Morning", "Evening"
    table.string('level').notNullable(); // Competitive, Recreational, etc.
    table.integer('frequency_count').notNullable().defaultTo(0);
    table.decimal('success_rate', 5, 2).defaultTo(0); // Percentage
    table.date('first_assigned');
    table.date('last_assigned');
    table.integer('total_assignments').defaultTo(0);
    table.integer('completed_assignments').defaultTo(0);
    table.integer('declined_assignments').defaultTo(0);
    table.jsonb('additional_data'); // For storing extra pattern metadata
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    // Indexes for pattern matching and performance
    table.index(['referee_id']);
    table.index(['day_of_week']);
    table.index(['location']);
    table.index(['level']);
    table.index(['frequency_count']);
    table.index(['success_rate']);
    table.index(['is_active']);

    // Composite index for pattern matching
    table.index(['referee_id', 'day_of_week', 'location', 'time_slot'], 'pattern_match_index');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('assignment_patterns');
};