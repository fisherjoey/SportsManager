const http = require('http');

async function test250Games() {
  // Login first
  const loginData = JSON.stringify({ email: 'test@example.com', password: 'test123' });
  
  const token = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body).token));
    });
    req.write(loginData);
    req.end();
  });
  
  // Now fetch 250 games
  const result = await new Promise((resolve) => {
    http.get({
      hostname: 'localhost',
      port: 3001,
      path: '/api/games?limit=250',
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
  });
  
  console.log('✅ Successfully fetched', result.data.length, 'games');
  console.log('Pagination:', result.pagination);
  
  // Check if we can see all games
  if (result.data.length === 250) {
    console.log('\n🎉 All 250 games are accessible!');
    console.log('First game ID:', result.data[0].id);
    console.log('Last game ID:', result.data[249].id);
  } else {
    console.log('\n⚠️  Only got', result.data.length, 'games out of 250');
  }
}

test250Games().catch(console.error);