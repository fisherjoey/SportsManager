/**
 * 002_test_users.js
 *
 * OPTIONAL SEED - For development and testing
 *
 * Seeds test user accounts for each role type to enable development and testing:
 * - Super Admin
 * - Admin
 * - Assignment Manager
 * - Referee Coordinator
 * - Senior Referee
 * - Junior Referee
 *
 * This seed is IDEMPOTENT - checks if users exist before creating.
 *
 * IMPORTANT: All test users use password "admin123" or "referee123"
 */

const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  console.log('👥 Seeding test users...\n');

  // Use lower salt rounds for development (faster)
  const saltRounds = 10;

  // Get role IDs from database
  const roles = await knex('roles').select('id', 'code', 'name');
  const roleMap = roles.reduce((map, role) => {
    map[role.code] = role;
    return map;
  }, {});

  // Get referee levels for referee users
  const refereeLevels = await knex('referee_levels').select('id', 'name');
  const levelMap = refereeLevels.reduce((map, level) => {
    map[level.name] = level;
    return map;
  }, {});

  // ============================================================================
  // Define test users
  // ============================================================================
  const testUsers = [
    {
      email: 'admin@sportsmanager.com',
      password: 'admin123',
      name: 'Super Admin User',
      phone: '+1 (403) 555-0001',
      postal_code: 'T2P 1A1',
      city: 'Calgary',
      province_state: 'AB',
      country: 'Canada',
      availability_status: 'active',
      role_code: 'SUPER_ADMIN',
      is_referee: false
    },
    {
      email: 'admin@cmba.ca',
      password: 'admin123',
      name: 'Admin User',
      phone: '+1 (403) 555-0002',
      postal_code: 'T2N 2B2',
      city: 'Calgary',
      province_state: 'AB',
      country: 'Canada',
      availability_status: 'active',
      role_code: 'ADMIN',
      is_referee: false
    },
    {
      email: 'assignor@cmba.ca',
      password: 'admin123',
      name: 'Assignment Manager',
      phone: '+1 (403) 555-0003',
      postal_code: 'T2E 3C3',
      city: 'Calgary',
      province_state: 'AB',
      country: 'Canada',
      availability_status: 'active',
      role_code: 'ASSIGNMENT_MANAGER',
      is_referee: false
    },
    {
      email: 'coordinator@cmba.ca',
      password: 'admin123',
      name: 'Referee Coordinator',
      phone: '+1 (403) 555-0004',
      postal_code: 'T2W 4D4',
      city: 'Calgary',
      province_state: 'AB',
      country: 'Canada',
      availability_status: 'active',
      role_code: 'REFEREE_COORDINATOR',
      is_referee: false
    },
    {
      email: 'senior.ref@cmba.ca',
      password: 'referee123',
      name: 'Senior Referee',
      phone: '+1 (403) 555-0005',
      postal_code: 'T2A 5E5',
      city: 'Calgary',
      province_state: 'AB',
      country: 'Canada',
      availability_status: 'active',
      is_available: true,
      max_distance: 30,
      role_code: 'SENIOR_REFEREE',
      is_referee: true,
      referee_level: 'Teaching',
      years_experience: 7,
      wage_per_game: 45.00
    },
    {
      email: 'referee@test.com',
      password: 'referee123',
      name: 'Junior Referee',
      phone: '+1 (403) 555-0006',
      postal_code: 'T2J 6F6',
      city: 'Calgary',
      province_state: 'AB',
      country: 'Canada',
      availability_status: 'active',
      is_available: true,
      max_distance: 25,
      role_code: 'JUNIOR_REFEREE',
      is_referee: true,
      referee_level: 'Growing',
      years_experience: 3,
      wage_per_game: 35.00
    }
  ];

  // ============================================================================
  // Create test users
  // ============================================================================
  let created = 0;
  let skipped = 0;

  for (const userData of testUsers) {
    // Check if user already exists
    const existingUser = await knex('users').where('email', userData.email).first();

    if (existingUser) {
      console.log(`  ⏭️  User already exists: ${userData.email}`);
      skipped++;

      // Ensure user has the correct role assigned
      const role = roleMap[userData.role_code];
      if (role) {
        const existingRole = await knex('user_roles')
          .where('user_id', existingUser.id)
          .where('role_id', role.id)
          .first();

        if (!existingRole) {
          await knex('user_roles').insert({
            user_id: existingUser.id,
            role_id: role.id,
            assigned_at: new Date(),
            assigned_by: existingUser.id
          });
          console.log(`    ✓ Assigned ${role.name} role`);
        }
      }

      // Create referee profile if needed
      if (userData.is_referee) {
        const existingProfile = await knex('referee_profiles')
          .where('user_id', existingUser.id)
          .first();

        if (!existingProfile) {
          const level = levelMap[userData.referee_level];
          await knex('referee_profiles').insert({
            is_active: true,
            user_id: existingUser.id,
            wage_amount: userData.wage_per_game,
            wage_currency: 'CAD',
            payment_method: 'direct_deposit',
            years_experience: userData.years_experience,
            evaluation_score: 8.5,
            certification_level: userData.referee_level,
            max_weekly_games: 10,
            notes: `Test ${userData.referee_level} referee account`,
            is_active: true
          });
          console.log(`    ✓ Created referee profile`);
        }
      }

      continue;
    }

    // Create new user
    const { password, role_code, referee_level, ...userRecord } = userData;
    userRecord.password_hash = await bcrypt.hash(password, saltRounds);

    // Add referee level FK if applicable
    if (userData.is_referee && userData.referee_level) {
      const level = levelMap[userData.referee_level];
      if (level) {
        userRecord.referee_level_id = level.id;
      }
    }

    const [user] = await knex('users').insert(userRecord).returning('*');
    console.log(`  ✓ Created user: ${userData.email} (${userData.name})`);
    created++;

    // Assign role to user
    const role = roleMap[userData.role_code];
    if (role) {
      await knex('user_roles').insert({
        user_id: user.id,
        role_id: role.id,
        assigned_at: new Date(),
        assigned_by: user.id // Self-assigned during seed
      });
      console.log(`    ✓ Assigned ${role.name} role`);
    } else {
      console.log(`    ⚠️  Warning: Role ${userData.role_code} not found`);
    }

    // Create referee profile for referee users
    if (userData.is_referee) {
      await knex('referee_profiles').insert({
            is_active: true,
        user_id: user.id,
        wage_amount: userData.wage_per_game,
        wage_currency: 'CAD',
        payment_method: 'direct_deposit',
        years_experience: userData.years_experience,
        evaluation_score: 8.5,
        certification_level: userData.referee_level,
        max_weekly_games: 10,
        notes: `Test ${userData.referee_level} referee account`,
        is_active: true
      });
      console.log(`    ✓ Created referee profile`);
    }
  }

  // ============================================================================
  // Summary
  // ============================================================================
  console.log();
  console.log('✅ Test users seeded successfully!\n');
  console.log('Summary:');
  console.log(`  - ${created} users created`);
  console.log(`  - ${skipped} users already existed`);
  console.log();
  console.log('Test User Credentials:');
  console.log('  ┌─────────────────────────────────────────────────────────────┐');
  console.log('  │ Email                       │ Password    │ Role            │');
  console.log('  ├─────────────────────────────────────────────────────────────┤');
  console.log('  │ admin@sportsmanager.com     │ admin123    │ Super Admin     │');
  console.log('  │ admin@cmba.ca               │ admin123    │ Admin           │');
  console.log('  │ assignor@cmba.ca            │ admin123    │ Assign Manager  │');
  console.log('  │ coordinator@cmba.ca         │ admin123    │ Ref Coordinator │');
  console.log('  │ senior.ref@cmba.ca          │ referee123  │ Senior Referee  │');
  console.log('  │ referee@test.com            │ referee123  │ Junior Referee  │');
  console.log('  └─────────────────────────────────────────────────────────────┘');
  console.log();
};
