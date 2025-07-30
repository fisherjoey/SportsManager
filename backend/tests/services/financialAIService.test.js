const financialAIService = require('../../src/services/financialAIService');
const db = require('../../src/config/database');

describe('Financial AI Service', () => {
  let testUser;
  let testBudget;
  let testCategory;

  beforeAll(async () => {
    // Clean up test data
    await db('budget_forecasts').del();
    await db('financial_insights').del();
    await db('financial_transactions').del();
    await db('budgets').del();
    await db('budget_periods').del();
    await db('budget_categories').del();

    // Create test user
    const [user] = await db('users').insert({
      first_name: 'AI',
      last_name: 'Test',
      email: 'ai.test@example.com',
      password: 'hashedpassword',
      roles: JSON.stringify(['admin'])
    }).returning('*');
    testUser = user;

    // Create test infrastructure
    const [period] = await db('budget_periods').insert({
      organization_id: testUser.id,
      name: 'AI Test Period',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      status: 'active',
      created_by: testUser.id
    }).returning('*');

    const [category] = await db('budget_categories').insert({
      organization_id: testUser.id,
      name: 'AI Test Category',
      code: 'AI_TEST',
      category_type: 'operating_expenses',
      active: true
    }).returning('*');
    testCategory = category;

    const [budget] = await db('budgets').insert({
      organization_id: testUser.id,
      budget_period_id: period.id,
      category_id: category.id,
      name: 'AI Test Budget',
      allocated_amount: 12000.00,
      status: 'active'
    }).returning('*');
    testBudget = budget;

    // Create historical transactions for AI analysis
    const transactions = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      transactions.push({
        organization_id: testUser.id,
        budget_id: budget.id,
        transaction_number: `TEST-${2024}-${String(i + 1).padStart(6, '0')}`,
        transaction_type: 'expense',
        amount: 800 + (Math.random() * 400), // 800-1200 range
        description: `Historical transaction ${i + 1}`,
        transaction_date: date,
        status: 'posted',
        created_by: testUser.id
      });
    }

    await db('financial_transactions').insert(transactions);
  });

  afterAll(async () => {
    // Clean up
    await db('budget_forecasts').del();
    await db('financial_insights').del();
    await db('financial_transactions').del();
    await db('budgets').del();
    await db('budget_periods').del();
    await db('budget_categories').del();
    await db('users').where('id', testUser.id).del();
  });

  describe('Budget Forecasting', () => {
    test('generateBudgetForecast - should create monthly spending forecast', async () => {
      const forecast = await financialAIService.generateBudgetForecast(
        testUser.id,
        testBudget.id,
        'monthly_spend'
      );

      expect(forecast).toHaveProperty('forecast');
      expect(forecast).toHaveProperty('data');
      expect(forecast).toHaveProperty('confidence');
      expect(forecast).toHaveProperty('factors');

      expect(forecast.data).toHaveProperty('monthly_projections');
      expect(forecast.data.monthly_projections).toBeInstanceOf(Array);
      expect(forecast.confidence).toBeGreaterThan(0);
      expect(forecast.confidence).toBeLessThanOrEqual(1);
      expect(forecast.factors).toBeInstanceOf(Array);
    });

    test('generateBudgetForecast - should create seasonal pattern analysis', async () => {
      const forecast = await financialAIService.generateBudgetForecast(
        testUser.id,
        testBudget.id,
        'seasonal_pattern'
      );

      expect(forecast.data).toHaveProperty('seasonal_pattern');
      expect(forecast.data).toHaveProperty('peak_month');
      expect(forecast.data).toHaveProperty('low_month');
      expect(forecast.data.seasonal_pattern).toBeInstanceOf(Array);
      expect(forecast.data.seasonal_pattern).toHaveLength(12);
    });

    test('generateBudgetForecast - should create year-end projection', async () => {
      const forecast = await financialAIService.generateBudgetForecast(
        testUser.id,
        testBudget.id,
        'year_end_projection'
      );

      expect(forecast.data).toHaveProperty('spent_to_date');
      expect(forecast.data).toHaveProperty('projected_year_end');
      expect(forecast.data).toHaveProperty('vs_budget');
      expect(typeof forecast.data.projected_year_end).toBe('number');
    });

    test('generateBudgetForecast - should create variance prediction', async () => {
      const forecast = await financialAIService.generateBudgetForecast(
        testUser.id,
        testBudget.id,
        'variance_prediction'
      );

      expect(forecast.data).toHaveProperty('predicted_variance');
      expect(forecast.data).toHaveProperty('variance_percentage');
      expect(forecast.data).toHaveProperty('confidence_interval');
      expect(forecast.data).toHaveProperty('risk_level');
      expect(['low', 'medium', 'high']).toContain(forecast.data.risk_level);
    });

    test('generateBudgetForecast - should handle invalid budget ID', async () => {
      await expect(
        financialAIService.generateBudgetForecast(
          testUser.id,
          'invalid-budget-id',
          'monthly_spend'
        )
      ).rejects.toThrow('Budget not found');
    });

    test('generateBudgetForecast - should handle unsupported forecast type', async () => {
      await expect(
        financialAIService.generateBudgetForecast(
          testUser.id,
          testBudget.id,
          'unsupported_type'
        )
      ).rejects.toThrow('Unsupported forecast type');
    });
  });

  describe('Financial Insights', () => {
    test('generateFinancialInsights - should create various insights', async () => {
      // First update budget with some actual spending to trigger insights
      await db('budgets')
        .where('id', testBudget.id)
        .update({
          actual_spent: 8000.00, // Over 65% utilization
          committed_amount: 1000.00
        });

      const insights = await financialAIService.generateFinancialInsights(testUser.id);

      expect(insights).toBeInstanceOf(Array);
      expect(insights.length).toBeGreaterThan(0);

      // Check insight structure
      const insight = insights[0];
      expect(insight).toHaveProperty('type');
      expect(insight).toHaveProperty('title');
      expect(insight).toHaveProperty('description');
      expect(insight).toHaveProperty('recommendation');
      expect(insight).toHaveProperty('priority');
      expect(['low', 'medium', 'high', 'critical']).toContain(insight.priority);
    });

    test('generateFinancialInsights - should detect overspend scenarios', async () => {
      // Set budget to overspent state
      await db('budgets')
        .where('id', testBudget.id)
        .update({
          actual_spent: 13000.00, // Over budget
          committed_amount: 500.00
        });

      const insights = await financialAIService.generateFinancialInsights(testUser.id);
      
      const overspendInsight = insights.find(i => i.type === 'budget_optimization');
      expect(overspendInsight).toBeTruthy();
      expect(overspendInsight.title).toContain('Overspend');
    });

    test('generateFinancialInsights - should detect underspend scenarios', async () => {
      // Set budget to underspent state
      await db('budgets')
        .where('id', testBudget.id)
        .update({
          actual_spent: 1000.00, // Way under budget
          committed_amount: 0.00
        });

      const insights = await financialAIService.generateFinancialInsights(testUser.id);
      
      const underspendInsight = insights.find(i => i.type === 'cost_savings_opportunity');
      expect(underspendInsight).toBeTruthy();
      expect(underspendInsight.title).toContain('Underspend');
    });
  });

  describe('Budget Recommendations', () => {
    test('generateBudgetRecommendations - should create recommendations for new budget period', async () => {
      // Create new budget period
      const [newPeriod] = await db('budget_periods').insert({
        organization_id: testUser.id,
        name: 'New Recommendation Period',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        status: 'draft',
        created_by: testUser.id
      }).returning('*');

      const recommendations = await financialAIService.generateBudgetRecommendations(
        testUser.id,
        newPeriod.id
      );

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);

      const recommendation = recommendations[0];
      expect(recommendation).toHaveProperty('category_id');
      expect(recommendation).toHaveProperty('category_name');
      expect(recommendation).toHaveProperty('recommended_amount');
      expect(recommendation).toHaveProperty('confidence');
      expect(recommendation).toHaveProperty('reasoning');
      expect(recommendation).toHaveProperty('basis');

      expect(recommendation.recommended_amount).toBeGreaterThan(0);
      expect(recommendation.confidence).toBeGreaterThan(0);
      expect(recommendation.confidence).toBeLessThanOrEqual(1);
    });

    test('generateBudgetRecommendations - should use default amounts for categories without history', async () => {
      // Create new category with no history
      const [newCategory] = await db('budget_categories').insert({
        organization_id: testUser.id,
        name: 'New Category',
        code: 'NEW_CAT',
        category_type: 'marketing',
        active: true
      }).returning('*');

      const [newPeriod] = await db('budget_periods').insert({
        organization_id: testUser.id,
        name: 'Default Test Period',
        start_date: '2027-01-01',
        end_date: '2027-12-31',
        status: 'draft',
        created_by: testUser.id
      }).returning('*');

      const recommendations = await financialAIService.generateBudgetRecommendations(
        testUser.id,
        newPeriod.id
      );

      const newCategoryRec = recommendations.find(r => r.category_id === newCategory.id);
      expect(newCategoryRec).toBeTruthy();
      expect(newCategoryRec.basis).toBe('default');
      expect(newCategoryRec.confidence).toBeLessThan(0.5);
    });
  });

  describe('Trend Analysis', () => {
    test('analyzeTrend - should analyze increasing trend', async () => {
      const increasingData = [
        { amount: 100 },
        { amount: 120 },
        { amount: 140 },
        { amount: 160 },
        { amount: 180 }
      ];

      const analysis = financialAIService.analyzeTrend(increasingData);

      expect(analysis.trend).toBe('increasing');
      expect(analysis.projectedAmount).toBeGreaterThan(analysis.average);
      expect(analysis.confidence).toBeGreaterThan(0);
    });

    test('analyzeTrend - should analyze decreasing trend', async () => {
      const decreasingData = [
        { amount: 200 },
        { amount: 180 },
        { amount: 160 },
        { amount: 140 },
        { amount: 120 }
      ];

      const analysis = financialAIService.analyzeTrend(decreasingData);

      expect(analysis.trend).toBe('decreasing');
      expect(analysis.projectedAmount).toBeLessThan(analysis.average);
    });

    test('analyzeTrend - should analyze stable trend', async () => {
      const stableData = [
        { amount: 150 },
        { amount: 148 },
        { amount: 152 },
        { amount: 149 },
        { amount: 151 }
      ];

      const analysis = financialAIService.analyzeTrend(stableData);

      expect(analysis.trend).toBe('stable');
      expect(Math.abs(analysis.projectedAmount - analysis.average)).toBeLessThan(10);
    });

    test('analyzeTrend - should handle insufficient data', async () => {
      const insufficientData = [{ amount: 100 }];

      const analysis = financialAIService.analyzeTrend(insufficientData);

      expect(analysis.confidence).toBeLessThan(0.5);
      expect(analysis.trend).toBe('stable');
    });
  });

  describe('Historical Data Retrieval', () => {
    test('getHistoricalSpendingData - should retrieve spending data for category', async () => {
      const historicalData = await financialAIService.getHistoricalSpendingData(
        testUser.id,
        testCategory.id,
        12
      );

      expect(historicalData).toBeInstanceOf(Array);
      expect(historicalData.length).toBeGreaterThan(0);

      const dataPoint = historicalData[0];
      expect(dataPoint).toHaveProperty('month');
      expect(dataPoint).toHaveProperty('amount');
      expect(dataPoint).toHaveProperty('transactions');
      expect(typeof dataPoint.amount).toBe('number');
      expect(typeof dataPoint.transactions).toBe('number');
    });

    test('getHistoricalSpendingData - should limit months back', async () => {
      const historicalData = await financialAIService.getHistoricalSpendingData(
        testUser.id,
        testCategory.id,
        3 // Only 3 months
      );

      expect(historicalData.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Seasonal Adjustments', () => {
    test('calculateSeasonalAdjustment - should return appropriate factors for different categories', async () => {
      const period = {
        start_date: '2025-03-01' // March (spring)
      };

      const equipmentFactor = financialAIService.calculateSeasonalAdjustment('equipment', period);
      const travelFactor = financialAIService.calculateSeasonalAdjustment('travel', period);
      const defaultFactor = financialAIService.calculateSeasonalAdjustment('unknown', period);

      expect(equipmentFactor).toBe(1.2); // Higher in spring
      expect(travelFactor).toBe(0.7); // Lower in spring (not summer)
      expect(defaultFactor).toBe(1.0); // Default
    });
  });

  describe('Category Adjustments', () => {
    test('applyCategoryAdjustments - should apply reasonable limits', async () => {
      const payrollAmount = financialAIService.applyCategoryAdjustments('payroll', 50000);
      const equipmentAmount = financialAIService.applyCategoryAdjustments('equipment', 100000);
      const smallAmount = financialAIService.applyCategoryAdjustments('admin', 50);

      expect(payrollAmount).toBeLessThanOrEqual(100000); // Max cap
      expect(equipmentAmount).toBeLessThanOrEqual(50000); // Equipment cap
      expect(smallAmount).toBeGreaterThanOrEqual(500); // Admin minimum
    });
  });

  describe('Error Handling', () => {
    test('generateBudgetForecast - should handle database errors gracefully', async () => {
      // Mock a database error by using invalid organization ID
      await expect(
        financialAIService.generateBudgetForecast(
          'invalid-org-id',
          testBudget.id,
          'monthly_spend'
        )
      ).rejects.toThrow();
    });

    test('generateFinancialInsights - should handle empty data gracefully', async () => {
      // Create user with no financial data
      const [emptyUser] = await db('users').insert({
        first_name: 'Empty',
        last_name: 'User',
        email: 'empty@example.com',
        password: 'hashedpassword'
      }).returning('*');

      const insights = await financialAIService.generateFinancialInsights(emptyUser.id);
      
      expect(insights).toBeInstanceOf(Array);
      // Should not crash, may return empty array

      // Clean up
      await db('users').where('id', emptyUser.id).del();
    });
  });

  describe('Database Storage', () => {
    test('generateBudgetForecast - should store forecast in database', async () => {
      await financialAIService.generateBudgetForecast(
        testUser.id,
        testBudget.id,
        'monthly_spend'
      );

      const storedForecast = await db('budget_forecasts')
        .where('organization_id', testUser.id)
        .where('budget_id', testBudget.id)
        .where('forecast_type', 'monthly_spend')
        .first();

      expect(storedForecast).toBeTruthy();
      expect(storedForecast.forecast_data).toBeTruthy();
      expect(storedForecast.confidence_score).toBeGreaterThan(0);
    });

    test('generateFinancialInsights - should store insights in database', async () => {
      await financialAIService.generateFinancialInsights(testUser.id);

      const storedInsights = await db('financial_insights')
        .where('organization_id', testUser.id)
        .where('created_by_ai', true);

      expect(storedInsights.length).toBeGreaterThan(0);

      const insight = storedInsights[0];
      expect(insight.title).toBeTruthy();
      expect(insight.description).toBeTruthy();
      expect(['low', 'medium', 'high', 'critical']).toContain(insight.priority);
    });
  });
});