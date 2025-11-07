'use client'

import { PageAccessGuard } from '@/components/page-access-guard'
import { BudgetTracker } from '@/components/budget-tracker'

export default function BudgetPage() {
  return (
    <PageAccessGuard pageId="budget">
      <div className="container mx-auto p-6" data-testid="budget">
        <BudgetTracker />
      </div>
    </PageAccessGuard>
  )
}