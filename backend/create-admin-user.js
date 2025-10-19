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

async function createAdminUser() {
  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    const passwordHash = await bcrypt.hash('password', 10);

    const userId = uuidv4();

    await client.query(`
      INSERT INTO users (
        id, email, password_hash, name,
        first_name, last_name, phone,
        is_available, organization_id,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE
      SET password_hash = $3, updated_at = NOW()
    `, [
      userId,
      'admin@test.com',
      passwordHash,
      'Test Admin',
      'Test',
      'Admin',
      '403-555-0100',
      true,
      '1'
    ]);

    console.log('✅ Admin user created successfully!\n');
    console.log('='.repeat(60));
    console.log('📧 Email: admin@test.com');
    console.log('🔑 Password: password');
    console.log('='.repeat(60));
    console.log('\nYou can now login with these credentials!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createAdminUser();
