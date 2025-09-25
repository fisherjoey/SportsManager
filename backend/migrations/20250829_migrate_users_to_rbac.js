/**
 * User RBAC Migration
 * 
 * Maps existing users with role='admin' and role='referee' to the new RBAC system.
 * This migration must run after the RBAC system tables are created and seeded.
 * 
 * Mapping:
 * - Users with role='admin' → Admin role
 * - Users with role='referee' → Referee role
 * 
 * The existing role column is preserved for backward compatibility during transition.
 */

exports.up = async function(knex) {
  console.log('Starting user RBAC migration...');

  // Get the role IDs from the new RBAC system
  const adminRole = await knex('roles').where('name', 'Admin').first();
  const refereeRole = await knex('roles').where('name', 'Referee').first();

  if (!adminRole || !refereeRole) {
    throw new Error('Required roles (Admin, Referee) not found. Please ensure RBAC seed data has been run.');
  }

  // Get all users with their current roles
  const users = await knex('users').select('id', 'role', 'email');

  let adminCount = 0;
  let refereeCount = 0;
  let skippedCount = 0;

  for (const user of users) {
    let targetRoleId = null;

    // Map existing role to new RBAC role
    switch (user.role) {
      case 'admin':
        targetRoleId = adminRole.id;
        adminCount++;
        break;
      case 'referee':
        targetRoleId = refereeRole.id;
        refereeCount++;
        break;
      default:
        console.log(`⚠️  Unknown role '${user.role}' for user ${user.email}, skipping...`);
        skippedCount++;
        continue;
    }

    // Check if user already has this role assigned
    const existingAssignment = await knex('user_roles')
      .where('user_id', user.id)
      .where('role_id', targetRoleId)
      .first();

    if (!existingAssignment) {
      // Assign the role to the user
      await knex('user_roles').insert({
        user_id: user.id,
        role_id: targetRoleId,
        assigned_at: knex.fn.now(),
        assigned_by: null, // System migration
        is_active: true
      });

      console.log(`✓ Assigned ${user.role} role to ${user.email}`);
    } else {
      console.log(`- User ${user.email} already has ${user.role} role assigned`);
    }
  }

  console.log('User RBAC migration completed:');
  console.log(`  ✓ ${adminCount} users assigned Admin role`);
  console.log(`  ✓ ${refereeCount} users assigned Referee role`);
  if (skippedCount > 0) {
    console.log(`  ⚠️  ${skippedCount} users skipped due to unknown roles`);
  }
  console.log(`  📋 Total users processed: ${users.length}`);
  console.log('  📌 Original role column preserved for backward compatibility');
};

exports.down = async function(knex) {
  console.log('Rolling back user RBAC migration...');

  // Get the role IDs that we assigned in the up migration
  const adminRole = await knex('roles').where('name', 'Admin').first();
  const refereeRole = await knex('roles').where('name', 'Referee').first();

  if (adminRole) {
    const adminRoleAssignments = await knex('user_roles').where('role_id', adminRole.id);
    await knex('user_roles').where('role_id', adminRole.id).del();
    console.log(`✓ Removed ${adminRoleAssignments.length} Admin role assignments`);
  }

  if (refereeRole) {
    const refereeRoleAssignments = await knex('user_roles').where('role_id', refereeRole.id);
    await knex('user_roles').where('role_id', refereeRole.id).del();
    console.log(`✓ Removed ${refereeRoleAssignments.length} Referee role assignments`);
  }

  console.log('✓ User RBAC migration rollback completed');
};