exports.up = function(knex) {
  return knex.schema.alterTable('games', function(table) {
    // Add new JSON fields for structured team data
    table.json('home_team');
    table.json('away_team');
    
    // Add division and season fields
    table.string('division').notNullable().defaultTo('');
    table.string('season').notNullable().defaultTo('');
    
    // Add indexes for new fields
    table.index(['division']);
    table.index(['season']);
  }).then(() => {
    // Migrate existing data from string fields to JSON structure
    return knex('games').select('*').then(games => {
      const updates = games.map(game => {
        // Convert simple team names to structured format
        // For existing data, we'll make assumptions about organization and age
        const homeTeam = {
          organization: game.home_team_name.includes('Calgary') ? 'Calgary' : 
                       game.home_team_name.includes('Okotoks') ? 'Okotoks' : 'Unknown',
          ageGroup: 'U11', // Default assumption
          gender: 'Boys', // Default assumption  
          rank: 1
        };
        
        const awayTeam = {
          organization: game.away_team_name.includes('Calgary') ? 'Calgary' :
                       game.away_team_name.includes('Okotoks') ? 'Okotoks' : 'Unknown', 
          ageGroup: 'U11', // Default assumption
          gender: 'Boys', // Default assumption
          rank: 1
        };
        
        // Set default division and season based on level and date
        const division = game.level === 'Recreational' ? 'U11 Division 1' :
                        game.level === 'Competitive' ? 'U13 Division 1' : 'U15 Premier';
        const gameDate = new Date(game.game_date);
        const season = gameDate.getFullYear() >= 2025 ? 'Winter 2025' : 'Fall 2024';
        
        return knex('games')
          .where('id', game.id)
          .update({
            home_team: JSON.stringify(homeTeam),
            away_team: JSON.stringify(awayTeam),
            division: division,
            season: season
          });
      });
      
      return Promise.all(updates);
    });
  }).then(() => {
    // After data migration, drop the old string fields
    return knex.schema.alterTable('games', function(table) {
      table.dropColumn('home_team_name');
      table.dropColumn('away_team_name');
      table.dropColumn('home_team_id'); // Also remove unused team_id references
      table.dropColumn('away_team_id');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('games', function(table) {
    // Add back the old string fields
    table.string('home_team_name');
    table.string('away_team_name');
    table.uuid('home_team_id');
    table.uuid('away_team_id');
  }).then(() => {
    // Migrate data back from JSON to strings
    return knex('games').select('*').then(games => {
      const updates = games.map(game => {
        let homeTeamName = 'Unknown Team';
        let awayTeamName = 'Unknown Team';
        
        try {
          const homeTeam = JSON.parse(game.home_team);
          const awayTeam = JSON.parse(game.away_team);
          homeTeamName = `${homeTeam.organization} ${homeTeam.ageGroup} ${homeTeam.gender} ${homeTeam.rank}`;
          awayTeamName = `${awayTeam.organization} ${awayTeam.ageGroup} ${awayTeam.gender} ${awayTeam.rank}`;
        } catch (e) {
          // Keep default values if JSON parsing fails
        }
        
        return knex('games')
          .where('id', game.id)
          .update({
            home_team_name: homeTeamName,
            away_team_name: awayTeamName
          });
      });
      
      return Promise.all(updates);
    });
  }).then(() => {
    // Drop the new fields
    return knex.schema.alterTable('games', function(table) {
      table.dropColumn('home_team');
      table.dropColumn('away_team');
      table.dropColumn('division');
      table.dropColumn('season');
    });
  });
};