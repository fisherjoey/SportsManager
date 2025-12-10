'use client'

import { PageAccessGuard } from '@/components/page-access-guard'
import { useAuth } from '@/components/auth-provider'
import { LoginForm } from '@/components/login-form'
import { ExpenseApprovalDashboard } from '@/components/expense-approval-dashboard'

function ExpenseApprovalsPageContent() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return (
    <div className="container mx-auto p-6">
      <ExpenseApprovalDashboard />
    </div>
  )
}

export default function ExpenseApprovalsPage() {
  return (
    <PageAccessGuard pageId="expense_approvals">
      <ExpenseApprovalsPageContent />
    </PageAccessGuard>
  )
}
