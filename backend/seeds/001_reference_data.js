/**
 * 001_reference_data.js
 *
 * CRITICAL SEED - ALWAYS RUN FIRST
 *
 * Seeds core reference data required for the application to function:
 * - Roles (used with Cerbos authorization)
 * - Referee Levels (CMBA grading system)
 *
 * NOTE: This application uses Cerbos for authorization. Permissions are
 * defined in Cerbos policy files (cerbos-policies/*.yaml), not in the database.
 *
 * This seed is IDEMPOTENT - can be run multiple times safely.
 */

exports.seed = async function(knex) {
  console.log('🔐 Seeding reference data...\n');

  // ============================================================================
  // STEP 1: Clear existing role data (in correct order to avoid FK violations)
  // ============================================================================
  console.log('  Clearing existing role data...');
  await knex('user_roles').del();
  await knex('roles').del();
  console.log('  ✓ Cleared role data\n');

  // ============================================================================
  // STEP 2: Define and insert system roles
  // ============================================================================
  console.log('  Creating roles...');

  // Roles that work with Cerbos policies
  // Permissions are defined in cerbos-policies/*.yaml files
  const roleDefinitions = [
    {
      name: 'Super Admin',
      code: 'SUPER_ADMIN',
      description: 'Full system access with all permissions. Can manage other admins and system settings.',
      category: 'system',
      color: '#DC2626'
    },
    {
      name: 'Admin',
      code: 'ADMIN',
      description: 'Administrative access to most system functions. Cannot manage roles or impersonate users.',
      category: 'system',
      color: '#EA580C'
    },
    {
      name: 'Assignment Manager',
      code: 'ASSIGNMENT_MANAGER',
      description: 'Manages game assignments and referee scheduling. Can assign referees to games.',
      category: 'operational',
      color: '#F59E0B'
    },
    {
      name: 'Referee Coordinator',
      code: 'REFEREE_COORDINATOR',
      description: 'Coordinates referee activities, evaluations, and development. Manages referee information.',
      category: 'operational',
      color: '#10B981'
    },
    {
      name: 'Senior Referee',
      code: 'SENIOR_REFEREE',
      description: 'Experienced referee with additional privileges. Can evaluate other referees.',
      category: 'referee_type',
      color: '#3B82F6',
      referee_config: {
        level: 'Senior',
        can_evaluate: true,
        min_experience_years: 5
      }
    },
    {
      name: 'Junior Referee',
      code: 'JUNIOR_REFEREE',
      description: 'Basic referee role with access to assignments and personal information.',
      category: 'referee_type',
      color: '#6366F1',
      referee_config: {
        level: 'Junior',
        can_evaluate: false
      }
    },
    {
      name: 'Assignor',
      code: 'ASSIGNOR',
      description: 'Can assign referees to games and manage game schedules.',
      category: 'operational',
      color: '#8B5CF6'
    }
  ];

  // Insert roles
  const insertedRoles = [];
  for (const roleDef of roleDefinitions) {
    const [role] = await knex('roles').insert({
      name: roleDef.name,
      code: roleDef.code,
      description: roleDef.description,
      category: roleDef.category,
      color: roleDef.color,
      referee_config: roleDef.referee_config ? JSON.stringify(roleDef.referee_config) : null,
      is_system: true,
      is_active: true
    }).returning('*');

    insertedRoles.push(role);
    console.log(`  ✓ Created role: ${role.name} (${role.code})`);
  }

  console.log();

  // ============================================================================
  // STEP 3: Seed referee levels (skip if already exist - idempotent)
  // ============================================================================
  console.log('  Creating referee levels...');

  // Check if referee levels already exist
  const existingLevels = await knex('referee_levels').count('* as count');
  if (existingLevels[0].count > 0) {
    console.log(`  ⏭️  Referee levels already exist (${existingLevels[0].count} levels), skipping...\n`);

    console.log('✅ Reference data seeded successfully!\n');
    console.log('Summary:');
    console.log(`  - ${insertedRoles.length} roles created`);
    console.log(`  - ${existingLevels[0].count} referee levels already exist`);
    console.log();
    console.log('NOTE: Permissions are managed via Cerbos policies in cerbos-policies/*.yaml');
    console.log();
    return;
  }

  const refereeLevels = [
    {
      name: 'Learning',
      wage_amount: 25.00,
      description: 'Rookies with no referee experience. Junior official showing limited progress in skill or who referees minimal games. Uses a white whistle',
      allowed_divisions: JSON.stringify(['U11-2', 'U11-1', 'U13-3']),
      experience_requirements: JSON.stringify({
        min_years: 0,
        max_years: 1,
        min_games_season: 0,
        whistle_color: 'white'
      }),
      capability_requirements: JSON.stringify({
        divisions: 'U11 Division. Mid-Lower U13 with a more experienced partner',
        call_accuracy: 'Will need prodding and guidance at first',
        mechanics: 'Beginning to learn the basics',
        attitude: 'Positive attitude learning basics',
        involvement: 'Participates in the JTT'
      })
    },
    {
      name: 'Learning+',
      wage_amount: 30.00,
      description: 'Consider giving newer officials who are 18 or older. Junior Official in their 2nd Year showing progression in skill. Uses a white or black whistle',
      allowed_divisions: JSON.stringify(['U11-2', 'U11-1', 'U13-3', 'U13-2', 'U15-3']),
      experience_requirements: JSON.stringify({
        min_years: 1,
        max_years: 2,
        min_games_season: 20,
        whistle_color: 'white or black'
      }),
      capability_requirements: JSON.stringify({
        divisions: 'U13 Level Referee. Potential to move into low U15 and U11 Division 1/2 with more experienced partner',
        call_accuracy: 'Confident when they blow their whistle',
        mechanics: 'General understanding of mechanics, positioning, and rule knowledge',
        attitude: 'Receiving positive feedback on their performance',
        involvement: 'Potential participation in JTT'
      })
    },
    {
      name: 'Growing',
      wage_amount: 35.00,
      description: 'Junior Official in their 3rd/4th Year. Maximum pay for official who attends the 2nd Year Clinic. Uses a black whistle',
      allowed_divisions: JSON.stringify(['U13-2', 'U13-1', 'U15-3', 'U15-2']),
      experience_requirements: JSON.stringify({
        min_years: 2,
        max_years: 4,
        min_games_season: 30,
        whistle_color: 'black',
        clinic_requirement: '2nd Year Clinic'
      }),
      capability_requirements: JSON.stringify({
        divisions: 'U13 and U15 (mid to low level) Level Referee with an equal level partner',
        call_accuracy: 'Good call accuracy. Working on improving call quality and using game management',
        mechanics: 'Some fine tuning required but mechanics and positioning are mostly good',
        attitude: 'Shows willingness to referee on most/all weekends',
        involvement: 'Potential SOTT candidate and mentor at the JTT'
      })
    },
    {
      name: 'Growing+',
      wage_amount: 40.00,
      description: 'Maximum pay for an official who attends the 3rd/4th Year Clinic. Pay for some Senior Officials based on other categories',
      allowed_divisions: JSON.stringify(['U13-2', 'U13-1', 'U15-2', 'U15-1', 'U18-3']),
      experience_requirements: JSON.stringify({
        min_years: 3,
        max_years: 5,
        min_games_season: 40,
        clinic_requirement: '3rd/4th Year Clinic'
      }),
      capability_requirements: JSON.stringify({
        divisions: 'U15 Level Referee with an equal level partner. Potential to move into U15 Division 1 and lower U18 divisions',
        call_accuracy: 'Good call accuracy. Beginning to use game management to improve call quality',
        mechanics: 'Good mechanics, positioning, and rule knowledge. Mainly needs some fine tuning',
        attitude: 'Always puts forth their best attitude/effort. Reliable and diligent',
        involvement: 'Strong consideration as participant in the SOTT candidate. Mentor at the JTT'
      })
    },
    {
      name: 'Teaching',
      wage_amount: 45.00,
      description: 'Senior official with a minimum 5 years experience',
      allowed_divisions: JSON.stringify(['U15-1', 'U18-2', 'U18-1']),
      experience_requirements: JSON.stringify({
        min_years: 5,
        min_games_season: 50,
        committee_approval: true
      }),
      capability_requirements: JSON.stringify({
        divisions: 'Can referee and maintain control at most levels CMBA with a less experienced or equal level partner',
        call_accuracy: 'Great call accuracy and quality. Applies RSBQ and uses the no-call as a valuable tool',
        mechanics: 'Fundamentally sound mechanics and positioning. Great knowledge and application of rules',
        attitude: 'Always puts forth their best attitude/effort. Works well with other officials',
        involvement: 'Official we would consider for role in CMBA. Previous experience as official at the SOTT'
      })
    },
    {
      name: 'Expert',
      wage_amount: 50.00,
      description: 'Amongst the strongest Senior officials in the CMBA',
      allowed_divisions: JSON.stringify(['U18-1', 'Prep League']),
      experience_requirements: JSON.stringify({
        min_years: 7,
        min_games_season: 60,
        committee_approval: true,
        executive_director_approval: true
      }),
      capability_requirements: JSON.stringify({
        divisions: 'Can referee and maintain control at any level in CMBA with any partner',
        call_accuracy: 'Excellent call accuracy and quality. Excellent game management skills',
        mechanics: 'Advanced understanding of mechanics, positioning, and rule knowledge/application',
        attitude: 'Puts forth their best attitude/effort regardless of the level and assists new officials',
        involvement: 'Official we would consider for a large role in CMBA. Evaluator at SOTT'
      })
    }
  ];

  await knex('referee_levels').insert(refereeLevels);
  console.log(`  ✓ Created ${refereeLevels.length} referee levels\n`);

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('✅ Reference data seeded successfully!\n');
  console.log('Summary:');
  console.log(`  - ${insertedRoles.length} roles created`);
  console.log(`  - ${refereeLevels.length} referee levels created`);
  console.log();
  console.log('NOTE: Permissions are managed via Cerbos policies in cerbos-policies/*.yaml');
  console.log();
};
