const bcrypt = require('bcryptjs');

// The hash from the database
const hash = '$2b$10$yOwjqRiHX2S4.4.37dBhzuWHQexEKUdM46HE1.RZFQz6vtj1.2oia';

// Test different passwords
const passwords = ['password', 'password123', 'Admin123!', 'admin'];

passwords.forEach(password => {
  const isMatch = bcrypt.compareSync(password, hash);
  console.log(`Password "${password}": ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
});