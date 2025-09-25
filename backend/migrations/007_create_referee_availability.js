exports.up = function(knex) {
  return knex.schema.createTable('referee_availability', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('referee_id').references('id').inTable('referees').onDelete('CASCADE');
    table.date('date').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.boolean('is_available').defaultTo(true);
    table.string('reason'); // Optional reason for unavailability
    table.timestamps(true, true);
    
    table.index(['referee_id', 'date']);
    table.index(['date', 'start_time', 'end_time']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('referee_availability');
};