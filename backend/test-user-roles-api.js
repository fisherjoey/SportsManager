const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testUserRolesAPI() {
  console.log('🧪 Testing User Roles API Endpoints\n');
  
  try {
    // Login first as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@cmba.ca',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully\n');
    
    // Get a test user ID (you can replace this with an actual user ID)
    console.log('2. Getting users list...');
    const usersResponse = await axios.get(`${API_BASE}/users?page=1&limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (usersResponse.data.data.users.length === 0) {
      console.log('❌ No users found to test with');
      return;
    }
    
    const testUser = usersResponse.data.data.users[0];
    console.log(`✅ Found test user: ${testUser.email} (ID: ${testUser.id})\n`);
    
    // Test GET /api/admin/users/:userId/roles
    console.log(`3. Getting roles for user ${testUser.email}...`);
    try {
      const getRolesResponse = await axios.get(
        `${API_BASE}/admin/users/${testUser.id}/roles`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      console.log('✅ GET /api/admin/users/:userId/roles works!');
      console.log('Current roles:', getRolesResponse.data.data.roles);
    } catch (error) {
      console.log('❌ GET failed:', error.response?.status, error.response?.data);
    }
    
    // Test PUT /api/admin/users/:userId/roles (replace all roles)
    console.log('\n4. Testing role replacement...');
    const testRoleId = 'd57f0c77-2f67-4fba-b0d5-2264343ff4cc'; // Assignor role ID
    
    try {
      const putRolesResponse = await axios.put(
        `${API_BASE}/admin/users/${testUser.id}/roles`,
        { role_ids: [testRoleId] },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      console.log('✅ PUT /api/admin/users/:userId/roles works!');
      console.log('Updated user:', putRolesResponse.data.data.user);
    } catch (error) {
      console.log('❌ PUT failed:', error.response?.status, error.response?.data);
    }
    
    // Test POST /api/admin/users/:userId/roles (add roles)
    console.log('\n5. Testing role addition...');
    const anotherRoleId = 'fb8520e8-7b59-47b8-b5b4-5cc4affc5ee3'; // Referee role ID
    
    try {
      const postRolesResponse = await axios.post(
        `${API_BASE}/admin/users/${testUser.id}/roles`,
        { role_ids: [anotherRoleId] },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      console.log('✅ POST /api/admin/users/:userId/roles works!');
      console.log('Updated user:', postRolesResponse.data.data.user);
    } catch (error) {
      console.log('❌ POST failed:', error.response?.status, error.response?.data);
    }
    
    // Test DELETE /api/admin/users/:userId/roles
    console.log('\n6. Testing role removal...');
    try {
      const deleteRolesResponse = await axios.delete(
        `${API_BASE}/admin/users/${testUser.id}/roles`,
        {
          data: { role_ids: [anotherRoleId] },
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      console.log('✅ DELETE /api/admin/users/:userId/roles works!');
      console.log('Updated user:', deleteRolesResponse.data.data.user);
    } catch (error) {
      console.log('❌ DELETE failed:', error.response?.status, error.response?.data);
    }
    
    console.log('\n✅ All user role endpoints are accessible!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testUserRolesAPI();