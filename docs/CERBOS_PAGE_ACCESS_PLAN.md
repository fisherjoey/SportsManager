# Cerbos Page Access Control - Implementation Plan

## Overview
Migrate from role-based page access control to Cerbos-driven, fine-grained page authorization. This ensures consistent authorization across both API endpoints and page routing.

---

## Phase 1: Foundation & Analysis (Days 1-2)

### 1.1 Page Inventory & Mapping
**Goal**: Document all pages and map to Cerbos resources

**Tasks**:
- [ ] Audit all frontend pages and categorize by access level
- [ ] Map pages to Cerbos resource types
- [ ] Define page actions (e.g., `view`, `access`, `navigate`)
- [ ] Document current access patterns (roles, conditions)

**Page Categories Identified**:
```
Public Pages:
- /login
- /complete-signup

Admin Pages:
- /admin/*
- /admin-permissions
- /admin-access-control
- /admin-roles
- /admin-security
- /admin-settings
- /admin-users
- /admin-workflows

Financial Pages:
- /financial-dashboard
- /financial-budgets
- /budget

Core Application Pages:
- /games
- /resources/*
- /notifications
- /settings/*

Demo Pages:
- /demo/*
- /theme-demo
```

**Deliverable**: `PAGE_INVENTORY.md` with complete mapping

---

## Phase 2: Cerbos Policy Design (Days 3-4)

### 2.1 Create Page Resource Policy
**Goal**: Define comprehensive page access policies in Cerbos

**File**: `cerbos/policies/page.yaml`

**Policy Structure**:
```yaml
---
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: "1.0"
  resource: "page"
  importDerivedRoles:
    - common_roles

  rules:
    # Public pages - accessible to all
    - actions: ['view', 'access']
      effect: EFFECT_ALLOW
      roles: ['*']
      condition:
        match:
          expr: request.resource.id in ['login', 'complete-signup']

    # Admin pages - super_admin and admin only
    - actions: ['view', 'access']
      effect: EFFECT_ALLOW
      roles: ['super_admin', 'admin']
      condition:
        match:
          expr: |
            request.resource.id.startsWith('admin') ||
            request.resource.id == 'admin-permissions' ||
            request.resource.id == 'admin-settings'

    # Financial pages - requires financial permissions
    - actions: ['view']
      effect: EFFECT_ALLOW
      derivedRoles: ['same_organization']
      condition:
        match:
          all:
            of:
              - expr: request.resource.id.startsWith('financial')
              - expr: "'financial:view' in request.principal.attr.permissions"

    # Games management - assignors and admins
    - actions: ['view', 'access']
      effect: EFFECT_ALLOW
      roles: ['super_admin', 'admin', 'assignor', 'assignment_manager']
      condition:
        match:
          expr: request.resource.id == 'games'

    # Resources - authenticated users
    - actions: ['view', 'access']
      effect: EFFECT_ALLOW
      derivedRoles: ['active_user']
      condition:
        match:
          expr: request.resource.id.startsWith('resources')
```

**Tasks**:
- [ ] Define all page resources
- [ ] Map roles to page access
- [ ] Add organization/region scoping where needed
- [ ] Define conditional access rules
- [ ] Add audit rules for sensitive pages

**Deliverable**: `cerbos/policies/page.yaml`

---

## Phase 3: Backend Integration (Days 5-7)

### 3.1 Page Permission API Endpoint
**Goal**: Create backend endpoint for page permission checks

**File**: `backend/src/routes/pages.ts`

```typescript
/**
 * POST /api/pages/check-access
 * Check if user can access a specific page
 */
router.post('/check-access', authenticateToken, async (req, res) => {
  const { pageId } = req.body;
  const user = req.user;

  const result = await cerbosService.checkPermission({
    principal: {
      id: user.id,
      roles: user.roles,
      attr: {
        organizationId: user.organizationId,
        regionIds: user.regionIds,
        permissions: user.permissions
      }
    },
    resource: {
      kind: 'page',
      id: pageId,
      attr: {}
    },
    action: 'view'
  });

  res.json({ allowed: result.allowed });
});

/**
 * GET /api/pages/permissions
 * Get all page permissions for current user
 */
router.get('/permissions', authenticateToken, async (req, res) => {
  const user = req.user;
  const pages = [
    'games', 'financial-dashboard', 'admin-settings',
    'resources', 'notifications', 'budget'
  ];

  const permissions = await cerbosService.batchCheckPermissions({
    principal: {
      id: user.id,
      roles: user.roles,
      attr: { /* user attrs */ }
    },
    resources: pages.map(page => ({
      resource: {
        kind: 'page',
        id: page,
        attr: {}
      },
      actions: ['view', 'access']
    }))
  });

  res.json({ permissions });
});
```

**Tasks**:
- [ ] Create `backend/src/routes/pages.ts`
- [ ] Implement single page check endpoint
- [ ] Implement batch page permissions endpoint
- [ ] Add caching for page permissions
- [ ] Add error handling and logging
- [ ] Write unit tests for endpoints

**Deliverable**: Working API endpoints with tests

---

## Phase 4: Frontend Permission Layer (Days 8-10)

### 4.1 Update AuthProvider
**Goal**: Integrate page permissions into auth context

**File**: `frontend/components/auth-provider.tsx`

**Changes**:
```typescript
interface AuthContextType {
  // ... existing fields
  pagePermissions: Map<string, { view: boolean; access: boolean }>;
  canAccessPage: (pageId: string) => boolean;
  refreshPagePermissions: () => Promise<void>;
}

// Add to AuthProvider component
const [pagePermissions, setPagePermissions] = useState<Map<string, any>>(new Map());

const fetchPagePermissions = async () => {
  const response = await apiClient.getPagePermissions();
  if (response.success) {
    const permMap = new Map();
    response.permissions.forEach(p => {
      permMap.set(p.resourceId, p.actions);
    });
    setPagePermissions(permMap);
  }
};

const canAccessPage = (pageId: string): boolean => {
  if (!isAuthenticated) return false;

  // Super Admin always has access
  if (hasRole('super_admin') || hasRole('admin')) return true;

  const perms = pagePermissions.get(pageId);
  return perms?.view || perms?.access || false;
};

// Fetch on login and token refresh
useEffect(() => {
  if (isAuthenticated && user) {
    fetchPagePermissions();
  }
}, [isAuthenticated, user]);
```

**Tasks**:
- [ ] Add page permissions state to AuthProvider
- [ ] Create `canAccessPage` function
- [ ] Fetch page permissions on login/refresh
- [ ] Add loading states for permission checks
- [ ] Update API client with page permission methods

**Deliverable**: Updated AuthProvider with page permission support

---

### 4.2 Create Page Access Hook
**Goal**: Reusable hook for page access checks

**File**: `frontend/hooks/usePageAccess.ts`

```typescript
import { useAuth } from '@/components/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function usePageAccess(pageId: string) {
  const { canAccessPage, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=' + pathname);
      return;
    }

    const checkAccess = async () => {
      const allowed = canAccessPage(pageId);
      setHasAccess(allowed);

      if (!allowed) {
        router.push('/unauthorized');
      }

      setIsChecking(false);
    };

    checkAccess();
  }, [pageId, isAuthenticated, pathname]);

  return { isChecking, hasAccess };
}
```

**Tasks**:
- [ ] Create `usePageAccess` hook
- [ ] Add redirect logic for unauthorized access
- [ ] Handle loading states
- [ ] Create unauthorized page component

**Deliverable**: `usePageAccess` hook

---

### 4.3 Page Access Wrapper Component
**Goal**: Declarative component for protecting pages

**File**: `frontend/components/page-access-guard.tsx`

```typescript
'use client'

import { usePageAccess } from '@/hooks/usePageAccess';
import { Loader2 } from 'lucide-react';

interface PageAccessGuardProps {
  pageId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PageAccessGuard({ pageId, children, fallback }: PageAccessGuardProps) {
  const { isChecking, hasAccess } = usePageAccess(pageId);

  if (isChecking) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Checking permissions...</span>
      </div>
    );
  }

  if (!hasAccess) {
    return null; // Hook already redirected
  }

  return <>{children}</>;
}
```

**Tasks**:
- [ ] Create `PageAccessGuard` component
- [ ] Add loading UI
- [ ] Handle edge cases
- [ ] Add error boundaries

**Deliverable**: Reusable page guard component

---

## Phase 5: Next.js Middleware (Days 11-12)

### 5.1 Route Protection Middleware
**Goal**: Server-side route protection before page render

**File**: `frontend/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/complete-signup'];
const ADMIN_ROUTES = ['/admin', '/admin-settings', '/admin-permissions'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check authentication
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For protected routes, verify with backend
  // This is a simplified example - real implementation would validate JWT
  // and check Cerbos permissions via API

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

**Tasks**:
- [ ] Create Next.js middleware
- [ ] Add JWT validation
- [ ] Implement page permission pre-check
- [ ] Add redirect logic
- [ ] Handle edge cases (API routes, static files)
- [ ] Add logging for blocked access

**Deliverable**: Working Next.js middleware

---

## Phase 6: Page Migration (Days 13-16)

### 6.1 Migrate Pages to Use Guards
**Goal**: Systematically protect all pages

**Order of Migration**:
1. Admin pages (highest security)
2. Financial pages
3. Games management
4. Resources
5. Settings & notifications

**Example Migration** (`/financial-dashboard/page.tsx`):
```typescript
'use client'

import { PageAccessGuard } from '@/components/page-access-guard';
import { FinancialDashboardContent } from './dashboard-content';

export default function FinancialDashboardPage() {
  return (
    <PageAccessGuard pageId="financial-dashboard">
      <FinancialDashboardContent />
    </PageAccessGuard>
  );
}
```

**Tasks per page type**:
- [ ] Wrap page content with `PageAccessGuard`
- [ ] Map page route to Cerbos page ID
- [ ] Test access with different user roles
- [ ] Verify redirects work correctly
- [ ] Update navigation to hide inaccessible pages

**Deliverable**: All pages protected with Cerbos-based access control

---

## Phase 7: Navigation & UI Updates (Days 17-18)

### 7.1 Update Navigation Components
**Goal**: Hide/show navigation items based on page permissions

**File**: `frontend/components/app-sidebar.tsx`

**Changes**:
```typescript
import { useAuth } from './auth-provider';

export function AppSidebar() {
  const { canAccessPage } = useAuth();

  return (
    <Sidebar>
      {canAccessPage('games') && (
        <SidebarItem href="/games" label="Games" />
      )}
      {canAccessPage('financial-dashboard') && (
        <SidebarItem href="/financial-dashboard" label="Finance" />
      )}
      {canAccessPage('admin-settings') && (
        <SidebarItem href="/admin-settings" label="Admin" />
      )}
    </Sidebar>
  );
}
```

**Tasks**:
- [ ] Update sidebar to check page permissions
- [ ] Update top navigation
- [ ] Update any breadcrumbs
- [ ] Add permission checks to dropdown menus
- [ ] Ensure UI reflects actual access

**Deliverable**: Navigation that reflects user permissions

---

## Phase 8: Testing & Validation (Days 19-21)

### 8.1 Unit Tests
- [ ] Test Cerbos page policy with various roles
- [ ] Test backend API endpoints
- [ ] Test AuthProvider page permission logic
- [ ] Test usePageAccess hook
- [ ] Test PageAccessGuard component

### 8.2 Integration Tests
- [ ] Test full authentication flow with page access
- [ ] Test permission refresh on role change
- [ ] Test middleware redirects
- [ ] Test navigation visibility

### 8.3 E2E Tests
- [ ] Test user journey for each role type
- [ ] Test unauthorized access attempts
- [ ] Test edge cases (expired tokens, role changes)

### 8.4 Security Testing
- [ ] Attempt to bypass page guards
- [ ] Test direct URL access
- [ ] Verify no permission leaks
- [ ] Check audit logs

**Deliverable**: Comprehensive test suite with >80% coverage

---

## Phase 9: Audit & Monitoring (Days 22-23)

### 9.1 Audit Logging
**Goal**: Track all page access attempts

**Tasks**:
- [ ] Add audit logs for successful page access
- [ ] Add audit logs for denied page access
- [ ] Include user, page, timestamp, IP
- [ ] Create dashboard for access monitoring

### 9.2 Performance Monitoring
- [ ] Measure page permission check latency
- [ ] Optimize caching strategy
- [ ] Monitor Cerbos service health
- [ ] Set up alerts for failures

**Deliverable**: Audit trail and monitoring dashboard

---

## Phase 10: Documentation & Rollout (Days 24-25)

### 10.1 Documentation
- [ ] Developer guide for adding new pages
- [ ] Admin guide for managing page policies
- [ ] API documentation
- [ ] Architecture diagrams

### 10.2 Rollout Strategy
1. **Staging Deployment** (Day 24)
   - Deploy to staging environment
   - Test with staging users
   - Verify all roles work correctly

2. **Production Deployment** (Day 25)
   - Feature flag: Start with Cerbos checks alongside role checks
   - Monitor for discrepancies
   - Gradually shift to Cerbos-only
   - Full rollout

**Deliverable**: Complete documentation and successful production deployment

---

## Rollback Plan

If issues are discovered:
1. Disable Next.js middleware (revert to no server-side checks)
2. Remove PageAccessGuard from pages
3. Fall back to role-based checks in AuthProvider
4. Investigate and fix Cerbos policies
5. Re-deploy with fixes

---

## Success Criteria

✅ All pages protected by Cerbos policies
✅ No unauthorized access possible
✅ Navigation reflects user permissions accurately
✅ Page permission checks < 50ms
✅ Comprehensive audit trail
✅ Zero security vulnerabilities
✅ >80% test coverage
✅ Complete documentation

---

## Resource Requirements

- **Development**: 2 senior developers (25 days)
- **QA**: 1 QA engineer (5 days for phases 8-9)
- **DevOps**: Support for deployment (Days 24-25)
- **Cerbos Service**: Ensure capacity for page permission checks
- **Monitoring**: Set up dashboards and alerts

---

## Timeline Summary

| Phase | Duration | Description |
|-------|----------|-------------|
| 1 | Days 1-2 | Foundation & page inventory |
| 2 | Days 3-4 | Cerbos policy design |
| 3 | Days 5-7 | Backend API integration |
| 4 | Days 8-10 | Frontend permission layer |
| 5 | Days 11-12 | Next.js middleware |
| 6 | Days 13-16 | Page migration |
| 7 | Days 17-18 | Navigation updates |
| 8 | Days 19-21 | Testing & validation |
| 9 | Days 22-23 | Audit & monitoring |
| 10 | Days 24-25 | Documentation & rollout |

**Total Duration**: ~5 weeks (25 working days)
