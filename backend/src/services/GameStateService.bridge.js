/**
 * Bridge file for GameStateService - Provides backward compatibility
 *
 * This file allows existing JavaScript code to continue using GameStateService
 * while the implementation has been migrated to TypeScript.
 */

const GameStateService = require('./GameStateService.ts').default;

module.exports = GameStateService;