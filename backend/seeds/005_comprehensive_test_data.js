const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Clean up existing data
  await knex('game_assignments').del();
  await knex('games').del();
  await knex('referees').del();
  await knex('users').del();
  await knex('referee_levels').del();

  // Create referee levels first
  const levels = await knex('referee_levels').insert([
    {
      name: 'Learning',
      wage_amount: 25.00,
      description: 'Rookie level',
      allowed_divisions: JSON.stringify(['U11-2', 'U11-1', 'U13-3'])
    },
    {
      name: 'Growing',
      wage_amount: 35.00,
      description: 'Intermediate level',
      allowed_divisions: JSON.stringify(['U13-2', 'U13-1', 'U15-3', 'U15-2'])
    },
    {
      name: 'Teaching',
      wage_amount: 45.00,
      description: 'Senior level',
      allowed_divisions: JSON.stringify(['U15-1', 'U18-2', 'U18-1'])
    }
  ]).returning('*');

  // Create admin user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const [adminUser] = await knex('users').insert({
    email: 'admin@sports.com',
    password_hash: hashedPassword,
    role: 'admin'
  }).returning('*');

  // Create referee users
  const refereeUsers = await knex('users').insert([
    {
      email: 'john@referee.com',
      password_hash: hashedPassword,
      role: 'referee'
    },
    {
      email: 'sarah@referee.com',
      password_hash: hashedPassword,
      role: 'referee'
    },
    {
      email: 'mike@referee.com',
      password_hash: hashedPassword,
      role: 'referee'
    },
    {
      email: 'lisa@referee.com',
      password_hash: hashedPassword,
      role: 'referee'
    }
  ]).returning('*');

  // Create referee profiles linked to users
  const referees = await knex('referees').insert([
    {
      user_id: refereeUsers[0].id, // Link to John
      name: 'John Smith',
      email: 'john@referee.com',
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
      user_id: refereeUsers[1].id, // Link to Sarah
      name: 'Sarah Johnson',
      email: 'sarah@referee.com',
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
      user_id: refereeUsers[2].id, // Link to Mike
      name: 'Mike Wilson',
      email: 'mike@referee.com',
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
      user_id: refereeUsers[3].id, // Link to Lisa
      name: 'Lisa Chen',
      email: 'lisa@referee.com',
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

  // Note: Users and referees are linked by email, no direct FK needed

  // Create games with various wage multipliers
  const games = await knex('games').insert([
    // Available games for Learning level (John can pick these up)
    {
      home_team_name: 'Eagles',
      away_team_name: 'Hawks',
      game_date: '2024-12-25',
      game_time: '10:00',
      location: 'Downtown Arena',
      postal_code: 'M5V3A8',
      level: 'Recreational',
      pay_rate: 25,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.5,
      wage_multiplier_reason: 'Holiday game bonus'
    },
    {
      home_team_name: 'Lions',
      away_team_name: 'Tigers',
      game_date: '2024-12-26',
      game_time: '14:00',
      location: 'Community Center',
      postal_code: 'M4W1A8',
      level: 'Recreational',
      pay_rate: 20,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.0,
      wage_multiplier_reason: null
    },
    {
      home_team_name: 'Sharks',
      away_team_name: 'Dolphins',
      game_date: '2024-12-28',
      game_time: '16:00',
      location: 'Riverside Park',
      postal_code: 'M5V3A8',
      level: 'Recreational',
      pay_rate: 25,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.25,
      wage_multiplier_reason: 'Playoff game'
    },
    
    // Competitive level games (Growing level refs)
    {
      home_team_name: 'Thunder',
      away_team_name: 'Lightning',
      game_date: '2024-12-27',
      game_time: '11:00',
      location: 'Sports Complex',
      postal_code: 'M4W1A8',
      level: 'Competitive',
      pay_rate: 35,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.2,
      wage_multiplier_reason: 'Tournament game'
    },
    {
      home_team_name: 'Phoenix',
      away_team_name: 'Dragons',
      game_date: '2024-12-29',
      game_time: '13:00',
      location: 'Athletic Center',
      postal_code: 'M2N5S2',
      level: 'Competitive',
      pay_rate: 30,
      refs_needed: 3,
      status: 'unassigned',
      wage_multiplier: 1.0,
      wage_multiplier_reason: null
    },
    
    // Elite level games (Teaching level refs only)
    {
      home_team_name: 'Warriors',
      away_team_name: 'Knights',
      game_date: '2024-12-30',
      game_time: '18:00',
      location: 'Championship Stadium',
      postal_code: 'M6K2X1',
      level: 'Elite',
      pay_rate: 50,
      refs_needed: 3,
      status: 'unassigned',
      wage_multiplier: 2.0,
      wage_multiplier_reason: 'Championship final'
    },
    {
      home_team_name: 'Titans',
      away_team_name: 'Giants',
      game_date: '2024-12-31',
      game_time: '15:00',
      location: 'Premier Arena',
      postal_code: 'M2N5S2',
      level: 'Elite',
      pay_rate: 45,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.8,
      wage_multiplier_reason: 'New Year special'
    },

    // Some assigned games to show in assignments
    {
      home_team_name: 'Wolves',
      away_team_name: 'Bears',
      game_date: '2024-12-24',
      game_time: '09:00',
      location: 'Morning Field',
      postal_code: 'M5V3A8',
      level: 'Recreational',
      pay_rate: 25,
      refs_needed: 2,
      status: 'assigned',
      wage_multiplier: 1.0,
      wage_multiplier_reason: null
    },
    {
      home_team_name: 'Panthers',
      away_team_name: 'Cougars',
      game_date: '2025-01-05',
      game_time: '14:00',
      location: 'Future Arena',
      postal_code: 'M4W1A8',
      level: 'Competitive',
      pay_rate: 35,
      refs_needed: 2,
      status: 'assigned',
      wage_multiplier: 1.3,
      wage_multiplier_reason: 'Return from holidays'
    }
  ]).returning('*');

  // Create some game assignments
  await knex('game_assignments').insert([
    // John (Learning level) assigned to past game
    {
      game_id: games[7].id, // Wolves vs Bears
      referee_id: referees[0].id, // John
      position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b',
      status: 'accepted',
      assigned_at: new Date('2024-12-20'),
      assigned_by: adminUser.id,
      calculated_wage: 25.00 // No multiplier
    },
    
    // Sarah (Growing level) assigned to future game
    {
      game_id: games[8].id, // Panthers vs Cougars  
      referee_id: referees[1].id, // Sarah
      position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b',
      status: 'pending',
      assigned_at: new Date(),
      assigned_by: adminUser.id,
      calculated_wage: 45.50 // 35 * 1.3 = 45.50
    },
    
    // Mike (Teaching level) assigned to championship game
    {
      game_id: games[5].id, // Warriors vs Knights championship
      referee_id: referees[2].id, // Mike
      position_id: 'e468e96b-4ae8-448d-b0f7-86f688f3402b',
      status: 'accepted',
      assigned_at: new Date(),
      assigned_by: adminUser.id,
      calculated_wage: 100.00 // 50 * 2.0 = 100.00
    }
  ]);

  console.log('Comprehensive test data created:');
  console.log('- 3 referee levels');
  console.log('- 1 admin user');
  console.log('- 4 referee users with profiles');
  console.log('- 9 games with various wage multipliers');
  console.log('- 3 game assignments');
  console.log('');
  console.log('Test users:');
  console.log('Admin: admin@sports.com / password123');
  console.log('John (Learning): john@referee.com / password123');
  console.log('Sarah (Growing): sarah@referee.com / password123');
  console.log('Mike (Teaching): mike@referee.com / password123');
  console.log('Lisa (Growing, unavailable): lisa@referee.com / password123');
};