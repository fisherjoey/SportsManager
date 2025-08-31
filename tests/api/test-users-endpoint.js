const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testUsersEndpoint() {
  console.log('🧪 Testing Users Endpoint\n');
  
  try {
    // Login as admin first
    console.log('1️⃣ Logging in as admin@cmba.ca...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@cmba.ca',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    console.log('   ✅ Logged in successfully\n');
    
    // Test users endpoint
    console.log('2️⃣ Testing GET /api/users...');
    try {
      const usersResponse = await axios.get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('   ✅ Users endpoint successful');
      console.log(`   Found ${usersResponse.data.data?.users?.length || 0} users`);
      
      // Show first user as example
      if (usersResponse.data.data?.users?.length > 0) {
        const firstUser = usersResponse.data.data.users[0];
        console.log('\n   Example user:');
        console.log(`   - Email: ${firstUser.email}`);
        console.log(`   - Name: ${firstUser.name || 'N/A'}`);
        console.log(`   - Legacy Role: ${firstUser.role || 'N/A'}`);
        console.log(`   - New Roles: ${JSON.stringify(firstUser.roles || [])}`);
      }
    } catch (error) {
      console.log('   ❌ Users endpoint failed');
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
      if (error.response?.data?.stack) {
        console.log('\n   Stack trace:');
        console.log(error.response.data.stack.split('\n').slice(0, 5).join('\n'));
      }
    }
    
    // Test users/roles endpoint
    console.log('\n3️⃣ Testing GET /api/users/roles...');
    try {
      const rolesResponse = await axios.get(`${API_BASE}/users/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('   ✅ Roles endpoint successful');
      console.log(`   Found ${rolesResponse.data.data?.roles?.length || 0} roles`);
      
      if (rolesResponse.data.data?.roles) {
        console.log('   Available roles:');
        rolesResponse.data.data.roles.forEach(role => {
          console.log(`   - ${role.name}: ${role.description || 'No description'}`);
        });
      }
    } catch (error) {
      console.log('   ❌ Roles endpoint failed');
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testUsersEndpoint();