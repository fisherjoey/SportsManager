'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminSecurityPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the main dashboard with the admin-security view
    router.replace('/?view=admin-security')
  }, [router])

  return null
}