# Backend Routes Catalog - Current Implementation

**Generated**: 2025-10-18T21:33:45.151Z
**Branch**: feat/cerbos-only-migration
**Routes Directory**: backend/src/routes

---

## Executive Summary

- **Total Route Files**: 75
- **Total Endpoints**: 330
- **Database Tables Used**: 147
- **Files with Issues**: 0

### Endpoints by HTTP Method

- **GET**: 160 endpoints
- **POST**: 82 endpoints
- **PUT**: 42 endpoints
- **DELETE**: 36 endpoints
- **PATCH**: 10 endpoints

### Endpoints by Category

- **admin**: 56 endpoints
- **referees**: 18 endpoints
- **mentorships**: 14 endpoints
- **employees**: 13 endpoints
- **cerbos**: 12 endpoints
- **ai-assignment-rules**: 10 endpoints
- **assets**: 10 endpoints
- **budgets**: 10 endpoints
- **documents**: 10 endpoints
- **locations**: 10 endpoints
- **accounting-integration**: 9 endpoints
- **assignments**: 8 endpoints
- **content**: 8 endpoints
- **organizational-analytics**: 8 endpoints
- **financial-reports**: 7 endpoints
- **financial-transactions**: 7 endpoints
- **notifications**: 7 endpoints
- **referee-roles**: 7 endpoints
- **availability**: 6 endpoints
- **calendar**: 6 endpoints
- **company-credit-cards**: 6 endpoints
- **posts**: 6 endpoints
- **teams**: 6 endpoints
- **auth**: 5 endpoints
- **chunks**: 5 endpoints
- **games**: 5 endpoints
- **leagues**: 5 endpoints
- **purchase-orders**: 5 endpoints
- **historic-patterns**: 4 endpoints
- **mentee-games**: 4 endpoints
- **payment-methods**: 4 endpoints
- **reports**: 4 endpoints
- **tournaments**: 4 endpoints
- **users**: 4 endpoints
- **expenses**: 3 endpoints
- **invitations**: 3 endpoints
- **receipts**: 3 endpoints
- **roles**: 3 endpoints
- **ai-suggestions**: 2 endpoints
- **budget-tracker**: 2 endpoints
- **communications**: 2 endpoints
- **game-fees**: 2 endpoints
- **organization**: 2 endpoints
- **referee-levels**: 2 endpoints
- **financial-dashboard**: 1 endpoints
- **referees.bridge**: 1 endpoints
- **self-assignment**: 1 endpoints

---

## Routes by Category

### Accounting-integration (9 endpoints)

**File Description**: GET /api/accounting/chart-of-accounts

#### GET /chart-of-accounts

- **File**: backend\src\routes\accounting-integration.ts:79
- **Authentication**: Required
- **Database Tables**: chart_of_accounts
- **Features**: filtering
- **Description**: GET /api/accounting/chart-of-accounts

#### POST /chart-of-accounts

- **File**: backend\src\routes\accounting-integration.ts:137
- **Authentication**: Required
- **Database Tables**: chart_of_accounts, accounting_integrations
- **Features**: filtering
- **Description**: POST /api/accounting/chart-of-accounts

#### GET /integrations

- **File**: backend\src\routes\accounting-integration.ts:210
- **Authentication**: Required
- **Database Tables**: accounting_integrations
- **Features**: filtering
- **Description**: GET /api/accounting/integrations

#### POST /integrations

- **File**: backend\src\routes\accounting-integration.ts:247
- **Authentication**: Required
- **Database Tables**: accounting_integrations, integration
- **Features**: filtering
- **Description**: POST /api/accounting/integrations

#### POST /integrations/:id/test

- **File**: backend\src\routes\accounting-integration.ts:301
- **Authentication**: Required
- **Database Tables**: accounting_integrations, journal_entries as je, journal_entry_lines as jel, integration
- **Features**: pagination, filtering
- **Description**: POST /api/accounting/integrations/:id/test

#### GET /journal-entries

- **File**: backend\src\routes\accounting-integration.ts:348
- **Authentication**: Required
- **Database Tables**: journal_entries as je, journal_entry_lines as jel
- **Features**: pagination, filtering
- **Description**: GET /api/accounting/journal-entries

#### POST /journal-entries

- **File**: backend\src\routes\accounting-integration.ts:436
- **Authentication**: Required
- **Database Tables**: chart_of_accounts, journal_entries, journal_entry_lines, journal_entries as je, journal_entry_lines as jel
- **Features**: pagination, filtering
- **Description**: POST /api/accounting/journal-entries

#### POST /journal-entries/:id/approve

- **File**: backend\src\routes\accounting-integration.ts:560
- **Authentication**: Required
- **Database Tables**: journal_entries, accounting_sync_logs as asl
- **Features**: pagination, filtering
- **Description**: POST /api/accounting/journal-entries/:id/approve

#### GET /sync-logs

- **File**: backend\src\routes\accounting-integration.ts:608
- **Authentication**: Required
- **Database Tables**: accounting_sync_logs as asl
- **Features**: pagination, filtering
- **Description**: GET /api/accounting/sync-logs


### Admin (56 endpoints)

**File Description**: Access Control API Routes

#### GET /:name

- **File**: backend\src\routes\admin\unified-roles.ts:451
- **Authentication**: Required
- **Database Tables**: role_pages, permissions
- **Features**: filtering
- **Description**: GET /api/admin/unified-roles/:name - Get specific role details

#### PUT /:name

- **File**: backend\src\routes\admin\unified-roles.ts:590
- **Authentication**: Required
- **Database Tables**: role_pages, existing, permissions, pages, or, role
- **Features**: filtering
- **Description**: PUT /api/admin/unified-roles/:name - Update existing role

#### DELETE /:name

- **File**: backend\src\routes\admin\unified-roles.ts:687
- **Authentication**: Required
- **Database Tables**: role, database
- **Features**: filtering
- **Description**: DELETE /api/admin/unified-roles/:name - Delete role

#### GET /:roleId

- **File**: backend\src\routes\admin\roles.ts:335
- **Authentication**: Required
- **Database Tables**: Cerbos, role, or
- **Description**: GET /api/admin/roles/:roleId - Get specific role with permissions

#### PUT /:roleId

- **File**: backend\src\routes\admin\roles.ts:434
- **Authentication**: Required
- **Database Tables**: role, or, Cerbos
- **Description**: PUT /api/admin/roles/:roleId - Update role

#### DELETE /:roleId

- **File**: backend\src\routes\admin\roles.ts:484
- **Authentication**: Required
- **Database Tables**: role, database, Cerbos
- **Description**: DELETE /api/admin/roles/:roleId - Delete role

#### GET /:roleId/hierarchy

- **File**: backend\src\routes\admin\roles.ts:798
- **Authentication**: Required
- **Database Tables**: role
- **Description**: GET /api/admin/roles/:roleId/hierarchy - Get role hierarchy (future feature)

#### POST /:roleId/permissions

- **File**: backend\src\routes\admin\roles.ts:528
- **Authentication**: Required
- **Database Tables**: database, Cerbos
- **Description**: POST /api/admin/roles/:roleId/permissions - Assign permissions to role

#### DELETE /:roleId/permissions

- **File**: backend\src\routes\admin\roles.ts:584
- **Authentication**: Required
- **Features**: pagination, filtering
- **Description**: DELETE /api/admin/roles/:roleId/permissions - Remove permissions from role

#### PATCH /:roleId/status

- **File**: backend\src\routes\admin\roles.ts:750
- **Authentication**: Required
- **Database Tables**: role
- **Description**: PATCH /api/admin/roles/:roleId/status - Activate/deactivate role

#### GET /:roleId/users

- **File**: backend\src\routes\admin\roles.ts:625
- **Authentication**: Required
- **Features**: pagination, filtering
- **Description**: GET /api/admin/roles/:roleId/users - Get users with this role

#### POST /:roleId/users

- **File**: backend\src\routes\admin\roles.ts:664
- **Authentication**: Required
- **Features**: filtering
- **Description**: POST /api/admin/roles/:roleId/users - Add users to role

#### DELETE /:roleId/users

- **File**: backend\src\routes\admin\roles.ts:707
- **Authentication**: Required
- **Database Tables**: role
- **Description**: DELETE /api/admin/roles/:roleId/users - Remove users from role

#### GET /:userId/roles

- **File**: backend\src\routes\admin\users.ts:70
- **Authentication**: Required
- **Database Tables**: user_roles, users, roles, , 
- **Features**: filtering
- **Description**: GET /api/admin/users/:userId/roles

#### PUT /:userId/roles

- **File**: backend\src\routes\admin\users.ts:105
- **Authentication**: Required
- **Database Tables**: users, roles, user_roles, user
- **Features**: filtering
- **Description**: PUT /api/admin/users/:userId/roles

#### POST /:userId/roles

- **File**: backend\src\routes\admin\users.ts:190
- **Authentication**: Required
- **Database Tables**: users, roles, user_roles, user
- **Features**: filtering
- **Description**: POST /api/admin/users/:userId/roles

#### DELETE /:userId/roles

- **File**: backend\src\routes\admin\users.ts:275
- **Authentication**: Required
- **Database Tables**: users, user_roles
- **Features**: filtering
- **Description**: DELETE /api/admin/users/:userId/roles

#### GET /api-registry

- **File**: backend\src\routes\admin\access.ts:354
- **Authentication**: Required
- **Database Tables**: API, feature
- **Description**: GET /api/admin/access/api-registry

#### POST /auto-configure

- **File**: backend\src\routes\admin\rbac-registry.ts:175
- **Authentication**: None
- **Database Tables**: rbac_page_permissions, rbac_api_permissions, rbac_scan_history
- **Features**: pagination, filtering
- **Description**: POST /api/admin/rbac-registry/auto-configure

#### GET /available-permissions

- **File**: backend\src\routes\admin\unified-roles.ts:380
- **Authentication**: Required
- **Features**: filtering
- **Description**: GET /api/admin/unified-roles/available-permissions - Get all available permissions from Cerbos

#### GET /categories

- **File**: backend\src\routes\admin\permissions.ts:217
- **Authentication**: Required
- **Description**: GET /api/admin/permissions/categories - Get all permission categories

#### GET /category/:category

- **File**: backend\src\routes\admin\permissions.ts:180
- **Authentication**: Required
- **Description**: GET /api/admin/permissions/category/:category - Get permissions by category

#### POST /check-api

- **File**: backend\src\routes\admin\access.ts:535
- **Authentication**: Required
- **Description**: POST /api/admin/access/check-api

#### POST /check-feature

- **File**: backend\src\routes\admin\access.ts:561
- **Authentication**: Required
- **Description**: POST /api/admin/access/check-feature

#### POST /check-page

- **File**: backend\src\routes\admin\access.ts:509
- **Authentication**: Required
- **Description**: --- Access Checking Endpoints ---

#### POST /clear-cache

- **File**: backend\src\routes\admin\access.ts:589
- **Authentication**: Required
- **Description**: --- Cache Management ---

#### DELETE /clear-configured

- **File**: backend\src\routes\admin\rbac-registry.ts:379
- **Authentication**: None
- **Database Tables**: rbac_pages, rbac_endpoints, rbac_functions
- **Features**: filtering
- **Description**: DELETE /api/admin/rbac-registry/clear-configured

#### POST /configure

- **File**: backend\src\routes\admin\rbac-registry.ts:110
- **Authentication**: None
- **Database Tables**: rbac_page_permissions
- **Features**: filtering
- **Description**: POST /api/admin/rbac-registry/configure

#### GET /database/stats

- **File**: backend\src\routes\admin\maintenance.ts:181
- **Authentication**: None
- **Description**: GET /api/admin/maintenance/database/stats

#### POST /export-config

- **File**: backend\src\routes\admin\rbac-registry.ts:299
- **Authentication**: None
- **Database Tables**: rbac_pages, rbac_endpoints, rbac_functions, , , \n
- **Features**: pagination, filtering
- **Description**: POST /api/admin/rbac-registry/export-config

#### GET /flat

- **File**: backend\src\routes\admin\permissions.ts:155
- **Authentication**: Required
- **Description**: GET /api/admin/permissions/flat - Get all permissions as a flat list

#### POST /gc

- **File**: backend\src\routes\admin\maintenance.ts:62
- **Authentication**: None
- **Description**: POST /api/admin/maintenance/gc

#### GET /health

- **File**: backend\src\routes\admin\maintenance.ts:243
- **Authentication**: None
- **Description**: Mount audit log cleanup routes

#### POST /logs/rotate

- **File**: backend\src\routes\admin\maintenance.ts:154
- **Authentication**: None
- **Description**: POST /api/admin/maintenance/logs/rotate

#### GET /logs/size

- **File**: backend\src\routes\admin\maintenance.ts:101
- **Authentication**: None
- **Description**: GET /api/admin/maintenance/logs/size

#### GET /my-apis

- **File**: backend\src\routes\admin\access.ts:628
- **Authentication**: Required
- **Description**: GET /api/admin/access/my-apis

#### GET /my-pages

- **File**: backend\src\routes\admin\access.ts:611
- **Authentication**: Required
- **Description**: --- User Access Information ---

#### GET /page-registry

- **File**: backend\src\routes\admin\access.ts:239
- **Authentication**: Required
- **Database Tables**: page, API
- **Description**: GET /api/admin/access/page-registry

#### GET /public-test

- **File**: backend\src\routes\admin\test-roles.ts:39
- **Authentication**: None
- **Database Tables**: roles, permissions
- **Description**: Public test endpoint - no authentication required

#### GET /roles

- **File**: backend\src\routes\admin\cerbos-policies.ts:143
- **Authentication**: Required
- **Database Tables**: policy, a, permission
- **Description**: GET /api/admin/cerbos-policies/roles - List all roles from Cerbos

#### POST /roles

- **File**: backend\src\routes\admin\cerbos-policies.ts:184
- **Authentication**: Required
- **Database Tables**: policy, a, permission, const
- **Description**: POST /api/admin/cerbos-policies/roles - Create a new role in Cerbos

#### GET /roles/:roleId/apis

- **File**: backend\src\routes\admin\access.ts:262
- **Authentication**: Required
- **Database Tables**: API
- **Description**: --- API Access Management ---

#### PUT /roles/:roleId/apis

- **File**: backend\src\routes\admin\access.ts:298
- **Authentication**: Required
- **Database Tables**: API
- **Description**: PUT /api/admin/access/roles/:roleId/apis

#### GET /roles/:roleId/features

- **File**: backend\src\routes\admin\access.ts:377
- **Authentication**: Required
- **Database Tables**: feature, features
- **Description**: --- Feature Management ---

#### PUT /roles/:roleId/features

- **File**: backend\src\routes\admin\access.ts:413
- **Authentication**: Required
- **Database Tables**: feature, features
- **Description**: PUT /api/admin/access/roles/:roleId/features

#### GET /roles/:roleId/pages

- **File**: backend\src\routes\admin\access.ts:124
- **Authentication**: Required
- **Database Tables**: page
- **Features**: pagination
- **Description**: --- Page Access Management ---

#### PUT /roles/:roleId/pages

- **File**: backend\src\routes\admin\access.ts:160
- **Authentication**: Required
- **Database Tables**: page
- **Description**: PUT /api/admin/access/roles/:roleId/pages

#### GET /roles/:roleId/scopes

- **File**: backend\src\routes\admin\access.ts:471
- **Authentication**: Required
- **Database Tables**: features
- **Description**: --- Data Scopes ---

#### PUT /roles/:roleName

- **File**: backend\src\routes\admin\cerbos-policies.ts:243
- **Authentication**: Required
- **Database Tables**: a, permission, const, the, policy, role
- **Description**: PUT /api/admin/cerbos-policies/roles/:roleName - Update a role in Cerbos

#### DELETE /roles/:roleName

- **File**: backend\src\routes\admin\cerbos-policies.ts:321
- **Authentication**: Required
- **Database Tables**: role, policy, , 
- **Features**: filtering
- **Description**: DELETE /api/admin/cerbos-policies/roles/:roleName - Remove a role from Cerbos

#### GET /scan

- **File**: backend\src\routes\admin\rbac-registry.ts:30
- **Authentication**: None
- **Description**: GET /api/admin/rbac-registry/scan

#### GET /scan-history

- **File**: backend\src\routes\admin\rbac-registry.ts:258
- **Authentication**: None
- **Database Tables**: rbac_scan_history, , , \n
- **Features**: pagination, filtering
- **Description**: GET /api/admin/rbac-registry/scan-history

#### GET /stats

- **File**: backend\src\routes\admin\rbac-registry.ts:87
- **Authentication**: None
- **Features**: filtering
- **Description**: GET /api/admin/rbac-registry/stats

#### GET /status

- **File**: backend\src\routes\admin\maintenance.ts:31
- **Authentication**: Required
- **Description**: Apply authentication to all routes

#### GET /test

- **File**: backend\src\routes\admin\test-roles.ts:9
- **Authentication**: Required
- **Database Tables**: roles, permissions
- **Description**: @ts-nocheck

#### GET /unconfigured

- **File**: backend\src\routes\admin\rbac-registry.ts:64
- **Authentication**: None
- **Features**: filtering
- **Description**: GET /api/admin/rbac-registry/unconfigured


### Ai-assignment-rules (10 endpoints)

#### GET /:id

- **File**: backend\src\routes\ai-assignment-rules.ts:501
- **Authentication**: Required
- **Database Tables**: ai_assignment_partner_preferences, ai_assignment_rules, rule, data
- **Features**: filtering
- **Description**: GET /api/ai-assignment-rules/:id - Get specific rule

#### PUT /:id

- **File**: backend\src\routes\ai-assignment-rules.ts:548
- **Authentication**: Required
- **Database Tables**: ai_assignment_rules, rule, data, AI
- **Features**: filtering
- **Description**: PUT /api/ai-assignment-rules/:id - Update rule

#### DELETE /:id

- **File**: backend\src\routes\ai-assignment-rules.ts:972
- **Authentication**: Required
- **Database Tables**: ai_assignment_rules, ai_assignment_rule_runs
- **Features**: filtering
- **Description**: DELETE /api/ai-assignment-rules/:id - Delete rule

#### POST /:id/partner-preferences

- **File**: backend\src\routes\ai-assignment-rules.ts:632
- **Authentication**: Required
- **Database Tables**: ai_assignment_partner_preferences, AI
- **Features**: filtering
- **Description**: POST /api/ai-assignment-rules/:id/partner-preferences - Add partner preference

#### DELETE /:id/partner-preferences/:prefId

- **File**: backend\src\routes\ai-assignment-rules.ts:687
- **Authentication**: Required
- **Database Tables**: ai_assignment_partner_preferences, ai_assignment_rules, games, users
- **Features**: filtering
- **Description**: DELETE /api/ai-assignment-rules/:id/partner-preferences/:prefId - Delete partner preference

#### POST /:id/run

- **File**: backend\src\routes\ai-assignment-rules.ts:720
- **Authentication**: Required
- **Database Tables**: ai_assignment_rules, games, users, ai_assignment_rule_runs
- **Features**: filtering
- **Description**: POST /api/ai-assignment-rules/:id/run - Execute rule

#### GET /:id/runs

- **File**: backend\src\routes\ai-assignment-rules.ts:868
- **Authentication**: Required
- **Database Tables**: ai_assignment_rule_runs, ai_assignment_rules
- **Features**: pagination, filtering
- **Description**: GET /api/ai-assignment-rules/:id/runs - Get rule run history

#### POST /:id/toggle

- **File**: backend\src\routes\ai-assignment-rules.ts:935
- **Authentication**: Required
- **Database Tables**: ai_assignment_rules, ai_assignment_rule_runs
- **Features**: filtering
- **Description**: POST /api/ai-assignment-rules/:id/toggle - Toggle rule enabled status

#### GET /analytics

- **File**: backend\src\routes\ai-assignment-rules.ts:1005
- **Authentication**: Required
- **Database Tables**: ai_assignment_rule_runs, ai_assignment_rules
- **Features**: filtering
- **Description**: GET /api/ai-assignment-rules/analytics - Get performance analytics

#### GET /runs/:runId

- **File**: backend\src\routes\ai-assignment-rules.ts:902
- **Authentication**: Required
- **Database Tables**: ai_assignment_rule_runs, ai_assignment_rules
- **Features**: pagination, filtering
- **Description**: GET /api/ai-assignment-rules/runs/:runId - Get detailed run results


### Ai-suggestions (2 endpoints)

**File Description**: @file ai-suggestions.ts

#### PUT /:id/accept

- **File**: backend\src\routes\ai-suggestions.ts:848
- **Authentication**: Required
- **Database Tables**: game_assignments, suggestion, ai_suggestions
- **Features**: filtering
- **Description**: PUT /api/ai-suggestions/:id/accept - Accept suggestion and create assignment

#### PUT /:id/reject

- **File**: backend\src\routes\ai-suggestions.ts:969
- **Authentication**: Required
- **Database Tables**: suggestion, ai_suggestions
- **Features**: filtering
- **Description**: PUT /api/ai-suggestions/:id/reject - Reject suggestion with optional reason


### Assets (10 endpoints)

#### GET /:id

- **File**: backend\src\routes\assets.ts:231
- **Authentication**: Required
- **Database Tables**: assets
- **Features**: pagination, filtering
- **Description**: Get single asset by ID with detailed information

#### PUT /:id

- **File**: backend\src\routes\assets.ts:351
- **Authentication**: Required
- **Database Tables**: asset, assets, , 
- **Features**: filtering
- **Description**: Update asset

#### POST /:id/checkout

- **File**: backend\src\routes\assets.ts:540
- **Authentication**: Required
- **Database Tables**: asset_checkouts, asset, assets
- **Features**: filtering
- **Description**: ASSET CHECKOUT/CHECKIN ENDPOINTS

#### GET /:id/maintenance

- **File**: backend\src\routes\assets.ts:408
- **Authentication**: Required
- **Database Tables**: asset_maintenance, maintenance
- **Features**: filtering
- **Description**: ASSET MAINTENANCE ENDPOINTS

#### POST /:id/maintenance

- **File**: backend\src\routes\assets.ts:439
- **Authentication**: Required
- **Database Tables**: asset_maintenance, maintenance, , 
- **Features**: filtering
- **Description**: Create maintenance record

#### POST /checkout/:checkoutId/checkin

- **File**: backend\src\routes\assets.ts:623
- **Authentication**: Required
- **Database Tables**: asset, assets, checkout, asset_checkouts
- **Features**: filtering
- **Description**: Check in asset from employee

#### GET /checkouts/overdue

- **File**: backend\src\routes\assets.ts:798
- **Authentication**: Required
- **Features**: filtering
- **Description**: Get overdue checkouts

#### PUT /maintenance/:maintenanceId

- **File**: backend\src\routes\assets.ts:480
- **Authentication**: Required
- **Database Tables**: maintenance, asset_maintenance, , 
- **Features**: filtering
- **Description**: Update maintenance record

#### GET /maintenance/due

- **File**: backend\src\routes\assets.ts:759
- **Authentication**: Required
- **Features**: filtering
- **Description**: Get assets due for maintenance

#### GET /stats/overview

- **File**: backend\src\routes\assets.ts:692
- **Authentication**: Required
- **Database Tables**: asset, assets
- **Features**: filtering
- **Description**: Get asset statistics and analytics


### Assignments (8 endpoints)

**File Description**: Assignment management routes for the Sports Management API (TypeScript)

#### GET /:id

- **File**: backend\src\routes\assignments.ts:778
- **Authentication**: Required
- **Features**: filtering
- **Description**: Route definitions with proper typing

#### DELETE /:id

- **File**: backend\src\routes\assignments.ts:835
- **Authentication**: Required

#### PATCH /:id/status

- **File**: backend\src\routes\assignments.ts:819
- **Authentication**: Required

#### GET /available-referees/:game_id

- **File**: backend\src\routes\assignments.ts:868
- **Authentication**: Required

#### POST /bulk

- **File**: backend\src\routes\assignments.ts:841
- **Authentication**: Required

#### DELETE /bulk-remove

- **File**: backend\src\routes\assignments.ts:807
- **Authentication**: Required

#### POST /bulk-update

- **File**: backend\src\routes\assignments.ts:789
- **Authentication**: Required
- **Features**: filtering

#### POST /check-conflicts

- **File**: backend\src\routes\assignments.ts:858
- **Authentication**: Required


### Auth (5 endpoints)

**File Description**: Authentication routes with comprehensive TypeScript typing

#### POST /check-page-access

- **File**: backend\src\routes\auth.ts:662
- **Authentication**: Required
- **Database Tables**: , 

#### POST /login

- **File**: backend\src\routes\auth.ts:484
- **Authentication**: Required
- **Database Tables**: user_roles
- **Features**: filtering
- **Description**: Route definitions with middleware and proper typing

#### GET /me

- **File**: backend\src\routes\auth.ts:496
- **Authentication**: Required
- **Database Tables**: user_roles
- **Features**: filtering

#### POST /refresh-permissions

- **File**: backend\src\routes\auth.ts:501
- **Authentication**: Required
- **Database Tables**: user_roles
- **Features**: filtering

#### POST /register

- **File**: backend\src\routes\auth.ts:490
- **Authentication**: Required
- **Database Tables**: user_roles
- **Features**: filtering
- **Description**: Route definitions with middleware and proper typing


### Availability (6 endpoints)

**File Description**: Availability Routes - TypeScript Implementation

#### PUT /:windowId

- **File**: backend\src\routes\availability.ts:305
- **Authentication**: Required
- **Database Tables**: referee_availability, referee_availability as ra, availability, your, window
- **Features**: filtering
- **Description**: PUT /api/availability/:windowId - Update availability window

#### DELETE /:windowId

- **File**: backend\src\routes\availability.ts:364
- **Authentication**: Required
- **Database Tables**: referee_availability, referee_availability as ra, game_assignments as ga, window
- **Features**: filtering
- **Description**: DELETE /api/availability/:windowId - Delete availability window

#### POST /bulk

- **File**: backend\src\routes\availability.ts:453
- **Authentication**: Required
- **Database Tables**: referees
- **Features**: filtering
- **Description**: POST /api/availability/bulk - Bulk create availability windows

#### GET /conflicts

- **File**: backend\src\routes\availability.ts:392
- **Authentication**: Required
- **Database Tables**: referee_availability, referee_availability as ra, game_assignments as ga, referees
- **Features**: filtering
- **Description**: GET /api/availability/conflicts - Check for scheduling conflicts

#### GET /referees/:id

- **File**: backend\src\routes\availability.ts:218
- **Authentication**: Required
- **Database Tables**: referee_availability, referees, availability
- **Features**: validation, filtering
- **Description**: GET /api/availability/referees/:id - Get referee's availability windows

#### POST /referees/:id

- **File**: backend\src\routes\availability.ts:250
- **Authentication**: Required
- **Database Tables**: referees, referee_availability, availability, your, window
- **Features**: filtering
- **Description**: POST /api/availability/referees/:id - Create availability window


### Budget-tracker (2 endpoints)

**File Description**: GET /api/budgets/utilization

#### GET /categories

- **File**: backend\src\routes\budget-tracker.ts:129
- **Authentication**: Required
- **Features**: filtering
- **Description**: GET /api/budgets/categories

#### GET /utilization

- **File**: backend\src\routes\budget-tracker.ts:14
- **Authentication**: Required
- **Database Tables**: game_assignments as ga, expense_data as ed
- **Features**: filtering
- **Description**: GET /api/budgets/utilization


### Budgets (10 endpoints)

**File Description**: Budget Management Routes (TypeScript)

#### GET /:id

- **File**: backend\src\routes\budgets.ts:724
- **Authentication**: Required
- **Database Tables**: budgets, a
- **Features**: filtering
- **Description**: GET /api/budgets/:id

#### PUT /:id

- **File**: backend\src\routes\budgets.ts:770
- **Authentication**: Required
- **Database Tables**: budgets, a, error, budget
- **Features**: filtering
- **Description**: PUT /api/budgets/:id

#### DELETE /:id

- **File**: backend\src\routes\budgets.ts:1035
- **Authentication**: Required
- **Database Tables**: budgets, budget_allocations
- **Features**: filtering
- **Description**: DELETE /api/budgets/:id

#### POST /:id/allocations

- **File**: backend\src\routes\budgets.ts:837
- **Authentication**: Required
- **Database Tables**: budgets, budget_allocations, budget_periods, error, budget
- **Features**: filtering
- **Description**: POST /api/budgets/:id/allocations

#### GET /categories

- **File**: backend\src\routes\budgets.ts:363
- **Authentication**: Required
- **Database Tables**: budget_categories
- **Features**: pagination, filtering
- **Description**: GET /api/budgets/categories

#### POST /categories

- **File**: backend\src\routes\budgets.ts:454
- **Authentication**: Required
- **Database Tables**: budget_categories
- **Features**: pagination, filtering
- **Description**: POST /api/budgets/categories

#### DELETE /categories/:id

- **File**: backend\src\routes\budgets.ts:972
- **Authentication**: Required
- **Database Tables**: budget_categories, budgets, budget_allocations
- **Features**: filtering
- **Description**: DELETE /api/budgets/categories/:id

#### GET /periods

- **File**: backend\src\routes\budgets.ts:185
- **Authentication**: Required
- **Database Tables**: budget_periods
- **Features**: pagination, filtering
- **Description**: GET /api/budgets/periods

#### POST /periods

- **File**: backend\src\routes\budgets.ts:285
- **Authentication**: Required
- **Database Tables**: budget_periods
- **Features**: pagination, filtering
- **Description**: POST /api/budgets/periods

#### DELETE /periods/:id

- **File**: backend\src\routes\budgets.ts:909
- **Authentication**: Required
- **Database Tables**: budget_periods, budgets, budget_categories
- **Features**: filtering
- **Description**: DELETE /api/budgets/periods/:id


### Calendar (6 endpoints)

**File Description**: Calendar routes with TypeScript implementation

#### GET /games/calendar-feed

- **File**: backend\src\routes\calendar.ts:421
- **Authentication**: Required
- **Database Tables**: games, game_assignments
- **Features**: filtering
- **Description**: GET /api/calendar/games/calendar-feed - Get iCal feed for all games or filtered games

#### GET /referees/:id/calendar/ical

- **File**: backend\src\routes\calendar.ts:306
- **Authentication**: None
- **Database Tables**: users, game_assignments
- **Features**: filtering
- **Description**: GET /api/calendar/referees/:id/calendar/ical - Get iCal feed for specific referee

#### POST /sync

- **File**: backend\src\routes\calendar.ts:594
- **Authentication**: Required
- **Database Tables**: organization_settings, organization
- **Description**: POST /api/calendar/sync - Configure calendar synchronization

#### DELETE /sync

- **File**: backend\src\routes\calendar.ts:772
- **Authentication**: Required
- **Database Tables**: organization_settings
- **Description**: DELETE /api/calendar/sync - Disable calendar sync

#### GET /sync/status

- **File**: backend\src\routes\calendar.ts:706
- **Authentication**: Required
- **Database Tables**: organization_settings
- **Description**: GET /api/calendar/sync/status - Get calendar sync status

#### POST /upload

- **File**: backend\src\routes\calendar.ts:840
- **Authentication**: Required
- **Description**: POST /api/calendar/upload - Upload and import ICS calendar file


### Cerbos (12 endpoints)

#### GET /derived-roles

- **File**: backend\src\routes\cerbos.ts:431
- **Authentication**: Required

#### POST /reload

- **File**: backend\src\routes\cerbos.ts:401
- **Authentication**: Required

#### GET /resources

- **File**: backend\src\routes\cerbos.ts:40
- **Authentication**: Required

#### POST /resources

- **File**: backend\src\routes\cerbos.ts:92
- **Authentication**: Required
- **Database Tables**: resource, , 

#### GET /resources/:kind

- **File**: backend\src\routes\cerbos.ts:61
- **Authentication**: Required
- **Database Tables**: , 

#### PUT /resources/:kind

- **File**: backend\src\routes\cerbos.ts:133
- **Authentication**: Required
- **Database Tables**: resource, , 

#### DELETE /resources/:kind

- **File**: backend\src\routes\cerbos.ts:177
- **Authentication**: Required
- **Database Tables**: resource

#### GET /resources/:kind/actions

- **File**: backend\src\routes\cerbos.ts:209
- **Authentication**: Required

#### POST /resources/:kind/actions

- **File**: backend\src\routes\cerbos.ts:245
- **Authentication**: Required

#### DELETE /resources/:kind/actions/:action

- **File**: backend\src\routes\cerbos.ts:294
- **Authentication**: Required

#### GET /resources/:kind/roles/:role

- **File**: backend\src\routes\cerbos.ts:327
- **Authentication**: Required

#### PUT /resources/:kind/roles/:role

- **File**: backend\src\routes\cerbos.ts:358
- **Authentication**: Required


### Chunks (5 endpoints)

#### GET /:id

- **File**: backend\src\routes\chunks.ts:347
- **Authentication**: Required
- **Database Tables**: game_chunks, chunk_games, chunk
- **Features**: pagination, filtering
- **Description**: GET /api/chunks/:id - Get specific chunk with games

#### PUT /:id

- **File**: backend\src\routes\chunks.ts:427
- **Authentication**: Required
- **Database Tables**: game_chunks, chunk_games, games, chunk, basic
- **Features**: filtering
- **Description**: PUT /api/chunks/:id - Update chunk

#### DELETE /:id

- **File**: backend\src\routes\chunks.ts:672
- **Authentication**: Required
- **Database Tables**: game_chunks, chunk_games, game_assignments
- **Features**: filtering
- **Description**: DELETE /api/chunks/:id - Delete chunk

#### POST /:id/assign

- **File**: backend\src\routes\chunks.ts:562
- **Authentication**: Required
- **Database Tables**: game_chunks, chunk_games, game_assignments, chunk
- **Features**: filtering
- **Description**: POST /api/chunks/:id/assign - Assign referee to chunk

#### POST /auto-create

- **File**: backend\src\routes\chunks.ts:734
- **Authentication**: Required
- **Database Tables**: game_chunks, chunk_games
- **Features**: filtering
- **Description**: POST /api/chunks/auto-create - Auto-create chunks


### Communications (2 endpoints)

**File Description**: Communications Routes - TypeScript implementation

#### GET /:id

- **File**: backend\src\routes\communications.ts:119
- **Authentication**: Required
- **Database Tables**: communication
- **Features**: pagination, filtering
- **Description**: Get single communication by ID

#### GET /unread/count

- **File**: backend\src\routes\communications.ts:433
- **Authentication**: Required
- **Description**: Get user's unread communications count


### Company-credit-cards (6 endpoints)

**File Description**: GET /api/company-credit-cards

#### GET /:id

- **File**: backend\src\routes\company-credit-cards.ts:364
- **Authentication**: Required
- **Database Tables**: company_credit_cards
- **Features**: filtering
- **Description**: GET /api/company-credit-cards/:id

#### PUT /:id

- **File**: backend\src\routes\company-credit-cards.ts:486
- **Authentication**: Required
- **Database Tables**: company_credit_cards, users, credit, data
- **Features**: filtering
- **Description**: PUT /api/company-credit-cards/:id

#### POST /:id/assign

- **File**: backend\src\routes\company-credit-cards.ts:829
- **Authentication**: Required
- **Database Tables**: company_credit_cards, users, card
- **Features**: pagination, filtering
- **Description**: POST /api/company-credit-cards/:id/assign

#### POST /:id/block

- **File**: backend\src\routes\company-credit-cards.ts:924
- **Authentication**: Required
- **Database Tables**: company_credit_cards
- **Features**: filtering
- **Description**: POST /api/company-credit-cards/:id/block

#### GET /:id/transactions

- **File**: backend\src\routes\company-credit-cards.ts:691
- **Authentication**: Required
- **Database Tables**: company_credit_cards, expense_data, error, credit
- **Features**: pagination, filtering
- **Description**: GET /api/company-credit-cards/:id/transactions

#### POST /:id/unblock

- **File**: backend\src\routes\company-credit-cards.ts:987
- **Authentication**: Required
- **Database Tables**: company_credit_cards
- **Features**: filtering
- **Description**: POST /api/company-credit-cards/:id/unblock


### Content (8 endpoints)

#### GET /categories

- **File**: backend\src\routes\content.ts:471
- **Authentication**: None
- **Database Tables**: content_categories
- **Features**: filtering
- **Description**: GET /api/content/categories - List categories

#### GET /items

- **File**: backend\src\routes\content.ts:20
- **Authentication**: Required
- **Database Tables**: content_items
- **Features**: pagination, filtering
- **Description**: Helper function to generate slug from title

#### POST /items

- **File**: backend\src\routes\content.ts:120
- **Authentication**: Required
- **Database Tables**: content_items, content_categories
- **Features**: filtering
- **Description**: POST /api/content/items - Create new content item

#### PUT /items/:id

- **File**: backend\src\routes\content.ts:246
- **Authentication**: Required
- **Database Tables**: content_items, content_categories, content
- **Features**: filtering
- **Description**: PUT /api/content/items/:id - Update content item

#### DELETE /items/:id

- **File**: backend\src\routes\content.ts:381
- **Authentication**: Required
- **Database Tables**: content_items, content_categories
- **Features**: filtering
- **Description**: DELETE /api/content/items/:id - Delete content item

#### GET /items/:id

- **File**: backend\src\routes\content.ts:409
- **Authentication**: None
- **Database Tables**: content_items, content_categories
- **Features**: filtering
- **Description**: GET /api/content/items/:id - Get single content item

#### GET /items/slug/:slug

- **File**: backend\src\routes\content.ts:89
- **Authentication**: Required
- **Database Tables**: content_items, content_categories
- **Features**: pagination, filtering
- **Description**: GET /api/content/items/slug/:slug - Get content item by slug

#### GET /items/slug/:slug

- **File**: backend\src\routes\content.ts:440
- **Authentication**: None
- **Database Tables**: content_items, content_categories
- **Features**: filtering
- **Description**: GET /api/content/items/slug/:slug - Get content item by slug


### Documents (10 endpoints)

**File Description**: Document Management Routes (TypeScript)

#### GET /:id

- **File**: backend\src\routes\documents.ts:299
- **Authentication**: Required
- **Features**: pagination, filtering
- **Description**: GET /api/documents/:id

#### PUT /:id

- **File**: backend\src\routes\documents.ts:613
- **Authentication**: Required
- **Database Tables**: document, query, documents, event, , 
- **Features**: filtering
- **Description**: PUT /api/documents/:id

#### POST /:id/acknowledge

- **File**: backend\src\routes\documents.ts:847
- **Authentication**: Required
- **Database Tables**: document_acknowledgments
- **Features**: pagination, filtering
- **Description**: POST /api/documents/:id/acknowledge

#### GET /:id/acknowledgments

- **File**: backend\src\routes\documents.ts:932
- **Authentication**: Required
- **Features**: pagination, filtering
- **Description**: GET /api/documents/:id/acknowledgments

#### POST /:id/approve

- **File**: backend\src\routes\documents.ts:693
- **Authentication**: Required
- **Database Tables**: event, documents
- **Features**: filtering
- **Description**: POST /api/documents/:id/approve

#### POST /:id/archive

- **File**: backend\src\routes\documents.ts:744
- **Authentication**: Required
- **Database Tables**: documents
- **Features**: filtering
- **Description**: POST /api/documents/:id/archive

#### GET /:id/download

- **File**: backend\src\routes\documents.ts:795
- **Authentication**: Required
- **Features**: filtering
- **Description**: GET /api/documents/:id/download

#### POST /:id/versions

- **File**: backend\src\routes\documents.ts:484
- **Authentication**: Required
- **Database Tables**: document_versions, const, document, documents
- **Features**: filtering
- **Description**: POST /api/documents/:id/versions

#### GET /acknowledgments/pending

- **File**: backend\src\routes\documents.ts:1085
- **Authentication**: Required
- **Features**: filtering
- **Description**: GET /api/documents/acknowledgments/pending

#### GET /stats/overview

- **File**: backend\src\routes\documents.ts:993
- **Authentication**: Required
- **Features**: pagination, filtering
- **Description**: GET /api/documents/stats/overview


### Employees (13 endpoints)

#### GET /:id

- **File**: backend\src\routes\employees.ts:399
- **Authentication**: Required
- **Database Tables**: employees, employee
- **Features**: pagination, filtering
- **Description**: Get single employee by ID

#### PUT /:id

- **File**: backend\src\routes\employees.ts:478
- **Authentication**: Required
- **Database Tables**: employee, employees, , 
- **Features**: filtering
- **Description**: Update employee

#### GET /:id/evaluations

- **File**: backend\src\routes\employees.ts:531
- **Authentication**: Required
- **Database Tables**: employee_evaluations
- **Features**: filtering
- **Description**: EMPLOYEE EVALUATIONS ENDPOINTS

#### POST /:id/evaluations

- **File**: backend\src\routes\employees.ts:554
- **Authentication**: Required
- **Database Tables**: employee_evaluations, training_records
- **Features**: filtering
- **Description**: Create new evaluation

#### GET /:id/training

- **File**: backend\src\routes\employees.ts:604
- **Authentication**: Required
- **Database Tables**: training_records, training, , 
- **Features**: filtering
- **Description**: TRAINING RECORDS ENDPOINTS

#### POST /:id/training

- **File**: backend\src\routes\employees.ts:629
- **Authentication**: Required
- **Database Tables**: training_records, training, , 
- **Features**: filtering
- **Description**: Create new training record

#### GET /departments

- **File**: backend\src\routes\employees.ts:81
- **Authentication**: Required
- **Database Tables**: departments, department
- **Features**: filtering
- **Description**: DEPARTMENTS ENDPOINTS

#### POST /departments

- **File**: backend\src\routes\employees.ts:134
- **Authentication**: Required
- **Database Tables**: departments, department
- **Features**: filtering
- **Description**: Create new department

#### PUT /departments/:id

- **File**: backend\src\routes\employees.ts:162
- **Authentication**: Required
- **Database Tables**: departments, job_positions, department
- **Features**: filtering
- **Description**: Update department

#### GET /positions

- **File**: backend\src\routes\employees.ts:195
- **Authentication**: Required
- **Database Tables**: job_positions
- **Features**: pagination, filtering
- **Description**: JOB POSITIONS ENDPOINTS

#### POST /positions

- **File**: backend\src\routes\employees.ts:238
- **Authentication**: Required
- **Database Tables**: job_positions
- **Features**: pagination, filtering
- **Description**: Create new position

#### GET /stats/overview

- **File**: backend\src\routes\employees.ts:722
- **Authentication**: Required
- **Database Tables**: training_records, , 
- **Features**: filtering
- **Description**: Get organization-wide employee statistics

#### PUT /training/:trainingId

- **File**: backend\src\routes\employees.ts:675
- **Authentication**: Required
- **Database Tables**: training, training_records, , 
- **Features**: filtering
- **Description**: Update training record


### Expenses (3 endpoints)

**File Description**: POST /api/expenses/receipts/upload

#### GET /receipts

- **File**: backend\src\routes\expenses.ts:418
- **Authentication**: Required
- **Database Tables**: expense_receipts
- **Features**: pagination, filtering
- **Description**: GET /api/expenses/receipts

#### GET /receipts/:id

- **File**: backend\src\routes\expenses.ts:569
- **Authentication**: Required
- **Database Tables**: expense_receipts, ai_processing_logs
- **Features**: filtering
- **Description**: GET /api/expenses/receipts/:id

#### POST /receipts/upload

- **File**: backend\src\routes\expenses.ts:201
- **Authentication**: Required
- **Database Tables**: expense_receipts
- **Features**: filtering
- **Description**: POST /api/expenses/receipts/upload


### Financial-dashboard (1 endpoints)

**File Description**: Financial Dashboard API Routes

#### GET /referee-payments

- **File**: backend\src\routes\financial-dashboard.ts:579
- **Authentication**: Required
- **Database Tables**: , 
- **Features**: filtering
- **Description**: GET /api/financial-dashboard/referee-payments


### Financial-reports (7 endpoints)

**File Description**: GET /api/financial-reports/budget-variance

#### GET /budget-variance

- **File**: backend\src\routes\financial-reports.ts:83
- **Authentication**: Required
- **Database Tables**: budgets as b
- **Features**: filtering
- **Description**: GET /api/financial-reports/budget-variance

#### GET /cash-flow

- **File**: backend\src\routes\financial-reports.ts:219
- **Authentication**: Required
- **Database Tables**: financial_transactions, cash_flow_forecasts, financial_transactions as ft
- **Features**: filtering
- **Description**: GET /api/financial-reports/cash-flow

#### GET /expense-analysis

- **File**: backend\src\routes\financial-reports.ts:377
- **Authentication**: Required
- **Database Tables**: financial_transactions as ft
- **Features**: filtering
- **Description**: GET /api/financial-reports/expense-analysis

#### GET /export/:type

- **File**: backend\src\routes\financial-reports.ts:922
- **Authentication**: Required
- **Description**: GET /api/financial-reports/export/:type

#### GET /kpis

- **File**: backend\src\routes\financial-reports.ts:728
- **Authentication**: Required
- **Database Tables**: budgets as b, financial_transactions, financial_transactions as ft, games
- **Features**: filtering
- **Description**: GET /api/financial-reports/kpis

#### POST /kpis

- **File**: backend\src\routes\financial-reports.ts:882
- **Authentication**: Required
- **Database Tables**: financial_kpis, a
- **Description**: POST /api/financial-reports/kpis

#### GET /payroll-summary

- **File**: backend\src\routes\financial-reports.ts:571
- **Authentication**: Required
- **Database Tables**: game_assignments as ga
- **Features**: filtering
- **Description**: GET /api/financial-reports/payroll-summary


### Financial-transactions (7 endpoints)

**File Description**: Financial Transactions API Routes

#### GET /dashboard

- **File**: backend\src\routes\financial-transactions.ts:660
- **Authentication**: Required
- **Database Tables**: financial_transactions, budgets, financial_transactions as ft
- **Features**: filtering
- **Description**: GET /api/financial/dashboard

#### GET /transactions

- **File**: backend\src\routes\financial-transactions.ts:135
- **Authentication**: Required
- **Database Tables**: financial_transactions, financial_transactions as ft
- **Features**: pagination, filtering
- **Description**: GET /api/financial/transactions

#### POST /transactions

- **File**: backend\src\routes\financial-transactions.ts:270
- **Authentication**: Required
- **Database Tables**: budgets, vendors, financial_transactions, financial_transactions as ft, budget, , 
- **Features**: pagination, filtering
- **Description**: POST /api/financial/transactions

#### GET /transactions/:id

- **File**: backend\src\routes\financial-transactions.ts:383
- **Authentication**: Required
- **Database Tables**: financial_transactions as ft, journal_entries, financial_transactions, transaction
- **Features**: filtering
- **Description**: GET /api/financial/transactions/:id

#### PUT /transactions/:id/status

- **File**: backend\src\routes\financial-transactions.ts:445
- **Authentication**: Required
- **Database Tables**: journal_entries, financial_transactions, budgets, transaction, error
- **Features**: filtering
- **Description**: PUT /api/financial/transactions/:id/status

#### GET /vendors

- **File**: backend\src\routes\financial-transactions.ts:537
- **Authentication**: Required
- **Database Tables**: vendors, error, transaction, , 
- **Features**: pagination, filtering
- **Description**: GET /api/financial/vendors

#### POST /vendors

- **File**: backend\src\routes\financial-transactions.ts:595
- **Authentication**: Required
- **Database Tables**: vendors, financial_transactions, budgets, , 
- **Features**: pagination, filtering
- **Description**: POST /api/financial/vendors


### Game-fees (2 endpoints)

**File Description**: GET /api/game-fees

#### PUT /:id

- **File**: backend\src\routes\game-fees.ts:274
- **Authentication**: Required
- **Database Tables**: game_fees, game_fees as gf, an, object, the
- **Features**: filtering
- **Description**: PUT /api/game-fees/:id

#### GET /stats

- **File**: backend\src\routes\game-fees.ts:337
- **Authentication**: Required
- **Database Tables**: game_fees as gf, game_fees
- **Features**: filtering
- **Description**: GET /api/game-fees/stats


### Games (5 endpoints)

**File Description**: Game management routes for the Sports Management API (TypeScript)

#### GET /:id

- **File**: backend\src\routes\games.ts:1035
- **Authentication**: Required
- **Database Tables**: game
- **Features**: validation, filtering
- **Description**: ============================================================================

#### PUT /:id

- **File**: backend\src\routes\games.ts:1049
- **Authentication**: Required
- **Database Tables**: game
- **Features**: validation, filtering
- **Description**: POST /api/games - Create new game

#### DELETE /:id

- **File**: backend\src\routes\games.ts:1065
- **Authentication**: Required
- **Database Tables**: game
- **Description**: PATCH /api/games/:id/status - Update game status

#### PATCH /:id/status

- **File**: backend\src\routes\games.ts:1057
- **Authentication**: Required
- **Database Tables**: game
- **Description**: PUT /api/games/:id - Update game

#### POST /bulk-import

- **File**: backend\src\routes\games.ts:1074
- **Authentication**: Required
- **Database Tables**: game
- **Description**: DELETE /api/games/:id - Delete game


### Historic-patterns (4 endpoints)

#### GET /:id

- **File**: backend\src\routes\historic-patterns.ts:509
- **Authentication**: Required
- **Database Tables**: assignment_patterns, game_assignments
- **Features**: filtering
- **Description**: GET /api/assignments/patterns/:id - Get specific pattern

#### DELETE /:id

- **File**: backend\src\routes\historic-patterns.ts:576
- **Authentication**: Required
- **Database Tables**: assignment_patterns
- **Features**: filtering
- **Description**: DELETE /api/assignments/patterns/:id - Delete pattern

#### POST /analyze

- **File**: backend\src\routes\historic-patterns.ts:407
- **Authentication**: Required
- **Database Tables**: game_assignments
- **Features**: filtering
- **Description**: POST /api/assignments/patterns/analyze - Analyze patterns

#### POST /apply

- **File**: backend\src\routes\historic-patterns.ts:293
- **Authentication**: Required
- **Database Tables**: assignment_patterns, game_assignments, pattern
- **Features**: filtering
- **Description**: POST /api/assignments/patterns/apply - Apply pattern to games


### Invitations (3 endpoints)

#### DELETE /:id

- **File**: backend\src\routes\invitations.ts:372
- **Authentication**: Required
- **Database Tables**: invitations
- **Features**: filtering
- **Description**: DELETE /api/invitations/:id - Cancel invitation (admin only)

#### GET /:token

- **File**: backend\src\routes\invitations.ts:234
- **Authentication**: None
- **Database Tables**: invitations, users
- **Features**: pagination, filtering
- **Description**: GET /api/invitations/:token - Get invitation by token

#### POST /:token/complete

- **File**: backend\src\routes\invitations.ts:266
- **Authentication**: None
- **Database Tables**: invitations, users
- **Features**: filtering
- **Description**: POST /api/invitations/:token/complete - Complete invitation signup


### Leagues (5 endpoints)

**File Description**: Leagues Routes - TypeScript Implementation

#### GET /:id

- **File**: backend\src\routes\leagues.ts:244
- **Authentication**: Required
- **Database Tables**: leagues, teams, games
- **Features**: pagination, filtering
- **Description**: GET /api/leagues/:id - Get specific league with teams

#### PUT /:id

- **File**: backend\src\routes\leagues.ts:416
- **Authentication**: Required
- **Database Tables**: leagues, teams, games, league
- **Features**: filtering
- **Description**: PUT /api/leagues/:id - Update league

#### DELETE /:id

- **File**: backend\src\routes\leagues.ts:446
- **Authentication**: Required
- **Database Tables**: leagues, teams, games
- **Features**: filtering
- **Description**: Invalidate related caches

#### POST /bulk

- **File**: backend\src\routes\leagues.ts:350
- **Authentication**: Required
- **Database Tables**: leagues, league
- **Features**: filtering
- **Description**: POST /api/leagues/bulk - Create multiple leagues

#### GET /options/filters

- **File**: backend\src\routes\leagues.ts:483
- **Authentication**: Required
- **Database Tables**: teams, games, leagues
- **Features**: filtering
- **Description**: Invalidate related caches


### Locations (10 endpoints)

#### GET /:id

- **File**: backend\src\routes\locations.ts:115
- **Authentication**: Required
- **Database Tables**: locations
- **Features**: filtering
- **Description**: Get location by ID

#### PUT /:id

- **File**: backend\src\routes\locations.ts:241
- **Authentication**: Required
- **Database Tables**: locations, location, or
- **Features**: filtering
- **Description**: Update location

#### DELETE /:id

- **File**: backend\src\routes\locations.ts:355
- **Authentication**: Required
- **Database Tables**: locations, games, user_location_distances, location
- **Features**: filtering
- **Description**: Deactivate location - soft delete

#### GET /:locationId/distance

- **File**: backend\src\routes\locations.ts:444
- **Authentication**: Required
- **Database Tables**: user_location_distances, users, locations
- **Features**: filtering
- **Description**: Get distance to a specific location for current user

#### POST /admin/calculate-location-distances/:locationId

- **File**: backend\src\routes\locations.ts:533
- **Authentication**: Required
- **Database Tables**: locations
- **Features**: filtering
- **Description**: Admin endpoint: Trigger distance calculation for a specific location

#### POST /admin/calculate-user-distances/:userId

- **File**: backend\src\routes\locations.ts:493
- **Authentication**: Required
- **Database Tables**: users, locations
- **Features**: filtering
- **Description**: Admin endpoint: Trigger distance calculation for a specific user

#### GET /admin/distance-stats

- **File**: backend\src\routes\locations.ts:477
- **Authentication**: Required
- **Database Tables**: users, locations
- **Features**: filtering
- **Description**: Admin endpoint: Get distance calculation statistics

#### POST /admin/initialize-all-distances

- **File**: backend\src\routes\locations.ts:607
- **Authentication**: Required
- **Description**: Admin endpoint: Initialize all distance calculations

#### POST /admin/retry-failed-calculations

- **File**: backend\src\routes\locations.ts:574
- **Authentication**: Required
- **Description**: Admin endpoint: Retry failed distance calculations

#### GET /distances

- **File**: backend\src\routes\locations.ts:390
- **Authentication**: Required
- **Database Tables**: locations, user_location_distances
- **Features**: filtering
- **Description**: Get distances for current user to all locations


### Mentee-games (4 endpoints)

**File Description**: Mentee Games Management API Routes

#### GET /:id/games

- **File**: backend\src\routes\mentee-games.ts:170
- **Authentication**: Required
- **Database Tables**: users
- **Features**: pagination, filtering
- **Description**: ===== ROUTES =====

#### GET /:id/games/analytics

- **File**: backend\src\routes\mentee-games.ts:492
- **Authentication**: Required
- **Database Tables**: game_assignments as ga
- **Features**: filtering
- **Description**: GET /api/mentees/:id/games/analytics

#### GET /:id/games/history

- **File**: backend\src\routes\mentee-games.ts:350
- **Authentication**: Required
- **Features**: pagination, filtering
- **Description**: GET /api/mentees/:id/games/history

#### GET /:id/games/upcoming

- **File**: backend\src\routes\mentee-games.ts:259
- **Authentication**: Required
- **Features**: filtering
- **Description**: GET /api/mentees/:id/games/upcoming


### Mentorships (14 endpoints)

**File Description**: Mentorship Management API Routes

#### GET /:id

- **File**: backend\src\routes\mentorships.ts:228
- **Authentication**: Required
- **Database Tables**: mentorship, their, any
- **Description**: GET /api/mentorships/:id

#### PUT /:id

- **File**: backend\src\routes\mentorships.ts:305
- **Authentication**: Required
- **Database Tables**: mentorship, their, any, method, this
- **Description**: PUT /api/mentorships/:id

#### DELETE /:id

- **File**: backend\src\routes\mentorships.ts:355
- **Authentication**: Required
- **Database Tables**: this, mentorship
- **Features**: pagination, filtering
- **Description**: DELETE /api/mentorships/:id

#### GET /:id/documents

- **File**: backend\src\routes\mentorships.ts:596
- **Authentication**: Required
- **Features**: pagination
- **Description**: ===== DOCUMENT MANAGEMENT ROUTES =====

#### POST /:id/documents

- **File**: backend\src\routes\mentorships.ts:638
- **Authentication**: Required
- **Description**: POST /api/mentorships/:id/documents

#### GET /:id/documents/:docId

- **File**: backend\src\routes\mentorships.ts:696
- **Authentication**: Required
- **Description**: GET /api/mentorships/:id/documents/:docId

#### DELETE /:id/documents/:docId

- **File**: backend\src\routes\mentorships.ts:734
- **Authentication**: Required
- **Description**: DELETE /api/mentorships/:id/documents/:docId

#### GET /:id/notes

- **File**: backend\src\routes\mentorships.ts:429
- **Authentication**: Required
- **Database Tables**: existing
- **Features**: pagination, filtering
- **Description**: ===== MENTORSHIP NOTES ROUTES =====

#### POST /:id/notes

- **File**: backend\src\routes\mentorships.ts:475
- **Authentication**: Required
- **Database Tables**: existing, this, note
- **Description**: POST /api/mentorships/:id/notes

#### PUT /:id/notes/:noteId

- **File**: backend\src\routes\mentorships.ts:520
- **Authentication**: Required
- **Database Tables**: existing, this, note
- **Features**: pagination
- **Description**: PUT /api/mentorships/:id/notes/:noteId

#### DELETE /:id/notes/:noteId

- **File**: backend\src\routes\mentorships.ts:556
- **Authentication**: Required
- **Database Tables**: this, note
- **Features**: pagination
- **Description**: DELETE /api/mentorships/:id/notes/:noteId

#### GET /:id/stats

- **File**: backend\src\routes\mentorships.ts:389
- **Authentication**: Required
- **Features**: pagination, filtering
- **Description**: GET /api/mentorships/:id/stats

#### GET /available-mentors/:menteeId

- **File**: backend\src\routes\mentorships.ts:774
- **Authentication**: Required
- **Description**: ===== UTILITY ROUTES =====

#### GET /my-mentees

- **File**: backend\src\routes\mentorships.ts:82
- **Authentication**: Required
- **Database Tables**: user_roles
- **Features**: pagination, filtering
- **Description**: Document upload functionality provided by mentorshipFileUpload middleware


### Notifications (7 endpoints)

**File Description**: GET /api/notifications - Get user's notifications

#### DELETE /:id

- **File**: backend\src\routes\notifications.ts:214
- **Authentication**: Required
- **Features**: filtering
- **Description**: Routes

#### PATCH /:id/read

- **File**: backend\src\routes\notifications.ts:212
- **Authentication**: Required
- **Features**: filtering
- **Description**: Routes

#### POST /broadcast

- **File**: backend\src\routes\notifications.ts:219
- **Authentication**: Required
- **Features**: filtering
- **Description**: Routes

#### PATCH /mark-all-read

- **File**: backend\src\routes\notifications.ts:213
- **Authentication**: Required
- **Features**: filtering
- **Description**: Routes

#### GET /preferences

- **File**: backend\src\routes\notifications.ts:215
- **Authentication**: Required
- **Features**: filtering
- **Description**: Routes

#### PATCH /preferences

- **File**: backend\src\routes\notifications.ts:216
- **Authentication**: Required
- **Features**: filtering
- **Description**: Routes

#### GET /unread-count

- **File**: backend\src\routes\notifications.ts:211
- **Authentication**: Required
- **Features**: filtering
- **Description**: Routes


### Organization (2 endpoints)

#### GET /settings

- **File**: backend\src\routes\organization.ts:11
- **Authentication**: Required
- **Database Tables**: organization_settings, organization, const, existing
- **Features**: filtering
- **Description**: @ts-nocheck

#### PUT /settings

- **File**: backend\src\routes\organization.ts:52
- **Authentication**: Required
- **Database Tables**: organization_settings, organization, const, existing, clearSettingsCache
- **Features**: filtering
- **Description**: Update organization settings


### Organizational-analytics (8 endpoints)

#### GET /costs/per-employee

- **File**: backend\src\routes\organizational-analytics.ts:614
- **Authentication**: Required
- **Features**: filtering
- **Description**: COST ANALYTICS

#### GET /dashboard/executive

- **File**: backend\src\routes\organizational-analytics.ts:695
- **Authentication**: Required
- **Features**: filtering
- **Description**: Get comprehensive organizational dashboard

#### GET /employees/performance

- **File**: backend\src\routes\organizational-analytics.ts:63
- **Authentication**: Required
- **Features**: filtering
- **Description**: EMPLOYEE ANALYTICS ENDPOINTS

#### GET /employees/retention

- **File**: backend\src\routes\organizational-analytics.ts:142
- **Authentication**: Required
- **Features**: filtering
- **Description**: Get employee retention and turnover analytics

#### GET /employees/training

- **File**: backend\src\routes\organizational-analytics.ts:242
- **Authentication**: Required
- **Features**: filtering
- **Description**: Get training and development analytics

#### GET /health/overview

- **File**: backend\src\routes\organizational-analytics.ts:334
- **Authentication**: Required
- **Features**: filtering
- **Description**: ORGANIZATIONAL HEALTH METRICS

#### GET /predictions/performance

- **File**: backend\src\routes\organizational-analytics.ts:549
- **Authentication**: Required
- **Features**: filtering
- **Description**: Get performance trends and predictions

#### GET /predictions/staffing

- **File**: backend\src\routes\organizational-analytics.ts:467
- **Authentication**: Required
- **Features**: filtering
- **Description**: PREDICTIVE ANALYTICS


### Payment-methods (4 endpoints)

**File Description**: GET /api/payment-methods

#### GET /:id

- **File**: backend\src\routes\payment-methods.ts:327
- **Authentication**: Required
- **Database Tables**: payment_methods, payment, data
- **Features**: filtering
- **Description**: GET /api/payment-methods/:id

#### PUT /:id

- **File**: backend\src\routes\payment-methods.ts:376
- **Authentication**: Required
- **Database Tables**: payment_methods, payment, data, error
- **Features**: filtering
- **Description**: PUT /api/payment-methods/:id

#### DELETE /:id

- **File**: backend\src\routes\payment-methods.ts:476
- **Authentication**: Required
- **Database Tables**: payment_methods, expense_data, error, payment
- **Features**: filtering
- **Description**: DELETE /api/payment-methods/:id

#### GET /:id/rules

- **File**: backend\src\routes\payment-methods.ts:537
- **Authentication**: Required
- **Database Tables**: payment_methods
- **Features**: filtering
- **Description**: GET /api/payment-methods/:id/rules


### Posts (6 endpoints)

#### GET /:id

- **File**: backend\src\routes\posts.ts:170
- **Authentication**: Required
- **Database Tables**: post_categories, posts, post_media, post_reads
- **Features**: filtering
- **Description**: GET /api/posts/:id - Get specific post

#### PUT /:id

- **File**: backend\src\routes\posts.ts:275
- **Authentication**: Required
- **Database Tables**: posts, post
- **Features**: filtering
- **Description**: PUT /api/posts/:id - Update post (Admin only)

#### DELETE /:id

- **File**: backend\src\routes\posts.ts:331
- **Authentication**: Required
- **Database Tables**: posts, post_media, post_reads, post
- **Features**: filtering
- **Description**: DELETE /api/posts/:id - Delete post (Admin only)

#### POST /:id/media

- **File**: backend\src\routes\posts.ts:360
- **Authentication**: Required
- **Database Tables**: posts, post_media, post_reads
- **Features**: filtering
- **Description**: POST /api/posts/:id/media - Upload media for post (Admin only)

#### GET /:id/reads

- **File**: backend\src\routes\posts.ts:407
- **Authentication**: Required
- **Database Tables**: post_media, post_reads
- **Features**: filtering
- **Description**: GET /api/posts/:id/reads - Get read receipts for post (Admin only)

#### GET /categories

- **File**: backend\src\routes\posts.ts:150
- **Authentication**: Required
- **Database Tables**: post_categories, posts, post_media, post_reads
- **Features**: pagination, filtering
- **Description**: GET /api/posts/categories - Get all post categories


### Purchase-orders (5 endpoints)

**File Description**: GET /api/purchase-orders

#### GET /:id

- **File**: backend\src\routes\purchase-orders.ts:334
- **Authentication**: Required
- **Database Tables**: purchase_orders
- **Features**: filtering
- **Description**: GET /api/purchase-orders/:id

#### PUT /:id

- **File**: backend\src\routes\purchase-orders.ts:468
- **Authentication**: Required
- **Database Tables**: purchase_orders, purchase, data
- **Features**: filtering
- **Description**: PUT /api/purchase-orders/:id

#### POST /:id/approve

- **File**: backend\src\routes\purchase-orders.ts:630
- **Authentication**: Required
- **Database Tables**: purchase_orders, error, purchase, approval, budget
- **Features**: filtering
- **Description**: POST /api/purchase-orders/:id/approve

#### GET /:id/expenses

- **File**: backend\src\routes\purchase-orders.ts:755
- **Authentication**: Required
- **Database Tables**: purchase_orders, expense_data
- **Features**: filtering
- **Description**: GET /api/purchase-orders/:id/expenses

#### POST /:id/reject

- **File**: backend\src\routes\purchase-orders.ts:728
- **Authentication**: Required
- **Database Tables**: purchase_orders, expense_data
- **Features**: filtering
- **Description**: POST /api/purchase-orders/:id/reject


### Receipts (3 endpoints)

**File Description**: GET /api/receipts

#### GET /:id

- **File**: backend\src\routes\receipts.ts:192
- **Authentication**: Required
- **Database Tables**: expense_receipts as r, expense_receipts, status, database
- **Features**: filtering
- **Description**: GET /api/receipts/:id

#### DELETE /:id

- **File**: backend\src\routes\receipts.ts:239
- **Authentication**: Required
- **Database Tables**: expense_receipts, status, with, database
- **Features**: filtering
- **Description**: DELETE /api/receipts/:id

#### POST /upload

- **File**: backend\src\routes\receipts.ts:141
- **Authentication**: Required
- **Database Tables**: expense_receipts, expense_receipts as r
- **Features**: pagination, filtering
- **Description**: POST /api/receipts/upload


### Referee-levels (2 endpoints)

#### PUT /:refereeId/assign

- **File**: backend\src\routes\referee-levels.ts:34
- **Authentication**: Required
- **Database Tables**: referee_levels, referees, games, referee, , 
- **Features**: filtering
- **Description**: PUT /api/referee-levels/:refereeId/assign - Assign referee to a level (admin only)

#### GET /check-assignment/:gameId/:refereeId

- **File**: backend\src\routes\referee-levels.ts:77
- **Authentication**: Required
- **Database Tables**: games, referees, , 
- **Features**: filtering
- **Description**: GET /api/referee-levels/check-assignment/:gameId/:refereeId - Check if referee can be assigned to game


### Referee-roles (7 endpoints)

#### GET /:id

- **File**: backend\src\routes\referee-roles.ts:87
- **Authentication**: Required
- **Database Tables**: referee_roles, user_referee_roles, referee
- **Features**: filtering
- **Description**: GET /api/referee-roles/:id - Get specific referee role

#### PUT /:id

- **File**: backend\src\routes\referee-roles.ts:179
- **Authentication**: Required
- **Database Tables**: referee_roles, user_referee_roles, referee, role
- **Features**: filtering
- **Description**: PUT /api/referee-roles/:id - Update referee role (admin only)

#### DELETE /:id

- **File**: backend\src\routes\referee-roles.ts:235
- **Authentication**: Required
- **Database Tables**: referee_roles, user_referee_roles
- **Features**: filtering
- **Description**: Parse permissions for response

#### POST /assign

- **File**: backend\src\routes\referee-roles.ts:282
- **Authentication**: Required
- **Database Tables**: referee_roles, users, user_referee_roles
- **Features**: filtering
- **Description**: POST /api/referee-roles/assign - Assign role to referee (admin only)

#### GET /permissions/summary

- **File**: backend\src\routes\referee-roles.ts:415
- **Authentication**: Required
- **Database Tables**: referee_roles
- **Features**: filtering
- **Description**: GET /api/referee-roles/permissions/summary - Get permissions summary for all roles

#### POST /remove

- **File**: backend\src\routes\referee-roles.ts:316
- **Authentication**: Required
- **Database Tables**: users, user_referee_roles
- **Features**: filtering
- **Description**: POST /api/referee-roles/remove - Remove role from referee (admin only)

#### GET /user/:userId

- **File**: backend\src\routes\referee-roles.ts:346
- **Authentication**: Required
- **Database Tables**: users, user_referee_roles, referee_roles
- **Features**: filtering
- **Description**: GET /api/referee-roles/user/:userId - Get roles for specific user


### Referees (18 endpoints)

**File Description**: Referees Routes - TypeScript Implementation

#### GET /:id

- **File**: backend\src\routes\referees.ts:154
- **Authentication**: Required
- **Database Tables**: referee, wage, your, const
- **Features**: pagination, filtering
- **Description**: Use RefereeService to get paginated profiles with enhanced data

#### PUT /:id

- **File**: backend\src\routes\referees.ts:213
- **Authentication**: Required
- **Database Tables**: games, game_assignments, referee, wage, your, const, availability
- **Features**: validation, filtering
- **Description**: PUT /api/referees/:id - Update referee (admin can update wage, referees cannot)

#### DELETE /:id

- **File**: backend\src\routes\referees.ts:440
- **Authentication**: Required
- **Database Tables**: users, user_referee_roles
- **Features**: filtering
- **Description**: DELETE /api/referees/:id - Delete referee

#### PATCH /:id/availability

- **File**: backend\src\routes\referees.ts:258
- **Authentication**: Required
- **Database Tables**: games, game_assignments, const, referee, availability
- **Features**: validation, filtering
- **Description**: Use UserService to update referee

#### PATCH /:id/level

- **File**: backend\src\routes\referees.ts:310
- **Authentication**: Required
- **Database Tables**: game_assignments, referee
- **Features**: filtering
- **Description**: PATCH /api/referees/:id/level - Update referee level

#### GET /:id/profile

- **File**: backend\src\routes\referees.ts:538
- **Authentication**: Required
- **Database Tables**: individual
- **Description**: ===== NEW ENHANCED REFEREE SYSTEM ENDPOINTS =====

#### POST /:id/profile

- **File**: backend\src\routes\referees.ts:642
- **Authentication**: Required
- **Database Tables**: roles, user_roles, referee
- **Features**: filtering
- **Description**: POST /api/referees/:id/profile - Create referee profile (when assigning referee role)

#### PATCH /:id/profile

- **File**: backend\src\routes\referees.ts:708
- **Authentication**: Required
- **Database Tables**: user_roles, referee, profile
- **Features**: filtering
- **Description**: PATCH /api/referees/:id/profile - Update referee profile

#### PATCH /:id/roles

- **File**: backend\src\routes\referees.ts:348
- **Authentication**: Required
- **Database Tables**: referee
- **Description**: PATCH /api/referees/:id/roles - Manage referee roles

#### PUT /:id/type

- **File**: backend\src\routes\referees.ts:581
- **Authentication**: Required
- **Database Tables**: roles
- **Features**: filtering
- **Description**: PUT /api/referees/:id/type - Change referee type (role reassignment)

#### PUT /:id/wage

- **File**: backend\src\routes\referees.ts:558
- **Authentication**: Required
- **Database Tables**: individual
- **Description**: PUT /api/referees/:id/wage - Update individual referee wage

#### GET /:id/white-whistle

- **File**: backend\src\routes\referees.ts:754
- **Authentication**: Required
- **Database Tables**: profile
- **Features**: filtering
- **Description**: Update profile

#### GET /:id/white-whistle-status

- **File**: backend\src\routes\referees.ts:406
- **Authentication**: Required
- **Database Tables**: users, user_referee_roles
- **Features**: validation, filtering
- **Description**: GET /api/referees/:id/white-whistle-status - Get white whistle display status

#### GET /available/:gameId

- **File**: backend\src\routes\referees.ts:275
- **Authentication**: Required
- **Database Tables**: games, game_assignments, referee, availability
- **Features**: validation, filtering
- **Description**: Use UserService to update availability

#### GET /capabilities

- **File**: backend\src\routes\referees.ts:628
- **Authentication**: Required
- **Database Tables**: roles, user_roles, referee
- **Features**: filtering
- **Description**: GET /api/referees/capabilities - Get available referee capabilities

#### GET /levels/summary

- **File**: backend\src\routes\referees.ts:469
- **Authentication**: Required
- **Database Tables**: users, user_referee_roles, individual
- **Features**: filtering
- **Description**: GET /api/referees/levels/summary - Get summary of referee levels

#### GET /test

- **File**: backend\src\routes\referees.ts:118
- **Authentication**: Required
- **Database Tables**: referee, wage
- **Features**: pagination, filtering
- **Description**: Initialize services

#### GET /types

- **File**: backend\src\routes\referees.ts:614
- **Authentication**: Required
- **Database Tables**: roles, user_roles, referee
- **Features**: filtering
- **Description**: GET /api/referees/types - Get available referee types with configurations


### Referees.bridge (1 endpoints)

**File Description**: JavaScript Bridge for TypeScript Referees Routes

#### GET /test

- **File**: backend\src\routes\referees.bridge.ts:49
- **Authentication**: Required
- **Features**: filtering
- **Description**: Initialize services with database connection


### Reports (4 endpoints)

**File Description**: Reports routes with TypeScript implementation

#### GET /assignment-patterns

- **File**: backend\src\routes\reports.ts:421
- **Authentication**: Required
- **Database Tables**: game_assignments
- **Features**: filtering
- **Description**: GET /api/reports/assignment-patterns - Get assignment pattern analysis

#### GET /availability-gaps

- **File**: backend\src\routes\reports.ts:817
- **Authentication**: Required
- **Database Tables**: games
- **Features**: filtering
- **Description**: GET /api/reports/availability-gaps - Get availability gap analysis

#### GET /financial-summary

- **File**: backend\src\routes\reports.ts:613
- **Authentication**: Required
- **Database Tables**: game_assignments
- **Features**: filtering
- **Description**: GET /api/reports/financial-summary - Get financial summary report

#### GET /referee-performance

- **File**: backend\src\routes\reports.ts:265
- **Authentication**: Required
- **Database Tables**: users
- **Features**: pagination, filtering
- **Description**: GET /api/reports/referee-performance - Get referee performance metrics


### Roles (3 endpoints)

#### GET /available

- **File**: backend\src\routes\roles.ts:39
- **Authentication**: Required
- **Database Tables**: user, , 
- **Features**: filtering
- **Description**: Schema for role updates

#### PUT /users/:userId

- **File**: backend\src\routes\roles.ts:75
- **Authentication**: Required
- **Database Tables**: user, , 
- **Features**: filtering
- **Description**: PUT /api/roles/users/:userId - Update user roles (Admin only)

#### GET /users/:userId

- **File**: backend\src\routes\roles.ts:134
- **Authentication**: Required
- **Database Tables**: user
- **Features**: filtering
- **Description**: GET /api/roles/users/:userId - Get user roles


### Self-assignment (1 endpoints)

#### GET /available

- **File**: backend\src\routes\self-assignment.ts:216
- **Authentication**: Required
- **Database Tables**: games, users, game_assignments
- **Features**: filtering
- **Description**: GET /api/self-assignment/available - Get games available for self-assignment


### Teams (6 endpoints)

**File Description**: Teams Routes - TypeScript Implementation

#### GET /:id

- **File**: backend\src\routes\teams.ts:294
- **Authentication**: Required
- **Database Tables**: teams, games
- **Features**: pagination, filtering
- **Description**: GET /api/teams/:id - Get specific team with games

#### PUT /:id

- **File**: backend\src\routes\teams.ts:574
- **Authentication**: Required
- **Database Tables**: teams, games, leagues, team
- **Features**: filtering
- **Description**: PUT /api/teams/:id - Update team

#### DELETE /:id

- **File**: backend\src\routes\teams.ts:617
- **Authentication**: Required
- **Database Tables**: teams, games, leagues
- **Features**: filtering
- **Description**: Invalidate related caches

#### POST /bulk

- **File**: backend\src\routes\teams.ts:428
- **Authentication**: Required
- **Database Tables**: teams, leagues
- **Features**: filtering
- **Description**: POST /api/teams/bulk - Create multiple teams

#### POST /generate

- **File**: backend\src\routes\teams.ts:497
- **Authentication**: Required
- **Database Tables**: leagues, teams, team
- **Features**: filtering
- **Description**: POST /api/teams/generate - Generate teams with pattern

#### GET /league/:league_id

- **File**: backend\src\routes\teams.ts:656
- **Authentication**: Required
- **Database Tables**: teams, leagues, games
- **Features**: filtering
- **Description**: Invalidate related caches


### Tournaments (4 endpoints)

**File Description**: Tournaments routes - TypeScript implementation

#### POST /create-games

- **File**: backend\src\routes\tournaments.ts:265
- **Authentication**: Required
- **Features**: filtering
- **Description**: POST /api/tournaments/create-games - Create actual games from tournament

#### GET /estimate

- **File**: backend\src\routes\tournaments.ts:403
- **Authentication**: None
- **Description**: GET /api/tournaments/estimate - Estimate tournament requirements

#### GET /formats

- **File**: backend\src\routes\tournaments.ts:344
- **Authentication**: None
- **Features**: filtering
- **Description**: GET /api/tournaments/formats - Get available tournament formats

#### POST /generate

- **File**: backend\src\routes\tournaments.ts:131
- **Authentication**: Required
- **Database Tables**: leagues, teams
- **Features**: filtering
- **Description**: POST /api/tournaments/generate - Generate tournament schedule


### Users (4 endpoints)

**File Description**: User Management Routes

#### GET /:id

- **File**: backend\src\routes\users.ts:314
- **Authentication**: Required
- **Features**: filtering

#### PUT /:id

- **File**: backend\src\routes\users.ts:334
- **Authentication**: Required

#### DELETE /:id

- **File**: backend\src\routes\users.ts:345
- **Authentication**: Required

#### GET /roles

- **File**: backend\src\routes\users.ts:295
- **Authentication**: Required
- **Features**: filtering
- **Description**: Soft delete by setting deleted_at timestamp


---

## Database Table Usage Summary

### ,  (25 endpoints)

- `DELETE /roles/:roleName`
- `GET /scan-history`
- `POST /export-config`
- `GET /:userId/roles`
- `PUT /:id`
- `POST /:id/maintenance`
- `PUT /maintenance/:maintenanceId`
- `POST /check-page-access`
- `GET /resources/:kind`
- `POST /resources`
- ... and 15 more

### users (23 endpoints)

- `GET /:userId/roles`
- `PUT /:userId/roles`
- `POST /:userId/roles`
- `DELETE /:userId/roles`
- `DELETE /:id/partner-preferences/:prefId`
- `POST /:id/run`
- `GET /referees/:id/calendar/ical`
- `PUT /:id`
- `POST /:id/assign`
- `GET /:token`
- ... and 13 more

### games (21 endpoints)

- `DELETE /:id/partner-preferences/:prefId`
- `POST /:id/run`
- `GET /games/calendar-feed`
- `PUT /:id`
- `GET /kpis`
- `GET /:id`
- `PUT /:id`
- `DELETE /:id`
- `GET /options/filters`
- `DELETE /:id`
- ... and 11 more

### game_assignments (15 endpoints)

- `PUT /:id/accept`
- `GET /referees/:id/calendar/ical`
- `GET /games/calendar-feed`
- `POST /:id/assign`
- `DELETE /:id`
- `POST /apply`
- `POST /analyze`
- `GET /:id`
- `PUT /:id`
- `PATCH /:id/availability`
- ... and 5 more

### referee (14 endpoints)

- `PUT /:refereeId/assign`
- `GET /:id`
- `PUT /:id`
- `GET /test`
- `GET /:id`
- `PUT /:id`
- `PATCH /:id/availability`
- `GET /available/:gameId`
- `PATCH /:id/level`
- `PATCH /:id/roles`
- ... and 4 more

### user_roles (13 endpoints)

- `GET /:userId/roles`
- `PUT /:userId/roles`
- `POST /:userId/roles`
- `DELETE /:userId/roles`
- `POST /login`
- `POST /register`
- `GET /me`
- `POST /refresh-permissions`
- `GET /my-mentees`
- `GET /types`
- ... and 3 more

### role (11 endpoints)

- `PUT /roles/:roleName`
- `DELETE /roles/:roleName`
- `GET /:roleId`
- `PUT /:roleId`
- `DELETE /:roleId`
- `DELETE /:roleId/users`
- `PATCH /:roleId/status`
- `GET /:roleId/hierarchy`
- `PUT /:name`
- `DELETE /:name`
- ... and 1 more

### leagues (11 endpoints)

- `GET /:id`
- `POST /bulk`
- `PUT /:id`
- `DELETE /:id`
- `GET /options/filters`
- `POST /bulk`
- `POST /generate`
- `PUT /:id`
- `DELETE /:id`
- `GET /league/:league_id`
- ... and 1 more

### teams (11 endpoints)

- `GET /:id`
- `PUT /:id`
- `DELETE /:id`
- `GET /options/filters`
- `GET /:id`
- `POST /bulk`
- `POST /generate`
- `PUT /:id`
- `DELETE /:id`
- `GET /league/:league_id`
- ... and 1 more

### budgets (10 endpoints)

- `GET /:id`
- `PUT /:id`
- `POST /:id/allocations`
- `DELETE /periods/:id`
- `DELETE /categories/:id`
- `DELETE /:id`
- `POST /transactions`
- `PUT /transactions/:id/status`
- `POST /vendors`
- `GET /dashboard`

### roles (9 endpoints)

- `GET /test`
- `GET /public-test`
- `GET /:userId/roles`
- `PUT /:userId/roles`
- `POST /:userId/roles`
- `PUT /:id/type`
- `GET /types`
- `GET /capabilities`
- `POST /:id/profile`

### ai_assignment_rules (9 endpoints)

- `GET /:id`
- `PUT /:id`
- `DELETE /:id/partner-preferences/:prefId`
- `POST /:id/run`
- `GET /:id/runs`
- `GET /runs/:runId`
- `POST /:id/toggle`
- `DELETE /:id`
- `GET /analytics`

### user_referee_roles (9 endpoints)

- `GET /:id`
- `PUT /:id`
- `DELETE /:id`
- `POST /assign`
- `POST /remove`
- `GET /user/:userId`
- `GET /:id/white-whistle-status`
- `DELETE /:id`
- `GET /levels/summary`

### const (8 endpoints)

- `POST /roles`
- `PUT /roles/:roleName`
- `POST /:id/versions`
- `GET /settings`
- `PUT /settings`
- `GET /:id`
- `PUT /:id`
- `PATCH /:id/availability`

### error (8 endpoints)

- `PUT /:id`
- `POST /:id/allocations`
- `GET /:id/transactions`
- `PUT /transactions/:id/status`
- `GET /vendors`
- `PUT /:id`
- `DELETE /:id`
- `POST /:id/approve`

### financial_transactions (8 endpoints)

- `GET /cash-flow`
- `GET /kpis`
- `GET /transactions`
- `POST /transactions`
- `GET /transactions/:id`
- `PUT /transactions/:id/status`
- `POST /vendors`
- `GET /dashboard`

### locations (8 endpoints)

- `GET /:id`
- `PUT /:id`
- `DELETE /:id`
- `GET /distances`
- `GET /:locationId/distance`
- `GET /admin/distance-stats`
- `POST /admin/calculate-user-distances/:userId`
- `POST /admin/calculate-location-distances/:locationId`

### content_items (7 endpoints)

- `GET /items`
- `GET /items/slug/:slug`
- `POST /items`
- `PUT /items/:id`
- `DELETE /items/:id`
- `GET /items/:id`
- `GET /items/slug/:slug`

### content_categories (7 endpoints)

- `GET /items/slug/:slug`
- `POST /items`
- `PUT /items/:id`
- `DELETE /items/:id`
- `GET /items/:id`
- `GET /items/slug/:slug`
- `GET /categories`

### financial_transactions as ft (7 endpoints)

- `GET /cash-flow`
- `GET /expense-analysis`
- `GET /kpis`
- `GET /transactions`
- `POST /transactions`
- `GET /transactions/:id`
- `GET /dashboard`

### a (6 endpoints)

- `GET /roles`
- `POST /roles`
- `PUT /roles/:roleName`
- `GET /:id`
- `PUT /:id`
- `POST /kpis`

### existing (6 endpoints)

- `PUT /:name`
- `GET /:id/notes`
- `POST /:id/notes`
- `PUT /:id/notes/:noteId`
- `GET /settings`
- `PUT /settings`

### data (6 endpoints)

- `GET /:id`
- `PUT /:id`
- `PUT /:id`
- `GET /:id`
- `PUT /:id`
- `PUT /:id`

### ai_assignment_rule_runs (6 endpoints)

- `POST /:id/run`
- `GET /:id/runs`
- `GET /runs/:runId`
- `POST /:id/toggle`
- `DELETE /:id`
- `GET /analytics`

### referees (6 endpoints)

- `GET /referees/:id`
- `POST /referees/:id`
- `GET /conflicts`
- `POST /bulk`
- `PUT /:refereeId/assign`
- `GET /check-assignment/:gameId/:refereeId`

### availability (6 endpoints)

- `GET /referees/:id`
- `POST /referees/:id`
- `PUT /:windowId`
- `PUT /:id`
- `PATCH /:id/availability`
- `GET /available/:gameId`

### company_credit_cards (6 endpoints)

- `GET /:id`
- `PUT /:id`
- `GET /:id/transactions`
- `POST /:id/assign`
- `POST /:id/block`
- `POST /:id/unblock`

### expense_receipts (6 endpoints)

- `POST /receipts/upload`
- `GET /receipts`
- `GET /receipts/:id`
- `POST /upload`
- `GET /:id`
- `DELETE /:id`

### referee_roles (6 endpoints)

- `GET /:id`
- `PUT /:id`
- `DELETE /:id`
- `POST /assign`
- `GET /user/:userId`
- `GET /permissions/summary`

### database (5 endpoints)

- `DELETE /:roleId`
- `POST /:roleId/permissions`
- `DELETE /:name`
- `GET /:id`
- `DELETE /:id`

### user (5 endpoints)

- `PUT /:userId/roles`
- `POST /:userId/roles`
- `GET /available`
- `PUT /users/:userId`
- `GET /users/:userId`

### assets (5 endpoints)

- `GET /:id`
- `PUT /:id`
- `POST /:id/checkout`
- `POST /checkout/:checkoutId/checkin`
- `GET /stats/overview`

### referee_availability (5 endpoints)

- `GET /referees/:id`
- `POST /referees/:id`
- `PUT /:windowId`
- `DELETE /:windowId`
- `GET /conflicts`

### game_assignments as ga (5 endpoints)

- `DELETE /:windowId`
- `GET /conflicts`
- `GET /utilization`
- `GET /payroll-summary`
- `GET /:id/games/analytics`

### organization_settings (5 endpoints)

- `POST /sync`
- `GET /sync/status`
- `DELETE /sync`
- `GET /settings`
- `PUT /settings`

### game_chunks (5 endpoints)

- `GET /:id`
- `PUT /:id`
- `POST /:id/assign`
- `DELETE /:id`
- `POST /auto-create`

### chunk_games (5 endpoints)

- `GET /:id`
- `PUT /:id`
- `POST /:id/assign`
- `DELETE /:id`
- `POST /auto-create`

### training_records (5 endpoints)

- `POST /:id/evaluations`
- `GET /:id/training`
- `POST /:id/training`
- `PUT /training/:trainingId`
- `GET /stats/overview`

### game (5 endpoints)

- `GET /:id`
- `PUT /:id`
- `PATCH /:id/status`
- `DELETE /:id`
- `POST /bulk-import`

### this (5 endpoints)

- `PUT /:id`
- `DELETE /:id`
- `POST /:id/notes`
- `PUT /:id/notes/:noteId`
- `DELETE /:id/notes/:noteId`

### posts (5 endpoints)

- `GET /categories`
- `GET /:id`
- `PUT /:id`
- `DELETE /:id`
- `POST /:id/media`

### post_media (5 endpoints)

- `GET /categories`
- `GET /:id`
- `DELETE /:id`
- `POST /:id/media`
- `GET /:id/reads`

### post_reads (5 endpoints)

- `GET /categories`
- `GET /:id`
- `DELETE /:id`
- `POST /:id/media`
- `GET /:id/reads`

### purchase_orders (5 endpoints)

- `GET /:id`
- `PUT /:id`
- `POST /:id/approve`
- `POST /:id/reject`
- `GET /:id/expenses`

### accounting_integrations (4 endpoints)

- `POST /chart-of-accounts`
- `GET /integrations`
- `POST /integrations`
- `POST /integrations/:id/test`

### journal_entries (4 endpoints)

- `POST /journal-entries`
- `POST /journal-entries/:id/approve`
- `GET /transactions/:id`
- `PUT /transactions/:id/status`

### API (4 endpoints)

- `GET /page-registry`
- `GET /roles/:roleId/apis`
- `PUT /roles/:roleId/apis`
- `GET /api-registry`

### policy (4 endpoints)

- `GET /roles`
- `POST /roles`
- `PUT /roles/:roleName`
- `DELETE /roles/:roleName`

### Cerbos (4 endpoints)

- `GET /:roleId`
- `PUT /:roleId`
- `DELETE /:roleId`
- `POST /:roleId/permissions`

### or (4 endpoints)

- `GET /:roleId`
- `PUT /:roleId`
- `PUT /:name`
- `PUT /:id`

### permissions (4 endpoints)

- `GET /test`
- `GET /public-test`
- `GET /:name`
- `PUT /:name`

### asset (4 endpoints)

- `PUT /:id`
- `POST /:id/checkout`
- `POST /checkout/:checkoutId/checkin`
- `GET /stats/overview`

### your (4 endpoints)

- `POST /referees/:id`
- `PUT /:windowId`
- `GET /:id`
- `PUT /:id`

### budget_periods (4 endpoints)

- `GET /periods`
- `POST /periods`
- `POST /:id/allocations`
- `DELETE /periods/:id`

### budget_categories (4 endpoints)

- `GET /categories`
- `POST /categories`
- `DELETE /periods/:id`
- `DELETE /categories/:id`

### budget (4 endpoints)

- `PUT /:id`
- `POST /:id/allocations`
- `POST /transactions`
- `POST /:id/approve`

### expense_data (4 endpoints)

- `GET /:id/transactions`
- `DELETE /:id`
- `POST /:id/reject`
- `GET /:id/expenses`

### documents (4 endpoints)

- `POST /:id/versions`
- `PUT /:id`
- `POST /:id/approve`
- `POST /:id/archive`

### payment_methods (4 endpoints)

- `GET /:id`
- `PUT /:id`
- `DELETE /:id`
- `GET /:id/rules`

### chart_of_accounts (3 endpoints)

- `GET /chart-of-accounts`
- `POST /chart-of-accounts`
- `POST /journal-entries`

### journal_entries as je (3 endpoints)

- `POST /integrations/:id/test`
- `GET /journal-entries`
- `POST /journal-entries`

### journal_entry_lines as jel (3 endpoints)

- `POST /integrations/:id/test`
- `GET /journal-entries`
- `POST /journal-entries`

### page (3 endpoints)

- `GET /roles/:roleId/pages`
- `PUT /roles/:roleId/pages`
- `GET /page-registry`

### feature (3 endpoints)

- `GET /api-registry`
- `GET /roles/:roleId/features`
- `PUT /roles/:roleId/features`

### features (3 endpoints)

- `GET /roles/:roleId/features`
- `PUT /roles/:roleId/features`
- `GET /roles/:roleId/scopes`

### permission (3 endpoints)

- `GET /roles`
- `POST /roles`
- `PUT /roles/:roleName`

### ai_assignment_partner_preferences (3 endpoints)

- `GET /:id`
- `POST /:id/partner-preferences`
- `DELETE /:id/partner-preferences/:prefId`

### asset_maintenance (3 endpoints)

- `GET /:id/maintenance`
- `POST /:id/maintenance`
- `PUT /maintenance/:maintenanceId`

### maintenance (3 endpoints)

- `GET /:id/maintenance`
- `POST /:id/maintenance`
- `PUT /maintenance/:maintenanceId`

### window (3 endpoints)

- `POST /referees/:id`
- `PUT /:windowId`
- `DELETE /:windowId`

### referee_availability as ra (3 endpoints)

- `PUT /:windowId`
- `DELETE /:windowId`
- `GET /conflicts`

### budget_allocations (3 endpoints)

- `POST /:id/allocations`
- `DELETE /categories/:id`
- `DELETE /:id`

### organization (3 endpoints)

- `POST /sync`
- `GET /settings`
- `PUT /settings`

### resource (3 endpoints)

- `POST /resources`
- `PUT /resources/:kind`
- `DELETE /resources/:kind`

### chunk (3 endpoints)

- `GET /:id`
- `PUT /:id`
- `POST /:id/assign`

### departments (3 endpoints)

- `GET /departments`
- `POST /departments`
- `PUT /departments/:id`

### department (3 endpoints)

- `GET /departments`
- `POST /departments`
- `PUT /departments/:id`

### job_positions (3 endpoints)

- `PUT /departments/:id`
- `GET /positions`
- `POST /positions`

### training (3 endpoints)

- `GET /:id/training`
- `POST /:id/training`
- `PUT /training/:trainingId`

### vendors (3 endpoints)

- `POST /transactions`
- `GET /vendors`
- `POST /vendors`

### transaction (3 endpoints)

- `GET /transactions/:id`
- `PUT /transactions/:id/status`
- `GET /vendors`

### assignment_patterns (3 endpoints)

- `POST /apply`
- `GET /:id`
- `DELETE /:id`

### invitations (3 endpoints)

- `GET /:token`
- `POST /:token/complete`
- `DELETE /:id`

### user_location_distances (3 endpoints)

- `DELETE /:id`
- `GET /distances`
- `GET /:locationId/distance`

### mentorship (3 endpoints)

- `GET /:id`
- `PUT /:id`
- `DELETE /:id`

### note (3 endpoints)

- `POST /:id/notes`
- `PUT /:id/notes/:noteId`
- `DELETE /:id/notes/:noteId`

### payment (3 endpoints)

- `GET /:id`
- `PUT /:id`
- `DELETE /:id`

### wage (3 endpoints)

- `GET /test`
- `GET /:id`
- `PUT /:id`

### individual (3 endpoints)

- `GET /levels/summary`
- `GET /:id/profile`
- `PUT /:id/wage`

### integration (2 endpoints)

- `POST /integrations`
- `POST /integrations/:id/test`

### accounting_sync_logs as asl (2 endpoints)

- `POST /journal-entries/:id/approve`
- `GET /sync-logs`

### the (2 endpoints)

- `PUT /roles/:roleName`
- `PUT /:id`

### rbac_page_permissions (2 endpoints)

- `POST /configure`
- `POST /auto-configure`

### rbac_scan_history (2 endpoints)

- `POST /auto-configure`
- `GET /scan-history`

### \n (2 endpoints)

- `GET /scan-history`
- `POST /export-config`

### rbac_pages (2 endpoints)

- `POST /export-config`
- `DELETE /clear-configured`

### rbac_endpoints (2 endpoints)

- `POST /export-config`
- `DELETE /clear-configured`

### rbac_functions (2 endpoints)

- `POST /export-config`
- `DELETE /clear-configured`

### role_pages (2 endpoints)

- `GET /:name`
- `PUT /:name`

### rule (2 endpoints)

- `GET /:id`
- `PUT /:id`

### AI (2 endpoints)

- `PUT /:id`
- `POST /:id/partner-preferences`

### suggestion (2 endpoints)

- `PUT /:id/accept`
- `PUT /:id/reject`

### ai_suggestions (2 endpoints)

- `PUT /:id/accept`
- `PUT /:id/reject`

### asset_checkouts (2 endpoints)

- `POST /:id/checkout`
- `POST /checkout/:checkoutId/checkin`

### credit (2 endpoints)

- `PUT /:id`
- `GET /:id/transactions`

### document (2 endpoints)

- `POST /:id/versions`
- `PUT /:id`

### event (2 endpoints)

- `PUT /:id`
- `POST /:id/approve`

### employees (2 endpoints)

- `GET /:id`
- `PUT /:id`

### employee (2 endpoints)

- `GET /:id`
- `PUT /:id`

### employee_evaluations (2 endpoints)

- `GET /:id/evaluations`
- `POST /:id/evaluations`

### budgets as b (2 endpoints)

- `GET /budget-variance`
- `GET /kpis`

### game_fees (2 endpoints)

- `PUT /:id`
- `GET /stats`

### game_fees as gf (2 endpoints)

- `PUT /:id`
- `GET /stats`

### league (2 endpoints)

- `POST /bulk`
- `PUT /:id`

### location (2 endpoints)

- `PUT /:id`
- `DELETE /:id`

### their (2 endpoints)

- `GET /:id`
- `PUT /:id`

### any (2 endpoints)

- `GET /:id`
- `PUT /:id`

### post_categories (2 endpoints)

- `GET /categories`
- `GET /:id`

### post (2 endpoints)

- `PUT /:id`
- `DELETE /:id`

### purchase (2 endpoints)

- `PUT /:id`
- `POST /:id/approve`

### expense_receipts as r (2 endpoints)

- `POST /upload`
- `GET /:id`

### status (2 endpoints)

- `GET /:id`
- `DELETE /:id`

### profile (2 endpoints)

- `PATCH /:id/profile`
- `GET /:id/white-whistle`

### team (2 endpoints)

- `POST /generate`
- `PUT /:id`

### journal_entry_lines (1 endpoints)

- `POST /journal-entries`

### rbac_api_permissions (1 endpoints)

- `POST /auto-configure`

### pages (1 endpoints)

- `PUT /:name`

### checkout (1 endpoints)

- `POST /checkout/:checkoutId/checkin`

### expense_data as ed (1 endpoints)

- `GET /utilization`

### basic (1 endpoints)

- `PUT /:id`

### communication (1 endpoints)

- `GET /:id`

### card (1 endpoints)

- `POST /:id/assign`

### content (1 endpoints)

- `PUT /items/:id`

### document_versions (1 endpoints)

- `POST /:id/versions`

### query (1 endpoints)

- `PUT /:id`

### document_acknowledgments (1 endpoints)

- `POST /:id/acknowledge`

### ai_processing_logs (1 endpoints)

- `GET /receipts/:id`

### cash_flow_forecasts (1 endpoints)

- `GET /cash-flow`

### financial_kpis (1 endpoints)

- `POST /kpis`

### an (1 endpoints)

- `PUT /:id`

### object (1 endpoints)

- `PUT /:id`

### pattern (1 endpoints)

- `POST /apply`

### method (1 endpoints)

- `PUT /:id`

### clearSettingsCache (1 endpoints)

- `PUT /settings`

### approval (1 endpoints)

- `POST /:id/approve`

### with (1 endpoints)

- `DELETE /:id`

### referee_levels (1 endpoints)

- `PUT /:refereeId/assign`

---

## Route Files Overview

### referees.ts

- **Path**: backend\src\routes\referees.ts
- **Category**: referees
- **Endpoints**: 18
- **Has Tests**: ❌
- **Description**: Referees Routes - TypeScript Implementation

**Routes**:
- GET /test
- GET /:id
- PUT /:id
- PATCH /:id/availability
- GET /available/:gameId
- PATCH /:id/level
- PATCH /:id/roles
- GET /:id/white-whistle-status
- DELETE /:id
- GET /levels/summary
- GET /:id/profile
- PUT /:id/wage
- PUT /:id/type
- GET /types
- GET /capabilities
- POST /:id/profile
- PATCH /:id/profile
- GET /:id/white-whistle

### access.ts

- **Path**: backend\src\routes\admin\access.ts
- **Category**: admin
- **Endpoints**: 15
- **Has Tests**: ❌
- **Description**: Access Control API Routes

**Routes**:
- GET /roles/:roleId/pages
- PUT /roles/:roleId/pages
- GET /page-registry
- GET /roles/:roleId/apis
- PUT /roles/:roleId/apis
- GET /api-registry
- GET /roles/:roleId/features
- PUT /roles/:roleId/features
- GET /roles/:roleId/scopes
- POST /check-page
- POST /check-api
- POST /check-feature
- POST /clear-cache
- GET /my-pages
- GET /my-apis

### mentorships.ts

- **Path**: backend\src\routes\mentorships.ts
- **Category**: mentorships
- **Endpoints**: 14
- **Has Tests**: ❌
- **Description**: Mentorship Management API Routes

**Routes**:
- GET /my-mentees
- GET /:id
- PUT /:id
- DELETE /:id
- GET /:id/stats
- GET /:id/notes
- POST /:id/notes
- PUT /:id/notes/:noteId
- DELETE /:id/notes/:noteId
- GET /:id/documents
- POST /:id/documents
- GET /:id/documents/:docId
- DELETE /:id/documents/:docId
- GET /available-mentors/:menteeId

### employees.ts

- **Path**: backend\src\routes\employees.ts
- **Category**: employees
- **Endpoints**: 13
- **Has Tests**: ❌

**Routes**:
- GET /departments
- POST /departments
- PUT /departments/:id
- GET /positions
- POST /positions
- GET /:id
- PUT /:id
- GET /:id/evaluations
- POST /:id/evaluations
- GET /:id/training
- POST /:id/training
- PUT /training/:trainingId
- GET /stats/overview

### cerbos.ts

- **Path**: backend\src\routes\cerbos.ts
- **Category**: cerbos
- **Endpoints**: 12
- **Has Tests**: ❌

**Routes**:
- GET /resources
- GET /resources/:kind
- POST /resources
- PUT /resources/:kind
- DELETE /resources/:kind
- GET /resources/:kind/actions
- POST /resources/:kind/actions
- DELETE /resources/:kind/actions/:action
- GET /resources/:kind/roles/:role
- PUT /resources/:kind/roles/:role
- POST /reload
- GET /derived-roles

### roles.ts

- **Path**: backend\src\routes\admin\roles.ts
- **Category**: admin
- **Endpoints**: 10
- **Has Tests**: ❌
- **Description**: Admin Role Management Routes

**Routes**:
- GET /:roleId
- PUT /:roleId
- DELETE /:roleId
- POST /:roleId/permissions
- DELETE /:roleId/permissions
- GET /:roleId/users
- POST /:roleId/users
- DELETE /:roleId/users
- PATCH /:roleId/status
- GET /:roleId/hierarchy

### ai-assignment-rules.ts

- **Path**: backend\src\routes\ai-assignment-rules.ts
- **Category**: ai-assignment-rules
- **Endpoints**: 10
- **Has Tests**: ❌

**Routes**:
- GET /:id
- PUT /:id
- POST /:id/partner-preferences
- DELETE /:id/partner-preferences/:prefId
- POST /:id/run
- GET /:id/runs
- GET /runs/:runId
- POST /:id/toggle
- DELETE /:id
- GET /analytics

### assets.ts

- **Path**: backend\src\routes\assets.ts
- **Category**: assets
- **Endpoints**: 10
- **Has Tests**: ❌

**Routes**:
- GET /:id
- PUT /:id
- GET /:id/maintenance
- POST /:id/maintenance
- PUT /maintenance/:maintenanceId
- POST /:id/checkout
- POST /checkout/:checkoutId/checkin
- GET /stats/overview
- GET /maintenance/due
- GET /checkouts/overdue

### budgets.ts

- **Path**: backend\src\routes\budgets.ts
- **Category**: budgets
- **Endpoints**: 10
- **Has Tests**: ❌
- **Description**: Budget Management Routes (TypeScript)

**Routes**:
- GET /periods
- POST /periods
- GET /categories
- POST /categories
- GET /:id
- PUT /:id
- POST /:id/allocations
- DELETE /periods/:id
- DELETE /categories/:id
- DELETE /:id

### documents.ts

- **Path**: backend\src\routes\documents.ts
- **Category**: documents
- **Endpoints**: 10
- **Has Tests**: ❌
- **Description**: Document Management Routes (TypeScript)

**Routes**:
- GET /:id
- POST /:id/versions
- PUT /:id
- POST /:id/approve
- POST /:id/archive
- GET /:id/download
- POST /:id/acknowledge
- GET /:id/acknowledgments
- GET /stats/overview
- GET /acknowledgments/pending

### locations.ts

- **Path**: backend\src\routes\locations.ts
- **Category**: locations
- **Endpoints**: 10
- **Has Tests**: ❌

**Routes**:
- GET /:id
- PUT /:id
- DELETE /:id
- GET /distances
- GET /:locationId/distance
- GET /admin/distance-stats
- POST /admin/calculate-user-distances/:userId
- POST /admin/calculate-location-distances/:locationId
- POST /admin/retry-failed-calculations
- POST /admin/initialize-all-distances

### accounting-integration.ts

- **Path**: backend\src\routes\accounting-integration.ts
- **Category**: accounting-integration
- **Endpoints**: 9
- **Has Tests**: ❌
- **Description**: GET /api/accounting/chart-of-accounts

**Routes**:
- GET /chart-of-accounts
- POST /chart-of-accounts
- GET /integrations
- POST /integrations
- POST /integrations/:id/test
- GET /journal-entries
- POST /journal-entries
- POST /journal-entries/:id/approve
- GET /sync-logs

### rbac-registry.ts

- **Path**: backend\src\routes\admin\rbac-registry.ts
- **Category**: admin
- **Endpoints**: 8
- **Has Tests**: ❌
- **Description**: RBAC Registry Routes

**Routes**:
- GET /scan
- GET /unconfigured
- GET /stats
- POST /configure
- POST /auto-configure
- GET /scan-history
- POST /export-config
- DELETE /clear-configured

### assignments.ts

- **Path**: backend\src\routes\assignments.ts
- **Category**: assignments
- **Endpoints**: 8
- **Has Tests**: ❌
- **Description**: Assignment management routes for the Sports Management API (TypeScript)

**Routes**:
- GET /:id
- POST /bulk-update
- DELETE /bulk-remove
- PATCH /:id/status
- DELETE /:id
- POST /bulk
- POST /check-conflicts
- GET /available-referees/:game_id

### content.ts

- **Path**: backend\src\routes\content.ts
- **Category**: content
- **Endpoints**: 8
- **Has Tests**: ❌

**Routes**:
- GET /items
- GET /items/slug/:slug
- POST /items
- PUT /items/:id
- DELETE /items/:id
- GET /items/:id
- GET /items/slug/:slug
- GET /categories

### organizational-analytics.ts

- **Path**: backend\src\routes\organizational-analytics.ts
- **Category**: organizational-analytics
- **Endpoints**: 8
- **Has Tests**: ❌

**Routes**:
- GET /employees/performance
- GET /employees/retention
- GET /employees/training
- GET /health/overview
- GET /predictions/staffing
- GET /predictions/performance
- GET /costs/per-employee
- GET /dashboard/executive

### financial-reports.ts

- **Path**: backend\src\routes\financial-reports.ts
- **Category**: financial-reports
- **Endpoints**: 7
- **Has Tests**: ❌
- **Description**: GET /api/financial-reports/budget-variance

**Routes**:
- GET /budget-variance
- GET /cash-flow
- GET /expense-analysis
- GET /payroll-summary
- GET /kpis
- POST /kpis
- GET /export/:type

### financial-transactions.ts

- **Path**: backend\src\routes\financial-transactions.ts
- **Category**: financial-transactions
- **Endpoints**: 7
- **Has Tests**: ❌
- **Description**: Financial Transactions API Routes

**Routes**:
- GET /transactions
- POST /transactions
- GET /transactions/:id
- PUT /transactions/:id/status
- GET /vendors
- POST /vendors
- GET /dashboard

### notifications.ts

- **Path**: backend\src\routes\notifications.ts
- **Category**: notifications
- **Endpoints**: 7
- **Has Tests**: ❌
- **Description**: GET /api/notifications - Get user's notifications

**Routes**:
- GET /unread-count
- PATCH /:id/read
- PATCH /mark-all-read
- DELETE /:id
- GET /preferences
- PATCH /preferences
- POST /broadcast

### referee-roles.ts

- **Path**: backend\src\routes\referee-roles.ts
- **Category**: referee-roles
- **Endpoints**: 7
- **Has Tests**: ❌

**Routes**:
- GET /:id
- PUT /:id
- DELETE /:id
- POST /assign
- POST /remove
- GET /user/:userId
- GET /permissions/summary

### maintenance.ts

- **Path**: backend\src\routes\admin\maintenance.ts
- **Category**: admin
- **Endpoints**: 6
- **Has Tests**: ❌
- **Description**: Admin Maintenance Routes

**Routes**:
- GET /status
- POST /gc
- GET /logs/size
- POST /logs/rotate
- GET /database/stats
- GET /health

### availability.ts

- **Path**: backend\src\routes\availability.ts
- **Category**: availability
- **Endpoints**: 6
- **Has Tests**: ❌
- **Description**: Availability Routes - TypeScript Implementation

**Routes**:
- GET /referees/:id
- POST /referees/:id
- PUT /:windowId
- DELETE /:windowId
- GET /conflicts
- POST /bulk

### calendar.ts

- **Path**: backend\src\routes\calendar.ts
- **Category**: calendar
- **Endpoints**: 6
- **Has Tests**: ❌
- **Description**: Calendar routes with TypeScript implementation

**Routes**:
- GET /referees/:id/calendar/ical
- GET /games/calendar-feed
- POST /sync
- GET /sync/status
- DELETE /sync
- POST /upload

### company-credit-cards.ts

- **Path**: backend\src\routes\company-credit-cards.ts
- **Category**: company-credit-cards
- **Endpoints**: 6
- **Has Tests**: ❌
- **Description**: GET /api/company-credit-cards

**Routes**:
- GET /:id
- PUT /:id
- GET /:id/transactions
- POST /:id/assign
- POST /:id/block
- POST /:id/unblock

### posts.ts

- **Path**: backend\src\routes\posts.ts
- **Category**: posts
- **Endpoints**: 6
- **Has Tests**: ❌

**Routes**:
- GET /categories
- GET /:id
- PUT /:id
- DELETE /:id
- POST /:id/media
- GET /:id/reads

### teams.ts

- **Path**: backend\src\routes\teams.ts
- **Category**: teams
- **Endpoints**: 6
- **Has Tests**: ❌
- **Description**: Teams Routes - TypeScript Implementation

**Routes**:
- GET /:id
- POST /bulk
- POST /generate
- PUT /:id
- DELETE /:id
- GET /league/:league_id

### auth.ts

- **Path**: backend\src\routes\auth.ts
- **Category**: auth
- **Endpoints**: 5
- **Has Tests**: ❌
- **Description**: Authentication routes with comprehensive TypeScript typing

**Routes**:
- POST /login
- POST /register
- GET /me
- POST /refresh-permissions
- POST /check-page-access

### chunks.ts

- **Path**: backend\src\routes\chunks.ts
- **Category**: chunks
- **Endpoints**: 5
- **Has Tests**: ❌

**Routes**:
- GET /:id
- PUT /:id
- POST /:id/assign
- DELETE /:id
- POST /auto-create

### games.ts

- **Path**: backend\src\routes\games.ts
- **Category**: games
- **Endpoints**: 5
- **Has Tests**: ❌
- **Description**: Game management routes for the Sports Management API (TypeScript)

**Routes**:
- GET /:id
- PUT /:id
- PATCH /:id/status
- DELETE /:id
- POST /bulk-import

### leagues.ts

- **Path**: backend\src\routes\leagues.ts
- **Category**: leagues
- **Endpoints**: 5
- **Has Tests**: ❌
- **Description**: Leagues Routes - TypeScript Implementation

**Routes**:
- GET /:id
- POST /bulk
- PUT /:id
- DELETE /:id
- GET /options/filters

### purchase-orders.ts

- **Path**: backend\src\routes\purchase-orders.ts
- **Category**: purchase-orders
- **Endpoints**: 5
- **Has Tests**: ❌
- **Description**: GET /api/purchase-orders

**Routes**:
- GET /:id
- PUT /:id
- POST /:id/approve
- POST /:id/reject
- GET /:id/expenses

### cerbos-policies.ts

- **Path**: backend\src\routes\admin\cerbos-policies.ts
- **Category**: admin
- **Endpoints**: 4
- **Has Tests**: ❌
- **Description**: Admin Cerbos Policy Management Routes

**Routes**:
- GET /roles
- POST /roles
- PUT /roles/:roleName
- DELETE /roles/:roleName

### unified-roles.ts

- **Path**: backend\src\routes\admin\unified-roles.ts
- **Category**: admin
- **Endpoints**: 4
- **Has Tests**: ❌
- **Description**: Unified Role Management Routes

**Routes**:
- GET /available-permissions
- GET /:name
- PUT /:name
- DELETE /:name

### users.ts

- **Path**: backend\src\routes\admin\users.ts
- **Category**: admin
- **Endpoints**: 4
- **Has Tests**: ❌
- **Description**: Admin User Management Routes

**Routes**:
- GET /:userId/roles
- PUT /:userId/roles
- POST /:userId/roles
- DELETE /:userId/roles

### historic-patterns.ts

- **Path**: backend\src\routes\historic-patterns.ts
- **Category**: historic-patterns
- **Endpoints**: 4
- **Has Tests**: ❌

**Routes**:
- POST /apply
- POST /analyze
- GET /:id
- DELETE /:id

### mentee-games.ts

- **Path**: backend\src\routes\mentee-games.ts
- **Category**: mentee-games
- **Endpoints**: 4
- **Has Tests**: ❌
- **Description**: Mentee Games Management API Routes

**Routes**:
- GET /:id/games
- GET /:id/games/upcoming
- GET /:id/games/history
- GET /:id/games/analytics

### payment-methods.ts

- **Path**: backend\src\routes\payment-methods.ts
- **Category**: payment-methods
- **Endpoints**: 4
- **Has Tests**: ❌
- **Description**: GET /api/payment-methods

**Routes**:
- GET /:id
- PUT /:id
- DELETE /:id
- GET /:id/rules

### reports.ts

- **Path**: backend\src\routes\reports.ts
- **Category**: reports
- **Endpoints**: 4
- **Has Tests**: ❌
- **Description**: Reports routes with TypeScript implementation

**Routes**:
- GET /referee-performance
- GET /assignment-patterns
- GET /financial-summary
- GET /availability-gaps

### tournaments.ts

- **Path**: backend\src\routes\tournaments.ts
- **Category**: tournaments
- **Endpoints**: 4
- **Has Tests**: ❌
- **Description**: Tournaments routes - TypeScript implementation

**Routes**:
- POST /generate
- POST /create-games
- GET /formats
- GET /estimate

### users.ts

- **Path**: backend\src\routes\users.ts
- **Category**: users
- **Endpoints**: 4
- **Has Tests**: ❌
- **Description**: User Management Routes

**Routes**:
- GET /roles
- GET /:id
- PUT /:id
- DELETE /:id

### permissions.ts

- **Path**: backend\src\routes\admin\permissions.ts
- **Category**: admin
- **Endpoints**: 3
- **Has Tests**: ❌
- **Description**: Admin Permissions Routes

**Routes**:
- GET /flat
- GET /category/:category
- GET /categories

### expenses.ts

- **Path**: backend\src\routes\expenses.ts
- **Category**: expenses
- **Endpoints**: 3
- **Has Tests**: ❌
- **Description**: POST /api/expenses/receipts/upload

**Routes**:
- POST /receipts/upload
- GET /receipts
- GET /receipts/:id

### invitations.ts

- **Path**: backend\src\routes\invitations.ts
- **Category**: invitations
- **Endpoints**: 3
- **Has Tests**: ❌

**Routes**:
- GET /:token
- POST /:token/complete
- DELETE /:id

### receipts.ts

- **Path**: backend\src\routes\receipts.ts
- **Category**: receipts
- **Endpoints**: 3
- **Has Tests**: ❌
- **Description**: GET /api/receipts

**Routes**:
- POST /upload
- GET /:id
- DELETE /:id

### roles.ts

- **Path**: backend\src\routes\roles.ts
- **Category**: roles
- **Endpoints**: 3
- **Has Tests**: ❌

**Routes**:
- GET /available
- PUT /users/:userId
- GET /users/:userId

### test-roles.ts

- **Path**: backend\src\routes\admin\test-roles.ts
- **Category**: admin
- **Endpoints**: 2
- **Has Tests**: ❌

**Routes**:
- GET /test
- GET /public-test

### ai-suggestions.ts

- **Path**: backend\src\routes\ai-suggestions.ts
- **Category**: ai-suggestions
- **Endpoints**: 2
- **Has Tests**: ❌
- **Description**: @file ai-suggestions.ts

**Routes**:
- PUT /:id/accept
- PUT /:id/reject

### budget-tracker.ts

- **Path**: backend\src\routes\budget-tracker.ts
- **Category**: budget-tracker
- **Endpoints**: 2
- **Has Tests**: ❌
- **Description**: GET /api/budgets/utilization

**Routes**:
- GET /utilization
- GET /categories

### communications.ts

- **Path**: backend\src\routes\communications.ts
- **Category**: communications
- **Endpoints**: 2
- **Has Tests**: ❌
- **Description**: Communications Routes - TypeScript implementation

**Routes**:
- GET /:id
- GET /unread/count

### game-fees.ts

- **Path**: backend\src\routes\game-fees.ts
- **Category**: game-fees
- **Endpoints**: 2
- **Has Tests**: ❌
- **Description**: GET /api/game-fees

**Routes**:
- PUT /:id
- GET /stats

### organization.ts

- **Path**: backend\src\routes\organization.ts
- **Category**: organization
- **Endpoints**: 2
- **Has Tests**: ❌

**Routes**:
- GET /settings
- PUT /settings

### referee-levels.ts

- **Path**: backend\src\routes\referee-levels.ts
- **Category**: referee-levels
- **Endpoints**: 2
- **Has Tests**: ❌

**Routes**:
- PUT /:refereeId/assign
- GET /check-assignment/:gameId/:refereeId

### financial-dashboard.ts

- **Path**: backend\src\routes\financial-dashboard.ts
- **Category**: financial-dashboard
- **Endpoints**: 1
- **Has Tests**: ❌
- **Description**: Financial Dashboard API Routes

**Routes**:
- GET /referee-payments

### referees.bridge.ts

- **Path**: backend\src\routes\referees.bridge.ts
- **Category**: referees.bridge
- **Endpoints**: 1
- **Has Tests**: ❌
- **Description**: JavaScript Bridge for TypeScript Referees Routes

**Routes**:
- GET /test

### self-assignment.ts

- **Path**: backend\src\routes\self-assignment.ts
- **Category**: self-assignment
- **Endpoints**: 1
- **Has Tests**: ❌

**Routes**:
- GET /available

### ai-suggestions.bridge.ts

- **Path**: backend\src\routes\ai-suggestions.bridge.ts
- **Category**: ai-suggestions.bridge
- **Endpoints**: 0
- **Has Tests**: ❌
- **Description**: @file ai-suggestions.bridge.js

**Routes**:

### availability.bridge.ts

- **Path**: backend\src\routes\availability.bridge.ts
- **Category**: availability.bridge
- **Endpoints**: 0
- **Has Tests**: ❌
- **Description**: Availability Routes Bridge

**Routes**:

### budgets.bridge.ts

- **Path**: backend\src\routes\budgets.bridge.ts
- **Category**: budgets.bridge
- **Endpoints**: 0
- **Has Tests**: ❌
- **Description**: Budget Routes Bridge (JavaScript)

**Routes**:

### calendar.bridge.ts

- **Path**: backend\src\routes\calendar.bridge.ts
- **Category**: calendar.bridge
- **Endpoints**: 0
- **Has Tests**: ❌
- **Description**: Bridge file for calendar routes

**Routes**:

### compliance.ts

- **Path**: backend\src\routes\compliance.ts
- **Category**: compliance
- **Endpoints**: 0
- **Has Tests**: ❌

**Routes**:

### documents.bridge.ts

- **Path**: backend\src\routes\documents.bridge.ts
- **Category**: documents.bridge
- **Endpoints**: 0
- **Has Tests**: ❌
- **Description**: Documents Routes Bridge (JavaScript)

**Routes**:

### expenses.bridge.ts

- **Path**: backend\src\routes\expenses.bridge.ts
- **Category**: expenses.bridge
- **Endpoints**: 0
- **Has Tests**: ❌

**Routes**:

### financial-approvals.ts

- **Path**: backend\src\routes\financial-approvals.ts
- **Category**: financial-approvals
- **Endpoints**: 0
- **Has Tests**: ❌

**Routes**:

### financial-dashboard.bridge.ts

- **Path**: backend\src\routes\financial-dashboard.bridge.ts
- **Category**: financial-dashboard.bridge
- **Endpoints**: 0
- **Has Tests**: ❌
- **Description**: Bridge file for financial-dashboard route

**Routes**:

### financial-transactions.bridge.ts

- **Path**: backend\src\routes\financial-transactions.bridge.ts
- **Category**: financial-transactions.bridge
- **Endpoints**: 0
- **Has Tests**: ❌
- **Description**: Bridge file for financial-transactions route

**Routes**:

### games-cerbos-example.ts

- **Path**: backend\src\routes\games-cerbos-example.ts
- **Category**: games-cerbos-example
- **Endpoints**: 0
- **Has Tests**: ❌

**Routes**:

### health.ts

- **Path**: backend\src\routes\health.ts
- **Category**: health
- **Endpoints**: 0
- **Has Tests**: ❌

**Routes**:

### leagues.bridge.ts

- **Path**: backend\src\routes\leagues.bridge.ts
- **Category**: leagues.bridge
- **Endpoints**: 0
- **Has Tests**: ❌
- **Description**: Leagues Routes Bridge

**Routes**:

### pages.ts

- **Path**: backend\src\routes\pages.ts
- **Category**: pages
- **Endpoints**: 0
- **Has Tests**: ❌
- **Description**: Page permission endpoints for Cerbos-based access control

**Routes**:

### performance.ts

- **Path**: backend\src\routes\performance.ts
- **Category**: performance
- **Endpoints**: 0
- **Has Tests**: ❌

**Routes**:

### reports.bridge.ts

- **Path**: backend\src\routes\reports.bridge.ts
- **Category**: reports.bridge
- **Endpoints**: 0
- **Has Tests**: ❌
- **Description**: Bridge file for reports routes

**Routes**:

### resources.ts

- **Path**: backend\src\routes\resources.ts
- **Category**: resources
- **Endpoints**: 0
- **Has Tests**: ❌

**Routes**:

### teams.bridge.ts

- **Path**: backend\src\routes\teams.bridge.ts
- **Category**: teams.bridge
- **Endpoints**: 0
- **Has Tests**: ❌
- **Description**: Teams Routes Bridge

**Routes**:

### tournaments.bridge.ts

- **Path**: backend\src\routes\tournaments.bridge.ts
- **Category**: tournaments.bridge
- **Endpoints**: 0
- **Has Tests**: ❌
- **Description**: Bridge file for tournaments routes

**Routes**:

### workflows.ts

- **Path**: backend\src\routes\workflows.ts
- **Category**: workflows
- **Endpoints**: 0
- **Has Tests**: ❌

**Routes**:

---

## Analysis Notes

### Key Findings

1. **Most Used Tables**: , , users, games, game_assignments, referee
2. **Largest Route Files**: referees.ts, access.ts, mentorships.ts
3. **Authentication Coverage**: 93% of routes require authentication
4. **Cerbos Coverage**: 0% of routes use Cerbos authorization

### Missing or Incomplete Implementations

- Routes without authentication: 22
- Routes without Cerbos checks: 330
- Files without tests: 75
