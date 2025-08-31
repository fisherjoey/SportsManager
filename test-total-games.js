const http = require('http');

async function getToken() {
  return new Promise((resolve) => {
    const data = JSON.stringify({ email: 'test@example.com', password: 'test123' });
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body).token));
    });
    req.write(data);
    req.end();
  });
}

async function testGamesCount() {
  const token = await getToken();
  
  // Test with different limits
  const limits = [10, 50, 100, 250];
  
  for (const limit of limits) {
    const result = await new Promise((resolve) => {
      http.get({
        hostname: 'localhost',
        port: 3001,
        path: `/api/games?limit=${limit}`,
        headers: { 'Authorization': `Bearer ${token}` }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
    });
    
    console.log(`Limit ${limit}: Got ${result.data.length} games`);
  }
  
  // Check total count in database
  const knex = require('./backend/src/config/database');
  const [{ count }] = await knex('games').count('* as count');
  console.log(`\nTotal in database: ${count} games`);
  await knex.destroy();
}

testGamesCount().catch(console.error);