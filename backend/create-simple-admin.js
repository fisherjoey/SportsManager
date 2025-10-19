/**
 * Create a simple admin account for testing
 * Email: admin@test.com
 * Password: password123
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'sports_management',
  user: 'postgres',
  password: 'postgres123'
});

async function createAdmin() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    // Hash password
    const passwordHash = await bcrypt.hash('password123', 10);
    console.log('Password hashed\n');

    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('❌ Users table does not exist. Migrations need to run first.');
      process.exit(1);
    }

    // Create admin user
    const userId = uuidv4();
    const orgId = uuidv4();

    // First try to create organization if it doesn't exist
    try {
      await client.query(`
        INSERT INTO organizations (id, name, slug, settings, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [orgId, 'Test Organization', 'test-org', JSON.stringify({})]);
      console.log('✓ Organization created or already exists\n');
    } catch (err) {
      console.log('⚠️  Organization table may not exist, continuing...\n');
    }

    // Create admin user
    await client.query(`
      INSERT INTO users (
        id, email, password_hash, name, role,
        is_active, is_available,
        organization_id,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE
      SET password_hash = $2, updated_at = NOW()
    `, [
      userId,
      'admin@test.com',
      passwordHash,
      'Admin User',
      'admin',
      true,
      true,
      orgId
    ]);

    console.log('✅ Admin user created successfully!\n');
    console.log('='.repeat(50));
    console.log('📧 Email: admin@test.com');
    console.log('🔑 Password: password123');
    console.log('='.repeat(50));

    // Try to assign Super Admin role if roles table exists
    try {
      const roleResult = await client.query(`
        SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1
      `);

      if (roleResult.rows.length > 0) {
        const roleId = roleResult.rows[0].id;
        await client.query(`
          INSERT INTO user_roles (id, user_id, role_id, assigned_at, is_active)
          VALUES ($1, $2, $3, NOW(), true)
          ON CONFLICT DO NOTHING
        `, [uuidv4(), userId, roleId]);
        console.log('\n✓ Super Admin role assigned');
      }
    } catch (err) {
      console.log('\n⚠️  Could not assign role (tables may not exist)');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createAdmin();
