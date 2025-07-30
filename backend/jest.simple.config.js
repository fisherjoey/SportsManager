module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**/*.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage-simple',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '**/*.unit.test.js',
    '**/utils/*.test.js'
  ],
  setupFilesAfterEnv: [],
  verbose: true
};