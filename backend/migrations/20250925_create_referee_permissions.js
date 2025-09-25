/**
 * Phase 2 Migration 2.2: Create Referee Permissions
 *
 * Creates the permissions needed for the referee role system.
 * Defines granular permissions for different referee operations
 * that will be assigned to roles in the next migration.
 */

exports.up = async function(knex) {
  console.log('Starting Phase 2 Migration 2.2: Create referee permissions...');

  // Define permissions for referee operations
  // Note: Using existing schema with name, category, description columns
  const permissions = [
    // Base referee permissions
    {
      name: 'games.view',
      category: 'games',
      description: 'View game assignments',
      created_at: knex.fn.now()
    },
    {
      name: 'assignments.view',
      category: 'assignments',
      description: 'View own assignments',
      created_at: knex.fn.now()
    },
    {
      name: 'assignments.accept',
      category: 'assignments',
      description: 'Accept or decline assignments',
      created_at: knex.fn.now()
    },
    {
      name: 'profile.edit.own',
      category: 'profile',
      description: 'Edit own referee profile',
      created_at: knex.fn.now()
    },

    // Advanced referee permissions
    {
      name: 'games.self_assign',
      category: 'games',
      description: 'Self-assign to open games',
      created_at: knex.fn.now()
    },
    {
      name: 'mentorship.request',
      category: 'mentorship',
      description: 'Request mentorship',
      created_at: knex.fn.now()
    },
    {
      name: 'mentorship.provide',
      category: 'mentorship',
      description: 'Act as mentor',
      created_at: knex.fn.now()
    },
    {
      name: 'evaluations.create',
      category: 'evaluations',
      description: 'Evaluate other referees',
      created_at: knex.fn.now()
    },
    {
      name: 'evaluations.view.own',
      category: 'evaluations',
      description: 'View own evaluations',
      created_at: knex.fn.now()
    },
    {
      name: 'evaluations.manage',
      category: 'evaluations',
      description: 'Manage all evaluations',
      created_at: knex.fn.now()
    },
    {
      name: 'games.recommend',
      category: 'games',
      description: 'Recommend referees for games',
      created_at: knex.fn.now()
    },
    {
      name: 'assignments.approve.junior',
      category: 'assignments',
      description: 'Approve junior referee assignments',
      created_at: knex.fn.now()
    },
    {
      name: 'referees.manage',
      category: 'referees',
      description: 'Full referee management',
      created_at: knex.fn.now()
    },
    {
      name: 'assignments.override',
      category: 'assignments',
      description: 'Override any assignment',
      created_at: knex.fn.now()
    },
    {
      name: 'training.create',
      category: 'training',
      description: 'Create training materials',
      created_at: knex.fn.now()
    },
    {
      name: 'certifications.approve',
      category: 'certifications',
      description: 'Approve certifications',
      created_at: knex.fn.now()
    }
  ];

  // Insert permissions if they don't exist
  for (const permission of permissions) {
    const existing = await knex('permissions').where('name', permission.name).first();

    if (!existing) {
      await knex('permissions').insert({
        id: knex.raw('gen_random_uuid()'),
        ...permission,
        is_system: true,
        updated_at: knex.fn.now()
      });
      console.log(`✓ Created permission: ${permission.name}`);
    } else {
      // Update existing permission to ensure correct properties
      await knex('permissions')
        .where('name', permission.name)
        .update({
          category: permission.category,
          description: permission.description,
          is_system: true,
          updated_at: knex.fn.now()
        });
      console.log(`✓ Updated existing permission: ${permission.name}`);
    }
  }

  console.log('✅ Phase 2 Migration 2.2: Referee permissions created successfully');
  console.log('📋 Created/Updated permissions:');
  console.log('  • Base permissions: games.view, assignments.view, assignments.accept, profile.edit.own');
  console.log('  • Advanced permissions: games.self_assign, mentorship.*, evaluations.*');
  console.log('  • Management permissions: referees.manage, assignments.override');
  console.log('  • Training permissions: training.create, certifications.approve');
};

exports.down = async function(knex) {
  console.log('Rolling back Phase 2 Migration 2.2...');

  // Remove by specific permission names
  const permissionNames = [
    'games.view',
    'assignments.view',
    'assignments.accept',
    'profile.edit.own',
    'games.self_assign',
    'mentorship.request',
    'mentorship.provide',
    'evaluations.create',
    'evaluations.view.own',
    'evaluations.manage',
    'games.recommend',
    'assignments.approve.junior',
    'referees.manage',
    'assignments.override',
    'training.create',
    'certifications.approve'
  ];

  // First remove any role-permission assignments
  const permissionIds = await knex('permissions')
    .whereIn('name', permissionNames)
    .pluck('id');

  if (permissionIds.length > 0) {
    await knex('role_permissions').whereIn('permission_id', permissionIds).del();
    console.log('✓ Removed role-permission assignments');
  }

  // Then remove the permissions themselves
  const deletedCount = await knex('permissions')
    .whereIn('name', permissionNames)
    .del();

  console.log(`✓ Removed ${deletedCount} referee permissions`);
  console.log('✅ Phase 2 Migration 2.2 rollback completed');
};