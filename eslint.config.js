import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  eslint.configs.recommended,
  // tseslint.configs.recommended,
  prettier,
  {
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      '__e2e__/',
      '__tests__/',
      'vendor/',
      'src/ts/www',
      'src/php',
      'src/wordpress-plugin',
    ]
  },
  {
    // Add config/*.js files to the Node.js environment settings
    files: ['*.config.js', 'config/**/*.js', 'vite.config.js', '__builder__/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        URL: 'readonly' // Added URL global for new URL() constructor
      }
    },
    rules: {
      'no-console': 'off' // Allow console logs in build configuration files
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-console': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': ['off', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
)
