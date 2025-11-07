/**
 * Seed 006: Games Season (Sep-Nov 2025)
 * Creates 1000 games with realistic scheduling
 */

const { v4: uuidv4 } = require('uuid');
const { randomElement, randomInt } = require('./utils/seeder');

exports.seed = async function(knex) {
  console.log('🏀 Seeding game schedule (Sep-Nov 2025)...\n');

  const orgId = global.defaultOrgId || (await knex('organizations').first()).id;
  const regions = await knex('regions').where('organization_id', orgId);
  const leagues = global.leagues || (await knex('leagues').where('organization_id', orgId));
  const teams = global.teams || (await knex('teams'));
  const venues = global.venues || (await knex('locations').where('organization_id', orgId));
  const assignors = await knex('users')
    .join('user_roles', 'users.id', 'user_roles.user_id')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('roles.name', 'Assignor')
    .select('users.*');

  // Game scheduling configuration
  const seasonStart = new Date('2025-09-01');
  const seasonEnd = new Date('2025-11-30');

  // Time slots for games
  const weekdaySlots = [
    { hour: 18, minute: 0 },  // 6:00 PM
    { hour: 19, minute: 0 },  // 7:00 PM
    { hour: 20, minute: 0 },  // 8:00 PM
    { hour: 21, minute: 0 }   // 9:00 PM
  ];

  const weekendSlots = [
    { hour: 9, minute: 0 },   // 9:00 AM
    { hour: 10, minute: 30 }, // 10:30 AM
    { hour: 12, minute: 0 },  // 12:00 PM
    { hour: 13, minute: 30 }, // 1:30 PM
    { hour: 15, minute: 0 },  // 3:00 PM
    { hour: 16, minute: 30 }, // 4:30 PM
    { hour: 18, minute: 0 },  // 6:00 PM
    { hour: 19, minute: 30 }  // 7:30 PM
  ];

  const createdGames = [];
  let gameNumber = 1000;

  // Helper: Get random date in season with weighted distribution
  function getRandomGameDate() {
    // 20% September, 40% October, 40% November
    const rand = Math.random();
    let month;
    if (rand < 0.20) {
      month = 8; // September (0-indexed)
    } else if (rand < 0.60) {
      month = 9; // October
    } else {
      month = 10; // November
    }

    const year = 2025;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const day = randomInt(1, daysInMonth);
    return new Date(year, month, day);
  }

  // Helper: Get time slot based on day of week
  function getGameTime(date) {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const slots = isWeekend ? weekendSlots : weekdaySlots;
    const slot = randomElement(slots);

    const gameDate = new Date(date);
    gameDate.setHours(slot.hour, slot.minute, 0, 0);
    return gameDate;
  }

  // Helper: Determine refs needed based on age group
  function getRefsNeeded(ageGroup) {
    if (ageGroup === 'U10' || ageGroup === 'U12') return 2;
    if (ageGroup === 'U14' || ageGroup === 'U16') return 2;
    return 3; // U18 and Adult
  }

  // Helper: Determine required level based on age group
  function getRequiredLevel(ageGroup) {
    const levelMap = {
      'U10': 1,
      'U12': 1,
      'U14': 2,
      'U16': 2,
      'U18': 3,
      'Adult': 3,
      'Masters': 2
    };
    return levelMap[ageGroup] || 2;
  }

  // Helper: Get wage multiplier
  function getWageMultiplier(ageGroup, gameType) {
    let multiplier = 1.0;

    // Age group multipliers
    if (ageGroup === 'U18' || ageGroup === 'Adult') multiplier += 0.2;
    if (ageGroup === 'Masters') multiplier += 0.1;

    // Game type multipliers
    if (gameType === 'playoff') multiplier += 0.3;
    if (gameType === 'championship') multiplier += 0.5;

    return multiplier;
  }

  console.log('  Generating games for each league...\n');

  for (const league of leagues) {
    const leagueTeams = teams.filter(t => t.league_id === league.id);
    if (leagueTeams.length < 2) continue;

    // Calculate games per team (each team plays each other twice)
    const gamesPerTeam = (leagueTeams.length - 1) * 2;
    const totalLeagueGames = (leagueTeams.length * gamesPerTeam) / 2;

    console.log(`  ${league.name}:`);
    console.log(`    Teams: ${leagueTeams.length}, Games: ${Math.floor(totalLeagueGames)}`);

    const createdByAssignor = randomElement(assignors);

    // Generate round-robin schedule
    for (let i = 0; i < leagueTeams.length; i++) {
      for (let j = i + 1; j < leagueTeams.length; j++) {
        // Home and away games
        for (let k = 0; k < 2; k++) {
          const homeTeam = k === 0 ? leagueTeams[i] : leagueTeams[j];
          const awayTeam = k === 0 ? leagueTeams[j] : leagueTeams[i];

          const gameDate = getRandomGameDate();
          const gameDateTime = getGameTime(gameDate);
          const venue = randomElement(venues);
          const refsNeeded = getRefsNeeded(league.age_group);
          const requiredLevel = getRequiredLevel(league.age_group);

          // Determine game type (95% regular, 3% playoff, 2% championship)
          const rand = Math.random();
          let gameType = 'regular';
          if (rand > 0.98) gameType = 'championship';
          else if (rand > 0.95) gameType = 'playoff';

          const wageMultiplier = getWageMultiplier(league.age_group, gameType);

          const [game] = await knex('games')
            .insert({
              id: uuidv4(),
              game_number: `G${String(gameNumber++).padStart(6, '0')}`,
              home_team_id: homeTeam.id,
              away_team_id: awayTeam.id,
              league_id: league.id,
              date_time: gameDateTime,
              field: venue.name,
              division: league.division,
              game_type: gameType,
              refs_needed: refsNeeded,
              required_level: requiredLevel,
              wage_multiplier: wageMultiplier,
              status: 'scheduled',
              location_id: venue.id,
              organization_id: orgId,
              region_id: venue.region_id,
              created_by: createdByAssignor.id,
              metadata: {
                age_group: league.age_group,
                gender: league.gender,
                venue_address: venue.address,
                venue_capacity: venue.capacity
              },
              created_at: new Date(),
              updated_at: new Date()
            })
            .returning('*');

          createdGames.push(game);
        }
      }
    }
  }

  console.log(`\n  Game Statistics:`);

  // Month distribution
  const monthCounts = createdGames.reduce((acc, game) => {
    const month = new Date(game.date_time).toLocaleString('default', { month: 'long' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  console.log(`    Monthly Distribution:`);
  Object.entries(monthCounts).forEach(([month, count]) => {
    console.log(`      • ${month}: ${count} games`);
  });

  // Game type distribution
  const typeCounts = createdGames.reduce((acc, game) => {
    acc[game.game_type] = (acc[game.game_type] || 0) + 1;
    return acc;
  }, {});

  console.log(`    Game Types:`);
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`      • ${type}: ${count} games`);
  });

  // Venue usage
  const venueCounts = createdGames.reduce((acc, game) => {
    const venue = venues.find(v => v.id === game.location_id);
    if (venue) {
      acc[venue.name] = (acc[venue.name] || 0) + 1;
    }
    return acc;
  }, {});

  const topVenues = Object.entries(venueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log(`    Top 5 Venues:`);
  topVenues.forEach(([venue, count]) => {
    console.log(`      • ${venue}: ${count} games`);
  });

  console.log(`\n✅ Created ${createdGames.length} games\n`);

  global.games = createdGames;
};
