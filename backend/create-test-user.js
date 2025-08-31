const bcrypt = require('bcryptjs');
const knex = require('./src/config/database');

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // Check if user exists
    const existing = await knex('users')
      .where('email', 'test@example.com')
      .first();
    
    if (existing) {
      // Update password
      await knex('users')
        .where('email', 'test@example.com')
        .update({
          password_hash: hashedPassword,
          updated_at: new Date()
        });
      console.log('Test user password updated');
    } else {
      // Create new user
      await knex('users').insert({
        id: knex.raw('gen_random_uuid()'),
        email: 'test@example.com',
        password_hash: hashedPassword,
        name: 'Test User',
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log('Test user created');
    }
    
    console.log('Email: test@example.com');
    console.log('Password: test123');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await knex.destroy();
  }
}

createTestUser();