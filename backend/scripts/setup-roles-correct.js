/**
 * Set up roles correctly based on actual database schema
 */

require('dotenv').config();
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/sports_management'
});

async function setupRoles() {
  try {
    console.log('Setting up roles based on actual database schema...\n');

    // Create roles if they don't exist
    const rolesData = [
      {
        name: 'super_admin',
        description: 'Super Administrator with all permissions',
        is_active: true,
        is_system: true
      },
      {
        name: 'admin',
        description: 'Administrator with most permissions',
        is_active: true,
        is_system: true
      },
      {
        name: 'assignor',
        description: 'Can assign referees to games',
        is_active: true,
        is_system: false
      },
      {
        name: 'referee',
        description: 'Referee who can view and manage their assignments',
        is_active: true,
        is_system: false
      },
      {
        name: 'user',
        description: 'Basic user with limited permissions',
        is_active: true,
        is_system: false
      }
    ];

    // Check if roles table exists
    const hasRolesTable = await db.schema.hasTable('roles');
    if (!hasRolesTable) {
      console.log('Creating roles table...');
      await db.schema.createTable('roles', table => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.string('name').unique().notNullable();
        table.text('description');
        table.boolean('is_active').defaultTo(true);
        table.boolean('is_system').defaultTo(false);
        table.timestamps(true, true);
      });
    }

    // Check if user_roles table exists
    const hasUserRolesTable = await db.schema.hasTable('user_roles');
    if (!hasUserRolesTable) {
      console.log('Creating user_roles table...');
      await db.schema.createTable('user_roles', table => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE');
        table.timestamp('assigned_at').defaultTo(db.fn.now());
        table.uuid('assigned_by');
        table.timestamp('expires_at');
        table.boolean('is_active').defaultTo(true);
        table.unique(['user_id', 'role_id']);
        table.timestamps(true, true);
      });
    }

    // Create or update roles
    console.log('Creating/updating roles...');
    for (const roleData of rolesData) {
      const existingRole = await db('roles').where('name', roleData.name).first();

      if (existingRole) {
        await db('roles')
          .where('id', existingRole.id)
          .update({
            description: roleData.description,
            is_active: true,
            is_system: roleData.is_system
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
        // Update to ensure it's active
        await db('user_roles')
          .where('id', existingAssignment.id)
          .update({ is_active: true });
        console.log(`✅ ${assignment.email} already has role: ${assignment.role} (activated)`);
      } else {
        // Create assignment
        await db('user_roles').insert({
          user_id: user.id,
          role_id: role.id,
          is_active: true
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
      .where('user_roles.is_active', true)
      .orWhereNull('user_roles.is_active')
      .orderBy('users.email');

    console.log('User Accounts with Roles:');
    console.log('─'.repeat(60));

    for (const user of users) {
      console.log(`  ${user.email.padEnd(30)} → ${user.role || 'NO ROLE'}`);
    }

    console.log('\n✅ Setup complete! You can now login with:');
    console.log('   admin@test.com     - password: admin123  (Super Admin)');
    console.log('   admin@cmba.ca      - password: password  (Super Admin)');
    console.log('   admin@refassign.com - password: password  (Admin)');
    console.log('   referee@test.com   - password: password  (Referee)');

  } catch (error) {
    console.error('❌ Error setting up roles:', error.message);
    console.error(error);
  } finally {
    await db.destroy();
  }
}

setupRoles();