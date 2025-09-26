// Test Create Game with updated validation

async function testCreateGame() {
  console.log('Testing Create Game functionality...\n');

  // Login first
  const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@cmba.ca',
      password: 'admin123'
    })
  });

  const loginData = await loginResponse.json();

  if (!loginResponse.ok || !loginData.token) {
    console.log('❌ Login failed:', loginData);
    return;
  }

  console.log('✅ Login successful');
  const token = loginData.token;

  // Try to create a game with all fields
  const gameData = {
    homeTeam: {
      organization: 'Test Org',
      ageGroup: 'U12',
      gender: 'Boys',
      rank: 1
    },
    awayTeam: {
      organization: 'Test Org 2',
      ageGroup: 'U12',
      gender: 'Girls',
      rank: 1
    },
    date: '2025-02-15',
    time: '14:00',
    location: 'Test Field',
    postalCode: 'T2P 1A1',
    level: 'Recreational',
    gameType: 'Community',
    division: 'Division 1',
    season: 'Spring 2025',
    payRate: 50,
    refsNeeded: 2
    // Omit wageMultiplier fields to use defaults
  };

  console.log('\nCreating game with data:', JSON.stringify(gameData, null, 2));

  const createResponse = await fetch('http://localhost:3001/api/games', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(gameData)
  });

  console.log('\n📊 Response status:', createResponse.status);
  const responseText = await createResponse.text();

  try {
    const createData = JSON.parse(responseText);

    if (createResponse.ok) {
      console.log('✅ Game created successfully!');
      console.log('Game ID:', createData.data?.id || createData.id);
      console.log('Location:', createData.data?.location || createData.location);
      console.log('Date:', createData.data?.date || createData.date);
    } else {
      console.log('❌ Failed to create game:');
      console.log('Error:', createData.error || createData.message);
      if (createData.details) {
        console.log('Details:', JSON.stringify(createData.details, null, 2));
      }
    }
  } catch (e) {
    console.log('❌ Response parsing error:');
    console.log(responseText);
  }

  console.log('\n========================================');
  console.log('CREATE GAME BUTTON STATUS');
  console.log('========================================');

  if (createResponse.ok) {
    console.log('✅ The Create Game button should now work in the UI!');
    console.log('\nYou can now:');
    console.log('1. Open the browser to http://localhost:3000');
    console.log('2. Go to the Games page');
    console.log('3. Click "Create Game" button');
    console.log('4. Fill in the form and submit');
  }
}

testCreateGame().catch(console.error);