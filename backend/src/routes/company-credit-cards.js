const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../config/database');
const { authenticateToken, requireRole, requireAnyRole } = require('../middleware/auth');

// Validation schemas
const creditCardSchema = Joi.object({
  cardName: Joi.string().required().max(100),
  cardType: Joi.string().valid('visa', 'mastercard', 'amex', 'discover').required(),
  lastFourDigits: Joi.string().length(4).pattern(/^\d{4}$/).required(),
  cardNetwork: Joi.string().max(50).optional(),
  issuingBank: Joi.string().max(100).optional(),
  
  // Card holder information
  primaryHolderId: Joi.string().uuid().optional(),
  cardholderName: Joi.string().max(100).optional(),
  authorizedUsers: Joi.array().items(Joi.string().uuid()).optional(),
  isSharedCard: Joi.boolean().default(false),
  
  // Card status and limits
  isActive: Joi.boolean().default(true),
  expirationDate: Joi.date().required(),
  creditLimit: Joi.number().min(0).optional(),
  availableCredit: Joi.number().min(0).optional(),
  currentBalance: Joi.number().min(0).optional(),
  
  // Spending controls
  monthlyLimit: Joi.number().min(0).optional(),
  transactionLimit: Joi.number().min(0).optional(),
  categoryLimits: Joi.object().optional(),
  merchantRestrictions: Joi.object().optional(),
  requiresReceipt: Joi.boolean().default(true),
  requiresPreApproval: Joi.boolean().default(false),
  
  // Statement settings
  statementClosingDate: Joi.date().optional(),
  paymentDueDate: Joi.date().optional(),
  statementFrequency: Joi.string().valid('monthly', 'bi-weekly', 'weekly').default('monthly'),
  autoReconciliationRules: Joi.object().optional(),
  
  // Integration and accounting
  externalCardId: Joi.string().max(100).optional(),
  integrationConfig: Joi.object().optional(),
  accountingCode: Joi.string().max(50).optional(),
  costCenter: Joi.string().max(50).optional(),
  
  // Notifications and alerts
  notificationSettings: Joi.object().optional(),
  alertThreshold: Joi.number().min(0).optional(),
  fraudMonitoring: Joi.boolean().default(true),
  spendingAlerts: Joi.object().optional(),
  
  // Emergency settings
  isEmergencyCard: Joi.boolean().default(false)
});

const updateCreditCardSchema = creditCardSchema.fork(
  ['cardName', 'cardType', 'lastFourDigits', 'expirationDate'], 
  (schema) => schema.optional()
);

const assignCardSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  role: Joi.string().valid('primary', 'authorized').default('authorized'),
  monthlyLimit: Joi.number().min(0).optional(),
  transactionLimit: Joi.number().min(0).optional(),
  categoryRestrictions: Joi.object().optional(),
  expiresAt: Joi.date().optional(),
  notes: Joi.string().max(500).optional()
});

const blockCardSchema = Joi.object({
  reason: Joi.string().required().max(500),
  isTemporary: Joi.boolean().default(false),
  unblockAt: Joi.date().optional()
});

const transactionQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  minAmount: Joi.number().min(0).optional(),
  maxAmount: Joi.number().min(0).optional(),
  category: Joi.string().optional(),
  vendor: Joi.string().max(100).optional(),
  status: Joi.string().valid('pending', 'posted', 'disputed', 'refunded').optional()
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  cardType: Joi.string().valid('visa', 'mastercard', 'amex', 'discover').optional(),
  isActive: Joi.boolean().optional(),
  isSharedCard: Joi.boolean().optional(),
  primaryHolderId: Joi.string().uuid().optional(),
  isEmergencyCard: Joi.boolean().optional(),
  isBlocked: Joi.boolean().optional(),
  search: Joi.string().max(100).optional()
});

/**
 * GET /api/company-credit-cards
 * List available company credit cards for user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.details[0].message
      });
    }

    const { page, limit, cardType, isActive, isSharedCard, primaryHolderId, 
            isEmergencyCard, isBlocked, search } = value;
    const offset = (page - 1) * limit;
    const organizationId = req.user.organization_id || req.user.id;

    let query = db('company_credit_cards')
      .where('company_credit_cards.organization_id', organizationId)
      .leftJoin('users as primary_holders', 'company_credit_cards.primary_holder_id', 'primary_holders.id');

    // Apply filters
    if (cardType) {
      query = query.where('company_credit_cards.card_type', cardType);
    }

    if (typeof isActive === 'boolean') {
      query = query.where('company_credit_cards.is_active', isActive);
    }

    if (typeof isSharedCard === 'boolean') {
      query = query.where('company_credit_cards.is_shared_card', isSharedCard);
    }

    if (primaryHolderId) {
      query = query.where('company_credit_cards.primary_holder_id', primaryHolderId);
    }

    if (typeof isEmergencyCard === 'boolean') {
      query = query.where('company_credit_cards.is_emergency_card', isEmergencyCard);
    }

    if (typeof isBlocked === 'boolean') {
      query = query.where('company_credit_cards.is_blocked', isBlocked);
    }

    if (search) {
      query = query.where(function() {
        this.where('company_credit_cards.card_name', 'ilike', `%${search}%`)
            .orWhere('company_credit_cards.last_four_digits', 'ilike', `%${search}%`)
            .orWhere('company_credit_cards.cardholder_name', 'ilike', `%${search}%`);
      });
    }

    // For non-admin users, only show cards they are authorized to use
    if (req.user.role !== 'admin') {
      query = query.where(function() {
        this.where('company_credit_cards.primary_holder_id', req.user.id)
            .orWhere('company_credit_cards.is_shared_card', true)
            .orWhereRaw(`
              JSON_CONTAINS(company_credit_cards.authorized_users, ?)
            `, [JSON.stringify(req.user.id)]);
      });
    }

    // Get total count for pagination
    const countQuery = query.clone();
    const totalCount = await countQuery.count('company_credit_cards.id as count').first();

    // Get paginated results
    const creditCards = await query
      .select([
        'company_credit_cards.*',
        'primary_holders.email as primary_holder_email',
        db.raw("CONCAT(primary_holders.first_name, ' ', primary_holders.last_name) as primary_holder_name")
      ])
      .orderBy('company_credit_cards.card_name')
      .limit(limit)
      .offset(offset);

    // Transform the data for frontend consumption
    const formattedCards = creditCards.map(card => ({
      id: card.id,
      cardName: card.card_name,
      cardType: card.card_type,
      lastFourDigits: card.last_four_digits,
      maskedNumber: `****-****-****-${card.last_four_digits}`,
      cardNetwork: card.card_network,
      issuingBank: card.issuing_bank,
      cardholderName: card.cardholder_name,
      
      primaryHolder: card.primary_holder_id ? {
        id: card.primary_holder_id,
        name: card.primary_holder_name,
        email: card.primary_holder_email
      } : null,
      
      authorizedUsers: card.authorized_users ? JSON.parse(card.authorized_users) : [],
      isSharedCard: card.is_shared_card,
      isActive: card.is_active,
      isBlocked: card.is_blocked,
      isEmergencyCard: card.is_emergency_card,
      
      // Financial information
      creditLimit: card.credit_limit,
      availableCredit: card.available_credit,
      currentBalance: card.current_balance,
      monthlyLimit: card.monthly_limit,
      transactionLimit: card.transaction_limit,
      
      // Security and controls
      requiresReceipt: card.requires_receipt,
      requiresPreApproval: card.requires_pre_approval,
      fraudMonitoring: card.fraud_monitoring,
      
      // Status information
      expirationDate: card.expiration_date,
      blockReason: card.block_reason,
      blockedAt: card.blocked_at,
      
      // Timestamps
      createdAt: card.created_at,
      updatedAt: card.updated_at
    }));

    res.json({
      creditCards: formattedCards,
      pagination: {
        page,
        limit,
        total: parseInt(totalCount.count),
        totalPages: Math.ceil(parseInt(totalCount.count) / limit)
      }
    });
  } catch (error) {
    console.error('Credit cards list error:', error);
    res.status(500).json({
      error: 'Failed to retrieve credit cards',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/company-credit-cards
 * Create new company credit card (admin only)
 */
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { error, value } = creditCardSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const organizationId = req.user.organization_id || req.user.id;

    // Check for duplicate card (same last 4 digits and type)
    const existingCard = await db('company_credit_cards')
      .where('organization_id', organizationId)
      .where('last_four_digits', value.lastFourDigits)
      .where('card_type', value.cardType)
      .first();

    if (existingCard) {
      return res.status(409).json({
        error: 'A card with these last 4 digits and type already exists'
      });
    }

    // Validate primary holder exists if provided
    if (value.primaryHolderId) {
      const primaryHolder = await db('users')
        .where('id', value.primaryHolderId)
        .where('organization_id', organizationId)
        .first();

      if (!primaryHolder) {
        return res.status(400).json({
          error: 'Primary holder not found in organization'
        });
      }
    }

    // Insert new credit card
    const [creditCard] = await db('company_credit_cards')
      .insert({
        organization_id: organizationId,
        card_name: value.cardName,
        card_type: value.cardType,
        last_four_digits: value.lastFourDigits,
        card_network: value.cardNetwork,
        issuing_bank: value.issuingBank,
        primary_holder_id: value.primaryHolderId,
        cardholder_name: value.cardholderName,
        authorized_users: value.authorizedUsers ? JSON.stringify(value.authorizedUsers) : JSON.stringify([]),
        is_shared_card: value.isSharedCard,
        is_active: value.isActive,
        expiration_date: value.expirationDate,
        credit_limit: value.creditLimit,
        available_credit: value.availableCredit,
        current_balance: value.currentBalance,
        monthly_limit: value.monthlyLimit,
        transaction_limit: value.transactionLimit,
        category_limits: value.categoryLimits ? JSON.stringify(value.categoryLimits) : null,
        merchant_restrictions: value.merchantRestrictions ? JSON.stringify(value.merchantRestrictions) : null,
        requires_receipt: value.requiresReceipt,
        requires_pre_approval: value.requiresPreApproval,
        statement_closing_date: value.statementClosingDate,
        payment_due_date: value.paymentDueDate,
        statement_frequency: value.statementFrequency,
        auto_reconciliation_rules: value.autoReconciliationRules ? JSON.stringify(value.autoReconciliationRules) : null,
        external_card_id: value.externalCardId,
        integration_config: value.integrationConfig ? JSON.stringify(value.integrationConfig) : null,
        accounting_code: value.accountingCode,
        cost_center: value.costCenter,
        notification_settings: value.notificationSettings ? JSON.stringify(value.notificationSettings) : null,
        alert_threshold: value.alertThreshold,
        fraud_monitoring: value.fraudMonitoring,
        spending_alerts: value.spendingAlerts ? JSON.stringify(value.spendingAlerts) : null,
        is_emergency_card: value.isEmergencyCard,
        created_by: req.user.id,
        updated_by: req.user.id,
        activated_at: value.isActive ? new Date() : null
      })
      .returning('*');

    res.status(201).json({
      message: 'Company credit card created successfully',
      creditCard: {
        id: creditCard.id,
        cardName: creditCard.card_name,
        cardType: creditCard.card_type,
        lastFourDigits: creditCard.last_four_digits,
        maskedNumber: `****-****-****-${creditCard.last_four_digits}`,
        isActive: creditCard.is_active,
        isSharedCard: creditCard.is_shared_card,
        expirationDate: creditCard.expiration_date,
        createdAt: creditCard.created_at
      }
    });
  } catch (error) {
    console.error('Credit card creation error:', error);
    res.status(500).json({
      error: 'Failed to create credit card',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/company-credit-cards/:id
 * Get specific credit card details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const cardId = req.params.id;
    const organizationId = req.user.organization_id || req.user.id;

    const creditCard = await db('company_credit_cards')
      .where('company_credit_cards.id', cardId)
      .where('company_credit_cards.organization_id', organizationId)
      .leftJoin('users as primary_holders', 'company_credit_cards.primary_holder_id', 'primary_holders.id')
      .leftJoin('users as created_by_user', 'company_credit_cards.created_by', 'created_by_user.id')
      .select([
        'company_credit_cards.*',
        'primary_holders.email as primary_holder_email',
        db.raw("CONCAT(primary_holders.first_name, ' ', primary_holders.last_name) as primary_holder_name"),
        'created_by_user.email as created_by_email'
      ])
      .first();

    if (!creditCard) {
      return res.status(404).json({
        error: 'Credit card not found'
      });
    }

    // Check user access for non-admin users
    if (req.user.role !== 'admin') {
      const hasAccess = creditCard.primary_holder_id === req.user.id ||
                       creditCard.is_shared_card ||
                       (creditCard.authorized_users && 
                        JSON.parse(creditCard.authorized_users).includes(req.user.id));

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to this credit card'
        });
      }
    }

    const formattedCard = {
      id: creditCard.id,
      cardName: creditCard.card_name,
      cardType: creditCard.card_type,
      lastFourDigits: creditCard.last_four_digits,
      maskedNumber: `****-****-****-${creditCard.last_four_digits}`,
      cardNetwork: creditCard.card_network,
      issuingBank: creditCard.issuing_bank,
      cardholderName: creditCard.cardholder_name,
      
      primaryHolder: creditCard.primary_holder_id ? {
        id: creditCard.primary_holder_id,
        name: creditCard.primary_holder_name,
        email: creditCard.primary_holder_email
      } : null,
      
      authorizedUsers: creditCard.authorized_users ? JSON.parse(creditCard.authorized_users) : [],
      isSharedCard: creditCard.is_shared_card,
      isActive: creditCard.is_active,
      isBlocked: creditCard.is_blocked,
      isEmergencyCard: creditCard.is_emergency_card,
      
      // Financial information
      creditLimit: creditCard.credit_limit,
      availableCredit: creditCard.available_credit,
      currentBalance: creditCard.current_balance,
      monthlyLimit: creditCard.monthly_limit,
      transactionLimit: creditCard.transaction_limit,
      categoryLimits: creditCard.category_limits ? JSON.parse(creditCard.category_limits) : {},
      merchantRestrictions: creditCard.merchant_restrictions ? JSON.parse(creditCard.merchant_restrictions) : {},
      
      // Controls and settings
      requiresReceipt: creditCard.requires_receipt,
      requiresPreApproval: creditCard.requires_pre_approval,
      fraudMonitoring: creditCard.fraud_monitoring,
      
      // Statement information
      statementClosingDate: creditCard.statement_closing_date,
      paymentDueDate: creditCard.payment_due_date,
      statementFrequency: creditCard.statement_frequency,
      autoReconciliationRules: creditCard.auto_reconciliation_rules ? 
        JSON.parse(creditCard.auto_reconciliation_rules) : {},
      
      // Integration and accounting
      externalCardId: creditCard.external_card_id,
      integrationConfig: creditCard.integration_config ? 
        JSON.parse(creditCard.integration_config) : {},
      accountingCode: creditCard.accounting_code,
      costCenter: creditCard.cost_center,
      
      // Notifications and alerts
      notificationSettings: creditCard.notification_settings ? 
        JSON.parse(creditCard.notification_settings) : {},
      alertThreshold: creditCard.alert_threshold,
      spendingAlerts: creditCard.spending_alerts ? 
        JSON.parse(creditCard.spending_alerts) : {},
      
      // Status and dates
      expirationDate: creditCard.expiration_date,
      blockReason: creditCard.block_reason,
      blockedAt: creditCard.blocked_at,
      createdAt: creditCard.created_at,
      updatedAt: creditCard.updated_at,
      activatedAt: creditCard.activated_at,
      deactivatedAt: creditCard.deactivated_at,
      
      createdBy: creditCard.created_by_email
    };

    res.json({
      creditCard: formattedCard
    });
  } catch (error) {
    console.error('Credit card detail error:', error);
    res.status(500).json({
      error: 'Failed to retrieve credit card details'
    });
  }
});

/**
 * PUT /api/company-credit-cards/:id
 * Update credit card
 */
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const cardId = req.params.id;
    const organizationId = req.user.organization_id || req.user.id;

    const { error, value } = updateCreditCardSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    // Check if credit card exists and belongs to organization
    const existingCard = await db('company_credit_cards')
      .where('id', cardId)
      .where('organization_id', organizationId)
      .first();

    if (!existingCard) {
      return res.status(404).json({
        error: 'Credit card not found'
      });
    }

    // Check for duplicate if last 4 digits or type changed
    if (value.lastFourDigits || value.cardType) {
      const lastFour = value.lastFourDigits || existingCard.last_four_digits;
      const cardType = value.cardType || existingCard.card_type;
      
      const duplicateCard = await db('company_credit_cards')
        .where('organization_id', organizationId)
        .where('last_four_digits', lastFour)
        .where('card_type', cardType)
        .whereNot('id', cardId)
        .first();

      if (duplicateCard) {
        return res.status(409).json({
          error: 'A card with these last 4 digits and type already exists'
        });
      }
    }

    // Validate primary holder exists if provided
    if (value.primaryHolderId) {
      const primaryHolder = await db('users')
        .where('id', value.primaryHolderId)
        .where('organization_id', organizationId)
        .first();

      if (!primaryHolder) {
        return res.status(400).json({
          error: 'Primary holder not found in organization'
        });
      }
    }

    // Prepare update data
    const updateData = {
      updated_by: req.user.id,
      updated_at: new Date()
    };

    if (value.cardName !== undefined) updateData.card_name = value.cardName;
    if (value.cardType !== undefined) updateData.card_type = value.cardType;
    if (value.lastFourDigits !== undefined) updateData.last_four_digits = value.lastFourDigits;
    if (value.cardNetwork !== undefined) updateData.card_network = value.cardNetwork;
    if (value.issuingBank !== undefined) updateData.issuing_bank = value.issuingBank;
    if (value.primaryHolderId !== undefined) updateData.primary_holder_id = value.primaryHolderId;
    if (value.cardholderName !== undefined) updateData.cardholder_name = value.cardholderName;
    if (value.authorizedUsers !== undefined) updateData.authorized_users = JSON.stringify(value.authorizedUsers);
    if (value.isSharedCard !== undefined) updateData.is_shared_card = value.isSharedCard;
    if (value.isActive !== undefined) {
      updateData.is_active = value.isActive;
      if (value.isActive && !existingCard.activated_at) {
        updateData.activated_at = new Date();
      } else if (!value.isActive && existingCard.is_active) {
        updateData.deactivated_at = new Date();
      }
    }
    if (value.expirationDate !== undefined) updateData.expiration_date = value.expirationDate;
    if (value.creditLimit !== undefined) updateData.credit_limit = value.creditLimit;
    if (value.availableCredit !== undefined) updateData.available_credit = value.availableCredit;
    if (value.currentBalance !== undefined) updateData.current_balance = value.currentBalance;
    if (value.monthlyLimit !== undefined) updateData.monthly_limit = value.monthlyLimit;
    if (value.transactionLimit !== undefined) updateData.transaction_limit = value.transactionLimit;
    if (value.categoryLimits !== undefined) updateData.category_limits = value.categoryLimits ? JSON.stringify(value.categoryLimits) : null;
    if (value.merchantRestrictions !== undefined) updateData.merchant_restrictions = value.merchantRestrictions ? JSON.stringify(value.merchantRestrictions) : null;
    if (value.requiresReceipt !== undefined) updateData.requires_receipt = value.requiresReceipt;
    if (value.requiresPreApproval !== undefined) updateData.requires_pre_approval = value.requiresPreApproval;
    if (value.statementClosingDate !== undefined) updateData.statement_closing_date = value.statementClosingDate;
    if (value.paymentDueDate !== undefined) updateData.payment_due_date = value.paymentDueDate;
    if (value.statementFrequency !== undefined) updateData.statement_frequency = value.statementFrequency;
    if (value.autoReconciliationRules !== undefined) updateData.auto_reconciliation_rules = value.autoReconciliationRules ? JSON.stringify(value.autoReconciliationRules) : null;
    if (value.externalCardId !== undefined) updateData.external_card_id = value.externalCardId;
    if (value.integrationConfig !== undefined) updateData.integration_config = value.integrationConfig ? JSON.stringify(value.integrationConfig) : null;
    if (value.accountingCode !== undefined) updateData.accounting_code = value.accountingCode;
    if (value.costCenter !== undefined) updateData.cost_center = value.costCenter;
    if (value.notificationSettings !== undefined) updateData.notification_settings = value.notificationSettings ? JSON.stringify(value.notificationSettings) : null;
    if (value.alertThreshold !== undefined) updateData.alert_threshold = value.alertThreshold;
    if (value.fraudMonitoring !== undefined) updateData.fraud_monitoring = value.fraudMonitoring;
    if (value.spendingAlerts !== undefined) updateData.spending_alerts = value.spendingAlerts ? JSON.stringify(value.spendingAlerts) : null;
    if (value.isEmergencyCard !== undefined) updateData.is_emergency_card = value.isEmergencyCard;

    // Update credit card
    await db('company_credit_cards')
      .where('id', cardId)
      .update(updateData);

    // Fetch updated card
    const updatedCard = await db('company_credit_cards')
      .where('id', cardId)
      .first();

    res.json({
      message: 'Credit card updated successfully',
      creditCard: {
        id: updatedCard.id,
        cardName: updatedCard.card_name,
        cardType: updatedCard.card_type,
        lastFourDigits: updatedCard.last_four_digits,
        maskedNumber: `****-****-****-${updatedCard.last_four_digits}`,
        isActive: updatedCard.is_active,
        isSharedCard: updatedCard.is_shared_card,
        updatedAt: updatedCard.updated_at
      }
    });
  } catch (error) {
    console.error('Credit card update error:', error);
    res.status(500).json({
      error: 'Failed to update credit card',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/company-credit-cards/:id/transactions
 * Get credit card transactions (mock data for now)
 */
router.get('/:id/transactions', authenticateToken, async (req, res) => {
  try {
    const cardId = req.params.id;
    const organizationId = req.user.organization_id || req.user.id;

    const { error, value } = transactionQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.details[0].message
      });
    }

    // Check if credit card exists and user has access
    const creditCard = await db('company_credit_cards')
      .where('id', cardId)
      .where('organization_id', organizationId)
      .first();

    if (!creditCard) {
      return res.status(404).json({
        error: 'Credit card not found'
      });
    }

    // Check user access for non-admin users
    if (req.user.role !== 'admin') {
      const hasAccess = creditCard.primary_holder_id === req.user.id ||
                       creditCard.is_shared_card ||
                       (creditCard.authorized_users && 
                        JSON.parse(creditCard.authorized_users).includes(req.user.id));

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to this credit card'
        });
      }
    }

    // For now, return linked expense data as transactions
    // In a real implementation, this would connect to bank APIs
    const { page, limit, dateFrom, dateTo, minAmount, maxAmount, category, vendor, status } = value;
    const offset = (page - 1) * limit;

    let query = db('expense_data')
      .where('credit_card_id', cardId)
      .leftJoin('expense_receipts', 'expense_data.receipt_id', 'expense_receipts.id')
      .leftJoin('expense_categories', 'expense_data.category_id', 'expense_categories.id')
      .leftJoin('users', 'expense_data.user_id', 'users.id');

    // Apply filters
    if (dateFrom) {
      query = query.where('expense_data.transaction_date', '>=', dateFrom);
    }

    if (dateTo) {
      query = query.where('expense_data.transaction_date', '<=', dateTo);
    }

    if (minAmount) {
      query = query.where('expense_data.total_amount', '>=', minAmount);
    }

    if (maxAmount) {
      query = query.where('expense_data.total_amount', '<=', maxAmount);
    }

    if (category) {
      query = query.where('expense_categories.name', 'ilike', `%${category}%`);
    }

    if (vendor) {
      query = query.where('expense_data.vendor_name', 'ilike', `%${vendor}%`);
    }

    // Get total count
    const countQuery = query.clone();
    const totalCount = await countQuery.count('expense_data.id as count').first();

    // Get transactions
    const transactions = await query
      .select([
        'expense_data.*',
        'expense_receipts.original_filename',
        'expense_categories.name as category_name',
        'users.email as user_email',
        db.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name")
      ])
      .orderBy('expense_data.transaction_date', 'desc')
      .limit(limit)
      .offset(offset);

    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      amount: transaction.total_amount,
      date: transaction.transaction_date,
      vendor: transaction.vendor_name,
      description: transaction.description,
      category: transaction.category_name,
      receiptId: transaction.receipt_id,
      fileName: transaction.original_filename,
      user: transaction.user_name,
      userEmail: transaction.user_email,
      status: 'posted', // Default status for expense data
      createdAt: transaction.created_at
    }));

    const totalAmount = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);

    res.json({
      creditCardId: cardId,
      cardName: creditCard.card_name,
      maskedNumber: `****-****-****-${creditCard.last_four_digits}`,
      transactions: formattedTransactions,
      summary: {
        totalTransactions: parseInt(totalCount.count),
        totalAmount,
        averageAmount: transactions.length > 0 ? totalAmount / transactions.length : 0
      },
      pagination: {
        page,
        limit,
        total: parseInt(totalCount.count),
        totalPages: Math.ceil(parseInt(totalCount.count) / limit)
      }
    });
  } catch (error) {
    console.error('Credit card transactions error:', error);
    res.status(500).json({
      error: 'Failed to retrieve credit card transactions'
    });
  }
});

/**
 * POST /api/company-credit-cards/:id/assign
 * Assign credit card to user
 */
router.post('/:id/assign', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const cardId = req.params.id;
    const organizationId = req.user.organization_id || req.user.id;

    const { error, value } = assignCardSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    // Check if credit card exists and belongs to organization
    const creditCard = await db('company_credit_cards')
      .where('id', cardId)
      .where('organization_id', organizationId)
      .first();

    if (!creditCard) {
      return res.status(404).json({
        error: 'Credit card not found'
      });
    }

    // Check if user exists and belongs to organization
    const user = await db('users')
      .where('id', value.userId)
      .where('organization_id', organizationId)
      .first();

    if (!user) {
      return res.status(400).json({
        error: 'User not found in organization'
      });
    }

    // Update card assignment
    const updateData = {};
    const currentAuthorizedUsers = creditCard.authorized_users ? 
      JSON.parse(creditCard.authorized_users) : [];

    if (value.role === 'primary') {
      updateData.primary_holder_id = value.userId;
      updateData.cardholder_name = `${user.first_name} ${user.last_name}`;
    } else {
      // Add to authorized users if not already there
      if (!currentAuthorizedUsers.includes(value.userId)) {
        currentAuthorizedUsers.push(value.userId);
        updateData.authorized_users = JSON.stringify(currentAuthorizedUsers);
      }
    }

    // Apply spending limits if provided
    if (value.monthlyLimit) {
      updateData.monthly_limit = value.monthlyLimit;
    }

    if (value.transactionLimit) {
      updateData.transaction_limit = value.transactionLimit;
    }

    updateData.updated_by = req.user.id;
    updateData.updated_at = new Date();

    await db('company_credit_cards')
      .where('id', cardId)
      .update(updateData);

    res.json({
      message: `Credit card ${value.role === 'primary' ? 'assigned as primary holder' : 'access granted'} successfully`,
      assignment: {
        cardId,
        userId: value.userId,
        userEmail: user.email,
        userName: `${user.first_name} ${user.last_name}`,
        role: value.role,
        monthlyLimit: value.monthlyLimit,
        transactionLimit: value.transactionLimit,
        assignedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Credit card assignment error:', error);
    res.status(500).json({
      error: 'Failed to assign credit card',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/company-credit-cards/:id/block
 * Block/unblock credit card
 */
router.post('/:id/block', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const cardId = req.params.id;
    const organizationId = req.user.organization_id || req.user.id;

    const { error, value } = blockCardSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    // Check if credit card exists and belongs to organization
    const creditCard = await db('company_credit_cards')
      .where('id', cardId)
      .where('organization_id', organizationId)
      .first();

    if (!creditCard) {
      return res.status(404).json({
        error: 'Credit card not found'
      });
    }

    const updateData = {
      is_blocked: true,
      block_reason: value.reason,
      blocked_at: new Date(),
      blocked_by: req.user.id,
      updated_by: req.user.id,
      updated_at: new Date()
    };

    if (value.unblockAt) {
      updateData.unblock_at = value.unblockAt;
    }

    await db('company_credit_cards')
      .where('id', cardId)
      .update(updateData);

    res.json({
      message: 'Credit card blocked successfully',
      cardId,
      isBlocked: true,
      blockReason: value.reason,
      blockedAt: updateData.blocked_at,
      isTemporary: value.isTemporary,
      unblockAt: value.unblockAt
    });
  } catch (error) {
    console.error('Credit card blocking error:', error);
    res.status(500).json({
      error: 'Failed to block credit card'
    });
  }
});

/**
 * POST /api/company-credit-cards/:id/unblock
 * Unblock credit card
 */
router.post('/:id/unblock', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const cardId = req.params.id;
    const organizationId = req.user.organization_id || req.user.id;

    // Check if credit card exists and belongs to organization
    const creditCard = await db('company_credit_cards')
      .where('id', cardId)
      .where('organization_id', organizationId)
      .first();

    if (!creditCard) {
      return res.status(404).json({
        error: 'Credit card not found'
      });
    }

    if (!creditCard.is_blocked) {
      return res.status(400).json({
        error: 'Credit card is not currently blocked'
      });
    }

    await db('company_credit_cards')
      .where('id', cardId)
      .update({
        is_blocked: false,
        block_reason: null,
        blocked_at: null,
        blocked_by: null,
        unblock_at: null,
        updated_by: req.user.id,
        updated_at: new Date()
      });

    res.json({
      message: 'Credit card unblocked successfully',
      cardId,
      isBlocked: false,
      unblockedAt: new Date()
    });
  } catch (error) {
    console.error('Credit card unblocking error:', error);
    res.status(500).json({
      error: 'Failed to unblock credit card'
    });
  }
});

module.exports = router;