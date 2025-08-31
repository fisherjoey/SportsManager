// Audit Log Types

export interface AuditLogEntry {
  id: string
  user_id: string
  user?: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  action: AuditAction
  resource_type: string
  resource_id: string
  resource_name?: string
  category?: string
  description?: string
  ip_address?: string
  user_agent?: string
  session_id?: string
  details?: Record<string, any>
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  diff?: AuditDiff
  success: boolean
  error_message?: string
  timestamp: string
  created_at: string
}

export type AuditAction = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'permission_grant'
  | 'permission_revoke'
  | 'role_assign'
  | 'role_remove'
  | 'password_change'
  | 'password_reset'
  | 'export'
  | 'import'
  | 'backup'
  | 'restore'
  | 'configuration_change'
  | 'system_event'

export interface AuditDiff {
  added: Record<string, any>
  removed: Record<string, any>
  modified: Record<string, {
    old: any
    new: any
  }>
}

export interface AuditLogFilters {
  dateRange?: {
    from: Date
    to: Date
  }
  users?: string[]
  actions?: AuditAction[]
  resourceTypes?: string[]
  categories?: string[]
  success?: boolean
  search?: string
  ipAddress?: string
}

export interface AuditLogStats {
  total_entries: number
  success_rate: number
  actions_by_type: Record<AuditAction, number>
  top_users: Array<{
    user_id: string
    user_name: string
    user_email: string
    count: number
  }>
  recent_activity: Array<{
    hour: string
    count: number
  }>
  error_rate: number
  resource_types: Record<string, number>
  categories: Record<string, number>
}

export interface AuditLogResponse {
  success: boolean
  data: {
    entries: AuditLogEntry[]
    total: number
    page: number
    limit: number
    stats?: AuditLogStats
  }
  message?: string
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx'
  filters?: AuditLogFilters
  includeStats?: boolean
  dateRange?: {
    from: Date
    to: Date
  }
}

export interface AuditLogPreset {
  id: string
  name: string
  description: string
  filters: AuditLogFilters
  icon?: string
}

// Pre-defined filter presets
export const AUDIT_LOG_PRESETS: AuditLogPreset[] = [
  {
    id: 'today',
    name: 'Today',
    description: 'All activities from today',
    filters: {
      dateRange: {
        from: new Date(new Date().setHours(0, 0, 0, 0)),
        to: new Date(new Date().setHours(23, 59, 59, 999))
      }
    },
    icon: 'Calendar'
  },
  {
    id: 'this-week',
    name: 'This Week',
    description: 'All activities from this week',
    filters: {
      dateRange: {
        from: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())),
        to: new Date()
      }
    },
    icon: 'CalendarDays'
  },
  {
    id: 'failed-actions',
    name: 'Failed Actions',
    description: 'Actions that resulted in errors',
    filters: {
      success: false
    },
    icon: 'AlertTriangle'
  },
  {
    id: 'permission-changes',
    name: 'Permission Changes',
    description: 'Permission and role modifications',
    filters: {
      actions: ['permission_grant', 'permission_revoke', 'role_assign', 'role_remove']
    },
    icon: 'Shield'
  },
  {
    id: 'resource-modifications',
    name: 'Resource Changes',
    description: 'Resource create, update, and delete actions',
    filters: {
      actions: ['create', 'update', 'delete']
    },
    icon: 'FileEdit'
  },
  {
    id: 'login-activity',
    name: 'Login Activity',
    description: 'User authentication events',
    filters: {
      actions: ['login', 'logout', 'password_change', 'password_reset']
    },
    icon: 'LogIn'
  },
  {
    id: 'system-events',
    name: 'System Events',
    description: 'System configuration and maintenance events',
    filters: {
      actions: ['system_event', 'configuration_change', 'backup', 'restore']
    },
    icon: 'Settings'
  }
]

// Action configuration for UI display
export const ACTION_CONFIG: Record<AuditAction, {
  label: string
  icon: string
  color: string
  description: string
}> = {
  create: {
    label: 'Create',
    icon: 'Plus',
    color: 'text-green-600 bg-green-50 border-green-200',
    description: 'Resource created'
  },
  read: {
    label: 'Read',
    icon: 'Eye',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    description: 'Resource accessed'
  },
  update: {
    label: 'Update',
    icon: 'Edit',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    description: 'Resource modified'
  },
  delete: {
    label: 'Delete',
    icon: 'Trash',
    color: 'text-red-600 bg-red-50 border-red-200',
    description: 'Resource deleted'
  },
  login: {
    label: 'Login',
    icon: 'LogIn',
    color: 'text-green-600 bg-green-50 border-green-200',
    description: 'User logged in'
  },
  logout: {
    label: 'Logout',
    icon: 'LogOut',
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    description: 'User logged out'
  },
  permission_grant: {
    label: 'Grant Permission',
    icon: 'ShieldCheck',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    description: 'Permission granted'
  },
  permission_revoke: {
    label: 'Revoke Permission',
    icon: 'ShieldX',
    color: 'text-red-600 bg-red-50 border-red-200',
    description: 'Permission revoked'
  },
  role_assign: {
    label: 'Assign Role',
    icon: 'UserCheck',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    description: 'Role assigned to user'
  },
  role_remove: {
    label: 'Remove Role',
    icon: 'UserX',
    color: 'text-red-600 bg-red-50 border-red-200',
    description: 'Role removed from user'
  },
  password_change: {
    label: 'Password Change',
    icon: 'Key',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    description: 'Password changed'
  },
  password_reset: {
    label: 'Password Reset',
    icon: 'KeyRound',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    description: 'Password reset'
  },
  export: {
    label: 'Export',
    icon: 'Download',
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    description: 'Data exported'
  },
  import: {
    label: 'Import',
    icon: 'Upload',
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    description: 'Data imported'
  },
  backup: {
    label: 'Backup',
    icon: 'Archive',
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    description: 'System backup'
  },
  restore: {
    label: 'Restore',
    icon: 'RotateCcw',
    color: 'text-teal-600 bg-teal-50 border-teal-200',
    description: 'System restore'
  },
  configuration_change: {
    label: 'Config Change',
    icon: 'Settings',
    color: 'text-slate-600 bg-slate-50 border-slate-200',
    description: 'Configuration modified'
  },
  system_event: {
    label: 'System Event',
    icon: 'Server',
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    description: 'System event'
  }
}