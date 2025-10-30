# OneOhm EPC - NX Monorepo

A professional NX-powered monorepo for the OneOhm EPC project, containing backend API, web application, mobile app, UX design assets, and shared libraries.

## 📁 Project Structure

```
oneohm-epc/
├── apps/
│   ├── backend/       # NestJS API server
│   ├── web/           # Next.js web application
│   ├── mobile/        # React Native mobile app
│   └── ux/            # UX design assets & documentation
├── libs/
│   ├── shared-types/  # Shared TypeScript types
│   ├── shared-utils/  # Shared utility functions
│   ├── shared-theme/  # Shared theme configuration
│   └── shared-assets/ # Shared constants and assets
├── .github/
│   └── workflows/     # NX-powered CI/CD pipelines
├── nx.json            # NX configuration
├── tsconfig.base.json # Base TypeScript configuration
├── package.json       # Root workspace configuration
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm (comes with Node.js)

### Installation

Install all dependencies for all projects:

```bash
npm install
```

## ⚡ NX Commands

NX provides intelligent build system with caching and affected detection.

### Development

```bash
# Backend
npm run backend:dev    # Start backend API in watch mode

# Web
npm run web:dev        # Start Next.js dev server

# Mobile (after React Native initialization)
npm run mobile:start   # Start Metro bundler
```

### Building

```bash
# Build specific app
npm run backend:build
npm run web:build

# Build all apps
npm run build

# Build only affected apps (faster!)
npm run affected:build
```

### Testing

```bash
# Test specific app
npm run backend:test

# Test all apps
npm run test

# Test only affected apps
npm run affected:test
```

### Linting & Formatting

```bash
# Lint all code
npm run lint

# Lint only affected
npm run affected:lint

# Format all code
npm run format

# Check formatting
npm run format:check
```

### NX Graph

Visualize your project dependencies:

```bash
npm run graph           # Show full dependency graph
npm run affected:graph  # Show only affected projects
```

## 📦 Shared Libraries

### Using Shared Libraries

All shared libraries are automatically available via TypeScript path mapping:

```typescript
// In any app (backend, web, mobile)
import { User, ApiResponse } from '@oneohm-epc/shared-types';
import { formatDate, debounce } from '@oneohm-epc/shared-utils';
import { theme, colors } from '@oneohm-epc/shared-theme';
import { API_CONFIG, ROUTES } from '@oneohm-epc/shared-assets';
```

### Available Libraries

#### `@oneohm-epc/shared-types`

Common TypeScript types and interfaces.

#### `@oneohm-epc/shared-utils`

Utility functions (date formatting, validation, etc.).

#### `@oneohm-epc/shared-theme`

Theme configuration (colors, spacing, typography, etc.).

#### `@oneohm-epc/shared-assets`

Constants, config, and static assets.

## 🔧 Development

### Code Quality

This monorepo uses shared ESLint and Prettier configurations for consistency across all projects.

```bash
# Format all code
npm run format

# Check formatting
npm run format:check

# Lint all code
npm run lint

# Lint check (no auto-fix)
npm run lint:check
```

### Clean Install

Remove all caches and reinstall:

```bash
npm run clean
npm install
```

## 🔄 CI/CD with NX

### Intelligent Build System

NX automatically detects which projects are affected by your changes and only builds/tests those projects.

#### Example Scenarios:

**Scenario 1: Changed only shared-types**

- ✅ Builds/tests: `shared-types`, `backend`, `web`, `mobile` (all consumers)
- ❌ Skips: `ux` (not dependent on shared-types)

**Scenario 2: Changed only web app**

- ✅ Builds/tests: `web` only
- ❌ Skips: `backend`, `mobile`, `ux`, all libs

**Scenario 3: Changed only UX designs**

- ✅ Builds: `ux` only
- ❌ Skips: Everything else

### CI/CD Workflow

The unified `ci-cd.yml` workflow:

1. Detects affected projects
2. Runs lint on affected projects in parallel
3. Runs tests on affected projects in parallel
4. Builds affected projects in parallel
5. Deploys only affected apps to production

**Result:** 50-70% faster CI/CD times as your monorepo grows!

### Local Affected Commands

```bash
# See what's affected by your changes
npx nx affected:graph

# Build only affected
npm run affected:build

# Test only affected
npm run affected:test

# Lint only affected
npm run affected:lint
```

## 🏗️ Architecture

### Monorepo Benefits with NX

- **Intelligent Caching**: NX caches build outputs. Rebuild only when source changes
- **Affected Detection**: Only build/test what changed
- **Parallel Execution**: Run tasks across multiple projects simultaneously
- **Dependency Graph**: Visualize and understand project relationships
- **Code Sharing**: Share types, utilities, and components between apps
- **Consistent Tooling**: Same development experience across all projects
- **Atomic Changes**: Make changes across multiple apps in a single commit

### Workspace Management

This project uses **NX workspaces** on top of **npm workspaces**:

- Dependencies are hoisted to the root `node_modules` when possible
- NX provides intelligent task scheduling and caching
- Shared libraries are automatically linked via TypeScript path mapping

## 📝 Adding New Dependencies

```bash
# Root-level dev dependency (shared tooling)
npm install -D <package-name>

# Backend-specific dependency
npm install <package-name> --workspace=@oneohm-epc/backend

# Web-specific dependency
npm install <package-name> --workspace=@oneohm-epc/web

# Mobile-specific dependency
npm install <package-name> --workspace=@oneohm-epc/mobile

# Shared library dependency
npm install <package-name> --workspace=@oneohm-epc/shared-utils
```

## 🔐 Environment Variables

Each app manages its own environment variables:

- Backend: `apps/backend/.env`
- Web: `apps/web/.env.local`
- Mobile: `apps/mobile/.env`

Never commit sensitive credentials. Use `.env.example` files as templates.

## 🤝 Contributing

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Run affected checks: `npm run affected:lint && npm run affected:test`
6. Commit your changes: `git commit -m "feat: your feature"`
7. Push to the branch: `git push origin feature/your-feature`
8. Open a Pull Request

## 📊 NX Features

### 1. Build Caching

NX caches the output of any task. If the inputs haven't changed, NX restores the cached output:

```bash
# First build
npm run backend:build  # Takes 30s

# Second build (nothing changed)
npm run backend:build  # Takes <1s (from cache)
```

### 2. Affected Commands

Only run tasks on projects affected by your changes:

```bash
# What changed?
npx nx affected:apps
npx nx affected:libs

# Build only what changed
npm run affected:build
```

### 3. Dependency Graph

Visualize your monorepo:

```bash
# Full graph
npm run graph

# What's affected by changes
npm run affected:graph
```

### 4. Parallel Execution

Run tasks in parallel with configurable workers:

```bash
# Run tests in parallel across 3 workers
npx nx run-many --target=test --all --parallel=3
```

## 🐳 Docker

Run the entire stack with Docker Compose:

```bash
# Production mode
npm run docker:build   # Build images
npm run docker:up      # Start all services
npm run docker:logs    # View logs
npm run docker:down    # Stop services

# Development mode (with hot reload)
npm run docker:dev     # Start dev environment
npm run docker:dev:down # Stop dev environment

# Services available at:
# - Backend API: http://localhost:8085
# - Web App: http://localhost:3001
# - PostgreSQL: localhost:5436
```

See [Docker Documentation](./docs/DOCKER.md) for detailed usage.

## 📚 Documentation

### **📖 Essential Guides**

- [**NX Usage Guide**](./docs/NX-USAGE-GUIDE.md) - Complete guide to using NX (START HERE!)
- [**CI/CD with NX**](./docs/CI-CD-WITH-NX.md) - GitHub Actions workflow documentation

### **📱 Application Docs**

- [Backend Documentation](./apps/backend/README.md)
- [Web Documentation](./apps/web/README.md)
- [Mobile Documentation](./apps/mobile/README.md)
- [UX Documentation](./apps/ux/README.md)

### **📦 Shared Libraries**

- [Shared Types](./libs/shared-types/README.md)

## 🔗 Resources

- [NX Documentation](https://nx.dev/getting-started/intro)
- [NX Cloud](https://nx.app/) - Free remote caching for open source
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)

## 📄 License

UNLICENSED - Private project
