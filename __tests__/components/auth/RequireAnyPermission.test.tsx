/**
 * RequireAnyPermission Component Test Suite
 * 
 * Tests for the RequireAnyPermission component including:
 * - Multiple permission validation
 * - OR logic permission checking  
 * - Fallback handling
 * - Authentication state management
 * - Error scenarios and edge cases
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { RequireAnyPermission } from '@/components/auth/RequireAnyPermission'
import { useAuth } from '@/components/auth-provider'

// Mock the useAuth hook
jest.mock('@/components/auth-provider', () => ({
  useAuth: jest.fn(),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('RequireAnyPermission Component', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  describe('Authentication State Handling', () => {
    test('should render nothing when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      const { container } = render(
        <RequireAnyPermission permissions={['users.read', 'users.write']}>
          <div data-testid="protected-content">Protected Content</div>
        </RequireAnyPermission>
      )

      expect(container.firstChild).toBeNull()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('Multiple Permission Logic (OR)', () => {
    test('should render children when user has first permission', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequireAnyPermission permissions={['users.read', 'users.write']}>
          <div data-testid="protected-content">Protected Content</div>
        </RequireAnyPermission>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      expect(mockHasAnyPermission).toHaveBeenCalledWith(['users.read', 'users.write'])
    })

    test('should render children when user has second permission', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequireAnyPermission permissions={['admin.access', 'users.read']}>
          <div data-testid="protected-content">User Management</div>
        </RequireAnyPermission>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(mockHasAnyPermission).toHaveBeenCalledWith(['admin.access', 'users.read'])
    })

    test('should render children when user has all permissions', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequireAnyPermission permissions={['users.read', 'users.write', 'users.delete']}>
          <div data-testid="user-management">Complete User Management</div>
        </RequireAnyPermission>
      )

      expect(screen.getByTestId('user-management')).toBeInTheDocument()
    })

    test('should render nothing when user has none of the required permissions', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(false)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      const { container } = render(
        <RequireAnyPermission permissions={['admin.access', 'moderator.access']}>
          <div data-testid="admin-content">Admin Content</div>
        </RequireAnyPermission>
      )

      expect(container.firstChild).toBeNull()
      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument()
      expect(mockHasAnyPermission).toHaveBeenCalledWith(['admin.access', 'moderator.access'])
    })
  })

  describe('Single Permission Edge Cases', () => {
    test('should work with single permission in array', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequireAnyPermission permissions={['users.read']}>
          <div data-testid="single-perm-content">Single Permission Content</div>
        </RequireAnyPermission>
      )

      expect(screen.getByTestId('single-perm-content')).toBeInTheDocument()
      expect(mockHasAnyPermission).toHaveBeenCalledWith(['users.read'])
    })

    test('should handle empty permissions array', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(false)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      const { container } = render(
        <RequireAnyPermission permissions={[]}>
          <div data-testid="empty-perms-content">Content</div>
        </RequireAnyPermission>
      )

      expect(container.firstChild).toBeNull()
      expect(mockHasAnyPermission).toHaveBeenCalledWith([])
    })
  })

  describe('Fallback Content Handling', () => {
    test('should render fallback when user lacks all permissions', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(false)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequireAnyPermission 
          permissions={['admin.access', 'moderator.access']}
          fallback={<div data-testid="fallback-content">Insufficient Permissions</div>}
        >
          <div data-testid="protected-content">Administrative Tools</div>
        </RequireAnyPermission>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('fallback-content')).toBeInTheDocument()
      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument()
    })

    test('should render complex fallback with action buttons', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(false)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      const ComplexFallback = () => (
        <div data-testid="complex-fallback">
          <h2>Access Restricted</h2>
          <p>You need admin or moderator access to view this content.</p>
          <button>Request Access</button>
          <button>Contact Support</button>
        </div>
      )

      render(
        <RequireAnyPermission 
          permissions={['admin.full', 'moderator.manage']}
          fallback={<ComplexFallback />}
        >
          <div data-testid="management-panel">Management Panel</div>
        </RequireAnyPermission>
      )

      expect(screen.queryByTestId('management-panel')).not.toBeInTheDocument()
      expect(screen.getByTestId('complex-fallback')).toBeInTheDocument()
      expect(screen.getByText('Access Restricted')).toBeInTheDocument()
      expect(screen.getByText('You need admin or moderator access to view this content.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Request Access' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Contact Support' })).toBeInTheDocument()
    })
  })

  describe('Different Permission Formats and Categories', () => {
    test('should handle mixed permission format styles', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequireAnyPermission permissions={['users.read', 'ADMIN_ACCESS', 'games-manage']}>
          <div data-testid="mixed-format-content">Mixed Format Content</div>
        </RequireAnyPermission>
      )

      expect(screen.getByTestId('mixed-format-content')).toBeInTheDocument()
      expect(mockHasAnyPermission).toHaveBeenCalledWith(['users.read', 'ADMIN_ACCESS', 'games-manage'])
    })

    test('should handle permissions from different categories', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequireAnyPermission permissions={[
          'users.manage',      // User management
          'games.create',      // Game management  
          'reports.view',      // Reporting
          'system.admin'       // System administration
        ]}>
          <div data-testid="multi-category-content">Multi-Category Access</div>
        </RequireAnyPermission>
      )

      expect(screen.getByTestId('multi-category-content')).toBeInTheDocument()
      expect(mockHasAnyPermission).toHaveBeenCalledWith([
        'users.manage',
        'games.create',
        'reports.view',
        'system.admin'
      ])
    })
  })

  describe('Realistic Use Cases', () => {
    test('should handle content management scenario', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Content Editor', email: 'editor@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequireAnyPermission permissions={['content.create', 'content.edit', 'content.publish']}>
          <div data-testid="content-tools">
            <button>Create Article</button>
            <button>Edit Content</button>
            <button>Publish</button>
          </div>
        </RequireAnyPermission>
      )

      expect(screen.getByTestId('content-tools')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Article' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit Content' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument()
    })

    test('should handle administrative access scenario', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(false)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Regular User', email: 'user@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequireAnyPermission 
          permissions={['admin.system', 'admin.users', 'admin.settings']}
          fallback={
            <div data-testid="admin-denied">
              <p>Administrative access required.</p>
              <button>Contact Administrator</button>
            </div>
          }
        >
          <div data-testid="admin-dashboard">
            <h1>Admin Dashboard</h1>
            <button>Manage Users</button>
            <button>System Settings</button>
          </div>
        </RequireAnyPermission>
      )

      expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument()
      expect(screen.getByTestId('admin-denied')).toBeInTheDocument()
      expect(screen.getByText('Administrative access required.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Contact Administrator' })).toBeInTheDocument()
    })

    test('should handle reporting access scenario', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Manager', email: 'manager@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequireAnyPermission permissions={[
          'reports.financial', 
          'reports.operational', 
          'reports.analytics'
        ]}>
          <div data-testid="reports-section">
            <h2>Reports Dashboard</h2>
            <div>Financial Reports</div>
            <div>Operational Reports</div>
            <div>Analytics Reports</div>
          </div>
        </RequireAnyPermission>
      )

      expect(screen.getByTestId('reports-section')).toBeInTheDocument()
      expect(screen.getByText('Reports Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Financial Reports')).toBeInTheDocument()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle hasAnyPermission throwing an error', () => {
      const mockHasAnyPermission = jest.fn().mockImplementation(() => {
        throw new Error('Permission check failed')
      })
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      // Should not crash, should fail closed (deny access)
      const { container } = render(
        <RequireAnyPermission permissions={['users.read', 'users.write']}>
          <div data-testid="protected-content">Protected Content</div>
        </RequireAnyPermission>
      )

      expect(container.firstChild).toBeNull()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    test('should handle undefined permissions array', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(false)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      const { container } = render(
        <RequireAnyPermission permissions={undefined as any}>
          <div data-testid="protected-content">Protected Content</div>
        </RequireAnyPermission>
      )

      expect(container.firstChild).toBeNull()
    })

    test('should handle permissions array with empty strings', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(false)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      const { container } = render(
        <RequireAnyPermission permissions={['', 'users.read', '']}>
          <div data-testid="protected-content">Protected Content</div>
        </RequireAnyPermission>
      )

      expect(container.firstChild).toBeNull()
      expect(mockHasAnyPermission).toHaveBeenCalledWith(['', 'users.read', ''])
    })
  })

  describe('Component Integration and Nesting', () => {
    test('should work with nested RequireAnyPermission components', () => {
      const mockHasAnyPermission = jest.fn()
        .mockImplementation((permissions) => {
          // Simulate different permission levels
          if (permissions.includes('content.access')) return true
          if (permissions.includes('content.publish')) return false
          return false
        })
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Content Editor', email: 'editor@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequireAnyPermission permissions={['content.access', 'content.view']}>
          <div data-testid="content-area">Content Area</div>
          <RequireAnyPermission 
            permissions={['content.publish', 'content.approve']}
            fallback={<span data-testid="cannot-publish">Cannot publish</span>}
          >
            <button data-testid="publish-button">Publish</button>
          </RequireAnyPermission>
        </RequireAnyPermission>
      )

      expect(screen.getByTestId('content-area')).toBeInTheDocument()
      expect(screen.queryByTestId('publish-button')).not.toBeInTheDocument()
      expect(screen.getByTestId('cannot-publish')).toBeInTheDocument()
    })

    test('should work alongside RequirePermission components', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(true)
      const mockHasPermission = jest.fn().mockReturnValue(false)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      // Import RequirePermission for this test
      const RequirePermission = ({ permission, children, fallback = null }: any) => {
        const { hasPermission, isAuthenticated } = useAuth()
        if (!isAuthenticated || !hasPermission(permission)) {
          return fallback
        }
        return <>{children}</>
      }

      render(
        <div>
          <RequireAnyPermission permissions={['users.read', 'users.list']}>
            <div data-testid="user-list">User List</div>
          </RequireAnyPermission>
          <RequirePermission 
            permission="users.create"
            fallback={<span data-testid="no-create">Cannot create users</span>}
          >
            <button data-testid="create-user">Create User</button>
          </RequirePermission>
        </div>
      )

      expect(screen.getByTestId('user-list')).toBeInTheDocument()
      expect(screen.queryByTestId('create-user')).not.toBeInTheDocument()
      expect(screen.getByTestId('no-create')).toBeInTheDocument()
    })
  })

  describe('Large Permission Sets', () => {
    test('should handle large numbers of permissions efficiently', () => {
      const mockHasAnyPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Super User', email: 'super@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      // Create a large array of permissions
      const manyPermissions = Array.from({ length: 50 }, (_, i) => `permission.${i}`)

      render(
        <RequireAnyPermission permissions={manyPermissions}>
          <div data-testid="many-perms-content">Content with Many Permissions</div>
        </RequireAnyPermission>
      )

      expect(screen.getByTestId('many-perms-content')).toBeInTheDocument()
      expect(mockHasAnyPermission).toHaveBeenCalledWith(manyPermissions)
    })
  })
})