const { Client } = require('pg');

async function testPostgreSQLPasswords() {
  console.log('Testing PostgreSQL with different passwords...\n');

  const passwords = ['password', '', 'postgres', 'admin', 'root'];
  
  for (const pwd of passwords) {
    try {
      console.log(`Trying password: "${pwd || 'empty'}"`);
      
      const client = new Client({
        user: 'postgres',
        password: pwd,
        host: 'localhost',
        port: 5432,
        database: 'postgres'
      });

      await client.connect();
      console.log(`✅ SUCCESS! Password is: "${pwd || 'empty'}"`);

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
          console.log('❌ Error creating database:', error.message);
        }
      }

      await client.end();

      console.log(`\n🎉 PostgreSQL is ready with password: "${pwd || 'empty'}"`);
      console.log('\nUpdate your .env file with:');
      console.log(`DB_PASSWORD=${pwd}`);
      console.log(`DATABASE_URL=postgresql://postgres:${pwd}@localhost:5432/sports_management`);
      return; // Exit on first successful connection

    } catch (error) {
      console.log(`❌ Failed: ${error.message}\n`);
    }
  }

  console.log('❌ Could not connect with any password. PostgreSQL might not be running.');
  console.log('Try starting it with: net start postgresql-x64-17 (as Administrator)');
}

testPostgreSQLPasswords();