/**
 * Quick script to create a test user for development
 * Run with: node scripts/create-test-user.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const knex = require('knex');

// Create database connection
const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/sports_management'
});

async function createTestUser() {
  try {
    console.log('Creating test user...');

    // Check if users table exists
    const hasUsersTable = await db.schema.hasTable('users');
    if (!hasUsersTable) {
      console.log('Creating users table...');
      await db.schema.createTable('users', table => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.string('email').unique().notNullable();
        table.string('password_hash').notNullable();
        table.string('name');
        table.string('phone');
        table.string('location');
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
      });
    }

    // Check if roles table exists
    const hasRolesTable = await db.schema.hasTable('roles');
    if (!hasRolesTable) {
      console.log('Creating roles table...');
      await db.schema.createTable('roles', table => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.string('name').unique().notNullable();
        table.jsonb('permissions').defaultTo('[]');
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
      });

      // Create basic roles
      await db('roles').insert([
        { name: 'admin', permissions: JSON.stringify(['*']) },
        { name: 'assignor', permissions: JSON.stringify(['games.manage', 'referees.assign']) },
        { name: 'referee', permissions: JSON.stringify(['games.view', 'profile.edit']) },
        { name: 'user', permissions: JSON.stringify(['profile.view']) }
      ]);
    }

    // Check if user_roles table exists
    const hasUserRolesTable = await db.schema.hasTable('user_roles');
    if (!hasUserRolesTable) {
      console.log('Creating user_roles table...');
      await db.schema.createTable('user_roles', table => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE');
        table.unique(['user_id', 'role_id']);
        table.timestamps(true, true);
      });
    }

    // Create test users
    const testUsers = [
      {
        email: 'admin@test.com',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin'
      },
      {
        email: 'assignor@test.com',
        password: 'assignor123',
        name: 'Assignor User',
        role: 'assignor'
      },
      {
        email: 'referee@test.com',
        password: 'referee123',
        name: 'Referee User',
        role: 'referee'
      },
      {
        email: 'test@test.com',
        password: 'test123',
        name: 'Test User',
        role: 'user'
      }
    ];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await db('users')
        .where('email', userData.email)
        .first();

      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 10);

      // Create user (using minimal fields that likely exist)
      const [user] = await db('users')
        .insert({
          email: userData.email,
          password_hash: passwordHash,
          role: userData.role  // Old schema might have role column
        })
        .returning('*');

      console.log(`Created user: ${userData.email} with password: ${userData.password}`);

      // Get role
      const role = await db('roles')
        .where('name', userData.role)
        .first();

      if (role) {
        // Assign role to user
        await db('user_roles').insert({
          user_id: user.id,
          role_id: role.id
        });
        console.log(`  Assigned role: ${userData.role}`);
      }
    }

    console.log('\n✅ Test users created successfully!');
    console.log('\nYou can now login with:');
    console.log('  Email: admin@test.com    Password: admin123    (Admin)');
    console.log('  Email: assignor@test.com Password: assignor123 (Assignor)');
    console.log('  Email: referee@test.com  Password: referee123  (Referee)');
    console.log('  Email: test@test.com     Password: test123     (Basic User)');

  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await db.destroy();
  }
}

createTestUser();