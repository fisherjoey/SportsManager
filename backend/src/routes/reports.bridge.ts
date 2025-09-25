// @ts-nocheck

/**
 * @fileoverview Bridge file for reports routes
 * @description Compatibility bridge that exports the TypeScript reports router
 * to maintain backward compatibility during the migration period.
 * This allows gradual migration without breaking existing imports.
 */

try {
  // Import the TypeScript version
  import reportsRouter from './reports';

  // Export either the default export or the router itself
  export default reportsRouter.default || reportsRouter;
} catch (error) {
  console.error('Failed to load TypeScript reports router:', error);

  // Fallback to JavaScript version if TypeScript fails
  try {
    import jsReportsRouter from './reports.js';
    console.warn('Falling back to JavaScript reports router');
    export default jsReportsRouter;
  } catch (fallbackError) {
    console.error('Failed to load JavaScript reports router:', fallbackError);

    // Create minimal error router as last resort
    import express from 'express';
    const errorRouter = express.Router();

    errorRouter.use('*', (req, res) => {
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Reports service is temporarily unavailable'
        }
      });
    });

    export default errorRouter;
  }
}