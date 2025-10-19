# Priority Action Checklist

**Created**: 2025-10-18
**Branch**: `feat/cerbos-only-migration`
**Purpose**: Immediate, actionable tasks following the comprehensive 6-session audit
**Priority Order**: Immediate → Critical → High → Medium → Low

---

## 📊 Progress Tracking

Track completion percentage across all priorities:

| Priority | Tasks | Completed | Progress |
|----------|-------|-----------|----------|
| **⚡ Immediate (Quick Wins)** | 5 | 0 | 0% |
| **🔴 P0 Critical** | 15 | 0 | 0% |
| **🟠 P1 High** | 22 | 0 | 0% |
| **🟡 P2 Medium** | 18 | 0 | 0% |
| **🟢 P3 Low** | 27 | 0 | 0% |
| **🔵 Polish** | 12 | 0 | 0% |
| **TOTAL** | **99** | **0** | **0%** |

---

## ⚡ IMMEDIATE - Quick Wins (This Week, 6 hours)

**Goal**: Clean up RBAC migration remnants and prepare codebase

### 1. Delete Deprecated Permission Middleware (2 hours)

**Impact**: Removes dead code, prevents confusion, improves code quality

**File to Delete**: `backend/src/middleware/permissionCheck.ts`

**Steps**:
- [ ] Search for any remaining usage:
  ```bash
  grep -r "requirePermissions\|checkRoutePermission\|permissionCheck" backend/src/
  ```
- [ ] Verify search results show only deprecated warnings
- [ ] Delete the file: `rm backend/src/middleware/permissionCheck.ts`
- [ ] Remove any import statements found in search
- [ ] Test backend startup: `npm run dev`
- [ ] Verify no errors in console

**Expected Result**: ✅ File deleted, no errors, cleaner codebase

---

### 2. Add Migration Complete Banners to Frontend (1 hour)

**Impact**: Clarifies to users that permissions are now in Cerbos YAML files

**Files to Update**:
- `frontend/components/admin/rbac/PermissionManagementDashboard.tsx`
- `frontend/components/admin/rbac/UnifiedAccessControlDashboard.tsx`

**Steps**:
- [ ] Add info banner at top of PermissionManagementDashboard:
  ```tsx
  <Alert variant="info" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Cerbos Migration Complete</AlertTitle>
    <AlertDescription>
      Permissions are now defined in Cerbos policy files
      (cerbos-policies/*.yaml). This dashboard is for reference only.
      <a href="/docs/cerbos" className="underline ml-2">Learn more</a>
    </AlertDescription>
  </Alert>
  ```
- [ ] Disable any "Edit Permission" or "Create Permission" buttons (if they exist)
- [ ] Add similar banner to UnifiedAccessControlDashboard
- [ ] Test frontend renders correctly
- [ ] Take screenshot for documentation

**Expected Result**: ✅ Users understand permissions are in Cerbos

---

### 3. Update README with Authorization Documentation (1 hour)

**Impact**: Improves developer onboarding, reduces confusion

**File to Update**: `README.md`

**Steps**:
- [ ] Add new section after "Installation":
  ```markdown
  ## Authorization

  This application uses **Cerbos** for role-based access control (RBAC).

  ### How Permissions Work

  1. **Roles** are stored in the database (`roles` table)
  2. **Permissions** are defined in Cerbos YAML policy files (`cerbos-policies/`)
  3. **Authorization** is checked via Cerbos at runtime

  ### Adding New Permissions

  To add a new permission:

  1. Edit the appropriate Cerbos policy file in `cerbos-policies/resources/`
  2. Add the permission action (e.g., `game:create`)
  3. Deploy the updated policy files
  4. Test using the Cerbos playground or integration tests

  ### Migration Note

  As of September 27, 2025, we migrated from database-backed permissions
  to Cerbos YAML policies. The old `permissions` and `role_permissions`
  tables have been dropped.

  **Policy Files**: `cerbos-policies/`
  **Documentation**: [Cerbos Docs](https://docs.cerbos.dev/)
  ```
- [ ] Verify formatting renders correctly
- [ ] Add link to Cerbos documentation in "Additional Resources" section

**Expected Result**: ✅ Clear documentation for developers

---

### 4. Verify No Broken RBAC References (1 hour)

**Impact**: Confirms migration completeness, prevents runtime errors

**Steps**:
- [ ] Search for references to dropped tables:
  ```bash
  grep -r "role_permissions\|permissions.*table" backend/src/ --include="*.ts"
  ```
- [ ] For each result found:
  - Determine if code is active or deprecated
  - If active and broken, add to bug list
  - If deprecated, note for deletion
- [ ] Search for old middleware usage:
  ```bash
  grep -r "requirePermissions" backend/src/routes/ --include="*.ts"
  ```
- [ ] Document findings in a new file: `RBAC_MIGRATION_AUDIT.md`
- [ ] Create issues for any broken code found

**Expected Result**: ✅ Audit report, list of issues (if any)

---

### 5. Test Critical User Flows (1 hour)

**Impact**: Ensures Cerbos authorization works correctly in production scenarios

**Test Accounts** (from seed file `002_test_users.js`):
- `admin@sportsmanager.com` / `admin123` (Super Admin)
- `assignor@cmba.ca` / `admin123` (Assignment Manager)
- `senior.ref@cmba.ca` / `referee123` (Senior Referee)
- `referee@test.com` / `referee123` (Junior Referee)

**Steps**:
- [ ] Test 1: Login as Super Admin
  - Verify can access `/admin/roles`
  - Verify can create new role
  - Verify can assign permissions

- [ ] Test 2: Login as Assignment Manager
  - Verify can access `/games`
  - Verify can create game assignments
  - Verify CANNOT access `/admin/roles` (should be forbidden)

- [ ] Test 3: Login as Junior Referee
  - Verify can view assigned games
  - Verify can accept/decline assignments
  - Verify CANNOT create games (should be forbidden)

- [ ] Test 4: Permission Edge Cases
  - Test accessing API endpoint directly (without UI)
  - Verify 403 Forbidden for unauthorized actions
  - Verify error message includes which permission was missing

**Expected Result**: ✅ All user flows work, permissions correctly enforced

---

## 🔴 P0 CRITICAL - Phase 1 (Weeks 1-2, 51 hours)

**Goal**: Implement mentorship system, enhance communications, consolidate financial dashboard

### Mentorship System (24 hours)

#### Database Setup (6 hours)

**Week 1, Days 1-2**

- [ ] Create migration file: `backend/migrations/20251018_create_mentorship_system.js`
- [ ] Define table: `mentees` (12 columns)
  - id (uuid, primary key)
  - user_id (uuid, foreign key → users)
  - first_name, last_name, email (required)
  - phone, date_of_birth, profile_photo_url (optional)
  - emergency contact fields
  - address fields (street, city, province, postal_code)
  - created_at, updated_at timestamps

- [ ] Define table: `mentors` (8 columns)
  - id, user_id, first_name, last_name, email
  - specialization, bio
  - created_at, updated_at

- [ ] Define table: `mentorship_assignments` (8 columns)
  - id, mentor_id, mentee_id
  - status (active, completed, paused, terminated)
  - start_date, end_date
  - created_at, updated_at

- [ ] Define table: `mentee_profiles` (7 columns)
  - id, mentee_id (unique)
  - current_level
  - development_goals (JSONB)
  - strengths (JSONB)
  - areas_for_improvement (JSONB)
  - created_at, updated_at

- [ ] Create indexes for performance:
  ```sql
  CREATE INDEX idx_mentees_user_id ON mentees(user_id);
  CREATE INDEX idx_mentors_user_id ON mentors(user_id);
  CREATE INDEX idx_mentorship_mentor ON mentorship_assignments(mentor_id);
  CREATE INDEX idx_mentorship_mentee ON mentorship_assignments(mentee_id);
  ```

- [ ] Run migration: `npm run migrate:latest`
- [ ] Verify tables created: `psql -d sports_management -c "\dt mentee*"`
- [ ] Create seed file: `backend/seeds/data/005_mentorship_test_data.js`
- [ ] Seed sample mentors (5 users) and mentees (10 users)
- [ ] Run seed: `npx knex seed:run --specific=data/005_mentorship_test_data.js`

**Deliverable**: ✅ 4 tables created, indexes added, test data seeded

---

#### Endpoint 1: GET /api/mentees/:menteeId (6 hours)

**Week 1, Days 3-4**

- [ ] Create route file: `backend/src/routes/mentees.ts`
- [ ] Implement endpoint handler
- [ ] Database query with joins:
  ```sql
  SELECT
    m.*,
    json_agg(ma) as mentorship_assignments,
    mp.* as mentee_profile
  FROM mentees m
  LEFT JOIN mentorship_assignments ma ON m.id = ma.mentee_id
  LEFT JOIN mentee_profiles mp ON m.id = mp.mentee_id
  WHERE m.id = $1
  GROUP BY m.id, mp.id
  ```
- [ ] Calculate statistics:
  - average_rating (from game_evaluations, if table exists)
  - total_sessions (from mentorship_sessions)
  - completed_goals (from mentorship_goals)

- [ ] Add Cerbos authorization: `requireCerbosPermission('referee:evaluate')`
- [ ] Handle errors: 404 if mentee not found
- [ ] Write unit tests (10 tests):
  - Test successful retrieval
  - Test with invalid ID
  - Test unauthorized access
  - Test with missing profile
  - Test statistics calculation
  - Test multiple mentorship assignments

- [ ] Test manually with Postman/curl
- [ ] Document in API.md

**Deliverable**: ✅ Working endpoint, 10 passing tests

---

#### Endpoint 2: GET /api/mentees/:menteeId/games (8 hours)

**Week 1, Days 3-4**

- [ ] Add to `backend/src/routes/mentees.ts`
- [ ] Implement complex join query:
  ```sql
  SELECT
    ga.*,
    g.game_date, g.game_time, g.level, g.game_type, g.division, g.season,
    l.name as location, l.field,
    ht.name as home_team_name,
    at.name as away_team_name,
    rp.name as position_name,
    u.name as assigned_by_name,
    (g.pay_rate * g.wage_multiplier) as calculated_wage
  FROM game_assignments ga
  JOIN games g ON ga.game_id = g.id
  LEFT JOIN locations l ON g.location_id = l.id
  LEFT JOIN teams ht ON g.home_team_id = ht.id
  LEFT JOIN teams at ON g.away_team_id = at.id
  LEFT JOIN referee_positions rp ON ga.position_id = rp.id
  LEFT JOIN users u ON ga.assigned_by_id = u.id
  WHERE ga.user_id = (SELECT user_id FROM mentees WHERE id = $1)
  ORDER BY g.game_date DESC
  LIMIT $2
  ```

- [ ] Add query parameters:
  - `limit` (default: 100)
  - `sort_by` (default: 'game_date')
  - `sort_order` (default: 'desc')
  - `status` (optional filter)

- [ ] Calculate wages correctly (pay_rate × wage_multiplier)
- [ ] Format team display names (org + age_group + gender + rank)
- [ ] Add Cerbos authorization
- [ ] Handle edge cases:
  - Mentee has no games
  - User is not a mentee
  - Invalid mentee ID

- [ ] Write unit tests (8 tests):
  - Test with multiple games
  - Test empty result
  - Test sorting options
  - Test status filtering
  - Test wage calculation
  - Test team name formatting

- [ ] Optimize query (add EXPLAIN ANALYZE)
- [ ] Test performance with 100+ games
- [ ] Document in API.md

**Deliverable**: ✅ Working endpoint with complex joins, 8 passing tests

---

#### Endpoint 3: GET /api/mentees/:menteeId/analytics (6 hours)

**Week 1, Day 5**

- [ ] Add to `backend/src/routes/mentees.ts`
- [ ] Implement analytics aggregation query:
  ```sql
  SELECT
    COUNT(*) as total_games,
    SUM(calculated_wage) as total_earnings,
    AVG(calculated_wage) as average_wage,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
    COUNT(*) FILTER (WHERE status = 'declined') as declined,
    COUNT(*) FILTER (WHERE status = 'pending') as pending
  FROM game_assignments
  WHERE user_id = (SELECT user_id FROM mentees WHERE id = $1)
  ```

- [ ] Calculate level performance breakdown:
  ```sql
  SELECT
    g.level,
    COUNT(*) as games,
    SUM(ga.calculated_wage) as earnings
  FROM game_assignments ga
  JOIN games g ON ga.game_id = g.id
  WHERE ga.user_id = $1
  GROUP BY g.level
  ```

- [ ] Calculate acceptance rate:
  - rate = accepted / (accepted + declined + pending)
  - Return as percentage (0-100)

- [ ] Optional: Monthly breakdown for last 12 months
- [ ] Add Cerbos authorization
- [ ] Write unit tests (6 tests):
  - Test complete analytics calculation
  - Test with no games
  - Test acceptance rate edge cases
  - Test level performance grouping

- [ ] Document response structure in API.md

**Deliverable**: ✅ Analytics endpoint, 6 passing tests

---

#### Endpoint 4: GET /api/mentors/:mentorId/mentees (4 hours)

**Week 1, Day 5**

- [ ] Create route file: `backend/src/routes/mentors.ts`
- [ ] Implement endpoint with joins:
  ```sql
  SELECT
    m.*,
    json_agg(ma) as mentorship_assignments
  FROM mentees m
  JOIN mentorship_assignments ma ON m.id = ma.mentee_id
  WHERE ma.mentor_id = $1
    AND ($2::text IS NULL OR ma.status = $2)
  GROUP BY m.id
  ```

- [ ] Add query parameter: `status` (active, completed, paused)
- [ ] Optional: Include sessions and goals if `includeDetails=true`
- [ ] Calculate stats per mentee:
  - total_games (from game_assignments)
  - average_rating (if evaluations exist)
  - progress_percentage (completed_goals / total_goals × 100)

- [ ] Add Cerbos authorization: `referee:evaluate`
- [ ] Write unit tests (5 tests):
  - Test with multiple mentees
  - Test status filtering
  - Test with no mentees
  - Test statistics calculation

- [ ] Document in API.md

**Deliverable**: ✅ Mentor endpoint, 5 passing tests

---

### Communications System (12 hours)

**Week 2, Days 6-7**

#### Database Enhancements (2 hours)

- [ ] Create migration: `backend/migrations/20251025_enhance_communications.js`
- [ ] Add columns to `communications` table:
  ```sql
  ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'announcement',
  ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS target_audience JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS requires_acknowledgment BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_send_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
  ```

- [ ] Add constraints:
  ```sql
  ALTER TABLE communications
  ADD CONSTRAINT communication_type_check
    CHECK (type IN ('announcement', 'assignment', 'emergency', 'update'));

  ALTER TABLE communications
  ADD CONSTRAINT communication_priority_check
    CHECK (priority IN ('low', 'normal', 'medium', 'high', 'urgent'));
  ```

- [ ] Create `communication_recipients` table:
  ```sql
  CREATE TABLE communication_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  ```

- [ ] Create indexes:
  ```sql
  CREATE INDEX idx_comm_recipients_comm ON communication_recipients(communication_id);
  CREATE INDEX idx_comm_recipients_user ON communication_recipients(user_id);
  CREATE INDEX idx_communications_type ON communications(type);
  CREATE INDEX idx_communications_status ON communications(status);
  ```

- [ ] Run migration: `npm run migrate:latest`

**Deliverable**: ✅ Enhanced communications schema

---

#### Endpoint 5: GET /api/communications (6 hours)

**Week 2, Days 6-7**

- [ ] Create/update route file: `backend/src/routes/communications.ts`
- [ ] Implement query with multiple filters:
  ```sql
  SELECT
    c.*,
    u.name as created_by_name,
    COUNT(DISTINCT cr.id) as total_recipients,
    COUNT(DISTINCT cr.id) FILTER (WHERE cr.acknowledged_at IS NOT NULL) as acknowledgment_count
  FROM communications c
  LEFT JOIN users u ON c.created_by = u.id
  LEFT JOIN communication_recipients cr ON c.id = cr.communication_id
  WHERE
    ($1::text IS NULL OR c.status = $1)
    AND ($2::text IS NULL OR c.type = $2)
    AND ($3::text IS NULL OR c.priority = $3)
    AND ($4::text IS NULL OR (c.title ILIKE $4 OR c.content ILIKE $4))
  GROUP BY c.id, u.name
  ORDER BY c.created_at DESC
  LIMIT $5 OFFSET $6
  ```

- [ ] Add query parameters:
  - `status` (published, draft, scheduled, archived)
  - `type` (announcement, assignment, emergency, update)
  - `priority` (low, normal, medium, high, urgent)
  - `search` (full-text search on title/content)
  - `limit` (default: 50)
  - `offset` (default: 0)

- [ ] Count total for pagination
- [ ] Add Cerbos authorization: `communication:send`
- [ ] Write unit tests (10 tests):
  - Test with various filter combinations
  - Test search functionality
  - Test pagination
  - Test recipient counting
  - Test acknowledgment counting

- [ ] Document in API.md

**Deliverable**: ✅ Communications list endpoint, 10 passing tests

---

#### Endpoint 6: POST /api/communications/:id/publish (6 hours)

**Week 2, Days 6-7**

- [ ] Add to `backend/src/routes/communications.ts`
- [ ] Implement publishing workflow:
  1. Verify communication exists and is in 'draft' status
  2. Update status to 'published'
  3. Set sent_at timestamp
  4. Resolve target_audience to specific user IDs:
     ```typescript
     if (target_audience.all_users) {
       userIds = await getAllUserIds();
     } else if (target_audience.role) {
       userIds = await getUserIdsByRole(target_audience.role);
     } else if (target_audience.specific_users) {
       userIds = target_audience.specific_users;
     }
     ```
  5. Create `communication_recipients` records (bulk insert)
  6. Trigger notification broadcast (via notification service)

- [ ] Handle scheduled communications:
  - If scheduled_send_date is in future, set status to 'scheduled'
  - Set up cron job/background task to publish at scheduled time

- [ ] Add Cerbos authorization: `communication:send`
- [ ] Write unit tests (8 tests):
  - Test successful publish
  - Test with invalid status (not draft)
  - Test target audience resolution
  - Test recipient creation
  - Test notification trigger
  - Test scheduled publish

- [ ] Integrate with notification system
- [ ] Document in API.md

**Deliverable**: ✅ Publish endpoint, 8 passing tests, notification integration

---

### Financial Dashboard (7 hours)

**Week 2, Days 8-9**

#### Endpoint 7: GET /api/financial-dashboard (7 hours)

- [ ] Create route file: `backend/src/routes/financial-dashboard.ts`
- [ ] Implement complex aggregation query:
  ```sql
  -- Summary
  SELECT
    SUM(amount) as total_expenses
  FROM expenses
  WHERE created_at >= CURRENT_DATE - INTERVAL '$1 days';

  -- Budget Utilization
  SELECT
    SUM(allocated_amount) as total_allocated,
    SUM(spent_amount) as total_spent
  FROM budgets
  WHERE period_id IN (SELECT id FROM budget_periods WHERE end_date >= CURRENT_DATE);

  -- Pending Approvals
  SELECT COUNT(*) as total, json_agg(json_build_object('id', id, 'amount', amount, 'description', description)) as items
  FROM expenses
  WHERE status = 'pending_approval'
  LIMIT 5;

  -- Expense Categories
  SELECT c.name, SUM(e.amount) as total_amount
  FROM expenses e
  JOIN expense_categories c ON e.category_id = c.id
  WHERE e.created_at >= CURRENT_DATE - INTERVAL '$1 days'
  GROUP BY c.name;

  -- Revenue Trends (by week)
  SELECT
    date_trunc('week', created_at) as week,
    SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END) as revenue,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
    SUM(CASE WHEN type = 'wage' THEN amount ELSE 0 END) as wages
  FROM financial_transactions
  WHERE created_at >= CURRENT_DATE - INTERVAL '$1 days'
  GROUP BY week
  ORDER BY week;

  -- Recent Transactions
  SELECT *
  FROM financial_transactions
  ORDER BY created_at DESC
  LIMIT 10;
  ```

- [ ] Add query parameter: `period` (30, 90, 180, 365 days)
- [ ] Calculate overall budget utilization percentage
- [ ] Format response as specified in MISSING_API_ENDPOINTS.md
- [ ] Add Cerbos authorization: `finance:view`
- [ ] Optimize queries:
  - Add indexes on date columns
  - Consider materialized view for trends
  - Cache results for 5 minutes (Redis)

- [ ] Write unit tests (6 tests):
  - Test with different periods
  - Test aggregations are correct
  - Test caching works
  - Test with no data
  - Test authorization

- [ ] Performance test: verify < 500ms response time
- [ ] Document in API.md

**Deliverable**: ✅ Financial dashboard endpoint, 6 passing tests, < 500ms

---

## Phase 1 Success Criteria

- [ ] All 13 P0 endpoints implemented and tested (was 15, removed 2 RBAC Registry)
- [ ] All 52 unit tests passing
- [ ] All 12 integration tests passing
- [ ] 6 database tables created and seeded
- [ ] Performance benchmarks met (< 200ms p95 for most endpoints)
- [ ] Frontend mentorship components load without errors
- [ ] Communications system sends notifications
- [ ] Financial dashboard displays real-time data

**Phase 1 Complete!** ✅

---

## 🟠 P1 HIGH - Phase 2 (Weeks 3-5, 62 hours)

**Goal**: Expense approval, employee management, compliance, content, analytics

### Summary (Detailed tasks in IMPLEMENTATION_GAPS_P1_HIGH.md)

1. **Expense Approval Workflow** (18 hours)
   - [ ] GET /api/expenses/pending
   - [ ] POST /api/expenses/:id/approve
   - [ ] POST /api/expenses/:id/reject

2. **Credit Card Management** (8 hours)
   - [ ] GET /api/company-credit-cards

3. **Employee Management** (15 hours)
   - [ ] GET /api/employees
   - [ ] GET /api/employees/stats
   - [ ] POST /api/employees

4. **Compliance Tracking** (14 hours)
   - [ ] GET /api/compliance/tracking
   - [ ] GET /api/compliance/incidents
   - [ ] GET /api/compliance/risks
   - [ ] GET /api/compliance/dashboard

5. **Content Management** (8 hours)
   - [ ] GET /api/content/stats
   - [ ] GET /api/content/resources/recent

6. **Organizational Analytics** (15 hours)
   - [ ] GET /api/organizational-analytics

**Total P1**: 13 endpoints, 100 tests, 8 database tables

---

## 🟡 P2 MEDIUM - Phase 3 (Weeks 6-7, 37 hours)

**Goal**: Enhance existing features with better filtering, data, and UX

### Summary (Detailed tasks in IMPLEMENTATION_GAPS_P2_MEDIUM.md)

1. **Assignment Enhancements** (12 hours)
   - [ ] GET /api/assignments/recent
   - [ ] GET /api/assignments/stats
   - [ ] Enhance GET /api/referees/:refereeId/assignments

2. **Game Management Enhancements** (15 hours)
   - [ ] Enhance GET /api/games (full relations)
   - [ ] Add validation to DELETE /api/games/:gameId
   - [ ] Implement calendar view endpoint

3. **League & Tournament** (10 hours)
   - [ ] Enhance GET /api/leagues
   - [ ] Verify bulk operations

4. **Budget & User Enhancements** (10 hours)
   - [ ] Verify budget endpoints
   - [ ] Enhance referee availability
   - [ ] Add referee_id to user profile

**Total P2**: 18 endpoints enhanced/verified, 68 tests

---

## 🟢 P3 LOW - Phase 4 (Weeks 8-9, 44 hours)

**Goal**: Unified role management, mentorship extended features

### Summary (Detailed tasks in IMPLEMENTATION_GAPS_P3_LOW.md)

> **NOTE**: RBAC Registry endpoints removed (saved 7 hours)

1. **Unified Role Management** (20 hours)
   - [ ] GET /api/admin/unified-roles
   - [ ] DELETE /api/admin/unified-roles/:roleName
   - [ ] POST /api/admin/roles/unified
   - [ ] PUT /api/admin/roles/unified/:id
   - [ ] GET /api/admin/permissions/available

2. **Access Control Stats** (15 hours)
   - [ ] GET /api/access-control/stats
   - [ ] Enhance GET /api/admin/roles/:roleId/page-access
   - [ ] Enhance PUT /api/admin/roles/:roleId/page-access
   - [ ] DELETE /api/admin/access-cache

3. **Mentorship Extended** (16 hours)
   - [ ] Create 4 additional tables (notes, documents, goals, sessions)
   - [ ] GET /api/mentees/:menteeId/notes
   - [ ] GET /api/mentees/:menteeId/documents
   - [ ] GET /api/mentees/:menteeId/goals
   - [ ] GET /api/mentees/:menteeId/sessions
   - [ ] Configure file storage (AWS S3)

4. **Mentor Analytics** (9 hours)
   - [ ] GET /api/mentors/:mentorId
   - [ ] GET /api/mentee-documents/:documentId/download
   - [ ] PATCH /api/mentee-documents/:documentId

**Total P3**: 27 endpoints (was 32), 88 tests, file storage configured

---

## 🔵 POLISH - Phase 5 (Week 10, 24 hours)

**Goal**: Complete RBAC migration, comprehensive testing, documentation

### RBAC Migration Completion (12 hours)

- [ ] Update frontend permission components (4 hours)
  - Make PermissionManagementDashboard read-only
  - Replace edit functionality with "View in Cerbos" link
  - Update documentation references

- [ ] Build Cerbos policy viewer (6 hours) - OPTIONAL
  - Read-only viewer for YAML policies
  - Show role-permission mappings visually
  - Deploy to `/admin/cerbos-policies`

- [ ] Complete middleware audit (2 hours)
  - Verify ALL routes use `requireCerbosPermission`
  - Remove any old middleware imports
  - Update route documentation

---

### Testing & QA (12 hours)

- [ ] End-to-end testing (4 hours)
  - Test mentorship workflow (create mentee → assign mentor → log session)
  - Test expense workflow (submit → approve → pay)
  - Test assignment workflow (create game → assign referee → accept)
  - Test each role's permissions (6 roles × 5 key actions = 30 tests)

- [ ] Performance testing (4 hours)
  - Load test financial dashboard (100 concurrent users)
  - Benchmark organizational analytics (< 500ms p95)
  - Test pagination with 10,000+ games
  - Verify database query performance (EXPLAIN ANALYZE)

- [ ] Security audit (2 hours)
  - Review all Cerbos policies for correctness
  - Test authorization edge cases:
    - User without role tries to access protected resource
    - User with partial permissions tries full CRUD
    - Cross-organization data access attempts
  - Verify JWT token validation works

- [ ] Documentation review (2 hours)
  - Update API.md with all new endpoints
  - Create developer onboarding guide
  - Update README with architecture diagrams
  - Document Cerbos policy structure

---

## Git Commit Strategy

After completing each phase, make organized commits:

### Commit 1: Audit Infrastructure
```bash
git add extract-api-calls.js analyze-components.js frontend-api-calls.json
git commit -m "chore: Add comprehensive frontend-backend audit infrastructure

- Extract API endpoints from frontend components
- Analyze component API integration
- Generate machine-readable endpoint catalog

Generated during 6-session audit (Oct 17-18, 2025)"
```

### Commit 2: Audit Documentation
```bash
git add AUDIT_EXECUTION_SUMMARY.md MISSING_API_ENDPOINTS_SUMMARY.md \
        FRONTEND_API_REQUIREMENTS.md COMPONENT_ANALYSIS.md \
        BACKEND_ROUTES_CATALOG.md DATABASE_SCHEMA_SUMMARY.md \
        DATABASE_SCHEMA_COMPLETE.md IMPLEMENTATION_GAPS_*.md \
        IMPLEMENTATION_ROADMAP.md SEED_DATA_GUIDE.md \
        RBAC_CERBOS_MIGRATION_STATUS.md \
        FINAL_IMPLEMENTATION_ROADMAP.md PRIORITY_ACTION_CHECKLIST.md \
        AUDIT_COMPLETION_SUMMARY.md

git commit -m "docs: Add comprehensive audit documentation

- Frontend requirements (168 endpoints documented)
- Backend catalog (330 endpoints inventoried)
- Database schema (116 tables, 1,643 columns)
- Gap analysis (47 missing/incomplete endpoints)
- Implementation roadmap (218 hours, 9 weeks)
- Seed file guide (4 consolidated seed files)
- RBAC migration status (85% complete)

Audit completed over 6 sessions (Oct 17-18, 2025)
Total deliverables: 25+ markdown files, 1.85+ MB data"
```

### Commit 3: Seed Files
```bash
git add backend/seeds/data/*.js backend/seeds/_archive/

git commit -m "feat: Consolidate and fix seed files

- Create 4 working seed files (001-004)
- Fix schema mismatches (is_active → availability_status)
- Archive old conflicting seeds
- Test all seeds successfully

All seeds now work correctly with current schema"
```

### Commit 4: RBAC Cleanup (Quick Wins)
```bash
git add backend/src/middleware/permissionCheck.ts \
        frontend/components/admin/rbac/*.tsx \
        README.md

git commit -m "refactor: Complete RBAC to Cerbos migration cleanup

- Delete deprecated permissionCheck.ts middleware
- Add migration banners to frontend permission components
- Update README with Cerbos authorization documentation
- Verify no broken references to dropped tables

Migration savings: 31 hours, $2,480"
```

### Commit 5: Phase 1 - Mentorship System
```bash
git add backend/migrations/*mentorship* \
        backend/seeds/data/005_mentorship_test_data.js \
        backend/src/routes/mentees.ts \
        backend/src/routes/mentors.ts \
        backend/src/routes/communications.ts \
        backend/src/routes/financial-dashboard.ts

git commit -m "feat: Implement Phase 1 - Critical endpoints (P0)

Mentorship System:
- Add 4 database tables (mentees, mentors, assignments, profiles)
- Implement GET /api/mentees/:menteeId
- Implement GET /api/mentees/:menteeId/games
- Implement GET /api/mentees/:menteeId/analytics
- Implement GET /api/mentors/:mentorId/mentees
- Add 29 unit tests

Communications:
- Enhance communications table schema
- Implement GET /api/communications
- Implement POST /api/communications/:id/publish
- Add 18 unit tests

Financial Dashboard:
- Implement GET /api/financial-dashboard
- Add caching and optimization
- Add 6 unit tests

Total: 13 endpoints, 6 tables, 53 tests
Duration: 2 weeks, 51 hours"
```

### Continue similar commits for Phases 2-5...

---

## Success Criteria Summary

### Code Quality
- ✅ All new code has 85%+ test coverage
- ✅ No lint errors or warnings
- ✅ All TypeScript types properly defined
- ✅ No console.log statements in production code

### Performance
- ✅ API endpoints respond < 200ms (p95) for most endpoints
- ✅ Dashboard endpoints < 500ms (p95)
- ✅ Database queries optimized (EXPLAIN ANALYZE reviewed)
- ✅ Proper indexes on all foreign keys and frequently queried columns

### Security
- ✅ All endpoints protected by Cerbos authorization
- ✅ JWT tokens validated correctly
- ✅ No SQL injection vulnerabilities
- ✅ Sensitive data properly encrypted

### Documentation
- ✅ API.md updated with all endpoints
- ✅ README includes authorization documentation
- ✅ Inline code comments for complex logic
- ✅ Database schema fully documented

---

**Last Updated**: 2025-10-18
**Status**: Ready for Implementation
**Next Action**: Execute Quick Wins (6 hours)
**Owner**: Development Team
