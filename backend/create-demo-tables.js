const knex = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function createDemoTables() {
  try {
    console.log('Creating essential tables for demo...\n');

    // Create users table
    console.log('Creating users table...');
    await knex.schema.createTable('users', (table) => {
      table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
      table.string('email').notNullable().unique();
      table.string('password_hash').notNullable();
      table.enu('role', ['admin', 'referee']).notNullable();
      table.string('name');
      table.string('phone');
      table.string('location');
      table.string('postal_code');
      table.integer('max_distance');
      table.boolean('is_available').defaultTo(true);
      table.decimal('wage_per_game', 8, 2);
      table.integer('years_experience');
      table.decimal('evaluation_score', 5, 2);
      table.timestamps(true, true);
    });
    console.log('✅ Users table created');

    // Create demo accounts
    console.log('\nCreating demo accounts...');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('password', saltRounds);

    const demoUsers = [
      {
        email: 'admin@cmba.ca',
        password_hash: passwordHash,
        role: 'admin',
        name: 'CMBA Administrator',
        is_available: true,
        max_distance: 25
      },
      {
        email: 'admin@refassign.com',
        password_hash: passwordHash,
        role: 'admin',
        name: 'System Admin',
        is_available: true,
        max_distance: 25
      },
      {
        email: 'referee@test.com',
        password_hash: passwordHash,
        role: 'referee',
        name: 'Test Referee',
        phone: '(555) 123-4567',
        location: 'Test City',
        postal_code: '12345',
        max_distance: 30,
        is_available: true,
        wage_per_game: 45.00,
        years_experience: 2,
        evaluation_score: 18.5
      },
      {
        email: 'james.smith@referee.ca',
        password_hash: passwordHash,
        role: 'referee',
        name: 'James Smith',
        phone: '(403) 555-0101',
        location: 'Calgary NW',
        postal_code: 'T3A5K1',
        max_distance: 25,
        is_available: true,
        wage_per_game: 30.00,
        years_experience: 1,
        evaluation_score: 16.0
      },
      {
        email: 'sarah.johnson@referee.ca',
        password_hash: passwordHash,
        role: 'referee',
        name: 'Sarah Johnson',
        phone: '(403) 555-0102',
        location: 'Calgary SW',
        postal_code: 'T2V4K9',
        max_distance: 30,
        is_available: true,
        wage_per_game: 45.00,
        years_experience: 3,
        evaluation_score: 18.5
      }
    ];

    await knex('users').insert(demoUsers);
    console.log('✅ Demo accounts created successfully!');

    console.log('\n🎉 Demo setup complete!');
    console.log('\nDemo accounts available:');
    console.log('- admin@cmba.ca / password');
    console.log('- admin@refassign.com / password');
    console.log('- referee@test.com / password');
    console.log('- james.smith@referee.ca / password');
    console.log('- sarah.johnson@referee.ca / password');

  } catch (error) {
    console.error('Error creating demo tables:', error);
  } finally {
    await knex.destroy();
  }
}

createDemoTables();