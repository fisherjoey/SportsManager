/**
 * RoleService - Compatibility bridge to TypeScript implementation
 * 
 * This file serves as a compatibility bridge during the migration from JavaScript to TypeScript.
 * It imports and re-exports the TypeScript RoleService to maintain backward compatibility
 * while we transition the codebase.
 * 
 * @deprecated This compatibility bridge will be removed once migration is complete.
 * Use the TypeScript version directly: import RoleService from './RoleService.ts'
 */

const db = require('../config/database');

// Import the compiled TypeScript RoleService
const RoleServiceTS = require('../../dist/services/RoleService').default;

// Create and export an instance using the TypeScript implementation
const roleServiceInstance = new RoleServiceTS(db);

// Export the instance for backward compatibility
module.exports = class RoleService {
  constructor() {
    // Return the singleton instance from TypeScript implementation
    return roleServiceInstance;
  }
};