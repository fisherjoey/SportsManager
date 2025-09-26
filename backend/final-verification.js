const axios = require('axios');

async function finalVerification() {
  console.log('🧪 Final Verification: Games API with limit=500');

  try {
    // Login
    console.log('🔐 Logging in...');
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@cmba.ca',
      password: 'admin123'
    });

    // Test limit=500
    console.log('📊 Testing limit=500...');
    const gamesRes = await axios.get('http://localhost:3000/api/games?limit=500', {
      headers: { Authorization: `Bearer ${loginRes.data.token}` }
    });

    console.log('\n✅ FINAL VERIFICATION SUCCESSFUL');
    console.log(`✅ limit=500 returned ${gamesRes.data.data.length} games`);
    console.log(`✅ Total games in database: ${gamesRes.data.pagination.total}`);
    console.log(`✅ Status code: ${gamesRes.status}`);
    console.log('✅ No "Invalid query parameters" error');
    console.log('\n🎯 INTEGRATION TESTING COMPLETE - ALL TESTS PASSED');

  } catch (error) {
    console.log('\n❌ FINAL VERIFICATION FAILED');
    console.log('Error:', error.response?.data?.error || error.message);
  }
}

finalVerification();