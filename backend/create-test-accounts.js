/**
 * Create test accounts for the system
 * All accounts use password: "password"
 */

const bcrypt = require('bcryptjs');
const knex = require('knex')(require('./knexfile.ts').development);

async function createTestAccounts() {
  console.log('Creating test accounts...\n');

  // Hash the password once for all accounts
  const passwordHash = await bcrypt.hash('password', 10);
  console.log('Password hashed successfully\n');

  const accounts = [
    {
      email: 'admin@test.com',
      name: 'Admin',
      first_name: 'Admin',
      last_name: 'User',
      role: 'Super Admin',
      is_admin: true
    },
    {
      email: 'admin@cmba.ca',
      name: 'CMBA Admin',
      first_name: 'CMBA',
      last_name: 'Admin',
      role: 'Admin',
      is_admin: true
    },
    {
      email: 'admin@refassign.com',
      name: 'System Admin',
      first_name: 'System',
      last_name: 'Admin',
      role: 'Admin',
      is_admin: true
    },
    {
      email: 'referee@test.com',
      name: 'Test Referee',
      first_name: 'Test',
      last_name: 'Referee',
      role: 'Referee',
      is_referee: true,
      is_available: true
    }
  ];

  try {
    for (const account of accounts) {
      // Check if account already exists
      const existing = await knex('users').where('email', account.email).first();

      if (existing) {
        console.log(`⚠️  Account already exists: ${account.email}`);
        continue;
      }

      // Insert user
      const [newUser] = await knex('users')
        .insert({
          email: account.email,
          password_hash: passwordHash,
          name: account.name,
          first_name: account.first_name,
          last_name: account.last_name,
          is_available: account.is_available || true,
          is_referee: account.is_referee || false,
          availability_status: 'active',
          profile_completion_percentage: 60,
          registration_date: knex.fn.now(),
          created_at: knex.fn.now(),
          updated_at: knex.fn.now()
        })
        .returning('*');

      console.log(`✅ Created account: ${account.email} (${account.name})`);

      // Assign role if applicable
      const role = await knex('roles').where('name', account.role).first();

      if (role) {
        await knex('user_roles').insert({
          user_id: newUser.id,
          role_id: role.id,
          assigned_at: knex.fn.now(),
          is_active: true
        });
        console.log(`   ✓ Assigned role: ${account.role}`);
      } else {
        console.log(`   ⚠️  Role not found: ${account.role}`);
      }

      console.log('');
    }

    console.log('\n🎉 Test account creation complete!');
    console.log('\n📋 Login credentials:');
    console.log('   Email: admin@test.com | Password: password');
    console.log('   Email: admin@cmba.ca | Password: password');
    console.log('   Email: admin@refassign.com | Password: password');
    console.log('   Email: referee@test.com | Password: password');

  } catch (error) {
    console.error('Error creating accounts:', error);
  } finally {
    await knex.destroy();
  }
}

createTestAccounts();
