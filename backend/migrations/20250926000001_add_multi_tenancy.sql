-- Migration: Add Multi-Tenancy Support
-- Date: 2025-09-26
-- Description: Add organizations, regions, and multi-tenancy columns to existing tables
-- Part of: Cerbos Authorization Rebase (Stage 1)

-- ============================================================================
-- STEP 1: Create New Tables
-- ============================================================================

-- Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Regions Table
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  parent_region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- User Region Assignments Table
CREATE TABLE IF NOT EXISTS user_region_assignments (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP,
  PRIMARY KEY (user_id, region_id, role)
);

-- ============================================================================
-- STEP 2: Add Columns to Existing Tables (Nullable First)
-- ============================================================================

-- Users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS primary_region_id UUID REFERENCES regions(id) ON DELETE SET NULL;

-- Games
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Assignments
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Referees (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'referees') THEN
    ALTER TABLE referees
      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS primary_region_id UUID REFERENCES regions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Expenses
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Budgets
ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 3: Create Indexes for Performance
-- ============================================================================

-- Organizations
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Regions
CREATE INDEX IF NOT EXISTS idx_regions_organization ON regions(organization_id);
CREATE INDEX IF NOT EXISTS idx_regions_parent ON regions(parent_region_id);
CREATE INDEX IF NOT EXISTS idx_regions_slug ON regions(organization_id, slug);

-- User Region Assignments
CREATE INDEX IF NOT EXISTS idx_user_region_assignments_user ON user_region_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_region_assignments_region ON user_region_assignments(region_id);
CREATE INDEX IF NOT EXISTS idx_user_region_assignments_role ON user_region_assignments(role);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_region ON users(primary_region_id);

-- Games
CREATE INDEX IF NOT EXISTS idx_games_organization ON games(organization_id);
CREATE INDEX IF NOT EXISTS idx_games_region ON games(region_id);
CREATE INDEX IF NOT EXISTS idx_games_created_by ON games(created_by);
CREATE INDEX IF NOT EXISTS idx_games_org_region ON games(organization_id, region_id);

-- Assignments
CREATE INDEX IF NOT EXISTS idx_assignments_organization ON assignments(organization_id);

-- Referees
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'referees') THEN
    CREATE INDEX IF NOT EXISTS idx_referees_organization ON referees(organization_id);
    CREATE INDEX IF NOT EXISTS idx_referees_region ON referees(primary_region_id);
  END IF;
END $$;

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_organization ON expenses(organization_id);

-- Budgets
CREATE INDEX IF NOT EXISTS idx_budgets_organization ON budgets(organization_id);

-- ============================================================================
-- STEP 4: Add Triggers for updated_at
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_regions_updated_at ON regions;
CREATE TRIGGER update_regions_updated_at
  BEFORE UPDATE ON regions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 5: Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE organizations IS 'Multi-tenant organizations. Each org has isolated data.';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN organizations.settings IS 'Org-specific settings (timezone, payment model, etc.)';

COMMENT ON TABLE regions IS 'Geographic or organizational regions within an organization';
COMMENT ON COLUMN regions.parent_region_id IS 'For hierarchical regions (e.g., State > County)';

COMMENT ON TABLE user_region_assignments IS 'Assigns users specific roles in specific regions';
COMMENT ON COLUMN user_region_assignments.role IS 'Region-specific role (assignor, coordinator, etc.)';
COMMENT ON COLUMN user_region_assignments.expires_at IS 'For temporary assignments';

COMMENT ON COLUMN users.organization_id IS 'Primary organization for user';
COMMENT ON COLUMN users.primary_region_id IS 'User''s primary region';

COMMENT ON COLUMN games.organization_id IS 'Organization hosting the game';
COMMENT ON COLUMN games.region_id IS 'Region where game is played';
COMMENT ON COLUMN games.created_by IS 'User who created the game';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Multi-tenancy migration completed successfully';
  RAISE NOTICE 'Next step: Run seed data script to create default organization';
END $$;