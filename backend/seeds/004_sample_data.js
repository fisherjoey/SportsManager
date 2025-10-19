/**
 * 004_sample_data.js
 *
 * OPTIONAL SEED - For development and testing
 *
 * Seeds sample leagues, teams, and games for development and testing:
 * - 6 leagues (U14, U16, U18 Boys/Girls)
 * - 36 teams (6 teams per league)
 * - ~270 games (round-robin schedule - each team plays every other team twice)
 *
 * This seed CLEARS existing game data - not fully idempotent.
 *
 * NOTE: Requires locations to be seeded first (003_sample_locations.js)
 */

exports.seed = async function(knex) {
  console.log('🏀 Seeding sample leagues, teams, and games...\n');

  // ============================================================================
  // STEP 1: Clear existing game data (in correct order to avoid FK violations)
  // ============================================================================
  console.log('  Clearing existing game data...');
  await knex('game_assignments').del();
  await knex('games').del();
  await knex('teams').del();
  await knex('leagues').del();
  console.log('  ✓ Cleared game data\n');

  // ============================================================================
  // STEP 2: Create sample leagues
  // ============================================================================
  console.log('  Creating leagues...');

  const leagueData = [
    { organization: 'CMBA', age_group: 'U18', gender: 'Boys', division: 'Division 1', season: '2024-25', level: 'Competitive' },
    { organization: 'CMBA', age_group: 'U18', gender: 'Girls', division: 'Division 1', season: '2024-25', level: 'Competitive' },
    { organization: 'CMBA', age_group: 'U16', gender: 'Boys', division: 'Division 1', season: '2024-25', level: 'Competitive' },
    { organization: 'CMBA', age_group: 'U16', gender: 'Girls', division: 'Division 1', season: '2024-25', level: 'Recreational' },
    { organization: 'CMBA', age_group: 'U14', gender: 'Boys', division: 'Division 1', season: '2024-25', level: 'Recreational' },
    { organization: 'CMBA', age_group: 'U14', gender: 'Girls', division: 'Division 1', season: '2024-25', level: 'Recreational' }
  ];

  const leagues = await knex('leagues').insert(leagueData).returning('*');
  console.log(`  ✓ Created ${leagues.length} leagues\n`);

  // ============================================================================
  // STEP 3: Create teams
  // ============================================================================
  console.log('  Creating teams...');

  const teamNames = ['Warriors', 'Eagles', 'Thunder', 'Storm', 'Knights', 'Titans', 'Phoenix', 'Dragons'];
  const teamLocations = [
    'Calgary North',
    'Calgary South',
    'Calgary East',
    'Calgary West',
    'Airdrie',
    'Okotoks',
    'Cochrane',
    'Chestermere'
  ];

  const teams = [];
  for (const league of leagues) {
    for (let i = 0; i < 6; i++) { // 6 teams per league
      teams.push({
        name: `${teamLocations[i]} ${teamNames[i]}`,
        location: teamLocations[i],
        league_id: league.id,
        rank: i + 1,
        contact_email: `team${i + 1}@cmba.ca`,
        contact_phone: '403-555-0100'
      });
    }
  }

  await knex('teams').insert(teams);
  const allTeams = await knex('teams').select('*');
  console.log(`  ✓ Created ${allTeams.length} teams (${teams.length / leagues.length} per league)\n`);

  // ============================================================================
  // STEP 4: Group teams by league for game creation
  // ============================================================================
  const teamsByLeague = {};
  allTeams.forEach(team => {
    if (!teamsByLeague[team.league_id]) {
      teamsByLeague[team.league_id] = [];
    }
    teamsByLeague[team.league_id].push(team);
  });

  // ============================================================================
  // STEP 5: Create games - round robin schedule
  // ============================================================================
  console.log('  Creating games...');

  // Get location names from database
  const locations = await knex('locations').select('name').limit(6);
  const venueNames = locations.map(loc => loc.name);

  const games = [];
  let gameCounter = 1;

  // Date range: February - April 2025
  const startDate = new Date('2025-02-01');

  for (const leagueId in teamsByLeague) {
    const leagueTeams = teamsByLeague[leagueId];

    // Round robin - each team plays each other twice (home and away)
    for (let i = 0; i < leagueTeams.length; i++) {
      for (let j = i + 1; j < leagueTeams.length; j++) {
        // Game 1: Team i at home
        games.push({
          home_team_id: leagueTeams[i].id,
          away_team_id: leagueTeams[j].id,
          league_id: leagueId,
          game_date: new Date(startDate.getTime() + (gameCounter * 86400000 * 2)).toISOString().split('T')[0], // Every 2 days
          game_time: gameCounter % 2 === 0 ? '18:00' : '19:30',
          location: venueNames[gameCounter % venueNames.length] || 'Genesis Centre',
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
          game_date: new Date(startDate.getTime() + ((gameCounter + 1) * 86400000 * 2)).toISOString().split('T')[0],
          game_time: (gameCounter + 1) % 2 === 0 ? '18:00' : '19:30',
          location: venueNames[(gameCounter + 1) % venueNames.length] || 'Repsol Sport Centre',
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

  // ============================================================================
  // STEP 6: Insert games in batches for better performance
  // ============================================================================
  const batchSize = 50;
  let insertedCount = 0;

  for (let i = 0; i < games.length; i += batchSize) {
    const batch = games.slice(i, i + batchSize);
    await knex('games').insert(batch);
    insertedCount += batch.length;
    console.log(`  - Inserted games ${i + 1} to ${Math.min(i + batchSize, games.length)}`);
  }

  console.log(`  ✓ Created ${insertedCount} games total\n`);

  // ============================================================================
  // Summary
  // ============================================================================
  const totalGames = await knex('games').count('* as count');
  const totalTeams = await knex('teams').count('* as count');
  const totalLeagues = await knex('leagues').count('* as count');

  console.log('✅ Sample data seeded successfully!\n');
  console.log('Summary:');
  console.log(`  - ${totalLeagues[0].count} leagues created`);
  console.log(`  - ${totalTeams[0].count} teams created`);
  console.log(`  - ${totalGames[0].count} games created`);
  console.log();
  console.log('Game Schedule:');
  console.log(`  - Season: 2024-25`);
  console.log(`  - Date range: February 1 - April 2025`);
  console.log(`  - Game times: 6:00 PM and 7:30 PM`);
  console.log(`  - Format: Round-robin (each team plays every other team twice)`);
  console.log();
};
