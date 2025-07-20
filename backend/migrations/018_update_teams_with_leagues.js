exports.up = function(knex) {
  return knex.schema.alterTable('teams', function(table) {
    // Add league reference
    table.uuid('league_id').notNullable();
    table.foreign('league_id').references('id').inTable('leagues').onDelete('CASCADE');
    
    // Add team ranking within their league
    table.integer('rank').notNullable().defaultTo(1);
    
    // Add indexes
    table.index(['league_id']);
    table.index(['league_id', 'rank']);
    
    // Unique constraint: team name must be unique within a league
    table.unique(['league_id', 'name']);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('teams', function(table) {
    table.dropForeign(['league_id']);
    table.dropColumn('league_id');
    table.dropColumn('rank');
  });
};