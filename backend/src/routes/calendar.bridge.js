/**
 * @fileoverview Bridge file for calendar routes
 * @description Compatibility bridge that exports the TypeScript calendar router
 * to maintain backward compatibility during the migration period.
 * This allows gradual migration without breaking existing imports.
 */

try {
  // Import the TypeScript version
  const calendarRouter = require('./calendar.ts');

  // Export either the default export or the router itself
  module.exports = calendarRouter.default || calendarRouter;
} catch (error) {
  console.error('Failed to load TypeScript calendar router:', error);

  // Fallback to JavaScript version if TypeScript fails
  try {
    const jsCalendarRouter = require('./calendar.js');
    console.warn('Falling back to JavaScript calendar router');
    module.exports = jsCalendarRouter;
  } catch (fallbackError) {
    console.error('Failed to load JavaScript calendar router:', fallbackError);

    // Create minimal error router as last resort
    const express = require('express');
    const errorRouter = express.Router();

    errorRouter.use('*', (req, res) => {
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Calendar service is temporarily unavailable'
        }
      });
    });

    module.exports = errorRouter;
  }
}