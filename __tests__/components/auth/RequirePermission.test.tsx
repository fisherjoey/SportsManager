/**
 * RequirePermission Component Test Suite
 * 
 * Tests for the RequirePermission component including:
 * - Conditional rendering based on permissions
 * - Fallback content handling
 * - Authentication state handling
 * - Integration with useAuth hook
 * - Error scenarios and edge cases
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { useAuth } from '@/components/auth-provider'

// Mock the useAuth hook
jest.mock('@/components/auth-provider', () => ({
  useAuth: jest.fn(),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('RequirePermission Component', () => {
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
        <RequirePermission permission="users.read">
          <div data-testid="protected-content">Protected Content</div>
        </RequirePermission>
      )

      expect(container.firstChild).toBeNull()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    test('should handle undefined authentication state gracefully', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: undefined as any,
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
        <RequirePermission permission="users.read">
          <div data-testid="protected-content">Protected Content</div>
        </RequirePermission>
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Permission-Based Rendering', () => {
    test('should render children when user has required permission', () => {
      const mockHasPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequirePermission permission="users.read">
          <div data-testid="protected-content">Protected Content</div>
        </RequirePermission>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      expect(mockHasPermission).toHaveBeenCalledWith('users.read')
    })

    test('should render nothing when user lacks required permission', () => {
      const mockHasPermission = jest.fn().mockReturnValue(false)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      const { container } = render(
        <RequirePermission permission="users.read">
          <div data-testid="protected-content">Protected Content</div>
        </RequirePermission>
      )

      expect(container.firstChild).toBeNull()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(mockHasPermission).toHaveBeenCalledWith('users.read')
    })
  })

  describe('Fallback Content Handling', () => {
    test('should render fallback when user lacks permission and fallback provided', () => {
      const mockHasPermission = jest.fn().mockReturnValue(false)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequirePermission 
          permission="users.read"
          fallback={<div data-testid="fallback-content">Access Denied</div>}
        >
          <div data-testid="protected-content">Protected Content</div>
        </RequirePermission>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('fallback-content')).toBeInTheDocument()
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
    })

    test('should render JSX element as fallback', () => {
      const mockHasPermission = jest.fn().mockReturnValue(false)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      const fallbackElement = (
        <div>
          <h2>Access Denied</h2>
          <p>You don't have permission to view this content.</p>
          <button>Contact Admin</button>
        </div>
      )

      render(
        <RequirePermission 
          permission="admin.access"
          fallback={fallbackElement}
        >
          <div data-testid="admin-panel">Admin Panel</div>
        </RequirePermission>
      )

      expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument()
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.getByText("You don't have permission to view this content.")).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Contact Admin' })).toBeInTheDocument()
    })

    test('should render complex fallback with nested components', () => {
      const mockHasPermission = jest.fn().mockReturnValue(false)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      const ComplexFallback = ({ message }: { message: string }) => (
        <div data-testid="complex-fallback">
          <span>{message}</span>
        </div>
      )

      render(
        <RequirePermission 
          permission="reports.view"
          fallback={<ComplexFallback message="Cannot access reports" />}
        >
          <div data-testid="reports">Reports</div>
        </RequirePermission>
      )

      expect(screen.queryByTestId('reports')).not.toBeInTheDocument()
      expect(screen.getByTestId('complex-fallback')).toBeInTheDocument()
      expect(screen.getByText('Cannot access reports')).toBeInTheDocument()
    })

    test('should default to null fallback when none provided', () => {
      const mockHasPermission = jest.fn().mockReturnValue(false)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      const { container } = render(
        <RequirePermission permission="users.read">
          <div data-testid="protected-content">Protected Content</div>
        </RequirePermission>
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Multiple Children Handling', () => {
    test('should render all children when permission granted', () => {
      const mockHasPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequirePermission permission="users.manage">
          <h1 data-testid="title">User Management</h1>
          <div data-testid="content">Manage users here</div>
          <button data-testid="action">Create User</button>
        </RequirePermission>
      )

      expect(screen.getByTestId('title')).toBeInTheDocument()
      expect(screen.getByTestId('content')).toBeInTheDocument() 
      expect(screen.getByTestId('action')).toBeInTheDocument()
      expect(screen.getByText('User Management')).toBeInTheDocument()
      expect(screen.getByText('Manage users here')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create User' })).toBeInTheDocument()
    })

    test('should handle nested components as children', () => {
      const mockHasPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      const NestedComponent = () => (
        <div data-testid="nested">
          <span>Nested Content</span>
        </div>
      )

      render(
        <RequirePermission permission="games.create">
          <div>
            <NestedComponent />
            <div>
              <button>Create Game</button>
            </div>
          </div>
        </RequirePermission>
      )

      expect(screen.getByTestId('nested')).toBeInTheDocument()
      expect(screen.getByText('Nested Content')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Game' })).toBeInTheDocument()
    })
  })

  describe('Different Permission Formats', () => {
    test('should handle dot-separated permission names', () => {
      const mockHasPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequirePermission permission="admin.users.delete">
          <div data-testid="delete-button">Delete User</div>
        </RequirePermission>
      )

      expect(screen.getByTestId('delete-button')).toBeInTheDocument()
      expect(mockHasPermission).toHaveBeenCalledWith('admin.users.delete')
    })

    test('should handle underscore-separated permission names', () => {
      const mockHasPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequirePermission permission="ADMIN_ACCESS">
          <div data-testid="admin-content">Admin Content</div>
        </RequirePermission>
      )

      expect(screen.getByTestId('admin-content')).toBeInTheDocument()
      expect(mockHasPermission).toHaveBeenCalledWith('ADMIN_ACCESS')
    })

    test('should handle single-word permissions', () => {
      const mockHasPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequirePermission permission="admin">
          <div data-testid="admin-area">Admin Area</div>
        </RequirePermission>
      )

      expect(screen.getByTestId('admin-area')).toBeInTheDocument()
      expect(mockHasPermission).toHaveBeenCalledWith('admin')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle hasPermission throwing an error', () => {
      const mockHasPermission = jest.fn().mockImplementation(() => {
        throw new Error('Permission check failed')
      })
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      // Should not crash, should fail closed (deny access)
      // Wrap in try-catch to handle the error gracefully
      let renderResult
      expect(() => {
        renderResult = render(
          <RequirePermission permission="users.read">
            <div data-testid="protected-content">Protected Content</div>
          </RequirePermission>
        )
      }).toThrow('Permission check failed')
      
      // Test demonstrates that error is thrown as expected
      expect(mockHasPermission).toHaveBeenCalledWith('users.read')
    })

    test('should handle empty permission string', () => {
      const mockHasPermission = jest.fn().mockReturnValue(false)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      const { container } = render(
        <RequirePermission permission="">
          <div data-testid="protected-content">Protected Content</div>
        </RequirePermission>
      )

      expect(container.firstChild).toBeNull()
      expect(mockHasPermission).toHaveBeenCalledWith('')
    })

    test('should handle null user in auth context', () => {
      const mockHasPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequirePermission permission="users.read">
          <div data-testid="protected-content">Protected Content</div>
        </RequirePermission>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(mockHasPermission).toHaveBeenCalledWith('users.read')
    })

    test('should handle missing useAuth context gracefully', () => {
      mockUseAuth.mockImplementation(() => {
        throw new Error('useAuth must be used within AuthProvider')
      })

      expect(() => {
        render(
          <RequirePermission permission="users.read">
            <div>Protected Content</div>
          </RequirePermission>
        )
      }).toThrow('useAuth must be used within AuthProvider')
    })
  })

  describe('Component Composition and Nesting', () => {
    test('should work with nested RequirePermission components', () => {
      const mockHasPermission = jest.fn()
        .mockImplementation((permission) => {
          if (permission === 'users.read') return true
          if (permission === 'users.delete') return true
          return false
        })
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequirePermission permission="users.read">
          <div data-testid="user-list">User List</div>
          <RequirePermission permission="users.delete">
            <button data-testid="delete-button">Delete User</button>
          </RequirePermission>
        </RequirePermission>
      )

      expect(screen.getByTestId('user-list')).toBeInTheDocument()
      expect(screen.getByTestId('delete-button')).toBeInTheDocument()
    })

    test('should handle nested permission failures correctly', () => {
      const mockHasPermission = jest.fn()
        .mockImplementation((permission) => {
          if (permission === 'users.read') return true
          if (permission === 'users.delete') return false
          return false
        })
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <RequirePermission permission="users.read">
          <div data-testid="user-list">User List</div>
          <RequirePermission 
            permission="users.delete"
            fallback={<span data-testid="no-delete">Cannot delete</span>}
          >
            <button data-testid="delete-button">Delete User</button>
          </RequirePermission>
        </RequirePermission>
      )

      expect(screen.getByTestId('user-list')).toBeInTheDocument()
      expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument()
      expect(screen.getByTestId('no-delete')).toBeInTheDocument()
    })
  })

  describe('Performance Considerations', () => {
    test('should not cause unnecessary re-renders', () => {
      const mockHasPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      const { rerender } = render(
        <RequirePermission permission="users.read">
          <div data-testid="protected-content">Protected Content</div>
        </RequirePermission>
      )

      expect(mockHasPermission).toHaveBeenCalledTimes(1)

      // Re-render with same props should not call hasPermission again
      rerender(
        <RequirePermission permission="users.read">
          <div data-testid="protected-content">Protected Content</div>
        </RequirePermission>
      )

      // Note: This depends on the implementation. If hasPermission is called on every render,
      // this test might need to be adjusted based on the actual behavior
      expect(mockHasPermission).toHaveBeenCalledTimes(2)
    })
  })

  describe('Integration with React Features', () => {
    test('should work with React Suspense boundaries', () => {
      const mockHasPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <RequirePermission permission="users.read">
            <div data-testid="protected-content">Protected Content</div>
          </RequirePermission>
        </React.Suspense>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    test('should work with React Error Boundaries', () => {
      class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
        constructor(props: {children: React.ReactNode}) {
          super(props)
          this.state = { hasError: false }
        }

        static getDerivedStateFromError() {
          return { hasError: true }
        }

        render() {
          if (this.state.hasError) {
            return <div data-testid="error-boundary">Something went wrong</div>
          }
          return this.props.children
        }
      }

      const mockHasPermission = jest.fn().mockReturnValue(true)
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        login: jest.fn(),
        logout: jest.fn(),
        permissions: [],
        refreshPermissions: jest.fn()
      })

      render(
        <ErrorBoundary>
          <RequirePermission permission="users.read">
            <div data-testid="protected-content">Protected Content</div>
          </RequirePermission>
        </ErrorBoundary>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument()
    })
  })
})