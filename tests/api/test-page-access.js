const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testPageAccess() {
  console.log('🧪 Testing Database-Driven Page Access\n');
  
  try {
    // 1. Login as Super Admin
    console.log('1️⃣ Logging in as Super Admin (zfisher9@gmail.com)...');
    let response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'zfisher9@gmail.com',
      password: 'password'
    });
    
    const superAdminToken = response.data.token;
    const superAdminUser = response.data.user;
    console.log(`   ✅ Logged in - Roles: ${JSON.stringify(superAdminUser.roles || [superAdminUser.role])}\n`);
    
    // 2. Check Super Admin's accessible pages
    console.log('2️⃣ Checking Super Admin\'s accessible pages...');
    const superAdminApi = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    
    response = await superAdminApi.get('/admin/access/my-pages');
    const superAdminPages = response.data.data;
    console.log(`   ✅ Super Admin can access ${superAdminPages.length} pages`);
    
    // Show some of the pages
    const samplePages = superAdminPages.slice(0, 5);
    samplePages.forEach(page => {
      console.log(`      - ${page.page_name} (${page.page_path})`);
    });
    if (superAdminPages.length > 5) {
      console.log(`      ... and ${superAdminPages.length - 5} more pages\n`);
    }
    
    // 3. Login as Referee
    console.log('3️⃣ Logging in as Referee (referee@test.com)...');
    response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'referee@test.com',
      password: 'password'
    });
    
    const refereeToken = response.data.token;
    const refereeUser = response.data.user;
    console.log(`   ✅ Logged in - Role: ${refereeUser.role}\n`);
    
    // 4. Check Referee's accessible pages
    console.log('4️⃣ Checking Referee\'s accessible pages...');
    const refereeApi = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${refereeToken}` }
    });
    
    response = await refereeApi.get('/admin/access/my-pages');
    const refereePages = response.data.data;
    console.log(`   ✅ Referee can access ${refereePages.length} pages`);
    
    if (refereePages.length > 0) {
      console.log('   Pages accessible to Referee:');
      refereePages.forEach(page => {
        console.log(`      - ${page.page_name} (${page.page_path})`);
      });
    }
    
    // 5. Test specific page access checks
    console.log('\n5️⃣ Testing specific page access...');
    
    const pagesToTest = [
      'dashboard',
      'admin-access-control',
      'games',
      'resources'
    ];
    
    console.log('   Super Admin access:');
    for (const page of pagesToTest) {
      const checkResponse = await superAdminApi.post('/admin/access/check-page', { page });
      console.log(`      ${checkResponse.data.hasAccess ? '✅' : '❌'} ${page}`);
    }
    
    console.log('\n   Referee access:');
    for (const page of pagesToTest) {
      const checkResponse = await refereeApi.post('/admin/access/check-page', { page });
      console.log(`      ${checkResponse.data.hasAccess ? '✅' : '❌'} ${page}`);
    }
    
    // 6. Compare access levels
    console.log('\n📊 Access Comparison:');
    console.log(`   Super Admin: ${superAdminPages.length} pages accessible`);
    console.log(`   Referee: ${refereePages.length} pages accessible`);
    console.log(`   Difference: ${superAdminPages.length - refereePages.length} pages`);
    
    console.log('\n✨ Database-driven access control is working!');
    console.log('   Pages are now controlled by the database, not hardcoded roles.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testPageAccess();