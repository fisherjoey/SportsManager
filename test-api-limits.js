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
      res.on('end', () => {
        const response = JSON.parse(body);
        resolve(response.token);
      });
    });
    req.write(data);
    req.end();
  });
}

async function testLimit(limit) {
  const token = await getToken();
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    http.get({
      hostname: 'localhost',
      port: 3001,
      path: `/api/games?limit=${limit}`,
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const elapsed = Date.now() - startTime;
        try {
          const result = JSON.parse(data);
          console.log(`Limit ${limit}: Status ${res.statusCode}, Got ${result.data?.length || 0} games in ${elapsed}ms`);
          resolve({ success: true, count: result.data?.length || 0, time: elapsed });
        } catch (e) {
          console.log(`Limit ${limit}: Failed - ${e.message} in ${elapsed}ms`);
          console.log('Response:', data.substring(0, 200));
          resolve({ success: false, error: e.message, time: elapsed });
        }
      });
    }).on('error', (err) => {
      console.log(`Limit ${limit}: Request error - ${err.message}`);
      resolve({ success: false, error: err.message });
    });
  });
}

async function runTests() {
  console.log('Testing API with different limits...\n');
  
  const limits = [10, 50, 100, 150, 200, 250];
  
  for (const limit of limits) {
    await testLimit(limit);
    // Small delay between requests
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\nTest complete!');
}

runTests().catch(console.error);