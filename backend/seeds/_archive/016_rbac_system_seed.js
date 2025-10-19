/**
 * RBAC System Seed Data
 * 
 * Seeds the database with default roles and permissions for the Sports Management system.
 * This provides a comprehensive permission structure that can be managed via GUI.
 */

exports.seed = async function(knex) {
  // Clear existing RBAC data
  await knex('user_roles').del();
  await knex('role_permissions').del();
  await knex('permissions').del();
  await knex('roles').del();

  console.log('Seeding RBAC system with default roles and permissions...');

  // Define system permissions organized by category
  const permissions = [
    // Games permissions
    { name: 'games:read', category: 'games', description: 'View games and game schedules' },
    { name: 'games:create', category: 'games', description: 'Create new games' },
    { name: 'games:update', category: 'games', description: 'Edit existing games' },
    { name: 'games:delete', category: 'games', description: 'Delete games' },
    { name: 'games:publish', category: 'games', description: 'Publish games to make them visible to referees' },
    
    // Assignments permissions
    { name: 'assignments:read', category: 'assignments', description: 'View game assignments' },
    { name: 'assignments:create', category: 'assignments', description: 'Create new assignments' },
    { name: 'assignments:update', category: 'assignments', description: 'Edit existing assignments' },
    { name: 'assignments:delete', category: 'assignments', description: 'Delete assignments' },
    { name: 'assignments:approve', category: 'assignments', description: 'Approve or reject assignment requests' },
    { name: 'assignments:auto_assign', category: 'assignments', description: 'Use AI auto-assignment features' },
    
    // Referees permissions
    { name: 'referees:read', category: 'referees', description: 'View referee profiles and information' },
    { name: 'referees:update', category: 'referees', description: 'Edit referee profiles' },
    { name: 'referees:manage', category: 'referees', description: 'Manage referee levels, availability, and status' },
    { name: 'referees:evaluate', category: 'referees', description: 'Evaluate referee performance' },
    
    // Reports permissions
    { name: 'reports:read', category: 'reports', description: 'View reports and analytics' },
    { name: 'reports:create', category: 'reports', description: 'Generate custom reports' },
    { name: 'reports:export', category: 'reports', description: 'Export reports to various formats' },
    { name: 'reports:financial', category: 'reports', description: 'Access financial reports and budgets' },
    
    // Settings permissions
    { name: 'settings:read', category: 'settings', description: 'View system settings' },
    { name: 'settings:update', category: 'settings', description: 'Modify system settings' },
    { name: 'settings:organization', category: 'settings', description: 'Manage organization-wide settings' },
    
    // Roles permissions
    { name: 'roles:read', category: 'roles', description: 'View roles and permissions' },
    { name: 'roles:manage', category: 'roles', description: 'Create, edit, and delete roles and permissions' },
    { name: 'roles:assign', category: 'roles', description: 'Assign or remove roles from users' },
    
    // Users permissions
    { name: 'users:read', category: 'users', description: 'View user profiles and information' },
    { name: 'users:create', category: 'users', description: 'Create new user accounts' },
    { name: 'users:update', category: 'users', description: 'Edit user profiles and information' },
    { name: 'users:delete', category: 'users', description: 'Delete user accounts' },
    { name: 'users:impersonate', category: 'users', description: 'Login as other users for troubleshooting' },

    // Financial permissions
    { name: 'finance:read', category: 'finance', description: 'View financial data and expenses' },
    { name: 'finance:create', category: 'finance', description: 'Create expense entries and budgets' },
    { name: 'finance:approve', category: 'finance', description: 'Approve expenses and reimbursements' },
    { name: 'finance:manage', category: 'finance', description: 'Manage budgets and financial controls' },

    // Communication permissions
    { name: 'communication:send', category: 'communication', description: 'Send messages and notifications' },
    { name: 'communication:broadcast', category: 'communication', description: 'Send organization-wide announcements' },
    { name: 'communication:manage', category: 'communication', description: 'Manage communication templates and settings' },

    // Content permissions
    { name: 'content:read', category: 'content', description: 'View content and resources' },
    { name: 'content:create', category: 'content', description: 'Create new content and resources' },
    { name: 'content:update', category: 'content', description: 'Edit existing content and resources' },
    { name: 'content:publish', category: 'content', description: 'Publish content to make it visible to users' },
    { name: 'content:delete', category: 'content', description: 'Delete content and resources' }
  ];

  // Insert permissions and get their IDs
  const insertedPermissions = await knex('permissions').insert(
    permissions.map(p => ({ ...p, is_system: true }))
  ).returning('*');

  // Create a mapping of permission names to IDs for easier role assignment
  const permissionMap = insertedPermissions.reduce((map, permission) => {
    map[permission.name] = permission.id;
    return map;
  }, {});

  // Define system roles with their permissions
  const roleDefinitions = [
    {
      name: 'Super Admin',
      description: 'Full system access with all permissions. Can manage other admins and system settings.',
      permissions: Object.keys(permissionMap) // All permissions
    },
    {
      name: 'Admin',
      description: 'Administrative access to most system functions. Cannot manage roles or impersonate users.',
      permissions: [
        'games:read', 'games:create', 'games:update', 'games:delete', 'games:publish',
        'assignments:read', 'assignments:create', 'assignments:update', 'assignments:delete', 'assignments:approve', 'assignments:auto_assign',
        'referees:read', 'referees:update', 'referees:manage', 'referees:evaluate',
        'reports:read', 'reports:create', 'reports:export', 'reports:financial',
        'settings:read', 'settings:update',
        'users:read', 'users:create', 'users:update',
        'finance:read', 'finance:create', 'finance:approve', 'finance:manage',
        'communication:send', 'communication:broadcast', 'communication:manage',
        'content:read', 'content:create', 'content:update', 'content:publish', 'content:delete'
      ]
    },
    {
      name: 'Assignment Manager',
      description: 'Manages game assignments and referee scheduling. Can assign referees to games.',
      permissions: [
        'games:read',
        'assignments:read', 'assignments:create', 'assignments:update', 'assignments:delete', 'assignments:approve', 'assignments:auto_assign',
        'referees:read', 'referees:update',
        'reports:read', 'reports:create',
        'communication:send'
      ]
    },
    {
      name: 'Referee Coordinator',
      description: 'Coordinates referee activities, evaluations, and development. Manages referee information.',
      permissions: [
        'games:read',
        'assignments:read',
        'referees:read', 'referees:update', 'referees:manage', 'referees:evaluate',
        'reports:read', 'reports:create',
        'communication:send', 'communication:broadcast',
        'content:read', 'content:create', 'content:update'
      ]
    },
    {
      name: 'Senior Referee',
      description: 'Experienced referee with additional privileges. Can evaluate other referees.',
      permissions: [
        'games:read',
        'assignments:read',
        'referees:read', 'referees:evaluate',
        'reports:read',
        'content:read'
      ]
    },
    {
      name: 'Referee',
      description: 'Basic referee role with access to assignments and personal information.',
      permissions: [
        'games:read',
        'assignments:read',
        'referees:read', // Can view other referee info for coordination
        'content:read'
      ]
    }
  ];

  // Insert roles and assign permissions
  for (const roleDef of roleDefinitions) {
    const [role] = await knex('roles').insert({
      name: roleDef.name,
      description: roleDef.description,
      is_system: true,
      is_active: true
    }).returning('*');

    // Assign permissions to role
    const rolePermissions = roleDef.permissions.map(permissionName => ({
      role_id: role.id,
      permission_id: permissionMap[permissionName]
    })).filter(rp => rp.permission_id); // Filter out any undefined permissions

    if (rolePermissions.length > 0) {
      await knex('role_permissions').insert(rolePermissions);
    }

    console.log(`✓ Created role: ${role.name} with ${rolePermissions.length} permissions`);
  }

  console.log(`✓ RBAC system seeded with ${insertedPermissions.length} permissions and ${roleDefinitions.length} roles`);
};