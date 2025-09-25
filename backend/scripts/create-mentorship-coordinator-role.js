const knex = require('knex');

async function createMentorshipCoordinatorRole() {
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
    console.log('Creating Mentorship Coordinator role...');

    // Check if role already exists
    const existingRole = await db('roles')
      .where('name', 'Mentorship Coordinator')
      .first();

    if (existingRole) {
      console.log('Mentorship Coordinator role already exists');
      return;
    }

    // Create Mentorship Coordinator role
    const [role] = await db('roles').insert({
      id: db.raw('gen_random_uuid()'),
      name: 'Mentorship Coordinator',
      description: 'Can manage all mentorship relationships, assign mentors and mentees',
      category: 'system',
      is_system: false,
      is_active: true,
      color: '#8B5CF6',
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    console.log('Created Mentorship Coordinator role:', role.id);

    // Get permissions
    const permissions = await db('permissions')
      .whereIn('name', [
        'mentorships:read',
        'mentorships:create',
        'mentorships:update',
        'mentorships:manage',
        'mentee_games:read'
      ]);

    // Assign permissions to role
    for (const permission of permissions) {
      await db('role_permissions').insert({
        id: db.raw('gen_random_uuid()'),
        role_id: role.id,
        permission_id: permission.id,
        created_at: new Date()
      }).onConflict(['role_id', 'permission_id']).ignore();

      console.log(`  - Added permission: ${permission.name}`);
    }

    // Also give Super Admin the Mentorship Coordinator permissions if not already present
    const superAdminRole = await db('roles')
      .where('name', 'Super Admin')
      .first();

    if (superAdminRole) {
      console.log('Ensuring Super Admin has all mentorship permissions...');

      for (const permission of permissions) {
        await db('role_permissions').insert({
          id: db.raw('gen_random_uuid()'),
          role_id: superAdminRole.id,
          permission_id: permission.id,
          created_at: new Date()
        }).onConflict(['role_id', 'permission_id']).ignore();
      }

      console.log('Super Admin permissions updated');
    }

    console.log('Successfully created Mentorship Coordinator role!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

createMentorshipCoordinatorRole();