const rateLimit = require('express-rate-limit');

/**
 * Rate limiting configurations for different endpoint types
 * These limits are designed to prevent abuse while allowing legitimate usage
 */

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  message: {
    error: 'Too many authentication attempts',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests (optional)
  skipSuccessfulRequests: false,
  // More restrictive on failed requests
  skipFailedRequests: false,
  // Custom key generator to include user info if available
  keyGenerator: (req) => {
    return req.ip + ':' + (req.body?.email || 'anonymous');
  }
});

// Moderate rate limiting for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: {
    error: 'Too many password reset attempts',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip + ':' + (req.body?.email || 'anonymous');
  }
});

// Administrative operations rate limiting
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 admin operations per 5 minutes
  message: {
    error: 'Too many administrative operations',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Apply only to admin users
  skip: (req) => {
    // Skip if not authenticated or not admin
    const userRoles = req.user?.roles || [req.user?.role];
    return !req.user || (!userRoles.includes('admin') && req.user?.role !== 'admin');
  }
});

// General API rate limiting (more permissive)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes (for development)
  message: {
    error: 'Too many requests',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limiting for sensitive operations
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute for sensitive operations
  message: {
    error: 'Too many requests to sensitive endpoint',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// File upload rate limiting
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 uploads per minute
  message: {
    error: 'Too many upload attempts',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Registration rate limiting
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour per IP
  message: {
    error: 'Too many registration attempts',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Assignment modification rate limiting (prevent spam updates)
const assignmentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 assignment operations per minute
  message: {
    error: 'Too many assignment operations',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Invitation rate limiting
const invitationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 invitations per hour
  message: {
    error: 'Too many invitation requests',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLimiter,
  passwordResetLimiter,
  adminLimiter,
  apiLimiter,
  sensitiveLimiter,
  uploadLimiter,
  registrationLimiter,
  assignmentLimiter,
  invitationLimiter
};