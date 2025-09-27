import knex from 'knex';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database configuration
const db = knex({
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'sports_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123'
  }
});

interface Permission {
  id: number;
  name: string;
  category: string;
  risk_level: string;
  description?: string;
}

interface Role {
  id: number;
  name: string;
  description?: string;
  is_system_role: boolean;
}

interface RolePermission {
  role_id: number;
  permission_id: number;
  role_name: string;
  permission_name: string;
}

interface ResourcePermissions {
  [resource: string]: {
    actions: string[];
    permissions: Permission[];
  };
}

interface RolePermissionMapping {
  [roleName: string]: {
    permissions: string[];
    resources: {
      [resource: string]: string[];
    };
  };
}

interface ExportData {
  permissions: Permission[];
  roles: Role[];
  rolePermissions: RolePermission[];
  resourcePermissions: ResourcePermissions;
  rolePermissionMapping: RolePermissionMapping;
  statistics: {
    totalPermissions: number;
    totalRoles: number;
    totalRolePermissions: number;
    resourceCount: number;
    averagePermissionsPerRole: number;
  };
}

async function exportPermissions(): Promise<void> {
  try {
    console.log('🔍 Exporting permissions from database...');

    // Get all permissions
    console.log('📋 Fetching permissions...');
    const permissions: Permission[] = await db('permissions')
      .select('*')
      .orderBy('category', 'asc')
      .orderBy('name', 'asc');

    console.log(`✅ Found ${permissions.length} permissions`);

    // Get all roles
    console.log('👥 Fetching roles...');
    const roles: Role[] = await db('roles')
      .select('*')
      .orderBy('name', 'asc');

    console.log(`✅ Found ${roles.length} roles`);

    // Get role-permission mappings
    console.log('🔗 Fetching role-permission mappings...');
    const rolePermissions: RolePermission[] = await db('role_permissions as rp')
      .join('roles as r', 'rp.role_id', 'r.id')
      .join('permissions as p', 'rp.permission_id', 'p.id')
      .select(
        'rp.role_id',
        'rp.permission_id',
        'r.name as role_name',
        'p.name as permission_name'
      )
      .orderBy('r.name', 'asc')
      .orderBy('p.name', 'asc');

    console.log(`✅ Found ${rolePermissions.length} role-permission mappings`);

    // Group permissions by resource
    console.log('🗂️  Grouping permissions by resource...');
    const resourcePermissions: ResourcePermissions = {};

    permissions.forEach(permission => {
      // Extract resource from permission name (format: "resource:action")
      const parts = permission.name.split(':');
      if (parts.length === 2) {
        const [resource, action] = parts;

        if (!resourcePermissions[resource]) {
          resourcePermissions[resource] = {
            actions: [],
            permissions: []
          };
        }

        resourcePermissions[resource].actions.push(action);
        resourcePermissions[resource].permissions.push(permission);
      } else {
        // Handle permissions that don't follow the standard format
        const resource = 'other';
        if (!resourcePermissions[resource]) {
          resourcePermissions[resource] = {
            actions: [],
            permissions: []
          };
        }
        resourcePermissions[resource].actions.push(permission.name);
        resourcePermissions[resource].permissions.push(permission);
      }
    });

    // Remove duplicates from actions
    Object.keys(resourcePermissions).forEach(resource => {
      resourcePermissions[resource].actions = [...new Set(resourcePermissions[resource].actions)];
    });

    console.log(`✅ Found ${Object.keys(resourcePermissions).length} resources`);

    // Create role-permission mapping
    console.log('🎭 Creating role-permission mapping...');
    const rolePermissionMapping: RolePermissionMapping = {};

    roles.forEach(role => {
      rolePermissionMapping[role.name] = {
        permissions: [],
        resources: {}
      };
    });

    rolePermissions.forEach(rp => {
      const roleName = rp.role_name;
      const permissionName = rp.permission_name;

      // Add to role's permissions list
      rolePermissionMapping[roleName].permissions.push(permissionName);

      // Group by resource
      const parts = permissionName.split(':');
      if (parts.length === 2) {
        const [resource, action] = parts;

        if (!rolePermissionMapping[roleName].resources[resource]) {
          rolePermissionMapping[roleName].resources[resource] = [];
        }

        rolePermissionMapping[roleName].resources[resource].push(action);
      }
    });

    // Remove duplicates and sort
    Object.keys(rolePermissionMapping).forEach(roleName => {
      rolePermissionMapping[roleName].permissions = [...new Set(rolePermissionMapping[roleName].permissions)].sort();

      Object.keys(rolePermissionMapping[roleName].resources).forEach(resource => {
        rolePermissionMapping[roleName].resources[resource] = [...new Set(rolePermissionMapping[roleName].resources[resource])].sort();
      });
    });

    // Calculate statistics
    const totalRolePermissions = Object.values(rolePermissionMapping).reduce(
      (sum, roleData) => sum + roleData.permissions.length, 0
    );

    const statistics = {
      totalPermissions: permissions.length,
      totalRoles: roles.length,
      totalRolePermissions: rolePermissions.length,
      resourceCount: Object.keys(resourcePermissions).length,
      averagePermissionsPerRole: Math.round((totalRolePermissions / roles.length) * 100) / 100
    };

    // Prepare export data
    const exportData: ExportData = {
      permissions,
      roles,
      rolePermissions,
      resourcePermissions,
      rolePermissionMapping,
      statistics
    };

    // Write to JSON file
    const outputPath = path.join(__dirname, '../data/permission-export.json');
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

    console.log('\n📊 Export Summary:');
    console.log(`   Total Permissions: ${statistics.totalPermissions}`);
    console.log(`   Total Roles: ${statistics.totalRoles}`);
    console.log(`   Total Role-Permission Mappings: ${statistics.totalRolePermissions}`);
    console.log(`   Resources Found: ${statistics.resourceCount}`);
    console.log(`   Average Permissions per Role: ${statistics.averagePermissionsPerRole}`);

    console.log('\n🗂️  Resources Found:');
    Object.keys(resourcePermissions).forEach(resource => {
      const actions = resourcePermissions[resource].actions;
      console.log(`   ${resource}: [${actions.join(', ')}]`);
    });

    console.log('\n🎭 Role Summary:');
    Object.keys(rolePermissionMapping).forEach(roleName => {
      const resourceCount = Object.keys(rolePermissionMapping[roleName].resources).length;
      const permissionCount = rolePermissionMapping[roleName].permissions.length;
      console.log(`   ${roleName}: ${permissionCount} permissions across ${resourceCount} resources`);
    });

    console.log(`\n✅ Export completed successfully!`);
    console.log(`📁 Data saved to: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error exporting permissions:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run the export if this script is executed directly
if (require.main === module) {
  exportPermissions()
    .then(() => {
      console.log('🎉 Permission export completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Permission export failed:', error);
      process.exit(1);
    });
}

export { exportPermissions };