/**
 * @fileoverview Authentication Provider Component - Clerk Compatibility Layer
 *
 * This module provides authentication context that wraps Clerk authentication
 * and the PermissionsProvider. It maintains backward compatibility with existing
 * components that use useAuth() while delegating to Clerk for authentication.
 *
 * @module components/AuthProvider
 */

'use client'

import type React from 'react'
import { createContext, useContext, useCallback, useMemo } from 'react'
import { useAuth as useClerkAuth, useClerk } from '@clerk/nextjs'
import { usePermissions, type Organization } from '@/components/permissions-provider'
import type { User, Permission } from '@/lib/api'

/**
 * Type definition for the Authentication Context
 * Maintains backward compatibility with the original AuthContextType
 */
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  permissions: Permission[]
  pagePermissions: Map<string, { view: boolean; access: boolean }>
  organizations: Organization[]
  currentOrganization: Organization | null
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
  setCurrentOrganization: (orgId: string) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

/**
 * Authentication Provider Component - Clerk Compatibility Layer
 *
 * This provider wraps the PermissionsProvider and adds Clerk-compatible
 * login/logout methods. It should be used inside ClerkProvider and
 * PermissionsProvider in the component tree.
 *
 * NOTE: This is a compatibility layer. The actual provider hierarchy is:
 * ClerkProvider -> PermissionsProvider -> AuthProvider (this)
 *
 * For new code, prefer using usePermissions() directly from permissions-provider.tsx
 *
 * @component
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useClerkAuth()
  const { signOut, redirectToSignIn } = useClerk()
  const permissionsContext = usePermissions()

  // Login redirects to Clerk sign-in page
  // The email/password parameters are kept for backward compatibility but not used
  const login = useCallback(async (_email: string, _password: string): Promise<boolean> => {
    // Redirect to Clerk sign-in
    redirectToSignIn()
    // Return false because the actual login happens via redirect
    return false
  }, [redirectToSignIn])

  // Logout via Clerk
  const logout = useCallback(() => {
    signOut()
  }, [signOut])

  // Stub for refreshPagePermissions (delegated to permissions provider)
  const refreshPagePermissions = useCallback(async (): Promise<void> => {
    // Page permissions are managed by PermissionsProvider
    // This is kept for backward compatibility
  }, [])

  const contextValue = useMemo(() => ({
    user: permissionsContext.user,
    isAuthenticated: !!isSignedIn && !!permissionsContext.user,
    isLoading: !isLoaded || permissionsContext.isLoading,
    permissions: permissionsContext.permissions,
    pagePermissions: permissionsContext.pagePermissions,
    organizations: permissionsContext.organizations,
    currentOrganization: permissionsContext.currentOrganization,
    login,
    logout,
    updateProfile: permissionsContext.updateProfile,
    hasRole: permissionsContext.hasRole,
    hasAnyRole: permissionsContext.hasAnyRole,
    hasPermission: permissionsContext.hasPermission,
    hasAnyPermission: permissionsContext.hasAnyPermission,
    hasAllPermissions: permissionsContext.hasAllPermissions,
    refreshPermissions: permissionsContext.refreshPermissions,
    canAccessPage: permissionsContext.canAccessPage,
    refreshPagePermissions,
    setCurrentOrganization: permissionsContext.setCurrentOrganization,
  }), [
    permissionsContext,
    isSignedIn,
    isLoaded,
    login,
    logout,
    refreshPagePermissions,
  ])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to use the Authentication context
 * Provides backward compatibility for components using useAuth()
 *
 * @throws {Error} If used outside of AuthProvider
 * @returns {AuthContextType} The authentication context
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
