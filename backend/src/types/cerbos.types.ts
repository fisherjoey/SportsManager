export type ResourceType =
  | 'game'
  | 'assignment'
  | 'referee'
  | 'user'
  | 'organization'
  | 'region'
  | 'expense'
  | 'budget'
  | 'communication'
  | 'document'
  | 'role'
  | 'permission'
  | 'team'
  | 'league'
  | 'location'
  | 'post'
  | 'referee_level'
  | 'calendar'
  | 'financial_report';

export type ResourceAction =
  | 'view'
  | 'view:list'
  | 'list'
  | 'view:details'
  | 'view:unread_count'
  | 'view:pending_acknowledgments'
  | 'view:budget_variance'
  | 'view:cash_flow'
  | 'view:expense_analysis'
  | 'view:payroll_summary'
  | 'view:kpis'
  | 'create'
  | 'create:kpi'
  | 'create:version'
  | 'update'
  | 'delete'
  | 'assign_referee'
  | 'unassign_referee'
  | 'change_status'
  | 'approve'
  | 'reject'
  | 'export'
  | 'import'
  | 'manage_users'
  | 'manage_roles'
  | 'manage_permissions'
  | 'manage_regions'
  | 'view_audit_logs'
  | 'bulk_create'
  | 'generate'
  | 'publish'
  | 'archive'
  | 'acknowledge'
  | 'download'
  | 'admin:view_recipients'
  | 'admin:view_stats'
  | 'admin:view_acknowledgments'
  | 'view:games_calendar'
  | 'admin:configure_sync'
  | 'admin:view_sync_status'
  | 'admin:disable_sync'
  | 'admin:trigger_sync'
  | 'admin:upload_calendar';

export interface CerbosPrincipal {
  id: string;
  roles: string[];
  attr: {
    organizationId: string;
    primaryRegionId?: string;
    regionIds: string[];
    permissions: string[];
    email?: string;
    isActive: boolean;
    certificationLevel?: string;
  };
}

export interface CerbosResource {
  kind: ResourceType;
  id: string;
  attr: {
    organizationId?: string;
    regionId?: string;
    ownerId?: string;
    createdBy?: string;
    status?: string;
    level?: string;
    isPublic?: boolean;
    [key: string]: any;
  };
}

export interface CerbosCheckResult {
  allowed: boolean;
  validationErrors?: string[];
}

export interface CerbosCheckOptions {
  principal: CerbosPrincipal;
  resource: CerbosResource;
  action: ResourceAction;
  auxData?: Record<string, any>;
}

export interface CerbosBatchCheckOptions {
  principal: CerbosPrincipal;
  resources: Array<{
    resource: CerbosResource;
    actions: ResourceAction[];
  }>;
}

export interface CerbosBatchCheckResult {
  resourceId: string;
  actions: Record<ResourceAction, boolean>;
}

export interface CerbosQueryPlanOptions {
  principal: CerbosPrincipal;
  resource: {
    kind: ResourceType;
    attr?: Record<string, any>;
  };
  action: ResourceAction;
}

export interface CerbosQueryPlanResult {
  filter: {
    kind: 'ALWAYS_ALLOWED' | 'ALWAYS_DENIED' | 'CONDITIONAL';
    condition?: string;
  };
  validationErrors?: string[];
}