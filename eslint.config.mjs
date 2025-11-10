// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
// @ts-expect-error - SonarJS types may not be available
import sonarjs from 'eslint-plugin-sonarjs';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  // ===============================
  // 1️⃣ Ignore Unnecessary Paths
  // ===============================
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/out/**',
      '**/coverage/**',
      '**/.nx/**',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',
      '**/jest.config.ts',
      '**/jest.preset.js',
      '**/jest-e2e.config.ts',
    ],
  },

  // ===============================
  // 2️⃣ Base ESLint + TypeScript Rules
  // ===============================
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
  })),
  prettierConfig,

  // ===============================
  // 2.5️⃣ Plugin Recommended Configs (Optional)
  // ===============================
  // Uncomment these if you want to use ALL recommended rules from these plugins:
  // importPlugin.flatConfigs?.recommended,
  // sonarjs.configs?.recommended,

  // ===============================
  // 3️⃣ Main Rules for All Files
  // ===============================
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    plugins: {
      import: importPlugin,
      sonarjs,
      'unused-imports': unusedImports,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        project: [
          './tsconfig.base.json',
          './apps/web/tsconfig.json',
          './apps/backend/tsconfig.json',
          './libs/shared-auth/tsconfig.json',
          './libs/shared-types/tsconfig.json',
          './libs/shared-utils/tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ------------------------------
      // 🧠 Type Safety
      // ------------------------------
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',

      // ------------------------------
      // ⚙️ Code Hygiene
      // ------------------------------
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-else-return': 'warn',
      'no-return-await': 'error',
      'no-unused-expressions': 'error',
      'no-useless-catch': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'prefer-const': 'error',
      'prefer-template': 'warn',
      'prefer-arrow-callback': 'error',
      'no-multi-assign': 'warn',

      // ------------------------------
      // 🧩 Imports & Monorepo Cleanliness
      // ------------------------------
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-cycle': 'error',
      'import/no-default-export': 'warn',
      'import/no-unresolved': 'off',

      // ------------------------------
      // 💬 Naming & Consistency
      // ------------------------------
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
      ],
      '@typescript-eslint/member-ordering': [
        'warn',
        {
          default: [
            'signature',
            'public-static-field',
            'protected-static-field',
            'private-static-field',
            'public-instance-field',
            'protected-instance-field',
            'private-instance-field',
            'constructor',
            'public-instance-method',
            'protected-instance-method',
            'private-instance-method',
          ],
        },
      ],
      '@typescript-eslint/adjacent-overload-signatures': 'error',

      // ------------------------------
      // ⚡ Performance / Safety
      // ------------------------------
      '@typescript-eslint/no-for-in-array': 'error',
      '@typescript-eslint/no-unnecessary-type-arguments': 'warn',
      '@typescript-eslint/prefer-reduce-type-parameter': 'warn',
      '@typescript-eslint/prefer-regexp-exec': 'warn',
      '@typescript-eslint/unified-signatures': 'warn',

      // ------------------------------
      // 🧹 Unused Imports / Variables
      // ------------------------------
      'unused-imports/no-unused-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // ------------------------------
      // 🧱 Unsafe Access / Assignment (soft warnings)
      // ------------------------------
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/require-await': 'warn',

      // ------------------------------
      // 🧩 SonarJS Specific Tweaks
      // ------------------------------
      'sonarjs/no-duplicate-string': 'off', // too noisy for constants
    },
  },

  // ===============================
  // 4️⃣ Special Config for Shared Libs (no type-checking)
  // ===============================
  {
    files: ['libs/**/*.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
];
