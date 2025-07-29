/**
 * @fileoverview Fix Comprehensive Test Schema Migration
 * Addresses schema mismatches identified during comprehensive testing
 * 
 * Issues Fixed:
 * 1. Missing referees table (blocks 25+ tests)
 * 2. Missing referee_availability table (blocks 8+ tests) 
 * 3. Data type mismatches (text vs character varying)
 * 4. Compatibility fields for test expectations
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('🔧 Starting comprehensive test schema fixes...');

  // Phase 1: Create missing referees table if it doesn't exist
  console.log('📋 Creating referees table...');
  const hasReferees = await knex.schema.hasTable('referees');
  if (!hasReferees) {
    await knex.schema.createTable('referees', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index('user_id', 'idx_referees_user_id');
    
    // Ensure one referee record per user
    table.unique('user_id', 'referees_user_id_unique');
    });
  }

  // Phase 2: Create missing referee_availability table if it doesn't exist
  console.log('📅 Creating referee_availability table...');
  const hasRefAvailability = await knex.schema.hasTable('referee_availability');
  if (!hasRefAvailability) {
    await knex.schema.createTable('referee_availability', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('date_from').notNullable();
    table.date('date_to').notNullable();
    table.time('time_from').notNullable();
    table.time('time_to').notNullable();
    table.boolean('is_available').notNullable().defaultTo(true);
    table.integer('max_games');
    table.specificType('preferred_locations', 'text[]');
    table.text('comments');
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index('user_id', 'idx_referee_availability_user_id');
    table.index(['date_from', 'date_to'], 'idx_referee_availability_dates');
    });
  }

  // Phase 3: Fix data type mismatches (text -> character varying)
  console.log('🔧 Fixing data type mismatches...');
  
  // Fix users.role if it's currently text
  const userRoleColumn = await knex('information_schema.columns')
    .where('table_name', 'users')
    .where('column_name', 'role')
    .first();
    
  if (userRoleColumn && userRoleColumn.data_type === 'text') {
    await knex.raw('ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50)');
  }

  // Fix games.level if it's currently text  
  const gameLevelColumn = await knex('information_schema.columns')
    .where('table_name', 'games')
    .where('column_name', 'level')
    .first();
    
  if (gameLevelColumn && gameLevelColumn.data_type === 'text') {
    await knex.raw('ALTER TABLE games ALTER COLUMN level TYPE VARCHAR(50)');
  }

  // Fix games.status if it's currently text
  const gameStatusColumn = await knex('information_schema.columns')
    .where('table_name', 'games')
    .where('column_name', 'status')
    .first();
    
  if (gameStatusColumn && gameStatusColumn.data_type === 'text') {
    await knex.raw('ALTER TABLE games ALTER COLUMN status TYPE VARCHAR(50)');
  }

  // Phase 4: Add compatibility fields to game_assignments
  console.log('🔗 Adding compatibility fields...');
  
  // Check if referee_id column exists
  const refereeIdExists = await knex.schema.hasColumn('game_assignments', 'referee_id');
  
  if (!refereeIdExists) {
    await knex.schema.alterTable('game_assignments', function (table) {
      table.uuid('referee_id').references('id').inTable('referees').onDelete('CASCADE');
      table.index('referee_id', 'idx_game_assignments_referee_id');
    });
  }

  // Phase 5: Data migration - populate referees table
  console.log('📊 Migrating existing referee data...');
  
  // Get all users with referee role
  const refereeUsers = await knex('users').where('role', 'referee').select('id', 'created_at', 'updated_at');
  
  if (refereeUsers.length > 0) {
    const refereeRecords = refereeUsers.map(user => ({
      user_id: user.id,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));
    
    // Insert referee records (ignore conflicts in case of re-run)
    await knex('referees').insert(refereeRecords).onConflict('user_id').ignore();
  }

  // Phase 6: Update existing game_assignments with referee_id
  console.log('🔄 Updating assignment references...');
  
  await knex.raw(`
    UPDATE game_assignments 
    SET referee_id = r.id
    FROM referees r
    WHERE game_assignments.user_id = r.user_id
    AND game_assignments.referee_id IS NULL
  `);

  // Phase 7: Create trigger for automatic referee_id population
  console.log('⚡ Creating synchronization trigger...');
  
  await knex.raw(`
    CREATE OR REPLACE FUNCTION sync_assignment_referee_id()
    RETURNS TRIGGER AS $$
    BEGIN
        IF NEW.user_id IS NOT NULL THEN
            SELECT id INTO NEW.referee_id 
            FROM referees 
            WHERE user_id = NEW.user_id;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    DROP TRIGGER IF EXISTS trigger_sync_assignment_referee_id ON game_assignments;
    CREATE TRIGGER trigger_sync_assignment_referee_id
        BEFORE INSERT OR UPDATE ON game_assignments
        FOR EACH ROW EXECUTE FUNCTION sync_assignment_referee_id();
  `);

  console.log('✅ Comprehensive test schema fixes completed!');
  console.log('📊 Summary:');
  console.log('   - Created referees table with', refereeUsers.length, 'records');
  console.log('   - Created referee_availability table');
  console.log('   - Fixed data type mismatches');
  console.log('   - Added compatibility fields');
  console.log('   - Set up automatic synchronization');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('🔙 Rolling back comprehensive test schema fixes...');

  // Remove trigger and function
  await knex.raw('DROP TRIGGER IF EXISTS trigger_sync_assignment_referee_id ON game_assignments');
  await knex.raw('DROP FUNCTION IF EXISTS sync_assignment_referee_id()');

  // Remove compatibility fields
  const refereeIdExists = await knex.schema.hasColumn('game_assignments', 'referee_id');
  if (refereeIdExists) {
    await knex.schema.alterTable('game_assignments', function (table) {
      table.dropColumn('referee_id');
    });
  }

  // Revert data types (note: this might fail if data doesn't fit)
  try {
    await knex.raw('ALTER TABLE games ALTER COLUMN status TYPE TEXT');
    await knex.raw('ALTER TABLE games ALTER COLUMN level TYPE TEXT');  
    await knex.raw('ALTER TABLE users ALTER COLUMN role TYPE TEXT');
  } catch (error) {
    console.warn('⚠️  Could not revert data types (existing data may not fit):', error.message);
  }

  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('referee_availability');
  await knex.schema.dropTableIfExists('referees');

  console.log('✅ Schema rollback completed');
};