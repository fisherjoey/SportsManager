const knex = require('knex');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

async function addLeaguesColumns() {
  console.log('🔧 Adding missing columns to leagues table...\n');
  
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
    const columnInfo = await testKnex('leagues').columnInfo();
    console.log('Current columns:', Object.keys(columnInfo));
    
    // Add missing columns if they don't exist
    await testKnex.schema.alterTable('leagues', table => {
      if (!columnInfo.level) {
        console.log('Adding level column...');
        table.string('level'); // e.g., 'Recreational', 'Competitive'
      }
    });
    
    console.log('\n✅ All missing columns added successfully!');
    
    // Verify columns
    const updatedColumnInfo = await testKnex('leagues').columnInfo();
    console.log('\nFinal columns:', Object.keys(updatedColumnInfo));
    
  } catch (error) {
    console.error('❌ Error adding columns:', error.message);
    throw error;
  } finally {
    await testKnex.destroy();
  }
}

// Run the script
addLeaguesColumns().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});