const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Clean up existing data in proper order
  await knex('game_assignments').del();
  await knex('games').del();
  await knex('teams').del();
  await knex('leagues').del();
  await knex('users').del();
  await knex('referee_levels').del();
  await knex('positions').del();

  // Create positions first
  const [position1, position2, position3] = await knex('positions').insert([
    { name: 'Referee 1', description: 'Primary Referee' },
    { name: 'Referee 2', description: 'Secondary Referee' },
    { name: 'Referee 3', description: 'Third Referee (Optional)' }
  ]).returning('*');

  // Create referee levels
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

  // Create referee users
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
      referee_level_id: levels[0].id,
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
      referee_level_id: levels[1].id,
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
      referee_level_id: levels[2].id,
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
      is_available: false,
      wage_per_game: 35.00,
      referee_level_id: levels[1].id,
      years_experience: 4,
      evaluation_score: 19.5
    }
  ]).returning('*');

  // Create leagues
  const leagues = await knex('leagues').insert([
    // Winter 2025 Leagues
    {
      organization: 'Okotoks',
      age_group: 'U11',
      gender: 'Boys',
      division: 'Division 1',
      season: 'Winter 2025',
      level: 'Recreational'
    },
    {
      organization: 'Okotoks',
      age_group: 'U11',
      gender: 'Girls',
      division: 'Division 1',
      season: 'Winter 2025',
      level: 'Recreational'
    },
    {
      organization: 'Calgary',
      age_group: 'U13',
      gender: 'Boys',
      division: 'Division 2',
      season: 'Winter 2025',
      level: 'Competitive'
    },
    {
      organization: 'Okotoks',
      age_group: 'U13',
      gender: 'Girls',
      division: 'Division 1',
      season: 'Winter 2025',
      level: 'Competitive'
    },
    {
      organization: 'Calgary',
      age_group: 'U15',
      gender: 'Boys',
      division: 'Premier',
      season: 'Winter 2025',
      level: 'Elite'
    },
    {
      organization: 'Okotoks',
      age_group: 'U18',
      gender: 'Girls',
      division: 'Elite',
      season: 'Winter 2025',
      level: 'Elite'
    },
    // Fall 2024 League
    {
      organization: 'Airdrie',
      age_group: 'U11',
      gender: 'Boys',
      division: 'Division 2',
      season: 'Fall 2024',
      level: 'Recreational'
    },
    // Spring 2025 League
    {
      organization: 'Calgary',
      age_group: 'U13',
      gender: 'Boys',
      division: 'Division 1',
      season: 'Spring 2025',
      level: 'Competitive'
    }
  ]).returning('*');

  // Create teams for each league
  const teams = await knex('teams').insert([
    // U11 Boys Division 1 - Winter 2025 (Okotoks)
    {
      name: 'Okotoks Eagles',
      league_id: leagues[0].id,
      rank: 1,
      location: 'Okotoks Recreation Center',
      contact_email: 'eagles@okotoks.com',
      contact_phone: '403-555-0201'
    },
    {
      name: 'Calgary Thunder',
      league_id: leagues[0].id,
      rank: 2,
      location: 'Calgary Sports Complex',
      contact_email: 'thunder@calgary.com',
      contact_phone: '403-555-0202'
    },
    
    // U11 Girls Division 1 - Winter 2025 (Okotoks)
    {
      name: 'NW Calgary Lightning',
      league_id: leagues[1].id,
      rank: 1,
      location: 'NW Community Arena',
      contact_email: 'lightning@nwcalgary.com',
      contact_phone: '403-555-0203'
    },
    {
      name: 'Okotoks Flames',
      league_id: leagues[1].id,
      rank: 1,
      location: 'Okotoks Athletic Center',
      contact_email: 'flames@okotoks.com',
      contact_phone: '403-555-0204'
    },
    
    // U13 Boys Division 2 - Winter 2025 (Calgary)
    {
      name: 'Calgary Storm',
      league_id: leagues[2].id,
      rank: 1,
      location: 'Calgary Sports Complex',
      contact_email: 'storm@calgary.com',
      contact_phone: '403-555-0205'
    },
    {
      name: 'Airdrie Wolves',
      league_id: leagues[2].id,
      rank: 1,
      location: 'Airdrie Community Center',
      contact_email: 'wolves@airdrie.com',
      contact_phone: '403-555-0206'
    },
    
    // U13 Girls Division 1 - Winter 2025 (Okotoks)
    {
      name: 'Okotoks Hawks',
      league_id: leagues[3].id,
      rank: 2,
      location: 'Okotoks Athletic Center',
      contact_email: 'hawks@okotoks.com',
      contact_phone: '403-555-0207'
    },
    {
      name: 'Calgary Phoenix',
      league_id: leagues[3].id,
      rank: 3,
      location: 'Calgary Sports Complex',
      contact_email: 'phoenix@calgary.com',
      contact_phone: '403-555-0208'
    },
    
    // U15 Boys Premier - Winter 2025 (Calgary)
    {
      name: 'Calgary Elite',
      league_id: leagues[4].id,
      rank: 1,
      location: 'Calgary Championship Arena',
      contact_email: 'elite@calgary.com',
      contact_phone: '403-555-0209'
    },
    {
      name: 'Edmonton Titans',
      league_id: leagues[4].id,
      rank: 1,
      location: 'Edmonton Sports Centre',
      contact_email: 'titans@edmonton.com',
      contact_phone: '780-555-0210'
    },
    
    // U18 Girls Elite - Winter 2025 (Okotoks)
    {
      name: 'Okotoks Champions',
      league_id: leagues[5].id,
      rank: 1,
      location: 'Regional Championship Center',
      contact_email: 'champions@okotoks.com',
      contact_phone: '403-555-0211'
    },
    {
      name: 'Calgary Stars',
      league_id: leagues[5].id,
      rank: 1,
      location: 'Calgary Championship Arena',
      contact_email: 'stars@calgary.com',
      contact_phone: '403-555-0212'
    },
    
    // Fall 2024 Teams
    {
      name: 'Airdrie Bears',
      league_id: leagues[6].id,
      rank: 2,
      location: 'Airdrie Community Center',
      contact_email: 'bears@airdrie.com',
      contact_phone: '403-555-0213'
    },
    {
      name: 'Okotoks Rangers',
      league_id: leagues[6].id,
      rank: 3,
      location: 'Okotoks Recreation Center',
      contact_email: 'rangers@okotoks.com',
      contact_phone: '403-555-0214'
    },
    
    // Spring 2025 Teams
    {
      name: 'Calgary Metros',
      league_id: leagues[7].id,
      rank: 2,
      location: 'Spring Field Complex',
      contact_email: 'metros@calgary.com',
      contact_phone: '403-555-0215'
    },
    {
      name: 'NW Calgary Rebels',
      league_id: leagues[7].id,
      rank: 1,
      location: 'NW Community Arena',
      contact_email: 'rebels@nwcalgary.com',
      contact_phone: '403-555-0216'
    }
  ]).returning('*');

  // Create games using team IDs
  const games = await knex('games').insert([
    // U11 Boys Games - Winter 2025
    {
      home_team_id: teams[0].id, // Okotoks Eagles
      away_team_id: teams[1].id, // Calgary Thunder
      league_id: leagues[0].id,
      game_date: '2025-01-15',
      game_time: '10:00',
      location: 'Okotoks Recreation Center',
      postal_code: 'T1S2A1',
      level: 'Recreational',
      pay_rate: 25,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.0,
      wage_multiplier_reason: null
    },
    {
      home_team_id: teams[2].id, // NW Calgary Lightning
      away_team_id: teams[3].id, // Okotoks Flames
      league_id: leagues[1].id,
      game_date: '2025-01-16',
      game_time: '14:00',
      location: 'NW Community Arena',
      postal_code: 'T3A5K1',
      level: 'Recreational',
      pay_rate: 25,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.2,
      wage_multiplier_reason: 'Weekend game'
    },
    {
      home_team_id: teams[4].id, // Calgary Storm
      away_team_id: teams[5].id, // Airdrie Wolves
      league_id: leagues[2].id,
      game_date: '2025-01-18',
      game_time: '11:00',
      location: 'Calgary Sports Complex',
      postal_code: 'T2P3M5',
      level: 'Competitive',
      pay_rate: 35,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.3,
      wage_multiplier_reason: 'Top division game'
    },
    {
      home_team_id: teams[6].id, // Okotoks Hawks
      away_team_id: teams[7].id, // Calgary Phoenix
      league_id: leagues[3].id,
      game_date: '2025-01-19',
      game_time: '13:00',
      location: 'Okotoks Athletic Center',
      postal_code: 'T1S2A1',
      level: 'Competitive',
      pay_rate: 30,
      refs_needed: 3,
      status: 'unassigned',
      wage_multiplier: 1.0,
      wage_multiplier_reason: null
    },
    {
      home_team_id: teams[8].id, // Calgary Elite
      away_team_id: teams[9].id, // Edmonton Titans
      league_id: leagues[4].id,
      game_date: '2025-01-20',
      game_time: '18:00',
      location: 'Calgary Championship Arena',
      postal_code: 'T2P3M5',
      level: 'Elite',
      pay_rate: 50,
      refs_needed: 3,
      status: 'unassigned',
      wage_multiplier: 1.8,
      wage_multiplier_reason: 'Premier division'
    },
    {
      home_team_id: teams[10].id, // Okotoks Champions
      away_team_id: teams[11].id, // Calgary Stars
      league_id: leagues[5].id,
      game_date: '2025-01-21',
      game_time: '15:00',
      location: 'Regional Championship Center',
      postal_code: 'T1S2A1',
      level: 'Elite',
      pay_rate: 45,
      refs_needed: 3,
      status: 'unassigned',
      wage_multiplier: 2.0,
      wage_multiplier_reason: 'Championship game'
    },
    // Fall 2024 game
    {
      home_team_id: teams[12].id, // Airdrie Bears
      away_team_id: teams[13].id, // Okotoks Rangers
      league_id: leagues[6].id,
      game_date: '2024-11-15',
      game_time: '09:00',
      location: 'Airdrie Community Center',
      postal_code: 'T4B2A1',
      level: 'Recreational',
      pay_rate: 25,
      refs_needed: 2,
      status: 'assigned',
      wage_multiplier: 1.0,
      wage_multiplier_reason: null
    },
    // Spring 2025 game
    {
      home_team_id: teams[14].id, // Calgary Metros
      away_team_id: teams[15].id, // NW Calgary Rebels
      league_id: leagues[7].id,
      game_date: '2025-04-10',
      game_time: '14:00',
      location: 'Spring Field Complex',
      postal_code: 'T2P3M5',
      level: 'Competitive',
      pay_rate: 35,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.1,
      wage_multiplier_reason: 'Season opener'
    }
  ]).returning('*');

  // Create game assignments
  await knex('game_assignments').insert([
    {
      game_id: games[6].id, // Fall 2024 game
      user_id: refereeUsers[0].id, // John
      position_id: position1.id,
      status: 'accepted',
      assigned_at: new Date('2024-11-10'),
      assigned_by: adminUser.id,
      calculated_wage: 25.00
    },
    {
      game_id: games[7].id, // Spring 2025 game
      user_id: refereeUsers[1].id, // Sarah
      position_id: position1.id,
      status: 'pending',
      assigned_at: new Date(),
      assigned_by: adminUser.id,
      calculated_wage: 38.50
    },
    {
      game_id: games[5].id, // U18 Championship
      user_id: refereeUsers[2].id, // Mike
      position_id: position1.id,
      status: 'accepted',
      assigned_at: new Date(),
      assigned_by: adminUser.id,
      calculated_wage: 90.00
    }
  ]);

  console.log('Leagues and Teams structure created:');
  console.log('- 8 leagues across 3 seasons');
  console.log('- 16 teams across all leagues');
  console.log('- 8 games with proper team references');
  console.log('- Teams can be filtered by league organization/age/gender/division');
  console.log('- Each game references specific teams and their league');
};