/**
 * @fileoverview Request validation middleware for the Sports Management App
 * @description Compatibility bridge - re-exports from TypeScript implementation.
 * @deprecated Use the TypeScript version directly: import from './validation'
 */

// Re-export everything from the compiled TypeScript implementation
const {
  // Main validation functions
  validateBody,
  validateQuery,
  validateParams,
  validateFile,
  conditionalValidation,
  autoValidate,
  
  // Utility middleware
  sanitizeInput,
  validationSummary,
  
  // Schema creation
  createValidator,
  
  // Configuration
  VALIDATION_OPTIONS,
  SCHEMA_REGISTRY,
  CUSTOM_VALIDATORS,
  ERROR_MESSAGES
} = require('../../dist/middleware/validation');

module.exports = {
  // Main validation functions
  validateBody,
  validateQuery,
  validateParams,
  validateFile,
  conditionalValidation,
  autoValidate,
  
  // Utility middleware
  sanitizeInput,
  validationSummary,
  
  // Schema creation
  createValidator,
  
  // Configuration
  VALIDATION_OPTIONS,
  SCHEMA_REGISTRY,
  CUSTOM_VALIDATORS,
  ERROR_MESSAGES
};