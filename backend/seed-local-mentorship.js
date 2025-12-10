const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/sports_management' });

async function seed() {
  try {
    // Check if mentees table exists
    const tableCheck = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mentees')");
    if (!tableCheck.rows[0].exists) {
      console.log('Tables do not exist. Creating them...');

      // Create mentees table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS mentees (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          date_of_birth DATE,
          profile_photo_url TEXT,
          emergency_contact_name VARCHAR(255),
          emergency_contact_phone VARCHAR(50),
          street_address TEXT,
          city VARCHAR(100),
          province_state VARCHAR(100),
          postal_zip_code VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Created mentees table');

      // Create mentors table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS mentors (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          specialization TEXT,
          bio TEXT,
          years_experience INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Created mentors table');

      // Create mentorship_assignments table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS mentorship_assignments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
          mentee_id UUID NOT NULL REFERENCES mentees(id) ON DELETE CASCADE,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          start_date DATE NOT NULL,
          end_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(mentor_id, mentee_id)
        )
      `);
      console.log('Created mentorship_assignments table');

      // Create mentee_profiles table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS mentee_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          mentee_id UUID NOT NULL REFERENCES mentees(id) ON DELETE CASCADE UNIQUE,
          current_level VARCHAR(100),
          development_goals JSONB DEFAULT '[]',
          strengths JSONB DEFAULT '[]',
          areas_for_improvement JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Created mentee_profiles table');
    } else {
      console.log('Tables already exist');
    }

    // Get admin user
    const adminResult = await pool.query("SELECT id, email, first_name, last_name FROM users WHERE email = 'admin@sportsmanager.com'");
    const admin = adminResult.rows[0];
    console.log('Admin user:', admin);

    // Create admin as mentor
    const mentorResult = await pool.query(`
      INSERT INTO mentors (user_id, first_name, last_name, email, specialization, bio)
      VALUES ($1, $2, $3, $4, 'Game Management & Rules', 'Experienced mentor')
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [admin.id, admin.first_name || 'Super', admin.last_name || 'Admin', admin.email]);
    let mentorId = mentorResult.rows[0]?.id;

    if (!mentorId) {
      const existingMentor = await pool.query("SELECT id FROM mentors WHERE user_id = $1", [admin.id]);
      mentorId = existingMentor.rows[0]?.id;
    }
    console.log('Admin Mentor ID:', mentorId);

    // Create admin as mentee
    const menteeResult = await pool.query(`
      INSERT INTO mentees (user_id, first_name, last_name, email, phone)
      VALUES ($1, $2, $3, $4, '555-0100')
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [admin.id, admin.first_name || 'Super', admin.last_name || 'Admin', admin.email]);
    let menteeId = menteeResult.rows[0]?.id;

    if (!menteeId) {
      const existingMentee = await pool.query("SELECT id FROM mentees WHERE user_id = $1", [admin.id]);
      menteeId = existingMentee.rows[0]?.id;
    }
    console.log('Admin Mentee ID:', menteeId);

    // Create mentee profile
    if (menteeId) {
      await pool.query(`
        INSERT INTO mentee_profiles (mentee_id, current_level, development_goals, strengths, areas_for_improvement)
        VALUES ($1, 'Intermediate', '["Master positioning", "Game management"]', '["Quick decisions", "Fitness"]', '["Difficult situations"]')
        ON CONFLICT DO NOTHING
      `, [menteeId]);
      console.log('Created mentee profile');
    }

    // Self-assign mentor to mentee (admin mentors themselves for testing)
    if (mentorId && menteeId) {
      await pool.query(`
        INSERT INTO mentorship_assignments (mentor_id, mentee_id, status, start_date)
        VALUES ($1, $2, 'active', CURRENT_DATE - INTERVAL '30 days')
        ON CONFLICT DO NOTHING
      `, [mentorId, menteeId]);
      console.log('Created self-mentorship assignment');
    }

    console.log('\n=== Seed Complete ===');
    console.log('Admin Mentor ID:', mentorId);
    console.log('Admin Mentee ID:', menteeId);
    console.log('\nTest URLs:');
    console.log('GET /api/mentees/' + menteeId);
    console.log('GET /api/mentors/' + mentorId + '/mentees');

  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
}

seed();
