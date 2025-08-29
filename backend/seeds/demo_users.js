exports.seed = async function(knex) {
  const bcrypt = require('bcryptjs');
  const saltRounds = 12;

  // Demo users as shown in the login form
  const demoUsers = [
    {
      email: 'admin@cmba.ca',
      password: 'password',
      role: 'admin',
      name: 'CMBA Admin'
    },
    {
      email: 'admin@refassign.com',
      password: 'password', 
      role: 'admin',
      name: 'System Admin'
    },
    {
      email: 'referee@test.com',
      password: 'password',
      role: 'referee',
      name: 'Test Referee',
      phone: '+1 (403) 555-0123',
      postal_code: 'T2A 1B2',
      max_distance: 25,
      is_available: true,
      wage_per_game: 45.00,
      years_experience: 3
    }
  ];

  // Insert demo users if they don't exist
  for (const userData of demoUsers) {
    const existingUser = await knex('users').where('email', userData.email).first();
    
    if (!existingUser) {
      const { password, ...userRecord } = userData;
      userRecord.password_hash = await bcrypt.hash(password, saltRounds);
      
      await knex('users').insert(userRecord);
      console.log(`Created demo user: ${userData.email}`);
    } else {
      console.log(`Demo user already exists: ${userData.email}`);
    }
  }
};