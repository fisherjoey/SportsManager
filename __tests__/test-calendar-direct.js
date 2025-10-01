const fs = require('fs');
const path = require('path');

// Load environment variables
require('./backend/node_modules/dotenv').config({ path: './backend/.env' });

// Direct test of the calendar parsing and import logic
async function testCalendarDirectly() {
  console.log('\n========== TESTING CALENDAR IMPORT DIRECTLY ==========\n');

  try {
    // Load database and parser
    const db = require('./backend/dist/config/database').default;
    const ICSParser = require('./backend/dist/utils/ics-parser').default;

    console.log('✅ Modules loaded successfully');

    // Read and parse the ICS file
    const icsContent = fs.readFileSync('next-week-games.ics', 'utf-8');
    const parser = new ICSParser();
    const calendar = parser.parse(icsContent);

    console.log(`📅 Found ${calendar.events.length} events in calendar`);

    // Convert to game data
    const gameData = ICSParser.eventsToGameData(calendar.events);
    console.log(`🎮 Converted to ${gameData.length} games\n`);

    // Process each game
    const results = {
      imported: 0,
      skipped: 0,
      failed: 0,
      games: []
    };

    for (const game of gameData) {
      try {
        // Check for existing game (combine date and time for date_time column)
        const dateTime = `${game.gameDate} ${game.gameTime}:00`;
        const existing = await db('games')
          .where('date_time', dateTime)
          .first();

        if (existing) {
          console.log(`⚠️ Skipped: ${game.gameDate} ${game.gameTime} - Already exists`);
          results.skipped++;
          results.games.push({ ...game, status: 'skipped', reason: 'Already exists' });
          continue;
        }

        // Get or create teams
        let homeTeamId = null;
        let awayTeamId = null;

        if (game.homeTeamName) {
          let homeTeam = await db('teams')
            .where('name', game.homeTeamName)
            .first();

          if (!homeTeam) {
            console.log(`  Creating team: ${game.homeTeamName}`);
            const result = await db('teams').insert({
              name: game.homeTeamName,
              display_name: game.homeTeamName,
              team_number: Math.floor(Math.random() * 9000) + 1000, // Random team number
              metadata: JSON.stringify({
                sport: 'Basketball',
                level: game.level || 'Youth'
              }),
              created_at: new Date(),
              updated_at: new Date()
            }).returning('id');
            homeTeamId = result[0].id || result[0];
          } else {
            homeTeamId = homeTeam.id;
          }
        }

        if (game.awayTeamName) {
          let awayTeam = await db('teams')
            .where('name', game.awayTeamName)
            .first();

          if (!awayTeam) {
            console.log(`  Creating team: ${game.awayTeamName}`);
            const result = await db('teams').insert({
              name: game.awayTeamName,
              display_name: game.awayTeamName,
              team_number: Math.floor(Math.random() * 9000) + 1000, // Random team number
              metadata: JSON.stringify({
                sport: 'Basketball',
                level: game.level || 'Youth'
              }),
              created_at: new Date(),
              updated_at: new Date()
            }).returning('id');
            awayTeamId = result[0].id || result[0];
          } else {
            awayTeamId = awayTeam.id;
          }
        }

        // Get or create location
        let locationId = null;
        if (game.locationName) {
          let location = await db('locations')
            .where('name', game.locationName)
            .first();

          if (!location) {
            console.log(`  Creating location: ${game.locationName}`);
            const result = await db('locations').insert({
              name: game.locationName,
              address: game.locationAddress || 'TBD',
              city: 'TBD',
              province: 'ON',
              postal_code: 'TBD',
              country: 'Canada',
              created_at: new Date(),
              updated_at: new Date()
            }).returning('id');
            locationId = result[0].id || result[0];
          } else {
            locationId = location.id;
          }
        }

        // Insert the game (using actual schema columns)
        const gameToInsert = {
          game_number: Math.floor(Math.random() * 90000) + 10000, // Random game number
          date_time: dateTime,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          field: game.locationName,
          division: game.level || 'Youth',
          game_type: game.gameType || 'League',
          refs_needed: game.refereesRequired || 2,
          metadata: JSON.stringify({
            notes: game.notes,
            location_address: game.locationAddress,
            original_status: game.status
          }),
          created_at: new Date(),
          updated_at: new Date()
        };

        console.log(`✅ Importing: ${game.gameDate} ${game.gameTime} - ${game.homeTeamName || 'TBD'} vs ${game.awayTeamName || 'TBD'}`);

        const [gameId] = await db('games').insert(gameToInsert).returning('id');

        results.imported++;
        results.games.push({ ...game, status: 'imported', gameId });

      } catch (error) {
        console.error(`❌ Failed: ${game.gameDate} ${game.gameTime} - ${error.message}`);
        results.failed++;
        results.games.push({ ...game, status: 'failed', error: error.message });
      }
    }

    // Summary
    console.log('\n========== IMPORT SUMMARY ==========');
    console.log(`✅ Imported: ${results.imported} games`);
    console.log(`⚠️ Skipped: ${results.skipped} games`);
    console.log(`❌ Failed: ${results.failed} games`);

    // Close database connection
    await db.destroy();

    return results;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testCalendarDirectly()
  .then(results => {
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });