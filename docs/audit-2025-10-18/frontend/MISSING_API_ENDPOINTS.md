# Missing API Endpoints - Frontend Requirements

**Generated**: 2025-01-18
**Purpose**: Document API endpoints required by frontend components that currently have no backend implementation
**Methodology**: Frontend as Source of Truth - Each component defines backend requirements

---

## Table of Contents

1. [UnifiedAccessControlDashboard](#1-unifiedaccesscontroldashboard)
2. [MentorshipManagement](#2-mentorshipmanagement)
3. [PermissionManagementDashboard](#3-permissionmanagementdashboard)
4. [RoleEditor](#4-roleeditor)
5. [UserManagementDashboard](#5-usermanagementdashboard)
6. [AnalyticsDashboard](#6-analyticsdashboard)
7. [BudgetTracker](#7-budgettracker)
8. [CalendarView](#8-calendarview)
9. [FinancialDashboard](#9-financialdashboard)
10. [LeagueCreation](#10-leaguecreation)

---

## 1. UnifiedAccessControlDashboard

**Path**: `frontend/components/admin/access-control/UnifiedAccessControlDashboard.tsx`
**Purpose**: Centralized dashboard for managing users, roles, permissions, page access, and mentorships

### Required Endpoints:

#### `GET /api/access-control/stats`
- **Description**: Get overview statistics for the access control dashboard
- **Query Params**: None
- **Response**:
```typescript
{
  userCount: number
  roleCount: number
  permissionCount: number
  activeSessionCount: number
}
```
- **Database Tables**: `users`, `roles`, `permissions`, `sessions`
- **Status**: ❌ NOT IMPLEMENTED

### Data Structures:
```typescript
interface AccessControlStats {
  userCount: number
  roleCount: number
  permissionCount: number
  activeSessionCount: number
}
```

### Notes:
- This is a container component that aggregates other dashboards
- Needs read-only stats endpoint for header cards
- Sub-components handle their own API calls

---

## 2. MentorshipManagement

**Path**: `frontend/components/admin/mentorship/MentorshipManagement.tsx`
**Purpose**: Manage mentor-mentee relationships and track mentorship progress

### Required Endpoints:

#### `GET /mentorships`
- **Description**: List all mentorships with filters
- **Query Params**:
  - `status` (optional): `active` | `paused` | `completed` | `terminated`
  - `mentor_id` (optional): Filter by mentor
  - `mentee_id` (optional): Filter by mentee
- **Response**:
```typescript
{
  data: {
    data: Mentorship[]
  }
}

interface Mentorship {
  id: string
  mentor_id: string
  mentee_id: string
  mentor?: User
  mentee?: User
  start_date: string
  end_date?: string
  status: 'active' | 'paused' | 'completed' | 'terminated'
  notes?: string
  created_at: string
}
```
- **Database Tables**: `mentorships`, `users`
- **Status**: ✅ API exists but response structure needs verification

#### `POST /mentorships`
- **Description**: Create a new mentorship relationship
- **Request Body**:
```typescript
{
  mentor_id: string
  mentee_id: string
  start_date: string
  notes?: string
}
```
- **Response**:
```typescript
{
  success: boolean
  data: Mentorship
}
```
- **Validation**:
  - `mentor_id` and `mentee_id` must exist
  - No duplicate active mentorships for same pair
  - Mentor must have appropriate role
- **Database Tables**: `mentorships`
- **Status**: ✅ API exists but validation needs verification

#### `PUT /mentorships/:id`
- **Description**: Update mentorship status
- **Request Body**:
```typescript
{
  status: 'active' | 'paused' | 'completed' | 'terminated'
}
```
- **Response**:
```typescript
{
  success: boolean
  data: Mentorship
}
```
- **Database Tables**: `mentorships`
- **Status**: ✅ API exists

#### `GET /users`
- **Description**: Get users filtered by roles for mentor/mentee selection
- **Query Params**:
  - Used internally to filter mentors vs mentees
- **Response**:
```typescript
{
  users: User[]
}

interface User {
  id: string
  name: string
  email: string
  roles?: Array<{ name: string }>
}
```
- **Database Tables**: `users`, `roles`, `user_roles`
- **Status**: ✅ API exists

### Data Structures:
```typescript
interface Mentorship {
  id: string
  mentor_id: string
  mentee_id: string
  mentor?: User
  mentee?: User
  start_date: string
  end_date?: string
  status: 'active' | 'paused' | 'completed' | 'terminated'
  notes?: string
  created_at: string
}
```

### Notes:
- Component uses role-based filtering to separate mentors from mentees
- Mentor roles: `Mentor`, `Senior Referee`, `Head Referee`, `Referee Coach`, `Super Admin`
- Mentee roles: `Referee`, `Junior Referee`, `Rookie Referee`
- Prevents duplicate active mentorships
- Real-time status updates required

---

## 3. PermissionManagementDashboard

**Path**: `frontend/components/admin/rbac/PermissionManagementDashboard.tsx`
**Purpose**: View system permissions, their usage across roles, and permission categories

### Required Endpoints:

#### `GET /admin/permissions` (via apiClient.getPermissions)
- **Description**: Get all permissions grouped by category
- **Query Params**: None
- **Response**:
```typescript
{
  permissions: {
    [category: string]: Permission[]
  }
}

interface Permission {
  id: string
  name: string
  category: string
  description: string
}
```
- **Database Tables**: `permissions`
- **Status**: ✅ API exists

#### `GET /admin/roles` (via apiClient.getRoles)
- **Description**: Get all roles with optional filters
- **Query Params**:
  - `include_inactive` (optional): boolean
- **Response**:
```typescript
{
  roles: Role[]
}

interface Role {
  id: string
  name: string
  description: string
  is_active: boolean
}
```
- **Database Tables**: `roles`
- **Status**: ✅ API exists

#### `GET /admin/roles/:id` (via apiClient.getRole)
- **Description**: Get single role with permissions
- **Query Params**: None
- **Response**:
```typescript
{
  role: {
    id: string
    name: string
    description: string
    permissions: Permission[]
    user_count: number
  }
}
```
- **Database Tables**: `roles`, `permissions`, `role_permissions`, `user_roles`
- **Status**: ✅ API exists

### Data Structures:
```typescript
interface Permission {
  id: string
  name: string
  category: string
  description: string
}

interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  user_count: number
}

interface PermissionCategory {
  name: string
  permissions: Permission[]
  icon: React.ReactNode
}
```

### Notes:
- Read-only dashboard for viewing permissions
- Shows permission-role matrix
- Categorizes permissions by domain (users, games, referees, teams, etc.)
- Requires join queries across roles and permissions
- User count per role needed for analytics

---

## 4. RoleEditor

**Path**: `frontend/components/admin/rbac/RoleEditor.tsx`
**Purpose**: Create and edit roles with basic properties

### Required Endpoints:

#### `POST /admin/roles` (via apiClient.createRole)
- **Description**: Create a new role
- **Request Body**:
```typescript
{
  name: string
  description: string
  color?: string
  is_active: boolean
}
```
- **Response**:
```typescript
{
  success: boolean
  data: Role
}
```
- **Validation**:
  - `name` must be unique
  - `name` minimum 2 characters
  - `description` recommended but optional
  - `color` must be valid hex color
- **Database Tables**: `roles`
- **Status**: ✅ API exists

#### `PUT /admin/roles/:id` (via apiClient.updateRole)
- **Description**: Update existing role
- **Request Body**:
```typescript
{
  name: string
  description: string
  color?: string
  is_active: boolean
}
```
- **Response**:
```typescript
{
  success: boolean
  data: Role
}
```
- **Database Tables**: `roles`
- **Status**: ✅ API exists

### Data Structures:
```typescript
interface Role {
  id: string
  name: string
  description: string
  color?: string
  is_active: boolean
}
```

### Notes:
- Simple CRUD operations for role metadata
- Does NOT manage permissions (separate component)
- Color used for UI badges
- Inactive roles should be filtered from user assignment

---

## 5. UserManagementDashboard

**Path**: `frontend/components/admin/users/UserManagementDashboard.tsx`
**Purpose**: Comprehensive user management with role assignment, profile editing, and referee management

### Required Endpoints:

#### `GET /users` (via apiClient.getUsers)
- **Description**: Get paginated list of users with filters
- **Query Params**:
  - `page` (optional): number, default 1
  - `limit` (optional): number, default 20
  - `role` (optional): Filter by role name
- **Response**:
```typescript
{
  users: User[]
  pagination?: {
    currentPage: number
    totalPages: number
    totalCount: number
  }
}
```
- **Database Tables**: `users`, `roles`, `user_roles`, `referee_profiles`, `referee_types`
- **Status**: ✅ API exists

#### `GET /referees`
- **Description**: Get referees with enhanced data (used when filtering by referee roles)
- **Query Params**:
  - `page` (optional): number
  - `limit` (optional): number
  - `referee_type` (optional): `Senior Referee` | `Junior Referee` | `Rookie Referee`
- **Response**:
```typescript
{
  data: User[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
  }
}
```
- **Database Tables**: `users`, `referee_profiles`, `referee_types`
- **Status**: ✅ API exists

#### `DELETE /users/:id` (via apiClient.deleteUser)
- **Description**: Delete a user
- **Query Params**: None
- **Response**:
```typescript
{
  success: boolean
}
```
- **Database Tables**: `users` (cascade to related tables)
- **Status**: ✅ API exists

#### `PUT /referees/:userId/wage`
- **Description**: Update referee wage
- **Request Body**:
```typescript
{
  wage_amount: number
}
```
- **Response**:
```typescript
{
  success: boolean
}
```
- **Database Tables**: `referee_profiles`
- **Status**: ⚠️ Needs verification

#### `PUT /referees/:userId/type`
- **Description**: Change referee type
- **Request Body**:
```typescript
{
  referee_type: string
  update_wage_to_default: boolean
}
```
- **Response**:
```typescript
{
  success: boolean
}
```
- **Database Tables**: `referee_profiles`, `referee_types`
- **Status**: ⚠️ Needs verification

### Data Structures:
```typescript
interface User {
  id: string
  email: string
  name: string
  phone?: string
  roles?: Role[]
  is_active: boolean
  created_at: string
  updated_at: string

  // Referee-specific fields
  referee_profile?: {
    referee_type?: {
      name: string
    }
    wage_amount?: number
  }
  is_available?: boolean
  availability_status?: 'active' | 'inactive' | 'on_break'

  // Enhanced profile fields
  date_of_birth?: string
  year_started_refereeing?: number
  certifications?: string[]
  specializations?: string[]
  communication_preferences?: {
    preferred_language?: string
  }
  emergency_contact_name?: string
  last_login?: string
  profile_completion_percentage?: number
}

interface Role {
  id: string
  name: string
}
```

### Notes:
- Dual mode: regular users vs referee-enhanced view
- Inline editing for referee wages and types
- Comprehensive filtering by roles, status, experience
- Pagination required for performance
- User deletion should cascade properly
- Profile completion tracking for onboarding

---

## 6. AnalyticsDashboard

**Path**: `frontend/components/analytics-dashboard.tsx`
**Purpose**: AI-powered analytics with organizational health, financial insights, and predictive analytics

### Required Endpoints:

#### `GET /organizational-analytics` (via apiClient.getOrganizationalAnalytics)
- **Description**: Get comprehensive analytics data
- **Query Params**:
  - `timeRange`: `3months` | `6months` | `1year` | `2years`
- **Response**:
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
- **Database Tables**: Multiple aggregated sources
- **Status**: ❌ NOT IMPLEMENTED

### Data Structures:
```typescript
interface AnalyticsMetrics {
  organizationalHealth: OrganizationalHealth
  financialInsights: FinancialInsights
  employeeAnalytics: EmployeeAnalytics
  operationalMetrics: OperationalMetrics
  aiInsights: AIInsight[]
  predictiveAnalytics: PredictiveAnalytics
}
```

### Notes:
- Complex analytics requiring data aggregation
- AI-powered insights generation
- Predictive modeling for turnover and budgets
- Time-range filtering affects all metrics
- Heavy computation - consider caching
- Export functionality needed

---

## 7. BudgetTracker

**Path**: `frontend/components/budget-tracker.tsx`
**Purpose**: Track budgets, monitor spending, analyze variance, and manage budget allocations

### Required Endpoints:

#### `GET /budgets/periods` (via apiClient.getBudgetPeriods)
- **Description**: Get all budget periods
- **Query Params**: None
- **Response**:
```typescript
{
  periods: BudgetPeriod[]
}

interface BudgetPeriod {
  id: string
  name: string
  start_date: string
  end_date: string
  status: 'active' | 'inactive' | 'closed'
}
```
- **Database Tables**: `budget_periods`
- **Status**: ⚠️ Needs verification

#### `GET /budgets/categories` (via apiClient.getBudgetCategories)
- **Description**: Get all budget categories
- **Query Params**: None
- **Response**:
```typescript
{
  categories: BudgetCategory[]
}

interface BudgetCategory {
  id: string
  name: string
  code: string
  description?: string
  color?: string
}
```
- **Database Tables**: `budget_categories`
- **Status**: ⚠️ Needs verification

#### `GET /budgets` (via apiClient.getBudgets)
- **Description**: Get budgets with filters and pagination
- **Query Params**:
  - `period_id` (optional): Filter by period
  - `category_id` (optional): Filter by category
  - `page` (optional): Page number
  - `limit` (optional): Results per page
- **Response**:
```typescript
{
  budgets: Budget[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
  }
}

interface Budget {
  id: string
  name: string
  description?: string
  period_id: string
  budget_period_id: string
  category_id: string
  allocated_amount: number
  actual_spent?: number
  spent_amount?: number
  remaining_amount?: number
  utilization_rate?: number
  responsible_person?: string
  responsible_person_id?: string
  responsible_person_name?: string
  status?: 'active' | 'exceeded' | 'completed'

  // Joined data
  period_name?: string
  period_start?: string
  period_end?: string
  category_name?: string
  category_code?: string
  category_color?: string
  owner_id?: string
  owner_name?: string
}
```
- **Database Tables**: `budgets`, `budget_periods`, `budget_categories`, `users`
- **Status**: ⚠️ Needs verification

#### `POST /budgets` (via apiClient.createBudget)
- **Description**: Create a new budget
- **Request Body**:
```typescript
{
  name: string
  description?: string
  period_id: string
  category_id: string
  allocated_amount: number
  responsible_person?: string
}
```
- **Response**:
```typescript
{
  success: boolean
  data: Budget
}
```
- **Validation**:
  - `name` required
  - `period_id` must exist
  - `category_id` must exist
  - `allocated_amount` must be > 0
- **Database Tables**: `budgets`
- **Status**: ⚠️ Needs verification

#### `PUT /budgets/:id` (via apiClient.updateBudget)
- **Description**: Update an existing budget
- **Request Body**:
```typescript
{
  name: string
  description?: string
  period_id: string
  category_id: string
  allocated_amount: number
  responsible_person?: string
}
```
- **Response**:
```typescript
{
  success: boolean
  data: Budget
}
```
- **Database Tables**: `budgets`
- **Status**: ⚠️ Needs verification

#### `DELETE /budgets/:id` (via apiClient.deleteBudget)
- **Description**: Delete a budget
- **Query Params**: None
- **Response**:
```typescript
{
  success: boolean
  message?: string
}
```
- **Database Tables**: `budgets`
- **Status**: ⚠️ Needs verification

### Data Structures:
```typescript
interface Budget {
  id: string
  name: string
  description?: string
  period_id: string
  category_id: string
  allocated_amount: number
  spent_amount?: number
  remaining_amount?: number
  utilization_rate?: number
  responsible_person?: string
  status?: 'active' | 'exceeded' | 'completed'
}

interface BudgetSummary {
  totalBudget: number
  totalSpent: number
  totalRemaining: number
  averageUtilization: number
  budgetsOverLimit: number
  budgetsNearLimit: number
  monthlyTrends: MonthlyTrend[]
  categoryBreakdown: CategoryBreakdown[]
}
```

### Notes:
- Complex budget tracking with utilization monitoring
- Supports budget periods and categories
- Real-time variance calculation
- Needs expense data integration
- Chart data for trends and breakdowns
- Error handling for validation

---

## 8. CalendarView

**Path**: `frontend/components/calendar-view.tsx`
**Purpose**: Interactive calendar showing game schedules and assignment status

### Required Endpoints:

#### `GET /games` (implicit - uses mock data currently)
- **Description**: Get games for calendar view with filters
- **Query Params**:
  - `start_date`: ISO date string
  - `end_date`: ISO date string
  - `status` (optional): `assigned` | `unassigned` | `up-for-grabs`
  - `referee_id` (optional): Filter for specific referee
- **Response**:
```typescript
{
  games: Game[]
}

interface Game {
  id: string
  date: string
  startTime: string
  endTime: string
  status: 'assigned' | 'unassigned' | 'up-for-grabs'
  assignedReferees?: string[]
  homeTeam: Team
  awayTeam: Team
  location?: string
}
```
- **Database Tables**: `games`, `teams`, `game_assignments`, `users`
- **Status**: ❌ NOT IMPLEMENTED FOR CALENDAR

### Data Structures:
```typescript
interface DailySummary {
  totalGames: number
  startTime: string
  endTime: string
  assigned: number
  unassigned: number
  upForGrabs: number
  needsAttention: boolean
}
```

### Notes:
- Currently uses mock data
- Needs date range queries
- Role-based filtering (admins see all, referees see assigned + available)
- Click-through to date details
- Summary statistics per day
- Month navigation

---

## 9. FinancialDashboard

**Path**: `frontend/components/financial-dashboard.tsx`
**Purpose**: Comprehensive financial overview with expenses, budgets, and receipt management

### Required Endpoints:

#### `GET /financial-dashboard`
- **Description**: Get comprehensive financial dashboard data
- **Query Params**:
  - `period`: Number of days (30, 90, etc.)
- **Response**:
```typescript
{
  summary: {
    totalExpenses: number
    totalRevenue?: number
  }
  budgetUtilization: {
    totalAllocated: number
    totalSpent: number
    overallUtilization: number
  }
  pendingApprovals: {
    total: number
    items: Array<{
      id: string
      amount: number
      description: string
    }>
  }
  expenseCategories: Array<{
    name: string
    total_amount: number
  }>
  revenueTrends: Array<{
    date: string
    revenue: number
    expenses: number
    wages: number
  }>
  recentTransactions: Array<{
    id: string
    type: 'expense' | 'revenue'
    description: string
    amount: number
    category: string
    date: string
  }>
}
```
- **Database Tables**: `expenses`, `budgets`, `categories`, `transactions`, `expense_receipts`
- **Status**: ⚠️ Partially implemented

### Data Structures:
```typescript
interface FinancialMetrics {
  totalExpenses: number
  totalBudget: number
  pendingApprovals: number
  monthlySpend: number
  budgetUtilization: number
  expensesByCategory: CategoryExpense[]
  monthlyTrends: MonthlyTrend[]
  topExpenses: Expense[]
  recentReceipts: Receipt[]
}
```

### Notes:
- Aggregates multiple financial data sources
- Period-based filtering
- Tab navigation: Overview, Expenses, Budgets, Receipts
- Integrates with ExpenseList and BudgetTracker components
- Chart visualizations needed

---

## 10. LeagueCreation

**Path**: `frontend/components/league-creation.tsx`
**Purpose**: Bulk creation and management of leagues and teams

### Required Endpoints:

#### `GET /leagues` (via api.getLeagues)
- **Description**: Get leagues with pagination
- **Query Params**:
  - `limit`: Number of results
  - `page` (optional): Page number
  - `organization` (optional): Filter by organization
  - `season` (optional): Filter by season
- **Response**:
```typescript
{
  data: {
    leagues: League[]
  }
}

interface League {
  id: string
  organization: string
  age_group: string
  gender: string
  division: string
  season: string
  level: 'Recreational' | 'Competitive' | 'Elite'
  team_count?: number
  game_count?: number
}
```
- **Database Tables**: `leagues`, `teams`, `games`
- **Status**: ✅ API exists

#### `POST /leagues/bulk` (via api.createBulkLeagues)
- **Description**: Create multiple leagues at once
- **Request Body**:
```typescript
{
  organization: string
  age_groups: string[]
  genders: string[]
  divisions: string[]
  season: string
  level: 'Recreational' | 'Competitive' | 'Elite'
}
```
- **Response**:
```typescript
{
  message: string
  created: number
  leagues: League[]
}
```
- **Validation**:
  - Creates combinations: age_groups × genders × divisions
  - Checks for duplicates
  - All fields required
- **Database Tables**: `leagues`
- **Status**: ⚠️ Needs verification

#### `GET /leagues/:id/teams` (via api.getTeamsForLeague)
- **Description**: Get all teams in a league
- **Query Params**: None
- **Response**:
```typescript
{
  data: {
    teams: Team[]
  }
}

interface Team {
  id: string
  name: string
  rank: number
  location?: string
  contact_email?: string
  contact_phone?: string
  game_count?: number
}
```
- **Database Tables**: `teams`, `games`
- **Status**: ✅ API exists

#### `POST /teams/bulk` (via api.createBulkTeams)
- **Description**: Create multiple teams for a league
- **Request Body**:
```typescript
{
  league_id: string
  teams: Array<{
    name: string
    rank: number
    location: string
    contact_email: string
    contact_phone: string
  }>
}
```
- **Response**:
```typescript
{
  message: string
  created: number
  teams: Team[]
}
```
- **Database Tables**: `teams`
- **Status**: ⚠️ Needs verification

#### `POST /teams/generate` (via api.generateTeams)
- **Description**: Auto-generate teams with pattern-based naming
- **Request Body**:
```typescript
{
  league_id: string
  count: number
  name_pattern: string
  location_base: string
  auto_rank: boolean
}
```
- **Response**:
```typescript
{
  message: string
  created: number
  teams: Team[]
}
```
- **Notes**:
  - `name_pattern` uses `{number}` placeholder (e.g., "Team {number}")
  - `auto_rank` sets sequential rankings
- **Database Tables**: `teams`
- **Status**: ⚠️ Needs verification

#### `GET /leagues/options/filters` (via api.getLeagueFilterOptions)
- **Description**: Get available filter options for leagues
- **Query Params**: None
- **Response**:
```typescript
{
  organizations: string[]
  seasons: string[]
  age_groups: string[]
  genders: string[]
  divisions: string[]
  levels: string[]
}
```
- **Database Tables**: `leagues` (distinct queries)
- **Status**: ⚠️ Needs verification

### Data Structures:
```typescript
interface League {
  id: string
  organization: string
  age_group: string
  gender: string
  division: string
  season: string
  level: 'Recreational' | 'Competitive' | 'Elite'
  team_count?: number
  game_count?: number
}

interface Team {
  id: string
  league_id: string
  name: string
  rank: number
  location?: string
  contact_email?: string
  contact_phone?: string
  game_count?: number
}

interface BulkLeagueForm {
  organization: string
  age_groups: string[]
  genders: string[]
  divisions: string[]
  season: string
  level: string
}
```

### Notes:
- Bulk operations critical for efficiency
- Pattern-based team generation
- Preview before creation
- Validation against duplicates
- Statistics aggregation (team counts, game counts)

---

## Summary Statistics

### Implementation Status:
- ✅ **Fully Implemented**: 4 endpoints
- ⚠️ **Partially Implemented / Needs Verification**: 20 endpoints
- ❌ **Not Implemented**: 3 endpoints

### Database Tables Required:
- `users`, `roles`, `permissions`, `user_roles`, `role_permissions`
- `mentorships`
- `budgets`, `budget_periods`, `budget_categories`
- `games`, `teams`, `leagues`, `game_assignments`
- `expenses`, `expense_receipts`, `transactions`
- `referee_profiles`, `referee_types`
- `sessions`

### Priority Recommendations:

#### High Priority (Critical for basic functionality):
1. **Budget Management APIs** - Budget tracking is partially broken
2. **Financial Dashboard API** - Consolidate financial data sources
3. **Organizational Analytics API** - Complex but high-value feature
4. **League/Team Bulk Operations** - Efficiency critical for admins

#### Medium Priority (Enhances user experience):
5. **Calendar Game Queries** - Currently using mock data
6. **Access Control Stats** - Dashboard summary metrics
7. **Referee Wage/Type Updates** - Inline editing support

#### Low Priority (Already working or minor enhancements):
8. **Mentorship APIs** - Appears functional, needs testing
9. **Permission/Role APIs** - Core functionality exists
10. **User Management APIs** - Working well

---

## Next Steps

1. **Backend Route Audit**: Compare these requirements against existing backend routes
2. **Gap Analysis**: Identify which endpoints are missing vs incorrectly implemented
3. **Database Schema Verification**: Ensure tables support required queries
4. **API Documentation**: Update API.md with correct request/response formats
5. **Testing**: Create integration tests for each endpoint
6. **Seed Data**: Ensure development database has realistic test data

---

**End of Document**

## 11. OrganizationSettings

**Path**: `frontend/components/organization-settings.tsx`
**Purpose**: Configure organization-wide settings including payment models and game rates

### Required Endpoints:

#### `GET /api/organization/settings` OR `api.getOrganizationSettings()`
- **Description**: Retrieve current organization settings
- **Query Params**: None
- **Response**:
```typescript
{
  success: boolean
  data: OrganizationSettings
}

interface OrganizationSettings {
  organization_name: string
  payment_model: 'INDIVIDUAL' | 'FLAT_RATE'
  default_game_rate?: number
  updated_at: string
}
```
- **Database Tables**: `organization_settings` OR `organizations`
- **Status**: ⚠️ NEEDS VERIFICATION (API method exists, endpoint needs checking)

#### `PUT /api/organization/settings` OR `api.updateOrganizationSettings()`
- **Description**: Update organization settings
- **Request Body**:
```typescript
{
  organization_name: string
  payment_model: 'INDIVIDUAL' | 'FLAT_RATE'
  default_game_rate?: number  // Required if payment_model is FLAT_RATE
}
```
- **Response**:
```typescript
{
  success: boolean
  data: OrganizationSettings
}
```
- **Database Tables**: `organization_settings` OR `organizations`
- **Validation**:
  - `organization_name` must not be empty
  - If `payment_model` is FLAT_RATE, `default_game_rate` must be positive
- **Status**: ⚠️ NEEDS VERIFICATION

### Data Structures:
```typescript
interface OrganizationSettings {
  organization_name: string
  payment_model: 'INDIVIDUAL' | 'FLAT_RATE'
  default_game_rate?: number
  updated_at: string
}
```

### Notes:
- Payment models affect how referee wages are calculated
- INDIVIDUAL: Each referee paid by individual wage_amount × game multiplier
- FLAT_RATE: Fixed amount per game divided among assigned referees
- Settings are organization-wide (not per-user)

---

## 12. EmployeeManagement

**Path**: `frontend/components/employee-management.tsx`
**Purpose**: Comprehensive employee management with departments, positions, performance tracking

### Required Endpoints:

#### `GET /api/employees` OR `apiClient.getEmployees()`
- **Description**: List employees with advanced filtering and pagination
- **Query Params**:
  - `page` (number): Page number (default: 1)
  - `limit` (number): Results per page (default: 10)
  - `search` (string): Search by name or email
  - `department_id` (string): Filter by department
  - `position_id` (string): Filter by job position
  - `employment_status` (string): `active` | `inactive` | `on_leave` | `terminated` | `probation` | `suspended`
  - `manager_id` (string): Filter by manager
- **Response**:
```typescript
{
  employees: Employee[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```
- **Database Tables**: `employees`, `departments`, `job_positions`, `users`
- **Status**: ❌ NOT IMPLEMENTED (complex employee module)

#### `GET /api/employees/departments` OR `apiClient.getEmployeeDepartments()`
- **Description**: Get all departments for filtering
- **Query Params**: None
- **Response**:
```typescript
Department[]

interface Department {
  id: string
  name: string
  description?: string
}
```
- **Database Tables**: `departments`
- **Status**: ❌ NOT IMPLEMENTED

#### `GET /api/employees/positions` OR `apiClient.getEmployeePositions()`
- **Description**: Get all job positions for filtering
- **Query Params**: None
- **Response**:
```typescript
JobPosition[]

interface JobPosition {
  id: string
  title: string
  department_id?: string
  level?: string
}
```
- **Database Tables**: `job_positions`
- **Status**: ❌ NOT IMPLEMENTED

#### `GET /api/employees/stats` OR `apiClient.getEmployeeStats()`
- **Description**: Get employee statistics for dashboard
- **Query Params**: None
- **Response**:
```typescript
{
  data: EmployeeStats
}

interface EmployeeStats {
  totalEmployees: number
  activeEmployees: number
  departmentBreakdown: Array<{department_name: string, count: number}>
  positionBreakdown: Array<{position_title: string, count: number}>
  newHiresThisMonth: number
  upcomingEvaluations: number
  activeTrainingPrograms: number
  averageTenure: number
}
```
- **Database Tables**: `employees`, `departments`, `job_positions`, `performance_evaluations`, `training_programs`
- **Status**: ❌ NOT IMPLEMENTED

#### `POST /api/employees` OR `apiClient.createEmployee()`
- **Description**: Create new employee record
- **Request Body**:
```typescript
{
  employee_name: string
  employee_email: string
  department_id: string
  position_id: string
  employment_status: string
  hire_date: string
  work_location?: string
  base_salary?: number
  hourly_rate?: number
  employment_type?: string
  manager_id?: string
}
```
- **Database Tables**: `employees`
- **Status**: ❌ NOT IMPLEMENTED

#### `PUT /api/employees/:id` OR `apiClient.updateEmployee()`
- **Description**: Update employee information
- **Request Body**: Same as create (partial updates allowed)
- **Database Tables**: `employees`
- **Status**: ❌ NOT IMPLEMENTED

### Data Structures:
```typescript
interface Employee {
  id: string
  employee_id?: string  // Custom employee number
  employee_name: string
  employee_email: string
  department_id?: string
  department_name?: string
  position_id?: string
  position_title?: string
  position_level?: string
  employment_status: 'active' | 'inactive' | 'on_leave' | 'terminated' | 'probation' | 'suspended'
  hire_date: string
  work_location?: string
  base_salary?: number
  hourly_rate?: number
  employment_type?: string
  manager_id?: string
  manager_name?: string
  latest_overall_rating?: number  // 1-5 stars
  latest_evaluation_date?: string
  completed_trainings?: number
  active_trainings?: number
  created_at: string
  updated_at?: string
}

interface Department {
  id: string
  name: string
  description?: string
}

interface JobPosition {
  id: string
  title: string
  department_id?: string
  level?: string
  description?: string
}
```

### Notes:
- Complex module with performance tracking integration
- Requires multiple related tables (employees, departments, positions, evaluations, training)
- Salary information should be protected (role-based access)
- Status badges: active (green), inactive (gray), on_leave (yellow), terminated (red), probation (orange), suspended (red)
- Training progress calculated as completed/(completed+active)
- Retry logic with exponential backoff built into frontend

---

## 13. ComplianceTracking

**Path**: `frontend/components/compliance-tracking.tsx`
**Purpose**: Manage compliance requirements, incidents, and risk assessments

### Required Endpoints:

#### `GET /api/compliance/tracking` OR `apiClient.getComplianceTracking()`
- **Description**: Get compliance items with filtering
- **Query Params**:
  - `category` (string): Filter by category
  - `status` (string): `pending` | `in_progress` | `completed` | `overdue` | `cancelled`
  - `priority` (string): `high` | `medium` | `low`
  - `assigned_to` (string): Filter by assigned user
  - `page` (number): Pagination
  - `limit` (number): Results per page
- **Response**:
```typescript
{
  items: ComplianceItem[]
}
```
- **Database Tables**: `compliance_items`
- **Status**: ❌ NOT IMPLEMENTED

#### `GET /api/compliance/incidents` OR `apiClient.getComplianceIncidents()`
- **Description**: Get compliance incidents
- **Query Params**:
  - `limit` (number): Results limit
- **Response**:
```typescript
{
  incidents: ComplianceIncident[]
}
```
- **Database Tables**: `compliance_incidents`
- **Status**: ❌ NOT IMPLEMENTED

#### `GET /api/compliance/risks` OR `apiClient.getRiskAssessments()`
- **Description**: Get risk assessments
- **Query Params**:
  - `limit` (number): Results limit
- **Response**:
```typescript
{
  assessments: RiskAssessment[]
}
```
- **Database Tables**: `risk_assessments`
- **Status**: ❌ NOT IMPLEMENTED

#### `GET /api/compliance/dashboard` OR `apiClient.getComplianceDashboard()`
- **Description**: Get compliance dashboard metrics
- **Query Params**: None
- **Response**:
```typescript
{
  data: ComplianceDashboard
}

interface ComplianceDashboard {
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
```
- **Database Tables**: `compliance_items`, `compliance_incidents`, `risk_assessments`
- **Status**: ❌ NOT IMPLEMENTED

#### `PUT /api/compliance/items/:id` OR `apiClient.updateComplianceItem()`
- **Description**: Update compliance item (e.g., change status)
- **Request Body**:
```typescript
{
  status?: string
  assigned_to?: string
  notes?: string
}
```
- **Database Tables**: `compliance_items`
- **Status**: ❌ NOT IMPLEMENTED

#### `POST /api/compliance/incidents` OR `apiClient.createComplianceIncident()`
- **Description**: Create new compliance incident
- **Request Body**:
```typescript
{
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  incident_date: string
  location?: string
}
```
- **Database Tables**: `compliance_incidents`
- **Status**: ❌ NOT IMPLEMENTED

#### `POST /api/compliance/risks` OR `apiClient.createRiskAssessment()`
- **Description**: Create new risk assessment
- **Request Body**:
```typescript
{
  title: string
  description?: string
  category: string
  probability: number  // 1-5
  impact: number  // 1-5
  current_controls?: string
  additional_controls?: string
  responsible_person?: string
}
```
- **Database Tables**: `risk_assessments`
- **Status**: ❌ NOT IMPLEMENTED

### Data Structures:
```typescript
interface ComplianceItem {
  id: string
  title: string
  description?: string
  category: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled'
  priority: 'high' | 'medium' | 'low'
  due_date: string
  assigned_to?: string
  assigned_to_name?: string
  evidence_required: boolean
  evidence_provided: boolean
  created_at: string
}

interface ComplianceIncident {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  status: string
  incident_date: string
  location?: string
  reported_by?: string
  reported_by_name?: string
  immediate_actions?: string
  root_cause?: string
  created_at: string
}

interface RiskAssessment {
  id: string
  title: string
  description?: string
  category: string
  probability: number  // 1-5
  impact: number  // 1-5
  risk_level: 'low' | 'medium' | 'high' | 'critical'  // Calculated: probability * impact
  status: string
  current_controls?: string
  additional_controls?: string
  responsible_person?: string
  responsible_person_name?: string
  created_at: string
}
```

### Notes:
- Three related subsystems: compliance items, incidents, risk assessments
- Risk level calculated automatically: (probability × impact) -> low/medium/high/critical
- Compliance trends track score over time
- Evidence management for compliance items
- Due soon = within 30 days
- Export functionality planned

---
## 14. UnifiedRoleEditor

**Path**: `frontend/components/admin/rbac/UnifiedRoleEditor.tsx`
**Purpose**: Create and edit roles with permissions and page access in unified interface

### Required Endpoints:

#### `GET /api/admin/permissions/available` OR `apiClient.getAvailablePermissions()`
- **Description**: Get all available permissions grouped by resource
- **Query Params**: None
- **Response**:
```typescript
{
  success: boolean
  data: {
    groupedByResource: Record<string, string[]>
  }
}

// Example:
{
  "user": ["user:view", "user:create", "user:update", "user:delete"],
  "game": ["game:view", "game:create", "game:update", "game:delete"],
  ...
}
```
- **Database Tables**: `permissions`
- **Status**: ⚠️ NEEDS VERIFICATION

#### `POST /api/admin/roles/unified` OR `apiClient.createUnifiedRole()`
- **Description**: Create new role with permissions and page access
- **Request Body**:
```typescript
{
  name: string  // Must be lowercase with underscores (e.g., "super_admin")
  description?: string
  permissions: string[]
  pages: string[]
  color?: string
}
```
- **Response**:
```typescript
{
  success: boolean
  message: string
}
```
- **Database Tables**: `roles`, `role_permissions`, `role_page_access`
- **Validation**:
  - `name` must match pattern: `/^[a-z_]+$/`
  - `name` must be unique
  - Cannot be changed after creation
- **Status**: ❌ NOT IMPLEMENTED

#### `PUT /api/admin/roles/unified/:id` OR `apiClient.updateUnifiedRole()`
- **Description**: Update existing role (name cannot be changed)
- **Request Body**:
```typescript
{
  description?: string
  permissions: string[]
  pages: string[]
  color?: string
}
```
- **Note**: Name field should NOT be sent (immutable)
- **Database Tables**: `roles`, `role_permissions`, `role_page_access`
- **Status**: ❌ NOT IMPLEMENTED

### Data Structures:
```typescript
interface UnifiedRole {
  id?: string
  name: string
  description?: string
  permissions: string[]
  pages: string[]
  color?: string
  userCount?: number
}

interface AvailablePermissions {
  groupedByResource: Record<string, string[]>
}

// Example page IDs:
type PageId =
  | 'admin_audit_logs'
  | 'admin_permissions'
  | 'admin_page_access'
  | 'admin_users'
  | 'admin_roles'
  | 'financial_dashboard'
  | 'budget'
  | 'games'
  | 'resources'
  | 'notifications'
  | 'settings_notifications'
```

### Notes:
- Three-tab interface: Role Details, Permissions, Pages
- Permissions grouped by resource for better UX
- Page access controls which pages users can view
- Role name immutable after creation (database constraint)
- Auto-sanitizes role name input (lowercase, underscores only)
- Search/filter functionality for permissions
- Expandable permission groups
- Select all/deselect all per group
- Color picker for role badges
- Shows user count for existing roles

---

## 15. RBACRegistryDashboard

**Path**: `frontend/components/admin/rbac/RBACRegistryDashboard.tsx`
**Purpose**: Automated discovery and configuration of RBAC resources (pages, endpoints, functions)

### Required Endpoints:

#### `GET /api/admin/rbac-registry/stats`
- **Description**: Get registry statistics
- **Query Params**: None
- **Response**:
```typescript
{
  success: boolean
  data: RegistryStats
}

interface RegistryStats {
  pages: { total: number; unconfigured: number; auto_detected: number }
  endpoints: { total: number; unconfigured: number; auto_detected: number }
  functions: { total: number; unconfigured: number; auto_detected: number }
  lastScan: string | null
}
```
- **Database Tables**: `rbac_registry_pages`, `rbac_registry_endpoints`, `rbac_registry_functions`
- **Status**: ❌ NOT IMPLEMENTED (Advanced RBAC feature)

#### `GET /api/admin/rbac-registry/unconfigured`
- **Description**: Get unconfigured resources needing permission assignment
- **Query Params**: None
- **Response**:
```typescript
{
  success: boolean
  data: {
    pages: UnconfiguredItem[]
    endpoints: UnconfiguredItem[]
    functions: UnconfiguredItem[]
  }
}
```
- **Database Tables**: `rbac_registry_*`
- **Status**: ❌ NOT IMPLEMENTED

#### `GET /api/admin/rbac-registry/scan-history`
- **Description**: Get scan history
- **Query Params**:
  - `limit` (number): Number of history entries to return
- **Response**:
```typescript
{
  success: boolean
  data: {
    history: ScanHistory[]
  }
}
```
- **Database Tables**: `rbac_scan_history`
- **Status**: ❌ NOT IMPLEMENTED

#### `GET /api/admin/rbac-registry/scan`
- **Description**: Trigger new codebase scan for RBAC resources
- **Query Params**: None
- **Response**:
```typescript
{
  success: boolean
  message: string
  data: {
    newItems: number
  }
}
```
- **Process**: Scans filesystem for:
  - Pages in `app/` directory
  - API endpoints in route files
  - Functions requiring permission checks
- **Status**: ❌ NOT IMPLEMENTED (Complex feature requiring filesystem scanning)

#### `POST /api/admin/rbac-registry/configure`
- **Description**: Configure selected unconfigured items
- **Request Body**:
```typescript
{
  type: 'page' | 'endpoint' | 'function'
  items: UnconfiguredItem[]
}
```
- **Database Tables**: `rbac_registry_*`, `role_permissions`
- **Status**: ❌ NOT IMPLEMENTED

#### `POST /api/admin/rbac-registry/auto-configure`
- **Description**: Automatically configure resources based on suggested permissions
- **Request Body**:
```typescript
{
  type: 'page' | 'endpoint' | 'function'
  applyAll: boolean
}
```
- **Database Tables**: `rbac_registry_*`
- **Status**: ❌ NOT IMPLEMENTED

#### `POST /api/admin/rbac-registry/export-config`
- **Description**: Export RBAC configuration for review
- **Response**:
```typescript
{
  success: boolean
  data: {
    configContent: string  // YAML or JSON format
  }
}
```
- **Status**: ❌ NOT IMPLEMENTED

### Data Structures:
```typescript
interface UnconfiguredItem {
  id: number
  page_path?: string
  page_name?: string
  page_category?: string
  method?: string  // GET, POST, PUT, DELETE
  endpoint_path?: string
  function_name?: string
  module_path?: string
  category?: string
  suggested_permissions: string[]
  risk_level?: 'low' | 'medium' | 'high' | 'critical'
  auto_detected: boolean
  created_at: string
}

interface ScanHistory {
  id: number
  scan_started_at: string
  scan_completed_at: string | null
  duration_ms: number | null
  pages_found: number
  endpoints_found: number
  functions_found: number
  new_items_registered: number
  scan_type: 'automated' | 'manual' | 'startup'
  status: 'running' | 'completed' | 'failed'
  error_message?: string
}
```

### Notes:
- **Advanced RBAC automation feature**
- Scans codebase to discover new routes/pages/functions
- Suggests permissions based on naming conventions
- Risk levels calculated from endpoint type and permissions required
- Manual and auto-configure options
- Configuration export for review before applying
- Scan history tracking for audit trail
- Five-tab interface: Overview, Pages, Endpoints, Functions, History
- Checkbox selection for batch operations

---

## 16. UserTable

**Path**: `frontend/components/admin/users/UserTable.tsx`
**Purpose**: Display users in table format with role badges, referee info, and inline editing

### Required Endpoints:

**Note**: This component is a presentation component that receives data from parent components. It makes NO direct API calls itself. However, it accepts callback functions that may trigger these API calls:

#### Parent-Triggered Endpoints (via callbacks):
- `onWageUpdate` callback may trigger: `PUT /api/referees/:id/wage` OR `PATCH /api/users/:id`
- `onTypeChange` callback may trigger: `PUT /api/referees/:id/type`

### Data Structures:
```typescript
interface User {
  id: string
  name: string
  email: string
  role: string  // Legacy single role
  legacy_role?: string
  roles?: Role[]  // New RBAC multi-role system
  is_available?: boolean
  is_active?: boolean
  is_referee?: boolean
  referee_profile?: RefereeProfile | null
  year_started_refereeing?: number
  created_at: string
  updated_at?: string
}

interface Role {
  id: string
  name: string
  description?: string
  category?: string  // 'referee_type' | 'referee_capability' | etc.
  color?: string
  referee_config?: any
}

interface RefereeProfile {
  id: string
  wage_amount: number
  evaluation_score?: number
  is_white_whistle: boolean
  show_white_whistle: boolean
  referee_type: Role | null
  capabilities: Role[]
  computed_fields: {
    type_config: any
    capability_count: number
    is_senior: boolean
    is_junior: boolean
    is_rookie: boolean
  }
}
```

### Notes:
- Pure presentation component with no API calls
- Supports pagination (controlled by parent)
- Optional referee-specific columns (wages, experience)
- Inline wage editing via EditableWage component
- ScrollableRoleTabs for multi-role display
- Role badges styled by category (referee_type, referee_capability, etc.)
- Dropdown menu actions: View, Edit, Email, Delete
- Calculates years of experience from year_started_refereeing
- Handles both legacy single-role and new multi-role systems

---

## 17. MentorshipManagementEnhanced

**Path**: `frontend/components/admin/mentorship/MentorshipManagementEnhanced.tsx`
**Purpose**: Enhanced mentorship management with filterable table and status updates

### Required Endpoints:

#### `GET /mentorships`
- **Description**: List mentorships with mentor/mentee details
- **Query Params**: None (filtering done client-side via FilterableTable)
- **Response**:
```typescript
{
  data: {
    data: {
      data: MentorshipData[]
    }
  }
}
// OR simplified:
{
  data: {
    data: MentorshipData[]
  }
}
// OR:
{
  data: {
    mentorships: MentorshipData[]
  }
}
```
- **Note**: API response structure is deeply nested; frontend handles multiple formats
- **Database Tables**: `mentorships`, `users`
- **Status**: ✅ EXISTS (needs response format standardization)

#### `GET /users`
- **Description**: Get all users for mentor/mentee selection
- **Query Params**: None
- **Response**:
```typescript
{
  data: {
    users: User[]
  }
}
```
- **Database Tables**: `users`, `user_roles`
- **Status**: ✅ EXISTS

#### `POST /mentorships`
- **Description**: Create new mentorship
- **Request Body**:
```typescript
{
  mentor_id: string
  mentee_id: string
  start_date: string  // ISO date
  notes?: string
}
```
- **Response**:
```typescript
{
  data: {
    success: boolean
  }
}
// OR:
{
  data: {
    data: MentorshipData
  }
}
```
- **Validation**:
  - Cannot create duplicate active mentorship for same mentor-mentee pair
  - Mentor must have qualifying role (Mentor, Senior Referee, Head Referee, etc.)
  - Mentee must have qualifying role (Referee, Junior Referee, Rookie Referee)
- **Database Tables**: `mentorships`
- **Status**: ✅ EXISTS

#### `PUT /mentorships/:id`
- **Description**: Update mentorship status
- **Request Body**:
```typescript
{
  status: 'active' | 'paused' | 'completed' | 'terminated'
}
```
- **Response**:
```typescript
{
  data: {
    success: boolean
  }
}
// OR:
{
  data: {
    mentorship: MentorshipData
  }
}
```
- **Database Tables**: `mentorships`
- **Status**: ✅ EXISTS

### Data Structures:
```typescript
interface MentorshipData {
  id: string
  mentor_id: string
  mentee_id: string
  mentor_name?: string
  mentor_email?: string
  mentee_name?: string
  mentee_email?: string
  start_date: string
  end_date?: string
  status: 'active' | 'paused' | 'completed' | 'terminated'
  notes?: string
  created_at: string
  updated_at?: string
}

interface User {
  id: string
  name: string
  email: string
  roles?: Array<{ name: string }>
}
```

### Notes:
- Enhanced version of MentorshipManagement with FilterableTable
- Statistics cards: Total, Active, Paused, Completed, Terminated
- Mentor selection filtered by qualifying roles
- Mentee selection filtered by referee roles
- Prevents duplicate active mentorships
- Status transition dropdown: Active ↔ Paused, Active/Paused → Completed/Terminated
- Uses date-fns for date formatting
- FilterableTable with search and status filtering

---

## 18. CerbosRoleEditor

**Path**: `frontend/components/admin/rbac/CerbosRoleEditor.tsx`
**Purpose**: Create/edit roles with distinction between database roles and Cerbos policy roles

### Required Endpoints:

#### `GET /api/roles/available` OR `apiClient.getAvailableRoles()`
- **Description**: Get available roles for parent role selection
- **Query Params**: None
- **Response**:
```typescript
{
  data: {
    roles: Array<{ name: string }>
  }
}
```
- **Database Tables**: `roles`
- **Status**: ⚠️ NEEDS VERIFICATION

#### `GET /api/cerbos/roles/:name/permissions` OR `apiClient.getRolePermissionsFromCerbos()`
- **Description**: Get permissions for a Cerbos role
- **Path Params**: `name` - Role name
- **Response**:
```typescript
{
  data: {
    permissions: string[]
  }
}
```
- **Source**: Cerbos policy files
- **Status**: ❌ NOT IMPLEMENTED (requires Cerbos integration)

#### Database Mode Endpoints:

##### `POST /api/roles` OR `apiClient.createRole()`
- **Description**: Create database role (just metadata/label)
- **Request Body**:
```typescript
{
  name: string
  description: string
  color: string
  is_active: boolean
}
```
- **Database Tables**: `roles`
- **Status**: ⚠️ EXISTS (verify column names)

##### `PUT /api/roles/:id` OR `apiClient.updateRole()`
- **Description**: Update database role metadata
- **Request Body**: Same as create
- **Database Tables**: `roles`
- **Status**: ⚠️ EXISTS

#### Cerbos Mode Endpoints:

##### `POST /api/cerbos/roles` OR `apiClient.createCerbosRole()`
- **Description**: Create Cerbos policy role with permissions
- **Request Body**:
```typescript
{
  name: string
  parentRoles?: string[]
  condition?: any
}
```
- **File Target**: `cerbos-policies/derived_roles/`
- **Status**: ❌ NOT IMPLEMENTED

##### `PUT /api/cerbos/roles/:name` OR `apiClient.updateCerbosRole()`
- **Description**: Update Cerbos policy role
- **Request Body**: Same as create
- **File Target**: `cerbos-policies/derived_roles/`
- **Status**: ❌ NOT IMPLEMENTED

##### `DELETE /api/cerbos/roles/:name` OR `apiClient.deleteCerbosRole()`
- **Description**: Delete Cerbos policy role
- **File Target**: `cerbos-policies/derived_roles/`
- **Status**: ❌ NOT IMPLEMENTED

##### `PUT /api/cerbos/roles/:name/permissions` OR `apiClient.updateRolePermissionsInCerbos()`
- **Description**: Update permissions for Cerbos role
- **Request Body**:
```typescript
{
  permissions: string[]
}
```
- **File Target**: `cerbos-policies/resources/`
- **Status**: ❌ NOT IMPLEMENTED

### Data Structures:
```typescript
interface CerbosRole {
  id?: string
  name: string
  description?: string
  parentRoles?: string[]
  isDatabase?: boolean  // UI flag only
}

// Available permissions (hardcoded in component)
const AVAILABLE_PERMISSIONS = [
  'user:view', 'user:create', 'user:update', 'user:delete',
  'role:view', 'role:create', 'role:update', 'role:delete',
  'game:view', 'game:create', 'game:update', 'game:delete',
  'assignment:view', 'assignment:create', 'assignment:update', 'assignment:delete',
  'referee:view', 'referee:create', 'referee:update', 'referee:delete',
  'system:admin', 'system:manage', 'system:view:logs', 'system:view:audit',
  'cerbos_policy:view', 'cerbos_policy:create', 'cerbos_policy:update', 'cerbos_policy:delete', 'cerbos_policy:manage'
]
```

### Notes:
- **Two-mode editor**: Database roles vs Cerbos policies
- **Database Mode**: Creates role labels in DB (for user assignment) - NO permissions
- **Cerbos Mode**: Creates actual permission policies (defines what roles can do)
- Warning: Database roles are just labels without permissions
- Parent roles allow permission inheritance
- Cerbos operations require filesystem/policy file management
- If renaming Cerbos role, deletes old and creates new
- Permissions stored in Cerbos YAML policy files
- Database operations simpler (just DB records)
- Alert messages explain differences between modes

---

## 19. DynamicRolePageAccessManager

**Path**: `frontend/components/admin/rbac/DynamicRolePageAccessManager.tsx` (705 lines)
**Purpose**: Advanced RBAC page access manager with automated page discovery from filesystem and registry integration

### Component Analysis:
- **Features**:
  - Dynamic page registry integration with fallback to static pages
  - Automated filesystem scanning to detect new pages, endpoints, and functions
  - Search and filtering capabilities
  - Grid/List view toggle
  - Category-based page organization
  - Auto-detected page highlighting
  - Bulk page access assignment
  - Cache clearing for immediate permission updates

### Required Endpoints:

#### `GET /api/admin/rbac-registry/pages`
- **Description**: Retrieve all registered pages from the dynamic RBAC registry
- **Query Params**: None
- **Response**:
```typescript
{
  success: boolean
  data: {
    pages: Array<{
      id?: number
      page_path: string
      page_name: string
      page_category: string
      page_description?: string
      suggested_permissions?: string[]
      is_protected?: boolean
      auto_detected?: boolean
      needs_configuration?: boolean
    }>
  }
}
```
- **Database Tables**:
  - `rbac_registry_pages` (id, page_path, page_name, page_category, page_description, suggested_permissions, is_protected, auto_detected, needs_configuration, created_at, updated_at)
- **Status**: ❌ **MISSING** - Critical for dynamic RBAC system

#### `GET /api/admin/rbac-registry/stats`
- **Description**: Get RBAC registry statistics (total pages, endpoints, functions discovered)
- **Query Params**: None
- **Response**:
```typescript
{
  success: boolean
  data: {
    total_pages: number
    total_endpoints: number
    total_functions: number
    total_permissions: number
    auto_detected_count: number
    manually_added_count: number
    needs_configuration_count: number
    last_scan_date?: string
  }
}
```
- **Database Tables**:
  - `rbac_registry_pages`, `rbac_registry_endpoints`, `rbac_registry_functions`, `rbac_registry_stats`
- **Status**: ❌ **MISSING** - Required for registry dashboard

#### `GET /api/admin/rbac-registry/scan`
- **Description**: Trigger filesystem scan to discover new pages, endpoints, and functions
- **Query Params**:
  - `force?: boolean` - Force rescan even if recently scanned
  - `path?: string` - Scan specific directory
- **Response**:
```typescript
{
  success: boolean
  data: {
    scan_completed: boolean
    pages_discovered: number
    endpoints_discovered: number
    functions_discovered: number
    new_items: number
    updated_items: number
    scan_duration_ms: number
    errors?: string[]
  }
}
```
- **Implementation**: Should scan `frontend/` directory for page components, API route files for endpoints, and extract exported functions
- **Database Tables**:
  - `rbac_registry_pages`, `rbac_registry_endpoints`, `rbac_registry_functions`, `rbac_registry_scans`
- **Status**: ❌ **MISSING** - Core automation feature

#### `GET /api/admin/roles/:roleId/page-access`
- **Description**: Get page access configuration for a specific role
- **Path Params**: `roleId` - Role identifier
- **Response**:
```typescript
{
  success: boolean
  data: {
    role_id: string
    role_name: string
    accessible_pages: string[]
    accessible_categories: string[]
    page_access_config: Record<string, boolean>
  }
}
```
- **Database Tables**:
  - `role_page_access` (id, role_id, page_path, can_access, granted_at, granted_by)
- **Status**: ⚠️ **PARTIALLY IMPLEMENTED** - Needs registry integration

#### `PUT /api/admin/roles/:roleId/page-access`
- **Description**: Update page access permissions for a role
- **Path Params**: `roleId` - Role identifier
- **Request Body**:
```typescript
{
  pages: string[]  // Array of page paths to grant access to
  categories?: string[]  // Optional: grant access to all pages in categories
  grant_all?: boolean  // Optional: grant access to all pages
}
```
- **Response**:
```typescript
{
  success: boolean
  data: {
    role_id: string
    updated_pages_count: number
    accessible_pages: string[]
  }
  message: string
}
```
- **Database Tables**:
  - `role_page_access`
- **Validation**:
  - Prevent system admin role from losing access to critical pages
  - Validate page paths exist
- **Status**: ⚠️ **PARTIALLY IMPLEMENTED** - Needs validation improvements

#### `DELETE /api/admin/access-cache`
- **Description**: Clear access control cache to apply permission changes immediately
- **Query Params**:
  - `scope?: 'all' | 'role' | 'user'`
  - `identifier?: string` - Role ID or User ID when scope is 'role' or 'user'
- **Response**:
```typescript
{
  success: boolean
  message: string
  cache_entries_cleared: number
}
```
- **Implementation**: Clear Redis/memory cache for Cerbos decisions, role permissions, page access
- **Status**: ❌ **MISSING** - Required for real-time permission updates

---

## 20. PermissionSelector

**Path**: `frontend/components/admin/rbac/PermissionSelector.tsx` (319 lines)
**Purpose**: Reusable permission selection component with category grouping and collapsible sections

### Component Analysis:
- **Features**:
  - Search functionality across permissions
  - Category-based grouping with color coding
  - Collapsible category sections
  - Select all/deselect all per category
  - Visual feedback for selected permissions
  - Disabled state support
  - Count badges showing selected permissions per category

### Required Endpoints:

#### `GET /api/admin/permissions`
- **Description**: Get all available permissions grouped by category/resource
- **Query Params**:
  - `include_system?: boolean` - Include system-level permissions
  - `resource_filter?: string` - Filter by resource type
- **Response**:
```typescript
{
  success: boolean
  data: {
    permissions: {
      [category: string]: Array<{
        id: string
        name: string
        code: string
        description?: string
        resource: string
        action: string
        system_permission?: boolean
      }>
    }
  }
}
```
- **Example Categories**:
  - `games` (bg-blue-500)
  - `assignments` (bg-green-500)
  - `referees` (bg-purple-500)
  - `financial` (bg-yellow-500)
  - `admin` (bg-red-500)
  - `reports` (bg-orange-500)
  - `system` (bg-gray-500)
- **Database Tables**:
  - `permissions` (id, name, code, description, resource, action, category, is_system_permission, created_at)
- **Status**: ⚠️ **PARTIALLY IMPLEMENTED** - Needs category grouping logic

---

## 21. RoleManagementDashboard

**Path**: `frontend/components/admin/rbac/RoleManagementDashboard.tsx` (310 lines)
**Purpose**: Main role management interface with CRUD operations for unified roles (database + Cerbos)

### Component Analysis:
- **Features**:
  - Fetches unified roles combining database and Cerbos data
  - Active/Inactive role sections
  - User count and permission count per role
  - Integrates UnifiedRoleEditor, PermissionMatrix, UserRoleManager
  - Delete confirmation with user assignment validation
  - Real-time role statistics
  - Error handling for 401 (expired session) and 403 (insufficient permissions)

### Required Endpoints:

#### `GET /api/admin/unified-roles`
- **Description**: Get all roles with combined database and Cerbos policy data
- **Query Params**:
  - `include_users?: boolean` - Include user count
  - `include_permissions?: boolean` - Include permission count
  - `include_pages?: boolean` - Include accessible pages
- **Response**:
```typescript
{
  success: boolean
  data: {
    roles: Array<{
      id: string
      name: string
      description: string
      color?: string
      is_active: boolean
      user_count: number
      permission_count: number
      pages?: string[]
      created_at: string
      updated_at: string
      source: 'database' | 'cerbos' | 'unified'
      cerbos_policy_exists: boolean
      parent_roles?: string[]
    }>
  }
}
```
- **Database Tables**:
  - `roles` (id, name, code, description, color, is_active, created_at, updated_at)
  - `user_roles` (for user_count)
  - `role_permissions` (for permission_count)
  - Integration with Cerbos API for policy data
- **Status**: ⚠️ **PARTIALLY IMPLEMENTED** - Needs better Cerbos integration

#### `DELETE /api/admin/unified-roles/:roleName`
- **Description**: Delete a role from both database and Cerbos policies
- **Path Params**: `roleName` - Role name to delete
- **Response**:
```typescript
{
  success: boolean
  message: string
  deleted_from: {
    database: boolean
    cerbos: boolean
  }
  affected_users?: number
}
```
- **Validation**:
  - Prevent deletion of system roles (admin, referee, assignor)
  - Prevent deletion if users are assigned to role (or provide force flag)
  - Return error if role has users: "Cannot delete role. {count} users are assigned to this role."
- **Database Tables**:
  - `roles`, `user_roles`, `role_permissions`, `role_page_access`
  - Cerbos policy files
- **Status**: ⚠️ **PARTIALLY IMPLEMENTED** - Needs user assignment check

---

## 22. RolePageAccessManager

**Path**: `frontend/components/admin/rbac/RolePageAccessManager.tsx` (520 lines)
**Purpose**: Static page access configuration manager for assigning page-level permissions to roles

### Component Analysis:
- **Features**:
  - Static PAGE_CATEGORIES configuration with 33 pages across 6 categories
  - Tab-based navigation by category
  - Allow All/Deny All per category
  - Grid/List view toggle
  - Change tracking with unsaved changes warning
  - System admin role protection (cannot lose access to admin pages)
  - Visual feedback for access changes

### Static Configuration:
```typescript
PAGE_CATEGORIES = {
  'Sports Management': 11 pages (dashboard, leagues, games, teams, locations, self-assign, assignments, game-fees, referee-types, calendar, availability)
  'Financial': 7 pages (financial-dashboard, receipts, budgets, expenses, purchase-orders, reports, credit-cards)
  'Organization': 5 pages (organization-settings, employee-management, company-assets, compliance-tracking, communications)
  'Analytics': 1 page (organizational-analytics)
  'Administration': 7 pages (users, roles, permissions, settings, rbac-management, page-access, mentorships)
  'Account': 2 pages (profile, notifications)
}
```

### Required Endpoints:

#### `GET /api/admin/roles`
- **Description**: Get all roles for page access configuration
- **Query Params**:
  - `include_page_access?: boolean` - Include page access data
- **Response**:
```typescript
{
  success: boolean
  data: {
    roles: Array<{
      id: string
      name: string
      description?: string
      is_system_role: boolean
      page_access?: {
        accessible_pages: string[]
        accessible_categories: string[]
      }
    }>
  }
}
```
- **Database Tables**:
  - `roles`, `role_page_access`
- **Status**: ✅ **EXISTS** - May need page_access enhancement

#### `GET /api/admin/roles/:roleId/page-access` (duplicate reference)
- See endpoint #19 above
- **Status**: ⚠️ **PARTIALLY IMPLEMENTED**

#### `PUT /api/admin/roles/:roleId/page-access` (duplicate reference)
- See endpoint #19 above
- **Additional Features for Static Manager**:
  - Support category-level access grants
  - Protect system admin from losing critical access
- **Status**: ⚠️ **PARTIALLY IMPLEMENTED**

#### `DELETE /api/admin/access-cache` (duplicate reference)
- See endpoint #19 above
- **Status**: ❌ **MISSING**

---

## 23. assignor-dashboard-overview

**Path**: `frontend/components/assignor-dashboard-overview.tsx` (330 lines)
**Purpose**: Role-specific dashboard for Assignor users showing assignment statistics, upcoming games, and referee availability

### Component Analysis:
- **Features**:
  - Real-time game and referee statistics
  - Calculates unassigned, partially assigned, and fully assigned games
  - Upcoming games (next 7 days) needing assignments
  - Recent assignment activity
  - Assignment performance metrics (today, this week)
  - Quick action buttons for assigning referees
  - Referee availability tracking

### Data Calculations:
```typescript
- unassigned: games.filter(g => g.assignedCount === 0).length
- partial: games.filter(g => g.assignedCount > 0 && g.assignedCount < refsNeeded).length
- full: games.filter(g => g.assignedCount >= refsNeeded).length
- upcoming: games in next 7 days with assignedCount < refsNeeded, sorted by date
```

### Required Endpoints:

#### `GET /api/games`
- **Description**: Get games with assignment counts (existing endpoint, needs enhancement)
- **Query Params**:
  - `limit?: number`
  - `status?: string`
  - `include_assignments?: boolean` - Include full assignment data
  - `include_assignment_counts?: boolean` - Include quick counts
- **Response Enhancement**:
```typescript
{
  data: Array<{
    id: string
    homeTeam: any
    awayTeam: any
    date: string
    time: string
    location: any
    refsNeeded: number
    assignedCount: number  // NEW: Count of assigned referees
    assignments?: Assignment[]  // Existing
    status: 'assigned' | 'unassigned' | 'partial'  // NEW: Derived status
  }>
}
```
- **Database Tables**:
  - `games`, `game_assignments`
- **Status**: ⚠️ **NEEDS ENHANCEMENT** - Add assignedCount calculation

#### `GET /api/referees`
- **Description**: Get all referees with availability status (existing endpoint)
- **Query Params**:
  - `available_only?: boolean` - Filter to available referees
  - `include_stats?: boolean` - Include assignment statistics
- **Response**:
```typescript
{
  success: boolean
  data: {
    referees: Array<{
      id: string
      name: string
      email: string
      isAvailable: boolean
      level?: string
      total_assignments?: number
      upcoming_assignments?: number
      completion_rate?: number
    }>
  }
}
```
- **Database Tables**:
  - `referees`, `game_assignments`
- **Status**: ✅ **EXISTS** - May need availability tracking

#### `GET /api/assignments/recent`
- **Description**: Get recent assignment activity for the assignor dashboard
- **Query Params**:
  - `limit?: number` (default: 10)
  - `assignor_id?: string` - Filter by specific assignor
  - `days?: number` - Assignments within last N days
- **Response**:
```typescript
{
  success: boolean
  data: {
    assignments: Array<{
      id: string
      gameId: string
      refereeId: string
      refereeName: string
      gameName: string
      gameDate: string
      assignedAt: string
      assignedBy: string
      status: 'pending' | 'accepted' | 'declined' | 'completed'
    }>
  }
}
```
- **Database Tables**:
  - `game_assignments`, `games`, `referees`, `users`
- **Status**: ❌ **MISSING** - New endpoint needed

#### `GET /api/assignments/stats`
- **Description**: Get assignment statistics for the assignor dashboard
- **Query Params**:
  - `assignor_id?: string`
  - `date_from?: string`
  - `date_to?: string`
- **Response**:
```typescript
{
  success: boolean
  data: {
    today: number
    this_week: number
    this_month: number
    pending_approvals: number
    total_games: number
    unassigned_games: number
    partially_assigned_games: number
    fully_assigned_games: number
  }
}
```
- **Database Tables**:
  - `game_assignments`, `games`
- **Status**: ❌ **MISSING** - New endpoint needed

---

## 24. content-manager-dashboard-overview

**Path**: `frontend/components/content-manager-dashboard-overview.tsx` (368 lines)
**Purpose**: Role-specific dashboard for Content Manager users managing resources, documents, and communications

### Component Analysis:
- **Features**:
  - Content statistics (published resources, drafts, total views, pending reviews)
  - Recent resources with status badges (published, draft, review)
  - Recent communications with delivery metrics
  - Content performance tracking (engagement rate, document count)
  - Quick actions for creating resources and sending communications
  - Currently uses **MOCK DATA** - needs real API integration

### Required Endpoints:

#### `GET /api/content/stats`
- **Description**: Get content management statistics for dashboard
- **Query Params**: None
- **Response**:
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
- **Database Tables**:
  - `content_resources` (id, title, category, status, views, author_id, created_at, updated_at)
  - `communications` (for sent count)
  - `content_reviews` (for pending reviews)
- **Status**: ❌ **MISSING** - Currently using mock data

#### `GET /api/content/resources/recent`
- **Description**: Get recent content resources with status and metrics
- **Query Params**:
  - `limit?: number` (default: 5)
  - `status?: 'published' | 'draft' | 'review'`
- **Response**:
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
- **Database Tables**:
  - `content_resources`, `users`
- **Status**: ❌ **MISSING** - New content management feature

#### `GET /api/communications/recent`
- **Description**: Get recent communications with delivery metrics
- **Query Params**:
  - `limit?: number` (default: 5)
  - `include_drafts?: boolean`
- **Response**:
```typescript
{
  success: boolean
  data: {
    communications: Array<{
      id: string
      subject: string
      recipientCount: number
      sentAt: string
      openRate: number
      status: 'sent' | 'scheduled' | 'draft'
    }>
  }
}
```
- **Database Tables**:
  - `communications`, `communication_recipients`, `communication_metrics`
- **Status**: ⚠️ **PARTIALLY IMPLEMENTED** - Needs metrics tracking

---

## 25. communications-management

**Path**: `frontend/components/communications-management.tsx` (657 lines)
**Purpose**: Comprehensive communications management system for announcements, notifications, and team communications

### Component Analysis:
- **Features**:
  - Create, edit, publish, and archive communications
  - Communication types: announcement, assignment, emergency, update
  - Priority levels: low, medium, high, urgent
  - Target audience selection (all users, by role, specific users)
  - Requires acknowledgment flag
  - Scheduled sending support
  - Rich text editor integration
  - Search and filtering (by type, priority, status)
  - Tabs: All, Published, Drafts, Scheduled
  - Acknowledgment tracking
  - Currently has TODO comment: "Implement a proper communications history endpoint"

### Communication Types:
```typescript
announcement: General announcements (icon: Megaphone)
assignment: Game assignment notifications (icon: Bell)
emergency: Urgent communications (icon: AlertTriangle)
update: System or game updates (icon: MessageCircle)
```

### Priority Levels:
```typescript
low: bg-blue-100 text-blue-800 (icon: MessageSquare)
medium: bg-yellow-100 text-yellow-800 (icon: Bell)
high: bg-orange-100 text-orange-800 (icon: AlertCircle)
urgent: bg-red-100 text-red-800 (icon: AlertTriangle)
```

### Required Endpoints:

#### `GET /api/communications`
- **Description**: Get communications history with filtering
- **Query Params**:
  - `status?: 'published' | 'draft' | 'scheduled' | 'archived'`
  - `type?: 'announcement' | 'assignment' | 'emergency' | 'update'`
  - `priority?: 'low' | 'medium' | 'high' | 'urgent'`
  - `search?: string`
  - `limit?: number`
  - `offset?: number`
- **Response**:
```typescript
{
  success: boolean
  data: {
    communications: Array<{
      id: string
      title: string
      content: string
      type: 'announcement' | 'assignment' | 'emergency' | 'update'
      priority: 'low' | 'medium' | 'high' | 'urgent'
      status: 'published' | 'draft' | 'scheduled' | 'archived'
      target_audience: {
        role?: string[]
        specific_users?: string[]
        all_users?: boolean
      }
      requires_acknowledgment: boolean
      scheduled_send_date?: string
      sent_at?: string
      created_at: string
      created_by_id: string
      created_by_name: string
      total_recipients?: number
      acknowledgment_count?: number
    }>
    total: number
  }
}
```
- **Database Tables**:
  - `communications` (id, title, content, type, priority, status, target_audience, requires_acknowledgment, scheduled_send_date, sent_at, created_at, created_by, updated_at)
  - `communication_recipients` (id, communication_id, user_id, sent_at, acknowledged_at)
- **Status**: ❌ **MISSING** - Critical for communications feature

#### `POST /api/notifications/broadcast`
- **Description**: Broadcast notification to target audience (currently used for creating communications)
- **Request Body**:
```typescript
{
  title: string
  message: string
  type: 'assignment' | 'status_change' | 'reminder' | 'system'
  link?: string
  target_audience: {
    role?: string[]
    specific_users?: string[]
    all_users?: boolean
  }
  metadata?: {
    priority: 'low' | 'medium' | 'high' | 'urgent'
    requires_acknowledgment: boolean
  }
}
```
- **Response**:
```typescript
{
  success: boolean
  recipientCount: number
  message: string
}
```
- **Database Tables**:
  - `notifications`, `communications`
- **Status**: ⚠️ **PARTIALLY IMPLEMENTED** - Needs communication persistence

#### `PUT /api/communications/:id`
- **Description**: Update an existing communication (draft or scheduled)
- **Path Params**: `id` - Communication ID
- **Request Body**:
```typescript
{
  title: string
  content: string
  type: string
  priority: string
  target_audience: object
  requires_acknowledgment: boolean
  scheduled_send_date?: string
}
```
- **Response**:
```typescript
{
  success: boolean
  data: Communication
  message: string
}
```
- **Validation**:
  - Cannot edit published communications
  - Can only edit drafts and scheduled communications before send time
- **Database Tables**:
  - `communications`
- **Status**: ❌ **MISSING**

#### `POST /api/communications/:id/publish`
- **Description**: Publish a draft communication
- **Path Params**: `id` - Communication ID
- **Response**:
```typescript
{
  success: boolean
  data: {
    communication_id: string
    status: 'published'
    sent_at: string
    recipients_count: number
  }
  message: string
}
```
- **Implementation**:
  - Update status to 'published'
  - Set sent_at timestamp
  - Trigger notification broadcast to target audience
  - Create communication_recipients records
- **Database Tables**:
  - `communications`, `communication_recipients`, `notifications`
- **Status**: ❌ **MISSING**

---

## 26. credit-card-selector

**Path**: `frontend/components/credit-card-selector.tsx` (735 lines)
**Purpose**: Smart credit card selection component with filtering, validation, and restriction checking

### Component Analysis:
- **Features**:
  - Displays company credit cards with detailed information
  - Smart filtering based on expected amount, vendor, and category
  - Credit limit validation and utilization tracking
  - Transaction amount limit checking
  - Category and vendor restrictions
  - Approval threshold warnings
  - Security features display (Chip & PIN, Contactless, Fraud Protection)
  - Card masking with show/hide toggle
  - Grid display with utilization progress bars
  - Real-time availability checking
  - Fallback to mock data if API fails

### Required Endpoints:

#### `GET /api/company-credit-cards`
- **Description**: Get company credit cards with current balances and restrictions
- **Query Params**:
  - `status?: 'active' | 'suspended' | 'expired' | 'cancelled'`
  - `minRemainingLimit?: number` - Filter cards with sufficient remaining credit
  - `department?: string` - Filter by department
  - `category?: string` - Filter by allowed categories
- **Response**:
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
- **Database Tables**:
  - `company_credit_cards` (id, card_name, card_type, last_4_digits, cardholder_name, issuing_bank, monthly_limit, monthly_spent, billing_cycle_start, billing_cycle_end, billing_due_date, status, expiration_date, department, project_code, created_at, updated_at)
  - `credit_card_authorized_users` (id, credit_card_id, user_id, spending_limit)
  - `credit_card_restrictions` (id, credit_card_id, allowed_categories, allowed_vendors, max_transaction_amount, requires_approval, approval_threshold)
  - `credit_card_transactions` (id, credit_card_id, amount, merchant, transaction_date, category, status, created_at)
- **Status**: ❌ **MISSING** - New financial management feature

---

## 27. dashboard-overview

**Path**: `frontend/components/dashboard-overview.tsx` (632 lines)
**Purpose**: Main dashboard overview with real-time game statistics, upcoming games, referee performance, and announcements

### Component Analysis:
- **Features**:
  - Real-time statistics (total games this week, unassigned games, up-for-grabs, active referees)
  - Upcoming games list with detailed matchup information
  - Unassigned games requiring attention
  - Referee performance metrics (if user is a referee)
  - Team hierarchy display (organization, league, division, season)
  - Wage calculation with multipliers
  - Location details with facilities and capacity
  - Assignment status badges
  - Announcement board integration
  - Enhanced game data with level, game type, and badges

### Data Structures:
```typescript
EnhancedGame: Includes full team objects with league hierarchy, location details, wage multipliers
RefereePerformanceMetrics: Total assignments, completion rate, upcoming games, performance trends (this week, last week, this month)
```

### Required Endpoints:

#### `GET /api/games` (enhanced version)
- **Description**: Get games with full team, location, and assignment data
- **Query Params**:
  - `include_teams?: boolean` - Include full team objects with league hierarchy
  - `include_location?: boolean` - Include location details
  - `include_assignments?: boolean` - Include assignment data
  - `date_from?: string`
  - `date_to?: string`
- **Response Enhancement**:
```typescript
{
  data: Array<{
    id: string
    homeTeam: {
      id: string
      organization: string
      ageGroup: string
      gender: 'Boys' | 'Girls'
      rank: number
      name: string
      league: {
        id: string
        organization: string
        division: string
        season: string
      }
    }
    awayTeam: { /* same structure */ }
    date: string
    time: string
    location: {
      name: string
      address: string
      capacity: number
      facilities: string[]
    }
    level: 'Recreational' | 'Competitive' | 'Elite'
    gameType: 'Community' | 'Club' | 'Tournament' | 'Private Tournament'
    division: string
    payRate: number
    wageMultiplier: number
    wageMultiplierReason: string
    finalWage: number
    refsNeeded: number
    status: 'assigned' | 'unassigned' | 'up-for-grabs' | 'completed' | 'cancelled'
    assignments: Assignment[]
    assignedCount: number
    createdAt: string
    updatedAt: string
  }>
}
```
- **Database Tables**:
  - `games`, `teams`, `leagues`, `locations`, `game_assignments`
- **Status**: ⚠️ **NEEDS MAJOR ENHANCEMENT** - Add full relational data

#### `GET /api/referees` (enhanced with availability)
- **Description**: Get referees with availability status
- **Query Params**:
  - `isAvailable?: boolean` - Filter by availability
- **Response**:
```typescript
{
  success: boolean
  data: {
    referees: Array<{
      id: string
      name: string
      email: string
      isAvailable: boolean
      level: string
      phone?: string
    }>
  }
}
```
- **Database Tables**:
  - `referees`, `referee_availability`
- **Status**: ⚠️ **NEEDS ENHANCEMENT** - Add availability tracking

#### `GET /api/profile`
- **Description**: Get current user profile (existing endpoint)
- **Response Enhancement**:
```typescript
{
  user: {
    id: string
    name: string
    email: string
    referee_id?: string  // NEW: Link to referee record if user is a referee
    roles: string[]
  }
}
```
- **Database Tables**:
  - `users`, `user_roles`
- **Status**: ⚠️ **NEEDS ENHANCEMENT** - Add referee_id field

#### `GET /api/referees/:refereeId/assignments`
- **Description**: Get assignment history for a specific referee
- **Path Params**: `refereeId` - Referee identifier
- **Query Params**:
  - `include_game_details?: boolean`
  - `status?: string`
  - `date_from?: string`
  - `date_to?: string`
- **Response**:
```typescript
{
  success: boolean
  data: {
    assignments: Array<{
      id: string
      gameId: string
      refereeId: string
      assignedAt: string
      status: 'pending' | 'accepted' | 'declined' | 'completed'
      game?: {
        id: string
        homeTeam: any
        awayTeam: any
        date: string
        time: string
        location: any
      }
    }>
    total: number
    completed: number
    upcoming: number
  }
}
```
- **Database Tables**:
  - `game_assignments`, `games`
- **Status**: ⚠️ **PARTIALLY IMPLEMENTED** - Needs enhanced statistics

---

## 28. expense-approval-dashboard

**Path**: `frontend/components/expense-approval-dashboard.tsx` (467 lines)
**Purpose**: Expense approval workflow dashboard for reviewing and approving pending expense submissions

### Component Analysis:
- **Features**:
  - List pending expenses awaiting approval
  - Filter by payment method, category, urgency, amount range
  - Search by description, vendor, or submitter
  - Bulk approve/reject functionality
  - Individual expense review with detailed modal
  - Urgency badges (low, normal, high, critical, overdue)
  - Payment method badges (person reimbursement, purchase order, credit card, direct vendor)
  - Quick approve button for individual expenses
  - Expense details modal integration
  - Acknowledgment tracking for approvals

### Required Endpoints:

#### `GET /api/expenses/pending`
- **Description**: Get expenses awaiting approval
- **Query Params**:
  - `payment_method?: 'person_reimbursement' | 'purchase_order' | 'credit_card' | 'direct_vendor'`
  - `urgency?: 'low' | 'normal' | 'high' | 'critical'`
  - `amount_min?: number`
  - `amount_max?: number`
  - `search?: string`
  - `category?: string`
- **Response**:
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
    payment_method_type: 'person_reimbursement' | 'purchase_order' | 'credit_card' | 'direct_vendor'
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
- **Database Tables**:
  - `expenses` (id, expense_number, amount, description, vendor_id, category_id, payment_method_type, payment_method_id, submitted_date, submitted_by, urgency_level, current_approval_stage, approval_deadline, receipt_path, business_purpose, status, created_at, updated_at)
  - `expense_vendors` (id, name, contact_info)
  - `expense_categories` (id, name, color, budget_category_id)
  - `expense_approvals` (id, expense_id, approver_id, decision, notes, decided_at, approval_stage)
  - `payment_methods` (id, name, type, details)
- **Status**: ❌ **MISSING** - New expense management feature

#### `POST /api/expenses/:expenseId/approve`
- **Description**: Approve an expense
- **Path Params**: `expenseId` - Expense ID
- **Request Body**:
```typescript
{
  decision: 'approved'
  notes?: string
  approval_conditions?: string[]
}
```
- **Response**:
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
- **Implementation**:
  - Create expense_approvals record
  - Update expense current_approval_stage
  - If final approval stage, update expense status to 'approved'
  - Send notification to submitter
- **Database Tables**:
  - `expenses`, `expense_approvals`, `notifications`
- **Status**: ❌ **MISSING**

#### `POST /api/expenses/:expenseId/reject`
- **Description**: Reject an expense
- **Path Params**: `expenseId` - Expense ID
- **Request Body**:
```typescript
{
  decision: 'rejected'
  rejection_reason: string
  notes: string
}
```
- **Response**:
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
- **Implementation**:
  - Create expense_approvals record with decision='rejected'
  - Update expense status to 'rejected'
  - Send notification to submitter with rejection reason
- **Database Tables**:
  - `expenses`, `expense_approvals`, `notifications`
- **Status**: ❌ **MISSING**

---

## Summary of Components 21-30

### High Priority Missing Endpoints:
1. **RBAC Registry System** (Components 19, 21):
   - `GET /api/admin/rbac-registry/pages` - Dynamic page discovery
   - `GET /api/admin/rbac-registry/scan` - Filesystem scanning for automation
   - `DELETE /api/admin/access-cache` - Real-time permission updates

2. **Communications System** (Components 24, 25):
   - `GET /api/communications` - Communications history and management
   - `POST /api/communications/:id/publish` - Publish draft communications
   - `GET /api/communications/recent` - Dashboard integration

3. **Financial Management** (Components 26, 28):
   - `GET /api/company-credit-cards` - Credit card management
   - `GET /api/expenses/pending` - Expense approval workflow
   - `POST /api/expenses/:expenseId/approve` - Approval processing
   - `POST /api/expenses/:expenseId/reject` - Rejection processing

4. **Assignment Enhancements** (Components 23, 27):
   - `GET /api/assignments/recent` - Recent activity tracking
   - `GET /api/assignments/stats` - Dashboard statistics
   - Enhanced game data with full team/location hierarchy

5. **Content Management** (Component 24):
   - `GET /api/content/stats` - Content statistics
   - `GET /api/content/resources/recent` - Recent resources

### Database Tables Needed:
- **RBAC Registry**: `rbac_registry_pages`, `rbac_registry_endpoints`, `rbac_registry_functions`, `rbac_registry_stats`, `rbac_registry_scans`
- **Communications**: `communications`, `communication_recipients`, `communication_metrics`, `content_resources`, `content_reviews`
- **Financial**: `company_credit_cards`, `credit_card_authorized_users`, `credit_card_restrictions`, `credit_card_transactions`, `expenses`, `expense_vendors`, `expense_categories`, `expense_approvals`
- **Enhanced Game Data**: Relationships between `games`, `teams`, `leagues`, `locations` with full object returns

### Implementation Priority:
1. **Critical** (Breaks existing features): RBAC registry system, communications history
2. **High** (New features ready for implementation): Expense approvals, credit card management
3. **Medium** (Enhancements to existing features): Assignment stats, content management
4. **Low** (Nice-to-have optimizations): Cache clearing, advanced filtering
## 29. expense-form-integrated

**Path**: `frontend/components/expense-form-integrated.tsx` (Large comprehensive expense form)
**Purpose**: Integrated expense submission form with receipt upload, category selection, and approval workflow

**Note**: This file appears to be empty or was not loaded successfully. Need to verify file contents.

---

## 30. expense-form

**Path**: `frontend/components/expense-form.tsx`
**Purpose**: Standalone expense submission form

**Note**: This file appears to be empty or was not loaded successfully. Need to verify file contents.

---

## 31. game-management-backup

**Path**: `frontend/components/game-management-backup.tsx`
**Purpose**: Backup version of game management system

**Note**: This file appears to be empty or was not loaded successfully. Need to verify file contents.

---

## 32. games-management-page

**Path**: `frontend/components/games-management-page.tsx` (1006 lines)
**Purpose**: Comprehensive game management system with create, import, filter, and mentorship features

### Component Analysis:
- **Features**:
  - Create new games with full team and game details
  - Calendar import (ICS files)
  - CSV import/export
  - Filterable data table with multiple views (grid/list)
  - Mentorship integration (mentee game view)
  - Delete confirmation dialogs
  - Assignment status tracking
  - Permission-based actions (CERBOS integration)
  - Search and advanced filtering

### Required Endpoints:

#### `POST /api/games`
- **Description**: Create a new game with full details
- **Request Body**:
```typescript
{
  homeTeam: {
    organization: string
    ageGroup: string
    gender: 'Boys' | 'Girls'
    rank: number
  }
  awayTeam: {
    organization: string
    ageGroup: string
    gender: 'Boys' | 'Girls'
    rank: number
  }
  date: string
  time: string
  location: string
  postalCode: string
  level: 'Recreational' | 'Competitive' | 'Elite'
  gameType: 'Community' | 'Club' | 'Tournament' | 'Private Tournament'
  division: string
  season: string
  payRate: number
  refsNeeded: number
  wageMultiplier: number
  wageMultiplierReason?: string
}
```
- **Response**:
```typescript
{
  success: boolean
  data: {
    id: string
    homeTeam: object
    awayTeam: object
    date: string
    time: string
    startTime: string
    location: string
    level: string
    gameType: string
    division: string
    season: string
    status: 'unassigned' | 'assigned' | 'up-for-grabs' | 'completed' | 'cancelled'
    refsNeeded: number
    assignedReferees: string[]
    payRate: number
    wageMultiplier: number
    createdAt: string
    updatedAt: string
  }
}
```
- **Database Tables**:
  - `games`, `teams`, `locations`
- **Status**: ⚠️ **PARTIALLY IMPLEMENTED** - May need team creation logic

#### `GET /api/games`
- **Description**: Get games with pagination and filters (enhanced version)
- **Query Params**:
  - `limit?: number`
  - `offset?: number`
  - `status?: string`
  - `level?: string`
  - `date?: string`
  - `division?: string`
  - `include_assignments?: boolean`
- **Response**:
```typescript
{
  success: boolean
  data: Array<Game>
  pagination?: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}
```
- **Database Tables**:
  - `games`, `game_assignments`
- **Status**: ✅ **EXISTS** - May need enhancement for assignment counts

#### `DELETE /api/games/:gameId`
- **Description**: Delete a game by ID
- **Path Params**: `gameId` - Game ID to delete
- **Response**:
```typescript
{
  success: boolean
  message: string
}
```
- **Validation**:
  - Prevent deletion if game has confirmed assignments
  - Cascade delete related assignments if allowed
- **Database Tables**:
  - `games`, `game_assignments`
- **Status**: ⚠️ **NEEDS VALIDATION** - Add assignment check

#### `GET /api/mentees/:menteeId/games`
- **Description**: Get game assignments for a specific mentee
- **Path Params**: `menteeId` - Mentee user ID
- **Query Params**:
  - `limit?: number`
  - `sort_by?: string`
  - `sort_order?: 'asc' | 'desc'`
  - `status?: string`
- **Response**:
```typescript
{
  success: boolean
  data: Array<MenteeGame>
}
```
- **Database Tables**:
  - `game_assignments`, `games`, `mentees`
- **Status**: ❌ **MISSING** - New mentorship feature

#### `GET /api/mentors/:mentorId/mentees`
- **Description**: Get mentees assigned to a mentor (includes selection dropdown)
- **Path Params**: `mentorId` - Mentor ID (can be undefined to use current user)
- **Query Params**:
  - `status?: 'active' | 'completed' | 'paused'`
  - `includeDetails?: boolean`
- **Response**:
```typescript
{
  success: boolean
  data: Array<{
    id: string
    name: string
    email: string
    status: string
    progress?: number
  }>
}
```
- **Database Tables**:
  - `mentees`, `mentorship_assignments`
- **Status**: ❌ **MISSING** - Mentorship system

---

## 33. league-manager-dashboard-overview

**Path**: `frontend/components/league-manager-dashboard-overview.tsx` (354 lines)
**Purpose**: Role-specific dashboard for League Manager users managing leagues, tournaments, and competitions

### Component Analysis:
- **Features**:
  - Welcome section with quick actions
  - League and tournament statistics
  - Active leagues with progress tracking
  - Upcoming games display
  - Performance metrics (completion rate, games completed)
  - Navigation to league/tournament creation
  - Currently uses **MOCK DATA** for leagues - needs real API

### Required Endpoints:

#### `GET /api/leagues`
- **Description**: Get all leagues with team and game counts
- **Query Params**:
  - `status?: 'active' | 'upcoming' | 'completed'`
  - `include_stats?: boolean`
- **Response**:
```typescript
{
  success: boolean
  data: {
    leagues: Array<{
      id: string
      name: string
      division: string
      season: string
      teamCount: number
      gameCount: number
      status: 'active' | 'upcoming' | 'completed'
      startDate: string
      endDate: string
      progress: number  // Percentage of games completed
    }>
  }
}
```
- **Database Tables**:
  - `leagues`, `teams`, `games`, `league_teams`
- **Status**: ❌ **MISSING** - Currently using mock data

#### `GET /api/tournaments`
- **Description**: Get active tournaments
- **Query Params**:
  - `status?: string`
  - `include_brackets?: boolean`
- **Response**:
```typescript
{
  success: boolean
  data: {
    tournaments: Array<{
      id: string
      name: string
      format: 'single_elimination' | 'double_elimination' | 'round_robin'
      status: 'upcoming' | 'in_progress' | 'completed'
      teamCount: number
      startDate: string
      endDate: string
    }>
  }
}
```
- **Database Tables**:
  - `tournaments`, `tournament_teams`, `tournament_brackets`
- **Status**: ❌ **MISSING** - Tournament management feature

---

## 34. MenteeGamesView

**Path**: `frontend/components/MenteeGamesView.tsx` (386 lines)
**Purpose**: Dedicated view for displaying and analyzing a mentee's game assignments and performance

### Component Analysis:
- **Features**:
  - Display mentee's game assignments with full details
  - Real-time statistics (total games, completed, upcoming, earnings)
  - Toggle analytics view showing performance metrics
  - Level breakdown, acceptance rate, earnings tracking
  - Filterable table with status, position, earnings columns
  - Integration with mentorship system

### Required Endpoints:

#### `GET /api/mentees/:menteeId/games`
- **Description**: Get all game assignments for a specific mentee
- **Path Params**: `menteeId` - Mentee user ID
- **Query Params**:
  - `limit?: number` (default: 100)
  - `sort_by?: string` (default: 'game_date')
  - `sort_order?: 'asc' | 'desc'` (default: 'desc')
  - `status?: string` - Filter by assignment status
- **Response**:
```typescript
{
  success: boolean
  data: Array<{
    id: string
    game_id: string
    user_id: string
    position_id?: string
    status: 'pending' | 'accepted' | 'completed' | 'declined'
    assigned_at: string
    accepted_at?: string
    completed_at?: string
    calculated_wage?: number
    notes?: string
    // Game details (joined data)
    game_date: string
    game_time: string
    location: string
    field?: string
    level: string
    game_type: string
    division: string
    season: string
    pay_rate?: number
    wage_multiplier?: number
    home_team_name: string
    home_team_display?: string
    away_team_name: string
    away_team_display?: string
    position_name?: string
    position_description?: string
    assigned_by_name?: string
  }>
}
```
- **Database Tables**:
  - `game_assignments`, `games`, `teams`, `locations`, `referee_positions`, `users`
- **Status**: ❌ **MISSING** - Complex join query needed

#### `GET /api/mentees/:menteeId/analytics`
- **Description**: Get performance analytics for a mentee
- **Path Params**: `menteeId` - Mentee user ID
- **Response**:
```typescript
{
  success: boolean
  data: {
    analytics: {
      summary: {
        total_games: number
        total_earnings: number
        average_wage: number
      }
      level_performance: {
        [level: string]: {
          games: number
          earnings: number
          average_rating?: number
        }
      }
      acceptance_rate: {
        rate: number
        accepted: number
        declined: number
        pending: number
      }
      monthly_breakdown?: {
        [month: string]: {
          games: number
          earnings: number
        }
      }
    }
  }
}
```
- **Database Tables**:
  - `game_assignments`, `games`, `game_evaluations`
- **Status**: ❌ **MISSING** - Analytics calculation needed

---

## 35. MenteeSelector

**Path**: (Multiple instances found - using main implementation)
**Purpose**: Reusable dropdown selector for choosing a mentee from mentor's assigned mentees

### Component Analysis:
- **Features**:
  - Dropdown select component
  - Displays mentee name with optional metadata
  - Placeholder support
  - onChange callback
  - Clear/reset functionality

### Required Endpoints:
- **Depends on**: `GET /api/mentors/:mentorId/mentees` (see component #32)

---

## 36. DocumentManager

**Path**: `frontend/components/mentorship/DocumentManager.tsx` (578 lines)
**Purpose**: Comprehensive document management system for mentorship with upload, download, categorization, and privacy controls

### Component Analysis:
- **Features**:
  - Upload documents with metadata (title, category, description)
  - Document categories: evaluation, training, certification, feedback, other
  - Privacy controls (public/private documents)
  - Search and filter by category
  - File type icons (image, video, audio, PDF, archive)
  - Download functionality
  - Delete with confirmation
  - Grid display with file size and upload date

### Required Endpoints:

#### `POST /api/mentee-documents`
- **Description**: Upload a new document for a mentee
- **Request**: `multipart/form-data`
- **Form Fields**:
  - `file`: File (required)
  - `title`: string (required)
  - `category`: 'evaluation' | 'training' | 'certification' | 'feedback' | 'other'
  - `description`: string (optional)
  - `is_private`: boolean
  - `mentee_id`: string
  - `mentor_id`: string
- **Response**:
```typescript
{
  success: boolean
  data: {
    id: string
    mentee_id: string
    mentor_id: string
    title: string
    file_name: string
    file_path: string
    file_type: string
    file_size: number
    category: DocumentCategory
    description?: string
    is_private: boolean
    uploaded_at: string
  }
}
```
- **Implementation**:
  - Store file in secure location (e.g., AWS S3, local filesystem)
  - Generate unique file_path
  - Validate file type and size
  - Extract mime type
- **Database Tables**:
  - `mentee_documents` (id, mentee_id, mentor_id, title, file_name, file_path, file_type, file_size, category, description, is_private, uploaded_at, created_at)
- **Status**: ❌ **MISSING** - File storage system needed

#### `GET /api/mentee-documents/:documentId/download`
- **Description**: Download a document file
- **Path Params**: `documentId` - Document ID
- **Response**: Binary file stream (blob)
- **Headers**:
  - `Content-Type`: (file mime type)
  - `Content-Disposition`: `attachment; filename="[original_filename]"`
- **Validation**:
  - Check user has permission to access document
  - Respect privacy settings (private documents only for mentor)
- **Status**: ❌ **MISSING**

#### `PATCH /api/mentee-documents/:documentId`
- **Description**: Update document metadata or privacy setting
- **Path Params**: `documentId` - Document ID
- **Request Body**:
```typescript
{
  title?: string
  description?: string
  category?: DocumentCategory
  is_private?: boolean
}
```
- **Response**:
```typescript
{
  success: boolean
  data: MenteeDocument
}
```
- **Database Tables**:
  - `mentee_documents`
- **Status**: ❌ **MISSING**

#### `DELETE /api/mentee-documents/:documentId`
- **Description**: Delete a document
- **Path Params**: `documentId` - Document ID
- **Response**:
```typescript
{
  success: boolean
  message: string
}
```
- **Implementation**:
  - Delete database record
  - Delete physical file from storage
- **Database Tables**:
  - `mentee_documents`
- **Status**: ❌ **MISSING**

---

## 37. MenteeDetailsView

**Path**: `frontend/components/mentorship/MenteeDetailsView.tsx` (666 lines)
**Purpose**: Comprehensive mentee profile view with tabs for profile, notes, documents, goals, and sessions

### Component Analysis:
- **Features**:
  - Multi-tab interface (Profile, Notes, Documents, Goals, Sessions)
  - Profile editing with personal info, emergency contact, development profile
  - Progress tracking with overall percentage and milestones
  - Session count, goals completion, average rating display
  - Rich text editor integration for notes
  - Document management integration
  - Goal and session management (placeholders)
  - Avatar display with fallback initials

### Required Endpoints:

#### `GET /api/mentees/:menteeId`
- **Description**: Get detailed mentee profile information
- **Path Params**: `menteeId` - Mentee ID
- **Response**:
```typescript
{
  success: boolean
  data: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
    date_of_birth?: string
    profile_photo_url?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
    street_address?: string
    city?: string
    province_state?: string
    postal_zip_code?: string
    mentorship_assignments: Array<{
      id: string
      mentor_id: string
      status: 'active' | 'completed' | 'paused'
      start_date: string
      end_date?: string
    }>
    mentee_profile?: {
      current_level: string
      development_goals: string[]
      strengths: string[]
      areas_for_improvement: string[]
    }
    stats?: {
      average_rating: number
      total_sessions: number
      completed_goals: number
    }
  }
}
```
- **Database Tables**:
  - `mentees`, `mentorship_assignments`, `mentee_profiles`
- **Status**: ❌ **MISSING** - Complex mentee data model

#### `GET /api/mentees/:menteeId/notes`
- **Description**: Get all notes for a mentee
- **Path Params**: `menteeId` - Mentee ID
- **Response**:
```typescript
{
  success: boolean
  data: Array<{
    id: string
    mentee_id: string
    mentor_id: string
    title: string
    content: string  // HTML content
    category: 'observation' | 'evaluation' | 'feedback' | 'plan' | 'general'
    is_private: boolean
    created_at: string
    updated_at: string
  }>
}
```
- **Database Tables**:
  - `mentee_notes`
- **Status**: ❌ **MISSING**

#### `GET /api/mentees/:menteeId/documents`
- **Description**: Get all documents for a mentee
- **Response**: Array of `MenteeDocument` objects (see component #36)
- **Status**: ❌ **MISSING**

#### `GET /api/mentees/:menteeId/goals`
- **Description**: Get development goals for a mentee
- **Path Params**: `menteeId` - Mentee ID
- **Response**:
```typescript
{
  success: boolean
  data: Array<{
    id: string
    mentee_id: string
    mentor_id: string
    title: string
    description: string
    status: 'not_started' | 'in_progress' | 'completed' | 'cancelled'
    priority: 'low' | 'medium' | 'high'
    progress_percentage: number
    target_date?: string
    completed_date?: string
    created_at: string
  }>
}
```
- **Database Tables**:
  - `mentorship_goals`
- **Status**: ❌ **MISSING**

#### `GET /api/mentees/:menteeId/sessions`
- **Description**: Get mentorship sessions for a mentee
- **Path Params**: `menteeId` - Mentee ID
- **Response**:
```typescript
{
  success: boolean
  data: Array<{
    id: string
    mentee_id: string
    mentor_id: string
    session_type: 'one_on_one' | 'observation' | 'evaluation' | 'workshop'
    session_date: string
    duration_minutes: number
    status: 'scheduled' | 'completed' | 'cancelled'
    notes?: string
    topics_covered?: string[]
    created_at: string
  }>
}
```
- **Database Tables**:
  - `mentorship_sessions`
- **Status**: ❌ **MISSING**

#### `PUT /api/mentees/:menteeId`
- **Description**: Update mentee profile information
- **Path Params**: `menteeId` - Mentee ID
- **Request Body**: Partial mentee object with fields to update
- **Response**:
```typescript
{
  success: boolean
  data: Mentee
}
```
- **Database Tables**:
  - `mentees`
- **Status**: ❌ **MISSING**

---

## 38. MentorDashboard

**Path**: `frontend/components/mentorship/MentorDashboard.tsx` (454 lines)
**Purpose**: Main dashboard for mentors showing mentees, sessions, goals, and mentorship statistics

### Component Analysis:
- **Features**:
  - Quick stats (active mentees, upcoming sessions, pending goals, success rate)
  - Mentee cards with progress bars and status badges
  - Avatar display for each mentee
  - Upcoming sessions list with date/time
  - Priority goals list sorted by priority and target date
  - Recent activity feed (placeholder)
  - Schedule session and add note quick actions
  - Click handlers for mentee selection and detail views

### Required Endpoints:

#### `GET /api/mentors/:mentorId`
- **Description**: Get mentor profile and statistics
- **Path Params**: `mentorId` - Mentor ID
- **Response**:
```typescript
{
  success: boolean
  data: {
    id: string
    user_id: string
    first_name: string
    last_name: string
    email: string
    specialization?: string
    bio?: string
    stats?: {
      total_mentees: number
      active_mentees: number
      completed_mentorships: number
      total_sessions: number
      average_mentee_rating: number
      success_rate: number
    }
    mentorship_assignments: Array<{
      id: string
      mentee_id: string
      status: string
      start_date: string
      end_date?: string
    }>
  }
}
```
- **Database Tables**:
  - `mentors`, `mentorship_assignments`, `mentorship_sessions`
- **Status**: ❌ **MISSING** - Mentor data model

#### `GET /api/mentors/:mentorId/mentees`
- **Description**: Get all mentees assigned to a mentor with full details
- **Path Params**: `mentorId` - Mentor ID
- **Response**:
```typescript
{
  success: boolean
  data: Array<{
    id: string
    first_name: string
    last_name: string
    email: string
    profile_photo_url?: string
    mentorship_assignments: Array<{
      id: string
      status: 'active' | 'completed' | 'paused'
      start_date: string
    }>
    sessions?: MentorshipSession[]
    goals?: MentorshipGoal[]
    stats?: {
      total_games: number
      average_rating: number
    }
  }>
}
```
- **Database Tables**:
  - `mentees`, `mentorship_assignments`, `mentorship_sessions`, `mentorship_goals`
- **Status**: ❌ **MISSING** - Complex query with related data

---

## Summary of Components 31-40

### High Priority Missing Endpoints:

1. **Mentorship System** (Components 34-38):
   - `GET /api/mentees/:menteeId` - Mentee profile details
   - `GET /api/mentees/:menteeId/games` - Mentee game assignments
   - `GET /api/mentees/:menteeId/analytics` - Performance analytics
   - `GET /api/mentees/:menteeId/notes` - Mentee notes
   - `GET /api/mentees/:menteeId/documents` - Mentee documents
   - `GET /api/mentees/:menteeId/goals` - Development goals
   - `GET /api/mentees/:menteeId/sessions` - Mentorship sessions
   - `GET /api/mentors/:mentorId` - Mentor profile and stats
   - `GET /api/mentors/:mentorId/mentees` - Mentor's assigned mentees
   - `POST /api/mentee-documents` - Document upload with multipart/form-data
   - `GET /api/mentee-documents/:documentId/download` - File download
   - `DELETE /api/mentee-documents/:documentId` - Document deletion

2. **League Management** (Component 33):
   - `GET /api/leagues` - Leagues with team/game counts
   - `GET /api/tournaments` - Tournament system

3. **Game Management Enhancements** (Component 32):
   - `POST /api/games` - Create games (may need enhancement)
   - `DELETE /api/games/:gameId` - Delete with validation

### Database Tables Needed:

#### Mentorship System:
- **mentees**: id, user_id, first_name, last_name, email, phone, date_of_birth, profile_photo_url, emergency_contact_name, emergency_contact_phone, street_address, city, province_state, postal_zip_code, created_at, updated_at
- **mentors**: id, user_id, first_name, last_name, email, specialization, bio, created_at, updated_at
- **mentorship_assignments**: id, mentor_id, mentee_id, status, start_date, end_date, created_at, updated_at
- **mentee_profiles**: id, mentee_id, current_level, development_goals (JSON), strengths (JSON), areas_for_improvement (JSON), created_at, updated_at
- **mentee_notes**: id, mentee_id, mentor_id, title, content (TEXT/HTML), category, is_private, created_at, updated_at
- **mentee_documents**: id, mentee_id, mentor_id, title, file_name, file_path, file_type, file_size, category, description, is_private, uploaded_at, created_at
- **mentorship_goals**: id, mentee_id, mentor_id, title, description, status, priority, progress_percentage, target_date, completed_date, created_at, updated_at
- **mentorship_sessions**: id, mentee_id, mentor_id, session_type, session_date, duration_minutes, status, notes, topics_covered (JSON), created_at, updated_at

#### League Management:
- **leagues**: id, name, division, season, status, start_date, end_date, created_at, updated_at
- **league_teams**: id, league_id, team_id
- **tournaments**: id, name, format, status, start_date, end_date, created_at, updated_at
- **tournament_teams**: id, tournament_id, team_id, seed
- **tournament_brackets**: id, tournament_id, round, match_number, team1_id, team2_id, winner_id

### Implementation Priority:

1. **Critical** (Breaks existing features): Mentorship system endpoints (mentees, mentors, assignments)
2. **High** (New features ready for implementation): Document management with file upload/download
3. **Medium** (Enhancements to existing features): Analytics, session tracking, goal management
4. **Low** (Future features): League/tournament management

### Notes:
- Components 29, 30, 31 (expense-form-integrated, expense-form, game-management-backup) appear to be empty or failed to load - may need manual verification
- Mentorship system is the largest missing feature with interconnected data models
- File storage system needed for document management (AWS S3 or local filesystem)
- Rich text editor needed for notes (HTML content)
