/**
 * @fileoverview Expense Approval Routes
 * @description POST /approve and POST /reject endpoints for expense approval workflow.
 * Part of Session 3 implementation.
 */

import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { expenseApprovalService } from '../../services/expense/ExpenseApprovalService';
import { authenticateToken } from '../../middleware/auth';
import { requireCerbosPermission } from '../../middleware/requireCerbosPermission';
import {
  NotFoundError,
  AuthorizationError,
  BusinessLogicError,
  ValidationError
} from '../../utils/errors';

const router = Router();

// Validation schemas
const approveExpenseSchema = Joi.object({
  decision: Joi.string().valid('approved').required()
    .messages({ 'any.only': 'Decision must be "approved" for this endpoint' }),
  notes: Joi.string().max(1000).allow('').optional(),
  conditions: Joi.array().items(Joi.string().max(500)).max(10).optional()
});

const rejectExpenseSchema = Joi.object({
  decision: Joi.string().valid('rejected').required()
    .messages({ 'any.only': 'Decision must be "rejected" for this endpoint' }),
  reason: Joi.string().min(10).max(1000).required()
    .messages({
      'string.min': 'Rejection reason must be at least 10 characters',
      'any.required': 'Rejection reason is required'
    }),
  allow_resubmission: Joi.boolean().required()
    .messages({ 'any.required': 'allow_resubmission flag is required' })
});

const expenseIdParamSchema = Joi.object({
  expenseId: Joi.string().uuid().required()
    .messages({ 'string.guid': 'Invalid expense ID format' })
});

/**
 * POST /api/expenses/:expenseId/approve
 * Approve an expense in the workflow
 */
router.post(
  '/:expenseId/approve',
  authenticateToken,
  requireCerbosPermission({ resource: 'expense', action: 'approve' }),
  async (req: Request, res: Response) => {
    try {
      // Validate params
      const { error: paramError } = expenseIdParamSchema.validate(req.params);
      if (paramError) {
        return res.status(400).json({
          success: false,
          error: paramError.details[0].message
        });
      }

      // Validate body
      const { error: bodyError, value } = approveExpenseSchema.validate(req.body);
      if (bodyError) {
        return res.status(400).json({
          success: false,
          error: bodyError.details[0].message
        });
      }

      const result = await expenseApprovalService.approveExpense(
        req.params.expenseId,
        (req as any).user.id,
        {
          notes: value.notes,
          conditions: value.conditions
        }
      );

      return res.json({
        success: true,
        expense: result,
        message: result.is_fully_approved
          ? 'Expense fully approved and queued for payment'
          : 'Expense approved, awaiting next approval stage'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      if (error instanceof BusinessLogicError || error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message,
          details: (error as any).details || undefined
        });
      }

      console.error('Error approving expense:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to approve expense'
      });
    }
  }
);

/**
 * POST /api/expenses/:expenseId/reject
 * Reject an expense
 */
router.post(
  '/:expenseId/reject',
  authenticateToken,
  requireCerbosPermission({ resource: 'expense', action: 'reject' }),
  async (req: Request, res: Response) => {
    try {
      // Validate params
      const { error: paramError } = expenseIdParamSchema.validate(req.params);
      if (paramError) {
        return res.status(400).json({
          success: false,
          error: paramError.details[0].message
        });
      }

      // Validate body
      const { error: bodyError, value } = rejectExpenseSchema.validate(req.body);
      if (bodyError) {
        return res.status(400).json({
          success: false,
          error: bodyError.details[0].message
        });
      }

      const result = await expenseApprovalService.rejectExpense(
        req.params.expenseId,
        (req as any).user.id,
        {
          reason: value.reason,
          allow_resubmission: value.allow_resubmission
        }
      );

      return res.json({
        success: true,
        expense: result,
        message: result.can_resubmit
          ? 'Expense rejected. Submitter may resubmit with corrections.'
          : 'Expense rejected.'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      if (error instanceof AuthorizationError) {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      if (error instanceof BusinessLogicError || error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message,
          details: (error as any).details || undefined
        });
      }

      console.error('Error rejecting expense:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to reject expense'
      });
    }
  }
);

export default router;
