import { Request, Response, NextFunction } from 'express';
import { CerbosAuthService } from '../services/CerbosAuthService';
import { requireCerbosPermission, RequireCerbosPermissionOptions } from './requireCerbosPermission';
import logger from '../utils/logger';

let cerbosAvailable: boolean | null = null;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 60000; // Check every 60 seconds

/**
 * Checks if Cerbos is available
 * Caches result for 60 seconds to avoid excessive health checks
 */
async function isCerbosAvailable(): Promise<boolean> {
  const now = Date.now();

  // Use cached result if recent
  if (cerbosAvailable !== null && now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return cerbosAvailable;
  }

  try {
    const service = CerbosAuthService.getInstance();
    cerbosAvailable = await service.isHealthy();
    lastHealthCheck = now;

    if (cerbosAvailable) {
      logger.info('Cerbos is available, using Cerbos authorization');
    } else {
      logger.warn('Cerbos health check failed, falling back to legacy permissions');
    }

    return cerbosAvailable;
  } catch (error) {
    logger.warn('Cerbos is not available, falling back to legacy permissions', { error });
    cerbosAvailable = false;
    lastHealthCheck = now;
    return false;
  }
}

/**
 * Creates a middleware that uses Cerbos if available, otherwise passes through
 *
 * This is a temporary fallback for development when Cerbos isn't running.
 * In production, Cerbos should always be running.
 *
 * @param options - Cerbos permission options
 * @param fallbackMiddleware - Optional middleware to use when Cerbos is unavailable
 */
export function requireCerbosPermissionWithFallback(
  options: RequireCerbosPermissionOptions,
  fallbackMiddleware?: (req: Request, res: Response, next: NextFunction) => void
) {
  const cerbosMiddleware = requireCerbosPermission(options);

  return async (req: Request, res: Response, next: NextFunction) => {
    const available = await isCerbosAvailable();

    if (available) {
      // Use Cerbos
      return cerbosMiddleware(req, res, next);
    } else {
      // Fallback
      if (fallbackMiddleware) {
        logger.debug('Using fallback middleware instead of Cerbos', {
          resource: options.resource,
          action: options.action,
        });
        return fallbackMiddleware(req, res, next);
      } else {
        // No fallback, just pass through (allow all)
        logger.warn('No Cerbos and no fallback middleware, allowing request', {
          resource: options.resource,
          action: options.action,
        });
        return next();
      }
    }
  };
}

/**
 * Creates a simple pass-through middleware for development
 * Logs a warning but allows the request
 */
export function developmentFallback() {
  return (req: Request, res: Response, next: NextFunction) => {
    logger.warn('⚠️  Using development fallback - Cerbos not running!', {
      path: req.path,
      method: req.method,
      user: (req.user as any)?.email,
    });
    next();
  };
}