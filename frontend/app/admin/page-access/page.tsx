'use client'

import { PageAccessGuard } from '@/components/page-access-guard'
import { RolePageAccessManager } from '@/components/admin/rbac/RolePageAccessManager'

export default function PageAccessManagementPage() {
  return (
    <PageAccessGuard pageId="admin_page_access">
      <RolePageAccessManager />
    </PageAccessGuard>
  )
}