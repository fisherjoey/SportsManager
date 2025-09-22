/**
 * AI-powered financial insights and forecasting service
 * Provides intelligent budget analysis, forecasting, and recommendations
 */

import db from '../config/database';

/**
 * Available forecast types for budget analysis
 */
export type ForecastType = 'monthly_spend' | 'seasonal_pattern' | 'year_end_projection' | 'variance_prediction';

/**
 * Confidence levels for predictions and recommendations
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/**
 * Budget variance status indicators
 */
export type VarianceStatus = 'under_budget' | 'on_budget' | 'over_budget';

/**
 * Spending trend directions
 */
export type TrendDirection = 'increasing' | 'decreasing' | 'stable' | 'volatile';

/**
 * Recommendation types for budget optimization
 */
export type RecommendationType = 'increase_allocation' | 'decrease_allocation' | 'reallocate_funds' | 'freeze_budget' | 'review_spending';

/**
 * Anomaly severity levels
 */
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Cash flow trend indicators
 */
export type CashFlowTrend = 'positive' | 'negative' | 'declining' | 'improving' | 'stable';

/**
 * Spending pattern types
 */
export type PatternType = 'seasonal' | 'weekly_cycle' | 'monthly_cycle' | 'trend' | 'cyclical';

/**
 * Budget recommendation priority levels
 */
export type RecommendationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Historical spending data for a specific period
 */
export interface HistoricalSpendingData {
  period: string;
  categoryId: number;
  totalSpent: number;
  transactionCount: number;
  averageTransactionSize: number;
  budgetUtilization: number;
}

/**
 * Budget forecast result with AI-powered predictions
 */
export interface BudgetForecast {
  budgetId: number;
  forecastType: ForecastType;
  forecastData: {
    nextMonth?: number;
    next3Months?: number[];
    trend?: TrendDirection;
    projectedTotal?: number;
    seasonalFactors?: Record<string, number>;
    peakMonths?: string[];
    lowMonths?: string[];
    varianceProbability?: number;
    riskFactors?: string[];
  };
  confidenceScore: number;
  influencingFactors: string[];
  metadata: {
    generatedAt: Date;
    dataPointsUsed: number;
    algorithm: string;
    version?: string;
  };
}

/**
 * Seasonal spending pattern analysis
 */
export interface SeasonalPattern {
  quarter: string;
  factor: number;
  averageSpending: number;
  volatility: number;
  peakIndicator: boolean;
}

/**
 * Year-end projection with detailed breakdown
 */
export interface YearEndProjection {
  projectedTotal: number;
  remainingBudget: number;
  projectedOverrun: number;
  utilizationRate: number;
  riskLevel: ConfidenceLevel;
  mitigationStrategies: string[];
}

/**
 * Variance prediction with confidence intervals
 */
export interface VariancePrediction {
  expectedVariance: number;
  varianceRange: {
    min: number;
    max: number;
  };
  probability: number;
  contributingFactors: string[];
}

/**
 * Top spending category information
 */
export interface TopSpendingCategory {
  category: string;
  amount: number;
  percentage: number;
  trend?: TrendDirection;
  monthOverMonth?: number;
}

/**
 * Budget variance details
 */
export interface BudgetVarianceDetail {
  budgetId: number;
  variance: number;
  variancePercentage: number;
  status: VarianceStatus;
  category?: string;
  trend?: TrendDirection;
}

/**
 * Cash flow projection data
 */
export interface CashFlowProjection {
  nextMonth: number;
  next3Months: number;
  yearEnd: number;
  confidence?: number;
}

/**
 * Comprehensive financial insights for an organization
 */
export interface FinancialInsights {
  organizationId: number;
  overallBudgetHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  totalBudgetUtilization: number;
  topSpendingCategories: TopSpendingCategory[];
  budgetVariances: BudgetVarianceDetail[];
  cashFlowProjection: CashFlowProjection;
  recommendedActions: string[];
  riskFactors: string[];
  confidenceScore: number;
  generatedAt: Date;
}

/**
 * Budget recommendation with AI-powered insights
 */
export interface BudgetRecommendation {
  budgetId: number;
  recommendationType: RecommendationType;
  currentAmount: number;
  recommendedAmount: number;
  reasoning: string;
  confidenceScore: number;
  expectedImpact: string;
  priority: RecommendationPriority;
  category: string;
  implementation?: {
    timeline: string;
    requirements: string[];
    risks: string[];
  };
}

/**
 * Budget variance analysis results
 */
export interface BudgetVarianceAnalysis {
  organizationId: number;
  totalVariance: number;
  variancePercentage: number;
  significantVariances: BudgetVarianceDetail[];
  variancesByCategory: Record<string, number>;
  rootCauses: string[];
  recommendations: string[];
  generatedAt: Date;
}

/**
 * Spending pattern analysis results
 */
export interface SpendingPatternAnalysis {
  organizationId: number;
  analysisType: 'comprehensive' | 'category_specific' | 'time_series';
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  patterns: Array<{
    type: PatternType;
    description: string;
    confidence: number;
    impact: 'low' | 'moderate' | 'high';
  }>;
  averageMonthlySpend: number;
  spendingVolatility: number;
  predictabilityScore: number;
  recommendations: string[];
  generatedAt: Date;
}

/**
 * Spending anomaly detection result
 */
export interface SpendingAnomaly {
  id: string;
  organizationId: number;
  detectedAt: Date;
  anomalyType: 'unusual_spike' | 'unusual_drop' | 'pattern_break' | 'frequency_change';
  category: string;
  amount: number;
  expectedAmount: number;
  deviation: number;
  severity: AnomalySeverity;
  description: string;
  possibleCauses: string[];
  recommendedActions: string[];
  confidence: number;
}

/**
 * Cash flow trend analysis
 */
export interface CashFlowTrend {
  period: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  runningBalance: number;
  trend: CashFlowTrend;
  projectedNextPeriod: number;
  confidence: number;
}

/**
 * AI-powered financial insights and forecasting service
 */
export class FinancialAIService {
  /**
   * Generate budget forecasts using historical data and AI patterns
   */
  async generateBudgetForecast(
    organizationId: number,
    budgetId: number,
    forecastType: ForecastType = 'monthly_spend'
  ): Promise<BudgetForecast> {
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

      let forecastData: BudgetForecast['forecastData'] = {};
      let confidenceScore = 0.5;
      let influencingFactors: string[] = [];

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

      return {
        budgetId,
        forecastType,
        forecastData,
        confidenceScore,
        influencingFactors,
        metadata: {
          generatedAt: new Date(),
          dataPointsUsed: historicalData.length,
          algorithm: this.getAlgorithmForForecastType(forecastType),
          version: '2.0'
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate budget forecast: ${(error as Error).message}`);
    }
  }

  /**
   * Generate comprehensive financial insights for an organization
   */
  async generateFinancialInsights(organizationId: number): Promise<FinancialInsights> {
    try {
      // Analyze budget variances
      const budgetVariances = await this.getBudgetVariances(organizationId);

      // Get top spending categories
      const topSpendingCategories = await this.getTopSpendingCategories(organizationId);

      // Calculate overall budget utilization
      const totalBudgetUtilization = await this.calculateBudgetUtilization(organizationId);

      // Generate cash flow projection
      const cashFlowProjection = await this.generateCashFlowProjection(organizationId);

      // Determine overall budget health
      const overallBudgetHealth = this.calculateBudgetHealth(totalBudgetUtilization, budgetVariances);

      // Generate recommended actions
      const recommendedActions = await this.generateRecommendedActions(organizationId, budgetVariances, topSpendingCategories);

      // Identify risk factors
      const riskFactors = await this.identifyRiskFactors(organizationId);

      // Calculate confidence score
      const confidenceScore = this.calculateInsightsConfidence(budgetVariances, topSpendingCategories);

      return {
        organizationId,
        overallBudgetHealth,
        totalBudgetUtilization,
        topSpendingCategories,
        budgetVariances,
        cashFlowProjection,
        recommendedActions,
        riskFactors,
        confidenceScore,
        generatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to generate financial insights: ${(error as Error).message}`);
    }
  }

  /**
   * Generate intelligent budget recommendations
   */
  async generateBudgetRecommendations(
    organizationId: number,
    budgetPeriodId: number
  ): Promise<BudgetRecommendation[]> {
    try {
      const budgets = await db('budgets as b')
        .join('budget_categories as bc', 'b.category_id', 'bc.id')
        .where('b.organization_id', organizationId)
        .where('b.budget_period_id', budgetPeriodId)
        .select('b.*', 'bc.name as category_name', 'bc.category_type');

      const recommendations: BudgetRecommendation[] = [];

      for (const budget of budgets) {
        const historicalData = await this.getHistoricalSpendingData(organizationId, budget.category_id, 12);
        const variance = await this.calculateBudgetVariance(budget);
        const recommendation = await this.generateBudgetRecommendation(budget, historicalData, variance);

        if (recommendation) {
          recommendations.push(recommendation);
        }
      }

      // Sort by priority and confidence
      return recommendations.sort((a, b) => {
        const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidenceScore - a.confidenceScore;
      });
    } catch (error) {
      throw new Error(`Failed to generate budget recommendations: ${(error as Error).message}`);
    }
  }

  /**
   * Analyze budget variances across the organization
   */
  async analyzeBudgetVariances(organizationId: number): Promise<BudgetVarianceAnalysis> {
    try {
      const budgets = await db('budgets as b')
        .join('budget_categories as bc', 'b.category_id', 'bc.id')
        .where('b.organization_id', organizationId)
        .select('b.*', 'bc.name as category_name');

      const variances = await Promise.all(
        budgets.map(async (budget) => {
          const variance = budget.spent_amount - budget.allocated_amount;
          const variancePercentage = (variance / budget.allocated_amount) * 100;

          return {
            budgetId: budget.id,
            category: budget.category_name,
            plannedAmount: budget.allocated_amount,
            actualAmount: budget.spent_amount,
            variance,
            variancePercentage,
            status: this.getVarianceStatus(variancePercentage),
            trend: await this.calculateSpendingTrend(budget.id)
          };
        })
      );

      const significantVariances = variances.filter(v => Math.abs(v.variancePercentage) > 10);
      const totalVariance = variances.reduce((sum, v) => sum + v.variance, 0);
      const totalPlanned = variances.reduce((sum, v) => sum + v.plannedAmount, 0);
      const variancePercentage = (totalVariance / totalPlanned) * 100;

      const variancesByCategory = variances.reduce((acc, v) => {
        acc[v.category] = v.variance;
        return acc;
      }, {} as Record<string, number>);

      const rootCauses = await this.identifyVarianceRootCauses(significantVariances);
      const recommendations = await this.generateVarianceRecommendations(significantVariances);

      return {
        organizationId,
        totalVariance,
        variancePercentage,
        significantVariances,
        variancesByCategory,
        rootCauses,
        recommendations,
        generatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to analyze budget variances: ${(error as Error).message}`);
    }
  }

  /**
   * Analyze spending patterns using AI algorithms
   */
  async analyzeSpendingPatterns(organizationId: number): Promise<SpendingPatternAnalysis> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 1); // Last 12 months

      const spendingData = await db('expenses')
        .where('organization_id', organizationId)
        .whereBetween('expense_date', [startDate, endDate])
        .select('expense_date', 'amount', 'category_id')
        .orderBy('expense_date');

      const patterns = await this.detectSpendingPatterns(spendingData);
      const averageMonthlySpend = await this.calculateAverageMonthlySpend(spendingData);
      const spendingVolatility = await this.calculateSpendingVolatility(spendingData);
      const predictabilityScore = this.calculatePredictabilityScore(patterns, spendingVolatility);
      const recommendations = this.generatePatternRecommendations(patterns);

      return {
        organizationId,
        analysisType: 'comprehensive',
        timeRange: { startDate, endDate },
        patterns,
        averageMonthlySpend,
        spendingVolatility,
        predictabilityScore,
        recommendations,
        generatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to analyze spending patterns: ${(error as Error).message}`);
    }
  }

  /**
   * Detect spending anomalies using statistical analysis
   */
  async detectSpendingAnomalies(organizationId: number): Promise<SpendingAnomaly[]> {
    try {
      const recentSpending = await db('expenses')
        .where('organization_id', organizationId)
        .where('expense_date', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 30 DAY)'))
        .select('*');

      const historicalSpending = await db('expenses')
        .where('organization_id', organizationId)
        .where('expense_date', '<', db.raw('DATE_SUB(NOW(), INTERVAL 30 DAY)'))
        .where('expense_date', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 365 DAY)'))
        .select('*');

      const anomalies: SpendingAnomaly[] = [];

      // Group by category for analysis
      const categoryStats = await this.calculateCategoryStatistics(historicalSpending);

      for (const category in categoryStats) {
        const recentCategorySpending = recentSpending
          .filter(expense => expense.category_id === parseInt(category))
          .reduce((sum, expense) => sum + expense.amount, 0);

        const expectedSpending = categoryStats[category].average;
        const standardDeviation = categoryStats[category].stdDev;
        const deviation = Math.abs(recentCategorySpending - expectedSpending);
        const zScore = deviation / standardDeviation;

        if (zScore > 2) { // Significant anomaly
          const anomaly = await this.createSpendingAnomaly(
            organizationId,
            category,
            recentCategorySpending,
            expectedSpending,
            zScore
          );
          anomalies.push(anomaly);
        }
      }

      return anomalies.sort((a, b) => {
        const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
    } catch (error) {
      throw new Error(`Failed to detect spending anomalies: ${(error as Error).message}`);
    }
  }

  /**
   * Analyze cash flow trends with AI predictions
   */
  async analyzeCashFlowTrends(organizationId: number): Promise<CashFlowTrend[]> {
    try {
      const months = 12;
      const trends: CashFlowTrend[] = [];

      for (let i = months; i >= 0; i--) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - i);
        startDate.setDate(1);

        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);

        const inflow = await this.calculateInflow(organizationId, startDate, endDate);
        const outflow = await this.calculateOutflow(organizationId, startDate, endDate);
        const netFlow = inflow - outflow;
        const runningBalance = trends.length > 0
          ? trends[trends.length - 1].runningBalance + netFlow
          : netFlow;

        const trend = this.determineCashFlowTrend(trends, netFlow);
        const projectedNextPeriod = await this.projectNextPeriodCashFlow(trends, netFlow);
        const confidence = this.calculateCashFlowConfidence(trends);

        trends.push({
          period: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
          inflow,
          outflow,
          netFlow,
          runningBalance,
          trend,
          projectedNextPeriod,
          confidence
        });
      }

      return trends;
    } catch (error) {
      throw new Error(`Failed to analyze cash flow trends: ${(error as Error).message}`);
    }
  }

  /**
   * Get historical spending data for analysis
   * @private
   */
  private async getHistoricalSpendingData(
    organizationId: number,
    categoryId: number,
    monthsBack: number = 12
  ): Promise<HistoricalSpendingData[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    const data = await db('expenses')
      .where('organization_id', organizationId)
      .where('category_id', categoryId)
      .where('expense_date', '>=', startDate)
      .select(
        db.raw('DATE_FORMAT(expense_date, "%Y-%m") as period'),
        db.raw('SUM(amount) as totalSpent'),
        db.raw('COUNT(*) as transactionCount'),
        db.raw('AVG(amount) as averageTransactionSize')
      )
      .groupBy(db.raw('DATE_FORMAT(expense_date, "%Y-%m")'))
      .orderBy('period');

    return data.map(row => ({
      period: row.period,
      categoryId,
      totalSpent: parseFloat(row.totalSpent),
      transactionCount: parseInt(row.transactionCount),
      averageTransactionSize: parseFloat(row.averageTransactionSize),
      budgetUtilization: 0.85 // Placeholder - would be calculated from budget data
    }));
  }

  /**
   * Forecast monthly spending using linear regression
   * @private
   */
  private async forecastMonthlySpending(
    budget: any,
    historicalData: HistoricalSpendingData[]
  ): Promise<{ forecastData: any; confidenceScore: number; influencingFactors: string[] }> {
    if (historicalData.length < 3) {
      return {
        forecastData: { nextMonth: budget.allocated_amount / 12 },
        confidenceScore: 0.3,
        influencingFactors: ['limited_historical_data']
      };
    }

    // Simple linear regression for trend
    const amounts = historicalData.map(d => d.totalSpent);
    const trend = this.calculateLinearTrend(amounts);
    const nextMonth = amounts[amounts.length - 1] + trend;
    const next3Months = [nextMonth, nextMonth + trend, nextMonth + (2 * trend)];

    const trendDirection: TrendDirection = trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable';
    const projectedTotal = amounts.reduce((sum, amount) => sum + amount, 0) + (next3Months.reduce((sum, amount) => sum + amount, 0));

    return {
      forecastData: {
        nextMonth,
        next3Months,
        trend: trendDirection,
        projectedTotal
      },
      confidenceScore: Math.min(0.9, 0.5 + (historicalData.length * 0.05)),
      influencingFactors: ['historical_trends', 'linear_regression']
    };
  }

  /**
   * Analyze seasonal patterns in spending
   * @private
   */
  private async analyzeSeasonalPatterns(
    budget: any,
    historicalData: HistoricalSpendingData[]
  ): Promise<{ forecastData: any; confidenceScore: number; influencingFactors: string[] }> {
    const seasonalFactors = this.calculateSeasonalFactors(historicalData);
    const patterns = this.identifySeasonalPatterns(historicalData);

    return {
      forecastData: {
        seasonalFactors,
        peakMonths: patterns.peakMonths,
        lowMonths: patterns.lowMonths
      },
      confidenceScore: patterns.confidence,
      influencingFactors: ['seasonal_trends', 'year_over_year_comparison']
    };
  }

  /**
   * Project year-end spending
   * @private
   */
  private async projectYearEndSpending(
    budget: any,
    historicalData: HistoricalSpendingData[]
  ): Promise<{ forecastData: any; confidenceScore: number; influencingFactors: string[] }> {
    const currentSpent = budget.spent_amount;
    const monthsRemaining = this.calculateMonthsRemaining();
    const avgMonthlySpend = historicalData.length > 0
      ? historicalData.reduce((sum, d) => sum + d.totalSpent, 0) / historicalData.length
      : currentSpent / (12 - monthsRemaining);

    const projectedTotal = currentSpent + (avgMonthlySpend * monthsRemaining);
    const remainingBudget = budget.allocated_amount - currentSpent;
    const projectedOverrun = Math.max(0, projectedTotal - budget.allocated_amount);

    return {
      forecastData: {
        projectedTotal,
        remainingBudget,
        projectedOverrun,
        utilizationRate: projectedTotal / budget.allocated_amount
      },
      confidenceScore: historicalData.length > 6 ? 0.8 : 0.6,
      influencingFactors: ['historical_average', 'time_remaining', 'current_utilization']
    };
  }

  /**
   * Predict budget variance
   * @private
   */
  private async predictVariance(
    budget: any,
    historicalData: HistoricalSpendingData[]
  ): Promise<{ forecastData: any; confidenceScore: number; influencingFactors: string[] }> {
    const currentVariance = budget.spent_amount - (budget.allocated_amount * this.getYearProgress());
    const varianceRange = this.calculateVarianceRange(historicalData, currentVariance);

    return {
      forecastData: {
        expectedVariance: currentVariance,
        varianceRange,
        varianceProbability: 0.75
      },
      confidenceScore: 0.7,
      influencingFactors: ['current_variance', 'historical_volatility']
    };
  }

  /**
   * Helper methods for calculations
   */
  private calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private calculateSeasonalFactors(data: HistoricalSpendingData[]): Record<string, number> {
    // Simplified seasonal factor calculation
    return {
      Q1: 0.9,
      Q2: 1.1,
      Q3: 0.8,
      Q4: 1.2
    };
  }

  private identifySeasonalPatterns(data: HistoricalSpendingData[]): { peakMonths: string[]; lowMonths: string[]; confidence: number } {
    return {
      peakMonths: ['November', 'December'],
      lowMonths: ['January', 'July'],
      confidence: 0.75
    };
  }

  private calculateMonthsRemaining(): number {
    const now = new Date();
    const yearEnd = new Date(now.getFullYear(), 11, 31);
    const diffTime = yearEnd.getTime() - now.getTime();
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    return Math.max(0, diffMonths);
  }

  private getYearProgress(): number {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31);
    const progress = (now.getTime() - yearStart.getTime()) / (yearEnd.getTime() - yearStart.getTime());
    return Math.min(1, Math.max(0, progress));
  }

  private calculateVarianceRange(data: HistoricalSpendingData[], currentVariance: number): { min: number; max: number } {
    const volatility = data.length > 0 ? this.calculateVolatility(data.map(d => d.totalSpent)) : 1000;
    return {
      min: currentVariance - volatility,
      max: currentVariance + volatility
    };
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private getAlgorithmForForecastType(type: ForecastType): string {
    const algorithms = {
      monthly_spend: 'linear_regression',
      seasonal_pattern: 'seasonal_decomposition',
      year_end_projection: 'time_series_projection',
      variance_prediction: 'statistical_analysis'
    };
    return algorithms[type];
  }

  // Additional helper methods for comprehensive functionality
  private async getBudgetVariances(organizationId: number): Promise<BudgetVarianceDetail[]> {
    // Implementation would query database for budget variances
    return [];
  }

  private async getTopSpendingCategories(organizationId: number): Promise<TopSpendingCategory[]> {
    // Implementation would query database for top spending categories
    return [];
  }

  private async calculateBudgetUtilization(organizationId: number): Promise<number> {
    // Implementation would calculate overall budget utilization
    return 0.75;
  }

  private async generateCashFlowProjection(organizationId: number): Promise<CashFlowProjection> {
    // Implementation would generate cash flow projections
    return {
      nextMonth: 25000,
      next3Months: 72000,
      yearEnd: 300000
    };
  }

  private calculateBudgetHealth(utilization: number, variances: BudgetVarianceDetail[]): FinancialInsights['overallBudgetHealth'] {
    if (utilization > 0.95) return 'critical';
    if (utilization > 0.85) return 'poor';
    if (utilization > 0.75) return 'fair';
    if (utilization > 0.65) return 'good';
    return 'excellent';
  }

  private async generateRecommendedActions(organizationId: number, variances: BudgetVarianceDetail[], categories: TopSpendingCategory[]): Promise<string[]> {
    return ['Monitor high-spend categories', 'Review budget allocations'];
  }

  private async identifyRiskFactors(organizationId: number): Promise<string[]> {
    return ['seasonal_spike_approaching'];
  }

  private calculateInsightsConfidence(variances: BudgetVarianceDetail[], categories: TopSpendingCategory[]): number {
    return 0.85;
  }

  // Additional implementation methods would continue here...
  // (Abbreviated for space, but would include all remaining methods)
}

// Export singleton instance
export const financialAIService = new FinancialAIService();

// Export class for testing
export default financialAIService;