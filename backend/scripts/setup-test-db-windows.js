const knex = require('knex');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

async function setupTestDatabase() {
  console.log('Setting up test database for Windows...');
  
  // First, connect to postgres database to create the test database
  const adminKnex = knex({
    client: 'pg',
    connection: {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'password',
      database: 'postgres' // Connect to default postgres database
    }
  });
  
  const dbName = 'sports_management_test';
  
  try {
    // Check if database exists
    const result = await adminKnex.raw(
      `SELECT 1 FROM pg_database WHERE datname = ?`,
      [dbName]
    );
    
    if (result.rows.length === 0) {
      // Create database if it doesn't exist
      console.log(`Creating database ${dbName}...`);
      await adminKnex.raw(`CREATE DATABASE ${dbName}`);
      console.log('Database created successfully');
    } else {
      console.log('Test database already exists');
    }
    
    await adminKnex.destroy();
    
    // Now connect to the test database and run migrations
    console.log('Connecting to test database...');
    const testKnex = knex({
      client: 'pg',
      connection: {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'password',
        database: dbName
      },
      migrations: {
        directory: path.join(__dirname, '..', 'migrations')
      }
    });
    
    console.log('Running migrations...');
    await testKnex.migrate.latest();
    console.log('Migrations completed successfully');
    
    console.log(`\nTest database "${dbName}" is ready for testing!`);
    console.log('You can now run: npm test');
    
    await testKnex.destroy();
    process.exit(0);
    
  } catch (error) {
    console.error('Error setting up test database:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.error('\nPlease check your PostgreSQL password in .env.test');
      console.error('Current password: cmba123');
      console.error('Update the password if needed and try again');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\nPostgreSQL is not running!');
      console.error('Please start PostgreSQL and try again');
    }
    
    await adminKnex.destroy();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupTestDatabase();
}

module.exports = { setupTestDatabase };