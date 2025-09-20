/**
 * JavaScript bridge file for rateLimiting middleware
 * This file exports the TypeScript implementation for backward compatibility
 */

// Re-export all rate limiters from the TypeScript implementation
const {
  authLimiter,
  passwordResetLimiter,
  adminLimiter,
  apiLimiter,
  sensitiveLimiter,
  uploadLimiter,
  registrationLimiter,
  assignmentLimiter,
  invitationLimiter
} = require("./rateLimiting.ts");

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
