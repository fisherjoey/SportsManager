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

async function testPagination() {
  const token = await getToken();
  
  const result = await new Promise((resolve) => {
    http.get({
      hostname: 'localhost',
      port: 3001,
      path: '/api/games?limit=10',
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
  });
  
  console.log('API Response Pagination:', result.pagination);
  console.log(`\nShowing ${result.data.length} games out of ${result.pagination?.total || 'unknown'} total`);
  console.log(`Page ${result.pagination?.page || 1} of ${result.pagination?.totalPages || 'unknown'}`);
}

testPagination().catch(console.error);