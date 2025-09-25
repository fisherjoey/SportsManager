const knex = require('./dist/config/database').default;

async function checkAdmin() {
  try {
    const admin = await knex('users')
      .where('email', 'admin@cmba.ca')
      .select('*')
      .first();

    if (admin) {
      console.log('Admin user found:', admin);
    } else {
      console.log('Admin user NOT found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await knex.destroy();
  }
}

checkAdmin();