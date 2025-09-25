/**
 * Insert Resource Permissions Migration
 * 
 * Inserts new resource-related permissions into the permissions table
 * to support the Resource RBAC system.
 * 
 * New permissions include:
 * - Resource management: read, create, update, delete, manage
 * - Category management: create, update, delete, manage
 * - Administrative: audit, export
 */

exports.up = async function(knex) {
  const permissions = [
    // Resource permissions
    {
      name: 'resources:read',
      category: 'resources',
      description: 'Can view resources and resource details',
      is_system: true
    },
    {
      name: 'resources:create',
      category: 'resources', 
      description: 'Can create new resources',
      is_system: true
    },
    {
      name: 'resources:update',
      category: 'resources',
      description: 'Can edit existing resources',
      is_system: true
    },
    {
      name: 'resources:delete',
      category: 'resources',
      description: 'Can delete resources',
      is_system: true
    },
    {
      name: 'resources:manage',
      category: 'resources',
      description: 'Can fully manage resources including permissions',
      is_system: true
    },
    
    // Category permissions
    {
      name: 'categories:create',
      category: 'resources',
      description: 'Can create new resource categories',
      is_system: true
    },
    {
      name: 'categories:update',
      category: 'resources',
      description: 'Can edit existing resource categories',
      is_system: true
    },
    {
      name: 'categories:delete',
      category: 'resources',
      description: 'Can delete resource categories',
      is_system: true
    },
    {
      name: 'categories:manage',
      category: 'resources',
      description: 'Can fully manage categories including permissions and managers',
      is_system: true
    },
    
    // Administrative permissions
    {
      name: 'resources:audit',
      category: 'resources',
      description: 'Can view resource audit logs and activity history',
      is_system: true
    },
    {
      name: 'resources:export',
      category: 'resources',
      description: 'Can export resource data and reports',
      is_system: true
    }
  ];
  
  // Insert permissions with proper UUID generation and timestamps
  for (const permission of permissions) {
    // Check if permission already exists
    const existing = await knex('permissions')
      .where('name', permission.name)
      .first();
    
    if (!existing) {
      await knex('permissions').insert({
        id: knex.raw('gen_random_uuid()'),
        name: permission.name,
        category: permission.category,
        description: permission.description,
        is_system: permission.is_system,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    }
  }
  
  console.log('✓ Inserted resource-related permissions into permissions table');
};

exports.down = async function(knex) {
  // Remove the permissions we added
  const permissionNames = [
    'resources:read',
    'resources:create', 
    'resources:update',
    'resources:delete',
    'resources:manage',
    'categories:create',
    'categories:update',
    'categories:delete',
    'categories:manage',
    'resources:audit',
    'resources:export'
  ];
  
  await knex('permissions')
    .whereIn('name', permissionNames)
    .del();
    
  console.log('✓ Removed resource-related permissions from permissions table');
};