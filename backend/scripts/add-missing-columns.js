const knex = require('knex');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

async function addMissingColumns() {
  console.log('🔧 Adding missing columns to test database...\n');
  
  const testKnex = knex({
    client: 'pg',
    connection: {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'password',
      database: 'sports_management_test'
    }
  });
  
  try {
    // Check which columns exist
    const columnInfo = await testKnex('users').columnInfo();
    console.log('Current columns:', Object.keys(columnInfo));
    
    // Add missing columns if they don't exist
    await testKnex.schema.alterTable('users', table => {
      if (!columnInfo.location) {
        console.log('Adding location column...');
        table.string('location');
      }
      if (!columnInfo.wage_per_game) {
        console.log('Adding wage_per_game column...');
        table.decimal('wage_per_game', 10, 2);
      }
      if (!columnInfo.referee_level_id) {
        console.log('Adding referee_level_id column...');
        table.uuid('referee_level_id');
      }
      if (!columnInfo.games_refereed_season) {
        console.log('Adding games_refereed_season column...');
        table.integer('games_refereed_season').defaultTo(0);
      }
      if (!columnInfo.evaluation_score) {
        console.log('Adding evaluation_score column...');
        table.decimal('evaluation_score', 4, 2);
      }
      if (!columnInfo.notes) {
        console.log('Adding notes column...');
        table.text('notes');
      }
    });
    
    console.log('\n✅ All missing columns added successfully!');
    
    // Verify columns
    const updatedColumnInfo = await testKnex('users').columnInfo();
    console.log('\nFinal columns:', Object.keys(updatedColumnInfo));
    
  } catch (error) {
    console.error('❌ Error adding columns:', error.message);
    throw error;
  } finally {
    await testKnex.destroy();
  }
}

// Run the script
addMissingColumns().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});