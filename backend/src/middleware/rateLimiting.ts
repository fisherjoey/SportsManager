import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiting configurations for different endpoint types
 * These limits are designed to prevent abuse while allowing legitimate usage
 */

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: {
    error: string;
    retryAfter: string;
  };
  standardHeaders: boolean;
  legacyHeaders: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request, res: Response) => boolean;
}

interface UserWithRoles {
  role?: string;
  roles?: string[];
}

interface RequestWithUser extends Request {
  user?: UserWithRoles;
}

// Helper function to generate key for rate limiting based on IP and email
const generateKeyWithEmail = (req: Request): string => {
  const email = req.body?.email || 'anonymous';
  return `${req.ip}:${email}`;
};

// Helper function to check if user has admin role
const isAdminUser = (user?: UserWithRoles): boolean => {
  if (!user) {return false;}

  const userRoles = user.roles || [user.role];
  return userRoles.includes('admin') || user.role === 'admin';
};

// Strict rate limiting for authentication endpoints
const authLimiterConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 50 : 5, // More permissive in development
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
  keyGenerator: generateKeyWithEmail
};

const authLimiter: RateLimitRequestHandler = rateLimit(authLimiterConfig);

// Moderate rate limiting for password reset
const passwordResetLimiterConfig: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: {
    error: 'Too many password reset attempts',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKeyWithEmail
};

const passwordResetLimiter: RateLimitRequestHandler = rateLimit(passwordResetLimiterConfig);

// Administrative operations rate limiting
const adminLimiterConfig: RateLimitConfig = {
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 admin operations per 5 minutes
  message: {
    error: 'Too many administrative operations',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Apply only to admin users
  skip: (req: RequestWithUser) => {
    // Skip if not authenticated or not admin
    return !isAdminUser(req.user);
  }
};

const adminLimiter: RateLimitRequestHandler = rateLimit(adminLimiterConfig);

// General API rate limiting (more permissive)
const apiLimiterConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes (for development)
  message: {
    error: 'Too many requests',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
};

const apiLimiter: RateLimitRequestHandler = rateLimit(apiLimiterConfig);

// Stricter rate limiting for sensitive operations
const sensitiveLimiterConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute for sensitive operations
  message: {
    error: 'Too many requests to sensitive endpoint',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
};

const sensitiveLimiter: RateLimitRequestHandler = rateLimit(sensitiveLimiterConfig);

// File upload rate limiting
const uploadLimiterConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 uploads per minute
  message: {
    error: 'Too many upload attempts',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
};

const uploadLimiter: RateLimitRequestHandler = rateLimit(uploadLimiterConfig);

// Registration rate limiting
const registrationLimiterConfig: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour per IP
  message: {
    error: 'Too many registration attempts',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
};

const registrationLimiter: RateLimitRequestHandler = rateLimit(registrationLimiterConfig);

// Assignment modification rate limiting (prevent spam updates)
const assignmentLimiterConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 assignment operations per minute
  message: {
    error: 'Too many assignment operations',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
};

const assignmentLimiter: RateLimitRequestHandler = rateLimit(assignmentLimiterConfig);

// Invitation rate limiting
const invitationLimiterConfig: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 invitations per hour
  message: {
    error: 'Too many invitation requests',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
};

const invitationLimiter: RateLimitRequestHandler = rateLimit(invitationLimiterConfig);

export {
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