/**
 * Assign Super Admin role to admin@test.com user
 */

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'sports_management',
  user: 'postgres',
  password: 'postgres123'
});

async function assignAdminRole() {
  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Get the admin@test.com user
    const userResult = await client.query(
      `SELECT id, email, name FROM users WHERE email = $1`,
      ['admin@test.com']
    );

    if (userResult.rows.length === 0) {
      console.error('❌ User admin@test.com not found');
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`Found user: ${user.name} (${user.email})`);

    // Get or create the Super Admin role
    let roleResult = await client.query(
      `SELECT id, name, code FROM roles WHERE name = $1`,
      ['Super Admin']
    );

    let role;
    if (roleResult.rows.length === 0) {
      console.log('\nCreating Super Admin role...');

      roleResult = await client.query(`
        INSERT INTO roles (
          id, name, code, description,
          is_active, is_system, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id, name, code
      `, [
        uuidv4(),
        'Super Admin',
        'super_admin',
        'Full system administrator with unrestricted access',
        true,
        true
      ]);

      role = roleResult.rows[0];
      console.log(`✓ Created role: ${role.name} (${role.code})`);
    } else {
      role = roleResult.rows[0];
      console.log(`✓ Found existing role: ${role.name} (${role.code})`);
    }

    // Check if user already has this role
    const existingAssignment = await client.query(`
      SELECT id FROM user_roles
      WHERE user_id = $1 AND role_id = $2
    `, [user.id, role.id]);

    if (existingAssignment.rows.length > 0) {
      console.log('\n⚠️  User already has Super Admin role assigned');
    } else {
      // Assign role to user
      await client.query(`
        INSERT INTO user_roles (
          id, user_id, role_id, assigned_at, is_active
        )
        VALUES ($1, $2, $3, NOW(), true)
      `, [uuidv4(), user.id, role.id]);

      console.log('\n✅ Successfully assigned Super Admin role to user!');
    }

    console.log('\n' + '='.repeat(60));
    console.log('User Details:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${role.name} (${role.code})`);
    console.log('='.repeat(60));
    console.log('\n✨ The user can now login with full admin permissions!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

assignAdminRole();
