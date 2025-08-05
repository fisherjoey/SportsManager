module.exports = {
  ignorePatterns: ['backend/**/*', 'node_modules/**/*'],
  extends: [
    'next/core-web-vitals',
    'next/typescript'
  ],
  rules: {
    // Quality Rules for Agents
    'no-console': 'warn', // Discourage console.log in production
    'no-debugger': 'error',
    'no-unused-vars': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // Code style consistency
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'never'],
    'comma-dangle': ['error', 'never'],
    
    // React/Next.js best practices
    'react-hooks/exhaustive-deps': 'warn',
    'react/prop-types': 'off', // Using TypeScript instead
    'react/react-in-jsx-scope': 'off', // Not needed in Next.js
    
    // Import organization
    'import/order': [
      'error',
      {
        'groups': [
          'builtin',
          'external', 
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'always'
      }
    ],
    
    // Security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error'
  },
  overrides: [
    {
      // Test files can be more relaxed
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off'
      }
    }
  ]
}