const db = require('./backend/dist/config/database').default || require('./backend/dist/config/database');

async function checkAdminUser() {
  try {
    const user = await db('users').where('email', 'admin@cmba.ca').first();
    if (user) {
      console.log('Admin user found:', {
        id: user.id,
        email: user.email,
        name: user.name,
        hasPassword: !!user.password_hash,
        passwordHashStart: user.password_hash ? user.password_hash.substring(0, 10) : 'N/A'
      });
    } else {
      console.log('Admin user NOT found in database');
    }
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkAdminUser();