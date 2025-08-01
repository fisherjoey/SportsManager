/**
 * Migration: Add Critical Performance Indexes - Package 1A Database Optimization
 * 
 * This migration adds critical performance indexes for frequently queried columns
 * and common query patterns based on application analysis.
 * 
 * IMPORTANT: This migration checks for existing indexes to avoid conflicts
 * with previously created indexes in the system.
 */

exports.up = async function(knex) {
  console.log('Creating critical performance indexes for Package 1A optimization...');

  // Check which tables exist before creating indexes
  const tables = await knex.raw(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  `);
  
  const existingTables = tables.rows.map(row => row.table_name);
  console.log('Found tables:', existingTables);

  // Games table performance indexes
  if (existingTables.includes('games')) {
    // Check existing indexes to avoid duplicates
    const existingIndexes = await knex.raw(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'games' AND schemaname = 'public'
    `);
    const indexNames = existingIndexes.rows.map(row => row.indexname);
    
    if (!indexNames.includes('idx_games_date_location')) {
      await knex.schema.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_date_location 
        ON games(game_date, location);
      `);
      console.log('✓ Created idx_games_date_location');
    }
    
    if (!indexNames.includes('idx_games_status_date')) {
      await knex.schema.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_status_date 
        ON games(status, game_date);
      `);
      console.log('✓ Created idx_games_status_date');
    }
  }

  // Game assignments table performance indexes
  if (existingTables.includes('game_assignments')) {
    const existingIndexes = await knex.raw(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'game_assignments' AND schemaname = 'public'
    `);
    const indexNames = existingIndexes.rows.map(row => row.indexname);
    
    if (!indexNames.includes('idx_assignments_status_date')) {
      await knex.schema.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_status_date 
        ON game_assignments(status, created_at);
      `);
      console.log('✓ Created idx_assignments_status_date');
    }
    
    if (!indexNames.includes('idx_assignments_user_game')) {
      await knex.schema.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_user_game 
        ON game_assignments(user_id, game_id);
      `);
      console.log('✓ Created idx_assignments_user_game');
    }
  }

  // Users table performance indexes
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
    
    // Only create if both role and is_available columns exist
    if (userColumnNames.includes('role') && userColumnNames.includes('is_available') && 
        !indexNames.includes('idx_users_role_available')) {
      await knex.schema.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_available 
        ON users(role, is_available);
      `);
      console.log('✓ Created idx_users_role_available');
    }
    
    if (!indexNames.includes('idx_users_email_role')) {
      await knex.schema.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_role 
        ON users(email, role);
      `);
      console.log('✓ Created idx_users_email_role');
    }
  }

  // Teams table performance indexes
  if (existingTables.includes('teams')) {
    const existingIndexes = await knex.raw(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'teams' AND schemaname = 'public'
    `);
    const indexNames = existingIndexes.rows.map(row => row.indexname);
    
    if (!indexNames.includes('idx_teams_league_rank')) {
      await knex.schema.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_league_rank 
        ON teams(league_id, rank);
      `);
      console.log('✓ Created idx_teams_league_rank');
    }
  }

  // Budgets table performance indexes
  if (existingTables.includes('budgets')) {
    const existingIndexes = await knex.raw(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'budgets' AND schemaname = 'public'
    `);
    const indexNames = existingIndexes.rows.map(row => row.indexname);
    
    if (!indexNames.includes('idx_budgets_org_period')) {
      await knex.schema.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budgets_org_period 
        ON budgets(organization_id, budget_period_id);
      `);
      console.log('✓ Created idx_budgets_org_period');
    }
  }

  // Expense data table performance indexes
  if (existingTables.includes('expense_data')) {
    // Check which columns exist in expense_data table
    const expenseColumns = await knex.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'expense_data' AND table_schema = 'public'
    `);
    const expenseColumnNames = expenseColumns.rows.map(row => row.column_name);
    
    const existingIndexes = await knex.raw(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'expense_data' AND schemaname = 'public'
    `);
    const indexNames = existingIndexes.rows.map(row => row.indexname);
    
    // Only create if both status and transaction_date columns exist
    if (expenseColumnNames.includes('status') && expenseColumnNames.includes('transaction_date') && 
        !indexNames.includes('idx_expenses_status_date')) {
      await knex.schema.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_status_date 
        ON expense_data(status, transaction_date);
      `);
      console.log('✓ Created idx_expenses_status_date');
    } else if (!expenseColumnNames.includes('status')) {
      // If no status column, create an index optimized for expense queries
      if (!indexNames.includes('idx_expenses_date_amount')) {
        await knex.schema.raw(`
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_date_amount 
          ON expense_data(transaction_date, total_amount);
        `);
        console.log('✓ Created idx_expenses_date_amount (alternative to status_date)');
      }
    }
  }

  console.log('✅ Critical performance indexes created successfully');
};

exports.down = function(knex) {
  return knex.schema.raw(`
    -- Drop all performance indexes created in up migration
    -- Note: Using IF EXISTS to prevent errors if indexes don't exist
    DROP INDEX CONCURRENTLY IF EXISTS idx_expenses_date_amount;
    DROP INDEX CONCURRENTLY IF EXISTS idx_expenses_status_date;
    DROP INDEX CONCURRENTLY IF EXISTS idx_budgets_org_period;
    DROP INDEX CONCURRENTLY IF EXISTS idx_teams_league_rank;
    DROP INDEX CONCURRENTLY IF EXISTS idx_users_email_role;
    DROP INDEX CONCURRENTLY IF EXISTS idx_users_role_available;
    DROP INDEX CONCURRENTLY IF EXISTS idx_assignments_user_game;
    DROP INDEX CONCURRENTLY IF EXISTS idx_assignments_status_date;
    DROP INDEX CONCURRENTLY IF EXISTS idx_games_status_date;
    DROP INDEX CONCURRENTLY IF EXISTS idx_games_date_location;
  `);
};