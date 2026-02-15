# OneOhm EPC Backend

> **NestJS API server powering the OneOhm EPC solar installation management platform.**

## 🎯 Overview

The backend provides a comprehensive REST API for managing all aspects of solar EPC business operations including customers, quotes, projects, inventory, payments, and compliance.

**Tech Stack:** NestJS 11 | TypeORM | PostgreSQL 15 | JWT Auth | Swagger

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 15+ (or Docker)
- npm

### Installation

```bash
# From root directory
npm install

# Set up environment variables
cp apps/backend/.env.example apps/backend/.env
# Edit .env with your database credentials

# Start PostgreSQL (if using Docker)
docker compose up postgres -d

# Run migrations
cd apps/backend
npm run migration:run

# Seed initial data (optional)
npm run seed
```

### Development

```bash
# From root directory
npm run backend:dev     # Start with hot reload (port 8085)

# Or from this directory
npm run start:dev
```

The API will be available at `http://localhost:8085/api/v1`

Swagger documentation: `http://localhost:8085/api/v1/docs`

---

## 📁 Project Structure

```
apps/backend/
├── src/
│   ├── common/                 # Shared utilities
│   │   ├── filters/            # Exception filters
│   │   ├── interceptors/       # Request/Response interceptors
│   │   └── pipes/              # Validation pipes
│   │
│   ├── config/                 # Configuration
│   │   ├── app.config.ts       # App configuration
│   │   ├── database.config.ts  # Database configuration
│   │   └── jwt.config.ts       # JWT configuration
│   │
│   ├── database/               # Database layer
│   │   ├── migrations/         # TypeORM migrations (37 files)
│   │   ├── seeds/              # Data seeding scripts
│   │   ├── datasource.ts       # TypeORM data source
│   │   └── database.module.ts  # Database module
│   │
│   ├── modules/                # Feature modules (see below)
│   │   ├── auth/               # Authentication
│   │   ├── iam/                # Identity & Access Management
│   │   ├── users/              # User management
│   │   ├── customers/          # Customer management
│   │   ├── quotes/             # Quote management
│   │   ├── projects/           # Project management
│   │   └── ...                 # (25+ modules)
│   │
│   ├── scripts/                # CLI scripts
│   │   └── run-migrations.js   # Migration runner
│   │
│   ├── types/                  # TypeScript types
│   ├── app.module.ts           # Root module
│   └── main.ts                 # Application entry point
│
├── test/                       # E2E tests
│   ├── app.e2e-spec.ts
│   └── jest-e2e.config.ts
│
├── Dockerfile                  # Production Docker config
├── fly.toml                    # Fly.io deployment config
├── fly.postgres.toml           # Fly Postgres config
└── package.json
```

---

## 🧩 Feature Modules

### Authentication & Authorization

| Module | Description | Key Features |
|--------|-------------|--------------|
| **auth** | Authentication | JWT login, refresh tokens, logout |
| **iam** | Identity & Access Management | Roles, Permissions, Features, Guards |
| **users** | User management | User CRUD, profile management |

### Customer Management

| Module | Description | Key Entities |
|--------|-------------|--------------|
| **customers** | Customer & property management | `CustomerProfile`, `CustomerProperty` |
| **customer-feedback** | Feedback collection | `CustomerFeedback`, `Rating` |

### Sales & Quotation

| Module | Description | Key Entities |
|--------|-------------|--------------|
| **quotes** | Quote management | `Quote`, `QuoteVersion`, `QuoteLineItem` |
| **master-data** | Product catalog & pricing | `ProductCategory`, `Product`, `PricingRule`, `SubsidyRule` |

### Project Management

| Module | Description | Key Entities |
|--------|-------------|--------------|
| **projects** | Full project lifecycle | `Project`, `Phase`, `Task`, `Timeline` |
| **approvals** | Approval workflows | `ApprovalRequest`, `ApprovalStep`, `ApprovalAction` |

### Inventory & Operations

| Module | Description | Key Entities |
|--------|-------------|--------------|
| **inventory** | Stock management | `Product`, `Warehouse`, `StockMovement`, `PurchaseOrder` |
| **documents** | Document management | `Document`, `DocumentVersion` |
| **storage** | File storage (S3) | Pre-signed URLs, uploads |

### Finance

| Module | Description | Key Entities |
|--------|-------------|--------------|
| **payments** | Payment tracking | `Payment`, `PaymentSchedule` |
| **loan-finance** | Loan applications | `LoanApplication` |

### Compliance & Audit

| Module | Description | Key Entities |
|--------|-------------|--------------|
| **compliance** | Regulatory compliance | `SubsidyApplication`, `ComplianceCheck` |
| **audit** | Audit logging | `AuditLog`, `ChangeHistory` |
| **security-events** | Security tracking | `SecurityEvent` |

### Service & Support

| Module | Description | Key Entities |
|--------|-------------|--------------|
| **service-maintenance** | AMC & service | `ServiceRequest`, `MaintenanceSchedule` |
| **comments** | Universal comments | `Comment`, `Thread` |

### Partners & Integrations

| Module | Description | Key Entities |
|--------|-------------|--------------|
| **organizations** | Multi-tenant support | `Organization`, `OrganizationSettings` |
| **employees** | Employee management | `Employee`, `Designation` |
| **resellers** | Partner management | `Reseller`, `Commission` |
| **integrations** | Third-party integrations | `IntegrationProvider`, `Webhook` |

---

## 🔐 Authentication

### JWT Authentication

```bash
# Login
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Response
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "ADMIN"
  }
}
```

### Using Authentication

```bash
# Add to all authenticated requests
Authorization: Bearer <accessToken>
```

### Role-Based Access Control

```typescript
// Controller example
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('ADMIN', 'MANAGER')
@Get('admin-only')
getAdminData() {
  return this.service.getAdminData();
}
```

---

## 🗄️ Database

### Configuration

```env
DATABASE_HOST=localhost
DATABASE_PORT=5436
DATABASE_USERNAME=oneohm
DATABASE_PASSWORD=postgres
DATABASE_NAME=oneohm_epc
```

### Migrations

```bash
# Generate new migration
npm run migration:generate -- -n CreateNewTable

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show status
npm run migration:show
```

### Seeds

```bash
# Run all seeds
npm run seed

# Individual seeds
npm run seed:users
npm run seed:master-data
npm run seed:inventory
npm run seed:iam
```

---

## 📖 API Documentation

### Swagger UI

Available at `/api/v1/docs` when running.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login |
| POST | `/auth/refresh` | Refresh token |
| GET | `/users/me` | Current user |
| GET | `/customers` | List customers |
| POST | `/customers` | Create customer |
| GET | `/quotes` | List quotes |
| POST | `/quotes` | Create quote |
| POST | `/quotes/calculate` | Calculate pricing |
| GET | `/projects` | List projects |
| POST | `/projects` | Create project |
| GET | `/inventory/products` | List products |
| GET | `/inventory/stock` | Stock levels |

### Response Format

All responses follow a consistent format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Pagination

```bash
GET /api/v1/customers?page=1&limit=20&sortBy=createdAt&sortOrder=DESC
```

Response includes pagination metadata:

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 🔧 Available Scripts

### Development

```bash
npm run start           # Start application
npm run start:dev       # Start with hot reload
npm run start:debug     # Start with debugger
npm run start:prod      # Run production build
```

### Building

```bash
npm run build           # Build for production
npm run prebuild        # Clean before build
```

### Testing

```bash
npm run test            # Run unit tests
npm run test:watch      # Tests in watch mode
npm run test:cov        # Tests with coverage
npm run test:e2e        # End-to-end tests
```

### Code Quality

```bash
npm run lint            # Lint code
npm run lint:fix        # Lint and fix
npm run format          # Format with Prettier
npm run format:check    # Check formatting
```

### Database

```bash
npm run migration:generate  # Generate migration
npm run migration:run       # Run migrations
npm run migration:revert    # Revert migration
npm run seed                # Run seeds
```

---

## 🐳 Docker

### Build

```bash
docker build -t oneohm-epc-backend .
```

### Run

```bash
docker run -p 8085:8085 \
  -e DATABASE_HOST=host.docker.internal \
  -e DATABASE_PORT=5436 \
  oneohm-epc-backend
```

### With Docker Compose

```bash
# From root directory
docker compose up backend -d
```

---

## 🚢 Deployment (Fly.io)

### Deploy

```bash
fly deploy
```

### Set Secrets

```bash
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set JWT_SECRET="your-secret"
fly secrets set AWS_ACCESS_KEY_ID="your-key"
fly secrets set AWS_SECRET_ACCESS_KEY="your-secret"
```

### Monitor

```bash
fly logs          # View logs
fly status        # Check status
fly ssh console   # SSH into container
```

---

## 🌍 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | development |
| `PORT` | Server port | 8085 |
| `BACKEND_API_PREFIX` | API prefix | /api/v1 |
| `DATABASE_HOST` | Database host | localhost |
| `DATABASE_PORT` | Database port | 5436 |
| `DATABASE_USERNAME` | Database user | oneohm |
| `DATABASE_PASSWORD` | Database password | postgres |
| `DATABASE_NAME` | Database name | oneohm_epc |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRATION` | Access token expiry | 7d |
| `AWS_ACCESS_KEY_ID` | AWS access key | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret | - |
| `AWS_S3_BUCKET` | S3 bucket name | - |
| `ENABLE_SWAGGER` | Enable Swagger | true |
| `ENABLE_RATE_LIMITING` | Enable rate limits | true |

---

## 🔗 Resources

- [Main Project README](../../README.md)
- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [Fly.io Documentation](https://fly.io/docs)

---

## 📄 License

UNLICENSED - Private project
