/**
 * Comprehensive Games Seed - 200+ games for full season
 * Creates realistic game schedule with various venues, times, and game types
 */

exports.seed = async function(knex) {
  console.log('Seeding comprehensive games data...');
  
  // Clear existing games and assignments
  await knex('game_assignments').del();
  await knex('games').del();
  
  // Get all teams and leagues
  const leagues = await knex('leagues').select('*');
  const teams = await knex('teams').select('*');
  
  // Group teams by league
  const teamsByLeague = {};
  teams.forEach(team => {
    if (!teamsByLeague[team.league_id]) {
      teamsByLeague[team.league_id] = [];
    }
    teamsByLeague[team.league_id].push(team);
  });
  
  // Calgary area venues with postal codes
  const venues = [
    { name: 'Genesis Centre', location: '7555 Falconridge Blvd NE', postal_code: 'T3J 0C9' },
    { name: 'Repsol Sport Centre', location: '2225 Macleod Trail S', postal_code: 'T2G 5B6' },
    { name: 'MNP Community & Sport Centre', location: '2415 54 Ave SW', postal_code: 'T3E 1M4' },
    { name: 'Westside Recreation Centre', location: '2000 69 St SW', postal_code: 'T3H 5W3' },
    { name: 'Cardel Rec South', location: '333 Shawville Blvd SE', postal_code: 'T2Y 4H3' },
    { name: 'Vivo', location: '11950 Country Village Link NE', postal_code: 'T3K 6E3' },
    { name: 'Village Square Leisure Centre', location: '2623 56 St NE', postal_code: 'T1Y 6E7' },
    { name: 'Southland Leisure Centre', location: '2000 Southland Dr SW', postal_code: 'T2V 4T1' },
    { name: 'Shane Homes YMCA', location: '11 Shawbrooke Circle SW', postal_code: 'T2Y 3S8' },
    { name: 'Brookfield Residential YMCA', location: '251 Country Village Rd NE', postal_code: 'T3K 5J7' },
    { name: 'Edge School', location: '33055 Township Rd 250', postal_code: 'T3Z 1L4' },
    { name: 'Father David Bauer Arena', location: '2424 University Dr NW', postal_code: 'T2N 3Y9' },
    { name: 'Mount Royal University', location: '4825 Mount Royal Gate SW', postal_code: 'T3E 6K6' },
    { name: 'SAIT Recreation Centre', location: '1301 16 Ave NW', postal_code: 'T2M 0L4' },
    { name: 'University of Calgary', location: '2500 University Dr NW', postal_code: 'T2N 1N4' }
  ];
  
  // Game time slots for weekends and weekdays
  const weekendTimes = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30', '20:00'];
  const weekdayTimes = ['16:00', '17:30', '19:00', '20:30'];
  
  const games = [];
  
  // Helper function to generate games between teams in a league
  function generateLeagueGames(league, leagueTeams, startDate, endDate) {
    const leagueGames = [];
    
    if (!leagueTeams || leagueTeams.length < 2) {
      return leagueGames;
    }
    
    // Round-robin: each team plays each other team twice (home and away)
    for (let i = 0; i < leagueTeams.length; i++) {
      for (let j = i + 1; j < leagueTeams.length; j++) {
        const homeTeam = leagueTeams[i];
        const awayTeam = leagueTeams[j];
        
        // First game (team i at home)
        leagueGames.push({
          homeTeam,
          awayTeam,
          league
        });
        
        // Return game (team j at home)
        leagueGames.push({
          homeTeam: awayTeam,
          awayTeam: homeTeam,
          league
        });
      }
    }
    
    return leagueGames;
  }
  
  // Generate games for each league
  const allLeagueGames = [];
  leagues.forEach(league => {
    const leagueTeams = teamsByLeague[league.id];
    if (leagueTeams && leagueTeams.length > 1) {
      const leagueGames = generateLeagueGames(league, leagueTeams);
      allLeagueGames.push(...leagueGames.map(g => ({ ...g, leagueId: league.id })));
    }
  });
  
  console.log(`Generated ${allLeagueGames.length} potential games from league structure`);
  
  // Distribute games across the season (Nov 2024 - Mar 2025)
  const seasonStart = new Date('2024-11-01');
  const seasonEnd = new Date('2025-03-31');
  let currentDate = new Date(seasonStart);
  let gameIndex = 0;
  
  // Create actual game records
  while (currentDate <= seasonEnd && gameIndex < allLeagueGames.length) {
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const timeslots = isWeekend ? weekendTimes : weekdayTimes;
    
    // Skip some weekdays for realism
    if (!isWeekend && Math.random() > 0.6) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    
    // Schedule multiple games per day
    const gamesPerDay = isWeekend ? Math.floor(Math.random() * 8) + 4 : Math.floor(Math.random() * 4) + 2;
    
    for (let i = 0; i < gamesPerDay && gameIndex < allLeagueGames.length; i++) {
      const gameData = allLeagueGames[gameIndex];
      const venue = venues[Math.floor(Math.random() * venues.length)];
      const timeSlot = timeslots[Math.floor(Math.random() * timeslots.length)];
      
      // Determine game type based on league level
      let gameType = 'Community';
      if (gameData.league.level === 'Elite' || gameData.league.division.includes('Diamond') || gameData.league.division.includes('Platinum')) {
        gameType = 'Club';
      } else if (gameData.league.division.includes('Tournament')) {
        gameType = 'Tournament';
      }
      
      // Determine pay rate based on level
      let payRate = 35; // Default
      if (gameData.league.level === 'Elite') {
        payRate = 50;
      } else if (gameData.league.level === 'Competitive') {
        payRate = 40;
      } else if (gameData.league.age_group === 'U11' || gameData.league.age_group === 'U12') {
        payRate = 30;
      }
      
      // Add wage multiplier for some games
      let wageMultiplier = 1.0;
      let wageMultiplierReason = null;
      
      // Late games get a multiplier
      if (timeSlot >= '20:00') {
        wageMultiplier = 1.2;
        wageMultiplierReason = 'Late game bonus';
      }
      // Weekend early games get a multiplier
      else if (isWeekend && timeSlot <= '09:00') {
        wageMultiplier = 1.15;
        wageMultiplierReason = 'Early weekend bonus';
      }
      // Tournament games get a multiplier
      else if (gameType === 'Tournament') {
        wageMultiplier = 1.25;
        wageMultiplierReason = 'Tournament premium';
      }
      
      // Determine refs needed based on game level
      let refsNeeded = 2;
      if (gameData.league.level === 'Elite') {
        refsNeeded = 3;
      } else if (gameData.league.age_group === 'U11' || gameData.league.age_group === 'U12') {
        refsNeeded = 1;
      }
      
      // Set status - most games unassigned, some assigned
      const status = Math.random() > 0.3 ? 'unassigned' : 'assigned';
      
      games.push({
        game_number: `G${String(gameIndex + 1).padStart(4, '0')}`,
        home_team_id: gameData.homeTeam.id,
        away_team_id: gameData.awayTeam.id,
        league_id: gameData.leagueId,
        date_time: new Date(`${currentDate.toISOString().split('T')[0]}T${timeSlot}:00`),
        field: venue.name,
        division: gameData.league.division,
        game_type: gameType,
        refs_needed: refsNeeded,
        base_wage: payRate,
        wage_multiplier: wageMultiplier,
        metadata: {
          location: venue.location,
          postal_code: venue.postal_code,
          level: gameData.league.level || 'Community',
          status: status,
          wage_multiplier_reason: wageMultiplierReason,
          notes: `${gameData.league.gender} ${gameData.league.age_group} ${gameData.league.division}`
        },
        created_at: new Date(),
        updated_at: new Date()
      });
      
      gameIndex++;
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Add some special tournament games
  const tournamentDates = [
    new Date('2024-12-07'), // December tournament
    new Date('2025-01-18'), // January tournament
    new Date('2025-02-15'), // February tournament
    new Date('2025-03-08')  // March tournament
  ];
  
  tournamentDates.forEach(tournamentDate => {
    // Add 8-12 tournament games per date
    const numTournamentGames = Math.floor(Math.random() * 5) + 8;
    
    for (let i = 0; i < numTournamentGames && gameIndex < allLeagueGames.length; i++) {
      const gameData = allLeagueGames[gameIndex % allLeagueGames.length];
      const venue = venues[Math.floor(Math.random() * 3)]; // Use first 3 venues for tournaments
      const timeSlot = weekendTimes[i % weekendTimes.length];
      
      games.push({
        game_number: `T${String(gameIndex + 1).padStart(4, '0')}`,
        home_team_id: gameData.homeTeam.id,
        away_team_id: gameData.awayTeam.id,
        league_id: gameData.leagueId,
        date_time: new Date(`${tournamentDate.toISOString().split('T')[0]}T${timeSlot}:00`),
        field: venue.name,
        division: gameData.league.division,
        game_type: 'Tournament',
        refs_needed: 2,
        base_wage: 45,
        wage_multiplier: 1.25,
        metadata: {
          location: venue.location,
          postal_code: venue.postal_code,
          level: 'Competitive',
          status: 'unassigned',
          wage_multiplier_reason: 'Tournament premium',
          notes: `${gameData.league.gender} ${gameData.league.age_group} Tournament`
        },
        created_at: new Date(),
        updated_at: new Date()
      });
      
      gameIndex++;
    }
  });
  
  console.log(`Prepared ${games.length} games for insertion`);
  
  // Insert games in batches to avoid overwhelming the database
  const batchSize = 50;
  for (let i = 0; i < games.length; i += batchSize) {
    const batch = games.slice(i, i + batchSize);
    await knex('games').insert(batch);
    console.log(`Inserted games ${i + 1} to ${Math.min(i + batchSize, games.length)}`);
  }
  
  // Skip assignments for now since positions table doesn't exist
  console.log('Skipping game assignments (positions table not found)');
  
  const totalGames = await knex('games').count('* as count');
  console.log(`✅ Successfully seeded ${totalGames[0].count} games`);
};