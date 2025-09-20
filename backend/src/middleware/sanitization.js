/**
 * JavaScript bridge file for sanitization middleware
 * This file exports the TypeScript implementation for backward compatibility
 */

// Re-export all functions from the TypeScript implementation
const {
  sanitizeString,
  sanitizeObject,
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  sanitizeAll,
  validateQuery,
  validateIdParam,
  validateUuidParam,
  validateContentType,
  queryValidationSchemas
} = require("./sanitization.ts");

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  sanitizeAll,
  validateQuery,
  validateIdParam,
  validateUuidParam,
  validateContentType,
  queryValidationSchemas
};
