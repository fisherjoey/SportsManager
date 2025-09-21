/**
 * @fileoverview Bridge file for tournaments routes
 * @description Compatibility bridge that exports the TypeScript tournaments router
 * to maintain backward compatibility during the migration period.
 * This allows gradual migration without breaking existing imports.
 */

try {
  // Import the TypeScript version
  const tournamentsRouter = require('./tournaments.ts');

  // Export either the default export or the router itself
  module.exports = tournamentsRouter.default || tournamentsRouter;
} catch (error) {
  console.error('Failed to load TypeScript tournaments router:', error);

  // Fallback to JavaScript version if TypeScript fails
  try {
    // This would reference the original JS implementation if needed
    console.warn('TypeScript tournaments router failed to load, creating minimal fallback');

    // Create minimal error router as fallback
    const express = require('express');
    const errorRouter = express.Router();

    errorRouter.use('*', (req, res) => {
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Tournaments service is temporarily unavailable'
        }
      });
    });

    module.exports = errorRouter;
  } catch (fallbackError) {
    console.error('Failed to create fallback tournaments router:', fallbackError);

    // Create minimal error router as last resort
    const express = require('express');
    const errorRouter = express.Router();

    errorRouter.use('*', (req, res) => {
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Tournaments service is temporarily unavailable'
        }
      });
    });

    module.exports = errorRouter;
  }
}