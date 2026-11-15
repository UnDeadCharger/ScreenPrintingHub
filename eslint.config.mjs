import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['**/dist', '.claude', '.agents'] },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    rules: {
      // Nest modules are intentionally empty decorated classes.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' },
  },
  // Node scripts: Node's globals (Buffer, console) are not declared for ESLint.
  { files: ['scripts/**/*.mjs'], rules: { 'no-undef': 'off' } },
  prettier,
);
