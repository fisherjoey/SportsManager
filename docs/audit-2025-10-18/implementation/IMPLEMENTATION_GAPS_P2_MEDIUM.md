# Implementation Gaps - P2 Medium Priority

**Total Endpoints**: 18
**Estimated Effort**: 37 hours (~1.5 weeks)
**Status**: ⚠️ PARTIALLY IMPLEMENTED
**Impact**: Medium - Enhancements to existing features

---

## Overview

These endpoints enhance existing functionality with additional features, better filtering, and improved data structures. Most have partial implementations that need completion or enhancement.

---

## 1. Assignment Enhancements (12 hours)

### 1.1 GET /api/assignments/recent
**Effort**: 4 hours | **Status**: ❌ MISSING

Get recent assignment activity for assignor dashboard.

**Response**:
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

**Database Tables**: `game_assignments`, `games`, `users`

---

### 1.2 GET /api/assignments/stats
**Effort**: 4 hours | **Status**: ❌ MISSING

Get assignment statistics for dashboard.

**Response**:
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

**Database Tables**: `game_assignments`, `games`

---

### 1.3 GET /api/referees/:refereeId/assignments (Enhanced)
**Effort**: 4 hours | **Status**: ⚠️ PARTIAL

Add enhanced statistics to existing endpoint.

**Additional Fields Needed**:
- `total` (total assignments)
- `completed` (completed count)
- `upcoming` (upcoming count)
- Performance metrics

**Database Tables**: `game_assignments`, `games`

---

## 2. Game Management Enhancements (15 hours)

### 2.1 GET /api/games (Enhanced)
**Effort**: 6 hours | **Status**: ⚠️ PARTIAL

Add full relational data with teams, locations, assignments.

**Enhancement Needed**:
- Include full team objects with league hierarchy
- Include location details (capacity, facilities)
- Include assignment counts
- Add derived status field

**Response Enhancement**:
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
    location: {
      name: string
      address: string
      capacity: number
      facilities: string[]
    }
    level: 'Recreational' | 'Competitive' | 'Elite'
    gameType: 'Community' | 'Club' | 'Tournament' | 'Private Tournament'
    wageMultiplier: number
    wageMultiplierReason: string
    finalWage: number
    assignedCount: number  // NEW
    status: 'assigned' | 'unassigned' | 'up-for-grabs'  // DERIVED
    // ... existing fields
  }>
}
```

**Database Tables**: `games`, `teams`, `leagues`, `locations`, `game_assignments`

---

### 2.2 DELETE /api/games/:gameId (Enhanced)
**Effort**: 3 hours | **Status**: ⚠️ PARTIAL

Add validation to prevent deletion of games with confirmed assignments.

**Validation Logic**:
- Check for assignments with status 'accepted' or 'completed'
- Return error if confirmed assignments exist
- Allow deletion if only 'pending' assignments
- Cascade delete pending assignments

**Database Tables**: `games`, `game_assignments`

---

### 2.3 GET /api/games (Calendar View)
**Effort**: 6 hours | **Status**: ❌ MISSING

Specialized endpoint for calendar view with date range queries.

**Endpoint**: `GET /api/games?start_date=2025-01-01&end_date=2025-01-31&status=unassigned`

**Query Parameters**:
- `start_date` (ISO date string, required)
- `end_date` (ISO date string, required)
- `status` ('assigned' | 'unassigned' | 'up-for-grabs')
- `referee_id` (optional, filter for specific referee)

**Response**:
```typescript
{
  games: Array<{
    id: string
    date: string
    startTime: string
    endTime: string
    status: 'assigned' | 'unassigned' | 'up-for-grabs'
    assignedReferees?: string[]
    homeTeam: Team
    awayTeam: Team
    location?: string
  }>
}
```

**Database Tables**: `games`, `teams`, `game_assignments`, `users`

---

## 3. League & Tournament Management (10 hours)

### 3.1 GET /api/leagues (Enhanced)
**Effort**: 4 hours | **Status**: ⚠️ PARTIAL

Add team/game counts and status tracking.

**Enhancement**:
```typescript
{
  success: boolean
  data: {
    leagues: Array<{
      id: string
      name: string
      division: string
      season: string
      teamCount: number  // NEW
      gameCount: number  // NEW
      status: 'active' | 'upcoming' | 'completed'  // NEW
      startDate: string  // NEW
      endDate: string  // NEW
      progress: number  // NEW - Percentage of games completed
    }>
  }
}
```

**Database Tables**: `leagues`, `teams`, `games`, `league_teams`

---

### 3.2 POST /api/leagues/bulk (Enhanced)
**Effort**: 3 hours | **Status**: ⚠️ NEEDS VERIFICATION

Verify bulk league creation logic.

---

### 3.3 POST /api/teams/bulk (Enhanced)
**Effort**: 3 hours | **Status**: ⚠️ NEEDS VERIFICATION

Verify bulk team creation logic.

---

## 4. Budget Enhancements (10 hours)

### 4.1 GET /api/budgets/periods
**Effort**: 2 hours | **Status**: ⚠️ NEEDS VERIFICATION

Verify budget periods endpoint structure.

---

### 4.2 GET /api/budgets/categories
**Effort**: 2 hours | **Status**: ⚠️ NEEDS VERIFICATION

Verify budget categories endpoint structure.

---

### 4.3 GET /api/budgets (Enhanced)
**Effort**: 4 hours | **Status**: ⚠️ NEEDS VERIFICATION

Verify budget list with enhanced filtering.

**Verify Response Structure**:
- Period name and dates (joined)
- Category name and color (joined)
- Owner/responsible person name (joined)
- Calculated fields: `spent_amount`, `remaining_amount`, `utilization_rate`

---

### 4.4 Budget CRUD Operations
**Effort**: 2 hours | **Status**: ⚠️ NEEDS VERIFICATION

Verify POST, PUT, DELETE operations for budgets.

---

## 5. User/Referee Management (10 hours)

### 5.1 GET /api/referees (Enhanced)
**Effort**: 4 hours | **Status**: ⚠️ PARTIAL

Add availability tracking.

**Enhancement**:
```typescript
{
  success: boolean
  data: {
    referees: Array<{
      id: string
      name: string
      email: string
      isAvailable: boolean  // NEW
      level?: string
      total_assignments?: number  // NEW
      upcoming_assignments?: number  // NEW
      completion_rate?: number  // NEW
    }>
  }
}
```

**Database Tables**: `referees`, `referee_availability`, `game_assignments`

---

### 5.2 PUT /api/referees/:userId/wage
**Effort**: 2 hours | **Status**: ⚠️ NEEDS VERIFICATION

Verify referee wage update endpoint.

---

### 5.3 PUT /api/referees/:userId/type
**Effort**: 2 hours | **Status**: ⚠️ NEEDS VERIFICATION

Verify referee type change endpoint.

---

### 5.4 GET /api/profile (Enhanced)
**Effort**: 2 hours | **Status**: ⚠️ PARTIAL

Add referee_id field to user profile.

**Enhancement**:
```typescript
{
  user: {
    id: string
    name: string
    email: string
    referee_id?: string  // NEW - Link to referee record
    roles: string[]
  }
}
```

---

## Database Changes Required

### Column Additions

```sql
-- Add assignedCount to games (computed field in query, not stored)
-- Add status to games (computed field in query, not stored)

-- Add referee_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS referee_id UUID REFERENCES referees(id);

-- Add status, start_date, end_date to leagues table
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE leagues ADD CONSTRAINT league_status_check CHECK (status IN ('active', 'upcoming', 'completed'));
```

---

## Implementation Order

### Week 1: Assignments + Games
**Days 1-2**: Assignment enhancements
- Implement recent assignments endpoint
- Implement assignment stats endpoint
- Enhance referee assignments endpoint

**Days 3-5**: Game enhancements
- Add full relational data to games endpoint
- Add validation to game deletion
- Implement calendar view endpoint

### Week 2: Leagues + Budgets + Users
**Days 6-7**: League/Tournament management
- Enhance leagues with counts and status
- Verify bulk operations

**Days 8-9**: Budget enhancements
- Verify all budget endpoints
- Test filtering and joins

**Day 10**: User/Referee management
- Add availability tracking
- Enhance profile endpoint
- Verify wage/type updates

---

## Testing Strategy

### Integration Tests (15 scenarios)
- Assignment stats calculation
- Game calendar date range filtering
- League progress calculation
- Budget utilization computation
- Referee availability tracking

### Performance Tests
- Games list with full relational data (< 200ms)
- Calendar view with 100+ games (< 300ms)
- League list with counts (< 150ms)

---

## Success Criteria

- ✅ All 18 endpoints implemented or verified
- ✅ Response structures standardized
- ✅ Database columns added
- ✅ Performance benchmarks met
- ✅ Existing frontend components work without modification

---

**Next**: See [IMPLEMENTATION_GAPS_P3_LOW.md](./IMPLEMENTATION_GAPS_P3_LOW.md) for Phase 4 priorities
