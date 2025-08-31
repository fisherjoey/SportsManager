const axios = require('axios');

async function compareUsers() {
  try {
    // Login as admin@cmba.ca
    console.log('=== ADMIN@CMBA.CA ===\n');
    const adminLogin = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@cmba.ca',
      password: 'password'
    });
    
    console.log('Role field:', adminLogin.data.user.role);
    console.log('Roles array:', adminLogin.data.user.roles);
    console.log('Dashboard component:', adminLogin.data.user.role === 'admin' ? 'AdminDashboard' : 'Other');
    
    // Login as test@cboa.ca
    console.log('\n=== TEST@CBOA.CA ===\n');
    const cboaLogin = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'test@cboa.ca',
      password: 'password'
    });
    
    console.log('Role field:', cboaLogin.data.user.role);
    console.log('Roles array:', cboaLogin.data.user.roles);
    console.log('Dashboard component:', cboaLogin.data.user.role === 'admin' ? 'AdminDashboard' : cboaLogin.data.user.role === 'referee' ? 'RefereeDashboard' : 'Other');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

compareUsers();