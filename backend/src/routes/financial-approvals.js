const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../config/database');
const { authenticateToken, requireRole, requireAnyRole } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/auditTrail');

// Validation schemas
const workflowSchema = Joi.object({
  workflow_name: Joi.string().min(1).max(100).required(),
  workflow_type: Joi.string().valid(
    'expense_approval',
    'budget_approval',
    'payroll_approval',
    'vendor_approval',
    'journal_entry_approval'
  ).required(),
  conditions: Joi.object().required(),
  approval_steps: Joi.array().items(Joi.object()).required(),
  priority: Joi.number().integer().min(0).default(0)
});

const spendingLimitSchema = Joi.object({
  user_id: Joi.string().uuid().optional(),
  role_id: Joi.string().uuid().optional(),
  budget_category_id: Joi.string().uuid().optional(),
  limit_name: Joi.string().min(1).max(100).required(),
  limit_type: Joi.string().valid(
    'daily',
    'weekly', 
    'monthly',
    'quarterly',
    'yearly',
    'per_transaction',
    'total_budget'
  ).required(),
  limit_amount: Joi.number().min(0).required(),
  warning_threshold: Joi.number().min(0).optional(),
  requires_approval: Joi.boolean().default(false),
  approval_rules: Joi.object().optional(),
  effective_from: Joi.date().optional(),
  effective_until: Joi.date().optional()
});

const approvalRequestSchema = Joi.object({
  request_type: Joi.string().valid(
    'expense',
    'budget_change',
    'payroll',
    'vendor',
    'journal_entry',
    'limit_override'
  ).required(),
  reference_id: Joi.string().uuid().required(),
  reference_table: Joi.string().required(),
  amount: Joi.number().min(0).optional(),
  request_reason: Joi.string().max(1000).required()
});

const approvalActionSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject', 'request_info').required(),
  notes: Joi.string().max(1000).optional(),
  required_info: Joi.array().items(Joi.string()).when('action', {
    is: 'request_info',
    then: Joi.required()
  })
});

/**
 * GET /api/approvals/workflows
 * List approval workflows
 */
router.get('/workflows', 
  authenticateToken, 
  requireAnyRole('admin', 'manager'), 
  async (req, res) => {
    try {
      const organizationId = req.user.organization_id || req.user.id;
      const { workflow_type, active = true } = req.query;

      let query = db('approval_workflows')
        .where('organization_id', organizationId)
        .orderBy('priority', 'desc')
        .orderBy('workflow_name');

      if (workflow_type) {
        query = query.where('workflow_type', workflow_type);
      }

      if (active !== undefined) {
        query = query.where('is_active', active === 'true');
      }

      const workflows = await query;

      res.json({ workflows });
    } catch (error) {
      console.error('Approval workflows list error:', error);
      res.status(500).json({ error: 'Failed to retrieve approval workflows' });
    }
  }
);

/**
 * POST /api/approvals/workflows
 * Create a new approval workflow
 */
router.post('/workflows',
  authenticateToken,
  requireRole('admin'),
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const { error, value } = workflowSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const organizationId = req.user.organization_id || req.user.id;

      // Validate approval steps structure
      if (!Array.isArray(value.approval_steps) || value.approval_steps.length === 0) {
        return res.status(400).json({
          error: 'Invalid approval steps',
          message: 'At least one approval step is required'
        });
      }

      // Validate each approval step has required fields
      for (let i = 0; i < value.approval_steps.length; i++) {
        const step = value.approval_steps[i];
        if (!step.step_name || !step.approver_roles) {
          return res.status(400).json({
            error: 'Invalid approval step',
            message: `Step ${i + 1} must have step_name and approver_roles`
          });
        }
      }

      const [workflow] = await db('approval_workflows')
        .insert({
          ...value,
          organization_id: organizationId
        })
        .returning('*');

      res.status(201).json({
        message: 'Approval workflow created successfully',
        workflow
      });
    } catch (error) {
      console.error('Approval workflow creation error:', error);
      res.status(500).json({ error: 'Failed to create approval workflow' });
    }
  }
);

/**
 * GET /api/approvals/spending-limits
 * List spending limits
 */
router.get('/spending-limits', 
  authenticateToken, 
  requireAnyRole('admin', 'manager'), 
  async (req, res) => {
    try {
      const organizationId = req.user.organization_id || req.user.id;
      const { user_id, active = true } = req.query;

      let query = db('spending_limits as sl')
        .leftJoin('users as u', 'sl.user_id', 'u.id')
        .leftJoin('budget_categories as bc', 'sl.budget_category_id', 'bc.id')
        .where('sl.organization_id', organizationId)
        .select(
          'sl.*',
          db.raw("COALESCE(u.first_name || ' ' || u.last_name, 'All Users') as user_name"),
          'bc.name as category_name',
          'bc.color_code as category_color'
        )
        .orderBy('sl.limit_name');

      if (active !== undefined) {
        query = query.where('sl.is_active', active === 'true');
      }

      if (user_id) {
        query = query.where('sl.user_id', user_id);
      }

      const limits = await query;

      res.json({ spending_limits: limits });
    } catch (error) {
      console.error('Spending limits list error:', error);
      res.status(500).json({ error: 'Failed to retrieve spending limits' });
    }
  }
);

/**
 * POST /api/approvals/spending-limits
 * Create a new spending limit
 */
router.post('/spending-limits',
  authenticateToken,
  requireRole('admin'),
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const { error, value } = spendingLimitSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const organizationId = req.user.organization_id || req.user.id;

      // Validate that at least one target is specified (user_id, role_id, or category_id)
      if (!value.user_id && !value.role_id && !value.budget_category_id) {
        return res.status(400).json({
          error: 'Invalid limit target',
          message: 'Must specify at least one of: user_id, role_id, or budget_category_id'
        });
      }

      // Validate user exists if provided
      if (value.user_id) {
        const user = await db('users')
          .where('id', value.user_id)
          .where(function() {
            this.where('id', organizationId)
                .orWhere('organization_id', organizationId);
          })
          .first();

        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
      }

      // Validate category exists if provided
      if (value.budget_category_id) {
        const category = await db('budget_categories')
          .where('id', value.budget_category_id)
          .where('organization_id', organizationId)
          .first();

        if (!category) {
          return res.status(404).json({ error: 'Budget category not found' });
        }
      }

      const [limit] = await db('spending_limits')
        .insert({
          ...value,
          organization_id: organizationId
        })
        .returning('*');

      res.status(201).json({
        message: 'Spending limit created successfully',
        spending_limit: limit
      });
    } catch (error) {
      console.error('Spending limit creation error:', error);
      res.status(500).json({ error: 'Failed to create spending limit' });
    }
  }
);

/**
 * GET /api/approvals/requests
 * List approval requests
 */
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.id;
    const { 
      status, 
      request_type, 
      requested_by,
      page = 1, 
      limit = 20,
      my_approvals = false
    } = req.query;

    let query = db('approval_requests as ar')
      .join('approval_workflows as aw', 'ar.workflow_id', 'aw.id')
      .join('users as requester', 'ar.requested_by', 'requester.id')
      .where('ar.organization_id', organizationId)
      .select(
        'ar.*',
        'aw.workflow_name',
        'aw.workflow_type',
        db.raw("requester.first_name || ' ' || requester.last_name as requester_name"),
        'requester.email as requester_email'
      );

    // Apply filters
    if (status) query = query.where('ar.status', status);
    if (request_type) query = query.where('ar.request_type', request_type);
    if (requested_by) query = query.where('ar.requested_by', requested_by);

    // Filter for current user's pending approvals
    if (my_approvals === 'true') {
      query = query.where(function() {
        // This would need to be expanded based on approval step logic
        // For now, just show requests where user might be an approver
        this.where('ar.status', 'pending')
            .orWhere('ar.status', 'in_review');
      });
    }

    const offset = (page - 1) * limit;
    const [requests, [{ total }]] = await Promise.all([
      query.clone().orderBy('ar.requested_at', 'desc').limit(limit).offset(offset),
      query.clone().count('ar.id as total')
    ]);

    // Get summary counts
    const summary = await db('approval_requests')
      .where('organization_id', organizationId)
      .select([
        db.raw('COUNT(*) as total_requests'),
        db.raw('COUNT(CASE WHEN status = \'pending\' THEN 1 END) as pending_count'),
        db.raw('COUNT(CASE WHEN status = \'approved\' THEN 1 END) as approved_count'),
        db.raw('COUNT(CASE WHEN status = \'rejected\' THEN 1 END) as rejected_count'),
        db.raw('SUM(CASE WHEN status = \'pending\' THEN amount ELSE 0 END) as pending_amount')
      ])
      .first();

    res.json({
      requests,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Approval requests list error:', error);
    res.status(500).json({ error: 'Failed to retrieve approval requests' });
  }
});

/**
 * POST /api/approvals/requests
 * Create a new approval request
 */
router.post('/requests',
  authenticateToken,
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const { error, value } = approvalRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const organizationId = req.user.organization_id || req.user.id;

      // Find applicable workflow
      const workflow = await db('approval_workflows')
        .where('organization_id', organizationId)
        .where('workflow_type', value.request_type + '_approval')
        .where('is_active', true)
        .orderBy('priority', 'desc')
        .first();

      if (!workflow) {
        return res.status(404).json({
          error: 'No approval workflow found',
          message: `No active workflow found for ${value.request_type} approvals`
        });
      }

      // Create approval request
      const [request] = await db('approval_requests')
        .insert({
          ...value,
          organization_id: organizationId,
          workflow_id: workflow.id,
          requested_by: req.user.id,
          approval_history: JSON.stringify([{
            step: 0,
            action: 'submitted',
            user_id: req.user.id,
            timestamp: new Date().toISOString(),
            notes: 'Request submitted'
          }])
        })
        .returning('*');

      // Set expiration date based on workflow settings (default 7 days)
      const expirationDays = workflow.approval_steps?.[0]?.timeout_days || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expirationDays);

      await db('approval_requests')
        .where('id', request.id)
        .update({ expires_at: expiresAt });

      res.status(201).json({
        message: 'Approval request created successfully',
        request: { ...request, expires_at: expiresAt },
        workflow_name: workflow.workflow_name
      });
    } catch (error) {
      console.error('Approval request creation error:', error);
      res.status(500).json({ error: 'Failed to create approval request' });
    }
  }
);

/**
 * POST /api/approvals/requests/:id/action
 * Take action on an approval request
 */
router.post('/requests/:id/action',
  authenticateToken,
  requireAnyRole('admin', 'manager'),
  auditMiddleware({ logAllRequests: true }),
  async (req, res) => {
    try {
      const requestId = req.params.id;
      const organizationId = req.user.organization_id || req.user.id;

      const { error, value } = approvalActionSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      // Get the approval request with workflow
      const request = await db('approval_requests as ar')
        .join('approval_workflows as aw', 'ar.workflow_id', 'aw.id')
        .where('ar.id', requestId)
        .where('ar.organization_id', organizationId)
        .select('ar.*', 'aw.approval_steps')
        .first();

      if (!request) {
        return res.status(404).json({ error: 'Approval request not found' });
      }

      if (request.status !== 'pending' && request.status !== 'in_review') {
        return res.status(400).json({
          error: 'Invalid request status',
          message: 'Only pending or in-review requests can be acted upon'
        });
      }

      // Check if user has permission to approve at current step
      const currentStep = request.current_step;
      const approvalSteps = request.approval_steps || [];
      
      if (currentStep > approvalSteps.length) {
        return res.status(400).json({
          error: 'Invalid approval step',
          message: 'Request has exceeded available approval steps'
        });
      }

      // Update approval history
      const approvalHistory = JSON.parse(request.approval_history || '[]');
      approvalHistory.push({
        step: currentStep,
        action: value.action,
        user_id: req.user.id,
        timestamp: new Date().toISOString(),
        notes: value.notes,
        required_info: value.required_info
      });

      let newStatus = request.status;
      let completedAt = null;
      let nextStep = currentStep;

      if (value.action === 'approve') {
        if (currentStep >= approvalSteps.length) {
          // Final approval
          newStatus = 'approved';
          completedAt = new Date();
        } else {
          // Move to next step
          newStatus = 'in_review';
          nextStep = currentStep + 1;
        }
      } else if (value.action === 'reject') {
        newStatus = 'rejected';
        completedAt = new Date();
      } else if (value.action === 'request_info') {
        newStatus = 'pending'; // Reset to pending for requester to provide info
      }

      // Update the request
      await db('approval_requests')
        .where('id', requestId)
        .update({
          status: newStatus,
          current_step: nextStep,
          approval_history: JSON.stringify(approvalHistory),
          completed_at: completedAt,
          updated_at: db.fn.now()
        });

      // If approved, update the related record
      if (newStatus === 'approved') {
        await handleApprovedRequest(request);
      }

      res.json({
        message: `Request ${value.action}ed successfully`,
        status: newStatus,
        current_step: nextStep
      });
    } catch (error) {
      console.error('Approval action error:', error);
      res.status(500).json({ error: 'Failed to process approval action' });
    }
  }
);

/**
 * GET /api/approvals/limits/check
 * Check spending limits for a user/amount
 */
router.get('/limits/check', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.id;
    const { user_id, amount, category_id, transaction_type = 'expense' } = req.query;

    if (!amount) {
      return res.status(400).json({
        error: 'Amount is required'
      });
    }

    const checkUserId = user_id || req.user.id;
    const checkAmount = parseFloat(amount);

    // Get applicable spending limits
    let query = db('spending_limits')
      .where('organization_id', organizationId)
      .where('is_active', true)
      .where(function() {
        this.whereNull('effective_from')
            .orWhere('effective_from', '<=', db.fn.now());
      })
      .where(function() {
        this.whereNull('effective_until')
            .orWhere('effective_until', '>=', db.fn.now());
      });

    // Check user-specific limits
    query = query.where(function() {
      this.where('user_id', checkUserId)
          .orWhereNull('user_id');
    });

    // Check category-specific limits
    if (category_id) {
      query = query.where(function() {
        this.where('budget_category_id', category_id)
            .orWhereNull('budget_category_id');
      });
    }

    const limits = await query;

    const violations = [];
    const warnings = [];

    for (const limit of limits) {
      let periodAmount = 0;
      let periodStart = new Date();

      // Calculate period start based on limit type
      switch (limit.limit_type) {
        case 'daily':
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          periodStart.setDate(periodStart.getDate() - periodStart.getDay());
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          periodStart.setDate(1);
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'quarterly':
          const quarterStart = Math.floor(periodStart.getMonth() / 3) * 3;
          periodStart.setMonth(quarterStart, 1);
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'yearly':
          periodStart.setMonth(0, 1);
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'per_transaction':
          // Check amount directly against limit
          if (checkAmount > limit.limit_amount) {
            violations.push({
              limit_name: limit.limit_name,
              limit_amount: limit.limit_amount,
              current_amount: checkAmount,
              limit_type: limit.limit_type,
              requires_approval: limit.requires_approval
            });
          } else if (limit.warning_threshold && checkAmount > limit.warning_threshold) {
            warnings.push({
              limit_name: limit.limit_name,
              warning_threshold: limit.warning_threshold,
              current_amount: checkAmount,
              limit_type: limit.limit_type
            });
          }
          continue;
      }

      // Get spending in period for non-per-transaction limits
      if (limit.limit_type !== 'per_transaction') {
        let spendingQuery = db('financial_transactions')
          .where('organization_id', organizationId)
          .where('created_by', checkUserId)
          .where('status', 'posted')
          .where('transaction_date', '>=', periodStart)
          .sum('amount as total');

        if (category_id && limit.budget_category_id) {
          spendingQuery = spendingQuery
            .join('budgets', 'financial_transactions.budget_id', 'budgets.id')
            .where('budgets.category_id', category_id);
        }

        const [{ total }] = await spendingQuery;
        periodAmount = parseFloat(total || 0);

        const projectedAmount = periodAmount + checkAmount;

        if (projectedAmount > limit.limit_amount) {
          violations.push({
            limit_name: limit.limit_name,
            limit_amount: limit.limit_amount,
            current_amount: periodAmount,
            projected_amount: projectedAmount,
            limit_type: limit.limit_type,
            requires_approval: limit.requires_approval
          });
        } else if (limit.warning_threshold && projectedAmount > limit.warning_threshold) {
          warnings.push({
            limit_name: limit.limit_name,
            warning_threshold: limit.warning_threshold,
            current_amount: periodAmount,
            projected_amount: projectedAmount,
            limit_type: limit.limit_type
          });
        }
      }
    }

    const hasViolations = violations.length > 0;
    const requiresApproval = violations.some(v => v.requires_approval);

    res.json({
      amount: checkAmount,
      user_id: checkUserId,
      category_id,
      has_violations: hasViolations,
      requires_approval: requiresApproval,
      violations,
      warnings,
      can_proceed: !hasViolations || !requiresApproval
    });
  } catch (error) {
    console.error('Spending limit check error:', error);
    res.status(500).json({ error: 'Failed to check spending limits' });
  }
});

/**
 * Handle approved request by updating the related record
 */
async function handleApprovedRequest(request) {
  try {
    switch (request.request_type) {
      case 'expense':
        await db('financial_transactions')
          .where('id', request.reference_id)
          .update({ status: 'approved' });
        break;
      
      case 'budget_change':
        await db('budgets')
          .where('id', request.reference_id)
          .update({ status: 'approved' });
        break;
      
      case 'payroll':
        await db('game_assignments')
          .where('id', request.reference_id)
          .update({ payment_status: 'approved' });
        break;
      
      // Add other request types as needed
      default:
        console.log(`Unhandled approval request type: ${request.request_type}`);
    }
  } catch (error) {
    console.error('Error handling approved request:', error);
    throw error;
  }
}

module.exports = router;