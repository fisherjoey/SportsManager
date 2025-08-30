/**
 * Simple Games Seed - Creates 200+ games with existing schema
 */

exports.seed = async function(knex) {
  console.log('Seeding games data...');
  
  // Clear existing data
  await knex('game_assignments').del();
  await knex('games').del();
  await knex('teams').del();
  await knex('leagues').del();
  
  // Create sample leagues
  const leagues = await knex('leagues').insert([
    {
      organization: 'CMBA',
      age_group: 'U18',
      gender: 'Boys',
      division: 'Division 1',
      season: '2024-25',
      name: 'U18 Boys D1',
      display_name: 'Under 18 Boys Division 1',
      status: 'active'
    },
    {
      organization: 'CMBA',
      age_group: 'U18',
      gender: 'Girls',
      division: 'Division 1',
      season: '2024-25',
      name: 'U18 Girls D1',
      display_name: 'Under 18 Girls Division 1',
      status: 'active'
    },
    {
      organization: 'CMBA',
      age_group: 'U16',
      gender: 'Boys',
      division: 'Division 1',
      season: '2024-25',
      name: 'U16 Boys D1',
      display_name: 'Under 16 Boys Division 1',
      status: 'active'
    },
    {
      organization: 'CMBA',
      age_group: 'U16',
      gender: 'Girls',
      division: 'Division 1',
      season: '2024-25',
      name: 'U16 Girls D1',
      display_name: 'Under 16 Girls Division 1',
      status: 'active'
    },
    {
      organization: 'CMBA',
      age_group: 'U14',
      gender: 'Boys',
      division: 'Division 1',
      season: '2024-25',
      name: 'U14 Boys D1',
      display_name: 'Under 14 Boys Division 1',
      status: 'active'
    },
    {
      organization: 'CMBA',
      age_group: 'U14',
      gender: 'Girls',
      division: 'Division 1',
      season: '2024-25',
      name: 'U14 Girls D1',
      display_name: 'Under 14 Girls Division 1',
      status: 'active'
    }
  ]).returning('*');
  
  console.log(`Created ${leagues.length} leagues`);
  
  // Create teams for each league
  const teams = [];
  const teamNames = ['Warriors', 'Eagles', 'Thunder', 'Storm', 'Knights', 'Titans', 'Phoenix', 'Dragons'];
  const locations = ['Calgary North', 'Calgary South', 'Calgary East', 'Calgary West', 'Airdrie', 'Okotoks', 'Cochrane', 'Chestermere'];
  
  for (const league of leagues) {
    for (let i = 0; i < 8; i++) {
      teams.push({
        name: `${locations[i]} ${teamNames[i]}`,
        display_name: `${locations[i]} ${teamNames[i]} - ${league.age_group} ${league.gender}`,
        league_id: league.id,
        team_number: `T${league.id}-${i + 1}`,
        contact_email: `team${i + 1}@cmba.ca`,
        contact_phone: '403-555-0100',
        metadata: {
          location: locations[i],
          rank: i + 1
        }
      });
    }
  }
  
  await knex('teams').insert(teams);
  const allTeams = await knex('teams').select('*');
  console.log(`Created ${allTeams.length} teams`);
  
  // Group teams by league for game generation
  const teamsByLeague = {};
  allTeams.forEach(team => {
    if (!teamsByLeague[team.league_id]) {
      teamsByLeague[team.league_id] = [];
    }
    teamsByLeague[team.league_id].push(team);
  });
  
  // Calgary area venues
  const venues = [
    'Genesis Centre',
    'Repsol Sport Centre',
    'MNP Community Centre',
    'Westside Recreation Centre',
    'Cardel Rec South',
    'Vivo Recreation Centre',
    'Village Square Centre',
    'Southland Leisure Centre'
  ];
  
  // Generate games
  const games = [];
  let gameNumber = 1;
  
  // Generate regular season games (November 2024 - March 2025)
  const startDate = new Date('2024-11-01');
  const endDate = new Date('2025-03-31');
  
  // For each league, create round-robin games
  for (const leagueId in teamsByLeague) {
    const leagueTeams = teamsByLeague[leagueId];
    const league = leagues.find(l => l.id === leagueId);
    
    if (!league) {
      console.log(`Warning: League not found for ID ${leagueId}`);
      continue;
    }
    
    // Each team plays each other team twice (home and away)
    for (let i = 0; i < leagueTeams.length; i++) {
      for (let j = i + 1; j < leagueTeams.length; j++) {
        // Game 1: Team i at home
        games.push({
          game_number: `G${String(gameNumber++).padStart(5, '0')}`,
          home_team_id: leagueTeams[i].id,
          away_team_id: leagueTeams[j].id,
          league_id: leagueId,
          division: league.division || 'Division 1',
          game_type: 'Regular'
        });
        
        // Game 2: Team j at home
        games.push({
          game_number: `G${String(gameNumber++).padStart(5, '0')}`,
          home_team_id: leagueTeams[j].id,
          away_team_id: leagueTeams[i].id,
          league_id: leagueId,
          division: league.division || 'Division 1',
          game_type: 'Regular'
        });
      }
    }
  }
  
  console.log(`Generated ${games.length} game matchups`);
  
  // Distribute games across dates and times
  const gameSlots = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    
    // Weekend games
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const times = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30'];
      times.forEach(time => {
        gameSlots.push({
          date: new Date(currentDate),
          time: time
        });
      });
    }
    // Weekday games (fewer)
    else if (dayOfWeek === 2 || dayOfWeek === 4) {
      const times = ['18:00', '19:30'];
      times.forEach(time => {
        gameSlots.push({
          date: new Date(currentDate),
          time: time
        });
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log(`Created ${gameSlots.length} available game slots`);
  
  // Assign games to slots
  const finalGames = [];
  const numGamesToCreate = Math.min(games.length, gameSlots.length, 250); // Cap at 250 games
  
  for (let i = 0; i < numGamesToCreate; i++) {
    const game = games[i];
    const slot = gameSlots[i];
    const venue = venues[i % venues.length];
    
    // Determine refs needed and base wage based on division
    let refsNeeded = 2;
    let baseWage = 40;
    
    // Use simple defaults since we don't have age group in game object
    if (i % 3 === 0) {
      refsNeeded = 1;
      baseWage = 30;
    } else if (i % 3 === 1) {
      refsNeeded = 3;
      baseWage = 50;
    }
    
    // Add wage multiplier for late games
    let wageMultiplier = 1.0;
    if (slot.time >= '19:00') {
      wageMultiplier = 1.2;
    } else if (slot.time <= '09:00') {
      wageMultiplier = 1.15;
    }
    
    finalGames.push({
      ...game,
      date_time: new Date(`${slot.date.toISOString().split('T')[0]}T${slot.time}:00`),
      field: venue,
      refs_needed: refsNeeded,
      base_wage: baseWage,
      wage_multiplier: wageMultiplier,
      metadata: {
        venue: venue,
        status: i < 50 ? 'assigned' : 'unassigned', // First 50 games are assigned
        notes: `Regular season game`
      },
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  // Insert games in batches
  const batchSize = 50;
  for (let i = 0; i < finalGames.length; i += batchSize) {
    const batch = finalGames.slice(i, i + batchSize);
    await knex('games').insert(batch);
    console.log(`Inserted games ${i + 1} to ${Math.min(i + batchSize, finalGames.length)}`);
  }
  
  const totalGames = await knex('games').count('* as count');
  console.log(`✅ Successfully seeded ${totalGames[0].count} games`);
};