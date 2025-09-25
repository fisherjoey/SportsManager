/**
 * Phase 2 Migration 2.1: Create Referee Roles
 *
 * Creates the new referee role architecture with:
 * - Base "Referee" role that all referees must have
 * - Secondary specialization roles (Rookie, Junior, Senior, Head, Coach)
 *
 * This migration implements the base + secondary role system as specified
 * in PHASE_2_DATABASE_MIGRATIONS.md
 */

exports.up = async function(knex) {
  console.log('Starting Phase 2 Migration 2.1: Create referee roles...');

  // Define the referee roles according to Phase 2 spec
  const roles = [
    {
      name: 'Referee',
      description: 'Base role for all referees',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Rookie Referee',
      description: 'New referee with limited permissions',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Junior Referee',
      description: 'Standard referee',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Senior Referee',
      description: 'Experienced referee with mentoring capabilities',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Head Referee',
      description: 'Lead referee with management permissions',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Referee Coach',
      description: 'Referee trainer and evaluator',
      is_system: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ];

  // Insert roles if they don't exist, update if they do exist but aren't system roles
  for (const role of roles) {
    const existing = await knex('roles').where('name', role.name).first();

    if (!existing) {
      await knex('roles').insert({
        id: knex.raw('gen_random_uuid()'),
        ...role
      });
      console.log(`✓ Created role: ${role.name}`);
    } else {
      // Update existing role to ensure it's marked as system role with correct description
      await knex('roles')
        .where('name', role.name)
        .update({
          description: role.description,
          is_system: true,
          updated_at: knex.fn.now()
        });
      console.log(`✓ Updated existing role: ${role.name}`);
    }
  }

  console.log('✅ Phase 2 Migration 2.1: Referee roles created successfully');
  console.log('📋 Created/Updated roles:');
  console.log('  • Referee (base role for all referees)');
  console.log('  • Rookie Referee (new referees)');
  console.log('  • Junior Referee (standard referees)');
  console.log('  • Senior Referee (experienced with mentoring)');
  console.log('  • Head Referee (management permissions)');
  console.log('  • Referee Coach (trainer and evaluator)');
};

exports.down = async function(knex) {
  console.log('Rolling back Phase 2 Migration 2.1...');

  // Remove the referee roles created in this migration
  const roleNames = [
    'Referee',
    'Rookie Referee',
    'Junior Referee',
    'Senior Referee',
    'Head Referee',
    'Referee Coach'
  ];

  // First remove any user role assignments for these roles
  const roleIds = await knex('roles')
    .whereIn('name', roleNames)
    .pluck('id');

  if (roleIds.length > 0) {
    await knex('user_roles').whereIn('role_id', roleIds).del();
    await knex('role_permissions').whereIn('role_id', roleIds).del();
    console.log('✓ Removed user role assignments and permissions');
  }

  // Then remove the roles themselves
  const deletedCount = await knex('roles').whereIn('name', roleNames).del();
  console.log(`✓ Removed ${deletedCount} referee roles`);

  console.log('✅ Phase 2 Migration 2.1 rollback completed');
};