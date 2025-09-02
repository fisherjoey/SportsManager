/**
 * Add user notes permissions migration
 * 
 * Creates permissions for viewing and editing user notes
 * Assigns these permissions to appropriate admin roles
 */

exports.up = async function(knex) {
  console.log('Adding user notes permissions...');

  // Define the permissions with proper RBAC structure
  const permissions = [
    {
      id: 'a1b2c3d4-e5f6-4789-90ab-cdef12345678',
      name: 'user_notes:read',
      category: 'users',
      description: 'Can view administrative notes on user profiles',
      is_system: true
    },
    {
      id: 'b2c3d4e5-f6a7-5890-01bc-def123456789', 
      name: 'user_notes:write',
      category: 'users',
      description: 'Can add, edit, and delete administrative notes on user profiles',
      is_system: true
    }
  ];

  // Insert permissions
  for (const permission of permissions) {
    const existingPermission = await knex('permissions').where('id', permission.id).first();
    if (!existingPermission) {
      await knex('permissions').insert({
        id: permission.id,
        name: permission.name,
        category: permission.category,
        description: permission.description,
        is_system: permission.is_system,
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log(`  Created permission: ${permission.name}`);
    } else {
      console.log(`  Permission already exists: ${permission.name}`);
    }
  }

  // Assign permissions to admin roles
  const adminRoles = ['Super Admin', 'Admin'];
  
  for (const roleName of adminRoles) {
    const role = await knex('roles').where('name', roleName).first();
    if (role) {
      for (const permission of permissions) {
        // Check if role-permission assignment already exists
        const existingAssignment = await knex('role_permissions')
          .where('role_id', role.id)
          .where('permission_id', permission.id)
          .first();
          
        if (!existingAssignment) {
          await knex('role_permissions').insert({
            role_id: role.id,
            permission_id: permission.id,
            created_at: new Date()
          });
          console.log(`  Assigned "${permission.name}" to ${roleName}`);
        } else {
          console.log(`  ${roleName} already has "${permission.name}" permission`);
        }
      }
    } else {
      console.log(`  Role "${roleName}" not found, skipping permission assignments`);
    }
  }

  console.log('✅ User notes permissions added successfully');
  console.log('   Admin roles can now view and edit user notes');
  console.log('   Regular users cannot see administrative notes');
};

exports.down = async function(knex) {
  console.log('Removing user notes permissions...');

  const permissionIds = ['a1b2c3d4-e5f6-4789-90ab-cdef12345678', 'b2c3d4e5-f6a7-5890-01bc-def123456789'];
  
  // Remove role-permission assignments
  await knex('role_permissions').whereIn('permission_id', permissionIds).del();
  console.log('  Removed role-permission assignments');
  
  // Remove permissions
  await knex('permissions').whereIn('id', permissionIds).del();
  console.log('  Removed permissions');

  console.log('✅ User notes permissions removed');
};