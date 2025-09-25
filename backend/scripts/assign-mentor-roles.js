const knex = require('knex');

async function assignMentorRoles() {
  const db = knex({
    client: 'pg',
    connection: {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres123',
      database: 'sports_management'
    }
  });

  try {
    console.log('Assigning Mentor and Mentorship Coordinator roles to eligible users...\n');

    // Get the roles we need
    const mentorRole = await db('roles').where('name', 'Mentor').first();
    const coordinatorRole = await db('roles').where('name', 'Mentorship Coordinator').first();
    const superAdminRole = await db('roles').where('name', 'Super Admin').first();

    if (!mentorRole) {
      console.log('Mentor role not found. Please run create-mentor-permissions.js first.');
      return;
    }

    // Get users with specific roles that should be able to mentor
    const seniorRoles = ['Senior Referee', 'Head Referee', 'Referee Coach', 'Super Admin'];

    const eligibleMentorUsers = await db('users')
      .join('user_roles', 'users.id', 'user_roles.user_id')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .whereIn('roles.name', seniorRoles)
      .select('users.id', 'users.name', 'users.email', 'roles.name as role_name')
      .distinct('users.id');

    console.log(`Found ${eligibleMentorUsers.length} users who should be able to mentor:\n`);

    for (const user of eligibleMentorUsers) {
      console.log(`Processing ${user.name} (${user.email}) - Current role: ${user.role_name}`);

      // Check if they're Super Admin - they get Coordinator role
      if (user.role_name === 'Super Admin' && coordinatorRole) {
        // Check if already has coordinator role
        const hasCoordinatorRole = await db('user_roles')
          .where({ user_id: user.id, role_id: coordinatorRole.id })
          .first();

        if (!hasCoordinatorRole) {
          await db('user_roles').insert({
            id: db.raw('gen_random_uuid()'),
            user_id: user.id,
            role_id: coordinatorRole.id,
            assigned_by: user.id, // Self-assigned for this script
            assigned_at: new Date()
          });
          console.log(`  ✓ Assigned Mentorship Coordinator role`);
        } else {
          console.log(`  - Already has Mentorship Coordinator role`);
        }
      }

      // All eligible users get Mentor role
      const hasMentorRole = await db('user_roles')
        .where({ user_id: user.id, role_id: mentorRole.id })
        .first();

      if (!hasMentorRole) {
        await db('user_roles').insert({
          id: db.raw('gen_random_uuid()'),
          user_id: user.id,
          role_id: mentorRole.id,
          assigned_by: user.id, // Self-assigned for this script
          assigned_at: new Date()
        });
        console.log(`  ✓ Assigned Mentor role`);
      } else {
        console.log(`  - Already has Mentor role`);
      }
    }

    console.log('\n✅ Role assignment complete!');
    console.log('Users with senior referee roles now have the Mentor role.');
    console.log('Super Admins also have the Mentorship Coordinator role.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

assignMentorRoles();