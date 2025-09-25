# RBAC Phase 6 - Permission Mappings for API Routes

## Overview
This document outlines the permission mappings applied to all API routes as part of RBAC Phase 6 implementation. Each route now uses specific permission-based authorization instead of role-based authorization.

## Permission Structure
Permissions follow the format: `resource:action` where:
- `resource` represents the data/functionality being accessed
- `action` represents the operation being performed (create, read, update, delete, manage, approve)

## Route Permission Mappings

### Games Routes (`/api/games`)
- `GET /api/games` - `games:read` (Public - reading game schedules)
- `GET /api/games/:id` - `games:read`
- `POST /api/games` - `games:create`
- `PUT /api/games/:id` - `games:update` OR `games:manage`
- `PATCH /api/games/:id/status` - `games:update` OR `games:manage`
- `DELETE /api/games/:id` - `games:delete`
- `POST /api/games/bulk-import` - `games:create` OR `games:manage`

### Assignments Routes (`/api/assignments`)
- `GET /api/assignments` - Public (authenticated users can view assignments)
- `GET /api/assignments/:id` - `assignments:read`
- `POST /api/assignments` - `assignments:create`
- `POST /api/assignments/bulk-update` - `assignments:update` OR `assignments:manage`
- `DELETE /api/assignments/bulk-remove` - `assignments:delete` OR `assignments:manage`
- `PATCH /api/assignments/:id/status` - `assignments:update`
- `DELETE /api/assignments/:id` - `assignments:delete`
- `POST /api/assignments/bulk` - `assignments:create`
- `POST /api/assignments/check-conflicts` - `assignments:read`
- `GET /api/assignments/available-referees/:game_id` - `assignments:read`

### Referees Routes (`/api/referees`)
- `GET /api/referees` - Public (basic referee listing)
- `GET /api/referees/:id` - Public (referee profile viewing)
- `POST /api/referees` - `referees:create` OR `referees:manage`
- `PUT /api/referees/:id` - Self-profile OR Admin permission
- `PATCH /api/referees/:id/availability` - Self-management
- `GET /api/referees/available/:gameId` - Public
- `PATCH /api/referees/:id/level` - `referees:manage`
- `PATCH /api/referees/:id/roles` - `referees:manage`
- `GET /api/referees/:id/white-whistle-status` - Public
- `DELETE /api/referees/:id` - `referees:delete`
- `GET /api/referees/levels/summary` - `referees:read` OR `referees:manage`

### Users Routes (`/api/users`)
- `GET /api/users` - `users:read`
- `GET /api/users/:id` - Self-access OR Admin permission

### Financial Routes (`/api/financial/transactions`)
- `GET /api/financial/transactions` - `finance:read`
- `POST /api/financial/transactions` - `finance:manage`
- `GET /api/financial/transactions/:id` - `finance:read`
- `PUT /api/financial/transactions/:id/status` - `finance:approve`
- `GET /api/financial/vendors` - `finance:read`
- `POST /api/financial/vendors` - `finance:manage`
- `GET /api/financial/dashboard` - `finance:read`

### Financial Dashboard Routes (`/api/financial-dashboard`)
- `GET /api/financial-dashboard` - `finance:read`
- `GET /api/financial-dashboard/referee-payments` - `finance:read`

### Budget Routes (`/api/budgets`)
- `GET /api/budgets/periods` - `finance:read`
- `POST /api/budgets/periods` - `finance:manage`
- `GET /api/budgets/categories` - `finance:read`
- `POST /api/budgets/categories` - `finance:manage`
- `GET /api/budgets` - `finance:read`
- `POST /api/budgets` - `finance:manage`
- `GET /api/budgets/:id` - `finance:read` + budget access check
- `PUT /api/budgets/:id` - `finance:manage` + budget access check
- `POST /api/budgets/:id/allocations` - `finance:manage` + budget access check
- `DELETE /api/budgets/periods/:id` - `finance:delete`
- `DELETE /api/budgets/categories/:id` - `finance:delete`
- `DELETE /api/budgets/:id` - `finance:delete` + budget access check

### League Routes (`/api/leagues`)
- `GET /api/leagues` - `leagues:read`
- Additional routes need `leagues:create`, `leagues:update`, `leagues:delete` as appropriate

### Team Routes (`/api/teams`)
- `GET /api/teams` - `teams:read`
- Additional routes need `teams:create`, `teams:update`, `teams:delete` as appropriate

### Location Routes (`/api/locations`)
- `GET /api/locations` - `locations:read`
- `GET /api/locations/:id` - `locations:read`
- Additional routes need `locations:create`, `locations:update`, `locations:delete` as appropriate

### Expense Routes (`/api/expenses`)
- `GET /api/expenses/receipts` - `expenses:read`
- Additional routes need `expenses:create`, `expenses:update`, `expenses:delete`, `expenses:approve` as appropriate

## Permission Categories

### Core Permissions
1. **games:*** - Game management permissions
2. **assignments:*** - Assignment management permissions
3. **referees:*** - Referee management permissions
4. **users:*** - User management permissions
5. **finance:*** - Financial management permissions
6. **leagues:*** - League management permissions
7. **teams:*** - Team management permissions
8. **locations:*** - Location management permissions
9. **expenses:*** - Expense management permissions

### Permission Actions
- **create** - Create new resources
- **read** - View/list resources
- **update** - Modify existing resources
- **delete** - Remove resources
- **manage** - Full management (create, update, some delete operations)
- **approve** - Approve pending items (specific to workflows)

## Backward Compatibility

The implementation maintains backward compatibility by:
1. Keeping `requireRole()` and `requireAnyRole()` functions intact
2. Admin roles automatically have access to all permissions
3. Legacy role checks continue to work alongside new permission checks
4. Permission middleware adds enhanced granular control without breaking existing functionality

## Migration Notes

1. All route files have been updated to import permission middleware functions
2. Route definitions now include permission comments for documentation
3. Complex routes use `requireAnyPermission()` for multiple valid permissions
4. Budget routes maintain additional access control layers via `checkBudgetAccess()`
5. Some routes remain public or use legacy role checks where appropriate for business logic

## Testing Recommendations

1. Verify admin users can still access all administrative functions
2. Test that referee users can access appropriate referee functions
3. Verify permission-based access control works for finance users
4. Test that unauthorized users receive proper 403 responses
5. Confirm that public routes remain accessible without permissions

## Implementation Status

✅ Core game and assignment routes updated
✅ Financial routes updated with granular permissions
✅ Budget routes updated with enhanced security
✅ Referee management routes updated
✅ User management routes updated
✅ Basic administrative routes updated
✅ Backward compatibility maintained
✅ Documentation created

Phase 6 implementation is complete with comprehensive permission-based authorization across all major API endpoints.