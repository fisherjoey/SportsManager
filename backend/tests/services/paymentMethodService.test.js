const PaymentMethodService = require('../../src/services/paymentMethodService');
const db = require('../../src/config/database');

describe('Payment Method Service', () => {
  let testUser, adminUser;
  let testPaymentMethods;
  let paymentMethodService;

  beforeAll(async () => {
    paymentMethodService = new PaymentMethodService();

    // Create test users
    const [user] = await db('users').insert({
      email: 'user@example.com',
      password_hash: 'hashed',
      role: 'referee',
      first_name: 'Test',
      last_name: 'User'
    }).returning('*');

    const [admin] = await db('users').insert({
      email: 'admin@example.com',
      password_hash: 'hashed',
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User'
    }).returning('*');

    testUser = user;
    adminUser = admin;

    // Create test payment methods
    const paymentMethods = await Promise.all([
      db('payment_methods').insert({
        organization_id: user.id,
        name: 'Personal Reimbursement',
        type: 'person_reimbursement',
        is_active: true,
        requires_approval: true,
        auto_approval_limit: 100.00,
        spending_limit: 1000.00,
        required_fields: JSON.stringify(['receipt', 'business_purpose']),
        allowed_categories: JSON.stringify(['office_supplies', 'travel']),
        created_by: admin.id,
        updated_by: admin.id
      }).returning('*'),
      db('payment_methods').insert({
        organization_id: user.id,
        name: 'Company Credit Card',
        type: 'credit_card',
        is_active: true,
        requires_approval: false,
        auto_approval_limit: 500.00,
        spending_limit: 5000.00,
        required_fields: JSON.stringify(['receipt']),
        allowed_categories: JSON.stringify(['travel', 'food', 'supplies']),
        created_by: admin.id,
        updated_by: admin.id
      }).returning('*'),
      db('payment_methods').insert({
        organization_id: user.id,
        name: 'Purchase Order',
        type: 'purchase_order',
        is_active: true,
        requires_approval: true,
        requires_purchase_order: true,
        spending_limit: null,
        required_fields: JSON.stringify(['purchase_order_id', 'receipt']),
        allowed_categories: JSON.stringify(['equipment', 'supplies']),
        created_by: admin.id,
        updated_by: admin.id
      }).returning('*'),
      db('payment_methods').insert({
        organization_id: user.id,
        name: 'Inactive Method',
        type: 'direct_vendor',
        is_active: false,
        requires_approval: true,
        created_by: admin.id,
        updated_by: admin.id
      }).returning('*')
    ]);

    testPaymentMethods = {
      reimbursement: paymentMethods[0][0],
      creditCard: paymentMethods[1][0],
      purchaseOrder: paymentMethods[2][0],
      inactive: paymentMethods[3][0]
    };
  });

  afterAll(async () => {
    // Clean up test data
    await db('payment_methods').where('organization_id', testUser.id).del();
    await db('users').whereIn('id', [testUser.id, adminUser.id]).del();
  });

  describe('getAvailablePaymentMethods', () => {
    test('should return active payment methods for organization', async () => {
      const methods = await paymentMethodService.getAvailablePaymentMethods(testUser.id);

      expect(methods).toHaveLength(3); // Excludes inactive method
      expect(methods.every(m => m.is_active)).toBe(true);
      expect(methods.every(m => m.organization_id === testUser.id)).toBe(true);
      
      // Check JSON fields are properly parsed
      expect(methods[0].required_fields).toBeInstanceOf(Array);
      expect(methods[0].allowed_categories).toBeInstanceOf(Array);
    });

    test('should filter by payment method type', async () => {
      const methods = await paymentMethodService.getAvailablePaymentMethods(
        testUser.id, 
        { type: 'credit_card' }
      );

      expect(methods).toHaveLength(1);
      expect(methods[0].type).toBe('credit_card');
      expect(methods[0].name).toBe('Company Credit Card');
    });

    test('should filter by approval requirement', async () => {
      const methods = await paymentMethodService.getAvailablePaymentMethods(
        testUser.id,
        { requiresApproval: false }
      );

      expect(methods).toHaveLength(1);
      expect(methods[0].requires_approval).toBe(false);
      expect(methods[0].type).toBe('credit_card');
    });

    test('should filter by spending limit', async () => {
      const methods = await paymentMethodService.getAvailablePaymentMethods(
        testUser.id,
        { maxAmount: 2000 }
      );

      // Should include credit card (5000 limit) and purchase order (no limit)
      expect(methods).toHaveLength(2);
      expect(methods.some(m => m.type === 'credit_card')).toBe(true);
      expect(methods.some(m => m.type === 'purchase_order')).toBe(true);
    });

    test('should return empty array for non-existent organization', async () => {
      const methods = await paymentMethodService.getAvailablePaymentMethods('non-existent-id');

      expect(methods).toHaveLength(0);
    });

    test('should handle malformed JSON gracefully', async () => {
      // Insert method with malformed JSON
      await db.raw(`
        INSERT INTO payment_methods (
          organization_id, name, type, is_active, required_fields, 
          allowed_categories, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testUser.id, 'Malformed JSON Method', 'person_reimbursement', true,
        'invalid json', 'invalid json', adminUser.id, adminUser.id
      ]);

      const methods = await paymentMethodService.getAvailablePaymentMethods(testUser.id);

      // Should still work, with fallback values
      const malformedMethod = methods.find(m => m.name === 'Malformed JSON Method');
      expect(malformedMethod.required_fields).toEqual([]);
      expect(malformedMethod.allowed_categories).toEqual([]);

      // Clean up
      await db('payment_methods').where('name', 'Malformed JSON Method').del();
    });
  });

  describe('detectPaymentMethod', () => {
    const sampleReceiptData = {
      vendor_name: 'Office Depot',
      total_amount: 125.50,
      category_id: 'office_supplies',
      raw_ocr_text: 'OFFICE DEPOT receipt for office supplies and stationery'
    };

    test('should detect appropriate payment method based on vendor and amount', async () => {
      const suggestions = await paymentMethodService.detectPaymentMethod(
        sampleReceiptData,
        testUser
      );

      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].score).toBeGreaterThan(0);
      expect(suggestions[0].confidence).toBeGreaterThan(0);
      expect(suggestions[0].paymentMethod).toHaveProperty('id');
      expect(suggestions[0].paymentMethod).toHaveProperty('name');
      expect(suggestions[0].reasons).toBeInstanceOf(Array);
      expect(suggestions[0].metadata.detectionMethod).toBe('auto');
    });

    test('should prefer credit card for travel expenses', async () => {
      const travelReceiptData = {
        vendor_name: 'Delta Airlines',
        total_amount: 450.00,
        category_id: 'travel',
        raw_ocr_text: 'DELTA AIR LINES boarding pass and travel receipt'
      };

      const suggestions = await paymentMethodService.detectPaymentMethod(
        travelReceiptData,
        testUser
      );

      // Credit card should be high-scoring for travel
      const creditCardSuggestion = suggestions.find(
        s => s.paymentMethod.type === 'credit_card'
      );
      expect(creditCardSuggestion).toBeDefined();
      expect(creditCardSuggestion.confidence).toBeGreaterThan(0.5);
    });

    test('should suggest purchase order for high-value equipment', async () => {
      const equipmentReceiptData = {
        vendor_name: 'Tech Solutions Inc',
        total_amount: 2500.00,
        category_id: 'equipment',
        raw_ocr_text: 'INVOICE for computer equipment purchase order PO-2024-001'
      };

      const suggestions = await paymentMethodService.detectPaymentMethod(
        equipmentReceiptData,
        testUser
      );

      const poSuggestion = suggestions.find(
        s => s.paymentMethod.type === 'purchase_order'
      );
      expect(poSuggestion).toBeDefined();
      expect(poSuggestion.confidence).toBeGreaterThan(0.3);
    });

    test('should prioritize auto-approval eligible methods for small amounts', async () => {
      const smallExpenseData = {
        vendor_name: 'Coffee Shop',
        total_amount: 15.50,
        category_id: 'food',
        raw_ocr_text: 'Coffee and snacks receipt'
      };

      const suggestions = await paymentMethodService.detectPaymentMethod(
        smallExpenseData,
        testUser
      );

      // Methods with auto-approval should get bonus points
      const autoApprovalSuggestions = suggestions.filter(
        s => s.paymentMethod.autoApprovalLimit >= 15.50
      );
      expect(autoApprovalSuggestions.length).toBeGreaterThan(0);
      expect(autoApprovalSuggestions[0].reasons).toContain(
        expect.stringMatching(/auto-approval/i)
      );
    });

    test('should handle urgent expenses appropriately', async () => {
      const urgentExpenseData = {
        vendor_name: 'Emergency Repair Service',
        total_amount: 300.00,
        category_id: 'maintenance',
        raw_ocr_text: 'Emergency repair service invoice'
      };

      const suggestions = await paymentMethodService.detectPaymentMethod(
        urgentExpenseData,
        testUser,
        { urgency: 'urgent' }
      );

      // Should prefer fast payment methods for urgent expenses
      const fastMethods = suggestions.filter(
        s => s.paymentMethod.type === 'credit_card' || s.paymentMethod.autoApprovalLimit >= 300
      );
      expect(fastMethods.length).toBeGreaterThan(0);
    });

    test('should return empty array when no payment methods available', async () => {
      // Create user with no payment methods
      const [userWithoutMethods] = await db('users').insert({
        email: 'nomethods@example.com',
        password_hash: 'hashed',
        role: 'referee'
      }).returning('*');

      const suggestions = await paymentMethodService.detectPaymentMethod(
        sampleReceiptData,
        userWithoutMethods
      );

      expect(suggestions).toHaveLength(0);

      // Clean up
      await db('users').where('id', userWithoutMethods.id).del();
    });

    test('should apply spending limit warnings', async () => {
      const highAmountExpense = {
        vendor_name: 'Expensive Vendor',
        total_amount: 6000.00, // Exceeds credit card limit of 5000
        category_id: 'equipment',
        raw_ocr_text: 'High value purchase'
      };

      const suggestions = await paymentMethodService.detectPaymentMethod(
        highAmountExpense,
        testUser
      );

      const creditCardSuggestion = suggestions.find(
        s => s.paymentMethod.type === 'credit_card'
      );
      
      if (creditCardSuggestion) {
        expect(creditCardSuggestion.warnings).toContain(
          expect.stringMatching(/exceeds spending limit/i)
        );
      }
    });
  });

  describe('calculatePaymentMethodScore', () => {
    test('should calculate base score for payment method type', async () => {
      const method = testPaymentMethods.reimbursement;
      const receiptData = {
        vendor_name: 'Test Vendor',
        total_amount: 50.00,
        category_id: 'office_supplies'
      };

      const score = await paymentMethodService.calculatePaymentMethodScore(
        method,
        receiptData,
        testUser,
        { vendorName: 'test vendor', amount: 50, category: 'office_supplies', ocrText: '' }
      );

      expect(score.total).toBeGreaterThan(0);
      expect(score.reasons).toContain('Base score for person_reimbursement');
    });

    test('should add keyword matching scores', async () => {
      const method = testPaymentMethods.creditCard;
      const receiptData = {
        vendor_name: 'Visa Payment',
        total_amount: 100.00,
        raw_ocr_text: 'Credit card payment for business expense'
      };

      const score = await paymentMethodService.calculatePaymentMethodScore(
        method,
        receiptData,
        testUser,
        { 
          vendorName: 'visa payment', 
          amount: 100, 
          ocrText: 'credit card payment for business expense' 
        }
      );

      expect(score.total).toBeGreaterThan(10); // Base score + keyword bonus
      expect(score.reasons.some(r => r.includes('Keyword match'))).toBe(true);
    });

    test('should penalize for exceeding spending limits', async () => {
      const method = testPaymentMethods.reimbursement; // Has 1000 limit
      const receiptData = {
        vendor_name: 'Expensive Vendor',
        total_amount: 1500.00 // Exceeds limit
      };

      const score = await paymentMethodService.calculatePaymentMethodScore(
        method,
        receiptData,
        testUser,
        { vendorName: 'expensive vendor', amount: 1500, ocrText: '' }
      );

      expect(score.warnings).toContain(
        expect.stringMatching(/exceeds spending limit/i)
      );
      expect(score.total).toBeLessThan(0); // Heavy penalty applied
    });

    test('should add auto-approval bonus', async () => {
      const method = testPaymentMethods.creditCard; // Has 500 auto-approval limit
      const receiptData = {
        vendor_name: 'Small Vendor',
        total_amount: 75.00 // Under auto-approval limit
      };

      const score = await paymentMethodService.calculatePaymentMethodScore(
        method,
        receiptData,
        testUser,
        { vendorName: 'small vendor', amount: 75, ocrText: '' }
      );

      expect(score.reasons.some(r => r.includes('auto-approval'))).toBe(true);
      expect(score.total).toBeGreaterThan(20); // Should include auto-approval bonus
    });
  });

  describe('validatePaymentMethodSelection', () => {
    test('should validate successful payment method selection', async () => {
      const validation = await paymentMethodService.validatePaymentMethodSelection(
        testPaymentMethods.reimbursement.id,
        {
          user_id: testUser.id,
          total_amount: 150.00,
          category_id: 'office_supplies'
        },
        testUser
      );

      expect(validation.isValid).toBe(true);
      expect(validation.paymentMethod).toBeDefined();
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject inactive payment method', async () => {
      const validation = await paymentMethodService.validatePaymentMethodSelection(
        testPaymentMethods.inactive.id,
        {
          user_id: testUser.id,
          total_amount: 100.00
        },
        testUser
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Payment method is not active');
    });

    test('should validate spending limits', async () => {
      const validation = await paymentMethodService.validatePaymentMethodSelection(
        testPaymentMethods.reimbursement.id,
        {
          user_id: testUser.id,
          total_amount: 1500.00 // Exceeds 1000 limit
        },
        testUser
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringMatching(/exceeds spending limit/i)
      );
    });

    test('should validate category restrictions', async () => {
      const validation = await paymentMethodService.validatePaymentMethodSelection(
        testPaymentMethods.reimbursement.id,
        {
          user_id: testUser.id,
          total_amount: 100.00,
          category_id: 'equipment' // Not in allowed categories
        },
        testUser
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringMatching(/not allowed for this category/i)
      );
    });

    test('should validate required fields', async () => {
      const validation = await paymentMethodService.validatePaymentMethodSelection(
        testPaymentMethods.purchaseOrder.id,
        {
          user_id: testUser.id,
          total_amount: 500.00
          // Missing purchase_order_id which is required
        },
        testUser,
        {} // Empty provided fields
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringMatching(/purchase_order_id.*required/i)
      );
    });

    test('should reject non-existent payment method', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const validation = await paymentMethodService.validatePaymentMethodSelection(
        fakeId,
        {
          user_id: testUser.id,
          total_amount: 100.00
        },
        testUser
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Payment method not found');
    });
  });

  describe('User authorization and restrictions', () => {
    test('should allow admin access to all payment methods', async () => {
      const restrictedMethod = await db('payment_methods').insert({
        organization_id: testUser.id,
        name: 'Admin Only Method',
        type: 'direct_vendor',
        is_active: true,
        user_restrictions: JSON.stringify({
          allowedRoles: ['admin'],
          allowedUsers: []
        }),
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      const validation = await paymentMethodService.validatePaymentMethodSelection(
        restrictedMethod[0].id,
        {
          user_id: testUser.id,
          total_amount: 100.00
        },
        adminUser // Admin user
      );

      expect(validation.isValid).toBe(true);

      // Clean up
      await db('payment_methods').where('id', restrictedMethod[0].id).del();
    });

    test('should restrict access based on user restrictions', async () => {
      const restrictedMethod = await db('payment_methods').insert({
        organization_id: testUser.id,
        name: 'Restricted Method',
        type: 'direct_vendor',
        is_active: true,
        user_restrictions: JSON.stringify({
          allowedRoles: ['admin'],
          allowedUsers: [adminUser.id]
        }),
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning('*');

      const validation = await paymentMethodService.validatePaymentMethodSelection(
        restrictedMethod[0].id,
        {
          user_id: testUser.id,
          total_amount: 100.00
        },
        testUser // Non-admin user
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringMatching(/not authorized/i)
      );

      // Clean up
      await db('payment_methods').where('id', restrictedMethod[0].id).del();
    });
  });

  describe('Keyword detection and scoring', () => {
    test('should calculate keyword scores correctly', async () => {
      const keywordScore = paymentMethodService.calculateKeywordScore(
        'credit_card',
        'visa payment',
        'credit card transaction for business',
        ['visa', 'credit', 'card']
      );

      expect(keywordScore.score).toBeGreaterThan(0);
      expect(keywordScore.matchedKeywords).toContain('visa');
      expect(keywordScore.matchedKeywords).toContain('credit');
    });

    test('should handle empty or null input gracefully', async () => {
      const keywordScore = paymentMethodService.calculateKeywordScore(
        'credit_card',
        null,
        '',
        ['visa', 'credit']
      );

      expect(keywordScore.score).toBe(0);
      expect(keywordScore.matchedKeywords).toHaveLength(0);
    });
  });

  describe('Amount-based scoring', () => {
    test('should score within optimal range highly', async () => {
      const method = testPaymentMethods.creditCard;
      const detectionRule = paymentMethodService.DETECTION_RULES['credit_card'];

      const amountScore = paymentMethodService.calculateAmountScore(
        250, // Within optimal range
        method,
        detectionRule
      );

      expect(amountScore.score).toBeGreaterThan(0);
      expect(amountScore.reason).toBeDefined();
    });

    test('should penalize amounts outside optimal range', async () => {
      const method = testPaymentMethods.creditCard;
      const detectionRule = paymentMethodService.DETECTION_RULES['credit_card'];

      const amountScore = paymentMethodService.calculateAmountScore(
        10000, // Way above typical range
        method,
        detectionRule
      );

      expect(amountScore.score).toBeLessThanOrEqual(0);
      expect(amountScore.warning).toBeDefined();
    });
  });

  describe('Time-based scoring', () => {
    test('should calculate time-based scores', async () => {
      const method = testPaymentMethods.creditCard;

      const timeScore = paymentMethodService.calculateTimeBasedScore(method);

      expect(timeScore).toHaveProperty('score');
      expect(timeScore.score).toBeGreaterThanOrEqual(0);
      if (timeScore.score > 0) {
        expect(timeScore.reason).toBeDefined();
      }
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle malformed payment method data', async () => {
      const malformedMethod = {
        id: 'test-id',
        name: 'Malformed Method',
        type: 'invalid_type',
        required_fields: 'invalid json',
        allowed_categories: null
      };

      // Should not throw error
      await expect(
        paymentMethodService.calculatePaymentMethodScore(
          malformedMethod,
          { total_amount: 100 },
          testUser,
          { vendorName: 'test', amount: 100, ocrText: '' }
        )
      ).resolves.toBeDefined();
    });

    test('should handle null/undefined receipt data', async () => {
      const suggestions = await paymentMethodService.detectPaymentMethod(
        {}, // Empty receipt data
        testUser
      );

      expect(suggestions).toBeInstanceOf(Array);
      // Should still return suggestions based on available methods
    });

    test('should handle extremely large datasets', async () => {
      // Create many payment methods
      const manyMethods = Array(20).fill().map((_, i) => ({
        organization_id: testUser.id,
        name: `Method ${i}`,
        type: 'person_reimbursement',
        is_active: true,
        created_by: adminUser.id,
        updated_by: adminUser.id
      }));

      await db('payment_methods').insert(manyMethods);

      const suggestions = await paymentMethodService.detectPaymentMethod(
        { vendor_name: 'Test', total_amount: 100 },
        testUser
      );

      // Should limit to top 5 suggestions
      expect(suggestions.length).toBeLessThanOrEqual(5);

      // Clean up
      await db('payment_methods')
        .where('organization_id', testUser.id)
        .where('name', 'like', 'Method %')
        .del();
    });
  });

  describe('Helper methods', () => {
    test('should safely parse JSON', () => {
      expect(paymentMethodService.safeJsonParse('{"key": "value"}', {})).toEqual({ key: 'value' });
      expect(paymentMethodService.safeJsonParse('invalid json', {})).toEqual({});
      expect(paymentMethodService.safeJsonParse(null, [])).toEqual([]);
      expect(paymentMethodService.safeJsonParse(undefined, 'default')).toBe('default');
    });

    test('should check if payment method is accessible to user', () => {
      const method = {
        user_restrictions: JSON.stringify({
          allowedRoles: ['admin'],
          allowedUsers: [testUser.id]
        })
      };

      expect(paymentMethodService.isPaymentMethodAccessible(method, adminUser)).toBe(true);
      expect(paymentMethodService.isPaymentMethodAccessible(method, testUser)).toBe(true);
      
      const restrictedUser = { id: 'other-id', role: 'referee' };
      expect(paymentMethodService.isPaymentMethodAccessible(method, restrictedUser)).toBe(false);
    });

    test('should validate required fields', () => {
      const requiredFields = ['receipt', 'business_purpose', 'project_code'];
      const providedFields = { receipt: 'file.jpg', business_purpose: 'Meeting' };

      const validation = paymentMethodService.validateRequiredFields(requiredFields, providedFields);

      expect(validation.isValid).toBe(false);
      expect(validation.missingFields).toContain('project_code');
    });
  });
});