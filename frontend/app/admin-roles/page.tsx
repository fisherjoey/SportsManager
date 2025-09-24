'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminRolesPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the main dashboard with the admin-roles view
    router.replace('/?view=admin-roles')
  }, [router])

  return null
}