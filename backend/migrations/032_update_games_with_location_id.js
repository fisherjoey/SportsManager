/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('games', function(table) {
    // Add location_id foreign key
    table.uuid('location_id').nullable()
    table.foreign('location_id').references('id').inTable('locations').onDelete('RESTRICT')
    table.index(['location_id'])
    
    // Keep the existing location and postal_code fields for backward compatibility
    // We can migrate data and remove them later if needed
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('games', function(table) {
    table.dropForeign(['location_id'])
    table.dropIndex(['location_id'])
    table.dropColumn('location_id')
  })
};