// @ts-nocheck

import express from 'express';
const router = express.Router();
import Joi from 'joi';
import db from '../config/database';
import { authenticateToken} from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';

// Validation schemas
const lineItemSchema = Joi.object({
  description: Joi.string().required().max(500),
  quantity: Joi.number().min(0.01).required(),
  unitPrice: Joi.number().min(0).required(),
  totalPrice: Joi.number().min(0).required(),
  category: Joi.string().max(100).optional(),
  specifications: Joi.string().max(1000).optional()
});

const purchaseOrderSchema = Joi.object({
  // Vendor information
  vendorName: Joi.string().required().max(200),
  vendorAddress: Joi.string().max(1000).optional(),
  vendorPhone: Joi.string().max(20).optional(),
  vendorEmail: Joi.string().email().max(100).optional(),
  vendorContactPerson: Joi.string().max(100).optional(),
  vendorTaxId: Joi.string().max(50).optional(),
  
  // Purchase details
  description: Joi.string().required().max(1000),
  estimatedAmount: Joi.number().min(0).required(),
  requestedDeliveryDate: Joi.date().optional(),
  deliveryAddress: Joi.string().max(1000).optional(),
  lineItems: Joi.array().items(lineItemSchema).min(1).required(),
  
  // Department and budget
  departmentId: Joi.string().uuid().optional(),
  costCenter: Joi.string().max(50).optional(),
  projectCode: Joi.string().max(50).optional(),
  budgetId: Joi.string().uuid().optional(),
  accountCode: Joi.string().max(50).optional(),
  
  // Terms and conditions
  paymentTerms: Joi.string().max(100).optional(),
  specialInstructions: Joi.string().max(2000).optional(),
  requiresReceipt: Joi.boolean().default(true),
  requiresInvoice: Joi.boolean().default(true),
  
  // Priority settings
  isEmergency: Joi.boolean().default(false),
  priorityLevel: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  emergencyJustification: Joi.string().max(1000).optional()
});

const updatePurchaseOrderSchema = purchaseOrderSchema.fork(
  ['vendorName', 'description', 'estimatedAmount', 'lineItems'],
  (schema) => schema.optional()
);

const approvalSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  notes: Joi.string().max(1000).optional(),
  approvedAmount: Joi.number().min(0).optional(),
  conditions: Joi.string().max(1000).optional()
});

const statusUpdateSchema = Joi.object({
  status: Joi.string().valid(
    'draft', 'pending_approval', 'approved', 'sent_to_vendor', 
    'acknowledged', 'in_progress', 'partially_received', 'received', 
    'invoiced', 'paid', 'cancelled', 'closed'
  ).required(),
  notes: Joi.string().max(1000).optional(),
  actualAmount: Joi.number().min(0).optional(),
  actualDeliveryDate: Joi.date().optional(),
  vendorResponse: Joi.object().optional(),
  deliveryTracking: Joi.object().optional(),
  invoiceDetails: Joi.object().optional()
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid(
    'draft', 'pending_approval', 'approved', 'sent_to_vendor', 
    'acknowledged', 'in_progress', 'partially_received', 'received', 
    'invoiced', 'paid', 'cancelled', 'closed'
  ).optional(),
  vendorName: Joi.string().max(200).optional(),
  requestedBy: Joi.string().uuid().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  minAmount: Joi.number().min(0).optional(),
  maxAmount: Joi.number().min(0).optional(),
  isEmergency: Joi.boolean().optional(),
  priorityLevel: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  search: Joi.string().max(100).optional()
});

// Helper function to generate PO number
function generatePONumber(organizationId) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const orgPrefix = organizationId.substring(0, 4).toUpperCase();
  return `PO-${orgPrefix}-${year}${month}-${random}`;
}

/**
 * GET /api/purchase-orders
 * List purchase orders with filtering
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

    const { page, limit, status, vendorName, requestedBy, dateFrom, dateTo, 
      minAmount, maxAmount, isEmergency, priorityLevel, search } = value;
    const offset = (page - 1) * limit;
    const organizationId = req.user.organization_id || req.user.id;

    let query = db('purchase_orders')
      .where('purchase_orders.organization_id', organizationId)
      .leftJoin('users as requesters', 'purchase_orders.requested_by', 'requesters.id')
      .leftJoin('users as approvers', 'purchase_orders.approved_by', 'approvers.id');

    // Apply filters
    if (status) {
      query = query.where('purchase_orders.status', status);
    }

    if (vendorName) {
      query = query.where('purchase_orders.vendor_name', 'ilike', `%${vendorName}%`);
    }

    if (requestedBy) {
      query = query.where('purchase_orders.requested_by', requestedBy);
    }

    if (dateFrom) {
      query = query.where('purchase_orders.created_at', '>=', dateFrom);
    }

    if (dateTo) {
      query = query.where('purchase_orders.created_at', '<=', dateTo);
    }

    if (minAmount) {
      query = query.where('purchase_orders.estimated_amount', '>=', minAmount);
    }

    if (maxAmount) {
      query = query.where('purchase_orders.estimated_amount', '<=', maxAmount);
    }

    if (typeof isEmergency === 'boolean') {
      query = query.where('purchase_orders.is_emergency', isEmergency);
    }

    if (priorityLevel) {
      query = query.where('purchase_orders.priority_level', priorityLevel);
    }

    if (search) {
      query = query.where(function() {
        this.where('purchase_orders.po_number', 'ilike', `%${search}%`)
          .orWhere('purchase_orders.description', 'ilike', `%${search}%`)
          .orWhere('purchase_orders.vendor_name', 'ilike', `%${search}%`);
      });
    }

    // For non-admin users, only show their own POs or those they can approve
    if (!['admin', 'manager'].includes(req.user.role)) {
      query = query.where('purchase_orders.requested_by', req.user.id);
    }

    // Get total count for pagination
    const countQuery = query.clone();
    const totalCount = await countQuery.count('purchase_orders.id as count').first();

    // Get paginated results
    const purchaseOrders = await query
      .select([
        'purchase_orders.*',
        'requesters.email as requester_email',
        db.raw('CONCAT(requesters.first_name, \' \', requesters.last_name) as requester_name'),
        'approvers.email as approver_email',
        db.raw('CONCAT(approvers.first_name, \' \', approvers.last_name) as approver_name')
      ])
      .orderBy('purchase_orders.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Transform the data for frontend consumption
    const formattedPOs = purchaseOrders.map(po => ({
      id: po.id,
      poNumber: po.po_number,
      vendorName: po.vendor_name,
      description: po.description,
      estimatedAmount: po.estimated_amount,
      actualAmount: po.actual_amount,
      status: po.status,
      requestedBy: {
        id: po.requested_by,
        name: po.requester_name,
        email: po.requester_email
      },
      approvedBy: po.approved_by ? {
        id: po.approved_by,
        name: po.approver_name,
        email: po.approver_email
      } : null,
      requestedDeliveryDate: po.requested_delivery_date,
      actualDeliveryDate: po.actual_delivery_date,
      isEmergency: po.is_emergency,
      priorityLevel: po.priority_level,
      createdAt: po.created_at,
      updatedAt: po.updated_at,
      approvedAt: po.approved_at,
      deliveredAt: po.delivered_at
    }));

    res.json({
      purchaseOrders: formattedPOs,
      pagination: {
        page,
        limit,
        total: parseInt(totalCount.count),
        totalPages: Math.ceil(parseInt(totalCount.count) / limit)
      }
    });
  } catch (error) {
    console.error('Purchase orders list error:', error);
    res.status(500).json({
      error: 'Failed to retrieve purchase orders',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/purchase-orders
 * Create new purchase order
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { error, value } = purchaseOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const organizationId = req.user.organization_id || req.user.id;
    const poNumber = generatePONumber(organizationId);

    // Validate line items total matches estimated amount
    const lineItemsTotal = value.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    if (Math.abs(lineItemsTotal - value.estimatedAmount) > 0.01) {
      return res.status(400).json({
        error: 'Line items total does not match estimated amount'
      });
    }

    // Insert new purchase order
    const [purchaseOrder] = await db('purchase_orders')
      .insert({
        organization_id: organizationId,
        po_number: poNumber,
        requested_by: req.user.id,
        department_id: value.departmentId,
        cost_center: value.costCenter,
        project_code: value.projectCode,
        vendor_name: value.vendorName,
        vendor_address: value.vendorAddress,
        vendor_phone: value.vendorPhone,
        vendor_email: value.vendorEmail,
        vendor_contact_person: value.vendorContactPerson,
        vendor_tax_id: value.vendorTaxId,
        description: value.description,
        estimated_amount: value.estimatedAmount,
        requested_delivery_date: value.requestedDeliveryDate,
        delivery_address: value.deliveryAddress,
        line_items: JSON.stringify(value.lineItems),
        status: 'draft',
        budget_id: value.budgetId,
        account_code: value.accountCode,
        payment_terms: value.paymentTerms,
        special_instructions: value.specialInstructions,
        requires_receipt: value.requiresReceipt,
        requires_invoice: value.requiresInvoice,
        is_emergency: value.isEmergency,
        priority_level: value.priorityLevel,
        emergency_justification: value.emergencyJustification
      })
      .returning('*');

    res.status(201).json({
      message: 'Purchase order created successfully',
      purchaseOrder: {
        id: purchaseOrder.id,
        poNumber: purchaseOrder.po_number,
        vendorName: purchaseOrder.vendor_name,
        description: purchaseOrder.description,
        estimatedAmount: purchaseOrder.estimated_amount,
        status: purchaseOrder.status,
        lineItems: JSON.parse(purchaseOrder.line_items),
        isEmergency: purchaseOrder.is_emergency,
        priorityLevel: purchaseOrder.priority_level,
        createdAt: purchaseOrder.created_at
      }
    });
  } catch (error) {
    console.error('Purchase order creation error:', error);
    res.status(500).json({
      error: 'Failed to create purchase order',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/purchase-orders/:id
 * Get purchase order details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const poId = req.params.id;
    const organizationId = req.user.organization_id || req.user.id;

    const purchaseOrder = await db('purchase_orders')
      .where('purchase_orders.id', poId)
      .where('purchase_orders.organization_id', organizationId)
      .leftJoin('users as requesters', 'purchase_orders.requested_by', 'requesters.id')
      .leftJoin('users as approvers', 'purchase_orders.approved_by', 'approvers.id')
      .leftJoin('budgets', 'purchase_orders.budget_id', 'budgets.id')
      .select([
        'purchase_orders.*',
        'requesters.email as requester_email',
        db.raw('CONCAT(requesters.first_name, \' \', requesters.last_name) as requester_name'),
        'approvers.email as approver_email',
        db.raw('CONCAT(approvers.first_name, \' \', approvers.last_name) as approver_name'),
        'budgets.name as budget_name'
      ])
      .first();

    if (!purchaseOrder) {
      return res.status(404).json({
        error: 'Purchase order not found'
      });
    }

    // Check access permissions for non-admin users
    if (!['admin', 'manager'].includes(req.user.role) && 
        purchaseOrder.requested_by !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied to this purchase order'
      });
    }

    const formattedPO = {
      id: purchaseOrder.id,
      poNumber: purchaseOrder.po_number,
      status: purchaseOrder.status,
      
      // Requestor information
      requestedBy: {
        id: purchaseOrder.requested_by,
        name: purchaseOrder.requester_name,
        email: purchaseOrder.requester_email
      },
      departmentId: purchaseOrder.department_id,
      costCenter: purchaseOrder.cost_center,
      projectCode: purchaseOrder.project_code,
      
      // Vendor information
      vendor: {
        name: purchaseOrder.vendor_name,
        address: purchaseOrder.vendor_address,
        phone: purchaseOrder.vendor_phone,
        email: purchaseOrder.vendor_email,
        contactPerson: purchaseOrder.vendor_contact_person,
        taxId: purchaseOrder.vendor_tax_id
      },
      
      // Purchase details
      description: purchaseOrder.description,
      estimatedAmount: purchaseOrder.estimated_amount,
      actualAmount: purchaseOrder.actual_amount,
      requestedDeliveryDate: purchaseOrder.requested_delivery_date,
      actualDeliveryDate: purchaseOrder.actual_delivery_date,
      deliveryAddress: purchaseOrder.delivery_address,
      lineItems: purchaseOrder.line_items ? JSON.parse(purchaseOrder.line_items) : [],
      
      // Approval information
      approvedBy: purchaseOrder.approved_by ? {
        id: purchaseOrder.approved_by,
        name: purchaseOrder.approver_name,
        email: purchaseOrder.approver_email
      } : null,
      approvedAt: purchaseOrder.approved_at,
      approvalNotes: purchaseOrder.approval_notes,
      approvalHistory: purchaseOrder.approval_history ? 
        JSON.parse(purchaseOrder.approval_history) : [],
      
      // Budget and accounting
      budget: purchaseOrder.budget_name ? {
        id: purchaseOrder.budget_id,
        name: purchaseOrder.budget_name
      } : null,
      accountCode: purchaseOrder.account_code,
      budgetApproved: purchaseOrder.budget_approved,
      budgetImpact: purchaseOrder.budget_impact,
      
      // Terms and conditions
      paymentTerms: purchaseOrder.payment_terms,
      specialInstructions: purchaseOrder.special_instructions,
      requiresReceipt: purchaseOrder.requires_receipt,
      requiresInvoice: purchaseOrder.requires_invoice,
      
      // Integration and tracking
      externalPoId: purchaseOrder.external_po_id,
      vendorResponse: purchaseOrder.vendor_response ? 
        JSON.parse(purchaseOrder.vendor_response) : null,
      deliveryTracking: purchaseOrder.delivery_tracking ? 
        JSON.parse(purchaseOrder.delivery_tracking) : null,
      invoiceDetails: purchaseOrder.invoice_details ? 
        JSON.parse(purchaseOrder.invoice_details) : null,
      
      // Priority and emergency
      isEmergency: purchaseOrder.is_emergency,
      priorityLevel: purchaseOrder.priority_level,
      emergencyJustification: purchaseOrder.emergency_justification,
      
      // Timestamps
      createdAt: purchaseOrder.created_at,
      updatedAt: purchaseOrder.updated_at,
      sentToVendorAt: purchaseOrder.sent_to_vendor_at,
      acknowledgedAt: purchaseOrder.acknowledged_at,
      deliveredAt: purchaseOrder.delivered_at,
      invoicedAt: purchaseOrder.invoiced_at,
      paidAt: purchaseOrder.paid_at
    };

    res.json({
      purchaseOrder: formattedPO
    });
  } catch (error) {
    console.error('Purchase order detail error:', error);
    res.status(500).json({
      error: 'Failed to retrieve purchase order details'
    });
  }
});

/**
 * PUT /api/purchase-orders/:id
 * Update purchase order (only in draft status)
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const poId = req.params.id;
    const organizationId = req.user.organization_id || req.user.id;

    const { error, value } = updatePurchaseOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    // Check if PO exists and belongs to organization
    const existingPO = await db('purchase_orders')
      .where('id', poId)
      .where('organization_id', organizationId)
      .first();

    if (!existingPO) {
      return res.status(404).json({
        error: 'Purchase order not found'
      });
    }

    // Check permissions and status
    const canEdit = req.user.role === 'admin' || 
                   existingPO.requested_by === req.user.id;
    
    if (!canEdit) {
      return res.status(403).json({
        error: 'Access denied to edit this purchase order'
      });
    }

    if (existingPO.status !== 'draft') {
      return res.status(400).json({
        error: 'Purchase order can only be edited in draft status'
      });
    }

    // Validate line items total if provided
    if (value.lineItems && value.estimatedAmount) {
      const lineItemsTotal = value.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
      if (Math.abs(lineItemsTotal - value.estimatedAmount) > 0.01) {
        return res.status(400).json({
          error: 'Line items total does not match estimated amount'
        });
      }
    }

    // Prepare update data
    const updateData = {
      updated_at: new Date()
    };

    if (value.vendorName !== undefined) {
      updateData.vendor_name = value.vendorName;
    }
    if (value.vendorAddress !== undefined) {
      updateData.vendor_address = value.vendorAddress;
    }
    if (value.vendorPhone !== undefined) {
      updateData.vendor_phone = value.vendorPhone;
    }
    if (value.vendorEmail !== undefined) {
      updateData.vendor_email = value.vendorEmail;
    }
    if (value.vendorContactPerson !== undefined) {
      updateData.vendor_contact_person = value.vendorContactPerson;
    }
    if (value.vendorTaxId !== undefined) {
      updateData.vendor_tax_id = value.vendorTaxId;
    }
    if (value.description !== undefined) {
      updateData.description = value.description;
    }
    if (value.estimatedAmount !== undefined) {
      updateData.estimated_amount = value.estimatedAmount;
    }
    if (value.requestedDeliveryDate !== undefined) {
      updateData.requested_delivery_date = value.requestedDeliveryDate;
    }
    if (value.deliveryAddress !== undefined) {
      updateData.delivery_address = value.deliveryAddress;
    }
    if (value.lineItems !== undefined) {
      updateData.line_items = JSON.stringify(value.lineItems);
    }
    if (value.departmentId !== undefined) {
      updateData.department_id = value.departmentId;
    }
    if (value.costCenter !== undefined) {
      updateData.cost_center = value.costCenter;
    }
    if (value.projectCode !== undefined) {
      updateData.project_code = value.projectCode;
    }
    if (value.budgetId !== undefined) {
      updateData.budget_id = value.budgetId;
    }
    if (value.accountCode !== undefined) {
      updateData.account_code = value.accountCode;
    }
    if (value.paymentTerms !== undefined) {
      updateData.payment_terms = value.paymentTerms;
    }
    if (value.specialInstructions !== undefined) {
      updateData.special_instructions = value.specialInstructions;
    }
    if (value.requiresReceipt !== undefined) {
      updateData.requires_receipt = value.requiresReceipt;
    }
    if (value.requiresInvoice !== undefined) {
      updateData.requires_invoice = value.requiresInvoice;
    }
    if (value.isEmergency !== undefined) {
      updateData.is_emergency = value.isEmergency;
    }
    if (value.priorityLevel !== undefined) {
      updateData.priority_level = value.priorityLevel;
    }
    if (value.emergencyJustification !== undefined) {
      updateData.emergency_justification = value.emergencyJustification;
    }

    // Update purchase order
    await db('purchase_orders')
      .where('id', poId)
      .update(updateData);

    // Fetch updated PO
    const updatedPO = await db('purchase_orders')
      .where('id', poId)
      .first();

    res.json({
      message: 'Purchase order updated successfully',
      purchaseOrder: {
        id: updatedPO.id,
        poNumber: updatedPO.po_number,
        vendorName: updatedPO.vendor_name,
        description: updatedPO.description,
        estimatedAmount: updatedPO.estimated_amount,
        status: updatedPO.status,
        lineItems: JSON.parse(updatedPO.line_items),
        updatedAt: updatedPO.updated_at
      }
    });
  } catch (error) {
    console.error('Purchase order update error:', error);
    res.status(500).json({
      error: 'Failed to update purchase order',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/purchase-orders/:id/approve
 * Approve or reject purchase order
 */
router.post('/:id/approve', authenticateToken, requireCerbosPermission({
  resource: 'purchase_order',
  action: 'manage'
}), async (req, res) => {
  try {
    const poId = req.params.id;
    const organizationId = req.user.organization_id || req.user.id;

    const { error, value } = approvalSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    // Check if PO exists and belongs to organization
    const existingPO = await db('purchase_orders')
      .where('id', poId)
      .where('organization_id', organizationId)
      .first();

    if (!existingPO) {
      return res.status(404).json({
        error: 'Purchase order not found'
      });
    }

    if (!['draft', 'pending_approval'].includes(existingPO.status)) {
      return res.status(400).json({
        error: 'Purchase order is not in a state that can be approved'
      });
    }

    // Prepare approval data
    const approvalData = {
      approved_by: req.user.id,
      approval_notes: value.notes,
      updated_at: new Date()
    };

    if (value.action === 'approve') {
      approvalData.status = 'approved';
      approvalData.approved_at = new Date();
      
      if (value.approvedAmount) {
        approvalData.estimated_amount = value.approvedAmount;
      }
    } else {
      approvalData.status = 'cancelled';
    }

    // Update approval history
    const currentHistory = existingPO.approval_history ? 
      JSON.parse(existingPO.approval_history) : [];
    const newApprovalEntry = {
      timestamp: new Date(),
      approverId: req.user.id,
      action: value.action,
      notes: value.notes,
      approvedAmount: value.approvedAmount
    };
    approvalData.approval_history = JSON.stringify([...currentHistory, newApprovalEntry]);

    // Update purchase order
    await db('purchase_orders')
      .where('id', poId)
      .update(approvalData);

    // If budget is linked, update budget impact
    if (existingPO.budget_id && value.action === 'approve') {
      const approvedAmount = value.approvedAmount || existingPO.estimated_amount;
      await db('purchase_orders')
        .where('id', poId)
        .update({
          budget_approved: true,
          budget_impact: approvedAmount
        });
    }

    res.json({
      message: `Purchase order ${value.action}d successfully`,
      status: approvalData.status,
      approvedAt: approvalData.approved_at
    });
  } catch (error) {
    console.error('Purchase order approval error:', error);
    res.status(500).json({
      error: 'Failed to process approval',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/purchase-orders/:id/reject
 * Reject purchase order
 */
router.post('/:id/reject', authenticateToken, requireCerbosPermission({
  resource: 'purchase_order',
  action: 'manage'
}), async (req, res) => {
  try {
    const poId = req.params.id;
    const { notes } = req.body;

    const result = await router.handle({
      ...req,
      url: `/api/purchase-orders/${poId}/approve`,
      body: { action: 'reject', notes }
    }, res);

    return result;
  } catch (error) {
    console.error('Purchase order rejection error:', error);
    res.status(500).json({
      error: 'Failed to reject purchase order'
    });
  }
});

/**
 * GET /api/purchase-orders/:id/expenses
 * Get expenses linked to purchase order
 */
router.get('/:id/expenses', authenticateToken, async (req, res) => {
  try {
    const poId = req.params.id;
    const organizationId = req.user.organization_id || req.user.id;

    // Check if PO exists and belongs to organization
    const purchaseOrder = await db('purchase_orders')
      .where('id', poId)
      .where('organization_id', organizationId)
      .first();

    if (!purchaseOrder) {
      return res.status(404).json({
        error: 'Purchase order not found'
      });
    }

    // Get expenses linked to this PO
    const expenses = await db('expense_data')
      .where('purchase_order_id', poId)
      .leftJoin('expense_receipts', 'expense_data.receipt_id', 'expense_receipts.id')
      .leftJoin('expense_categories', 'expense_data.category_id', 'expense_categories.id')
      .leftJoin('expense_approvals', 'expense_data.id', 'expense_approvals.expense_data_id')
      .leftJoin('users', 'expense_data.user_id', 'users.id')
      .select([
        'expense_data.*',
        'expense_receipts.original_filename',
        'expense_categories.name as category_name',
        'expense_approvals.status as approval_status',
        'users.email as user_email',
        db.raw('CONCAT(users.first_name, \' \', users.last_name) as user_name')
      ])
      .orderBy('expense_data.transaction_date', 'desc');

    const formattedExpenses = expenses.map(expense => ({
      id: expense.id,
      receiptId: expense.receipt_id,
      fileName: expense.original_filename,
      vendorName: expense.vendor_name,
      totalAmount: expense.total_amount,
      transactionDate: expense.transaction_date,
      category: expense.category_name,
      approvalStatus: expense.approval_status,
      submittedBy: {
        id: expense.user_id,
        name: expense.user_name,
        email: expense.user_email
      },
      createdAt: expense.created_at
    }));

    const totalExpenseAmount = expenses.reduce((sum, exp) => sum + (exp.total_amount || 0), 0);

    res.json({
      purchaseOrderId: poId,
      poNumber: purchaseOrder.po_number,
      estimatedAmount: purchaseOrder.estimated_amount,
      actualAmount: purchaseOrder.actual_amount,
      expenses: formattedExpenses,
      summary: {
        totalExpenses: expenses.length,
        totalExpenseAmount,
        remainingBudget: (purchaseOrder.estimated_amount || 0) - totalExpenseAmount
      }
    });
  } catch (error) {
    console.error('Purchase order expenses error:', error);
    res.status(500).json({
      error: 'Failed to retrieve linked expenses'
    });
  }
});

export default router;