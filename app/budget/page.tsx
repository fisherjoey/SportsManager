'use client'

import { useAuth } from '@/components/auth-provider'
import { LoginForm } from '@/components/login-form'
import { BudgetTracker } from '@/components/budget-tracker'

export default function BudgetPage() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return (
    <div className="container mx-auto p-6" data-testid="budget">
      <BudgetTracker />
    </div>
  )
}