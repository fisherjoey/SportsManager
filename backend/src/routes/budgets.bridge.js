/**
 * Budget Routes Bridge (JavaScript)
 * Compatibility layer for the TypeScript budget routes implementation
 */

// Import the TypeScript router (compiled to JavaScript)
const budgetRouter = require('./budgets');

// Export the router for backwards compatibility
module.exports = budgetRouter.default || budgetRouter;