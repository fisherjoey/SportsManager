# Implementation Gaps - P0 Critical Priority

**Total Endpoints**: 15
**Estimated Effort**: 59 hours (~2 weeks)
**Status**: ❌ NOT IMPLEMENTED
**Impact**: High - Breaks multiple frontend components

---

## Overview

These endpoints are **critical** for basic application functionality. Multiple frontend components are broken or severely limited without these implementations. **Start implementation here first.**

---

## 1. Mentorship System (24 hours)

### Impact
- **Breaks 5 Frontend Components**:
  - `MentorshipManagement.tsx`
  - `MenteeGamesView.tsx`
  - `MenteeDetailsView.tsx`
  - `MentorDashboard.tsx`
  - `DocumentManager.tsx`

### Required Database Tables
**Status**: ❌ NOT CREATED

```sql
-- mentees table
CREATE TABLE mentees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  date_of_birth DATE,
  profile_photo_url TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  street_address TEXT,
  city VARCHAR(100),
  province_state VARCHAR(100),
  postal_zip_code VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- mentors table
CREATE TABLE mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  specialization TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- mentorship_assignments table
CREATE TABLE mentorship_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES mentees(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT mentorship_status_check CHECK (status IN ('active', 'completed', 'paused', 'terminated'))
);

-- mentee_profiles table
CREATE TABLE mentee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id UUID NOT NULL REFERENCES mentees(id) ON DELETE CASCADE UNIQUE,
  current_level VARCHAR(100),
  development_goals JSONB DEFAULT '[]',
  strengths JSONB DEFAULT '[]',
  areas_for_improvement JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### 1.1 GET /api/mentees/:menteeId

**Priority**: P0 - Critical
**Effort**: 6 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Get detailed mentee profile with stats

**Request**:
```
GET /api/mentees/123e4567-e89b-12d3-a456-426614174000
```

**Response**:
```typescript
{
  success: boolean
  data: {
    id: string
    user_id: string
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
      mentor_name: string
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

**Database Tables**: `mentees`, `mentorship_assignments`, `mentee_profiles`, `mentors`, `mentorship_sessions`, `mentorship_goals`

**Implementation Notes**:
- Join with `mentorship_assignments` to get active mentorships
- Join with `mentee_profiles` for development data
- Calculate stats from `mentorship_sessions` and `mentorship_goals`
- Ensure proper access control (mentor can view their mentees, admins can view all)

**Dependencies**:
- Database migration for mentee tables
- Cerbos policy for mentee resource

---

### 1.2 GET /api/mentees/:menteeId/games

**Priority**: P0 - Critical
**Effort**: 8 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Get all game assignments for a specific mentee with full details

**Request**:
```
GET /api/mentees/123e4567-e89b-12d3-a456-426614174000/games?limit=100&sort_by=game_date&sort_order=desc
```

**Query Parameters**:
- `limit` (number, default: 100)
- `sort_by` (string, default: 'game_date')
- `sort_order` ('asc' | 'desc', default: 'desc')
- `status` (string, optional)

**Response**:
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
    // Game details (joined)
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

**Database Tables**: `game_assignments`, `games`, `teams`, `locations`, `referee_positions`, `users`

**Implementation Notes**:
- Complex join query across multiple tables
- Need to link mentee's user_id to game_assignments
- Calculate wage based on pay_rate * wage_multiplier
- Format team display names (org + age_group + gender + rank)
- Optimize with indexes on user_id and game_date

**Dependencies**:
- Existing `game_assignments` table
- Link between mentee user_id and assignments

---

### 1.3 GET /api/mentees/:menteeId/analytics

**Priority**: P0 - Critical
**Effort**: 6 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Get performance analytics for a mentee

**Request**:
```
GET /api/mentees/123e4567-e89b-12d3-a456-426614174000/analytics
```

**Response**:
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
        rate: number  // percentage
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

**Database Tables**: `game_assignments`, `games`, `game_evaluations`

**Implementation Notes**:
- Aggregate statistics from game assignments
- Calculate earnings: SUM(calculated_wage)
- Group by level for performance breakdown
- Calculate acceptance rate from assignment statuses
- Optional: Monthly trends for the last 12 months

**Dependencies**:
- Existing `game_assignments` with calculated_wage column
- Optional: `game_evaluations` table for ratings

---

### 1.4 GET /api/mentors/:mentorId/mentees

**Priority**: P0 - Critical
**Effort**: 4 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Get all mentees assigned to a mentor with full details

**Request**:
```
GET /api/mentors/123e4567-e89b-12d3-a456-426614174000/mentees?status=active
```

**Query Parameters**:
- `status` ('active' | 'completed' | 'paused', optional)
- `includeDetails` (boolean, default: true)

**Response**:
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
      end_date?: string
    }>
    sessions?: Array<MentorshipSession>
    goals?: Array<MentorshipGoal>
    stats?: {
      total_games: number
      average_rating: number
      progress_percentage: number
    }
  }>
}
```

**Database Tables**: `mentees`, `mentorship_assignments`, `mentorship_sessions`, `mentorship_goals`, `game_assignments`

**Implementation Notes**:
- Filter by mentor_id and optionally status
- Include optional aggregated stats
- Join with sessions and goals if requested
- Calculate progress from completed vs total goals

**Dependencies**:
- Database migration for mentorship tables
- Optional: `mentorship_sessions` and `mentorship_goals` tables

---

## 2. RBAC Registry System (16 hours)

### Impact
- **Breaks 2 Frontend Components**:
  - `RBACRegistryDashboard.tsx`
  - `DynamicRolePageAccessManager.tsx`
- **Disables**: Automated RBAC discovery and configuration

### Required Database Tables
**Status**: ⚠️ PARTIALLY CREATED (some exist, needs completion)

```sql
-- rbac_registry_pages table
CREATE TABLE rbac_registry_pages (
  id SERIAL PRIMARY KEY,
  page_path VARCHAR(500) NOT NULL UNIQUE,
  page_name VARCHAR(255) NOT NULL,
  page_category VARCHAR(100) NOT NULL,
  page_description TEXT,
  suggested_permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_protected BOOLEAN DEFAULT true,
  auto_detected BOOLEAN DEFAULT false,
  needs_configuration BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- rbac_registry_stats table
CREATE TABLE rbac_registry_stats (
  id SERIAL PRIMARY KEY,
  total_pages INTEGER DEFAULT 0,
  total_endpoints INTEGER DEFAULT 0,
  total_functions INTEGER DEFAULT 0,
  total_permissions INTEGER DEFAULT 0,
  auto_detected_count INTEGER DEFAULT 0,
  manually_added_count INTEGER DEFAULT 0,
  needs_configuration_count INTEGER DEFAULT 0,
  last_scan_date TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### 2.1 GET /api/admin/rbac-registry/pages

**Priority**: P0 - Critical
**Effort**: 6 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Retrieve all registered pages from the dynamic RBAC registry

**Request**:
```
GET /api/admin/rbac-registry/pages
```

**Response**:
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

**Database Tables**: `rbac_registry_pages`

**Implementation Notes**:
- Return all pages from registry
- Order by category, then page_name
- Include auto_detected flag for UI highlighting
- Filter out deleted/deprecated pages

**Dependencies**:
- Database migration for rbac_registry_pages
- Initial seed data for existing pages

---

### 2.2 GET /api/admin/rbac-registry/stats

**Priority**: P0 - Critical
**Effort**: 4 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Get RBAC registry statistics

**Request**:
```
GET /api/admin/rbac-registry/stats
```

**Response**:
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

**Database Tables**: `rbac_registry_pages`, `rbac_registry_endpoints`, `rbac_registry_functions`, `rbac_registry_stats`

**Implementation Notes**:
- Aggregate counts from registry tables
- Cache results for performance
- Update stats table on each scan

**Dependencies**:
- Database migration for stats table
- Registry tables populated

---

### 2.3 GET /api/admin/rbac-registry/scan

**Priority**: P0 - Critical
**Effort**: 6 hours
**Status**: ⚠️ PARTIALLY IMPLEMENTED

**Description**: Trigger filesystem scan to discover new pages, endpoints, and functions

**Request**:
```
GET /api/admin/rbac-registry/scan?force=true
```

**Query Parameters**:
- `force` (boolean, optional) - Force rescan even if recently scanned
- `path` (string, optional) - Scan specific directory

**Response**:
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

**Database Tables**: `rbac_registry_pages`, `rbac_registry_endpoints`, `rbac_registry_functions`, `rbac_scan_history`

**Implementation Notes**:
- Scan `frontend/app/` for page.tsx files
- Scan `backend/src/routes/` for API endpoints
- Extract function exports from service files
- Compare with existing registry entries
- Insert new items, update existing
- Log scan in scan_history table

**Dependencies**:
- File system access
- TypeScript/React parser for extracting metadata
- Background job queue (optional for async processing)

---

## 3. Communications System (12 hours)

### Impact
- **Breaks 2 Frontend Components**:
  - `CommunicationsManagement.tsx`
  - `ContentManagerDashboardOverview.tsx`
- **Affects**: Announcement system, team communications

### Required Database Tables
**Status**: ⚠️ PARTIALLY CREATED (basic structure exists)

```sql
-- Enhance existing communications table
ALTER TABLE communications ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE communications ADD COLUMN IF NOT EXISTS priority VARCHAR(50);
ALTER TABLE communications ADD COLUMN IF NOT EXISTS target_audience JSONB;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS requires_acknowledgment BOOLEAN DEFAULT false;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS scheduled_send_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- communication_recipients table
CREATE TABLE IF NOT EXISTS communication_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.1 GET /api/communications

**Priority**: P0 - Critical
**Effort**: 6 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Get communications history with filtering

**Request**:
```
GET /api/communications?status=published&type=announcement&limit=50
```

**Query Parameters**:
- `status` ('published' | 'draft' | 'scheduled' | 'archived')
- `type` ('announcement' | 'assignment' | 'emergency' | 'update')
- `priority` ('low' | 'medium' | 'high' | 'urgent')
- `search` (string)
- `limit` (number, default: 50)
- `offset` (number, default: 0)

**Response**:
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

**Database Tables**: `communications`, `communication_recipients`, `users`

**Implementation Notes**:
- Support multiple filters simultaneously
- Count recipients and acknowledgments
- Join with users for creator name
- Paginate results
- Add full-text search on title/content

**Dependencies**:
- Enhanced communications table schema
- communication_recipients table

---

### 3.2 POST /api/communications/:id/publish

**Priority**: P0 - Critical
**Effort**: 6 hours
**Status**: ❌ NOT IMPLEMENTED

**Description**: Publish a draft communication

**Request**:
```
POST /api/communications/123e4567-e89b-12d3-a456-426614174000/publish
```

**Response**:
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

**Database Tables**: `communications`, `communication_recipients`, `notifications`

**Implementation Notes**:
- Update status to 'published'
- Set sent_at timestamp
- Resolve target_audience to specific user IDs
- Create communication_recipients records
- Trigger notification broadcast
- Handle scheduled communications (cron job integration)

**Dependencies**:
- Notification broadcast system
- Background job queue for large recipient lists

---

## 4. Financial Dashboard (7 hours)

### Impact
- **Breaks 1 Frontend Component**:
  - `FinancialDashboard.tsx`
- **Affects**: Financial overview and reporting

---

### 4.1 GET /api/financial-dashboard

**Priority**: P0 - Critical
**Effort**: 7 hours
**Status**: ⚠️ PARTIALLY IMPLEMENTED

**Description**: Get comprehensive financial dashboard data

**Request**:
```
GET /api/financial-dashboard?period=30
```

**Query Parameters**:
- `period` (number) - Number of days (30, 90, 180, 365)

**Response**:
```typescript
{
  success: boolean
  data: {
    summary: {
      totalExpenses: number
      totalRevenue?: number
    }
    budgetUtilization: {
      totalAllocated: number
      totalSpent: number
      overallUtilization: number  // percentage
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
}
```

**Database Tables**: `expenses`, `budgets`, `budget_categories`, `financial_transactions`, `expense_receipts`, `game_assignments`

**Implementation Notes**:
- Aggregate from multiple financial tables
- Calculate budget utilization across all budgets
- Group expenses by category
- Generate trend data for charts
- Include recent transactions (last 10)
- Optimize with materialized views for performance

**Dependencies**:
- Existing financial tables
- Proper date filtering logic

---

## Implementation Order

### Week 1: Mentorship + Database Setup
**Days 1-2**: Database migrations
- Create all mentorship tables
- Seed initial data
- Create indexes

**Days 3-5**: Mentorship endpoints
- Implement GET /api/mentees/:menteeId
- Implement GET /api/mentees/:menteeId/games
- Implement GET /api/mentees/:menteeId/analytics
- Implement GET /api/mentors/:mentorId/mentees

### Week 2: RBAC + Communications + Financial
**Days 6-7**: RBAC Registry
- Create registry tables
- Implement GET /api/admin/rbac-registry/pages
- Implement GET /api/admin/rbac-registry/stats
- Implement GET /api/admin/rbac-registry/scan

**Days 8-9**: Communications
- Enhance communications table
- Implement GET /api/communications
- Implement POST /api/communications/:id/publish

**Day 10**: Financial Dashboard
- Implement GET /api/financial-dashboard
- Optimize queries

---

## Testing Strategy

### Unit Tests (30 tests)
- Mentorship endpoints: 12 tests
- RBAC Registry: 8 tests
- Communications: 6 tests
- Financial Dashboard: 4 tests

### Integration Tests (12 scenarios)
- Mentee profile with assignments
- RBAC scan and discovery
- Communication publish workflow
- Financial dashboard aggregation

### E2E Tests (6 flows)
- View mentee profile → games → analytics
- Scan registry → configure pages
- Create communication → publish → verify recipients
- View financial dashboard → drill into category

---

## Success Criteria

- ✅ All 15 endpoints return proper responses
- ✅ All database migrations run successfully
- ✅ All unit tests pass (100% coverage for new code)
- ✅ All integration tests pass
- ✅ Frontend components load without errors
- ✅ Performance: All endpoints respond < 200ms (95th percentile)
- ✅ Documentation complete with examples

---

**Next**: See [IMPLEMENTATION_GAPS_P1_HIGH.md](./IMPLEMENTATION_GAPS_P1_HIGH.md) for Phase 2 priorities
