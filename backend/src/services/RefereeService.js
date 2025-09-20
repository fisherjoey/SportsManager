/**
 * RefereeService - JavaScript Bridge for Backward Compatibility
 *
 * This file provides backward compatibility for JavaScript modules that
 * import RefereeService. It exports the TypeScript implementation with
 * the same interface as the original JavaScript implementation.
 */

// Import the TypeScript implementation
const RefereeServiceTS = require('./RefereeService.ts').default;

// Export as CommonJS module for backward compatibility
module.exports = RefereeServiceTS;