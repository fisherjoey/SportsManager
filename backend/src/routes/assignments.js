/**
 * Assignment Routes - JavaScript Compatibility Bridge
 * 
 * This file provides backward compatibility during the JavaScript to TypeScript migration.
 * The actual TypeScript implementation is in assignments.ts
 * 
 * TODO: This file can be removed once the build system supports importing TypeScript files
 * and all calling code has been migrated to TypeScript.
 */

// Import the actual TypeScript implementation
const assignmentsRouter = require('./assignments.ts').default;

// Export the router for use by the Express app
module.exports = assignmentsRouter;