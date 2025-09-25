const knex = require('knex');
const bcrypt = require('bcryptjs');
const config = require('./knexfile');

const db = knex(config.development);

async function resetPasswords() {
  try {
    console.log('Resetting passwords for all users...');
    
    // Hash the default password
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update all users with the new password hash
    const updateCount = await db('users')
      .update({ password_hash: hashedPassword });
    
    console.log(`✅ Updated ${updateCount} user passwords`);
    console.log('\nYou can now login with:');
    console.log('Password: password123');
    console.log('\nAvailable users:');
    
    const users = await db('users').select('email', 'role', 'name');
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });
    
  } catch (error) {
    console.error('Error resetting passwords:', error.message);
  } finally {
    await db.destroy();
  }
}

resetPasswords();