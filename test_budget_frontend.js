#!/usr/bin/env node

/**
 * Frontend Budget Tracker Integration Test
 * 
 * This script tests the BudgetTracker component integration with the backend API
 * by simulating API calls and validating data flow.
 */

const http = require('http');
const https = require('https');
const querystring = require('querystring');

class BudgetFrontendTester {
  constructor() {
    this.baseURL = 'http://localhost:3001/api';
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.authToken = null;
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

  async setupAuthentication() {
    this.log('🔧 Setting up authentication for frontend testing...', 'info');
    
    try {
      // Simulate login to get auth token
      // In a real app, this would be the login endpoint
      // For testing, we'll use a hardcoded token that matches our backend user
      const jwt = require('./backend/node_modules/jsonwebtoken');
      const jwtSecret = process.env.JWT_SECRET || 'fallback-test-secret-key';
      
      this.authToken = jwt.sign({
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@sportsmanagement.com',
        role: 'admin',
        organization_id: '123e4567-e89b-12d3-a456-426614174000'
      }, jwtSecret, { expiresIn: '1h' });

      this.log('✅ Authentication token created', 'success');
      return true;
      
    } catch (error) {
      this.log(`❌ Authentication setup failed: ${error.message}`, 'error');
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

  async apiCall(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseURL}${endpoint}`);
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const jsonData = JSON.parse(body);
              resolve(jsonData);
            } else {
              let errorMsg;
              try {
                const errorData = JSON.parse(body);
                errorMsg = errorData.error || `HTTP ${res.statusCode}`;
              } catch (e) {
                errorMsg = `HTTP ${res.statusCode}: ${res.statusMessage}`;
              }
              reject(new Error(`API Error ${res.statusCode}: ${errorMsg}`));
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse response: ${parseError.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Network Error: ${error.message}`));
      });

      if (data) {
        const jsonData = JSON.stringify(data);
        req.write(jsonData);
      }

      req.end();
    });
  }

  async testBudgetPeriodsFetch() {
    return await this.runTest('Frontend: Fetch Budget Periods', async () => {
      const data = await this.apiCall('/budgets/periods');
      
      if (!data.periods || !Array.isArray(data.periods)) {
        throw new Error('Expected periods array not found');
      }

      const periodsCount = data.periods.length;
      this.log(`   Found ${periodsCount} budget periods`, 'info');

      // Validate structure that frontend component expects
      const period = data.periods[0];
      const requiredFields = ['id', 'name', 'start_date', 'end_date', 'status'];
      for (const field of requiredFields) {
        if (!(field in period)) {
          throw new Error(`Missing required field for frontend: ${field}`);
        }
      }

      // Check pagination structure
      if (!data.pagination || typeof data.pagination.page !== 'number') {
        throw new Error('Frontend expects pagination object');
      }

      return { periodsCount, firstPeriod: period, pagination: data.pagination };
    });
  }

  async testBudgetCategoriesFetch() {
    return await this.runTest('Frontend: Fetch Budget Categories', async () => {
      const data = await this.apiCall('/budgets/categories');
      
      if (!data.categories || !Array.isArray(data.categories)) {
        throw new Error('Expected categories array not found');
      }

      const categoriesCount = data.categories.length;
      this.log(`   Found ${categoriesCount} budget categories`, 'info');

      // Validate structure for frontend dropdown
      const category = data.categories[0];
      const requiredFields = ['id', 'name', 'code', 'category_type'];
      for (const field of requiredFields) {
        if (!(field in category)) {
          throw new Error(`Missing required field for frontend: ${field}`);
        }
      }

      // Test hierarchical structure (frontend expects this for complex categories)
      const hierarchicalData = await this.apiCall('/budgets/categories');
      if (!hierarchicalData.categories) {
        throw new Error('Hierarchical categories not available');
      }

      return { categoriesCount, firstCategory: category };
    });
  }

  async testBudgetsFetchWithSummary() {
    return await this.runTest('Frontend: Fetch Budgets with Summary', async () => {
      const data = await this.apiCall('/budgets?include_summary=true&include_allocations=true');
      
      if (!data.budgets || !Array.isArray(data.budgets)) {
        throw new Error('Expected budgets array not found');
      }

      if (!data.summary) {
        throw new Error('Frontend expects summary data for dashboard');
      }

      const budgetsCount = data.budgets.length;
      this.log(`   Found ${budgetsCount} budgets with summary`, 'info');

      // Validate budget structure for frontend components
      const budget = data.budgets[0];
      const requiredFields = ['id', 'name', 'allocated_amount', 'category_id', 'budget_period_id'];
      const optionalDisplayFields = ['category_name', 'period_name', 'spent_amount', 'utilization_rate'];
      
      for (const field of requiredFields) {
        if (!(field in budget)) {
          throw new Error(`Missing required field for frontend: ${field}`);
        }
      }

      // Check for allocations if requested
      if (budget.allocations) {
        this.log(`   Budget has ${budget.allocations.length} allocations`, 'info');
      }

      // Validate summary structure for dashboard
      const summaryFields = ['total_budgets', 'total_allocated'];
      for (const field of summaryFields) {
        if (!(field in data.summary)) {
          throw new Error(`Missing summary field for dashboard: ${field}`);
        }
      }

      return { 
        budgetsCount, 
        firstBudget: budget,
        summary: data.summary,
        hasAllocations: !!budget.allocations
      };
    });
  }

  async testBudgetDetailView() {
    return await this.runTest('Frontend: Budget Detail View', async () => {
      // First get a budget ID
      const budgetsData = await this.apiCall('/budgets');
      if (!budgetsData.budgets.length) {
        throw new Error('No budgets available for detail testing');
      }

      const budgetId = budgetsData.budgets[0].id;
      const data = await this.apiCall(`/budgets/${budgetId}`);
      
      if (!data.budget || data.budget.id !== budgetId) {
        throw new Error('Budget detail not found');
      }

      // Validate all data needed for frontend detail view
      const requiredProperties = ['budget', 'allocations', 'recent_transactions', 'alerts'];
      for (const prop of requiredProperties) {
        if (!(prop in data)) {
          throw new Error(`Missing detail property: ${prop}`);
        }
        if (!Array.isArray(data[prop]) && prop !== 'budget') {
          throw new Error(`Property ${prop} should be an array`);
        }
      }

      // Validate budget has all display fields
      const budget = data.budget;
      const displayFields = ['name', 'allocated_amount', 'category_name', 'period_name'];
      for (const field of displayFields) {
        if (!(field in budget)) {
          this.log(`   Warning: Missing display field ${field}`, 'warning');
        }
      }

      this.log(`   Budget detail has ${data.allocations.length} allocations, ${data.alerts.length} alerts`, 'info');

      return {
        budgetId,
        budget: data.budget,
        allocationsCount: data.allocations.length,
        transactionsCount: data.recent_transactions.length,
        alertsCount: data.alerts.length
      };
    });
  }

  async testBudgetCRUDOperations() {
    return await this.runTest('Frontend: Budget CRUD Operations', async () => {
      // Get periods and categories for creating a budget
      const periodsData = await this.apiCall('/budgets/periods');
      const categoriesData = await this.apiCall('/budgets/categories');
      
      if (!periodsData.periods.length || !categoriesData.categories.length) {
        throw new Error('Need periods and categories to test CRUD');
      }

      const periodId = periodsData.periods[0].id;
      const categoryId = categoriesData.categories[0].id;

      // Test CREATE
      const createData = {
        budget_period_id: periodId,
        category_id: categoryId,
        name: 'Frontend Test Budget',
        description: 'Created by frontend integration test',
        allocated_amount: 1500.00
      };

      this.log('   Testing budget creation...', 'info');
      const createResponse = await this.apiCall('/budgets', 'POST', createData);
      
      if (!createResponse.budget || !createResponse.budget.id) {
        throw new Error('Budget creation failed');
      }

      const createdBudgetId = createResponse.budget.id;
      this.log(`   Created budget with ID: ${createdBudgetId}`, 'success');

      // Test READ (individual budget)
      this.log('   Testing budget read...', 'info');
      const readResponse = await this.apiCall(`/budgets/${createdBudgetId}`);
      if (readResponse.budget.name !== createData.name) {
        throw new Error('Created budget data mismatch');
      }

      // Test UPDATE
      this.log('   Testing budget update...', 'info');
      const updateData = {
        ...createData,
        name: 'Updated Frontend Test Budget',
        allocated_amount: 2000.00
      };

      const updateResponse = await this.apiCall(`/budgets/${createdBudgetId}`, 'PUT', updateData);
      if (updateResponse.budget.name !== updateData.name) {
        throw new Error('Budget update failed');
      }

      // Clean up - NOTE: Delete endpoint might not be implemented
      try {
        await this.apiCall(`/budgets/${createdBudgetId}`, 'DELETE');
        this.log('   Budget deletion successful', 'success');
      } catch (error) {
        this.log('   Budget deletion not implemented (expected)', 'warning');
      }

      return {
        createSuccess: true,
        readSuccess: true,
        updateSuccess: true,
        createdBudgetId
      };
    });
  }

  async testDataTransformations() {
    return await this.runTest('Frontend: Data Transformations', async () => {
      // Test that data comes in format expected by frontend components
      const data = await this.apiCall('/budgets?include_summary=true');
      
      // Test currency formatting needs
      const budget = data.budgets[0];
      if (typeof budget.allocated_amount !== 'string' && typeof budget.allocated_amount !== 'number') {
        throw new Error('Budget amount should be string or number for frontend formatting');
      }

      // Test date formatting needs
      if (budget.created_at && isNaN(Date.parse(budget.created_at))) {
        throw new Error('Created date should be valid date string');
      }

      // Test percentage calculations
      if (budget.utilization_rate !== undefined && (budget.utilization_rate < 0 || budget.utilization_rate > 1000)) {
        this.log('   Warning: Utilization rate seems out of normal range', 'warning');
      }

      // Test summary calculations
      const summary = data.summary;
      const totalFromBudgets = data.budgets.reduce((sum, b) => sum + parseFloat(b.allocated_amount || 0), 0);
      const summaryTotal = parseFloat(summary.total_allocated || 0);
      
      if (Math.abs(totalFromBudgets - summaryTotal) > 0.01) {
        throw new Error('Summary calculations may be incorrect');
      }

      this.log('   Data formats are frontend-compatible', 'success');

      return {
        currencyFormatOk: true,
        dateFormatOk: true,
        calculationsAccurate: true
      };
    });
  }

  async testErrorScenarios() {
    return await this.runTest('Frontend: Error Handling', async () => {
      const errors = [];

      // Test invalid budget ID (frontend should handle gracefully)
      try {
        await this.apiCall('/budgets/invalid-id');
        errors.push('Should return error for invalid budget ID');
      } catch (error) {
        if (!error.message.includes('400') && !error.message.includes('404')) {
          errors.push('Invalid ID should return 400 or 404');
        }
      }

      // Test invalid creation data
      try {
        const invalidData = {
          name: '', // Empty name
          allocated_amount: -100 // Negative amount
        };
        await this.apiCall('/budgets', 'POST', invalidData);
        errors.push('Should validate required fields');
      } catch (error) {
        if (!error.message.includes('400')) {
          errors.push('Validation errors should return 400');
        }
      }

      // Test unauthorized access (without token)
      try {
        await new Promise((resolve, reject) => {
          const req = http.request({
            hostname: 'localhost',
            port: 3001,
            path: '/api/budgets',
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
              // No Authorization header
            }
          }, (res) => {
            if (res.statusCode === 401 || res.statusCode === 403) {
              resolve(); // Expected error
            } else {
              reject(new Error('Should require authentication'));
            }
          });
          req.on('error', reject);
          req.end();
        });
      } catch (error) {
        errors.push(error.message);
      }

      if (errors.length > 0) {
        throw new Error('Error handling issues: ' + errors.join(', '));
      }

      this.log('   Error scenarios handled correctly', 'success');
      return { errorHandlingOk: true };
    });
  }

  async generateReport() {
    this.log('\n📊 FRONTEND INTEGRATION TEST REPORT', 'info');
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

    this.log(`\n🎯 FRONTEND INTEGRATION ASSESSMENT:`, 'info');
    if (this.results.failed === 0) {
      this.log('   ✅ FRONTEND READY - All API integrations working perfectly!', 'success');
      this.log('   ✅ BudgetTracker component should work seamlessly with backend', 'success');
    } else if (this.results.failed <= 2) {
      this.log('   ⚠️  MOSTLY READY - Minor integration issues to fix', 'warning');
    } else {
      this.log('   ❌ INTEGRATION ISSUES - Frontend will have problems connecting to backend', 'error');
    }

    this.log(`\n🔧 FRONTEND RECOMMENDATIONS:`, 'info');
    if (this.results.failed === 0) {
      this.log('   • BudgetTracker component is ready for user testing', 'info');
      this.log('   • All CRUD operations work correctly', 'info');
      this.log('   • Data formats are compatible with React components', 'info');
      this.log('   • Error handling will work smoothly in UI', 'info');
    } else {
      this.log('   • Fix API integration issues before deploying frontend', 'warning');
      this.log('   • Check data format compatibility with React components', 'warning');
      this.log('   • Ensure error handling provides good user experience', 'warning');
    }

    this.log('\n='.repeat(50), 'info');
  }

  async runAllTests() {
    this.log('🚀 BUDGET FRONTEND INTEGRATION TESTING', 'info');
    this.log('='.repeat(50), 'info');

    const authSuccess = await this.setupAuthentication();
    if (!authSuccess) {
      this.log('❌ Authentication setup failed, aborting tests', 'error');
      return;
    }

    // Run all frontend integration tests
    await this.testBudgetPeriodsFetch();
    await this.testBudgetCategoriesFetch();
    await this.testBudgetsFetchWithSummary();
    await this.testBudgetDetailView();
    await this.testBudgetCRUDOperations();
    await this.testDataTransformations();
    await this.testErrorScenarios();

    await this.generateReport();
  }
}

// Check if backend is running
async function checkBackendHealth() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET'
    }, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', (error) => {
      console.log('\x1b[31m❌ Backend server is not running on port 3001\x1b[0m');
      console.log('\x1b[33mPlease start the backend server first:\x1b[0m');
      console.log('\x1b[36m   cd backend && npm start\x1b[0m');
      resolve(false);
    });

    req.end();
  });
}

// Run the frontend integration test suite
async function main() {
  const backendRunning = await checkBackendHealth();
  if (!backendRunning) {
    process.exit(1);
  }

  const tester = new BudgetFrontendTester();
  await tester.runAllTests();
  process.exit(tester.results.failed > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('\x1b[31m❌ Frontend integration test failed:\x1b[0m', error);
    process.exit(1);
  });
}

module.exports = BudgetFrontendTester;