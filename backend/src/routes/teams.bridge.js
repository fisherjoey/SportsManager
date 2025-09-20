/**
 * @fileoverview Teams Routes Bridge
 * @description Bridge file to maintain backward compatibility during TypeScript migration.
 * This file imports the TypeScript implementation and initializes it with the database connection.
 */

const db = require('../config/database');

// Import the TypeScript implementation
const { initializeRoutes } = require('./teams.ts');

// Initialize and export the routes with database connection
module.exports = initializeRoutes(db);