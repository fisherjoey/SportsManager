// @ts-nocheck

import { calculateFinalWage, getWageBreakdown  } from './wage-calculator';

describe('Wage Calculator', () => {
  describe('calculateFinalWage', () => {
    describe('INDIVIDUAL payment model', () => {
      test('should calculate wage with no multiplier', () => {
        const result = calculateFinalWage(50, 1.0, 'INDIVIDUAL');
        expect(result).toBe(50);
      });

      test('should calculate wage with multiplier', () => {
        const result = calculateFinalWage(50, 1.5, 'INDIVIDUAL');
        expect(result).toBe(75);
      });

      test('should handle zero wage', () => {
        const result = calculateFinalWage(0, 1.5, 'INDIVIDUAL');
        expect(result).toBe(0);
      });

      test('should handle negative wage', () => {
        const result = calculateFinalWage(-10, 1.5, 'INDIVIDUAL');
        expect(result).toBe(0);
      });

      test('should handle zero multiplier', () => {
        const result = calculateFinalWage(50, 0, 'INDIVIDUAL');
        expect(result).toBe(50); // Should default to 1.0
      });

      test('should round to 2 decimal places', () => {
        const result = calculateFinalWage(33.333, 1.5, 'INDIVIDUAL');
        expect(result).toBe(50);
      });
    });

    describe('FLAT_RATE payment model', () => {
      test('should divide game rate by number of referees', () => {
        const result = calculateFinalWage(50, 1.5, 'FLAT_RATE', 150, 3);
        expect(result).toBe(50); // 150 / 3 = 50
      });

      test('should handle single referee', () => {
        const result = calculateFinalWage(50, 1.5, 'FLAT_RATE', 150, 1);
        expect(result).toBe(150);
      });

      test('should handle zero default game rate', () => {
        const result = calculateFinalWage(50, 1.5, 'FLAT_RATE', 0, 2);
        expect(result).toBe(0);
      });

      test('should handle zero referees count', () => {
        const result = calculateFinalWage(50, 1.5, 'FLAT_RATE', 150, 0);
        expect(result).toBe(0);
      });

      test('should round to 2 decimal places', () => {
        const result = calculateFinalWage(50, 1.5, 'FLAT_RATE', 100, 3);
        expect(result).toBe(33.33); // 100 / 3 = 33.333...
      });

      test('should ignore referee wage and multiplier in flat rate mode', () => {
        const result = calculateFinalWage(999, 999, 'FLAT_RATE', 150, 2);
        expect(result).toBe(75); // Should only use 150 / 2
      });
    });
  });

  describe('getWageBreakdown', () => {
    describe('INDIVIDUAL payment model', () => {
      test('should return correct breakdown without multiplier', () => {
        const result = getWageBreakdown(50, 1.0, '', 'INDIVIDUAL');
        
        expect(result).toEqual({
          baseWage: 50,
          multiplier: 1.0,
          multiplierReason: '',
          finalWage: 50,
          isMultiplied: false,
          calculation: '$50',
          paymentModel: 'INDIVIDUAL'
        });
      });

      test('should return correct breakdown with multiplier', () => {
        const result = getWageBreakdown(50, 1.5, 'playoff game', 'INDIVIDUAL');
        
        expect(result).toEqual({
          baseWage: 50,
          multiplier: 1.5,
          multiplierReason: 'playoff game',
          finalWage: 75,
          isMultiplied: true,
          calculation: '$50 × 1.5 = $75',
          paymentModel: 'INDIVIDUAL'
        });
      });
    });

    describe('FLAT_RATE payment model', () => {
      test('should return correct breakdown for single referee', () => {
        const result = getWageBreakdown(50, 1.5, 'ignored', 'FLAT_RATE', 150, 1);
        
        expect(result).toEqual({
          baseWage: 150,
          multiplier: 1,
          multiplierReason: '',
          finalWage: 150,
          isMultiplied: false,
          calculation: '$150',
          paymentModel: 'FLAT_RATE',
          assignedRefereesCount: 1
        });
      });

      test('should return correct breakdown for multiple referees', () => {
        const result = getWageBreakdown(50, 1.5, 'ignored', 'FLAT_RATE', 150, 3);
        
        expect(result).toEqual({
          baseWage: 150,
          multiplier: 1,
          multiplierReason: '',
          finalWage: 50,
          isMultiplied: false,
          calculation: '$150 ÷ 3 referees = $50',
          paymentModel: 'FLAT_RATE',
          assignedRefereesCount: 3
        });
      });
    });

    test('should default to INDIVIDUAL model when not specified', () => {
      const result = getWageBreakdown(50, 1.0);
      expect(result.paymentModel).toBe('INDIVIDUAL');
    });
  });
});