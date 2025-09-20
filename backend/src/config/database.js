/**
 * @fileoverview Database Configuration Bridge
 * @description JavaScript bridge for backward compatibility during TS migration
 * This file re-exports the TypeScript database configuration
 */

// Import TypeScript configuration
const database = require('./database.ts');

// Re-export default database instance
module.exports = database.default;

// Re-export all utility functions for JavaScript compatibility
module.exports.validateConnection = database.validateConnection;
module.exports.getConnectionState = database.getConnectionState;
module.exports.healthCheck = database.healthCheck;
module.exports.closeConnection = database.closeConnection;
module.exports.withTransaction = database.withTransaction;
module.exports.validateSchema = database.validateSchema;
module.exports.environment = database.environment;

// Export additional properties for backward compatibility
Object.defineProperty(module.exports, 'db', {
  get: () => database.default,
  enumerable: true
});

Object.defineProperty(module.exports, 'knex', {
  get: () => database.default,
  enumerable: true
});