/**
 * Seed data for financial management system
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  try {
    // Get the first organization (any admin user)
    let adminUser = await knex('users').where('email', 'admin@sportsmanagement.com').first();
    
    if (!adminUser) {
      // Try to find any user with admin role
      adminUser = await knex('users').whereRaw("roles::text LIKE '%admin%'").first();
    }
    
    if (!adminUser) {
      // Get any user as fallback
      adminUser = await knex('users').first();
    }
    
    if (!adminUser) {
      console.log('No users found, skipping financial management seed');
      return;
    }

    const organizationId = adminUser.id;
    console.log(`Seeding financial management data for organization: ${organizationId}`);

    // 1. Create Chart of Accounts
    console.log('Creating chart of accounts...');
    await knex('chart_of_accounts').del();
    
    const accounts = [
      // Assets
      { account_number: '1000', account_name: 'Cash - Operating Account', account_type: 'asset', account_subtype: 'current_asset', organization_id: organizationId },
      { account_number: '1010', account_name: 'Petty Cash', account_type: 'asset', account_subtype: 'current_asset', organization_id: organizationId },
      { account_number: '1100', account_name: 'Accounts Receivable', account_type: 'asset', account_subtype: 'current_asset', organization_id: organizationId },
      { account_number: '1200', account_name: 'Equipment', account_type: 'asset', account_subtype: 'fixed_asset', organization_id: organizationId },
      { account_number: '1210', account_name: 'Accumulated Depreciation - Equipment', account_type: 'asset', account_subtype: 'fixed_asset', organization_id: organizationId },

      // Liabilities
      { account_number: '2000', account_name: 'Accounts Payable', account_type: 'liability', account_subtype: 'current_liability', organization_id: organizationId },
      { account_number: '2100', account_name: 'Accrued Expenses', account_type: 'liability', account_subtype: 'current_liability', organization_id: organizationId },
      { account_number: '2200', account_name: 'Deferred Revenue', account_type: 'liability', account_subtype: 'current_liability', organization_id: organizationId },

      // Equity
      { account_number: '3000', account_name: 'Retained Earnings', account_type: 'equity', account_subtype: 'equity', organization_id: organizationId },
      { account_number: '3100', account_name: 'Current Year Earnings', account_type: 'equity', account_subtype: 'equity', organization_id: organizationId },

      // Revenue
      { account_number: '4000', account_name: 'Game Fees Revenue', account_type: 'revenue', account_subtype: 'operating_revenue', organization_id: organizationId },
      { account_number: '4100', account_name: 'Registration Fees', account_type: 'revenue', account_subtype: 'operating_revenue', organization_id: organizationId },
      { account_number: '4200', account_name: 'Tournament Revenue', account_type: 'revenue', account_subtype: 'operating_revenue', organization_id: organizationId },
      { account_number: '4900', account_name: 'Other Revenue', account_type: 'revenue', account_subtype: 'other_revenue', organization_id: organizationId },

      // Expenses
      { account_number: '5000', account_name: 'Referee Wages', account_type: 'expense', account_subtype: 'operating_expense', organization_id: organizationId },
      { account_number: '5100', account_name: 'Equipment Expenses', account_type: 'expense', account_subtype: 'operating_expense', organization_id: organizationId },
      { account_number: '5200', account_name: 'Facility Rental', account_type: 'expense', account_subtype: 'operating_expense', organization_id: organizationId },
      { account_number: '5300', account_name: 'Travel Expenses', account_type: 'expense', account_subtype: 'operating_expense', organization_id: organizationId },
      { account_number: '5400', account_name: 'Marketing & Advertising', account_type: 'expense', account_subtype: 'operating_expense', organization_id: organizationId },
      { account_number: '5500', account_name: 'Administrative Expenses', account_type: 'expense', account_subtype: 'operating_expense', organization_id: organizationId },
      { account_number: '5600', account_name: 'Insurance Expenses', account_type: 'expense', account_subtype: 'operating_expense', organization_id: organizationId },
      { account_number: '5700', account_name: 'Training & Development', account_type: 'expense', account_subtype: 'operating_expense', organization_id: organizationId },
      { account_number: '5800', account_name: 'Office Supplies', account_type: 'expense', account_subtype: 'operating_expense', organization_id: organizationId },
      { account_number: '5900', account_name: 'Other Operating Expenses', account_type: 'expense', account_subtype: 'operating_expense', organization_id: organizationId }
    ];

    const insertedAccounts = await knex('chart_of_accounts').insert(accounts).returning('*');
    console.log(`Created ${insertedAccounts.length} chart of accounts entries`);

    // 2. Create Budget Categories
    console.log('Creating budget categories...');
    await knex('budget_categories').del();

    // Find relevant account IDs for default mappings
    const payrollAccount = insertedAccounts.find(a => a.account_number === '5000');
    const equipmentAccount = insertedAccounts.find(a => a.account_number === '5100');
    const facilityAccount = insertedAccounts.find(a => a.account_number === '5200');
    const travelAccount = insertedAccounts.find(a => a.account_number === '5300');
    const marketingAccount = insertedAccounts.find(a => a.account_number === '5400');
    const adminAccount = insertedAccounts.find(a => a.account_number === '5500');
    const revenueAccount = insertedAccounts.find(a => a.account_number === '4000');

    const categories = [
      {
        name: 'Referee Payroll',
        code: 'PAYROLL',
        description: 'Wages and compensation for referees',
        category_type: 'payroll',
        color_code: '#10B981',
        sort_order: 1,
        organization_id: organizationId,
        default_account_id: payrollAccount?.id
      },
      {
        name: 'Equipment & Supplies',
        code: 'EQUIPMENT',
        description: 'Referee equipment, jerseys, and supplies',
        category_type: 'equipment',
        color_code: '#3B82F6',
        sort_order: 2,
        organization_id: organizationId,
        default_account_id: equipmentAccount?.id
      },
      {
        name: 'Facility Costs',
        code: 'FACILITIES',
        description: 'Venue rentals and facility expenses',
        category_type: 'facilities',
        color_code: '#8B5CF6',
        sort_order: 3,
        organization_id: organizationId,
        default_account_id: facilityAccount?.id
      },
      {
        name: 'Travel & Transportation',
        code: 'TRAVEL',
        description: 'Travel expenses for tournaments and games',
        category_type: 'travel',
        color_code: '#F59E0B',
        sort_order: 4,
        organization_id: organizationId,
        default_account_id: travelAccount?.id
      },
      {
        name: 'Marketing & Promotion',
        code: 'MARKETING',
        description: 'Advertising and promotional activities',
        category_type: 'marketing',
        color_code: '#EF4444',
        sort_order: 5,
        organization_id: organizationId,
        default_account_id: marketingAccount?.id
      },
      {
        name: 'Administrative',
        code: 'ADMIN',
        description: 'Office expenses and administrative costs',
        category_type: 'admin',
        color_code: '#6B7280',
        sort_order: 6,
        organization_id: organizationId,
        default_account_id: adminAccount?.id
      },
      {
        name: 'Game Revenue',
        code: 'REVENUE',
        description: 'Revenue from game fees and services',
        category_type: 'revenue',
        color_code: '#059669',
        sort_order: 7,
        organization_id: organizationId,
        default_account_id: revenueAccount?.id
      }
    ];

    const insertedCategories = await knex('budget_categories').insert(categories).returning('*');
    console.log(`Created ${insertedCategories.length} budget categories`);

    // 3. Create Budget Period
    console.log('Creating budget period...');
    await knex('budget_periods').del();

    const currentYear = new Date().getFullYear();
    const [budgetPeriod] = await knex('budget_periods').insert({
      organization_id: organizationId,
      name: `${currentYear} Operating Budget`,
      description: `Annual operating budget for ${currentYear} sports management activities`,
      start_date: `${currentYear}-01-01`,
      end_date: `${currentYear}-12-31`,
      status: 'active',
      created_by: adminUser.id
    }).returning('*');

    console.log(`Created budget period: ${budgetPeriod.name}`);

    // 4. Create Budgets
    console.log('Creating budgets...');
    await knex('budgets').del();

    const budgetData = [
      {
        category: insertedCategories.find(c => c.code === 'PAYROLL'),
        name: 'Referee Wages',
        allocated_amount: 50000,
        description: 'Annual budget for referee compensation'
      },
      {
        category: insertedCategories.find(c => c.code === 'EQUIPMENT'),
        name: 'Equipment & Supplies',
        allocated_amount: 8000,
        description: 'Referee uniforms, equipment, and supplies'
      },
      {
        category: insertedCategories.find(c => c.code === 'FACILITIES'),
        name: 'Venue Costs',
        allocated_amount: 12000,
        description: 'Facility rentals and venue expenses'
      },
      {
        category: insertedCategories.find(c => c.code === 'TRAVEL'),
        name: 'Travel Expenses',
        allocated_amount: 5000,
        description: 'Transportation for tournaments and away games'
      },
      {
        category: insertedCategories.find(c => c.code === 'MARKETING'),
        name: 'Marketing & Outreach',
        allocated_amount: 3000,
        description: 'Promotional materials and advertising'
      },
      {
        category: insertedCategories.find(c => c.code === 'ADMIN'),
        name: 'Administrative',
        allocated_amount: 6000,
        description: 'Office supplies, software, and admin costs'
      }
    ];

    const budgets = [];
    for (const budgetInfo of budgetData) {
      if (budgetInfo.category) {
        budgets.push({
          organization_id: organizationId,
          budget_period_id: budgetPeriod.id,
          category_id: budgetInfo.category.id,
          name: budgetInfo.name,
          description: budgetInfo.description,
          allocated_amount: budgetInfo.allocated_amount,
          status: 'active',
          variance_rules: JSON.stringify({
            warning_threshold: 80,
            critical_threshold: 100,
            alerts_enabled: true
          })
        });
      }
    }

    const insertedBudgets = await knex('budgets').insert(budgets).returning('*');
    console.log(`Created ${insertedBudgets.length} budgets`);

    // 5. Create Budget Allocations (monthly breakdown)
    console.log('Creating budget allocations...');
    await knex('budget_allocations').del();

    const allocations = [];
    for (const budget of insertedBudgets) {
      const monthlyAmount = budget.allocated_amount / 12;
      
      for (let month = 1; month <= 12; month++) {
        allocations.push({
          budget_id: budget.id,
          allocation_year: currentYear,
          allocation_month: month,
          allocated_amount: Math.round(monthlyAmount * 100) / 100
        });
      }
    }

    await knex('budget_allocations').insert(allocations);
    console.log(`Created ${allocations.length} budget allocations`);

    // 6. Create Some Vendors
    console.log('Creating vendors...');
    await knex('vendors').del();

    const vendors = [
      {
        organization_id: organizationId,
        name: 'Sports Equipment Supply Co.',
        contact_name: 'John Smith',
        email: 'john@sportsequipment.com',
        phone: '(555) 123-4567',
        address: '123 Sports Ave, Athletic City, AC 12345',
        payment_terms: 'Net 30',
        payment_methods: JSON.stringify(['check', 'ach', 'credit_card'])
      },
      {
        organization_id: organizationId,
        name: 'City Recreation Center',
        contact_name: 'Maria Rodriguez',
        email: 'maria@cityrecreation.gov',
        phone: '(555) 987-6543',
        address: '456 Recreation Blvd, Athletic City, AC 12345',
        payment_terms: 'Net 15',
        payment_methods: JSON.stringify(['check', 'ach'])
      },
      {
        organization_id: organizationId,
        name: 'Athletic Uniform Outfitters',
        contact_name: 'David Johnson',
        email: 'david@athleticuniforms.com',
        phone: '(555) 456-7890',
        address: '789 Uniform St, Sports Town, ST 67890',
        payment_terms: 'Net 30',
        payment_methods: JSON.stringify(['check', 'credit_card'])
      },
      {
        organization_id: organizationId,
        name: 'Metro Insurance Services',
        contact_name: 'Sarah Wilson',
        email: 'sarah@metroinsurance.com',
        phone: '(555) 321-0987',
        address: '321 Insurance Way, Business District, BD 54321',
        payment_terms: 'Net 30',
        payment_methods: JSON.stringify(['ach', 'check'])
      }
    ];

    const insertedVendors = await knex('vendors').insert(vendors).returning('*');
    console.log(`Created ${insertedVendors.length} vendors`);

    // 7. Create Sample Financial Transactions
    console.log('Creating sample financial transactions...');
    await knex('financial_transactions').del();

    const transactions = [];
    const transactionTypes = ['expense', 'revenue', 'payroll'];
    
    // Create some sample transactions for the last 3 months
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    for (const budget of insertedBudgets) {
      // Create some expenses for each budget
      const transactionCount = Math.floor(Math.random() * 8) + 3; // 3-10 transactions per budget
      
      for (let i = 0; i < transactionCount; i++) {
        const transactionDate = new Date(startDate.getTime() + Math.random() * (Date.now() - startDate.getTime()));
        const amount = Math.random() * 1000 + 100; // Random amount between 100-1100
        const vendor = insertedVendors[Math.floor(Math.random() * insertedVendors.length)];
        
        // Generate transaction number
        const year = transactionDate.getFullYear();
        const sequence = String(i + 1).padStart(6, '0');
        const transactionNumber = `EXP-${year}-${sequence}${budget.id.slice(-2)}`;

        transactions.push({
          organization_id: organizationId,
          budget_id: budget.id,
          transaction_number: transactionNumber,
          transaction_type: 'expense',
          amount: Math.round(amount * 100) / 100,
          description: `${budget.name} - ${vendor.name} payment`,
          transaction_date: transactionDate,
          vendor_id: vendor.id,
          status: Math.random() > 0.2 ? 'posted' : 'approved', // 80% posted, 20% approved
          created_by: adminUser.id
        });
      }
    }

    // Add some revenue transactions
    const revenueTransactions = [
      {
        organization_id: organizationId,
        transaction_number: `REV-${currentYear}-000001`,
        transaction_type: 'revenue',
        amount: 2500.00,
        description: 'League registration fees - Spring season',
        transaction_date: new Date(currentYear, 2, 15),
        status: 'posted',
        created_by: adminUser.id
      },
      {
        organization_id: organizationId,
        transaction_number: `REV-${currentYear}-000002`,
        transaction_type: 'revenue',
        amount: 1800.00,
        description: 'Tournament entry fees',
        transaction_date: new Date(currentYear, 3, 10),
        status: 'posted',
        created_by: adminUser.id
      },
      {
        organization_id: organizationId,
        transaction_number: `REV-${currentYear}-000003`,
        transaction_type: 'revenue',
        amount: 3200.00,
        description: 'Game fees collection - Q1',
        transaction_date: new Date(currentYear, 3, 30),
        status: 'posted',
        created_by: adminUser.id
      }
    ];

    transactions.push(...revenueTransactions);

    const insertedTransactions = await knex('financial_transactions').insert(transactions).returning('*');
    console.log(`Created ${insertedTransactions.length} financial transactions`);

    // 8. Update budget amounts based on transactions
    console.log('Updating budget amounts...');
    for (const budget of insertedBudgets) {
      const budgetTransactions = insertedTransactions.filter(t => t.budget_id === budget.id);
      const actualSpent = budgetTransactions
        .filter(t => t.status === 'posted' && t.transaction_type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const committedAmount = budgetTransactions
        .filter(t => t.status === 'approved' && t.transaction_type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      await knex('budgets')
        .where('id', budget.id)
        .update({
          actual_spent: actualSpent,
          committed_amount: committedAmount
        });
    }

    // 9. Create Approval Workflows
    console.log('Creating approval workflows...');
    await knex('approval_workflows').del();

    const workflows = [
      {
        organization_id: organizationId,
        workflow_name: 'Standard Expense Approval',
        workflow_type: 'expense_approval',
        conditions: JSON.stringify({
          amount_threshold: 500,
          categories: ['all']
        }),
        approval_steps: JSON.stringify([
          {
            step_number: 1,
            step_name: 'Manager Review',
            approver_roles: ['manager', 'admin'],
            required: true,
            timeout_days: 3
          },
          {
            step_number: 2,
            step_name: 'Final Approval',
            approver_roles: ['admin'],
            required: true,
            condition: 'amount > 1000',
            timeout_days: 5
          }
        ]),
        is_active: true,
        priority: 1
      },
      {
        organization_id: organizationId,
        workflow_name: 'Budget Change Approval',
        workflow_type: 'budget_approval',
        conditions: JSON.stringify({
          change_threshold: 0.1 // 10% change
        }),
        approval_steps: JSON.stringify([
          {
            step_number: 1,
            step_name: 'Administrator Review',
            approver_roles: ['admin'],
            required: true,
            timeout_days: 7
          }
        ]),
        is_active: true,
        priority: 1
      }
    ];

    await knex('approval_workflows').insert(workflows);
    console.log(`Created ${workflows.length} approval workflows`);

    // 10. Create Spending Limits
    console.log('Creating spending limits...');
    await knex('spending_limits').del();

    const spendingLimits = [
      {
        organization_id: organizationId,
        limit_name: 'Daily Expense Limit - Managers',
        limit_type: 'daily',
        limit_amount: 1000.00,
        warning_threshold: 800.00,
        requires_approval: true,
        approval_rules: JSON.stringify({
          approver_roles: ['admin']
        }),
        is_active: true
      },
      {
        organization_id: organizationId,
        limit_name: 'Monthly Equipment Budget',
        limit_type: 'monthly',
        limit_amount: 2000.00,
        warning_threshold: 1600.00,
        requires_approval: false,
        is_active: true
      },
      {
        organization_id: organizationId,
        limit_name: 'Single Transaction Limit',
        limit_type: 'per_transaction',
        limit_amount: 2500.00,
        warning_threshold: 2000.00,
        requires_approval: true,
        approval_rules: JSON.stringify({
          approver_roles: ['admin']
        }),
        is_active: true
      }
    ];

    await knex('spending_limits').insert(spendingLimits);
    console.log(`Created ${spendingLimits.length} spending limits`);

    // 11. Create Financial KPIs
    console.log('Creating financial KPIs...');
    await knex('financial_kpis').del();

    const kpis = [
      {
        organization_id: organizationId,
        kpi_name: 'Budget Utilization Rate',
        kpi_type: 'budget_variance',
        target_value: 85.0,
        unit: '%',
        calculation_config: JSON.stringify({
          formula: 'total_spent / total_allocated * 100',
          frequency: 'weekly'
        }),
        calculation_period_days: 30
      },
      {
        organization_id: organizationId,
        kpi_name: 'Cost Per Game',
        kpi_type: 'cost_per_game',
        target_value: 150.0,
        unit: '$',
        calculation_config: JSON.stringify({
          formula: 'total_expenses / total_games',
          frequency: 'monthly'
        }),
        calculation_period_days: 30
      },
      {
        organization_id: organizationId,
        kpi_name: 'Payroll Efficiency',
        kpi_type: 'payroll_efficiency',
        target_value: 60.0,
        unit: '%',
        calculation_config: JSON.stringify({
          formula: 'payroll_expenses / total_expenses * 100',
          frequency: 'monthly'
        }),
        calculation_period_days: 30
      }
    ];

    await knex('financial_kpis').insert(kpis);
    console.log(`Created ${kpis.length} financial KPIs`);

    console.log('✅ Financial management seed data created successfully!');
    console.log(`
📊 Summary:
- ${insertedAccounts.length} Chart of Accounts entries
- ${insertedCategories.length} Budget Categories  
- 1 Budget Period (${budgetPeriod.name})
- ${insertedBudgets.length} Budgets with monthly allocations
- ${insertedVendors.length} Vendors
- ${insertedTransactions.length} Financial Transactions
- ${workflows.length} Approval Workflows
- ${spendingLimits.length} Spending Limits
- ${kpis.length} Financial KPIs

💰 Total Budget Allocated: $${budgets.reduce((sum, b) => sum + b.allocated_amount, 0).toLocaleString()}
    `);

  } catch (error) {
    console.error('Error seeding financial management data:', error);
    throw error;
  }
};