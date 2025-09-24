// @ts-nocheck

/**
 * Compatibility bridge for logger.js -> logger.ts migration
 * This ensures existing JS imports continue to work during the migration period
 */

import logger from './logger';

export default logger;