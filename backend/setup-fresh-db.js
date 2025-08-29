const { Client } = require('pg');
const { execSync } = require('child_process');

async function setupFreshDatabase() {
  console.log('🚀 Setting up fresh database...\n');

  // Common PostgreSQL passwords to try
  const passwords = ['', 'postgres', 'password', 'admin', '123456'];
  let workingPassword = null;

  console.log('1. Testing PostgreSQL connection...');
  
  for (const pwd of passwords) {
    try {
      const client = new Client({
        user: 'postgres',
        password: pwd,
        host: 'localhost',
        port: 5432,
        database: 'postgres' // Connect to default database first
      });
      
      await client.connect();
      console.log(`✅ Connected with password: "${pwd || 'empty'}"`);
      workingPassword = pwd;
      
      // Create database if it doesn't exist
      console.log('\n2. Creating sports_management database...');
      try {
        await client.query('CREATE DATABASE sports_management;');
        console.log('✅ Database created');
      } catch (error) {
        if (error.code === '42P04') {
          console.log('✅ Database already exists');
        } else {
          console.log('❌ Error creating database:', error.message);
        }
      }
      
      await client.end();
      break;
    } catch (error) {
      console.log(`❌ Failed with password: "${pwd || 'empty'}"`);
    }
  }

  if (!workingPassword) {
    console.log('\n❌ Could not connect to PostgreSQL with any common password.');
    console.log('Please check your PostgreSQL installation or reset the password.');
    return;
  }

  // Update .env file with working password
  console.log('\n3. Updating .env file...');
  const fs = require('fs');
  let envContent = fs.readFileSync('.env', 'utf8');
  envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${workingPassword}`);
  envContent = envContent.replace(/postgresql:\/\/postgres:.*@/, `postgresql://postgres:${workingPassword}@`);
  fs.writeFileSync('.env', envContent);
  console.log('✅ .env file updated');

  // Run migrations
  console.log('\n4. Running database migrations...');
  try {
    execSync('npm run migrate', { stdio: 'inherit' });
    console.log('✅ Migrations completed');
  } catch (error) {
    console.log('❌ Migration failed:', error.message);
    return;
  }

  // Run seeds
  console.log('\n5. Creating demo accounts...');
  try {
    execSync('npm run seed', { stdio: 'inherit' });
    console.log('✅ Demo accounts created');
  } catch (error) {
    console.log('❌ Seeding failed:', error.message);
    return;
  }

  console.log('\n🎉 Database setup complete!');
  console.log('\nDemo accounts available:');
  console.log('- admin@cmba.ca / password');
  console.log('- admin@refassign.com / password');  
  console.log('- referee@test.com / password');
}

setupFreshDatabase().catch(console.error);