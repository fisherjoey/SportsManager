/**
 * @fileoverview Reports routes (migrated to TypeScript)
 * @description This file now uses the bridge pattern to load the TypeScript implementation
 * while maintaining backward compatibility during the migration period.
 */

// Use the bridge to load the TypeScript implementation
module.exports = require('./reports.bridge.js');