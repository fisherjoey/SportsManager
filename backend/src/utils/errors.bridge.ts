// @ts-nocheck

/**
 * Compatibility bridge for errors.js -> errors.ts migration
 * This ensures existing JS imports continue to work during the migration period
 */

import { ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  FileProcessingError,
  BusinessLogicError,
  TimeoutError,
  ConfigurationError,
  ErrorFactory,
  ErrorUtils,
  errorClasses
 } from './errors';

export {
  // Base error class
  ApiError,

  // Specific error classes
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  FileProcessingError,
  BusinessLogicError,
  TimeoutError,
  ConfigurationError,

  // Utility classes
  ErrorFactory,
  ErrorUtils
};