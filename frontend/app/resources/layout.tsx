import type { Metadata } from 'next'

import { ProtectedRoute } from '@/components/protected-route'

export const metadata: Metadata = {
  title: 'Resource Centre - CBOA',
  description: 'Calgary Basketball Officials Association Resource Centre'
}

export default function ResourceLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute allowedRoles={['admin', 'referee']}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
    </ProtectedRoute>
  )
}
