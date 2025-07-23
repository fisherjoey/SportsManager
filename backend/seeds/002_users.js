exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('game_assignments').del();
  await knex('referees').del();
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

  // Basketball referee details data for CMBA
  const levels = ['Recreational', 'Competitive', 'Elite'];
  const calgaryLocations = [
    'Northwest Calgary', 'Northeast Calgary', 'Southeast Calgary', 'Southwest Calgary',
    'Downtown Calgary', 'Foothills', 'Bow Valley', 'Fish Creek', 'Olds'
  ];
  const basketballCertifications = [
    ['NCCP Level 1 Basketball', 'SafeSport Certified'],
    ['NCCP Level 2 Basketball', 'Basketball Alberta Certified'],
    ['NCCP Level 1 Basketball', 'Youth Basketball Specialist'],
    ['NCCP Level 3 Basketball', 'Basketball Canada Certified', 'Tournament Official'],
    ['NCCP Level 1 Basketball', 'New Official Training'],
    ['NCCP Level 2 Basketball', 'Basketball Alberta Certified', 'SafeSport Certified'],
    ['NCCP Level 3 Basketball', 'Professional League Certified'],
    ['NCCP Level 2 Basketball', 'Tournament Official', 'Basketball Alberta Certified'],
    ['NCCP Level 1 Basketball', 'Youth Development Specialist'],
    ['NCCP Level 2 Basketball', 'SafeSport Certified', 'Basketball Canada Certified'],
    ['NCCP Level 3 Basketball', 'Elite Tournament Official'],
    ['NCCP Level 1 Basketball', 'Community Basketball Certified']
  ];

  // Generate referee profiles based on CMBA structure
  const refereeProfiles = refereeUsers.map((user, index) => {
    const isAvailable = Math.random() > 0.2; // 80% available
    const level = levels[Math.floor(Math.random() * levels.length)];
    
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
        location = calgaryLocations[Math.floor(Math.random() * calgaryLocations.length)];
    }
    
    const maxDistance = [15, 20, 25, 30, 35, 40][Math.floor(Math.random() * 6)];
    const phone = `(403) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    
    // Calgary postal codes start with T (T1A-T3R)
    const postalCodeAreas = ['T1A', 'T1B', 'T1C', 'T1E', 'T1G', 'T1H', 'T1J', 'T1K', 'T1L', 'T1M', 'T1N', 'T1P', 'T1R', 'T1S', 'T1V', 'T1W', 'T1X', 'T1Y', 'T2A', 'T2B', 'T2C', 'T2E', 'T2G', 'T2H', 'T2J', 'T2K', 'T2L', 'T2M', 'T2N', 'T2P', 'T2R', 'T2S', 'T2T', 'T2V', 'T2W', 'T2X', 'T2Y', 'T2Z', 'T3A', 'T3B', 'T3C', 'T3E', 'T3G', 'T3H', 'T3J', 'T3K', 'T3L', 'T3M', 'T3N', 'T3P', 'T3R'];
    const postalCode = `${postalCodeAreas[Math.floor(Math.random() * postalCodeAreas.length)]} ${Math.floor(Math.random() * 10)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}`;
    
    const refCertifications = basketballCertifications[Math.floor(Math.random() * basketballCertifications.length)];
    
    // Basketball-specific positions
    const basketballPositions = ['Lead Official', 'Trail Official', 'Center Official'];
    const yearsExperience = Math.floor(Math.random() * 15) + 1;

    return {
      user_id: user.id,
      name: user.name,
      email: user.email,
      phone: phone,
      level: level,
      location: location,
      postal_code: postalCode,
      max_distance: maxDistance,
      is_available: isAvailable,
      certifications: JSON.stringify(refCertifications),
      preferred_positions: JSON.stringify([basketballPositions[Math.floor(Math.random() * basketballPositions.length)], basketballPositions[Math.floor(Math.random() * basketballPositions.length)]]),
      wage_per_game: level === 'Elite' ? 85 : level === 'Competitive' ? 65 : 45,
      notes: `${yearsExperience} years officiating basketball in ${user.organization}. Specializes in ${level.toLowerCase()} level games.`
    };
  });

  // Insert referee profiles
  await knex('referees').insert(refereeProfiles);
};