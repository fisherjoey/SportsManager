/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('locations', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('name', 255).notNullable()
    table.string('address', 500).notNullable()
    table.string('city', 100).notNullable()
    table.string('province', 50).notNullable().defaultTo('AB')
    table.string('postal_code', 10).notNullable()
    table.string('country', 50).notNullable().defaultTo('Canada')
    
    // Coordinates for mapping and distance calculations
    table.decimal('latitude', 10, 8).nullable()
    table.decimal('longitude', 11, 8).nullable()
    
    // Facility information
    table.integer('capacity').nullable()
    table.string('contact_name', 255).nullable()
    table.string('contact_phone', 20).nullable()
    table.string('contact_email', 255).nullable()
    table.decimal('rental_rate', 8, 2).nullable()
    table.integer('parking_spaces').nullable()
    
    // JSON fields for flexible data
    table.json('facilities').nullable() // ["Basketball Court", "Concession", etc.]
    table.json('accessibility_features').nullable() // ["Wheelchair Access", etc.]
    
    table.text('notes').nullable()
    table.boolean('is_active').notNullable().defaultTo(true)
    
    // Metadata
    table.timestamps(true, true)
    
    // Indexes
    table.index(['name'])
    table.index(['city'])
    table.index(['postal_code'])
    table.index(['is_active'])
    table.index(['latitude', 'longitude'])
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('locations')
};