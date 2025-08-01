"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DebugPage() {
  const [authStatus, setAuthStatus] = useState('checking...')
  const [currentUser, setCurrentUser] = useState(null)
  const [apiStatus, setApiStatus] = useState('checking...')

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token') // Changed from 'token' to 'auth_token'
        const allTokens = {
          'token': localStorage.getItem('token'),
          'auth_token': localStorage.getItem('auth_token'),
          'authToken': localStorage.getItem('authToken'),
        }
        
        if (token) {
          setAuthStatus(`✅ Token found: ${token.substring(0, 30)}...`)
          
          // Try to validate token with API
          try {
            const response = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            if (response.ok) {
              const userData = await response.json()
              setCurrentUser(userData)
              setAuthStatus(prev => prev + ` | User: ${userData.email || userData.name || 'Unknown'}`)
            } else {
              setAuthStatus(prev => prev + ` | ❌ Token validation failed: ${response.status}`)
            }
          } catch (err) {
            setAuthStatus(prev => prev + ` | ❌ Validation error: ${err.message}`)
          }
        } else {
          setAuthStatus(`❌ No 'auth_token' found. All tokens: ${JSON.stringify(allTokens, null, 2)}`)
        }
      } catch (error) {
        setAuthStatus(`Auth error: ${error.message}`)
      }
    }

    // Check API status
    const checkAPI = async () => {
      try {
        const response = await fetch('/api/health')
        const data = await response.json()
        setApiStatus(`API working: ${JSON.stringify(data)}`)
      } catch (error) {
        setApiStatus(`API error: ${error.message}`)
      }
    }

    checkAuth()
    checkAPI()
  }, [])

  const testPages = [
    { name: 'Home', path: '/' },
    { name: 'Login', path: '/login' },
    { name: 'Expenses', path: '/expenses' },
    { name: 'Expense Approvals', path: '/expense-approvals' },
    { name: 'Budget', path: '/budget' },
    { name: 'Games', path: '/games' },
  ]

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">🔍 Frontend Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm bg-gray-100 p-3 rounded">{authStatus}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm bg-gray-100 p-3 rounded">{apiStatus}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Page Navigation Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {testPages.map((page) => (
              <Link key={page.path} href={page.path}>
                <Button variant="outline" className="w-full">
                  {page.name}
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Browser Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
            <p><strong>User Agent:</strong> {typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</p>
            <p><strong>Local Storage:</strong> {typeof localStorage !== 'undefined' ? Object.keys(localStorage).join(', ') : 'N/A'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}