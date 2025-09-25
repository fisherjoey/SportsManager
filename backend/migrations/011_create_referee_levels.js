exports.up = function(knex) {
  return knex.schema.createTable('referee_levels', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable().unique(); // Learning, Growing, Teaching
    table.decimal('wage_amount', 8, 2).notNullable();
    table.text('description');
    table.json('allowed_divisions'); // Array of division codes they can referee
    table.json('experience_requirements');
    table.json('capability_requirements');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('referee_levels');
};