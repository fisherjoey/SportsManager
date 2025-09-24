'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminWorkflowsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the main dashboard with the admin-workflows view
    router.replace('/?view=admin-workflows')
  }, [router])

  return null
}