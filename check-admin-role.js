const db = require('./backend/src/config/database');

async function checkAdminRole() {
  try {
    // Find admin@cmba.ca
    const admin = await db('users').where('email', 'admin@cmba.ca').first();
    console.log('User:', admin.email, 'Legacy Role:', admin.role);
    
    // Check user_roles
    const userRoles = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', admin.id)
      .select('roles.name');
    console.log('Assigned Roles:', userRoles.map(r => r.name));
    
    // Check if Admin role has any page access
    const adminRole = await db('roles').where('name', 'Admin').first();
    if (adminRole) {
      const pageAccess = await db('role_page_access')
        .where('role_id', adminRole.id)
        .where('can_access', true)
        .count('* as count')
        .first();
      console.log('Admin role has access to', pageAccess.count, 'pages');
    }
    
    // Check Super Admin role
    const superAdminRole = await db('roles').where('name', 'Super Admin').first();
    if (superAdminRole) {
      const pageAccess = await db('role_page_access')
        .where('role_id', superAdminRole.id)
        .where('can_access', true)
        .count('* as count')
        .first();
      console.log('Super Admin role has access to', pageAccess.count, 'pages');
    }
    
    // Solution: Update admin@cmba.ca to Super Admin
    console.log('\nSolution: Updating admin@cmba.ca to Super Admin role...');
    
    // Remove existing role assignment
    await db('user_roles').where('user_id', admin.id).del();
    
    // Assign Super Admin role
    await db('user_roles').insert({
      user_id: admin.id,
      role_id: superAdminRole.id,
      assigned_at: new Date(),
      assigned_by: admin.id
    });
    
    console.log('✅ Updated admin@cmba.ca to Super Admin role');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

checkAdminRole();