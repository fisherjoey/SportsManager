require('dotenv').config();
const db = require('./src/config/database');
const bcrypt = require('bcrypt');

async function testLogin() {
  try {
    console.log('🔍 Testing login for admin@cmba.ca...');
    
    // Find the user
    const user = await db('users').where('email', 'admin@cmba.ca').first();
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Role:', user.role);
    console.log('  Roles:', user.roles);
    console.log('  Password hash length:', user.password_hash?.length || 'No password hash');
    console.log('  Is available:', user.is_available);
    
    // Test password
    if (user.password_hash) {
      const passwordMatch = await bcrypt.compare('password123', user.password_hash);
      console.log('  Password verification:', passwordMatch ? '✅ Match' : '❌ No match');
    }
    
    // Test actual login API call
    console.log('\n🔐 Testing actual login API...');
    const loginData = {
      email: 'admin@cmba.ca',
      password: 'password123'
    };
    
    console.log('Login payload:', loginData);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
    process.exit(1);
  }
}

testLogin();