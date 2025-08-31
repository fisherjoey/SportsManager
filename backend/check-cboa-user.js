const axios = require('axios');

async function checkCBOAUser() {
  try {
    // Login as CBOA Test
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'test@cboa.ca',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in as CBOA Test\n');
    
    // Get user info
    console.log('User info from token:', loginResponse.data.user);
    
    // Get accessible pages
    console.log('\nFetching accessible pages...');
    const pagesResponse = await axios.get('http://localhost:3001/api/admin/access/my-pages', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('\nAccessible pages for CBOA Test:');
    pagesResponse.data.data.forEach(page => {
      console.log(`  - ${page.page_path}: ${page.page_name}`);
    });
    
    // Check specific pages
    const pagesToCheck = ['dashboard', 'resources', 'games', 'assigning'];
    
    console.log('\nChecking specific page access:');
    for (const page of pagesToCheck) {
      try {
        const checkResponse = await axios.post(
          'http://localhost:3001/api/admin/access/check-page',
          { page },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log(`  ${page}: ${checkResponse.data.hasAccess ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`  ${page}: ❌ (error)`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkCBOAUser();