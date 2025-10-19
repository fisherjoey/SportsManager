# Frontend-Backend Comprehensive Audit Plan

**Branch**: `feat/cerbos-only-migration`
**Date Created**: 2025-10-18
**Purpose**: Complete audit to determine required backend endpoints and database structure for all frontend functionality

---

## Executive Summary

This audit plan outlines a systematic approach to:
1. Identify every frontend component and page
2. Map their backend API dependencies
3. Determine required database tables and seed data
4. Fix database seed file issues

### Current State
- **Database Tables**: 121 tables
- **Frontend Components**: 229 TSX files
- **Frontend Pages**: 26 route pages
- **Backend Routes**: 95+ route files
- **Migrations**: 100+ migration files

---

## Phase 1: Frontend Page Inventory

### 1.1 Core Application Pages

#### Authentication & Onboarding
- `/login` - Login page
- `/complete-signup` - Complete user signup
- `/unauthorized` - Access denied page

#### Dashboard & Home
- `/` (root) - Main dashboard/home page
- `/notifications` - Notification center

#### Games Management
- `/games` - Games listing and management

#### Admin Pages
- `/admin-access-control` - Access control management
- `/admin-permissions` - Permissions management
- `/admin-roles` - Role management
- `/admin-security` - Security settings
- `/admin-settings` - General admin settings
- `/admin-users` - User management
- `/admin-workflows` - Workflow management
- `/admin/audit-logs` - Audit log viewer
- `/admin/notifications/broadcast` - Broadcast notifications
- `/admin/page-access` - Page access control
- `/admin/permissions` - Alternative permissions page

#### Financial Management
- `/budget` - Budget overview
- `/financial-budgets` - Budget management
- `/financial-dashboard` - Financial dashboard

#### Resources & Content
- `/resources` - Resource center home
- `/resources/[...slug]` - Dynamic resource pages
- `/resources/categories/[id]/manage` - Category management

#### Settings
- `/settings/notifications` - Notification preferences

#### Demo & Testing
- `/demo/ai-assignments` - AI assignment demo
- `/theme-demo` - Theme demonstration

### 1.2 Required API Endpoints per Page

#### `/login`
- `POST /api/auth/login`
- `POST /api/auth/register`

#### `/` (Dashboard)
- `GET /api/auth/me` - Current user profile
- `GET /api/games` - Upcoming games
- `GET /api/assignments` - User assignments
- `GET /api/notifications` - Recent notifications
- **Role-based dashboard variants**:
  - Referee dashboard
  - Assignor dashboard
  - Admin dashboard
  - League Manager dashboard
  - Finance Manager dashboard
  - Content Manager dashboard
  - Viewer dashboard

#### `/games`
- `GET /api/games` - List games (with filters)
- `POST /api/games` - Create game
- `PUT /api/games/:id` - Update game
- `DELETE /api/games/:id` - Delete game
- `PATCH /api/games/:id/status` - Update game status
- `GET /api/teams` - Get teams for game creation
- `GET /api/leagues` - Get leagues
- `GET /api/locations` - Get locations/venues

#### `/admin-users`
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user details
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/roles` - Get available roles
- `POST /api/users/:id/roles` - Assign roles

#### `/admin-roles`
- `GET /api/admin/roles` - List all roles
- `POST /api/admin/roles` - Create role
- `PUT /api/admin/roles/:id` - Update role
- `DELETE /api/admin/roles/:id` - Delete role
- `GET /api/admin/permissions` - Get available permissions
- `POST /api/admin/roles/:id/permissions` - Assign permissions

#### `/admin-permissions`
- `GET /api/admin/permissions` - List permissions
- `GET /api/admin/rbac-registry` - Get RBAC registry
- `POST /api/admin/permissions` - Create permission

#### `/admin/audit-logs`
- `GET /api/admin/audit-logs` - Get audit logs (with filters)

#### `/notifications`
- `GET /api/notifications` - List notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification
- `GET /api/notifications/preferences` - Get preferences
- `PUT /api/notifications/preferences` - Update preferences

#### `/financial-dashboard`
- `GET /api/financial-dashboard/summary` - Dashboard summary
- `GET /api/financial-transactions` - List transactions
- `GET /api/budgets` - Budget data
- `GET /api/expenses` - Expense data

#### `/financial-budgets`
- `GET /api/budgets` - List budgets
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget

#### `/resources`
- `GET /api/resources/categories` - List categories
- `GET /api/resources` - List resources
- `GET /api/resources/:slug` - Get resource
- `POST /api/resources` - Create resource
- `PUT /api/resources/:id` - Update resource
- `DELETE /api/resources/:id` - Delete resource

---

## Phase 2: Component-Level API Dependency Mapping

### 2.1 High-Value Components Requiring Analysis

Based on the component count (229 files), we need to prioritize:

#### Dashboard Components (17 files)
- `admin-dashboard.tsx`
- `assignor-dashboard.tsx`
- `referee-dashboard.tsx`
- `league-manager-dashboard.tsx`
- `finance-manager-dashboard.tsx`
- `content-manager-dashboard.tsx`
- `organizational-dashboard.tsx`
- `analytics-dashboard.tsx`
- `financial-dashboard.tsx`
- `unified-dashboard.tsx`
- Plus overview variants

#### Management Components
- `referee-management.tsx`
- `team-management.tsx`
- `league-creation.tsx`
- `tournament-generator.tsx`
- `organization-settings.tsx`
- `employee-management.tsx`

#### Assignment Components
- `my-assignments.tsx`
- `available-games.tsx`
- `assignment-comments.tsx`
- `ai-assignments-*.tsx` (3 variants)
- `self-assignment.tsx`

#### Financial Components
- `budget-tracker.tsx`
- `budget-tracker-simple.tsx`
- `expense-form.tsx`
- `expense-form-integrated.tsx`
- `expense-approval-dashboard.tsx`
- `expense-approval-details.tsx`
- `receipt-viewer.tsx`
- `credit-card-selector.tsx`
- `payment-methods.tsx`

#### Communication Components
- `NotificationList.tsx`
- `NotificationPreferences.tsx`
- `announcement-board.tsx`
- `emergency-broadcast.tsx`

#### Calendar & Availability
- `calendar-view.tsx`
- `calendar-upload.tsx`
- `availability-calendar.tsx`

#### RBAC & Access Control (Admin)
- `admin/rbac/PermissionManagementDashboard.tsx`
- `admin/rbac/RoleEditor.tsx`
- `admin/rbac/UserRoleManager.tsx`
- `admin/rbac/PermissionMatrix.tsx`
- `admin/rbac/PermissionSelector.tsx`
- `admin/rbac/RBACRegistryDashboard.tsx`
- `admin/rbac/DynamicRolePageAccessManager.tsx`
- `admin/rbac/RolePageAccessManager.tsx`

#### User Management (Admin)
- `admin/users/UserTable.tsx`
- `admin/users/UserForm.tsx`
- `admin/users/UserDetailsModal.tsx`
- `admin/users/UserFilters.tsx`

#### Mentorship System
- `admin/mentorship/MentorshipManagement.tsx`
- `admin/mentorship/MentorshipManagementEnhanced.tsx`
- `MenteeGamesView.tsx`
- `MenteeSelector.tsx`

#### Resource Center
- `resources/ResourceManager.tsx`
- `resources/ResourceEditor.tsx`
- `resources/ResourceViewer.tsx`

#### Data Tables
- `data-table/DataTable.tsx`
- `data-table/columns/game-columns.tsx`
- `data-table/columns/referee-columns.tsx`
- Multiple filter and mobile card components

### 2.2 Component Analysis Strategy

For each major component group:
1. **Read the component file**
2. **Extract all API calls** (`api.*`, `fetch()`, `axios.*`)
3. **Document the endpoints used**
4. **Note query parameters and filters**
5. **Identify required response data structure**

---

## Phase 3: Backend Route Inventory

### 3.1 Current Backend Routes (95+ files)

#### Core Routes
- `auth.ts` - Authentication
- `games.ts` - Games CRUD
- `teams.ts` - Teams management
- `leagues.ts` - Leagues management
- `referees.ts` - Referee management
- `users.ts` - User management
- `locations.ts` - Venue/location management

#### Assignment & Availability
- `assignments.ts` - Game assignments
- `availability.ts` - Referee availability
- `self-assignment.ts` - Self-service assignments
- `ai-suggestions.ts` - AI-powered suggestions
- `ai-assignment-rules.ts` - Assignment rule engine
- `historic-patterns.ts` - Pattern analysis

#### Financial System
- `budgets.ts` - Budget management
- `expenses.ts` - Expense tracking
- `financial-dashboard.ts` - Financial dashboard data
- `financial-reports.ts` - Report generation
- `financial-transactions.ts` - Transaction tracking
- `financial-approvals.ts` - Approval workflow
- `receipts.ts` - Receipt management
- `payment-methods.ts` - Payment methods
- `company-credit-cards.ts` - Credit card management
- `purchase-orders.ts` - PO management
- `game-fees.ts` - Game fee tracking
- `accounting-integration.ts` - External accounting integration

#### Admin & RBAC
- `admin/roles.ts` - Role management
- `admin/permissions.ts` - Permission management
- `admin/access.ts` - Access control
- `admin/users.ts` - Admin user management
- `admin/rbac-registry.ts` - RBAC configuration
- `admin/unified-roles.ts` - Unified role system
- `admin/cerbos-policies.ts` - Cerbos policy management
- `roles.ts` - General role operations

#### Communication
- `notifications.ts` - Notification system
- `communications.ts` - Internal communications
- `posts.ts` - Announcement posts

#### Content & Resources
- `resources.ts` - Resource center
- `documents.ts` - Document management
- `content.ts` - Content management

#### Organization
- `organization.ts` - Organization settings
- `organizational-analytics.ts` - Analytics
- `employees.ts` - Employee management
- `departments.ts` - Department management
- `compliance.ts` - Compliance tracking
- `workflows.ts` - Workflow management

#### Mentorship
- `mentorships.ts` - Mentorship program
- `mentee-games.ts` - Mentee game tracking

#### Other Features
- `calendar.ts` - Calendar operations
- `invitations.ts` - User invitations
- `tournaments.ts` - Tournament management
- `chunks.ts` - Game chunk management
- `assets.ts` - Asset tracking
- `cerbos.ts` - Cerbos authorization
- `health.ts` - Health checks
- `performance.ts` - Performance monitoring

### 3.2 Route Analysis Strategy

For each backend route:
1. **Identify all endpoints** (GET, POST, PUT, DELETE, PATCH)
2. **Document database tables accessed**
3. **List required joins/relationships**
4. **Note any complex queries or aggregations**

---

## Phase 4: Database Schema Analysis

### 4.1 Current Tables (121 total)

Key table categories identified:

#### Core Entities
- `users` - User accounts
- `games` - Game records
- `teams` - Team entities
- `leagues` - League/competition entities
- `locations` - Venues/locations
- `game_assignments` - Referee-game assignments
- `invitations` - User invitations

#### Referee System
- `referee_profiles` - Referee-specific data
- `referee_levels` - Certification levels
- `referee_roles` - Referee role assignments
- `positions` - Game positions (referee, AR1, AR2, etc.)

#### Availability System
- `referee_availability` - Availability windows (likely needs verification)
- `ai_suggestions` - AI assignment suggestions
- `assignment_patterns` - Historical patterns
- `ai_assignment_rules` - Rule configurations
- `ai_assignment_partner_preferences` - Partner preferences
- `ai_assignment_rule_runs` - Rule execution logs
- `ai_processing_logs` - AI processing history

#### Financial System
- `budgets` - Budget records
- `budget_periods` - Budget time periods
- `budget_categories` - Budget categorization
- `budget_allocations` - Budget allocations
- `budget_approvals` - Approval workflow
- `budget_alerts` - Budget alerts
- `budget_forecasts` - Forecasting
- `expense_data` - Expense records
- `expense_receipts` - Receipt storage
- `expense_categories` - Expense categories
- `expense_approvals` - Expense approval workflow
- `expense_reimbursements` - Reimbursement tracking
- `financial_transactions` - Transaction log
- `financial_reports_config` - Report configurations
- `financial_dashboards` - Dashboard configs
- `financial_kpis` - KPI tracking
- `financial_insights` - Insights/analytics
- `financial_audit_trail` - Audit trail
- `payment_methods` - Payment methods
- `company_credit_cards` - Credit cards
- `purchase_orders` - Purchase orders
- `game_fees` - Game fee tracking
- `accounting_integrations` - External integrations
- `accounting_sync_logs` - Sync logs
- `chart_of_accounts` - Accounting chart
- `journal_entries` - Journal entries
- `journal_entry_lines` - Journal entry details
- `cash_flow_forecasts` - Cash flow forecasting

#### RBAC & Access Control
- `roles` - User roles
- `user_roles` - User-role assignments
- `permissions` - Permission definitions
- `role_permissions` - Role-permission mappings
- `rbac_pages` - Page access control
- `rbac_endpoints` - Endpoint access control
- `rbac_functions` - Function access control
- `rbac_configuration_templates` - Configuration templates
- `rbac_scan_history` - Scan history
- `access_control_audit` - Access audit logs
- `audit_logs` - General audit logs

#### Content & Communication
- `content_items` - Content records
- `content_categories` - Content categories
- `content_tags` - Content tags
- `content_item_tags` - Tag assignments
- `content_versions` - Version history
- `content_permissions` - Content permissions
- `content_analytics` - Analytics
- `content_analytics_monthly` - Monthly analytics
- `content_attachments` - File attachments
- `content_search_index` - Search index
- `posts` - Announcement posts
- `post_categories` - Post categories
- `post_media` - Post media attachments
- `post_reads` - Read tracking
- `notifications` - Notification records
- `notification_preferences` - User preferences
- `internal_communications` - Internal comms
- `communication_recipients` - Recipient tracking
- `documents` - Document storage
- `document_versions` - Document versions
- `document_access` - Access tracking
- `document_acknowledgments` - Acknowledgment tracking

#### Resources
- `resource_categories` - Resource categories
- `resource_category_permissions` - Category permissions
- `resource_category_managers` - Category managers
- `resource_audit_log` - Resource audit trail
- `resource_access_logs` - Access logs
- `resource_versions` - Version history (possible)

#### Organization
- `organizations` - Organization entities
- `organization_settings` - Org settings
- `departments` - Departments
- `employees` - Employee records
- `employee_evaluations` - Performance reviews
- `job_positions` - Job positions
- `compliance_tracking` - Compliance records
- `approval_workflows` - Workflow definitions
- `approval_requests` - Approval requests
- `incidents` - Incident tracking
- `assets` - Asset records
- `asset_checkouts` - Asset checkout tracking
- `asset_maintenance` - Maintenance logs

#### Mentorship
- `mentorships` - Mentorship relationships
- `mentorship_notes` - Notes/feedback
- `mentorship_documents` - Related documents

#### Game Management
- `game_chunks` - Game chunk definitions
- `chunk_games` - Games in chunks
- `tournaments` - Tournament records

#### Migration Tracking
- `knex_migrations` - Migration history
- `knex_migrations_lock` - Migration locks

### 4.2 Tables Requiring Verification

These tables may or may not exist or may need updates:
- Referee availability windows (current structure unclear)
- User location data for distance calculations
- Resource items/files (may be missing)

---

## Phase 5: Seed Data Requirements

### 5.1 Critical Seed Data

#### Must-Have Seeds
1. **Roles & Permissions**
   - Super Admin role
   - Admin role
   - Assignor role
   - Referee role
   - League Manager role
   - Finance Manager role
   - Content Manager role
   - Viewer role
   - Core permissions for each role

2. **Referee Levels**
   - Certification level definitions
   - Associated wage rates

3. **Game Positions**
   - Referee
   - AR1 (Assistant Referee 1)
   - AR2 (Assistant Referee 2)
   - 4th Official
   - Other sport-specific positions

4. **Organizations** (if multi-tenant)
   - Default organization
   - Organization settings

5. **Content Categories** (if resource center is core)
   - Document categories
   - Resource categories

6. **Budget Categories**
   - Standard expense categories
   - Budget category hierarchy

7. **Post Categories**
   - Announcement categories

8. **Locations** (sample data)
   - Sample venues for testing

9. **Test Users**
   - Admin user
   - Assignor user
   - Sample referees
   - Sample league managers

10. **Sample Data** (for testing/demo)
    - Sample teams
    - Sample leagues
    - Sample games
    - Sample assignments

### 5.2 Seed File Strategy

Current issue: Multiple seed files may conflict or be outdated.

**Recommendation**:
1. **Single consolidated seed file** (`001_full_database.js`)
2. **Idempotent seeds** (can run multiple times safely)
3. **Environment-specific seeds**:
   - Development: Full sample data
   - Staging: Minimal test data
   - Production: Only essential reference data

---

## Phase 6: Execution Plan

### Step 1: Component Audit (Systematic Analysis)
**Goal**: Extract all API calls from frontend components

**Approach**:
1. Use automated script to grep for API patterns:
   ```bash
   # Find all API calls
   grep -r "api\." frontend/components/ --include="*.tsx"
   grep -r "fetch(" frontend/ --include="*.tsx"
   grep -r "axios." frontend/ --include="*.tsx"
   ```

2. Manually review high-value components:
   - All dashboard components
   - All management components
   - All RBAC/admin components
   - Financial components
   - Data table components

3. Create mapping document:
   ```
   Component -> Endpoints Used -> Database Tables
   ```

### Step 2: Backend Route Audit
**Goal**: Document all endpoints and their database dependencies

**Approach**:
1. For each route file in `backend/src/routes/`:
   - Extract all route definitions (GET, POST, PUT, DELETE, PATCH)
   - Identify database queries (look for `knex`, `db`, query builders)
   - Document tables accessed
   - Note any complex joins or aggregations

2. Create comprehensive endpoint catalog:
   ```
   Endpoint -> Tables Used -> Joins -> Special Logic
   ```

### Step 3: Database Schema Verification
**Goal**: Ensure all required tables exist and are properly seeded

**Approach**:
1. Query database for actual table list
2. Cross-reference with migration files
3. Identify:
   - Missing tables
   - Tables without seed data
   - Tables with incorrect structure

### Step 4: Seed File Consolidation
**Goal**: Create reliable, idempotent seed data

**Approach**:
1. Review current seed files
2. Identify conflicts and duplicates
3. Create new consolidated seed strategy:
   - `001_reference_data.js` - Roles, permissions, levels, categories
   - `002_test_users.js` - Sample users for development
   - `003_sample_data.js` - Games, teams, assignments for testing

4. Ensure all seeds use:
   - `knex.raw('ON CONFLICT DO NOTHING')` for PostgreSQL
   - Proper foreign key ordering
   - Transaction wrapping

### Step 5: Integration Testing
**Goal**: Verify all frontend features work with backend

**Approach**:
1. Page-by-page testing:
   - Load each page
   - Verify API calls succeed
   - Check data displays correctly

2. Component testing:
   - Test all CRUD operations
   - Verify filters work
   - Check permissions/authorization

3. End-to-end flows:
   - User registration → role assignment → login
   - Game creation → referee assignment → approval
   - Expense submission → approval → payment

### Step 6: Documentation & Cleanup
**Goal**: Document findings and clean up codebase

**Approach**:
1. Create final documentation:
   - API endpoint reference
   - Database schema ERD
   - Seed data requirements
   - Known issues and technical debt

2. Code cleanup:
   - Remove unused components
   - Delete deprecated routes
   - Archive old migration files
   - Update README files

---

## Phase 7: Deliverables

### 7.1 Primary Deliverables

1. **Frontend Component Inventory** (`FRONTEND_COMPONENTS.md`)
   - Complete list of all components
   - Their purposes
   - API dependencies
   - Database table dependencies

2. **Backend API Reference** (`BACKEND_API_REFERENCE.md`)
   - All endpoints documented
   - Request/response formats
   - Required permissions
   - Database operations

3. **Database Schema Document** (`DATABASE_SCHEMA.md`)
   - ERD diagram
   - Table descriptions
   - Relationships
   - Indexes and constraints

4. **Seed Data Specification** (`SEED_DATA_SPEC.md`)
   - Required seed data
   - Seed execution order
   - Development vs production seeds

5. **Integration Test Plan** (`INTEGRATION_TEST_PLAN.md`)
   - Critical user flows
   - API integration tests
   - Database integrity tests

### 7.2 Secondary Deliverables

1. **Technical Debt Report**
   - Unused code
   - Missing features
   - Inconsistencies
   - Performance issues

2. **Migration Guide**
   - How to set up fresh database
   - How to migrate existing data
   - Troubleshooting guide

---

## Timeline Estimate

### Aggressive Timeline (2-3 days)
- **Day 1**: Component audit + Backend route audit (Phases 1-2)
- **Day 2**: Database verification + Seed consolidation (Phases 3-4)
- **Day 3**: Integration testing + Documentation (Phases 5-6)

### Realistic Timeline (5-7 days)
- **Days 1-2**: Complete component and page analysis
- **Days 3-4**: Backend route documentation and database verification
- **Day 5**: Seed file consolidation and testing
- **Days 6-7**: Integration testing and final documentation

### Thorough Timeline (10-14 days)
- **Week 1**: Full frontend analysis, backend route audit
- **Week 2**: Database verification, seed consolidation, testing, documentation, cleanup

---

## Next Steps

### Immediate Actions
1. ✅ Create this audit plan
2. Start Phase 1: Component inventory with automated extraction
3. Set up audit tracking spreadsheet/database
4. Begin systematic component analysis

### Questions to Answer
1. What is the deployment environment? (Dev/Staging/Prod)
2. Are there any features that should be deprecated?
3. What is the priority order for fixing issues?
4. Should we focus on core features first or complete audit?

---

## Tools & Automation

### Recommended Tools
1. **API extraction**: Custom grep scripts
2. **Database schema visualization**: pgAdmin, DBeaver, or dbdiagram.io
3. **Documentation**: Markdown files in repository
4. **Tracking**: Spreadsheet or Notion database

### Automation Scripts Needed
1. `extract-api-calls.sh` - Extract all API calls from frontend
2. `document-routes.sh` - Document all backend routes
3. `verify-schema.sh` - Verify database schema
4. `test-seeds.sh` - Test seed file execution

---

## Success Criteria

This audit is successful when:
1. ✅ Every frontend page is documented with its API dependencies
2. ✅ Every component's API calls are cataloged
3. ✅ Every backend endpoint is documented with database dependencies
4. ✅ Database schema is fully documented and verified
5. ✅ Seed files run successfully and create consistent data
6. ✅ All critical user flows work end-to-end
7. ✅ Technical debt is identified and prioritized
8. ✅ Team has clear documentation for future development
