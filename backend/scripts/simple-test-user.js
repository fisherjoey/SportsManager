/**
 * Simple script to create a test user
 * Run with: node scripts/simple-test-user.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/sports_management'
});

async function createSimpleTestUser() {
  try {
    console.log('Checking database schema...');

    // First, let's see what columns the users table actually has
    const columns = await db.raw(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    if (columns.rows.length === 0) {
      console.log('No users table found. Database may not be initialized.');
      console.log('Please run migrations first or initialize the database.');
      return;
    }

    console.log('\nUsers table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Check if basic test user exists
    const existingUser = await db('users')
      .where('email', 'admin@test.com')
      .first();

    if (existingUser) {
      console.log('\n✅ Test user already exists!');
      console.log('Email: admin@test.com');
      console.log('Password: admin123');
      console.log('\nYou can login with these credentials.');
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash('admin123', 10);

    // Build insert object based on what columns exist
    const userData = {
      email: 'admin@test.com',
      password_hash: passwordHash
    };

    // Check for optional columns and add them if they exist
    const columnNames = columns.rows.map(r => r.column_name);

    if (columnNames.includes('role')) {
      userData.role = 'admin';
    }
    if (columnNames.includes('name')) {
      userData.name = 'Test Admin';
    }
    if (columnNames.includes('is_active')) {
      userData.is_active = true;
    }
    if (columnNames.includes('roles') && !columnNames.includes('role')) {
      // Might be an array column
      userData.roles = ['admin'];
    }

    console.log('\nCreating test user with data:', userData);

    // Create the user
    const [user] = await db('users')
      .insert(userData)
      .returning('*');

    console.log('\n✅ Test user created successfully!');
    console.log('\nLogin credentials:');
    console.log('  Email: admin@test.com');
    console.log('  Password: admin123');
    console.log('\nUser details:', user);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Cannot connect to PostgreSQL database.');
      console.log('Make sure PostgreSQL is running and the connection settings are correct.');
      console.log('Current DATABASE_URL:', process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/sports_management');
    } else if (error.code === '3D000') {
      console.log('\n⚠️  Database "sports_management" does not exist.');
      console.log('Please create the database first:');
      console.log('  createdb sports_management');
      console.log('Or use pgAdmin/psql to create it.');
    }
  } finally {
    await db.destroy();
  }
}

createSimpleTestUser();