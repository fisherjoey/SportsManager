/**
 * Documents Routes Bridge (JavaScript)
 * Compatibility layer for the TypeScript documents routes implementation
 */

// Import the TypeScript router (compiled to JavaScript)
const documentRouter = require('./documents');

// Export the router for backwards compatibility
module.exports = documentRouter.default || documentRouter;