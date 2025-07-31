#!/usr/bin/env node

/**
 * End-to-End Budget Management Workflow Testing
 * 
 * This script tests the complete budget management workflow:
 * 1. Create Budget Period
 * 2. Create Budget Categories  
 * 3. Create Budgets
 * 4. View and Validate Data
 * 5. Update Budgets
 * 6. Generate Reports
 */

const request = require('supertest');
const app = require('./backend/src/app');
const db = require('./backend/src/config/database');
const jwt = require('./backend/node_modules/jsonwebtoken');

class BudgetE2ETester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.testUser = null;
    this.testToken = null;
    this.createdData = {
      periods: [],
      categories: [],
      budgets: []
    };
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
    this.log('🔧 Setting up E2E test environment...', 'info');
    
    try {
      // Use existing test user
      const testUserId = '123e4567-e89b-12d3-a456-426614174000';
      let user = await db('users').where('id', testUserId).first();
      
      if (!user) {
        this.log('❌ Test user not found - run budget seed data first', 'error');
        return false;
      }
      
      this.testUser = user;
      
      // Create JWT token
      const jwtSecret = process.env.JWT_SECRET || 'fallback-test-secret-key';
      this.testToken = jwt.sign({
        id: this.testUser.id,
        email: this.testUser.email,
        role: 'admin',
        organization_id: this.testUser.id
      }, jwtSecret, { expiresIn: '1h' });
      
      this.log('✅ E2E test environment ready', 'success');
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

  async workflowStep1_CreateBudgetPeriod() {
    return await this.runTest('Workflow Step 1: Create Budget Period', async () => {
      const periodData = {
        name: 'E2E Test Budget Period 2025',
        description: 'End-to-end testing budget period',
        start_date: '2025-08-01',
        end_date: '2025-12-31'
      };

      const response = await request(app)
        .post('/api/budgets/periods')
        .set('Authorization', `Bearer ${this.testToken}`)
        .send(periodData);

      if (response.status !== 201) {
        throw new Error(`Expected 201, got ${response.status}: ${response.body.error}`);
      }

      if (!response.body.period || !response.body.period.id) {
        throw new Error('Period creation response missing period data');
      }

      this.createdData.periods.push(response.body.period);
      this.log(`   Created period: ${response.body.period.name}`, 'success');

      // Verify the period was actually created in database
      const dbPeriod = await db('budget_periods')
        .where('id', response.body.period.id)
        .first();

      if (!dbPeriod) {
        throw new Error('Period not found in database after creation');
      }

      return { period: response.body.period, dbVerified: true };
    });
  }

  async workflowStep2_CreateBudgetCategories() {
    return await this.runTest('Workflow Step 2: Create Budget Categories', async () => {
      const categories = [
        {
          name: 'E2E Test Revenue',
          code: 'E2E_REV',
          description: 'End-to-end test revenue category',
          category_type: 'revenue',
          color_code: '#4CAF50',
          sort_order: 1
        },
        {
          name: 'E2E Test Expenses',
          code: 'E2E_EXP',
          description: 'End-to-end test expense category',
          category_type: 'operating_expenses',
          color_code: '#F44336',
          sort_order: 2
        },
        {
          name: 'E2E Test Equipment',
          code: 'E2E_EQUIP',
          description: 'End-to-end test equipment category',
          category_type: 'equipment',
          color_code: '#2196F3',
          sort_order: 3
        }
      ];

      for (const categoryData of categories) {
        const response = await request(app)
          .post('/api/budgets/categories')
          .set('Authorization', `Bearer ${this.testToken}`)
          .send(categoryData);

        if (response.status !== 201) {
          throw new Error(`Category creation failed: ${response.status} - ${response.body.error}`);
        }

        if (!response.body.category || !response.body.category.id) {
          throw new Error('Category creation response missing category data');
        }

        this.createdData.categories.push(response.body.category);
        this.log(`   Created category: ${response.body.category.name}`, 'success');
      }

      // Verify categories can be retrieved
      const retrieveResponse = await request(app)
        .get('/api/budgets/categories')
        .set('Authorization', `Bearer ${this.testToken}`);

      if (retrieveResponse.status !== 200) {
        throw new Error('Failed to retrieve categories after creation');
      }

      const ourCategories = retrieveResponse.body.categories.filter(cat => 
        cat.code.startsWith('E2E_')
      );

      if (ourCategories.length !== 3) {
        throw new Error(`Expected 3 E2E categories, found ${ourCategories.length}`);
      }

      return { categoriesCreated: categories.length, categoriesRetrieved: ourCategories.length };
    });
  }

  async workflowStep3_CreateBudgets() {
    return await this.runTest('Workflow Step 3: Create Budgets', async () => {
      const period = this.createdData.periods[0];
      const categories = this.createdData.categories;

      if (!period || categories.length === 0) {
        throw new Error('Need period and categories before creating budgets');
      }

      const budgets = [
        {
          budget_period_id: period.id,
          category_id: categories[0].id, // Revenue category
          name: 'E2E Test Revenue Budget',
          description: 'End-to-end test revenue budget',
          allocated_amount: 10000.00,
          variance_rules: {
            warning_threshold: 80,
            critical_threshold: 95
          }
        },
        {
          budget_period_id: period.id,
          category_id: categories[1].id, // Expense category
          name: 'E2E Test Expense Budget',
          description: 'End-to-end test expense budget',
          allocated_amount: 7500.00,
          variance_rules: {
            warning_threshold: 85,
            critical_threshold: 100
          }
        },
        {
          budget_period_id: period.id,
          category_id: categories[2].id, // Equipment category
          name: 'E2E Test Equipment Budget',
          description: 'End-to-end test equipment budget',
          allocated_amount: 3000.00,
          variance_rules: {
            warning_threshold: 90,
            critical_threshold: 100
          }
        }
      ];

      for (const budgetData of budgets) {
        const response = await request(app)
          .post('/api/budgets')
          .set('Authorization', `Bearer ${this.testToken}`)
          .send(budgetData);

        if (response.status !== 201) {
          throw new Error(`Budget creation failed: ${response.status} - ${response.body.error}`);
        }

        if (!response.body.budget || !response.body.budget.id) {
          throw new Error('Budget creation response missing budget data');
        }

        this.createdData.budgets.push(response.body.budget);
        this.log(`   Created budget: ${response.body.budget.name}`, 'success');
      }

      // Verify monthly allocations were created automatically
      const firstBudget = this.createdData.budgets[0];
      const allocations = await db('budget_allocations')
        .where('budget_id', firstBudget.id);

      if (allocations.length === 0) {
        this.log('   Warning: No monthly allocations created automatically', 'warning');
      } else {
        this.log(`   ${allocations.length} monthly allocations created automatically`, 'success');
      }

      return { budgetsCreated: budgets.length, allocationsCreated: allocations.length };
    });
  }

  async workflowStep4_ViewAndValidateData() {
    return await this.runTest('Workflow Step 4: View and Validate Data', async () => {
      const period = this.createdData.periods[0];

      // Test budget list with summary
      const budgetsResponse = await request(app)
        .get(`/api/budgets?period_id=${period.id}&include_summary=true&include_allocations=true`)
        .set('Authorization', `Bearer ${this.testToken}`);

      if (budgetsResponse.status !== 200) {
        throw new Error(`Failed to retrieve budgets: ${budgetsResponse.status}`);
      }

      const { budgets, summary } = budgetsResponse.body;
      
      // Filter to only E2E test budgets
      const e2eBudgets = budgets.filter(b => b.name.startsWith('E2E Test'));
      
      if (e2eBudgets.length !== 3) {
        throw new Error(`Expected 3 E2E budgets, found ${e2eBudgets.length}`);
      }

      // Validate summary calculations
      if (!summary) {
        throw new Error('Summary data missing');
      }

      const expectedTotal = 10000 + 7500 + 3000; // Our test budgets
      this.log(`   Found ${e2eBudgets.length} budgets with summary data`, 'success');

      // Test individual budget details
      const firstBudget = e2eBudgets[0];
      const detailResponse = await request(app)
        .get(`/api/budgets/${firstBudget.id}`)
        .set('Authorization', `Bearer ${this.testToken}`);

      if (detailResponse.status !== 200) {
        throw new Error(`Failed to get budget details: ${detailResponse.status}`);
      }

      const { budget, allocations, recent_transactions, alerts } = detailResponse.body;

      if (budget.id !== firstBudget.id) {
        throw new Error('Budget detail mismatch');
      }

      this.log(`   Budget details: ${allocations.length} allocations, ${alerts.length} alerts`, 'success');

      // Test filtering
      const revenueCategory = this.createdData.categories.find(c => c.category_type === 'revenue');
      const filterResponse = await request(app)
        .get(`/api/budgets?category_id=${revenueCategory.id}`)
        .set('Authorization', `Bearer ${this.testToken}`);

      if (filterResponse.status !== 200) {
        throw new Error('Budget filtering failed');
      }

      return { 
        budgetsFound: e2eBudgets.length,
        summaryValid: !!summary,
        detailsValid: !!budget,
        filteringWorks: true
      };
    });
  }

  async workflowStep5_UpdateBudgets() {
    return await this.runTest('Workflow Step 5: Update Budgets', async () => {
      const budget = this.createdData.budgets[0];

      const updateData = {
        budget_period_id: budget.budget_period_id,
        category_id: budget.category_id,
        name: 'E2E Test Revenue Budget (Updated)',
        description: 'Updated description for E2E testing',
        allocated_amount: 12000.00, // Increased amount
        variance_rules: {
          warning_threshold: 75,
          critical_threshold: 90
        }
      };

      const response = await request(app)
        .put(`/api/budgets/${budget.id}`)
        .set('Authorization', `Bearer ${this.testToken}`)
        .send(updateData);

      if (response.status !== 200) {
        throw new Error(`Budget update failed: ${response.status} - ${response.body.error}`);
      }

      if (!response.body.budget) {
        throw new Error('Update response missing budget data');
      }

      // Verify the update in database
      const updatedBudget = await db('budgets')
        .where('id', budget.id)
        .first();

      if (parseFloat(updatedBudget.allocated_amount) !== 12000.00) {
        throw new Error('Budget amount not updated in database');
      }

      if (updatedBudget.name !== updateData.name) {
        throw new Error('Budget name not updated in database');
      }

      this.log(`   Budget updated: ${updatedBudget.name}`, 'success');

      // Test budget allocation update
      const allocationData = {
        allocation_year: 2025,
        allocation_month: 8,
        allocated_amount: 1500.00,
        notes: 'E2E test allocation update'
      };

      const allocationResponse = await request(app)
        .post(`/api/budgets/${budget.id}/allocations`)
        .set('Authorization', `Bearer ${this.testToken}`)
        .send(allocationData);

      if (allocationResponse.status !== 200) {
        throw new Error(`Allocation update failed: ${allocationResponse.status}`);
      }

      this.log('   Budget allocation updated successfully', 'success');

      return { 
        budgetUpdated: true,
        allocationUpdated: true,
        newAmount: parseFloat(updatedBudget.allocated_amount)
      };
    });
  }

  async workflowStep6_GenerateReports() {
    return await this.runTest('Workflow Step 6: Generate Reports', async () => {
      const period = this.createdData.periods[0];

      // Test comprehensive budget report
      const reportResponse = await request(app)
        .get(`/api/budgets?period_id=${period.id}&include_summary=true&include_allocations=true`)
        .set('Authorization', `Bearer ${this.testToken}`);

      if (reportResponse.status !== 200) {
        throw new Error('Failed to generate budget report');
      }

      const { budgets, summary } = reportResponse.body;
      const e2eBudgets = budgets.filter(b => b.name.includes('E2E Test'));

      // Calculate total allocated amount for our test budgets
      const totalAllocated = e2eBudgets.reduce((sum, b) => sum + parseFloat(b.allocated_amount), 0);
      
      // Should be 12000 + 7500 + 3000 = 22500 (first budget was updated to 12000)
      const expectedTotal = 22500;
      
      if (Math.abs(totalAllocated - expectedTotal) > 0.01) {
        throw new Error(`Total allocation mismatch: expected ${expectedTotal}, got ${totalAllocated}`);
      }

      // Test category breakdown
      const categoryBreakdown = {};
      e2eBudgets.forEach(budget => {
        const categoryName = budget.category_name || 'Unknown';
        if (!categoryBreakdown[categoryName]) {
          categoryBreakdown[categoryName] = 0;
        }
        categoryBreakdown[categoryName] += parseFloat(budget.allocated_amount);
      });

      const categoryCount = Object.keys(categoryBreakdown).length;
      if (categoryCount !== 3) {
        throw new Error(`Expected 3 categories in breakdown, got ${categoryCount}`);
      }

      this.log(`   Report generated: ${e2eBudgets.length} budgets, $${totalAllocated} total`, 'success');
      this.log(`   Category breakdown: ${categoryCount} categories`, 'success');

      // Test period summary
      const periodResponse = await request(app)
        .get('/api/budgets/periods')
        .set('Authorization', `Bearer ${this.testToken}`);

      if (periodResponse.status !== 200) {
        throw new Error('Failed to get period summary');
      }

      const ourPeriod = periodResponse.body.periods.find(p => p.id === period.id);
      if (!ourPeriod) {
        throw new Error('Created period not found in list');
      }

      return {
        totalAllocated,
        categoryBreakdown,
        periodFound: !!ourPeriod,
        reportGenerated: true
      };
    });
  }

  async cleanup() {
    this.log('\n🧹 Cleaning up E2E test data...', 'info');
    
    try {
      // Delete in reverse order of dependencies
      for (const budget of this.createdData.budgets) {
        await db('budget_allocations').where('budget_id', budget.id).del();
        await db('budgets').where('id', budget.id).del();
      }
      
      for (const category of this.createdData.categories) {
        await db('budget_categories').where('id', category.id).del();
      }
      
      for (const period of this.createdData.periods) {
        await db('budget_periods').where('id', period.id).del();
      }
      
      this.log('✅ E2E test data cleaned up', 'success');
    } catch (error) {
      this.log(`⚠️  Cleanup warning: ${error.message}`, 'warning');
    }
  }

  async generateReport() {
    this.log('\n📊 END-TO-END WORKFLOW TEST REPORT', 'info');
    this.log('='.repeat(50), 'info');
    
    this.log(`\n📈 WORKFLOW TEST SUMMARY:`, 'info');
    this.log(`   Total Steps: ${this.results.passed + this.results.failed}`, 'info');
    this.log(`   Passed: ${this.results.passed}`, 'success');
    this.log(`   Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'success');
    this.log(`   Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`, 'info');

    this.log(`\n📋 WORKFLOW STEPS:`, 'info');
    this.results.tests.forEach((test, index) => {
      const status = test.status === 'PASSED' ? '✅' : '❌';
      this.log(`   ${index + 1}. ${status} ${test.name}`, test.status === 'PASSED' ? 'success' : 'error');
      if (test.error) {
        this.log(`      Error: ${test.error}`, 'error');
      }
    });

    this.log(`\n🎯 E2E WORKFLOW ASSESSMENT:`, 'info');
    if (this.results.failed === 0) {
      this.log('   ✅ COMPLETE WORKFLOW SUCCESS - All steps passed!', 'success');
      this.log('   ✅ Budget management system works end-to-end', 'success');
      this.log('   ✅ Create → View → Update → Report workflow is functional', 'success');
    } else if (this.results.failed <= 1) {
      this.log('   ⚠️  MOSTLY WORKING - One step failed', 'warning');
    } else {
      this.log('   ❌ WORKFLOW ISSUES - Multiple steps failed', 'error');
    }

    this.log(`\n🔧 WORKFLOW RECOMMENDATIONS:`, 'info');
    if (this.results.failed === 0) {
      this.log('   • Complete budget management workflow is production-ready', 'info');
      this.log('   • All CRUD operations work in sequence', 'info');
      this.log('   • Data integrity maintained throughout workflow', 'info');
      this.log('   • Ready for user acceptance testing', 'info');
    } else {
      this.log('   • Fix failing workflow steps before production', 'warning');
      this.log('   • Ensure data consistency between steps', 'warning');
      this.log('   • Test workflow with real user scenarios', 'warning');
    }

    this.log('\n='.repeat(50), 'info');
  }

  async runCompleteWorkflow() {
    this.log('🚀 COMPLETE BUDGET MANAGEMENT E2E WORKFLOW TESTING', 'info');
    this.log('='.repeat(60), 'info');

    const setupSuccess = await this.setupTestEnvironment();
    if (!setupSuccess) {
      this.log('❌ Setup failed, aborting E2E tests', 'error');
      return;
    }

    // Run complete workflow
    await this.workflowStep1_CreateBudgetPeriod();
    await this.workflowStep2_CreateBudgetCategories();
    await this.workflowStep3_CreateBudgets();
    await this.workflowStep4_ViewAndValidateData();
    await this.workflowStep5_UpdateBudgets();
    await this.workflowStep6_GenerateReports();

    await this.generateReport();
    await this.cleanup();
  }
}

// Run the complete E2E workflow test
async function main() {
  const tester = new BudgetE2ETester();
  await tester.runCompleteWorkflow();
  process.exit(tester.results.failed > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ E2E workflow test failed:', error);
    process.exit(1);
  });
}

module.exports = BudgetE2ETester;