exports.up = function(knex) {
  return knex.schema.alterTable('games', function(table) {
    // Add team ID references (nullable initially, will be populated by data migration)
    table.uuid('home_team_id').nullable();
    table.uuid('away_team_id').nullable();
    table.uuid('league_id').nullable();
    
    // Add indexes for performance
    table.index(['home_team_id']);
    table.index(['away_team_id']);
    table.index(['league_id']);
  });
  // Note: Foreign key constraints and NOT NULL constraints will be added 
  // after the data migration (migration 020) populates the team IDs
  // The JSON fields will also be dropped after the data migration
};

exports.down = function(knex) {
  return knex.schema.alterTable('games', function(table) {
    // Add back the old fields
    table.json('home_team');
    table.json('away_team');
    table.string('division');
    table.string('season');
  }).then(() => {
    // Remove the new team ID fields
    return knex.schema.alterTable('games', function(table) {
      table.dropForeign(['home_team_id']);
      table.dropForeign(['away_team_id']);
      table.dropForeign(['league_id']);
      table.dropColumn('home_team_id');
      table.dropColumn('away_team_id');
      table.dropColumn('league_id');
    });
  });
};