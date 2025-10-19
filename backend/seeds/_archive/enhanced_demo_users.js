exports.seed = async function(knex) {
  const bcrypt = require('bcryptjs');
  const saltRounds = 12;

  // Role IDs from the RBAC system
  const ROLE_IDS = {
    'Super Admin': 'cbdeacc1-40b9-4297-9888-cdda640cefe3',
    'Admin': '12df1977-44c0-4787-abae-e2919272ce75', 
    'Assignor': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Referee': 'fb8520e8-7b59-47b8-b5b4-5cc4affc5ee3'
  };

  // Enhanced demo users using existing database fields
  const demoUsers = [
    {
      email: 'admin@cmba.ca',
      password: 'password',
      name: 'Sarah Johnson',
      phone: '+1 (403) 234-5678',
      postal_code: 'T2P 1A1',
      notes: 'CMBA System Administrator - Primary contact for all technical issues',
      assignRole: 'Admin'
    },
    {
      email: 'admin@refassign.com',
      password: 'password',
      name: 'Robert Chen',
      phone: '+1 (403) 567-8901',
      postal_code: 'T2N 2B2',
      notes: 'System Super Administrator - Full system access and configuration',
      assignRole: 'Super Admin'
    },
    {
      email: 'assignor@cmba.ca',
      password: 'password',
      name: 'Jennifer Martinez',
      phone: '+1 (403) 890-1234',
      postal_code: 'T2H 3C3',
      notes: 'Senior Assignor - Responsible for referee assignments across all divisions',
      assignRole: 'Assignor'
    },
    {
      email: 'david.thompson@cmba.ca',
      password: 'password',
      name: 'David Thompson',
      phone: '+1 (403) 345-6789',
      postal_code: 'T2A 4D4',
      max_distance: 35,
      is_available: true,
      wage_per_game: 75.00,
      years_experience: 20,
      is_white_whistle: false,
      notes: 'Experienced senior referee with excellent game management skills. 20+ years experience.',
      assignRole: 'Referee'
    },
    {
      email: 'amanda.williams@cmba.ca',
      password: 'password',
      name: 'Amanda Williams',
      phone: '+1 (403) 456-7890',
      postal_code: 'T2B 5E5',
      max_distance: 25,
      is_available: true,
      wage_per_game: 45.00,
      years_experience: 5,
      is_white_whistle: false,
      notes: 'Reliable junior referee with strong potential for advancement. Specializes in youth games.',
      assignRole: 'Referee'
    },
    {
      email: 'michael.brown@cmba.ca',
      password: 'password',
      name: 'Michael Brown',
      phone: '+1 (403) 567-8901',
      postal_code: 'T2C 6F6',
      max_distance: 15,
      is_available: true,
      wage_per_game: 30.00,
      years_experience: 1,
      is_white_whistle: true,
      notes: 'New referee showing great enthusiasm and dedication to learning. White whistle certified.',
      assignRole: 'Referee'
    },
    {
      email: 'marie.dubois@cmba.ca',
      password: 'password',
      name: 'Marie Dubois',
      phone: '+1 (403) 678-9012',
      postal_code: 'T2D 7G7',
      max_distance: 30,
      is_available: true,
      wage_per_game: 50.00,
      years_experience: 8,
      is_white_whistle: false,
      notes: 'Bilingual referee specializing in French-speaking community games. Fluent in French and English.',
      assignRole: 'Referee'
    },
    {
      email: 'james.wilson@cmba.ca',
      password: 'password',
      name: 'James Wilson',
      phone: '+1 (403) 789-0123',
      postal_code: 'T2E 8H8',
      max_distance: 20,
      is_available: false,
      wage_per_game: 60.00,
      years_experience: 13,
      is_white_whistle: false,
      notes: 'Currently on medical leave - expected return in 3 months. Specializes in injury management protocols.',
      assignRole: 'Referee'
    },
    {
      email: 'lisa.garcia@cmba.ca',
      password: 'password',
      name: 'Lisa Garcia',
      phone: '+1 (403) 890-1234',
      postal_code: 'T2F 9I9',
      max_distance: 25,
      is_available: false,
      wage_per_game: 40.00,
      years_experience: 4,
      is_white_whistle: false,
      notes: 'Moved out of province - inactive status until further notice. Previously specialized in youth games.',
      assignRole: 'Referee'
    },
    {
      email: 'alex.rodriguez@cmba.ca',
      password: 'password',
      name: 'Alexander Rodriguez',
      phone: '+1 (403) 901-2345',
      postal_code: 'T2G 0J0',
      max_distance: 50,
      is_available: true,
      wage_per_game: 100.00,
      years_experience: 25,
      is_white_whistle: false,
      notes: 'Master referee with 25+ years experience. FIBA International certified. Primary trainer for new officials. Available for high-profile games and special events.',
      assignRole: 'Referee'
    }
  ];

  // Insert enhanced demo users and assign roles
  for (const userData of demoUsers) {
    const existingUser = await knex('users').where('email', userData.email).first();
    
    if (!existingUser) {
      const { password, assignRole, ...userRecord } = userData;
      
      // Hash password
      userRecord.password_hash = await bcrypt.hash(password, saltRounds);
      
      // Insert user
      const [user] = await knex('users').insert(userRecord).returning('*');
      console.log(`Created enhanced demo user: ${userData.email} (${userData.name})`);
      
      // Assign role to user
      if (assignRole && ROLE_IDS[assignRole]) {
        // Check if role assignment already exists
        const existingRole = await knex('user_roles')
          .where('user_id', user.id)
          .where('role_id', ROLE_IDS[assignRole])
          .first();
          
        if (!existingRole) {
          await knex('user_roles').insert({
            user_id: user.id,
            role_id: ROLE_IDS[assignRole],
            assigned_at: new Date(),
            assigned_by: user.id // Self-assigned during seed
          });
          console.log(`  Assigned ${assignRole} role to ${userData.email}`);
        }
      }
      
      // Create referee profile if it's a referee role
      if (assignRole === 'Referee') {
        const existingProfile = await knex('referee_profiles').where('user_id', user.id).first();
        if (!existingProfile) {
          await knex('referee_profiles').insert({
            user_id: user.id,
            wage_amount: userData.wage_per_game || 45.00,
            years_experience: userData.years_experience || 1,
            evaluation_score: Math.floor(Math.random() * 20) + 80, // 80-100%
            is_white_whistle: userData.is_white_whistle || false,
            show_white_whistle: userData.is_white_whistle || false,
            created_at: new Date(),
            updated_at: new Date()
          });
          console.log(`  Created referee profile for ${userData.email}`);
        }
      }
      
    } else {
      console.log(`Demo user already exists: ${userData.email}`);
      
      // Update existing user with enhanced data if it's missing
      const updateData = {};
      if (!existingUser.name && userData.name) updateData.name = userData.name;
      if (!existingUser.phone && userData.phone) updateData.phone = userData.phone;
      if (!existingUser.postal_code && userData.postal_code) updateData.postal_code = userData.postal_code;
      if (!existingUser.notes && userData.notes) updateData.notes = userData.notes;
      
      if (Object.keys(updateData).length > 0) {
        await knex('users').where('id', existingUser.id).update(updateData);
        console.log(`  Updated existing user ${userData.email} with enhanced data`);
      }
      
      // Ensure role is assigned even if user exists
      const assignRole = userData.assignRole;
      if (assignRole && ROLE_IDS[assignRole]) {
        const existingRole = await knex('user_roles')
          .where('user_id', existingUser.id)
          .where('role_id', ROLE_IDS[assignRole])
          .first();
          
        if (!existingRole) {
          await knex('user_roles').insert({
            user_id: existingUser.id,
            role_id: ROLE_IDS[assignRole],
            assigned_at: new Date(),
            assigned_by: existingUser.id
          });
          console.log(`  Assigned ${assignRole} role to existing user ${userData.email}`);
        } else {
          console.log(`  User ${userData.email} already has ${assignRole} role`);
        }
      }
      
      // Create referee profile if needed and doesn't exist
      if (userData.assignRole === 'Referee') {
        const existingProfile = await knex('referee_profiles').where('user_id', existingUser.id).first();
        if (!existingProfile) {
          await knex('referee_profiles').insert({
            user_id: existingUser.id,
            wage_amount: userData.wage_per_game || 45.00,
            years_experience: userData.years_experience || 1,
            evaluation_score: Math.floor(Math.random() * 20) + 80,
            is_white_whistle: userData.is_white_whistle || false,
            show_white_whistle: userData.is_white_whistle || false,
            created_at: new Date(),
            updated_at: new Date()
          });
          console.log(`  Created referee profile for existing user ${userData.email}`);
        }
      }
    }
  }
  
  console.log('\n✅ Enhanced demo users seeded successfully!');
  console.log('Users with enhanced profiles including:');
  console.log('  - Complete name and contact information');
  console.log('  - Realistic experience levels and wages');
  console.log('  - Detailed notes about each user');
  console.log('  - Proper role assignments through RBAC system');
  console.log('  - Referee profiles with wages and experience');
  console.log('\nLogin credentials (password: "password" for all):');
  demoUsers.forEach(user => {
    const status = user.is_active === false ? ' (INACTIVE)' : user.is_available === false ? ' (UNAVAILABLE)' : '';
    console.log(`  - ${user.email} (${user.assignRole})${status}`);
  });
};