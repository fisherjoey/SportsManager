/**
 * Mentorship Seed Data
 *
 * Creates mentor and mentee roles if they don't exist,
 * then seeds sample mentorship data.
 */
exports.seed = async function(knex) {
  console.log('Seeding mentorship data...\n');

  // 1. Create mentor and mentee roles if they don't exist
  const existingMentorRole = await knex('roles').where('name', 'mentor').first();
  const existingMenteeRole = await knex('roles').where('name', 'mentee').first();

  if (!existingMentorRole) {
    await knex('roles').insert({
      name: 'mentor',
      code: 'mentor',
      description: 'Mentor role for guiding junior referees',
      is_system: false
    });
    console.log('✓ Created mentor role');
  }

  if (!existingMenteeRole) {
    await knex('roles').insert({
      name: 'mentee',
      code: 'mentee',
      description: 'Mentee role for referees in training',
      is_system: false
    });
    console.log('✓ Created mentee role');
  }

  // Get the roles (newly created or existing)
  const mentorRole = await knex('roles').where('name', 'mentor').first();
  const menteeRole = await knex('roles').where('name', 'mentee').first();

  // Get users with these roles
  const mentorUsers = mentorRole ? await knex('users')
    .join('user_roles', 'users.id', 'user_roles.user_id')
    .where('user_roles.role_id', mentorRole.id)
    .select('users.*') : [];

  const menteeUsers = menteeRole ? await knex('users')
    .join('user_roles', 'users.id', 'user_roles.user_id')
    .where('user_roles.role_id', menteeRole.id)
    .select('users.*') : [];

  // Clear existing mentorship data (in FK order)
  await knex('mentee_profiles').del();
  await knex('mentorship_assignments').del();
  await knex('mentors').del();
  await knex('mentees').del();

  // If no users with mentor/mentee roles, create sample data from existing users
  let mentorsToCreate = mentorUsers;
  let menteesToCreate = menteeUsers;

  if (mentorUsers.length === 0 || menteeUsers.length === 0) {
    // Get some existing users to use as sample mentors/mentees
    const allUsers = await knex('users').limit(10);

    if (allUsers.length >= 2) {
      // Use first 2 users as mentors, rest as mentees
      mentorsToCreate = allUsers.slice(0, 2);
      menteesToCreate = allUsers.slice(2, 6);
      console.log('ℹ Using existing users as sample mentors/mentees');
    }
  }

  // Create mentors
  const mentorRecords = mentorsToCreate.map(user => ({
    user_id: user.id,
    first_name: user.first_name || 'Mentor',
    last_name: user.last_name || 'User',
    email: user.email,
    specialization: 'Game officiating',
    bio: 'Experienced referee and mentor'
  }));

  const insertedMentors = mentorRecords.length > 0
    ? await knex('mentors').insert(mentorRecords).returning('*')
    : [];

  // Create mentees
  const menteeRecords = menteesToCreate.map(user => ({
    user_id: user.id,
    first_name: user.first_name || 'Mentee',
    last_name: user.last_name || 'User',
    email: user.email
  }));

  const insertedMentees = menteeRecords.length > 0
    ? await knex('mentees').insert(menteeRecords).returning('*')
    : [];

  // Create mentee profiles
  const profileRecords = insertedMentees.map(mentee => ({
    mentee_id: mentee.id,
    current_level: 'Recreational',
    development_goals: JSON.stringify(['Improve game management', 'Learn positioning']),
    strengths: JSON.stringify(['Communication', 'Punctuality']),
    areas_for_improvement: JSON.stringify(['Rule knowledge', 'Confidence'])
  }));

  if (profileRecords.length > 0) {
    await knex('mentee_profiles').insert(profileRecords);
  }

  // Create mentorship assignments (pair each mentee with a mentor)
  const assignments = insertedMentees.map((mentee, index) => {
    const mentor = insertedMentors[index % insertedMentors.length];
    return mentor ? {
      mentor_id: mentor.id,
      mentee_id: mentee.id,
      status: 'active',
      start_date: new Date().toISOString().split('T')[0]
    } : null;
  }).filter(Boolean);

  if (assignments.length > 0) {
    await knex('mentorship_assignments').insert(assignments);
  }

  console.log(`✓ Created ${insertedMentors.length} mentors`);
  console.log(`✓ Created ${insertedMentees.length} mentees with profiles`);
  console.log(`✓ Created ${assignments.length} mentorship assignments`);
};
