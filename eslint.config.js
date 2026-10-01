import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      'no-console': 'error',
    },
  },
  {
    ignores: ['coverage/', 'node_modules/'],
  },
];
