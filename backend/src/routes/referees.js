/**
 * @fileoverview Referees Routes (JavaScript Entry Point)
 * @description Entry point for referees routes that uses the TypeScript implementation
 * when available, with fallback to JavaScript implementation during migration.
 */

// Use the bridge to load either TypeScript or JavaScript implementation
const router = require('./referees.bridge.js');

module.exports = router;