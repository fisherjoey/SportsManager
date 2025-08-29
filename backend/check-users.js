const knex = require('knex');
const config = require('./knexfile');

const db = knex(config.development);

async function checkUsers() {
  try {
    const users = await db('users').select('email', 'role', 'name');
    console.log('Available users in database:');
    console.log('================================');
    if (users.length === 0) {
      console.log('No users found in database!');
      console.log('\nYou can create a test user with:');
      console.log('Email: admin@example.com');
      console.log('Password: password123');
    } else {
      users.forEach(user => {
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Name: ${user.name || 'Not set'}`);
        console.log('---');
      });
      console.log('\nDefault password for all test users: password123');
    }
  } catch (error) {
    console.error('Error checking users:', error.message);
  } finally {
    await db.destroy();
  }
}

checkUsers();