const knex = require('knex');
const config = require('../knexfile');
const bcrypt = require('bcryptjs');

// Use test environment configuration
const testDb = knex(config.test);

// Track if we've initialized the database for this test run
let dbInitialized = false;

// Setup test database before all tests
beforeAll(async () => {
  try {
    if (!dbInitialized) {
      console.log('Initializing test database...');
      
      // Check if users table exists (indicates our fixed database is ready)
      const hasUsersTable = await testDb.schema.hasTable('users');
      
      if (!hasUsersTable) {
        console.error('Test database not properly initialized. Run: node scripts/fix-test-database.js');
        throw new Error('Test database missing required tables');
      }
      
      // Clear all data and insert fresh test data
      await cleanDatabase();
      await insertTestData();
      
      dbInitialized = true;
      console.log('Test database ready');
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

// Clean up between tests
beforeEach(async () => {
  try {
    await cleanDatabase();
    await insertTestData();
  } catch (error) {
    console.error('Test cleanup between tests failed:', error);
  }
});

// Helper function to clean database
async function cleanDatabase() {
  // Disable foreign key constraints temporarily
  await testDb.raw('SET session_replication_role = replica;');
  
  // Get all table names except migrations
  const tables = await testDb.raw(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT IN ('knex_migrations', 'knex_migrations_lock')
    ORDER BY tablename;
  `);
  
  // Truncate all tables
  for (const table of tables.rows) {
    try {
      await testDb.raw(`TRUNCATE TABLE "${table.tablename}" RESTART IDENTITY CASCADE;`);
    } catch (error) {
      // Some tables might not exist, that's okay
      if (!error.message.includes('does not exist')) {
        console.warn(`Warning truncating ${table.tablename}:`, error.message);
      }
    }
  }
  
  // Re-enable foreign key constraints
  await testDb.raw('SET session_replication_role = DEFAULT;');
}

// Helper function to insert test data
async function insertTestData() {
  try {
    // Insert test users with proper password hashes
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = await testDb('users').insert([
      {
        email: 'admin@test.com',
        password_hash: hashedPassword,
        name: 'Test Admin',
        role: 'admin',
        roles: JSON.stringify(['admin'])
      },
      {
        email: 'referee@test.com',
        password_hash: hashedPassword,
        name: 'Test Referee',
        role: 'referee',
        roles: JSON.stringify(['referee']),
        level: 'senior'
      },
      {
        email: 'john.doe@test.com',
        password_hash: hashedPassword,
        name: 'John Doe',
        role: 'referee',
        roles: JSON.stringify(['referee']),
        level: 'junior'
      }
    ]).returning('id');
    
    // Insert test league
    const [league] = await testDb('leagues').insert({
      organization: 'Test Organization',
      age_group: 'U18',
      gender: 'Mixed',
      division: 'Division 1',
      season: 'Spring 2024',
      name: 'Test League',
      status: 'active'
    }).returning('id');
    
    // Insert test teams
    const teams = await testDb('teams').insert([
      {
        league_id: league.id,
        team_number: '001',
        name: 'Test Team 1',
        display_name: 'Team One'
      },
      {
        league_id: league.id,
        team_number: '002',
        name: 'Test Team 2',
        display_name: 'Team Two'
      }
    ]).returning('id');
    
    // Insert test games
    const games = await testDb('games').insert([
      {
        game_number: 'G001',
        home_team_id: teams[0].id,
        away_team_id: teams[1].id,
        league_id: league.id,
        game_date: new Date('2024-09-01 14:00:00'),
        field: 'Field 1',
        division: 'Division 1',
        game_type: 'regular',
        status: 'scheduled',
        refs_needed: 2,
        base_wage: 50.00
      },
      {
        game_number: 'G002',
        home_team_id: teams[1].id,
        away_team_id: teams[0].id,
        league_id: league.id,
        game_date: new Date('2024-09-02 16:00:00'),
        field: 'Field 2',
        division: 'Division 1',
        game_type: 'regular',
        status: 'scheduled',
        refs_needed: 2,
        base_wage: 50.00
      }
    ]).returning('id');
    
    // Insert test assignments
    await testDb('game_assignments').insert([
      {
        game_id: games[0].id,
        user_id: users[1].id, // referee@test.com
        position: 'referee',
        status: 'confirmed',
        calculated_wage: 50.00
      }
    ]);
    
    // Insert test locations if table exists
    const hasLocationsTable = await testDb.schema.hasTable('locations');
    if (hasLocationsTable) {
      await testDb('locations').insert([
        {
          name: 'Field 1',
          address: '123 Main St',
          city: 'Test City',
          postal_code: '12345',
          latitude: 45.5,
          longitude: -73.5
        },
        {
          name: 'Field 2',
          address: '456 Oak Ave',
          city: 'Test City',
          postal_code: '12346',
          latitude: 45.6,
          longitude: -73.6
        }
      ]);
    }
    
  } catch (error) {
    // It's okay if some inserts fail due to missing tables
    if (!error.message.includes('does not exist')) {
      console.warn('Warning inserting test data:', error.message);
    }
  }
}

// Export the test database connection
module.exports = testDb;