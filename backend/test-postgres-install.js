const { Client } = require('pg');

async function testPostgreSQL() {
  console.log('Testing fresh PostgreSQL installation...\n');

  try {
    // Test connection to default postgres database
    const client = new Client({
      user: 'postgres',
      password: 'password',
      host: 'localhost',
      port: 5432,
      database: 'postgres'
    });

    await client.connect();
    console.log('✅ Connected to PostgreSQL successfully!');

    // Get PostgreSQL version
    const result = await client.query('SELECT version()');
    console.log('📋 Version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);

    // Create sports_management database
    console.log('\n📦 Creating sports_management database...');
    try {
      await client.query('CREATE DATABASE sports_management');
      console.log('✅ Database created successfully!');
    } catch (error) {
      if (error.code === '42P04') {
        console.log('✅ Database already exists');
      } else {
        throw error;
      }
    }

    await client.end();

    console.log('\n🎉 PostgreSQL is ready!');
    console.log('\nNext steps:');
    console.log('1. cd backend');
    console.log('2. npm run migrate');
    console.log('3. npm run seed');

  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('\nPlease check:');
    console.log('- PostgreSQL is installed and running');
    console.log('- Password is set to "password"');
    console.log('- Port 5432 is available');
  }
}

testPostgreSQL();