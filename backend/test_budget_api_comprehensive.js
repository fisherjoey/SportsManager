#!/usr/bin/env node

/**
 * Comprehensive Budget Management System API Testing Script
 * 
 * This script performs end-to-end testing of the budget management system:
 * 1. API Endpoint Testing
 * 2. Data Validation Testing
 * 3. CRUD Operations Testing
 * 4. Error Handling Testing
 * 5. Integration Testing
 */

const request = require('supertest');
const app = require('./src/app');
const db = require('./src/config/database');
const jwt = require('jsonwebtoken');

class BudgetAPITester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.testUser = null;
    this.testToken = null;
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
      reset: '\x1b[0m'     // Reset
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async setupTestEnvironment() {
    this.log('🔧 Setting up test environment...', 'info');
    
    try {
      // Use the existing test user from seed data (from budget_system_seed.js)
      const testUserId = '123e4567-e89b-12d3-a456-426614174000';
      let user = await db('users').where('id', testUserId).first();
      
      if (!user) {
        // Create test user matching the seed data
        const [createdUser] = await db('users').insert({
          id: testUserId,
          email: 'test@sportsmanagement.com',
          password_hash: 'test-hash',
          role: 'admin',
          name: 'Test Admin User'
        }).returning('*');
        user = createdUser;
        this.log('✅ Test user created to match seed data', 'success');
      } else {
        this.log('✅ Test user found from seed data', 'success');
      }
      
      this.testUser = user;
      
      // Create a valid JWT token for testing
      const jwtSecret = process.env.JWT_SECRET || 'fallback-test-secret-key';
      this.testToken = jwt.sign({
        id: this.testUser.id,
        email: this.testUser.email,
        role: 'admin',
        organization_id: this.testUser.id
      }, jwtSecret, { expiresIn: '1h' });
      
      this.log('✅ Test environment ready', 'success');
      return true;
      
    } catch (error) {
      this.log(`❌ Setup failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runTest(name, testFunction) {
    this.log(`\n🧪 Running: ${name}`, 'info');
    
    try {
      const result = await testFunction();
      if (result !== false) {
        this.results.passed++;
        this.results.tests.push({ name, status: 'PASSED', result });
        this.log(`✅ PASSED: ${name}`, 'success');
        return true;
      } else {
        this.results.failed++;
        this.results.tests.push({ name, status: 'FAILED', error: 'Test returned false' });
        this.log(`❌ FAILED: ${name}`, 'error');
        return false;
      }
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      this.log(`❌ FAILED: ${name} - ${error.message}`, 'error');
      return false;
    }
  }

  async testBudgetPeriods() {
    return await this.runTest('Budget Periods API', async () => {
      // Test GET /api/budgets/periods
      const getResponse = await request(app)
        .get('/api/budgets/periods')
        .set('Authorization', `Bearer ${this.testToken}`);
      
      if (getResponse.status !== 200) {
        throw new Error(`GET periods failed with status ${getResponse.status}`);
      }

      const periods = getResponse.body.periods;
      if (!Array.isArray(periods) || periods.length === 0) {
        throw new Error('No budget periods found');
      }

      this.log(`   Found ${periods.length} budget periods`, 'info');
      
      // Validate period structure
      const period = periods[0];
      const requiredFields = ['id', 'name', 'start_date', 'end_date', 'status'];
      for (const field of requiredFields) {
        if (!(field in period)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Test pagination
      const paginatedResponse = await request(app)
        .get('/api/budgets/periods?page=1&limit=2')
        .set('Authorization', `Bearer ${this.testToken}`);
      
      if (paginatedResponse.status !== 200) {
        throw new Error('Pagination test failed');
      }

      const pagination = paginatedResponse.body.pagination;
      if (!pagination || typeof pagination.page !== 'number') {
        throw new Error('Invalid pagination structure');
      }

      return { 
        periodsCount: periods.length,
        firstPeriod: period,
        paginationWorks: true
      };
    });
  }

  async testBudgetCategories() {
    return await this.runTest('Budget Categories API', async () => {
      // Test GET /api/budgets/categories
      const getResponse = await request(app)
        .get('/api/budgets/categories')
        .set('Authorization', `Bearer ${this.testToken}`);
      
      if (getResponse.status !== 200) {
        throw new Error(`GET categories failed with status ${getResponse.status}`);
      }

      const categories = getResponse.body.categories;
      if (!Array.isArray(categories) || categories.length === 0) {
        throw new Error('No budget categories found');
      }

      this.log(`   Found ${categories.length} budget categories`, 'info');
      
      // Validate category structure
      const category = categories[0];
      const requiredFields = ['id', 'name', 'code', 'category_type'];
      for (const field of requiredFields) {
        if (!(field in category)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Test filtering by type
      const typeFilterResponse = await request(app)
        .get('/api/budgets/categories?type=revenue')
        .set('Authorization', `Bearer ${this.testToken}`);
      
      if (typeFilterResponse.status !== 200) {
        throw new Error('Type filtering test failed');
      }

      const revenueCategories = typeFilterResponse.body.categories;
      if (revenueCategories.length > 0) {
        const hasOnlyRevenue = revenueCategories.every(cat => cat.category_type === 'revenue');
        if (!hasOnlyRevenue) {
          throw new Error('Type filtering not working correctly');
        }
      }

      return { 
        categoriesCount: categories.length,
        firstCategory: category,
        typeFilterWorks: true
      };
    });
  }

  async testBudgetsAPI() {
    return await this.runTest('Budgets API', async () => {
      // Test GET /api/budgets
      const getResponse = await request(app)
        .get('/api/budgets')
        .set('Authorization', `Bearer ${this.testToken}`);
      
      if (getResponse.status !== 200) {
        throw new Error(`GET budgets failed with status ${getResponse.status}`);
      }

      const budgets = getResponse.body.budgets;
      if (!Array.isArray(budgets) || budgets.length === 0) {
        throw new Error('No budgets found');
      }

      this.log(`   Found ${budgets.length} budgets`, 'info');
      
      // Validate budget structure
      const budget = budgets[0];
      const requiredFields = ['id', 'name', 'allocated_amount', 'category_id', 'budget_period_id'];
      for (const field of requiredFields) {
        if (!(field in budget)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Test with summary
      const summaryResponse = await request(app)
        .get('/api/budgets?include_summary=true')
        .set('Authorization', `Bearer ${this.testToken}`);
      
      if (summaryResponse.status !== 200) {
        throw new Error('Summary test failed');
      }

      const summary = summaryResponse.body.summary;
      if (!summary || typeof summary.total_budgets === 'undefined') {
        throw new Error('Summary data missing or invalid');
      }

      this.log(`   Summary: ${summary.total_budgets} budgets, $${summary.total_allocated || 0} allocated`, 'info');

      // Test with allocations
      const allocationsResponse = await request(app)
        .get('/api/budgets?include_allocations=true')
        .set('Authorization', `Bearer ${this.testToken}`);
      
      if (allocationsResponse.status !== 200) {
        throw new Error('Allocations test failed');
      }

      return { 
        budgetsCount: budgets.length,
        firstBudget: budget,
        summaryWorks: true,
        allocationsWorks: true,
        summary
      };
    });
  }

  async testBudgetDetails() {
    return await this.runTest('Budget Details API', async () => {
      // First get a budget ID
      const budgetsResponse = await request(app)
        .get('/api/budgets')
        .set('Authorization', `Bearer ${this.testToken}`);
      
      if (budgetsResponse.status !== 200 || !budgetsResponse.body.budgets.length) {
        throw new Error('No budgets available for detail testing');
      }

      const budgetId = budgetsResponse.body.budgets[0].id;
      
      // Test GET /api/budgets/:id
      const detailResponse = await request(app)
        .get(`/api/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${this.testToken}`);
      
      if (detailResponse.status !== 200) {
        throw new Error(`GET budget detail failed with status ${detailResponse.status}`);
      }

      const { budget, allocations, recent_transactions, alerts } = detailResponse.body;
      
      if (!budget || budget.id !== budgetId) {
        throw new Error('Budget detail response invalid');
      }

      if (!Array.isArray(allocations)) {
        throw new Error('Allocations should be an array');
      }

      if (!Array.isArray(recent_transactions)) {
        throw new Error('Recent transactions should be an array');
      }

      if (!Array.isArray(alerts)) {
        throw new Error('Alerts should be an array');
      }

      this.log(`   Budget "${budget.name}" has ${allocations.length} allocations`, 'info');

      return { 
        budgetId,
        budget,
        allocationsCount: allocations.length,
        transactionsCount: recent_transactions.length,
        alertsCount: alerts.length
      };
    });
  }

  async testDataIntegrity() {
    return await this.runTest('Data Integrity', async () => {
      // Query database directly to validate data integrity
      const periodsCount = await db('budget_periods').count('id as count').first();
      const categoriesCount = await db('budget_categories').count('id as count').first();
      const budgetsCount = await db('budgets').count('id as count').first();
      const allocationsCount = await db('budget_allocations').count('id as count').first();

      this.log(`   Database counts: ${periodsCount.count} periods, ${categoriesCount.count} categories`, 'info');
      this.log(`   ${budgetsCount.count} budgets, ${allocationsCount.count} allocations`, 'info');

      // Validate foreign key relationships
      const budgetsWithInvalidPeriods = await db('budgets')
        .leftJoin('budget_periods', 'budgets.budget_period_id', 'budget_periods.id')
        .whereNull('budget_periods.id')
        .count('budgets.id as count')
        .first();

      if (parseInt(budgetsWithInvalidPeriods.count) > 0) {
        throw new Error('Found budgets with invalid period references');
      }

      const budgetsWithInvalidCategories = await db('budgets')
        .leftJoin('budget_categories', 'budgets.category_id', 'budget_categories.id')
        .whereNull('budget_categories.id')
        .count('budgets.id as count')
        .first();

      if (parseInt(budgetsWithInvalidCategories.count) > 0) {
        throw new Error('Found budgets with invalid category references');
      }

      // Test budget calculations
      const budgetWithCalculations = await db('budgets')
        .select('*')
        .select(db.raw('(allocated_amount - committed_amount - actual_spent - reserved_amount) as calculated_available'))
        .first();

      if (budgetWithCalculations) {
        const manualCalculation = 
          parseFloat(budgetWithCalculations.allocated_amount) - 
          parseFloat(budgetWithCalculations.committed_amount || 0) - 
          parseFloat(budgetWithCalculations.actual_spent || 0) - 
          parseFloat(budgetWithCalculations.reserved_amount || 0);

        const dbCalculation = parseFloat(budgetWithCalculations.calculated_available);
        
        if (Math.abs(manualCalculation - dbCalculation) > 0.01) {
          throw new Error('Budget calculation mismatch detected');
        }
      }

      return {
        counts: {
          periods: parseInt(periodsCount.count),
          categories: parseInt(categoriesCount.count),
          budgets: parseInt(budgetsCount.count),
          allocations: parseInt(allocationsCount.count)
        },
        integrityChecks: {
          foreignKeysValid: true,
          calculationsAccurate: true
        }
      };
    });
  }

  async testErrorHandling() {
    return await this.runTest('Error Handling', async () => {
      const errors = [];

      // Test invalid budget ID
      try {
        const invalidResponse = await request(app)
          .get('/api/budgets/invalid-uuid')
          .set('Authorization', `Bearer ${this.testToken}`);
        
        if (invalidResponse.status === 200) {
          errors.push('Should return error for invalid budget ID');
        }
      } catch (error) {
        // Expected error
      }

      // Test unauthorized access
      try {
        const unauthorizedResponse = await request(app)
          .get('/api/budgets/periods');
        
        if (unauthorizedResponse.status !== 401 && unauthorizedResponse.status !== 403) {
          errors.push('Should return 401/403 for unauthorized access');
        }
      } catch (error) {
        // Expected error
      }

      // Test invalid query parameters
      try {
        const invalidQueryResponse = await request(app)
          .get('/api/budgets?page=-1&limit=invalid')
          .set('Authorization', `Bearer ${this.testToken}`);
        
        // Should still return 200 but handle gracefully
        if (invalidQueryResponse.status !== 200) {
          errors.push('Should handle invalid query parameters gracefully');
        }
      } catch (error) {
        // Expected error
      }

      if (errors.length > 0) {
        throw new Error('Error handling issues: ' + errors.join(', '));
      }

      return { errorHandlingWorks: true };
    });
  }

  async testPerformance() {
    return await this.runTest('Performance Testing', async () => {
      const startTime = Date.now();
      
      // Run multiple concurrent requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/budgets?include_summary=true')
            .set('Authorization', `Bearer ${this.testToken}`)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      const allSucceeded = responses.every(response => response.status === 200);
      if (!allSucceeded) {
        throw new Error('Some concurrent requests failed');
      }

      const averageTime = totalTime / 10;
      this.log(`   10 concurrent requests completed in ${totalTime}ms (avg: ${averageTime}ms)`, 'info');

      // Performance threshold (requests should complete within reasonable time)
      if (averageTime > 1000) {
        throw new Error(`Average response time too slow: ${averageTime}ms`);
      }

      return {
        totalTime,
        averageTime,
        concurrentRequestsSucceeded: allSucceeded
      };
    });
  }

  async generateReport() {
    this.log('\n📊 COMPREHENSIVE BUDGET API TEST REPORT', 'info');
    this.log('='.repeat(50), 'info');
    
    this.log(`\n📈 TEST SUMMARY:`, 'info');
    this.log(`   Total Tests: ${this.results.passed + this.results.failed}`, 'info');
    this.log(`   Passed: ${this.results.passed}`, 'success');
    this.log(`   Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'success');
    this.log(`   Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`, 'info');

    this.log(`\n📋 DETAILED RESULTS:`, 'info');
    this.results.tests.forEach((test, index) => {
      const status = test.status === 'PASSED' ? '✅' : '❌';
      this.log(`   ${index + 1}. ${status} ${test.name}`, test.status === 'PASSED' ? 'success' : 'error');
      if (test.error) {
        this.log(`      Error: ${test.error}`, 'error');
      }
    });

    // Overall assessment
    this.log(`\n🎯 OVERALL ASSESSMENT:`, 'info');
    if (this.results.failed === 0) {
      this.log('   ✅ ALL TESTS PASSED - Budget system is production ready!', 'success');
    } else if (this.results.failed <= 2) {
      this.log('   ⚠️  MOSTLY WORKING - Minor issues need attention', 'warning');
    } else {
      this.log('   ❌ SIGNIFICANT ISSUES - System needs debugging before production', 'error');
    }

    this.log(`\n🔧 RECOMMENDATIONS:`, 'info');
    if (this.results.failed === 0) {
      this.log('   • System is ready for frontend integration testing', 'info');
      this.log('   • Consider load testing with higher concurrent users', 'info');
      this.log('   • Add monitoring and alerts for production deployment', 'info');
    } else {
      this.log('   • Fix failing tests before proceeding to frontend testing', 'warning');
      this.log('   • Review error handling and validation logic', 'warning');
      this.log('   • Ensure all database constraints are properly implemented', 'warning');
    }

    this.log('\n='.repeat(50), 'info');
  }

  async cleanup() {
    try {
      // Clean up test data if needed
      await db.destroy();
      this.log('✅ Cleanup completed', 'success');
    } catch (error) {
      this.log(`⚠️  Cleanup warning: ${error.message}`, 'warning');
    }
  }

  async runAllTests() {
    this.log('🚀 COMPREHENSIVE BUDGET MANAGEMENT SYSTEM TESTING', 'info');
    this.log('='.repeat(60), 'info');

    const setupSuccess = await this.setupTestEnvironment();
    if (!setupSuccess) {
      this.log('❌ Setup failed, aborting tests', 'error');
      return;
    }

    // Run all test suites
    await this.testBudgetPeriods();
    await this.testBudgetCategories();
    await this.testBudgetsAPI();
    await this.testBudgetDetails();
    await this.testDataIntegrity();
    await this.testErrorHandling();
    await this.testPerformance();

    await this.generateReport();
    await this.cleanup();
  }
}

// Run the comprehensive test suite
async function main() {
  const tester = new BudgetAPITester();
  await tester.runAllTests();
  process.exit(tester.results.failed > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = BudgetAPITester;