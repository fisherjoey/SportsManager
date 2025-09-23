import {
  isValidPaymentStatus,
  isValidTransactionType,
  parseMonetaryAmount,
  formatMonetaryAmount,
  formatPercentage,
  calculateNetIncome,
  calculatePercentage,
  parseDateRange,
  groupByDate,
  calculateTotalFromItems,
  mergeTransactionArrays,
  createTrendMap,
  addToTrendMap,
  convertTrendMapToArray,
  createDefaultSummaryMetrics,
  createDefaultRefereeWages,
  createDefaultBudgetUtilization,
  createDefaultPendingApprovals,
  createDefaultBudgets,
  validateDashboardQuery,
  validateRefereePaymentQuery,
  Transaction,
  RevenueTrend
} from '../../types/financial-dashboard';

describe('Financial Dashboard Utility Functions', () => {
  describe('isValidPaymentStatus', () => {
    it('should validate correct payment statuses', () => {
      expect(isValidPaymentStatus('all')).toBe(true);
      expect(isValidPaymentStatus('paid')).toBe(true);
      expect(isValidPaymentStatus('pending')).toBe(true);
    });

    it('should reject invalid payment statuses', () => {
      expect(isValidPaymentStatus('invalid')).toBe(false);
      expect(isValidPaymentStatus('')).toBe(false);
      expect(isValidPaymentStatus('PAID')).toBe(false);
    });
  });

  describe('isValidTransactionType', () => {
    it('should validate correct transaction types', () => {
      expect(isValidTransactionType('expense')).toBe(true);
      expect(isValidTransactionType('payment')).toBe(true);
    });

    it('should reject invalid transaction types', () => {
      expect(isValidTransactionType('invalid')).toBe(false);
      expect(isValidTransactionType('')).toBe(false);
      expect(isValidTransactionType('EXPENSE')).toBe(false);
    });
  });

  describe('parseMonetaryAmount', () => {
    it('should parse valid monetary amounts', () => {
      expect(parseMonetaryAmount(100)).toBe(100);
      expect(parseMonetaryAmount('100.50')).toBe(100.5);
      expect(parseMonetaryAmount('0')).toBe(0);
      expect(parseMonetaryAmount(0)).toBe(0);
    });

    it('should handle invalid inputs', () => {
      expect(parseMonetaryAmount(null)).toBe(0);
      expect(parseMonetaryAmount(undefined)).toBe(0);
      expect(parseMonetaryAmount('')).toBe(0);
      expect(parseMonetaryAmount('invalid')).toBe(0);
    });
  });

  describe('formatMonetaryAmount', () => {
    it('should format monetary amounts correctly', () => {
      expect(formatMonetaryAmount(100)).toBe('100.00');
      expect(formatMonetaryAmount(100.5)).toBe('100.50');
      expect(formatMonetaryAmount(0)).toBe('0.00');
      expect(formatMonetaryAmount(999.999)).toBe('1000.00');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages correctly', () => {
      expect(formatPercentage(50)).toBe('50.00%');
      expect(formatPercentage(33.333)).toBe('33.33%');
      expect(formatPercentage(0)).toBe('0.00%');
      expect(formatPercentage(100)).toBe('100.00%');
    });
  });

  describe('calculateNetIncome', () => {
    it('should calculate net income correctly', () => {
      expect(calculateNetIncome(1000, 300, 200)).toBe(500);
      expect(calculateNetIncome(500, 600, 100)).toBe(-200);
      expect(calculateNetIncome(0, 0, 0)).toBe(0);
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentages correctly', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(1, 3)).toBeCloseTo(33.33, 2);
    });

    it('should handle division by zero', () => {
      expect(calculatePercentage(50, 0)).toBe(0);
    });
  });

  describe('parseDateRange', () => {
    it('should parse date range with explicit dates', () => {
      const result = parseDateRange('2024-01-01', '2024-01-31');
      expect(result.start).toEqual(new Date('2024-01-01'));
      expect(result.end).toEqual(new Date('2024-01-31'));
    });

    it('should use period when no start date provided', () => {
      const endDate = '2024-01-31';
      const result = parseDateRange(undefined, endDate, '7');

      expect(result.end).toEqual(new Date('2024-01-31'));
      expect(result.start).toEqual(new Date('2024-01-24'));
    });

    it('should use default period when none provided', () => {
      const endDate = new Date('2024-01-31');
      const result = parseDateRange(undefined, endDate.toISOString());

      const expectedStart = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));
      expect(result.start).toEqual(expectedStart);
      expect(result.end).toEqual(endDate);
    });

    it('should use current date when no end date provided', () => {
      const before = Date.now();
      const result = parseDateRange('2024-01-01');
      const after = Date.now();

      expect(result.start).toEqual(new Date('2024-01-01'));
      expect(result.end.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.end.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('groupByDate', () => {
    it('should group items by date', () => {
      const items = [
        { date: new Date('2024-01-01'), amount: 100 },
        { date: new Date('2024-01-01'), amount: 200 },
        { date: new Date('2024-01-02'), amount: 300 }
      ];

      const grouped = groupByDate(items);

      expect(grouped.size).toBe(2);
      expect(grouped.get('2024-01-01')).toHaveLength(2);
      expect(grouped.get('2024-01-02')).toHaveLength(1);
    });
  });

  describe('calculateTotalFromItems', () => {
    it('should calculate total from items', () => {
      const items = [
        { amount: 100 },
        { amount: 200 },
        { amount: 300 }
      ];

      const total = calculateTotalFromItems(items, 'amount');
      expect(total).toBe(600);
    });

    it('should handle empty arrays', () => {
      const total = calculateTotalFromItems([], 'amount');
      expect(total).toBe(0);
    });
  });

  describe('mergeTransactionArrays', () => {
    const expenses: Transaction[] = [
      {
        id: 1,
        date: new Date('2024-01-03'),
        amount: 100,
        description: 'Expense 1',
        status: 'approved',
        category: 'Office',
        submitted_by: 'User 1',
        type: 'expense'
      },
      {
        id: 2,
        date: new Date('2024-01-01'),
        amount: 200,
        description: 'Expense 2',
        status: 'approved',
        category: 'Travel',
        submitted_by: 'User 2',
        type: 'expense'
      }
    ];

    const payments: Transaction[] = [
      {
        id: 3,
        date: new Date('2024-01-02'),
        amount: 150,
        description: 'Payment 1',
        status: 'completed',
        category: 'Wages',
        submitted_by: 'System',
        type: 'payment'
      }
    ];

    it('should merge and sort transactions by date descending', () => {
      const merged = mergeTransactionArrays(expenses, payments);

      expect(merged).toHaveLength(3);
      expect(merged[0].date).toEqual(new Date('2024-01-03'));
      expect(merged[1].date).toEqual(new Date('2024-01-02'));
      expect(merged[2].date).toEqual(new Date('2024-01-01'));
    });

    it('should respect the limit parameter', () => {
      const merged = mergeTransactionArrays(expenses, payments, 2);
      expect(merged).toHaveLength(2);
    });
  });

  describe('trend map operations', () => {
    it('should create and manipulate trend map', () => {
      const trendMap = createTrendMap();
      expect(trendMap.size).toBe(0);

      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');

      addToTrendMap(trendMap, date1, { revenue: 100, expenses: 50 });
      addToTrendMap(trendMap, date2, { wages: 75 });
      addToTrendMap(trendMap, date1, { wages: 25 }); // Should merge with existing

      expect(trendMap.size).toBe(2);

      const trends = convertTrendMapToArray(trendMap);
      expect(trends).toHaveLength(2);
      expect(trends[0].date).toEqual(date1);
      expect(trends[0].revenue).toBe(100);
      expect(trends[0].expenses).toBe(50);
      expect(trends[0].wages).toBe(25);
      expect(trends[0].netIncome).toBe(25); // 100 - 50 - 25
    });
  });

  describe('default creators', () => {
    it('should create default summary metrics', () => {
      const metrics = createDefaultSummaryMetrics();
      expect(metrics.totalRevenue).toBe(0);
      expect(metrics.totalWages).toBe(0);
      expect(metrics.totalExpenses).toBe(0);
      expect(metrics.netIncome).toBe(0);
      expect(metrics.gameCount).toBe(0);
    });

    it('should create default referee wages', () => {
      const wages = createDefaultRefereeWages();
      expect(wages.topReferees).toEqual([]);
      expect(wages.totalPaid).toBe(0);
      expect(wages.totalPending).toBe(0);
    });

    it('should create default budget utilization', () => {
      const budget = createDefaultBudgetUtilization();
      expect(budget.budgets).toEqual([]);
      expect(budget.totalAllocated).toBe(0);
      expect(budget.totalSpent).toBe(0);
      expect(budget.overallUtilization).toBe(0);
    });

    it('should create default pending approvals', () => {
      const approvals = createDefaultPendingApprovals();
      expect(approvals.expenses).toBe(0);
      expect(approvals.assignments).toBe(0);
      expect(approvals.total).toBe(0);
    });

    it('should create default budgets', () => {
      const budgets = createDefaultBudgets();
      expect(budgets).toHaveLength(4);
      expect(budgets[0].category).toBe('Referee Wages');
      expect(budgets[0].allocated).toBe(50000);
      expect(budgets[0].spent).toBe(0);
      expect(budgets[0].percentage).toBe(0);
    });
  });

  describe('validation functions', () => {
    describe('validateDashboardQuery', () => {
      it('should validate correct dashboard query', () => {
        const query = {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          period: '30'
        };

        const result = validateDashboardQuery(query);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.parsed.startDate).toBe('2024-01-01');
        expect(result.parsed.endDate).toBe('2024-01-31');
        expect(result.parsed.period).toBe('30');
      });

      it('should reject invalid dates', () => {
        const query = {
          startDate: 'invalid-date',
          endDate: '2024-13-40'
        };

        const result = validateDashboardQuery(query);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid start date format');
        expect(result.errors).toContain('Invalid end date format');
      });

      it('should reject invalid period', () => {
        const query = {
          period: '500'
        };

        const result = validateDashboardQuery(query);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Period must be between 1 and 365 days');
      });
    });

    describe('validateRefereePaymentQuery', () => {
      it('should validate correct referee payment query', () => {
        const query = {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          refereeId: '123',
          status: 'paid'
        };

        const result = validateRefereePaymentQuery(query);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.parsed.startDate).toBe('2024-01-01');
        expect(result.parsed.endDate).toBe('2024-01-31');
        expect(result.parsed.refereeId).toBe('123');
        expect(result.parsed.status).toBe('paid');
      });

      it('should reject invalid referee ID', () => {
        const query = {
          refereeId: '   ' // whitespace only
        };

        const result = validateRefereePaymentQuery(query);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid referee ID');
      });

      it('should reject invalid status', () => {
        const query = {
          status: 'invalid'
        };

        const result = validateRefereePaymentQuery(query);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid status. Must be one of: all, paid, pending');
      });
    });
  });
});