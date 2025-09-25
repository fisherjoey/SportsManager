/**
 * Fix admin-access-control page access for Super Admin
 */

const db = require('./src/config/database');

async function fixAccessControl() {
  try {
    console.log('Fixing admin-access-control page access...');

    // First, let's see what's in role_page_access for admin pages
    console.log('\nCurrent admin pages in role_page_access:');
    const adminPages = await db('role_page_access')
      .where('page_path', 'like', 'admin-%')
      .select('*');
    
    console.log(`Found ${adminPages.length} admin pages:`);
    adminPages.forEach(page => {
      console.log(`- ${page.page_path} (Role: ${page.role_id})`);
    });

    // Check if admin-access-control exists
    const accessControlPage = await db('role_page_access')
      .where('page_path', 'admin-access-control')
      .first();
    
    if (accessControlPage) {
      console.log('\n✓ admin-access-control page already exists');
    } else {
      console.log('\n❌ admin-access-control page does not exist');
      
      // Get Super Admin role ID
      const superAdminRole = await db('roles')
        .where('name', 'Super Admin')
        .first();
      
      if (superAdminRole) {
        console.log(`✓ Found Super Admin role: ${superAdminRole.id}`);
        
        // Add admin-access-control page for Super Admin
        await db('role_page_access').insert({
          role_id: superAdminRole.id,
          page_path: 'admin-access-control',
          page_name: 'Access Control',
          page_category: 'administration',
          page_description: 'Manage user roles and permissions',
          can_access: true,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        
        console.log('✅ Added admin-access-control page access for Super Admin');
        
        // Also add for regular Admin role if it exists
        const adminRole = await db('roles')
          .whereIn('name', ['Admin', 'admin'])
          .first();
        
        if (adminRole) {
          await db('role_page_access').insert({
            role_id: adminRole.id,
            page_path: 'admin-access-control',
            page_name: 'Access Control',
            page_category: 'administration',
            page_description: 'Manage user roles and permissions',
            can_access: true,
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          });
          
          console.log('✅ Also added admin-access-control page access for Admin role');
        }
        
      } else {
        console.log('❌ Super Admin role not found');
      }
    }

    // Check user info - why is /api/auth/me returning undefined?
    console.log('\nChecking admin@cmba.ca user details...');
    const user = await db('users')
      .where('email', 'admin@cmba.ca')
      .first();
    
    if (user) {
      console.log('✓ User found:');
      console.log(`- ID: ${user.id}`);
      console.log(`- Name: ${user.name}`);
      console.log(`- Email: ${user.email}`);
    } else {
      console.log('❌ User not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

fixAccessControl();