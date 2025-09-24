// @ts-nocheck

/**
 * @fileoverview Teams Routes Bridge
 * @description Bridge file to maintain backward compatibility during TypeScript migration.
 * This file imports the TypeScript implementation and initializes it with the database connection.
 */

import db from '../config/database';

// Import the TypeScript implementation
import { initializeRoutes  } from './teams';

// Initialize and export the routes with database connection
export default initializeRoutes(db);