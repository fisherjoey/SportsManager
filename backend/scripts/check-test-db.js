const knex = require('knex');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

async function checkTestDatabase() {
  console.log('Checking test database status...\n');
  
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
    // Get all tables
    const result = await testKnex.raw(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);
    
    const tables = result.rows.map(row => row.tablename);
    
    console.log(`Found ${tables.length} tables in test database:`);
    tables.forEach(table => console.log(`  - ${table}`));
    
    // Check critical tables
    const criticalTables = ['users', 'games', 'teams', 'leagues', 'game_assignments'];
    const missingTables = criticalTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('\n❌ Missing critical tables:');
      missingTables.forEach(table => console.log(`  - ${table}`));
    } else {
      console.log('\n✅ All critical tables exist');
    }
    
    // Check migrations status
    if (tables.includes('knex_migrations')) {
      const migrations = await testKnex('knex_migrations').select('*').orderBy('id');
      console.log(`\n📋 Migrations run: ${migrations.length}`);
      if (migrations.length > 0) {
        console.log('Latest migrations:');
        migrations.slice(-5).forEach(m => console.log(`  - ${m.name}`));
      }
    }
    
    // Check if users table has data
    if (tables.includes('users')) {
      const userCount = await testKnex('users').count('* as count');
      console.log(`\n👥 Users in database: ${userCount[0].count}`);
    }
    
  } catch (error) {
    console.error('Error checking test database:', error.message);
  } finally {
    await testKnex.destroy();
  }
}

checkTestDatabase();