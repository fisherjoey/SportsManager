// Quick test to check if games endpoint is working
const http = require('http');

http.get('http://localhost:3001/api/games', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const response = JSON.parse(data);
    if (response.error) {
      console.log('Error:', response.error);
      console.log('\nNeed to test with authentication or temporarily bypass auth');
    } else {
      console.log('Games found:', response.data?.length || 0);
      if (response.data?.length > 0) {
        console.log('\nFirst game:', response.data[0]);
      }
    }
  });
}).on('error', err => console.error('Request failed:', err));