/**
 * @fileoverview Database Configuration
 * @description TypeScript database configuration with Knex setup and type safety
 */

import knex, { Knex } from 'knex';
import { Pool } from 'pg';
import { Database } from '../types/database.types';

// Import knexfile configuration
const knexConfig = require('../../knexfile');

// Define environment type
export type Environment = 'development' | 'test' | 'staging' | 'production';

// Database connection state interface
export interface DatabaseConnectionState {
  environment: Environment;
  isConnected: boolean;
  lastConnectionTime?: Date;
  lastError?: Error;
}

// Connection configuration interface
export interface DatabaseConfig extends Knex.Config {
  pool?: {
    min?: number;
    max?: number;
    createTimeoutMillis?: number;
    acquireTimeoutMillis?: number;
    idleTimeoutMillis?: number;
    reapIntervalMillis?: number;
    createRetryIntervalMillis?: number;
  };
}

// Environment validation
const validateEnvironment = (env: string): Environment => {
  const validEnvironments: Environment[] = ['development', 'test', 'staging', 'production'];
  if (!validEnvironments.includes(env as Environment)) {
    throw new Error(`Invalid NODE_ENV: ${env}. Must be one of: ${validEnvironments.join(', ')}`);
  }
  return env as Environment;
};

// Get environment with proper typing and validation
const environment: Environment = validateEnvironment(process.env.NODE_ENV || 'development');

// Enhanced configuration loading with validation
const loadDatabaseConfig = (): DatabaseConfig => {
  if (!knexConfig || typeof knexConfig !== 'object') {
    throw new Error('Invalid knexfile configuration: configuration object is missing or malformed');
  }

  const config: DatabaseConfig = knexConfig[environment];

  if (!config) {
    throw new Error(`No database configuration found for environment: ${environment}`);
  }

  // Validate required configuration properties
  if (!config.client) {
    throw new Error(`Database client not specified for environment: ${environment}`);
  }

  if (!config.connection) {
    throw new Error(`Database connection configuration missing for environment: ${environment}`);
  }

  return config;
};

// Load and validate configuration
const config: DatabaseConfig = loadDatabaseConfig();

// Connection state tracking
const connectionState: DatabaseConnectionState = {
  environment,
  isConnected: false
};

// Singleton Database Connection Class
class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;
  private knexInstance: Knex<Database>;

  private constructor() {
    // Create shared pool
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Create shared Knex instance with proper typing and enhanced error handling
    this.knexInstance = knex({
      ...config,
      pool: {
        min: 2,
        max: 10,
        createTimeoutMillis: 3000,
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100,
        ...config.pool
      },
      acquireConnectionTimeout: 60000
    });

    // Log connection status
    this.pool.on('connect', () => {
      console.log('Database pool: client connected');
    });

    this.pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public getKnex(): Knex<Database> {
    return this.knexInstance;
  }

  // Helper method for services
  public getDb(): Knex<Database> {
    return this.knexInstance;
  }
}

// Create singleton instance
const dbConnection = DatabaseConnection.getInstance();
const db: Knex<Database> = dbConnection.getKnex();

// Enhanced connection validation with detailed error reporting
const validateConnection = async (): Promise<boolean> => {
  try {
    const startTime = Date.now();
    await db.raw('SELECT 1');
    const endTime = Date.now();

    connectionState.isConnected = true;
    connectionState.lastConnectionTime = new Date();
    connectionState.lastError = undefined;

    console.log(`✅ Database: Connected to ${environment} database (${endTime - startTime}ms)`);
    return true;
  } catch (error) {
    const dbError = error as Error;
    connectionState.isConnected = false;
    connectionState.lastError = dbError;

    console.error(`❌ Database: Failed to connect to ${environment} database:`, {
      message: dbError.message,
      stack: dbError.stack,
      timestamp: new Date().toISOString()
    });
    return false;
  }
};

// Get current connection state
const getConnectionState = (): Readonly<DatabaseConnectionState> => {
  return { ...connectionState };
};

// Health check function
const healthCheck = async (): Promise<{
  isHealthy: boolean;
  responseTime?: number;
  error?: string;
}> => {
  try {
    const startTime = Date.now();
    await db.raw('SELECT 1');
    const responseTime = Date.now() - startTime;

    return {
      isHealthy: true,
      responseTime
    };
  } catch (error) {
    return {
      isHealthy: false,
      error: (error as Error).message
    };
  }
};

// Graceful shutdown function
const closeConnection = async (): Promise<void> => {
  try {
    await db.destroy();
    connectionState.isConnected = false;
    console.log(`✅ Database: Connection to ${environment} database closed gracefully`);
  } catch (error) {
    console.error(`❌ Database: Error during connection shutdown:`, (error as Error).message);
    throw error;
  }
};

// Database transaction helper with proper typing
const withTransaction = async <T>(
  callback: (trx: Knex.Transaction) => Promise<T>
): Promise<T> => {
  return db.transaction(callback);
};

// Schema validation helper
const validateSchema = async (): Promise<{
  isValid: boolean;
  missingTables?: string[];
  errors?: string[];
}> => {
  try {
    // Basic schema validation - check for essential tables
    const requiredTables = ['users', 'games', 'teams', 'assignments'];
    const existingTables = await db.raw(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );

    const tableNames = existingTables.rows.map((row: any) => row.table_name);
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));

    if (missingTables.length > 0) {
      return {
        isValid: false,
        missingTables,
        errors: [`Missing required tables: ${missingTables.join(', ')}`]
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Schema validation failed: ${(error as Error).message}`]
    };
  }
};

// Export the knex instance as default for compatibility
const knexDb = dbConnection.getKnex();
export default knexDb;

// Also export named exports for flexibility
export const db = knexDb;
export const pool = dbConnection.getPool();
export {
  validateConnection,
  getConnectionState,
  healthCheck,
  closeConnection,
  withTransaction,
  validateSchema,
  environment
};
export type { Knex, Database };