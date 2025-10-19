exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('game_assignments').del();
  await knex('users').del();

  const bcrypt = require('bcryptjs');
  const saltRounds = 12;

  // Insert admin user
  const [adminUser] = await knex('users').insert([
    {
      email: 'admin@refassign.com',
      password_hash: await bcrypt.hash('password', saltRounds),
      role: 'admin'
    }
  ]).returning('*');

  // Create referee users based on CMBA organizational structure
  const refereeUsers = [];
  const refereeData = [
    // Northwest Basketball Association referees
    { email: 'mike.johnson@cmba.ca', name: 'Mike Johnson', organization: 'Northwest Basketball Association' },
    { email: 'sarah.connor@cmba.ca', name: 'Sarah Connor', organization: 'Northwest Basketball Association' },
    { email: 'david.martinez@cmba.ca', name: 'David Martinez', organization: 'Northwest Basketball Association' },
    
    // NCBC Thunder referees
    { email: 'james.wilson@cmba.ca', name: 'James Wilson', organization: 'NCBC Thunder' },
    { email: 'emily.brown@cmba.ca', name: 'Emily Brown', organization: 'NCBC Thunder' },
    { email: 'robert.garcia@cmba.ca', name: 'Robert Garcia', organization: 'NCBC Thunder' },
    
    // EastPro Basketball Association referees
    { email: 'lisa.anderson@cmba.ca', name: 'Lisa Anderson', organization: 'EastPro Basketball Association' },
    { email: 'jennifer.taylor@cmba.ca', name: 'Jennifer Taylor', organization: 'EastPro Basketball Association' },
    { email: 'michael.thomas@cmba.ca', name: 'Michael Thomas', organization: 'EastPro Basketball Association' },
    
    // Northeast Basketball Association referees
    { email: 'ashley.jackson@cmba.ca', name: 'Ashley Jackson', organization: 'Northeast Basketball Association' },
    { email: 'daniel.white@cmba.ca', name: 'Daniel White', organization: 'Northeast Basketball Association' },
    
    // Foothills Basketball referees
    { email: 'jessica.harris@cmba.ca', name: 'Jessica Harris', organization: 'Foothills Basketball' },
    { email: 'christopher.clark@cmba.ca', name: 'Christopher Clark', organization: 'Foothills Basketball' },
    
    // Bow Valley Basketball Association referees
    { email: 'amanda.lewis@cmba.ca', name: 'Amanda Lewis', organization: 'Bow Valley Basketball Association' },
    { email: 'matthew.walker@cmba.ca', name: 'Matthew Walker', organization: 'Bow Valley Basketball Association' },
    
    // South Fish Creek Basketball referees
    { email: 'stephanie.hall@cmba.ca', name: 'Stephanie Hall', organization: 'South Fish Creek Basketball' },
    { email: 'joshua.allen@cmba.ca', name: 'Joshua Allen', organization: 'South Fish Creek Basketball' },
    
    // SouthWest Basketball referees
    { email: 'nicole.young@cmba.ca', name: 'Nicole Young', organization: 'SouthWest Basketball' },
    { email: 'andrew.king@cmba.ca', name: 'Andrew King', organization: 'SouthWest Basketball' },
    
    // Calgary Basketball referees
    { email: 'melissa.wright@cmba.ca', name: 'Melissa Wright', organization: 'Calgary Basketball' },
    { email: 'ryan.thompson@cmba.ca', name: 'Ryan Thompson', organization: 'Calgary Basketball' },
    
    // Olds Basketball referees
    { email: 'alexandra.davis@cmba.ca', name: 'Alexandra Davis', organization: 'Olds Basketball' },
    { email: 'kevin.moore@cmba.ca', name: 'Kevin Moore', organization: 'Olds Basketball' },
    
    // Additional experienced referees
    { email: 'carlos.rodriguez@cmba.ca', name: 'Carlos Rodriguez', organization: 'NCBC Thunder' },
    { email: 'samantha.lee@cmba.ca', name: 'Samantha Lee', organization: 'Northwest Basketball Association' },
    { email: 'brandon.kim@cmba.ca', name: 'Brandon Kim', organization: 'EastPro Basketball Association' }
  ];

  // Insert all referee users in batch
  for (const referee of refereeData) {
    const [user] = await knex('users').insert([
      {
        email: referee.email,
        password_hash: await bcrypt.hash('password', saltRounds),
        role: 'referee'
      }
    ]).returning('*');
    refereeUsers.push({ ...user, name: referee.name, organization: referee.organization });
  }

  // Get the referee level IDs from the database
  const levels = await knex('referee_levels').select('id', 'name');
  const rookieLevel = levels.find(l => l.name === 'Rookie');
  const juniorLevel = levels.find(l => l.name === 'Junior');
  const seniorLevel = levels.find(l => l.name === 'Senior');

  if (!rookieLevel || !juniorLevel || !seniorLevel) {
    throw new Error('Required referee levels (Rookie, Junior, Senior) not found in database');
  }

  const refereeRoles = [
    ['Referee'],
    ['Referee'],
    ['Referee'],
    ['Referee', 'Mentor'],
    ['Referee', 'Evaluator'],
    ['Referee', 'Mentor', 'Evaluator']
  ];

  // Update referee users with profile data
  for (let index = 0; index < refereeUsers.length; index++) {
    const user = refereeUsers[index];
    const isAvailable = Math.random() > 0.2; // 80% available
    
    // Assign level based on index to ensure distribution
    let selectedLevel, wageAmount, isWhiteWhistle = false;
    if (index % 3 === 0) {
      selectedLevel = rookieLevel;
      wageAmount = 30.00;
      isWhiteWhistle = Math.random() > 0.4; // 60% of rookies have white whistle
    } else if (index % 3 === 1) {
      selectedLevel = juniorLevel;
      wageAmount = 45.00;
      isWhiteWhistle = Math.random() > 0.7; // 30% of juniors have white whistle
    } else {
      selectedLevel = seniorLevel;
      wageAmount = 75.00;
      isWhiteWhistle = false; // Senior referees don't have white whistle
    }
    
    const selectedRoles = refereeRoles[Math.floor(Math.random() * refereeRoles.length)];
    
    // Map organization to appropriate Calgary location
    let location;
    switch (user.organization) {
      case 'Northwest Basketball Association':
        location = 'Northwest Calgary';
        break;
      case 'NCBC Thunder':
        location = 'Northeast Calgary';
        break;
      case 'EastPro Basketball Association':
        location = 'Southeast Calgary';
        break;
      case 'Northeast Basketball Association':
        location = 'Northeast Calgary';
        break;
      case 'Foothills Basketball':
        location = 'Foothills';
        break;
      case 'Bow Valley Basketball Association':
        location = 'Bow Valley';
        break;
      case 'South Fish Creek Basketball':
        location = 'Fish Creek';
        break;
      case 'SouthWest Basketball':
        location = 'Southwest Calgary';
        break;
      case 'Calgary Basketball':
        location = 'Downtown Calgary';
        break;
      case 'Olds Basketball':
        location = 'Olds';
        break;
      default:
        location = 'Calgary Area';
    }
    
    const maxDistance = [15, 20, 25, 30, 35, 40][Math.floor(Math.random() * 6)];
    const phone = `+1 (403) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    
    // Calgary postal codes start with T (T1A-T3R)
    const postalCodeAreas = ['T1A', 'T1B', 'T1C', 'T1E', 'T1G', 'T1H', 'T1J', 'T1K', 'T1L', 'T1M', 'T1N', 'T1P', 'T1R', 'T1S', 'T1V', 'T1W', 'T1X', 'T1Y', 'T2A', 'T2B', 'T2C', 'T2E', 'T2G', 'T2H', 'T2J', 'T2K', 'T2L', 'T2M', 'T2N', 'T2P', 'T2R', 'T2S', 'T2T', 'T2V', 'T2W', 'T2X', 'T2Y', 'T2Z', 'T3A', 'T3B', 'T3C', 'T3E', 'T3G', 'T3H', 'T3J', 'T3K', 'T3L', 'T3M', 'T3N', 'T3P', 'T3R'];
    const postalCode = `${postalCodeAreas[Math.floor(Math.random() * postalCodeAreas.length)]} ${Math.floor(Math.random() * 10)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}`;
    
    const yearsExperience = selectedLevel.name === 'Rookie' ? Math.floor(Math.random() * 2) + 1 : 
                           selectedLevel.name === 'Junior' ? Math.floor(Math.random() * 3) + 2 : 
                           Math.floor(Math.random() * 10) + 5;

    // Update the user record with referee data
    await knex('users').where('id', user.id).update({
      name: user.name,
      phone: phone,
      postal_code: postalCode,
      max_distance: maxDistance,
      is_available: isAvailable,
      wage_per_game: wageAmount,
      referee_level_id: selectedLevel.id,
      roles: selectedRoles,
      is_white_whistle: isWhiteWhistle,
      years_experience: yearsExperience,
      notes: `${yearsExperience} years officiating basketball in ${user.organization}. Specializes in ${selectedLevel.name.toLowerCase()} level games.`
    });
  }

  console.log(`Updated ${refereeUsers.length} CMBA referee profiles with new level system`);
};