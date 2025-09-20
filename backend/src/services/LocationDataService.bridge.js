/**
 * Bridge file for LocationDataService - Provides backward compatibility
 *
 * This file allows existing JavaScript code to continue using LocationDataService
 * while the implementation has been migrated to TypeScript.
 */

const LocationDataService = require('./LocationDataService.ts').default;

module.exports = LocationDataService;