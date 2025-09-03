/**
 * @fileoverview Authentication routes compatibility bridge
 * @description This file serves as a compatibility bridge between the original JS implementation
 * and the new TypeScript implementation. It exports the TypeScript version for production use
 * while maintaining zero breaking changes to auth endpoints.
 * 
 * The original JavaScript implementation has been fully converted to TypeScript with:
 * - Comprehensive type safety for all authentication operations
 * - Enhanced security typing for JWT tokens and passwords
 * - Proper Express Request/Response typing
 * - AuthenticatedRequest interface for protected routes
 * - Complete RBAC permission system integration
 * - Security-focused error handling and audit logging
 */

try {
  // Import the TypeScript implementation
  const authRouter = require('../../dist/src/routes/auth.js').default;
  module.exports = authRouter;
} catch (error) {
  console.error('Failed to load TypeScript auth routes:', error);
  
  // Fallback to express router if TypeScript import fails
  const express = require('express');
  const router = express.Router();
  
  // Return error middleware for all auth routes in case of failure
  router.use('*', (req, res) => {
    res.status(500).json({ 
      error: 'Authentication service temporarily unavailable',
      message: 'TypeScript auth module failed to load'
    });
  });
  
  module.exports = router;
}

/*
================================================================================
TYPESCRIPT CONVERSION SUMMARY
================================================================================

The original auth.js has been converted to TypeScript (auth.ts) with the following enhancements:

SECURITY-FOCUSED TYPING:
✓ LoginRequest/LoginResponse interfaces with comprehensive validation
✓ RegisterRequest interface with role-based field requirements  
✓ AuthenticatedRequest interface extending Express.Request
✓ JWT payload typing with user permissions and roles
✓ Password validation and security error types

AUTHENTICATION ENDPOINTS:
✓ POST /api/auth/login - User authentication with audit logging
✓ POST /api/auth/register - User registration with role validation
✓ GET /api/auth/me - User profile with comprehensive data
✓ POST /api/auth/refresh-permissions - Permission cache refresh

COMPREHENSIVE TYPE COVERAGE:
✓ All request/response payloads typed
✓ Database query results typed
✓ Middleware integration typed
✓ Error handling with custom exception types
✓ Audit logging with security event tracking

ZERO BREAKING CHANGES:
✓ All existing API endpoints preserved
✓ Same request/response formats
✓ Compatible with existing frontend code
✓ Maintains all security features (rate limiting, sanitization, audit)

The TypeScript implementation provides enhanced type safety while maintaining
full backwards compatibility with the existing authentication system.
================================================================================
*/