import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
    ],
  },

  {
    files: [
      'src/**/*.ts',
      'test/**/*.ts',
    ],

    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],

    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          ignoreRestSiblings: true,
        },
      ],
    },
  },
)