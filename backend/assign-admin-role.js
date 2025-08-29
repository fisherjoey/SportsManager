const config = require('./knexfile');
const knex = require('knex')(config.development);

async function assignAdminRole() {
  try {
    // Find admin user
    const adminUser = await knex('users')
      .where('email', 'admin@cmba.ca')
      .first();
    
    if (!adminUser) {
      console.log('Admin user not found');
      process.exit(1);
    }
    
    console.log('Found admin user:', adminUser.email);
    
    // Find Admin role
    const adminRole = await knex('roles')
      .where('name', 'Admin')
      .first();
    
    if (!adminRole) {
      console.log('Admin role not found');
      process.exit(1);
    }
    
    console.log('Found Admin role:', adminRole.name);
    
    // Check if assignment already exists
    const existing = await knex('user_roles')
      .where({
        user_id: adminUser.id,
        role_id: adminRole.id
      })
      .first();
    
    if (existing) {
      console.log('Admin user already has Admin role');
    } else {
      // Create assignment
      await knex('user_roles').insert({
        user_id: adminUser.id,
        role_id: adminRole.id,
        assigned_at: new Date(),
        assigned_by: adminUser.id
      });
      console.log('✓ Admin user assigned to Admin role successfully');
    }
    
    // Verify permissions
    const permissions = await knex('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .join('roles', 'role_permissions.role_id', 'roles.id')
      .join('user_roles', 'roles.id', 'user_roles.role_id')
      .where('user_roles.user_id', adminUser.id)
      .where('roles.is_active', true)
      .select('permissions.name')
      .distinct();
    
    console.log(`Admin user now has ${permissions.length} permissions`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

assignAdminRole();