/**
 * Check Mentorships in Database
 */

require('dotenv').config();

const knex = require('knex')({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'sports_management'
  }
});

async function checkMentorships() {
  try {
    // Count total mentorships
    const totalCount = await knex('mentorships').count('* as total');
    console.log('Total mentorships in database:', totalCount[0].total);

    // Get all mentorships with details
    const mentorships = await knex('mentorships')
      .select('*')
      .orderBy('created_at', 'desc');

    console.log('\nFound', mentorships.length, 'mentorship records\n');

    if (mentorships.length > 0) {
      console.log('Mentorship Details:');
      console.log('==================');

      for (const mentorship of mentorships) {
        console.log(`\nID: ${mentorship.id}`);
        console.log(`Mentor ID: ${mentorship.mentor_id}`);
        console.log(`Mentee ID: ${mentorship.mentee_id}`);
        console.log(`Status: ${mentorship.status}`);
        console.log(`Start Date: ${mentorship.start_date}`);
        console.log(`End Date: ${mentorship.end_date || 'N/A'}`);
        console.log(`Created: ${mentorship.created_at}`);

        // Try to get mentor and mentee names
        try {
          const mentor = await knex('users').where('id', mentorship.mentor_id).first();
          const mentee = await knex('users').where('id', mentorship.mentee_id).first();

          console.log(`Mentor: ${mentor ? `${mentor.name} (${mentor.email})` : 'User not found!'}`);
          console.log(`Mentee: ${mentee ? `${mentee.name} (${mentee.email})` : 'User not found!'}`);
        } catch (e) {
          console.log('Could not fetch user names');
        }
        console.log('---');
      }

      // Status breakdown
      console.log('\nStatus Breakdown:');
      console.log('=================');
      const statusBreakdown = await knex('mentorships')
        .select('status')
        .count('* as count')
        .groupBy('status');

      for (const status of statusBreakdown) {
        console.log(`  ${status.status}: ${status.count} mentorship(s)`);
      }

      // Check for data issues
      console.log('\nData Integrity Checks:');
      console.log('======================');

      // Check for mentorships with non-existent users
      const orphanedMentorships = await knex.raw(`
        SELECT m.*
        FROM mentorships m
        LEFT JOIN users mentor ON m.mentor_id = mentor.id
        LEFT JOIN users mentee ON m.mentee_id = mentee.id
        WHERE mentor.id IS NULL OR mentee.id IS NULL
      `);

      if (orphanedMentorships.rows && orphanedMentorships.rows.length > 0) {
        console.log(`⚠️  Found ${orphanedMentorships.rows.length} mentorships with missing users!`);
        for (const m of orphanedMentorships.rows) {
          console.log(`  - ID: ${m.id}`);
        }
      } else {
        console.log('✅ All mentorships have valid user references');
      }

      // Check for duplicate mentorships
      const duplicates = await knex('mentorships')
        .select('mentor_id', 'mentee_id')
        .count('* as count')
        .groupBy('mentor_id', 'mentee_id')
        .having(knex.raw('count(*) > 1'));

      if (duplicates.length > 0) {
        console.log(`⚠️  Found ${duplicates.length} duplicate mentor-mentee pairs:`);
        for (const dup of duplicates) {
          console.log(`  - Mentor: ${dup.mentor_id}, Mentee: ${dup.mentee_id} (${dup.count} times)`);
        }
      } else {
        console.log('✅ No duplicate mentorships found');
      }

      // Check recent activity
      const recentMentorships = await knex('mentorships')
        .where('created_at', '>', knex.raw("NOW() - INTERVAL '30 days'"))
        .count('* as count');

      console.log(`\n📊 ${recentMentorships[0].count} mentorships created in the last 30 days`);

      // Check active mentorships
      const activeMentorships = await knex('mentorships')
        .where('status', 'active')
        .count('* as count');

      console.log(`📊 ${activeMentorships[0].count} currently active mentorships`);

    } else {
      console.log('No mentorships found in the database.');
    }

  } catch (error) {
    console.error('Error checking mentorships:', error.message);
    console.error('Full error:', error);
  } finally {
    await knex.destroy();
  }
}

checkMentorships();