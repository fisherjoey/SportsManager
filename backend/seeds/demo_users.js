exports.seed = async function(knex) {
  const bcrypt = require('bcryptjs');
  const saltRounds = 12;

  // Role IDs from the RBAC system
  const ROLE_IDS = {
    'Super Admin': 'cbdeacc1-40b9-4297-9888-cdda640cefe3',
    'Admin': '12df1977-44c0-4787-abae-e2919272ce75',
    'Referee': '1f3c989f-4bf6-44a8-9467-f3e7a51526fc' // Junior Referee type role
  };

  // Demo users with basic data (using only existing fields)
  const demoUsers = [
    {
      email: 'admin@cmba.ca',
      password: 'password',
      name: 'CMBA Admin',
      phone: '+1 (403) 234-5678',
      postal_code: 'T2P 1A1',
      is_active: true,
      assignRole: 'Admin'
    },
    {
      email: 'admin@refassign.com',
      password: 'password',
      name: 'System Admin',
      phone: '+1 (403) 567-8901',
      postal_code: 'T2N 2B2',
      is_active: true,
      assignRole: 'Super Admin'
    },
    {
      email: 'referee@test.com',
      password: 'password',
      name: 'Test Referee',
      phone: '+1 (403) 555-0123',
      location: 'Calgary, AB',
      postal_code: 'T2A 1B2',
      max_distance: 25,
      is_available: true,
      assignRole: 'Referee'
    }
  ];

  // Insert demo users and assign roles
  for (const userData of demoUsers) {
    const existingUser = await knex('users').where('email', userData.email).first();
    
    if (!existingUser) {
      const { password, assignRole, ...userRecord } = userData;
      userRecord.password_hash = await bcrypt.hash(password, saltRounds);
      
      // Insert user
      const [user] = await knex('users').insert(userRecord).returning('*');
      console.log(`Created demo user: ${userData.email} (${userData.name})`);
      
      // Create referee profile for referee users
      if (assignRole === 'Referee') {
        const existingProfile = await knex('referee_profiles').where('user_id', user.id).first();
        if (!existingProfile) {
          await knex('referee_profiles').insert({
            user_id: user.id,
            wage_amount: 45.00,
            wage_currency: 'CAD',
            payment_method: 'direct_deposit',
            years_experience: 3,
            evaluation_score: 8.5,
            certification_level: 'Junior',
            max_weekly_games: 10,
            notes: 'Test referee account for development and testing',
            is_active: true
          });
          console.log(`  Created referee profile for ${userData.email}`);
        }
      }
      
      // Assign role to user
      if (assignRole && ROLE_IDS[assignRole]) {
        // For referee roles, remove existing referee_type roles first
        if (assignRole === 'Referee') {
          await knex('user_roles')
            .whereIn('role_id', function() {
              this.select('id').from('roles').where('category', 'referee_type');
            })
            .where('user_id', user.id)
            .del();
        }
        
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
    } else {
      console.log(`Demo user already exists: ${userData.email}`);
      
      // Create referee profile for referee users if it doesn't exist
      if (userData.assignRole === 'Referee') {
        const existingProfile = await knex('referee_profiles').where('user_id', existingUser.id).first();
        if (!existingProfile) {
          await knex('referee_profiles').insert({
            user_id: existingUser.id,
            wage_amount: 45.00,
            wage_currency: 'CAD',
            payment_method: 'direct_deposit',
            years_experience: 3,
            evaluation_score: 8.5,
            certification_level: 'Junior',
            max_weekly_games: 10,
            notes: 'Test referee account for development and testing',
            is_active: true
          });
          console.log(`  Created referee profile for existing user ${userData.email}`);
        } else {
          console.log(`  User ${userData.email} already has referee profile`);
        }
      }
      
      // Ensure role is assigned even if user exists
      const assignRole = userData.assignRole;
      if (assignRole && ROLE_IDS[assignRole]) {
        // For referee roles, remove existing referee_type roles first
        if (assignRole === 'Referee') {
          await knex('user_roles')
            .whereIn('role_id', function() {
              this.select('id').from('roles').where('category', 'referee_type');
            })
            .where('user_id', existingUser.id)
            .del();
        }
        
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
    }
  }
  
  console.log('\n✅ Demo users seeded successfully!');
  console.log('You can now login with:');
  console.log('  - admin@cmba.ca (Admin)');
  console.log('  - admin@refassign.com (Super Admin)');
  console.log('  - referee@test.com (Referee)');
  console.log('  Password for all: password');
};