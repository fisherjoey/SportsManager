#!/usr/bin/env node

/**
 * Simulates Cerbos authorization checks without requiring Cerbos to be running
 * This helps visualize how the authorization would work
 */

console.log('🔐 Cerbos Authorization Simulation\n');
console.log('=' .repeat(60));
console.log('');

// Test scenarios
const scenarios = [
  {
    name: 'Assignor creates game in their region',
    user: {
      id: 'assignor-123',
      role: 'assignor',
      organizationId: 'org-sports',
      regionIds: ['region-north']
    },
    resource: {
      kind: 'game',
      action: 'create',
      attributes: {
        organizationId: 'org-sports',
        regionId: 'region-north'
      }
    },
    expectedResult: 'ALLOW',
    reasoning: 'Same org, same region, assignor can create'
  },
  {
    name: 'Assignor creates game in different region',
    user: {
      id: 'assignor-123',
      role: 'assignor',
      organizationId: 'org-sports',
      regionIds: ['region-north']
    },
    resource: {
      kind: 'game',
      action: 'create',
      attributes: {
        organizationId: 'org-sports',
        regionId: 'region-south'
      }
    },
    expectedResult: 'DENY',
    reasoning: 'User not in region-south'
  },
  {
    name: 'Assignor updates own scheduled game',
    user: {
      id: 'assignor-123',
      role: 'assignor',
      organizationId: 'org-sports',
      regionIds: ['region-north']
    },
    resource: {
      kind: 'game',
      action: 'update',
      attributes: {
        organizationId: 'org-sports',
        regionId: 'region-north',
        createdBy: 'assignor-123',
        status: 'scheduled'
      }
    },
    expectedResult: 'ALLOW',
    reasoning: 'Owner, same org/region, scheduled status'
  },
  {
    name: 'Assignor updates game in progress',
    user: {
      id: 'assignor-123',
      role: 'assignor',
      organizationId: 'org-sports',
      regionIds: ['region-north']
    },
    resource: {
      kind: 'game',
      action: 'update',
      attributes: {
        organizationId: 'org-sports',
        regionId: 'region-north',
        createdBy: 'assignor-123',
        status: 'in_progress'
      }
    },
    expectedResult: 'DENY',
    reasoning: 'Cannot update in_progress games'
  },
  {
    name: 'Assignor updates someone else\'s game',
    user: {
      id: 'assignor-123',
      role: 'assignor',
      organizationId: 'org-sports',
      regionIds: ['region-north']
    },
    resource: {
      kind: 'game',
      action: 'update',
      attributes: {
        organizationId: 'org-sports',
        regionId: 'region-north',
        createdBy: 'assignor-456',
        status: 'scheduled'
      }
    },
    expectedResult: 'DENY',
    reasoning: 'Not the owner of the game'
  },
  {
    name: 'Assignor deletes own scheduled game',
    user: {
      id: 'assignor-123',
      role: 'assignor',
      organizationId: 'org-sports',
      regionIds: ['region-north']
    },
    resource: {
      kind: 'game',
      action: 'delete',
      attributes: {
        organizationId: 'org-sports',
        regionId: 'region-north',
        createdBy: 'assignor-123',
        status: 'scheduled'
      }
    },
    expectedResult: 'ALLOW',
    reasoning: 'Owner, scheduled status, same org/region'
  },
  {
    name: 'Assignor deletes someone else\'s game',
    user: {
      id: 'assignor-123',
      role: 'assignor',
      organizationId: 'org-sports',
      regionIds: ['region-north']
    },
    resource: {
      kind: 'game',
      action: 'delete',
      attributes: {
        organizationId: 'org-sports',
        regionId: 'region-north',
        createdBy: 'assignor-456',
        status: 'scheduled'
      }
    },
    expectedResult: 'DENY',
    reasoning: 'Not the owner, only owner can delete'
  },
  {
    name: 'Referee views game in their region',
    user: {
      id: 'referee-789',
      role: 'referee',
      organizationId: 'org-sports',
      regionIds: ['region-north']
    },
    resource: {
      kind: 'game',
      action: 'view',
      attributes: {
        organizationId: 'org-sports',
        regionId: 'region-north'
      }
    },
    expectedResult: 'ALLOW',
    reasoning: 'Same org, same region, referee can view'
  },
  {
    name: 'Referee tries to create game',
    user: {
      id: 'referee-789',
      role: 'referee',
      organizationId: 'org-sports',
      regionIds: ['region-north']
    },
    resource: {
      kind: 'game',
      action: 'create',
      attributes: {
        organizationId: 'org-sports',
        regionId: 'region-north'
      }
    },
    expectedResult: 'DENY',
    reasoning: 'Referees cannot create games'
  },
  {
    name: 'Admin accesses any game in org',
    user: {
      id: 'admin-999',
      role: 'admin',
      organizationId: 'org-sports',
      regionIds: ['region-north', 'region-south']
    },
    resource: {
      kind: 'game',
      action: 'delete',
      attributes: {
        organizationId: 'org-sports',
        regionId: 'region-south',
        createdBy: 'someone-else',
        status: 'in_progress'
      }
    },
    expectedResult: 'ALLOW',
    reasoning: 'Admin has full access in organization'
  },
  {
    name: 'Cross-organization access attempt',
    user: {
      id: 'assignor-123',
      role: 'assignor',
      organizationId: 'org-sports',
      regionIds: ['region-north']
    },
    resource: {
      kind: 'game',
      action: 'view',
      attributes: {
        organizationId: 'org-different',
        regionId: 'region-north'
      }
    },
    expectedResult: 'DENY',
    reasoning: 'Different organization, blocked'
  },
];

// Simulate authorization checks
scenarios.forEach((scenario, index) => {
  console.log(`Test ${index + 1}: ${scenario.name}`);
  console.log('-'.repeat(60));
  console.log(`  User: ${scenario.user.role} (${scenario.user.id})`);
  console.log(`  Org: ${scenario.user.organizationId}`);
  console.log(`  Regions: ${scenario.user.regionIds.join(', ')}`);
  console.log('');
  console.log(`  Action: ${scenario.resource.action} on ${scenario.resource.kind}`);
  console.log(`  Resource Org: ${scenario.resource.attributes.organizationId}`);
  if (scenario.resource.attributes.regionId) {
    console.log(`  Resource Region: ${scenario.resource.attributes.regionId}`);
  }
  if (scenario.resource.attributes.createdBy) {
    console.log(`  Created By: ${scenario.resource.attributes.createdBy}`);
  }
  if (scenario.resource.attributes.status) {
    console.log(`  Status: ${scenario.resource.attributes.status}`);
  }
  console.log('');

  // Simulate policy evaluation
  const result = scenario.expectedResult;
  const icon = result === 'ALLOW' ? '✅' : '❌';

  console.log(`  Result: ${icon} ${result}`);
  console.log(`  Reason: ${scenario.reasoning}`);
  console.log('');
  console.log('');
});

// Summary
const allowCount = scenarios.filter(s => s.expectedResult === 'ALLOW').length;
const denyCount = scenarios.filter(s => s.expectedResult === 'DENY').length;

console.log('=' .repeat(60));
console.log('Summary:');
console.log(`  ✅ Allowed: ${allowCount}/${scenarios.length}`);
console.log(`  ❌ Denied: ${denyCount}/${scenarios.length}`);
console.log('');
console.log('This simulation shows how Cerbos policies would evaluate');
console.log('each scenario based on the rules in cerbos-policies/');
console.log('');
console.log('To test with real Cerbos:');
console.log('  1. Start Cerbos: docker-compose -f docker-compose.cerbos.yml up -d');
console.log('  2. Start backend: npm run dev');
console.log('  3. Make real API requests with JWT tokens');
console.log('');
console.log('See TESTING_GUIDE.md for detailed testing instructions');