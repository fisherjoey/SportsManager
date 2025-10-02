# Page Access Control - Quick Reference

## Quick Start

### Protect an Entire Page

```typescript
import { PageAccessGuard } from '@/components/page-access-guard'

export default function MyProtectedPage() {
  return (
    <PageAccessGuard pageId="my-page">
      {/* Your page content */}
    </PageAccessGuard>
  )
}
```

### Protect a Section

```typescript
import { PageSectionGuard } from '@/components/page-access-guard'

export default function MyPage() {
  return (
    <div>
      <h1>Public Content</h1>

      <PageSectionGuard pageId="admin-section">
        <AdminOnlyContent />
      </PageSectionGuard>
    </div>
  )
}
```

### Conditional Rendering

```typescript
import { usePageAccessCheck } from '@/hooks/usePageAccess'

function Navigation() {
  const canViewAdmin = usePageAccessCheck('admin/dashboard')

  return (
    <nav>
      {canViewAdmin && <Link href="/admin">Admin</Link>}
    </nav>
  )
}
```

### Custom Loading State

```typescript
import { usePageAccess } from '@/hooks/usePageAccess'

export default function MyPage() {
  const { isChecking, hasAccess } = usePageAccess('my-page')

  if (isChecking) return <MyCustomLoader />
  if (!hasAccess) return null

  return <div>Protected Content</div>
}
```

## API Reference

### Components

#### PageAccessGuard

```typescript
<PageAccessGuard
  pageId="string"                    // Required: page ID or path
  fallback={<React.ReactNode>}       // Optional: custom loading component
  redirectToLogin={boolean}          // Optional: redirect if not auth (default: true)
  redirectToUnauthorized={boolean}   // Optional: redirect if no access (default: true)
>
  {children}
</PageAccessGuard>
```

#### PageSectionGuard

```typescript
<PageSectionGuard
  pageId="string"                    // Required: page ID or path
  fallback={<React.ReactNode>}       // Optional: loading component
>
  {children}
</PageSectionGuard>
```

### Hooks

#### usePageAccess

```typescript
const { isChecking, hasAccess } = usePageAccess(
  'page-id',
  {
    redirectToLogin: true,           // Optional
    redirectToUnauthorized: true     // Optional
  }
)
```

#### usePageAccessCheck

```typescript
const hasAccess = usePageAccessCheck('page-id')
```

### AuthProvider Methods

```typescript
import { useAuth } from '@/components/auth-provider'

function MyComponent() {
  const {
    canAccessPage,           // (pageId: string) => boolean
    refreshPagePermissions,  // () => Promise<void>
    pagePermissions         // Map<string, { view: boolean, access: boolean }>
  } = useAuth()
}
```

## Common Patterns

### Pattern 1: Protect Admin Page

```typescript
// app/admin/users/page.tsx
import { PageAccessGuard } from '@/components/page-access-guard'

export default function AdminUsersPage() {
  return (
    <PageAccessGuard pageId="admin/users">
      <AdminUsersContent />
    </PageAccessGuard>
  )
}
```

### Pattern 2: Show/Hide Menu Items

```typescript
// components/sidebar.tsx
import { usePageAccessCheck } from '@/hooks/usePageAccess'

export function Sidebar() {
  const canViewUsers = usePageAccessCheck('admin/users')
  const canViewSettings = usePageAccessCheck('admin/settings')

  return (
    <nav>
      {canViewUsers && (
        <SidebarItem href="/admin/users" label="Users" />
      )}
      {canViewSettings && (
        <SidebarItem href="/admin/settings" label="Settings" />
      )}
    </nav>
  )
}
```

### Pattern 3: Multiple Protected Sections

```typescript
// app/dashboard/page.tsx
import { PageSectionGuard } from '@/components/page-access-guard'

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <PageSectionGuard pageId="analytics">
        <AnalyticsPanel />
      </PageSectionGuard>

      <PageSectionGuard pageId="reports">
        <ReportsPanel />
      </PageSectionGuard>

      <PageSectionGuard pageId="admin-controls">
        <AdminControls />
      </PageSectionGuard>
    </div>
  )
}
```

### Pattern 4: Custom Access Logic

```typescript
// app/settings/page.tsx
import { usePageAccess } from '@/hooks/usePageAccess'
import { useAuth } from '@/components/auth-provider'

export default function SettingsPage() {
  const { user, canAccessPage } = useAuth()
  const { isChecking } = usePageAccess('settings')

  // Custom logic combining multiple checks
  const canEditAdvanced = canAccessPage('settings/advanced') || user?.role === 'admin'

  if (isChecking) return <Loader />

  return (
    <div>
      <BasicSettings />
      {canEditAdvanced && <AdvancedSettings />}
    </div>
  )
}
```

### Pattern 5: Programmatic Permission Check

```typescript
// components/delete-button.tsx
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'

export function DeleteUserButton({ userId }) {
  const { canAccessPage } = useAuth()
  const canDelete = canAccessPage('admin/users/delete')

  if (!canDelete) return null

  return (
    <Button onClick={() => handleDelete(userId)}>
      Delete User
    </Button>
  )
}
```

## Page ID Naming Convention

Use consistent naming for page IDs:

```
Format: category/subcategory/action

Examples:
  admin/users              - User management page
  admin/users/create       - Create user page
  admin/settings           - Settings page
  reports/analytics        - Analytics reports
  profile/edit             - Edit profile page
  games/schedule           - Game schedule page
```

## Admin Bypass

Super Admin and Admin roles automatically have access to all pages:

```typescript
// These roles bypass all permission checks:
- 'Super Admin'
- 'admin'
- 'Admin'
```

## Redirect Behavior

### Default Behavior

- Not authenticated → Redirects to `/login`
- Authenticated but no access → Redirects to `/unauthorized`

### Disable Redirects

```typescript
// No redirects, just returns false
const hasAccess = usePageAccessCheck('page-id')

// Or with usePageAccess
const { hasAccess } = usePageAccess('page-id', {
  redirectToLogin: false,
  redirectToUnauthorized: false
})
```

## Post-Login Redirect

Users are automatically redirected to their intended page after login:

```typescript
// Automatically handled by usePageAccess hook
// Stores path in sessionStorage: 'redirect_after_login'
```

## Refreshing Permissions

```typescript
import { useAuth } from '@/components/auth-provider'

function SettingsPanel() {
  const { refreshPagePermissions } = useAuth()

  const handleRoleChange = async () => {
    await updateUserRole()
    await refreshPagePermissions() // Refresh after role change
  }

  return <RoleSelector onChange={handleRoleChange} />
}
```

## TypeScript Types

```typescript
// Page Permission
interface PagePermission {
  page_id: string
  page_path: string
  page_name: string
  page_category: string
  view: boolean
  access: boolean
}

// API Responses
interface PagePermissionsResponse {
  success: boolean
  permissions: PagePermission[]
  message?: string
}

interface PageAccessCheckResponse {
  allowed: boolean
  message?: string
}

// Hook Return Types
interface UsePageAccessReturn {
  isChecking: boolean
  hasAccess: boolean
}
```

## Common Issues

### Issue: Permissions not loading
**Solution:** Check that backend endpoint returns correct format:
```typescript
{
  "success": true,
  "permissions": [{ page_id, page_path, view, access, ... }]
}
```

### Issue: Infinite redirect loop
**Solution:** Make sure `/unauthorized` and `/login` pages are not protected

### Issue: Flashing content
**Solution:** Always show loading state:
```typescript
if (isChecking) return <Loader />
```

### Issue: Permissions not updating after role change
**Solution:** Call refreshPagePermissions:
```typescript
await refreshPagePermissions()
```

## Best Practices

1. **Always protect sensitive pages** with PageAccessGuard
2. **Use PageSectionGuard** for granular control within pages
3. **Show loading states** to prevent content flashing
4. **Hide navigation items** user can't access
5. **Refresh permissions** after role/permission changes
6. **Use consistent page IDs** across the application
7. **Test with different roles** to verify access control
8. **Remember:** Client-side checks are UI guards only - always enforce on server

## Examples in Codebase

Check these files for working examples:

- `frontend/components/page-access-guard.tsx` - Component implementation
- `frontend/hooks/usePageAccess.ts` - Hook implementation
- `frontend/app/unauthorized/page.tsx` - Unauthorized page
- `frontend/components/auth-provider.tsx` - Permission management

## Support

For issues or questions:
1. Check the full documentation: `docs/PHASE_4_PAGE_ACCESS_CONTROL.md`
2. Review backend integration: Phase 3 documentation
3. Contact the development team
