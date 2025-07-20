exports.up = function(knex) {
  return knex.schema.createTable('referees', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('email').unique().notNullable();
    table.string('phone', 20);
    table.enu('level', ['Recreational', 'Competitive', 'Elite']).notNullable();
    table.string('location');
    table.string('postal_code', 10).notNullable();
    table.integer('max_distance').defaultTo(25);
    table.boolean('is_available').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['level']);
    table.index(['postal_code']);
    table.index(['is_available']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('referees');
};