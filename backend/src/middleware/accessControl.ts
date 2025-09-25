// @ts-nocheck

/**
 * @fileoverview Access Control Middleware
 *
 * Database-driven access control middleware that replaces hardcoded permissions
 * Checks page and API access from the database tables
 */

import RoleAccessService from '../services/RoleAccessService';
import { createAuditLog, AUDIT_EVENTS  } from './auditTrail';
import db from '../config/database';

/**
 * Middleware to check page access from database
 * This replaces hardcoded role checks
 */
const checkPageAccess = (pagePath) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          error: 'Authentication required',
          hasAccess: false 
        });
      }

      // Check page access in database
      const hasAccess = await RoleAccessService.checkPageAccess(req.user.id, pagePath);
      
      if (!hasAccess) {
        // Log access denial
        await createAuditLog({
          event_type: 'ACCESS_DENIED',
          user_id: req.user.id,
          resource_type: 'page',
          resource_id: pagePath,
          ip_address: req.headers['x-forwarded-for'] || req.ip,
          user_agent: req.headers['user-agent'],
          success: false,
          error_message: 'Insufficient permissions for page access'
        });

        return res.status(403).json({ 
          error: 'Access denied',
          hasAccess: false,
          page: pagePath
        });
      }

      // Access granted
      req.pageAccess = { 
        page: pagePath, 
        hasAccess: true 
      };
      next();
    } catch (error) {
      console.error('Page access check error:', error);
      return res.status(500).json({ 
        error: 'Failed to check page access',
        hasAccess: false 
      });
    }
  };
};

/**
 * Middleware to check API access from database
 * This replaces hardcoded permission checks
 */
const checkApiAccess = () => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          error: 'Authentication required' 
        });
      }

      // Get the API endpoint being accessed
      const method = req.method;
      const endpoint = req.originalUrl.split('?')[0]; // Remove query params
      
      // Check API access in database
      const hasAccess = await RoleAccessService.checkApiAccess(req.user.id, method, endpoint);
      
      if (!hasAccess) {
        // Log access denial
        await createAuditLog({
          event_type: 'ACCESS_DENIED',
          user_id: req.user.id,
          resource_type: 'api',
          resource_id: `${method} ${endpoint}`,
          ip_address: req.headers['x-forwarded-for'] || req.ip,
          user_agent: req.headers['user-agent'],
          success: false,
          error_message: 'Insufficient permissions for API access'
        });

        return res.status(403).json({ 
          error: 'Access denied',
          method,
          endpoint
        });
      }

      // Access granted
      next();
    } catch (error) {
      console.error('API access check error:', error);
      return res.status(500).json({ 
        error: 'Failed to check API access' 
      });
    }
  };
};

/**
 * Middleware to check feature flag from database
 */
const checkFeature = (featureCode) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          error: 'Authentication required' 
        });
      }

      // Check feature access in database
      const isEnabled = await RoleAccessService.checkFeature(req.user.id, featureCode);
      
      if (!isEnabled) {
        return res.status(403).json({ 
          error: 'Feature not available',
          feature: featureCode
        });
      }

      // Feature enabled
      req.feature = { 
        code: featureCode, 
        enabled: true 
      };
      next();
    } catch (error) {
      console.error('Feature check error:', error);
      return res.status(500).json({ 
        error: 'Failed to check feature access' 
      });
    }
  };
};

/**
 * Get all accessible pages for a user
 * Used for filtering navigation
 */
const getUserAccessiblePages = async (userId) => {
  try {
    // Get user's roles
    const userRoles = await db('user_roles')
      .where('user_id', userId)
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('roles.is_active', true)
      .select('roles.id');

    if (!userRoles || userRoles.length === 0) {
      return [];
    }

    // Get all pages the user can access
    const roleIds = userRoles.map(r => r.id);
    const pages = await db('role_page_access')
      .whereIn('role_id', roleIds)
      .where('can_access', true)
      .distinct('page_path')
      .select('page_path', 'page_name', 'page_category');

    return pages;
  } catch (error) {
    console.error('Error getting user accessible pages:', error);
    return [];
  }
};

/**
 * Get all accessible API endpoints for a user
 * Used for dynamic permission checking
 */
const getUserAccessibleApis = async (userId) => {
  try {
    // Get user's roles
    const userRoles = await db('user_roles')
      .where('user_id', userId)
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('roles.is_active', true)
      .select('roles.id');

    if (!userRoles || userRoles.length === 0) {
      return [];
    }

    // Get all APIs the user can access
    const roleIds = userRoles.map(r => r.id);
    const apis = await db('role_api_access')
      .whereIn('role_id', roleIds)
      .where('can_access', true)
      .distinct(['http_method', 'endpoint_pattern'])
      .select('http_method', 'endpoint_pattern', 'endpoint_category');

    return apis;
  } catch (error) {
    console.error('Error getting user accessible APIs:', error);
    return [];
  }
};

export {
  checkPageAccess,
  checkApiAccess,
  checkFeature,
  getUserAccessiblePages,
  getUserAccessibleApis
};