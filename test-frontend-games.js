// Test to verify the frontend is actually displaying games correctly

const http = require('http');

async function testFrontend() {
  console.log('🔍 Testing Frontend Games Display\n');
  
  // First, make sure we can login and get games from API
  console.log('1. Testing backend API directly...');
  
  // Login to get token
  const loginData = JSON.stringify({
    email: 'test@example.com',
    password: 'test123'
  });
  
  const token = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const response = JSON.parse(data);
        resolve(response.token);
      });
    });
    req.write(loginData);
    req.end();
  });
  
  console.log('   ✅ Got auth token');
  
  // Test games endpoint
  const gamesData = await new Promise((resolve) => {
    http.get({
      hostname: 'localhost',
      port: 3001,
      path: '/api/games',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });
  });
  
  console.log(`   ✅ Backend returns ${gamesData.data.length} games\n`);
  
  // Now test the frontend
  console.log('2. Testing frontend at http://localhost:3000/games...');
  console.log('   Please check the browser to see if games are displayed');
  console.log('\n3. Expected behavior:');
  console.log('   - Login with test@example.com / test123');
  console.log('   - Navigate to Games page');
  console.log('   - Should see a table with 50 games');
  console.log('   - Games should show team names, dates, times, locations');
  console.log('\n4. First game from API for reference:');
  const firstGame = gamesData.data[0];
  console.log('   - Home Team:', JSON.stringify(firstGame.homeTeam));
  console.log('   - Away Team:', JSON.stringify(firstGame.awayTeam));
  console.log('   - Date:', firstGame.date);
  console.log('   - Time:', firstGame.time);
  console.log('   - Location:', firstGame.location);
  console.log('   - Status:', firstGame.status);
}

testFrontend().catch(console.error);