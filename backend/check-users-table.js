const knex = require('./src/config/database');

async function checkUsersTable() {
  try {
    // Get column info
    const columns = await knex.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('Users table columns:');
    columns.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });
    
    // Get a sample user to see structure
    const sampleUser = await knex('users').first();
    console.log('\nSample user (excluding sensitive data):');
    if (sampleUser) {
      const safe = { ...sampleUser };
      // Remove password-related fields for display
      Object.keys(safe).forEach(key => {
        if (key.toLowerCase().includes('pass') || key.toLowerCase().includes('hash')) {
          safe[key] = '[HIDDEN]';
        }
      });
      console.log(safe);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await knex.destroy();
  }
}

checkUsersTable();