const db = require('./backend/src/config/database');

async function testGamesDatabase() {
  console.log('Testing games database connection and data...\n');
  
  try {
    // Test 1: Check if we can connect to the database
    console.log('1. Testing database connection...');
    const testConnection = await db.raw('SELECT 1+1 as result');
    console.log('✓ Database connection successful\n');
    
    // Test 2: Check if games table exists
    console.log('2. Checking if games table exists...');
    const tableExists = await db.schema.hasTable('games');
    console.log(`✓ Games table exists: ${tableExists}\n`);
    
    // Test 3: Count games in database
    console.log('3. Counting games in database...');
    const gameCount = await db('games').count('* as count');
    console.log(`✓ Total games in database: ${gameCount[0].count}\n`);
    
    // Test 4: Get sample games
    console.log('4. Fetching sample games...');
    const sampleGames = await db('games')
      .select('id', 'home_team_name', 'away_team_name', 'date_time', 'location', 'status')
      .limit(5);
    
    if (sampleGames.length > 0) {
      console.log('Sample games:');
      sampleGames.forEach((game, index) => {
        console.log(`  ${index + 1}. Game ID: ${game.id}`);
        console.log(`     ${game.home_team_name || 'Unknown'} vs ${game.away_team_name || 'Unknown'}`);
        console.log(`     Date: ${game.date_time}`);
        console.log(`     Location: ${game.location || 'Unknown'}`);
        console.log(`     Status: ${game.status || 'Unknown'}\n`);
      });
    } else {
      console.log('No games found in database.\n');
    }
    
    // Test 5: Check table structure
    console.log('5. Checking games table structure...');
    const columns = await db('games').columnInfo();
    console.log('Games table columns:', Object.keys(columns).join(', '));
    
    // Test 6: Check for team-related columns
    console.log('\n6. Checking team data storage...');
    const teamColumns = Object.keys(columns).filter(col => 
      col.includes('team') || col.includes('home') || col.includes('away')
    );
    console.log('Team-related columns:', teamColumns.join(', '));
    
    // Test 7: Check if we have new structure with team IDs
    if (columns.home_team_id && columns.away_team_id) {
      console.log('\n7. Database uses team IDs (normalized structure)');
      
      // Check teams table
      const teamsExist = await db.schema.hasTable('teams');
      console.log(`Teams table exists: ${teamsExist}`);
      
      if (teamsExist) {
        const teamCount = await db('teams').count('* as count');
        console.log(`Total teams in database: ${teamCount[0].count}`);
        
        const sampleTeams = await db('teams').limit(3);
        if (sampleTeams.length > 0) {
          console.log('Sample teams:');
          sampleTeams.forEach(team => {
            console.log(`  - ${team.name || team.display_name || 'Unknown'} (ID: ${team.id})`);
          });
        }
      }
    } else {
      console.log('\n7. Database stores team names directly (denormalized)');
    }
    
    // Test 8: Try the actual query from the API endpoint
    console.log('\n8. Testing actual API query...');
    try {
      const apiQuery = await db('games')
        .select(
          'games.*',
          'home_teams.name as home_team_name',
          'away_teams.name as away_team_name'
        )
        .leftJoin('teams as home_teams', 'games.home_team_id', 'home_teams.id')
        .leftJoin('teams as away_teams', 'games.away_team_id', 'away_teams.id')
        .limit(1);
      
      if (apiQuery.length > 0) {
        console.log('✓ API query successful');
        console.log('First game from API query:', {
          id: apiQuery[0].id,
          home: apiQuery[0].home_team_name,
          away: apiQuery[0].away_team_name,
          date: apiQuery[0].date_time
        });
      } else {
        console.log('⚠ API query returned no results');
      }
    } catch (queryError) {
      console.log('✗ API query failed:', queryError.message);
      console.log('\nTrying simpler query without joins...');
      
      const simpleQuery = await db('games')
        .select('*')
        .limit(1);
      
      if (simpleQuery.length > 0) {
        console.log('Simple query successful. First game:', {
          id: simpleQuery[0].id,
          home: simpleQuery[0].home_team_name || simpleQuery[0].home_team,
          away: simpleQuery[0].away_team_name || simpleQuery[0].away_team,
          date: simpleQuery[0].date_time || simpleQuery[0].game_date
        });
      }
    }
    
    console.log('\n✓ All tests completed successfully');
    
  } catch (error) {
    console.error('✗ Error during testing:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close database connection
    await db.destroy();
    process.exit(0);
  }
}

// Run the tests
testGamesDatabase();