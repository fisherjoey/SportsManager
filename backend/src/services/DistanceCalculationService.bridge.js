/**
 * Bridge file for DistanceCalculationService - Provides backward compatibility
 *
 * This file allows existing JavaScript code to continue using DistanceCalculationService
 * while the implementation has been migrated to TypeScript.
 */

const DistanceCalculationService = require('./DistanceCalculationService.ts').default;

module.exports = DistanceCalculationService;