# Page Inventory for Cerbos Access Control

**Document Version:** 1.0
**Created:** 2025-10-01
**Purpose:** Comprehensive inventory of all frontend pages for implementing Cerbos-based page access control

## Table of Contents

1. [Overview](#overview)
2. [Current Access Control Mechanisms](#current-access-control-mechanisms)
3. [Page Categories](#page-categories)
4. [Complete Page Inventory](#complete-page-inventory)
5. [Cerbos Resource Mapping](#cerbos-resource-mapping)
6. [Migration Strategy](#migration-strategy)

---

## Overview

This document provides a complete inventory of all pages in the SportsManager application's frontend. Each page is analyzed for:

- Current access control mechanisms
- Required roles/permissions
- Organization/region scoping requirements
- Proposed Cerbos resource ID and policy

### Total Pages Identified: 25

**Breakdown by Category:**
- Public Pages: 3
- Admin Pages: 11
- Financial Pages: 3
- Core Application Pages: 4
- Settings Pages: 1
- Demo/Test Pages: 2
- Resources Pages: 1

---

## Current Access Control Mechanisms

### 1. AuthProvider Context

**Location:** `frontend/components/auth-provider.tsx`

**Features:**
- `useAuth()` hook provides authentication state
- `isAuthenticated` - boolean flag for auth status
- `user` - current user object with roles
- `hasRole(role)` - check single role
- `hasAnyRole(...roles)` - check multiple roles (OR)
- `hasPermission(permission)` - check single permission
- `hasAnyPermission(permissions)` - check multiple permissions (OR)
- `hasAllPermissions(permissions)` - check multiple permissions (AND)

**Role Hierarchy:**
- Super Admin and Admin roles have full access to everything
- Supports array of roles per user
- Legacy role system being migrated to Cerbos

### 2. ProtectedRoute Component

**Location:** `frontend/components/auth/ProtectedRoute.tsx`

**Features:**
- Wraps pages/components requiring authentication
- Checks page access via backend API: `POST /api/auth/check-page-access`
- Shows loading state while checking permissions
- Displays "Access Denied" UI with role information
- Supports custom permissions via `requiredPermissions` prop
- Supports dashboard views with `isDashboardView` and `viewName` props

**Usage Pattern:**
```tsx
<ProtectedRoute requiredPermissions={['roles.manage']}>
  <PageContent />
</ProtectedRoute>
```

### 3. Inline Authentication Checks

Many pages use inline checks:
```tsx
const { isAuthenticated } = useAuth()
if (!isAuthenticated) {
  return <LoginForm />
}
```

---

## Page Categories

### Public Pages
Pages accessible without authentication, or that handle authentication themselves.

### Admin Pages
Pages requiring admin role or specific admin permissions. Manage system settings, users, and security.

### Financial Pages
Pages for financial tracking, budgets, and expense management. May require finance manager or admin roles.

### Core Application Pages
Main application functionality - games management, notifications, etc. Generally require authentication but available to most roles.

### Settings Pages
User and system settings pages. Typically per-user with authentication required.

### Demo/Test Pages
Development and demonstration pages showing UI components or proof-of-concept features.

---

## Complete Page Inventory

### Summary Table

| Route | Page ID | Category | Current Access | Proposed Cerbos Policy |
|-------|---------|----------|----------------|------------------------|
| `/` | `home` | Public | Shows login if not authenticated | `page:home` - allow all authenticated users |
| `/login` | `login` | Public | Public access, redirects if authenticated | `page:login` - allow unauthenticated only |
| `/complete-signup` | `complete_signup` | Public | Token-based access via invitation | `page:complete_signup` - allow with valid invitation token |
| `/games` | `games` | Core Application | `isAuthenticated` check | `page:games` - allow authenticated users |
| `/budget` | `budget` | Financial | `isAuthenticated` check | `page:budget` - require `finance:view` or admin |
| `/notifications` | `notifications` | Core Application | `ProtectedRoute` wrapper | `page:notifications` - allow authenticated users |
| `/settings/notifications` | `settings_notifications` | Settings | `ProtectedRoute` wrapper | `page:settings_notifications` - allow authenticated users (own settings) |
| `/theme-demo` | `theme_demo` | Demo | No protection (public) | `page:theme_demo` - allow all (development only) |
| `/demo/ai-assignments` | `demo_ai_assignments` | Demo | No protection (public) | `page:demo_ai_assignments` - allow authenticated or remove in production |
| `/resources` | `resources` | Core Application | No explicit protection | `page:resources` - allow authenticated users |
| `/resources/[...slug]` | `resources_view` | Core Application | No explicit protection | `page:resources_view` - check resource category permissions |
| `/resources/categories/[id]/manage` | `resources_category_manage` | Core Application | Permission-based (category managers) | `page:resources_category_manage` - require category manager or admin |
| `/admin-permissions` | `admin_permissions_redirect` | Admin | Redirects to `/?view=admin-permissions` | Redirect page - no separate policy |
| `/admin-access-control` | `admin_access_control_redirect` | Admin | Redirects to `/?view=admin-access-control` | Redirect page - no separate policy |
| `/admin-roles` | `admin_roles_redirect` | Admin | Redirects to `/?view=admin-roles` | Redirect page - no separate policy |
| `/admin-security` | `admin_security_redirect` | Admin | Redirects to `/?view=admin-security` | Redirect page - no separate policy |
| `/admin-settings` | `admin_settings_redirect` | Admin | Redirects to `/?view=admin-settings` | Redirect page - no separate policy |
| `/admin-users` | `admin_users_redirect` | Admin | Redirects to `/?view=admin-users` | Redirect page - no separate policy |
| `/admin-workflows` | `admin_workflows_redirect` | Admin | Redirects to `/?view=admin-workflows` | Redirect page - no separate policy |
| `/admin/audit-logs` | `admin_audit_logs` | Admin | Admin check via `/api/auth/check-admin` | `page:admin_audit_logs` - require `admin:audit_logs` permission |
| `/admin/page-access` | `admin_page_access` | Admin | `ProtectedRoute` with `requiredPermissions: ['roles.manage']` | `page:admin_page_access` - require `roles:manage` permission |
| `/admin/permissions` | `admin_permissions` | Admin | No explicit protection (relies on component) | `page:admin_permissions` - require `permissions:manage` |
| `/admin/notifications/broadcast` | `admin_notifications_broadcast` | Admin | No explicit protection | `page:admin_notifications_broadcast` - require `notifications:broadcast` |
| `/financial-budgets` | `financial_budgets` | Financial | `isAuthenticated` check | `page:financial_budgets` - require `finance:view` or admin |
| `/financial-dashboard` | `financial_dashboard` | Financial | `isAuthenticated` and `token` check | `page:financial_dashboard` - require `finance:view` or admin |

---

## Detailed Page Analysis

### 1. Home Page (`/`)

**File:** `frontend/app/page.tsx`

**Current Access Control:**
- Uses `useAuth()` hook
- Shows `<LoginForm />` if `!isAuthenticated`
- Shows `<UnifiedDashboard />` for all authenticated users
- Dashboard adapts based on user roles and permissions

**Access Pattern:**
```tsx
const { user, isAuthenticated } = useAuth()
if (!isAuthenticated) {
  return <LoginForm />
}
return <UnifiedDashboard />
```

**Proposed Cerbos Policy:**
- **Resource:** `page:home`
- **Actions:** `view`
- **Policy:** Allow all authenticated users
- **Conditions:** None (role-based dashboard rendering handled by component)

---

### 2. Login Page (`/login`)

**File:** `frontend/app/login/page.tsx`

**Current Access Control:**
- Public access for unauthenticated users
- Redirects to `/` if already authenticated

**Access Pattern:**
```tsx
useEffect(() => {
  if (isAuthenticated) {
    router.push('/')
  }
}, [isAuthenticated, router])
```

**Proposed Cerbos Policy:**
- **Resource:** `page:login`
- **Actions:** `view`
- **Policy:** Allow unauthenticated users only
- **Conditions:** Redirect if authenticated

---

### 3. Complete Signup Page (`/complete-signup`)

**File:** `frontend/app/complete-signup/page.tsx`

**Current Access Control:**
- Token-based access via query parameter (`?token=...`)
- Validates invitation token via API
- No role-based restrictions

**Access Pattern:**
```tsx
const token = searchParams.get('token')
api.getInvitation(token)
  .then(response => setInvitation(response.data.invitation))
```

**Proposed Cerbos Policy:**
- **Resource:** `page:complete_signup`
- **Actions:** `view`
- **Policy:** Allow with valid invitation token
- **Conditions:** Token validation via backend

---

### 4. Games Page (`/games`)

**File:** `frontend/app/games/page.tsx`

**Current Access Control:**
- Simple `isAuthenticated` check
- Shows login form if not authenticated
- No role restrictions (all authenticated users can access)

**Proposed Cerbos Policy:**
- **Resource:** `page:games`
- **Actions:** `view`, `manage` (for game CRUD operations)
- **Policy:**
  - `view` - Allow all authenticated users
  - `manage` - Require `games:manage` permission or assignor/admin role

---

### 5. Budget Page (`/budget`)

**File:** `frontend/app/budget/page.tsx`

**Current Access Control:**
- Simple `isAuthenticated` check
- Renders `<BudgetTracker />` component
- No explicit role checks in page (component may have internal checks)

**Proposed Cerbos Policy:**
- **Resource:** `page:budget`
- **Actions:** `view`, `edit`
- **Policy:**
  - `view` - Require `finance:view` permission or admin role
  - `edit` - Require `finance:edit` permission or admin role
- **Organization Scoping:** Should be scoped to user's organization

---

### 6. Notifications Page (`/notifications`)

**File:** `frontend/app/notifications/page.tsx`

**Current Access Control:**
- Uses `<ProtectedRoute>` wrapper
- Backend API checks page access
- Available to all authenticated users

**Access Pattern:**
```tsx
<ProtectedRoute>
  <NotificationList />
</ProtectedRoute>
```

**Proposed Cerbos Policy:**
- **Resource:** `page:notifications`
- **Actions:** `view`
- **Policy:** Allow all authenticated users
- **Data Scoping:** Users see only their own notifications (handled by API)

---

### 7. Notification Settings Page (`/settings/notifications`)

**File:** `frontend/app/settings/notifications/page.tsx`

**Current Access Control:**
- Uses `<ProtectedRoute>` wrapper
- User-specific settings page
- All authenticated users can access their own settings

**Proposed Cerbos Policy:**
- **Resource:** `page:settings_notifications`
- **Actions:** `view`, `edit`
- **Policy:** Allow authenticated users (own settings only)
- **Resource Scoping:** User can only view/edit their own settings

---

### 8. Theme Demo Page (`/theme-demo`)

**File:** `frontend/app/theme-demo/page.tsx`

**Current Access Control:**
- No authentication or authorization checks
- Publicly accessible
- Development/testing page

**Proposed Cerbos Policy:**
- **Resource:** `page:theme_demo`
- **Actions:** `view`
- **Policy:** Allow all in development, remove or restrict in production
- **Recommendation:** Remove from production or add authentication

---

### 9. AI Assignments Demo Page (`/demo/ai-assignments`)

**File:** `frontend/app/demo/ai-assignments/page.tsx`

**Current Access Control:**
- No authentication checks
- Demo/proof-of-concept page
- Uses mock data

**Proposed Cerbos Policy:**
- **Resource:** `page:demo_ai_assignments`
- **Actions:** `view`
- **Policy:** Allow authenticated users or remove in production
- **Recommendation:** Remove from production or require admin access

---

### 10. Resources Page (`/resources`)

**File:** `frontend/app/resources/page.tsx`

**Current Access Control:**
- No explicit authentication/authorization in page file
- Renders `<ResourceCentreNew />` component
- Component may have internal access controls

**Proposed Cerbos Policy:**
- **Resource:** `page:resources`
- **Actions:** `view`
- **Policy:** Allow authenticated users
- **Note:** Individual resource access controlled by category permissions

---

### 11. Resource View Page (`/resources/[...slug]`)

**File:** `frontend/app/resources/[...slug]/page.tsx`

**Current Access Control:**
- No explicit page-level checks
- Renders `<ResourceRenderer slug={slug} />`
- Access likely controlled by resource category permissions

**Proposed Cerbos Policy:**
- **Resource:** `page:resources_view`
- **Actions:** `view`
- **Policy:** Check resource category permissions
- **Dynamic:** Resource ID from slug parameter
- **Conditions:** User must have permission to view the specific resource category

---

### 12. Resource Category Management Page (`/resources/categories/[id]/manage`)

**File:** `frontend/app/resources/categories/[id]/manage/page.tsx`

**Current Access Control:**
- Complex page with tab-based interface
- Checks category permissions from API
- Uses `category.permissions.canManage`, `canAddManagers`, `canEditPermissions`
- Shows permission-based UI elements

**Proposed Cerbos Policy:**
- **Resource:** `resource_category:{id}`
- **Actions:** `manage`, `add_managers`, `edit_permissions`, `view_insights`
- **Policy:**
  - `manage` - Require category manager role or admin
  - `add_managers` - Require category owner or admin
  - `edit_permissions` - Require category owner or admin
  - `view_insights` - Require manager or admin
- **Dynamic Resource:** Category ID from URL parameter

---

### 13-19. Admin Redirect Pages

**Files:**
- `/admin-permissions` → `/?view=admin-permissions`
- `/admin-access-control` → `/?view=admin-access-control`
- `/admin-roles` → `/?view=admin-roles`
- `/admin-security` → `/?view=admin-security`
- `/admin-settings` → `/?view=admin-settings`
- `/admin-users` → `/?view=admin-users`
- `/admin-workflows` → `/?view=admin-workflows`

**Current Access Control:**
- All redirect to main dashboard with view parameter
- Access control handled by UnifiedDashboard component
- No page-level authorization

**Proposed Cerbos Policy:**
- **Note:** These are redirect-only pages
- Actual authorization handled by dashboard views
- No separate Cerbos policies needed
- Dashboard view access controlled by view-specific policies

---

### 20. Admin Audit Logs Page (`/admin/audit-logs`)

**File:** `frontend/app/admin/audit-logs/page.tsx`

**Current Access Control:**
- Checks admin permissions via `/api/auth/check-admin`
- Shows "Access Denied" if not admin
- Loads audit log data from `/api/admin/audit-logs`
- Falls back to mock data if API unavailable

**Access Pattern:**
```tsx
const response = await fetch('/api/auth/check-admin', {
  method: 'GET',
  credentials: 'include'
})
if (response.status === 403) {
  setState(prev => ({
    ...prev,
    error: 'Access denied. Admin permissions required.',
    isLoading: false
  }))
}
```

**Proposed Cerbos Policy:**
- **Resource:** `page:admin_audit_logs`
- **Actions:** `view`, `export`
- **Policy:**
  - `view` - Require `admin:audit_logs` permission or Super Admin role
  - `export` - Require `admin:audit_logs:export` permission or Super Admin role
- **Conditions:** Admin-only access, highly sensitive data

---

### 21. Admin Page Access Management (`/admin/page-access`)

**File:** `frontend/app/admin/page-access/page.tsx`

**Current Access Control:**
- Uses `<ProtectedRoute requiredPermissions={['roles.manage']}>` wrapper
- Checks for specific permission: `roles.manage`
- Shows access denied if permission not granted

**Access Pattern:**
```tsx
<ProtectedRoute requiredPermissions={['roles.manage']}>
  <RolePageAccessManager />
</ProtectedRoute>
```

**Proposed Cerbos Policy:**
- **Resource:** `page:admin_page_access`
- **Actions:** `view`, `manage`
- **Policy:**
  - `view` - Require `roles:manage` permission
  - `manage` - Require `roles:manage` permission
- **Note:** This page manages page access itself - critical security component

---

### 22. Admin Permissions Page (`/admin/permissions`)

**File:** `frontend/app/admin/permissions/page.tsx`

**Current Access Control:**
- No explicit page-level protection
- Renders `<PermissionManagementDashboard />`
- Component likely has internal permission checks

**Proposed Cerbos Policy:**
- **Resource:** `page:admin_permissions`
- **Actions:** `view`, `manage`
- **Policy:**
  - `view` - Require `permissions:view` or admin role
  - `manage` - Require `permissions:manage` or Super Admin role
- **Recommendation:** Add `<ProtectedRoute>` wrapper with required permissions

---

### 23. Admin Broadcast Notifications Page (`/admin/notifications/broadcast`)

**File:** `frontend/app/admin/notifications/broadcast/page.tsx`

**Current Access Control:**
- No explicit page-level protection
- Loads available roles from API
- Form-based page for sending broadcast notifications

**Proposed Cerbos Policy:**
- **Resource:** `page:admin_notifications_broadcast`
- **Actions:** `view`, `send`
- **Policy:**
  - `view` - Require `notifications:broadcast` permission or admin role
  - `send` - Require `notifications:broadcast` permission or admin role
- **Recommendation:** Add authentication and permission checks
- **Data Validation:** Backend should verify sender has permission to broadcast to selected roles

---

### 24. Financial Budgets Page (`/financial-budgets`)

**File:** `frontend/app/financial-budgets/page.tsx`

**Current Access Control:**
- Simple `isAuthenticated` check
- Renders `<BudgetTracker />` component
- Same component as `/budget` page

**Proposed Cerbos Policy:**
- **Resource:** `page:financial_budgets`
- **Actions:** `view`, `edit`
- **Policy:**
  - `view` - Require `finance:view` permission or admin role
  - `edit` - Require `finance:edit` permission or admin role
- **Organization Scoping:** Should be scoped to user's organization
- **Note:** Duplicate of `/budget` - consider consolidating

---

### 25. Financial Dashboard Page (`/financial-dashboard`)

**File:** `frontend/app/financial-dashboard/page.tsx`

**Current Access Control:**
- Checks `isAuthenticated` and `token`
- Loads financial data from `/financial-dashboard?period={period}`
- Comprehensive financial analytics and reporting

**Access Pattern:**
```tsx
const { isAuthenticated, token } = useAuth()
if (!isAuthenticated) {
  return <LoginForm />
}
```

**Proposed Cerbos Policy:**
- **Resource:** `page:financial_dashboard`
- **Actions:** `view`, `export`
- **Policy:**
  - `view` - Require `finance:view` or `finance:dashboard` permission or admin role
  - `export` - Require `finance:export` permission or admin role
- **Organization Scoping:** Critical - users should only see their organization's financial data
- **Conditions:** May need region/league scoping for multi-league organizations

---

## Cerbos Resource Mapping

### Resource Naming Convention

**Format:** `page:{page_id}`

**Examples:**
- `page:home`
- `page:games`
- `page:admin_audit_logs`
- `page:financial_dashboard`

### Dynamic Resources

Some resources are dynamic and include parameters:

**Format:** `{resource_type}:{resource_id}`

**Examples:**
- `resource_category:training-materials` (for `/resources/categories/training-materials/manage`)
- `resource_document:safety-guidelines` (for `/resources/safety-guidelines`)

### Resource Hierarchy

```
page:*
├── page:home (public)
├── page:login (public)
├── page:complete_signup (token-based)
├── page:games (authenticated)
├── page:notifications (authenticated)
├── page:resources (authenticated)
│   ├── resource_category:{id} (category-specific permissions)
│   └── resource_document:{slug} (document-specific permissions)
├── page:settings_* (user-scoped)
│   └── page:settings_notifications
├── page:financial_* (finance permissions)
│   ├── page:budget
│   ├── page:financial_budgets
│   └── page:financial_dashboard
└── page:admin_* (admin permissions)
    ├── page:admin_audit_logs
    ├── page:admin_page_access
    ├── page:admin_permissions
    └── page:admin_notifications_broadcast
```

---

## Migration Strategy

### Phase 1: Foundation (Current Phase)

**Goal:** Establish Cerbos infrastructure for page access control

**Tasks:**
1. ✅ Create page inventory (this document)
2. Define Cerbos policies for each page
3. Create page resource definitions
4. Set up Cerbos policy files

### Phase 2: Backend Integration

**Goal:** Implement backend Cerbos checks

**Tasks:**
1. Update `/api/auth/check-page-access` to use Cerbos
2. Create page access middleware
3. Add organization/region context to requests
4. Implement dynamic resource resolution

### Phase 3: Frontend Migration

**Goal:** Update frontend to use Cerbos-based checks

**Tasks:**
1. Update `ProtectedRoute` component to use Cerbos
2. Add Cerbos context provider
3. Update inline auth checks to use Cerbos
4. Remove legacy role checks

### Phase 4: Testing & Validation

**Goal:** Ensure all pages work correctly with Cerbos

**Tasks:**
1. Test each page with different user roles
2. Validate organization/region scoping
3. Test dynamic resource permissions
4. Performance testing

### Phase 5: Cleanup

**Goal:** Remove legacy access control code

**Tasks:**
1. Remove old role-based checks
2. Clean up unused auth utilities
3. Update documentation
4. Archive old access control code

---

## Action Items for Cerbos Implementation

### High Priority

1. **Add missing page-level protection:**
   - `/admin/permissions` - Add `ProtectedRoute` wrapper
   - `/admin/notifications/broadcast` - Add authentication check
   - `/resources` - Add authentication check
   - `/theme-demo` - Remove from production or add auth

2. **Create Cerbos policies for critical pages:**
   - Admin audit logs
   - Admin page access management
   - Financial dashboard
   - Admin permissions management

3. **Implement organization scoping:**
   - Financial pages must be scoped to user's organization
   - Games page should show organization-specific games
   - Resources should respect organization boundaries

### Medium Priority

1. **Consolidate duplicate pages:**
   - `/budget` and `/financial-budgets` use same component
   - Consider single route with better naming

2. **Update redirect pages:**
   - Evaluate if admin redirect pages are needed
   - Consider direct routing instead of redirects

3. **Add permission checks to components:**
   - Many pages rely on component-level checks
   - Should have page-level gates as well

### Low Priority

1. **Demo page management:**
   - Remove demo pages from production
   - Or add admin-only access restrictions

2. **Documentation:**
   - Document each page's required permissions
   - Create user role → page access matrix
   - Add inline comments for access control logic

---

## Appendix: Permission Reference

### Proposed Cerbos Permissions

**Format:** `{domain}:{action}`

#### Core Permissions

- `page:view` - View any page (base permission)
- `games:view` - View games
- `games:manage` - Manage games (CRUD)
- `notifications:view` - View notifications
- `notifications:broadcast` - Send broadcast notifications
- `resources:view` - View resources
- `resources:manage` - Manage resources

#### Financial Permissions

- `finance:view` - View financial data
- `finance:edit` - Edit budgets and financial data
- `finance:dashboard` - Access financial dashboard
- `finance:export` - Export financial reports

#### Admin Permissions

- `admin:audit_logs` - View audit logs
- `admin:audit_logs:export` - Export audit logs
- `permissions:view` - View permissions
- `permissions:manage` - Manage permissions
- `roles:view` - View roles
- `roles:manage` - Manage roles and page access

#### Resource Permissions

- `resource_category:view` - View resource category
- `resource_category:manage` - Manage category resources
- `resource_category:add_managers` - Add/remove category managers
- `resource_category:edit_permissions` - Edit category permissions
- `resource_category:view_insights` - View category analytics

---

## Notes for Implementation Team

### Key Considerations

1. **Organization Context:** Many pages require organization scoping. Ensure Cerbos policies include organization attributes.

2. **Role Hierarchy:** Super Admin and Admin roles currently have universal access. This should be preserved in Cerbos policies.

3. **Dynamic Resources:** Resource category and document pages use dynamic IDs. Cerbos policies must support parameterized resources.

4. **Performance:** Page access checks happen on every page load. Implement caching and optimize Cerbos queries.

5. **Backward Compatibility:** During migration, support both legacy and Cerbos checks. Remove legacy code only after thorough testing.

6. **Error Handling:** Ensure graceful degradation if Cerbos is unavailable. Consider fallback to deny-by-default.

### Testing Checklist

For each page, test with:
- [ ] Unauthenticated user
- [ ] Authenticated user (referee role)
- [ ] Admin user
- [ ] Super Admin user
- [ ] User from different organization (for scoped pages)
- [ ] User with specific permissions granted
- [ ] User with specific permissions revoked

---

**End of Page Inventory Document**
