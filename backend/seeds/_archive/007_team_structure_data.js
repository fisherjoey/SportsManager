const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Clean up existing data
  await knex('game_assignments').del();
  await knex('games').del();
  await knex('users').del();
  await knex('referee_levels').del();

  // Create referee levels first
  const levels = await knex('referee_levels').insert([
    {
      name: 'Learning',
      wage_amount: 25.00,
      description: 'Rookie level',
      allowed_divisions: JSON.stringify(['Recreational'])
    },
    {
      name: 'Growing',
      wage_amount: 35.00,
      description: 'Intermediate level',
      allowed_divisions: JSON.stringify(['Recreational', 'Competitive'])
    },
    {
      name: 'Teaching',
      wage_amount: 45.00,
      description: 'Senior level',
      allowed_divisions: JSON.stringify(['Recreational', 'Competitive', 'Elite'])
    }
  ]).returning('*');

  // Create admin user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const [adminUser] = await knex('users').insert({
    email: 'admin@sports.com',
    password_hash: hashedPassword,
    role: 'admin',
    name: 'Admin User'
  }).returning('*');

  // Create referee users with referee data
  const refereeUsers = await knex('users').insert([
    {
      email: 'john@referee.com',
      password_hash: hashedPassword,
      role: 'referee',
      name: 'John Smith',
      phone: '555-0101',
      location: 'Downtown',
      postal_code: 'M5V3A8',
      max_distance: 25,
      is_available: true,
      wage_per_game: 25.00,
      referee_level_id: levels[0].id, // Learning level
      years_experience: 1,
      evaluation_score: 15.5
    },
    {
      email: 'sarah@referee.com',
      password_hash: hashedPassword,
      role: 'referee',
      name: 'Sarah Johnson',
      phone: '555-0102',
      location: 'Midtown',
      postal_code: 'M4W1A8',
      max_distance: 30,
      is_available: true,
      wage_per_game: 35.00,
      referee_level_id: levels[1].id, // Growing level
      years_experience: 3,
      evaluation_score: 18.0
    },
    {
      email: 'mike@referee.com',
      password_hash: hashedPassword,
      role: 'referee',
      name: 'Mike Wilson',
      phone: '555-0103',
      location: 'Uptown',
      postal_code: 'M2N5S2',
      max_distance: 35,
      is_available: true,
      wage_per_game: 45.00,
      referee_level_id: levels[2].id, // Teaching level
      years_experience: 7,
      evaluation_score: 22.0
    },
    {
      email: 'lisa@referee.com',
      password_hash: hashedPassword,
      role: 'referee',
      name: 'Lisa Chen',
      phone: '555-0104',
      location: 'Westside',
      postal_code: 'M6K2X1',
      max_distance: 20,
      is_available: false, // Not available
      wage_per_game: 35.00,
      referee_level_id: levels[1].id, // Growing level
      years_experience: 4,
      evaluation_score: 19.5
    }
  ]).returning('*');

  // Create games with structured team data
  const games = await knex('games').insert([
    // U11 Recreational Games - Winter 2025
    {
      home_team: JSON.stringify({
        organization: 'Okotoks',
        ageGroup: 'U11',
        gender: 'Boys',
        rank: 1
      }),
      away_team: JSON.stringify({
        organization: 'Calgary',
        ageGroup: 'U11', 
        gender: 'Boys',
        rank: 2
      }),
      game_date: '2025-01-15',
      game_time: '10:00',
      location: 'Okotoks Recreation Center',
      postal_code: 'T1S2A1',
      level: 'Recreational',
      division: 'U11 Division 1',
      season: 'Winter 2025',
      pay_rate: 25,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.0,
      wage_multiplier_reason: null
    },
    {
      home_team: JSON.stringify({
        organization: 'NW Calgary',
        ageGroup: 'U11',
        gender: 'Girls',
        rank: 1
      }),
      away_team: JSON.stringify({
        organization: 'Okotoks',
        ageGroup: 'U11',
        gender: 'Girls', 
        rank: 1
      }),
      game_date: '2025-01-16',
      game_time: '14:00',
      location: 'NW Community Arena',
      postal_code: 'T3A5K1',
      level: 'Recreational',
      division: 'U11 Division 1',
      season: 'Winter 2025',
      pay_rate: 25,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.2,
      wage_multiplier_reason: 'Weekend game'
    },

    // U13 Competitive Games - Winter 2025
    {
      home_team: JSON.stringify({
        organization: 'Calgary',
        ageGroup: 'U13',
        gender: 'Boys',
        rank: 1
      }),
      away_team: JSON.stringify({
        organization: 'Airdrie',
        ageGroup: 'U13',
        gender: 'Boys',
        rank: 1
      }),
      game_date: '2025-01-18',
      game_time: '11:00',
      location: 'Calgary Sports Complex',
      postal_code: 'T2P3M5',
      level: 'Competitive',
      division: 'U13 Division 2',
      season: 'Winter 2025',
      pay_rate: 35,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.3,
      wage_multiplier_reason: 'Top division game'
    },
    {
      home_team: JSON.stringify({
        organization: 'Okotoks',
        ageGroup: 'U13',
        gender: 'Girls',
        rank: 2
      }),
      away_team: JSON.stringify({
        organization: 'Calgary',
        ageGroup: 'U13',
        gender: 'Girls',
        rank: 3
      }),
      game_date: '2025-01-19',
      game_time: '13:00',
      location: 'Okotoks Athletic Center',
      postal_code: 'T1S2A1',
      level: 'Competitive',
      division: 'U13 Division 1',
      season: 'Winter 2025',
      pay_rate: 30,
      refs_needed: 3,
      status: 'unassigned',
      wage_multiplier: 1.0,
      wage_multiplier_reason: null
    },

    // U15 Elite Games - Winter 2025
    {
      home_team: JSON.stringify({
        organization: 'Calgary',
        ageGroup: 'U15',
        gender: 'Boys',
        rank: 1
      }),
      away_team: JSON.stringify({
        organization: 'Edmonton',
        ageGroup: 'U15',
        gender: 'Boys',
        rank: 1
      }),
      game_date: '2025-01-20',
      game_time: '18:00',
      location: 'Calgary Championship Arena',
      postal_code: 'T2P3M5',
      level: 'Elite',
      division: 'U15 Premier',
      season: 'Winter 2025',
      pay_rate: 50,
      refs_needed: 3,
      status: 'unassigned',
      wage_multiplier: 1.8,
      wage_multiplier_reason: 'Premier division'
    },

    // U18 Elite Games - Winter 2025
    {
      home_team: JSON.stringify({
        organization: 'Okotoks',
        ageGroup: 'U18',
        gender: 'Girls',
        rank: 1
      }),
      away_team: JSON.stringify({
        organization: 'Calgary',
        ageGroup: 'U18',
        gender: 'Girls',
        rank: 1
      }),
      game_date: '2025-01-21',
      game_time: '15:00',
      location: 'Regional Championship Center',
      postal_code: 'T1S2A1',
      level: 'Elite',
      division: 'U18 Elite',
      season: 'Winter 2025',
      pay_rate: 45,
      refs_needed: 3,
      status: 'unassigned',
      wage_multiplier: 2.0,
      wage_multiplier_reason: 'Championship game'
    },

    // Some Fall 2024 games (historical)
    {
      home_team: JSON.stringify({
        organization: 'Airdrie',
        ageGroup: 'U11',
        gender: 'Boys',
        rank: 2
      }),
      away_team: JSON.stringify({
        organization: 'Okotoks',
        ageGroup: 'U11',
        gender: 'Boys',
        rank: 3
      }),
      game_date: '2024-11-15',
      game_time: '09:00',
      location: 'Airdrie Community Center',
      postal_code: 'T4B2A1',
      level: 'Recreational',
      division: 'U11 Division 2',
      season: 'Fall 2024',
      pay_rate: 25,
      refs_needed: 2,
      status: 'assigned',
      wage_multiplier: 1.0,
      wage_multiplier_reason: null
    },

    // Spring 2025 games (future season)
    {
      home_team: JSON.stringify({
        organization: 'Calgary',
        ageGroup: 'U13',
        gender: 'Boys',
        rank: 2
      }),
      away_team: JSON.stringify({
        organization: 'NW Calgary',
        ageGroup: 'U13',
        gender: 'Boys',
        rank: 1
      }),
      game_date: '2025-04-10',
      game_time: '14:00',
      location: 'Spring Field Complex',
      postal_code: 'T2P3M5',
      level: 'Competitive',
      division: 'U13 Division 1',
      season: 'Spring 2025',
      pay_rate: 35,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.1,
      wage_multiplier_reason: 'Season opener'
    }
  ]).returning('*');

  // Create some game assignments using user_id
  await knex('game_assignments').insert([
    // John (Learning level) assigned to past game
    {
      game_id: games[6].id, // Fall 2024 game
      user_id: refereeUsers[0].id, // John
      position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b',
      status: 'accepted',
      assigned_at: new Date('2024-11-10'),
      assigned_by: adminUser.id,
      calculated_wage: 25.00 // No multiplier
    },
    
    // Sarah (Growing level) assigned to future game
    {
      game_id: games[7].id, // Spring 2025 game
      user_id: refereeUsers[1].id, // Sarah
      position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b',
      status: 'pending',
      assigned_at: new Date(),
      assigned_by: adminUser.id,
      calculated_wage: 38.50 // 35 * 1.1 = 38.50
    },
    
    // Mike (Teaching level) assigned to championship game
    {
      game_id: games[5].id, // U18 Championship
      user_id: refereeUsers[2].id, // Mike
      position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b',
      status: 'accepted',
      assigned_at: new Date(),
      assigned_by: adminUser.id,
      calculated_wage: 90.00 // 45 * 2.0 = 90.00
    }
  ]);

  console.log('Team structure test data created:');
  console.log('- 3 referee levels');
  console.log('- 1 admin user');
  console.log('- 4 referee users');
  console.log('- 8 games with structured team data');
  console.log('- Teams from: Okotoks, Calgary, NW Calgary, Airdrie, Edmonton');
  console.log('- Age groups: U11, U13, U15, U18');
  console.log('- Genders: Boys, Girls');
  console.log('- Divisions: U11 Division 1/2, U13 Division 1/2, U15 Premier, U18 Elite');
  console.log('- Seasons: Fall 2024, Winter 2025, Spring 2025');
  console.log('- 3 game assignments');
  console.log('');
  console.log('Test users:');
  console.log('Admin: admin@sports.com / password123');
  console.log('John (Learning): john@referee.com / password123');
  console.log('Sarah (Growing): sarah@referee.com / password123');
  console.log('Mike (Teaching): mike@referee.com / password123');
  console.log('Lisa (Growing, unavailable): lisa@referee.com / password123');
};