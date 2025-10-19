const fs = require('fs');
const path = require('path');
const FormData = require('./backend/node_modules/form-data');

// Direct database test
async function testDatabaseDirectly() {
  console.log('\n========== TESTING DATABASE DIRECTLY ==========\n');

  try {
    // Import database directly
    const db = require('./backend/dist/config/database').default;
    console.log('✅ Database module loaded successfully');
    console.log('Database type:', typeof db);
    console.log('Database function?', typeof db === 'function');

    // Test a simple query
    const games = await db('games').select('*').limit(1);
    console.log('✅ Database query successful');
    console.log('Sample game:', games[0] || 'No games in database');

    // Check if teams and locations tables exist
    const teams = await db('teams').count('* as count');
    const locations = await db('locations').count('* as count');
    console.log(`Teams in database: ${teams[0].count}`);
    console.log(`Locations in database: ${locations[0].count}`);

    return true;
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    return false;
  }
}

// Test ICS parser directly
async function testParserDirectly() {
  console.log('\n========== TESTING ICS PARSER DIRECTLY ==========\n');

  try {
    const ICSParser = require('./backend/dist/utils/ics-parser').default;
    console.log('✅ ICS Parser module loaded');

    const parser = new ICSParser();
    const icsContent = fs.readFileSync('this-week-games.ics', 'utf-8');

    const calendar = parser.parse(icsContent);
    console.log('✅ ICS content parsed successfully');
    console.log(`Events found: ${calendar.events.length}`);

    if (calendar.events.length > 0) {
      const gameData = ICSParser.eventsToGameData(calendar.events);
      console.log(`Game data extracted: ${gameData.length} games`);

      console.log('\nFirst game details:');
      const firstGame = gameData[0];
      console.log(`  Date: ${firstGame.gameDate}`);
      console.log(`  Time: ${firstGame.gameTime}`);
      console.log(`  Home: ${firstGame.homeTeamName || 'N/A'}`);
      console.log(`  Away: ${firstGame.awayTeamName || 'N/A'}`);
      console.log(`  Location: ${firstGame.locationName || 'N/A'}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Parser test failed:', error.message);
    return false;
  }
}

// Test authentication
async function testAuthentication() {
  console.log('\n========== TESTING AUTHENTICATION ==========\n');

  try {
    // Try to login with admin credentials
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@cmba.ca',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      console.log('First password failed, trying alternate...');
      const loginResponse2 = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@cmba.ca',
          password: 'Admin123!'
        })
      });

      if (!loginResponse2.ok) {
        console.error('❌ Login failed with both passwords');
        return null;
      }

      const loginData = await loginResponse2.json();
      console.log('✅ Login successful with Admin123!');
      return loginData.token;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful with admin123');
    return loginData.token;

  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    return null;
  }
}

// Test the full upload flow
async function testFullUpload(token) {
  console.log('\n========== TESTING FULL UPLOAD FLOW ==========\n');

  if (!token) {
    console.error('❌ No token available, skipping upload test');
    return false;
  }

  try {
    const form = new FormData();
    const icsContent = fs.readFileSync('this-week-games.ics');

    form.append('calendar', icsContent, {
      filename: 'this-week-games.ics',
      contentType: 'text/calendar'
    });

    form.append('overwriteExisting', 'false');
    form.append('autoCreateTeams', 'true');
    form.append('autoCreateLocations', 'true');
    form.append('defaultLevel', 'Youth');
    form.append('defaultGameType', 'League');

    console.log('Sending upload request...');
    const uploadResponse = await fetch('http://localhost:3001/api/calendar/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      body: form
    });

    const result = await uploadResponse.json();

    if (uploadResponse.ok && result.success) {
      console.log('✅ Upload successful!');
      console.log(`  Imported: ${result.data.imported} games`);
      console.log(`  Skipped: ${result.data.skipped} games`);
      console.log(`  Failed: ${result.data.failed} games`);

      if (result.data.games && result.data.games.length > 0) {
        console.log('\nFirst 3 games:');
        result.data.games.slice(0, 3).forEach(game => {
          const status = game.status === 'imported' ? '✅' :
                        game.status === 'skipped' ? '⚠️' : '❌';
          console.log(`  ${status} ${game.gameDate} ${game.gameTime}: ${game.homeTeamName || 'N/A'} vs ${game.awayTeamName || 'N/A'}`);
          if (game.reason) {
            console.log(`      Reason: ${game.reason}`);
          }
        });
      }

      return true;
    } else {
      console.error('❌ Upload failed:', result.error || result);
      return false;
    }

  } catch (error) {
    console.error('❌ Upload test failed:', error.message);
    return false;
  }
}

// Test creating teams and locations directly
async function testCreateTeamsAndLocations() {
  console.log('\n========== TESTING TEAM/LOCATION CREATION ==========\n');

  try {
    const db = require('./backend/dist/config/database').default;

    // Create a test team
    const testTeam = {
      name: 'Test Thunder',
      sport: 'Hockey',
      level: 'Youth',
      division: 'U12',
      homeLocation: 'Test Arena',
      primaryColor: '#FF0000',
      secondaryColor: '#0000FF'
    };

    const existingTeam = await db('teams').where('name', testTeam.name).first();
    if (!existingTeam) {
      const [teamId] = await db('teams').insert(testTeam);
      console.log(`✅ Created test team with ID: ${teamId}`);
    } else {
      console.log(`ℹ️ Test team already exists with ID: ${existingTeam.id}`);
    }

    // Create a test location
    const testLocation = {
      name: 'Test Arena',
      address: '123 Test Street',
      city: 'TestCity',
      province: 'TC',
      postalCode: 'T1T 1T1',
      country: 'Canada'
    };

    const existingLocation = await db('locations').where('name', testLocation.name).first();
    if (!existingLocation) {
      const [locationId] = await db('locations').insert(testLocation);
      console.log(`✅ Created test location with ID: ${locationId}`);
    } else {
      console.log(`ℹ️ Test location already exists with ID: ${existingLocation.id}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Team/Location creation test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('=================================================');
  console.log('    COMPREHENSIVE BACKEND CALENDAR TEST SUITE    ');
  console.log('=================================================');
  console.log(`Test started at: ${new Date().toISOString()}`);

  const results = {
    database: await testDatabaseDirectly(),
    parser: await testParserDirectly(),
    teamLocation: await testCreateTeamsAndLocations()
  };

  const token = await testAuthentication();
  results.auth = !!token;
  results.upload = await testFullUpload(token);

  console.log('\n=================================================');
  console.log('                 TEST SUMMARY                    ');
  console.log('=================================================\n');

  console.log(`Database Test:        ${results.database ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Parser Test:          ${results.parser ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Team/Location Test:   ${results.teamLocation ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Authentication Test:  ${results.auth ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Upload Test:          ${results.upload ? '✅ PASSED' : '❌ FAILED'}`);

  const allPassed = Object.values(results).every(r => r);
  console.log(`\nOverall Result:       ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  if (!allPassed) {
    console.log('\n⚠️ Next Steps:');
    if (!results.database) {
      console.log('  - Check database connection and configuration');
      console.log('  - Verify backend/build/config/database.js exists');
    }
    if (!results.parser) {
      console.log('  - Check ICS parser module compilation');
      console.log('  - Verify backend/build/utils/ics-parser.js exists');
    }
    if (!results.auth) {
      console.log('  - Check authentication endpoint');
      console.log('  - Verify admin user credentials');
    }
    if (!results.upload) {
      console.log('  - Check upload endpoint implementation');
      console.log('  - Review server logs for detailed errors');
    }
  }
}

// Run the tests
runAllTests().catch(console.error);