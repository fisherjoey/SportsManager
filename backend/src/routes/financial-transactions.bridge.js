/**
 * @fileoverview Bridge file for financial-transactions route
 * @description Maintains backward compatibility during TypeScript migration
 */

// Import and re-export the TypeScript implementation
const financialTransactionsRouter = require('./financial-transactions.ts').default;

module.exports = financialTransactionsRouter;