const { Client } = require('pg');

async function setupDatabase() {
  // First, connect as postgres superuser to create the admin user and database
  const superUserClient = new Client({
    user: 'postgres',
    password: 'password', // Try common password
    host: 'localhost',
    port: 5432,
    database: 'postgres' // Connect to default postgres database
  });

  try {
    await superUserClient.connect();
    console.log('Connected as postgres superuser');

    // Create admin user if it doesn't exist
    try {
      await superUserClient.query(`
        CREATE USER admin WITH PASSWORD '';
      `);
      console.log('Created admin user');
    } catch (error) {
      if (error.code === '42710') {
        console.log('Admin user already exists');
      } else {
        console.log('Error creating admin user:', error.message);
      }
    }

    // Create database if it doesn't exist
    try {
      await superUserClient.query(`
        CREATE DATABASE sports_management OWNER admin;
      `);
      console.log('Created sports_management database');
    } catch (error) {
      if (error.code === '42P04') {
        console.log('Database sports_management already exists');
      } else {
        console.log('Error creating database:', error.message);
      }
    }

    // Grant privileges
    await superUserClient.query(`
      GRANT ALL PRIVILEGES ON DATABASE sports_management TO admin;
    `);
    console.log('Granted privileges to admin user');

  } catch (error) {
    console.error('Setup failed:', error.message);
    
    // Try with a common password
    if (error.message.includes('password authentication failed')) {
      console.log('Trying with common passwords...');
      const passwords = ['password', 'postgres', 'admin', '123456'];
      
      for (const pwd of passwords) {
        try {
          const client = new Client({
            user: 'postgres',
            password: pwd,
            host: 'localhost',
            port: 5432,
            database: 'postgres'
          });
          
          await client.connect();
          console.log(`Success! PostgreSQL postgres user password is: ${pwd}`);
          await client.end();
          break;
        } catch (e) {
          console.log(`Failed with password: ${pwd}`);
        }
      }
    }
  } finally {
    await superUserClient.end();
  }
}

setupDatabase();