'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminUsersPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the main dashboard with the admin-users view
    router.replace('/?view=admin-users')
  }, [router])

  return null
}