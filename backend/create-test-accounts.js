const knex = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function createTestAccounts() {
  try {
    console.log('🔧 Creating test accounts for login...\n');

    const saltRounds = 12;
    const defaultPassword = 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    // Create CMBA Admin account
    const existingCmbaAdmin = await knex('users').where('email', 'admin@cmba.ca').first();
    
    if (existingCmbaAdmin) {
      console.log('✅ CMBA Admin account already exists');
    } else {
      const [cmbaAdminUser] = await knex('users').insert({
        email: 'admin@cmba.ca',
        password_hash: passwordHash,
        role: 'admin',
        name: 'CMBA Administrator',
        is_available: true,
        max_distance: 25
      }).returning('*');

      console.log('✅ CMBA Admin account created successfully!');
      console.log('   📧 Email: admin@cmba.ca');
      console.log('   🔑 Password: password123');
      console.log('   👤 Role: admin');
    }

    // Create a test referee account for testing
    const existingTestReferee = await knex('users').where('email', 'referee@test.ca').first();
    
    if (existingTestReferee) {
      console.log('✅ Test referee account already exists');
    } else {
      // Get referee level for proper setup
      const juniorLevel = await knex('referee_levels').where('name', 'Junior').first();
      
      const [testRefereeUser] = await knex('users').insert({
        email: 'referee@test.ca',
        password_hash: passwordHash,
        role: 'referee',
        name: 'Test Referee',
        phone: '(403) 555-0123',
        location: 'Calgary, AB',
        postal_code: 'T2P 1H9',
        max_distance: 30,
        is_available: true,
        wage_per_game: 45.00,
        referee_level_id: juniorLevel?.id,
        roles: ['Referee'],
        is_white_whistle: false,
        years_experience: 3,
        notes: 'Test referee account for system testing'
      }).returning('*');

      console.log('✅ Test referee account created successfully!');
      console.log('   📧 Email: referee@test.ca');
      console.log('   🔑 Password: password123');
      console.log('   👤 Role: referee');
    }

    console.log('\n🎉 Account creation complete!');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('====================');
    console.log('🔧 ADMIN ACCESS:');
    console.log('   Email: admin@cmba.ca');
    console.log('   Password: password123');
    console.log('   Role: Administrator (full access)');
    console.log('');
    console.log('👨‍💼 REFEREE ACCESS:');
    console.log('   Email: referee@test.ca');
    console.log('   Password: password123');
    console.log('   Role: Referee (limited access)');
    console.log('');
    console.log('🌐 LOGIN URL: http://localhost:3000/login');
    console.log('');
    console.log('💡 You can also use any of the existing referee accounts:');
    console.log('   • mike.johnson@cmba.ca (password: password)');
    console.log('   • sarah.connor@cmba.ca (password: password)');
    console.log('   • All other @cmba.ca referee emails (password: password)');

  } catch (error) {
    console.error('❌ Error creating accounts:', error);
  } finally {
    await knex.destroy();
  }
}

createTestAccounts();