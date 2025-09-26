-- Rollback: Remove Multi-Tenancy Support
-- Date: 2025-09-26
-- Description: Rollback multi-tenancy changes
-- WARNING: This will delete all organization and region data!

-- ============================================================================
-- STEP 1: Drop Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
DROP TRIGGER IF EXISTS update_regions_updated_at ON regions;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================================================
-- STEP 2: Drop Indexes
-- ============================================================================

-- Organizations
DROP INDEX IF EXISTS idx_organizations_slug;

-- Regions
DROP INDEX IF EXISTS idx_regions_organization;
DROP INDEX IF EXISTS idx_regions_parent;
DROP INDEX IF EXISTS idx_regions_slug;

-- User Region Assignments
DROP INDEX IF EXISTS idx_user_region_assignments_user;
DROP INDEX IF EXISTS idx_user_region_assignments_region;
DROP INDEX IF EXISTS idx_user_region_assignments_role;

-- Users
DROP INDEX IF EXISTS idx_users_organization;
DROP INDEX IF EXISTS idx_users_region;

-- Games
DROP INDEX IF EXISTS idx_games_organization;
DROP INDEX IF EXISTS idx_games_region;
DROP INDEX IF EXISTS idx_games_created_by;
DROP INDEX IF EXISTS idx_games_org_region;

-- Assignments
DROP INDEX IF EXISTS idx_assignments_organization;

-- Referees
DROP INDEX IF EXISTS idx_referees_organization;
DROP INDEX IF EXISTS idx_referees_region;

-- Expenses
DROP INDEX IF EXISTS idx_expenses_organization;

-- Budgets
DROP INDEX IF EXISTS idx_budgets_organization;

-- ============================================================================
-- STEP 3: Remove Columns from Existing Tables
-- ============================================================================

-- Users
ALTER TABLE users
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS primary_region_id;

-- Games
ALTER TABLE games
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS region_id,
  DROP COLUMN IF EXISTS created_by;

-- Assignments
ALTER TABLE assignments
  DROP COLUMN IF EXISTS organization_id;

-- Referees
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'referees') THEN
    ALTER TABLE referees
      DROP COLUMN IF EXISTS organization_id,
      DROP COLUMN IF EXISTS primary_region_id;
  END IF;
END $$;

-- Expenses
ALTER TABLE expenses
  DROP COLUMN IF EXISTS organization_id;

-- Budgets
ALTER TABLE budgets
  DROP COLUMN IF EXISTS organization_id;

-- ============================================================================
-- STEP 4: Drop Tables (Order matters due to foreign keys)
-- ============================================================================

DROP TABLE IF EXISTS user_region_assignments CASCADE;
DROP TABLE IF EXISTS regions CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ============================================================================
-- Rollback Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Multi-tenancy rollback completed successfully';
  RAISE NOTICE 'All organization and region data has been removed';
END $$;