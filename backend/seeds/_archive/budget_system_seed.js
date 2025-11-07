const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  console.log('🌱 Seeding Budget Management System...');
  
  try {
    // Clear existing data in reverse order of dependencies
    await knex('budget_alerts').del();
    await knex('cash_flow_forecasts').del();
    await knex('budget_allocations').del();
    await knex('budget_approvals').del();
    await knex('budgets').del();
    await knex('budget_categories').del();
    await knex('budget_periods').del();
    
    // Seed test user if not exists
    const testUserId = '123e4567-e89b-12d3-a456-426614174000';
    const existingUser = await knex('users').where('id', testUserId).first();
    
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      await knex('users').insert({
        id: testUserId,
        email: 'test@sportsmanagement.com',
        password_hash: hashedPassword,
        role: 'admin'
      });
      console.log('✅ Test user created');
    }

    // 1. Create Budget Periods
    const budgetPeriods = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        organization_id: testUserId,
        name: '2025 Annual Budget',
        description: 'Main budget period for 2025 operations',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        status: 'active',
        is_template: false,
        created_by: testUserId
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        organization_id: testUserId,
        name: '2025 Q1 Budget',
        description: 'First quarter budget for detailed tracking',
        start_date: '2025-01-01',
        end_date: '2025-03-31',
        status: 'active',
        is_template: false,
        created_by: testUserId
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        organization_id: testUserId,
        name: '2026 Planning Template',
        description: 'Template budget for 2026 planning',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        status: 'draft',
        is_template: true,
        created_by: testUserId
      }
    ];

    await knex('budget_periods').insert(budgetPeriods);
    console.log('✅ Budget periods created');

    // 2. Create Budget Categories
    const budgetCategories = [
      // Revenue Categories
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        organization_id: testUserId,
        name: 'Registration Fees',
        code: 'REV-REG',
        description: 'Revenue from player and team registrations',
        category_type: 'revenue',
        color_code: '#4CAF50',
        sort_order: 1
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440002',
        organization_id: testUserId,
        name: 'Tournament Fees',
        code: 'REV-TOUR',
        description: 'Revenue from tournament entry fees',
        category_type: 'revenue',
        color_code: '#2196F3',
        sort_order: 2
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440003',
        organization_id: testUserId,
        name: 'Sponsorship Revenue',
        code: 'REV-SPON',
        description: 'Revenue from corporate sponsorships',
        category_type: 'revenue',
        color_code: '#FF9800',
        sort_order: 3
      },
      
      // Operating Expenses
      {
        id: '660e8400-e29b-41d4-a716-446655440004',
        organization_id: testUserId,
        name: 'Referee Payroll',
        code: 'EXP-REF',
        description: 'Payments to referees for game assignments',
        category_type: 'payroll',
        color_code: '#9C27B0',
        sort_order: 4
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440005',
        organization_id: testUserId,
        name: 'Equipment & Supplies',
        code: 'EXP-EQUIP',
        description: 'Sports equipment, uniforms, and general supplies',
        category_type: 'equipment',
        color_code: '#F44336',
        sort_order: 5
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440006',
        organization_id: testUserId,
        name: 'Facility Rental',
        code: 'EXP-FAC',
        description: 'Costs for renting sports facilities and venues',
        category_type: 'facilities',
        color_code: '#795548',
        sort_order: 6
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440007',
        organization_id: testUserId,
        name: 'Travel & Transportation',
        code: 'EXP-TRAV',
        description: 'Travel costs for teams and officials',
        category_type: 'travel',
        color_code: '#607D8B',
        sort_order: 7
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440008',
        organization_id: testUserId,
        name: 'Marketing & Promotion',
        code: 'EXP-MARK',
        description: 'Marketing materials and promotional activities',
        category_type: 'marketing',
        color_code: '#E91E63',
        sort_order: 8
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440009',
        organization_id: testUserId,
        name: 'Administrative Costs',
        code: 'EXP-ADMIN',
        description: 'General administrative and office expenses',
        category_type: 'admin',
        color_code: '#9E9E9E',
        sort_order: 9
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440010',
        organization_id: testUserId,
        name: 'Insurance & Legal',
        code: 'EXP-INS',
        description: 'Insurance premiums and legal expenses',
        category_type: 'other',
        color_code: '#3F51B5',
        sort_order: 10
      }
    ];

    await knex('budget_categories').insert(budgetCategories);
    console.log('✅ Budget categories created');

    // 3. Create Budgets
    const budgets = [
      // Revenue Budgets
      {
        id: '770e8400-e29b-41d4-a716-446655440001',
        organization_id: testUserId,
        budget_period_id: '550e8400-e29b-41d4-a716-446655440001', // 2025 Annual
        category_id: '660e8400-e29b-41d4-a716-446655440001', // Registration Fees
        name: '2025 Registration Revenue',
        description: 'Expected revenue from player registrations',
        allocated_amount: 25000.00,
        committed_amount: 0.00,
        actual_spent: 0.00,
        reserved_amount: 0.00,
        available_amount: 25000.00,
        status: 'active',
        variance_rules: JSON.stringify({
          warning_threshold: 80,
          critical_threshold: 95,
          severity: 'medium'
        }),
        owner_id: testUserId
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440002',
        organization_id: testUserId,
        budget_period_id: '550e8400-e29b-41d4-a716-446655440001',
        category_id: '660e8400-e29b-41d4-a716-446655440002', // Tournament Fees
        name: '2025 Tournament Revenue',
        description: 'Expected revenue from tournament fees',
        allocated_amount: 15000.00,
        committed_amount: 0.00,
        actual_spent: 0.00,
        reserved_amount: 0.00,
        available_amount: 15000.00,
        status: 'active',
        variance_rules: JSON.stringify({
          warning_threshold: 75,
          critical_threshold: 90,
          severity: 'low'
        }),
        owner_id: testUserId
      },
      
      // Expense Budgets
      {
        id: '770e8400-e29b-41d4-a716-446655440003',
        organization_id: testUserId,
        budget_period_id: '550e8400-e29b-41d4-a716-446655440001',
        category_id: '660e8400-e29b-41d4-a716-446655440004', // Referee Payroll
        name: '2025 Referee Payments',
        description: 'Budget for referee game assignments',
        allocated_amount: 18000.00,
        committed_amount: 2500.00,
        actual_spent: 1200.00,
        reserved_amount: 0.00,
        available_amount: 14300.00,
        status: 'active',
        variance_rules: JSON.stringify({
          warning_threshold: 85,
          critical_threshold: 100,
          severity: 'high'
        }),
        owner_id: testUserId
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440004',
        organization_id: testUserId,
        budget_period_id: '550e8400-e29b-41d4-a716-446655440001',
        category_id: '660e8400-e29b-41d4-a716-446655440005', // Equipment
        name: '2025 Equipment Purchases',
        description: 'Budget for sports equipment and supplies',
        allocated_amount: 8000.00,
        committed_amount: 1500.00,
        actual_spent: 800.00,
        reserved_amount: 500.00,
        available_amount: 5200.00,
        status: 'active',
        variance_rules: JSON.stringify({
          warning_threshold: 80,
          critical_threshold: 95,
          severity: 'medium'
        }),
        owner_id: testUserId
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440005',
        organization_id: testUserId,
        budget_period_id: '550e8400-e29b-41d4-a716-446655440001',
        category_id: '660e8400-e29b-41d4-a716-446655440006', // Facilities
        name: '2025 Facility Rentals',
        description: 'Budget for venue and facility costs',
        allocated_amount: 12000.00,
        committed_amount: 3000.00,
        actual_spent: 1500.00,
        reserved_amount: 0.00,
        available_amount: 7500.00,
        status: 'active',
        variance_rules: JSON.stringify({
          warning_threshold: 90,
          critical_threshold: 100,
          severity: 'high'
        }),
        owner_id: testUserId
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440006',
        organization_id: testUserId,
        budget_period_id: '550e8400-e29b-41d4-a716-446655440001',
        category_id: '660e8400-e29b-41d4-a716-446655440008', // Marketing
        name: '2025 Marketing Campaign',
        description: 'Budget for promotional activities',
        allocated_amount: 5000.00,
        committed_amount: 800.00,
        actual_spent: 200.00,
        reserved_amount: 1000.00,
        available_amount: 3000.00,
        status: 'active',
        variance_rules: JSON.stringify({
          warning_threshold: 75,
          critical_threshold: 90,
          severity: 'low'
        }),
        owner_id: testUserId
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440007',
        organization_id: testUserId,
        budget_period_id: '550e8400-e29b-41d4-a716-446655440001',
        category_id: '660e8400-e29b-41d4-a716-446655440009', // Admin
        name: '2025 Administrative Expenses',
        description: 'Budget for general administrative costs',
        allocated_amount: 6000.00,
        committed_amount: 500.00,
        actual_spent: 300.00,
        reserved_amount: 0.00,
        available_amount: 5200.00,
        status: 'active',
        variance_rules: JSON.stringify({
          warning_threshold: 80,
          critical_threshold: 95,
          severity: 'medium'
        }),
        owner_id: testUserId
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440008',
        organization_id: testUserId,
        budget_period_id: '550e8400-e29b-41d4-a716-446655440001',
        category_id: '660e8400-e29b-41d4-a716-446655440010', // Insurance
        name: '2025 Insurance & Legal',
        description: 'Budget for insurance premiums and legal fees',
        allocated_amount: 4000.00,
        committed_amount: 2000.00,
        actual_spent: 1000.00,
        reserved_amount: 0.00,
        available_amount: 1000.00,
        status: 'active',
        variance_rules: JSON.stringify({
          warning_threshold: 85,
          critical_threshold: 100,
          severity: 'high'
        }),
        owner_id: testUserId
      }
    ];

    await knex('budgets').insert(budgets);
    console.log('✅ Budgets created');

    // 4. Create Budget Allocations (monthly breakdowns)
    const allocations = [];
    const budgetIds = budgets.map(b => b.id);
    
    // Create monthly allocations for each budget
    budgetIds.forEach(budgetId => {
      const budget = budgets.find(b => b.id === budgetId);
      const monthlyAmount = budget.allocated_amount / 12;
      
      for (let month = 1; month <= 12; month++) {
        allocations.push({
          budget_id: budgetId,
          allocation_year: 2025,
          allocation_month: month,
          allocated_amount: parseFloat(monthlyAmount.toFixed(2)),
          actual_amount: month <= 2 ? parseFloat((monthlyAmount * 0.3).toFixed(2)) : 0, // Some actuals for first 2 months
          notes: month <= 2 ? 'Actual spending recorded' : 'Planned allocation'
        });
      }
    });

    await knex('budget_allocations').insert(allocations);
    console.log('✅ Budget allocations created');

    // 5. Create Sample Budget Alerts
    const alerts = [
      {
        id: '880e8400-e29b-41d4-a716-446655440001',
        organization_id: testUserId,
        budget_id: '770e8400-e29b-41d4-a716-446655440003', // Referee Payroll
        alert_type: 'overspend_warning',
        title: 'Referee Payroll Budget High Utilization',
        message: 'Budget is 85% utilized with 10 months remaining. Monitor closely to avoid overspend.',
        threshold_value: 15300.00,
        current_value: 3700.00,
        variance_percentage: 85.22,
        severity: 'medium',
        is_acknowledged: false,
        is_resolved: false
      },
      {
        id: '880e8400-e29b-41d4-a716-446655440002',
        organization_id: testUserId,
        budget_id: '770e8400-e29b-41d4-a716-446655440008', // Insurance
        alert_type: 'overspend_warning',
        title: 'Insurance Budget Nearly Exhausted',
        message: 'Budget is 75% spent with significant commitments pending. Review remaining expenses.',
        threshold_value: 3200.00,
        current_value: 3000.00,
        variance_percentage: 75.00,
        severity: 'high',
        is_acknowledged: false,
        is_resolved: false
      },
      {
        id: '880e8400-e29b-41d4-a716-446655440003',
        organization_id: testUserId,
        budget_id: '770e8400-e29b-41d4-a716-446655440006', // Marketing
        alert_type: 'underspend_warning',
        title: 'Marketing Budget Underutilized',
        message: 'Only 20% of marketing budget utilized. Consider increasing promotional activities.',
        threshold_value: 1250.00,
        current_value: 1000.00,
        variance_percentage: 20.00,
        severity: 'low',
        is_acknowledged: false,
        is_resolved: false
      }
    ];

    await knex('budget_alerts').insert(alerts);
    console.log('✅ Budget alerts created');

    // 6. Create Cash Flow Forecasts
    const forecasts = [];
    const periodId = '550e8400-e29b-41d4-a716-446655440001';
    
    for (let month = 1; month <= 12; month++) {
      const baseIncome = 3500 + (Math.random() * 1000); // Vary income
      const baseExpenses = 2800 + (Math.random() * 800); // Vary expenses
      const basePayroll = 1500 + (Math.random() * 500); // Vary payroll
      
      const netCashFlow = baseIncome - baseExpenses - basePayroll;
      const runningBalance = month === 1 ? netCashFlow : (month * 200) + netCashFlow; // Simplified running balance
      
      forecasts.push({
        organization_id: testUserId,
        budget_period_id: periodId,
        forecast_year: 2025,
        forecast_month: month,
        projected_income: parseFloat(baseIncome.toFixed(2)),
        projected_expenses: parseFloat(baseExpenses.toFixed(2)),
        projected_payroll: parseFloat(basePayroll.toFixed(2)),
        net_cash_flow: parseFloat(netCashFlow.toFixed(2)),
        running_balance: parseFloat(runningBalance.toFixed(2)),
        confidence_score: month <= 3 ? 0.9 : (month <= 6 ? 0.7 : 0.5), // Higher confidence for nearer months
        assumptions: JSON.stringify({
          based_on: 'budget_allocations',
          seasonal_adjustment: true,
          generated_at: new Date(),
          notes: month <= 3 ? 'Based on actual trends' : 'Projected based on historical patterns'
        }),
        is_actual: month <= 2 // First 2 months are actual
      });
    }

    await knex('cash_flow_forecasts').insert(forecasts);
    console.log('✅ Cash flow forecasts created');

    console.log('🌱✅ Budget Management System seeding completed successfully!');
    
    // Print summary
    console.log('\n📊 Seed Data Summary:');
    console.log(`   • ${budgetPeriods.length} Budget Periods`);
    console.log(`   • ${budgetCategories.length} Budget Categories`);
    console.log(`   • ${budgets.length} Budgets`);
    console.log(`   • ${allocations.length} Budget Allocations`);
    console.log(`   • ${alerts.length} Budget Alerts`);
    console.log(`   • ${forecasts.length} Cash Flow Forecasts`);
    console.log('\n🎯 Test with: GET /api/budgets?include_summary=true');
    
  } catch (error) {
    console.error('❌ Error seeding budget system:', error);
    throw error;
  }
};