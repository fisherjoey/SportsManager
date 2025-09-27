import { HTTP } from '@cerbos/http';
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';

const CERBOS_URL = process.env.CERBOS_URL || 'http://localhost:3592';
const POLICIES_PATH = path.join(__dirname, '../../cerbos-policies/resources');

interface TestResult {
  resource: string;
  success: boolean;
  error?: string;
  actions?: string[];
}

async function testCerbosPolicyLoading(): Promise<void> {
  console.log('\n🧪 Testing Cerbos Policy Loading...\n');

  const cerbos = new HTTP(CERBOS_URL);
  const results: TestResult[] = [];

  try {
    const healthCheck = await fetch(`${CERBOS_URL}/_cerbos/health`);
    if (!healthCheck.ok) {
      console.error('❌ Cerbos is not running!');
      console.log(`   Start Cerbos: docker-compose -f docker-compose.cerbos.yml up -d`);
      process.exit(1);
    }
    console.log('✅ Cerbos is running\n');
  } catch (error) {
    console.error('❌ Cannot connect to Cerbos at', CERBOS_URL);
    process.exit(1);
  }

  const policyFiles = fs
    .readdirSync(POLICIES_PATH)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

  console.log(`Found ${policyFiles.length} policy files to test:\n`);

  for (const file of policyFiles) {
    const filePath = path.join(POLICIES_PATH, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const policy = yaml.load(content) as any;

    const resourceName = policy.resourcePolicy?.resource;
    if (!resourceName) {
      results.push({
        resource: file,
        success: false,
        error: 'No resource name found in policy',
      });
      continue;
    }

    const actions = new Set<string>();
    policy.resourcePolicy.rules?.forEach((rule: any) => {
      rule.actions?.forEach((action: string) => actions.add(action));
    });

    try {
      const testPrincipal = {
        id: 'test-admin',
        roles: ['admin'],
        attr: {
          organizationId: 'test-org',
          primaryRegionId: 'test-region',
          regionIds: ['test-region'],
          permissions: [],
          email: 'test@example.com',
          isActive: true,
        },
      };

      const testResource = {
        kind: resourceName,
        id: 'test-resource-id',
        attr: {
          organizationId: 'test-org',
          regionId: 'test-region',
          createdBy: 'test-admin',
          status: 'pending',
        },
      };

      const testActions = Array.from(actions).slice(0, 3);

      const checkResult = await cerbos.checkResources({
        principal: testPrincipal,
        resources: [
          {
            resource: testResource,
            actions: testActions,
          },
        ],
      });

      if (checkResult) {
        results.push({
          resource: resourceName,
          success: true,
          actions: Array.from(actions),
        });
      } else {
        results.push({
          resource: resourceName,
          success: false,
          error: 'No response from Cerbos',
        });
      }
    } catch (error: any) {
      results.push({
        resource: resourceName,
        success: false,
        error: error.message,
      });
    }
  }

  console.log('\n📊 Test Results:\n');
  console.log('─'.repeat(80));

  let successCount = 0;
  let failureCount = 0;

  for (const result of results) {
    if (result.success) {
      successCount++;
      console.log(`✅ ${result.resource.padEnd(20)} | ${result.actions?.length} actions`);
      console.log(`   Actions: ${result.actions?.join(', ')}`);
    } else {
      failureCount++;
      console.log(`❌ ${result.resource.padEnd(20)} | ERROR: ${result.error}`);
    }
    console.log('─'.repeat(80));
  }

  console.log(`\n📈 Summary:`);
  console.log(`   Total Policies: ${results.length}`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);

  if (successCount > 0) {
    console.log(`\n✅ Testing authorization rules...\n`);
    await testAuthorizationRules(cerbos);
  }

  if (failureCount > 0) {
    console.log('\n⚠️  Some policies failed to load. Check Cerbos logs for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All policies loaded successfully!\n');
  }
}

async function testAuthorizationRules(cerbos: HTTP): Promise<void> {
  const tests = [
    {
      name: 'Admin can view games',
      principal: {
        id: 'admin-user',
        roles: ['admin'],
        attr: {
          organizationId: 'org-1',
          regionIds: ['region-1'],
          permissions: [],
          email: 'admin@example.com',
          isActive: true,
        },
      },
      resource: {
        kind: 'game',
        id: 'game-1',
        attr: {
          organizationId: 'org-1',
          regionId: 'region-1',
          status: 'pending',
        },
      },
      action: 'view',
      expectedAllow: true,
    },
    {
      name: 'Assignor can create games in their organization',
      principal: {
        id: 'assignor-user',
        roles: ['assignor'],
        attr: {
          organizationId: 'org-1',
          regionIds: ['region-1'],
          permissions: [],
          email: 'assignor@example.com',
          isActive: true,
        },
      },
      resource: {
        kind: 'game',
        id: 'game-2',
        attr: {
          organizationId: 'org-1',
          regionId: 'region-1',
          status: 'pending',
        },
      },
      action: 'create',
      expectedAllow: true,
    },
    {
      name: 'Referee cannot create games',
      principal: {
        id: 'referee-user',
        roles: ['referee'],
        attr: {
          organizationId: 'org-1',
          regionIds: ['region-1'],
          permissions: [],
          email: 'referee@example.com',
          isActive: true,
        },
      },
      resource: {
        kind: 'game',
        id: 'game-3',
        attr: {
          organizationId: 'org-1',
          regionId: 'region-1',
          status: 'pending',
        },
      },
      action: 'create',
      expectedAllow: false,
    },
    {
      name: 'Guest cannot access games',
      principal: {
        id: 'guest-user',
        roles: ['guest'],
        attr: {
          organizationId: 'org-1',
          permissions: [],
          email: 'guest@example.com',
          isActive: true,
        },
      },
      resource: {
        kind: 'game',
        id: 'game-4',
        attr: {
          organizationId: 'org-1',
          regionId: 'region-1',
          status: 'pending',
        },
      },
      action: 'view',
      expectedAllow: false,
    },
  ];

  console.log('Running authorization tests:\n');

  for (const test of tests) {
    try {
      const result = await cerbos.checkResource({
        principal: test.principal,
        resource: test.resource,
        actions: [test.action],
      });

      const isAllowed = result.isAllowed(test.action);
      const passed = isAllowed === test.expectedAllow;

      if (passed) {
        console.log(`✅ ${test.name}`);
      } else {
        console.log(`❌ ${test.name}`);
        console.log(`   Expected: ${test.expectedAllow}, Got: ${isAllowed}`);
      }
    } catch (error: any) {
      console.log(`❌ ${test.name} - Error: ${error.message}`);
    }
  }

  console.log();
}

testCerbosPolicyLoading().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});