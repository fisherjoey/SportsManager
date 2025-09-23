import {
  isValidTransactionType,
  isValidTransactionStatus,
  isValidStatusTransition,
  parseMonetaryAmount,
  calculateAvailableBudget,
  generateTransactionPrefix,
  validateTransactionData,
  validateVendorData,
  parseQueryParams
} from '../../types/financial-transactions';

describe('Financial Transactions Utility Functions', () => {
  describe('isValidTransactionType', () => {
    it('should validate correct transaction types', () => {
      expect(isValidTransactionType('expense')).toBe(true);
      expect(isValidTransactionType('revenue')).toBe(true);
      expect(isValidTransactionType('payroll')).toBe(true);
      expect(isValidTransactionType('transfer')).toBe(true);
      expect(isValidTransactionType('adjustment')).toBe(true);
      expect(isValidTransactionType('refund')).toBe(true);
    });

    it('should reject invalid transaction types', () => {
      expect(isValidTransactionType('invalid')).toBe(false);
      expect(isValidTransactionType('')).toBe(false);
      expect(isValidTransactionType('EXPENSE')).toBe(false);
    });
  });

  describe('isValidTransactionStatus', () => {
    it('should validate correct transaction statuses', () => {
      expect(isValidTransactionStatus('draft')).toBe(true);
      expect(isValidTransactionStatus('pending_approval')).toBe(true);
      expect(isValidTransactionStatus('approved')).toBe(true);
      expect(isValidTransactionStatus('posted')).toBe(true);
      expect(isValidTransactionStatus('cancelled')).toBe(true);
      expect(isValidTransactionStatus('voided')).toBe(true);
    });

    it('should reject invalid transaction statuses', () => {
      expect(isValidTransactionStatus('invalid')).toBe(false);
      expect(isValidTransactionStatus('')).toBe(false);
      expect(isValidTransactionStatus('DRAFT')).toBe(false);
    });
  });

  describe('isValidStatusTransition', () => {
    it('should allow valid status transitions', () => {
      expect(isValidStatusTransition('draft', 'pending_approval')).toBe(true);
      expect(isValidStatusTransition('draft', 'cancelled')).toBe(true);
      expect(isValidStatusTransition('pending_approval', 'approved')).toBe(true);
      expect(isValidStatusTransition('pending_approval', 'cancelled')).toBe(true);
      expect(isValidStatusTransition('approved', 'posted')).toBe(true);
      expect(isValidStatusTransition('approved', 'cancelled')).toBe(true);
      expect(isValidStatusTransition('posted', 'voided')).toBe(true);
    });

    it('should reject invalid status transitions', () => {
      expect(isValidStatusTransition('posted', 'approved')).toBe(false);
      expect(isValidStatusTransition('cancelled', 'draft')).toBe(false);
      expect(isValidStatusTransition('voided', 'posted')).toBe(false);
      expect(isValidStatusTransition('draft', 'posted')).toBe(false);
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
      expect(parseMonetaryAmount({})).toBe(0);
    });
  });

  describe('calculateAvailableBudget', () => {
    it('should calculate available budget correctly', () => {
      const budget = {
        id: 1,
        organization_id: 1,
        budget_period_id: 1,
        category_id: 1,
        name: 'Test Budget',
        allocated_amount: 1000,
        actual_spent: 200,
        committed_amount: 150,
        reserved_amount: 50
      };

      expect(calculateAvailableBudget(budget)).toBe(600);
    });

    it('should handle string amounts', () => {
      const budget = {
        id: 1,
        organization_id: 1,
        budget_period_id: 1,
        category_id: 1,
        name: 'Test Budget',
        allocated_amount: '1000.00',
        actual_spent: '200.50',
        committed_amount: '150.25',
        reserved_amount: '50.00'
      };

      expect(calculateAvailableBudget(budget)).toBe(599.25);
    });
  });

  describe('generateTransactionPrefix', () => {
    it('should generate correct prefixes', () => {
      expect(generateTransactionPrefix('expense')).toBe('EXP');
      expect(generateTransactionPrefix('revenue')).toBe('REV');
      expect(generateTransactionPrefix('payroll')).toBe('PAY');
      expect(generateTransactionPrefix('transfer')).toBe('TRF');
      expect(generateTransactionPrefix('adjustment')).toBe('ADJ');
      expect(generateTransactionPrefix('refund')).toBe('REF');
    });

    it('should return default prefix for unknown types', () => {
      expect(generateTransactionPrefix('unknown')).toBe('TXN');
      expect(generateTransactionPrefix('')).toBe('TXN');
    });
  });

  describe('validateTransactionData', () => {
    const validTransactionData = {
      transaction_type: 'expense' as const,
      amount: 100.50,
      description: 'Test transaction',
      transaction_date: '2024-01-15'
    };

    it('should pass validation for valid data', () => {
      const errors = validateTransactionData(validTransactionData);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation for invalid transaction type', () => {
      const invalidData = {
        ...validTransactionData,
        transaction_type: 'invalid' as any
      };
      const errors = validateTransactionData(invalidData);
      expect(errors).toContain('Invalid transaction type');
    });

    it('should fail validation for invalid amount', () => {
      const invalidData = {
        ...validTransactionData,
        amount: -100
      };
      const errors = validateTransactionData(invalidData);
      expect(errors).toContain('Amount must be greater than 0');
    });

    it('should fail validation for empty description', () => {
      const invalidData = {
        ...validTransactionData,
        description: ''
      };
      const errors = validateTransactionData(invalidData);
      expect(errors).toContain('Description is required');
    });

    it('should fail validation for missing transaction date', () => {
      const invalidData = {
        ...validTransactionData,
        transaction_date: undefined as any
      };
      const errors = validateTransactionData(invalidData);
      expect(errors).toContain('Transaction date is required');
    });

    it('should fail validation for invalid UUID format', () => {
      const invalidData = {
        ...validTransactionData,
        budget_id: 'invalid-uuid'
      };
      const errors = validateTransactionData(invalidData);
      expect(errors).toContain('Invalid budget ID format');
    });
  });

  describe('validateVendorData', () => {
    const validVendorData = {
      name: 'Test Vendor',
      contact_name: 'John Doe',
      email: 'john@vendor.com',
      phone: '555-1234'
    };

    it('should pass validation for valid data', () => {
      const errors = validateVendorData(validVendorData);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation for empty name', () => {
      const invalidData = {
        ...validVendorData,
        name: ''
      };
      const errors = validateVendorData(invalidData);
      expect(errors).toContain('Vendor name is required');
    });

    it('should fail validation for invalid email', () => {
      const invalidData = {
        ...validVendorData,
        email: 'invalid-email'
      };
      const errors = validateVendorData(invalidData);
      expect(errors).toContain('Invalid email format');
    });

    it('should fail validation for name too long', () => {
      const invalidData = {
        ...validVendorData,
        name: 'a'.repeat(201)
      };
      const errors = validateVendorData(invalidData);
      expect(errors).toContain('Vendor name cannot exceed 200 characters');
    });
  });

  describe('parseQueryParams', () => {
    it('should parse valid query parameters', () => {
      const query = {
        page: '2',
        limit: '50',
        transaction_type: 'expense',
        status: 'posted',
        date_from: '2024-01-01',
        search: 'test'
      };

      const result = parseQueryParams(query);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.filters.transaction_type).toBe('expense');
      expect(result.filters.status).toBe('posted');
      expect(result.filters.date_from).toBeInstanceOf(Date);
      expect(result.filters.search).toBe('test');
    });

    it('should handle invalid parameters gracefully', () => {
      const query = {
        page: 'invalid',
        limit: '0',
        transaction_type: 'invalid',
        status: 'invalid',
        date_from: 'invalid-date',
        min_amount: 'invalid'
      };

      const result = parseQueryParams(query);

      expect(result.page).toBe(1); // Default
      expect(result.limit).toBe(20); // Default when invalid
      expect(result.filters.transaction_type).toBeUndefined();
      expect(result.filters.status).toBeUndefined();
      expect(result.filters.date_from).toBeUndefined();
      expect(result.filters.min_amount).toBeUndefined();
    });

    it('should enforce limits', () => {
      const query = {
        page: '0',
        limit: '1000'
      };

      const result = parseQueryParams(query);

      expect(result.page).toBe(1); // Minimum page
      expect(result.limit).toBe(100); // Maximum limit
    });
  });
});