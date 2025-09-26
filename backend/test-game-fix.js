const axios = require('axios');

async function testGameCreation() {
  try {
    // First login to get token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@nst.com',
      password: 'AdminPassword123!'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');

    // Test game creation with proper data
    const gameData = {
      homeTeam: {
        organization: 'NST',
        ageGroup: 'U12',
        gender: 'Boys',
        rank: 1
      },
      awayTeam: {
        organization: 'NST',
        ageGroup: 'U12',
        gender: 'Boys',
        rank: 2
      },
      date: '2025-09-30',
      time: '14:00',
      location: 'Test Field',
      postalCode: '12345',
      level: 'U12',
      gameType: 'Community',
      division: 'Division 1',
      season: '2025',
      payRate: 50,
      refsNeeded: 2,
      wageMultiplier: 1.0,
      wageMultiplierReason: ''
    };

    console.log('📤 Sending game data:', JSON.stringify(gameData, null, 2));

    const gameResponse = await axios.post('http://localhost:5000/api/games', gameData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Game created successfully:', gameResponse.data);

  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      validation: error.response?.data?.validation,
      details: error.response?.data?.details
    });
  }
}

// Wait a moment for server to be ready
setTimeout(testGameCreation, 2000);