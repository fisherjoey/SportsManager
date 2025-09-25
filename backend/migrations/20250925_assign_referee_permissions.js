/**
 * Phase 2 Migration 2.3: Assign Permissions to Roles
 *
 * Assigns the appropriate permissions to each referee role based on
 * the role hierarchy defined in PHASE_2_DATABASE_MIGRATIONS.md
 *
 * Role hierarchy:
 * - Referee: Base permissions (all referees get these)
 * - Rookie Referee: Base + mentorship requests + view own evaluations
 * - Junior Referee: Base + self-assign + view own evaluations
 * - Senior Referee: Base + mentoring + evaluations + recommendations + junior approvals
 * - Head Referee: All permissions + management + overrides
 * - Referee Coach: Training + evaluations + certifications + mentoring
 */

exports.up = async function(knex) {
  console.log('Starting Phase 2 Migration 2.3: Assign permissions to roles...');

  // Helper function to assign permission to role
  async function assignPermission(roleName, permissionName) {
    const role = await knex('roles').where('name', roleName).first();
    const permission = await knex('permissions').where('name', permissionName).first();

    if (!role) {
      console.log(`⚠️ Role not found: ${roleName}`);
      return false;
    }

    if (!permission) {
      console.log(`⚠️ Permission not found: ${permissionName}`);
      return false;
    }

    const existing = await knex('role_permissions')
      .where({ role_id: role.id, permission_id: permission.id })
      .first();

    if (!existing) {
      await knex('role_permissions').insert({
        id: knex.raw('gen_random_uuid()'),
        role_id: role.id,
        permission_id: permission.id,
        created_at: knex.fn.now()
      });
      console.log(`✓ Assigned ${permissionName} to ${roleName}`);
      return true;
    } else {
      console.log(`- ${roleName} already has ${permissionName}`);
      return false;
    }
  }

  let assignedCount = 0;

  // Base Referee role permissions (all referees get these)
  const basePermissions = [
    'games.view',
    'assignments.view',
    'assignments.accept',
    'profile.edit.own'
  ];

  console.log('\n🔹 Assigning base permissions to Referee role...');
  for (const perm of basePermissions) {
    if (await assignPermission('Referee', perm)) assignedCount++;
  }

  // Rookie Referee additional permissions
  console.log('\n🔹 Assigning additional permissions to Rookie Referee...');
  const rookiePermissions = ['mentorship.request', 'evaluations.view.own'];
  for (const perm of rookiePermissions) {
    if (await assignPermission('Rookie Referee', perm)) assignedCount++;
  }

  // Junior Referee additional permissions
  console.log('\n🔹 Assigning additional permissions to Junior Referee...');
  const juniorPermissions = ['games.self_assign', 'evaluations.view.own'];
  for (const perm of juniorPermissions) {
    if (await assignPermission('Junior Referee', perm)) assignedCount++;
  }

  // Senior Referee additional permissions
  console.log('\n🔹 Assigning additional permissions to Senior Referee...');
  const seniorPermissions = [
    'mentorship.provide',
    'evaluations.create',
    'games.recommend',
    'assignments.approve.junior'
  ];
  for (const perm of seniorPermissions) {
    if (await assignPermission('Senior Referee', perm)) assignedCount++;
  }

  // Head Referee additional permissions (includes all senior permissions)
  console.log('\n🔹 Assigning additional permissions to Head Referee...');
  const headPermissions = [
    'referees.manage',
    'assignments.override',
    'evaluations.manage',
    // Also include senior permissions
    ...seniorPermissions
  ];
  for (const perm of headPermissions) {
    if (await assignPermission('Head Referee', perm)) assignedCount++;
  }

  // Referee Coach permissions (specialized role)
  console.log('\n🔹 Assigning permissions to Referee Coach...');
  const coachPermissions = [
    'evaluations.create',
    'evaluations.manage',
    'training.create',
    'certifications.approve',
    'mentorship.provide'
  ];
  for (const perm of coachPermissions) {
    if (await assignPermission('Referee Coach', perm)) assignedCount++;
  }

  console.log(`\n✅ Phase 2 Migration 2.3: Permissions assigned successfully`);
  console.log(`📊 Total new permissions assigned: ${assignedCount}`);
  console.log('📋 Permission assignment summary:');
  console.log('  • Referee: 4 base permissions');
  console.log('  • Rookie Referee: +2 permissions (mentorship request, view evaluations)');
  console.log('  • Junior Referee: +2 permissions (self-assign, view evaluations)');
  console.log('  • Senior Referee: +4 permissions (mentoring, evaluations, recommendations)');
  console.log('  • Head Referee: +7 permissions (full management capabilities)');
  console.log('  • Referee Coach: 5 specialized permissions (training & evaluation)');
};

exports.down = async function(knex) {
  console.log('Rolling back Phase 2 Migration 2.3...');

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
    const deletedCount = await knex('role_permissions')
      .whereIn('role_id', roleIds)
      .del();

    console.log(`✓ Removed ${deletedCount} role-permission assignments`);
  }

  console.log('✅ Phase 2 Migration 2.3 rollback completed');
};