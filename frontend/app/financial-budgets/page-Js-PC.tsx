'use client'

import { PageAccessGuard } from '@/components/page-access-guard'
import { BudgetTracker } from '@/components/budget-tracker'

export default function FinancialBudgetsPage() {
  return (
    <PageAccessGuard pageId="financial_budgets">
      <div className="container mx-auto p-6">
        <BudgetTracker />
      </div>
    </PageAccessGuard>
  )
}