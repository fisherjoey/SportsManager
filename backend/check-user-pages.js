const axios = require('axios');

async function checkUserPages() {
  try {
    // Login as admin
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@cmba.ca',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in as admin\n');
    
    // Get accessible pages
    console.log('Fetching accessible pages...');
    const pagesResponse = await axios.get('http://localhost:3001/api/admin/access/my-pages', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Accessible pages:', JSON.stringify(pagesResponse.data, null, 2));
    
    // Check specific page access
    console.log('\nChecking access to "assigning" page...');
    const checkResponse = await axios.post(
      'http://localhost:3001/api/admin/access/check-page',
      { page: 'assigning' },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    console.log('Has access to "assigning":', checkResponse.data.hasAccess);
    
    // Get user's current roles
    console.log('\nFetching user roles...');
    const userResponse = await axios.get('http://localhost:3001/api/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('User roles:', userResponse.data.data.roles);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkUserPages();