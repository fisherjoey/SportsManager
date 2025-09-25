// @ts-nocheck

/**
 * Documents Routes Bridge (JavaScript)
 * Compatibility layer for the TypeScript documents routes implementation
 */

// Import the TypeScript router (compiled to JavaScript)
import documentRouter from './documents';

// Export the router for backwards compatibility
export default documentRouter.default || documentRouter;