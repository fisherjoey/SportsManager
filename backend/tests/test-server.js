const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Test server working' }));
});

server.listen(3003, () => {
  console.log('Test server running on port 3003');
});

server.on('error', (error) => {
  console.error('Server error:', error);
});