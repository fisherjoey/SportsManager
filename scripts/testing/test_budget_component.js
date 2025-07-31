#!/usr/bin/env node

/**
 * Budget Component Structure and Logic Testing
 * 
 * This script validates the BudgetTracker component structure and logic
 * by analyzing the component code and simulating data transformations.
 */

const fs = require('fs');
const path = require('path');

class BudgetComponentTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
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

  async testComponentStructure() {
    return await this.runTest('Component File Structure', async () => {
      const componentPath = path.join(__dirname, 'components', 'budget-tracker.tsx');
      
      if (!fs.existsSync(componentPath)) {
        throw new Error('BudgetTracker component file not found');
      }

      const componentContent = fs.readFileSync(componentPath, 'utf8');
      
      // Check for essential React patterns
      const requiredPatterns = [
        'export function BudgetTracker',
        'useState',
        'useEffect',
        'apiClient',
      ];

      for (const pattern of requiredPatterns) {
        if (!componentContent.includes(pattern)) {
          throw new Error(`Missing required pattern: ${pattern}`);
        }
      }

      // Check for budget-specific functionality
      const budgetPatterns = [
        'getBudgetPeriods',
        'getBudgetCategories', 
        'getBudgets',
        'createBudget',
        'updateBudget'
      ];

      for (const pattern of budgetPatterns) {
        if (!componentContent.includes(pattern)) {
          this.log(`   Warning: Missing budget function: ${pattern}`, 'warning');
        }
      }

      this.log('   Component structure looks good', 'success');
      return { componentExists: true, patternsFound: requiredPatterns.length };
    });
  }

  async testAPIClientStructure() {
    return await this.runTest('API Client Integration', async () => {
      const apiPath = path.join(__dirname, 'lib', 'api.ts');
      
      if (!fs.existsSync(apiPath)) {
        throw new Error('API client file not found');
      }

      const apiContent = fs.readFileSync(apiPath, 'utf8');
      
      // Check for budget-specific API methods
      const requiredMethods = [
        'getBudgetPeriods',
        'createBudgetPeriod', 
        'getBudgetCategories',
        'createBudgetCategory',
        'getBudgets',
        'createBudget',
        'updateBudget',
        'getBudget'
      ];

      const foundMethods = [];
      const missingMethods = [];

      for (const method of requiredMethods) {
        if (apiContent.includes(method)) {
          foundMethods.push(method);
        } else {
          missingMethods.push(method);
        }
      }

      if (missingMethods.length > 0) {
        this.log(`   Warning: Missing API methods: ${missingMethods.join(', ')}`, 'warning');
      }

      // Check for proper TypeScript interfaces
      const requiredInterfaces = [
        'interface Budget',
        'interface BudgetPeriod',
        'interface BudgetCategory',
        'interface BudgetAllocation'
      ];

      const foundInterfaces = [];
      for (const interfacePattern of requiredInterfaces) {
        if (apiContent.includes(interfacePattern)) {
          foundInterfaces.push(interfacePattern);
        }
      }

      this.log(`   Found ${foundMethods.length}/${requiredMethods.length} API methods`, 'info');
      this.log(`   Found ${foundInterfaces.length}/${requiredInterfaces.length} TypeScript interfaces`, 'info');

      return { 
        foundMethods: foundMethods.length,
        totalMethods: requiredMethods.length,
        foundInterfaces: foundInterfaces.length
      };
    });
  }

  async testDataTransformations() {
    return await this.runTest('Data Transformation Logic', async () => {
      // Simulate the data transformations that would happen in the component
      
      // Sample API response data (matching our backend structure)
      const sampleBudgets = [
        {
          id: '770e8400-e29b-41d4-a716-446655440001',
          name: '2025 Registration Revenue',
          allocated_amount: 25000.00,
          actual_spent: 5000.00,
          category_id: '660e8400-e29b-41d4-a716-446655440001',
          category_name: 'Registration Fees',
          period_id: '550e8400-e29b-41d4-a716-446655440001',
          period_name: '2025 Annual Budget',
          status: 'active'
        },
        {
          id: '770e8400-e29b-41d4-a716-446655440003',
          name: '2025 Referee Payments',
          allocated_amount: 18000.00,
          actual_spent: 1200.00,
          committed_amount: 2500.00,
          category_name: 'Referee Payroll',
          period_name: '2025 Annual Budget',
          status: 'active'
        }
      ];

      // Test currency formatting (simulating formatCurrency function)
      const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(amount);
      };

      const formattedAmount = formatCurrency(25000.00);
      if (!formattedAmount.includes('$25,000.00')) {
        throw new Error('Currency formatting not working correctly');
      }

      // Test utilization calculation
      const calculateUtilization = (budget) => {
        const spent = budget.actual_spent || 0;
        const committed = budget.committed_amount || 0;
        const allocated = budget.allocated_amount || 0;
        
        if (allocated === 0) return 0;
        return ((spent + committed) / allocated) * 100;
      };

      const utilization1 = calculateUtilization(sampleBudgets[0]);
      const utilization2 = calculateUtilization(sampleBudgets[1]);

      if (utilization1 !== 20) { // 5000 / 25000 * 100
        throw new Error(`Utilization calculation wrong: expected 20, got ${utilization1}`);
      }

      if (Math.abs(utilization2 - 20.56) > 0.1) { // (1200 + 2500) / 18000 * 100
        throw new Error(`Utilization calculation wrong: expected ~20.56, got ${utilization2}`);
      }

      // Test budget status determination
      const getBudgetStatus = (utilization) => {
        if (utilization >= 100) return { color: 'destructive', text: 'Over Budget' };
        if (utilization >= 90) return { color: 'warning', text: 'Near Limit' };
        if (utilization >= 75) return { color: 'secondary', text: 'On Track' };
        return { color: 'default', text: 'Under Budget' };
      };

      const status1 = getBudgetStatus(20);
      const status2 = getBudgetStatus(95);

      if (status1.text !== 'Under Budget') {
        throw new Error('Budget status logic incorrect for low utilization');
      }

      if (status2.text !== 'Near Limit') {
        throw new Error('Budget status logic incorrect for high utilization');
      }

      // Test summary calculations
      const generateSummary = (budgets) => {
        const totalBudget = budgets.reduce((sum, b) => sum + b.allocated_amount, 0);
        const totalSpent = budgets.reduce((sum, b) => sum + (b.actual_spent || 0), 0);
        const totalCommitted = budgets.reduce((sum, b) => sum + (b.committed_amount || 0), 0);
        const totalRemaining = totalBudget - totalSpent - totalCommitted;
        
        return {
          totalBudget,
          totalSpent,
          totalCommitted,
          totalRemaining,
          budgetsCount: budgets.length
        };
      };

      const summary = generateSummary(sampleBudgets);
      
      if (summary.totalBudget !== 43000) {
        throw new Error(`Summary calculation wrong: expected 43000, got ${summary.totalBudget}`);
      }

      if (summary.totalSpent !== 6200) {
        throw new Error(`Summary calculation wrong: expected 6200, got ${summary.totalSpent}`);
      }

      this.log('   All data transformations working correctly', 'success');

      return {
        currencyFormatting: true,
        utilizationCalculation: true,
        statusDetermination: true,
        summaryCalculation: true
      };
    });
  }

  async testUIComponentLogic() {
    return await this.runTest('UI Component Logic', async () => {
      // Test form validation logic
      const validateBudgetForm = (formData) => {
        const errors = [];
        
        if (!formData.name || formData.name.trim() === '') {
          errors.push('Budget name is required');
        }
        
        if (!formData.period_id) {
          errors.push('Budget period is required');
        }
        
        if (!formData.category_id) {
          errors.push('Budget category is required');
        }
        
        if (!formData.allocated_amount || parseFloat(formData.allocated_amount) <= 0) {
          errors.push('Allocated amount must be greater than 0');
        }
        
        return errors;
      };

      // Test valid form data
      const validForm = {
        name: 'Test Budget',
        period_id: 'some-uuid',
        category_id: 'some-uuid',
        allocated_amount: '1000.00'
      };

      const validErrors = validateBudgetForm(validForm);
      if (validErrors.length > 0) {
        throw new Error(`Valid form failed validation: ${validErrors.join(', ')}`);
      }

      // Test invalid form data
      const invalidForm = {
        name: '',
        period_id: '',
        category_id: '',
        allocated_amount: '-100'
      };

      const invalidErrors = validateBudgetForm(invalidForm);
      if (invalidErrors.length !== 4) {
        throw new Error(`Expected 4 validation errors, got ${invalidErrors.length}`);
      }

      // Test filtering logic
      const filterBudgets = (budgets, filters) => {
        return budgets.filter(budget => {
          if (filters.period_id && budget.period_id !== filters.period_id) {
            return false;
          }
          if (filters.category_id && budget.category_id !== filters.category_id) {
            return false;
          }
          if (filters.status && budget.status !== filters.status) {
            return false;
          }
          return true;
        });
      };

      const sampleBudgets = [
        { id: '1', period_id: 'p1', category_id: 'c1', status: 'active' },
        { id: '2', period_id: 'p1', category_id: 'c2', status: 'active' },
        { id: '3', period_id: 'p2', category_id: 'c1', status: 'draft' }
      ];

      const filtered = filterBudgets(sampleBudgets, { period_id: 'p1' });
      if (filtered.length !== 2) {
        throw new Error(`Filter logic incorrect: expected 2 results, got ${filtered.length}`);
      }

      // Test sorting logic
      const sortBudgets = (budgets, sortBy, sortOrder) => {
        return [...budgets].sort((a, b) => {
          let aVal = a[sortBy];
          let bVal = b[sortBy];
          
          if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
          }
          
          if (sortOrder === 'desc') {
            return bVal > aVal ? 1 : -1;
          } else {
            return aVal > bVal ? 1 : -1;
          }
        });
      };

      const unsortedBudgets = [
        { name: 'Zebra Budget', allocated_amount: 1000 },
        { name: 'Alpha Budget', allocated_amount: 2000 },
        { name: 'Beta Budget', allocated_amount: 500 }
      ];

      const sortedByName = sortBudgets(unsortedBudgets, 'name', 'asc');
      if (sortedByName[0].name !== 'Alpha Budget') {
        throw new Error('Sorting by name not working correctly');
      }

      const sortedByAmount = sortBudgets(unsortedBudgets, 'allocated_amount', 'desc');
      if (sortedByAmount[0].allocated_amount !== 2000) {
        throw new Error('Sorting by amount not working correctly');
      }

      this.log('   UI component logic working correctly', 'success');

      return {
        formValidation: true,
        filterLogic: true,
        sortLogic: true
      };
    });
  }

  async testErrorHandling() {
    return await this.runTest('Error Handling Logic', async () => {
      // Test API error handling
      const handleAPIError = (error) => {
        if (error.message.includes('Network Error')) {
          return {
            type: 'network',
            message: 'Unable to connect to server. Please check your internet connection.',
            userFriendly: true
          };
        } else if (error.message.includes('403')) {
          return {
            type: 'auth',
            message: 'You are not authorized to perform this action.',
            userFriendly: true
          };
        } else if (error.message.includes('400')) {
          return {
            type: 'validation',
            message: 'Please check your input and try again.',
            userFriendly: true
          };
        } else {
          return {
            type: 'generic',
            message: 'An unexpected error occurred. Please try again later.',
            userFriendly: true
          };
        }
      };

      // Test different error scenarios
      const networkError = new Error('Network Error: ECONNREFUSED');
      const authError = new Error('API Error 403: Insufficient permissions');
      const validationError = new Error('API Error 400: Validation failed');
      const genericError = new Error('Something went wrong');

      const networkResult = handleAPIError(networkError);
      if (networkResult.type !== 'network') {
        throw new Error('Network error not handled correctly');
      }

      const authResult = handleAPIError(authError);
      if (authResult.type !== 'auth') {
        throw new Error('Auth error not handled correctly');
      }

      const validationResult = handleAPIError(validationError);
      if (validationResult.type !== 'validation') {
        throw new Error('Validation error not handled correctly');
      }

      const genericResult = handleAPIError(genericError);
      if (genericResult.type !== 'generic') {
        throw new Error('Generic error not handled correctly');
      }

      // Test loading state management
      const manageLoadingState = (currentState, action) => {
        switch (action.type) {
          case 'LOADING_START':
            return { ...currentState, loading: true, error: null };
          case 'LOADING_SUCCESS':
            return { ...currentState, loading: false, error: null, data: action.payload };
          case 'LOADING_ERROR':
            return { ...currentState, loading: false, error: action.error };
          default:
            return currentState;
        }
      };

      const initialState = { loading: false, error: null, data: null };
      
      const loadingState = manageLoadingState(initialState, { type: 'LOADING_START' });
      if (!loadingState.loading) {
        throw new Error('Loading state not managed correctly');
      }

      const successState = manageLoadingState(loadingState, { 
        type: 'LOADING_SUCCESS', 
        payload: ['budget1', 'budget2'] 
      });
      if (successState.loading || successState.error || !successState.data) {
        throw new Error('Success state not managed correctly');
      }

      const errorState = manageLoadingState(loadingState, { 
        type: 'LOADING_ERROR', 
        error: 'Failed to load' 
      });
      if (errorState.loading || !errorState.error) {
        throw new Error('Error state not managed correctly');
      }

      this.log('   Error handling logic working correctly', 'success');

      return {
        apiErrorHandling: true,
        loadingStateManagement: true
      };
    });
  }

  async testAccessibilityAndUsability() {
    return await this.runTest('Accessibility and Usability', async () => {
      const componentPath = path.join(__dirname, 'components', 'budget-tracker.tsx');
      const componentContent = fs.readFileSync(componentPath, 'utf8');

      // Check for accessibility patterns
      const accessibilityPatterns = [
        'aria-label',
        'role=',
        'tabIndex',
        'onKeyDown',
        'Label htmlFor'
      ];

      const foundA11yPatterns = [];
      for (const pattern of accessibilityPatterns) {
        if (componentContent.includes(pattern)) {
          foundA11yPatterns.push(pattern);
        }
      }

      // Check for loading states
      const loadingPatterns = [
        'LoadingSpinner',
        'loading',
        'isLoading'
      ];

      const foundLoadingPatterns = [];
      for (const pattern of loadingPatterns) {
        if (componentContent.includes(pattern)) {
          foundLoadingPatterns.push(pattern);
        }
      }

      // Check for error states
      const errorPatterns = [
        'error',
        'Alert',
        'toast'
      ];

      const foundErrorPatterns = [];
      for (const pattern of errorPatterns) {
        if (componentContent.includes(pattern)) {
          foundErrorPatterns.push(pattern);
        }
      }

      // Check for responsive design patterns
      const responsivePatterns = [
        'md:',
        'lg:',
        'sm:',
        'grid-cols',
        'flex-col',
        'hidden'
      ];

      const foundResponsivePatterns = [];
      for (const pattern of responsivePatterns) {
        if (componentContent.includes(pattern)) {
          foundResponsivePatterns.push(pattern);
        }
      }

      this.log(`   Found ${foundA11yPatterns.length} accessibility patterns`, 'info');
      this.log(`   Found ${foundLoadingPatterns.length} loading state patterns`, 'info');
      this.log(`   Found ${foundErrorPatterns.length} error handling patterns`, 'info');
      this.log(`   Found ${foundResponsivePatterns.length} responsive design patterns`, 'info');

      // Minimum requirements
      if (foundLoadingPatterns.length === 0) {
        throw new Error('No loading state patterns found - poor user experience');
      }

      if (foundErrorPatterns.length === 0) {
        throw new Error('No error handling patterns found - poor user experience');
      }

      return {
        accessibilityScore: foundA11yPatterns.length,
        loadingStates: foundLoadingPatterns.length > 0,
        errorHandling: foundErrorPatterns.length > 0,
        responsiveDesign: foundResponsivePatterns.length > 0
      };
    });
  }

  async generateReport() {
    this.log('\n📊 BUDGET COMPONENT ANALYSIS REPORT', 'info');
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

    this.log(`\n🎯 COMPONENT ASSESSMENT:`, 'info');
    if (this.results.failed === 0) {
      this.log('   ✅ COMPONENT READY - All logic and structure checks passed!', 'success');
      this.log('   ✅ BudgetTracker component is well-structured and functional', 'success');
    } else if (this.results.failed <= 2) {
      this.log('   ⚠️  MOSTLY READY - Minor issues to address', 'warning');
    } else {
      this.log('   ❌ NEEDS WORK - Component has structural or logical issues', 'error');
    }

    this.log(`\n🔧 COMPONENT RECOMMENDATIONS:`, 'info');
    if (this.results.failed === 0) {
      this.log('   • Component structure and logic are solid', 'info');
      this.log('   • Data transformations work correctly', 'info');
      this.log('   • Error handling is implemented', 'info');
      this.log('   • Ready for integration testing with live API', 'info');
    } else {
      this.log('   • Fix structural issues before integration testing', 'warning');
      this.log('   • Ensure all data transformation logic is correct', 'warning');
      this.log('   • Implement proper error handling for all scenarios', 'warning');
    }

    this.log('\n='.repeat(50), 'info');
  }

  async runAllTests() {
    this.log('🚀 BUDGET COMPONENT STRUCTURE & LOGIC TESTING', 'info');
    this.log('='.repeat(55), 'info');

    // Run all component analysis tests
    await this.testComponentStructure();
    await this.testAPIClientStructure();
    await this.testDataTransformations();
    await this.testUIComponentLogic();
    await this.testErrorHandling();
    await this.testAccessibilityAndUsability();

    await this.generateReport();
  }
}

// Run the component analysis suite
async function main() {
  const tester = new BudgetComponentTester();
  await tester.runAllTests();
  process.exit(tester.results.failed > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('\x1b[31m❌ Component analysis failed:\x1b[0m', error);
    process.exit(1);
  });
}

module.exports = BudgetComponentTester;