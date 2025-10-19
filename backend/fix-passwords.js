/**
 * Fix test user passwords in database
 * Run with: node fix-passwords.js
 */

const knex = require('knex')({
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres123',
    database: 'sports_management'
  }
});

const bcrypt = require('bcryptjs');

async function fixPasswords() {
  console.log('🔐 Fixing test user passwords...\n');

  try {
    // Generate hashes
    const admin123Hash = await bcrypt.hash('admin123', 10);
    const referee123Hash = await bcrypt.hash('referee123', 10);

    console.log('Generated hashes:');
    console.log('  admin123:', admin123Hash);
    console.log('  referee123:', referee123Hash);
    console.log();

    // Update admin users
    const adminCount = await knex('users')
      .whereIn('email', [
        'admin@sportsmanager.com',
        'admin@cmba.ca',
        'assignor@cmba.ca',
        'coordinator@cmba.ca'
      ])
      .update({ password_hash: admin123Hash });

    console.log(`✓ Updated ${adminCount} admin users with password "admin123"`);

    // Update referee users
    const refereeCount = await knex('users')
      .whereIn('email', [
        'senior.ref@cmba.ca',
        'referee@test.com'
      ])
      .update({ password_hash: referee123Hash });

    console.log(`✓ Updated ${refereeCount} referee users with password "referee123"`);

    // Verify
    console.log('\nVerifying passwords...');
    const users = await knex('users')
      .select('email', 'password_hash')
      .orderBy('email');

    for (const user of users) {
      const testPassword = user.email.includes('referee@') || user.email.includes('senior.ref')
        ? 'referee123'
        : 'admin123';

      const matches = await bcrypt.compare(testPassword, user.password_hash);
      console.log(`  ${user.email}: ${matches ? '✅ VALID' : '❌ INVALID'}`);
    }

    console.log('\n✅ Password fix complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await knex.destroy();
  }
}

fixPasswords();
