/**
 * @fileoverview Game management routes - Compatibility Bridge
 * @deprecated This file serves as a compatibility bridge. The main implementation
 * has been migrated to games.ts with proper TypeScript typing.
 * 
 * This bridge ensures zero breaking changes during the migration process.
 * All route handlers are now properly typed with:
 * - Request/Response interfaces for game operations
 * - Game entity types and relationships
 * - Team assignment and conflict detection
 * - Proper error handling and validation
 * 
 * @module routes/games
 */

// Import TypeScript implementation
const gamesRouterTS = require('./games.ts');

// Re-export the TypeScript router for compatibility
module.exports = gamesRouterTS.default || gamesRouterTS;

// All schemas and validation logic moved to games.ts
// This compatibility bridge forwards requests to the TypeScript implementation

// Game schema and validation moved to games.ts with proper TypeScript interfaces

// 
// ====================================================================
// COMPATIBILITY BRIDGE - MIGRATION IN PROGRESS  
// ====================================================================
//
// This file now serves as a compatibility bridge during the TypeScript migration.
// The actual implementation has been moved to games.ts with proper type definitions.
//
// Key improvements in the TypeScript version:
// - Proper request/response type definitions for all game operations
// - Comprehensive game entity typing with team relationships  
// - Typed query parameters and request bodies
// - Enhanced assignment and conflict detection interfaces
// - Better error handling with typed responses
// - Maintained API compatibility for zero breaking changes
//
// Once the migration is complete, this bridge can be removed.
// ====================================================================