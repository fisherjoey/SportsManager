const bcrypt = require('bcryptjs');

// Test the password hash checking
async function testPasswordHash() {
  const password = 'password';
  const saltRounds = 12;
  
  // Create a hash
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('Generated hash:', hash);
  
  // Test comparison
  const isValid = await bcrypt.compare(password, hash);
  console.log('Hash comparison result:', isValid);
  
  // Test with a known hash (from demo_users.js)
  const knownHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewisUhyh1F5KK9A6'; // Example hash
  const isValidKnown = await bcrypt.compare(password, knownHash);
  console.log('Known hash comparison:', isValidKnown);
}

testPasswordHash().catch(console.error);