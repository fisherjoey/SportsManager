/**
 * Migration: Implement new referee level system (Rookie/Junior/Senior) with white whistle logic
 * 
 * This migration:
 * 1. Updates referee_levels table with new level system (Rookie, Junior, Senior)
 * 2. Ensures users table has proper fields for the new system
 * 3. Creates roles table for admin-defined roles
 * 4. Migrates existing data to new system
 * 5. Maintains backward compatibility
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('🚀 Starting referee level system migration...');

  // 1. Clear existing referee levels and insert new ones
  await knex('referee_levels').del();
  
  // Insert new level system with proper wage structure
  await knex('referee_levels').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Rookie',
      wage_amount: 25.00,
      description: 'New referees learning the basics. Always displays white whistle.',
      allowed_divisions: JSON.stringify(['Recreational', 'Youth']),
      experience_requirements: JSON.stringify({
        min_years: 0,
        max_years: 1,
        requires_mentor: true
      }),
      capability_requirements: JSON.stringify({
        max_game_level: 'Recreational',
        requires_supervision: true,
        white_whistle_required: true
      })
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Junior',
      wage_amount: 35.00,
      description: 'Developing referees with some experience. May display white whistle based on individual flag.',
      allowed_divisions: JSON.stringify(['Recreational', 'Youth', 'Competitive']),
      experience_requirements: JSON.stringify({
        min_years: 1,
        max_years: 3,
        requires_mentor: false
      }),
      capability_requirements: JSON.stringify({
        max_game_level: 'Competitive',
        requires_supervision: false,
        white_whistle_conditional: true
      })
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Senior',
      wage_amount: 50.00,
      description: 'Experienced referees capable of handling all game types. Never displays white whistle.',
      allowed_divisions: JSON.stringify(['Recreational', 'Youth', 'Competitive', 'Elite']),
      experience_requirements: JSON.stringify({
        min_years: 3,
        max_years: null,
        requires_mentor: false
      }),
      capability_requirements: JSON.stringify({
        max_game_level: 'Elite',
        requires_supervision: false,
        white_whistle_never: true
      })
    }
  ]);

  // 2. Create roles table for admin-defined roles
  if (!(await knex.schema.hasTable('referee_roles'))) {
    await knex.schema.createTable('referee_roles', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable().unique();
      table.text('description');
      table.boolean('is_active').defaultTo(true);
      table.json('permissions').defaultTo('{}');
      table.timestamps(true, true);
    });

    // Insert default roles
    await knex('referee_roles').insert([
      {
        id: knex.raw('gen_random_uuid()'),
        name: 'Referee',
        description: 'Standard referee role for officiating games',
        is_active: true,
        permissions: JSON.stringify({
          can_officiate: true,
          can_be_assigned: true,
          is_default: true
        })
      },
      {
        id: knex.raw('gen_random_uuid()'),
        name: 'Evaluator',
        description: 'Evaluates referee performance during games',
        is_active: true,
        permissions: JSON.stringify({
          can_officiate: true,
          can_evaluate: true,
          can_be_assigned: true,
          receives_full_fee: true
        })
      },
      {
        id: knex.raw('gen_random_uuid()'),
        name: 'Mentor',
        description: 'Mentors new and developing referees',
        is_active: true,
        permissions: JSON.stringify({
          can_officiate: true,
          can_mentor: true,
          can_be_assigned: true,
          receives_full_fee: true
        })
      },
      {
        id: knex.raw('gen_random_uuid()'),
        name: 'Regional Lead',
        description: 'Regional leadership and coordination role',
        is_active: true,
        permissions: JSON.stringify({
          can_officiate: true,
          can_assign: true,
          can_coordinate: true,
          has_admin_access: true
        })
      },
      {
        id: knex.raw('gen_random_uuid()'),
        name: 'Assignor',
        description: 'Assigns referees to games',
        is_active: true,
        permissions: JSON.stringify({
          can_assign: true,
          can_view_all_games: true,
          has_scheduling_access: true
        })
      },
      {
        id: knex.raw('gen_random_uuid()'),
        name: 'Inspector',
        description: 'Inspects and audits referee performance',
        is_active: true,
        permissions: JSON.stringify({
          can_inspect: true,
          can_audit: true,
          can_evaluate: true,
          receives_full_fee: true
        })
      }
    ]);
  }

  // 3. Add new level field to users table (will reference new system)
  const hasNewLevelField = await knex.schema.hasColumn('users', 'new_referee_level');
  if (!hasNewLevelField) {
    await knex.schema.table('users', function(table) {
      table.enum('new_referee_level', ['Rookie', 'Junior', 'Senior']).nullable();
    });
  }

  // 4. Ensure required fields exist in users table
  const hasWhiteWhistleField = await knex.schema.hasColumn('users', 'is_white_whistle');
  if (!hasWhiteWhistleField) {
    await knex.schema.table('users', function(table) {
      table.boolean('is_white_whistle').defaultTo(false);
    });
  }

  const hasPostalCodeField = await knex.schema.hasColumn('users', 'postal_code');
  if (!hasPostalCodeField) {
    await knex.schema.table('users', function(table) {
      table.string('postal_code', 10).nullable();
    });
  }

  // 5. Migrate existing referees to new level system based on current levels
  // Map old levels to new system
  const rookieLevel = await knex('referee_levels').where('name', 'Rookie').first();
  const juniorLevel = await knex('referee_levels').where('name', 'Junior').first();
  const seniorLevel = await knex('referee_levels').where('name', 'Senior').first();

  // Get all referees with their current levels
  const referees = await knex('users')
    .leftJoin('referee_levels as old_levels', 'users.referee_level_id', 'old_levels.id')
    .where('users.role', 'referee')
    .select('users.id', 'old_levels.name as old_level_name');

  // Migrate each referee to new system
  for (const referee of referees) {
    let newLevel = 'Junior'; // default
    let isWhiteWhistle = false;

    // Map old levels to new levels
    if (referee.old_level_name) {
      switch (referee.old_level_name.toLowerCase()) {
        case 'learning':
        case 'learning+':
          newLevel = 'Rookie';
          isWhiteWhistle = true; // Rookies always have white whistle
          break;
        case 'growing':
        case 'growing+':
          newLevel = 'Junior';
          isWhiteWhistle = false; // Junior level, no white whistle by default
          break;
        case 'teaching':
        case 'expert':
          newLevel = 'Senior';
          isWhiteWhistle = false; // Senior never has white whistle
          break;
        default:
          newLevel = 'Junior';
          isWhiteWhistle = false;
      }
    }

    // Update referee with new level and white whistle status
    await knex('users')
      .where('id', referee.id)
      .update({
        new_referee_level: newLevel,
        is_white_whistle: isWhiteWhistle,
        referee_level_id: newLevel === 'Rookie' ? rookieLevel.id : 
                          newLevel === 'Junior' ? juniorLevel.id : 
                          seniorLevel.id
      });
  }

  // 6. Create user_referee_roles junction table for many-to-many relationship
  if (!(await knex.schema.hasTable('user_referee_roles'))) {
    await knex.schema.createTable('user_referee_roles', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable();
      table.uuid('referee_role_id').notNullable();
      table.timestamp('assigned_at').defaultTo(knex.fn.now());
      table.uuid('assigned_by').nullable(); // admin who assigned the role
      table.boolean('is_active').defaultTo(true);
      
      // Foreign keys
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('referee_role_id').references('id').inTable('referee_roles').onDelete('CASCADE');
      table.foreign('assigned_by').references('id').inTable('users').onDelete('SET NULL');
      
      // Ensure a user can't have the same role twice
      table.unique(['user_id', 'referee_role_id']);
    });

    // Assign default 'Referee' role to all existing referees
    const defaultRefereeRole = await knex('referee_roles').where('name', 'Referee').first();
    const allReferees = await knex('users').where('role', 'referee').select('id');
    
    const defaultRoleAssignments = allReferees.map(referee => ({
      id: knex.raw('gen_random_uuid()'),
      user_id: referee.id,
      referee_role_id: defaultRefereeRole.id,
      assigned_at: knex.fn.now(),
      is_active: true
    }));

    if (defaultRoleAssignments.length > 0) {
      await knex('user_referee_roles').insert(defaultRoleAssignments);
    }
  }

  console.log('✅ Referee level system migration completed successfully');
  console.log(`   - Updated ${referees.length} referees to new level system`);
  console.log('   - Created roles table with 6 default roles');
  console.log('   - Assigned default Referee role to all existing referees');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('🔄 Rolling back referee level system migration...');

  // Drop junction table
  if (await knex.schema.hasTable('user_referee_roles')) {
    await knex.schema.dropTable('user_referee_roles');
  }

  // Drop roles table
  if (await knex.schema.hasTable('referee_roles')) {
    await knex.schema.dropTable('referee_roles');
  }

  // Remove new level field from users
  const hasNewLevelField = await knex.schema.hasColumn('users', 'new_referee_level');
  if (hasNewLevelField) {
    await knex.schema.table('users', function(table) {
      table.dropColumn('new_referee_level');
    });
  }

  // Reset white whistle flags
  await knex('users')
    .where('role', 'referee')
    .update({ is_white_whistle: false });

  console.log('✅ Referee level system migration rollback completed');
};