/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('user_locations', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    
    // Full address components
    table.string('full_address', 500).nullable()
    table.string('street_number', 20).nullable()
    table.string('street_name', 255).nullable()
    table.string('city', 100).notNullable()
    table.string('province', 50).notNullable().defaultTo('AB')
    table.string('postal_code', 10).notNullable()
    table.string('country', 50).notNullable().defaultTo('Canada')
    
    // Coordinates for distance calculations
    table.decimal('latitude', 10, 8).nullable()
    table.decimal('longitude', 11, 8).nullable()
    
    // Geocoding metadata
    table.string('geocoding_provider', 50).nullable() // 'google', 'mapbox', 'nominatim'
    table.decimal('geocoding_confidence', 4, 3).nullable() // 0.000 to 1.000
    table.string('address_type', 50).nullable() // 'street_address', 'route', 'locality', etc.
    table.json('raw_geocoding_data').nullable() // Store full API response for debugging
    
    // Metadata
    table.timestamps(true, true)
    
    // Indexes for performance
    table.index(['user_id'])
    table.index(['postal_code'])
    table.index(['city'])
    table.index(['latitude', 'longitude'])
    table.index(['geocoding_provider'])
    
    // Ensure one location per user (for now)
    table.unique(['user_id'])
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('user_locations')
};