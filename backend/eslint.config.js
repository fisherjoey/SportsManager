module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {
      // Error Prevention
      'no-unused-vars': ['error', { 
        vars: 'all', 
        args: 'after-used', 
        ignoreRestSiblings: true 
      }],
      'no-undef': 'error',
      'no-console': 'off', // Allowed for server-side logging
      'no-debugger': 'error',
      'no-alert': 'error',
      
      // Code Quality
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'brace-style': ['error', '1tbs'],
      'indent': ['error', 2],
      'quotes': ['error', 'single', { allowTemplateLiterals: true }],
      'semi': ['error', 'always'],
      
      // Security
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-new-wrappers': 'error',
      'no-throw-literal': 'error',
      
      // Best Practices
      'no-duplicate-imports': 'error',
      'no-return-assign': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'prefer-template': 'error',
      'radix': 'error',
      'yoda': 'error',
      
      // Node.js Specific
      'no-process-exit': 'error',
      'no-path-concat': 'error',
      'handle-callback-err': 'error',
      'no-new-require': 'error',
      'no-sync': 'warn',
      
      // Async/Await
      'require-await': 'warn',
      'no-return-await': 'error',
      'prefer-promise-reject-errors': 'error',
      
      // Performance
      'no-loop-func': 'error',
      'no-caller': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-lone-blocks': 'error',
      
      // Complexity Control
      'complexity': ['warn', 15],
      'max-depth': ['warn', 4],
      'max-nested-callbacks': ['warn', 3],
      'max-params': ['warn', 5],
      'max-statements': ['warn', 30],
      'max-len': ['warn', { 
        code: 120, 
        ignoreComments: true, 
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true
      }],
      
      // Documentation
      'require-jsdoc': ['warn', {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: false,
          FunctionExpression: false
        }
      }],
      'valid-jsdoc': ['warn', {
        requireReturn: false,
        requireParamDescription: false,
        requireReturnDescription: false
      }]
    }
  },
  {
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly'
      }
    },
    rules: {
      // Relax some rules for tests
      'max-len': 'off',
      'no-magic-numbers': 'off',
      'require-jsdoc': 'off',
      'max-statements': 'off',
      'max-nested-callbacks': 'off',
      'prefer-promise-reject-errors': 'off'
    }
  },
  {
    files: ['migrations/**/*.js', 'seeds/**/*.js'],
    rules: {
      // Relax rules for database files
      'require-jsdoc': 'off',
      'no-console': 'off',
      'max-statements': 'off'
    }
  }
];