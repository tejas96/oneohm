// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
// @ts-expect-error - SonarJS types may not be available
import sonarjs from 'eslint-plugin-sonarjs';
import unusedImports from 'eslint-plugin-unused-imports';
// @ts-expect-error - react-hooks types may not be available
import reactHooks from 'eslint-plugin-react-hooks';
import nxPlugin from '@nx/eslint-plugin';
import jsoncParser from 'jsonc-eslint-parser';

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
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
      sonarjs,
      'unused-imports': unusedImports,
      'react-hooks': reactHooks,
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
          './libs/shared/tsconfig.json',
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
      // Note: Use regular imports (not type-only) for classes used in dependency injection
      // Example: Reflector, guards, services - they need runtime values
      // IMPORTANT: Enums are BOTH types and runtime values in TypeScript
      // This rule has a limitation - it can't distinguish between pure types and enums
      // When enums are only used in type positions (like interface properties),
      // the rule incorrectly tries to convert them to type-only imports, which breaks runtime usage
      // Solution: Turn off this rule to allow manual control over when to use type imports
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',

      // ------------------------------
      // ⚙️ Code Hygiene
      // ------------------------------
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-duplicate-imports': 'off', // Use import/no-duplicates instead for better auto-fix
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
      'import/no-duplicates': ['error', { 'prefer-inline': true }], // Auto-fix duplicate imports, works with type imports
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
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/require-await': 'warn',
      // Path alias resolution can cause false positives with type constituents
      '@typescript-eslint/no-redundant-type-constituents': 'warn',

      // ------------------------------
      // ⚛️ React Hooks
      // ------------------------------
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',

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

  // ===============================
  // 5️⃣ Nx Dependency Checks — Backend only
  // Automatically validates that apps/backend/package.json stays in sync
  // with what the backend source code actually imports.
  // After installing a new package: nx lint backend --fix  ← auto-updates package.json
  // ===============================
  {
    files: ['apps/backend/package.json'],
    plugins: { '@nx': nxPlugin },
    languageOptions: {
      parser: jsoncParser,
    },
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          buildTargets: ['build'],
          checkMissingDependencies: true,
          checkObsoleteDependencies: true,
          checkVersionMismatches: true,
          // Packages that are legitimate runtime deps but not directly imported
          // (loaded internally by NestJS, TypeORM, or Passport adapters)
          ignoredDependencies: [
            'tslib',
            '@nestjs/platform-express', // NestJS bootstraps this internally
            'passport',                  // passport-jwt loads this as peer dep
            'pg',                        // TypeORM loads this as the postgres driver
            '@nestjs/testing',           // only imported in test/ files, not in build target
            'supertest',                 // only imported in test/ files, not in build target
          ],
        },
      ],
    },
  },
];
