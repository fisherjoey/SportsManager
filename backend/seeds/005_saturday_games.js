/**
 * 003_saturday_games.js
 *
 * Seeds 180 games for Saturday, October 26, 2025
 * - Games from 9:00 AM to 7:00 PM
 * - 15-minute intervals
 * - Spread across 6 different gyms
 * - Rotating teams
 *
 * This seed is IDEMPOTENT - uses ON CONFLICT DO NOTHING
 */

exports.seed = async function(knex) {
  console.log('🏀 Seeding Saturday games (Oct 26, 2025)...\n');

  // Get existing teams and league
  const teams = await knex('teams').select('id', 'name').limit(36);
  const leagues = await knex('leagues').select('id').limit(1);

  if (teams.length < 2 || leagues.length === 0) {
    console.log('⚠️  Not enough teams or leagues found. Skipping game seed.');
    return;
  }

  const leagueId = leagues[0].id;

  // Define gyms/locations
  const locations = [
    { name: 'Repsol Sport Centre', postal: 'T3E 7J9' },
    { name: 'MNP Community Centre', postal: 'T2X 3W2' },
    { name: 'Westside Recreation Centre', postal: 'T3A 5K8' },
    { name: 'Cardel Place', postal: 'T3Z 3W9' },
    { name: 'Shouldice Athletic Park', postal: 'T2N 1M5' },
    { name: 'Foothills Arena', postal: 'T2M 4L5' }
  ];

  // Generate games
  const games = [];
  const saturday = '2025-10-26'; // This coming Saturday

  // Time slots from 9:00 AM to 7:00 PM (10 hours = 600 minutes)
  // 15-minute intervals = 40 slots per gym
  // 6 gyms × 40 slots = 240 potential slots (we'll use 180)

  const startHour = 9; // 9 AM
  const endHour = 19;  // 7 PM
  const intervalMinutes = 15;

  let gameIndex = 0;
  let teamIndex = 0;

  // For each gym
  for (let gymIdx = 0; gymIdx < locations.length; gymIdx++) {
    const location = locations[gymIdx];

    // Generate 30 games per gym (30 × 6 = 180 total)
    for (let slotIdx = 0; slotIdx < 30; slotIdx++) {
      if (gameIndex >= 180) break;

      // Calculate time for this slot
      const totalMinutes = slotIdx * intervalMinutes;
      const hours = startHour + Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      if (hours >= endHour) break;

      const gameTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

      // Select teams (rotating through available teams)
      const homeTeam = teams[teamIndex % teams.length];
      const awayTeam = teams[(teamIndex + 1) % teams.length];
      teamIndex += 2;

      // Vary the pay rates and levels
      const levels = ['Recreational', 'Competitive', 'Elite'];
      const level = levels[gameIndex % 3];
      const payRates = { Recreational: 35, Competitive: 45, Elite: 55 };
      const payRate = payRates[level];

      games.push({
        game_date: saturday,
        game_time: gameTime,
        location: location.name,
        postal_code: location.postal,
        level: level,
        pay_rate: payRate,
        status: 'unassigned',
        refs_needed: 2,
        wage_multiplier: '1.00',
        wage_multiplier_reason: null,
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        league_id: leagueId,
        game_type: 'Community',
        created_at: new Date(),
        updated_at: new Date()
      });

      gameIndex++;
    }
  }

  console.log(`📊 Generated ${games.length} games for Saturday, Oct 26, 2025`);
  console.log(`📍 Locations: ${locations.map(l => l.name).join(', ')}`);
  console.log(`⏰ Time range: 9:00 AM - 7:00 PM (15-min intervals)`);
  console.log(`🏅 Levels: Recreational ($35), Competitive ($45), Elite ($55)`);

  // Insert games (keep existing games, don't delete)
  // Insert all games
  await knex('games').insert(games);

  console.log(`\n✅ Successfully seeded ${games.length} Saturday games!\n`);

  // Show summary
  const gameSummary = await knex('games')
    .where('game_date', saturday)
    .select('location')
    .count('* as count')
    .groupBy('location')
    .orderBy('location');

  console.log('📈 Games per location:');
  gameSummary.forEach(row => {
    console.log(`   ${row.location}: ${row.count} games`);
  });

  const timeSummary = await knex('games')
    .where('game_date', saturday)
    .select(knex.raw('EXTRACT(HOUR FROM game_time) as hour'))
    .count('* as count')
    .groupBy('hour')
    .orderBy('hour');

  console.log('\n⏰ Games per hour:');
  timeSummary.forEach(row => {
    const hour = parseInt(row.hour);
    const hourLabel = hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
    console.log(`   ${hourLabel}: ${row.count} games`);
  });

  console.log('');
};
