import express, { Request, Response } from 'express';
import Joi from 'joi';
import db from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';

const router = express.Router();

// Types
type PaymentMethodType = 'person_reimbursement' | 'purchase_order' | 'credit_card' | 'direct_vendor';
type SpendingPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface PaymentMethod {
  id: string;
  organization_id: string;
  name: string;
  type: PaymentMethodType;
  description?: string;
  is_active: boolean;
  requires_approval: boolean;
  requires_purchase_order: boolean;
  auto_approval_limit?: number;
  approval_workflow?: string | object;
  required_fields?: string | string[];
  integration_config?: string | object;
  accounting_code?: string;
  cost_center?: string;
  allowed_categories?: string | string[];
  user_restrictions?: string | object;
  spending_limit?: number;
  spending_period?: SpendingPeriod;
  created_by: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: number;
    email: string;
    role: string;
    organization_id?: string;
  };
}

interface CreatePaymentMethodRequest {
  name: string;
  type: PaymentMethodType;
  description?: string;
  isActive?: boolean;
  requiresApproval?: boolean;
  requiresPurchaseOrder?: boolean;
  autoApprovalLimit?: number;
  approvalWorkflow?: object;
  requiredFields?: string[];
  integrationConfig?: object;
  accountingCode?: string;
  costCenter?: string;
  allowedCategories?: string[];
  userRestrictions?: object;
  spendingLimit?: number;
  spendingPeriod?: SpendingPeriod;
}

interface UpdatePaymentMethodRequest extends Partial<CreatePaymentMethodRequest> {}

interface QueryParams {
  page?: string;
  limit?: string;
  type?: PaymentMethodType;
  isActive?: string;
  search?: string;
}

// Validation schemas
const paymentMethodSchema = Joi.object({
  name: Joi.string().required().max(100),
  type: Joi.string().valid(
    'person_reimbursement',
    'purchase_order',
    'credit_card',
    'direct_vendor'
  ).required(),
  description: Joi.string().max(1000).allow('').optional(),
  isActive: Joi.boolean().default(true),
  requiresApproval: Joi.boolean().default(true),
  requiresPurchaseOrder: Joi.boolean().default(false),
  autoApprovalLimit: Joi.number().min(0).optional(),
  approvalWorkflow: Joi.object().optional(),
  requiredFields: Joi.array().items(Joi.string()).optional(),
  integrationConfig: Joi.object().optional(),
  accountingCode: Joi.string().max(50).optional(),
  costCenter: Joi.string().max(50).optional(),
  allowedCategories: Joi.array().items(Joi.string().uuid()).optional(),
  userRestrictions: Joi.object().optional(),
  spendingLimit: Joi.number().min(0).optional(),
  spendingPeriod: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').optional()
});

const updatePaymentMethodSchema = paymentMethodSchema.fork(
  ['name', 'type'],
  (schema) => schema.optional()
);

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: Joi.string().valid('person_reimbursement', 'purchase_order', 'credit_card', 'direct_vendor').optional(),
  isActive: Joi.boolean().optional(),
  search: Joi.string().max(100).optional()
});

// Helper function to safely parse JSON
function safeJsonParse(value: string | object | null): any {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Helper function to format payment method for response
function formatPaymentMethod(method: PaymentMethod) {
  return {
    id: method.id,
    name: method.name,
    type: method.type,
    description: method.description,
    isActive: method.is_active,
    requiresApproval: method.requires_approval,
    requiresPurchaseOrder: method.requires_purchase_order,
    autoApprovalLimit: method.auto_approval_limit,
    approvalWorkflow: safeJsonParse(method.approval_workflow as string),
    requiredFields: safeJsonParse(method.required_fields as string) || [],
    integrationConfig: safeJsonParse(method.integration_config as string),
    accountingCode: method.accounting_code,
    costCenter: method.cost_center,
    allowedCategories: safeJsonParse(method.allowed_categories as string) || [],
    userRestrictions: safeJsonParse(method.user_restrictions as string),
    spendingLimit: method.spending_limit,
    spendingPeriod: method.spending_period,
    createdAt: method.created_at,
    updatedAt: method.updated_at
  };
}

/**
 * GET /api/payment-methods
 * List available payment methods for user
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.details[0].message
      });
    }

    const { page, limit, type, isActive, search } = value;
    const offset = (page - 1) * limit;
    const organizationId = req.user!.organization_id || req.user!.id;

    let query = db('payment_methods')
      .where('organization_id', organizationId);

    // Apply filters
    if (type) {
      query = query.where('type', type);
    }

    if (typeof isActive === 'boolean') {
      query = query.where('is_active', isActive);
    }

    if (search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${search}%`)
          .orWhere('description', 'ilike', `%${search}%`)
          .orWhere('accounting_code', 'ilike', `%${search}%`);
      });
    }

    // Check user restrictions for each payment method
    // For non-admin users, filter by user restrictions
    if (req.user!.role !== 'admin') {
      query = query.where(function() {
        this.whereNull('user_restrictions')
          .orWhereRaw(`
              user_restrictions IS NULL OR
              JSON_EXTRACT(user_restrictions, '$.allowedUsers') IS NULL OR
              JSON_CONTAINS(JSON_EXTRACT(user_restrictions, '$.allowedUsers'), ?)
            `, [JSON.stringify(req.user!.id)])
          .orWhereRaw(`
              JSON_EXTRACT(user_restrictions, '$.allowedRoles') IS NULL OR
              JSON_CONTAINS(JSON_EXTRACT(user_restrictions, '$.allowedRoles'), ?)
            `, [JSON.stringify(req.user!.role)]);
      });
    }

    // Get total count for pagination
    const countQuery = query.clone();
    const totalCount = await countQuery.count('* as count').first() as { count: string };

    // Get paginated results
    const paymentMethods = await query
      .select([
        'id',
        'name',
        'type',
        'description',
        'is_active',
        'requires_approval',
        'requires_purchase_order',
        'auto_approval_limit',
        'approval_workflow',
        'required_fields',
        'accounting_code',
        'cost_center',
        'allowed_categories',
        'user_restrictions',
        'spending_limit',
        'spending_period',
        'created_at',
        'updated_at'
      ])
      .orderBy('name')
      .limit(limit)
      .offset(offset) as PaymentMethod[];

    // Transform the data for frontend consumption
    const formattedMethods = paymentMethods.map(formatPaymentMethod);

    res.json({
      paymentMethods: formattedMethods,
      pagination: {
        page,
        limit,
        total: parseInt(totalCount.count),
        totalPages: Math.ceil(parseInt(totalCount.count) / limit)
      }
    });
  } catch (error) {
    console.error('Payment methods list error:', error);
    res.status(500).json({
      error: 'Failed to retrieve payment methods',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * POST /api/payment-methods
 * Create new payment method (admin only)
 */
router.post('/', authenticateToken('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error, value } = paymentMethodSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const organizationId = req.user!.organization_id || req.user!.id;

    // Check for duplicate names within organization
    const existingMethod = await db('payment_methods')
      .where('organization_id', organizationId)
      .where('name', value.name)
      .first() as PaymentMethod | undefined;

    if (existingMethod) {
      return res.status(409).json({
        error: 'Payment method with this name already exists'
      });
    }

    // Insert new payment method
    const [paymentMethod] = await db('payment_methods')
      .insert({
        organization_id: organizationId,
        name: value.name,
        type: value.type,
        description: value.description,
        is_active: value.isActive,
        requires_approval: value.requiresApproval,
        requires_purchase_order: value.requiresPurchaseOrder,
        auto_approval_limit: value.autoApprovalLimit,
        approval_workflow: value.approvalWorkflow ? JSON.stringify(value.approvalWorkflow) : null,
        required_fields: value.requiredFields ? JSON.stringify(value.requiredFields) : JSON.stringify([]),
        integration_config: value.integrationConfig ? JSON.stringify(value.integrationConfig) : null,
        accounting_code: value.accountingCode,
        cost_center: value.costCenter,
        allowed_categories: value.allowedCategories ? JSON.stringify(value.allowedCategories) : JSON.stringify([]),
        user_restrictions: value.userRestrictions ? JSON.stringify(value.userRestrictions) : null,
        spending_limit: value.spendingLimit,
        spending_period: value.spendingPeriod,
        created_by: req.user!.id,
        updated_by: req.user!.id
      })
      .returning('*') as PaymentMethod[];

    res.status(201).json({
      message: 'Payment method created successfully',
      paymentMethod: formatPaymentMethod(paymentMethod)
    });
  } catch (error) {
    console.error('Payment method creation error:', error);
    res.status(500).json({
      error: 'Failed to create payment method',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * GET /api/payment-methods/:id
 * Get specific payment method details
 */
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentMethodId = req.params.id;
    const organizationId = req.user!.organization_id || req.user!.id;

    const paymentMethod = await db('payment_methods')
      .where('id', paymentMethodId)
      .where('organization_id', organizationId)
      .first() as PaymentMethod | undefined;

    if (!paymentMethod) {
      return res.status(404).json({
        error: 'Payment method not found'
      });
    }

    // Check user access for non-admin users
    if (req.user!.role !== 'admin') {
      const userRestrictions = safeJsonParse(paymentMethod.user_restrictions as string);

      if (userRestrictions) {
        const allowedUsers = userRestrictions.allowedUsers || [];
        const allowedRoles = userRestrictions.allowedRoles || [];

        if (allowedUsers.length > 0 && !allowedUsers.includes(req.user!.id)) {
          if (allowedRoles.length === 0 || !allowedRoles.includes(req.user!.role)) {
            return res.status(403).json({
              error: 'Access denied to this payment method'
            });
          }
        }
      }
    }

    res.json({
      paymentMethod: formatPaymentMethod(paymentMethod)
    });
  } catch (error) {
    console.error('Payment method detail error:', error);
    res.status(500).json({
      error: 'Failed to retrieve payment method details'
    });
  }
});

/**
 * PUT /api/payment-methods/:id
 * Update payment method
 */
router.put('/:id', authenticateToken('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentMethodId = req.params.id;
    const organizationId = req.user!.organization_id || req.user!.id;

    const { error, value } = updatePaymentMethodSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    // Check if payment method exists and belongs to organization
    const existingMethod = await db('payment_methods')
      .where('id', paymentMethodId)
      .where('organization_id', organizationId)
      .first() as PaymentMethod | undefined;

    if (!existingMethod) {
      return res.status(404).json({
        error: 'Payment method not found'
      });
    }

    // Check for duplicate names within organization (excluding current method)
    if (value.name) {
      const duplicateMethod = await db('payment_methods')
        .where('organization_id', organizationId)
        .where('name', value.name)
        .whereNot('id', paymentMethodId)
        .first();

      if (duplicateMethod) {
        return res.status(409).json({
          error: 'Payment method with this name already exists'
        });
      }
    }

    // Prepare update data
    const updateData: Partial<PaymentMethod> = {
      updated_by: req.user!.id,
      updated_at: new Date()
    };

    if (value.name !== undefined) updateData.name = value.name;
    if (value.type !== undefined) updateData.type = value.type;
    if (value.description !== undefined) updateData.description = value.description;
    if (value.isActive !== undefined) updateData.is_active = value.isActive;
    if (value.requiresApproval !== undefined) updateData.requires_approval = value.requiresApproval;
    if (value.requiresPurchaseOrder !== undefined) updateData.requires_purchase_order = value.requiresPurchaseOrder;
    if (value.autoApprovalLimit !== undefined) updateData.auto_approval_limit = value.autoApprovalLimit;
    if (value.approvalWorkflow !== undefined) {
      updateData.approval_workflow = value.approvalWorkflow ? JSON.stringify(value.approvalWorkflow) : null;
    }
    if (value.requiredFields !== undefined) {
      updateData.required_fields = JSON.stringify(value.requiredFields);
    }
    if (value.integrationConfig !== undefined) {
      updateData.integration_config = value.integrationConfig ? JSON.stringify(value.integrationConfig) : null;
    }
    if (value.accountingCode !== undefined) updateData.accounting_code = value.accountingCode;
    if (value.costCenter !== undefined) updateData.cost_center = value.costCenter;
    if (value.allowedCategories !== undefined) {
      updateData.allowed_categories = JSON.stringify(value.allowedCategories);
    }
    if (value.userRestrictions !== undefined) {
      updateData.user_restrictions = value.userRestrictions ? JSON.stringify(value.userRestrictions) : null;
    }
    if (value.spendingLimit !== undefined) updateData.spending_limit = value.spendingLimit;
    if (value.spendingPeriod !== undefined) updateData.spending_period = value.spendingPeriod;

    // Update payment method
    await db('payment_methods')
      .where('id', paymentMethodId)
      .update(updateData);

    // Fetch updated method
    const updatedMethod = await db('payment_methods')
      .where('id', paymentMethodId)
      .first() as PaymentMethod;

    res.json({
      message: 'Payment method updated successfully',
      paymentMethod: formatPaymentMethod(updatedMethod)
    });
  } catch (error) {
    console.error('Payment method update error:', error);
    res.status(500).json({
      error: 'Failed to update payment method',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * DELETE /api/payment-methods/:id
 * Deactivate payment method (soft delete)
 */
router.delete('/:id', authenticateToken('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentMethodId = req.params.id;
    const organizationId = req.user!.organization_id || req.user!.id;

    // Check if payment method exists and belongs to organization
    const existingMethod = await db('payment_methods')
      .where('id', paymentMethodId)
      .where('organization_id', organizationId)
      .first() as PaymentMethod | undefined;

    if (!existingMethod) {
      return res.status(404).json({
        error: 'Payment method not found'
      });
    }

    // Check if payment method is currently in use
    const expenseCount = await db('expense_data')
      .where('payment_method_id', paymentMethodId)
      .count('* as count')
      .first() as { count: string };

    if (parseInt(expenseCount.count) > 0) {
      // Soft delete - deactivate instead of hard delete
      await db('payment_methods')
        .where('id', paymentMethodId)
        .update({
          is_active: false,
          updated_by: req.user!.id,
          updated_at: new Date()
        });

      res.json({
        message: 'Payment method deactivated successfully (in use by existing expenses)',
        deactivated: true
      });
    } else {
      // Hard delete if not in use
      await db('payment_methods')
        .where('id', paymentMethodId)
        .del();

      res.json({
        message: 'Payment method deleted successfully',
        deleted: true
      });
    }
  } catch (error) {
    console.error('Payment method deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete payment method',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

/**
 * GET /api/payment-methods/:id/rules
 * Get approval rules for payment method
 */
router.get('/:id/rules', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentMethodId = req.params.id;
    const organizationId = req.user!.organization_id || req.user!.id;

    const paymentMethod = await db('payment_methods')
      .where('id', paymentMethodId)
      .where('organization_id', organizationId)
      .select('approval_workflow', 'auto_approval_limit', 'requires_approval', 'spending_limit')
      .first() as Partial<PaymentMethod> | undefined;

    if (!paymentMethod) {
      return res.status(404).json({
        error: 'Payment method not found'
      });
    }

    const approvalWorkflow = safeJsonParse(paymentMethod.approval_workflow as string);

    res.json({
      paymentMethodId,
      approvalRules: {
        requiresApproval: paymentMethod.requires_approval,
        autoApprovalLimit: paymentMethod.auto_approval_limit,
        spendingLimit: paymentMethod.spending_limit,
        workflow: approvalWorkflow
      }
    });
  } catch (error) {
    console.error('Payment method rules error:', error);
    res.status(500).json({
      error: 'Failed to retrieve approval rules'
    });
  }
});

export default router;