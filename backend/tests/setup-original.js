const knex = require('knex');
const config = require('../knexfile');

// Use test environment configuration
const testDb = knex(config.test);

let migrationCompleted = false;

// Setup test database before all tests
beforeAll(async () => {
  try {
    if (!migrationCompleted) {
      // Check if migrations table exists
      const hasTable = await testDb.schema.hasTable('knex_migrations');
      if (!hasTable) {
        // Run migrations only if table doesn't exist
        await testDb.migrate.latest();
      }
      
      // Check if we have any data, if not run seeds
      const userCount = await testDb('users').count('id as count').first();
      if (parseInt(userCount.count) === 0) {
        await testDb.seed.run({ directory: './seeds/test' });
      }
      
      migrationCompleted = true;
    }
  } catch (error) {
    console.error('Test setup failed:', error);
    throw error;
  }
}, 30000); // 30 second timeout

// Clean up after all tests
afterAll(async () => {
  try {
    await testDb.destroy();
  } catch (error) {
    console.error('Test cleanup failed:', error);
  }
});

// Clean up between tests by truncating tables
beforeEach(async () => {
  try {
    // Disable foreign key constraints temporarily
    await testDb.raw('SET session_replication_role = replica;');
    
    // Get all table names except migrations
    const tables = await testDb.raw(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename != 'knex_migrations'
    `);
    
    // Truncate all tables
    for (const table of tables.rows) {
      await testDb.raw(`TRUNCATE TABLE "${table.tablename}" RESTART IDENTITY CASCADE;`);
    }
    
    // Re-enable foreign key constraints
    await testDb.raw('SET session_replication_role = DEFAULT;');
    
    // Re-run test seeds to get fresh test data
    await testDb.seed.run({ directory: './seeds/test' });
  } catch (error) {
    console.error('Test cleanup between tests failed:', error);
  }
});

module.exports = testDb;