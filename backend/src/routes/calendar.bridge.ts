// @ts-nocheck

/**
 * @fileoverview Bridge file for calendar routes
 * @description Compatibility bridge that exports the TypeScript calendar router
 * to maintain backward compatibility during the migration period.
 * This allows gradual migration without breaking existing imports.
 */

try {
  // Import the TypeScript version
  import calendarRouter from './calendar';

  // Export either the default export or the router itself
  export default calendarRouter.default || calendarRouter;
} catch (error) {
  console.error('Failed to load TypeScript calendar router:', error);

  // Fallback to JavaScript version if TypeScript fails
  try {
    import jsCalendarRouter from './calendar.js';
    console.warn('Falling back to JavaScript calendar router');
    export default jsCalendarRouter;
  } catch (fallbackError) {
    console.error('Failed to load JavaScript calendar router:', fallbackError);

    // Create minimal error router as last resort
    import express from 'express';
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

    export default errorRouter;
  }
}