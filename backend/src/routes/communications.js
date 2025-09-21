/**
 * @fileoverview Communications Routes Bridge - Backward compatibility layer
 * @description Bridges the JavaScript implementation to the new TypeScript implementation
 * @author Claude Assistant
 * @date 2025-01-23
 */

// Re-export the TypeScript implementation with CommonJS compatibility
const communicationsRouter = require('./communications.ts').default;

module.exports = communicationsRouter;