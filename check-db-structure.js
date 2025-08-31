const db = require('./backend/src/config/database');

async function checkDatabaseStructure() {
  console.log('Checking database structure...\n');
  
  try {
    // Get column info for games table
    const columns = await db('games').columnInfo();
    
    console.log('Games table columns:');
    console.log('===================');
    Object.entries(columns).forEach(([name, info]) => {
      console.log(`  ${name}: ${info.type}`);
    });
    
    // Try to get a sample game to see actual data
    console.log('\nSample game data:');
    console.log('=================');
    const sampleGame = await db('games').first();
    
    if (sampleGame) {
      Object.entries(sampleGame).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
          console.log(`  ${key}: ${displayValue}`);
        }
      });
    } else {
      console.log('No games found in database');
    }
    
    // Check if teams table exists
    console.log('\nChecking related tables:');
    console.log('========================');
    const teamsExist = await db.schema.hasTable('teams');
    const leaguesExist = await db.schema.hasTable('leagues');
    
    console.log(`  teams table exists: ${teamsExist}`);
    console.log(`  leagues table exists: ${leaguesExist}`);
    
    if (teamsExist) {
      const teamColumns = await db('teams').columnInfo();
      console.log('\nTeams table columns:');
      Object.keys(teamColumns).forEach(name => {
        console.log(`    ${name}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

checkDatabaseStructure();