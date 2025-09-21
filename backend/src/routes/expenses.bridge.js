// Bridge file for backward compatibility
// This allows the existing JavaScript system to import the TypeScript route
const expensesRouterTS = require('./expenses.ts').default;

module.exports = expensesRouterTS;