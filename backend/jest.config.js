module.exports = {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "collectCoverageFrom": [
    "src/**/*.js",
    "src/**/*.ts",
    "!src/server.js",
    "!src/server.ts",
    "!src/config/database.js",
    "!src/config/database.ts",
    "!**/__tests__/**",
    "!**/node_modules/**"
  ],
  "setupFilesAfterEnv": [
    "<rootDir>/tests/setup.js"
  ],
  "testMatch": [
    "<rootDir>/tests/**/*.test.js",
    "<rootDir>/src/**/*.test.js",
    "<rootDir>/src/**/*.test.ts",
    "<rootDir>/src/**/__tests__/**/*.ts",
    "<rootDir>/src/**/*.spec.js",
    "<rootDir>/src/**/*.spec.ts"
  ],
  "testPathIgnorePatterns": [
    "<rootDir>/node_modules/",
    "<rootDir>/src/routes/__tests__/leagues.test.ts.old",
    "<rootDir>/src/routes/__tests__/leagues.integration.test.ts"
  ],
  "moduleFileExtensions": [
    "js",
    "ts",
    "json"
  ],
  "transform": {
    "^.+.ts$": [
      "ts-jest",
      {
        "tsconfig": "tsconfig.test.json",
        "isolatedModules": true,
        "diagnostics": {
          "warnOnly": true
        }
      }
    ]
  },
  "coverageDirectory": "coverage",
  "coverageReporters": [
    "text",
    "lcov",
    "html"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 50,
      "functions": 50,
      "lines": 50,
      "statements": 50
    }
  },
  "testTimeout": 30000,
  "verbose": true,
  "forceExit": true,
  "detectOpenHandles": true,
  "clearMocks": true,
  "resetMocks": true,
  "restoreMocks": true,
  "maxWorkers": 1,
  "transformIgnorePatterns": [
    "node_modules/(?!(@cerbos)/)" 
  ]
};
