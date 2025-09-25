/**
 * Set up permissions and assign them to roles
 */

require('dotenv').config();
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/sports_management'
});

async function setupPermissions() {
  try {
    console.log('Setting up permissions system...\n');

    // Define all permissions
    const permissionsData = [
      // Referee permissions
      { name: 'referees:read', category: 'referees', description: 'View referees' },
      { name: 'referees:manage', category: 'referees', description: 'Manage referees' },
      { name: 'referees:create', category: 'referees', description: 'Create referees' },
      { name: 'referees:update', category: 'referees', description: 'Update referees' },
      { name: 'referees:delete', category: 'referees', description: 'Delete referees' },

      // Game permissions
      { name: 'games:read', category: 'games', description: 'View games' },
      { name: 'games:manage', category: 'games', description: 'Manage games' },
      { name: 'games:create', category: 'games', description: 'Create games' },
      { name: 'games:update', category: 'games', description: 'Update games' },
      { name: 'games:delete', category: 'games', description: 'Delete games' },

      // Assignment permissions
      { name: 'assignments:read', category: 'assignments', description: 'View assignments' },
      { name: 'assignments:manage', category: 'assignments', description: 'Manage assignments' },
      { name: 'assignments:create', category: 'assignments', description: 'Create assignments' },
      { name: 'assignments:update', category: 'assignments', description: 'Update assignments' },
      { name: 'assignments:delete', category: 'assignments', description: 'Delete assignments' },

      // User permissions
      { name: 'users:read', category: 'users', description: 'View users' },
      { name: 'users:manage', category: 'users', description: 'Manage users' },
      { name: 'users:create', category: 'users', description: 'Create users' },
      { name: 'users:update', category: 'users', description: 'Update users' },
      { name: 'users:delete', category: 'users', description: 'Delete users' },

      // Admin permissions
      { name: 'admin:access', category: 'admin', description: 'Access admin panel' },
      { name: 'admin:manage', category: 'admin', description: 'Manage admin settings' },

      // Profile permissions
      { name: 'profile:read', category: 'profile', description: 'View own profile' },
      { name: 'profile:update', category: 'profile', description: 'Update own profile' },

      // Communication permissions
      { name: 'communications:read', category: 'communications', description: 'View communications' },
      { name: 'communications:send', category: 'communications', description: 'Send communications' },

      // Financial permissions
      { name: 'finance:read', category: 'finance', description: 'View financial data' },
      { name: 'finance:manage', category: 'finance', description: 'Manage financial data' },

      // All permissions (for super admin)
      { name: '*', category: 'system', description: 'All permissions', is_system: true }
    ];

    // Check if permissions table exists
    const hasPermissionsTable = await db.schema.hasTable('permissions');
    if (!hasPermissionsTable) {
      console.log('Creating permissions table...');
      await db.schema.createTable('permissions', table => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.string('name').unique().notNullable();
        table.string('category');
        table.text('description');
        table.boolean('is_system').defaultTo(false);
        table.timestamps(true, true);
      });
    }

    // Check if role_permissions table exists
    const hasRolePermissionsTable = await db.schema.hasTable('role_permissions');
    if (!hasRolePermissionsTable) {
      console.log('Creating role_permissions table...');
      await db.schema.createTable('role_permissions', table => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE');
        table.uuid('permission_id').references('id').inTable('permissions').onDelete('CASCADE');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.uuid('created_by');
        table.unique(['role_id', 'permission_id']);
      });
    }

    // Create permissions
    console.log('Creating permissions...');
    const createdPermissions = {};

    for (const permData of permissionsData) {
      const existing = await db('permissions').where('name', permData.name).first();

      if (existing) {
        await db('permissions').where('id', existing.id).update(permData);
        createdPermissions[permData.name] = existing.id;
        console.log(`✅ Updated permission: ${permData.name}`);
      } else {
        const [created] = await db('permissions').insert(permData).returning('*');
        createdPermissions[permData.name] = created.id;
        console.log(`✅ Created permission: ${permData.name}`);
      }
    }

    // Define role-permission mappings
    const rolePermissionMappings = {
      'super_admin': ['*'], // All permissions
      'admin': [
        'referees:read', 'referees:manage', 'referees:create', 'referees:update', 'referees:delete',
        'games:read', 'games:manage', 'games:create', 'games:update', 'games:delete',
        'assignments:read', 'assignments:manage', 'assignments:create', 'assignments:update', 'assignments:delete',
        'users:read', 'users:manage', 'users:create', 'users:update', 'users:delete',
        'admin:access', 'admin:manage',
        'profile:read', 'profile:update',
        'communications:read', 'communications:send',
        'finance:read', 'finance:manage'
      ],
      'assignor': [
        'referees:read',
        'games:read', 'games:manage', 'games:create', 'games:update',
        'assignments:read', 'assignments:manage', 'assignments:create', 'assignments:update',
        'profile:read', 'profile:update',
        'communications:read', 'communications:send'
      ],
      'referee': [
        'games:read',
        'assignments:read',
        'profile:read', 'profile:update',
        'communications:read'
      ],
      'user': [
        'profile:read', 'profile:update'
      ]
    };

    // Assign permissions to roles
    console.log('\nAssigning permissions to roles...');

    for (const [roleName, permissionNames] of Object.entries(rolePermissionMappings)) {
      const role = await db('roles').where('name', roleName).first();

      if (!role) {
        console.log(`⚠️  Role ${roleName} not found, skipping...`);
        continue;
      }

      // Clear existing permissions for this role
      await db('role_permissions').where('role_id', role.id).delete();
      console.log(`  Cleared existing permissions for ${roleName}`);

      // Assign new permissions
      for (const permName of permissionNames) {
        const permId = createdPermissions[permName];

        if (!permId) {
          console.log(`⚠️  Permission ${permName} not found, skipping...`);
          continue;
        }

        await db('role_permissions').insert({
          role_id: role.id,
          permission_id: permId
        });
      }

      console.log(`✅ Assigned ${permissionNames.length} permissions to ${roleName}`);
    }

    // Display summary
    console.log('\n📊 Permission Summary:\n');

    const rolePermissions = await db('roles')
      .leftJoin('role_permissions', 'roles.id', 'role_permissions.role_id')
      .leftJoin('permissions', 'role_permissions.permission_id', 'permissions.id')
      .select('roles.name as role', db.raw("string_agg(permissions.name, ', ' ORDER BY permissions.name) as permissions"))
      .groupBy('roles.name')
      .orderBy('roles.name');

    for (const rp of rolePermissions) {
      console.log(`${rp.role}:`);
      if (rp.permissions) {
        const perms = rp.permissions.split(', ');
        if (perms.includes('*')) {
          console.log('  → ALL PERMISSIONS');
        } else {
          console.log(`  → ${perms.slice(0, 5).join(', ')}${perms.length > 5 ? ` ... (${perms.length} total)` : ''}`);
        }
      } else {
        console.log('  → NO PERMISSIONS');
      }
      console.log();
    }

    console.log('✅ Permissions setup complete!');

  } catch (error) {
    console.error('❌ Error setting up permissions:', error.message);
    console.error(error);
  } finally {
    await db.destroy();
  }
}

setupPermissions();