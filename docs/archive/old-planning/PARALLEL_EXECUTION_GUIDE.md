# Parallel Execution Guide - Frontend/Backend Audit

**Purpose**: Run 6 independent audit sessions in parallel for maximum speed
**Timeline**: 2-3 days with parallel execution
**Context**: All sessions have access to existing analysis files

---

## 📋 **Quick Start: Copy-Paste These Prompts**

Open 6 separate Claude Code sessions and paste each prompt. Each session is fully independent.

---

## 🎯 **SESSION 1: Frontend Component Analysis**

### Prompt to Copy:
```
I'm conducting a comprehensive frontend-backend audit for a sports management application. The frontend is the source of truth - it defines what the backend must implement.

CONTEXT:
- Branch: feat/cerbos-only-migration
- Read AUDIT_EXECUTION_SUMMARY.md and COMPONENT_ANALYSIS.md for full context
- We've identified 130 components that need API integration but don't have it yet
- Location: C:/Users/School/OneDrive/Desktop/SportsManager-pre-typescript

TASK:
Systematically review the top 40 disconnected components (highest priority) and document their API requirements.

For each component:
1. Read the component file
2. Analyze what data it displays/manages
3. Determine required API endpoints (GET, POST, PUT, DELETE, PATCH)
4. Define expected request/response data structures
5. List required database tables
6. Note any special requirements (filters, pagination, etc.)

DELIVERABLES:
Create MISSING_API_ENDPOINTS.md with this structure:

# Missing API Endpoints - Frontend Requirements

## Component: [ComponentName]
**Path**: [file path]
**Purpose**: [what it does]

### Required Endpoints:
- `GET /api/[resource]` - [description]
  - Query params: [list]
  - Response: [data structure]
  - Database tables: [list]

- `POST /api/[resource]` - [description]
  - Request body: [structure]
  - Response: [structure]
  - Database tables: [list]

[Repeat for each endpoint]

### Data Structures:
```typescript
interface Example {
  // Define TypeScript interfaces
}
```

---

START WITH:
Priority components from COMPONENT_ANALYSIS.md:
1. UnifiedAccessControlDashboard.tsx
2. MentorshipManagement.tsx
3. PermissionManagementDashboard.tsx
4. RoleEditor.tsx
5. UserManagementDashboard.tsx
6. analytics-dashboard.tsx
7. budget-tracker.tsx
8. calendar-view.tsx
9. financial-dashboard.tsx
10. team-management.tsx
... (continue through top 40)

Be thorough and systematic. The frontend is the source of truth.
```

---

## 🔧 **SESSION 2: Backend Route Extraction**

### Prompt to Copy:
```
I'm conducting a comprehensive frontend-backend audit for a sports management application. I need to catalog ALL existing backend routes.

CONTEXT:
- Branch: feat/cerbos-only-migration
- Read AUDIT_EXECUTION_SUMMARY.md for full context
- Backend routes: backend/src/routes/**/*.ts (95+ files)
- Location: C:/Users/School/OneDrive/Desktop/SportsManager-pre-typescript

TASK:
Create a comprehensive catalog of all existing backend API endpoints.

For each route file:
1. Extract all route definitions (router.get, router.post, etc.)
2. Document the HTTP method and full endpoint path
3. Identify database tables accessed (look for knex() calls, db. calls)
4. Note any query parameters, body requirements
5. Document authentication/authorization requirements
6. Identify any Cerbos policy checks
7. Note special features (pagination, filtering, etc.)

DELIVERABLES:
1. Create a script: extract-backend-routes.js
   - Parse all TypeScript route files
   - Extract route definitions
   - Identify database operations
   - Output structured data

2. Create BACKEND_ROUTES_CATALOG.md:

# Backend Routes Catalog - Current Implementation

## Summary
- Total route files: [count]
- Total endpoints: [count]
- Endpoints by category: [breakdown]

## Routes by Category

### Auth (/api/auth)
#### GET /api/auth/me
- **File**: backend/src/routes/auth.ts:line
- **Authentication**: Required (JWT)
- **Authorization**: Any authenticated user
- **Database tables**: users, roles, user_roles
- **Returns**: Current user profile with roles
- **Query params**: None
- **Notes**: [any special logic]

[Continue for ALL endpoints]

## Database Table Usage Summary
- users: Used by [list of endpoints]
- games: Used by [list of endpoints]
[etc.]

## Missing/Incomplete Implementations
- [List any TODOs, commented code, or incomplete routes]

---

Run the extraction script and generate the complete catalog. Be thorough.
```

---

## 💾 **SESSION 3: Database Schema Documentation**

### Prompt to Copy:
```
I'm conducting a comprehensive frontend-backend audit for a sports management application. I need complete database schema documentation.

CONTEXT:
- Branch: feat/cerbos-only-migration
- Read AUDIT_EXECUTION_SUMMARY.md for full context
- Database: PostgreSQL, name: sports_management
- Connection: PGPASSWORD=postgres123 "C:/Program Files/PostgreSQL/17/bin/psql.exe" -U postgres -h localhost -p 5432 -d sports_management
- Current tables: 121
- Location: C:/Users/School/OneDrive/Desktop/SportsManager-pre-typescript

TASK:
Query the database and create comprehensive schema documentation.

Steps:
1. Query ALL tables in the database
2. For each table, get:
   - All columns with data types
   - Primary keys
   - Foreign keys and relationships
   - Indexes
   - Constraints (NOT NULL, UNIQUE, CHECK, etc.)
   - Default values
3. Identify table relationships and cardinality
4. Group tables by functional area

DELIVERABLES:
1. Create a script: extract-database-schema.js
   - Connect to PostgreSQL
   - Query information_schema
   - Extract complete schema
   - Output structured data

2. Create DATABASE_SCHEMA_COMPLETE.md:

# Database Schema - Complete Documentation

## Summary
- Total tables: [count]
- Tables by category: [breakdown]

## Schema by Category

### Core User Management
#### Table: users
- **Purpose**: User accounts and authentication
- **Relationships**:
  - Has many: user_roles, game_assignments
  - Belongs to: organizations

**Columns**:
| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | uuid_generate_v4() | PRIMARY KEY |
| email | varchar(255) | NOT NULL | - | UNIQUE |
| password_hash | varchar(255) | NOT NULL | - | - |
[etc.]

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_users_email (email)
- INDEX idx_users_created_at (created_at)

**Foreign Keys**:
- organization_id -> organizations(id) ON DELETE CASCADE

[Continue for ALL tables]

3. Generate comprehensive Mermaid ERD and update docs/reports/database-diagram-latest.md

Be extremely thorough. This is the foundation document.
```

---

## 🔍 **SESSION 4: Gap Analysis**

### Prompt to Copy:
```
I'm conducting a comprehensive frontend-backend audit for a sports management application. I need a complete gap analysis.

CONTEXT:
- Branch: feat/cerbos-only-migration
- Read these files for full context:
  - AUDIT_EXECUTION_SUMMARY.md
  - MISSING_API_ENDPOINTS.md (from Session 1)
  - BACKEND_ROUTES_CATALOG.md (from Session 2)
  - DATABASE_SCHEMA_COMPLETE.md (from Session 3)
- Location: C:/Users/School/OneDrive/Desktop/SportsManager-pre-typescript

TASK:
Compare frontend requirements against backend implementation and identify ALL gaps.

Analysis Steps:
1. Load frontend requirements (MISSING_API_ENDPOINTS.md)
2. Load backend catalog (BACKEND_ROUTES_CATALOG.md)
3. Cross-reference each required endpoint:
   - ✅ Exists and correct
   - ⚠️ Exists but incomplete/incorrect
   - ❌ Missing entirely
4. For each gap, identify:
   - Required database tables (do they exist?)
   - Required database columns (schema correct?)
   - Implementation complexity (simple CRUD vs complex)
   - Dependencies (what else is needed?)

DELIVERABLES:
Create IMPLEMENTATION_GAPS.md:

# Implementation Gaps - Frontend vs Backend

## Executive Summary
- Total required endpoints: [count]
- Implemented correctly: [count] ([percentage]%)
- Partially implemented: [count] ([percentage]%)
- Missing entirely: [count] ([percentage]%)

## Priority 1: Critical Missing Endpoints
These are needed for core functionality:

### Missing: GET /api/users
**Required by**: UserManagementDashboard.tsx, UserTable.tsx
**Purpose**: List all users with pagination and filters
**Database tables needed**: users, roles, user_roles (✅ exist / ❌ missing)
**Implementation complexity**: Medium
**Estimated effort**: 2-3 hours
**Dependencies**: None
**Notes**: [any special considerations]

[Continue for all missing endpoints]

## Priority 2: Incorrect Implementations
These exist but don't match frontend expectations:

### Issue: GET /api/games returns wrong data structure
**Current implementation**: Returns snake_case
**Frontend expects**: camelCase
**Components affected**: [list]
**Fix required**: [description]
**Estimated effort**: 1 hour

## Priority 3: Database Schema Gaps

### Missing Table: referee_certifications
**Required by**: RefereeTypeManager.tsx
**Purpose**: Store referee certification details
**Schema**:
```sql
CREATE TABLE referee_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ...
);
```
**Migration needed**: Yes
**Estimated effort**: 2 hours

## Implementation Roadmap
Suggested order of implementation:
1. [Critical endpoints first]
2. [Database fixes]
3. [Lower priority endpoints]

Be comprehensive and prioritize by impact.
```

---

## 🌱 **SESSION 5: Seed File Consolidation**

### Prompt to Copy:
```
I'm conducting a comprehensive frontend-backend audit for a sports management application. The seed files have conflicts and issues. I need to fix them.

CONTEXT:
- Branch: feat/cerbos-only-migration
- Read AUDIT_EXECUTION_SUMMARY.md and DATABASE_SCHEMA_COMPLETE.md
- Current seed files: backend/seeds/ (multiple files with conflicts)
- Database: sports_management (PostgreSQL)
- Location: C:/Users/School/OneDrive/Desktop/SportsManager-pre-typescript

TASK:
Analyze current seed files, identify issues, and create consolidated, working seed files.

Analysis Steps:
1. Review all existing seed files in backend/seeds/
2. Identify conflicts (duplicate data, FK violations, etc.)
3. Determine required seed data:
   - Reference data (roles, permissions, levels, categories)
   - Test users for each role type
   - Sample data for development
4. Design idempotent seed strategy (can run multiple times safely)
5. Implement consolidated seed files
6. Test execution thoroughly

DELIVERABLES:
1. Create SEED_FILE_ANALYSIS.md:
   - Document current seed file issues
   - List conflicts found
   - Explain resolution strategy

2. Create new consolidated seed files:
   - 001_reference_data.js - Roles, permissions, levels, categories
   - 002_test_users.js - Admin, assignor, referee, etc.
   - 003_sample_locations.js - Venues for testing
   - 004_sample_data.js - Games, teams, leagues for testing

3. Create SEED_DATA_GUIDE.md:

# Seed Data Guide

## Overview
Consolidated seed file strategy for sports management application.

## Seed File Execution Order
1. 001_reference_data.js - Core reference data
2. 002_test_users.js - Test user accounts
3. 003_sample_locations.js - Venue data
4. 004_sample_data.js - Sample games/teams

## Reference Data Included
### Roles
- Super Admin - Full system access
- Admin - Administrative access
- Assignor - Game assignment management
[etc.]

### Permissions
[Complete list]

### Referee Levels
- Level 1: Recreational ($X/game)
- Level 2: Competitive ($Y/game)
[etc.]

## Test Users
| Email | Password | Roles |
|-------|----------|-------|
| admin@sportsmanager.com | admin123 | Super Admin |
[etc.]

## Running Seeds
```bash
npm run seed:run
```

## Idempotency
All seeds use ON CONFLICT DO NOTHING to allow safe re-running.

Test the seeds thoroughly and document any issues found.
```

---

## 📚 **SESSION 6: Documentation Synthesis**

### Prompt to Copy:
```
I'm conducting a comprehensive frontend-backend audit for a sports management application. I need to synthesize all findings and update documentation.

CONTEXT:
- Branch: feat/cerbos-only-migration
- Read ALL generated files:
  - AUDIT_EXECUTION_SUMMARY.md
  - MISSING_API_ENDPOINTS.md (Session 1)
  - BACKEND_ROUTES_CATALOG.md (Session 2)
  - DATABASE_SCHEMA_COMPLETE.md (Session 3)
  - IMPLEMENTATION_GAPS.md (Session 4)
  - SEED_DATA_GUIDE.md (Session 5)
- Location: C:/Users/School/OneDrive/Desktop/SportsManager-pre-typescript

TASK:
Update all existing documentation with findings and create final implementation roadmap.

Tasks:
1. Update backend/docs/API.md with complete endpoint documentation
2. Update docs/backend/ENTERPRISE-API-DOCUMENTATION.md
3. Update docs/reports/database-diagram-latest.md with new ERD
4. Create FINAL_IMPLEMENTATION_ROADMAP.md
5. Create priority action checklist

DELIVERABLES:

1. Update backend/docs/API.md:
   - Add all endpoints from BACKEND_ROUTES_CATALOG.md
   - Include request/response examples
   - Document authentication/authorization
   - Add error codes and handling

2. Update docs/backend/ENTERPRISE-API-DOCUMENTATION.md:
   - Expand with new endpoints
   - Add missing sections
   - Include data models

3. Update docs/reports/database-diagram-latest.md:
   - Replace with comprehensive ERD from Session 3
   - Add table descriptions
   - Document relationships clearly

4. Create FINAL_IMPLEMENTATION_ROADMAP.md:

# Final Implementation Roadmap

## Executive Summary
This roadmap implements all missing features to connect the frontend to a fully functional backend.

### Current State
- Frontend: 100% complete (source of truth)
- Backend: X% implemented
- Database: Y% schema complete
- Seed data: Fixed and working

### Implementation Required
- Missing endpoints: [count]
- Database migrations: [count]
- Estimated total effort: [hours/days]

## Phase 1: Critical Path (Week 1)
Priority 1 items from IMPLEMENTATION_GAPS.md

### Day 1-2: User Management & RBAC
- [ ] Implement GET /api/users
- [ ] Implement POST /api/users
[etc.]

### Day 3-4: Games & Assignments
[etc.]

## Phase 2: Secondary Features (Week 2)
[etc.]

## Phase 3: Polish & Testing (Week 3)
[etc.]

## Success Criteria
- [ ] All 130 disconnected components have working APIs
- [ ] All seed files run successfully
- [ ] Complete end-to-end testing passes
- [ ] All documentation updated

5. Create PRIORITY_ACTION_CHECKLIST.md:
   - Immediate next steps
   - Prioritized task list
   - Quick wins vs long-term items

Synthesize everything into clear, actionable documentation.
```

---

## 🚀 **Execution Instructions**

### Step 1: Open 6 Claude Code Sessions
1. Open 6 separate chat windows/tabs
2. Ensure each is in the project directory

### Step 2: Paste Prompts
1. Copy Session 1 prompt → Paste in Chat 1 → Hit enter
2. Copy Session 2 prompt → Paste in Chat 2 → Hit enter
3. Copy Session 3 prompt → Paste in Chat 3 → Hit enter
4. Copy Session 4 prompt → Paste in Chat 4 → Hit enter (WAIT for 1-3 to complete first)
5. Copy Session 5 prompt → Paste in Chat 5 → Hit enter
6. Copy Session 6 prompt → Paste in Chat 6 → Hit enter (WAIT for 1-5 to complete first)

### Step 3: Dependencies
- Sessions 1, 2, 3, 5 can run immediately in parallel
- Session 4 needs Sessions 1, 2, 3 to complete first
- Session 6 needs all others to complete first

### Step 4: Monitor Progress
Each session will:
1. Confirm it understands the task
2. Show progress updates
3. Generate its deliverable file(s)
4. Report completion

---

## ⏱️ **Expected Timeline**

### With Full Parallel Execution:
- **Hour 0**: Start Sessions 1, 2, 3, 5 (parallel)
- **Hour 2-3**: Sessions 1, 2, 3, 5 complete
- **Hour 3**: Start Session 4 (needs 1, 2, 3 outputs)
- **Hour 4-5**: Session 4 completes
- **Hour 5**: Start Session 6 (needs all outputs)
- **Hour 6-7**: Session 6 completes, DONE ✅

### Total Time: 6-7 hours of work completed in ~7 hours elapsed

---

## 📊 **Expected Outputs**

After all sessions complete, you'll have:

1. ✅ MISSING_API_ENDPOINTS.md - What frontend needs
2. ✅ BACKEND_ROUTES_CATALOG.md - What backend has
3. ✅ DATABASE_SCHEMA_COMPLETE.md - Complete DB docs
4. ✅ IMPLEMENTATION_GAPS.md - Detailed gap analysis
5. ✅ SEED_DATA_GUIDE.md - Working seed files
6. ✅ FINAL_IMPLEMENTATION_ROADMAP.md - Action plan
7. ✅ Updated API.md
8. ✅ Updated ENTERPRISE-API-DOCUMENTATION.md
9. ✅ Updated database-diagram-latest.md
10. ✅ PRIORITY_ACTION_CHECKLIST.md

---

## 🎯 **Success Criteria**

All sessions successful when:
- [ ] All 6 deliverable files created
- [ ] Existing docs updated
- [ ] Clear implementation roadmap
- [ ] No gaps in analysis
- [ ] Ready to start building

---

## 💡 **Tips for Success**

1. **Start 1, 2, 3, 5 immediately** - They're independent
2. **Wait for Session 4** - It needs inputs from 1, 2, 3
3. **Session 6 goes last** - It synthesizes everything
4. **Check each output** - Ensure quality before moving on
5. **Ask clarifying questions** - Each session can be refined

---

## 🆘 **If Something Goes Wrong**

If a session gets stuck or produces unclear output:
1. Read what it produced so far
2. Ask it clarifying questions
3. Redirect with more specific instructions
4. Or restart that session with a refined prompt

---

**Ready to launch! Copy-paste the prompts into 6 separate sessions and let's go! 🚀**
