/**
 * @fileoverview Authentication and authorization type definitions
 * @description TypeScript interfaces for authentication, authorization, permissions,
 * JWT tokens, and security-related functionality in the Sports Manager application.
 */

import { Request } from 'express';
import { UUID, Timestamp, UserRole } from './index';
import { User, RoleEntity } from './database.types';

// JWT and Token types
export interface JWTPayload {
  userId: UUID;
  email: string;
  role: UserRole;
  permissions: string[];
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
}

export interface RefreshTokenPayload {
  userId: UUID;
  tokenId: UUID;
  type: 'refresh';
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  tokenType: 'Bearer';
}

export interface DecodedToken {
  valid: boolean;
  expired: boolean;
  decoded: JWTPayload | null;
  error?: string;
}

// Authentication Context
export interface AuthenticatedUser {
  id: UUID;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  permissions: string[];
  resource_permissions: Record<string, string[]>;
  roles: RoleEntity[];
  last_login?: Timestamp;
  session_id?: string;
}

export interface AuthenticationContext {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  refreshToken: string | null;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

// Permission and Role types
export interface Permission {
  id: UUID;
  name: string;
  resource: string;
  action: string;
  description?: string;
  is_system: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ResourcePermission {
  resource: string;
  actions: string[];
  description?: string;
}

export interface PermissionCheck {
  permission: string;
  resource?: string;
  resourceId?: UUID;
  context?: Record<string, any>;
}

export interface PermissionResult {
  granted: boolean;
  reason?: string;
  context?: Record<string, any>;
}

export interface RolePermissionSet {
  role_id: UUID;
  role_name: string;
  permissions: string[];
  resource_permissions: Record<string, string[]>;
  inherited_from?: UUID[]; // For role hierarchy
}

// Authentication Events and Audit
export interface AuthenticationEvent {
  user_id?: UUID;
  event_type: AuthEventType;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  timestamp: Timestamp;
  success: boolean;
  failure_reason?: string;
}

export enum AuthEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_CONFIRM = 'password_reset_confirm',
  EMAIL_VERIFICATION = 'email_verification',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  PERMISSION_DENIED = 'permission_denied'
}

// Session Management
export interface UserSession {
  id: UUID;
  user_id: UUID;
  token_id: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  created_at: Timestamp;
  last_activity: Timestamp;
  expires_at: Timestamp;
  device_info?: DeviceInfo;
}

export interface DeviceInfo {
  platform?: string;
  browser?: string;
  version?: string;
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
}

// Security Configuration
export interface SecurityConfig {
  jwt: {
    secret: string;
    accessTokenExpiry: string; // e.g., '15m'
    refreshTokenExpiry: string; // e.g., '7d'
    issuer: string;
    audience: string;
    algorithm: 'HS256' | 'RS256';
  };
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number; // number of previous passwords to prevent reuse
    maxAge: number; // days before password expires
  };
  session: {
    maxConcurrentSessions: number;
    sessionTimeout: number; // minutes
    rememberMeDuration: number; // days
  };
  rateLimit: {
    loginAttempts: number;
    lockoutDuration: number; // minutes
    windowSize: number; // minutes
  };
  emailVerification: {
    required: boolean;
    tokenExpiry: number; // hours
    resendDelay: number; // minutes
  };
}

// Multi-factor Authentication (for future use)
export interface MFAConfig {
  enabled: boolean;
  methods: MFAMethod[];
  required_for_roles?: UserRole[];
  backup_codes_count: number;
}

export enum MFAMethod {
  TOTP = 'totp', // Time-based One-Time Password (Google Authenticator, Authy)
  SMS = 'sms',
  EMAIL = 'email',
  BACKUP_CODES = 'backup_codes'
}

export interface MFAChallenge {
  id: UUID;
  user_id: UUID;
  method: MFAMethod;
  challenge_data: string;
  created_at: Timestamp;
  expires_at: Timestamp;
  attempts: number;
  max_attempts: number;
}

// API Key Authentication (for external integrations)
export interface APIKey {
  id: UUID;
  name: string;
  key_hash: string;
  user_id: UUID;
  permissions: string[];
  rate_limit: number; // requests per minute
  is_active: boolean;
  last_used?: Timestamp;
  expires_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: UUID;
}

// OAuth Integration (for future social login)
export interface OAuthProvider {
  id: string;
  name: string;
  client_id: string;
  client_secret: string;
  authorization_url: string;
  token_url: string;
  user_info_url: string;
  scopes: string[];
  is_active: boolean;
}

export interface OAuthState {
  state: string;
  provider: string;
  redirect_uri?: string;
  created_at: Timestamp;
  expires_at: Timestamp;
}

// Password Policy and Validation
export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommon: boolean;
  preventUserInfo: boolean; // prevent using name, email parts
  preventReuse: number;
  maxAge?: number; // days
}

export interface PasswordValidationResult {
  valid: boolean;
  score: number; // 0-100
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Account Security
export interface AccountSecuritySettings {
  user_id: UUID;
  two_factor_enabled: boolean;
  backup_codes_generated: boolean;
  security_questions_set: boolean;
  last_password_change: Timestamp;
  password_change_required: boolean;
  account_locked: boolean;
  locked_at?: Timestamp;
  locked_until?: Timestamp;
  failed_login_attempts: number;
  last_failed_login?: Timestamp;
  suspicious_activity_detected: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
}

// Middleware and Guard types
export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: UserRole[];
  permissions?: string[];
  requireAll?: boolean; // require all permissions vs any
  resourcePermissions?: {
    resource: string;
    actions: string[];
  };
}

export interface RoleGuardOptions {
  roles: UserRole[];
  requireAll?: boolean;
}

export interface PermissionGuardOptions {
  permissions: string[];
  requireAll?: boolean;
  resource?: string;
  resourceId?: string;
}

// Request context extensions (for Express middleware)
export interface AuthenticatedRequest<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
  Locals extends Record<string, any> = Record<string, any>
> extends Request<P, ResBody, ReqBody, ReqQuery, Locals> {
  user?: AuthenticatedUser;
  session?: UserSession;
  permissions?: string[];
  hasPermission?: (permission: string) => boolean;
  hasRole?: (role: UserRole) => boolean;
  requirePermission?: (permission: string) => void;
  requireRole?: (role: UserRole) => void;
}

// Login rate limiting
export interface LoginAttempt {
  ip_address: string;
  email?: string;
  timestamp: Timestamp;
  success: boolean;
  user_agent?: string;
}

export interface RateLimitStatus {
  attempts: number;
  remaining: number;
  reset_time: Timestamp;
  locked: boolean;
  locked_until?: Timestamp;
}

// External authentication integration
export interface ExternalAuthProvider {
  provider: string;
  provider_id: string;
  user_id: UUID;
  access_token?: string;
  refresh_token?: string;
  expires_at?: Timestamp;
  profile_data?: Record<string, any>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Authorization decision context
export interface AuthorizationContext {
  user: AuthenticatedUser;
  resource?: string;
  action?: string;
  resourceId?: UUID;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: Timestamp;
}