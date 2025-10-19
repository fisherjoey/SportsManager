const fs = require('fs');
const path = require('path');
const FormData = require('./backend/node_modules/form-data');

async function testCalendarUpload() {
  try {
    // First login to get token
    console.log('Logging in...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@cmba.ca',
        password: 'Admin123!'  // Try different password
      })
    });

    if (!loginResponse.ok) {
      // Try another password
      const loginResponse2 = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@cmba.ca',
          password: 'admin123'
        })
      });

      if (!loginResponse2.ok) {
        console.log('Login failed with both passwords');
        console.log(await loginResponse2.text());
        return;
      }

      const loginData = await loginResponse2.json();
      console.log('Login successful with admin123');
      token = loginData.token;
    } else {
      const loginData = await loginResponse.json();
      console.log('Login successful with Admin123!');
      token = loginData.token;
    }

    // Now test the upload
    console.log('\nTesting calendar upload...');
    const form = new FormData();

    // Read the ICS file
    const icsContent = fs.readFileSync('this-week-games.ics');
    form.append('calendar', icsContent, {
      filename: 'this-week-games.ics',
      contentType: 'text/calendar'
    });

    // Add other form fields
    form.append('overwriteExisting', 'false');
    form.append('autoCreateTeams', 'true');
    form.append('autoCreateLocations', 'true');
    form.append('defaultLevel', 'Youth');
    form.append('defaultGameType', 'League');

    const uploadResponse = await fetch('http://localhost:3001/api/calendar/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      body: form
    });

    const result = await uploadResponse.json();
    console.log('\nUpload result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log(`\n✅ Successfully imported ${result.data.imported} games`);
      console.log(`⚠️  Skipped ${result.data.skipped} games`);
      console.log(`❌ Failed ${result.data.failed} games`);

      if (result.data.games && result.data.games.length > 0) {
        console.log('\nFirst 3 game results:');
        result.data.games.slice(0, 3).forEach(game => {
          console.log(`  - ${game.gameDate} ${game.gameTime}: ${game.status} - ${game.reason || 'Success'}`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCalendarUpload();