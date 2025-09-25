import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Helper function to assign permission to role
  async function assignPermission(roleName: string, permissionName: string) {
    const role = await knex('roles').where('name', roleName).first();
    const permission = await knex('permissions').where('name', permissionName).first();

    if (role && permission) {
      const existing = await knex('role_permissions')
        .where({ role_id: role.id, permission_id: permission.id })
        .first();

      if (!existing) {
        await knex('role_permissions').insert({
          role_id: role.id,
          permission_id: permission.id,
          created_at: knex.fn.now()
        });
      }
    }
  }

  // Base Referee role permissions (all referees get these)
  const basePermissions = [
    'games.view',
    'assignments.view',
    'assignments.accept',
    'profile.edit.own'
  ];

  for (const perm of basePermissions) {
    await assignPermission('Referee', perm);
  }

  // Rookie Referee additional permissions
  await assignPermission('Rookie Referee', 'mentorship.request');
  await assignPermission('Rookie Referee', 'evaluations.view.own');

  // Junior Referee additional permissions
  await assignPermission('Junior Referee', 'games.self_assign');
  await assignPermission('Junior Referee', 'evaluations.view.own');

  // Senior Referee additional permissions
  const seniorPermissions = [
    'mentorship.provide',
    'evaluations.create',
    'games.recommend',
    'assignments.approve.junior'
  ];

  for (const perm of seniorPermissions) {
    await assignPermission('Senior Referee', perm);
  }

  // Head Referee additional permissions
  const headPermissions = [
    'referees.manage',
    'assignments.override',
    'evaluations.manage',
    ...seniorPermissions // Inherits senior permissions
  ];

  for (const perm of headPermissions) {
    await assignPermission('Head Referee', perm);
  }

  // Referee Coach permissions
  const coachPermissions = [
    'evaluations.create',
    'evaluations.manage',
    'training.create',
    'certifications.approve',
    'mentorship.provide'
  ];

  for (const perm of coachPermissions) {
    await assignPermission('Referee Coach', perm);
  }

  console.log('✅ Permissions assigned to referee roles');
}

export async function down(knex: Knex): Promise<void> {
  // Get referee role IDs
  const refereeRoles = await knex('roles')
    .whereIn('name', [
      'Referee',
      'Rookie Referee',
      'Junior Referee',
      'Senior Referee',
      'Head Referee',
      'Referee Coach'
    ])
    .select('id');

  const roleIds = refereeRoles.map(r => r.id);

  // Remove all permission assignments for these roles
  if (roleIds.length > 0) {
    await knex('role_permissions')
      .whereIn('role_id', roleIds)
      .delete();
  }
}