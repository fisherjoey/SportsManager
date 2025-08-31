const db = require('./backend/src/config/database');

async function checkRefereeRole() {
  try {
    // Find the referee@test.com user
    const user = await db('users').where('email', 'referee@test.com').first();
    if (!user) {
      console.log('❌ User referee@test.com not found');
      return;
    }
    
    console.log('User found:', {
      id: user.id,
      email: user.email,
      role: user.role
    });
    
    // Check user_roles table
    const userRoles = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', user.id)
      .select('roles.id', 'roles.name', 'roles.description');
    
    console.log('\nRoles assigned to user:');
    if (userRoles.length === 0) {
      console.log('   ❌ No roles assigned in user_roles table');
    } else {
      userRoles.forEach(role => {
        console.log(`   - ${role.name} (${role.id})`);
      });
    }
    
    // Check if Referee role exists
    const refereeRole = await db('roles').where('name', 'Referee').first();
    if (!refereeRole) {
      console.log('\n❌ "Referee" role does not exist in roles table');
      
      // List all available roles
      const allRoles = await db('roles').select('name');
      console.log('\nAvailable roles:');
      allRoles.forEach(r => console.log(`   - ${r.name}`));
    } else {
      console.log('\n✅ Referee role exists:', refereeRole.id);
      
      // Check page access for this role
      const pageAccess = await db('role_page_access')
        .where('role_id', refereeRole.id)
        .where('can_access', true)
        .select('page_path', 'page_name');
      
      console.log(`\nPages accessible to Referee role: ${pageAccess.length}`);
      if (pageAccess.length > 0) {
        pageAccess.forEach(page => {
          console.log(`   - ${page.page_name} (${page.page_path})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

checkRefereeRole();