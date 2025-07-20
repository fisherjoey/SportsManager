const { calculateFinalWage, getWageBreakdown } = require('../src/utils/wage-calculator');

describe('Wage Multiplier System', () => {
  describe('calculateFinalWage', () => {
    it('should calculate final wage with 1.0 multiplier', () => {
      const result = calculateFinalWage(40, 1.0);
      expect(result).toBe(40);
    });

    it('should calculate final wage with 1.5 multiplier', () => {
      const result = calculateFinalWage(40, 1.5);
      expect(result).toBe(60);
    });

    it('should calculate final wage with 0.5 multiplier', () => {
      const result = calculateFinalWage(40, 0.5);
      expect(result).toBe(20);
    });

    it('should handle decimal wages and multipliers', () => {
      const result = calculateFinalWage(25.50, 1.25);
      expect(result).toBe(31.88); // 25.50 * 1.25 = 31.875, rounded to 31.88
    });

    it('should return 0 for invalid referee wage', () => {
      expect(calculateFinalWage(0, 1.5)).toBe(0);
      expect(calculateFinalWage(null, 1.5)).toBe(0);
      expect(calculateFinalWage(-10, 1.5)).toBe(0);
    });

    it('should default to 1.0 multiplier for invalid multipliers', () => {
      expect(calculateFinalWage(40, 0)).toBe(40);
      expect(calculateFinalWage(40, null)).toBe(40);
      expect(calculateFinalWage(40, -1)).toBe(40);
    });

    it('should round to 2 decimal places', () => {
      const result = calculateFinalWage(33.33, 1.333);
      expect(result).toBe(44.43); // 33.33 * 1.333 = 44.43889, rounded to 44.43
    });
  });

  describe('getWageBreakdown', () => {
    it('should return breakdown with no multiplier', () => {
      const breakdown = getWageBreakdown(40, 1.0, '');
      
      expect(breakdown.baseWage).toBe(40);
      expect(breakdown.multiplier).toBe(1.0);
      expect(breakdown.finalWage).toBe(40);
      expect(breakdown.isMultiplied).toBe(false);
      expect(breakdown.calculation).toBe('$40');
      expect(breakdown.multiplierReason).toBe('');
    });

    it('should return breakdown with multiplier', () => {
      const breakdown = getWageBreakdown(40, 1.5, 'High-level playoff game');
      
      expect(breakdown.baseWage).toBe(40);
      expect(breakdown.multiplier).toBe(1.5);
      expect(breakdown.finalWage).toBe(60);
      expect(breakdown.isMultiplied).toBe(true);
      expect(breakdown.calculation).toBe('$40 × 1.5 = $60');
      expect(breakdown.multiplierReason).toBe('High-level playoff game');
    });

    it('should handle complex calculations', () => {
      const breakdown = getWageBreakdown(25.50, 1.25, 'Holiday game bonus');
      
      expect(breakdown.baseWage).toBe(25.50);
      expect(breakdown.multiplier).toBe(1.25);
      expect(breakdown.finalWage).toBe(31.88);
      expect(breakdown.isMultiplied).toBe(true);
      expect(breakdown.calculation).toBe('$25.5 × 1.25 = $31.88');
      expect(breakdown.multiplierReason).toBe('Holiday game bonus');
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle John making $40 with 1.5x multiplier (from user example)', () => {
      const finalWage = calculateFinalWage(40, 1.5);
      const breakdown = getWageBreakdown(40, 1.5, 'Playoff game');
      
      expect(finalWage).toBe(60);
      expect(breakdown.finalWage).toBe(60);
      expect(breakdown.calculation).toBe('$40 × 1.5 = $60');
    });

    it('should handle different referee levels with same multiplier', () => {
      const learningRefFinalWage = calculateFinalWage(25, 1.2); // Learning level
      const teachingRefFinalWage = calculateFinalWage(45, 1.2); // Teaching level
      
      expect(learningRefFinalWage).toBe(30);
      expect(teachingRefFinalWage).toBe(54);
    });

    it('should handle penalty/reduction multipliers', () => {
      const reducedWage = calculateFinalWage(40, 0.8); // 20% reduction
      expect(reducedWage).toBe(32);
    });

    it('should handle premium game multipliers', () => {
      const premiumWage = calculateFinalWage(45, 2.0); // Double pay
      expect(premiumWage).toBe(90);
    });
  });
});