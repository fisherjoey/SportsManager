'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPermissionsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the main dashboard with the admin-permissions view
    router.replace('/?view=admin-permissions')
  }, [router])

  return null
}