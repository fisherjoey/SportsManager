/**
 * Create the demo users that the frontend expects
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/sports_management'
});

async function createDemoUsers() {
  try {
    console.log('Creating demo users...');

    // Demo users from the login form
    const demoUsers = [
      {
        email: 'admin@cmba.ca',
        password: 'password',
        name: 'CMBA Admin'
      },
      {
        email: 'admin@refassign.com',
        password: 'password',
        name: 'System Admin'
      },
      {
        email: 'referee@test.com',
        password: 'password',
        name: 'Test Referee'
      }
    ];

    for (const userData of demoUsers) {
      // Check if user already exists
      const existingUser = await db('users')
        .where('email', userData.email)
        .first();

      if (existingUser) {
        console.log(`User ${userData.email} already exists, updating password...`);

        // Update password to match what frontend expects
        const passwordHash = await bcrypt.hash(userData.password, 10);
        await db('users')
          .where('email', userData.email)
          .update({
            password_hash: passwordHash,
            name: userData.name
          });

        console.log(`✅ Updated: ${userData.email}`);
      } else {
        // Create new user
        const passwordHash = await bcrypt.hash(userData.password, 10);

        const [user] = await db('users')
          .insert({
            email: userData.email,
            password_hash: passwordHash,
            name: userData.name
          })
          .returning('*');

        console.log(`✅ Created: ${userData.email}`);
      }
    }

    console.log('\n✅ Demo users ready!');
    console.log('\nYou can now login with:');
    console.log('  Email: admin@cmba.ca      Password: password');
    console.log('  Email: admin@refassign.com Password: password');
    console.log('  Email: referee@test.com   Password: password');

  } catch (error) {
    console.error('Error creating demo users:', error.message);
  } finally {
    await db.destroy();
  }
}

createDemoUsers();