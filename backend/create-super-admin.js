/**
 * Quick script to create a Super Admin user
 */

const knex = require('knex')(require('./knexfile').development);
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function createSuperAdmin() {
  try {
    console.log('Creating Super Admin user...\n');

    // Check if users table exists
    const hasUsersTable = await knex.schema.hasTable('users');
    if (!hasUsersTable) {
      console.error('❌ Users table does not exist. Run migrations first: npx knex migrate:latest');
      process.exit(1);
    }

    // Check if roles table exists
    const hasRolesTable = await knex.schema.hasTable('roles');
    if (!hasRolesTable) {
      console.error('❌ Roles table does not exist. Run migrations first: npx knex migrate:latest');
      process.exit(1);
    }

    // Check if user_roles table exists
    const hasUserRolesTable = await knex.schema.hasTable('user_roles');
    if (!hasUserRolesTable) {
      console.error('❌ User_roles table does not exist. Run migrations first: npx knex migrate:latest');
      process.exit(1);
    }

    // Hash password
    const password = await bcrypt.hash('admin123', 10);

    // Create or get Super Admin role
    let superAdminRole = await knex('roles').where({ code: 'super_admin' }).first();

    if (!superAdminRole) {
      console.log('Creating Super Admin role...');
      [superAdminRole] = await knex('roles')
        .insert({
          id: uuidv4(),
          name: 'Super Admin',
          code: 'super_admin',
          description: 'Full system access with all permissions',
          is_active: true,
          is_system: true,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');
      console.log('✓ Super Admin role created');
    } else {
      console.log('✓ Super Admin role already exists');
    }

    // Check if admin user exists
    const existingAdmin = await knex('users').where({ email: 'admin@sportsmanager.com' }).first();

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:', existingAdmin.email);

      // Check if they have super admin role
      const hasRole = await knex('user_roles')
        .where({ user_id: existingAdmin.id, role_id: superAdminRole.id })
        .first();

      if (!hasRole) {
        await knex('user_roles').insert({
          id: uuidv4(),
          user_id: existingAdmin.id,
          role_id: superAdminRole.id,
          assigned_at: new Date(),
          is_active: true
        });
        console.log('✓ Assigned Super Admin role to existing user');
      }

      console.log('\n✅ Super Admin user ready!');
      console.log('   Email: admin@sportsmanager.com');
      console.log('   Password: admin123');
      process.exit(0);
    }

    // Create Super Admin user
    const [adminUser] = await knex('users')
      .insert({
        id: uuidv4(),
        email: 'admin@sportsmanager.com',
        password_hash: password,
        name: 'Super Admin',
        first_name: 'Super',
        last_name: 'Admin',
        is_available: true,
        availability_status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    console.log('✓ Super Admin user created');

    // Assign Super Admin role
    await knex('user_roles').insert({
      id: uuidv4(),
      user_id: adminUser.id,
      role_id: superAdminRole.id,
      assigned_at: new Date(),
      is_active: true
    });

    console.log('✓ Super Admin role assigned');

    console.log('\n✅ Super Admin created successfully!');
    console.log('   Email: admin@sportsmanager.com');
    console.log('   Password: admin123');
    console.log('\nYou can now log in with these credentials.');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating Super Admin:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createSuperAdmin();
