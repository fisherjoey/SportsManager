/**
 * @fileoverview JavaScript compatibility bridge for User Management Routes
 * @description Provides compatibility layer between JavaScript and TypeScript implementations.
 * Routes all requests to the TypeScript implementation while maintaining JavaScript syntax.
 */

// This file provides a compatibility bridge for the JavaScript-to-TypeScript migration
// All actual implementation has been moved to users.ts
const typescriptRouter = require('../../dist/src/routes/users.js').default;

module.exports = typescriptRouter;