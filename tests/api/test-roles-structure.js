const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testRolesStructure() {
  console.log('🧪 Testing Roles API Response Structure\n');
  
  try {
    // Login first
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@cmba.ca',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in\n');
    
    // Test /api/users/roles endpoint
    console.log('📋 GET /api/users/roles response structure:');
    const rolesResponse = await axios.get(`${API_BASE}/users/roles`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(JSON.stringify(rolesResponse.data, null, 2));
    
    console.log('\n🔍 Response analysis:');
    console.log('- Top level keys:', Object.keys(rolesResponse.data));
    console.log('- Has success field:', rolesResponse.data.success);
    console.log('- Has data field:', !!rolesResponse.data.data);
    
    if (rolesResponse.data.data) {
      console.log('- Data field keys:', Object.keys(rolesResponse.data.data));
      console.log('- Has data.roles:', !!rolesResponse.data.data.roles);
      console.log('- Number of roles:', rolesResponse.data.data.roles?.length || 0);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testRolesStructure();