const axios = require('axios');

async function restoreAdmin() {
  try {
    const login = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@cmba.ca',
      password: 'password'
    });
    
    const token = login.data.token;
    
    await axios.put(
      'http://localhost:3001/api/admin/users/066794c1-c2cc-480d-a150-553398c48634/roles',
      { role_ids: ['cbdeacc1-40b9-4297-9888-cdda640cefe3'] }, // Super Admin role
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    console.log('✅ Admin role restored to Super Admin');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

restoreAdmin();