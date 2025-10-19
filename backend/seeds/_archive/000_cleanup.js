/**
 * Seed 000: Database Cleanup
 * Truncates all tables in correct dependency order
 * Run this first to ensure a clean slate for seeding
 */

const { truncateTables } = require('./utils/seeder');

exports.seed = async function(knex) {
  console.log('🧹 Cleaning up database...\n');

  // Tables in dependency order (children first, parents last)
  const tables = [
    // Audit and logs (no dependencies)
    'access_control_audit',
    'audit_logs',
    'resource_access_logs',

    // Communication system
    'communication_recipients',
    'internal_communications',

    // Content system
    'content_analytics',
    'content_analytics_monthly',
    'content_item_tags',
    'content_tags',
    'content_attachments',
    'content_permissions',
    'content_versions',
    'content_search_index',
    'content_items',
    'content_categories',

    // Mentorship
    'mentorship_documents',
    'mentorship_notes',
    'mentorships',

    // Posts
    'post_reads',
    'post_media',
    'posts',
    'post_categories',

    // Resources
    'resources',
    'resource_categories',

    // Workflow
    'workflow_approvals',
    'workflow_step_executions',
    'workflow_instances',
    'workflow_definitions',

    // RBAC configuration
    'rbac_endpoints',
    'rbac_functions',
    'rbac_pages',
    'rbac_scan_history',
    'rbac_configuration_templates',

    // Role relationships
    'role_api_access',
    'role_data_scopes',
    'role_features',
    'role_page_access',
    'user_roles',

    // Games and assignments
    'game_assignments',
    'games',

    // Teams and leagues
    'teams',
    'leagues',

    // Locations
    'locations',

    // Referee profiles
    'referee_profiles',

    // User regions
    'user_region_assignments',

    // Users
    'users',

    // Roles
    'roles',

    // Regions
    'regions',

    // Organizations
    'organizations'
  ];

  await truncateTables(knex, tables);

  console.log('\n✅ Database cleanup completed\n');
};
