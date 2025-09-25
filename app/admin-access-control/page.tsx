'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminAccessControlPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the main dashboard with the admin-access-control view
    router.replace('/?view=admin-access-control')
  }, [router])

  return null
}