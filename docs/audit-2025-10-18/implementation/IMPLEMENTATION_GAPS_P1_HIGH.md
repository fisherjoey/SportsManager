# Implementation Gaps - P1 High Priority

**Total Endpoints**: 22
**Estimated Effort**: 62 hours (~2.5 weeks)
**Status**: ❌ NOT IMPLEMENTED
**Impact**: Medium-High - New features ready for implementation

---

## Overview

These endpoints enable major new features that are built in the frontend but lack backend support. Implementing these will unlock significant functionality for end users.

---

## 1. Expense Management (18 hours)

### Impact
- **Enables**: Expense approval workflow
- **Frontend Components**:
  - `ExpenseApprovalDashboard.tsx`
  - `ExpenseFormIntegrated.tsx`

### 1.1 GET /api/expenses/pending

**Priority**: P1 - High
**Effort**: 6 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Get expenses awaiting approval with filtering

**Endpoint**: `GET /api/expenses/pending?payment_method=credit_card&urgency=high`

**Query Parameters**:
- `payment_method` ('person_reimbursement' | 'purchase_order' | 'credit_card' | 'direct_vendor')
- `urgency` ('low' | 'normal' | 'high' | 'critical')
- `amount_min`, `amount_max` (number)
- `search` (string)
- `category` (string)

**Response**:
```typescript
{
  success: boolean
  expenses: Array<{
    id: string
    expense_number: string
    amount: number
    description: string
    vendor_name: string
    category_name: string
    category_color: string
    payment_method_type: string
    payment_method_name: string
    submitted_date: string
    submitted_by_name: string
    submitted_by_email: string
    urgency_level: 'low' | 'normal' | 'high' | 'critical'
    current_approval_stage: string
    approval_deadline: string
    receipt_filename?: string
    business_purpose?: string
    is_overdue: boolean
    approval_history: Array<{
      id: string
      approver_name: string
      decision: 'approved' | 'rejected' | 'pending'
      notes?: string
      decided_at: string
    }>
  }>
  total: number
}
```

**Database Tables**: `expenses`, `expense_vendors`, `expense_categories`, `expense_approvals`, `payment_methods`, `users`

**Implementation Notes**:
- Filter by status = 'pending_approval'
- Join with vendors, categories, payment methods, users
- Calculate is_overdue from approval_deadline
- Include approval history with names
- Support search across description, vendor name, submitter

---

### 1.2 POST /api/expenses/:expenseId/approve

**Priority**: P1 - High
**Effort**: 6 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Approve an expense

**Endpoint**: `POST /api/expenses/123e4567-e89b-12d3-a456-426614174000/approve`

**Request Body**:
```typescript
{
  decision: 'approved'
  notes?: string
  approval_conditions?: string[]
}
```

**Response**:
```typescript
{
  success: boolean
  data: {
    expense_id: string
    approval_id: string
    status: string
    approved_at: string
    approved_by: string
    next_approval_stage?: string
  }
  message: string
}
```

**Implementation**:
1. Create `expense_approvals` record with decision='approved'
2. Update expense `current_approval_stage`
3. If final approval stage, update expense status to 'approved'
4. Send notification to submitter
5. Log in audit trail

**Database Tables**: `expenses`, `expense_approvals`, `notifications`, `audit_logs`

---

### 1.3 POST /api/expenses/:expenseId/reject

**Priority**: P1 - High
**Effort**: 6 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Reject an expense with reason

**Endpoint**: `POST /api/expenses/123e4567-e89b-12d3-a456-426614174000/reject`

**Request Body**:
```typescript
{
  decision: 'rejected'
  rejection_reason: string
  notes: string
}
```

**Response**:
```typescript
{
  success: boolean
  data: {
    expense_id: string
    approval_id: string
    status: 'rejected'
    rejected_at: string
    rejected_by: string
    rejection_reason: string
  }
  message: string
}
```

**Implementation**:
1. Create `expense_approvals` record with decision='rejected'
2. Update expense status to 'rejected'
3. Send notification to submitter with rejection reason
4. Allow re-submission after edits

**Database Tables**: `expenses`, `expense_approvals`, `notifications`

---

## 2. Credit Card Management (8 hours)

### Impact
- **Enables**: Company credit card tracking and restrictions
- **Frontend Component**: `CreditCardSelector.tsx`

### 2.1 GET /api/company-credit-cards

**Priority**: P1 - High
**Effort**: 8 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Get company credit cards with restrictions and balances

**Endpoint**: `GET /api/company-credit-cards?status=active&minRemainingLimit=1000`

**Query Parameters**:
- `status` ('active' | 'suspended' | 'expired' | 'cancelled')
- `minRemainingLimit` (number) - Filter cards with sufficient credit
- `department` (string)
- `category` (string) - Filter by allowed categories

**Response**:
```typescript
{
  success: boolean
  creditCards: Array<{
    id: string
    cardName: string
    cardType: 'visa' | 'mastercard' | 'amex' | 'discover'
    last4Digits: string
    cardholderName: string
    issuingBank: string
    monthlyLimit: number
    monthlySpent: number
    remainingLimit: number
    billingCycle: {
      startDate: string
      endDate: string
      dueDate: string
    }
    status: 'active' | 'suspended' | 'expired' | 'cancelled'
    expirationDate: string
    authorizedUsers: Array<{
      id: string
      name: string
      email: string
      spendingLimit?: number
    }>
    restrictions: {
      categories?: string[]
      vendors?: string[]
      maxTransactionAmount?: number
      requiresApproval?: boolean
      approvalThreshold?: number
    }
    recentTransactions?: Array<{
      id: string
      amount: number
      merchant: string
      date: string
      category: string
      status: 'posted' | 'pending'
    }>
    securityFeatures: {
      hasChipAndPin: boolean
      hasContactless: boolean
      hasVirtualCard: boolean
      fraudProtection: boolean
    }
    department?: string
    projectCode?: string
    createdAt: string
    updatedAt: string
  }>
}
```

**Database Tables**:
- `company_credit_cards`
- `credit_card_authorized_users`
- `credit_card_restrictions`
- `credit_card_transactions`
- `users`

**Implementation Notes**:
- Calculate monthlySpent from transactions in current billing cycle
- Calculate remainingLimit = monthlyLimit - monthlySpent
- Filter by remaining limit if minRemainingLimit provided
- Join with authorized users
- Include recent transactions (last 5)
- Validate category/vendor restrictions for smart filtering

---

## 3. Employee Management (15 hours)

### Impact
- **Enables**: Full employee management system
- **Frontend Component**: `EmployeeManagement.tsx`

### 3.1 GET /api/employees

**Priority**: P1 - High
**Effort**: 7 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: List employees with advanced filtering

**Endpoint**: `GET /api/employees?page=1&limit=10&department_id=abc&employment_status=active`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `search` (string) - Search by name or email
- `department_id` (string)
- `position_id` (string)
- `employment_status` ('active' | 'inactive' | 'on_leave' | 'terminated' | 'probation' | 'suspended')
- `manager_id` (string)

**Response**:
```typescript
{
  employees: Array<{
    id: string
    employee_id?: string
    employee_name: string
    employee_email: string
    department_id?: string
    department_name?: string
    position_id?: string
    position_title?: string
    position_level?: string
    employment_status: string
    hire_date: string
    work_location?: string
    base_salary?: number
    hourly_rate?: number
    employment_type?: string
    manager_id?: string
    manager_name?: string
    latest_overall_rating?: number
    latest_evaluation_date?: string
    completed_trainings?: number
    active_trainings?: number
    created_at: string
    updated_at?: string
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

**Database Tables**: `employees`, `departments`, `job_positions`, `employee_evaluations`, `training_records`, `users`

---

### 3.2 GET /api/employees/stats

**Priority**: P1 - High
**Effort**: 5 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Get employee statistics for dashboard

**Endpoint**: `GET /api/employees/stats`

**Response**:
```typescript
{
  data: {
    totalEmployees: number
    activeEmployees: number
    departmentBreakdown: Array<{
      department_name: string
      count: number
    }>
    positionBreakdown: Array<{
      position_title: string
      count: number
    }>
    newHiresThisMonth: number
    upcomingEvaluations: number
    activeTrainingPrograms: number
    averageTenure: number
  }
}
```

**Database Tables**: `employees`, `departments`, `job_positions`, `employee_evaluations`, `training_records`

---

### 3.3 POST /api/employees

**Priority**: P1 - High
**Effort**: 3 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Create new employee record

**Database Tables**: `employees`

---

## 4. Compliance & Risk (14 hours)

### Impact
- **Enables**: Compliance tracking system
- **Frontend Component**: `ComplianceTracking.tsx`

### 4.1 GET /api/compliance/tracking

**Priority**: P1 - High
**Effort**: 5 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Get compliance items with filtering

**Database Tables**: `compliance_items`, `users`

---

### 4.2 GET /api/compliance/incidents

**Priority**: P1 - High
**Effort**: 3 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Get compliance incidents

**Database Tables**: `compliance_incidents`, `users`

---

### 4.3 GET /api/compliance/risks

**Priority**: P1 - High
**Effort**: 3 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Get risk assessments

**Database Tables**: `risk_assessments`, `users`

---

### 4.4 GET /api/compliance/dashboard

**Priority**: P1 - High
**Effort**: 3 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Get compliance dashboard metrics

**Response**:
```typescript
{
  data: {
    overview: {
      totalItems: number
      overdue: number
      dueSoon: number
      completed: number
    }
    incidents: {
      totalIncidents: number
      openIncidents: number
      criticalIncidents: number
    }
    risks: {
      totalRisks: number
      highRisks: number
      mediumRisks: number
      lowRisks: number
    }
    trends: Array<{
      date: string
      score: number
      issues: number
      resolved: number
    }>
    upcomingDeadlines: Array<{
      id: string
      title: string
      due_date: string
      priority: string
      category: string
    }>
  }
}
```

**Database Tables**: `compliance_items`, `compliance_incidents`, `risk_assessments`

---

## 5. Content Management (8 hours)

### Impact
- **Enables**: Content management features
- **Frontend Component**: `ContentManagerDashboardOverview.tsx`

### 5.1 GET /api/content/stats

**Priority**: P1 - High
**Effort**: 4 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Get content management statistics

**Response**:
```typescript
{
  success: boolean
  data: {
    publishedResources: number
    draftResources: number
    totalViews: number
    recentUpdates: number
    communicationsSent: number
    pendingReviews: number
    documentCount: number
    engagementRate: number
  }
}
```

**Database Tables**: `content_resources`, `communications`, `content_reviews`, `documents`

---

### 5.2 GET /api/content/resources/recent

**Priority**: P1 - High
**Effort**: 4 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Get recent content resources

**Response**:
```typescript
{
  success: boolean
  data: {
    resources: Array<{
      id: string
      title: string
      category: string
      status: 'published' | 'draft' | 'review'
      views: number
      lastUpdated: string
      author: string
    }>
  }
}
```

**Database Tables**: `content_resources`, `users`

---

## 6. Organizational Analytics (15 hours)

### Impact
- **Enables**: AI-powered organizational insights
- **Frontend Component**: `AnalyticsDashboard.tsx`

### 6.1 GET /api/organizational-analytics

**Priority**: P1 - High
**Effort**: 15 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Get comprehensive analytics data with AI insights

**Endpoint**: `GET /api/organizational-analytics?timeRange=6months`

**Query Parameters**:
- `timeRange` ('3months' | '6months' | '1year' | '2years')

**Response**:
```typescript
{
  organizationalHealth: {
    score: number
    trend: 'up' | 'down' | 'stable'
    factors: Array<{
      name: string
      score: number
      weight: number
      trend: 'up' | 'down' | 'stable'
    }>
  }
  financialInsights: {
    totalRevenue: number
    totalExpenses: number
    profitMargin: number
    burnRate: number
    forecastAccuracy: number
    trends: Array<{
      month: string
      revenue: number
      expenses: number
      profit: number
      forecast: number
    }>
  }
  employeeAnalytics: {
    productivity: number
    satisfaction: number
    retention: number
    performanceDistribution: Array<{
      rating: string
      count: number
      percentage: number
    }>
    departmentMetrics: Array<{
      department: string
      productivity: number
      satisfaction: number
      headcount: number
    }>
  }
  operationalMetrics: {
    efficiency: number
    qualityScore: number
    complianceScore: number
    assetUtilization: number
    processMetrics: Array<{
      process: string
      efficiency: number
      volume: number
      errors: number
    }>
  }
  aiInsights: Array<{
    id: string
    type: 'opportunity' | 'risk' | 'recommendation' | 'alert'
    title: string
    description: string
    confidence: number
    impact: 'high' | 'medium' | 'low'
    category: string
    actionable: boolean
    generatedAt: string
  }>
  predictiveAnalytics: {
    employeeTurnover: Array<{
      month: string
      predicted: number
      actual?: number
      confidence: number
    }>
    budgetForecasting: Array<{
      category: string
      currentSpend: number
      predictedSpend: number
      variance: number
    }>
    riskAssessment: Array<{
      area: string
      riskLevel: number
      probability: number
      impact: number
    }>
  }
}
```

**Database Tables**: Multiple aggregated sources - `employees`, `departments`, `financial_transactions`, `budgets`, `game_assignments`, `compliance_items`, `assets`

**Implementation Notes**:
- Extremely complex aggregation query
- Requires ML/AI integration for insights generation
- Consider caching results (update daily)
- May need background job for computation

---

## Database Changes Required

### New Tables Needed

```sql
-- compliance_items table
CREATE TABLE compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  due_date DATE NOT NULL,
  assigned_to UUID REFERENCES users(id),
  evidence_required BOOLEAN DEFAULT false,
  evidence_provided BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT compliance_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
  CONSTRAINT compliance_priority_check CHECK (priority IN ('high', 'medium', 'low'))
);

-- content_resources table
CREATE TABLE content_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  category VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  views INTEGER DEFAULT 0,
  author_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT content_status_check CHECK (status IN ('published', 'draft', 'review', 'archived'))
);
```

---

## Implementation Order

### Week 1: Expense + Credit Cards
- Days 1-2: Expense approval workflow
- Days 3-4: Credit card management

### Week 2: Employee + Compliance
- Days 5-7: Employee management
- Days 8-9: Compliance tracking

### Week 3: Content + Analytics
- Day 10: Content management
- Days 11-12: Organizational analytics

---

## Success Criteria

- ✅ All 22 endpoints implemented
- ✅ Database migrations complete
- ✅ Frontend components functional
- ✅ Test coverage >80%
- ✅ API documentation updated

---

**Next**: See [IMPLEMENTATION_GAPS_P2_MEDIUM.md](./IMPLEMENTATION_GAPS_P2_MEDIUM.md) for Phase 3 priorities
