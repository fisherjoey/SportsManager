// Simple test to verify games API with mock authentication
const http = require('http');

// First, let's try to get games without auth to see the exact error
function testWithoutAuth() {
  return new Promise((resolve) => {
    console.log('1. Testing without authentication...');
    
    http.get('http://localhost:3001/api/games', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('   Status:', res.statusCode);
        const response = JSON.parse(data);
        console.log('   Response:', response);
        resolve();
      });
    }).on('error', err => {
      console.error('   Request failed:', err);
      resolve();
    });
  });
}

// Try to login with different users
async function tryLogin(email, password) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ email, password });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.token) {
            console.log(`   ✅ Login successful for ${email}`);
            resolve(response.token);
          } else {
            console.log(`   ❌ Login failed for ${email}:`, response.error || 'Unknown error');
            resolve(null);
          }
        } catch (e) {
          console.log(`   ❌ Login failed for ${email}: Invalid response`);
          resolve(null);
        }
      });
    });
    
    req.on('error', err => {
      console.error(`   Request failed for ${email}:`, err);
      resolve(null);
    });
    
    req.write(postData);
    req.end();
  });
}

// Test games API with token
function testGamesWithToken(token) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/games',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('   Status:', res.statusCode);
        
        try {
          const response = JSON.parse(data);
          
          if (response.data && Array.isArray(response.data)) {
            console.log(`   ✅ Games retrieved: ${response.data.length} games`);
            
            if (response.data.length > 0) {
              const game = response.data[0];
              console.log('\n   First game details:');
              console.log('   - ID:', game.id);
              console.log('   - Home Team:', JSON.stringify(game.homeTeam));
              console.log('   - Away Team:', JSON.stringify(game.awayTeam));
              console.log('   - Date:', game.date);
              console.log('   - Time:', game.time);
              console.log('   - Location:', game.location);
              console.log('   - Status:', game.status);
              console.log('   - Division:', game.division);
              console.log('   - Level:', game.level);
            }
          } else {
            console.log('   ⚠️  Unexpected response format:', response);
          }
        } catch (e) {
          console.log('   ❌ Failed to parse response:', e.message);
          console.log('   Raw response:', data.substring(0, 200));
        }
        
        resolve();
      });
    });
    
    req.on('error', err => {
      console.error('   Request failed:', err);
      resolve();
    });
    
    req.end();
  });
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Games API Tests\n');
  
  // Test without auth
  await testWithoutAuth();
  
  // Try to login with different users
  console.log('\n2. Attempting to login...');
  
  const testUsers = [
    { email: 'admin@cmba.ca', password: 'password123' },
    { email: 'admin@refassign.com', password: 'password123' },
    { email: 'test@example.com', password: 'test123' }
  ];
  
  let token = null;
  for (const user of testUsers) {
    console.log(`\n   Trying ${user.email}...`);
    token = await tryLogin(user.email, user.password);
    if (token) break;
  }
  
  if (token) {
    console.log('\n3. Testing games API with authentication...');
    await testGamesWithToken(token);
  } else {
    console.log('\n❌ Could not obtain authentication token');
    console.log('   Please ensure at least one of the test users exists with the correct password');
  }
  
  console.log('\n✅ Tests completed!');
}

// Run the tests
runTests().catch(console.error);