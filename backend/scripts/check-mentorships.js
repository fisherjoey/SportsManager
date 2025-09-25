/**
 * Check Mentorships in Database
 */

const db = require('../src/config/database').default;

async function checkMentorships() {
  try {
    // Count total mentorships
    const totalCount = await db('mentorships').count('* as total');
    console.log('Total mentorships in database:', totalCount[0].total);

    // Get all mentorships with details
    const mentorships = await db('mentorships')
      .select('*')
      .orderBy('created_at', 'desc');

    console.log('\nMentorship Details:');
    console.log('==================');

    for (const mentorship of mentorships) {
      console.log(`\nID: ${mentorship.id}`);
      console.log(`Mentor ID: ${mentorship.mentor_id}`);
      console.log(`Mentee ID: ${mentorship.mentee_id}`);
      console.log(`Status: ${mentorship.status}`);
      console.log(`Start Date: ${mentorship.start_date}`);
      console.log(`End Date: ${mentorship.end_date || 'N/A'}`);
      console.log(`Created: ${mentorship.created_at}`);
      console.log(`Updated: ${mentorship.updated_at}`);

      // Try to get mentor and mentee names
      try {
        const mentor = await db('users').where('id', mentorship.mentor_id).first();
        const mentee = await db('users').where('id', mentorship.mentee_id).first();

        console.log(`Mentor Name: ${mentor ? mentor.name : 'Not found'}`);
        console.log(`Mentee Name: ${mentee ? mentee.name : 'Not found'}`);
      } catch (e) {
        console.log('Could not fetch user names');
      }
    }

    // Check for any issues
    console.log('\n\nData Integrity Checks:');
    console.log('======================');

    // Check for mentorships with non-existent users
    const mentorshipsWithMissingUsers = await db('mentorships as m')
      .leftJoin('users as mentor', 'm.mentor_id', 'mentor.id')
      .leftJoin('users as mentee', 'm.mentee_id', 'mentee.id')
      .where(function() {
        this.whereNull('mentor.id').orWhereNull('mentee.id');
      })
      .select('m.*');

    if (mentorshipsWithMissingUsers.length > 0) {
      console.log(`⚠️  Found ${mentorshipsWithMissingUsers.length} mentorships with missing users:`);
      for (const m of mentorshipsWithMissingUsers) {
        console.log(`  - ID: ${m.id}, Mentor: ${m.mentor_id}, Mentee: ${m.mentee_id}`);
      }
    } else {
      console.log('✅ All mentorships have valid user references');
    }

    // Check for duplicate mentorships
    const duplicates = await db('mentorships')
      .select('mentor_id', 'mentee_id')
      .groupBy('mentor_id', 'mentee_id')
      .havingRaw('COUNT(*) > 1');

    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} duplicate mentor-mentee pairs`);
    } else {
      console.log('✅ No duplicate mentorships found');
    }

    // Status breakdown
    const statusBreakdown = await db('mentorships')
      .select('status')
      .count('* as count')
      .groupBy('status');

    console.log('\nStatus Breakdown:');
    for (const status of statusBreakdown) {
      console.log(`  ${status.status}: ${status.count}`);
    }

  } catch (error) {
    console.error('Error checking mentorships:', error);
  } finally {
    await db.destroy();
  }
}

checkMentorships();