/**
 * Compatibility bridge for query-builders.js -> query-builders.ts migration
 * This ensures existing JS imports continue to work during the migration period
 */

const { QueryBuilder, QueryHelpers } = require('./query-builders.ts');

module.exports = {
  QueryBuilder,
  QueryHelpers
};