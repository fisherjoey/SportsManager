/**
 * Response Cache Middleware - JavaScript Bridge
 *
 * This file provides backward compatibility by importing the TypeScript implementation.
 * All new development should use the TypeScript version directly.
 */

const {
  responseCache,
  cacheConfigs,
  shortCache,
  mediumCache,
  longCache,
  referenceCache,
  customCache,
  clearUserCache,
  clearPathCache,
  clearAllCache,
  getCacheStats
} = require('./responseCache.ts');

module.exports = {
  responseCache,
  cacheConfigs,

  // Middleware shortcuts
  shortCache,
  mediumCache,
  longCache,
  referenceCache,

  // Custom cache middleware
  customCache,

  // Cache management functions
  clearUserCache,
  clearPathCache,
  clearAllCache,
  getCacheStats
};