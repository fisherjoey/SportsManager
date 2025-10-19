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
