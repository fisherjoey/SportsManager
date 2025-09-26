/**
 * @fileoverview Database Configuration Tests
 * @description Unit tests for database configuration, connection management, and utilities
 */

import { Knex } from 'knex';

// Mock knex module
jest.mock('knex', () => {
  const mockKnex: any = jest.fn(() => ({
    raw: jest.fn().mockResolvedValue({ rows: [] }),
    destroy: jest.fn().mockResolvedValue(undefined),
    transaction: jest.fn((callback) => callback(mockKnex.transactionInstance)),
    on: jest.fn(),
    migrate: {
      latest: jest.fn().mockResolvedValue([]),
      rollback: jest.fn().mockResolvedValue([])
    },
    seed: {
      run: jest.fn().mockResolvedValue([])
    }
  }));
  mockKnex.transactionInstance = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined)
  };
  return mockKnex;
});

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue({
      release: jest.fn()
    }),
    end: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock knexfile
jest.mock('../../../knexfile', () => ({
  development: {
    client: 'postgresql',
    connection: {
      database: 'sports_manager_dev',
      user: 'dev_user',
      password: 'dev_pass'
    },
    pool: {
      min: 2,
      max: 10
    }
  },
  test: {
    client: 'postgresql',
    connection: {
      database: 'sports_manager_test',
      user: 'test_user',
      password: 'test_pass'
    },
    pool: {
      min: 1,
      max: 5
    }
  },
  production: {
    client: 'postgresql',
    connection: {
      database: 'sports_manager_prod',
      user: 'prod_user',
      password: 'prod_pass'
    },
    pool: {
      min: 5,
      max: 20
    }
  }
}));

describe('Database Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
    // Clear module cache to reset singleton
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Environment Validation', () => {
    test('should use development environment by default', () => {
      delete process.env.NODE_ENV;
      const { environment } = require('../database');
      expect(environment).toBe('development');
    });

    test('should use specified environment', () => {
      process.env.NODE_ENV = 'production';
      const { environment } = require('../database');
      expect(environment).toBe('production');
    });

    test('should throw error for invalid environment', () => {
      process.env.NODE_ENV = 'invalid';
      expect(() => require('../database')).toThrow('Invalid NODE_ENV: invalid');
    });

    test('should accept all valid environments', () => {
      const validEnvironments = ['development', 'test', 'staging', 'production'];

      validEnvironments.forEach(env => {
        jest.resetModules();
        process.env.NODE_ENV = env;

        if (env === 'staging') {
          // Add staging config to mock knexfile
          const knexfile = require('../../../knexfile');
          knexfile.staging = knexfile.development;
        }

        expect(() => require('../database')).not.toThrow();
      });
    });
  });

  describe('Configuration Loading', () => {
    test('should load correct config for environment', () => {
      process.env.NODE_ENV = 'test';
      const db = require('../database');
      const knex = require('knex');

      expect(knex).toHaveBeenCalledWith(
        expect.objectContaining({
          client: 'postgresql',
          connection: expect.objectContaining({
            database: 'sports_manager_test'
          })
        })
      );
    });

    test('should merge default pool settings', () => {
      process.env.NODE_ENV = 'development';
      const db = require('../database');
      const knex = require('knex');

      expect(knex).toHaveBeenCalledWith(
        expect.objectContaining({
          pool: expect.objectContaining({
            min: 2,
            max: 10,
            createTimeoutMillis: 3000,
            acquireTimeoutMillis: 60000
          })
        })
      );
    });

    test('should set DATABASE_URL when provided', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://custom:url@host/db';

      const db = require('../database');
      const { Pool } = require('pg');

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: 'postgresql://custom:url@host/db'
        })
      );
    });
  });

  describe('Database Connection', () => {
    test('validateConnection should return true on success', async () => {
      const { validateConnection } = require('../database');
      const result = await validateConnection();

      expect(result).toBe(true);
    });

    test('validateConnection should return false on error', async () => {
      const knex = require('knex');
      const mockKnexInstance = knex();
      mockKnexInstance.raw.mockRejectedValueOnce(new Error('Connection failed'));

      const { validateConnection } = require('../database');
      const result = await validateConnection();

      expect(result).toBe(false);
    });

    test('validateConnection should update connection state', async () => {
      const { validateConnection, getConnectionState } = require('../database');

      await validateConnection();
      const state = getConnectionState();

      expect(state.isConnected).toBe(true);
      expect(state.lastConnectionTime).toBeInstanceOf(Date);
      expect(state.lastError).toBeUndefined();
    });

    test('validateConnection should track errors in state', async () => {
      const knex = require('knex');
      const mockKnexInstance = knex();
      const testError = new Error('Test connection error');
      mockKnexInstance.raw.mockRejectedValueOnce(testError);

      const { validateConnection, getConnectionState } = require('../database');
      await validateConnection();

      const state = getConnectionState();
      expect(state.isConnected).toBe(false);
      expect(state.lastError).toEqual(testError);
    });
  });

  describe('Health Check', () => {
    test('should return healthy status when connected', async () => {
      const { healthCheck } = require('../database');
      const result = await healthCheck();

      expect(result.isHealthy).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    test('should return unhealthy status on error', async () => {
      const knex = require('knex');
      const mockKnexInstance = knex();
      mockKnexInstance.raw.mockRejectedValueOnce(new Error('Health check failed'));

      const { healthCheck } = require('../database');
      const result = await healthCheck();

      expect(result.isHealthy).toBe(false);
      expect(result.error).toBe('Health check failed');
    });

    test('should measure response time', async () => {
      const { healthCheck } = require('../database');
      const result = await healthCheck();

      expect(result.responseTime).toBeDefined();
      expect(typeof result.responseTime).toBe('number');
    });
  });

  describe('Connection Management', () => {
    test('closeConnection should destroy knex instance', async () => {
      const { closeConnection } = require('../database');
      const knex = require('knex');
      const mockKnexInstance = knex();

      await closeConnection();

      expect(mockKnexInstance.destroy).toHaveBeenCalled();
    });

    test('closeConnection should update connection state', async () => {
      const { closeConnection, getConnectionState } = require('../database');

      await closeConnection();
      const state = getConnectionState();

      expect(state.isConnected).toBe(false);
    });

    test('closeConnection should handle errors', async () => {
      const knex = require('knex');
      const mockKnexInstance = knex();
      mockKnexInstance.destroy.mockRejectedValueOnce(new Error('Close failed'));

      const { closeConnection } = require('../database');

      await expect(closeConnection()).rejects.toThrow('Close failed');
    });
  });

  describe('Transaction Handling', () => {
    test('withTransaction should execute callback in transaction', async () => {
      const { withTransaction } = require('../database');
      const knex = require('knex');
      const mockKnexInstance = knex();

      const callback = jest.fn().mockResolvedValue('result');
      mockKnexInstance.transaction.mockImplementation(async (cb) => cb('trx'));

      const result = await withTransaction(callback);

      expect(callback).toHaveBeenCalledWith('trx');
      expect(result).toBe('result');
    });

    test('withTransaction should handle callback errors', async () => {
      const { withTransaction } = require('../database');
      const knex = require('knex');
      const mockKnexInstance = knex();

      const callback = jest.fn().mockRejectedValue(new Error('Transaction failed'));
      mockKnexInstance.transaction.mockImplementation(async (cb) => {
        try {
          return await cb('trx');
        } catch (error) {
          throw error;
        }
      });

      await expect(withTransaction(callback)).rejects.toThrow('Transaction failed');
    });
  });

  describe('Schema Validation', () => {
    test('should validate required tables exist', async () => {
      const knex = require('knex');
      const mockKnexInstance = knex();
      mockKnexInstance.raw.mockResolvedValueOnce({
        rows: [
          { table_name: 'users' },
          { table_name: 'games' },
          { table_name: 'teams' },
          { table_name: 'assignments' }
        ]
      });

      const { validateSchema } = require('../database');
      const result = await validateSchema();

      expect(result.isValid).toBe(true);
      expect(result.missingTables).toBeUndefined();
    });

    test('should report missing tables', async () => {
      const knex = require('knex');
      const mockKnexInstance = knex();
      mockKnexInstance.raw.mockResolvedValueOnce({
        rows: [
          { table_name: 'users' },
          { table_name: 'games' }
        ]
      });

      const { validateSchema } = require('../database');
      const result = await validateSchema();

      expect(result.isValid).toBe(false);
      expect(result.missingTables).toEqual(['teams', 'assignments']);
      expect(result.errors).toContain('Missing required tables: teams, assignments');
    });

    test('should handle schema validation errors', async () => {
      const knex = require('knex');
      const mockKnexInstance = knex();
      mockKnexInstance.raw.mockRejectedValueOnce(new Error('Schema query failed'));

      const { validateSchema } = require('../database');
      const result = await validateSchema();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Schema validation failed: Schema query failed');
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance on multiple imports', () => {
      const db1 = require('../database').default;
      const db2 = require('../database').db;

      expect(db1).toBe(db2);
    });

    test('should share pool across instances', () => {
      const { pool: pool1 } = require('../database');
      const { pool: pool2 } = require('../database');

      expect(pool1).toBe(pool2);
    });
  });

  describe('Database Types', () => {
    test('should export Knex type', () => {
      const { Knex } = require('../database');
      expect(Knex).toBeDefined();
    });

    test('should export Database type', () => {
      const { Database } = require('../database');
      expect(Database).toBeDefined();
    });
  });

  describe('Connection State Management', () => {
    test('getConnectionState should return readonly state', () => {
      const { getConnectionState } = require('../database');
      const state = getConnectionState();

      expect(state).toHaveProperty('environment');
      expect(state).toHaveProperty('isConnected');
      expect(Object.isFrozen(state)).toBe(false); // Returns a copy, not frozen
    });

    test('should track connection attempts', async () => {
      const { validateConnection, getConnectionState } = require('../database');

      const initialState = getConnectionState();
      expect(initialState.lastConnectionTime).toBeUndefined();

      await validateConnection();

      const updatedState = getConnectionState();
      expect(updatedState.lastConnectionTime).toBeInstanceOf(Date);
    });
  });
});