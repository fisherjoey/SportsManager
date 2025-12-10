# Expense Approval API

## Overview

The Expense Approval API provides endpoints for managing the expense approval workflow, including viewing pending expenses, approving/rejecting expenses, and accessing reference data for expense submission.

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### GET /api/expenses/pending

Retrieves a paginated list of expenses awaiting approval.

**Authorization**: Requires `view:pending` permission on expense resource.

**Query Parameters**:
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| page | number | Page number (1-indexed) | 1 |
| limit | number | Items per page (max 100) | 20 |
| urgency | string | Filter by urgency: `low`, `normal`, `high`, `urgent` | - |
| amount_min | number | Minimum expense amount | - |
| amount_max | number | Maximum expense amount | - |
| category | string | Filter by category ID (UUID) | - |
| payment_method | string | Filter by payment method type | - |
| search | string | Search in description, vendor, submitter name | - |

**Response**: `200 OK`
```json
{
  "success": true,
  "expenses": [
    {
      "id": "uuid",
      "expense_number": "EXP-001",
      "amount": 150.00,
      "description": "Office supplies",
      "vendor_name": "Office Depot",
      "category_name": "Office Supplies",
      "category_color": "#3B82F6",
      "payment_method_type": "credit_card",
      "payment_method_name": "Corporate Card",
      "submitted_date": "2025-01-15T10:00:00Z",
      "submitted_by_name": "John Doe",
      "submitted_by_email": "john@example.com",
      "urgency_level": "normal",
      "current_approval_stage": "1",
      "approval_deadline": "2025-01-17T10:00:00Z",
      "receipt_filename": "receipt.pdf",
      "business_purpose": "Team meeting supplies",
      "is_overdue": false,
      "approval_history": [
        {
          "id": "uuid",
          "approver_name": "Jane Manager",
          "decision": "pending",
          "notes": null,
          "decided_at": "2025-01-15T10:00:00Z"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### POST /api/expenses/:expenseId/approve

Approves an expense at its current approval stage.

**Authorization**: Requires `approve` permission on expense resource.

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| expenseId | string | Expense UUID |

**Request Body**:
```json
{
  "notes": "Approved - all documentation verified",
  "conditions": ["Please attach itemized receipt for future submissions"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| notes | string | No | Approval notes/comments |
| conditions | string[] | No | Conditional approval requirements |

**Response**: `200 OK`
```json
{
  "success": true,
  "expense": {
    "id": "uuid",
    "status": "pending_approval",
    "current_stage": "Stage 2 of 2",
    "next_approver": "Finance Manager",
    "is_fully_approved": false
  },
  "message": "Expense approved at stage 1. Awaiting next approval."
}
```

**Response (Fully Approved)**: `200 OK`
```json
{
  "success": true,
  "expense": {
    "id": "uuid",
    "status": "approved",
    "current_stage": "Complete",
    "next_approver": null,
    "is_fully_approved": true
  },
  "message": "Expense fully approved and queued for payment."
}
```

**Error Responses**:
- `400 Bad Request` - Invalid request body or expense cannot be approved
- `403 Forbidden` - User not authorized to approve this expense
- `404 Not Found` - Expense not found

---

### POST /api/expenses/:expenseId/reject

Rejects an expense with a reason.

**Authorization**: Requires `reject` permission on expense resource.

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| expenseId | string | Expense UUID |

**Request Body**:
```json
{
  "reason": "Missing itemized receipt. Please resubmit with detailed breakdown.",
  "allow_resubmission": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | Yes | Rejection reason (min 10 characters) |
| allow_resubmission | boolean | Yes | Whether the user can resubmit the expense |

**Response**: `200 OK`
```json
{
  "success": true,
  "expense": {
    "id": "uuid",
    "status": "rejected",
    "can_resubmit": true
  },
  "message": "Expense rejected. Submitter has been notified."
}
```

**Error Responses**:
- `400 Bad Request` - Invalid request body or missing required fields
- `403 Forbidden` - User not authorized to reject this expense
- `404 Not Found` - Expense not found

---

### GET /api/expenses/categories

Retrieves expense categories for dropdown selection.

**Authorization**: Requires `view:categories` permission on expense resource.

**Query Parameters**:
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| include_inactive | boolean | Include inactive categories | false |

**Response**: `200 OK`
```json
{
  "success": true,
  "categories": [
    {
      "id": "uuid",
      "name": "Office Supplies",
      "code": "OFFICE",
      "color_code": "#3B82F6",
      "description": "Office equipment and supplies",
      "requires_approval": true,
      "approval_threshold": 500.00,
      "active": true
    }
  ]
}
```

---

### GET /api/expenses/vendors

Retrieves vendors for autocomplete/selection.

**Authorization**: Requires `view:vendors` permission on expense resource.

**Query Parameters**:
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| search | string | Search term for vendor name | - |
| limit | number | Maximum results (1-100) | 20 |

**Response**: `200 OK`
```json
{
  "success": true,
  "vendors": [
    {
      "id": "uuid",
      "name": "Office Depot",
      "email": "orders@officedepot.com",
      "phone": "555-0100",
      "payment_terms": "Net 30",
      "active": true
    }
  ]
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| NOT_FOUND | 404 | Resource not found |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| INVALID_EXPENSE_STATUS | 400 | Expense cannot be processed in current state |
| NO_PENDING_APPROVAL | 400 | No pending approval found for this expense |
| VALIDATION_ERROR | 400 | Request validation failed |

---

## Workflow States

### Expense Status
| Status | Description |
|--------|-------------|
| draft | Expense being created |
| pending | Awaiting initial submission |
| pending_approval | Submitted and awaiting approval |
| approved | Fully approved, ready for payment |
| rejected | Rejected by approver |
| rejected_resubmittable | Rejected but can be resubmitted |
| paid | Payment processed |

### Approval Stage Status
| Status | Description |
|--------|-------------|
| pending | Awaiting decision |
| approved | Stage approved |
| rejected | Stage rejected |
| delegated | Delegated to another approver |
| escalated | Escalated due to timeout |

---

## Authorization Rules

### Roles and Permissions

| Role | view:pending | approve | reject | view:categories | view:vendors |
|------|-------------|---------|--------|-----------------|--------------|
| super_admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| assignor | ✓ | ✓ | ✓ | ✓ | ✓ |
| assignment_manager | ✓ | ✓ | ✓ | ✓ | ✓ |
| referee | - | - | - | ✓ | ✓ |

### Approval Authorization

An approver can approve/reject an expense if any of the following conditions are met:
1. User is listed in `required_approvers` for the current stage
2. User is the `delegated_to` target
3. User is the `escalated_to` target
4. User has `admin` or `super_admin` role

---

## Rate Limiting

| Endpoint | Rate Limit |
|----------|------------|
| GET /pending | 100 requests/minute |
| POST /approve | 30 requests/minute |
| POST /reject | 30 requests/minute |
| GET /categories | 200 requests/minute |
| GET /vendors | 200 requests/minute |
