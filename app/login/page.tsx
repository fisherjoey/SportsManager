'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/components/auth-provider'
import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If already authenticated, redirect to homepage
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p>Redirecting...</p>
      </div>
    </div>
  )
}