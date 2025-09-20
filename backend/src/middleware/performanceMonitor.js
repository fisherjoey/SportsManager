/**
 * Performance Monitor Middleware - JavaScript Bridge
 *
 * This file provides backward compatibility by importing the TypeScript implementation.
 * All new development should use the TypeScript version directly.
 */

const {
  performanceMonitor,
  getPerformanceStats,
  resetPerformanceStats,
  getSlowQueriesSummary,
  createPerformanceRoute,
  trackDbQuery,
  trackCacheOperation
} = require('./performanceMonitor.ts');

module.exports = {
  performanceMonitor,
  getPerformanceStats,
  resetPerformanceStats,
  getSlowQueriesSummary,
  createPerformanceRoute,
  trackDbQuery,
  trackCacheOperation
};