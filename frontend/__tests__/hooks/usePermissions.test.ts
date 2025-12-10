/**
 * usePermissions Hook Test Suite
 *
 * Tests for the usePermissions custom hook including:
 * - Permission retrieval and checking functionality
 * - Category-based permission operations
 * - Memoization and performance optimizations
 * - Integration with AuthProvider
 * - Error handling and edge cases
 */

import { renderHook, act } from '@testing-library/react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/components/auth-provider';
import type { Permission } from '@/lib/api';

// Mock the useAuth hook
jest.mock('@/components/auth-provider', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Sample permission data for testing
const mockPermissions: Permission[] = [
  {
    id: '1',
    name: 'users.read',
    code: 'USERS_READ',
    description: 'Read user data',
    category: 'user_management',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'users.write',
    code: 'USERS_WRITE',
    description: 'Write user data',
    category: 'user_management',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'games.create',
    code: 'GAMES_CREATE',
    description: 'Create games',
    category: 'game_management',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '4',
    name: 'games.manage',
    code: 'GAMES_MANAGE',
    description: 'Manage games',
    category: 'game_management',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '5',
    name: 'reports.view',
    code: 'REPORTS_VIEW',
    description: 'View reports',
    category: 'reporting',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '6',
    name: 'admin.access',
    code: 'ADMIN_ACCESS',
    description: 'Admin access',
    category: 'administration',
    active: false, // Inactive permission
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('usePermissions Hook', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  describe('Basic Functionality', () => {
    test('should return all auth-related functions and data', () => {
      const mockAuthFunctions = {
        isAuthenticated: true,
        hasPermission: jest.fn().mockReturnValue(true),
        hasAnyPermission: jest.fn().mockReturnValue(true),
        hasAllPermissions: jest.fn().mockReturnValue(true),
        refreshPermissions: jest.fn().mockResolvedValue(undefined),
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        permissions: mockPermissions,
        login: jest.fn(),
        logout: jest.fn(),
      };

      mockUseAuth.mockReturnValue(mockAuthFunctions);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.permissions).toEqual(mockPermissions);
      expect(result.current.hasPermission).toBe(
        mockAuthFunctions.hasPermission
      );
      expect(result.current.hasAnyPermission).toBe(
        mockAuthFunctions.hasAnyPermission
      );
      expect(result.current.hasAllPermissions).toBe(
        mockAuthFunctions.hasAllPermissions
      );
      expect(result.current.refreshPermissions).toBe(
        mockAuthFunctions.refreshPermissions
      );
      expect(result.current.isAuthenticated).toBe(true);
    });

    test('should provide additional utility functions', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: mockPermissions,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => usePermissions());

      expect(typeof result.current.getPermissionsByCategory).toBe('function');
      expect(typeof result.current.hasPermissionsInCategory).toBe('function');
    });
  });

  describe('getPermissionsByCategory Function', () => {
    test('should return permissions for specified category', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: mockPermissions,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => usePermissions());

      const userManagementPerms =
        result.current.getPermissionsByCategory('user_management');
      const gameManagementPerms =
        result.current.getPermissionsByCategory('game_management');

      expect(userManagementPerms).toHaveLength(2);
      expect(userManagementPerms.map((p) => p.name)).toEqual([
        'users.read',
        'users.write',
      ]);

      expect(gameManagementPerms).toHaveLength(2);
      expect(gameManagementPerms.map((p) => p.name)).toEqual([
        'games.create',
        'games.manage',
      ]);
    });

    test('should handle case-insensitive category matching', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: mockPermissions,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => usePermissions());

      const upperCaseResult =
        result.current.getPermissionsByCategory('USER_MANAGEMENT');
      const lowerCaseResult =
        result.current.getPermissionsByCategory('user_management');
      const mixedCaseResult =
        result.current.getPermissionsByCategory('User_Management');

      expect(upperCaseResult).toEqual(lowerCaseResult);
      expect(lowerCaseResult).toEqual(mixedCaseResult);
      expect(upperCaseResult).toHaveLength(2);
    });

    test('should return empty array for non-existent category', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: mockPermissions,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => usePermissions());

      const nonExistentResult = result.current.getPermissionsByCategory(
        'non_existent_category'
      );
      expect(nonExistentResult).toHaveLength(0);
      expect(nonExistentResult).toEqual([]);
    });

    test('should handle empty permissions array', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: [],
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => usePermissions());

      const result1 =
        result.current.getPermissionsByCategory('user_management');
      expect(result1).toHaveLength(0);
    });
  });

  describe('hasPermissionsInCategory Function', () => {
    test('should return true when user has active permissions in category', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: mockPermissions,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermissionsInCategory('user_management')).toBe(
        true
      );
      expect(result.current.hasPermissionsInCategory('game_management')).toBe(
        true
      );
      expect(result.current.hasPermissionsInCategory('reporting')).toBe(true);
    });

    test('should return false when user has only inactive permissions in category', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: mockPermissions,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermissionsInCategory('administration')).toBe(
        false
      );
    });

    test('should return false when user has no permissions in category', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: mockPermissions,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermissionsInCategory('non_existent')).toBe(
        false
      );
    });

    test('should handle case-insensitive category matching', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: mockPermissions,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermissionsInCategory('USER_MANAGEMENT')).toBe(
        true
      );
      expect(result.current.hasPermissionsInCategory('user_management')).toBe(
        true
      );
      expect(result.current.hasPermissionsInCategory('User_Management')).toBe(
        true
      );
    });
  });

  describe('Memoization and Performance', () => {
    test('should memoize getPermissionsByCategory based on permissions array', () => {
      const initialPermissions = mockPermissions.slice(0, 2);

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: initialPermissions,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result, rerender } = renderHook(() => usePermissions());

      const firstCall = result.current.getPermissionsByCategory;

      // Re-render with same permissions - should get same function reference
      rerender();
      const secondCall = result.current.getPermissionsByCategory;

      expect(firstCall).toBe(secondCall);
    });

    test('should update memoized function when permissions change', () => {
      const initialPermissions = mockPermissions.slice(0, 2);
      let currentPermissions = initialPermissions;

      mockUseAuth.mockImplementation(() => ({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: currentPermissions,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      }));

      const { result, rerender } = renderHook(() => usePermissions());

      const firstResult =
        result.current.getPermissionsByCategory('user_management');
      expect(firstResult).toHaveLength(2);

      // Change permissions
      currentPermissions = mockPermissions;
      rerender();

      const secondResult =
        result.current.getPermissionsByCategory('game_management');
      expect(secondResult).toHaveLength(2);
      expect(secondResult.map((p) => p.name)).toEqual([
        'games.create',
        'games.manage',
      ]);
    });

    test('should memoize hasPermissionsInCategory based on permissions array', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: mockPermissions,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result, rerender } = renderHook(() => usePermissions());

      const firstCall = result.current.hasPermissionsInCategory;

      rerender();
      const secondCall = result.current.hasPermissionsInCategory;

      expect(firstCall).toBe(secondCall);
    });
  });

  describe('Integration with AuthProvider', () => {
    test('should handle authentication state changes', () => {
      let isAuthenticated = false;

      mockUseAuth.mockImplementation(() => ({
        isAuthenticated,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: isAuthenticated ? mockPermissions : [],
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      }));

      const { result, rerender } = renderHook(() => usePermissions());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.permissions).toHaveLength(0);

      // Simulate login
      isAuthenticated = true;
      rerender();

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.permissions).toHaveLength(6);
    });

    test('should handle permission refresh', async () => {
      const mockRefreshPermissions = jest.fn().mockResolvedValue(undefined);

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: mockRefreshPermissions,
        permissions: mockPermissions,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => usePermissions());

      await act(async () => {
        await result.current.refreshPermissions();
      });

      expect(mockRefreshPermissions).toHaveBeenCalled();
    });

    test('should handle permission checking functions', () => {
      const mockHasPermission = jest.fn().mockReturnValue(true);
      const mockHasAnyPermission = jest.fn().mockReturnValue(true);
      const mockHasAllPermissions = jest.fn().mockReturnValue(false);

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: mockHasPermission,
        hasAnyPermission: mockHasAnyPermission,
        hasAllPermissions: mockHasAllPermissions,
        refreshPermissions: jest.fn(),
        permissions: mockPermissions,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission('users.read')).toBe(true);
      expect(
        result.current.hasAnyPermission(['users.read', 'users.write'])
      ).toBe(true);
      expect(
        result.current.hasAllPermissions(['users.read', 'admin.access'])
      ).toBe(false);

      expect(mockHasPermission).toHaveBeenCalledWith('users.read');
      expect(mockHasAnyPermission).toHaveBeenCalledWith([
        'users.read',
        'users.write',
      ]);
      expect(mockHasAllPermissions).toHaveBeenCalledWith([
        'users.read',
        'admin.access',
      ]);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle undefined permissions gracefully', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: undefined as any,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => usePermissions());

      expect(() => {
        result.current.getPermissionsByCategory('test');
      }).not.toThrow();
    });

    test('should handle null permissions gracefully', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: null as any,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => usePermissions());

      expect(() => {
        result.current.getPermissionsByCategory('test');
      }).not.toThrow();
    });

    test('should handle permissions with missing category field', () => {
      const permissionsWithMissingCategory = [
        {
          id: '1',
          name: 'test.permission',
          code: 'TEST_PERMISSION',
          description: 'Test permission',
          category: undefined as any,
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'another.permission',
          code: 'ANOTHER_PERMISSION',
          description: 'Another permission',
          category: null as any,
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: permissionsWithMissingCategory,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => usePermissions());

      expect(() => {
        result.current.getPermissionsByCategory('test');
      }).not.toThrow();

      const results = result.current.getPermissionsByCategory('test');
      expect(results).toHaveLength(0);
    });

    test('should handle useAuth throwing errors', () => {
      mockUseAuth.mockImplementation(() => {
        throw new Error('Auth provider error');
      });

      expect(() => {
        renderHook(() => usePermissions());
      }).toThrow('Auth provider error');
    });
  });

  describe('Complex Scenarios and Real-world Usage', () => {
    test('should handle complex permission categorization', () => {
      const complexPermissions: Permission[] = [
        {
          id: '1',
          name: 'admin.users.create',
          code: 'ADMIN_USERS_CREATE',
          description: 'Create users as admin',
          category: 'admin',
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'admin.users.delete',
          code: 'ADMIN_USERS_DELETE',
          description: 'Delete users as admin',
          category: 'admin',
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '3',
          name: 'moderator.content.review',
          code: 'MODERATOR_CONTENT_REVIEW',
          description: 'Review content as moderator',
          category: 'moderation',
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: complexPermissions,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result } = renderHook(() => usePermissions());

      const adminPerms = result.current.getPermissionsByCategory('admin');
      const moderationPerms =
        result.current.getPermissionsByCategory('moderation');

      expect(adminPerms).toHaveLength(2);
      expect(moderationPerms).toHaveLength(1);
      expect(result.current.hasPermissionsInCategory('admin')).toBe(true);
      expect(result.current.hasPermissionsInCategory('moderation')).toBe(true);
      expect(result.current.hasPermissionsInCategory('nonexistent')).toBe(
        false
      );
    });

    test('should handle dynamic permission updates', () => {
      let currentPermissions = mockPermissions.slice(0, 3);

      mockUseAuth.mockImplementation(() => ({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: currentPermissions,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      }));

      const { result, rerender } = renderHook(() => usePermissions());

      expect(result.current.getPermissionsByCategory('reporting')).toHaveLength(
        0
      );
      expect(result.current.hasPermissionsInCategory('reporting')).toBe(false);

      // Add reporting permission
      currentPermissions = [...currentPermissions, mockPermissions[4]];
      rerender();

      expect(result.current.getPermissionsByCategory('reporting')).toHaveLength(
        1
      );
      expect(result.current.hasPermissionsInCategory('reporting')).toBe(true);
    });

    test('should maintain referential integrity across re-renders with same data', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasPermission: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        refreshPermissions: jest.fn(),
        permissions: mockPermissions,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const { result, rerender } = renderHook(() => usePermissions());

      const firstGetByCategory = result.current.getPermissionsByCategory;
      const firstHasInCategory = result.current.hasPermissionsInCategory;

      rerender();

      const secondGetByCategory = result.current.getPermissionsByCategory;
      const secondHasInCategory = result.current.hasPermissionsInCategory;

      expect(firstGetByCategory).toBe(secondGetByCategory);
      expect(firstHasInCategory).toBe(secondHasInCategory);
    });
  });
});
