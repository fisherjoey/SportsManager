exports.up = function(knex) {
  return knex.schema.createTable('teams', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('location');
    table.string('contact_email');
    table.string('contact_phone', 20);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('teams');
};