-- Migration to remove legacy role system
-- WARNING: This will remove the role column from users table
-- Make sure all users have been assigned roles in the new RBAC system first

-- Drop the legacy role column
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Verify the change
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;