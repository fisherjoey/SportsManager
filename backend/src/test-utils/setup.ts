/**
 * @fileoverview Test setup and utilities
 * @description Common test setup, utilities, and fixtures for all tests
 */

import { Knex } from 'knex';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/sports_manager_test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

/**
 * Create a test database instance
 */
export const createTestDb = (): Knex => {
  const knex = require('knex');
  return knex({
    client: 'sqlite3',
    connection: ':memory:',
    useNullAsDefault: true,
    pool: {
      min: 1,
      max: 1
    }
  });
};

/**
 * Setup test database with migrations and seeds
 */
export const setupTestDatabase = async (db: Knex): Promise<void> => {
  // Create basic tables for testing
  await db.schema.createTable('users', (table) => {
    table.uuid('id').primary();
    table.string('email').unique().notNullable();
    table.string('password').notNullable();
    table.string('first_name');
    table.string('last_name');
    table.string('phone');
    table.json('roles');
    table.json('permissions');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  await db.schema.createTable('games', (table) => {
    table.uuid('id').primary();
    table.string('home_team').notNullable();
    table.string('away_team').notNullable();
    table.datetime('game_date').notNullable();
    table.string('location');
    table.string('status').defaultTo('scheduled');
    table.string('level');
    table.decimal('fee', 10, 2);
    table.timestamps(true, true);
  });

  await db.schema.createTable('teams', (table) => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.string('division');
    table.string('league');
    table.json('contact_info');
    table.timestamps(true, true);
  });

  await db.schema.createTable('assignments', (table) => {
    table.uuid('id').primary();
    table.uuid('game_id').references('id').inTable('games');
    table.uuid('referee_id').references('id').inTable('users');
    table.string('position');
    table.string('status').defaultTo('pending');
    table.decimal('fee', 10, 2);
    table.timestamps(true, true);
  });

  await db.schema.createTable('permissions', (table) => {
    table.uuid('id').primary();
    table.string('name').unique().notNullable();
    table.string('description');
    table.string('resource');
    table.string('action');
    table.timestamps(true, true);
  });

  await db.schema.createTable('roles', (table) => {
    table.uuid('id').primary();
    table.string('name').unique().notNullable();
    table.string('description');
    table.json('permissions');
    table.timestamps(true, true);
  });

  await db.schema.createTable('user_permissions', (table) => {
    table.uuid('user_id').references('id').inTable('users');
    table.uuid('permission_id').references('id').inTable('permissions');
    table.primary(['user_id', 'permission_id']);
    table.timestamps(true, true);
  });

  await db.schema.createTable('user_roles', (table) => {
    table.uuid('user_id').references('id').inTable('users');
    table.uuid('role_id').references('id').inTable('roles');
    table.primary(['user_id', 'role_id']);
    table.timestamps(true, true);
  });
};

/**
 * Teardown test database
 */
export const teardownTestDatabase = async (db: Knex): Promise<void> => {
  await db.schema.dropTableIfExists('user_roles');
  await db.schema.dropTableIfExists('user_permissions');
  await db.schema.dropTableIfExists('assignments');
  await db.schema.dropTableIfExists('permissions');
  await db.schema.dropTableIfExists('roles');
  await db.schema.dropTableIfExists('teams');
  await db.schema.dropTableIfExists('games');
  await db.schema.dropTableIfExists('users');
  await db.destroy();
};

/**
 * Create mock Express Request object
 */
export const createMockRequest = (options: any = {}): Partial<Request> => {
  return {
    body: options.body || {},
    query: options.query || {},
    params: options.params || {},
    headers: options.headers || {},
    user: options.user || null,
    get: jest.fn((header: string) => options.headers?.[header]),
    header: jest.fn((header: string) => options.headers?.[header]),
    ...options
  };
};

/**
 * Create mock Express Response object
 */
export const createMockResponse = (): Partial<Response> => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  return res;
};

/**
 * Create mock Next function
 */
export const createMockNext = (): NextFunction => {
  return jest.fn() as NextFunction;
};

/**
 * Test user fixtures
 */
export const testUsers = {
  admin: {
    id: 'admin-id-123',
    email: 'admin@test.com',
    password: '$2b$10$YKxDrUwDPUuCPyM8uFVFyOxGmXr6EomQl8KqBVNYPpH7fKGUqGKNy', // password: 'admin123'
    first_name: 'Admin',
    last_name: 'User',
    roles: ['admin'],
    permissions: ['*']
  },
  referee: {
    id: 'referee-id-456',
    email: 'referee@test.com',
    password: '$2b$10$YKxDrUwDPUuCPyM8uFVFyOxGmXr6EomQl8KqBVNYPpH7fKGUqGKNy', // password: 'referee123'
    first_name: 'Referee',
    last_name: 'User',
    roles: ['referee'],
    permissions: ['games.view', 'assignments.view', 'assignments.accept']
  },
  assignor: {
    id: 'assignor-id-789',
    email: 'assignor@test.com',
    password: '$2b$10$YKxDrUwDPUuCPyM8uFVFyOxGmXr6EomQl8KqBVNYPpH7fKGUqGKNy', // password: 'assignor123'
    first_name: 'Assignor',
    last_name: 'User',
    roles: ['assignor'],
    permissions: ['games.*', 'assignments.*', 'referees.view']
  }
};

/**
 * Generate test JWT token
 */
export const generateTestToken = (user: any): string => {
  return jwt.sign(
    {
      id: user.id,
      userId: user.id,
      email: user.email,
      roles: user.roles || [],
      permissions: user.permissions || []
    },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
};

/**
 * Test game fixtures
 */
export const testGames = [
  {
    id: 'game-id-001',
    home_team: 'Team A',
    away_team: 'Team B',
    game_date: new Date('2025-02-01T14:00:00'),
    location: 'Field 1',
    status: 'scheduled',
    level: 'U12',
    fee: 50.00
  },
  {
    id: 'game-id-002',
    home_team: 'Team C',
    away_team: 'Team D',
    game_date: new Date('2025-02-02T10:00:00'),
    location: 'Field 2',
    status: 'scheduled',
    level: 'U14',
    fee: 60.00
  },
  {
    id: 'game-id-003',
    home_team: 'Team E',
    away_team: 'Team F',
    game_date: new Date('2025-02-03T16:00:00'),
    location: 'Field 3',
    status: 'completed',
    level: 'U16',
    fee: 70.00
  }
];

/**
 * Wait for async operations
 */
export const waitForAsync = (): Promise<void> => {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
};

/**
 * Mock database transaction
 */
export const mockTransaction = () => {
  const trx: any = {
    commit: jest.fn(),
    rollback: jest.fn(),
    isCompleted: jest.fn().mockReturnValue(false)
  };
  return trx;
};

/**
 * Assert database table exists
 */
export const assertTableExists = async (db: Knex, tableName: string): Promise<boolean> => {
  return db.schema.hasTable(tableName);
};

/**
 * Seed test data
 */
export const seedTestData = async (db: Knex): Promise<void> => {
  // Insert test users
  await db('users').insert(Object.values(testUsers));

  // Insert test games
  await db('games').insert(testGames);

  // Insert test roles
  await db('roles').insert([
    { id: 'role-admin', name: 'admin', description: 'Administrator role', permissions: JSON.stringify(['*']) },
    { id: 'role-referee', name: 'referee', description: 'Referee role', permissions: JSON.stringify(['games.view', 'assignments.*']) },
    { id: 'role-assignor', name: 'assignor', description: 'Assignor role', permissions: JSON.stringify(['games.*', 'assignments.*']) }
  ]);

  // Insert test permissions
  await db('permissions').insert([
    { id: 'perm-001', name: 'games.view', description: 'View games', resource: 'games', action: 'view' },
    { id: 'perm-002', name: 'games.create', description: 'Create games', resource: 'games', action: 'create' },
    { id: 'perm-003', name: 'games.update', description: 'Update games', resource: 'games', action: 'update' },
    { id: 'perm-004', name: 'games.delete', description: 'Delete games', resource: 'games', action: 'delete' },
    { id: 'perm-005', name: 'assignments.view', description: 'View assignments', resource: 'assignments', action: 'view' },
    { id: 'perm-006', name: 'assignments.create', description: 'Create assignments', resource: 'assignments', action: 'create' },
    { id: 'perm-007', name: 'assignments.accept', description: 'Accept assignments', resource: 'assignments', action: 'accept' }
  ]);
};

/**
 * Clear all test data
 */
export const clearTestData = async (db: Knex): Promise<void> => {
  await db('user_roles').del();
  await db('user_permissions').del();
  await db('assignments').del();
  await db('permissions').del();
  await db('roles').del();
  await db('games').del();
  await db('users').del();
};

/**
 * Mock service responses
 */
export const mockServiceResponses = {
  success: (data: any) => Promise.resolve(data),
  error: (message: string) => Promise.reject(new Error(message)),
  notFound: () => Promise.reject(new Error('Not found')),
  unauthorized: () => Promise.reject(new Error('Unauthorized')),
  validation: (errors: any) => Promise.reject({ validation: errors })
};

// Global test timeout
jest.setTimeout(10000);

// Cleanup after all tests
afterAll(async () => {
  // Close any open database connections
  const db = (global as any).testDb;
  if (db) {
    await db.destroy();
  }
});