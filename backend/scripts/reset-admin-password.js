const bcrypt = require('bcryptjs');
const db = require('../dist/config/database').default || require('../dist/config/database');

async function resetAdminPassword() {
  try {
    // Check if admin user exists
    const user = await db('users').where('email', 'admin@cmba.ca').first();

    if (user) {
      console.log('Found admin user:', user.email);

      // Update password to 'admin123'
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db('users')
        .where('email', 'admin@cmba.ca')
        .update({
          password_hash: hashedPassword,
          updated_at: new Date()
        });

      console.log('Password updated successfully to: admin123');
    } else {
      console.log('Admin user not found. Creating new admin user...');

      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const userId = require('crypto').randomUUID();

      await db('users').insert({
        id: userId,
        email: 'admin@cmba.ca',
        password_hash: hashedPassword,
        name: 'Admin User',
        created_at: new Date(),
        updated_at: new Date()
      });

      console.log('Admin user created with email: admin@cmba.ca and password: admin123');

      // Add Super Admin role
      const role = await db('roles').where('name', 'Super Admin').first();
      if (role) {
        await db('user_roles').insert({
          user_id: userId,
          role_id: role.id,
          created_at: new Date()
        });
        console.log('Added Super Admin role to user');
      }
    }

    console.log('\nYou can now login with:');
    console.log('Email: admin@cmba.ca');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

resetAdminPassword();