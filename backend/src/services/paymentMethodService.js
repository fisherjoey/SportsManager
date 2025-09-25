const db = require('../config/database');

/**
 * Payment Method Service
 * 
 * Handles payment method selection logic, auto-detection from receipt data,
 * validation and restrictions, and integration with approval workflows.
 */
class PaymentMethodService {
  constructor() {
    // Default detection rules for payment methods
    this.DETECTION_RULES = {
      'person_reimbursement': {
        keywords: ['personal', 'reimbursement', 'out of pocket', 'employee'],
        defaultScore: 10,
        categories: [], // No category restrictions
        amountRange: { min: 0, max: 1000 }
      },
      'credit_card': {
        keywords: ['card', 'visa', 'mastercard', 'amex', 'american express', 'credit'],
        defaultScore: 8,
        categories: ['travel', 'food', 'supplies'],
        amountRange: { min: 0, max: 5000 }
      },
      'purchase_order': {
        keywords: ['po', 'purchase order', 'vendor', 'supplier', 'invoice'],
        defaultScore: 6,
        categories: ['equipment', 'supplies', 'services'],
        amountRange: { min: 100, max: null }
      },
      'direct_vendor': {
        keywords: ['direct', 'vendor payment', 'supplier payment', 'bill'],
        defaultScore: 5,
        categories: ['services', 'utilities', 'maintenance'],
        amountRange: { min: 50, max: null }
      }
    };
  }

  /**
   * Get available payment methods for an organization
   * @param {string} organizationId - The organization ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Available payment methods
   */
  async getAvailablePaymentMethods(organizationId, filters = {}) {
    let query = db('payment_methods')
      .where('organization_id', organizationId)
      .where('is_active', true);

    if (filters.type) {
      query = query.where('type', filters.type);
    }

    if (filters.requiresApproval !== undefined) {
      query = query.where('requires_approval', filters.requiresApproval);
    }

    if (filters.maxAmount) {
      query = query.where(function() {
        this.where('spending_limit', '>=', filters.maxAmount)
          .orWhereNull('spending_limit');
      });
    }

    const paymentMethods = await query
      .select('*')
      .orderBy('name');

    // Parse JSON fields safely
    return paymentMethods.map(method => ({
      ...method,
      approval_workflow: this.safeJsonParse(method.approval_workflow, null),
      required_fields: this.safeJsonParse(method.required_fields, []),
      integration_config: this.safeJsonParse(method.integration_config, {}),
      allowed_categories: this.safeJsonParse(method.allowed_categories, []),
      user_restrictions: this.safeJsonParse(method.user_restrictions, {})
    }));
  }

  /**
   * Auto-detect best payment method from receipt data
   * @param {Object} receiptData - The processed receipt data
   * @param {Object} user - The user submitting the expense
   * @param {Object} context - Additional context for detection
   * @returns {Promise<Array>} Sorted array of payment method suggestions
   */
  async detectPaymentMethod(receiptData, user, context = {}) {
    const organizationId = user.organization_id || user.id;
    const amount = parseFloat(receiptData.total_amount || 0);
    const vendorName = (receiptData.vendor_name || '').toLowerCase();
    const category = receiptData.category_id;
    const ocrText = (receiptData.raw_ocr_text || '').toLowerCase();

    console.log(`Detecting payment method for: vendor=${vendorName}, amount=$${amount}, category=${category}`);

    // Get available payment methods
    const availableMethods = await this.getAvailablePaymentMethods(organizationId);
    
    if (availableMethods.length === 0) {
      console.log('No payment methods available for organization');
      return [];
    }

    const suggestions = [];

    for (const method of availableMethods) {
      const score = await this.calculatePaymentMethodScore(
        method, 
        receiptData, 
        user, 
        { vendorName, amount, category, ocrText, ...context }
      );

      if (score.total > 0) {
        suggestions.push({
          paymentMethod: {
            id: method.id,
            name: method.name,
            type: method.type,
            requiresApproval: method.requires_approval,
            autoApprovalLimit: method.auto_approval_limit,
            requiredFields: method.required_fields,
            description: method.description
          },
          score: score.total,
          confidence: Math.min(score.total / 100, 1.0), // Normalize to 0-1
          reasons: score.reasons,
          warnings: score.warnings || [],
          metadata: {
            detectionMethod: 'auto',
            detectedAt: new Date(),
            context: {
              vendorName,
              amount,
              category,
              userRole: user.role
            }
          }
        });
      }
    }

    // Sort by score descending
    suggestions.sort((a, b) => b.score - a.score);

    console.log(`Generated ${suggestions.length} payment method suggestions`);
    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  /**
   * Calculate score for a specific payment method
   * @param {Object} method - The payment method
   * @param {Object} receiptData - The receipt data
   * @param {Object} user - The user
   * @param {Object} context - Detection context
   * @returns {Promise<Object>} Score breakdown
   */
  async calculatePaymentMethodScore(method, receiptData, user, context) {
    const score = {
      total: 0,
      reasons: [],
      warnings: []
    };

    const { vendorName, amount, category, ocrText } = context;
    const detectionRule = this.DETECTION_RULES[method.type] || {};

    // Base score for payment method type
    score.total += detectionRule.defaultScore || 5;
    score.reasons.push(`Base score for ${method.type}`);

    // Keyword matching in vendor name and OCR text
    const keywordScore = this.calculateKeywordScore(
      method.type, 
      vendorName, 
      ocrText, 
      detectionRule.keywords
    );
    score.total += keywordScore.score;
    if (keywordScore.score > 0) {
      score.reasons.push(`Keyword match: ${keywordScore.matchedKeywords.join(', ')}`);
    }

    // Amount-based scoring
    const amountScore = this.calculateAmountScore(amount, method, detectionRule);
    score.total += amountScore.score;
    if (amountScore.score > 0) {
      score.reasons.push(amountScore.reason);
    }
    if (amountScore.warning) {
      score.warnings.push(amountScore.warning);
    }

    // Category-based scoring
    const categoryScore = await this.calculateCategoryScore(category, method, detectionRule);
    score.total += categoryScore.score;
    if (categoryScore.score > 0) {
      score.reasons.push(categoryScore.reason);
    }

    // User authorization scoring
    const authScore = this.calculateUserAuthorizationScore(user, method);
    score.total += authScore.score;
    if (authScore.score > 0) {
      score.reasons.push(authScore.reason);
    }
    if (authScore.warning) {
      score.warnings.push(authScore.warning);
    }

    // Vendor-specific rules
    const vendorScore = await this.calculateVendorSpecificScore(vendorName, method, user);
    score.total += vendorScore.score;
    if (vendorScore.score > 0) {
      score.reasons.push(vendorScore.reason);
    }

    // Urgency/priority scoring
    if (context.urgency === 'high' || context.urgency === 'urgent') {
      if (method.type === 'credit_card' || method.auto_approval_limit >= amount) {
        score.total += 15;
        score.reasons.push('High urgency - fast payment method preferred');
      }
    }

    // Time-based scoring (business hours, weekends)
    const timeScore = this.calculateTimeBasedScore(method);
    score.total += timeScore.score;
    if (timeScore.score > 0) {
      score.reasons.push(timeScore.reason);
    }

    // Spending limit validation
    if (method.spending_limit && amount > method.spending_limit) {
      score.total -= 50; // Heavy penalty for exceeding limit
      score.warnings.push(`Amount $${amount} exceeds spending limit of $${method.spending_limit}`);
    }

    // Auto-approval opportunity
    if (method.auto_approval_limit && amount <= method.auto_approval_limit) {
      score.total += 20;
      score.reasons.push(`Eligible for auto-approval (limit: $${method.auto_approval_limit})`);
    }

    return score;
  }

  /**
   * Calculate keyword-based score
   * @param {string} methodType - Payment method type
   * @param {string} vendorName - Vendor name
   * @param {string} ocrText - OCR text from receipt
   * @param {Array} keywords - Keywords to match
   * @returns {Object} Keyword score breakdown
   */
  calculateKeywordScore(methodType, vendorName, ocrText, keywords = []) {
    const matchedKeywords = [];
    let score = 0;

    const searchText = `${vendorName} ${ocrText}`.toLowerCase();

    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        score += 10; // 10 points per matched keyword
      }
    }

    return {
      score,
      matchedKeywords
    };
  }

  /**
   * Calculate amount-based score
   * @param {number} amount - Expense amount
   * @param {Object} method - Payment method
   * @param {Object} rule - Detection rule
   * @returns {Object} Amount score breakdown
   */
  calculateAmountScore(amount, method, rule) {
    let score = 0;
    let reason = '';
    let warning = null;

    const amountRange = rule.amountRange || {};

    // Check if amount is within typical range for this payment method
    if (amountRange.min !== undefined && amount >= amountRange.min) {
      score += 5;
      reason = `Amount $${amount} is above minimum threshold`;
    }

    if (amountRange.max !== undefined && amount <= amountRange.max) {
      score += 5;
      reason += reason ? ' and below maximum threshold' : `Amount $${amount} is below maximum threshold`;
    } else if (amountRange.max !== undefined && amount > amountRange.max) {
      score -= 10;
      warning = `Amount $${amount} exceeds typical range for ${method.type}`;
    }

    // Special scoring for different payment method types
    switch (method.type) {
    case 'person_reimbursement':
      if (amount < 100) {
        score += 10;
        reason += ' - Small amounts typically reimbursed';
      }
      break;

    case 'credit_card':
      if (amount >= 50 && amount <= 1000) {
        score += 15;
        reason += ' - Ideal range for credit card expenses';
      }
      break;

    case 'purchase_order':
      if (amount >= 200) {
        score += 10;
        reason += ' - Large amounts often require PO process';
      }
      break;

    case 'direct_vendor':
      if (amount >= 500) {
        score += 8;
        reason += ' - Substantial amounts may warrant direct vendor payment';
      }
      break;
    }

    return { score, reason, warning };
  }

  /**
   * Calculate category-based score
   * @param {string} categoryId - Expense category ID
   * @param {Object} method - Payment method
   * @param {Object} rule - Detection rule
   * @returns {Promise<Object>} Category score breakdown
   */
  async calculateCategoryScore(categoryId, method, rule) {
    let score = 0;
    let reason = '';

    if (!categoryId) {
      return { score, reason };
    }

    // Get category details
    const category = await db('expense_categories')
      .where('id', categoryId)
      .first();

    if (!category) {
      return { score, reason };
    }

    const categoryCode = category.code || category.name.toLowerCase();
    const preferredCategories = rule.categories || [];

    // Check if category is preferred for this payment method
    const categoryMatch = preferredCategories.some(prefCat => 
      categoryCode.includes(prefCat.toLowerCase()) || 
      category.name.toLowerCase().includes(prefCat.toLowerCase())
    );

    if (categoryMatch) {
      score += 15;
      reason = `Category "${category.name}" matches preferred categories for ${method.type}`;
    }

    // Check method's allowed categories
    if (method.allowed_categories && method.allowed_categories.length > 0) {
      if (method.allowed_categories.includes(categoryId)) {
        score += 20;
        reason += reason ? ' and is explicitly allowed' : `Category "${category.name}" is explicitly allowed`;
      } else {
        score -= 30; // Heavy penalty for disallowed category
        reason = `Category "${category.name}" is not allowed for this payment method`;
      }
    }

    return { score, reason };
  }

  /**
   * Calculate user authorization score
   * @param {Object} user - The user
   * @param {Object} method - Payment method
   * @returns {Object} Authorization score breakdown
   */
  calculateUserAuthorizationScore(user, method) {
    let score = 0;
    let reason = '';
    let warning = null;

    const userRestrictions = method.user_restrictions || {};
    const allowedUsers = userRestrictions.allowedUsers || [];
    const allowedRoles = userRestrictions.allowedRoles || [];
    const blockedUsers = userRestrictions.blockedUsers || [];
    const blockedRoles = userRestrictions.blockedRoles || [];

    // Check if user is explicitly blocked
    if (blockedUsers.includes(user.id) || blockedRoles.includes(user.role)) {
      score -= 100; // Eliminate this option
      warning = 'User is not authorized for this payment method';
      return { score, reason, warning };
    }

    // Check if there are restrictions
    if (allowedUsers.length === 0 && allowedRoles.length === 0) {
      // No restrictions - all users can use
      score += 10;
      reason = 'No user restrictions';
    } else {
      // Check if user is explicitly allowed
      if (allowedUsers.includes(user.id)) {
        score += 25;
        reason = 'User is explicitly authorized';
      } else if (allowedRoles.includes(user.role)) {
        score += 20;
        reason = `User role "${user.role}" is authorized`;
      } else {
        score -= 50; // Not authorized
        warning = 'User may not be authorized for this payment method';
      }
    }

    return { score, reason, warning };
  }

  /**
   * Calculate vendor-specific score
   * @param {string} vendorName - Vendor name
   * @param {Object} method - Payment method
   * @param {Object} user - The user
   * @returns {Promise<Object>} Vendor score breakdown
   */
  async calculateVendorSpecificScore(vendorName, method, user) {
    let score = 0;
    let reason = '';

    if (!vendorName) {
      return { score, reason };
    }

    // Check for vendor-specific payment preferences (could be stored in database)
    const vendorPreferences = await this.getVendorPaymentPreferences(vendorName, user);
    
    if (vendorPreferences && vendorPreferences.preferredPaymentMethods) {
      if (vendorPreferences.preferredPaymentMethods.includes(method.type)) {
        score += 25;
        reason = `Vendor "${vendorName}" prefers ${method.type} payments`;
      }
    }

    // Common vendor patterns
    const vendorLower = vendorName.toLowerCase();
    
    if (method.type === 'credit_card') {
      // Airlines, hotels, restaurants typically accept cards
      if (vendorLower.includes('airline') || vendorLower.includes('hotel') || 
          vendorLower.includes('restaurant') || vendorLower.includes('uber') ||
          vendorLower.includes('lyft') || vendorLower.includes('starbucks')) {
        score += 15;
        reason = 'Vendor typically accepts credit card payments';
      }
    }

    if (method.type === 'purchase_order') {
      // Suppliers, contractors typically work with POs
      if (vendorLower.includes('supply') || vendorLower.includes('contractor') ||
          vendorLower.includes('vendor') || vendorLower.includes('wholesale')) {
        score += 12;
        reason = 'Vendor typically works with purchase orders';
      }
    }

    return { score, reason };
  }

  /**
   * Calculate time-based score
   * @param {Object} method - Payment method
   * @returns {Object} Time score breakdown
   */
  calculateTimeBasedScore(method) {
    let score = 0;
    let reason = '';

    const now = new Date();
    const hour = now.getHours();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const isBusinessHours = hour >= 9 && hour <= 17 && !isWeekend;

    // Credit cards and reimbursements work 24/7
    if (method.type === 'credit_card' || method.type === 'person_reimbursement') {
      if (!isBusinessHours) {
        score += 10;
        reason = 'Payment method available outside business hours';
      }
    }

    // POs and direct vendor payments typically require business hours
    if (method.type === 'purchase_order' || method.type === 'direct_vendor') {
      if (isBusinessHours) {
        score += 5;
        reason = 'Business hours - administrative processes available';
      } else {
        score -= 5;
        reason = 'Outside business hours - administrative delays expected';
      }
    }

    return { score, reason };
  }

  /**
   * Validate payment method selection
   * @param {string} paymentMethodId - Payment method ID
   * @param {Object} expenseData - Expense data
   * @param {Object} user - The user
   * @returns {Promise<Object>} Validation result
   */
  async validatePaymentMethodSelection(paymentMethodId, expenseData, user) {
    const organizationId = user.organization_id || user.id;
    const amount = parseFloat(expenseData.total_amount || 0);

    // Get payment method
    const paymentMethod = await db('payment_methods')
      .where('id', paymentMethodId)
      .where('organization_id', organizationId)
      .where('is_active', true)
      .first();

    if (!paymentMethod) {
      return {
        valid: false,
        errors: ['Payment method not found or not active'],
        warnings: []
      };
    }

    const errors = [];
    const warnings = [];

    // Parse JSON fields
    const allowedCategories = paymentMethod.allowed_categories ? JSON.parse(paymentMethod.allowed_categories) : [];
    const userRestrictions = paymentMethod.user_restrictions ? JSON.parse(paymentMethod.user_restrictions) : {};
    const requiredFields = paymentMethod.required_fields ? JSON.parse(paymentMethod.required_fields) : [];

    // Validate spending limit
    if (paymentMethod.spending_limit && amount > paymentMethod.spending_limit) {
      errors.push(`Amount $${amount} exceeds payment method spending limit of $${paymentMethod.spending_limit}`);
    }

    // Validate category restrictions
    if (allowedCategories.length > 0 && expenseData.category_id) {
      if (!allowedCategories.includes(expenseData.category_id)) {
        errors.push('Expense category is not allowed for this payment method');
      }
    }

    // Validate user restrictions
    const allowedUsers = userRestrictions.allowedUsers || [];
    const allowedRoles = userRestrictions.allowedRoles || [];
    const blockedUsers = userRestrictions.blockedUsers || [];
    const blockedRoles = userRestrictions.blockedRoles || [];

    if (blockedUsers.includes(user.id) || blockedRoles.includes(user.role)) {
      errors.push('User is not authorized to use this payment method');
    }

    if ((allowedUsers.length > 0 || allowedRoles.length > 0) && 
        !allowedUsers.includes(user.id) && !allowedRoles.includes(user.role)) {
      errors.push('User is not in the allowed list for this payment method');
    }

    // Validate required fields
    for (const field of requiredFields) {
      if (!expenseData[field] && !expenseData[`${field}_id`]) {
        errors.push(`Required field missing: ${field}`);
      }
    }

    // Check for warnings
    if (paymentMethod.auto_approval_limit && amount > paymentMethod.auto_approval_limit) {
      warnings.push(`Amount exceeds auto-approval limit - manual approval required`);
    }

    if (paymentMethod.requires_purchase_order && !expenseData.purchase_order_id) {
      warnings.push('Payment method typically requires a purchase order');
    }

    const valid = errors.length === 0;

    return {
      valid,
      errors,
      warnings,
      paymentMethod: {
        id: paymentMethod.id,
        name: paymentMethod.name,
        type: paymentMethod.type,
        requiresApproval: paymentMethod.requires_approval,
        autoApprovalLimit: paymentMethod.auto_approval_limit
      }
    };
  }

  /**
   * Get vendor payment preferences (stub for future implementation)
   * @param {string} vendorName - Vendor name
   * @param {Object} user - The user
   * @returns {Promise<Object|null>} Vendor preferences
   */
  async getVendorPaymentPreferences(vendorName, user) {
    // This could query a vendor preferences table or external API
    // For now, return null - implement as needed
    return null;
  }

  /**
   * Get payment method by ID with full details
   * @param {string} paymentMethodId - Payment method ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>} Payment method details
   */
  async getPaymentMethodById(paymentMethodId, organizationId) {
    const method = await db('payment_methods')
      .where('id', paymentMethodId)
      .where('organization_id', organizationId)
      .first();

    if (!method) {
      return null;
    }

    return {
      ...method,
      approval_workflow: this.safeJsonParse(method.approval_workflow, null),
      required_fields: this.safeJsonParse(method.required_fields, []),
      integration_config: this.safeJsonParse(method.integration_config, {}),
      allowed_categories: this.safeJsonParse(method.allowed_categories, []),
      user_restrictions: this.safeJsonParse(method.user_restrictions, {})
    };
  }

  /**
   * Safely parse JSON string with fallback
   * @param {string} jsonString - JSON string to parse
   * @param {*} fallback - Fallback value if parsing fails
   * @returns {*} Parsed JSON or fallback
   */
  safeJsonParse(jsonString, fallback) {
    if (!jsonString || jsonString === '') {
      return fallback;
    }
    
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('Failed to parse JSON:', jsonString, error.message);
      return fallback;
    }
  }

  /**
   * Get payment method usage statistics
   * @param {string} organizationId - Organization ID
   * @param {Object} dateRange - Date range for statistics
   * @returns {Promise<Array>} Usage statistics
   */
  async getPaymentMethodUsageStats(organizationId, dateRange = {}) {
    let query = db('expense_data')
      .join('payment_methods', 'expense_data.payment_method_id', 'payment_methods.id')
      .where('expense_data.organization_id', organizationId)
      .groupBy('payment_methods.id', 'payment_methods.name', 'payment_methods.type')
      .select([
        'payment_methods.id',
        'payment_methods.name',
        'payment_methods.type',
        db.raw('COUNT(*) as usage_count'),
        db.raw('SUM(expense_data.total_amount) as total_amount'),
        db.raw('AVG(expense_data.total_amount) as average_amount'),
        db.raw('MIN(expense_data.created_at) as first_used'),
        db.raw('MAX(expense_data.created_at) as last_used')
      ]);

    if (dateRange.from) {
      query = query.where('expense_data.created_at', '>=', dateRange.from);
    }

    if (dateRange.to) {
      query = query.where('expense_data.created_at', '<=', dateRange.to);
    }

    return await query.orderBy('usage_count', 'desc');
  }
}

module.exports = new PaymentMethodService();