/**
 * Jest Configuration for New TypeScript-Native Tests
 *
 * This configuration is optimized for the new test suite that follows
 * TypeScript best practices and modern testing patterns.
 */

module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Only look for tests in the new tests directory
  roots: ['<rootDir>/tests/new'],

  // Test file patterns
  testMatch: [
    '**/tests/new/**/*.test.ts',
    '**/tests/new/**/*.spec.ts'
  ],

  // Ignore old tests and node_modules
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/(?!new)', // Ignore everything in tests except 'new' folder
    '/src/.*\\.test\\.ts$' // Ignore old tests in src directory
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/server.ts',
    '!src/types/**',
    '!**/node_modules/**'
  ],

  // Coverage thresholds for new tests (gradual increase)
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 70,
      statements: 70
    },
    './src/services/': {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80
    },
    './src/utils/': {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85
    }
  },

  // Module name mapping for clean imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1'
  },

  // Setup files - commented out for now since file doesn't exist yet
  // setupFilesAfterEnv: [
  //   '<rootDir>/tests/new/setup/jest.setup.ts'
  // ],

  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        // Override tsconfig for tests
        allowJs: true,
        esModuleInterop: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        isolatedModules: false, // Allow full type checking in tests
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true
      }
    }]
  },

  // Global settings
  globals: {
    'process.env': {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379/0'
    }
  },

  // Test timeouts
  testTimeout: 10000, // 10 seconds for individual tests

  // Verbose output for better debugging
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit-new.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Watch mode settings
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.git/'
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Max worker threads (use half of available CPUs)
  maxWorkers: '50%',

  // Fail fast on first test failure in CI
  bail: process.env.CI === 'true' ? 1 : 0
};