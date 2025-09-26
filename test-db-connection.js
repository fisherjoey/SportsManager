// Test database connection
const knex = require('knex');

const db = knex({
  client: 'postgresql',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'sports_management',
    user: 'postgres',
    password: 'postgres123'
  }
});

async function testConnection() {
  try {
    // Test connection
    const result = await db.raw('SELECT 1+1 as result');
    console.log('Database connection successful!');
    console.log('Test query result:', result.rows[0]);

    // Check for admin user
    const users = await db('users').where('email', 'admin@cmba.ca').first();
    if (users) {
      console.log('\nAdmin user found:', {
        id: users.id,
        email: users.email,
        name: users.name
      });
    } else {
      console.log('\nAdmin user NOT found. Creating one...');

      // Create admin user with password 'admin123'
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      const [newUser] = await db('users').insert({
        id: require('crypto').randomUUID(),
        email: 'admin@cmba.ca',
        password_hash: hashedPassword,
        name: 'Admin User',
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');

      console.log('Admin user created:', newUser.email);
    }

  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

testConnection();