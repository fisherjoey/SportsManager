/**
 * Migration: Grant Super Admin Full Access
 *
 * This migration ensures that the Super Admin role has:
 * 1. All permissions in the system
 * 2. Access to all pages
 * 3. Access to all API endpoints
 * 4. All features enabled
 */

exports.up = async function(knex) {
  console.log('Starting migration: Grant Super Admin full access...');

  try {
    // Step 1: Get the Super Admin role
    let superAdminRole = await knex('roles')
      .where('name', 'Super Admin')
      .first();

    if (!superAdminRole) {
      console.log('Creating Super Admin role...');
      const [newRole] = await knex('roles')
        .insert({
          id: knex.raw('gen_random_uuid()'),
          name: 'Super Admin',
          description: 'Full system administrator with unrestricted access',
          is_active: true,
          is_system: true,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now()
        })
        .returning('*');

      superAdminRole = newRole;
    }

    console.log('Super Admin role ID:', superAdminRole.id);

    // Step 2: Grant all permissions to Super Admin
    console.log('Granting all permissions to Super Admin...');

    // Get all permissions
    const allPermissions = await knex('permissions').select('id');

    // Get existing permissions for Super Admin
    const existingPermissions = await knex('role_permissions')
      .where('role_id', superAdminRole.id)
      .pluck('permission_id');

    // Add missing permissions
    const permissionsToAdd = allPermissions
      .filter(p => !existingPermissions.includes(p.id))
      .map(p => ({
        id: knex.raw('gen_random_uuid()'),
        role_id: superAdminRole.id,
        permission_id: p.id,
        created_at: knex.fn.now()
      }));

    if (permissionsToAdd.length > 0) {
      await knex('role_permissions').insert(permissionsToAdd);
      console.log(`Added ${permissionsToAdd.length} permissions to Super Admin`);
    } else {
      console.log('Super Admin already has all permissions');
    }

    // Step 3: Grant access to all pages
    console.log('Granting page access to Super Admin...');

    // Define all pages in the system
    const allPages = [
      // Sports Management
      { path: 'dashboard', name: 'Dashboard', category: 'Sports Management', description: 'Main dashboard overview' },
      { path: 'leagues', name: 'League Management', category: 'Sports Management', description: 'Create and manage leagues' },
      { path: 'tournaments', name: 'Tournament Generator', category: 'Sports Management', description: 'Generate tournament brackets' },
      { path: 'games', name: 'Games', category: 'Sports Management', description: 'View and manage games' },
      { path: 'assigning', name: 'Game Assignment', category: 'Sports Management', description: 'Assign referees to games' },
      { path: 'ai-assignments', name: 'AI Assignments', category: 'Sports Management', description: 'Automated referee assignments' },
      { path: 'locations', name: 'Teams & Locations', category: 'Sports Management', description: 'Manage teams and venues' },
      { path: 'referees', name: 'Referees', category: 'Sports Management', description: 'Manage referee profiles' },
      { path: 'calendar', name: 'Calendar', category: 'Sports Management', description: 'View game calendar' },
      { path: 'communications', name: 'Communications', category: 'Sports Management', description: 'Send messages and notifications' },
      { path: 'resources', name: 'Resource Centre', category: 'Sports Management', description: 'Educational resources' },

      // Financial
      { path: 'financial-dashboard', name: 'Financial Dashboard', category: 'Financial', description: 'Financial overview' },
      { path: 'financial-receipts', name: 'Receipt Processing', category: 'Financial', description: 'Process expense receipts' },
      { path: 'financial-budgets', name: 'Budget Management', category: 'Financial', description: 'Manage budgets' },
      { path: 'financial-expenses', name: 'Expense Management', category: 'Financial', description: 'Track expenses' },
      { path: 'financial-expense-create', name: 'Create Expense', category: 'Financial', description: 'Submit new expenses' },
      { path: 'financial-expense-approvals', name: 'Expense Approvals', category: 'Financial', description: 'Approve pending expenses' },
      { path: 'financial-reports', name: 'Financial Reports', category: 'Financial', description: 'Generate financial reports' },

      // Organization
      { path: 'organization-dashboard', name: 'Organizational Dashboard', category: 'Organization', description: 'Organization overview' },
      { path: 'organization-employees', name: 'Employee Management', category: 'Organization', description: 'Manage employees' },
      { path: 'organization-assets', name: 'Asset Tracking', category: 'Organization', description: 'Track organizational assets' },
      { path: 'organization-documents', name: 'Document Repository', category: 'Organization', description: 'Manage documents' },
      { path: 'organization-compliance', name: 'Compliance Tracking', category: 'Organization', description: 'Track compliance' },

      // Analytics
      { path: 'analytics-dashboard', name: 'Analytics Dashboard', category: 'Analytics', description: 'View analytics and insights' },

      // Administration
      { path: 'admin-access-control', name: 'Access Control', category: 'Administration', description: 'Manage access control' },
      { path: 'admin-workflows', name: 'Workflow Management', category: 'Administration', description: 'Configure workflows' },
      { path: 'admin-security', name: 'Security & Audit', category: 'Administration', description: 'Security settings and audit logs' },
      { path: 'admin-settings', name: 'System Settings', category: 'Administration', description: 'System configuration' },
      { path: 'organization-settings', name: 'Organization Settings', category: 'Administration', description: 'Organization configuration' },
      { path: 'profile', name: 'Profile Settings', category: 'Administration', description: 'User profile settings' }
    ];

    // Check if role_page_access table exists
    const hasPageAccessTable = await knex.schema.hasTable('role_page_access');

    if (hasPageAccessTable) {
      // Delete existing page access for Super Admin
      await knex('role_page_access')
        .where('role_id', superAdminRole.id)
        .delete();

      // Insert all page access for Super Admin
      const pageAccessRecords = allPages.map(page => ({
        id: knex.raw('gen_random_uuid()'),
        role_id: superAdminRole.id,
        page_path: page.path,
        page_name: page.name,
        page_category: page.category,
        page_description: page.description,
        can_access: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }));

      await knex('role_page_access').insert(pageAccessRecords);
      console.log(`Granted access to ${pageAccessRecords.length} pages for Super Admin`);
    } else {
      console.log('role_page_access table does not exist, skipping page access grant');
    }

    // Step 4: Grant access to all API endpoints
    const hasApiAccessTable = await knex.schema.hasTable('role_api_access');

    if (hasApiAccessTable) {
      console.log('Granting API access to Super Admin...');

      // Delete existing API access for Super Admin
      await knex('role_api_access')
        .where('role_id', superAdminRole.id)
        .delete();

      // Define common API patterns
      const apiPatterns = [
        { method: 'GET', pattern: '/api/*', category: 'All', description: 'All GET endpoints' },
        { method: 'POST', pattern: '/api/*', category: 'All', description: 'All POST endpoints' },
        { method: 'PUT', pattern: '/api/*', category: 'All', description: 'All PUT endpoints' },
        { method: 'PATCH', pattern: '/api/*', category: 'All', description: 'All PATCH endpoints' },
        { method: 'DELETE', pattern: '/api/*', category: 'All', description: 'All DELETE endpoints' }
      ];

      const apiAccessRecords = apiPatterns.map(api => ({
        id: knex.raw('gen_random_uuid()'),
        role_id: superAdminRole.id,
        http_method: api.method,
        endpoint_pattern: api.pattern,
        endpoint_category: api.category,
        endpoint_description: api.description,
        can_access: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }));

      await knex('role_api_access').insert(apiAccessRecords);
      console.log(`Granted access to all API endpoints for Super Admin`);
    } else {
      console.log('role_api_access table does not exist, skipping API access grant');
    }

    // Step 5: Enable all features for Super Admin
    const hasFeaturesTable = await knex.schema.hasTable('role_features');

    if (hasFeaturesTable) {
      console.log('Enabling all features for Super Admin...');

      // Define all features
      const allFeatures = [
        { code: 'advanced_analytics', name: 'Advanced Analytics', category: 'Analytics' },
        { code: 'ai_assignments', name: 'AI Assignments', category: 'Sports' },
        { code: 'financial_management', name: 'Financial Management', category: 'Financial' },
        { code: 'bulk_operations', name: 'Bulk Operations', category: 'System' },
        { code: 'api_access', name: 'API Access', category: 'System' },
        { code: 'export_data', name: 'Export Data', category: 'System' },
        { code: 'import_data', name: 'Import Data', category: 'System' }
      ];

      // Delete existing features for Super Admin
      await knex('role_features')
        .where('role_id', superAdminRole.id)
        .delete();

      // Insert all features for Super Admin
      const featureRecords = allFeatures.map(feature => ({
        id: knex.raw('gen_random_uuid()'),
        role_id: superAdminRole.id,
        feature_code: feature.code,
        feature_name: feature.name,
        feature_category: feature.category,
        is_enabled: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }));

      await knex('role_features').insert(featureRecords);
      console.log(`Enabled ${featureRecords.length} features for Super Admin`);
    } else {
      console.log('role_features table does not exist, skipping feature enablement');
    }

    console.log('✅ Successfully granted Super Admin full access to the system');
  } catch (error) {
    console.error('Error granting Super Admin full access:', error);
    throw error;
  }
};

exports.down = async function(knex) {
  // This migration should not be rolled back as Super Admin needs full access
  console.log('This migration cannot be rolled back - Super Admin requires full system access');
};