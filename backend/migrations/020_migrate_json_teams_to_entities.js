exports.up = async function(knex) {
  // This migration handles the transition from JSON team data to proper team entities
  // It should be run after migrations 017, 018, and 019
  
  console.log('Starting migration of JSON team data to entities...');
  
  // First, temporarily make the team_id fields nullable so we can populate them
  await knex.schema.alterTable('games', function(table) {
    table.uuid('home_team_id_temp').nullable();
    table.uuid('away_team_id_temp').nullable();
    table.uuid('league_id_temp').nullable();
  });
  
  // Get all existing games with JSON team data
  const existingGames = await knex('games').select('*');
  
  if (existingGames.length > 0) {
    console.log(`Found ${existingGames.length} games to migrate...`);
    
    // Create a map to track leagues and teams we've created
    const leagueMap = new Map();
    const teamMap = new Map();
    
    for (const game of existingGames) {
      try {
        // Parse the JSON team data
        const homeTeam = typeof game.home_team === 'string' ? 
          JSON.parse(game.home_team) : game.home_team;
        const awayTeam = typeof game.away_team === 'string' ? 
          JSON.parse(game.away_team) : game.away_team;
        
        // Create league key
        const leagueKey = `${homeTeam.organization || 'Unknown'}-${homeTeam.ageGroup || 'U11'}-${homeTeam.gender || 'Boys'}-${game.division || 'Division 1'}-${game.season || 'Winter 2025'}`;
        
        let league;
        if (leagueMap.has(leagueKey)) {
          league = leagueMap.get(leagueKey);
        } else {
          // Create new league
          const [newLeague] = await knex('leagues').insert({
            organization: homeTeam.organization || 'Unknown',
            age_group: homeTeam.ageGroup || 'U11',
            gender: homeTeam.gender || 'Boys',
            division: game.division || 'Division 1',
            season: game.season || 'Winter 2025',
            level: game.level || 'Recreational'
          }).returning('*');
          
          league = newLeague;
          leagueMap.set(leagueKey, league);
          console.log(`Created league: ${leagueKey}`);
        }
        
        // Create or find home team
        const homeTeamKey = `${homeTeam.organization || 'Unknown'}-${league.id}`;
        let homeTeamEntity;
        
        if (teamMap.has(homeTeamKey)) {
          homeTeamEntity = teamMap.get(homeTeamKey);
        } else {
          const [newHomeTeam] = await knex('teams').insert({
            name: `${homeTeam.organization || 'Unknown'} ${homeTeam.ageGroup || 'U11'} ${homeTeam.gender || 'Boys'}`,
            league_id: league.id,
            rank: homeTeam.rank || 1,
            location: game.location || '',
            contact_email: '',
            contact_phone: ''
          }).returning('*');
          
          homeTeamEntity = newHomeTeam;
          teamMap.set(homeTeamKey, homeTeamEntity);
          console.log(`Created team: ${homeTeamEntity.name}`);
        }
        
        // Create or find away team
        const awayTeamKey = `${awayTeam.organization || 'Unknown'}-${league.id}`;
        let awayTeamEntity;
        
        if (teamMap.has(awayTeamKey)) {
          awayTeamEntity = teamMap.get(awayTeamKey);
        } else {
          const [newAwayTeam] = await knex('teams').insert({
            name: `${awayTeam.organization || 'Unknown'} ${awayTeam.ageGroup || 'U11'} ${awayTeam.gender || 'Boys'}`,
            league_id: league.id,
            rank: awayTeam.rank || 1,
            location: game.location || '',
            contact_email: '',
            contact_phone: ''
          }).returning('*');
          
          awayTeamEntity = newAwayTeam;
          teamMap.set(awayTeamKey, awayTeamEntity);
          console.log(`Created team: ${awayTeamEntity.name}`);
        }
        
        // Update the game with the team IDs
        await knex('games')
          .where('id', game.id)
          .update({
            home_team_id_temp: homeTeamEntity.id,
            away_team_id_temp: awayTeamEntity.id,
            league_id_temp: league.id
          });
          
      } catch (error) {
        console.error(`Error migrating game ${game.id}:`, error);
        // Set default values for failed migrations
        await knex('games')
          .where('id', game.id)
          .update({
            home_team_id_temp: null,
            away_team_id_temp: null,
            league_id_temp: null
          });
      }
    }
    
    console.log(`Migration completed. Created ${leagueMap.size} leagues and ${teamMap.size} teams.`);
  }
  
  // Now copy the temp fields to the real fields and make them not null
  await knex.raw(`
    UPDATE games 
    SET home_team_id = home_team_id_temp,
        away_team_id = away_team_id_temp,
        league_id = league_id_temp
    WHERE home_team_id_temp IS NOT NULL 
      AND away_team_id_temp IS NOT NULL 
      AND league_id_temp IS NOT NULL
  `);
  
  // Drop the temp fields
  await knex.schema.alterTable('games', function(table) {
    table.dropColumn('home_team_id_temp');
    table.dropColumn('away_team_id_temp');
    table.dropColumn('league_id_temp');
  });
  
  console.log('JSON team data migration completed successfully!');
};

exports.down = async function(knex) {
  // This would require reconstructing the JSON data from the team/league relationships
  // For now, we'll just log that this is not reversible
  console.log('Warning: This migration is not easily reversible. JSON team data would need to be reconstructed.');
  
  // You could implement reverse migration here if needed by:
  // 1. Reading team and league data
  // 2. Reconstructing JSON objects
  // 3. Updating games with JSON data
  // 4. Removing team/league references
};