/**
 * @fileoverview CacheService JavaScript Bridge
 *
 * Provides backward compatibility for existing JavaScript imports
 * while delegating to the TypeScript implementation
 */

const CacheServiceTS = require('./CacheService.ts').default;

module.exports = CacheServiceTS;