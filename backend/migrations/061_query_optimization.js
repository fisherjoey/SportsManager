/**
 * Migration: Add Composite Indexes for Query Optimization - Package 1A Database Optimization
 * 
 * This migration adds composite indexes for common WHERE clause patterns
 * identified through query analysis. These indexes optimize complex queries
 * that filter on multiple columns simultaneously.
 */

exports.up = async function(knex) {
  console.log('Creating composite indexes for query optimization...');

  // Check which tables exist before creating indexes
  const tables = await knex.raw(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  `);
  
  const existingTables = tables.rows.map(row => row.table_name);

  // Game assignments compound index for complex assignment queries
  if (existingTables.includes('game_assignments')) {
    // Check for existing compound indexes
    const existingIndexes = await knex.raw(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'game_assignments' AND schemaname = 'public'
    `);
    const indexNames = existingIndexes.rows.map(row => row.indexname);
    
    if (!indexNames.includes('idx_game_assignments_compound')) {
      await knex.schema.raw(`
        CREATE INDEX  IF NOT EXISTS idx_game_assignments_compound 
        ON game_assignments(game_id, user_id, status);
      `);
      console.log('✓ Created idx_game_assignments_compound for complex assignment queries');
    }

    // Additional compound index for assignment lookups by user and status with date
    if (!indexNames.includes('idx_assignments_user_status_date')) {
      await knex.schema.raw(`
        CREATE INDEX  IF NOT EXISTS idx_assignments_user_status_date 
        ON game_assignments(user_id, status, created_at DESC);
      `);
      console.log('✓ Created idx_assignments_user_status_date for user assignment history');
    }
  }

  // Games compound index for location, date, and status filtering
  if (existingTables.includes('games')) {
    const existingIndexes = await knex.raw(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'games' AND schemaname = 'public'
    `);
    const indexNames = existingIndexes.rows.map(row => row.indexname);
    
    if (!indexNames.includes('idx_games_compound')) {
      await knex.schema.raw(`
        CREATE INDEX  IF NOT EXISTS idx_games_compound 
        ON games(location, game_date, status);
      `);
      console.log('✓ Created idx_games_compound for location-date-status queries');
    }

    // Additional compound index for game scheduling queries
    if (!indexNames.includes('idx_games_date_level_status')) {
      await knex.schema.raw(`
        CREATE INDEX  IF NOT EXISTS idx_games_date_level_status 
        ON games(game_date, level, status) 
        WHERE status IN ('unassigned', 'assigned');
      `);
      console.log('✓ Created idx_games_date_level_status for scheduling queries');
    }

    // Check if location_id column exists for location-based queries
    const gameColumns = await knex.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'games' AND table_schema = 'public'
    `);
    const gameColumnNames = gameColumns.rows.map(row => row.column_name);
    
    if (gameColumnNames.includes('location_id') && !indexNames.includes('idx_games_location_date_level')) {
      await knex.schema.raw(`
        CREATE INDEX  IF NOT EXISTS idx_games_location_date_level 
        ON games(location_id, game_date, level) 
        WHERE location_id IS NOT NULL;
      `);
      console.log('✓ Created idx_games_location_date_level for location-based scheduling');
    }
  }

  // Users compound index for role, availability, and organization queries
  if (existingTables.includes('users')) {
    // Check which columns exist in users table
    const userColumns = await knex.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
    `);
    const userColumnNames = userColumns.rows.map(row => row.column_name);
    
    const existingIndexes = await knex.raw(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'users' AND schemaname = 'public'
    `);
    const indexNames = existingIndexes.rows.map(row => row.indexname);
    
    // Create compound index if all required columns exist
    if (userColumnNames.includes('role') && 
        userColumnNames.includes('is_available') && 
        userColumnNames.includes('organization_id') && 
        !indexNames.includes('idx_users_compound')) {
      await knex.schema.raw(`
        CREATE INDEX  IF NOT EXISTS idx_users_compound 
        ON users(role, is_available, organization_id);
      `);
      console.log('✓ Created idx_users_compound for role-availability-org queries');
    }

    // Alternative compound index for referee selection queries
    if (userColumnNames.includes('role') && 
        userColumnNames.includes('organization_id') && 
        !indexNames.includes('idx_users_role_org_created')) {
      await knex.schema.raw(`
        CREATE INDEX  IF NOT EXISTS idx_users_role_org_created 
        ON users(role, organization_id, created_at DESC) 
        WHERE role = 'referee';
      `);
      console.log('✓ Created idx_users_role_org_created for referee selection');
    }
  }

  // Budget system compound indexes for financial reporting
  if (existingTables.includes('budgets')) {
    const existingIndexes = await knex.raw(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'budgets' AND schemaname = 'public'
    `);
    const indexNames = existingIndexes.rows.map(row => row.indexname);
    
    if (!indexNames.includes('idx_budgets_period_category_status')) {
      await knex.schema.raw(`
        CREATE INDEX  IF NOT EXISTS idx_budgets_period_category_status 
        ON budgets(budget_period_id, category_id, status);
      `);
      console.log('✓ Created idx_budgets_period_category_status for budget reporting');
    }

    if (!indexNames.includes('idx_budgets_org_status_owner')) {
      await knex.schema.raw(`
        CREATE INDEX  IF NOT EXISTS idx_budgets_org_status_owner 
        ON budgets(organization_id, status, owner_id) 
        WHERE owner_id IS NOT NULL;
      `);
      console.log('✓ Created idx_budgets_org_status_owner for budget management');
    }
  }

  // Expense data compound indexes for expense analysis
  if (existingTables.includes('expense_data')) {
    const existingIndexes = await knex.raw(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'expense_data' AND schemaname = 'public'
    `);
    const indexNames = existingIndexes.rows.map(row => row.indexname);
    
    if (!indexNames.includes('idx_expense_data_org_date_category')) {
      await knex.schema.raw(`
        CREATE INDEX  IF NOT EXISTS idx_expense_data_org_date_category 
        ON expense_data(organization_id, transaction_date DESC, category_id) 
        WHERE category_id IS NOT NULL;
      `);
      console.log('✓ Created idx_expense_data_org_date_category for expense reporting');
    }

    if (!indexNames.includes('idx_expense_data_user_reimbursable_date')) {
      await knex.schema.raw(`
        CREATE INDEX  IF NOT EXISTS idx_expense_data_user_reimbursable_date 
        ON expense_data(user_id, reimbursable, transaction_date DESC) 
        WHERE reimbursable = true;
      `);
      console.log('✓ Created idx_expense_data_user_reimbursable_date for reimbursement queries');
    }
  }

  // Teams and leagues compound indexes for team management
  if (existingTables.includes('teams') && existingTables.includes('leagues')) {
    const existingTeamsIndexes = await knex.raw(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'teams' AND schemaname = 'public'
    `);
    const teamsIndexNames = existingTeamsIndexes.rows.map(row => row.indexname);
    
    if (!teamsIndexNames.includes('idx_teams_league_rank_name')) {
      await knex.schema.raw(`
        CREATE INDEX  IF NOT EXISTS idx_teams_league_rank_name 
        ON teams(league_id, rank, name);
      `);
      console.log('✓ Created idx_teams_league_rank_name for team standings');
    }
  }

  // Budget periods compound index for period management
  if (existingTables.includes('budget_periods')) {
    const existingIndexes = await knex.raw(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'budget_periods' AND schemaname = 'public'
    `);
    const indexNames = existingIndexes.rows.map(row => row.indexname);
    
    if (!indexNames.includes('idx_budget_periods_org_status_dates')) {
      await knex.schema.raw(`
        CREATE INDEX  IF NOT EXISTS idx_budget_periods_org_status_dates 
        ON budget_periods(organization_id, status, start_date, end_date);
      `);
      console.log('✓ Created idx_budget_periods_org_status_dates for period queries');
    }
  }

  console.log('✅ Composite indexes for query optimization created successfully');
};

exports.down = function(knex) {
  return knex.schema.raw(`
    -- Drop all composite indexes created in up migration
    -- Note: Using  and IF EXISTS to prevent blocking and errors
    DROP INDEX  IF EXISTS idx_budget_periods_org_status_dates;
    DROP INDEX  IF EXISTS idx_teams_league_rank_name;
    DROP INDEX  IF EXISTS idx_expense_data_user_reimbursable_date;
    DROP INDEX  IF EXISTS idx_expense_data_org_date_category;
    DROP INDEX  IF EXISTS idx_budgets_org_status_owner;
    DROP INDEX  IF EXISTS idx_budgets_period_category_status;
    DROP INDEX  IF EXISTS idx_users_role_org_created;
    DROP INDEX  IF EXISTS idx_users_compound;
    DROP INDEX  IF EXISTS idx_games_location_date_level;
    DROP INDEX  IF EXISTS idx_games_date_level_status;
    DROP INDEX  IF EXISTS idx_games_compound;
    DROP INDEX  IF EXISTS idx_assignments_user_status_date;
    DROP INDEX  IF EXISTS idx_game_assignments_compound;
  `);
};