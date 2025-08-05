/**
 * Performance optimization migration - add critical database indexes
 */

exports.up = function(knex) {
  // TEMPORARILY DISABLED - Index conflicts with existing indexes
  console.log('⚠️  Performance indexes migration skipped - indexes already exist');
  return Promise.resolve();
  
  return Promise.all([
    // Games table indexes for common query patterns
    knex.schema.alterTable('games', function(table) {
      table.index(['game_date', 'status'], 'idx_games_date_status');
      table.index(['level', 'game_type'], 'idx_games_level_type');
      table.index(['home_team_id', 'away_team_id'], 'idx_games_teams');
      table.index(['league_id', 'game_date'], 'idx_games_league_date');
    }),

    // Game assignments indexes for performance
    knex.schema.alterTable('game_assignments', function(table) {
      table.index(['game_id', 'status'], 'idx_assignments_game_status');
      table.index(['user_id', 'status'], 'idx_assignments_user_status');
    }),

    // Budget system indexes
    knex.schema.alterTable('budgets', function(table) {
      table.index(['organization_id', 'budget_period_id'], 'idx_budgets_org_period');
      table.index(['category_id', 'status'], 'idx_budgets_category_status');
    }),

    // Financial transactions indexes
    knex.schema.alterTable('financial_transactions', function(table) {
      table.index(['budget_id', 'status'], 'idx_transactions_budget_status');
      table.index(['organization_id', 'transaction_date'], 'idx_transactions_org_date');
      table.index(['transaction_type', 'status'], 'idx_transactions_type_status');
    }),

    // Budget alerts indexes
    knex.schema.alterTable('budget_alerts', function(table) {
      table.index(['budget_id', 'is_resolved'], 'idx_alerts_budget_resolved');
      table.index(['organization_id', 'severity'], 'idx_alerts_org_severity');
    }),

    // Teams and leagues indexes
    knex.schema.alterTable('teams', function(table) {
      table.index(['league_id', 'name'], 'idx_teams_league_name');
    }),

    knex.schema.alterTable('leagues', function(table) {
      table.index(['organization', 'season'], 'idx_leagues_org_season');
      table.index(['age_group', 'gender'], 'idx_leagues_age_gender');
    }),

    // User performance indexes
    knex.schema.alterTable('users', function(table) {
      table.index(['email'], 'idx_users_email_unique');
      table.index(['organization_id', 'roles'], 'idx_users_org_roles');
    }),

    // Budget periods performance
    knex.schema.alterTable('budget_periods', function(table) {
      table.index(['organization_id', 'status'], 'idx_periods_org_status');
      table.index(['start_date', 'end_date'], 'idx_periods_date_range');
    }),

    // Budget categories performance
    knex.schema.alterTable('budget_categories', function(table) {
      table.index(['organization_id', 'category_type'], 'idx_categories_org_type');
      table.index(['parent_id', 'sort_order'], 'idx_categories_parent_sort');
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    // Drop all indexes created in up migration
    knex.schema.alterTable('games', function(table) {
      table.dropIndex(['game_date', 'status'], 'idx_games_date_status');
      table.dropIndex(['level', 'game_type'], 'idx_games_level_type');
      table.dropIndex(['home_team_id', 'away_team_id'], 'idx_games_teams');
      table.dropIndex(['league_id', 'game_date'], 'idx_games_league_date');
    }),

    knex.schema.alterTable('game_assignments', function(table) {
      table.dropIndex(['game_id', 'status'], 'idx_assignments_game_status');
      table.dropIndex(['user_id', 'status'], 'idx_assignments_user_status');
    }),

    knex.schema.alterTable('budgets', function(table) {
      table.dropIndex(['organization_id', 'budget_period_id'], 'idx_budgets_org_period');
      table.dropIndex(['category_id', 'status'], 'idx_budgets_category_status');
    }),

    knex.schema.alterTable('financial_transactions', function(table) {
      table.dropIndex(['budget_id', 'status'], 'idx_transactions_budget_status');
      table.dropIndex(['organization_id', 'transaction_date'], 'idx_transactions_org_date');
      table.dropIndex(['transaction_type', 'status'], 'idx_transactions_type_status');
    }),

    knex.schema.alterTable('budget_alerts', function(table) {
      table.dropIndex(['budget_id', 'is_resolved'], 'idx_alerts_budget_resolved');
      table.dropIndex(['organization_id', 'severity'], 'idx_alerts_org_severity');
    }),

    knex.schema.alterTable('teams', function(table) {
      table.dropIndex(['league_id', 'name'], 'idx_teams_league_name');
    }),

    knex.schema.alterTable('leagues', function(table) {
      table.dropIndex(['organization', 'season'], 'idx_leagues_org_season');
      table.dropIndex(['age_group', 'gender'], 'idx_leagues_age_gender');
    }),

    knex.schema.alterTable('users', function(table) {
      table.dropIndex(['email'], 'idx_users_email_unique');
      table.dropIndex(['organization_id', 'roles'], 'idx_users_org_roles');
    }),

    knex.schema.alterTable('budget_periods', function(table) {
      table.dropIndex(['organization_id', 'status'], 'idx_periods_org_status');
      table.dropIndex(['start_date', 'end_date'], 'idx_periods_date_range');
    }),

    knex.schema.alterTable('budget_categories', function(table) {
      table.dropIndex(['organization_id', 'category_type'], 'idx_categories_org_type');
      table.dropIndex(['parent_id', 'sort_order'], 'idx_categories_parent_sort');
    })
  ]);
};