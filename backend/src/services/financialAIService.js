const db = require('../config/database');

/**
 * AI-powered financial insights and forecasting service
 */
class FinancialAIService {
  /**
   * Generate budget forecasts using historical data and patterns
   */
  async generateBudgetForecast(organizationId, budgetId, forecastType = 'monthly_spend') {
    try {
      const budget = await db('budgets as b')
        .join('budget_periods as bp', 'b.budget_period_id', 'bp.id')
        .join('budget_categories as bc', 'b.category_id', 'bc.id')
        .where('b.id', budgetId)
        .where('b.organization_id', organizationId)
        .select('b.*', 'bp.start_date', 'bp.end_date', 'bc.category_type', 'bc.name as category_name')
        .first();

      if (!budget) {
        throw new Error('Budget not found');
      }

      // Get historical spending data for this category
      const historicalData = await this.getHistoricalSpendingData(organizationId, budget.category_id, 24); // 24 months

      let forecastData = {};
      let confidenceScore = 0.5;
      let influencingFactors = [];

      switch (forecastType) {
      case 'monthly_spend':
        ({ forecastData, confidenceScore, influencingFactors } = 
            await this.forecastMonthlySpending(budget, historicalData));
        break;
        
      case 'seasonal_pattern':
        ({ forecastData, confidenceScore, influencingFactors } = 
            await this.analyzeSeasonalPatterns(budget, historicalData));
        break;
        
      case 'year_end_projection':
        ({ forecastData, confidenceScore, influencingFactors } = 
            await this.projectYearEndSpending(budget, historicalData));
        break;
        
      case 'variance_prediction':
        ({ forecastData, confidenceScore, influencingFactors } = 
            await this.predictVariance(budget, historicalData));
        break;
        
      default:
        throw new Error(`Unsupported forecast type: ${forecastType}`);
      }

      // Store forecast in database
      const [forecast] = await db('budget_forecasts')
        .insert({
          organization_id: organizationId,
          budget_id: budgetId,
          forecast_type: forecastType,
          forecast_data: JSON.stringify(forecastData),
          confidence_score: confidenceScore,
          influencing_factors: JSON.stringify(influencingFactors),
          model_metadata: JSON.stringify({
            algorithm: 'statistical_analysis',
            data_points: historicalData.length,
            generated_at: new Date()
          }),
          forecast_period_start: budget.start_date,
          forecast_period_end: budget.end_date
        })
        .returning('*');

      return {
        forecast,
        data: forecastData,
        confidence: confidenceScore,
        factors: influencingFactors
      };
    } catch (error) {
      console.error('Budget forecast generation error:', error);
      throw error;
    }
  }

  /**
   * Analyze spending patterns and generate insights
   */
  async generateFinancialInsights(organizationId) {
    try {
      const insights = [];

      // Analyze budget variances
      const budgetInsights = await this.analyzeBudgetVariances(organizationId);
      insights.push(...budgetInsights);

      // Analyze spending patterns
      const spendingInsights = await this.analyzeSpendingPatterns(organizationId);
      insights.push(...spendingInsights);

      // Analyze cash flow trends
      const cashFlowInsights = await this.analyzeCashFlowTrends(organizationId);
      insights.push(...cashFlowInsights);

      // Detect anomalies
      const anomalyInsights = await this.detectSpendingAnomalies(organizationId);
      insights.push(...anomalyInsights);

      // Store insights in database
      for (const insight of insights) {
        await db('financial_insights')
          .insert({
            organization_id: organizationId,
            insight_type: insight.type,
            title: insight.title,
            description: insight.description,
            recommendation: insight.recommendation,
            potential_impact: insight.impact,
            priority: insight.priority,
            supporting_data: JSON.stringify(insight.data),
            action_items: JSON.stringify(insight.actions),
            expires_at: insight.expiresAt
          })
          .onConflict(['organization_id', 'insight_type', 'title'])
          .ignore(); // Don't duplicate similar insights
      }

      return insights;
    } catch (error) {
      console.error('Financial insights generation error:', error);
      throw error;
    }
  }

  /**
   * Calculate budget recommendations based on historical data
   */
  async generateBudgetRecommendations(organizationId, budgetPeriodId) {
    try {
      const budgetPeriod = await db('budget_periods')
        .where('id', budgetPeriodId)
        .where('organization_id', organizationId)
        .first();

      if (!budgetPeriod) {
        throw new Error('Budget period not found');
      }

      // Get all categories for this organization
      const categories = await db('budget_categories')
        .where('organization_id', organizationId)
        .where('active', true);

      const recommendations = [];

      for (const category of categories) {
        // Get historical spending for this category
        const historicalSpending = await this.getHistoricalSpendingData(organizationId, category.id, 12);
        
        if (historicalSpending.length === 0) {
          // No historical data, use default recommendation
          recommendations.push({
            category_id: category.id,
            category_name: category.name,
            recommended_amount: this.getDefaultBudgetAmount(category.category_type),
            confidence: 0.3,
            reasoning: 'No historical data available, using default amount',
            basis: 'default'
          });
          continue;
        }

        // Calculate recommended amount based on trends
        const trendAnalysis = this.analyzeTrend(historicalSpending);
        const seasonalAdjustment = this.calculateSeasonalAdjustment(category.category_type, budgetPeriod);
        const inflationAdjustment = 1.03; // 3% inflation assumption

        let recommendedAmount = trendAnalysis.projectedAmount * seasonalAdjustment * inflationAdjustment;
        
        // Apply category-specific adjustments
        recommendedAmount = this.applyCategoryAdjustments(category.category_type, recommendedAmount);

        recommendations.push({
          category_id: category.id,
          category_name: category.name,
          recommended_amount: Math.round(recommendedAmount * 100) / 100,
          confidence: trendAnalysis.confidence,
          reasoning: `Based on ${historicalSpending.length} months of data with ${trendAnalysis.trend} trend`,
          historical_average: trendAnalysis.average,
          trend: trendAnalysis.trend,
          seasonal_adjustment: seasonalAdjustment,
          basis: 'historical_analysis'
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Budget recommendations generation error:', error);
      throw error;
    }
  }

  /**
   * Get historical spending data for a category
   */
  async getHistoricalSpendingData(organizationId, categoryId, monthsBack = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    const data = await db('financial_transactions as ft')
      .join('budgets as b', 'ft.budget_id', 'b.id')
      .where('ft.organization_id', organizationId)
      .where('b.category_id', categoryId)
      .where('ft.status', 'posted')
      .where('ft.transaction_date', '>=', startDate)
      .select(
        db.raw('DATE_TRUNC(\'month\', ft.transaction_date) as month'),
        db.raw('SUM(ft.amount) as total_amount'),
        db.raw('COUNT(ft.id) as transaction_count')
      )
      .groupBy('month')
      .orderBy('month');

    return data.map(row => ({
      month: row.month,
      amount: parseFloat(row.total_amount),
      transactions: parseInt(row.transaction_count)
    }));
  }

  /**
   * Forecast monthly spending based on historical data
   */
  async forecastMonthlySpending(budget, historicalData) {
    if (historicalData.length < 3) {
      return {
        forecastData: { message: 'Insufficient data for forecasting' },
        confidenceScore: 0.1,
        influencingFactors: ['Insufficient historical data']
      };
    }

    // Simple linear regression for trend
    const trendAnalysis = this.analyzeTrend(historicalData);
    const monthlyForecast = [];
    
    const budgetStartDate = new Date(budget.start_date);
    const budgetEndDate = new Date(budget.end_date);
    const currentDate = new Date(budgetStartDate);

    while (currentDate <= budgetEndDate) {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const projectedAmount = Math.max(0, trendAnalysis.projectedAmount * (Math.random() * 0.4 + 0.8)); // Add some variance
      
      monthlyForecast.push({
        month: monthKey,
        projected_amount: Math.round(projectedAmount * 100) / 100
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return {
      forecastData: {
        monthly_projections: monthlyForecast,
        trend: trendAnalysis.trend,
        total_projected: monthlyForecast.reduce((sum, m) => sum + m.projected_amount, 0)
      },
      confidenceScore: trendAnalysis.confidence,
      influencingFactors: [
        'Historical spending patterns',
        'Seasonal variations',
        'Budget category type',
        `${historicalData.length} months of data`
      ]
    };
  }

  /**
   * Analyze seasonal spending patterns
   */
  async analyzeSeasonalPatterns(budget, historicalData) {
    const monthlyAverages = Array(12).fill(0);
    const monthlyCounters = Array(12).fill(0);

    // Calculate average spending by month across all years
    historicalData.forEach(data => {
      const month = new Date(data.month).getMonth();
      monthlyAverages[month] += data.amount;
      monthlyCounters[month]++;
    });

    // Calculate actual averages
    const seasonalPattern = monthlyAverages.map((total, index) => ({
      month: index + 1,
      average_amount: monthlyCounters[index] > 0 ? total / monthlyCounters[index] : 0,
      data_points: monthlyCounters[index]
    }));

    // Identify peak and low seasons
    const amounts = seasonalPattern.map(p => p.average_amount);
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    const peakMonth = amounts.indexOf(maxAmount) + 1;
    const lowMonth = amounts.indexOf(minAmount) + 1;

    return {
      forecastData: {
        seasonal_pattern: seasonalPattern,
        peak_month: peakMonth,
        low_month: lowMonth,
        seasonal_variance: maxAmount - minAmount
      },
      confidenceScore: historicalData.length >= 12 ? 0.8 : 0.5,
      influencingFactors: [
        'Multi-year spending history',
        'Seasonal business patterns',
        'Category-specific trends'
      ]
    };
  }

  /**
   * Project year-end spending
   */
  async projectYearEndSpending(budget, historicalData) {
    const currentDate = new Date();
    const yearStart = new Date(currentDate.getFullYear(), 0, 1);
    const monthsElapsed = Math.floor((currentDate - yearStart) / (1000 * 60 * 60 * 24 * 30.44));
    const monthsRemaining = 12 - monthsElapsed;

    if (monthsElapsed === 0) {
      return {
        forecastData: { message: 'Year just started, projection not meaningful' },
        confidenceScore: 0.2,
        influencingFactors: ['Beginning of year']
      };
    }

    // Get current year spending so far
    const currentYearSpending = await db('financial_transactions as ft')
      .join('budgets as b', 'ft.budget_id', 'b.id')
      .where('ft.organization_id', budget.organization_id)
      .where('b.category_id', budget.category_id)
      .where('ft.status', 'posted')
      .where('ft.transaction_date', '>=', yearStart)
      .sum('ft.amount as total')
      .first();

    const spentSoFar = parseFloat(currentYearSpending?.total || 0);
    const monthlyAverage = spentSoFar / monthsElapsed;
    const projectedYearEnd = spentSoFar + (monthlyAverage * monthsRemaining);

    return {
      forecastData: {
        spent_to_date: spentSoFar,
        months_elapsed: monthsElapsed,
        months_remaining: monthsRemaining,
        monthly_average: monthlyAverage,
        projected_year_end: Math.round(projectedYearEnd * 100) / 100,
        vs_budget: budget.allocated_amount > 0 ? 
          ((projectedYearEnd - budget.allocated_amount) / budget.allocated_amount) * 100 : 0
      },
      confidenceScore: monthsElapsed >= 3 ? 0.7 : 0.4,
      influencingFactors: [
        `${monthsElapsed} months of current year data`,
        'Historical monthly patterns',
        'Current spending velocity'
      ]
    };
  }

  /**
   * Predict budget variance
   */
  async predictVariance(budget, historicalData) {
    if (historicalData.length < 6) {
      return {
        forecastData: { message: 'Insufficient data for variance prediction' },
        confidenceScore: 0.2,
        influencingFactors: ['Limited historical data']
      };
    }

    // Calculate historical variances from budgets
    const historicalVariances = [];
    // This would require historical budget data to compare against actual spending
    // For now, use spending volatility as a proxy

    const amounts = historicalData.map(d => d.amount);
    const average = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - average, 2), 0) / amounts.length;
    const standardDeviation = Math.sqrt(variance);
    
    const coefficientOfVariation = average > 0 ? standardDeviation / average : 0;
    
    // Predict likely variance based on volatility
    const predictedVariance = coefficientOfVariation * budget.allocated_amount;
    const confidenceInterval = {
      low: budget.allocated_amount - (1.96 * predictedVariance),
      high: budget.allocated_amount + (1.96 * predictedVariance)
    };

    return {
      forecastData: {
        predicted_variance: Math.round(predictedVariance * 100) / 100,
        variance_percentage: (predictedVariance / budget.allocated_amount) * 100,
        confidence_interval: confidenceInterval,
        volatility_score: coefficientOfVariation,
        risk_level: coefficientOfVariation > 0.3 ? 'high' : coefficientOfVariation > 0.15 ? 'medium' : 'low'
      },
      confidenceScore: historicalData.length >= 12 ? 0.8 : 0.6,
      influencingFactors: [
        'Historical spending volatility',
        'Category-specific risk factors',
        'Seasonal variations'
      ]
    };
  }

  /**
   * Analyze budget variances and generate insights
   */
  async analyzeBudgetVariances(organizationId) {
    const insights = [];
    
    const budgets = await db('budgets as b')
      .join('budget_periods as bp', 'b.budget_period_id', 'bp.id')
      .join('budget_categories as bc', 'b.category_id', 'bc.id')
      .where('b.organization_id', organizationId)
      .where('bp.status', 'active')
      .select('b.*', 'bc.name as category_name', 'bc.category_type');

    for (const budget of budgets) {
      const allocated = parseFloat(budget.allocated_amount) || 0;
      const spent = parseFloat(budget.actual_spent) || 0;
      const variance = allocated > 0 ? ((spent - allocated) / allocated) * 100 : 0;

      if (Math.abs(variance) > 20) { // Significant variance
        const isOverspend = variance > 0;
        insights.push({
          type: isOverspend ? 'budget_optimization' : 'cost_savings_opportunity',
          title: `${budget.category_name} Budget ${isOverspend ? 'Overspend' : 'Underspend'}`,
          description: `${budget.category_name} is ${Math.abs(variance).toFixed(1)}% ${isOverspend ? 'over' : 'under'} budget`,
          recommendation: isOverspend 
            ? 'Review spending in this category and implement cost controls'
            : 'Consider reallocating unused budget to other categories',
          impact: Math.abs(spent - allocated),
          priority: isOverspend ? 'high' : 'medium',
          data: { budget_id: budget.id, variance, allocated, spent },
          actions: isOverspend 
            ? ['Review recent transactions', 'Implement approval controls', 'Revise budget allocation']
            : ['Reallocate budget', 'Review category needs', 'Adjust future budgets'],
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });
      }
    }

    return insights;
  }

  /**
   * Analyze spending patterns for insights
   */
  async analyzeSpendingPatterns(organizationId) {
    const insights = [];
    
    // Look for unusual spending spikes
    const recentTransactions = await db('financial_transactions as ft')
      .join('budgets as b', 'ft.budget_id', 'b.id')
      .join('budget_categories as bc', 'b.category_id', 'bc.id')
      .where('ft.organization_id', organizationId)
      .where('ft.status', 'posted')
      .where('ft.transaction_date', '>=', db.raw('CURRENT_DATE - INTERVAL \'30 days\''))
      .select('ft.*', 'bc.name as category_name', 'bc.category_type')
      .orderBy('ft.amount', 'desc');

    // Find unusually large transactions
    const largeTransactions = recentTransactions.filter(t => parseFloat(t.amount) > 1000);
    
    if (largeTransactions.length > 0) {
      const totalLarge = largeTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      insights.push({
        type: 'expense_pattern_anomaly',
        title: 'Large Transaction Alert',
        description: `${largeTransactions.length} large transactions totaling $${totalLarge.toFixed(2)} in the past 30 days`,
        recommendation: 'Review these large transactions to ensure they are legitimate and properly categorized',
        impact: totalLarge,
        priority: 'medium',
        data: { large_transactions: largeTransactions.slice(0, 5) },
        actions: ['Review transaction details', 'Verify approvals', 'Check for duplicate payments'],
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
      });
    }

    return insights;
  }

  /**
   * Analyze cash flow trends
   */
  async analyzeCashFlowTrends(organizationId) {
    const insights = [];
    
    // Get last 3 months of cash flow data
    const cashFlow = await db('financial_transactions')
      .where('organization_id', organizationId)
      .where('status', 'posted')
      .where('transaction_date', '>=', db.raw('CURRENT_DATE - INTERVAL \'90 days\''))
      .select(
        db.raw('DATE_TRUNC(\'month\', transaction_date) as month'),
        db.raw('SUM(CASE WHEN transaction_type = \'revenue\' THEN amount ELSE 0 END) as revenue'),
        db.raw('SUM(CASE WHEN transaction_type IN (\'expense\', \'payroll\') THEN amount ELSE 0 END) as expenses')
      )
      .groupBy('month')
      .orderBy('month');

    if (cashFlow.length >= 2) {
      const netFlows = cashFlow.map(cf => parseFloat(cf.revenue) - parseFloat(cf.expenses));
      const latestFlow = netFlows[netFlows.length - 1];
      const previousFlow = netFlows[netFlows.length - 2];
      
      if (latestFlow < 0 && previousFlow < 0) {
        insights.push({
          type: 'cash_flow_warning',
          title: 'Negative Cash Flow Trend',
          description: 'Cash flow has been negative for multiple months',
          recommendation: 'Review expenses and revenue streams to improve cash flow',
          impact: Math.abs(latestFlow),
          priority: 'critical',
          data: { recent_cash_flows: netFlows },
          actions: ['Reduce discretionary spending', 'Accelerate revenue collection', 'Defer non-essential expenses'],
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
      }
    }

    return insights;
  }

  /**
   * Detect spending anomalies
   */
  async detectSpendingAnomalies(organizationId) {
    const insights = [];
    
    // This would implement more sophisticated anomaly detection
    // For now, implement basic duplicate detection
    const duplicates = await db('financial_transactions as ft1')
      .join('financial_transactions as ft2', function() {
        this.on('ft1.amount', 'ft2.amount')
          .andOn('ft1.vendor_id', 'ft2.vendor_id')
          .andOn('ft1.transaction_date', 'ft2.transaction_date')
          .andOn('ft1.id', '<', 'ft2.id');
      })
      .where('ft1.organization_id', organizationId)
      .where('ft1.status', 'posted')
      .where('ft1.transaction_date', '>=', db.raw('CURRENT_DATE - INTERVAL \'30 days\''))
      .select('ft1.*', 'ft2.id as duplicate_id')
      .limit(10);

    if (duplicates.length > 0) {
      insights.push({
        type: 'fraud_alert',
        title: 'Potential Duplicate Payments',
        description: `Found ${duplicates.length} potential duplicate transactions`,
        recommendation: 'Review these transactions to confirm they are not duplicates',
        impact: duplicates.reduce((sum, d) => sum + parseFloat(d.amount), 0),
        priority: 'high',
        data: { potential_duplicates: duplicates },
        actions: ['Verify transactions with vendors', 'Check payment records', 'Implement duplicate detection'],
        expiresAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) // 21 days
      });
    }

    return insights;
  }

  /**
   * Analyze trend from historical data
   */
  analyzeTrend(historicalData) {
    if (historicalData.length < 2) {
      return { trend: 'stable', projectedAmount: 0, confidence: 0.1, average: 0 };
    }

    const amounts = historicalData.map(d => d.amount);
    const average = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    
    // Simple linear trend calculation
    const n = amounts.length;
    const sumX = (n * (n + 1)) / 2;  // Sum of 1,2,3...n
    const sumXY = amounts.reduce((sum, amt, index) => sum + amt * (index + 1), 0);
    const slope = (n * sumXY - sumX * (amounts.reduce((sum, amt) => sum + amt, 0))) / (n * ((n * (n + 1) * (2 * n + 1)) / 6) - sumX * sumX);
    
    const trend = slope > average * 0.05 ? 'increasing' : slope < -average * 0.05 ? 'decreasing' : 'stable';
    const projectedAmount = Math.max(0, average + slope);
    const confidence = Math.min(0.9, Math.max(0.3, n / 12)); // More data = higher confidence

    return { trend, projectedAmount, confidence, average };
  }

  /**
   * Calculate seasonal adjustment factor
   */
  calculateSeasonalAdjustment(categoryType, budgetPeriod) {
    // This would be more sophisticated in a real implementation
    const month = new Date(budgetPeriod.start_date).getMonth() + 1;
    
    const seasonalFactors = {
      'equipment': month >= 3 && month <= 5 ? 1.2 : 0.9, // Higher in spring
      'marketing': month >= 8 && month <= 10 ? 1.3 : 0.8, // Higher in fall
      'travel': month >= 6 && month <= 8 ? 1.4 : 0.7, // Higher in summer
      'facilities': month >= 11 || month <= 2 ? 1.1 : 0.95, // Higher in winter
      'default': 1.0
    };

    return seasonalFactors[categoryType] || seasonalFactors.default;
  }

  /**
   * Get default budget amount for category type
   */
  getDefaultBudgetAmount(categoryType) {
    const defaults = {
      'operating_expenses': 5000,
      'payroll': 15000,
      'equipment': 3000,
      'facilities': 2000,
      'travel': 1000,
      'marketing': 1500,
      'admin': 2000,
      'other': 1000
    };

    return defaults[categoryType] || 1000;
  }

  /**
   * Apply category-specific adjustments
   */
  applyCategoryAdjustments(categoryType, amount) {
    // Apply reasonable caps and floors based on category type
    const adjustments = {
      'payroll': { min: 1000, max: 100000 },
      'equipment': { min: 500, max: 50000 },
      'facilities': { min: 500, max: 20000 },
      'travel': { min: 200, max: 10000 },
      'marketing': { min: 300, max: 15000 },
      'admin': { min: 500, max: 10000 },
      'operating_expenses': { min: 1000, max: 50000 },
      'other': { min: 100, max: 10000 }
    };

    const limits = adjustments[categoryType] || { min: 100, max: 25000 };
    return Math.max(limits.min, Math.min(limits.max, amount));
  }
}

module.exports = new FinancialAIService();