const knex = require('./backend/src/config/database');
const bcrypt = require('bcryptjs');

async function testGamesAPI() {
  console.log('=== Testing Games API ===\n');
  
  try {
    // Step 1: Check if we have any users
    console.log('1. Checking existing users...');
    const users = await knex('users').select('id', 'email', 'name', 'role').limit(5);
    console.log('Found users:', users);
    
    // Step 2: Create a test user if needed
    let testUser;
    const existingUser = await knex('users').where('email', 'test@example.com').first();
    
    if (!existingUser) {
      console.log('\n2. Creating test user...');
      const hashedPassword = await bcrypt.hash('test123', 10);
      [testUser] = await knex('users').insert({
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');
      console.log('Created test user:', testUser.email);
    } else {
      testUser = existingUser;
      console.log('\n2. Using existing test user:', testUser.email);
    }
    
    // Step 3: Login to get token
    console.log('\n3. Logging in to get auth token...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginResponse.ok) {
      console.error('Login failed:', loginData);
      // Try to update password if login failed
      console.log('Updating test user password...');
      const hashedPassword = await bcrypt.hash('test123', 10);
      await knex('users').where('email', 'test@example.com').update({
        password: hashedPassword
      });
      
      // Retry login
      const retryResponse = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'test123'
        })
      });
      const retryData = await retryResponse.json();
      if (!retryResponse.ok) {
        throw new Error('Login failed after password reset: ' + JSON.stringify(retryData));
      }
      loginData.token = retryData.token;
    }
    
    console.log('Got auth token:', loginData.token ? 'Success' : 'Failed');
    
    // Step 4: Check if we have any games in the database
    console.log('\n4. Checking games in database...');
    const gamesCount = await knex('games').count('* as count');
    console.log('Total games in database:', gamesCount[0].count);
    
    if (gamesCount[0].count > 0) {
      const sampleGames = await knex('games').select('*').limit(3);
      console.log('\nSample games from database:');
      sampleGames.forEach((game, index) => {
        console.log(`Game ${index + 1}:`, {
          id: game.id,
          home_team: game.home_team_name || game.home_team,
          away_team: game.away_team_name || game.away_team,
          date_time: game.date_time,
          location: game.location || game.field,
          status: game.status
        });
      });
    }
    
    // Step 5: Test the API endpoint
    console.log('\n5. Testing /api/games endpoint...');
    const gamesResponse = await fetch('http://localhost:3001/api/games', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const gamesData = await gamesResponse.json();
    console.log('API Response status:', gamesResponse.status);
    console.log('API Response:', JSON.stringify(gamesData, null, 2));
    
    // Step 6: Analyze the response structure
    if (gamesData.data && Array.isArray(gamesData.data)) {
      console.log('\n6. Analyzing response structure...');
      console.log('Number of games returned:', gamesData.data.length);
      
      if (gamesData.data.length > 0) {
        const firstGame = gamesData.data[0];
        console.log('\nFirst game structure:');
        console.log('Keys:', Object.keys(firstGame));
        console.log('\nSample game data:', JSON.stringify(firstGame, null, 2));
        
        // Check for expected fields
        const expectedFields = ['id', 'homeTeam', 'awayTeam', 'date', 'time', 'location', 'status'];
        const missingFields = expectedFields.filter(field => !(field in firstGame));
        if (missingFields.length > 0) {
          console.log('\n⚠️  Missing expected fields:', missingFields);
        }
        
        // Check for unexpected field names
        const hasDateTimeInsteadOfDate = 'date_time' in firstGame || 'dateTime' in firstGame;
        if (hasDateTimeInsteadOfDate) {
          console.log('⚠️  Found date_time field instead of separate date and time');
        }
      }
    } else {
      console.log('\n⚠️  No data array in response or empty response');
    }
    
    // Step 7: Create a test game if none exist
    if (gamesCount[0].count === 0) {
      console.log('\n7. Creating test game...');
      const [newGame] = await knex('games').insert({
        home_team_name: 'Test Home Team',
        away_team_name: 'Test Away Team',
        date_time: new Date('2025-09-15T14:00:00'),
        location: 'Test Field',
        field: 'Test Field',
        level: 'Recreational',
        status: 'unassigned',
        refs_needed: 2,
        base_wage: 50,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');
      
      console.log('Created test game:', newGame.id);
      
      // Re-test the API
      console.log('\n8. Re-testing API after creating game...');
      const retestResponse = await fetch('http://localhost:3001/api/games', {
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const retestData = await retestResponse.json();
      console.log('New API Response:', JSON.stringify(retestData, null, 2));
    }
    
  } catch (error) {
    console.error('\nError during testing:', error);
  } finally {
    await knex.destroy();
  }
}

testGamesAPI();