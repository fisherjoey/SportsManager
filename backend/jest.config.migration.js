/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.js'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        allowJs: true,
        esModuleInterop: true,
        strict: false
      }
    }]
  },
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,ts}',
    '!src/**/__tests__/**',
    '!src/migrations/**',
    '!src/seeds/**'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup.ts'],
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.bridge.',
    '/.backup'
  ],
  coverageDirectory: 'coverage/migration',
  coverageReporters: ['text', 'lcov', 'html'],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};