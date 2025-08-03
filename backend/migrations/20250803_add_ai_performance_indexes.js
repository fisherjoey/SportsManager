/**
 * Add database indexes for improved AI assignment performance
 */

exports.up = function(knex) {
  return Promise.all([
    // Index for game date and time queries (for conflict detection)
    knex.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_date_time 
      ON games (game_date, game_time)
    `),
    
    // Index for game assignments with status and game date (for workload queries)
    knex.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_assignments_user_date_status 
      ON game_assignments (user_id, status) 
      INCLUDE (game_id)
    `),
    
    // Index for referee availability queries
    knex.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referee_availability_user_date 
      ON referee_availability (user_id, date, is_available)
    `),
    
    // Index for AI suggestions queries
    knex.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_suggestions_status_created 
      ON ai_suggestions (status, created_at DESC)
    `),
    
    // Index for game assignments time-based conflict detection
    knex.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_assignments_conflicts 
      ON game_assignments (user_id, status) 
      INCLUDE (game_id)
    `),
    
    // Composite index for games table filtering
    knex.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_date_location_postal 
      ON games (game_date, postal_code, location)
    `),
    
    // Index for users-referees join (commonly used)
    knex.schema.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referees_user_available 
      ON referees (user_id, is_available)
    `)
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_games_date_time'),
    knex.schema.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_game_assignments_user_date_status'),
    knex.schema.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_referee_availability_user_date'),
    knex.schema.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_ai_suggestions_status_created'),
    knex.schema.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_game_assignments_conflicts'),
    knex.schema.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_games_date_location_postal'),
    knex.schema.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_referees_user_available')
  ]);
};