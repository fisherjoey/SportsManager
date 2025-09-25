/**
 * Simple test suite for Financial AI Service TypeScript migration
 * Testing core interfaces and type definitions
 */

import {
  BudgetForecast,
  FinancialInsights,
  BudgetRecommendation,
  HistoricalSpendingData,
  SeasonalPattern,
  YearEndProjection,
  VariancePrediction,
  SpendingAnomaly,
  CashFlowTrend,
  ForecastType,
  ConfidenceLevel,
  BudgetVarianceAnalysis,
  SpendingPatternAnalysis,
  VarianceStatus,
  TrendDirection,
  RecommendationType,
  AnomalySeverity,
  PatternType,
  RecommendationPriority
} from '../financialAIService';

describe('FinancialAIService TypeScript Interfaces', () => {
  describe('Type Definitions', () => {
    it('should have correct ForecastType values', () => {
      const forecastTypes: ForecastType[] = [
        'monthly_spend',
        'seasonal_pattern',
        'year_end_projection',
        'variance_prediction'
      ];

      forecastTypes.forEach(type => {
        expect(['monthly_spend', 'seasonal_pattern', 'year_end_projection', 'variance_prediction'])
          .toContain(type);
      });
    });

    it('should have correct ConfidenceLevel values', () => {
      const confidenceLevels: ConfidenceLevel[] = ['low', 'medium', 'high'];

      confidenceLevels.forEach(level => {
        expect(['low', 'medium', 'high']).toContain(level);
      });
    });

    it('should have correct VarianceStatus values', () => {
      const statuses: VarianceStatus[] = ['under_budget', 'on_budget', 'over_budget'];

      statuses.forEach(status => {
        expect(['under_budget', 'on_budget', 'over_budget']).toContain(status);
      });
    });

    it('should have correct RecommendationType values', () => {
      const types: RecommendationType[] = [
        'increase_allocation',
        'decrease_allocation',
        'reallocate_funds',
        'freeze_budget',
        'review_spending'
      ];

      types.forEach(type => {
        expect([
          'increase_allocation',
          'decrease_allocation',
          'reallocate_funds',
          'freeze_budget',
          'review_spending'
        ]).toContain(type);
      });
    });
  });

  describe('Budget Forecast Interface', () => {
    it('should have correct BudgetForecast structure', () => {
      const forecast: BudgetForecast = {
        budgetId: 1,
        forecastType: 'monthly_spend',
        forecastData: {
          nextMonth: 5000,
          next3Months: [5000, 5200, 4800],
          trend: 'stable',
          projectedTotal: 60000
        },
        confidenceScore: 0.85,
        influencingFactors: ['historical_trends', 'seasonal_adjustments'],
        metadata: {
          generatedAt: new Date(),
          dataPointsUsed: 24,
          algorithm: 'linear_regression',
          version: '2.0'
        }
      };

      expect(forecast.budgetId).toBe(1);
      expect(forecast.forecastType).toBe('monthly_spend');
      expect(forecast.forecastData.nextMonth).toBe(5000);
      expect(forecast.forecastData.next3Months).toHaveLength(3);
      expect(forecast.confidenceScore).toBe(0.85);
      expect(forecast.influencingFactors).toContain('historical_trends');
      expect(forecast.metadata.algorithm).toBe('linear_regression');
    });

    it('should handle seasonal forecast data', () => {
      const seasonalForecast: BudgetForecast = {
        budgetId: 2,
        forecastType: 'seasonal_pattern',
        forecastData: {
          seasonalFactors: {
            Q1: 0.9,
            Q2: 1.1,
            Q3: 0.8,
            Q4: 1.2
          },
          peakMonths: ['November', 'December'],
          lowMonths: ['January', 'July']
        },
        confidenceScore: 0.75,
        influencingFactors: ['seasonal_trends', 'year_over_year_comparison'],
        metadata: {
          generatedAt: new Date(),
          dataPointsUsed: 36,
          algorithm: 'seasonal_decomposition'
        }
      };

      expect(seasonalForecast.forecastData.seasonalFactors?.Q4).toBe(1.2);
      expect(seasonalForecast.forecastData.peakMonths).toContain('December');
      expect(seasonalForecast.forecastData.lowMonths).toContain('January');
    });
  });

  describe('Financial Insights Interface', () => {
    it('should have correct FinancialInsights structure', () => {
      const insights: FinancialInsights = {
        organizationId: 1,
        overallBudgetHealth: 'good',
        totalBudgetUtilization: 0.72,
        topSpendingCategories: [
          {
            category: 'Marketing',
            amount: 15000,
            percentage: 35,
            trend: 'increasing',
            monthOverMonth: 8.5
          },
          {
            category: 'Operations',
            amount: 12000,
            percentage: 28,
            trend: 'stable'
          }
        ],
        budgetVariances: [
          {
            budgetId: 1,
            variance: -500,
            variancePercentage: -5,
            status: 'under_budget',
            category: 'IT',
            trend: 'decreasing'
          }
        ],
        cashFlowProjection: {
          nextMonth: 25000,
          next3Months: 72000,
          yearEnd: 300000,
          confidence: 0.85
        },
        recommendedActions: [
          'Consider reallocating unused IT budget',
          'Monitor marketing spending closely'
        ],
        riskFactors: ['seasonal_spike_approaching'],
        confidenceScore: 0.88,
        generatedAt: new Date()
      };

      expect(insights.organizationId).toBe(1);
      expect(insights.overallBudgetHealth).toBe('good');
      expect(insights.topSpendingCategories).toHaveLength(2);
      expect(insights.budgetVariances[0].status).toBe('under_budget');
      expect(insights.cashFlowProjection.yearEnd).toBe(300000);
      expect(insights.recommendedActions).toContain('Monitor marketing spending closely');
    });
  });

  describe('Budget Recommendation Interface', () => {
    it('should have correct BudgetRecommendation structure', () => {
      const recommendation: BudgetRecommendation = {
        budgetId: 1,
        recommendationType: 'increase_allocation',
        currentAmount: 10000,
        recommendedAmount: 12000,
        reasoning: 'Historical spending trends suggest higher allocation needed',
        confidenceScore: 0.85,
        expectedImpact: 'Better budget utilization and reduced overruns',
        priority: 'high',
        category: 'Marketing',
        implementation: {
          timeline: '2 weeks',
          requirements: ['Budget committee approval', 'Updated allocation plan'],
          risks: ['Potential overspending in other categories']
        }
      };

      expect(recommendation.budgetId).toBe(1);
      expect(recommendation.recommendationType).toBe('increase_allocation');
      expect(recommendation.currentAmount).toBe(10000);
      expect(recommendation.recommendedAmount).toBe(12000);
      expect(recommendation.priority).toBe('high');
      expect(recommendation.implementation?.timeline).toBe('2 weeks');
      expect(recommendation.implementation?.requirements).toContain('Budget committee approval');
    });
  });

  describe('Historical Data Interface', () => {
    it('should have correct HistoricalSpendingData structure', () => {
      const historicalData: HistoricalSpendingData[] = [
        {
          period: '2023-01',
          categoryId: 1,
          totalSpent: 8500,
          transactionCount: 25,
          averageTransactionSize: 340,
          budgetUtilization: 0.85
        },
        {
          period: '2023-02',
          categoryId: 1,
          totalSpent: 7200,
          transactionCount: 22,
          averageTransactionSize: 327,
          budgetUtilization: 0.72
        }
      ];

      expect(historicalData).toHaveLength(2);
      expect(historicalData[0].totalSpent).toBe(8500);
      expect(historicalData[1].transactionCount).toBe(22);
      expect(historicalData[0].budgetUtilization).toBe(0.85);
    });
  });

  describe('Variance Analysis Interface', () => {
    it('should have correct BudgetVarianceAnalysis structure', () => {
      const varianceAnalysis: BudgetVarianceAnalysis = {
        organizationId: 1,
        totalVariance: -2500,
        variancePercentage: -8.3,
        significantVariances: [
          {
            budgetId: 1,
            category: 'Marketing',
            plannedAmount: 10000,
            actualAmount: 12500,
            variance: 2500,
            variancePercentage: 25,
            status: 'over_budget',
            trend: 'increasing'
          }
        ],
        variancesByCategory: {
          'Marketing': 2500,
          'Operations': -1000,
          'Training': -500
        },
        rootCauses: [
          'Unexpected marketing campaign costs',
          'Seasonal demand increase'
        ],
        recommendations: [
          'Review marketing campaign budget allocation',
          'Implement better cost tracking for campaigns'
        ],
        generatedAt: new Date()
      };

      expect(varianceAnalysis.organizationId).toBe(1);
      expect(varianceAnalysis.totalVariance).toBe(-2500);
      expect(varianceAnalysis.significantVariances).toHaveLength(1);
      expect(varianceAnalysis.significantVariances[0].status).toBe('over_budget');
      expect(varianceAnalysis.variancesByCategory['Marketing']).toBe(2500);
      expect(varianceAnalysis.rootCauses).toContain('Unexpected marketing campaign costs');
    });
  });

  describe('Spending Pattern Analysis Interface', () => {
    it('should have correct SpendingPatternAnalysis structure', () => {
      const patternAnalysis: SpendingPatternAnalysis = {
        organizationId: 1,
        analysisType: 'comprehensive',
        timeRange: {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31')
        },
        patterns: [
          {
            type: 'seasonal',
            description: 'Higher spending in Q4',
            confidence: 0.85,
            impact: 'moderate'
          },
          {
            type: 'weekly_cycle',
            description: 'Consistent Monday peak spending',
            confidence: 0.75,
            impact: 'low'
          }
        ],
        averageMonthlySpend: 8500,
        spendingVolatility: 0.15,
        predictabilityScore: 0.82,
        recommendations: [
          'Plan for Q4 spending spike',
          'Consider Monday budget approval workflow'
        ],
        generatedAt: new Date()
      };

      expect(patternAnalysis.organizationId).toBe(1);
      expect(patternAnalysis.analysisType).toBe('comprehensive');
      expect(patternAnalysis.patterns).toHaveLength(2);
      expect(patternAnalysis.patterns[0].type).toBe('seasonal');
      expect(patternAnalysis.averageMonthlySpend).toBe(8500);
      expect(patternAnalysis.predictabilityScore).toBe(0.82);
    });
  });

  describe('Spending Anomaly Interface', () => {
    it('should have correct SpendingAnomaly structure', () => {
      const anomaly: SpendingAnomaly = {
        id: 'anomaly-001',
        organizationId: 1,
        detectedAt: new Date(),
        anomalyType: 'unusual_spike',
        category: 'Marketing',
        amount: 15000,
        expectedAmount: 8000,
        deviation: 87.5,
        severity: 'high',
        description: 'Marketing spending 87.5% above expected level',
        possibleCauses: [
          'Unplanned campaign launch',
          'Emergency advertising spend'
        ],
        recommendedActions: [
          'Review recent marketing approvals',
          'Investigate campaign ROI'
        ],
        confidence: 0.92
      };

      expect(anomaly.id).toBe('anomaly-001');
      expect(anomaly.anomalyType).toBe('unusual_spike');
      expect(anomaly.severity).toBe('high');
      expect(anomaly.deviation).toBe(87.5);
      expect(anomaly.possibleCauses).toContain('Unplanned campaign launch');
      expect(anomaly.recommendedActions).toContain('Review recent marketing approvals');
    });

    it('should handle different anomaly types', () => {
      const anomalyTypes: SpendingAnomaly['anomalyType'][] = [
        'unusual_spike',
        'unusual_drop',
        'pattern_break',
        'frequency_change'
      ];

      anomalyTypes.forEach(type => {
        expect(['unusual_spike', 'unusual_drop', 'pattern_break', 'frequency_change'])
          .toContain(type);
      });
    });
  });

  describe('Cash Flow Interface', () => {
    it('should have correct CashFlowTrend structure', () => {
      const cashFlowTrends: CashFlowTrend[] = [
        {
          period: '2023-10',
          inflow: 50000,
          outflow: 35000,
          netFlow: 15000,
          runningBalance: 125000,
          trend: 'positive',
          projectedNextPeriod: 18000,
          confidence: 0.85
        },
        {
          period: '2023-11',
          inflow: 45000,
          outflow: 42000,
          netFlow: 3000,
          runningBalance: 128000,
          trend: 'declining',
          projectedNextPeriod: 5000,
          confidence: 0.78
        }
      ];

      expect(cashFlowTrends).toHaveLength(2);
      expect(cashFlowTrends[0].trend).toBe('positive');
      expect(cashFlowTrends[1].trend).toBe('declining');
      expect(cashFlowTrends[0].netFlow).toBe(15000);
      expect(cashFlowTrends[0].confidence).toBe(0.85);
    });
  });

  describe('Complex Forecast Scenarios', () => {
    it('should handle year-end projection with risk factors', () => {
      const yearEndForecast: BudgetForecast = {
        budgetId: 3,
        forecastType: 'year_end_projection',
        forecastData: {
          projectedTotal: 98000,
          trend: 'increasing',
          riskFactors: [
            'Q4 seasonal spike',
            'Pending marketing campaign',
            'Economic uncertainty'
          ],
          varianceProbability: 0.15
        },
        confidenceScore: 0.78,
        influencingFactors: [
          'historical_average',
          'time_remaining',
          'current_utilization',
          'external_factors'
        ],
        metadata: {
          generatedAt: new Date(),
          dataPointsUsed: 30,
          algorithm: 'time_series_projection',
          version: '2.0'
        }
      };

      expect(yearEndForecast.forecastData.riskFactors).toContain('Q4 seasonal spike');
      expect(yearEndForecast.forecastData.varianceProbability).toBe(0.15);
      expect(yearEndForecast.influencingFactors).toContain('external_factors');
    });

    it('should handle variance prediction with confidence intervals', () => {
      const varianceForecast: BudgetForecast = {
        budgetId: 4,
        forecastType: 'variance_prediction',
        forecastData: {
          expectedVariance: 2500,
          varianceRange: {
            min: 1000,
            max: 4000
          },
          varianceProbability: 0.72
        },
        confidenceScore: 0.68,
        influencingFactors: ['current_variance', 'historical_volatility', 'spending_patterns'],
        metadata: {
          generatedAt: new Date(),
          dataPointsUsed: 18,
          algorithm: 'statistical_analysis'
        }
      };

      expect(varianceForecast.forecastData.varianceRange?.min).toBe(1000);
      expect(varianceForecast.forecastData.varianceRange?.max).toBe(4000);
      expect(varianceForecast.forecastData.varianceProbability).toBe(0.72);
    });
  });

  describe('Data Validation', () => {
    it('should validate confidence scores are within valid range', () => {
      const testConfidences = [0.0, 0.25, 0.5, 0.75, 1.0];

      testConfidences.forEach(confidence => {
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should validate monetary amounts are non-negative for appropriate fields', () => {
      const recommendation: BudgetRecommendation = {
        budgetId: 1,
        recommendationType: 'increase_allocation',
        currentAmount: 10000,
        recommendedAmount: 12000,
        reasoning: 'Test reasoning',
        confidenceScore: 0.8,
        expectedImpact: 'Test impact',
        priority: 'medium',
        category: 'Test'
      };

      expect(recommendation.currentAmount).toBeGreaterThanOrEqual(0);
      expect(recommendation.recommendedAmount).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidenceScore).toBeLessThanOrEqual(1);
    });
  });
});