const db = require('./src/config/database');

async function testDatabaseStructure() {
  try {
    console.log('Testing database structure...\n');
    
    // Check if users table exists and get its structure
    console.log('1. Checking users table:');
    try {
      const usersColumns = await db('users').columnInfo();
      console.log('   Users table columns:', Object.keys(usersColumns));
      
      // Test query
      const userCount = await db('users').count('* as count').first();
      console.log('   Total users:', userCount.count);
    } catch (error) {
      console.log('   ❌ Error with users table:', error.message);
    }
    
    // Check if user_roles table exists
    console.log('\n2. Checking user_roles table:');
    try {
      const userRolesColumns = await db('user_roles').columnInfo();
      console.log('   User_roles table columns:', Object.keys(userRolesColumns));
      
      // Test query
      const userRoleCount = await db('user_roles').count('* as count').first();
      console.log('   Total user-role assignments:', userRoleCount.count);
    } catch (error) {
      console.log('   ❌ Error with user_roles table:', error.message);
    }
    
    // Check if roles table exists
    console.log('\n3. Checking roles table:');
    try {
      const rolesColumns = await db('roles').columnInfo();
      console.log('   Roles table columns:', Object.keys(rolesColumns));
      
      // Test query
      const roleCount = await db('roles').count('* as count').first();
      console.log('   Total roles:', roleCount.count);
    } catch (error) {
      console.log('   ❌ Error with roles table:', error.message);
    }
    
    // Test the actual query that's failing
    console.log('\n4. Testing the getUsersWithRole query:');
    try {
      // Get first role ID for testing
      const firstRole = await db('roles').select('id').first();
      if (firstRole) {
        console.log('   Testing with role ID:', firstRole.id);
        
        const testQuery = await db('users')
          .join('user_roles', 'users.id', 'user_roles.user_id')
          .where('user_roles.role_id', firstRole.id)
          .select('users.id', 'users.name', 'users.email')
          .limit(5);
          
        console.log('   ✅ Query successful, found', testQuery.length, 'users with this role');
      } else {
        console.log('   No roles found to test with');
      }
    } catch (error) {
      console.log('   ❌ Query failed:', error.message);
      console.log('   Full error:', error);
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

testDatabaseStructure();