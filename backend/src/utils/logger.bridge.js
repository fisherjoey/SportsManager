/**
 * Compatibility bridge for logger.js -> logger.ts migration
 * This ensures existing JS imports continue to work during the migration period
 */

const logger = require('./logger.ts').default;

module.exports = logger;