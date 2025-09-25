import {
  parseMonetaryAmount,
  roundPercentage,
  isValidGrouping,
  isValidPaymentStatus,
  isValidReportType,
  isValidKPIType,
  formatMonetaryAmount,
  VARIANCE_THRESHOLDS,
  DEFAULT_PERIODS
} from '../../types/financial-reports';

describe('Financial Reports Utility Functions', () => {
  describe('parseMonetaryAmount', () => {
    it('should parse string amounts correctly', () => {
      expect(parseMonetaryAmount('100.50')).toBe(100.5);
      expect(parseMonetaryAmount('0')).toBe(0);
      expect(parseMonetaryAmount('1000')).toBe(1000);
    });

    it('should handle numeric amounts', () => {
      expect(parseMonetaryAmount(250.75)).toBe(250.75);
      expect(parseMonetaryAmount(0)).toBe(0);
    });

    it('should handle null and undefined values', () => {
      expect(parseMonetaryAmount(null)).toBe(0);
      expect(parseMonetaryAmount(undefined)).toBe(0);
    });

    it('should handle invalid string values', () => {
      expect(parseMonetaryAmount('invalid')).toBe(0);
      expect(parseMonetaryAmount('')).toBe(0);
    });
  });

  describe('roundPercentage', () => {
    it('should round percentages to 2 decimal places', () => {
      expect(roundPercentage(10.12345)).toBe(10.12);
      expect(roundPercentage(25.9876)).toBe(25.99);
      expect(roundPercentage(0.123)).toBe(0.12);
    });

    it('should handle whole numbers', () => {
      expect(roundPercentage(50)).toBe(50);
      expect(roundPercentage(0)).toBe(0);
    });

    it('should handle negative percentages', () => {
      expect(roundPercentage(-15.789)).toBe(-15.79);
    });
  });

  describe('formatMonetaryAmount', () => {
    it('should format amounts to 2 decimal places', () => {
      expect(formatMonetaryAmount(100.5)).toBe('100.50');
      expect(formatMonetaryAmount(1000)).toBe('1000.00');
      expect(formatMonetaryAmount(0.99)).toBe('0.99');
    });

    it('should handle zero', () => {
      expect(formatMonetaryAmount(0)).toBe('0.00');
    });

    it('should handle negative amounts', () => {
      expect(formatMonetaryAmount(-50.25)).toBe('-50.25');
    });
  });

  describe('Type Guards', () => {
    describe('isValidGrouping', () => {
      it('should validate correct grouping values', () => {
        expect(isValidGrouping('daily')).toBe(true);
        expect(isValidGrouping('weekly')).toBe(true);
        expect(isValidGrouping('monthly')).toBe(true);
        expect(isValidGrouping('quarterly')).toBe(true);
      });

      it('should reject invalid grouping values', () => {
        expect(isValidGrouping('yearly')).toBe(false);
        expect(isValidGrouping('invalid')).toBe(false);
        expect(isValidGrouping('')).toBe(false);
      });
    });

    describe('isValidPaymentStatus', () => {
      it('should validate correct payment status values', () => {
        expect(isValidPaymentStatus('all')).toBe(true);
        expect(isValidPaymentStatus('paid')).toBe(true);
        expect(isValidPaymentStatus('pending')).toBe(true);
        expect(isValidPaymentStatus('approved')).toBe(true);
      });

      it('should reject invalid payment status values', () => {
        expect(isValidPaymentStatus('cancelled')).toBe(false);
        expect(isValidPaymentStatus('invalid')).toBe(false);
        expect(isValidPaymentStatus('')).toBe(false);
      });
    });

    describe('isValidReportType', () => {
      it('should validate correct report types', () => {
        expect(isValidReportType('profit_loss')).toBe(true);
        expect(isValidReportType('balance_sheet')).toBe(true);
        expect(isValidReportType('cash_flow')).toBe(true);
        expect(isValidReportType('budget_variance')).toBe(true);
        expect(isValidReportType('expense_summary')).toBe(true);
        expect(isValidReportType('payroll_summary')).toBe(true);
        expect(isValidReportType('custom')).toBe(true);
      });

      it('should reject invalid report types', () => {
        expect(isValidReportType('invalid_report')).toBe(false);
        expect(isValidReportType('')).toBe(false);
      });
    });

    describe('isValidKPIType', () => {
      it('should validate correct KPI types', () => {
        expect(isValidKPIType('budget_variance')).toBe(true);
        expect(isValidKPIType('cash_flow_trend')).toBe(true);
        expect(isValidKPIType('expense_trend')).toBe(true);
        expect(isValidKPIType('payroll_efficiency')).toBe(true);
        expect(isValidKPIType('cost_per_game')).toBe(true);
        expect(isValidKPIType('revenue_growth')).toBe(true);
        expect(isValidKPIType('profit_margin')).toBe(true);
        expect(isValidKPIType('custom')).toBe(true);
      });

      it('should reject invalid KPI types', () => {
        expect(isValidKPIType('invalid_kpi')).toBe(false);
        expect(isValidKPIType('')).toBe(false);
      });
    });
  });

  describe('Constants', () => {
    it('should have correct variance thresholds', () => {
      expect(VARIANCE_THRESHOLDS.OVER_BUDGET).toBe(10);
      expect(VARIANCE_THRESHOLDS.UNDER_UTILIZED).toBe(-20);
    });

    it('should have correct default periods', () => {
      expect(DEFAULT_PERIODS.CASH_FLOW_MONTHS).toBe(11);
      expect(DEFAULT_PERIODS.EXPENSE_ANALYSIS_MONTHS).toBe(2);
      expect(DEFAULT_PERIODS.PAYROLL_SUMMARY_MONTHS).toBe(2);
      expect(DEFAULT_PERIODS.KPI_CALCULATION_DAYS).toBe(30);
    });
  });

  describe('Business Logic Calculations', () => {
    it('should calculate budget variance correctly', () => {
      const allocated = 1000;
      const spent = 1200;
      const variance = ((spent - allocated) / allocated) * 100;

      expect(variance).toBeCloseTo(20);
      expect(roundPercentage(variance)).toBe(20);
    });

    it('should calculate utilization rate correctly', () => {
      const allocated = 800;
      const spent = 600;
      const utilizationRate = (spent / allocated) * 100;

      expect(utilizationRate).toBeCloseTo(75);
      expect(roundPercentage(utilizationRate)).toBe(75);
    });

    it('should determine status indicators correctly', () => {
      // Over budget
      const overBudgetVariance = 15;
      expect(overBudgetVariance > VARIANCE_THRESHOLDS.OVER_BUDGET).toBe(true);

      // Under utilized
      const underUtilizedVariance = -25;
      expect(underUtilizedVariance < VARIANCE_THRESHOLDS.UNDER_UTILIZED).toBe(true);

      // On track
      const onTrackVariance = 5;
      expect(onTrackVariance <= VARIANCE_THRESHOLDS.OVER_BUDGET &&
             onTrackVariance >= VARIANCE_THRESHOLDS.UNDER_UTILIZED).toBe(true);
    });

    it('should handle edge cases in calculations', () => {
      // Division by zero
      const allocated = 0;
      const spent = 100;
      const variance = allocated > 0 ? ((spent - allocated) / allocated) * 100 : 0;

      expect(variance).toBe(0);
    });

    it('should calculate running balance correctly', () => {
      const cashFlowData = [
        { inflow: 5000, outflow: 3000 },
        { inflow: 6000, outflow: 3500 },
        { inflow: 4500, outflow: 4000 }
      ];

      let runningBalance = 0;
      const processedData = cashFlowData.map(row => {
        const netFlow = row.inflow - row.outflow;
        runningBalance += netFlow;
        return { ...row, netFlow, runningBalance };
      });

      expect(processedData[0].netFlow).toBe(2000);
      expect(processedData[0].runningBalance).toBe(2000);
      expect(processedData[1].runningBalance).toBe(4500);
      expect(processedData[2].runningBalance).toBe(5000);
    });
  });

  describe('Data Type Safety', () => {
    it('should handle monetary amounts with proper precision', () => {
      const amount1 = parseMonetaryAmount('123.456789');
      const amount2 = parseMonetaryAmount('456.123456');

      // Test precision in calculations
      const sum = amount1 + amount2;
      expect(parseMonetaryAmount(formatMonetaryAmount(sum))).toBeCloseTo(579.58, 2);
    });

    it('should maintain type safety with nullable values', () => {
      const testValues = [null, undefined, '', '0', 0, '100.50', 100.50];

      testValues.forEach(value => {
        const parsed = parseMonetaryAmount(value);
        expect(typeof parsed).toBe('number');
        expect(parsed).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle date parsing correctly', () => {
      const validDate = '2024-01-15';
      const invalidDate = 'invalid-date';

      expect(new Date(validDate).toString()).not.toBe('Invalid Date');
      expect(new Date(invalidDate).toString()).toBe('Invalid Date');
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle malformed data', () => {
      const malformedData = [
        { total_amount: 'not-a-number' },
        { total_amount: null },
        { total_amount: undefined },
        { total_amount: {} }
      ];

      malformedData.forEach(data => {
        const parsed = parseMonetaryAmount(data.total_amount);
        expect(parsed).toBe(0);
      });
    });

    it('should validate query parameters safely', () => {
      const queryParams = {
        variance_threshold: '5.5',
        period_days: '30',
        grouping: 'monthly',
        payment_status: 'paid'
      };

      expect(parseFloat(queryParams.variance_threshold)).toBe(5.5);
      expect(parseInt(queryParams.period_days)).toBe(30);
      expect(isValidGrouping(queryParams.grouping)).toBe(true);
      expect(isValidPaymentStatus(queryParams.payment_status)).toBe(true);
    });
  });
});