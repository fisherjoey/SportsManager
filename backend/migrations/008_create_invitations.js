exports.up = function(knex) {
  return knex.schema.createTable('invitations', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').notNullable().unique();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('role').notNullable().defaultTo('referee');
    table.uuid('invited_by').references('id').inTable('users').onDelete('SET NULL');
    table.string('token').notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.boolean('used').notNullable().defaultTo(false);
    table.timestamp('used_at');
    table.timestamps(true, true);
    
    table.index('token');
    table.index('email');
    table.index('expires_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('invitations');
};