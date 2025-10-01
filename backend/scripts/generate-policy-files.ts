import * as fs from 'fs';
import * as path from 'path';

interface Permission {
  id: string;
  name: string;
  category: string;
  description?: string;
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
  resourcePermissions: ResourcePermissions;
  rolePermissionMapping: RolePermissionMapping;
  statistics: {
    totalPermissions: number;
    totalRoles: number;
    resourceCount: number;
  };
}

// Mapping from database roles to Cerbos roles
const ROLE_MAPPING: { [key: string]: string } = {
  'Super Admin': 'admin',
  'Admin': 'admin',
  'Assignment Manager': 'assignor',
  'Assignor': 'assignor',
  'Head Referee': 'referee',
  'Senior Referee': 'referee',
  'Referee': 'referee',
  'Referee Coach': 'referee',
  'Referee Coordinator': 'assignor',
  'Junior Referee': 'referee',
  'Rookie Referee': 'referee',
  'Mentor': 'referee',
  'Mentorship Coordinator': 'assignor',
  'Guest': 'guest'
};

// Resources that already have policy files
const EXISTING_RESOURCES = new Set(['game', 'assignment', 'referee']);

// Resource action standardization mapping
const ACTION_MAPPING: { [key: string]: string } = {
  'read': 'view',
  'create': 'create',
  'update': 'update',
  'delete': 'delete',
  'manage': 'manage',
  'approve': 'approve',
  'publish': 'publish',
  'export': 'export',
  'broadcast': 'broadcast',
  'send': 'send',
  'assign': 'assign',
  'evaluate': 'evaluate',
  'auto_assign': 'auto_assign'
};

function generatePolicyYaml(resource: string, actions: string[], roleMapping: RolePermissionMapping): string {
  const standardizedActions = actions.map(action => ACTION_MAPPING[action] || action);
  const uniqueActions = [...new Set(standardizedActions)];

  // Get roles that have permissions for this resource
  const rolesWithPermissions: { [roleName: string]: string[] } = {};

  Object.entries(roleMapping).forEach(([roleName, roleData]) => {
    if (roleData.resources[resource]) {
      const cerbosRole = ROLE_MAPPING[roleName] || 'guest';
      if (!rolesWithPermissions[cerbosRole]) {
        rolesWithPermissions[cerbosRole] = [];
      }
      rolesWithPermissions[cerbosRole].push(...roleData.resources[resource]);
    }
  });

  // Deduplicate and standardize actions for each role
  Object.keys(rolesWithPermissions).forEach(role => {
    const standardized = rolesWithPermissions[role]
      .map(action => ACTION_MAPPING[action] || action);
    rolesWithPermissions[role] = [...new Set(standardized)];
  });


  let yaml = `---
apiVersion: api.cerbos.dev/v1
description: Policy for ${resource} resource
resourcePolicy:
  version: "default"
  importDerivedRoles:
    - common_roles
  resource: "${resource}"
  rules:`;

  // Admin rules - full access
  if (rolesWithPermissions.admin) {
    yaml += `
    # Admin rules - full access within their organization
    - actions: ['*']
      effect: EFFECT_ALLOW
      roles:
        - admin
      derivedRoles:
        - organization_admin`;
  }

  // Assignor rules
  if (rolesWithPermissions.assignor) {
    const assignorActions = rolesWithPermissions.assignor;

    // Basic view/list permissions
    if (assignorActions.includes('view') || assignorActions.includes('read')) {
      yaml += `

    # Assignor rules - basic access
    - actions: ['view', 'list']
      effect: EFFECT_ALLOW
      roles:
        - assignor
      derivedRoles:
        - same_organization`;
    }

    // Create permissions
    if (assignorActions.includes('create')) {
      yaml += `

    - actions: ['create']
      effect: EFFECT_ALLOW
      roles:
        - assignor
      condition:
        match:
          expr: request.resource.attr.organizationId == request.principal.attr.organizationId`;
    }

    // Update permissions
    if (assignorActions.includes('update')) {
      yaml += `

    - actions: ['update']
      effect: EFFECT_ALLOW
      roles:
        - assignor
      derivedRoles:
        - same_organization
      condition:
        match:
          expr: request.resource.attr.organizationId == request.principal.attr.organizationId`;
    }

    // Delete permissions
    if (assignorActions.includes('delete')) {
      yaml += `

    - actions: ['delete']
      effect: EFFECT_ALLOW
      roles:
        - assignor
      derivedRoles:
        - owner
      condition:
        match:
          all:
            of:
              - expr: request.resource.attr.organizationId == request.principal.attr.organizationId
              - expr: request.resource.attr.createdBy == request.principal.id`;
    }

    // Special actions
    if (assignorActions.includes('manage')) {
      yaml += `

    - actions: ['manage']
      effect: EFFECT_ALLOW
      roles:
        - assignor
      derivedRoles:
        - same_organization
      condition:
        match:
          expr: request.resource.attr.organizationId == request.principal.attr.organizationId`;
    }

    if (assignorActions.includes('approve')) {
      yaml += `

    - actions: ['approve']
      effect: EFFECT_ALLOW
      roles:
        - assignor
      derivedRoles:
        - same_organization
      condition:
        match:
          expr: request.resource.attr.organizationId == request.principal.attr.organizationId`;
    }
  }

  // Referee rules
  if (rolesWithPermissions.referee) {
    const refereeActions = rolesWithPermissions.referee;

    // Basic view permissions
    if (refereeActions.includes('view') || refereeActions.includes('read')) {
      yaml += `

    # Referee rules - limited access
    - actions: ['view', 'list']
      effect: EFFECT_ALLOW
      roles:
        - referee
      condition:
        match:
          expr: request.resource.attr.organizationId == request.principal.attr.organizationId`;
    }

    // Update own profile/data
    if (refereeActions.includes('update')) {
      yaml += `

    - actions: ['update']
      effect: EFFECT_ALLOW
      roles:
        - referee
      condition:
        match:
          any:
            of:
              - expr: request.resource.attr.userId == request.principal.id
              - expr: request.resource.attr.createdBy == request.principal.id`;
    }
  }

  // Guest rules - always deny all access
  yaml += `

    # Guest rules - no access
    - actions: ['*']
      effect: EFFECT_DENY
      roles:
        - guest`;

  return yaml;
}

function generatePolicyFiles(): void {
  try {
    console.log('🔄 Loading exported permission data...');

    // Load the exported data
    const dataPath = path.join(__dirname, '../data/permission-export.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const exportData: ExportData = JSON.parse(rawData);

    console.log(`📊 Found ${exportData.statistics.resourceCount} resources to process`);

    // Get the resources directory
    const resourcesDir = path.join(__dirname, '../../cerbos-policies/resources');
    if (!fs.existsSync(resourcesDir)) {
      fs.mkdirSync(resourcesDir, { recursive: true });
    }

    let createdFiles = 0;
    let skippedFiles = 0;

    // Generate policy files for each resource
    Object.entries(exportData.resourcePermissions).forEach(([resource, resourceData]) => {
      // Skip resources that already have policy files
      if (EXISTING_RESOURCES.has(resource)) {
        console.log(`⏭️  Skipping ${resource} (already has policy file)`);
        skippedFiles++;
        return;
      }

      // Skip 'other' resource for now as it has mixed permissions
      if (resource === 'other') {
        console.log(`⏭️  Skipping ${resource} (contains mixed permissions)`);
        skippedFiles++;
        return;
      }

      console.log(`📝 Creating policy for ${resource}...`);

      const policyYaml = generatePolicyYaml(resource, resourceData.actions, exportData.rolePermissionMapping);
      const fileName = `${resource}.yaml`;
      const filePath = path.join(resourcesDir, fileName);

      fs.writeFileSync(filePath, policyYaml);
      console.log(`✅ Created ${fileName}`);
      createdFiles++;
    });

    console.log('\n🎉 Policy file generation completed!');
    console.log(`   Created: ${createdFiles} files`);
    console.log(`   Skipped: ${skippedFiles} files`);
    console.log(`   Location: ${resourcesDir}`);

    // List all created files
    if (createdFiles > 0) {
      console.log('\n📁 Created policy files:');
      Object.keys(exportData.resourcePermissions).forEach(resource => {
        if (!EXISTING_RESOURCES.has(resource) && resource !== 'other') {
          console.log(`   - ${resource}.yaml`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error generating policy files:', error);
    throw error;
  }
}

// Run the generator if this script is executed directly
if (require.main === module) {
  generatePolicyFiles();
}

export { generatePolicyFiles };