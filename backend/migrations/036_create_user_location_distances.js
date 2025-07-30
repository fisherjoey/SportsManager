/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('user_location_distances', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.uuid('location_id').notNullable().references('id').inTable('locations').onDelete('CASCADE')
    
    // Distance data
    table.integer('distance_meters').nullable() // Distance in meters
    table.string('distance_text', 20).nullable() // Formatted distance (e.g., "15.3 km")
    table.integer('drive_time_seconds').nullable() // Drive time in seconds
    table.string('drive_time_text', 20).nullable() // Formatted drive time (e.g., "18m")
    table.integer('drive_time_minutes').nullable() // Drive time in minutes for easy filtering
    
    // Calculation metadata
    table.string('calculation_provider', 50).nullable() // 'openrouteservice', 'google', etc.
    table.timestamp('calculated_at').nullable() // When this distance was calculated
    table.json('route_data').nullable() // Store additional route information if needed
    table.boolean('calculation_successful').notNullable().defaultTo(false)
    table.text('calculation_error').nullable() // Store error message if calculation failed
    
    // Performance and freshness tracking
    table.integer('calculation_attempts').notNullable().defaultTo(1)
    table.timestamp('last_calculation_attempt').nullable()
    table.boolean('needs_recalculation').notNullable().defaultTo(false)
    
    // Metadata
    table.timestamps(true, true)
    
    // Indexes for performance
    table.index(['user_id'])
    table.index(['location_id'])
    table.index(['user_id', 'location_id']) // Composite index for lookups
    table.index(['drive_time_minutes']) // For filtering by drive time
    table.index(['distance_meters']) // For filtering by distance
    table.index(['calculation_successful'])
    table.index(['needs_recalculation'])
    table.index(['calculated_at'])
    
    // Ensure one distance record per user-location pair
    table.unique(['user_id', 'location_id'])
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('user_location_distances')
};