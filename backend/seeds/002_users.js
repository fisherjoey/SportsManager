exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('game_assignments').del();
  await knex('referees').del();
  await knex('users').del();

  const bcrypt = require('bcryptjs');
  const saltRounds = 12;

  // Insert admin user
  const [adminUser] = await knex('users').insert([
    {
      email: 'admin@refassign.com',
      password_hash: await bcrypt.hash('password', saltRounds),
      role: 'admin'
    }
  ]).returning('*');

  // Insert referee users
  const [refereeUser1] = await knex('users').insert([
    {
      email: 'mike@referee.com',
      password_hash: await bcrypt.hash('password', saltRounds),
      role: 'referee'
    }
  ]).returning('*');

  const [refereeUser2] = await knex('users').insert([
    {
      email: 'sarah@referee.com',
      password_hash: await bcrypt.hash('password', saltRounds),
      role: 'referee'
    }
  ]).returning('*');

  // Insert referee data
  await knex('referees').insert([
    {
      user_id: refereeUser1.id,
      name: 'Mike Johnson',
      email: 'mike@referee.com',
      phone: '(555) 987-6543',
      level: 'Recreational',
      location: 'Downtown',
      postal_code: '12345',
      max_distance: 25,
      is_available: true
    },
    {
      user_id: refereeUser2.id,
      name: 'Sarah Davis',
      email: 'sarah@referee.com',
      phone: '(555) 456-7890',
      level: 'Competitive',
      location: 'Westside',
      postal_code: '54321',
      max_distance: 30,
      is_available: true
    }
  ]);
};