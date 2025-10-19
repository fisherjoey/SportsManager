#!/bin/bash

# RBAC Registry Deletion Script
# Safely removes the unused RBAC Registry system
# Generated: 2025-10-18

set -e  # Exit on error

echo "🗑️  RBAC Registry Deletion Script"
echo "================================="
echo ""

# Phase 1: Comment out route in app.ts
echo "Phase 1: Updating app.ts..."
sed -i 's/^import adminRBACRegistryRoutes/\/\/ REMOVED: import adminRBACRegistryRoutes/' backend/src/app.ts
sed -i "s/^app.use('\/api\/admin\/rbac-registry'/\/\/ REMOVED: app.use('\/api\/admin\/rbac-registry'/" backend/src/app.ts
echo "  ✅ app.ts updated"

# Phase 2: Delete backend files
echo ""
echo "Phase 2: Deleting backend files..."
rm -f backend/src/routes/admin/rbac-registry.ts
echo "  ✅ Deleted backend/src/routes/admin/rbac-registry.ts"

rm -f backend/src/services/RBACRegistryService.ts
echo "  ✅ Deleted backend/src/services/RBACRegistryService.ts"

rm -f backend/src/startup/rbac-scanner-init.ts
echo "  ✅ Deleted backend/src/startup/rbac-scanner-init.ts"

# Phase 3: Delete frontend files
echo ""
echo "Phase 3: Deleting frontend files..."
rm -f frontend/components/admin/rbac/RBACRegistryDashboard.tsx
echo "  ✅ Deleted frontend/components/admin/rbac/RBACRegistryDashboard.tsx"

# Phase 4: Create database migration
echo ""
echo "Phase 4: Creating database migration..."
cat > backend/migrations/20251018000000_drop_rbac_registry_tables.js << 'EOF'
/**
 * Migration: Drop RBAC Registry Tables
 *
 * Removes the RBAC Registry system tables that are no longer needed
 * after migration to Cerbos.
 */

exports.up = async function(knex) {
  console.log('🗑️  Dropping RBAC Registry tables...');

  const tablesToDrop = [
    'rbac_scan_history',
    'rbac_functions',
    'rbac_endpoints',
    'rbac_pages',
    'rbac_configuration_templates'
  ];

  for (const table of tablesToDrop) {
    const exists = await knex.schema.hasTable(table);
    if (exists) {
      console.log(`  Dropping ${table}...`);
      await knex.schema.dropTable(table);
      console.log(`  ✅ ${table} dropped`);
    } else {
      console.log(`  ℹ️  ${table} doesn't exist, skipping`);
    }
  }

  console.log('✅ RBAC Registry tables dropped successfully');
};

exports.down = async function(knex) {
  console.log('⚠️  Cannot recreate RBAC Registry tables');
  console.log('   Original migrations required for table structure');
  console.log('   This system has been permanently removed');
};
EOF
echo "  ✅ Created migration: 20251018000000_drop_rbac_registry_tables.js"

# Test backend builds
echo ""
echo "Phase 5: Testing backend build..."
cd backend && npm run build
cd ..
echo "  ✅ Backend builds successfully"

echo ""
echo "✅ RBAC Registry deletion complete!"
echo ""
echo "Next steps:"
echo "  1. Run migration: cd backend && npm run migrate:latest"
echo "  2. Test server: npm run dev"
echo "  3. Verify no errors in logs"
echo ""
echo "Rollback available via git if needed"
