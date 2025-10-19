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

  // Create referee levels - Updated for basketball
  const levels = await knex('referee_levels').insert([
    {
      name: 'Rookie',
      wage_amount: 30.00,
      description: 'New referee with basic training',
      allowed_divisions: JSON.stringify(['Recreational', 'REC'])
    },
    {
      name: 'Junior',
      wage_amount: 45.00,
      description: 'Developing referee with 1-2 years experience',
      allowed_divisions: JSON.stringify(['Recreational', 'REC', 'Regular'])
    },
    {
      name: 'Senior',
      wage_amount: 75.00,
      description: 'Experienced referee capable of all levels',
      allowed_divisions: JSON.stringify(['Recreational', 'REC', 'Regular', 'Club', 'Premium'])
    }
  ]).returning('*');

  // Create admin user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const [adminUser] = await knex('users').insert({
    email: 'admin@cmba.ca',
    password_hash: hashedPassword,
    role: 'admin',
    name: 'CMBA Admin'
  }).returning('*');

  // Create referee users with Calgary postal codes
  const refereeUsers = await knex('users').insert([
    {
      email: 'james.smith@referee.ca',
      password_hash: hashedPassword,
      role: 'referee',
      name: 'James Smith',
      phone: '403-555-0101',
      location: 'Calgary NW',
      postal_code: 'T3A5K1',
      max_distance: 25,
      is_available: true,
      wage_per_game: 30.00,
      referee_level_id: levels[0].id,
      years_experience: 1,
      evaluation_score: 16.0
    },
    {
      email: 'sarah.johnson@referee.ca',
      password_hash: hashedPassword,
      role: 'referee',
      name: 'Sarah Johnson',
      phone: '403-555-0102',
      location: 'Calgary SW',
      postal_code: 'T2V4K9',
      max_distance: 30,
      is_available: true,
      wage_per_game: 45.00,
      referee_level_id: levels[1].id,
      years_experience: 3,
      evaluation_score: 18.5
    },
    {
      email: 'mike.chen@referee.ca',
      password_hash: hashedPassword,
      role: 'referee',
      name: 'Mike Chen',
      phone: '403-555-0103',
      location: 'Calgary SE',
      postal_code: 'T2J6R4',
      max_distance: 35,
      is_available: true,
      wage_per_game: 75.00,
      referee_level_id: levels[2].id,
      years_experience: 8,
      evaluation_score: 22.0
    },
    {
      email: 'lisa.martinez@referee.ca',
      password_hash: hashedPassword,
      role: 'referee',
      name: 'Lisa Martinez',
      phone: '403-555-0104',
      location: 'Calgary NE',
      postal_code: 'T1Y7H2',
      max_distance: 25,
      is_available: true,
      wage_per_game: 75.00,
      referee_level_id: levels[2].id,
      years_experience: 6,
      evaluation_score: 20.5
    },
    {
      email: 'david.wilson@referee.ca',
      password_hash: hashedPassword,
      role: 'referee',
      name: 'David Wilson',
      phone: '403-555-0105',
      location: 'Airdrie',
      postal_code: 'T4B2K3',
      max_distance: 30,
      is_available: true,
      wage_per_game: 45.00,
      referee_level_id: levels[1].id,
      years_experience: 4,
      evaluation_score: 19.0
    },
    {
      email: 'jennifer.brown@referee.ca',
      password_hash: hashedPassword,
      role: 'referee',
      name: 'Jennifer Brown',
      phone: '403-555-0106',
      location: 'Okotoks',
      postal_code: 'T1S1A1',
      max_distance: 35,
      is_available: false,
      wage_per_game: 30.00,
      referee_level_id: levels[0].id,
      years_experience: 1,
      evaluation_score: 15.5
    }
  ]).returning('*');

  // Create CMBA League Structure - 2024-25 Season
  const leagues = await knex('leagues').insert([
    // Premium Leagues
    { organization: 'CMBA', age_group: 'U13', gender: 'Boys', division: 'Diamond League', season: '2024-25', level: 'Elite' },
    { organization: 'CMBA', age_group: 'U18', gender: 'Girls', division: 'Diamond Prep League', season: '2024-25', level: 'Elite' },
    { organization: 'CMBA', age_group: 'U18', gender: 'Boys', division: 'Platinum League', season: '2024-25', level: 'Elite' },
    
    // Boys U11 Regular Season
    { organization: 'CMBA', age_group: 'U11', gender: 'Boys', division: 'Division 1', season: '2024-25', level: 'Competitive' },
    { organization: 'CMBA', age_group: 'U11', gender: 'Boys', division: 'Division 2', season: '2024-25', level: 'Competitive' },
    { organization: 'CMBA', age_group: 'U11', gender: 'Boys', division: 'Division 5', season: '2024-25', level: 'Recreational' },
    
    // Boys U13 Regular Season
    { organization: 'CMBA', age_group: 'U13', gender: 'Boys', division: 'Division 1', season: '2024-25', level: 'Competitive' },
    { organization: 'CMBA', age_group: 'U13', gender: 'Boys', division: 'Division 3', season: '2024-25', level: 'Competitive' },
    { organization: 'CMBA', age_group: 'U13', gender: 'Boys', division: 'Division 4', season: '2024-25', level: 'Recreational' },
    { organization: 'CMBA', age_group: 'U13', gender: 'Boys', division: 'Division 5', season: '2024-25', level: 'Recreational' },
    { organization: 'CMBA', age_group: 'U13', gender: 'Boys', division: 'Division 6', season: '2024-25', level: 'Recreational' },
    
    // Boys U15 Regular Season
    { organization: 'CMBA', age_group: 'U15', gender: 'Boys', division: 'Division 1', season: '2024-25', level: 'Competitive' },
    { organization: 'CMBA', age_group: 'U15', gender: 'Boys', division: 'Raptors Division', season: '2024-25', level: 'Recreational' },
    
    // Boys U18 Regular Season
    { organization: 'CMBA', age_group: 'U18', gender: 'Boys', division: 'Division 5', season: '2024-25', level: 'Recreational' },
    
    // Girls U11 Regular Season
    { organization: 'CMBA', age_group: 'U11', gender: 'Girls', division: 'Division 1', season: '2024-25', level: 'Competitive' },
    { organization: 'CMBA', age_group: 'U11', gender: 'Girls', division: 'Division 3', season: '2024-25', level: 'Recreational' },
    { organization: 'CMBA', age_group: 'U11', gender: 'Girls', division: 'Division 4', season: '2024-25', level: 'Recreational' },
    
    // Girls U13 Regular Season
    { organization: 'CMBA', age_group: 'U13', gender: 'Girls', division: 'Division 2', season: '2024-25', level: 'Competitive' },
    
    // Girls U15 Regular Season
    { organization: 'CMBA', age_group: 'U15', gender: 'Girls', division: 'Division 5', season: '2024-25', level: 'Recreational' },
    { organization: 'CMBA', age_group: 'U15', gender: 'Girls', division: 'Division 6', season: '2024-25', level: 'Recreational' },
    
    // Club Leagues
    { organization: 'CMBA', age_group: 'U13', gender: 'Boys', division: 'Club Weeknight', season: '2024-25', level: 'Club' },
    { organization: 'CMBA', age_group: 'U18', gender: 'Boys', division: 'Club Weeknight', season: '2024-25', level: 'Club' },
    { organization: 'CMBA', age_group: 'U18', gender: 'Girls', division: 'Club League', season: '2024-25', level: 'Club' },
    
    // REC Divisions
    { organization: 'CMBA', age_group: 'U11', gender: 'Boys', division: 'REC', season: '2024-25', level: 'Recreational' },
    { organization: 'CMBA', age_group: 'U13', gender: 'Boys', division: 'REC', season: '2024-25', level: 'Recreational' },
    { organization: 'CMBA', age_group: 'U15', gender: 'Boys', division: 'REC', season: '2024-25', level: 'Recreational' },
    { organization: 'CMBA', age_group: 'U13', gender: 'Girls', division: 'REC', season: '2024-25', level: 'Recreational' },
    { organization: 'CMBA', age_group: 'U15', gender: 'Girls', division: 'REC', season: '2024-25', level: 'Recreational' },
    
    // Spring League
    { organization: 'CMBA', age_group: 'Multi', gender: 'Mixed', division: 'Spring League Club', season: 'Spring 2025', level: 'Club' },
    { organization: 'CMBA', age_group: 'Multi', gender: 'Mixed', division: 'Spring League Recreational', season: 'Spring 2025', level: 'Recreational' }
  ]).returning('*');

  // Create Teams for each league
  const teams = [];
  
  // Premium League Teams
  // Diamond League (U13 Boys Club A)
  teams.push(...await knex('teams').insert([
    { name: 'RISE U13 CATARINA/AMANI', league_id: leagues[0].id, rank: 1, location: 'Calgary Basketball Centre', contact_email: 'rise@basketballclub.ca', contact_phone: '403-555-0301' }
  ]).returning('*'));
  
  // Diamond Prep League (U18 Girls)
  teams.push(...await knex('teams').insert([
    { name: 'Canada Basketball Academy Elite', league_id: leagues[1].id, rank: 1, location: 'Canada Basketball Academy', contact_email: 'elite@cba.ca', contact_phone: '403-555-0302' }
  ]).returning('*'));
  
  // Platinum League (U18 Boys)
  teams.push(...await knex('teams').insert([
    { name: 'Bow River BU18-1 Thunder', league_id: leagues[2].id, rank: 1, location: 'Bow River Sports Complex', contact_email: 'thunder@bowriver.ca', contact_phone: '403-555-0303' }
  ]).returning('*'));

  // Boys U11 Division 1
  teams.push(...await knex('teams').insert([
    { name: 'Airdrie BU11-1', league_id: leagues[3].id, rank: 1, location: 'Airdrie Recreation Complex', contact_email: 'bu11-1@airdrie.ca', contact_phone: '403-555-0401' },
    { name: 'Bow River BU11-1', league_id: leagues[3].id, rank: 2, location: 'Bow River Community Centre', contact_email: 'bu11-1@bowriver.ca', contact_phone: '403-555-0402' },
    { name: 'Bow River BU11-2', league_id: leagues[3].id, rank: 3, location: 'Bow River Community Centre', contact_email: 'bu11-2@bowriver.ca', contact_phone: '403-555-0403' },
    { name: 'Calwest BU11-1', league_id: leagues[3].id, rank: 4, location: 'West Calgary Recreation Centre', contact_email: 'bu11-1@calwest.ca', contact_phone: '403-555-0404' },
    { name: 'NCBC BU11-1', league_id: leagues[3].id, rank: 5, location: 'North Calgary Basketball Centre', contact_email: 'bu11-1@ncbc.ca', contact_phone: '403-555-0405' },
    { name: 'Okotoks BU11-1', league_id: leagues[3].id, rank: 6, location: 'Okotoks Recreation Centre', contact_email: 'bu11-1@okotoks.ca', contact_phone: '403-555-0406' }
  ]).returning('*'));

  // Boys U11 Division 2
  teams.push(...await knex('teams').insert([
    { name: 'Airdrie BU11-2', league_id: leagues[4].id, rank: 1, location: 'Airdrie Recreation Complex', contact_email: 'bu11-2@airdrie.ca', contact_phone: '403-555-0411' },
    { name: 'EastPro BU11-1', league_id: leagues[4].id, rank: 2, location: 'East Calgary Sports Centre', contact_email: 'bu11-1@eastpro.ca', contact_phone: '403-555-0412' },
    { name: 'NW BU11-1', league_id: leagues[4].id, rank: 3, location: 'NW Calgary Community Centre', contact_email: 'bu11-1@nwcalgary.ca', contact_phone: '403-555-0413' },
    { name: 'Okotoks BU11-1', league_id: leagues[4].id, rank: 4, location: 'Okotoks Recreation Centre', contact_email: 'bu11-1@okotoks.ca', contact_phone: '403-555-0414' },
    { name: 'SoCal BU11-1', league_id: leagues[4].id, rank: 5, location: 'South Calgary Athletic Centre', contact_email: 'bu11-1@socal.ca', contact_phone: '403-555-0415' },
    { name: 'SoCal BU11-2', league_id: leagues[4].id, rank: 6, location: 'South Calgary Athletic Centre', contact_email: 'bu11-2@socal.ca', contact_phone: '403-555-0416' }
  ]).returning('*'));

  // Boys U11 Division 5
  teams.push(...await knex('teams').insert([
    { name: 'Cochrane BU11-1', league_id: leagues[5].id, rank: 1, location: 'Cochrane Recreation Centre', contact_email: 'bu11-1@cochrane.ca', contact_phone: '403-555-0421' },
    { name: 'NCBC BU11-3', league_id: leagues[5].id, rank: 2, location: 'North Calgary Basketball Centre', contact_email: 'bu11-3@ncbc.ca', contact_phone: '403-555-0422' },
    { name: 'NW BU11-3', league_id: leagues[5].id, rank: 3, location: 'NW Calgary Community Centre', contact_email: 'bu11-3@nwcalgary.ca', contact_phone: '403-555-0423' },
    { name: 'Okotoks BU11-3', league_id: leagues[5].id, rank: 4, location: 'Okotoks Recreation Centre', contact_email: 'bu11-3@okotoks.ca', contact_phone: '403-555-0424' },
    { name: 'SoCal BU11-4', league_id: leagues[5].id, rank: 5, location: 'South Calgary Athletic Centre', contact_email: 'bu11-4@socal.ca', contact_phone: '403-555-0425' },
    { name: 'SoCal BU11-5', league_id: leagues[5].id, rank: 6, location: 'South Calgary Athletic Centre', contact_email: 'bu11-5@socal.ca', contact_phone: '403-555-0426' }
  ]).returning('*'));

  // Boys U13 Division 1
  teams.push(...await knex('teams').insert([
    { name: 'Bow River BU13-1', league_id: leagues[6].id, rank: 1, location: 'Bow River Community Centre', contact_email: 'bu13-1@bowriver.ca', contact_phone: '403-555-0501' },
    { name: 'Calwest BU13-1', league_id: leagues[6].id, rank: 2, location: 'West Calgary Recreation Centre', contact_email: 'bu13-1@calwest.ca', contact_phone: '403-555-0502' },
    { name: 'EastPro BU13-1', league_id: leagues[6].id, rank: 3, location: 'East Calgary Sports Centre', contact_email: 'bu13-1@eastpro.ca', contact_phone: '403-555-0503' },
    { name: 'NCBC BU13-1', league_id: leagues[6].id, rank: 4, location: 'North Calgary Basketball Centre', contact_email: 'bu13-1@ncbc.ca', contact_phone: '403-555-0504' },
    { name: 'Okotoks BU13-1', league_id: leagues[6].id, rank: 5, location: 'Okotoks Recreation Centre', contact_email: 'bu13-1@okotoks.ca', contact_phone: '403-555-0505' },
    { name: 'SoCal BU13-1', league_id: leagues[6].id, rank: 6, location: 'South Calgary Athletic Centre', contact_email: 'bu13-1@socal.ca', contact_phone: '403-555-0506' }
  ]).returning('*'));

  // Club Teams - U13 Boys Club Weeknight
  teams.push(...await knex('teams').insert([
    { name: 'Genesis U12 Black', league_id: leagues[20].id, rank: 1, location: 'Genesis Place', contact_email: 'black@genesis.ca', contact_phone: '403-555-0701' },
    { name: 'Genesis U13 White', league_id: leagues[20].id, rank: 2, location: 'Genesis Place', contact_email: 'white@genesis.ca', contact_phone: '403-555-0702' },
    { name: 'Nxt lvl Basketball Club', league_id: leagues[20].id, rank: 3, location: 'Nxt Lvl Training Centre', contact_email: 'info@nxtlvl.ca', contact_phone: '403-555-0703' },
    { name: 'PUREHOOPS Basketball Club', league_id: leagues[20].id, rank: 4, location: 'PUREHOOPS Training Facility', contact_email: 'info@purehoops.ca', contact_phone: '403-555-0704' },
    { name: 'Skills Elite 13 Black', league_id: leagues[20].id, rank: 5, location: 'Skills Elite Academy', contact_email: 'black@skillselite.ca', contact_phone: '403-555-0705' }
  ]).returning('*'));

  // Club Teams - U18 Boys Club Weeknight
  teams.push(...await knex('teams').insert([
    { name: 'Calgary Elite', league_id: leagues[21].id, rank: 1, location: 'Calgary Elite Training Centre', contact_email: 'info@calgaryelite.ca', contact_phone: '403-555-0801' },
    { name: 'Calgary Selects U18', league_id: leagues[21].id, rank: 2, location: 'Calgary Selects Facility', contact_email: 'u18@calgaryselects.ca', contact_phone: '403-555-0802' },
    { name: 'Excel HS Boys JV', league_id: leagues[21].id, rank: 3, location: 'Excel Basketball Academy', contact_email: 'jv@excelbasketball.ca', contact_phone: '403-555-0803' },
    { name: 'Ignite U16', league_id: leagues[21].id, rank: 4, location: 'Ignite Basketball Centre', contact_email: 'u16@ignitebasketball.ca', contact_phone: '403-555-0804' },
    { name: 'Ignite U18', league_id: leagues[21].id, rank: 5, location: 'Ignite Basketball Centre', contact_email: 'u18@ignitebasketball.ca', contact_phone: '403-555-0805' },
    { name: 'Rise U16 Boys Bwanali/Luistro', league_id: leagues[21].id, rank: 6, location: 'Rise Basketball Academy', contact_email: 'u16@risebasketball.ca', contact_phone: '403-555-0806' },
    { name: 'Rise U17 Boys Deleon', league_id: leagues[21].id, rank: 7, location: 'Rise Basketball Academy', contact_email: 'deleon@risebasketball.ca', contact_phone: '403-555-0807' },
    { name: 'Rise U17 Boys Walker', league_id: leagues[21].id, rank: 8, location: 'Rise Basketball Academy', contact_email: 'walker@risebasketball.ca', contact_phone: '403-555-0808' },
    { name: 'Skills Elite HS Boys', league_id: leagues[21].id, rank: 9, location: 'Skills Elite Academy', contact_email: 'hs@skillselite.ca', contact_phone: '403-555-0809' },
    { name: 'TAC Basketball U16 Teal', league_id: leagues[21].id, rank: 10, location: 'TAC Basketball Centre', contact_email: 'teal@tacbasketball.ca', contact_phone: '403-555-0810' },
    { name: 'Tsuut\'ina Warriors', league_id: leagues[21].id, rank: 11, location: 'Tsuut\'ina Nation Recreation Centre', contact_email: 'warriors@tsuutina.ca', contact_phone: '403-555-0811' },
    { name: 'Wildfire U18 Boys', league_id: leagues[21].id, rank: 12, location: 'Wildfire Basketball Academy', contact_email: 'u18@wildfirebasketball.ca', contact_phone: '403-555-0812' }
  ]).returning('*'));

  // REC Teams
  teams.push(...await knex('teams').insert([
    { name: 'RENEGADES U11', league_id: leagues[23].id, rank: 1, location: 'Renegades Sports Centre', contact_email: 'u11@renegades.ca', contact_phone: '403-555-0901' },
    { name: 'RENEGADES U13', league_id: leagues[24].id, rank: 1, location: 'Renegades Sports Centre', contact_email: 'u13@renegades.ca', contact_phone: '403-555-0902' },
    { name: 'Calgary Warriors U15', league_id: leagues[25].id, rank: 1, location: 'Calgary Warriors Facility', contact_email: 'u15@calgarywarriors.ca', contact_phone: '403-555-0903' },
    { name: 'Calgary Selects U15', league_id: leagues[25].id, rank: 2, location: 'Calgary Selects Facility', contact_email: 'u15@calgaryselects.ca', contact_phone: '403-555-0904' },
    { name: 'Supreme Hoops U15 BLACK', league_id: leagues[25].id, rank: 3, location: 'Supreme Hoops Centre', contact_email: 'black@supremehoops.ca', contact_phone: '403-555-0905' },
    { name: 'Thunder U13 Girls', league_id: leagues[26].id, rank: 1, location: 'Thunder Basketball Centre', contact_email: 'girls@thunder.ca', contact_phone: '403-555-0906' },
    { name: 'Eastpro U15 Girls', league_id: leagues[27].id, rank: 1, location: 'East Calgary Sports Centre', contact_email: 'girls@eastpro.ca', contact_phone: '403-555-0907' }
  ]).returning('*'));

  // Create sample games for different leagues
  const games = await knex('games').insert([
    // Premium League Games
    {
      home_team_id: teams[0].id, // RISE U13 CATARINA/AMANI vs themselves (exhibition)
      away_team_id: teams[1].id, // Canada Basketball Academy Elite
      league_id: leagues[0].id, // Diamond League
      game_date: '2025-02-15',
      game_time: '18:00',
      location: 'Calgary Basketball Centre',
      postal_code: 'T2P3M5',
      level: 'Elite',
      pay_rate: 100,
      refs_needed: 3,
      status: 'unassigned',
      wage_multiplier: 2.0,
      wage_multiplier_reason: 'Premium Diamond League game',
      game_type: 'Tournament'
    },
    
    // U11 Boys Division 1 Games
    {
      home_team_id: teams[3].id, // Airdrie BU11-1
      away_team_id: teams[4].id, // Bow River BU11-1
      league_id: leagues[3].id,
      game_date: '2025-02-08',
      game_time: '10:00',
      location: 'Airdrie Recreation Complex',
      postal_code: 'T4B2K3',
      level: 'Competitive',
      pay_rate: 45,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.0,
      wage_multiplier_reason: null,
      game_type: 'Community'
    },
    
    {
      home_team_id: teams[6].id, // Calwest BU11-1
      away_team_id: teams[8].id, // Okotoks BU11-1
      league_id: leagues[3].id,
      game_date: '2025-02-08',
      game_time: '12:00',
      location: 'West Calgary Recreation Centre',
      postal_code: 'T3A5K1',
      level: 'Competitive',
      pay_rate: 45,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.2,
      wage_multiplier_reason: 'Weekend premium',
      game_type: 'Community'
    },
    
    // U13 Boys Division 1 Games
    {
      home_team_id: teams[15].id, // Bow River BU13-1
      away_team_id: teams[16].id, // Calwest BU13-1
      league_id: leagues[6].id,
      game_date: '2025-02-09',
      game_time: '14:00',
      location: 'Bow River Community Centre',
      postal_code: 'T2J6R4',
      level: 'Competitive',
      pay_rate: 55,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.3,
      wage_multiplier_reason: 'Top division game',
      game_type: 'Community'
    },
    
    {
      home_team_id: teams[18].id, // NCBC BU13-1
      away_team_id: teams[19].id, // Okotoks BU13-1
      league_id: leagues[6].id,
      game_date: '2025-02-09',
      game_time: '16:00',
      location: 'North Calgary Basketball Centre',
      postal_code: 'T1Y7H2',
      level: 'Competitive',
      pay_rate: 55,
      refs_needed: 3,
      status: 'unassigned',
      wage_multiplier: 1.0,
      wage_multiplier_reason: null,
      game_type: 'Community'
    },
    
    // Club League Games
    {
      home_team_id: teams[21].id, // Genesis U12 Black
      away_team_id: teams[23].id, // Nxt lvl Basketball Club
      league_id: leagues[20].id, // U13 Boys Club Weeknight
      game_date: '2025-02-12',
      game_time: '19:30',
      location: 'Genesis Place',
      postal_code: 'T1S1A1',
      level: 'Competitive',
      pay_rate: 65,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.5,
      wage_multiplier_reason: 'Weeknight club game',
      game_type: 'Club'
    },
    
    {
      home_team_id: teams[26].id, // Calgary Elite
      away_team_id: teams[29].id, // Ignite U16
      league_id: leagues[21].id, // U18 Boys Club Weeknight
      game_date: '2025-02-13',
      game_time: '20:00',
      location: 'Calgary Elite Training Centre',
      postal_code: 'T2P3M5',
      level: 'Competitive',
      pay_rate: 75,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.8,
      wage_multiplier_reason: 'Elite club matchup',
      game_type: 'Club'
    },
    
    // REC Games
    {
      home_team_id: teams[39].id, // RENEGADES U13
      away_team_id: teams[44].id, // Thunder U13 Girls
      league_id: leagues[24].id, // U13 Boys REC
      game_date: '2025-02-14',
      game_time: '18:00',
      location: 'Renegades Sports Centre',
      postal_code: 'T2V4K9',
      level: 'Recreational',
      pay_rate: 35,
      refs_needed: 2,
      status: 'unassigned',
      wage_multiplier: 1.0,
      wage_multiplier_reason: null,
      game_type: 'Community'
    },
    
    // Weekend Tournament Games
    {
      home_team_id: teams[31].id, // Rise U16 Boys Bwanali/Luistro
      away_team_id: teams[34].id, // Skills Elite HS Boys
      league_id: leagues[21].id,
      game_date: '2025-02-15',
      game_time: '09:00',
      location: 'Rise Basketball Academy',
      postal_code: 'T2J6R4',
      level: 'Competitive',
      pay_rate: 75,
      refs_needed: 3,
      status: 'unassigned',
      wage_multiplier: 2.2,
      wage_multiplier_reason: 'Tournament championship',
      game_type: 'Tournament'
    },
    
    {
      home_team_id: teams[35].id, // TAC Basketball U16 Teal
      away_team_id: teams[37].id, // Wildfire U18 Boys
      league_id: leagues[21].id,
      game_date: '2025-02-15',
      game_time: '11:00',
      location: 'TAC Basketball Centre',
      postal_code: 'T3A5K1',
      level: 'Competitive',
      pay_rate: 75,
      refs_needed: 3,
      status: 'unassigned',
      wage_multiplier: 1.9,
      wage_multiplier_reason: 'Tournament semi-final',
      game_type: 'Tournament'
    }
  ]).returning('*');

  // Create some sample assignments
  await knex('game_assignments').insert([
    {
      game_id: games[1].id, // U11 Division 1 game
      user_id: refereeUsers[1].id, // Sarah (Junior level)
      position_id: position1.id,
      status: 'accepted',
      assigned_at: new Date('2025-02-01'),
      assigned_by: adminUser.id,
      calculated_wage: 45.00
    },
    {
      game_id: games[1].id, // Same U11 game, second ref
      user_id: refereeUsers[4].id, // David (Junior level)
      position_id: position2.id,
      status: 'accepted',
      assigned_at: new Date('2025-02-01'),
      assigned_by: adminUser.id,
      calculated_wage: 45.00
    },
    {
      game_id: games[0].id, // Premium Diamond League game
      user_id: refereeUsers[2].id, // Mike (Senior level)
      position_id: position1.id,
      status: 'accepted',
      assigned_at: new Date('2025-02-01'),
      assigned_by: adminUser.id,
      calculated_wage: 200.00 // 100 * 2.0
    },
    {
      game_id: games[8].id, // Tournament championship
      user_id: refereeUsers[3].id, // Lisa (Senior level)
      position_id: position1.id,
      status: 'pending',
      assigned_at: new Date(),
      assigned_by: adminUser.id,
      calculated_wage: 165.00 // 75 * 2.2
    }
  ]);

  console.log('CMBA 2024-25 Season data created:');
  console.log('- 29 leagues covering all CMBA divisions');
  console.log('- Premium leagues: Diamond, Diamond Prep, Platinum');
  console.log('- Regular season divisions: U11-U18 Boys/Girls');
  console.log('- Club leagues: Weeknight and competitive club teams');
  console.log('- REC divisions: Recreational teams');
  console.log('- Spring league structure');
  console.log('- 45+ teams with realistic Calgary-area locations');
  console.log('- 10 sample games with appropriate wage multipliers');
  console.log('- 6 referees with Calgary postal codes');
  console.log('- Sample assignments showing different referee levels');
  console.log('');
  console.log('Test users:');
  console.log('Admin: admin@cmba.ca / password123');
  console.log('Referees: james.smith@referee.ca, sarah.johnson@referee.ca, etc. / password123');
};