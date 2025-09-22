/**
 * Test suite for Financial AI Service
 */

import {
  FinancialAIService,
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
  SpendingPatternAnalysis
} from '../financialAIService';

// Mock database
jest.mock('../../config/database', () => {
  const mockDatabase = jest.fn(() => ({
    join: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    first: jest.fn(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    sum: jest.fn().mockReturnThis(),
    avg: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis()
  }));
  return mockDatabase;
});

describe('FinancialAIService', () => {
  let financialAIService: FinancialAIService;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    financialAIService = new FinancialAIService();
    mockDb = require('../../config/database')();
  });

  describe('Budget Forecast Generation', () => {
    const mockBudget = {
      id: 1,
      organization_id: 1,
      category_id: 1,
      allocated_amount: 10000,
      spent_amount: 6000,
      start_date: '2023-01-01',
      end_date: '2023-12-31',
      category_name: 'Marketing',
      category_type: 'operational'
    };

    const mockHistoricalData = [
      { month: '2023-01', amount: 800 },
      { month: '2023-02', amount: 750 },
      { month: '2023-03', amount: 950 },
      { month: '2023-04', amount: 900 }
    ];

    it('should generate monthly spending forecast', async () => {
      mockDb.first.mockResolvedValue(mockBudget);

      const mockForecast: BudgetForecast = {
        budgetId: 1,
        forecastType: 'monthly_spend',
        forecastData: {
          nextMonth: 850,
          next3Months: [850, 875, 825],
          trend: 'stable',
          projectedTotal: 9500
        },
        confidenceScore: 0.85,
        influencingFactors: ['historical_trends', 'seasonal_adjustments'],
        metadata: {
          generatedAt: new Date(),
          dataPointsUsed: 24,
          algorithm: 'linear_regression'
        }
      };

      jest.spyOn(financialAIService as any, 'getHistoricalSpendingData')
        .mockResolvedValue(mockHistoricalData);
      jest.spyOn(financialAIService as any, 'forecastMonthlySpending')
        .mockResolvedValue({
          forecastData: mockForecast.forecastData,
          confidenceScore: mockForecast.confidenceScore,
          influencingFactors: mockForecast.influencingFactors
        });

      const result = await financialAIService.generateBudgetForecast(1, 1, 'monthly_spend');

      expect(result.forecastType).toBe('monthly_spend');
      expect(result.confidenceScore).toBeGreaterThan(0.8);
      expect(result.forecastData.nextMonth).toBe(850);
      expect(result.influencingFactors).toContain('historical_trends');
    });

    it('should generate seasonal pattern analysis', async () => {
      mockDb.first.mockResolvedValue(mockBudget);

      const mockSeasonalForecast: BudgetForecast = {
        budgetId: 1,
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
          dataPointsUsed: 24,
          algorithm: 'seasonal_decomposition'
        }
      };

      jest.spyOn(financialAIService as any, 'getHistoricalSpendingData')
        .mockResolvedValue(mockHistoricalData);
      jest.spyOn(financialAIService as any, 'analyzeSeasonalPatterns')
        .mockResolvedValue({
          forecastData: mockSeasonalForecast.forecastData,
          confidenceScore: mockSeasonalForecast.confidenceScore,
          influencingFactors: mockSeasonalForecast.influencingFactors
        });

      const result = await financialAIService.generateBudgetForecast(1, 1, 'seasonal_pattern');

      expect(result.forecastType).toBe('seasonal_pattern');
      expect(result.forecastData.seasonalFactors).toBeDefined();
      expect(result.forecastData.peakMonths).toContain('November');
    });

    it('should handle budget not found error', async () => {
      mockDb.first.mockResolvedValue(null);

      await expect(
        financialAIService.generateBudgetForecast(1, 999, 'monthly_spend')
      ).rejects.toThrow('Budget not found');
    });
  });

  describe('Financial Insights Generation', () => {
    it('should generate comprehensive financial insights', async () => {
      const mockInsights: FinancialInsights = {
        organizationId: 1,
        overallBudgetHealth: 'good',
        totalBudgetUtilization: 0.72,
        topSpendingCategories: [
          { category: 'Marketing', amount: 15000, percentage: 35 },
          { category: 'Operations', amount: 12000, percentage: 28 }
        ],
        budgetVariances: [
          { budgetId: 1, variance: -500, variancePercentage: -5, status: 'under_budget' }
        ],
        cashFlowProjection: {
          nextMonth: 25000,
          next3Months: 72000,
          yearEnd: 300000
        },
        recommendedActions: [
          'Consider reallocating unused marketing budget',
          'Monitor operations spending closely'
        ],
        riskFactors: ['seasonal_spike_approaching'],
        confidenceScore: 0.88,
        generatedAt: new Date()
      };

      jest.spyOn(financialAIService, 'generateFinancialInsights')
        .mockResolvedValue(mockInsights);

      const result = await financialAIService.generateFinancialInsights(1);

      expect(result.organizationId).toBe(1);
      expect(result.overallBudgetHealth).toBe('good');
      expect(result.totalBudgetUtilization).toBe(0.72);
      expect(result.topSpendingCategories).toHaveLength(2);
      expect(result.recommendedActions).toContain('Consider reallocating unused marketing budget');
    });
  });

  describe('Budget Recommendations', () => {
    it('should generate intelligent budget recommendations', async () => {
      const mockRecommendations: BudgetRecommendation[] = [
        {
          budgetId: 1,
          recommendationType: 'increase_allocation',
          currentAmount: 10000,
          recommendedAmount: 12000,
          reasoning: 'Historical spending trends suggest higher allocation needed',
          confidenceScore: 0.85,
          expectedImpact: 'Better budget utilization and reduced overruns',
          priority: 'high',
          category: 'Marketing'
        },
        {
          budgetId: 2,
          recommendationType: 'reallocate_funds',
          currentAmount: 8000,
          recommendedAmount: 6000,
          reasoning: 'Underutilized budget with consistent underspending',
          confidenceScore: 0.75,
          expectedImpact: 'More efficient resource allocation',
          priority: 'medium',
          category: 'Training'
        }
      ];

      jest.spyOn(financialAIService, 'generateBudgetRecommendations')
        .mockResolvedValue(mockRecommendations);

      const result = await financialAIService.generateBudgetRecommendations(1, 1);

      expect(result).toHaveLength(2);
      expect(result[0].recommendationType).toBe('increase_allocation');
      expect(result[0].priority).toBe('high');
      expect(result[1].recommendationType).toBe('reallocate_funds');
      expect(result[1].confidenceScore).toBeGreaterThan(0.7);
    });
  });

  describe('Variance Analysis', () => {
    it('should analyze budget variances effectively', async () => {
      const mockVarianceAnalysis: BudgetVarianceAnalysis = {
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

      jest.spyOn(financialAIService, 'analyzeBudgetVariances')
        .mockResolvedValue(mockVarianceAnalysis);

      const result = await financialAIService.analyzeBudgetVariances(1);

      expect(result.organizationId).toBe(1);
      expect(result.totalVariance).toBe(-2500);
      expect(result.significantVariances).toHaveLength(1);
      expect(result.significantVariances[0].status).toBe('over_budget');
      expect(result.rootCauses).toContain('Unexpected marketing campaign costs');
    });
  });

  describe('Spending Pattern Analysis', () => {
    it('should analyze spending patterns comprehensively', async () => {
      const mockPatternAnalysis: SpendingPatternAnalysis = {
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

      jest.spyOn(financialAIService, 'analyzeSpendingPatterns')
        .mockResolvedValue(mockPatternAnalysis);

      const result = await financialAIService.analyzeSpendingPatterns(1);

      expect(result.organizationId).toBe(1);
      expect(result.patterns).toHaveLength(2);
      expect(result.predictabilityScore).toBeGreaterThan(0.8);
      expect(result.averageMonthlySpend).toBe(8500);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect spending anomalies', async () => {
      const mockAnomalies: SpendingAnomaly[] = [
        {
          id: '1',
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
        }
      ];

      jest.spyOn(financialAIService, 'detectSpendingAnomalies')
        .mockResolvedValue(mockAnomalies);

      const result = await financialAIService.detectSpendingAnomalies(1);

      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe('high');
      expect(result[0].deviation).toBe(87.5);
      expect(result[0].possibleCauses).toContain('Unplanned campaign launch');
    });
  });

  describe('Cash Flow Analysis', () => {
    it('should analyze cash flow trends', async () => {
      const mockCashFlowTrends: CashFlowTrend[] = [
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

      jest.spyOn(financialAIService, 'analyzeCashFlowTrends')
        .mockResolvedValue(mockCashFlowTrends);

      const result = await financialAIService.analyzeCashFlowTrends(1);

      expect(result).toHaveLength(2);
      expect(result[0].trend).toBe('positive');
      expect(result[1].trend).toBe('declining');
      expect(result[0].netFlow).toBe(15000);
      expect(result[1].confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Data Validation and Error Handling', () => {
    it('should validate forecast types', () => {
      const validTypes: ForecastType[] = [
        'monthly_spend',
        'seasonal_pattern',
        'year_end_projection',
        'variance_prediction'
      ];

      validTypes.forEach(type => {
        expect(['monthly_spend', 'seasonal_pattern', 'year_end_projection', 'variance_prediction'])
          .toContain(type);
      });
    });

    it('should validate confidence levels', () => {
      const validConfidenceLevels: ConfidenceLevel[] = ['low', 'medium', 'high'];

      validConfidenceLevels.forEach(level => {
        expect(['low', 'medium', 'high']).toContain(level);
      });
    });

    it('should handle database errors gracefully', async () => {
      mockDb.first.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        financialAIService.generateBudgetForecast(1, 1, 'monthly_spend')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('Historical Data Processing', () => {
    it('should process historical spending data correctly', async () => {
      const mockHistoricalData: HistoricalSpendingData[] = [
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

      jest.spyOn(financialAIService as any, 'getHistoricalSpendingData')
        .mockResolvedValue(mockHistoricalData);

      const result = await (financialAIService as any).getHistoricalSpendingData(1, 1, 12);

      expect(result).toHaveLength(2);
      expect(result[0].totalSpent).toBe(8500);
      expect(result[1].budgetUtilization).toBe(0.72);
    });
  });
});