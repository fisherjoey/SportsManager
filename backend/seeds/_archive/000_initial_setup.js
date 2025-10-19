// Initial database seed with core data only
// This runs AFTER migrations have created the tables

exports.seed = async function(knex) {
  console.log('Starting initial database setup...');

  // Only seed core tables that we know exist after migrations
  try {
    // 1. Insert initial users (including super admin)
    const existingUsers = await knex('users').select('email');
    const existingEmails = existingUsers.map(u => u.email);

    if (!existingEmails.includes('superadmin@test.com')) {
      console.log('Creating super admin user...');
      await knex('users').insert({
        id: '92f4c5e1-6a23-4b23-9c6d-8e5a3b4d5e6f',
        email: 'superadmin@test.com',
        password: '$2a$10$XKJYMRPtU2kJdKR3hx9pmeKGKK4gFwxhSp9ZpCb7TqQgH9xH9xH9x', // password123
        name: 'Super Admin',
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // 2. Create basic roles if they don't exist
    const existingRoles = await knex('roles').select('name');
    const existingRoleNames = existingRoles.map(r => r.name);

    const rolesToCreate = [
      { name: 'Super Admin', description: 'Full system access' },
      { name: 'Admin', description: 'Administrative access' },
      { name: 'Referee', description: 'Referee role' },
      { name: 'User', description: 'Basic user access' }
    ].filter(role => !existingRoleNames.includes(role.name));

    if (rolesToCreate.length > 0) {
      console.log(`Creating ${rolesToCreate.length} roles...`);
      for (const role of rolesToCreate) {
        await knex('roles').insert({
          id: knex.raw('gen_random_uuid()'),
          name: role.name,
          description: role.description,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    // 3. Assign Super Admin role to super admin user
    const superAdminUser = await knex('users').where('email', 'superadmin@test.com').first();
    const superAdminRole = await knex('roles').where('name', 'Super Admin').first();

    if (superAdminUser && superAdminRole) {
      const existingUserRole = await knex('user_roles')
        .where('user_id', superAdminUser.id)
        .where('role_id', superAdminRole.id)
        .first();

      if (!existingUserRole) {
        console.log('Assigning Super Admin role...');
        await knex('user_roles').insert({
          id: knex.raw('gen_random_uuid()'),
          user_id: superAdminUser.id,
          role_id: superAdminRole.id,
          assigned_at: new Date()
        });
      }
    }

    // 4. Create basic permissions if the table exists
    const hasPermissionsTable = await knex.schema.hasTable('permissions');
    if (hasPermissionsTable) {
      const existingPermissions = await knex('permissions').select('name');
      const existingPermissionNames = existingPermissions.map(p => p.name);

      const permissionsToCreate = [
        { name: 'users:read', description: 'View users' },
        { name: 'users:write', description: 'Create/edit users' },
        { name: 'users:delete', description: 'Delete users' },
        { name: 'roles:read', description: 'View roles' },
        { name: 'roles:write', description: 'Create/edit roles' },
        { name: 'roles:delete', description: 'Delete roles' },
        { name: 'games:read', description: 'View games' },
        { name: 'games:write', description: 'Create/edit games' },
        { name: 'games:delete', description: 'Delete games' }
      ].filter(perm => !existingPermissionNames.includes(perm.name));

      if (permissionsToCreate.length > 0) {
        console.log(`Creating ${permissionsToCreate.length} permissions...`);
        for (const permission of permissionsToCreate) {
          await knex('permissions').insert({
            id: knex.raw('gen_random_uuid()'),
            name: permission.name,
            description: permission.description,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }

      // Assign all permissions to Super Admin role
      if (superAdminRole) {
        const allPermissions = await knex('permissions').select('id');
        for (const permission of allPermissions) {
          const exists = await knex('role_permissions')
            .where('role_id', superAdminRole.id)
            .where('permission_id', permission.id)
            .first();

          if (!exists) {
            await knex('role_permissions').insert({
              id: knex.raw('gen_random_uuid()'),
              role_id: superAdminRole.id,
              permission_id: permission.id,
              granted_at: new Date()
            });
          }
        }
      }
    }

    console.log('✓ Initial database setup completed successfully');
  } catch (error) {
    console.error('Error during initial setup:', error.message);
    // Don't throw - allow partial seeding
  }
};