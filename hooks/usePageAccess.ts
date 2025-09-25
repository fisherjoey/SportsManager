/**
 * @fileoverview Page Access Hook
 * 
 * Hook for checking page access from the database
 * Replaces hardcoded permission checks with database-driven access control
 */

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'

export function usePageAccess() {
  const { user } = useAuth()
  const [accessiblePages, setAccessiblePages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setAccessiblePages([])
      setLoading(false)
      return
    }

    // Fetch accessible pages from database
    const fetchAccessiblePages = async () => {
      try {
        const response = await apiClient.getMyAccessiblePages()
        if (response.success && response.data) {
          const pagePaths = response.data.map(p => p.page_path)
          setAccessiblePages(pagePaths)
        }
      } catch (error) {
        console.error('Failed to fetch accessible pages:', error)
        setAccessiblePages([])
      } finally {
        setLoading(false)
      }
    }

    fetchAccessiblePages()
  }, [user])

  const hasPageAccess = (pagePath: string): boolean => {
    // During loading, allow access to prevent flashing
    if (loading) return true
    
    // Check if page is in accessible pages list
    return accessiblePages.includes(pagePath)
  }

  const checkPageAccess = async (pagePath: string): Promise<boolean> => {
    try {
      const response = await apiClient.checkPageAccess(pagePath)
      return response.hasAccess || false
    } catch (error) {
      console.error('Failed to check page access:', error)
      return false
    }
  }

  return {
    accessiblePages,
    hasPageAccess,
    checkPageAccess,
    loading
  }
}