'use client'

import { PageAccessGuard } from '@/components/page-access-guard'
import { PermissionManagementDashboard } from '@/components/admin/rbac/PermissionManagementDashboard'

export default function PermissionsPage() {
  return (
    <PageAccessGuard pageId="admin_permissions">
      <PermissionManagementDashboard />
    </PageAccessGuard>
  )
}