/**
 * @fileoverview Permission Service Types
 *
 * Type definitions for permission management operations
 */

export interface Permission {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  resource_type?: string;
  action?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Role {
  id: string;
  name: string;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  created_at?: Date;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  created_at?: Date;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

export interface PermissionsByCategory {
  [category: string]: Permission[];
}

export interface PermissionDetails extends Permission {
  roles: Array<{
    id: string;
    name: string;
  }>;
}

export interface PaginatedPermissions {
  permissions: Permission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PermissionSearchOptions {
  category?: string;
  activeOnly?: boolean;
  limit?: number;
}

export interface PermissionCreateData {
  name: string;
  code?: string;
  description?: string;
  category?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  resource_type?: string;
  action?: string;
}

export interface PermissionUpdateData {
  name?: string;
  code?: string;
  description?: string;
  category?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  resource_type?: string;
  action?: string;
}

export interface GetAllPermissionsOptions {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}

export interface GetPermissionsByCategoryOptions {
  useCache?: boolean;
}

export interface CacheStats {
  userPermissionsCacheSize: number;
  permissionCacheSize: number;
  cacheTTL: number;
  maxAge: number;
}

export interface BulkPermissionResult {
  [userId: string]: boolean;
}

export interface DatabaseConnection {
  (tableName: string): any;
  transaction(): Promise<any>;
  raw(query: string): any;
}

export interface IPermissionService {
  /**
   * Get user permissions with caching
   */
  getUserPermissions(userId: string, useCache?: boolean): Promise<Permission[]>;

  /**
   * Check if user has specific permission
   */
  hasPermission(userId: string, permissionName: string): Promise<boolean>;

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean>;

  /**
   * Check if user has all specified permissions
   */
  hasAllPermissions(userId: string, permissionNames: string[]): Promise<boolean>;

  /**
   * Bulk permission check for multiple users
   */
  bulkPermissionCheck(userIds: string[], permissionNames: string | string[]): Promise<BulkPermissionResult>;

  /**
   * Get permissions organized by category
   */
  getPermissionsByCategory(options?: GetPermissionsByCategoryOptions): Promise<PermissionsByCategory>;

  /**
   * Get user permissions organized by category
   */
  getUserPermissionsByCategory(userId: string): Promise<PermissionsByCategory>;

  /**
   * Search permissions by name or description
   */
  searchPermissions(query: string, options?: PermissionSearchOptions): Promise<Permission[]>;

  /**
   * Invalidate user permission cache
   */
  invalidateUserCache(userId?: string): void;

  /**
   * Invalidate permission cache
   */
  invalidatePermissionCache(): void;

  /**
   * Invalidate all caches
   */
  invalidateAllCaches(): void;

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats;

  /**
   * Get detailed user permission info with roles
   */
  getUserPermissionDetails(userId: string): Promise<PermissionDetails[]>;

  /**
   * Check if permission exists
   */
  getPermission(permissionName: string): Promise<Permission | null>;

  /**
   * Create a new permission
   */
  createPermission(permissionData: PermissionCreateData): Promise<Permission>;

  /**
   * Update a permission
   */
  updatePermission(id: string, updates: PermissionUpdateData): Promise<Permission>;

  /**
   * Delete a permission
   */
  deletePermission(id: string): Promise<boolean>;

  /**
   * Get all permissions (with pagination)
   */
  getAllPermissions(options?: GetAllPermissionsOptions): Promise<PaginatedPermissions>;

  /**
   * Assign permissions to a role
   */
  assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<Permission[]>;

  /**
   * Get permissions for a role
   */
  getRolePermissions(roleId: string): Promise<Permission[]>;

  /**
   * Get all unique categories
   */
  getCategories(): Promise<string[]>;
}