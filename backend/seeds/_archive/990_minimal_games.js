/**
 * Minimal games seed - creates sample leagues, teams and games
 * Compatible with current database schema (game_date, game_time columns)
 */

exports.seed = async function(knex) {
  console.log('🏀 Seeding minimal sample data...\n');

  // Clean up existing data
  await knex('game_assignments').del();
  await knex('games').del();
  await knex('teams').del();
  await knex('leagues').del();
  console.log('✓ Cleared existing data\n');

  // Create sample leagues
  console.log('Creating leagues...');
  const leagues = await knex('leagues').insert([
    { organization: 'CMBA', age_group: 'U18', gender: 'Boys', division: 'Division 1', season: '2024-25', level: 'Competitive' },
    { organization: 'CMBA', age_group: 'U18', gender: 'Girls', division: 'Division 1', season: '2024-25', level: 'Competitive' },
    { organization: 'CMBA', age_group: 'U16', gender: 'Boys', division: 'Division 1', season: '2024-25', level: 'Competitive' },
    { organization: 'CMBA', age_group: 'U16', gender: 'Girls', division: 'Division 1', season: '2024-25', level: 'Recreational' },
    { organization: 'CMBA', age_group: 'U14', gender: 'Boys', division: 'Division 1', season: '2024-25', level: 'Recreational' },
    { organization: 'CMBA', age_group: 'U14', gender: 'Girls', division: 'Division 1', season: '2024-25', level: 'Recreational' }
  ]).returning('*');
  console.log(`✓ Created ${leagues.length} leagues\n`);

  // Create teams
  console.log('Creating teams...');
  const teamNames = ['Warriors', 'Eagles', 'Thunder', 'Storm', 'Knights', 'Titans', 'Phoenix', 'Dragons'];
  const locations = ['Calgary North', 'Calgary South', 'Calgary East', 'Calgary West', 'Airdrie', 'Okotoks', 'Cochrane', 'Chestermere'];

  const teams = [];
  for (const league of leagues) {
    for (let i = 0; i < 6; i++) { // 6 teams per league
      teams.push({
        name: `${locations[i]} ${teamNames[i]}`,
        location: locations[i],
        league_id: league.id,
        rank: i + 1,
        contact_email: `team${i + 1}@cmba.ca`,
        contact_phone: '403-555-0100'
      });
    }
  }

  await knex('teams').insert(teams);
  const allTeams = await knex('teams').select('*');
  console.log(`✓ Created ${allTeams.length} teams\n`);

  // Group teams by league
  const teamsByLeague = {};
  allTeams.forEach(team => {
    if (!teamsByLeague[team.league_id]) {
      teamsByLeague[team.league_id] = [];
    }
    teamsByLeague[team.league_id].push(team);
  });

  // Create games - each team plays every other team in their league twice
  console.log('Creating games...');
  const venues = [
    'Genesis Centre',
    'Repsol Sport Centre',
    'MNP Community Centre',
    'Westside Recreation Centre',
    'Cardel Rec South',
    'Vivo Recreation Centre'
  ];

  const games = [];
  let gameCounter = 1;

  // Date range: February - April 2025
  const gameDate = new Date('2025-02-01');

  for (const leagueId in teamsByLeague) {
    const leagueTeams = teamsByLeague[leagueId];

    // Round robin - each team plays each other twice
    for (let i = 0; i < leagueTeams.length; i++) {
      for (let j = i + 1; j < leagueTeams.length; j++) {
        // Game 1: Team i at home
        games.push({
          home_team_id: leagueTeams[i].id,
          away_team_id: leagueTeams[j].id,
          league_id: leagueId,
          game_date: new Date(gameDate.getTime() + (gameCounter * 86400000 * 2)).toISOString().split('T')[0], // Every 2 days
          game_time: gameCounter % 2 === 0 ? '18:00' : '19:30',
          location: venues[gameCounter % venues.length],
          postal_code: 'T2P 0A8',
          level: 'Recreational',
          pay_rate: 45.00,
          refs_needed: 2,
          status: 'unassigned',
          wage_multiplier: 1.0,
          game_type: 'Community'
        });

        // Game 2: Team j at home
        games.push({
          home_team_id: leagueTeams[j].id,
          away_team_id: leagueTeams[i].id,
          league_id: leagueId,
          game_date: new Date(gameDate.getTime() + ((gameCounter + 1) * 86400000 * 2)).toISOString().split('T')[0],
          game_time: (gameCounter + 1) % 2 === 0 ? '18:00' : '19:30',
          location: venues[(gameCounter + 1) % venues.length],
          postal_code: 'T2P 0A8',
          level: 'Recreational',
          pay_rate: 45.00,
          refs_needed: 2,
          status: 'unassigned',
          wage_multiplier: 1.0,
          game_type: 'Community'
        });

        gameCounter += 2;
      }
    }
  }

  // Insert games in batches
  const batchSize = 50;
  for (let i = 0; i < games.length; i += batchSize) {
    const batch = games.slice(i, i + batchSize);
    await knex('games').insert(batch);
    console.log(`  Inserted games ${i + 1} to ${Math.min(i + batchSize, games.length)}`);
  }

  const totalGames = await knex('games').count('* as count');
  console.log(`\n✅ Successfully seeded ${totalGames[0].count} games!\n`);
};
