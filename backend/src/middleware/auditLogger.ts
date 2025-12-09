// @ts-nocheck

/**
 * Global Audit Logger Middleware
 * 
 * This middleware automatically logs resource operations using the ResourceAuditService.
 * It captures successful operations (status < 400) and logs relevant metadata including
 * before/after states for updates, IP addresses, user agents, and request details.
 * 
 * Features:
 * - Automatic logging of successful resource operations
 * - Before/after state capture for updates
 * - Sensitive data filtering (passwords, tokens, etc.)
 * - Performance optimized - non-blocking audit logging
 * - Configurable resource route patterns
 * - IP address and user agent tracking
 * - Request/response metadata capture
 */

import ResourceAuditService from '../services/ResourceAuditService';
import logger from '../utils/logger';

class AuditLogger {
  constructor() {
    this.auditService = new ResourceAuditService();
    this.sensitiveFields = new Set([
      'password',
      'password_hash',
      'token',
      'access_token',
      'refresh_token',
      'secret',
      'api_key',
      'private_key',
      'ssn',
      'social_security',
      'credit_card',
      'bank_account'
    ]);
  }

  /**
   * Create audit middleware with configuration options
   * @param {Object} options - Configuration options
   * @param {Array} options.resourceRoutes - Array of route patterns to audit (default: all /api/ routes)
   * @param {Array} options.excludeRoutes - Array of route patterns to exclude from auditing
   * @param {boolean} options.logViewOperations - Whether to log GET/view operations (default: false)
   * @param {boolean} options.captureRequestBody - Whether to capture request body for creates/updates (default: true)
   * @param {boolean} options.captureResponseData - Whether to capture response data (default: false)
   * @param {number} options.maxDataSize - Maximum size of captured data in bytes (default: 10KB)
   * @returns {Function} Express middleware function
   */
  middleware(options = {}) {
    const {
      resourceRoutes = ['/api/'],
      excludeRoutes = ['/api/auth', '/api/health', '/api/performance'],
      logViewOperations = false,
      captureRequestBody = true,
      captureResponseData = false,
      maxDataSize = 10240 // 10KB
    } = options;

    return (req, res, next) => {
      const startTime = Date.now();
      let originalData = null;
      const shouldAudit = this.shouldAuditRequest(req, resourceRoutes, excludeRoutes, logViewOperations);

      if (!shouldAudit) {
        return next();
      }

      // Store original send function
      const originalSend = res.send;
      const originalJson = res.json;

      // Capture original data for updates (before changes)
      if (req.method === 'PUT' || req.method === 'PATCH') {
        originalData = this.extractOriginalData(req);
      }

      // Override response methods to capture audit data
      const auditResponseHandler = (responseData) => {
        // Only log successful operations (status < 400)
        if (res.statusCode < 400) {
          // Use setImmediate to make audit logging non-blocking
          setImmediate(() => {
            this.logResourceOperation(req, res, {
              originalData,
              responseData: captureResponseData ? responseData : null,
              responseTime: Date.now() - startTime,
              captureRequestBody,
              maxDataSize
            }).catch(error => {
              logger.warn('Audit logging failed:', error.message);
            });
          });
        }
      };

      // Override res.send
      res.send = function(body) {
        auditResponseHandler(body);
        return originalSend.call(this, body);
      };

      // Override res.json  
      res.json = function(obj) {
        auditResponseHandler(obj);
        return originalJson.call(this, obj);
      };

      next();
    };
  }

  /**
   * Determine if the request should be audited
   * @private
   */
  shouldAuditRequest(req, resourceRoutes, excludeRoutes, logViewOperations) {
    const path = req.path;
    const method = req.method;

    // Check if path should be excluded
    if (excludeRoutes.some(route => path.startsWith(route))) {
      return false;
    }

    // Check if path matches resource routes
    const matchesResourceRoute = resourceRoutes.some(route => path.startsWith(route));
    if (!matchesResourceRoute) {
      return false;
    }

    // Skip GET requests unless explicitly enabled
    if (method === 'GET' && !logViewOperations) {
      return false;
    }

    // Skip OPTIONS and HEAD requests
    if (['OPTIONS', 'HEAD'].includes(method)) {
      return false;
    }

    return true;
  }

  /**
   * Extract original data for update operations
   * @private
   */
  extractOriginalData(req) {
    // This could be enhanced to fetch current data from database
    // For now, we'll rely on the route handlers to provide it
    return req.originalData || null;
  }

  /**
   * Log the resource operation using ResourceAuditService
   * @private
   */
  async logResourceOperation(req, res, options) {
    try {
      const {
        originalData,
        responseData,
        responseTime,
        captureRequestBody,
        maxDataSize
      } = options;

      const operation = this.determineOperation(req.method, req.path);
      if (!operation) {
        return; // Skip unknown operations
      }

      const metadata = this.extractMetadata(req, res, responseTime);
      const resourceInfo = this.extractResourceInfo(req, responseData);
      const auditData = this.prepareAuditData(req, originalData, captureRequestBody, maxDataSize);

      // Map to ResourceAuditService method based on operation
      switch (operation.action) {
        case 'create':
          await this.auditService.logResourceCreation(
            req.user?.userId || req.user?.id,
            resourceInfo.resourceId,
            auditData.newData,
            metadata
          );
          break;

        case 'view':
          await this.auditService.logResourceView(
            req.user?.userId || req.user?.id,
            resourceInfo.resourceId,
            metadata
          );
          break;

        case 'edit':
          await this.auditService.logResourceUpdate(
            req.user?.userId || req.user?.id,
            resourceInfo.resourceId,
            auditData.oldData,
            auditData.newData,
            metadata
          );
          break;

        case 'delete':
          await this.auditService.logResourceDeletion(
            req.user?.userId || req.user?.id,
            resourceInfo.resourceId,
            auditData.oldData || auditData.newData,
            metadata
          );
          break;

        case 'download':
          await this.auditService.logResourceDownload(
            req.user?.userId || req.user?.id,
            resourceInfo.resourceId,
            metadata
          );
          break;

        default:
          // Use generic logAction for other operations
          await this.auditService.logAction({
            user_id: req.user?.userId || req.user?.id,
            resource_id: resourceInfo.resourceId,
            category_id: resourceInfo.categoryId,
            action: operation.action,
            entity_type: operation.entityType,
            ip_address: metadata.ip_address,
            user_agent: metadata.user_agent,
            old_values: auditData.oldData,
            new_values: auditData.newData,
            metadata: {
              ...metadata,
              resource_type: resourceInfo.resourceType,
              resource_title: resourceInfo.resourceTitle
            }
          });
      }

    } catch (error) {
      logger.error('Failed to log resource operation:', {
        error: error.message,
        path: req.path,
        method: req.method,
        user: req.user?.id || req.user?.userId
      });
    }
  }

  /**
   * Determine the operation type from HTTP method and path
   * @private
   */
  determineOperation(method, path) {
    // Extract entity type from path (e.g., /api/resources -> resources)
    const pathParts = path.split('/').filter(part => part);
    if (pathParts.length < 2 || pathParts[0] !== 'api') {
      return null;
    }

    const entityType = pathParts[1];
    const hasId = pathParts.length > 2 && pathParts[2] !== 'search';

    const operationMap = {
      'POST': { action: 'create', entityType },
      'GET': { action: hasId ? 'view' : 'list', entityType },
      'PUT': { action: 'edit', entityType },
      'PATCH': { action: 'edit', entityType },
      'DELETE': { action: 'delete', entityType }
    };

    // Special handling for download operations
    if (method === 'GET' && (path.includes('/download') || path.includes('/export'))) {
      return { action: 'download', entityType };
    }

    return operationMap[method] || null;
  }

  /**
   * Extract metadata from request and response
   * @private
   */
  extractMetadata(req, res, responseTime) {
    return {
      ip_address: this.getClientIP(req),
      user_agent: req.headers['user-agent'] || null,
      request_method: req.method,
      request_path: req.path,
      response_status: res.statusCode,
      response_time_ms: responseTime,
      query_params: Object.keys(req.query).length > 0 ? req.query : null,
      timestamp: new Date(),
      user_email: req.user?.email || null,
      session_id: req.session?.id || null
    };
  }

  /**
   * Extract resource information from request and response
   * @private
   */
  extractResourceInfo(req, responseData) {
    const pathParts = req.path.split('/').filter(part => part);
    const resourceId = pathParts[2] && pathParts[2] !== 'search' ? pathParts[2] : null;
    
    // Try to extract additional info from response data
    let resourceTitle = null;
    let resourceType = null;
    let categoryId = null;

    if (responseData && typeof responseData === 'object') {
      const data = responseData.data || responseData;
      if (data) {
        resourceTitle = data.title || data.name || data.display_name || null;
        resourceType = data.type || pathParts[1] || null;
        categoryId = data.category_id || data.categoryId || null;
      }
    }

    return {
      resourceId,
      resourceTitle,
      resourceType: resourceType || pathParts[1] || 'unknown',
      categoryId
    };
  }

  /**
   * Prepare audit data by sanitizing sensitive information
   * @private
   */
  prepareAuditData(req, originalData, captureRequestBody, maxDataSize) {
    let newData = null;
    let oldData = originalData;

    if (captureRequestBody && req.body) {
      newData = this.sanitizeData(req.body, maxDataSize);
    }

    if (oldData) {
      oldData = this.sanitizeData(oldData, maxDataSize);
    }

    return { newData, oldData };
  }

  /**
   * Sanitize data by removing sensitive fields and limiting size
   * @private
   */
  sanitizeData(data, maxDataSize) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    try {
      // Deep clone and remove sensitive fields
      const sanitized = this.deepCloneAndSanitize(data);
      
      // Limit data size
      const jsonString = JSON.stringify(sanitized);
      if (jsonString.length > maxDataSize) {
        return {
          _truncated: true,
          _originalSize: jsonString.length,
          _data: JSON.parse(jsonString.substring(0, maxDataSize - 100)),
          _note: 'Data truncated due to size limit'
        };
      }

      return sanitized;
    } catch (error) {
      logger.warn('Failed to sanitize audit data:', error.message);
      return { _error: 'Failed to sanitize data' };
    }
  }

  /**
   * Deep clone object while removing sensitive fields
   * @private
   */
  deepCloneAndSanitize(obj, depth = 0) {
    // Prevent infinite recursion
    if (depth > 10) {
      return '[Max depth exceeded]';
    }

    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepCloneAndSanitize(item, depth + 1));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive fields
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.deepCloneAndSanitize(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if a field name indicates sensitive data
   * @private
   */
  isSensitiveField(fieldName) {
    const lowerField = fieldName.toLowerCase();
    return Array.from(this.sensitiveFields).some(sensitive => 
      lowerField.includes(sensitive)
    );
  }

  /**
   * Get client IP address from request
   * @private
   */
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.headers['x-client-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown';
  }
}

// Create singleton instance
const auditLogger = new AuditLogger();

/**
 * Create audit middleware with default configuration for resource operations
 */
function createResourceAuditMiddleware(options = {}) {
  return auditLogger.middleware({
    resourceRoutes: ['/api/resources', '/api/users', '/api/games', '/api/assignments'],
    excludeRoutes: ['/api/auth', '/api/health', '/api/performance'],
    logViewOperations: false, // Don't log GET requests by default
    captureRequestBody: true,
    captureResponseData: false,
    maxDataSize: 10240, // 10KB
    ...options
  });
}

/**
 * Create audit middleware for all API routes (more comprehensive)
 */
function createGlobalAuditMiddleware(options = {}) {
  return auditLogger.middleware({
    resourceRoutes: ['/api/'],
    excludeRoutes: ['/api/auth/login', '/api/auth/refresh', '/api/health', '/api/performance'],
    logViewOperations: false,
    captureRequestBody: true,
    captureResponseData: false,
    maxDataSize: 10240,
    ...options
  });
}

/**
 * Middleware specifically for sensitive operations (logs everything including GET)
 */
function createSensitiveOperationsAuditMiddleware(options = {}) {
  return auditLogger.middleware({
    resourceRoutes: ['/api/admin', '/api/financial', '/api/compliance', '/api/reports'],
    excludeRoutes: ['/api/health'],
    logViewOperations: true, // Log all operations including views
    captureRequestBody: true,
    captureResponseData: false,
    maxDataSize: 5120, // 5KB for sensitive data
    ...options
  });
}

export {
  auditLogger,
  createResourceAuditMiddleware,
  createGlobalAuditMiddleware,
  createSensitiveOperationsAuditMiddleware,
  AuditLogger
};