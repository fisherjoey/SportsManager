/**
 * @fileoverview Permissions Provider Component for Clerk Integration
 *
 * This module provides permissions context and functionality for the entire application.
 * It integrates with Clerk for authentication and manages user permissions, roles, and
 * organization membership. The provider wraps the application and makes permissions state
 * available to all components.
 *
 * @module components/PermissionsProvider
 */

'use client'

import type React from 'react'
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth, useClerk } from '@clerk/nextjs'

import { apiClient, type User, type Permission } from '@/lib/api'
import type { PagePermission } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import PermissionUtils from '@/lib/permissions'
import { canAccessPage as checkPageAccess, PAGE_TO_PERMISSIONS } from '@/lib/page-permissions'

/**
 * Organization type definition
 */
export interface Organization {
  id: string
  name: string
  slug?: string
  role?: string
}

/**
 * Type definition for the Permissions Context
 *
 * @typedef {Object} PermissionsContextType
 * @property {User | null} user - Current authenticated user object or null if not authenticated
 * @property {Permission[]} permissions - Array of user permissions from RBAC system
 * @property {Map<string, { view: boolean, access: boolean }>} pagePermissions - Map of page permissions by page ID
 * @property {Organization[]} organizations - List of organizations the user belongs to
 * @property {Organization | null} currentOrganization - Currently active organization
 * @property {boolean} isLoading - Loading state for authentication and permissions
 * @property {Function} setCurrentOrganization - Function to set the active organization
 * @property {Function} hasRole - Function to check if user has a specific role
 * @property {Function} hasAnyRole - Function to check if user has any of the specified roles
 * @property {Function} hasPermission - Function to check if user has a specific permission
 * @property {Function} hasAnyPermission - Function to check if user has any of the specified permissions
 * @property {Function} hasAllPermissions - Function to check if user has all of the specified permissions
 * @property {Function} refreshPermissions - Function to refresh user permissions from server
 * @property {Function} canAccessPage - Function to check if user can access a specific page
 * @property {Function} updateProfile - Function to update user profile information
 */
interface PermissionsContextType {
  user: User | null
  permissions: Permission[]
  pagePermissions: Map<string, { view: boolean, access: boolean }>
  organizations: Organization[]
  currentOrganization: Organization | null
  isLoading: boolean
  setCurrentOrganization: (orgId: string) => void
  updateProfile: (updates: Partial<User>) => Promise<void>
  hasRole: (role: string) => boolean
  hasAnyRole: (...roles: string[]) => boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  refreshPermissions: () => Promise<void>
  canAccessPage: (pageId: string) => boolean
}

const PermissionsContext = createContext<PermissionsContextType | null>(null)

/**
 * Permissions Provider Component
 *
 * Provides permissions context to the entire application. Integrates with Clerk for
 * authentication and manages user permissions, roles, and organization membership.
 * Should wrap the root of the application.
 *
 * @component
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Child components to provide permissions context to
 * @returns {JSX.Element} Provider component that wraps children with permissions context
 *
 * @example
 * ```tsx
 * <PermissionsProvider>
 *   <App />
 * </PermissionsProvider>
 * ```
 */
export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const { isSignedIn, userId: clerkUserId, getToken } = useAuth()
  const { signOut } = useClerk()

  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [pagePermissions, setPagePermissions] = useState<Map<string, { view: boolean, access: boolean }>>(new Map())
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Configure apiClient with Clerk's getToken function
  useEffect(() => {
    if (getToken) {
      apiClient.setTokenProvider(getToken)
    }
  }, [getToken])

  // Helper function to fetch and set user permissions
  const fetchUserPermissions = useCallback(async (userId: string): Promise<Permission[]> => {
    try {
      const response = await apiClient.refreshUserPermissions()
      if (response.success && response.permissions) {
        setPermissions(response.permissions)
        return response.permissions
      }
      return []
    } catch (error) {
      console.warn('Failed to fetch user permissions:', error)
      return []
    }
  }, [])

  // Helper function to fetch and set page permissions
  const fetchPagePermissions = useCallback(async (): Promise<void> => {
    try {
      const response = await apiClient.getPagePermissions()
      if (response.success && response.permissions) {
        const permissionsMap = new Map<string, { view: boolean, access: boolean }>()
        response.permissions.forEach((perm: PagePermission) => {
          permissionsMap.set(perm.page_id, {
            view: perm.view,
            access: perm.access
          })
          // Also index by page_path for convenience
          permissionsMap.set(perm.page_path, {
            view: perm.view,
            access: perm.access
          })
        })
        setPagePermissions(permissionsMap)
      }
    } catch (error) {
      console.warn('Failed to fetch page permissions:', error)
      setPagePermissions(new Map())
    }
  }, [])

  // Helper function to sync user with backend
  const syncUserWithBackend = useCallback(async (clerkUserId: string) => {
    try {
      setIsLoading(true)

      // Get the Clerk session token to authenticate with the backend
      const token = await getToken()

      if (!token) {
        throw new Error('No authentication token available')
      }

      // Determine the backend API URL
      const apiUrl = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? '/api/auth/sync-user'  // Use Next.js proxy for localhost
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/sync-user`

      // Call backend to sync/create user and get local user data
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ clerkUserId }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[PermissionsProvider] Sync user failed:', response.status, errorText)
        throw new Error('Failed to sync user with backend')
      }

      const data = await response.json()

      // Handle both response formats: { success, data: { user } } and { success, user }
      const userData = data.data?.user || data.user
      const orgsData = data.data?.user?.organizations || data.data?.organizations || data.organizations

      if (data.success && userData) {
        setUser(userData)

        // Set organizations if provided
        if (orgsData) {
          setOrganizations(orgsData)
        }

        // Set current organization from localStorage or use primary/first org
        const storedOrgId = typeof window !== 'undefined'
          ? localStorage.getItem('currentOrganizationId')
          : null

        let activeOrg: Organization | null = null

        if (storedOrgId && orgsData) {
          activeOrg = orgsData.find((org: Organization) => org.id === storedOrgId) || null
        }

        if (!activeOrg && orgsData && orgsData.length > 0) {
          activeOrg = orgsData[0]
        }

        setCurrentOrganizationState(activeOrg)

        // Store the active org ID
        if (activeOrg && typeof window !== 'undefined') {
          localStorage.setItem('currentOrganizationId', activeOrg.id)
        }

        // Fetch user permissions and page permissions in parallel
        await Promise.all([
          fetchUserPermissions(userData.id),
          fetchPagePermissions()
        ])
      }
    } catch (error) {
      console.error('[PermissionsProvider] Failed to sync user:', error)
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'Failed to sync user data. Please try signing in again.'
      })
    } finally {
      setIsLoading(false)
    }
  }, [getToken, fetchUserPermissions, fetchPagePermissions, toast])

  // Handle Clerk authentication state changes
  useEffect(() => {
    if (!isClient) return

    if (isSignedIn && clerkUserId) {
      // User is signed in with Clerk, sync with backend
      syncUserWithBackend(clerkUserId)
    } else {
      // User is not signed in, clear all state
      setUser(null)
      setPermissions([])
      setPagePermissions(new Map())
      setOrganizations([])
      setCurrentOrganizationState(null)
      setIsLoading(false)

      // Clear stored organization
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentOrganizationId')
      }
    }
  }, [isClient, isSignedIn, clerkUserId, syncUserWithBackend])

  const setCurrentOrganization = useCallback((orgId: string) => {
    const org = organizations.find(o => o.id === orgId)
    if (org) {
      setCurrentOrganizationState(org)
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentOrganizationId', orgId)
      }
    }
  }, [organizations])

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (user && user.roles?.some(r => ['referee', 'Referee', 'Senior Referee'].includes(typeof r === 'string' ? r : r))) {
      try {
        const response = await apiClient.updateReferee(user.id, updates)
        if (response.success && response.data) {
          setUser(response.data.referee)
        }
      } catch (error) {
        console.error('Failed to update profile:', error)
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: 'Failed to update your profile. Please try again.'
        })
      }
    }
  }, [user, toast])

  const hasRole = useCallback((role: string): boolean => {
    if (!user) return false

    // Check roles array
    const userRoles = user.roles || []

    // Super Admin and Admin always have access
    if (userRoles.includes('Super Admin') || userRoles.includes('admin') || userRoles.includes('Admin')) {
      return true
    }

    // For backward compatibility, if checking for 'admin' role, also accept 'Super Admin'
    if (role === 'admin' && userRoles.includes('Super Admin')) {
      return true
    }

    return userRoles.includes(role)
  }, [user])

  const hasAnyRole = useCallback((...roles: string[]): boolean => {
    if (!user) return false

    // Check roles array
    const userRoles = user.roles || []

    // Super Admin and Admin always have access
    if (userRoles.includes('Super Admin') || userRoles.includes('admin') || userRoles.includes('Admin')) {
      return true
    }

    return roles.some(role => userRoles.includes(role))
  }, [user])

  // Permission checking methods with memoization and Cerbos support
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user || !isSignedIn) return false

    // Super Admin and Admin always have access to everything
    const userRoles = user.roles || []
    if (userRoles.includes('Super Admin') || userRoles.includes('admin') || userRoles.includes('Admin')) {
      return true
    }

    // Use the updated PermissionUtils to check permissions (supports legacy conversion)
    return PermissionUtils.hasPermissions(permissions, [permission])
  }, [user, isSignedIn, permissions])

  const hasAnyPermission = useCallback((permissionList: string[]): boolean => {
    if (!user || !isSignedIn) return false

    // Super Admin and Admin always have access to everything
    const userRoles = user.roles || []
    if (userRoles.includes('Super Admin') || userRoles.includes('admin') || userRoles.includes('Admin')) {
      return true
    }

    // Use the updated PermissionUtils to check permissions (supports legacy conversion)
    return PermissionUtils.hasAnyPermissions(permissions, permissionList)
  }, [user, isSignedIn, permissions])

  const hasAllPermissions = useCallback((permissionList: string[]): boolean => {
    if (!user || !isSignedIn) return false

    // Super Admin and Admin always have access to everything
    const userRoles = user.roles || []
    if (userRoles.includes('Super Admin') || userRoles.includes('admin') || userRoles.includes('Admin')) {
      return true
    }

    // Use the updated PermissionUtils to check permissions (supports legacy conversion)
    return PermissionUtils.hasPermissions(permissions, permissionList)
  }, [user, isSignedIn, permissions])

  const refreshPermissions = useCallback(async (): Promise<void> => {
    if (!user) return
    await fetchUserPermissions(user.id)
  }, [user, fetchUserPermissions])

  const canAccessPage = useCallback((pageId: string): boolean => {
    if (!user || !isSignedIn) return false

    // Super Admin and Admin always have access to all pages
    const userRoles = user.roles || []
    if (userRoles.includes('super_admin') || userRoles.includes('Super Admin') ||
        userRoles.includes('admin') || userRoles.includes('Admin')) {
      return true
    }

    // Derive page access from user permissions
    // Convert permissions array to string array for checking
    const userPermissionStrings = permissions.map(p =>
      typeof p === 'string' ? p : (p.code || p.name || '')
    ).filter(Boolean)

    return checkPageAccess(pageId, userPermissionStrings)
  }, [user, isSignedIn, permissions])

  const contextValue = useMemo(() => ({
    user,
    permissions,
    pagePermissions,
    organizations,
    currentOrganization,
    isLoading,
    setCurrentOrganization,
    updateProfile,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions,
    canAccessPage
  }), [
    user,
    permissions,
    pagePermissions,
    organizations,
    currentOrganization,
    isLoading,
    setCurrentOrganization,
    updateProfile,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions,
    canAccessPage
  ])

  return (
    <PermissionsContext.Provider value={contextValue}>
      {children}
    </PermissionsContext.Provider>
  )
}

/**
 * Hook to use the Permissions context
 *
 * @throws {Error} If used outside of PermissionsProvider
 * @returns {PermissionsContextType} The permissions context
 */
export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider')
  }
  return context
}

// Export for backward compatibility - components using useAuth will need to be updated
export { usePermissions as useAuth }
