exports.up = function(knex) {
  return knex.schema.alterTable('games', function(table) {
    // Make team ID fields NOT NULL (data should be populated by migration 020)
    table.uuid('home_team_id').notNullable().alter();
    table.uuid('away_team_id').notNullable().alter();
    table.uuid('league_id').notNullable().alter();
    
    // Add foreign key constraints
    table.foreign('home_team_id').references('id').inTable('teams').onDelete('CASCADE');
    table.foreign('away_team_id').references('id').inTable('teams').onDelete('CASCADE');
    table.foreign('league_id').references('id').inTable('leagues').onDelete('CASCADE');
  }).then(() => {
    // Remove the old JSON team fields and redundant division/season fields
    // (league now contains this information)
    return knex.schema.alterTable('games', function(table) {
      table.dropColumn('home_team');
      table.dropColumn('away_team');
      table.dropColumn('division');
      table.dropColumn('season');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('games', function(table) {
    // Add back the old fields
    table.json('home_team');
    table.json('away_team');
    table.string('division');
    table.string('season');
  }).then(() => {
    // Remove foreign key constraints and make fields nullable
    return knex.schema.alterTable('games', function(table) {
      table.dropForeign(['home_team_id']);
      table.dropForeign(['away_team_id']);
      table.dropForeign(['league_id']);
      table.uuid('home_team_id').nullable().alter();
      table.uuid('away_team_id').nullable().alter();
      table.uuid('league_id').nullable().alter();
    });
  });
};