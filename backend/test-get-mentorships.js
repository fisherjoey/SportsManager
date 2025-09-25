const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testGetMentorships() {
  try {
    // First, login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@cmba.ca',
      password: 'password'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Create headers with auth token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('\n2. Getting all mentorships...');

    // Try to get all mentorships
    const getResponse = await axios.get(
      `${API_URL}/mentorships`,
      { headers }
    );

    console.log('✅ Mentorships retrieved successfully!');
    console.log('Total mentorships:', getResponse.data.data?.mentorships?.length || 0);
    console.log('Response:', JSON.stringify(getResponse.data, null, 2));

  } catch (error) {
    console.error('\n❌ Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Run the test
testGetMentorships();