/**
 * Phase 2.3: Database Default Values and Constraints
 * 
 * This migration adds default values to critical fields and implements
 * data integrity constraints as specified in the comprehensive audit plan.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('🔧 Phase 2.3: Adding database defaults and constraints...');

  // First, handle any existing NULL values that would conflict with constraints
  console.log('📊 Updating existing NULL values...');
  
  // Update any NULL status values to 'unassigned'
  await knex('games')
    .whereNull('status')
    .update({ status: 'unassigned' });

  // Update any NULL refs_needed values to 2 (as per plan specification)
  // Also update the default from 3 to 2 as specified in the comprehensive plan
  const refsNeededExists = await knex.schema.hasColumn('games', 'refs_needed');
  if (refsNeededExists) {
    await knex('games')
      .whereNull('refs_needed')
      .update({ refs_needed: 2 });
  }

  // Update any NULL wage_multiplier values to 1.0
  const wageMultiplierExists = await knex.schema.hasColumn('games', 'wage_multiplier');
  if (wageMultiplierExists) {
    await knex('games')
      .whereNull('wage_multiplier')
      .update({ wage_multiplier: 1.0 });
  }

  // Update any NULL game_type values to 'Community'
  const gameTypeExists = await knex.schema.hasColumn('games', 'game_type');
  if (gameTypeExists) {
    await knex('games')
      .whereNull('game_type')
      .update({ game_type: 'Community' });
  }

  // Handle locations table if it exists
  const locationsExists = await knex.schema.hasTable('locations');
  if (locationsExists) {
    // Update any NULL is_active values to true
    await knex('locations')
      .whereNull('is_active')
      .update({ is_active: true });

    // Update any NULL capacity values to 0
    await knex('locations')
      .whereNull('capacity')
      .update({ capacity: 0 });
  }

  console.log('⚙️ Checking and applying default value constraints to games table...');

  // Note: status column already has a default value of 'unassigned' from original migration
  // No need to alter it as it already has the correct default

  // Only alter refs_needed if it exists and change default from 3 to 2
  if (refsNeededExists) {
    await knex.schema.alterTable('games', function(table) {
      table.integer('refs_needed').notNullable().defaultTo(2).alter();
    });
  }

  // Note: wage_multiplier already has a default of 1.0 from migration 013
  // No need to alter it as it already has the correct default

  // Note: game_type already has a default of 'Community' from migration 20250723024910
  // No need to alter it as it already has the correct default

  // Apply defaults to locations table if it exists
  if (locationsExists) {
    console.log('⚙️ Applying default value constraints to locations table...');
    
    await knex.schema.alterTable('locations', function(table) {
      // is_active should already have a default, but ensure it's correct
      table.boolean('is_active').defaultTo(true).alter();
      
      // capacity should allow NULL but have a default for new records
      table.integer('capacity').defaultTo(0).alter();
    });
  }

  console.log('🔒 Adding check constraints...');

  // Add check constraints to ensure data integrity
  // Note: PostgreSQL syntax for check constraints
  
  // Ensure pay_rate is positive
  await knex.raw(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'check_positive_pay_rate'
      ) THEN
        ALTER TABLE games ADD CONSTRAINT check_positive_pay_rate CHECK (pay_rate >= 0);
      END IF;
    END $$
  `);

  // Ensure wage_multiplier is positive (only if column exists)
  if (wageMultiplierExists) {
    await knex.raw(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.check_constraints 
          WHERE constraint_name = 'check_positive_wage_multiplier'
        ) THEN
          ALTER TABLE games ADD CONSTRAINT check_positive_wage_multiplier CHECK (wage_multiplier > 0);
        END IF;
      END $$
    `);
  }

  // Add constraint for locations capacity if table exists
  if (locationsExists) {
    await knex.raw(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.check_constraints 
          WHERE constraint_name = 'check_positive_capacity'
        ) THEN
          ALTER TABLE locations ADD CONSTRAINT check_positive_capacity CHECK (capacity >= 0);
        END IF;
      END $$
    `);
  }

  console.log('✅ Phase 2.3 migration completed successfully!');
  console.log('   - Default values applied to critical fields');
  console.log('   - Data integrity constraints added');
  console.log('   - Existing data compatibility maintained');
};

/**
 * Rollback the changes made in the up migration
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('🔄 Rolling back Phase 2.3: Database defaults and constraints...');

  // Remove check constraints
  console.log('🔓 Removing check constraints...');
  
  await knex.raw(`
    DO $$ 
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'check_positive_pay_rate'
      ) THEN
        ALTER TABLE games DROP CONSTRAINT check_positive_pay_rate;
      END IF;
    END $$
  `);

  const wageMultiplierExists = await knex.schema.hasColumn('games', 'wage_multiplier');
  if (wageMultiplierExists) {
    await knex.raw(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.check_constraints 
          WHERE constraint_name = 'check_positive_wage_multiplier'
        ) THEN
          ALTER TABLE games DROP CONSTRAINT check_positive_wage_multiplier;
        END IF;
      END $$
    `);
  }

  const locationsExists = await knex.schema.hasTable('locations');
  if (locationsExists) {
    await knex.raw(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.check_constraints 
          WHERE constraint_name = 'check_positive_capacity'
        ) THEN
          ALTER TABLE locations DROP CONSTRAINT check_positive_capacity;
        END IF;
      END $$
    `);
  }

  // Note: We don't remove the default values in the rollback as that could
  // cause issues with existing application code that depends on them.
  // The defaults are generally safe to keep even if rolling back.

  console.log('✅ Phase 2.3 rollback completed');
};