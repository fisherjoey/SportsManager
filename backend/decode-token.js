const jwt = require('jsonwebtoken');
require('dotenv').config();

// Get token from command line argument
const token = process.argv[2];

if (!token) {
  console.log('');
  console.log('📝 Usage: node decode-token.js YOUR_JWT_TOKEN');
  console.log('');
  console.log('To get your token:');
  console.log('1. Open browser DevTools (F12)');
  console.log('2. Go to Console tab');
  console.log('3. Type: localStorage.getItem("auth_token")');
  console.log('4. Copy the token and run: node decode-token.js YOUR_TOKEN');
  console.log('');
  process.exit(0);
}

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  console.log('\n=== JWT Token Contents ===\n');
  console.log('User ID:', decoded.userId || decoded.id);
  console.log('Email:', decoded.email);
  console.log('Legacy Role:', decoded.role);
  console.log('Roles Array:', decoded.roles);
  console.log('Issued At:', new Date(decoded.iat * 1000).toLocaleString());
  console.log('Expires At:', new Date(decoded.exp * 1000).toLocaleString());

  console.log('\n=== Diagnosis ===\n');
  if (!decoded.roles || decoded.roles.length === 0) {
    console.log('❌ PROBLEM: Token has no roles array!');
    console.log('');
    console.log('Solution: Log out and log back in to get a fresh token.');
    console.log('The new token will include your "Super Admin" role.');
  } else {
    console.log('✓ Token includes roles:', decoded.roles.join(', '));
    console.log('');
    console.log('If you still get 403 errors, the issue is elsewhere.');
  }
  console.log('');

} catch (error) {
  console.error('\n❌ Error decoding token:');
  console.error(error.message);
  console.log('');
  console.log('The token may be invalid or expired.');
  console.log('');
}