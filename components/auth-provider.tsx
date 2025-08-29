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
import { useToast } from '@/components/ui/use-toast'

/**
 * Type definition for the Authentication Context
 * 
 * @typedef {Object} AuthContextType
 * @property {User | null} user - Current authenticated user object or null if not authenticated
 * @property {boolean} isAuthenticated - Boolean indicating if user is currently authenticated
 * @property {Permission[]} permissions - Array of user permissions from RBAC system
 * @property {Function} login - Function to authenticate user with email and password
 * @property {Function} logout - Function to logout user and clear authentication state
 * @property {Function} updateProfile - Function to update user profile information
 * @property {Function} hasRole - Function to check if user has a specific role
 * @property {Function} hasAnyRole - Function to check if user has any of the specified roles
 * @property {Function} hasPermission - Function to check if user has a specific permission
 * @property {Function} hasAnyPermission - Function to check if user has any of the specified permissions
 * @property {Function} hasAllPermissions - Function to check if user has all of the specified permissions
 * @property {Function} refreshPermissions - Function to refresh user permissions from server
 */
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  permissions: Permission[]
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  updateProfile: (updates: Partial<User>) => Promise<void>
  hasRole: (role: string) => boolean
  hasAnyRole: (...roles: string[]) => boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  refreshPermissions: () => Promise<void>
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

  useEffect(() => {
    if (!isClient) return
    
    // Check for stored auth on mount
    const storedToken = localStorage.getItem('auth_token')
    if (storedToken) {
      apiClient.setToken(storedToken)
      // Verify token by fetching user profile and permissions
      apiClient.getProfile()
        .then(async (response) => {
          if (response.user) {
            setUser(response.user)
            setIsAuthenticated(true)
            // Fetch user permissions
            await fetchUserPermissions(response.user.id)
          }
        })
        .catch(() => {
          // Token invalid, clear storage
          localStorage.removeItem('auth_token')
          apiClient.removeToken()
          setUser(null)
          setIsAuthenticated(false)
          setPermissions([])
        })
    }
  }, [isClient, fetchUserPermissions])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiClient.login(email, password)
      
      if (response.token && response.user) {
        apiClient.setToken(response.token)
        setUser(response.user)
        setIsAuthenticated(true)
        
        // Fetch user permissions after successful login
        await fetchUserPermissions(response.user.id)
        
        return true
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
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
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (user && user.role === 'referee') {
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
    
    // Check new roles array first, fallback to legacy role field
    const userRoles = user.roles || [user.role]
    
    // Admin always has access
    if (userRoles.includes('admin') || user.role === 'admin') {
      return true
    }
    
    return userRoles.includes(role)
  }

  const hasAnyRole = (...roles: string[]): boolean => {
    if (!user) return false
    
    // Check new roles array first, fallback to legacy role field
    const userRoles = user.roles || [user.role]
    
    // Admin always has access
    if (userRoles.includes('admin') || user.role === 'admin') {
      return true
    }
    
    return roles.some(role => userRoles.includes(role))
  }

  // Permission checking methods with memoization
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user || !isAuthenticated) return false
    
    // Admin always has access to everything
    const userRoles = user.roles || [user.role]
    if (userRoles.includes('admin') || user.role === 'admin') {
      return true
    }
    
    // Check if user has the specific permission
    return permissions.some(p => p.name === permission && p.active)
  }, [user, isAuthenticated, permissions])

  const hasAnyPermission = useCallback((permissionList: string[]): boolean => {
    if (!user || !isAuthenticated) return false
    
    // Admin always has access to everything
    const userRoles = user.roles || [user.role]
    if (userRoles.includes('admin') || user.role === 'admin') {
      return true
    }
    
    // Check if user has any of the specified permissions
    return permissionList.some(permission => 
      permissions.some(p => p.name === permission && p.active)
    )
  }, [user, isAuthenticated, permissions])

  const hasAllPermissions = useCallback((permissionList: string[]): boolean => {
    if (!user || !isAuthenticated) return false
    
    // Admin always has access to everything
    const userRoles = user.roles || [user.role]
    if (userRoles.includes('admin') || user.role === 'admin') {
      return true
    }
    
    // Check if user has all of the specified permissions
    return permissionList.every(permission =>
      permissions.some(p => p.name === permission && p.active)
    )
  }, [user, isAuthenticated, permissions])

  const refreshPermissions = useCallback(async (): Promise<void> => {
    if (!user) return
    await fetchUserPermissions(user.id)
  }, [user, fetchUserPermissions])

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      permissions,
      login, 
      logout, 
      updateProfile, 
      hasRole, 
      hasAnyRole,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      refreshPermissions
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