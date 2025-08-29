const request = require('supertest');
const app = require('./src/app');

async function testGames() {
  try {
    // Login first
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123'
      });
    
    console.log('Login response:', loginResponse.status);
    const token = loginResponse.body.token;
    
    if (!token) {
      console.log('No token received:', loginResponse.body);
      return;
    }
    
    // Try to get games
    const gamesResponse = await request(app)
      .get('/api/games')
      .set('Authorization', `Bearer ${token}`);
    
    console.log('Games response status:', gamesResponse.status);
    console.log('Games response body:', JSON.stringify(gamesResponse.body, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testGames();