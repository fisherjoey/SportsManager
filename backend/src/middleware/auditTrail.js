const db = require('../config/database');

/**
 * Enhanced audit trail system for tracking administrative actions
 * and sensitive operations across the application
 */

/**
 * Audit event types for categorization
 */
const AUDIT_EVENTS = {
  // Authentication events
  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  AUTH_LOGIN_FAILURE: 'auth.login.failure',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_REGISTER: 'auth.register',
  AUTH_PASSWORD_RESET: 'auth.password_reset',
  AUTH_TOKEN_REFRESH: 'auth.token_refresh',
  
  // User management
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ROLE_CHANGE: 'user.role_change',
  USER_STATUS_CHANGE: 'user.status_change',
  
  // Game management
  GAME_CREATE: 'game.create',
  GAME_UPDATE: 'game.update',
  GAME_DELETE: 'game.delete',
  GAME_CANCEL: 'game.cancel',
  GAME_STATUS_CHANGE: 'game.status_change',
  
  // Assignment management
  ASSIGNMENT_CREATE: 'assignment.create',
  ASSIGNMENT_UPDATE: 'assignment.update',
  ASSIGNMENT_DELETE: 'assignment.delete',
  ASSIGNMENT_ACCEPT: 'assignment.accept',
  ASSIGNMENT_DECLINE: 'assignment.decline',
  ASSIGNMENT_BULK_OPERATION: 'assignment.bulk_operation',
  
  // Administrative actions
  ADMIN_SETTINGS_UPDATE: 'admin.settings_update',
  ADMIN_DATA_EXPORT: 'admin.data_export',
  ADMIN_DATA_IMPORT: 'admin.data_import',
  ADMIN_BULK_OPERATION: 'admin.bulk_operation',
  ADMIN_SYSTEM_CHANGE: 'admin.system_change',
  
  // Security events
  SECURITY_UNAUTHORIZED_ACCESS: 'security.unauthorized_access',
  SECURITY_RATE_LIMIT_EXCEEDED: 'security.rate_limit_exceeded',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
  SECURITY_DATA_ACCESS: 'security.data_access',
  
  // Data operations
  DATA_EXPORT: 'data.export',
  DATA_IMPORT: 'data.import',
  DATA_BULK_UPDATE: 'data.bulk_update',
  DATA_SENSITIVE_ACCESS: 'data.sensitive_access'
};

/**
 * Audit severity levels
 */
const AUDIT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Create audit log entry
 * @param {Object} options - Audit log options
 */
async function createAuditLog({
  event_type,
  user_id = null,
  user_email = null,
  ip_address = null,
  user_agent = null,
  resource_type = null,
  resource_id = null,
  old_values = null,
  new_values = null,
  additional_data = null,
  severity = AUDIT_SEVERITY.MEDIUM,
  success = true,
  error_message = null,
  request_path = null,
  request_method = null
}) {
  try {
    // Ensure we have either user_id or user_email for traceability
    if (!user_id && !user_email) {
      console.warn('Audit log created without user identification');
    }
    
    const auditEntry = {
      event_type,
      user_id,
      user_email,
      ip_address,
      user_agent,
      resource_type,
      resource_id,
      old_values: old_values ? JSON.stringify(old_values) : null,
      new_values: new_values ? JSON.stringify(new_values) : null,
      additional_data: additional_data ? JSON.stringify(additional_data) : null,
      severity,
      success,
      error_message,
      request_path,
      request_method,
      created_at: new Date()
    };
    
    // Check if audit_logs table exists, create if it doesn't
    const tableExists = await db.schema.hasTable('audit_logs');
    if (!tableExists) {
      await createAuditLogsTable();
    }
    
    await db('audit_logs').insert(auditEntry);
    
    // Log critical events to console for immediate attention
    if (severity === AUDIT_SEVERITY.CRITICAL) {
      console.error('CRITICAL AUDIT EVENT:', {
        event_type,
        user_id,
        user_email,
        ip_address,
        resource_type,
        resource_id,
        success,
        error_message
      });
    }
    
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking the main request flow
  }
}

/**
 * Create audit_logs table if it doesn't exist
 */
async function createAuditLogsTable() {
  try {
    await db.schema.createTable('audit_logs', function(table) {
      table.increments('id').primary();
      table.string('event_type', 100).notNullable().index();
      table.integer('user_id').nullable().index();
      table.string('user_email', 255).nullable().index();
      table.string('ip_address', 45).nullable(); // IPv6 compatible
      table.text('user_agent').nullable();
      table.string('resource_type', 50).nullable().index();
      table.string('resource_id', 100).nullable().index();
      table.text('old_values').nullable();
      table.text('new_values').nullable();
      table.text('additional_data').nullable();
      table.enum('severity', ['low', 'medium', 'high', 'critical']).defaultTo('medium').index();
      table.boolean('success').defaultTo(true).index();
      table.text('error_message').nullable();
      table.string('request_path', 500).nullable();
      table.string('request_method', 10).nullable();
      table.timestamp('created_at').defaultTo(db.fn.now()).index();
      
      // Composite indexes for common queries
      table.index(['user_id', 'created_at']);
      table.index(['event_type', 'created_at']);
      table.index(['severity', 'created_at']);
      table.index(['success', 'created_at']);
    });
    
    console.log('Audit logs table created successfully');
  } catch (error) {
    console.error('Failed to create audit logs table:', error);
  }
}

/**
 * Middleware to automatically log API requests
 */
function auditMiddleware(options = {}) {
  const {
    logAllRequests = false,
    logAuthRequests = true,
    logAdminRequests = true,
    logFailedRequests = true,
    excludePaths = ['/api/health', '/uploads'],
    sensitiveEndpoints = ['/api/auth', '/api/admin', '/api/reports']
  } = options;
  
  return async (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    // Capture response data
    res.send = function(data) {
      const responseTime = Date.now() - startTime;
      const shouldLog = determineIfShouldLog(req, res, {
        logAllRequests,
        logAuthRequests,
        logAdminRequests,
        logFailedRequests,
        excludePaths,
        sensitiveEndpoints
      });
      
      if (shouldLog) {
        logRequest(req, res, responseTime, data);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
}

/**
 * Determine if request should be logged
 */
function determineIfShouldLog(req, res, options) {
  const { logAllRequests, logAuthRequests, logAdminRequests, logFailedRequests, excludePaths, sensitiveEndpoints } = options;
  
  // Skip excluded paths
  if (excludePaths.some(path => req.path.startsWith(path))) {
    return false;
  }
  
  // Always log failed requests (4xx, 5xx)
  if (logFailedRequests && (res.statusCode >= 400)) {
    return true;
  }
  
  // Log authentication requests
  if (logAuthRequests && req.path.startsWith('/api/auth')) {
    return true;
  }
  
  // Log admin requests
  if (logAdminRequests && req.user) {
    const userRoles = req.user.roles || [req.user.role];
    if (userRoles.includes('admin') || req.user.role === 'admin') {
      return true;
    }
  }
  
  // Log sensitive endpoints
  if (sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
    return true;
  }
  
  // Log all requests if enabled
  return logAllRequests;
}

/**
 * Log the request details
 */
async function logRequest(req, res, responseTime, responseData) {
  try {
    const isSuccess = res.statusCode < 400;
    const severity = determineSeverity(req, res);
    const eventType = determineEventType(req, res);
    
    await createAuditLog({
      event_type: eventType,
      user_id: req.user?.userId || null,
      user_email: req.user?.email || null,
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent'],
      request_path: req.path,
      request_method: req.method,
      success: isSuccess,
      severity: severity,
      error_message: isSuccess ? null : getErrorMessage(responseData),
      additional_data: {
        response_time: responseTime,
        status_code: res.statusCode,
        query_params: req.query,
        body_size: req.headers['content-length'] || 0,
        response_size: responseData ? JSON.stringify(responseData).length : 0
      }
    });
  } catch (error) {
    console.error('Failed to log request:', error);
  }
}

/**
 * Determine audit severity based on request/response
 */
function determineSeverity(req, res) {
  // Critical for authentication failures, security issues
  if (req.path.startsWith('/api/auth') && res.statusCode >= 400) {
    return AUDIT_SEVERITY.CRITICAL;
  }
  
  // High for admin operations, sensitive data access
  if (req.user) {
    const userRoles = req.user.roles || [req.user.role];
    if (userRoles.includes('admin') || req.user.role === 'admin') {
      return AUDIT_SEVERITY.HIGH;
    }
  }
  
  // High for server errors
  if (res.statusCode >= 500) {
    return AUDIT_SEVERITY.HIGH;
  }
  
  // Medium for client errors
  if (res.statusCode >= 400) {
    return AUDIT_SEVERITY.MEDIUM;
  }
  
  return AUDIT_SEVERITY.LOW;
}

/**
 * Determine event type based on request
 */
function determineEventType(req, res) {
  const path = req.path;
  const method = req.method;
  
  // Authentication events
  if (path.includes('/login')) {
    return res.statusCode < 400 ? AUDIT_EVENTS.AUTH_LOGIN_SUCCESS : AUDIT_EVENTS.AUTH_LOGIN_FAILURE;
  }
  if (path.includes('/register')) {
    return AUDIT_EVENTS.AUTH_REGISTER;
  }
  if (path.includes('/logout')) {
    return AUDIT_EVENTS.AUTH_LOGOUT;
  }
  
  // Resource-based events
  if (path.includes('/games')) {
    if (method === 'POST') return AUDIT_EVENTS.GAME_CREATE;
    if (method === 'PUT' || method === 'PATCH') return AUDIT_EVENTS.GAME_UPDATE;
    if (method === 'DELETE') return AUDIT_EVENTS.GAME_DELETE;
  }
  
  if (path.includes('/assignments')) {
    if (method === 'POST') return AUDIT_EVENTS.ASSIGNMENT_CREATE;
    if (method === 'PUT' || method === 'PATCH') return AUDIT_EVENTS.ASSIGNMENT_UPDATE;
    if (method === 'DELETE') return AUDIT_EVENTS.ASSIGNMENT_DELETE;
  }
  
  if (path.includes('/users') || path.includes('/referees')) {
    if (method === 'POST') return AUDIT_EVENTS.USER_CREATE;
    if (method === 'PUT' || method === 'PATCH') return AUDIT_EVENTS.USER_UPDATE;
    if (method === 'DELETE') return AUDIT_EVENTS.USER_DELETE;
  }
  
  // Default event types
  if (res.statusCode >= 400) {
    return AUDIT_EVENTS.SECURITY_UNAUTHORIZED_ACCESS;
  }
  
  return `api.${method.toLowerCase()}.${path.split('/')[2] || 'unknown'}`;
}

/**
 * Get client IP address from request
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for'] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip ||
         'unknown';
}

/**
 * Extract error message from response data
 */
function getErrorMessage(responseData) {
  if (typeof responseData === 'string') {
    try {
      const parsed = JSON.parse(responseData);
      return parsed.error || parsed.message || 'Unknown error';
    } catch {
      return responseData.substring(0, 500); // Limit error message length
    }
  }
  
  if (responseData && typeof responseData === 'object') {
    return responseData.error || responseData.message || 'Unknown error';
  }
  
  return 'Unknown error';
}

/**
 * Query audit logs with filtering
 */
async function queryAuditLogs({
  user_id = null,
  event_type = null,
  severity = null,
  success = null,
  date_from = null,
  date_to = null,
  resource_type = null,
  page = 1,
  limit = 50
}) {
  try {
    let query = db('audit_logs')
      .select('*')
      .orderBy('created_at', 'desc');
    
    if (user_id) query = query.where('user_id', user_id);
    if (event_type) query = query.where('event_type', event_type);
    if (severity) query = query.where('severity', severity);
    if (success !== null) query = query.where('success', success);
    if (resource_type) query = query.where('resource_type', resource_type);
    if (date_from) query = query.where('created_at', '>=', date_from);
    if (date_to) query = query.where('created_at', '<=', date_to);
    
    const offset = (page - 1) * limit;
    const logs = await query.limit(limit).offset(offset);
    
    // Get total count for pagination
    const countQuery = db('audit_logs').count('* as total');
    if (user_id) countQuery.where('user_id', user_id);
    if (event_type) countQuery.where('event_type', event_type);
    if (severity) countQuery.where('severity', severity);
    if (success !== null) countQuery.where('success', success);
    if (resource_type) countQuery.where('resource_type', resource_type);
    if (date_from) countQuery.where('created_at', '>=', date_from);
    if (date_to) countQuery.where('created_at', '<=', date_to);
    
    const [{ total }] = await countQuery;
    
    return {
      logs: logs.map(log => ({
        ...log,
        old_values: log.old_values ? JSON.parse(log.old_values) : null,
        new_values: log.new_values ? JSON.parse(log.new_values) : null,
        additional_data: log.additional_data ? JSON.parse(log.additional_data) : null
      })),
      pagination: {
        page,
        limit,
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Failed to query audit logs:', error);
    throw error;
  }
}

module.exports = {
  AUDIT_EVENTS,
  AUDIT_SEVERITY,
  createAuditLog,
  auditMiddleware,
  queryAuditLogs,
  createAuditLogsTable
};