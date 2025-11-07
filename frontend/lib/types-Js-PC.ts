export interface AvailabilityWindow {
  id: string
  referee_id: string
  date: string
  start_time: string
  end_time: string
  is_available: boolean
  reason?: string
  created_at?: string
  updated_at?: string
}

export interface AvailabilityResponse {
  success: boolean
  data: {
    refereeId: string
    availability: AvailabilityWindow[]
    count: number
  }
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'referee'
  referee_id?: string
  roles?: string[]
}

// RBAC Types
export interface Permission {
  id: string
  name: string
  code: string
  description?: string
  category: string
  resource: string
  action: string
  active: boolean
  system_permission: boolean
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  name: string
  description?: string
  code: string
  category?: string
  system_role: boolean
  active: boolean
  created_at: string
  updated_at: string
  permissions?: Permission[]
  user_count?: number
}

export interface RolePermission {
  role_id: string
  permission_id: string
  assigned_at: string
  assigned_by: string
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_at: string
  assigned_by: string
  active: boolean
  role?: Role
  user?: User
}

export interface PermissionsByCategory {
  [category: string]: Permission[]
}

export interface RoleManagementResponse {
  success: boolean
  data: {
    roles: Role[]
  }
  message?: string
}

export interface RoleDetailsResponse {
  success: boolean
  data: {
    role: Role
  }
  message?: string
}

export interface PermissionsResponse {
  success: boolean
  data: {
    permissions: PermissionsByCategory
    stats: {
      total: number
      categories: number
    }
  }
  message?: string
}

export interface UsersWithRoleResponse {
  success: boolean
  data: {
    users: User[]
    total: number
    page: number
    limit: number
    role: Role
  }
  message?: string
}

// Page Access Control Types
export interface PagePermission {
  page_id: string
  page_path: string
  page_name: string
  page_category: string
  view: boolean
  access: boolean
}

export interface PagePermissionsResponse {
  success: boolean
  permissions: PagePermission[]
  message?: string
}

export interface PageAccessCheckResponse {
  allowed: boolean
  message?: string
}