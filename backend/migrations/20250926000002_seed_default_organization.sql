-- Seed: Default Organization and Data Migration
-- Date: 2025-09-26
-- Description: Create default organization and migrate existing data
-- Prerequisites: Must run after 20250926000001_add_multi_tenancy.sql

-- ============================================================================
-- STEP 1: Create Default Organization
-- ============================================================================

INSERT INTO organizations (id, name, slug, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',  -- Predictable ID for default org
  'Default Organization',
  'default',
  '{"timezone": "America/New_York", "is_default": true}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Store default org ID for later use
DO $$
DECLARE
  default_org_id UUID;
BEGIN
  SELECT id INTO default_org_id FROM organizations WHERE slug = 'default';
  RAISE NOTICE 'Default Organization ID: %', default_org_id;
END $$;

-- ============================================================================
-- STEP 2: Create Default Region (Optional, if applicable)
-- ============================================================================

-- Uncomment if you want a default region
-- INSERT INTO regions (id, organization_id, name, slug, settings)
-- VALUES (
--   '00000000-0000-0000-0000-000000000002',
--   '00000000-0000-0000-0000-000000000001',
--   'Default Region',
--   'default',
--   '{}'::jsonb
-- )
-- ON CONFLICT (organization_id, slug) DO NOTHING;

-- ============================================================================
-- STEP 3: Migrate Existing Users
-- ============================================================================

UPDATE users
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

RAISE NOTICE 'Migrated % users to default organization',
  (SELECT COUNT(*) FROM users WHERE organization_id = '00000000-0000-0000-0000-000000000001');

-- ============================================================================
-- STEP 4: Migrate Existing Games
-- ============================================================================

UPDATE games
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

RAISE NOTICE 'Migrated % games to default organization',
  (SELECT COUNT(*) FROM games WHERE organization_id = '00000000-0000-0000-0000-000000000001');

-- ============================================================================
-- STEP 5: Migrate Existing Assignments
-- ============================================================================

UPDATE assignments
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

RAISE NOTICE 'Migrated % assignments to default organization',
  (SELECT COUNT(*) FROM assignments WHERE organization_id = '00000000-0000-0000-0000-000000000001');

-- ============================================================================
-- STEP 6: Migrate Existing Referees (if exists)
-- ============================================================================

DO $$
DECLARE
  referee_count INT;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'referees') THEN
    UPDATE referees
    SET organization_id = '00000000-0000-0000-0000-000000000001'
    WHERE organization_id IS NULL;

    SELECT COUNT(*) INTO referee_count
    FROM referees
    WHERE organization_id = '00000000-0000-0000-0000-000000000001';

    RAISE NOTICE 'Migrated % referees to default organization', referee_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Migrate Existing Expenses
-- ============================================================================

UPDATE expenses
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

RAISE NOTICE 'Migrated % expenses to default organization',
  (SELECT COUNT(*) FROM expenses WHERE organization_id = '00000000-0000-0000-0000-000000000001');

-- ============================================================================
-- STEP 8: Migrate Existing Budgets
-- ============================================================================

UPDATE budgets
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

RAISE NOTICE 'Migrated % budgets to default organization',
  (SELECT COUNT(*) FROM budgets WHERE organization_id = '00000000-0000-0000-0000-000000000001');

-- ============================================================================
-- STEP 9: Verify Data Integrity
-- ============================================================================

DO $$
DECLARE
  orphaned_users INT;
  orphaned_games INT;
  orphaned_assignments INT;
BEGIN
  -- Check for orphaned records (shouldn't happen if migration worked)
  SELECT COUNT(*) INTO orphaned_users FROM users WHERE organization_id IS NULL;
  SELECT COUNT(*) INTO orphaned_games FROM games WHERE organization_id IS NULL;
  SELECT COUNT(*) INTO orphaned_assignments FROM assignments WHERE organization_id IS NULL;

  IF orphaned_users > 0 THEN
    RAISE WARNING 'Found % users without organization_id', orphaned_users;
  END IF;

  IF orphaned_games > 0 THEN
    RAISE WARNING 'Found % games without organization_id', orphaned_games;
  END IF;

  IF orphaned_assignments > 0 THEN
    RAISE WARNING 'Found % assignments without organization_id', orphaned_assignments;
  END IF;

  IF orphaned_users = 0 AND orphaned_games = 0 AND orphaned_assignments = 0 THEN
    RAISE NOTICE 'Data integrity verified: All records have organization_id';
  END IF;
END $$;

-- ============================================================================
-- STEP 10: Summary Report
-- ============================================================================

DO $$
DECLARE
  total_orgs INT;
  total_users INT;
  total_games INT;
  total_assignments INT;
BEGIN
  SELECT COUNT(*) INTO total_orgs FROM organizations;
  SELECT COUNT(*) INTO total_users FROM users WHERE organization_id IS NOT NULL;
  SELECT COUNT(*) INTO total_games FROM games WHERE organization_id IS NOT NULL;
  SELECT COUNT(*) INTO total_assignments FROM assignments WHERE organization_id IS NOT NULL;

  RAISE NOTICE '';
  RAISE NOTICE '====== MIGRATION SUMMARY ======';
  RAISE NOTICE 'Organizations: %', total_orgs;
  RAISE NOTICE 'Users migrated: %', total_users;
  RAISE NOTICE 'Games migrated: %', total_games;
  RAISE NOTICE 'Assignments migrated: %', total_assignments;
  RAISE NOTICE '================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Optionally make organization_id NOT NULL on tables';
END $$;

-- ============================================================================
-- Seed Complete
-- ============================================================================