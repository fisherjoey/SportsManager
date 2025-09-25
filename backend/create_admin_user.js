const knex = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  try {
    // Check if CMBA admin user already exists
    const existingCmbaAdmin = await knex('users').where('email', 'admin@cmba.ca').first();
    
    if (existingCmbaAdmin) {
      console.log('CMBA Admin user already exists');
    } else {
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash('password', saltRounds);

      // Create CMBA admin user
      const [cmbaAdminUser] = await knex('users').insert({
        email: 'admin@cmba.ca',
        password_hash: passwordHash,
        role: 'admin',
        name: 'CMBA Administrator',
        is_available: true,
        max_distance: 25
      }).returning('*');

      console.log('CMBA Admin user created successfully:', cmbaAdminUser.email);
    }

    // Check if default admin user already exists
    const existingAdmin = await knex('users').where('email', 'admin@refassign.com').first();
    
    if (existingAdmin) {
      console.log('Default admin user already exists');
    } else {
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash('password', saltRounds);

      // Create default admin user
      const [adminUser] = await knex('users').insert({
        email: 'admin@refassign.com',
        password_hash: passwordHash,
        role: 'admin',
        name: 'System Admin',
        is_available: true,
        max_distance: 25
      }).returning('*');

      console.log('Default admin user created successfully:', adminUser.email);
    }

    // Create a test referee user
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('password', saltRounds);
    
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