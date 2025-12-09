/**
 * Validation Fix Middleware
 *
 * This middleware provides a comprehensive fix for validation issues
 * that occurred during the JS to TS migration. It intercepts requests
 * and normalizes/fixes common validation problems.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to fix common validation issues from the TS migration
 * Apply this BEFORE validation middleware
 */
export function validationFix(req: Request, res: Response, next: NextFunction): void {
  try {
    // Log incoming request for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Validation Fix] ${req.method} ${req.path}`, {
        body: req.body ? Object.keys(req.body) : 'none',
        query: req.query ? Object.keys(req.query) : 'none'
      });
    }

    // Fix common body issues
    if (req.body) {
      // Convert empty strings to null for optional fields
      Object.keys(req.body).forEach(key => {
        if (req.body[key] === '') {
          req.body[key] = null;
        }
      });

      // Handle permission arrays - normalize field names
      if (req.body.permissions && !req.body.permission_ids) {
        req.body.permission_ids = req.body.permissions;
      }
      if (req.body.permission_ids && !req.body.permissions) {
        req.body.permissions = req.body.permission_ids;
      }

      // Handle role arrays - normalize field names
      if (req.body.roles && !req.body.role_ids) {
        req.body.role_ids = req.body.roles;
      }
      if (req.body.role_ids && !req.body.roles) {
        req.body.roles = req.body.role_ids;
      }

      // Handle user arrays - normalize field names
      if (req.body.users && !req.body.user_ids) {
        req.body.user_ids = req.body.users;
      }
      if (req.body.user_ids && !req.body.users) {
        req.body.users = req.body.user_ids;
      }

      // Clean up undefined values
      Object.keys(req.body).forEach(key => {
        if (req.body[key] === undefined || req.body[key] === 'undefined') {
          delete req.body[key];
        }
      });

      // Convert string booleans to actual booleans
      Object.keys(req.body).forEach(key => {
        if (req.body[key] === 'true') {req.body[key] = true;}
        if (req.body[key] === 'false') {req.body[key] = false;}
      });
    }

    // Fix common query parameter issues
    if (req.query) {
      // Convert string booleans in query params
      Object.keys(req.query).forEach(key => {
        const value = req.query[key];
        if (value === 'true') {req.query[key] = true as any;}
        if (value === 'false') {req.query[key] = false as any;}
        if (value === 'undefined' || value === '') {delete req.query[key];}
      });
    }

    next();
  } catch (error) {
    console.error('[Validation Fix] Error in validation fix middleware:', error);
    // Don't break the request, just pass through
    next();
  }
}

/**
 * Enhanced validation error handler
 * Use this as error middleware to provide better validation error responses
 */
export function validationErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only handle validation errors
  if (err.name !== 'ValidationError' && !err.isJoi && err.statusCode !== 400) {
    return next(err);
  }

  // Log the validation error details for debugging
  console.error('[Validation Error]', {
    path: req.path,
    method: req.method,
    body: req.body,
    error: err.message,
    details: err.details || err.errors
  });

  // Create a user-friendly error response
  const response: any = {
    error: 'Validation failed',
    message: err.message || 'The request data is invalid',
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Add field-specific errors if available
  if (err.details && Array.isArray(err.details)) {
    response.fields = err.details.map((detail: any) => ({
      field: detail.path ? detail.path.join('.') : detail.context?.key,
      message: detail.message,
      type: detail.type
    }));
  } else if (err.errors) {
    response.fields = Object.keys(err.errors).map(key => ({
      field: key,
      message: err.errors[key].message || err.errors[key]
    }));
  }

  // Add debugging info in development
  if (process.env.NODE_ENV === 'development') {
    response.debug = {
      body: req.body,
      query: req.query,
      params: req.params,
      originalError: err.stack
    };
  }

  res.status(400).json(response);
}