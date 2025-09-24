'use client'

import { RolePageAccessManager } from '@/components/admin/rbac/RolePageAccessManager'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function PageAccessManagementPage() {
  return (
    <ProtectedRoute requiredPermissions={['roles.manage']}>
      <RolePageAccessManager />
    </ProtectedRoute>
  )
}