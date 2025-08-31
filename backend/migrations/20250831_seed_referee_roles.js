/**
 * Seed Referee Roles Migration
 * 
 * Inserts the referee type roles and capability roles into the roles table.
 * This migration creates the foundational roles needed for the referee management system.
 */

exports.up = async function(knex) {
  console.log('Seeding referee roles...');

  // Insert referee type roles (exactly one required per referee)
  const refereeTypeRoles = [
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Senior Referee',
      description: 'Experienced referee with full privileges and responsibilities. Can officiate all division levels without supervision.',
      category: 'referee_type',
      referee_config: JSON.stringify({
        white_whistle: "never",
        min_experience_years: 3,
        allowed_divisions: ["Premier", "Competitive", "Recreational", "Youth"],
        supervision_required: false,
        default_wage_rate: 75.00,
        can_evaluate_others: true,
        max_games_per_day: 4
      }),
      is_system: true,
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Junior Referee',
      description: 'Intermediate referee with conditional white whistle privileges. Requires 1+ years experience.',
      category: 'referee_type',
      referee_config: JSON.stringify({
        white_whistle: "conditional",
        min_experience_years: 1,
        allowed_divisions: ["Competitive", "Recreational", "Youth"],
        supervision_required: false,
        default_wage_rate: 50.00,
        can_evaluate_others: false,
        max_games_per_day: 3
      }),
      is_system: true,
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Rookie Referee',
      description: 'New referee requiring supervision and always displays white whistle. Entry-level position.',
      category: 'referee_type',
      referee_config: JSON.stringify({
        white_whistle: "always",
        min_experience_years: 0,
        allowed_divisions: ["Recreational", "Youth"],
        supervision_required: true,
        default_wage_rate: 35.00,
        can_evaluate_others: false,
        max_games_per_day: 2
      }),
      is_system: true,
      is_active: true
    }
  ];

  // Insert referee capability roles (multiple allowed per referee)
  const refereeCapabilityRoles = [
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Evaluator',
      description: 'Can evaluate and assess the performance of other referees during games',
      category: 'referee_capability',
      referee_config: JSON.stringify({
        requires_certification: true,
        min_referee_type: "Junior Referee",
        evaluation_authority: "peer_and_below"
      }),
      is_system: true,
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Mentor',
      description: 'Can mentor and provide training guidance to new and developing referees',
      category: 'referee_capability',
      referee_config: JSON.stringify({
        requires_certification: true,
        min_referee_type: "Senior Referee",
        mentoring_scope: "rookie_and_junior"
      }),
      is_system: true,
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Inspector',
      description: 'Can inspect games and review officiating standards for quality assurance',
      category: 'referee_capability',
      referee_config: JSON.stringify({
        requires_certification: true,
        min_referee_type: "Senior Referee",
        inspection_authority: "all_levels"
      }),
      is_system: true,
      is_active: true
    }
  ];

  // Insert all referee type roles
  for (const role of refereeTypeRoles) {
    // Check if role already exists
    const existingRole = await knex('roles').where('name', role.name).first();
    
    if (!existingRole) {
      await knex('roles').insert(role);
      console.log(`✓ Inserted referee type role: ${role.name}`);
    } else {
      console.log(`- Role already exists: ${role.name}`);
    }
  }

  // Insert all referee capability roles
  for (const role of refereeCapabilityRoles) {
    // Check if role already exists
    const existingRole = await knex('roles').where('name', role.name).first();
    
    if (!existingRole) {
      await knex('roles').insert(role);
      console.log(`✓ Inserted referee capability role: ${role.name}`);
    } else {
      console.log(`- Role already exists: ${role.name}`);
    }
  }

  // Update existing 'Referee' role to be a system role with proper category
  const existingRefereeRole = await knex('roles').where('name', 'Referee').first();
  
  if (existingRefereeRole) {
    await knex('roles')
      .where('name', 'Referee')
      .update({
        category: 'legacy',
        description: 'Legacy referee role - will be migrated to specific referee types',
        is_system: true
      });
    console.log('✓ Updated legacy Referee role');
  }

  console.log('✅ Referee roles seeded successfully');
  console.log('📋 Summary:');
  console.log('  • 3 referee type roles (Senior, Junior, Rookie)');
  console.log('  • 3 referee capability roles (Evaluator, Mentor, Inspector)');
  console.log('  • 1 legacy role updated');
};

exports.down = async function(knex) {
  console.log('Rolling back referee roles seed...');

  // Remove referee type roles
  const refereeTypeNames = ['Senior Referee', 'Junior Referee', 'Rookie Referee'];
  const deletedTypeRoles = await knex('roles').whereIn('name', refereeTypeNames).del();
  console.log(`✓ Removed ${deletedTypeRoles} referee type roles`);

  // Remove referee capability roles
  const capabilityNames = ['Evaluator', 'Mentor', 'Inspector'];
  const deletedCapabilityRoles = await knex('roles').whereIn('name', capabilityNames).del();
  console.log(`✓ Removed ${deletedCapabilityRoles} referee capability roles`);

  // Revert legacy Referee role changes
  await knex('roles')
    .where('name', 'Referee')
    .update({
      category: null,
      description: 'Referee with game assignment privileges',
      is_system: false
    });
  console.log('✓ Reverted legacy Referee role');

  console.log('✓ Referee roles seed rollback completed');
};