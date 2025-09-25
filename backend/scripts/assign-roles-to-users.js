#!/usr/bin/env node

/**
 * Script to assign roles to existing users
 *
 * This will assign appropriate roles based on user email patterns
 * or create test users with each role for demonstration
 */

const knex = require('knex');
const bcrypt = require('bcrypt');
const config = require('../knexfile');

const db = knex(config.development || config);

async function assignRolesToUsers() {
  try {
    console.log('🚀 Assigning roles to users...\n');

    // Get all roles
    const roles = await db('roles').select('id', 'name', 'description');
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.name] = role.id;
    });

    console.log('Available roles:');
    roles.forEach(r => console.log(`  - ${r.name}`));
    console.log('');

    // Get existing users
    const users = await db('users')
      .select('id', 'email', 'name')
      .orderBy('email');

    console.log(`Found ${users.length} existing users\n`);

    // Check for test/admin users
    let adminUser = users.find(u =>
      u.email.includes('admin') ||
      u.email === 'john.doe@example.com'
    );

    // If no admin user exists, create one
    if (!adminUser) {
      console.log('Creating admin user...');
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      const [newAdmin] = await db('users').insert({
        email: 'admin@sportsmanager.com',
        password_hash: hashedPassword,
        name: 'System Administrator',
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');
      adminUser = newAdmin;
      console.log('✅ Created admin@sportsmanager.com');
    }

    // Assign Super Admin role to admin user
    const existingAdminRole = await db('user_roles')
      .where('user_id', adminUser.id)
      .first();

    if (!existingAdminRole) {
      await db('user_roles').insert({
        user_id: adminUser.id,
        role_id: roleMap['Super Admin'],
        assigned_at: new Date()
      });
      console.log(`✅ Assigned Super Admin role to ${adminUser.email}`);
    } else {
      console.log(`⏭️  ${adminUser.email} already has a role`);
    }

    // Create test users for each role if they don't exist
    const testUsers = [
      {
        email: 'admin2@sportsmanager.com',
        name: 'Regular Admin',
        role: 'Admin',
        password: 'Admin123!'
      },
      {
        email: 'coordinator@sportsmanager.com',
        name: 'Referee Coordinator',
        role: 'Referee Coordinator',
        password: 'Coord123!'
      },
      {
        email: 'assignor@sportsmanager.com',
        name: 'Game Assignor',
        role: 'Assignment Manager',
        password: 'Assign123!'
      },
      {
        email: 'senior.ref@sportsmanager.com',
        name: 'Senior Referee',
        role: 'Senior Referee',
        password: 'Senior123!'
      },
      {
        email: 'referee@sportsmanager.com',
        name: 'John Referee',
        role: 'Referee',
        password: 'Referee123!'
      }
    ];

    console.log('\nCreating test users for each role...');

    for (const testUser of testUsers) {
      // Check if user exists
      let user = await db('users')
        .where('email', testUser.email)
        .first();

      if (!user) {
        // Create user
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        [user] = await db('users').insert({
          email: testUser.email,
          password_hash: hashedPassword,
          name: testUser.name,
          created_at: new Date(),
          updated_at: new Date()
        }).returning('*');
        console.log(`✅ Created user: ${testUser.email}`);
      }

      // Check if role is already assigned
      const existingRole = await db('user_roles')
        .where('user_id', user.id)
        .first();

      if (!existingRole && roleMap[testUser.role]) {
        // Assign role
        await db('user_roles').insert({
          user_id: user.id,
          role_id: roleMap[testUser.role],
          assigned_at: new Date()
        });
        console.log(`   └─ Assigned ${testUser.role} role`);
      } else if (existingRole) {
        console.log(`   └─ Already has a role assigned`);
      }
    }

    // Display summary
    console.log('\n📊 Summary of users with roles:');
    console.log('─'.repeat(50));

    const userRoles = await db('user_roles')
      .select(
        'users.email',
        'users.name',
        'roles.name as role_name'
      )
      .join('users', 'user_roles.user_id', 'users.id')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .orderBy('roles.name');

    let currentRole = '';
    userRoles.forEach(ur => {
      if (ur.role_name !== currentRole) {
        currentRole = ur.role_name;
        console.log(`\n${currentRole}:`);
      }
      console.log(`  • ${ur.email} (${ur.name})`);
    });

    console.log('\n✅ Role assignment complete!');
    console.log('\nTest account credentials:');
    console.log('─'.repeat(50));
    console.log('Super Admin: admin@sportsmanager.com / Admin123!');
    testUsers.forEach(u => {
      console.log(`${u.role}: ${u.email} / ${u.password}`);
    });

    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await db.destroy();
    process.exit(1);
  }
}

assignRolesToUsers();