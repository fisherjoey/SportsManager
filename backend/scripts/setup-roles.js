/**
 * Set up roles and assign them to users
 */

require('dotenv').config();
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/sports_management'
});

async function setupRoles() {
  try {
    console.log('Setting up roles and permissions...\n');

    // First, check if roles table exists
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
    }

    // Create user_roles table if it doesn't exist
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

    // Define roles with their permissions
    const rolesData = [
      {
        name: 'super_admin',
        permissions: JSON.stringify(['*']) // All permissions
      },
      {
        name: 'admin',
        permissions: JSON.stringify(['*']) // All permissions
      },
      {
        name: 'assignor',
        permissions: JSON.stringify([
          'games.view',
          'games.create',
          'games.update',
          'games.delete',
          'referees.view',
          'referees.assign',
          'assignments.manage'
        ])
      },
      {
        name: 'referee',
        permissions: JSON.stringify([
          'games.view',
          'assignments.view',
          'assignments.accept',
          'assignments.decline',
          'profile.view',
          'profile.edit'
        ])
      },
      {
        name: 'user',
        permissions: JSON.stringify([
          'profile.view',
          'profile.edit'
        ])
      }
    ];

    // Create or update roles
    for (const roleData of rolesData) {
      const existingRole = await db('roles').where('name', roleData.name).first();

      if (existingRole) {
        await db('roles')
          .where('id', existingRole.id)
          .update({
            permissions: roleData.permissions,
            is_active: true
          });
        console.log(`✅ Updated role: ${roleData.name}`);
      } else {
        await db('roles').insert(roleData);
        console.log(`✅ Created role: ${roleData.name}`);
      }
    }

    // Now assign roles to users
    console.log('\nAssigning roles to users...\n');

    const userRoleAssignments = [
      { email: 'admin@test.com', role: 'super_admin' },
      { email: 'admin@cmba.ca', role: 'super_admin' },
      { email: 'admin@refassign.com', role: 'admin' },
      { email: 'referee@test.com', role: 'referee' },
      { email: 'assignor@test.com', role: 'assignor' },
      { email: 'test@test.com', role: 'user' }
    ];

    for (const assignment of userRoleAssignments) {
      // Get user
      const user = await db('users').where('email', assignment.email).first();
      if (!user) {
        console.log(`⚠️  User ${assignment.email} not found, skipping...`);
        continue;
      }

      // Get role
      const role = await db('roles').where('name', assignment.role).first();
      if (!role) {
        console.log(`⚠️  Role ${assignment.role} not found, skipping...`);
        continue;
      }

      // Check if assignment already exists
      const existingAssignment = await db('user_roles')
        .where('user_id', user.id)
        .where('role_id', role.id)
        .first();

      if (existingAssignment) {
        console.log(`✅ ${assignment.email} already has role: ${assignment.role}`);
      } else {
        // Create assignment
        await db('user_roles').insert({
          user_id: user.id,
          role_id: role.id
        });
        console.log(`✅ Assigned role '${assignment.role}' to ${assignment.email}`);
      }
    }

    // Display summary
    console.log('\n📊 Summary:\n');

    const users = await db('users')
      .leftJoin('user_roles', 'users.id', 'user_roles.user_id')
      .leftJoin('roles', 'user_roles.role_id', 'roles.id')
      .select('users.email', 'users.name', 'roles.name as role')
      .orderBy('users.email');

    console.log('User Accounts with Roles:');
    console.log('─'.repeat(60));

    for (const user of users) {
      console.log(`  ${user.email.padEnd(30)} → ${user.role || 'NO ROLE'}`);
    }

    console.log('\n✅ Setup complete! You can now login with any of these accounts.');
    console.log('   Default password for all: "password" (except admin@test.com uses "admin123")');

  } catch (error) {
    console.error('❌ Error setting up roles:', error.message);
    console.error(error);
  } finally {
    await db.destroy();
  }
}

setupRoles();