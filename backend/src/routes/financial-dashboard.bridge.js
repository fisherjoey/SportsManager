/**
 * @fileoverview Bridge file for financial-dashboard route
 * @description Maintains backward compatibility during TypeScript migration
 */

// Import and re-export the TypeScript implementation
const financialDashboardRouter = require('./financial-dashboard.ts').default;

module.exports = financialDashboardRouter;