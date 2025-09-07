import js from '@eslint/js'
import typescript from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import importPlugin from 'eslint-plugin-import'
import prettier from 'eslint-plugin-prettier/recommended'
import tsParser from '@typescript-eslint/parser'
import type { Linter } from 'eslint'

const config: Linter.Config[] = [
  // Base JavaScript and TypeScript configs
  js.configs.recommended,
  ...typescript.configs.recommended,

  // Prettier config (should be last)
  prettier,

  // Global ignores
  {
    ignores: ['dist/**', 'build/**', 'node_modules/**', '*.config.js'],
  },

  // Main configuration
  {
    files: ['**/*.{js,jsx,ts,tsx}'],

    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
    },

    languageOptions: {
      ecmaVersion: 'latest' as const,
      sourceType: 'module' as const,
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        browser: true,
        es2021: true,
        node: true,
      },
    },

    settings: {
      react: {
        version: 'detect',
        pragma: 'h',
        pragmaFrag: 'Fragment',
      },
      'import/resolver': {
        typescript: {},
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },

    rules: {
      // React rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Import rules
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always' as const,
          alphabetize: {
            order: 'asc' as const,
            caseInsensitive: true,
          },
        },
      ],

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',

      // Prettier
      'prettier/prettier': 'error',
    },
  },
]

export default config
