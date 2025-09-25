exports.up = function(knex) {
  return knex.schema
    // Add columns to existing referee_availability table
    .alterTable('referee_availability', function(table) {
      table.string('pattern_type').defaultTo('single'); // 'single', 'weekly', 'daily'
      table.integer('max_games_per_period');
      table.string('preferred_locations');
      table.string('preferred_partners');
      table.text('notes');
      table.integer('priority_level').defaultTo(5); // 1-10 scale
      table.boolean('is_flexible').defaultTo(false);
    })
    // Create new availability patterns table for recurring rules
    .createTable('availability_patterns', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('referee_id').references('id').inTable('referees').onDelete('CASCADE');
      table.string('name').notNullable(); // User-defined name like "Weeknight Standard"
      table.json('days_of_week'); // [1,2,3,4,5] for Mon-Fri
      table.time('start_time').notNullable();
      table.time('end_time').notNullable();
      table.date('effective_from').notNullable();
      table.date('effective_until');
      table.boolean('is_active').defaultTo(true);
      table.integer('max_games_per_week');
      table.integer('max_distance_km');
      table.text('notes');
      table.timestamps(true, true);
      
      table.index(['referee_id', 'is_active']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('availability_patterns')
    .alterTable('referee_availability', function(table) {
      table.dropColumn('pattern_type');
      table.dropColumn('max_games_per_period');
      table.dropColumn('preferred_locations');
      table.dropColumn('preferred_partners');
      table.dropColumn('notes');
      table.dropColumn('priority_level');
      table.dropColumn('is_flexible');
    });
};