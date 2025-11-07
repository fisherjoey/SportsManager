# Phase 4: Frontend Page Access Control Implementation

## Overview

This document describes the implementation of Phase 4 of the Cerbos page access control system, which extends the frontend authentication system with comprehensive page-level permissions.

## Implementation Summary

Phase 4 successfully implements a complete frontend permission infrastructure that:

1. Fetches and caches page permissions from the backend
2. Provides React hooks for permission checking
3. Offers guard components for protecting pages and sections
4. Handles authentication and authorization redirects gracefully
5. Integrates seamlessly with the existing AuthProvider

## Files Modified/Created

### 1. Type Definitions
**File:** `frontend/lib/types.ts`

Added new type definitions for page permissions:

```typescript
export interface PagePermission {
  page_id: string
  page_path: string
  page_name: string
  page_category: string
  view: boolean
  access: boolean
}

export interface PagePermissionsResponse {
  success: boolean
  permissions: PagePermission[]
  message?: string
}

export interface PageAccessCheckResponse {
  allowed: boolean
  message?: string
}
```

### 2. API Client Updates
**File:** `frontend/lib/api.ts`

Added methods for page permission management:

```typescript
// Fetch all page permissions for current user
async getPagePermissions(): Promise<PagePermissionsResponse>

// Check access for a specific page (updated signature)
async checkPageAccess(pageId: string): Promise<PageAccessCheckResponse>
```

**Key Changes:**
- Added import for new permission types
- Implemented `getPagePermissions()` method to fetch user's page permissions
- Updated `checkPageAccess()` to use proper TypeScript types

### 3. AuthProvider Enhancement
**File:** `frontend/components/auth-provider.tsx`

Extended the authentication context with page permission management:

**New State:**
```typescript
const [pagePermissions, setPagePermissions] = useState<
  Map<string, { view: boolean, access: boolean }>
>(new Map())
```

**New Methods:**
- `canAccessPage(pageId: string): boolean` - Check if user can access a specific page
- `refreshPagePermissions(): Promise<void>` - Refresh page permissions from server
- `fetchPagePermissions()` - Internal helper to fetch and cache permissions

**Key Features:**
- Super Admin and Admin roles bypass all page restrictions
- Page permissions are fetched on login and token refresh
- Permissions are stored in a Map for O(1) lookup performance
- Both page_id and page_path are indexed for flexible lookups
- Permissions are cleared on logout for security

**Integration Points:**
- Permissions fetched in parallel with user permissions on login
- Permissions fetched on initial mount if token exists
- Properly cleared on logout

### 4. Page Access Hook
**File:** `frontend/hooks/usePageAccess.ts`

Complete rewrite to integrate with AuthProvider:

**Primary Hook:**
```typescript
usePageAccess(pageId: string, options?: UsePageAccessOptions): UsePageAccessReturn
```

**Features:**
- Automatic redirect to `/login` if not authenticated
- Automatic redirect to `/unauthorized` if no access
- Stores intended destination for post-login redirect
- Loading state management to prevent flashing
- Configurable redirect behavior
- Re-checks permissions when they change

**Secondary Hook:**
```typescript
usePageAccessCheck(pageId: string): boolean
```

**Features:**
- Lightweight permission check without redirects
- Useful for conditional rendering
- Direct integration with AuthProvider

### 5. PageAccessGuard Component
**File:** `frontend/components/page-access-guard.tsx` (New)

React component for protecting page content:

**Main Component:**
```typescript
<PageAccessGuard
  pageId="admin/users"
  fallback={<CustomLoader />}
  redirectToLogin={true}
  redirectToUnauthorized={true}
>
  {/* Protected content */}
</PageAccessGuard>
```

**Features:**
- Default loading spinner while checking permissions
- Custom fallback component support
- Automatic redirects for unauthorized access
- Renders null if no access (when redirects disabled)

**Section Guard Component:**
```typescript
<PageSectionGuard pageId="admin/analytics">
  {/* Protected section */}
</PageSectionGuard>
```

**Features:**
- Lighter version for protecting page sections
- No redirects (silent failure)
- Optional loading fallback

### 6. Unauthorized Page
**File:** `frontend/app/unauthorized/page.tsx` (New)

Professional unauthorized access page with:

- Clear visual indication of access denial (ShieldAlert icon)
- User-friendly explanation of what happened
- Display of current user information
- Suggested next actions
- Multiple navigation options:
  - Go back to previous page
  - Return to home page
  - Contact support via email
- Responsive design matching app theme
- Automatic redirect to login if not authenticated

## Usage Examples

### Protecting an Entire Page

```typescript
// app/admin/users/page.tsx
'use client'

import { PageAccessGuard } from '@/components/page-access-guard'
import { UserManagementTable } from '@/components/user-management-table'

export default function AdminUsersPage() {
  return (
    <PageAccessGuard pageId="admin/users">
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">User Management</h1>
        <UserManagementTable />
      </div>
    </PageAccessGuard>
  )
}
```

### Using the Hook for Custom Logic

```typescript
// app/dashboard/page.tsx
'use client'

import { usePageAccess } from '@/hooks/usePageAccess'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { isChecking, hasAccess } = usePageAccess('dashboard')

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!hasAccess) {
    return null // Will redirect automatically
  }

  return (
    <div className="container py-8">
      <h1>Dashboard</h1>
      {/* Dashboard content */}
    </div>
  )
}
```

### Conditional Rendering Based on Permissions

```typescript
// components/navigation.tsx
'use client'

import { usePageAccessCheck } from '@/hooks/usePageAccess'
import Link from 'next/link'

export function Navigation() {
  const canViewAdmin = usePageAccessCheck('admin/dashboard')
  const canViewReports = usePageAccessCheck('reports')

  return (
    <nav>
      <Link href="/">Home</Link>
      {canViewReports && <Link href="/reports">Reports</Link>}
      {canViewAdmin && <Link href="/admin">Admin</Link>}
    </nav>
  )
}
```

### Protecting a Section Within a Page

```typescript
// app/profile/page.tsx
'use client'

import { PageSectionGuard } from '@/components/page-access-guard'

export default function ProfilePage() {
  return (
    <div className="container py-8">
      <h1>My Profile</h1>

      {/* Always visible */}
      <section>
        <h2>Basic Information</h2>
        <ProfileForm />
      </section>

      {/* Only visible if user has access */}
      <PageSectionGuard pageId="profile/advanced-settings">
        <section>
          <h2>Advanced Settings</h2>
          <AdvancedSettingsForm />
        </section>
      </PageSectionGuard>
    </div>
  )
}
```

## Permission Flow

### 1. Initial Load
```
User visits app
  ↓
AuthProvider checks localStorage for token
  ↓
If token exists:
  - Fetch user profile
  - Fetch user permissions (parallel)
  - Fetch page permissions (parallel)
  ↓
Store permissions in AuthContext
  ↓
Page components can check access
```

### 2. Login Flow
```
User submits login form
  ↓
API returns user + token
  ↓
AuthProvider:
  - Stores token
  - Sets user
  - Fetches permissions (parallel)
  - Fetches page permissions (parallel)
  ↓
Redirect to intended page (from sessionStorage)
```

### 3. Page Access Check
```
Component uses usePageAccess or PageAccessGuard
  ↓
Check isAuthenticated
  ↓
If not authenticated → redirect to /login
  ↓
If authenticated:
  - Check if Super Admin/Admin (always allow)
  - Check pagePermissions Map
  ↓
If no access → redirect to /unauthorized
If has access → render content
```

### 4. Logout Flow
```
User clicks logout
  ↓
AuthProvider:
  - Removes token from localStorage
  - Clears user state
  - Clears permissions array
  - Clears pagePermissions Map
  ↓
Redirect to login
```

## Performance Optimizations

1. **Parallel Fetching:** User permissions and page permissions are fetched in parallel to minimize load time
2. **Map-based Storage:** Uses JavaScript Map for O(1) permission lookups
3. **Dual Indexing:** Permissions indexed by both page_id and page_path
4. **Memoization:** All AuthProvider methods use useCallback for stable references
5. **Lazy Loading:** Permissions only fetched when user is authenticated
6. **Local Caching:** Permissions cached in AuthProvider state, avoiding repeated API calls

## Security Considerations

1. **Token Validation:** Token verified on mount and refreshed as needed
2. **Permission Clearing:** All permissions cleared on logout
3. **Admin Bypass:** Super Admin and Admin roles always have access (implemented at multiple levels)
4. **Redirect Storage:** Uses sessionStorage (not localStorage) for post-login redirects
5. **Default Deny:** Access denied by default if permission not found
6. **Client-Side Only:** All checks are client-side UI guards (server must also enforce)

## Admin Role Handling

Super Admin and Admin users have special treatment:

```typescript
// Always returns true for admins
const canAccessPage = (pageId: string): boolean => {
  if (!user || !isAuthenticated) return false

  const userRoles = user.roles || []
  if (userRoles.includes('Super Admin') ||
      userRoles.includes('admin') ||
      userRoles.includes('Admin')) {
    return true
  }

  const permission = pagePermissions.get(pageId)
  return permission?.access ?? false
}
```

This ensures administrators can access all pages regardless of permission settings.

## Error Handling

1. **Failed Permission Fetch:** Logs warning, sets empty permissions (default deny)
2. **Network Errors:** Gracefully degrades, shows loading state
3. **Invalid Tokens:** Clears auth state, redirects to login
4. **Missing Permissions:** Treats as no access (default deny)

## Testing Considerations

When testing pages with access control:

1. **Mock AuthProvider:** Provide test values for permissions
2. **Test All Roles:** Verify behavior for different user roles
3. **Test Loading States:** Ensure loading spinners appear correctly
4. **Test Redirects:** Verify proper redirect behavior
5. **Test Admin Bypass:** Confirm admins can access all pages

Example test setup:
```typescript
import { AuthProvider } from '@/components/auth-provider'

function TestWrapper({ children, user, pagePermissions }) {
  return (
    <AuthProvider
      initialUser={user}
      initialPagePermissions={pagePermissions}
    >
      {children}
    </AuthProvider>
  )
}
```

## Next Steps

To use this implementation:

1. **Backend Setup:** Ensure backend endpoints are implemented:
   - `GET /admin/access/page-permissions` - Returns user's page permissions
   - `POST /admin/access/check-page` - Checks single page access

2. **Page Registration:** Register all pages in the database with:
   - Unique page_id
   - URL path (page_path)
   - Descriptive name (page_name)
   - Category (page_category)

3. **Role Configuration:** Configure which roles can access which pages

4. **Apply Guards:** Add PageAccessGuard to protected pages

5. **Update Navigation:** Use usePageAccessCheck to conditionally show nav items

6. **Test Thoroughly:** Test all permission scenarios

## API Endpoints Required

The frontend expects these backend endpoints:

### GET /admin/access/page-permissions
Returns all page permissions for the current user.

**Response:**
```json
{
  "success": true,
  "permissions": [
    {
      "page_id": "admin_users",
      "page_path": "admin/users",
      "page_name": "User Management",
      "page_category": "Administration",
      "view": true,
      "access": true
    }
  ]
}
```

### POST /admin/access/check-page
Checks if user has access to a specific page.

**Request:**
```json
{
  "pageId": "admin/users"
}
```

**Response:**
```json
{
  "allowed": true
}
```

## Troubleshooting

### Permissions Not Loading
- Check browser console for API errors
- Verify token is valid and stored
- Confirm backend endpoints are accessible
- Check network tab for failed requests

### Infinite Redirects
- Verify unauthorized page itself isn't protected
- Check that login page is accessible without auth
- Ensure admin roles are properly detected

### Permissions Not Updating
- Call `refreshPagePermissions()` after role changes
- Check that permissions are being fetched on login
- Verify Map is being updated correctly

### Flashing Content
- Ensure loading states are shown during checks
- Increase delay in usePageAccess if needed
- Use PageAccessGuard instead of manual checks

## Summary

Phase 4 successfully implements a complete, production-ready page access control system for the frontend. The implementation:

- ✅ Extends AuthProvider with page permission state and methods
- ✅ Provides type-safe API client methods
- ✅ Offers flexible React hooks for permission checking
- ✅ Includes reusable guard components
- ✅ Handles loading and error states gracefully
- ✅ Supports automatic redirects for unauthorized access
- ✅ Provides a professional unauthorized access page
- ✅ Optimizes performance with caching and parallel fetching
- ✅ Maintains security with proper permission clearing
- ✅ Supports admin role bypass at multiple levels

The system is ready for integration with the backend Cerbos implementation and can be immediately used to protect pages and sections throughout the application.
