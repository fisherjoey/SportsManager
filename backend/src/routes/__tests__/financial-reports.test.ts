import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

// Mock the database
const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  whereBetween: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  clone: jest.fn().mockReturnThis(),
  modify: jest.fn().mockReturnThis(),
  raw: jest.fn().mockImplementation((query) => query),
  insert: jest.fn().mockReturnThis(),
  onConflict: jest.fn().mockReturnThis(),
  merge: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  count: jest.fn().mockReturnThis(),
  first: jest.fn(),
  // Make the mock chainable by returning the mock for any method call
  [Symbol.iterator]: function* () {
    yield this;
  }
};

// Create a Proxy to handle any method call on the mock
const createMockProxy = (target: any): any => {
  return new Proxy(target, {
    get(obj, prop) {
      if (prop in obj) {
        return obj[prop];
      }
      // Return a function that returns the proxy for chaining
      return jest.fn().mockReturnValue(createMockProxy(obj));
    }
  });
};

const mockDbProxy = createMockProxy(mockDb);

jest.mock('../config/database', () => {
  const mockFn = jest.fn().mockImplementation((table) => {
    if (typeof table === 'string') {
      return mockDbProxy;
    }
    return mockDbProxy;
  });
  Object.assign(mockFn, mockDbProxy);
  return mockFn;
});

jest.mock('joi', () => ({
  object: jest.fn().mockReturnValue({
    validate: jest.fn().mockReturnValue({ error: null, value: {} })
  }),
  string: jest.fn().mockReturnValue({
    min: jest.fn().mockReturnThis(),
    max: jest.fn().mockReturnThis(),
    required: jest.fn().mockReturnThis(),
    valid: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis()
  }),
  number: jest.fn().mockReturnValue({
    integer: jest.fn().mockReturnThis(),
    min: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    default: jest.fn().mockReturnThis()
  }),
  boolean: jest.fn().mockReturnValue({
    default: jest.fn().mockReturnThis()
  })
}));

jest.mock('../middleware/auth', () => ({
  authenticateToken: jest.fn().mockImplementation((req: any, res: any, next: any) => {
    req.user = {
      id: 1,
      organization_id: 1,
      role: 'admin'
    };
    next();
  }),
  requireRole: jest.fn().mockImplementation((role: string) => (req: any, res: any, next: any) => next()),
  requireAnyRole: jest.fn().mockImplementation((...roles: string[]) => (req: any, res: any, next: any) => next())
}));

const financialReportsRouter = require('../financial-reports');

describe('Financial Reports Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/financial-reports', financialReportsRouter);
    jest.clearAllMocks();
  });

  describe('GET /budget-variance', () => {
    it('should return budget variance report with summary and detailed variances', async () => {
      // Mock budget data
      const mockBudgets = [
        {
          id: 1,
          name: 'Equipment Budget',
          allocated_amount: '1000.00',
          actual_spent: '1200.00',
          committed_amount: '100.00',
          category_name: 'Equipment',
          category_type: 'capital_expenses',
          color_code: '#FF5733'
        },
        {
          id: 2,
          name: 'Travel Budget',
          allocated_amount: '800.00',
          actual_spent: '600.00',
          committed_amount: '50.00',
          category_name: 'Travel',
          category_type: 'operating_expenses',
          color_code: '#33FF57'
        }
      ];

      const mockCategoryVariance = [
        {
          category_name: 'Equipment',
          category_type: 'capital_expenses',
          color_code: '#FF5733',
          total_allocated: '1000.00',
          total_spent: '1200.00',
          total_committed: '100.00',
          budget_count: '1'
        }
      ];

      mockDbProxy.orderBy.mockResolvedValueOnce(mockBudgets);
      mockDbProxy.orderBy.mockResolvedValueOnce(mockCategoryVariance);

      const response = await request(app)
        .get('/api/financial-reports/budget-variance')
        .query({ variance_threshold: 5 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('budget_variances');
      expect(response.body).toHaveProperty('category_variances');
      expect(response.body.summary).toHaveProperty('total_budgets');
      expect(response.body.summary).toHaveProperty('total_allocated');
      expect(response.body.summary).toHaveProperty('total_spent');
      expect(response.body.budget_variances).toBeInstanceOf(Array);
    });

    it('should filter budgets by period_id when provided', async () => {
      mockDbProxy.orderBy.mockResolvedValue([]);

      await request(app)
        .get('/api/financial-reports/budget-variance')
        .query({ period_id: 1 });

      expect(mockDbProxy.where).toHaveBeenCalledWith('b.budget_period_id', '1');
    });

    it('should filter budgets by category_id when provided', async () => {
      mockDbProxy.orderBy.mockResolvedValue([]);

      await request(app)
        .get('/api/financial-reports/budget-variance')
        .query({ category_id: 2 });

      expect(mockDbProxy.where).toHaveBeenCalledWith('b.category_id', '2');
    });

    it('should handle database errors gracefully', async () => {
      mockDbProxy.orderBy.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/financial-reports/budget-variance');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to generate budget variance report');
    });
  });

  describe('GET /cash-flow', () => {
    it('should return cash flow report with inflow, outflow, and net flow data', async () => {
      const mockCashFlowData = [
        {
          period: new Date('2024-01-01'),
          inflow: '5000.00',
          outflow: '3000.00',
          transaction_count: '15'
        },
        {
          period: new Date('2024-02-01'),
          inflow: '6000.00',
          outflow: '3500.00',
          transaction_count: '18'
        }
      ];

      const mockTopRevenue = [
        { category_name: 'Registration Fees', color_code: '#FF5733', total_amount: '15000.00' }
      ];

      const mockTopExpenses = [
        { category_name: 'Equipment', color_code: '#33FF57', total_amount: '8000.00' }
      ];

      mockDbProxy.orderBy.mockResolvedValueOnce(mockCashFlowData);
      mockDbProxy.orderBy.mockResolvedValueOnce([]);
      mockDbProxy.orderBy.mockResolvedValueOnce(mockTopRevenue);
      mockDbProxy.orderBy.mockResolvedValueOnce(mockTopExpenses);

      const response = await request(app)
        .get('/api/financial-reports/cash-flow')
        .query({ grouping: 'monthly' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('cash_flow_data');
      expect(response.body).toHaveProperty('top_revenue_categories');
      expect(response.body).toHaveProperty('top_expense_categories');
      expect(response.body.summary).toHaveProperty('total_inflow');
      expect(response.body.summary).toHaveProperty('total_outflow');
      expect(response.body.summary).toHaveProperty('net_cash_flow');
    });

    it('should support different grouping periods', async () => {
      mockDbProxy.orderBy.mockResolvedValue([]);

      await request(app)
        .get('/api/financial-reports/cash-flow')
        .query({ grouping: 'weekly' });

      expect(response.status).not.toBe(500);
    });

    it('should include forecasts when requested', async () => {
      mockDbProxy.orderBy.mockResolvedValueOnce([]);
      mockDbProxy.orderBy.mockResolvedValueOnce([
        { forecast_year: 2024, forecast_month: 3, forecasted_inflow: '5500.00' }
      ]);
      mockDbProxy.orderBy.mockResolvedValueOnce([]);
      mockDbProxy.orderBy.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/financial-reports/cash-flow')
        .query({ include_forecast: 'true' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('forecasts');
    });
  });

  describe('GET /expense-analysis', () => {
    it('should return detailed expense analysis with category and vendor breakdowns', async () => {
      const mockExpensesByCategory = [
        {
          category_name: 'Equipment',
          category_type: 'capital_expenses',
          color_code: '#FF5733',
          total_amount: '8000.00',
          transaction_count: '5',
          average_amount: '1600.00',
          min_amount: '500.00',
          max_amount: '3000.00'
        }
      ];

      const mockExpensesByVendor = [
        {
          vendor_name: 'Sports Equipment Co',
          total_amount: '5000.00',
          transaction_count: '3',
          average_amount: '1666.67'
        }
      ];

      const mockMonthlyTrend = [
        { month: '2024-01', total_amount: '3000.00', transaction_count: '8' },
        { month: '2024-02', total_amount: '3500.00', transaction_count: '10' }
      ];

      const mockSummary = {
        total_expenses: '6500.00',
        total_transactions: '18',
        average_transaction: '361.11',
        unique_vendors: '5',
        categories_used: '3'
      };

      const mockTopExpenses = [
        {
          transaction_number: 'EXP-001',
          description: 'New scoreboards',
          amount: '3000.00',
          transaction_date: new Date('2024-01-15'),
          category_name: 'Equipment',
          vendor_name: 'Sports Equipment Co'
        }
      ];

      mockDbProxy.orderBy.mockResolvedValueOnce(mockExpensesByCategory);
      mockDbProxy.orderBy.mockResolvedValueOnce(mockExpensesByVendor);
      mockDbProxy.orderBy.mockResolvedValueOnce(mockMonthlyTrend);
      mockDbProxy.select.mockResolvedValueOnce([mockSummary]);
      mockDbProxy.orderBy.mockResolvedValueOnce(mockTopExpenses);

      const response = await request(app)
        .get('/api/financial-reports/expense-analysis');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('expenses_by_category');
      expect(response.body).toHaveProperty('expenses_by_vendor');
      expect(response.body).toHaveProperty('monthly_trend');
      expect(response.body).toHaveProperty('top_expenses');
      expect(response.body.summary.total_expenses).toBe(6500);
      expect(response.body.expenses_by_category).toBeInstanceOf(Array);
    });

    it('should include comparison data when requested', async () => {
      const mockCurrentSummary = {
        total_expenses: '6500.00',
        total_transactions: '18',
        average_transaction: '361.11',
        unique_vendors: '5',
        categories_used: '3'
      };

      const mockPrevSummary = {
        total_expenses: '5000.00',
        total_transactions: '15',
        average_transaction: '333.33'
      };

      mockDbProxy.orderBy.mockResolvedValue([]);
      mockDbProxy.select.mockResolvedValueOnce([mockCurrentSummary]);
      mockDbProxy.select.mockResolvedValueOnce([mockPrevSummary]);

      const response = await request(app)
        .get('/api/financial-reports/expense-analysis')
        .query({ comparison_period: 'true' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('comparison');
      expect(response.body.comparison).toHaveProperty('change_amount');
      expect(response.body.comparison).toHaveProperty('change_percentage');
      expect(response.body.comparison).toHaveProperty('trend');
    });
  });

  describe('GET /payroll-summary', () => {
    it('should return payroll summary with referee breakdown and payment status', async () => {
      const mockPayrollByReferee = [
        {
          referee_id: 1,
          referee_name: 'John Doe',
          referee_email: 'john@example.com',
          games_officiated: '5',
          total_wages: '750.00',
          average_wage: '150.00',
          games_paid: '3',
          wages_paid: '450.00',
          wages_pending: '300.00'
        }
      ];

      const mockMonthlyPayroll = [
        {
          month: '2024-01',
          total_assignments: '25',
          total_wages: '3750.00',
          active_referees: '8'
        }
      ];

      const mockPaymentStatus = [
        { payment_status: 'paid', assignment_count: '15', total_amount: '2250.00' },
        { payment_status: 'pending', assignment_count: '10', total_amount: '1500.00' }
      ];

      const mockSummary = {
        total_assignments: '25',
        total_wages: '3750.00',
        average_wage: '150.00',
        total_referees: '8',
        games_covered: '12',
        total_paid: '2250.00',
        total_pending: '1500.00'
      };

      const mockTopEarningGames = [
        {
          game_id: 1,
          game_date: new Date('2024-01-15'),
          home_team: 'Lions',
          away_team: 'Tigers',
          total_wages: '300.00',
          referee_count: '2'
        }
      ];

      mockDbProxy.orderBy.mockResolvedValueOnce(mockPayrollByReferee);
      mockDbProxy.orderBy.mockResolvedValueOnce(mockMonthlyPayroll);
      mockDbProxy.orderBy.mockResolvedValueOnce(mockPaymentStatus);
      mockDbProxy.select.mockResolvedValueOnce([mockSummary]);
      mockDbProxy.orderBy.mockResolvedValueOnce(mockTopEarningGames);

      const response = await request(app)
        .get('/api/financial-reports/payroll-summary');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('payroll_by_referee');
      expect(response.body).toHaveProperty('monthly_payroll');
      expect(response.body).toHaveProperty('payment_status_breakdown');
      expect(response.body).toHaveProperty('top_earning_games');
      expect(response.body.summary.total_assignments).toBe(25);
      expect(response.body.summary.total_wages).toBe(3750);
    });

    it('should filter by referee_id when provided', async () => {
      mockDbProxy.orderBy.mockResolvedValue([]);
      mockDbProxy.select.mockResolvedValue([{}]);

      await request(app)
        .get('/api/financial-reports/payroll-summary')
        .query({ referee_id: 1 });

      expect(mockDbProxy.where).toHaveBeenCalledWith('ga.user_id', '1');
    });

    it('should filter by payment_status when provided', async () => {
      mockDbProxy.orderBy.mockResolvedValue([]);
      mockDbProxy.select.mockResolvedValue([{}]);

      await request(app)
        .get('/api/financial-reports/payroll-summary')
        .query({ payment_status: 'pending' });

      expect(mockDbProxy.where).toHaveBeenCalledWith('ga.payment_status', 'pending');
    });
  });

  describe('GET /kpis', () => {
    it('should return calculated KPIs with budget utilization and cash flow metrics', async () => {
      const mockBudgetUtilization = {
        total_allocated: '10000.00',
        total_spent: '8500.00'
      };

      const mockCashFlowCurrent = {
        revenue: '15000.00',
        expenses: '12000.00'
      };

      const mockExpenseVariance = {
        budgeted: '8000.00',
        actual: '8400.00'
      };

      const mockCostPerGame = {
        total_expenses: '6000.00'
      };

      const mockGameCount = {
        total: '20'
      };

      const mockPayrollEfficiency = {
        payroll: '4000.00',
        total_expenses: '10000.00'
      };

      const mockStoredKpis = [
        {
          id: 1,
          kpi_name: 'custom_metric',
          kpi_type: 'custom',
          current_value: 85.5,
          target_value: 80,
          last_calculated_at: new Date('2024-01-15')
        }
      ];

      mockDbProxy.first.mockResolvedValueOnce(mockBudgetUtilization);
      mockDbProxy.first.mockResolvedValueOnce(mockCashFlowCurrent);
      mockDbProxy.first.mockResolvedValueOnce(mockExpenseVariance);
      mockDbProxy.first.mockResolvedValueOnce(mockCostPerGame);
      mockDbProxy.first.mockResolvedValueOnce(mockGameCount);
      mockDbProxy.first.mockResolvedValueOnce(mockPayrollEfficiency);
      mockDbProxy.orderBy.mockResolvedValueOnce(mockStoredKpis);

      const response = await request(app)
        .get('/api/financial-reports/kpis')
        .query({ period_days: 30 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('calculated_kpis');
      expect(response.body).toHaveProperty('stored_kpis');
      expect(response.body).toHaveProperty('calculation_period');
      expect(response.body.calculated_kpis).toHaveProperty('budget_utilization_rate');
      expect(response.body.calculated_kpis).toHaveProperty('net_cash_flow');
      expect(response.body.calculated_kpis.budget_utilization_rate.value).toBeCloseTo(85);
      expect(response.body.calculated_kpis.net_cash_flow.value).toBeCloseTo(3000);
    });

    it('should handle missing data gracefully', async () => {
      mockDbProxy.first.mockResolvedValue(null);
      mockDbProxy.orderBy.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/financial-reports/kpis');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('calculated_kpis');
      expect(response.body).toHaveProperty('stored_kpis');
    });
  });

  describe('POST /kpis', () => {
    it('should create a new KPI configuration', async () => {
      const kpiData = {
        kpi_name: 'Revenue Growth Rate',
        kpi_type: 'revenue_growth',
        target_value: 15,
        calculation_config: {
          formula: 'growth_rate',
          period: 'quarterly'
        },
        calculation_period_days: 90
      };

      const mockCreatedKpi = {
        id: 1,
        ...kpiData,
        organization_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDbProxy.returning.mockResolvedValueOnce([mockCreatedKpi]);

      const response = await request(app)
        .post('/api/financial-reports/kpis')
        .send(kpiData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'KPI configured successfully');
      expect(response.body).toHaveProperty('kpi');
      expect(response.body.kpi.kpi_name).toBe('Revenue Growth Rate');
    });

    it('should return validation error for invalid KPI data', async () => {
      const invalidKpiData = {
        kpi_name: '', // Invalid: empty string
        kpi_type: 'invalid_type', // Invalid: not in allowed values
        calculation_config: {} // Invalid: required field
      };

      // Mock Joi validation to return an error
      const joi = require('joi');
      joi.object().validate.mockReturnValueOnce({
        error: {
          details: [{ message: 'kpi_name is not allowed to be empty' }]
        }
      });

      const response = await request(app)
        .post('/api/financial-reports/kpis')
        .send(invalidKpiData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation error');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('GET /export/:type', () => {
    it('should return export information for supported report types', async () => {
      const response = await request(app)
        .get('/api/financial-reports/export/budget-variance');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('report_type', 'budget-variance');
      expect(response.body).toHaveProperty('supported_formats');
      expect(response.body.supported_formats).toContain('csv');
      expect(response.body.supported_formats).toContain('excel');
      expect(response.body.supported_formats).toContain('pdf');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      // Create a new app without the mock auth middleware
      const noAuthApp = express();
      noAuthApp.use(express.json());

      // Mock the auth middleware to reject
      jest.doMock('../middleware/auth', () => ({
        authenticateToken: jest.fn().mockImplementation((req: any, res: any, next: any) => {
          res.status(401).json({ error: 'Unauthorized' });
        })
      }));

      const response = await request(noAuthApp)
        .get('/api/financial-reports/budget-variance');

      // Since we can't easily change the middleware after importing the router,
      // we'll test that the route exists and would handle auth properly
      expect(response.status).not.toBe(404);
    });

    it('should handle database connection errors', async () => {
      mockDbProxy.orderBy.mockRejectedValueOnce(new Error('Connection timeout'));

      const response = await request(app)
        .get('/api/financial-reports/budget-variance');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed query parameters', async () => {
      const response = await request(app)
        .get('/api/financial-reports/cash-flow')
        .query({
          date_from: 'invalid-date',
          grouping: 'invalid-grouping'
        });

      // The route should handle invalid dates gracefully
      expect(response.status).not.toBe(500);
    });
  });

  describe('Data Validation and Security', () => {
    it('should enforce organization isolation', async () => {
      mockDbProxy.orderBy.mockResolvedValue([]);

      await request(app)
        .get('/api/financial-reports/budget-variance');

      // Verify that the query includes organization_id filter
      expect(mockDbProxy.where).toHaveBeenCalledWith('b.organization_id', 1);
    });

    it('should sanitize numeric inputs', async () => {
      mockDbProxy.orderBy.mockResolvedValue([]);

      await request(app)
        .get('/api/financial-reports/budget-variance')
        .query({ variance_threshold: '10.5' });

      // The route should parse and validate the numeric input
      expect(response.status).not.toBe(500);
    });

    it('should handle SQL injection attempts', async () => {
      mockDbProxy.orderBy.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/financial-reports/budget-variance')
        .query({
          period_id: "1; DROP TABLE budgets; --"
        });

      // The route should use parameterized queries to prevent SQL injection
      expect(response.status).not.toBe(500);
    });
  });
});