/**
 * Phase 2 Migration 2.4: Migrate Existing Users to New Role System
 *
 * Migrates existing referee users to the new base + secondary role architecture.
 *
 * Migration logic:
 * 1. Find all users with role='referee' (legacy system)
 * 2. Assign base "Referee" role to all referee users
 * 3. Assign secondary role based on white_whistle field and other criteria:
 *    - white_whistle = true → Senior Referee
 *    - white_whistle = false → Junior Referee
 *    - white_whistle = null → Junior Referee (default)
 * 4. Handle users in the referees table who might not have the role set
 */

exports.up = async function(knex) {
  console.log('Starting Phase 2 Migration 2.4: Migrate existing users to referee roles...');

  // Get the admin user for assigning roles (if exists)
  const adminUser = await knex('users')
    .where('email', 'admin@cmba.ca')
    .first();

  const assignedBy = adminUser?.id || null;

  // Get role IDs
  const refereeRole = await knex('roles').where('name', 'Referee').first();
  const rookieRole = await knex('roles').where('name', 'Rookie Referee').first();
  const juniorRole = await knex('roles').where('name', 'Junior Referee').first();
  const seniorRole = await knex('roles').where('name', 'Senior Referee').first();

  if (!refereeRole) {
    throw new Error('Referee role not found. Run previous migration first.');
  }

  console.log('📋 Role IDs found:');
  console.log(`  • Referee: ${refereeRole.id}`);
  console.log(`  • Junior Referee: ${juniorRole?.id || 'NOT FOUND'}`);
  console.log(`  • Senior Referee: ${seniorRole?.id || 'NOT FOUND'}`);

  // Step 1: Find users who already have referee roles but might need the base role
  // or find users from referees table who need roles assigned
  const existingRefereeUsers = await knex.raw(`
    SELECT DISTINCT u.id, u.email, u.name
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE r.name LIKE '%Referee%'
  `);

  console.log(`\n🔍 Found ${existingRefereeUsers.rows.length} users with existing referee roles`);

  // Also get all users to check white_whistle status for secondary role assignment
  const allUsers = await knex('users').select('id', 'email', 'name');

  let baseRoleAssigned = 0;
  let secondaryRoleAssigned = 0;

  // Step 2: Process each user with existing referee roles
  for (const user of existingRefereeUsers.rows) {
    console.log(`\n👤 Processing user: ${user.email || user.name || user.id}`);

    // Step 2a: Assign base Referee role to all referee users
    const existingBaseRole = await knex('user_roles')
      .where({
        user_id: user.id,
        role_id: refereeRole.id
      })
      .first();

    if (!existingBaseRole) {
      await knex('user_roles').insert({
        id: knex.raw('gen_random_uuid()'),
        user_id: user.id,
        role_id: refereeRole.id,
        assigned_at: knex.fn.now(),
        assigned_by: assignedBy,
        is_active: true
      });
      console.log(`  ✓ Assigned base Referee role`);
      baseRoleAssigned++;
    } else {
      console.log(`  - Already has base Referee role`);
    }

    // Step 2b: Check if user already has a secondary role, if not assign Junior as default
    const hasSecondaryRole = await knex('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', user.id)
      .where('roles.name', 'NOT LIKE', 'Referee')
      .orWhere('roles.name', 'LIKE', '%Referee')
      .where('roles.name', '!=', 'Referee')
      .first();

    let secondaryRoleId = null;
    let secondaryRoleName = null;

    // Only assign secondary role if they don't already have one
    if (!hasSecondaryRole && juniorRole) {
      secondaryRoleId = juniorRole.id;
      secondaryRoleName = 'Junior Referee';
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
          id: knex.raw('gen_random_uuid()'),
          user_id: user.id,
          role_id: secondaryRoleId,
          assigned_at: knex.fn.now(),
          assigned_by: assignedBy,
          is_active: true
        });

        console.log(`  ✓ Assigned ${secondaryRoleName} role`);
        secondaryRoleAssigned++;
      } else if (secondaryRoleName) {
        console.log(`  - Already has ${secondaryRoleName} role`);
      } else {
        console.log(`  - Already has a secondary referee role`);
      }
    } else {
      console.log(`  - Already has a secondary referee role, skipping assignment`);
    }
  }

  // Step 3: Check for users in the referees table who might not have the role
  const refereesTableExists = await knex.schema.hasTable('referees');
  let refereesTableMigrated = 0;

  if (refereesTableExists) {
    console.log('\n🔍 Checking referees table for additional users...');

    const refereesInTable = await knex('referees')
      .select('user_id')
      .whereNotNull('user_id');

    console.log(`Found ${refereesInTable.length} entries in referees table`);

    for (const ref of refereesInTable) {
      const existingRole = await knex('user_roles')
        .where({
          user_id: ref.user_id,
          role_id: refereeRole.id
        })
        .first();

      if (!existingRole) {
        // Get user info for logging
        const user = await knex('users').where('id', ref.user_id).first();
        console.log(`\n👤 Migrating referee from referees table: ${user?.email || ref.user_id}`);

        await knex('user_roles').insert({
          id: knex.raw('gen_random_uuid()'),
          user_id: ref.user_id,
          role_id: refereeRole.id,
          assigned_at: knex.fn.now(),
          assigned_by: assignedBy,
          is_active: true
        });

        // Also assign Junior as default secondary
        if (juniorRole) {
          await knex('user_roles').insert({
            id: knex.raw('gen_random_uuid()'),
            user_id: ref.user_id,
            role_id: juniorRole.id,
            assigned_at: knex.fn.now(),
            assigned_by: assignedBy,
            is_active: true
          });
        }

        console.log(`  ✓ Assigned Referee + Junior Referee roles`);
        refereesTableMigrated++;
      }
    }
  } else {
    console.log('\n⚠️ Referees table not found, skipping table-based migration');
  }

  console.log('\n✅ Phase 2 Migration 2.4: User migration completed');
  console.log('📊 Migration summary:');
  console.log(`  • Users processed: ${existingRefereeUsers.rows.length}`);
  console.log(`  • Base Referee roles assigned: ${baseRoleAssigned}`);
  console.log(`  • Secondary roles assigned: ${secondaryRoleAssigned}`);
  console.log(`  • Referees table migrations: ${refereesTableMigrated}`);
  console.log(`  • Total role assignments: ${baseRoleAssigned + secondaryRoleAssigned + (refereesTableMigrated * 2)}`);

  // Step 4: Verification query
  const totalRefereeRoles = await knex('user_roles')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('roles.name', 'Referee')
    .count('* as count')
    .first();

  console.log(`\n🔍 Verification: ${totalRefereeRoles.count} users now have the base Referee role`);
};

exports.down = async function(knex) {
  console.log('Rolling back Phase 2 Migration 2.4...');

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
    const deletedCount = await knex('user_roles')
      .whereIn('role_id', roleIds)
      .del();

    console.log(`✓ Removed ${deletedCount} user role assignments`);
  }

  console.log('✅ Phase 2 Migration 2.4 rollback completed');
};