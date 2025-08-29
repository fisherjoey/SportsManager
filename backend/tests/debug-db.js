const db = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function debugDatabase() {
  try {
    console.log('Checking database connection...');
    
    // Test basic database connection
    const result = await db.raw('SELECT NOW()');
    console.log('Database connected, current time:', result.rows[0].now);
    
    // Check if users table exists
    const tableCheck = await db.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    console.log('Users table exists:', tableCheck.rows[0].exists);
    
    // Get all users
    console.log('\nAll users in database:');
    const users = await db('users').select('email', 'role');
    console.log(users);
    
    // Check specific demo user
    console.log('\nChecking admin@cmba.ca user:');
    const demoUser = await db('users').where('email', 'admin@cmba.ca').first();
    if (demoUser) {
      console.log('User found:', { 
        email: demoUser.email, 
        role: demoUser.role,
        has_password_hash: !!demoUser.password_hash,
        hash_length: demoUser.password_hash ? demoUser.password_hash.length : 0
      });
      
      // Test password comparison
      const isValidPassword = await bcrypt.compare('password', demoUser.password_hash);
      console.log('Password "password" is valid:', isValidPassword);
    } else {
      console.log('User not found!');
    }
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await db.destroy();
  }
}

debugDatabase();