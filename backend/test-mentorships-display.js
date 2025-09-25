require('dotenv').config();
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    database: process.env.DB_NAME || 'sports_manager'
  }
});

async function checkMentorships() {
  try {
    const mentorships = await db('mentorships')
      .select('*')
      .limit(5);

    console.log(`Found ${mentorships.length} mentorships`);
    if (mentorships.length > 0) {
      console.log('\nFirst mentorship:');
      console.log(JSON.stringify(mentorships[0], null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkMentorships();