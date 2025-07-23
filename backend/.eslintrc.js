module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    // Quality rules for backend agents
    'no-console': 'warn', // Allow console.log for logging but warn
    'no-debugger': 'error',
    'no-unused-vars': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    
    // Code style consistency
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    
    // Node.js best practices
    'no-process-exit': 'error',
    'no-path-concat': 'error',
    'handle-callback-err': 'error',
    
    // Security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // Error handling
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',
    
    // Code complexity
    'complexity': ['warn', 10],
    'max-depth': ['warn', 4],
    'max-nested-callbacks': ['warn', 3],
    
    // Async/await
    'no-async-promise-executor': 'error',
    'require-atomic-updates': 'error'
  },
  overrides: [
    {
      // Test files can be more relaxed
      files: ['**/*.test.js', '**/*.spec.js', 'tests/**/*.js'],
      rules: {
        'no-console': 'off',
        'complexity': 'off',
        'max-depth': 'off'
      }
    },
    {
      // Migration files have different patterns
      files: ['migrations/**/*.js', 'seeds/**/*.js'],
      rules: {
        'complexity': 'off'
      }
    }
  ]
}