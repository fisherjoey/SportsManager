/**
 * Fix admin-access-control page - should be accessible by admin roles, not referee
 */

const db = require('./src/config/database');

async function fixAdminAccessControl() {
  try {
    console.log('Fixing admin-access-control page permissions...');

    // Get admin roles
    const adminRoles = await db('roles')
      .whereIn('name', ['Super Admin', 'Admin', 'admin'])
      .select('*');
    
    console.log('Found admin roles:');
    adminRoles.forEach(role => {
      console.log(`- ${role.name} (${role.id})`);
    });

    // Check current admin-access-control permissions
    const currentPermissions = await db('role_page_access')
      .where('page_path', 'admin-access-control')
      .select('*');
    
    console.log('\nCurrent admin-access-control permissions:');
    for (const perm of currentPermissions) {
      const role = await db('roles').where('id', perm.role_id).first();
      console.log(`- Role: ${role?.name} (${perm.role_id}), Access: ${perm.can_access}`);
    }

    // Delete the incorrect referee permission (if it exists)
    const deleted = await db('role_page_access')
      .where('page_path', 'admin-access-control')
      .del();
    
    console.log(`\n✓ Deleted ${deleted} existing admin-access-control permissions`);

    // Add correct permissions for admin roles
    const insertions = [];
    for (const adminRole of adminRoles) {
      insertions.push({
        role_id: adminRole.id,
        page_path: 'admin-access-control',
        page_name: 'Access Control',
        page_category: 'administration',
        page_description: 'Manage user roles and permissions',
        can_access: true,
        conditions: null,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    }

    if (insertions.length > 0) {
      await db('role_page_access').insert(insertions);
      console.log(`✅ Added admin-access-control access for ${insertions.length} admin roles`);
    }

    // Verify the fix
    console.log('\nVerifying the fix...');
    const newPermissions = await db('role_page_access')
      .where('page_path', 'admin-access-control')
      .select('*');
    
    for (const perm of newPermissions) {
      const role = await db('roles').where('id', perm.role_id).first();
      console.log(`✓ Role: ${role?.name} can access admin-access-control: ${perm.can_access}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

fixAdminAccessControl();