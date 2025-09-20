/**
 * @fileoverview Redis Configuration Bridge
 * @description JavaScript bridge for backward compatibility during TS migration
 * This file re-exports the TypeScript Redis configuration
 */

// Import TypeScript configuration
const redis = require('./redis.ts');

// Re-export the default client for JavaScript compatibility
module.exports = redis.default;

// Export all utility functions for JavaScript compatibility
module.exports.getRedisClient = redis.getRedisClient;
module.exports.isRedisAvailable = redis.isRedisAvailable;
module.exports.getConnectionState = redis.getConnectionState;
module.exports.healthCheck = redis.healthCheck;
module.exports.closeRedisConnection = redis.closeRedisConnection;
module.exports.getMetrics = redis.getMetrics;
module.exports.flushAll = redis.flushAll;

// Export client property for backward compatibility
Object.defineProperty(module.exports, 'client', {
  get: () => redis.default,
  enumerable: true
});

Object.defineProperty(module.exports, 'redisClient', {
  get: () => redis.default,
  enumerable: true
});