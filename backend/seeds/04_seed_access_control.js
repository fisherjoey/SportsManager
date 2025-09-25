/**
 * @fileoverview Seed initial access control data
 * 
 * Populates the database with initial page access, API access, and feature configurations
 * based on the existing role configurations
 */

exports.seed = async function(knex) {
  console.log('🌱 Seeding access control data...');

  // Get all existing roles
  const roles = await knex('roles').select('id', 'name');
  console.log(`Found ${roles.length} roles to configure`);

  // Define page access configurations
  const pageConfigurations = {
    'Super Admin': {
      allowAll: true
    },
    'Administrator': {
      allowAll: true  
    },
    'Assignor': {
      allowed: [
        'dashboard', 'games', 'assigning', 'ai-assignments', 
        'referees', 'calendar', 'communications', 'profile'
      ]
    },
    'Referee': {
      allowed: [
        'dashboard', 'games', 'calendar', 'resources', 'profile'
      ]
    },
    'League Manager': {
      allowed: [
        'dashboard', 'leagues', 'tournaments', 'games', 
        'locations', 'calendar', 'analytics-dashboard', 'profile'
      ]
    },
    'Finance Manager': {
      allowed: [
        'dashboard', 'financial-dashboard', 'financial-receipts',
        'financial-budgets', 'financial-expenses', 'financial-expense-create',
        'financial-expense-approvals', 'financial-reports', 'profile'
      ]
    },
    'Content Manager': {
      allowed: [
        'dashboard', 'resources', 'communications',
        'organization-documents', 'profile'
      ]
    },
    'Viewer': {
      allowed: [
        'dashboard', 'games', 'calendar', 'resources', 'profile'
      ]
    }
  };

  // All available pages in the system
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
    
    // Account
    { path: 'profile', name: 'Profile', category: 'Account', description: 'User profile settings' },
    { path: 'organization-settings', name: 'Organization Settings', category: 'Account', description: 'Organization configuration' }
  ];

  // Seed page access for each role
  for (const role of roles) {
    const config = pageConfigurations[role.name];
    if (!config) {
      console.log(`⚠️  No configuration found for role: ${role.name}`);
      continue;
    }

    const pageAccessRecords = [];
    
    for (const page of allPages) {
      let canAccess = false;
      
      if (config.allowAll) {
        canAccess = true;
      } else if (config.allowed && config.allowed.includes(page.path)) {
        canAccess = true;
      }
      
      pageAccessRecords.push({
        role_id: role.id,
        page_path: page.path,
        page_name: page.name,
        page_category: page.category,
        page_description: page.description,
        can_access: canAccess
      });
    }

    // Delete existing page access for this role
    await knex('role_page_access').where('role_id', role.id).delete();
    
    // Insert new page access
    if (pageAccessRecords.length > 0) {
      await knex('role_page_access').insert(pageAccessRecords);
      console.log(`✅ Configured page access for ${role.name}: ${pageAccessRecords.filter(r => r.can_access).length}/${allPages.length} pages`);
    }
  }

  // Seed API access for Super Admin and Administrator roles
  const adminRoles = roles.filter(r => r.name === 'Super Admin' || r.name === 'Administrator');
  
  const apiEndpoints = [
    // Games
    { method: 'GET', pattern: '/api/games', category: 'Games', description: 'List games' },
    { method: 'POST', pattern: '/api/games', category: 'Games', description: 'Create game' },
    { method: 'PUT', pattern: '/api/games/:id', category: 'Games', description: 'Update game' },
    { method: 'DELETE', pattern: '/api/games/:id', category: 'Games', description: 'Delete game' },
    
    // Users
    { method: 'GET', pattern: '/api/users', category: 'Users', description: 'List users' },
    { method: 'POST', pattern: '/api/users', category: 'Users', description: 'Create user' },
    { method: 'PUT', pattern: '/api/users/:id', category: 'Users', description: 'Update user' },
    { method: 'DELETE', pattern: '/api/users/:id', category: 'Users', description: 'Delete user' },
    
    // Roles
    { method: 'GET', pattern: '/api/admin/roles', category: 'Roles', description: 'List roles' },
    { method: 'POST', pattern: '/api/admin/roles', category: 'Roles', description: 'Create role' },
    { method: 'PUT', pattern: '/api/admin/roles/:id', category: 'Roles', description: 'Update role' },
    { method: 'DELETE', pattern: '/api/admin/roles/:id', category: 'Roles', description: 'Delete role' },
    
    // Permissions
    { method: 'GET', pattern: '/api/admin/permissions', category: 'Permissions', description: 'List permissions' },
    { method: 'POST', pattern: '/api/admin/permissions', category: 'Permissions', description: 'Create permission' },
    { method: 'PUT', pattern: '/api/admin/permissions/:id', category: 'Permissions', description: 'Update permission' },
    { method: 'DELETE', pattern: '/api/admin/permissions/:id', category: 'Permissions', description: 'Delete permission' },
    
    // Reports
    { method: 'GET', pattern: '/api/reports', category: 'Reports', description: 'List reports' },
    { method: 'POST', pattern: '/api/reports', category: 'Reports', description: 'Create report' },
    
    // Resources
    { method: 'GET', pattern: '/api/resources', category: 'Resources', description: 'List resources' },
    { method: 'POST', pattern: '/api/resources', category: 'Resources', description: 'Create resource' },
    { method: 'PUT', pattern: '/api/resources/:id', category: 'Resources', description: 'Update resource' },
    { method: 'DELETE', pattern: '/api/resources/:id', category: 'Resources', description: 'Delete resource' }
  ];

  // Grant all API access to admin roles
  for (const role of adminRoles) {
    const apiAccessRecords = apiEndpoints.map(api => ({
      role_id: role.id,
      http_method: api.method,
      endpoint_pattern: api.pattern,
      endpoint_category: api.category,
      endpoint_description: api.description,
      can_access: true,
      rate_limit: null // No rate limiting for admins
    }));

    // Delete existing API access for this role
    await knex('role_api_access').where('role_id', role.id).delete();
    
    // Insert new API access
    if (apiAccessRecords.length > 0) {
      await knex('role_api_access').insert(apiAccessRecords);
      console.log(`✅ Configured API access for ${role.name}: ${apiAccessRecords.length} endpoints`);
    }
  }

  // Seed feature flags
  const features = [
    { code: 'ai_assignments', name: 'AI Assignments', category: 'Assignment', description: 'Use AI for automatic referee assignments' },
    { code: 'bulk_import', name: 'Bulk Import', category: 'Data Management', description: 'Import data in bulk' },
    { code: 'advanced_analytics', name: 'Advanced Analytics', category: 'Analytics', description: 'Access advanced analytics features' },
    { code: 'financial_module', name: 'Financial Module', category: 'Financial', description: 'Access financial management features' },
    { code: 'api_access', name: 'API Access', category: 'Integration', description: 'Access external API integrations' }
  ];

  // Enable all features for admin roles
  for (const role of adminRoles) {
    const featureRecords = features.map(feature => ({
      role_id: role.id,
      feature_code: feature.code,
      feature_name: feature.name,
      feature_category: feature.category,
      feature_description: feature.description,
      is_enabled: true,
      configuration: null
    }));

    // Delete existing features for this role
    await knex('role_features').where('role_id', role.id).delete();
    
    // Insert new features
    if (featureRecords.length > 0) {
      await knex('role_features').insert(featureRecords);
      console.log(`✅ Configured features for ${role.name}: ${featureRecords.length} features enabled`);
    }
  }

  // Enable AI assignments for Assignor role
  const assignorRole = roles.find(r => r.name === 'Assignor');
  if (assignorRole) {
    await knex('role_features').insert({
      role_id: assignorRole.id,
      feature_code: 'ai_assignments',
      feature_name: 'AI Assignments',
      feature_category: 'Assignment',
      feature_description: 'Use AI for automatic referee assignments',
      is_enabled: true,
      configuration: null
    });
    console.log('✅ Enabled AI assignments feature for Assignor role');
  }

  console.log('✅ Access control seeding completed successfully');
};