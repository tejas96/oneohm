# NX Monorepo Usage Guide - OneOhm EPC

Complete guide to using NX in the OneOhm EPC project.

## 📚 Table of Contents

1. [What is NX?](#what-is-nx)
2. [Quick Start](#quick-start)
3. [Understanding the Monorepo](#understanding-the-monorepo)
4. [Daily Development Workflows](#daily-development-workflows)
5. [Working with Shared Libraries](#working-with-shared-libraries)
6. [NX Commands Reference](#nx-commands-reference)
7. [Dependency Graph](#dependency-graph)
8. [Build Caching](#build-caching)
9. [Affected Detection](#affected-detection)
10. [CI/CD with NX](#cicd-with-nx)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## What is NX?

**NX** is a smart build system for monorepos that provides:

- ⚡ **Intelligent Caching**: Never rebuild the same code twice
- 🎯 **Affected Detection**: Only build/test what changed
- 🔄 **Parallel Execution**: Run tasks across multiple projects simultaneously
- 📊 **Dependency Graph**: Visualize and understand your codebase
- 🛠️ **Code Generators**: Scaffold new libraries and apps quickly

### Why NX for OneOhm EPC?

1. **Faster Development**: Cached builds save 50-70% of build time
2. **Faster CI/CD**: Only affected projects run in CI
3. **Code Sharing**: Easy to share types, utilities, and UI between apps
4. **Scalability**: Add new apps/libs without slowing down
5. **Better DX**: Visualize dependencies, understand impacts

---

## Quick Start

### Installation (Already Done!)

```bash
# Install dependencies
npm install

# Verify NX installation
npx nx --version
```

### Your First NX Commands

```bash
# Build everything
npm run build

# Build only backend
npm run backend:build

# Test everything
npm run test

# Run development server
npm run backend:dev    # Backend API
npm run web:dev        # Web app
```

---

## Understanding the Monorepo

### Project Structure

```
oneohm-epc/
├── apps/                    # Applications
│   ├── backend/            # NestJS API
│   ├── web/                # Next.js web app
│   └── ux/                 # Design assets
│
├── libs/                    # Shared libraries
│   ├── shared-types/       # TypeScript types
│   ├── shared-utils/       # Utility functions
│   ├── shared-theme/       # Design tokens
│   └── shared-assets/      # Constants & config
│
├── nx.json                  # NX configuration
├── tsconfig.base.json       # Shared TypeScript config
└── package.json             # Root package
```

### Applications

| App       | Technology   | Purpose              | Port |
| --------- | ------------ | -------------------- | ---- |
| `backend` | NestJS       | REST API server      | 8085 |
| `web`     | Next.js 16   | Web application      | 3001 |
| `ux`      | Static HTML  | Design documentation | -    |

### Shared Libraries

| Library         | Purpose                       | Used By     |
| --------------- | ----------------------------- | ----------- |
| `shared-types`  | TypeScript interfaces & types | All apps    |
| `shared-utils`  | Utility functions             | All apps    |
| `shared-theme`  | Design system & theme         | Web, Mobile |
| `shared-assets` | Constants & static assets     | All apps    |

---

## Daily Development Workflows

### Starting Development

```bash
# Terminal 1: Start backend
npm run backend:dev

# Terminal 2: Start web
npm run web:dev

```

### Making Changes

#### Scenario 1: Working on Backend Only

```bash
# Make your changes in apps/backend/

# Lint your changes
npx nx lint backend

# Test your changes
npx nx test backend

# Build to verify
npx nx build backend
```

#### Scenario 2: Working on Shared Library

```bash
# Make changes in libs/shared-types/

# See what's affected
npm run affected:graph

# Test affected projects
npm run affected:test

# Build affected projects
npm run affected:build
```

#### Scenario 3: Working Across Multiple Projects

```bash
# Make changes in multiple apps/libs

# Run lint on all affected
npm run affected:lint

# Run tests on all affected
npm run affected:test

# Build all affected
npm run affected:build
```

### Before Committing

```bash
# Run full checks on affected projects
npm run affected:lint
npm run affected:test
npm run affected:build

# Format all code
npm run format

# Check formatting
npm run format:check
```

---

## Working with Shared Libraries

### Importing from Shared Libraries

```typescript
// In any app (backend, web)

// Import types
import { User, ApiResponse, UserRole } from '@oneohm-epc/shared-types';

// Import utilities
import { formatDate, debounce, isValidEmail } from '@oneohm-epc/shared-utils';

// Import theme
import { theme, colors, spacing } from '@oneohm-epc/shared-theme';

// Import constants
import { API_CONFIG, ROUTES, STORAGE_KEYS } from '@oneohm-epc/shared-assets';
```

### Example: Using Shared Types in Backend

```typescript
// apps/backend/src/users/users.service.ts
import { User, ApiResponse, UserRole } from '@oneohm-epc/shared-types';
import { formatDate } from '@oneohm-epc/shared-utils';

export class UsersService {
  async getUser(id: string): Promise<ApiResponse<User>> {
    const user: User = {
      id,
      email: 'user@example.com',
      name: 'John Doe',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      success: true,
      data: user,
      message: `User retrieved at ${formatDate(new Date())}`,
    };
  }
}
```

### Example: Using Shared Theme in Web

```typescript
// apps/web/components/Button.tsx
import { colors, spacing, borderRadius } from '@oneohm-epc/shared-theme';

export const Button = () => {
  return (
    <button
      style={{
        backgroundColor: colors.primary.main,
        color: colors.primary.contrastText,
        padding: `${spacing.sm}px ${spacing.md}px`,
        borderRadius: borderRadius.md,
      }}
    >
      Click Me
    </button>
  );
};
```

### Adding New Shared Code

#### To Add a New Type:

```typescript
// libs/shared-types/src/index.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}
```

#### To Add a New Utility:

```typescript
// libs/shared-utils/src/index.ts
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};
```

#### To Add Theme Colors:

```typescript
// libs/shared-theme/src/index.ts
export const colors = {
  // ... existing colors
  custom: {
    brand: '#667eea',
    accent: '#764ba2',
  },
};
```

### Building Shared Libraries

```bash
# Build specific library
npx nx build shared-types
npx nx build shared-utils

# Build all libraries
npx nx run-many --target=build --projects=shared-*

# Test libraries
npx nx test shared-types
```

---

## NX Commands Reference

### Project Management

```bash
# List all projects
npx nx show projects

# Show project details
npx nx show project backend

# Show project configuration
npx nx show project backend --web
```

### Building

```bash
# Build specific project
npx nx build backend
npx nx build web

# Build all projects
npx nx run-many --target=build --all

# Build with specific configuration
npx nx build backend --configuration=production
npx nx build web --configuration=development

# Build in parallel
npx nx run-many --target=build --all --parallel=3
```

### Testing

```bash
# Test specific project
npx nx test backend
npx nx test web

# Test all projects
npx nx run-many --target=test --all

# Test with coverage
npx nx test backend --coverage

# Test in watch mode
npx nx test backend --watch
```

### Linting & Formatting

```bash
# Lint specific project
npx nx lint backend

# Lint all projects
npx nx run-many --target=lint --all

# Format code
npm run format

# Check formatting
npm run format:check
```

### Development Servers

```bash
# Start backend dev server
npx nx serve backend

# Start web dev server
npx nx serve web

# Using npm scripts
npm run backend:dev
npm run web:dev
```

### Affected Commands

```bash
# Show affected projects
npx nx affected:apps
npx nx affected:libs

# Build affected
npx nx affected --target=build

# Test affected
npx nx affected --target=test

# Lint affected
npx nx affected --target=lint

# Run affected with base comparison
npx nx affected --target=build --base=main --head=HEAD
```

---

## Dependency Graph

### Viewing the Graph

```bash
# Full dependency graph (opens in browser)
npm run graph

# Affected projects graph
npm run affected:graph

# Focus on specific project
npx nx graph --focus=backend
```

### Understanding the Graph

- **Nodes**: Represent projects (apps and libraries)
- **Edges**: Represent dependencies between projects
- **Colors**:
  - Blue: Applications
  - Green: Libraries
  - Red: Affected projects (in affected graph)

### Example Graph Relationships

```
web ──────► shared-types
     └────► shared-utils
     └────► shared-theme
     └────► shared-assets

backend ──► shared-types
        └─► shared-utils
        └─► shared-assets

       └───► shared-utils
       └───► shared-theme
       └───► shared-assets
```

**What this means:**

- If you change `backend`, only `backend` is affected

---

## Build Caching

### How Caching Works

NX caches the output of any task based on:

1. **Input files**: Source code, dependencies
2. **Configuration**: tsconfig, jest config, etc.
3. **Environment**: Node version, OS

If inputs haven't changed, NX restores from cache.

### Cache Benefits

```bash
# First build (no cache)
$ npm run backend:build
✔ nx run backend:build (4s)

# Second build (from cache)
$ npm run backend:build
✔ nx run backend:build (0.8s)  [existing outputs match the cache]
```

**Result**: 80% faster! ⚡

### Cache Location

```bash
# Local cache
.nx/cache/

# View cache
ls -lh .nx/cache/
```

### Clearing Cache

```bash
# Clear NX cache
npx nx reset

# Full clean (including node_modules)
npm run clean
npm install
```

---

## Affected Detection

### What is "Affected"?

NX compares your current branch with a base branch (usually `main`) and determines which projects are affected by your changes.

### How Affected Detection Works

#### Example 1: Change Only Backend

```bash
# You modified: apps/backend/src/app.service.ts

$ npx nx affected:apps
> backend

# Only backend is affected
$ npm run affected:build
✔ nx run backend:build (4s)

# Total: 1 project
```

#### Example 2: Change Shared Types

```bash
# You modified: libs/shared-types/src/index.ts

$ npx nx affected:apps
> backend
> web

# All apps that depend on shared-types
$ npm run affected:build
✔ nx run shared-types:build (2s)
✔ nx run backend:build (4s)
✔ nx run web:build (7s)

# Total: 3 projects
```

#### Example 3: Change Only UX

```bash
# You modified: apps/ux/index.html

$ npx nx affected:apps
> ux

# Only UX is affected
$ npm run affected:build
✔ nx run ux:build (0.5s)

# Total: 1 project
```

### Using Affected in Development

```bash
# Before committing, test only what you changed
npm run affected:test

# Lint only what you changed
npm run affected:lint

# Build only what you changed
npm run affected:build

# See what will be affected
npm run affected:graph
```

### Affected with Custom Base

```bash
# Compare with specific branch
npx nx affected --target=build --base=develop

# Compare with specific commit
npx nx affected --target=build --base=abc123

# Compare between two commits
npx nx affected --target=build --base=abc123 --head=def456
```

---

## CI/CD with NX

### Updated GitHub Actions Workflow

The new unified `ci-cd.yml` workflow:

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD with NX

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    - uses: nrwl/nx-set-shas@v4 # Sets up affected detection
    - run: npx nx affected --target=lint --parallel=3

  test:
    - uses: nrwl/nx-set-shas@v4
    - run: npx nx affected --target=test --parallel=3

  build:
    - uses: nrwl/nx-set-shas@v4
    - run: npx nx affected --target=build --parallel=3
```

### CI/CD Benefits

#### Before NX (Individual Workflows)

```
PR changes only web app:
✓ Backend CI (5 min) - UNNECESSARY
✓ Web CI (3 min)     - NEEDED
✓ Mobile CI (2 min)  - UNNECESSARY
─────────────────────
Total: 10 minutes
```

#### With NX (Affected Detection)

```
PR changes only web app:
✓ Web CI (3 min)     - NEEDED
─────────────────────
Total: 3 minutes (70% faster!)
```

### CI/CD Examples

#### Scenario 1: Backend PR

```
Changes: apps/backend/src/app.service.ts

CI runs:
✓ Lint backend (30s)
✓ Test backend (1m)
✓ Build backend (1m)
Total: 2.5 minutes
```

#### Scenario 2: Shared Types PR

```
Changes: libs/shared-types/src/index.ts

CI runs:
✓ Lint shared-types, backend, web (1m)
✓ Test shared-types, backend, web (2m)
✓ Build shared-types, backend, web (4m)
Total: 7 minutes
```

#### Scenario 3: Documentation PR

```
Changes: README.md

CI runs:
✓ Nothing affected
Total: 30s (just setup)
```

---

## Best Practices

### 1. Use Affected Commands Frequently

```bash
# Before committing
npm run affected:lint
npm run affected:test

# During code review
npm run affected:graph  # Show reviewer what's affected
```

### 2. Keep Shared Libraries Focused

**Good:**

```
libs/
├── shared-types/        # Only TypeScript types
├── shared-utils/        # Only pure functions
└── shared-ui/           # Only UI components
```

**Bad:**

```
libs/
└── shared/              # Everything mixed together ❌
```

### 3. Design Library Dependencies Carefully

**Good:**

```
shared-utils  (no dependencies)
     ↑
shared-types  (depends on utils)
     ↑
shared-ui     (depends on types & utils)
```

**Bad:**

```
shared-utils ←→ shared-types  (circular dependency ❌)
```

### 4. Use TypeScript Path Mapping

**Good:**

```typescript
import { User } from '@oneohm-epc/shared-types';
```

**Bad:**

```typescript
import { User } from '../../../libs/shared-types/src/index';
```

### 5. Cache-Friendly Code

```bash
# Avoid changing files that affect everything
# Bad: Changing root package.json triggers rebuild of all

# Good: Add dependencies to specific projects
npm install lodash --workspace=@oneohm-epc/backend
```

### 6. Commit Frequently

```bash
# Affected detection works better with smaller changes
git commit -m "feat: add user validation"
git commit -m "test: add user tests"
git commit -m "docs: update user docs"
```

### 7. Use NX Console (VS Code)

Install the NX Console extension for VS Code for:

- Visual project explorer
- Run tasks with UI
- Generate new libraries
- View dependency graph

```bash
code --install-extension nrwl.angular-console
```

---

## Troubleshooting

### Cache Issues

**Problem**: Changes not reflected in build

**Solution**:

```bash
# Clear NX cache
npx nx reset

# Clear everything
npm run clean
npm install
```

### TypeScript Path Issues

**Problem**: Import from shared library not found

**Solution**:

```bash
# Check tsconfig.base.json has path mapping
cat tsconfig.base.json

# Rebuild TypeScript project references
npx nx reset
npx nx build shared-types
```

### Affected Detection Not Working

**Problem**: Too many/few projects affected

**Solution**:

```bash
# Check what NX sees as base
npx nx print-affected

# Manually specify base
npx nx affected --target=build --base=origin/main
```

### Build Fails in CI but Works Locally

**Problem**: CI build fails but local build works

**Solution**:

```bash
# Run CI commands locally
npm ci  # Use clean install like CI
npx nx affected --target=build --base=origin/main

# Check for uncommitted files
git status
```

### Performance Issues

**Problem**: NX commands are slow

**Solution**:

```bash
# Enable NX daemon
echo '{"useDaemonProcess": true}' > nx.json

# Or install @swc-node for faster TypeScript
npm install -D @swc-node/register @swc/core
```

### Import Errors

**Problem**: Cannot find module '@oneohm-epc/shared-\*'

**Solution**:

```bash
# 1. Build the library first
npx nx build shared-types

# 2. Check tsconfig.base.json paths
# 3. Restart TypeScript server in IDE
# VS Code: Cmd+Shift+P -> "Restart TS Server"
```

---

## Advanced Topics

### Creating New Library

```bash
# Generate new shared library
npx nx generate @nx/js:library shared-api-client \
  --directory=libs/shared-api-client \
  --tags=type:lib,scope:shared

# Or manually create structure like existing libs
```

### Remote Caching (NX Cloud)

For teams, enable remote caching:

```bash
# Connect to NX Cloud (free for open source)
npx nx connect

# Team members share cache
# First dev builds: 5min
# Other devs: 30s (from shared cache)
```

### Custom Executors

Create custom build/test targets in `project.json`:

```json
{
  "targets": {
    "custom-task": {
      "executor": "nx:run-commands",
      "options": {
        "command": "echo 'Custom task running'"
      }
    }
  }
}
```

---

## Cheat Sheet

### Common Commands

| Task              | Command                  |
| ----------------- | ------------------------ |
| Build all         | `npm run build`          |
| Build backend     | `npm run backend:build`  |
| Test all          | `npm run test`           |
| Test backend      | `npm run backend:test`   |
| Lint all          | `npm run lint`           |
| Format code       | `npm run format`         |
| Start backend dev | `npm run backend:dev`    |
| Start web dev     | `npm run web:dev`        |
| Show graph        | `npm run graph`          |
| Show affected     | `npm run affected:graph` |
| Build affected    | `npm run affected:build` |
| Test affected     | `npm run affected:test`  |
| List projects     | `npx nx show projects`   |
| Reset cache       | `npx nx reset`           |
| Clean all         | `npm run clean`          |

### Quick Workflows

**Daily Development:**

```bash
npm run backend:dev    # Start backend
npm run web:dev        # Start web
# Make changes...
npm run affected:test  # Test changes
git commit
```

**Before PR:**

```bash
npm run affected:lint
npm run affected:test
npm run affected:build
npm run format
```

**Fix Build Issues:**

```bash
npx nx reset
npm run clean
npm install
npm run build
```

---

## Resources

- [NX Documentation](https://nx.dev)
- [NX Cloud](https://nx.app) - Free remote caching
- [NX Console](https://marketplace.visualstudio.com/items?itemName=nrwl.angular-console) - VS Code extension
- [Main Project README](../README.md)

---

**Happy coding with NX! 🚀**
