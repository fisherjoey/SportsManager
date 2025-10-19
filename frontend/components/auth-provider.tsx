/**
 * @fileoverview Authentication Provider Component
 * 
 * This module provides authentication context and functionality for the entire application.
 * It manages user login/logout, token storage, profile updates, and role-based access control.
 * The provider wraps the application and makes authentication state available to all components.
 * 
 * @module components/AuthProvider
 */

'use client'

import type React from 'react'
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

import { apiClient, type User, type Permission } from '@/lib/api'
import type { PagePermission } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import PermissionUtils from '@/lib/permissions'
import { getAuthToken, deleteAuthToken } from '@/lib/cookies'

/**
 * Type definition for the Authentication Context
 *
 * @typedef {Object} AuthContextType
 * @property {User | null} user - Current authenticated user object or null if not authenticated
 * @property {boolean} isAuthenticated - Boolean indicating if user is currently authenticated
 * @property {Permission[]} permissions - Array of user permissions from RBAC system
 * @property {Map<string, { view: boolean, access: boolean }>} pagePermissions - Map of page permissions by page ID
 * @property {Function} login - Function to authenticate user with email and password
 * @property {Function} logout - Function to logout user and clear authentication state
 * @property {Function} updateProfile - Function to update user profile information
 * @property {Function} hasRole - Function to check if user has a specific role
 * @property {Function} hasAnyRole - Function to check if user has any of the specified roles
 * @property {Function} hasPermission - Function to check if user has a specific permission
 * @property {Function} hasAnyPermission - Function to check if user has any of the specified permissions
 * @property {Function} hasAllPermissions - Function to check if user has all of the specified permissions
 * @property {Function} refreshPermissions - Function to refresh user permissions from server
 * @property {Function} canAccessPage - Function to check if user can access a specific page
 * @property {Function} refreshPagePermissions - Function to refresh page permissions from server
 */
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  permissions: Permission[]
  pagePermissions: Map<string, { view: boolean, access: boolean }>
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  updateProfile: (updates: Partial<User>) => Promise<void>
  hasRole: (role: string) => boolean
  hasAnyRole: (...roles: string[]) => boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  refreshPermissions: () => Promise<void>
  canAccessPage: (pageId: string) => boolean
  refreshPagePermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

/**
 * Authentication Provider Component
 * 
 * Provides authentication context to the entire application. Manages user login/logout,
 * token persistence, and role-based access control. Should wrap the root of the application.
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Child components to provide authentication context to
 * @returns {JSX.Element} Provider component that wraps children with authentication context
 * 
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [pagePermissions, setPagePermissions] = useState<Map<string, { view: boolean, access: boolean }>>(new Map())
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

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

  useEffect(() => {
    if (!isClient) return

    // Check for stored auth on mount
    const storedToken = getAuthToken()
    if (storedToken) {
      apiClient.setToken(storedToken)
      // Verify token by fetching user profile and permissions
      apiClient.getProfile()
        .then(async (response) => {
          console.log('[AuthProvider] Profile response:', response)
          if (response.user) {
            setUser(response.user)
            setIsAuthenticated(true)
            // Fetch user permissions and page permissions in parallel
            await Promise.all([
              fetchUserPermissions(response.user.id),
              fetchPagePermissions()
            ])
          }
        })
        .catch((error) => {
          console.error('[AuthProvider] Failed to get profile:', error)
          // Token invalid, clear storage
          deleteAuthToken()
          apiClient.removeToken()
          setUser(null)
          setIsAuthenticated(false)
          setPermissions([])
          setPagePermissions(new Map())
        })
    }
  }, [isClient, fetchUserPermissions, fetchPagePermissions])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('[AuthProvider] Attempting login for:', email)
      const response = await apiClient.login(email, password)
      console.log('[AuthProvider] Login response:', response)

      if (response.token && response.user) {
        console.log('[AuthProvider] Setting token and user')
        apiClient.setToken(response.token)
        setUser(response.user)
        setIsAuthenticated(true)

        // Fetch user permissions and page permissions after successful login
        console.log('[AuthProvider] Fetching permissions for user:', response.user.id)
        await Promise.all([
          fetchUserPermissions(response.user.id),
          fetchPagePermissions()
        ])

        return true
      }
      return false
    } catch (error) {
      console.error('[AuthProvider] Login failed:', error)
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Please check your email and password and try again.'
      })
      return false
    }
  }

  const logout = () => {
    apiClient.removeToken()
    setUser(null)
    setIsAuthenticated(false)
    setPermissions([])
    setPagePermissions(new Map())
  }

  const updateProfile = async (updates: Partial<User>) => {
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
  }

  const hasRole = (role: string): boolean => {
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
  }

  const hasAnyRole = (...roles: string[]): boolean => {
    if (!user) return false
    
    // Check roles array
    const userRoles = user.roles || []
    
    // Super Admin and Admin always have access
    if (userRoles.includes('Super Admin') || userRoles.includes('admin') || userRoles.includes('Admin')) {
      return true
    }
    
    return roles.some(role => userRoles.includes(role))
  }

  // Permission checking methods with memoization and Cerbos support
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user || !isAuthenticated) return false

    // Super Admin and Admin always have access to everything
    const userRoles = user.roles || []
    if (userRoles.includes('Super Admin') || userRoles.includes('admin') || userRoles.includes('Admin')) {
      return true
    }

    // Use the updated PermissionUtils to check permissions (supports legacy conversion)
    return PermissionUtils.hasPermissions(permissions, [permission])
  }, [user, isAuthenticated, permissions])

  const hasAnyPermission = useCallback((permissionList: string[]): boolean => {
    if (!user || !isAuthenticated) return false

    // Super Admin and Admin always have access to everything
    const userRoles = user.roles || []
    if (userRoles.includes('Super Admin') || userRoles.includes('admin') || userRoles.includes('Admin')) {
      return true
    }

    // Use the updated PermissionUtils to check permissions (supports legacy conversion)
    return PermissionUtils.hasAnyPermissions(permissions, permissionList)
  }, [user, isAuthenticated, permissions])

  const hasAllPermissions = useCallback((permissionList: string[]): boolean => {
    if (!user || !isAuthenticated) return false

    // Super Admin and Admin always have access to everything
    const userRoles = user.roles || []
    if (userRoles.includes('Super Admin') || userRoles.includes('admin') || userRoles.includes('Admin')) {
      return true
    }

    // Use the updated PermissionUtils to check permissions (supports legacy conversion)
    return PermissionUtils.hasPermissions(permissions, permissionList)
  }, [user, isAuthenticated, permissions])

  const refreshPermissions = useCallback(async (): Promise<void> => {
    if (!user) return
    await fetchUserPermissions(user.id)
  }, [user, fetchUserPermissions])

  const canAccessPage = useCallback((pageId: string): boolean => {
    if (!user || !isAuthenticated) return false

    // Super Admin and Admin always have access to all pages
    const userRoles = user.roles || []
    if (userRoles.includes('Super Admin') || userRoles.includes('admin') || userRoles.includes('Admin')) {
      return true
    }

    // Check page permissions map
    const permission = pagePermissions.get(pageId)
    return permission?.access ?? false
  }, [user, isAuthenticated, pagePermissions])

  const refreshPagePermissions = useCallback(async (): Promise<void> => {
    await fetchPagePermissions()
  }, [fetchPagePermissions])

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      permissions,
      pagePermissions,
      login,
      logout,
      updateProfile,
      hasRole,
      hasAnyRole,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      refreshPermissions,
      canAccessPage,
      refreshPagePermissions
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}