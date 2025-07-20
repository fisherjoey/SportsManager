const knex = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await knex('users').where('email', 'admin@refassign.com').first();
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('password', saltRounds);

    // Create admin user
    const [adminUser] = await knex('users').insert({
      email: 'admin@refassign.com',
      password_hash: passwordHash,
      role: 'admin',
      name: 'System Admin',
      is_available: true,
      max_distance: 25
    }).returning('*');

    console.log('Admin user created successfully:', adminUser.email);

    // Create a test referee user
    const [refereeUser] = await knex('users').insert({
      email: 'referee@test.com',
      password_hash: passwordHash,
      role: 'referee',
      name: 'Test Referee',
      phone: '(555) 123-4567',
      location: 'Test City',
      postal_code: '12345',
      max_distance: 30,
      is_available: true
    }).returning('*');

    console.log('Test referee user created successfully:', refereeUser.email);

  } catch (error) {
    console.error('Error creating users:', error);
  } finally {
    await knex.destroy();
  }
}

createAdminUser();