const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

const CERBOS_POLICIES_DIR = path.join(__dirname, '../cerbos/policies');

async function getRolePermissionsFromCerbos(roleCode) {
  try {
    const permissions = [];
    console.log(`\nSearching for permissions for role: ${roleCode}`);
    console.log(`Looking in directory: ${CERBOS_POLICIES_DIR}`);

    // Read all policy files to find where this role has permissions
    const files = await fs.readdir(CERBOS_POLICIES_DIR);
    const yamlFiles = files.filter(file => file.endsWith('.yaml') && !file.startsWith('_'));
    console.log(`Found ${yamlFiles.length} YAML files to check`);

    for (const file of yamlFiles) {
      const filePath = path.join(CERBOS_POLICIES_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');

      try {
        const policy = yaml.load(content);

        if (policy?.resourcePolicy?.rules) {
          for (const rule of policy.resourcePolicy.rules) {
            // Check if this role is in the roles array for this rule
            if (rule.roles && rule.roles.includes(roleCode)) {
              // Add the actions with the resource prefix
              const resource = policy.resourcePolicy.resource;
              if (rule.actions) {
                console.log(`  Found in ${file}: ${rule.actions.length} actions`);
                for (const action of rule.actions) {
                  permissions.push(`${resource}:${action}`);
                }
              }
            }
          }
        }
      } catch (parseError) {
        console.warn(`Error parsing YAML file ${file}:`, parseError);
      }
    }

    // Remove duplicates and return
    const uniquePermissions = [...new Set(permissions)];
    console.log(`Total unique permissions found: ${uniquePermissions.length}`);
    return uniquePermissions;
  } catch (error) {
    console.error('Error reading permissions from Cerbos:', error);
    return [];
  }
}

// Test with different role codes
async function test() {
  const roles = ['admin', 'super_admin', 'assignor', 'referee', 'game_coordinator'];

  for (const role of roles) {
    const permissions = await getRolePermissionsFromCerbos(role);
    console.log(`\n${role.toUpperCase()} PERMISSIONS (${permissions.length}):`);
    if (permissions.length > 0) {
      permissions.forEach(p => console.log(`  - ${p}`));
    } else {
      console.log('  No permissions found');
    }
  }
}

test().catch(console.error);