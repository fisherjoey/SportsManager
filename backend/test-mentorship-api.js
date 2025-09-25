const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testMentorshipCreation() {
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

    // Test data for mentorship creation - using the exact payload from frontend
    const mentorshipData = {
      mentor_id: "066794c1-c2cc-480d-a150-553398c48634",
      mentee_id: "6d1a9575-08b5-48d3-9816-a3886f5c4370",
      start_date: "2025-09-25",
      notes: ""
    };

    console.log('\n2. Creating mentorship with data:', mentorshipData);

    // Try to create mentorship
    const createResponse = await axios.post(
      `${API_URL}/mentorships`,
      mentorshipData,
      { headers }
    );

    console.log('✅ Mentorship created successfully!');
    console.log('Response:', JSON.stringify(createResponse.data, null, 2));

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
testMentorshipCreation();