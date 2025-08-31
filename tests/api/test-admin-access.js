const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testAdminAccess() {
  console.log('🧪 Testing Admin Access Issues\n');
  
  try {
    // Test with admin@cmba.ca
    console.log('1️⃣ Testing admin@cmba.ca...');
    let response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@cmba.ca',
      password: 'password'
    });
    
    const adminToken = response.data.token;
    const adminUser = response.data.user;
    console.log(`   ✅ Logged in successfully`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Legacy Role: ${adminUser.role}`);
    console.log(`   Roles Array: ${JSON.stringify(adminUser.roles || [])}`);
    console.log(`   User ID: ${adminUser.id}\n`);
    
    // Check accessible pages
    console.log('2️⃣ Checking accessible pages...');
    const adminApi = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    response = await adminApi.get('/admin/access/my-pages');
    const adminPages = response.data.data;
    console.log(`   📄 Can access ${adminPages.length} pages`);
    
    if (adminPages.length === 0) {
      console.log('   ❌ NO PAGES ACCESSIBLE!\n');
      
      // Let's check what's in the database
      console.log('3️⃣ Debugging: Checking user_roles table...');
      // We'll need to check this separately
    } else {
      console.log('   Sample pages:');
      adminPages.slice(0, 5).forEach(page => {
        console.log(`      - ${page.page_name} (${page.page_path})`);
      });
    }
    
    // Test specific page access
    console.log('\n4️⃣ Testing specific page access...');
    const pagesToTest = ['dashboard', 'admin-access-control', 'games'];
    
    for (const page of pagesToTest) {
      try {
        const checkResponse = await adminApi.post('/admin/access/check-page', { page });
        console.log(`   ${checkResponse.data.hasAccess ? '✅' : '❌'} ${page}`);
      } catch (error) {
        console.log(`   ❌ ${page} - Error: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // Compare with zfisher9
    console.log('\n5️⃣ Comparing with zfisher9@gmail.com...');
    response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'zfisher9@gmail.com',
      password: 'password'
    });
    
    const zfisherUser = response.data.user;
    console.log(`   zfisher9 Roles: ${JSON.stringify(zfisherUser.roles || [])}`);
    
    const zfisherApi = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${response.data.token}` }
    });
    
    response = await zfisherApi.get('/admin/access/my-pages');
    console.log(`   zfisher9 Pages: ${response.data.data.length} accessible`);
    
    console.log('\n📊 Summary:');
    console.log(`   admin@cmba.ca: ${adminPages.length} pages`);
    console.log(`   zfisher9@gmail.com: ${response.data.data.length} pages`);
    
    if (adminPages.length === 0) {
      console.log('\n⚠️  ISSUE DETECTED: admin@cmba.ca has no page access!');
      console.log('   Likely cause: Role not properly assigned in user_roles table');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAdminAccess();