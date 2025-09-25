/**
 * Jest setup file
 * This file is run before each test suite
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-secret-key';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Keep console.log for debugging but suppress warnings/errors during tests
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  createMockReq: (overrides = {}) => ({
    ip: '127.0.0.1',
    method: 'GET',
    path: '/test',
    body: {},
    query: {},
    params: {},
    headers: {},
    user: undefined,
    ...overrides
  }),

  createMockRes: () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis()
  }),

  createMockNext: () => jest.fn()
};

// Setup for async tests
jest.setTimeout(10000);