const { exec } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

async function setupTestDatabase() {
  console.log('Setting up test database...');
  
  const dbName = 'sports_management_test';
  
  // Try to create the database
  exec(`createdb ${dbName}`, async (error, stdout, stderr) => {
    if (error) {
      if (error.message.includes('already exists') || stderr.includes('already exists')) {
        console.log('Test database already exists, continuing...');
      } else {
        console.error('Error creating database:', error.message);
        console.error('Make sure PostgreSQL is installed and running');
        console.error('You may need to create the database manually:');
        console.error(`  createdb ${dbName}`);
        console.error('Or with psql:');
        console.error(`  psql -U postgres -c "CREATE DATABASE ${dbName};"`);
        process.exit(1);
      }
    } else {
      console.log('Test database created successfully');
    }
    
    // Now run migrations
    console.log('Running migrations on test database...');
    
    // Set environment to test
    process.env.NODE_ENV = 'test';
    
    try {
      const knex = require('../src/config/database');
      
      // Run migrations
      await knex.migrate.latest();
      console.log('Migrations completed successfully');
      
      // Optionally seed with test data
      console.log('Database setup complete!');
      console.log(`Test database "${dbName}" is ready for testing`);
      
      await knex.destroy();
      process.exit(0);
    } catch (migrationError) {
      console.error('Error running migrations:', migrationError);
      process.exit(1);
    }
  });
}

// Run if called directly
if (require.main === module) {
  setupTestDatabase();
}

module.exports = { setupTestDatabase };