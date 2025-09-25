// @ts-nocheck

/**
 * @fileoverview JavaScript Bridge for TypeScript Referees Routes
 * @description Compatibility bridge that imports the compiled TypeScript routes
 * and provides the same interface as the original JavaScript implementation.
 */

import db from '../config/database';

// Import the compiled TypeScript module
import refereesRouterTS from './referees';

let refereesRouter = refereesRouterTS;

try {
  // Use the TypeScript version directly
  if (refereesRouterTS) {
    refereesRouter = refereesRouterTS;
  } else {
    refereesRouter = compiledRouter;
  }

  console.log('✅ Loaded TypeScript referees routes successfully');
} catch (error) {
  console.warn('⚠️  TypeScript referees routes not available, falling back to JavaScript:', error.message);

  // Fallback to the original JavaScript implementation
  import express from 'express';
  const router = express.Router();
  import Joi from 'joi';
  import { authenticateToken, requireRole, requirePermission, requireAnyPermission  } from '../middleware/auth';
  import { ResponseFormatter  } from '../utils/response-formatters';
  import { enhancedAsyncHandler  } from '../middleware/enhanced-error-handling';
  import { validateBody, validateParams, validateQuery  } from '../middleware/validation';
  import { UserSchemas, RefereeSchemas, FilterSchemas, IdParamSchema  } from '../utils/validation-schemas';
  import { ErrorFactory  } from '../utils/errors';
  import UserService from '../services/UserService';
  import RefereeService from '../services/RefereeService';

  // Initialize services with database connection
  const userService = new UserService(db);
  const refereeService = new RefereeService(db);

  // Add the original route implementations here as fallback
  // This ensures the system continues to work during the migration

  // GET /api/referees/test - Simple test endpoint
  router.get('/test', (req, res) => {
    res.json({
      message: 'Referees API is working (JavaScript fallback)',
      timestamp: new Date().toISOString()
    });
  });

  // For now, use a basic implementation that indicates the routes are being migrated
  router.use('*', (req, res) => {
    res.status(503).json({
      error: 'Routes are being migrated to TypeScript',
      message: 'This endpoint is temporarily unavailable during migration',
      endpoint: req.originalUrl,
      method: req.method
    });
  });

  refereesRouter = router;
}

export default refereesRouter;