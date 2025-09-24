'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminSettingsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the main dashboard with the admin-settings view
    router.replace('/?view=admin-settings')
  }, [router])

  return null
}