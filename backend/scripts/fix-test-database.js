const knex = require('knex');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

async function fixTestDatabase() {
  console.log('🔧 Starting comprehensive test database fix...\n');
  
  // First, connect to postgres database to manage the test database
  const adminKnex = knex({
    client: 'pg',
    connection: {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'password',
      database: 'postgres'
    }
  });
  
  const dbName = 'sports_management_test';
  
  try {
    // Step 1: Drop and recreate the database
    console.log('📦 Step 1: Dropping existing test database...');
    await adminKnex.raw(`DROP DATABASE IF EXISTS ${dbName}`);
    console.log('✅ Database dropped');
    
    console.log('📦 Step 2: Creating fresh test database...');
    await adminKnex.raw(`CREATE DATABASE ${dbName}`);
    console.log('✅ Database created');
    
    await adminKnex.destroy();
    
    // Step 2: Connect to the new test database
    console.log('\n📦 Step 3: Connecting to test database...');
    const testKnex = knex({
      client: 'pg',
      connection: {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'password',
        database: dbName
      }
    });
    
    // Step 3: Create basic tables needed for tests
    console.log('📦 Step 4: Creating essential tables...\n');
    
    // Create users table
    console.log('  Creating users table...');
    await testKnex.schema.createTable('users', table => {
      table.uuid('id').primary().defaultTo(testKnex.raw('gen_random_uuid()'));
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('name');
      table.string('role').defaultTo('referee');
      table.json('roles').defaultTo('[]');
      table.string('phone');
      table.string('address');
      table.string('city');
      table.string('postal_code');
      table.decimal('max_distance', 10, 2);
      table.integer('years_experience');
      table.string('level');
      table.boolean('is_available').defaultTo(true);
      table.boolean('is_white_whistle').defaultTo(false);
      table.json('certifications');
      table.json('availability_preferences');
      table.timestamps(true, true);
      
      table.index('email');
      table.index('role');
    });
    console.log('  ✅ Users table created');
    
    // Create leagues table
    console.log('  Creating leagues table...');
    await testKnex.schema.createTable('leagues', table => {
      table.uuid('id').primary().defaultTo(testKnex.raw('gen_random_uuid()'));
      table.string('organization').notNullable();
      table.string('age_group').notNullable();
      table.string('gender').notNullable();
      table.string('division').notNullable();
      table.string('season').notNullable();
      table.string('name').notNullable();
      table.string('display_name');
      table.string('status').defaultTo('active');
      table.json('metadata');
      table.timestamps(true, true);
      
      table.index(['organization']);
      table.index(['season']);
    });
    console.log('  ✅ Leagues table created');
    
    // Create teams table
    console.log('  Creating teams table...');
    await testKnex.schema.createTable('teams', table => {
      table.uuid('id').primary().defaultTo(testKnex.raw('gen_random_uuid()'));
      table.uuid('league_id').references('id').inTable('leagues').onDelete('CASCADE');
      table.string('team_number').notNullable();
      table.string('name').notNullable();
      table.string('display_name');
      table.string('contact_email');
      table.string('contact_phone');
      table.integer('rank');
      table.json('metadata');
      table.timestamps(true, true);
      
      table.index(['league_id']);
      table.unique(['league_id', 'team_number']);
    });
    console.log('  ✅ Teams table created');
    
    // Create games table
    console.log('  Creating games table...');
    await testKnex.schema.createTable('games', table => {
      table.uuid('id').primary().defaultTo(testKnex.raw('gen_random_uuid()'));
      table.string('game_number').notNullable();
      table.uuid('home_team_id').references('id').inTable('teams').onDelete('SET NULL');
      table.uuid('away_team_id').references('id').inTable('teams').onDelete('SET NULL');
      table.uuid('league_id').references('id').inTable('leagues').onDelete('SET NULL');
      table.timestamp('game_date').notNullable();
      table.string('field').notNullable();
      table.string('division');
      table.string('game_type').defaultTo('regular');
      table.string('status').defaultTo('scheduled');
      table.integer('refs_needed').defaultTo(2);
      table.decimal('base_wage', 10, 2);
      table.decimal('wage_multiplier', 4, 2).defaultTo(1.0);
      table.json('metadata');
      table.timestamps(true, true);
      
      table.index(['game_number']);
      table.index(['game_date']);
      table.index(['status']);
    });
    console.log('  ✅ Games table created');
    
    // Create game_assignments table
    console.log('  Creating game_assignments table...');
    await testKnex.schema.createTable('game_assignments', table => {
      table.uuid('id').primary().defaultTo(testKnex.raw('gen_random_uuid()'));
      table.uuid('game_id').references('id').inTable('games').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('position');
      table.string('status').defaultTo('pending');
      table.decimal('calculated_wage', 10, 2);
      table.json('metadata');
      table.timestamps(true, true);
      
      table.index(['game_id']);
      table.index(['user_id']);
      table.index(['status']);
      table.unique(['game_id', 'user_id']);
    });
    console.log('  ✅ Game assignments table created');
    
    // Create other essential tables
    console.log('  Creating additional tables...');
    
    // Posts table for content
    await testKnex.schema.createTable('posts', table => {
      table.uuid('id').primary().defaultTo(testKnex.raw('gen_random_uuid()'));
      table.string('title').notNullable();
      table.text('content');
      table.string('excerpt');
      table.string('status').defaultTo('draft');
      table.string('category');
      table.json('tags');
      table.uuid('author_id').references('id').inTable('users');
      table.timestamp('published_at');
      table.timestamps(true, true);
    });
    
    // Locations table
    await testKnex.schema.createTable('locations', table => {
      table.uuid('id').primary().defaultTo(testKnex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('address');
      table.string('city');
      table.string('postal_code');
      table.decimal('latitude', 10, 7);
      table.decimal('longitude', 10, 7);
      table.timestamps(true, true);
    });
    
    console.log('  ✅ Additional tables created');
    
    // Step 5: Insert test data
    console.log('\n📦 Step 5: Inserting test data...');
    
    // Insert test users
    const testUsers = await testKnex('users').insert([
      {
        email: 'admin@test.com',
        password_hash: '$2a$10$test',
        name: 'Test Admin',
        role: 'admin',
        roles: JSON.stringify(['admin'])
      },
      {
        email: 'referee@test.com',
        password_hash: '$2a$10$test',
        name: 'Test Referee',
        role: 'referee',
        roles: JSON.stringify(['referee']),
        level: 'senior'
      }
    ]).returning('id');
    console.log(`  ✅ Created ${testUsers.length} test users`);
    
    // Insert test league
    const [league] = await testKnex('leagues').insert({
      organization: 'Test Organization',
      age_group: 'U18',
      gender: 'Mixed',
      division: 'Division 1',
      season: 'Spring 2024',
      name: 'Test League'
    }).returning('id');
    console.log('  ✅ Created test league');
    
    // Insert test teams
    const teams = await testKnex('teams').insert([
      {
        league_id: league.id,
        team_number: '001',
        name: 'Test Team 1'
      },
      {
        league_id: league.id,
        team_number: '002',
        name: 'Test Team 2'
      }
    ]).returning('id');
    console.log(`  ✅ Created ${teams.length} test teams`);
    
    // Insert test game
    const [game] = await testKnex('games').insert({
      game_number: 'G001',
      home_team_id: teams[0].id,
      away_team_id: teams[1].id,
      league_id: league.id,
      game_date: new Date('2024-09-01 14:00:00'),
      field: 'Field 1',
      base_wage: 50.00
    }).returning('id');
    console.log('  ✅ Created test game');
    
    // Verify tables
    console.log('\n📦 Step 6: Verifying database...');
    const tablesResult = await testKnex.raw(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    console.log(`  ✅ Created ${tablesResult.rows.length} tables total`);
    
    console.log('\n✅ Test database fixed successfully!');
    console.log('📋 Summary:');
    console.log('  - Database recreated from scratch');
    console.log('  - All essential tables created');
    console.log('  - Test data inserted');
    console.log('  - Ready for testing');
    
    await testKnex.destroy();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error fixing test database:', error.message);
    console.error(error);
    await adminKnex.destroy();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fixTestDatabase();
}

module.exports = { fixTestDatabase };