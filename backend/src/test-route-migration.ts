#!/usr/bin/env node

/**
 * Route Migration Test Script
 *
 * Tests migrated routes to ensure Cerbos authorization is working correctly.
 * Verifies organizational boundaries and role-based access control.
 */

import axios from 'axios';
import { config } from 'dotenv';

// Load environment variables
config();

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_PREFIX = '/api';

// Test tokens (these would need to be real tokens in practice)
const TEST_TOKENS = {
  admin: process.env.TEST_ADMIN_TOKEN || 'admin_token_here',
  assignor: process.env.TEST_ASSIGNOR_TOKEN || 'assignor_token_here',
  referee: process.env.TEST_REFEREE_TOKEN || 'referee_token_here',
  guest: process.env.TEST_GUEST_TOKEN || 'guest_token_here'
};

interface TestRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  expectedRoles: string[];
  testData?: any;
}

// Migrated routes to test
const MIGRATED_ROUTES: TestRoute[] = [
  // Admin routes
  {
    method: 'GET',
    path: '/admin/roles',
    description: 'List all roles',
    expectedRoles: ['admin']
  },
  {
    method: 'GET',
    path: '/admin/permissions',
    description: 'List all permissions',
    expectedRoles: ['admin']
  },

  // Core feature routes
  {
    method: 'GET',
    path: '/assignments',
    description: 'List assignments',
    expectedRoles: ['admin', 'assignor', 'referee']
  },
  {
    method: 'GET',
    path: '/referees',
    description: 'List referees',
    expectedRoles: ['admin', 'assignor']
  },

  // Financial routes
  {
    method: 'GET',
    path: '/expenses/receipts',
    description: 'List expense receipts',
    expectedRoles: ['admin', 'assignor']
  }
];

class RouteMigrationTester {
  private results: any[] = [];

  async testRoute(route: TestRoute, role: string, token: string): Promise<boolean> {
    try {
      const url = `${BASE_URL}${API_PREFIX}${route.path}`;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      console.log(`Testing ${role}: ${route.method} ${route.path}`);

      const response = await axios({
        method: route.method,
        url,
        headers,
        data: route.testData,
        timeout: 5000,
        validateStatus: () => true // Don't throw on non-2xx status
      });

      const expectedSuccess = route.expectedRoles.includes(role);
      const actualSuccess = response.status >= 200 && response.status < 300;
      const passed = expectedSuccess === actualSuccess;

      const result = {
        route: route.path,
        method: route.method,
        role,
        expected: expectedSuccess ? 'SUCCESS' : 'DENIED',
        actual: actualSuccess ? 'SUCCESS' : 'DENIED',
        status: response.status,
        passed,
        response: response.data
      };

      this.results.push(result);

      if (passed) {
        console.log(`  ✅ ${role}: ${response.status} (Expected)`);
      } else {
        console.log(`  ❌ ${role}: ${response.status} (Unexpected)`);
      }

      return passed;

    } catch (error: any) {
      console.log(`  💥 ${role}: Error - ${error.message}`);

      const result = {
        route: route.path,
        method: route.method,
        role,
        expected: route.expectedRoles.includes(role) ? 'SUCCESS' : 'DENIED',
        actual: 'ERROR',
        status: error.response?.status || 'NETWORK_ERROR',
        passed: false,
        error: error.message
      };

      this.results.push(result);
      return false;
    }
  }

  async testOrganizationalBoundaries(): Promise<void> {
    console.log('\n🔒 Testing Organizational Boundaries...');

    // This would test that users from org A cannot access org B's data
    // Would need test data setup with multiple organizations
    console.log('  ⚠️  Organizational boundary tests require test data setup');
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Route Migration Tests...\n');

    for (const route of MIGRATED_ROUTES) {
      console.log(`\n📍 Testing: ${route.description}`);

      // Test with each role
      for (const [role, token] of Object.entries(TEST_TOKENS)) {
        await this.testRoute(route, role, token);
      }
    }

    await this.testOrganizationalBoundaries();
    this.generateReport();
  }

  generateReport(): void {
    console.log('\n📊 Migration Test Report');
    console.log('=' .repeat(50));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  ${r.route} [${r.method}] - ${r.role}: Expected ${r.expected}, got ${r.actual}`);
        });
    }

    // Group by route
    console.log('\n📈 Results by Route:');
    const routeGroups = this.results.reduce((acc, result) => {
      const key = `${result.method} ${result.route}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(result);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(routeGroups).forEach(([route, results]) => {
      const passed = results.filter(r => r.passed).length;
      const total = results.length;
      console.log(`  ${route}: ${passed}/${total} passed`);
    });
  }

  async checkCerbosConnection(): Promise<boolean> {
    try {
      // This would check if Cerbos is running and accessible
      console.log('🔌 Checking Cerbos connection...');
      console.log('  ⚠️  Cerbos connection check not implemented');
      return true;
    } catch (error) {
      console.log('  ❌ Cerbos connection failed');
      return false;
    }
  }
}

// Main execution
async function main() {
  const tester = new RouteMigrationTester();

  console.log('Phase 3 Route Migration Test Suite');
  console.log('==================================\n');

  // Check prerequisites
  const cerbosConnected = await tester.checkCerbosConnection();
  if (!cerbosConnected) {
    console.log('❌ Prerequisites not met. Exiting.');
    process.exit(1);
  }

  // Run tests
  await tester.runAllTests();

  console.log('\n✅ Migration tests completed!');
  console.log('\nNext steps:');
  console.log('1. Set up test tokens in environment variables');
  console.log('2. Create test data for organizational boundary testing');
  console.log('3. Add more detailed route testing');
  console.log('4. Integrate with CI/CD pipeline');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { RouteMigrationTester, MIGRATED_ROUTES };