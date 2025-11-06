import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Define permissions for referee operations
  const permissions = [
    // Base referee permissions
    {
      name: 'games.view',
      resource: 'games',
      action: 'view',
      description: 'View game assignments',
      created_at: knex.fn.now()
    },
    {
      name: 'assignments.view',
      resource: 'assignments',
      action: 'view',
      description: 'View own assignments',
      created_at: knex.fn.now()
    },
    {
      name: 'assignments.accept',
      resource: 'assignments',
      action: 'accept',
      description: 'Accept or decline assignments',
      created_at: knex.fn.now()
    },
    {
      name: 'profile.edit.own',
      resource: 'profile',
      action: 'edit',
      description: 'Edit own referee profile',
      created_at: knex.fn.now()
    },

    // Advanced referee permissions
    {
      name: 'games.self_assign',
      resource: 'games',
      action: 'self_assign',
      description: 'Self-assign to open games',
      created_at: knex.fn.now()
    },
    {
      name: 'mentorship.request',
      resource: 'mentorship',
      action: 'request',
      description: 'Request mentorship',
      created_at: knex.fn.now()
    },
    {
      name: 'mentorship.provide',
      resource: 'mentorship',
      action: 'provide',
      description: 'Act as mentor',
      created_at: knex.fn.now()
    },
    {
      name: 'evaluations.create',
      resource: 'evaluations',
      action: 'create',
      description: 'Evaluate other referees',
      created_at: knex.fn.now()
    },
    {
      name: 'evaluations.view.own',
      resource: 'evaluations',
      action: 'view',
      description: 'View own evaluations',
      created_at: knex.fn.now()
    },
    {
      name: 'evaluations.manage',
      resource: 'evaluations',
      action: 'manage',
      description: 'Manage all evaluations',
      created_at: knex.fn.now()
    },
    {
      name: 'games.recommend',
      resource: 'games',
      action: 'recommend',
      description: 'Recommend referees for games',
      created_at: knex.fn.now()
    },
    {
      name: 'assignments.approve.junior',
      resource: 'assignments',
      action: 'approve',
      description: 'Approve junior referee assignments',
      created_at: knex.fn.now()
    },
    {
      name: 'referees.manage',
      resource: 'referees',
      action: 'manage',
      description: 'Full referee management',
      created_at: knex.fn.now()
    },
    {
      name: 'assignments.override',
      resource: 'assignments',
      action: 'override',
      description: 'Override any assignment',
      created_at: knex.fn.now()
    },
    {
      name: 'training.create',
      resource: 'training',
      action: 'create',
      description: 'Create training materials',
      created_at: knex.fn.now()
    },
    {
      name: 'certifications.approve',
      resource: 'certifications',
      action: 'approve',
      description: 'Approve certifications',
      created_at: knex.fn.now()
    }
  ];

  // Insert permissions if they don't exist
  for (const permission of permissions) {
    const existing = await knex('permissions').where('name', permission.name).first();
    if (!existing) {
      await knex('permissions').insert(permission);
    }
  }

  console.log('✅ Referee permissions created');
}

export async function down(knex: Knex): Promise<void> {
  // Remove referee-specific permissions
  await knex('permissions')
    .where('resource', 'IN', [
      'games',
      'assignments',
      'mentorship',
      'evaluations',
      'referees',
      'training',
      'certifications'
    ])
    .delete();
}