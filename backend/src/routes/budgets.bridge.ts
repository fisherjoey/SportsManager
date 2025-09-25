// @ts-nocheck

/**
 * Budget Routes Bridge (JavaScript)
 * Compatibility layer for the TypeScript budget routes implementation
 */

// Import the TypeScript router (compiled to JavaScript)
import budgetRouter from './budgets';

// Export the router for backwards compatibility
export default budgetRouter.default || budgetRouter;