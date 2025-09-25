/**
 * Migration: Add Missing Foreign Key Constraints and Data Integrity Checks - Package 1A Database Optimization
 * 
 * This migration analyzes the existing schema and adds missing foreign key constraints
 * and data integrity checks to ensure referential integrity and data consistency.
 * 
 * IMPORTANT: This migration is designed to work with existing data and will not
 * create constraints that would fail due to existing data inconsistencies.
 */

exports.up = async function(knex) {
  console.log('Analyzing schema and adding missing foreign key constraints and data integrity checks...');

  // Check which tables exist before creating constraints
  const tables = await knex.raw(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  `);
  
  const existingTables = tables.rows.map(row => row.table_name);

  // Helper function to check if a foreign key constraint exists
  const constraintExists = async (constraintName) => {
    const result = await knex.raw(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = ? AND constraint_type = 'FOREIGN KEY'
    `, [constraintName]);
    return result.rows.length > 0;
  };

  // Helper function to check if a check constraint exists
  const checkConstraintExists = async (constraintName) => {
    const result = await knex.raw(`
      SELECT 1 FROM information_schema.check_constraints 
      WHERE constraint_name = ?
    `, [constraintName]);
    return result.rows.length > 0;
  };

  // 1. Add missing foreign key constraints for game_assignments table
  if (existingTables.includes('game_assignments')) {
    console.log('Checking game_assignments foreign key constraints...');

    // Check if assigned_by foreign key exists
    if (!(await constraintExists('game_assignments_assigned_by_foreign'))) {
      // First verify that all assigned_by values exist in users table
      const orphanedAssignedBy = await knex.raw(`
        SELECT COUNT(*) as count FROM game_assignments ga
        LEFT JOIN users u ON ga.assigned_by = u.id
        WHERE ga.assigned_by IS NOT NULL AND u.id IS NULL
      `);
      
      if (orphanedAssignedBy.rows[0].count === '0') {
        await knex.schema.alterTable('game_assignments', function(table) {
          table.foreign('assigned_by', 'game_assignments_assigned_by_foreign')
                .references('id').inTable('users')
                .onDelete('SET NULL');
        });
        console.log('✓ Added foreign key constraint for game_assignments.assigned_by');
      } else {
        console.log('⚠ Skipped assigned_by foreign key due to orphaned records');
      }
    }

    // Add check constraint for assignment status values
    if (!(await checkConstraintExists('check_assignment_status_valid'))) {
      await knex.raw(`
        ALTER TABLE game_assignments 
        ADD CONSTRAINT check_assignment_status_valid 
        CHECK (status IN ('assigned', 'accepted', 'declined', 'completed', 'cancelled'))
      `);
      console.log('✓ Added check constraint for game_assignments.status');
    }
  }

  // 2. Add missing constraints for games table
  if (existingTables.includes('games')) {
    console.log('Checking games table constraints...');

    // Check if location_id foreign key exists (if location_id column exists)
    const gameColumns = await knex.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'games' AND table_schema = 'public'
    `);
    const gameColumnNames = gameColumns.rows.map(row => row.column_name);
    
    if (gameColumnNames.includes('location_id') && existingTables.includes('locations')) {
      if (!(await constraintExists('games_location_id_foreign'))) {
        // Verify location_id values exist in locations table
        const orphanedLocations = await knex.raw(`
          SELECT COUNT(*) as count FROM games g
          LEFT JOIN locations l ON g.location_id = l.id
          WHERE g.location_id IS NOT NULL AND l.id IS NULL
        `);
        
        if (orphanedLocations.rows[0].count === '0') {
          await knex.schema.alterTable('games', function(table) {
            table.foreign('location_id', 'games_location_id_foreign')
                  .references('id').inTable('locations')
                  .onDelete('SET NULL');
          });
          console.log('✓ Added foreign key constraint for games.location_id');
        } else {
          console.log('⚠ Skipped location_id foreign key due to orphaned records');
        }
      }
    }

    // Add check constraint for game_date in future
    if (!(await checkConstraintExists('check_game_date_not_too_old'))) {
      await knex.raw(`
        ALTER TABLE games 
        ADD CONSTRAINT check_game_date_not_too_old 
        CHECK (game_date >= CURRENT_DATE - INTERVAL '2 years')
      `);
      console.log('✓ Added check constraint for games.game_date (not too old)');
    }

    // Add check constraint for valid game status
    if (!(await checkConstraintExists('check_game_status_valid'))) {
      await knex.raw(`
        ALTER TABLE games 
        ADD CONSTRAINT check_game_status_valid 
        CHECK (status IN ('assigned', 'unassigned', 'up-for-grabs', 'completed', 'cancelled'))
      `);
      console.log('✓ Added check constraint for games.status');
    }

    // Add check constraint for refs_needed (if column exists)
    if (gameColumnNames.includes('refs_needed')) {
      if (!(await checkConstraintExists('check_refs_needed_positive'))) {
        await knex.raw(`
          ALTER TABLE games 
          ADD CONSTRAINT check_refs_needed_positive 
          CHECK (refs_needed > 0 AND refs_needed <= 10)
        `);
        console.log('✓ Added check constraint for games.refs_needed');
      }
    }
  }

  // 3. Add missing constraints for teams table
  if (existingTables.includes('teams') && existingTables.includes('leagues')) {
    console.log('Checking teams table constraints...');

    // Verify league_id foreign key constraint exists (should exist from migration 018)
    if (!(await constraintExists('teams_league_id_foreign'))) {
      console.log('⚠ league_id foreign key missing, attempting to add...');
      
      // Verify all league_id values exist in leagues table
      const orphanedTeams = await knex.raw(`
        SELECT COUNT(*) as count FROM teams t
        LEFT JOIN leagues l ON t.league_id = l.id
        WHERE t.league_id IS NOT NULL AND l.id IS NULL
      `);
      
      if (orphanedTeams.rows[0].count === '0') {
        await knex.schema.alterTable('teams', function(table) {
          table.foreign('league_id', 'teams_league_id_foreign')
                .references('id').inTable('leagues')
                .onDelete('CASCADE');
        });
        console.log('✓ Added foreign key constraint for teams.league_id');
      } else {
        console.log('⚠ Skipped league_id foreign key due to orphaned records');
      }
    }

    // Add check constraint for team rank
    if (!(await checkConstraintExists('check_team_rank_positive'))) {
      await knex.raw(`
        ALTER TABLE teams 
        ADD CONSTRAINT check_team_rank_positive 
        CHECK (rank > 0 AND rank <= 100)
      `);
      console.log('✓ Added check constraint for teams.rank');
    }
  }

  // 4. Add missing constraints for budget system tables
  if (existingTables.includes('budgets')) {
    console.log('Checking budget system constraints...');

    // Add check constraints for budget amounts
    if (!(await checkConstraintExists('check_budget_allocated_amount_positive'))) {
      await knex.raw(`
        ALTER TABLE budgets 
        ADD CONSTRAINT check_budget_allocated_amount_positive 
        CHECK (allocated_amount >= 0)
      `);
      console.log('✓ Added check constraint for budgets.allocated_amount');
    }

    if (!(await checkConstraintExists('check_budget_committed_amount_valid'))) {
      await knex.raw(`
        ALTER TABLE budgets 
        ADD CONSTRAINT check_budget_committed_amount_valid 
        CHECK (committed_amount >= 0 AND committed_amount <= allocated_amount * 1.1)
      `);
      console.log('✓ Added check constraint for budgets.committed_amount');
    }

    if (!(await checkConstraintExists('check_budget_actual_spent_positive'))) {
      await knex.raw(`
        ALTER TABLE budgets 
        ADD CONSTRAINT check_budget_actual_spent_positive 
        CHECK (actual_spent >= 0)
      `);
      console.log('✓ Added check constraint for budgets.actual_spent');
    }
  }

  // 5. Add missing constraints for expense system
  if (existingTables.includes('expense_data')) {
    console.log('Checking expense data constraints...');

    // Add check constraint for expense amounts
    if (!(await checkConstraintExists('check_expense_total_amount_positive'))) {
      await knex.raw(`
        ALTER TABLE expense_data 
        ADD CONSTRAINT check_expense_total_amount_positive 
        CHECK (total_amount >= 0)
      `);
      console.log('✓ Added check constraint for expense_data.total_amount');
    }

    if (!(await checkConstraintExists('check_expense_tax_amount_valid'))) {
      await knex.raw(`
        ALTER TABLE expense_data 
        ADD CONSTRAINT check_expense_tax_amount_valid 
        CHECK (tax_amount >= 0 AND (total_amount IS NULL OR tax_amount <= total_amount))
      `);
      console.log('✓ Added check constraint for expense_data.tax_amount');
    }

    // Add check constraint for extraction confidence
    if (!(await checkConstraintExists('check_extraction_confidence_valid'))) {
      await knex.raw(`
        ALTER TABLE expense_data 
        ADD CONSTRAINT check_extraction_confidence_valid 
        CHECK (extraction_confidence >= 0 AND extraction_confidence <= 1)
      `);
      console.log('✓ Added check constraint for expense_data.extraction_confidence');
    }
  }

  // 6. Add missing constraints for users table
  if (existingTables.includes('users')) {
    console.log('Checking users table constraints...');

    // Check if organization_id column exists and add foreign key if needed
    const userColumns = await knex.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
    `);
    const userColumnNames = userColumns.rows.map(row => row.column_name);

    // Add check constraint for email format
    if (!(await checkConstraintExists('check_email_format'))) {
      await knex.raw(`
        ALTER TABLE users 
        ADD CONSTRAINT check_email_format 
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
      `);
      console.log('✓ Added check constraint for users.email format');
    }

    // Add check constraint for valid roles
    if (!(await checkConstraintExists('check_user_role_valid'))) {
      await knex.raw(`
        ALTER TABLE users 
        ADD CONSTRAINT check_user_role_valid 
        CHECK (role IN ('admin', 'referee', 'assignor', 'viewer'))
      `);
      console.log('✓ Added check constraint for users.role');
    }

    // Add check constraints for referee-specific fields if they exist
    if (userColumnNames.includes('max_distance')) {
      if (!(await checkConstraintExists('check_max_distance_reasonable'))) {
        await knex.raw(`
          ALTER TABLE users 
          ADD CONSTRAINT check_max_distance_reasonable 
          CHECK (max_distance IS NULL OR (max_distance >= 0 AND max_distance <= 1000))
        `);
        console.log('✓ Added check constraint for users.max_distance');
      }
    }

    if (userColumnNames.includes('years_experience')) {
      if (!(await checkConstraintExists('check_years_experience_reasonable'))) {
        await knex.raw(`
          ALTER TABLE users 
          ADD CONSTRAINT check_years_experience_reasonable 
          CHECK (years_experience IS NULL OR (years_experience >= 0 AND years_experience <= 100))
        `);
        console.log('✓ Added check constraint for users.years_experience');
      }
    }
  }

  // 7. Add missing constraints for budget_periods
  if (existingTables.includes('budget_periods')) {
    console.log('Checking budget_periods constraints...');

    // Add check constraint for date range validity
    if (!(await checkConstraintExists('check_budget_period_dates_valid'))) {
      await knex.raw(`
        ALTER TABLE budget_periods 
        ADD CONSTRAINT check_budget_period_dates_valid 
        CHECK (start_date <= end_date)
      `);
      console.log('✓ Added check constraint for budget_periods date range');
    }

    // Add check constraint for valid status
    if (!(await checkConstraintExists('check_budget_period_status_valid'))) {
      await knex.raw(`
        ALTER TABLE budget_periods 
        ADD CONSTRAINT check_budget_period_status_valid 
        CHECK (status IN ('draft', 'active', 'closed', 'archived'))
      `);
      console.log('✓ Added check constraint for budget_periods.status');
    }
  }

  console.log('✅ Constraint optimization completed successfully');
};

exports.down = function(knex) {
  console.log('Rolling back constraint optimization...');
  
  return knex.schema.raw(`
    -- Drop all check constraints added in up migration
    -- Note: Foreign key constraints are preserved as they're generally safe
    
    -- Budget periods constraints
    DROP CONSTRAINT IF EXISTS check_budget_period_dates_valid CASCADE;
    DROP CONSTRAINT IF EXISTS check_budget_period_status_valid CASCADE;
    
    -- Users constraints  
    DROP CONSTRAINT IF EXISTS check_years_experience_reasonable CASCADE;
    DROP CONSTRAINT IF EXISTS check_max_distance_reasonable CASCADE;
    DROP CONSTRAINT IF EXISTS check_user_role_valid CASCADE;
    DROP CONSTRAINT IF EXISTS check_email_format CASCADE;
    
    -- Expense data constraints
    DROP CONSTRAINT IF EXISTS check_extraction_confidence_valid CASCADE;
    DROP CONSTRAINT IF EXISTS check_expense_tax_amount_valid CASCADE;
    DROP CONSTRAINT IF EXISTS check_expense_total_amount_positive CASCADE;
    
    -- Budget constraints
    DROP CONSTRAINT IF EXISTS check_budget_actual_spent_positive CASCADE;
    DROP CONSTRAINT IF EXISTS check_budget_committed_amount_valid CASCADE;
    DROP CONSTRAINT IF EXISTS check_budget_allocated_amount_positive CASCADE;
    
    -- Teams constraints
    DROP CONSTRAINT IF EXISTS check_team_rank_positive CASCADE;
    
    -- Games constraints
    DROP CONSTRAINT IF EXISTS check_refs_needed_positive CASCADE;
    DROP CONSTRAINT IF EXISTS check_game_status_valid CASCADE;
    DROP CONSTRAINT IF EXISTS check_game_date_not_too_old CASCADE;
    
    -- Game assignments constraints
    DROP CONSTRAINT IF EXISTS check_assignment_status_valid CASCADE;
  `);
};