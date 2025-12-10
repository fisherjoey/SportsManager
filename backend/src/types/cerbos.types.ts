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
  | 'financial_report'
  | 'financial_transaction'
  | 'cerbos_policy'
  | 'report'
  | 'game_fee'
  | 'payment_method'
  | 'invitation'
  | 'tournament'
  | 'ai_suggestion'
  | 'financial_dashboard'
  | 'employee'
  | 'maintenance'
  | 'page'
  | 'mentorship';

export type ResourceAction =
  | 'view'
  | 'access'
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
  | 'view:resources'
  | 'view:resource_details'
  | 'view:actions'
  | 'view:roles'
  | 'view:derived_roles'
  | 'view:available'
  | 'view:referee_performance'
  | 'view:assignment_patterns'
  | 'view:financial_summary'
  | 'view:availability_gaps'
  | 'view:referee_payments'
  | 'view:distances'
  | 'create'
  | 'create:kpi'
  | 'create:version'
  | 'create:resource'
  | 'create:action'
  | 'update'
  | 'update:resource'
  | 'update:roles'
  | 'delete'
  | 'delete:resource'
  | 'delete:action'
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
  | 'admin:update_user_roles'
  | 'admin:view_user_roles'
  | 'view:games_calendar'
  | 'admin:configure_sync'
  | 'admin:view_sync_status'
  | 'admin:disable_sync'
  | 'admin:trigger_sync'
  | 'admin:upload_calendar'
  | 'admin:manage_distances'
  | 'reload'
  | 'view:stats'
  | 'manage'
  | 'accept'
  | 'create:games'
  | 'view:games'
  | 'view:analytics'
  | 'view:mentees'
  | 'view:pending'
  | 'view:categories'
  | 'view:vendors'
  | 'view:policies'
  | 'update:policy';

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