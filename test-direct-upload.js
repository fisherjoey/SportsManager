const fs = require('fs');
const path = require('path');
const FormData = require('./backend/node_modules/form-data');

// Use the token that's currently active in your browser
// You can get this by opening browser dev tools and running: localStorage.getItem('auth_token')
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.log('Please provide the auth token as an argument');
  console.log('Get it from browser console: localStorage.getItem("auth_token")');
  console.log('Then run: node test-direct-upload.js YOUR_TOKEN_HERE');
  process.exit(1);
}

async function testCalendarUpload() {
  try {
    console.log('Testing calendar upload with provided token...\n');

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
        'Authorization': `Bearer ${TOKEN}`,
        ...form.getHeaders()
      },
      body: form
    });

    const result = await uploadResponse.json();
    console.log('Upload result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log(`\n✅ Successfully imported ${result.data.imported} games`);
      console.log(`⚠️  Skipped ${result.data.skipped} games`);
      console.log(`❌ Failed ${result.data.failed} games`);

      if (result.data.games && result.data.games.length > 0) {
        console.log('\nFirst 5 game results:');
        result.data.games.slice(0, 5).forEach(game => {
          const status = game.status === 'imported' ? '✅' :
                        game.status === 'skipped' ? '⚠️' : '❌';
          console.log(`  ${status} ${game.gameDate} ${game.gameTime}: ${game.homeTeamName || 'N/A'} vs ${game.awayTeamName || 'N/A'}`);
          if (game.reason) {
            console.log(`      Reason: ${game.reason}`);
          }
        });
      }
    } else {
      console.log('\n❌ Upload failed:', result.error);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCalendarUpload();