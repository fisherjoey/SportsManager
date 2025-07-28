const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Clear all tables in dependency order
  await knex('game_assignments').del();
  await knex('games').del();
  await knex('teams').del();
  await knex('leagues').del();
  await knex('users').del();
  await knex('positions').del();
  await knex('referee_levels').del();

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash('password', saltRounds);

  // Insert positions
  const [position1, position2, position3] = await knex('positions').insert([
    { name: 'Referee 1', description: 'Primary Referee' },
    { name: 'Referee 2', description: 'Secondary Referee' },
    { name: 'Referee 3', description: 'Third Referee (Optional)' }
  ]).returning('*');

  // Insert referee levels
  const [recLevel, compLevel, eliteLevel] = await knex('referee_levels').insert([
    { name: 'Recreational', wage_amount: 45.00 },
    { name: 'Competitive', wage_amount: 65.00 },
    { name: 'Elite', wage_amount: 85.00 }
  ]).returning('*');

  // Insert admin user
  const [adminUser] = await knex('users').insert([{
    email: 'admin@test.com',
    password_hash: passwordHash,
    role: 'admin',
    name: 'Test Admin',
    is_available: true,
    max_distance: 25
  }]).returning('*');

  // Insert referee users
  const [referee1, referee2, referee3] = await knex('users').insert([
    {
      email: 'referee1@test.com',
      password_hash: passwordHash,
      role: 'referee',
      name: 'John Doe',
      phone: '(555) 123-4567',
      location: 'Downtown',
      postal_code: '12345',
      max_distance: 25,
      is_available: true,
      referee_level_id: recLevel.id,
      years_experience: 3,
      games_refereed_season: 5,
      evaluation_score: 4.2
    },
    {
      email: 'referee2@test.com',
      password_hash: passwordHash,
      role: 'referee',
      name: 'Jane Smith',
      phone: '(555) 234-5678',
      location: 'Westside',
      postal_code: '54321',
      max_distance: 30,
      is_available: true,
      referee_level_id: compLevel.id,
      years_experience: 7,
      games_refereed_season: 12,
      evaluation_score: 4.7
    },
    {
      email: 'referee3@test.com',
      password_hash: passwordHash,
      role: 'referee',
      name: 'Bob Wilson',
      phone: '(555) 345-6789',
      location: 'Northside',
      postal_code: '67890',
      max_distance: 20,
      is_available: false,
      referee_level_id: eliteLevel.id,
      years_experience: 10,
      games_refereed_season: 8,
      evaluation_score: 4.9
    }
  ]).returning('*');

  // Insert leagues
  const [league1] = await knex('leagues').insert([{
    name: 'Test League',
    organization: 'Test Org',
    age_group: 'Senior',
    gender: 'Mixed',
    division: 'Division 1',
    season: '2024/25'
  }]).returning('*');

  // Insert teams
  const [team1, team2] = await knex('teams').insert([
    { name: 'Team Alpha', location: 'Stadium A', league_id: league1.id },
    { name: 'Team Beta', location: 'Stadium B', league_id: league1.id }
  ]).returning('*');

  // Insert test games
  await knex('games').insert([
    {
      home_team_id: team1.id,
      away_team_id: team2.id,
      game_date: new Date('2024-12-01'),
      game_time: '14:00',
      location: 'Test Stadium',
      level: 'Recreational',
      refs_needed: 2,
      wage_multiplier: 1.0
    },
    {
      home_team_id: team2.id,
      away_team_id: team1.id,
      game_date: new Date('2024-12-15'),
      game_time: '16:00',
      location: 'Test Stadium 2',
      level: 'Competitive',
      refs_needed: 3,
      wage_multiplier: 1.2
    }
  ]);
};