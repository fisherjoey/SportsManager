const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testSavePages() {
  console.log('🧪 Testing Save Pages Endpoint\n');
  
  try {
    // Login first
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@cmba.ca',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in\n');
    
    // Create minimal page access data
    const pageAccess = [
      {
        page_path: 'dashboard',
        page_name: 'Dashboard',
        page_category: 'Core',
        page_description: 'Main dashboard',
        can_access: true
      },
      {
        page_path: 'games',
        page_name: 'Games',
        page_category: 'Core',
        page_description: 'Games management',
        can_access: true
      }
    ];
    
    console.log('📋 Sending page access data:');
    console.log(JSON.stringify(pageAccess, null, 2));
    
    // Test role ID
    const roleId = 'd57f0c77-2f67-4fba-b0d5-2264343ff4cc';
    
    try {
      const response = await axios.put(
        `${API_BASE}/admin/access/roles/${roleId}/pages`,
        { pageAccess },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('\n✅ Success!');
      console.log('Response:', response.data);
    } catch (error) {
      console.log('\n❌ Failed!');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSavePages();