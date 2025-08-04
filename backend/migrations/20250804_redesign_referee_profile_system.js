/**
 * Migration: Redesign Referee Profile System
 * 
 * This migration implements the new referee profile system per CLAUDE.md specifications:
 * - Replace old level system (Learning, Growing, Teaching, etc.) with Rookie/Junior/Senior
 * - Add white whistle logic
 * - Add admin-defined roles system
 * - Add postal code field for distance calculations
 */

exports.up = async function(knex) {
  return knex.transaction(async (trx) => {
    // 1. Create new referee levels (Rookie, Junior, Senior)
    await trx('referee_levels').del(); // Clear existing levels
    
    await trx('referee_levels').insert([
      {
        name: 'Rookie',
        wage_amount: 25.00,
        description: 'New referees with minimal experience. Always displays white whistle.',
        allowed_divisions: JSON.stringify(['U11-2', 'U11-1', 'U13-3']),
        experience_requirements: JSON.stringify({
          min_years: 0,
          max_years: 2,
          min_games_season: 0,
          whistle_color: 'white'
        }),
        capability_requirements: JSON.stringify({
          divisions: 'Youth levels with guidance',
          call_accuracy: 'Learning fundamentals with mentorship',
          mechanics: 'Beginning to learn the basics',
          attitude: 'Positive attitude, eager to learn'
        })
      },
      {
        name: 'Junior',
        wage_amount: 35.00,
        description: 'Developing referees with some experience. May display white whistle based on individual assessment.',
        allowed_divisions: JSON.stringify(['U11-1', 'U13-3', 'U13-2', 'U13-1', 'U15-3', 'U15-2']),
        experience_requirements: JSON.stringify({
          min_years: 1,
          max_years: 4,
          min_games_season: 20,
          whistle_color: 'white or black'
        }),
        capability_requirements: JSON.stringify({
          divisions: 'U13 and lower U15 levels',
          call_accuracy: 'Confident decision making',
          mechanics: 'Good understanding of positioning and rules',
          attitude: 'Reliable and shows improvement'
        })
      },
      {
        name: 'Senior',
        wage_amount: 45.00,
        description: 'Experienced referees with proven competency. Uses black whistle only.',
        allowed_divisions: JSON.stringify(['U13-1', 'U15-2', 'U15-1', 'U18-3', 'U18-2', 'U18-1']),
        experience_requirements: JSON.stringify({
          min_years: 4,
          min_games_season: 40,
          whistle_color: 'black'
        }),
        capability_requirements: JSON.stringify({
          divisions: 'All levels including high-level competitive games',
          call_accuracy: 'Excellent decision making and game management',
          mechanics: 'Advanced positioning and rule application',
          attitude: 'Leadership qualities, mentors other referees'
        })
      }
    ]);

    // 2. Add white whistle flag to users table
    const hasWhiteWhistle = await trx.schema.hasColumn('users', 'is_white_whistle');
    if (!hasWhiteWhistle) {
      await trx.schema.alterTable('users', function(table) {
        table.boolean('is_white_whistle').defaultTo(false);
      });
    }

    // 3. Add postal code field if it doesn't exist
    const hasPostalCode = await trx.schema.hasColumn('users', 'postal_code');
    if (!hasPostalCode) {
      await trx.schema.alterTable('users', function(table) {
        table.string('postal_code', 10);
      });
    }

    // 4. Create roles table for admin-defined roles
    const hasRolesTable = await trx.schema.hasTable('referee_roles');
    if (!hasRolesTable) {
      await trx.schema.createTable('referee_roles', function(table) {
        table.uuid('id').primary().defaultTo(trx.raw('gen_random_uuid()'));
        table.string('name').notNullable(); // Referee, Evaluator, Mentor, Regional Lead, etc.
        table.text('description');
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
        
        table.index('name');
        table.index('is_active');
      });

      // Insert default roles
      await trx('referee_roles').insert([
        { name: 'Referee', description: 'Standard game official', is_active: true },
        { name: 'Evaluator', description: 'Assesses referee performance', is_active: true },
        { name: 'Mentor', description: 'Guides and develops other referees', is_active: true },
        { name: 'Regional Lead', description: 'Regional coordinator and leader', is_active: true },
        { name: 'Assignor', description: 'Manages game assignments', is_active: true },
        { name: 'Inspector', description: 'Quality assurance and oversight', is_active: true }
      ]);
    }

    // 5. Create user_roles junction table
    const hasUserRolesTable = await trx.schema.hasTable('user_roles');
    if (!hasUserRolesTable) {
      await trx.schema.createTable('user_roles', function(table) {
        table.uuid('id').primary().defaultTo(trx.raw('gen_random_uuid()'));
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.uuid('role_id').notNullable().references('id').inTable('referee_roles').onDelete('CASCADE');
        table.timestamp('assigned_at').defaultTo(trx.fn.now());
        table.uuid('assigned_by').references('id').inTable('users'); // Admin who assigned the role
        
        table.unique(['user_id', 'role_id']);
        table.index('user_id');
        table.index('role_id');
      });
    }

    // 6. Migrate existing referees to new level system
    const existingReferees = await trx('users')
      .leftJoin('referee_levels', 'users.referee_level_id', 'referee_levels.id')
      .select('users.id', 'users.name', 'referee_levels.name as old_level', 'users.wage_per_game')
      .where('users.role', 'referee');

    // Get new level IDs
    const rookieLevel = await trx('referee_levels').where('name', 'Rookie').first();
    const juniorLevel = await trx('referee_levels').where('name', 'Junior').first();
    const seniorLevel = await trx('referee_levels').where('name', 'Senior').first();

    // Get default referee role
    const refereeRole = await trx('referee_roles').where('name', 'Referee').first();

    for (const referee of existingReferees) {
      let newLevelId, isWhiteWhistle = false;

      // Migrate based on old level or wage
      switch (referee.old_level) {
        case 'Learning':
        case 'Learning+':
          newLevelId = rookieLevel.id;
          isWhiteWhistle = true;
          break;
        case 'Growing':
        case 'Growing+':
          newLevelId = juniorLevel.id;
          isWhiteWhistle = Math.random() > 0.5; // 50% chance for Junior level
          break;
        case 'Teaching':
        case 'Expert':
          newLevelId = seniorLevel.id;
          isWhiteWhistle = false;
          break;
        default:
          // Migrate based on wage if no level
          if (referee.wage_per_game <= 25) {
            newLevelId = rookieLevel.id;
            isWhiteWhistle = true;
          } else if (referee.wage_per_game <= 35) {
            newLevelId = juniorLevel.id;
            isWhiteWhistle = Math.random() > 0.5;
          } else {
            newLevelId = seniorLevel.id;
            isWhiteWhistle = false;
          }
      }

      // Update referee with new level and white whistle flag
      await trx('users')
        .where('id', referee.id)
        .update({
          referee_level_id: newLevelId,
          is_white_whistle: isWhiteWhistle,
          wage_per_game: newLevelId === rookieLevel.id ? 25.00 : 
                         newLevelId === juniorLevel.id ? 35.00 : 45.00
        });

      // Assign default referee role
      if (refereeRole) {
        await trx('user_roles').insert({
          user_id: referee.id,
          role_id: refereeRole.id
        }).onConflict(['user_id', 'role_id']).ignore();
      }
    }

    console.log(`✅ Migrated ${existingReferees.length} referees to new level system`);
  });
};

exports.down = async function(knex) {
  return knex.transaction(async (trx) => {
    // Remove new columns
    await trx.schema.alterTable('users', function(table) {
      table.dropColumn('is_white_whistle');
      table.dropColumn('postal_code');
    });

    // Drop new tables
    await trx.schema.dropTableIfExists('user_roles');
    await trx.schema.dropTableIfExists('referee_roles');

    // Restore old referee levels (simplified - in production you'd want to backup first)
    await trx('referee_levels').del();
    await trx('referee_levels').insert([
      { name: 'Learning', wage_amount: 25.00, description: 'Entry level referees' },
      { name: 'Growing', wage_amount: 35.00, description: 'Developing referees' },
      { name: 'Teaching', wage_amount: 45.00, description: 'Senior referees' }
    ]);

    console.log('⚠️  Rolled back referee profile system redesign');
  });
};