/**
 * @fileoverview Assign roles to existing users
 * 
 * This seeder assigns roles from the new RBAC system to existing users
 * based on their legacy role field
 */

exports.seed = async function(knex) {
  console.log('🌱 Assigning roles to existing users...');

  try {
    // Get all users
    const users = await knex('users').select('id', 'email', 'role');
    console.log(`Found ${users.length} users to process`);

    // Get all roles
    const roles = await knex('roles').select('id', 'name');
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.name.toLowerCase()] = role.id;
      // Also map common variations
      if (role.name === 'Super Admin') {
        roleMap['admin'] = role.id; // Map legacy 'admin' to 'Super Admin'
        roleMap['superadmin'] = role.id;
        roleMap['super_admin'] = role.id;
      }
    });

    console.log('Available roles:', Object.keys(roleMap));

    let assignmentCount = 0;

    for (const user of users) {
      // Skip if user already has roles assigned
      const existingRoles = await knex('user_roles')
        .where('user_id', user.id)
        .count('* as count')
        .first();

      if (existingRoles.count > 0) {
        console.log(`   ⏭️  ${user.email} already has roles assigned`);
        continue;
      }

      // Map legacy role to new role
      let roleId = null;
      const legacyRole = user.role?.toLowerCase();

      if (legacyRole === 'admin') {
        // Map admin to Super Admin
        roleId = roleMap['admin'] || roleMap['super admin'];
      } else if (legacyRole === 'referee') {
        // Map referee to Referee role
        roleId = roleMap['referee'];
      } else if (roleMap[legacyRole]) {
        // Direct mapping
        roleId = roleMap[legacyRole];
      }

      if (roleId) {
        // Assign the role
        await knex('user_roles').insert({
          user_id: user.id,
          role_id: roleId,
          assigned_at: new Date(),
          assigned_by: user.id // Self-assigned during migration
        });
        
        const roleName = roles.find(r => r.id === roleId)?.name;
        console.log(`   ✅ Assigned ${roleName} role to ${user.email}`);
        assignmentCount++;
      } else {
        console.log(`   ⚠️  No matching role found for ${user.email} (legacy role: ${user.role})`);
      }
    }

    console.log(`\n✅ Role assignment complete: ${assignmentCount} users updated`);

  } catch (error) {
    console.error('❌ Error assigning roles:', error);
    throw error;
  }
};