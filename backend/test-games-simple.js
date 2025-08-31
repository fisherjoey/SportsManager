const knex = require('./src/config/database');

async function test() {
  try {
    console.log('Checking games in database...');
    const games = await knex('games').select('*').limit(5);
    console.log('Found', games.length, 'games');
    
    if (games.length > 0) {
      console.log('\nFirst game raw data:');
      console.log(games[0]);
    }
    
    // Check teams
    const teams = await knex('teams').select('*').limit(5);
    console.log('\nFound', teams.length, 'teams');
    
    // Check users
    const users = await knex('users').select('id', 'email', 'name', 'role').limit(5);
    console.log('\nFound', users.length, 'users');
    users.forEach(u => console.log('-', u.email, '(', u.role, ')'));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await knex.destroy();
  }
}

test();