/**
 * @fileoverview PermissionService JavaScript Bridge
 *
 * Provides backward compatibility for existing JavaScript imports
 * while delegating to the TypeScript implementation
 */

const PermissionServiceTS = require('./PermissionService.ts').default;

module.exports = new PermissionServiceTS();