exports.up = async function(knex) {
  console.log('Starting critical fixes migration...');
  
  // 1. Fix audit_logs user_id from integer to UUID
  console.log('Fixing audit_logs user_id data type...');
  
  // Drop the existing audit_logs table and recreate with correct schema
  await knex.schema.dropTableIfExists('audit_logs');
  
  await knex.schema.createTable('audit_logs', table => {
    table.increments('id').primary();
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('user_email');
    table.string('event_type').notNullable();
    table.string('resource_type');
    table.string('resource_id');
    table.json('old_values');
    table.json('new_values');
    table.string('request_path');
    table.string('request_method');
    table.string('ip_address');
    table.string('user_agent');
    table.boolean('success').defaultTo(true);
    table.text('error_message');
    table.json('additional_data');
    table.string('severity');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Add indexes
    table.index(['user_id']);
    table.index(['event_type']);
    table.index(['resource_type', 'resource_id']);
    table.index(['created_at']);
  });
  
  // 2. Create leagues table if it doesn't exist
  console.log('Creating leagues table...');
  
  const hasLeagues = await knex.schema.hasTable('leagues');
  if (!hasLeagues) {
    await knex.schema.createTable('leagues', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('organization').notNullable();
      table.string('age_group').notNullable();
      table.string('gender').notNullable();
      table.string('division').notNullable();
      table.string('season').notNullable();
      table.string('name').notNullable();
      table.string('display_name');
      table.string('status').defaultTo('active');
      table.json('metadata');
      table.timestamps(true, true);
      
      // Add indexes
      table.index(['organization']);
      table.index(['age_group']);
      table.index(['gender']);
      table.index(['season']);
      table.index(['status']);
      table.unique(['organization', 'age_group', 'gender', 'division', 'season']);
    });
  }
  
  // 3. Create teams table if it doesn't exist
  console.log('Creating teams table...');
  
  const hasTeams = await knex.schema.hasTable('teams');
  if (!hasTeams) {
    await knex.schema.createTable('teams', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('league_id').references('id').inTable('leagues').onDelete('CASCADE');
      table.string('team_number').notNullable();
      table.string('name').notNullable();
      table.string('display_name');
      table.string('contact_email');
      table.string('contact_phone');
      table.json('metadata');
      table.timestamps(true, true);
      
      // Add indexes
      table.index(['league_id']);
      table.index(['team_number']);
      table.unique(['league_id', 'team_number']);
    });
  }
  
  // 4. Create games table if it doesn't exist
  console.log('Creating games table...');
  
  const hasGames = await knex.schema.hasTable('games');
  if (!hasGames) {
    await knex.schema.createTable('games', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('game_number').notNullable();
      table.uuid('home_team_id').references('id').inTable('teams').onDelete('SET NULL');
      table.uuid('away_team_id').references('id').inTable('teams').onDelete('SET NULL');
      table.uuid('league_id').references('id').inTable('leagues').onDelete('SET NULL');
      table.timestamp('date_time').notNullable();
      table.string('field').notNullable();
      table.string('division');
      table.string('game_type').defaultTo('regular');
      table.integer('refs_needed').defaultTo(2);
      table.decimal('base_wage', 10, 2);
      table.decimal('wage_multiplier', 4, 2).defaultTo(1.0);
      table.json('metadata');
      table.timestamps(true, true);
      
      // Add indexes
      table.index(['game_number']);
      table.index(['date_time']);
      table.index(['home_team_id']);
      table.index(['away_team_id']);
      table.index(['league_id']);
      table.index(['game_type']);
    });
  }
  
  // 5. Create game_assignments table if it doesn't exist
  console.log('Creating game_assignments table...');
  
  const hasAssignments = await knex.schema.hasTable('game_assignments');
  if (!hasAssignments) {
    await knex.schema.createTable('game_assignments', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('game_id').references('id').inTable('games').onDelete('CASCADE');
      table.uuid('referee_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('position');
      table.string('status').defaultTo('pending');
      table.decimal('calculated_wage', 10, 2);
      table.json('metadata');
      table.timestamps(true, true);
      
      // Add indexes
      table.index(['game_id']);
      table.index(['referee_id']);
      table.index(['status']);
      table.unique(['game_id', 'referee_id']);
    });
  }
  
  console.log('Critical fixes migration completed successfully');
};

exports.down = async function(knex) {
  // This is a fix migration, we don't want to revert these critical fixes
  console.log('Cannot rollback critical fixes migration');
};