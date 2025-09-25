// Resource Management Types

export interface Resource {
  id: number | string
  title: string
  description?: string
  content?: string
  type: 'document' | 'link' | 'video' | 'mixed'
  category_id: string | number
  slug: string
  external_url?: string
  status: 'published' | 'draft' | 'archived'
  created_at: string
  updated_at: string
  created_by: string
  category?: ResourceCategory
  permissions?: ResourcePermission[]
  access_level?: AccessLevel
}

export interface ResourceCategory {
  id: string | number
  name: string
  description?: string
  icon?: string
  color?: string
  created_at: string
  updated_at: string
  parent_id?: string | number
  resources_count?: number
  permissions?: CategoryPermission[]
}

export interface ResourcePermission {
  id: string
  resource_id: string | number
  role_id: string
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
  can_manage: boolean
  created_at: string
  created_by: string
  role?: {
    id: string
    name: string
    code: string
  }
}

export interface CategoryPermission {
  id: string
  category_id: string | number
  role_id: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  can_manage: boolean
  created_at: string
  created_by: string
  role?: {
    id: string
    name: string
    code: string
  }
}

export type PermissionType = 'view' | 'create' | 'edit' | 'delete' | 'manage'

export type AccessLevel = 'public' | 'restricted' | 'private' | 'role-based'

export interface PermissionMatrix {
  roleId: string
  roleName: string
  permissions: {
    [key in PermissionType]: boolean
  }
  inherited?: boolean
  source?: 'direct' | 'category' | 'system'
}

export interface PermissionSummary {
  total_roles: number
  roles_with_access: number
  access_level: AccessLevel
  is_public: boolean
  restricted_roles: string[]
}

// API Response Types
export interface ResourcesResponse {
  success: boolean
  data: {
    resources: Resource[]
    total: number
    page: number
    limit: number
  }
  message?: string
}

export interface ResourceResponse {
  success: boolean
  data: {
    resource: Resource
  }
  message?: string
}

export interface CategoriesResponse {
  success: boolean
  data: {
    categories: ResourceCategory[]
    total: number
  }
  message?: string
}

export interface PermissionsResponse {
  success: boolean
  data: {
    resource_permissions: ResourcePermission[]
    category_permissions: CategoryPermission[]
    inherited_permissions: PermissionMatrix[]
    summary: PermissionSummary
  }
  message?: string
}

// Form Types
export interface ResourcePermissionForm {
  resource_id: string | number
  role_permissions: {
    role_id: string
    can_view: boolean
    can_edit: boolean
    can_delete: boolean
    can_manage: boolean
  }[]
}

export interface CategoryPermissionForm {
  category_id: string | number
  role_permissions: {
    role_id: string
    can_view: boolean
    can_create: boolean
    can_edit: boolean
    can_delete: boolean
    can_manage: boolean
  }[]
  apply_to_existing: boolean
}

export interface ResourceFormData {
  id?: number | string
  title: string
  description?: string
  content?: string
  type: Resource['type']
  category_id: string | number
  slug: string
  external_url?: string
  status: Resource['status']
  permissions?: ResourcePermissionForm
}