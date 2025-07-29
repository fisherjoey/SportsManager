exports.seed = async function(knex) {
  // Get the referee level IDs
  const levels = await knex('referee_levels').select('id', 'name');
  const rookieLevel = levels.find(l => l.name === 'Rookie');
  const juniorLevel = levels.find(l => l.name === 'Junior');
  const seniorLevel = levels.find(l => l.name === 'Senior');

  if (!rookieLevel || !juniorLevel || !seniorLevel) {
    throw new Error('Required referee levels (Rookie, Junior, Senior) not found in database');
  }

  const bcrypt = require('bcryptjs');
  const saltRounds = 12;

  // Enhanced referee profiles with comprehensive data coverage
  const enhancedReferees = [
    // Rookie level referees (some with white whistle)
    {
      email: 'alex.rodriguez@referee.ca',
      name: 'Alex Rodriguez',
      phone: '+1 (403) 555-0101',
      postal_code: 'T2N 1N4',
      max_distance: 15,
      level_id: rookieLevel.id,
      roles: ['Referee'],
      is_white_whistle: true,
      is_available: true,
      years_experience: 1,
      wage_per_game: 30.00,
      notes: 'New referee, eager to learn. Prefers evening games on weekends.',
      quadrant: 'Northwest'
    },
    {
      email: 'jessica.chen@referee.ca',
      name: 'Jessica Chen',
      phone: '+1 (403) 555-0102',
      postal_code: 'T2A 2B3',
      max_distance: 20,
      level_id: rookieLevel.id,
      roles: ['Referee'],
      is_white_whistle: true,
      is_available: true,
      years_experience: 1,
      wage_per_game: 30.00,
      notes: 'Bilingual (English/Mandarin). Available Tuesday-Thursday evenings.',
      quadrant: 'Northeast'
    },
    {
      email: 'brandon.smith@referee.ca',
      name: 'Brandon Smith',
      phone: '+1 (403) 555-0103',
      postal_code: 'T2S 2K5',
      max_distance: 25,
      level_id: rookieLevel.id,
      roles: ['Referee'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 2,
      wage_per_game: 30.00,
      notes: 'Former player transitioning to officiating. Strong game knowledge.',
      quadrant: 'Southeast'
    },
    {
      email: 'maria.gonzalez@referee.ca',
      name: 'Maria Gonzalez',
      phone: '+1 (403) 555-0104',
      postal_code: 'T2W 3M7',
      max_distance: 30,
      level_id: rookieLevel.id,
      roles: ['Referee'],
      is_white_whistle: true,
      is_available: true,
      years_experience: 1,
      wage_per_game: 30.00,
      notes: 'Specializes in youth games. Available weekends only.',
      quadrant: 'Southwest'
    },
    {
      email: 'tyler.johnson@referee.ca',
      name: 'Tyler Johnson',
      phone: '+1 (403) 555-0105',
      postal_code: 'T3A 4R2',
      max_distance: 35,
      level_id: rookieLevel.id,
      roles: ['Referee'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 2,
      wage_per_game: 30.00,
      notes: 'University student, flexible schedule during weekends.',
      quadrant: 'North'
    },

    // Junior level referees (mix of white whistle and regular)
    {
      email: 'sarah.mitchell@referee.ca',
      name: 'Sarah Mitchell',
      phone: '+1 (403) 555-0106',
      postal_code: 'T2E 5P8',
      max_distance: 25,
      level_id: juniorLevel.id,
      roles: ['Referee'],
      is_white_whistle: true,
      is_available: true,
      years_experience: 3,
      wage_per_game: 45.00,
      notes: 'Working towards senior certification. Excellent with youth players.',
      quadrant: 'Northeast'
    },
    {
      email: 'david.lee@referee.ca',
      name: 'David Lee',
      phone: '+1 (403) 555-0107',
      postal_code: 'T2C 1A9',
      max_distance: 20,
      level_id: juniorLevel.id,
      roles: ['Referee'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 4,
      wage_per_game: 45.00,
      notes: 'Reliable and punctual. Prefers competitive level games.',
      quadrant: 'Northwest'
    },
    {
      email: 'amanda.taylor@referee.ca',
      name: 'Amanda Taylor',
      phone: '+1 (403) 555-0108',
      postal_code: 'T2J 3K4',
      max_distance: 40,
      level_id: juniorLevel.id,
      roles: ['Referee'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 3,
      wage_per_game: 45.00,
      notes: 'Willing to travel longer distances. Available most evenings.',
      quadrant: 'Southwest'
    },
    {
      email: 'kevin.wong@referee.ca',
      name: 'Kevin Wong',
      phone: '+1 (403) 555-0109',
      postal_code: 'T2H 2L6',
      max_distance: 30,
      level_id: juniorLevel.id,
      roles: ['Referee'],
      is_white_whistle: true,
      is_available: true,
      years_experience: 2,
      wage_per_game: 45.00,
      notes: 'Tech professional with flexible schedule. Good communicator.',
      quadrant: 'Southeast'
    },
    {
      email: 'rachel.brown@referee.ca',
      name: 'Rachel Brown',
      phone: '+1 (403) 555-0110',
      postal_code: 'T3B 5N2',
      max_distance: 25,
      level_id: juniorLevel.id,
      roles: ['Referee'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 4,
      wage_per_game: 45.00,
      notes: 'Former coach, excellent game management skills.',
      quadrant: 'North'
    },

    // Senior level referees (mentors and evaluators)
    {
      email: 'michael.davis@referee.ca',  
      name: 'Michael Davis',
      phone: '+1 (403) 555-0111',
      postal_code: 'T2K 4B8',
      max_distance: 50,
      level_id: seniorLevel.id,
      roles: ['Referee', 'Mentor'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 8,
      wage_per_game: 75.00,
      notes: 'Experienced mentor. Available for development games and training.',
      quadrant: 'Northwest'
    },
    {
      email: 'linda.wilson@referee.ca',
      name: 'Linda Wilson',  
      phone: '+1 (403) 555-0112',
      postal_code: 'T2G 6C9',
      max_distance: 45,
      level_id: seniorLevel.id,
      roles: ['Referee', 'Evaluator'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 12,
      wage_per_game: 75.00,
      notes: 'Provincial level evaluator. Specializes in high-level competitive games.',
      quadrant: 'Southeast'
    },
    {
      email: 'robert.garcia@referee.ca',
      name: 'Robert Garcia',
      phone: '+1 (403) 555-0113', 
      postal_code: 'T2L 3D5',
      max_distance: 40,
      level_id: seniorLevel.id,
      roles: ['Referee', 'Mentor', 'Evaluator'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 15,
      wage_per_game: 75.00,
      notes: 'Veteran official. Mentors new referees and evaluates development.',
      quadrant: 'Southwest'
    },
    {
      email: 'jennifer.kim@referee.ca',
      name: 'Jennifer Kim',
      phone: '+1 (403) 555-0114',
      postal_code: 'T2M 7E1',
      max_distance: 35,
      level_id: seniorLevel.id,
      roles: ['Referee', 'Mentor'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 10,
      wage_per_game: 75.00,
      notes: 'Tournament specialist. Excellent under pressure situations.',
      quadrant: 'Northeast'
    },
    {
      email: 'paul.anderson@referee.ca',
      name: 'Paul Anderson',
      phone: '+1 (403) 555-0115',
      postal_code: 'T3K 8F3',
      max_distance: 60,
      level_id: seniorLevel.id,
      roles: ['Referee', 'Evaluator'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 20,
      wage_per_game: 75.00,
      notes: 'Regional coordinator. Available for special assignments and training.',
      quadrant: 'North'
    },

    // Additional diverse profiles
    {
      email: 'stephanie.murphy@referee.ca',
      name: 'Stephanie Murphy',
      phone: '+1 (403) 555-0116',
      postal_code: 'T2P 9G4',
      max_distance: 15,
      level_id: juniorLevel.id,
      roles: ['Referee'],
      is_white_whistle: false,
      is_available: false, // Currently unavailable
      years_experience: 3,
      wage_per_game: 45.00,
      notes: 'Temporarily unavailable due to injury. Expected return in 4 weeks.',
      quadrant: 'Downtown'
    },
    {
      email: 'carlos.santos@referee.ca',
      name: 'Carlos Santos',
      phone: '+1 (403) 555-0117',
      postal_code: 'T2R 1H6',
      max_distance: 50,
      level_id: seniorLevel.id,
      roles: ['Referee'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 7,
      wage_per_game: 75.00,
      notes: 'Bilingual (English/Spanish). Works shift schedule, available varied hours.',
      quadrant: 'Southwest'
    },
    {
      email: 'nicole.thompson@referee.ca',
      name: 'Nicole Thompson',
      phone: '+1 (403) 555-0118',
      postal_code: 'T2T 2J8',
      max_distance: 20,
      level_id: rookieLevel.id,
      roles: ['Referee'],
      is_white_whistle: true,
      is_available: true,
      years_experience: 1,
      wage_per_game: 30.00,
      notes: 'Healthcare professional. Available evenings and weekends only.',
      quadrant: 'Southeast'
    },
    {
      email: 'james.patel@referee.ca',
      name: 'James Patel',
      phone: '+1 (403) 555-0119',
      postal_code: 'T2X 5K9',
      max_distance: 30,
      level_id: juniorLevel.id,
      roles: ['Referee'],
      is_white_whistle: false,
      is_available: true,
      years_experience: 5,
      wage_per_game: 45.00,
      notes: 'Engineer with consistent availability. Prefers weekend tournaments.',
      quadrant: 'Southwest'
    },
    {
      email: 'emily.clark@referee.ca',
      name: 'Emily Clark',
      phone: '+1 (403) 555-0120',
      postal_code: 'T3M 3L7',
      max_distance: 25,
      level_id: rookieLevel.id,
      roles: ['Referee'],
      is_white_whistle: true,
      is_available: true,
      years_experience: 1,
      wage_per_game: 30.00,
      notes: 'University student studying kinesiology. Available flexible hours.',
      quadrant: 'North'
    }
  ];

  // Insert all enhanced referee users
  for (const referee of enhancedReferees) {
    try {
      // Check if user already exists
      const existingUser = await knex('users').where('email', referee.email).first();
      
      let userId;
      if (existingUser) {
        // Update existing user with enhanced data
        await knex('users').where('id', existingUser.id).update({
          name: referee.name,
          phone: referee.phone,
          postal_code: referee.postal_code,
          max_distance: referee.max_distance,
          referee_level_id: referee.level_id,
          roles: referee.roles,
          is_white_whistle: referee.is_white_whistle,
          is_available: referee.is_available,
          years_experience: referee.years_experience,
          wage_per_game: referee.wage_per_game,
          notes: referee.notes
        });
        userId = existingUser.id;
        console.log(`Updated existing referee: ${referee.name}`);
      } else {
        // Create new user
        const [newUser] = await knex('users').insert({
          email: referee.email,
          password_hash: await bcrypt.hash('password', saltRounds),
          role: 'referee',
          name: referee.name,
          phone: referee.phone,
          postal_code: referee.postal_code,
          max_distance: referee.max_distance,
          referee_level_id: referee.level_id,
          roles: referee.roles,
          is_white_whistle: referee.is_white_whistle,
          is_available: referee.is_available,
          years_experience: referee.years_experience,
          wage_per_game: referee.wage_per_game,
          notes: referee.notes
        }).returning('*');
        userId = newUser.id;
        console.log(`Created new referee: ${referee.name}`);
      }
    } catch (error) {
      console.error(`Error processing referee ${referee.name}:`, error.message);
    }
  }

  console.log(`\n✅ Enhanced referee seed data completed!`);
  console.log(`📊 Summary:`);
  console.log(`   - ${enhancedReferees.filter(r => r.level_id === rookieLevel.id).length} Rookie level referees`);
  console.log(`   - ${enhancedReferees.filter(r => r.level_id === juniorLevel.id).length} Junior level referees`);
  console.log(`   - ${enhancedReferees.filter(r => r.level_id === seniorLevel.id).length} Senior level referees`);
  console.log(`   - ${enhancedReferees.filter(r => r.is_white_whistle).length} referees with white whistle status`);
  console.log(`   - ${enhancedReferees.filter(r => r.roles.includes('Mentor')).length} mentors available`);
  console.log(`   - ${enhancedReferees.filter(r => r.roles.includes('Evaluator')).length} evaluators available`);
  console.log(`   - ${enhancedReferees.filter(r => !r.is_available).length} currently unavailable referees`);

  // Geographic distribution
  const quadrants = {};
  enhancedReferees.forEach(r => {
    quadrants[r.quadrant] = (quadrants[r.quadrant] || 0) + 1;
  });
  console.log(`📍 Geographic distribution:`, quadrants);
};