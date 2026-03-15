# OneOhm EPC - Solar Installation Management Platform

> **A comprehensive NX-powered monorepo for managing solar panel installations, quotes, projects, inventory, and customer relationships for EPC (Engineering, Procurement, and Construction) businesses.**

[![NX](https://img.shields.io/badge/NX-22.0-blue.svg)](https://nx.dev)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-red.svg)](https://nestjs.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://postgresql.org)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Applications](#-applications)
- [Shared Libraries](#-shared-libraries)
- [Backend Modules](#-backend-modules)
- [Getting Started](#-getting-started)
- [Development Commands](#-development-commands)
- [Database](#-database)
- [Docker](#-docker)
- [Deployment](#-deployment)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [Resources](#-resources)

---

## 🎯 Overview

OneOhm EPC is a complete business management solution for solar installation companies. It handles the entire lifecycle from lead generation to project completion, including:

- **Lead Management** - Capture, track, and convert leads
- **Quote Generation** - Automated solar system sizing and pricing
- **Project Management** - Track installations from start to finish
- **Inventory Management** - Manage solar panels, inverters, and components
- **Customer Portal** - Self-service for customers to track their projects
- **Finance & Payments** - Invoice generation and payment tracking
- **Compliance** - Subsidy applications and regulatory compliance
- **Service & Maintenance** - AMC and post-installation support

---

## 🛠 Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | 11.0 | API Framework |
| TypeORM | 0.3 | Database ORM |
| PostgreSQL | 15 | Primary Database |
| Passport | 0.7 | Authentication |
| JWT | 11.0 | Token-based Auth |
| Swagger | 11.2 | API Documentation |
| AWS S3 | 3.x | File Storage |

### Frontend (Web)
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0 | React Framework |
| React | 19.2 | UI Library |
| Tailwind CSS | 4.0 | Styling |
| TanStack Query | 5.x | Data Fetching |
| TanStack Table | 8.x | Data Tables |
| Zustand | 5.0 | State Management |
| Radix UI | Latest | UI Components |
| Recharts | 3.7 | Charts & Analytics |
| Zod | 3.24 | Validation |

### Build & DevOps
| Technology | Version | Purpose |
|------------|---------|---------|
| NX | 22.0 | Monorepo Management |
| Docker | Latest | Containerization |
| Fly.io | - | Production Hosting |
| TypeScript | 5.7 | Type Safety |
| ESLint | 9.x | Code Linting |
| Prettier | 3.4 | Code Formatting |
| Jest | 30.0 | Testing |

---

## 📁 Project Structure

```
oneohm-epc/
├── apps/
│   ├── backend/                # NestJS API Server
│   │   ├── src/
│   │   │   ├── common/         # Shared utilities (filters, interceptors)
│   │   │   ├── config/         # Configuration files
│   │   │   ├── database/       # Database config, migrations, seeds
│   │   │   ├── modules/        # Feature modules (see Backend Modules)
│   │   │   ├── scripts/        # CLI scripts
│   │   │   └── types/          # Backend-specific types
│   │   ├── test/               # E2E tests
│   │   ├── Dockerfile          # Production Docker config
│   │   ├── fly.toml            # Fly.io deployment config
│   │   └── package.json
│   │
│   ├── web/                    # Next.js Web Application
│   │   ├── app/                # App Router pages
│   │   │   ├── (auth)/         # Auth routes (login, etc.)
│   │   │   └── (dashboard)/    # Dashboard routes
│   │   ├── components/
│   │   │   ├── features/       # Feature-specific components
│   │   │   ├── layout/         # Layout components
│   │   │   ├── shared/         # Reusable components
│   │   │   └── ui/             # Base UI components (shadcn)
│   │   ├── lib/
│   │   │   ├── api/            # API client functions
│   │   │   ├── config/         # App configuration
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── stores/         # Zustand stores
│   │   │   └── utils/          # Utility functions
│   │   ├── providers/          # React context providers
│   │   ├── Dockerfile          # Production Docker config
│   │   └── package.json
│   │
│   └── ux/                     # UX Design Assets & Mockups
│       ├── mobile/             # Mobile app screen designs
│       │   ├── auth/           # Authentication screens
│       │   ├── customer/       # Customer portal screens
│       │   ├── field-worker/   # Field worker app screens
│       │   ├── finance/        # Finance module screens
│       │   ├── sales-person/   # Sales dashboard screens
│       │   └── telecaller/     # Telecaller screens
│       ├── web/                # Web dashboard designs
│       │   ├── v1/             # Version 1 designs
│       │   └── v2/             # Version 2 designs
│       ├── animation/          # Lottie animations
│       └── data/               # Mock data for prototypes
│
├── libs/
│   └── shared/                 # Unified shared package (@oneohm-epc/shared)
│       └── src/
│           ├── types/          # Enums & interfaces
│           ├── utils/          # Pure utility functions
│           ├── schemas/        # Zod validation schemas
│           └── constants/      # Label maps & config values
│
├── docs/                       # Additional documentation
│   ├── NX-USAGE-GUIDE.md       # Complete NX guide
│   ├── CI-CD-WITH-NX.md        # CI/CD documentation
│   ├── DOCKER.md               # Docker usage guide
│   └── WEB-UX-DESIGN-PLAN.md   # UX design planning
│
├── docker-compose.yml          # Local development stack
├── nx.json                     # NX configuration
├── tsconfig.base.json          # Base TypeScript config
└── package.json                # Root workspace config
```

---

## 📱 Applications

### 1. Backend API (`apps/backend`)

**Port:** `8085` | **API Prefix:** `/api/v1`

A comprehensive NestJS REST API powering all business operations.

**Key Features:**
- JWT-based authentication with role-based access control
- Multi-tenant organization support
- RESTful API with Swagger documentation
- TypeORM with PostgreSQL
- File uploads to AWS S3
- Rate limiting and security features

**Quick Start:**
```bash
npm run backend:dev     # Start with hot reload
npm run backend:build   # Build for production
npm run backend:test    # Run tests
```

📖 [Full Backend Documentation](./apps/backend/README.md)

---

### 2. Web Dashboard (`apps/web`)

**Port:** `3001`

A modern Next.js 16 admin dashboard for managing all business operations.

**Key Features:**
- Server-side rendering with App Router
- React Query for data fetching & caching
- Zustand for state management
- Radix UI + Tailwind for UI components
- Dark/Light theme support
- Responsive design

**Feature Modules:**
| Module | Description |
|--------|-------------|
| Dashboard | Overview analytics & KPIs |
| Customers | Customer management |
| Quotes | Quote creation & management |
| Projects | Project tracking |
| Inventory | Stock management |
| Finance | Invoices & payments |
| Approvals | Approval workflows |
| Users | User & role management |

**Quick Start:**
```bash
npm run web:dev    # Start with hot reload
npm run web:build  # Build for production
```

📖 [Full Web Documentation](./apps/web/README.md)

---

### 3. UX Designs (`apps/ux`)

HTML/CSS mockups and interactive prototypes for both mobile and web applications.

**Structure:**
- **`mobile/`** - React Native mobile app designs by user role
- **`web/`** - Web dashboard designs (v1 and v2)
- **`animation/`** - Lottie animation files
- **`data/`** - Mock JSON data for prototypes

**User Roles with Mobile Designs:**
- 👤 **Customer** - Project tracking, payments, service requests
- 🔧 **Field Worker** - Lead capture, site visits, quotes
- 📞 **Telecaller** - Lead follow-ups, call management
- 💼 **Sales Person** - Sales pipeline, performance tracking
- 💰 **Finance** - Invoicing, payment tracking
- 🏗️ **Execution Engineer** - Project tasks, material requests
- 📋 **Liaison Officer** - Subsidy & compliance management

📖 [Full UX Documentation](./apps/ux/README.md)

---

## 📦 Shared Package

A single unified package `@oneohm-epc/shared` (published to GitHub Packages as `@tejas96/shared`) provides types, utilities, schemas, and constants across all apps. Import via sub-path exports:

```typescript
import { QuoteStatus, ProjectStatus, UserRole } from '@oneohm-epc/shared/types';
import { formatCurrency, parsePaginationParams } from '@oneohm-epc/shared/utils';
import { loginSchema, customerSchema } from '@oneohm-epc/shared/schemas';
import { PROJECT_TYPE_LABELS, DISCOUNT_PRESETS } from '@oneohm-epc/shared/constants';
```

| Sub-path | Contents |
|----------|----------|
| `@oneohm-epc/shared/types` | Enums, interfaces, and type definitions |
| `@oneohm-epc/shared/utils` | Pure utility functions (formatters, validators, pricing, pagination) |
| `@oneohm-epc/shared/schemas` | Zod validation schemas |
| `@oneohm-epc/shared/constants` | Label maps and configuration constants |

> See [`libs/shared/README.md`](./libs/shared/README.md) for full developer setup and publishing docs.

---

## 🧩 Backend Modules

The backend is organized into feature modules following NestJS best practices:

### Core Modules

| Module | Description | Entities |
|--------|-------------|----------|
| **auth** | Authentication & authorization | JWT, Passport strategies |
| **iam** | Identity & Access Management | Roles, Permissions, Features |
| **users** | User management | User, Employee profiles |
| **organizations** | Multi-tenant organization support | Organization, Settings |

### Business Modules

| Module | Description | Key Entities |
|--------|-------------|--------------|
| **customers** | Customer & property management | CustomerProfile, CustomerProperty |
| **quotes** | Quote generation & calculator | Quote, QuoteVersion, QuoteLineItem |
| **projects** | Project lifecycle management | Project, Task, Phase, Timeline |
| **inventory** | Stock & warehouse management | Product, Warehouse, StockMovement |
| **master-data** | Product catalog & pricing | ProductCategory, PricingRule, SubsidyRule |

### Operations Modules

| Module | Description | Key Entities |
|--------|-------------|--------------|
| **approvals** | Multi-level approval workflows | ApprovalRequest, ApprovalStep |
| **documents** | Document management | Document, DocumentVersion |
| **storage** | S3 file storage | Pre-signed URLs, Upload management |
| **comments** | Universal commenting system | Comment, Thread |

### Finance Modules

| Module | Description | Key Entities |
|--------|-------------|--------------|
| **payments** | Payment tracking | Payment, PaymentSchedule |
| **loan-finance** | Loan application management | LoanApplication, LoanDocument |

### Compliance & Audit

| Module | Description | Key Entities |
|--------|-------------|--------------|
| **compliance** | Subsidy & regulatory compliance | SubsidyApplication, ComplianceCheck |
| **audit** | Audit trail logging | AuditLog, ChangeHistory |
| **security-events** | Security event tracking | SecurityEvent, LoginAttempt |

### Service Modules

| Module | Description | Key Entities |
|--------|-------------|--------------|
| **service-maintenance** | AMC & service requests | ServiceRequest, MaintenanceSchedule |
| **customer-feedback** | Feedback & ratings | Feedback, Rating, Survey |
| **integrations** | Third-party integrations | IntegrationProvider, Webhook |
| **resellers** | Reseller/partner management | Reseller, Commission |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **npm** (comes with Node.js)
- **PostgreSQL** 15+ (or use Docker)
- **Git**

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd oneohm-epc

# Install dependencies (no GitHub token needed — shared package resolves locally)
npm install

# Set up environment variables
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local

# Start PostgreSQL (using Docker)
docker compose up postgres -d

# Run database migrations
cd apps/backend && npm run migration:run

# Seed initial data (optional)
npm run seed

# Start development servers
cd ../..
npm run backend:dev   # Terminal 1 - Backend on :8085
npm run web:dev       # Terminal 2 - Web on :3001
```

### Mobile App Setup

The mobile app (`oneohm-epc-mobile`) is in a separate repository and installs the shared package from GitHub Packages:

```bash
cd oneohm-epc-mobile
cp .env.example .env
# Edit .env → set GITHUB_PACKAGES_TOKEN=ghp_your_token
npm run setup
```

Generate a token with `read:packages` scope at https://github.com/settings/tokens/new?scopes=read:packages

---

## ⚡ Development Commands

### Application Commands

| Command | Description |
|---------|-------------|
| `npm run backend:dev` | Start backend in watch mode |
| `npm run backend:build` | Build backend for production |
| `npm run backend:test` | Run backend unit tests |
| `npm run web:dev` | Start Next.js dev server |
| `npm run web:build` | Build Next.js for production |
| `npm run ux:dev` | Serve UX designs |

### NX Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build all apps |
| `npm run test` | Test all apps |
| `npm run lint` | Lint all code |
| `npm run affected:build` | Build only changed apps |
| `npm run affected:test` | Test only changed apps |
| `npm run graph` | Visualize dependency graph |

### Code Quality

| Command | Description |
|---------|-------------|
| `npm run format` | Format all code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run lint:fix` | Lint and auto-fix issues |
| `npm run typecheck` | Run TypeScript type checking |

### Utility Commands

| Command | Description |
|---------|-------------|
| `npm run clean` | Remove all build artifacts and caches |
| `npm run install:all` | Fresh install of all dependencies |

---

## 🗄️ Database

### PostgreSQL Configuration

The application uses PostgreSQL 15 with TypeORM.

**Default Credentials (Development):**
```env
DATABASE_HOST=localhost
DATABASE_PORT=5436
DATABASE_USERNAME=oneohm
DATABASE_PASSWORD=postgres
DATABASE_NAME=oneohm_epc
```

### Migrations

```bash
cd apps/backend

# Generate a new migration
npm run migration:generate -- -n MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

### Seeds

```bash
cd apps/backend

# Run all seeds
npm run seed

# Run specific seed
npm run seed:users
npm run seed:master-data
npm run seed:inventory
```

---

## 🐳 Docker

### Development with Docker Compose

```bash
# Start all services (backend, web, postgres)
docker compose up -d

# Start only database
docker compose up postgres -d

# View logs
docker compose logs -f backend

# Stop all services
docker compose down

# Clean up volumes
docker compose down -v
```

### Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| Backend | 8085 | NestJS API |
| Web | 3001 | Next.js App |
| PostgreSQL | 5436 | Database |

### Building Images

```bash
# Build all images
npm run docker:build

# Build specific image
docker build -t oneohm-backend -f apps/backend/Dockerfile .
docker build -t oneohm-web -f apps/web/Dockerfile .
```

📖 [Full Docker Documentation](./docs/DOCKER.md)

---

## 🚢 Deployment

### Production Deployment (Fly.io)

The backend is configured for deployment on Fly.io (Mumbai region).

```bash
cd apps/backend

# Deploy to Fly.io
fly deploy

# View logs
fly logs

# SSH into container
fly ssh console

# Set secrets
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set JWT_SECRET="your-secret"
```

**Live URL:** `https://oneohm-epc-backend.fly.dev`

### Environment Variables for Production

Set these secrets on Fly.io:

```bash
fly secrets set DATABASE_URL="postgresql://user:pass@host:5432/db"
fly secrets set JWT_SECRET="your-jwt-secret"
fly secrets set AWS_ACCESS_KEY_ID="your-aws-key"
fly secrets set AWS_SECRET_ACCESS_KEY="your-aws-secret"
fly secrets set AWS_S3_BUCKET="your-bucket-name"
```

---

## 🔐 Environment Variables

### Backend (`apps/backend/.env`)

```env
# Application
NODE_ENV=development
PORT=8085
BACKEND_HOST=0.0.0.0
BACKEND_API_PREFIX=/api/v1

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5436
DATABASE_USERNAME=oneohm
DATABASE_PASSWORD=postgres
DATABASE_NAME=oneohm_epc
DATABASE_SSL=false
DATABASE_LOGGING=true

# Authentication
JWT_SECRET=your-super-secret-key
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# AWS S3 (File Storage)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=oneohm-epc-files

# Features
ENABLE_SWAGGER=true
ENABLE_RATE_LIMITING=true

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### Web (`apps/web/.env.local`)

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8085/api/v1

# App Configuration
NEXT_PUBLIC_APP_NAME=OneOhm EPC
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

---

## 📚 API Documentation

### Swagger UI

When the backend is running, access Swagger documentation at:

**Local:** `http://localhost:8085/api/v1/docs`  
**Production:** `https://oneohm-epc-backend.fly.dev/api/v1/docs`

### API Versioning

All API endpoints are prefixed with `/api/v1/`

### Authentication

```bash
# Login
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Response includes JWT token
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": { ... }
}

# Use token in subsequent requests
Authorization: Bearer <accessToken>
```

### Key API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /auth/login` | User authentication |
| `GET /users/me` | Current user profile |
| `GET /customers` | List customers |
| `POST /quotes` | Create quote |
| `POST /quotes/calculate` | Calculate quote pricing |
| `GET /projects` | List projects |
| `GET /inventory/products` | List products |

---

## 🤝 Contributing

### Development Workflow

1. **Clone** the repository
2. **Install** dependencies: `npm install`
3. **Create** a feature branch: `git checkout -b feature/your-feature`
4. **Make** changes following code style guidelines
5. **Test** your changes: `npm run affected:test`
6. **Lint** your code: `npm run affected:lint`
7. **Commit** with conventional commits: `git commit -m "feat: add new feature"`
8. **Push** and create a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new quote calculator
fix: resolve payment date issue
docs: update API documentation
chore: upgrade dependencies
refactor: improve customer service
test: add quote service tests
```

### Code Style

- **TypeScript** strict mode enabled
- **ESLint** for linting
- **Prettier** for formatting
- Run `npm run format` before committing

---

## 📖 Resources

### Documentation

- [NX Usage Guide](./docs/NX-USAGE-GUIDE.md) - Complete NX monorepo guide
- [CI/CD with NX](./docs/CI-CD-WITH-NX.md) - GitHub Actions workflow
- [Docker Guide](./docs/DOCKER.md) - Docker usage documentation
- [Backend API](./apps/backend/README.md) - Backend documentation
- [Web App](./apps/web/README.md) - Frontend documentation

### External Resources

- [NX Documentation](https://nx.dev/getting-started/intro)
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeORM Documentation](https://typeorm.io)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

## 📄 License

**UNLICENSED** - Private proprietary software

---

<div align="center">

**Built with ❤️ by the OneOhm Team**

</div>
