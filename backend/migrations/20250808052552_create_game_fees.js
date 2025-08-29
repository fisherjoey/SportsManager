/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('game_fees', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('game_id').references('id').inTable('games').onDelete('CASCADE').notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.string('payment_status').defaultTo('pending').notNullable();
    table.timestamp('payment_date');
    table.string('payment_method');
    table.text('notes');
    table.uuid('recorded_by').references('id').inTable('users');
    table.timestamps(true, true);
    
    table.index('game_id');
    table.index('payment_status');
    table.index('payment_date');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('game_fees');
};