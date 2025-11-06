import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Starting migration of existing users to referee roles...');

  // Get the admin user for assigning roles
  const adminUser = await knex('users')
    .where('email', 'admin@cmba.ca')
    .first();

  const assignedBy = adminUser?.id || null;

  // Get role IDs
  const refereeRole = await knex('roles').where('name', 'Referee').first();
  const juniorRole = await knex('roles').where('name', 'Junior Referee').first();
  const seniorRole = await knex('roles').where('name', 'Senior Referee').first();

  if (!refereeRole) {
    throw new Error('Referee role not found. Run previous migration first.');
  }

  // Step 1: Find all users who are referees based on legacy role field
  const refereeUsers = await knex('users')
    .where('role', 'referee')
    .orWhere('role', 'Referee')
    .select('id', 'white_whistle', 'email', 'name');

  console.log(`Found ${refereeUsers.length} referee users to migrate`);

  // Step 2: Assign base Referee role to all referee users
  for (const user of refereeUsers) {
    // Check if user already has the base referee role
    const existingRole = await knex('user_roles')
      .where({
        user_id: user.id,
        role_id: refereeRole.id
      })
      .first();

    if (!existingRole) {
      await knex('user_roles').insert({
        user_id: user.id,
        role_id: refereeRole.id,
        assigned_at: knex.fn.now(),
        assigned_by: assignedBy
      });
      console.log(`✅ Assigned Referee role to ${user.email}`);
    }

    // Step 3: Assign secondary role based on white_whistle or other criteria
    let secondaryRoleId = juniorRole?.id; // Default to Junior

    // If white_whistle is true, they're a Senior Referee
    if (user.white_whistle === true && seniorRole) {
      secondaryRoleId = seniorRole.id;
    }

    if (secondaryRoleId) {
      const existingSecondary = await knex('user_roles')
        .where({
          user_id: user.id,
          role_id: secondaryRoleId
        })
        .first();

      if (!existingSecondary) {
        await knex('user_roles').insert({
          user_id: user.id,
          role_id: secondaryRoleId,
          assigned_at: knex.fn.now(),
          assigned_by: assignedBy
        });

        const roleName = user.white_whistle ? 'Senior Referee' : 'Junior Referee';
        console.log(`✅ Assigned ${roleName} role to ${user.email}`);
      }
    }
  }

  // Step 4: Check for users in the referees table who might not have the role
  const refereesTableExists = await knex.schema.hasTable('referees');
  if (refereesTableExists) {
    const refereesInTable = await knex('referees').select('user_id');

    for (const ref of refereesInTable) {
      const existingRole = await knex('user_roles')
        .where({
          user_id: ref.user_id,
          role_id: refereeRole.id
        })
        .first();

      if (!existingRole) {
        await knex('user_roles').insert({
          user_id: ref.user_id,
          role_id: refereeRole.id,
          assigned_at: knex.fn.now(),
          assigned_by: assignedBy
        });

        // Also assign Junior as default secondary
        if (juniorRole) {
          await knex('user_roles').insert({
            user_id: ref.user_id,
            role_id: juniorRole.id,
            assigned_at: knex.fn.now(),
            assigned_by: assignedBy
          });
        }

        console.log(`✅ Migrated referee from referees table: ${ref.user_id}`);
      }
    }
  }

  console.log('✅ Migration of existing referees completed');
}

export async function down(knex: Knex): Promise<void> {
  // Get referee role IDs
  const refereeRoles = await knex('roles')
    .whereIn('name', [
      'Referee',
      'Rookie Referee',
      'Junior Referee',
      'Senior Referee',
      'Head Referee',
      'Referee Coach'
    ])
    .select('id');

  const roleIds = refereeRoles.map(r => r.id);

  // Remove all user assignments for these roles
  if (roleIds.length > 0) {
    await knex('user_roles')
      .whereIn('role_id', roleIds)
      .delete();
  }
}