# OneOhm EPC - Complete Project Documentation

> **Comprehensive guide to understanding the OneOhm EPC project: architecture, API endpoints, data flow, and functionality**

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Data Flow & API Calls](#data-flow--api-calls)
7. [Functionality Flows](#functionality-flows)
8. [Database Structure](#database-structure)
9. [Authentication & Authorization](#authentication--authorization)
10. [Frontend-Backend Integration](#frontend-backend-integration)
11. [Key Business Processes](#key-business-processes)

---

## 🎯 Project Overview

**OneOhm EPC** is a comprehensive solar installation management platform designed for EPC (Engineering, Procurement, and Construction) businesses. It manages the entire lifecycle from lead generation to project completion, including:

- **Lead & Customer Management** - Capture, track, and convert leads
- **Quote Generation** - Automated solar system sizing and pricing with subsidy calculations
- **Project Management** - Track installations from start to finish with phases, tasks, and milestones
- **Inventory Management** - Manage solar panels, inverters, and components across warehouses
- **Finance & Payments** - Invoice generation, payment tracking, and reconciliation
- **Compliance** - Subsidy applications and regulatory compliance tracking
- **Service & Maintenance** - AMC (Annual Maintenance Contract) and post-installation support

### Key Features

- **Multi-tenant Architecture** - Support for multiple organizations
- **Role-Based Access Control (RBAC)** - IAM system with roles, permissions, and features
- **Real-time Updates** - Live tracking of projects, quotes, and inventory
- **Mobile-Ready** - Responsive design for field workers and mobile users
- **Document Management** - File storage with AWS S3 integration
- **Audit Trail** - Complete audit logging for compliance

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Next.js    │  │  React 19    │  │  TanStack    │      │
│  │   Web App    │  │  Components  │  │  Query       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘             │
│                            │                                 │
│                    ┌───────▼────────┐                       │
│                    │   API Client   │                       │
│                    │   (Axios)      │                       │
│                    └───────┬────────┘                       │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             │ HTTP/REST
                             │ JWT Authentication
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                      Backend Layer                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              NestJS Application                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │  Auth    │  │  Guards   │  │  Filters │          │   │
│  │  │  Module  │  │  & Pipes  │  │  & Inter │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘          │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │         Feature Modules (25+)                 │  │   │
│  │  │  • Auth, IAM, Users                          │  │   │
│  │  │  • Customers, Quotes, Projects               │  │   │
│  │  │  • Inventory, Payments, Compliance           │  │   │
│  │  │  • Documents, Comments, Approvals            │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│  │  │ Service  │  │Repository │  │  Entity   │        │   │
│  │  │  Layer   │  │   Layer   │  │   Layer   │        │   │
│  │  └──────────┘  └──────────┘  └──────────┘        │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            │ TypeORM                         │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                    Database Layer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              PostgreSQL 15                            │   │
│  │  • Customers, Quotes, Projects                       │   │
│  │  • Inventory, Payments, Users                        │   │
│  │  • Audit Logs, Documents                             │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Request Flow

1. **Frontend Request** → User action triggers API call via `apiClient`
2. **API Client** → Adds JWT token to Authorization header
3. **Backend Controller** → Receives request, validates with guards
4. **Service Layer** → Business logic execution
5. **Repository Layer** → Database operations via TypeORM
6. **Response** → Data flows back through layers to frontend

---

## 🛠️ Technology Stack

### Backend
- **NestJS 11** - Progressive Node.js framework
- **TypeORM 0.3** - Object-Relational Mapping
- **PostgreSQL 15** - Primary database
- **Passport.js** - Authentication strategies (JWT, Local, OTP)
- **Swagger/OpenAPI** - API documentation
- **AWS S3** - File storage
- **JWT** - Token-based authentication

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5.7** - Type safety
- **TanStack Query** - Server state management
- **Axios** - HTTP client
- **Zustand** - Client state management
- **Tailwind CSS 4** - Styling
- **Radix UI** - Component library

### Infrastructure
- **NX** - Monorepo management
- **Docker** - Containerization
- **Fly.io** - Production hosting
- **GitHub Actions** - CI/CD

---

## 📁 Project Structure

```
oneohm-epc/
├── apps/
│   ├── backend/              # NestJS API Server (Port 8085)
│   │   ├── src/
│   │   │   ├── modules/      # Feature modules (25+ modules)
│   │   │   ├── config/       # Configuration
│   │   │   ├── database/     # Migrations, seeds
│   │   │   └── common/       # Shared utilities
│   │   └── package.json
│   │
│   ├── web/                  # Next.js Web App (Port 3001)
│   │   ├── app/              # App Router pages
│   │   ├── components/       # React components
│   │   ├── lib/              # Utilities, API client
│   │   └── package.json
│   │
│   └── ux/                   # UX Design Assets
│
├── libs/
│   ├── shared-types/         # Shared TypeScript types
│   ├── shared-utils/         # Shared utilities & decorators
│   ├── shared-theme/        # Theme configuration
│   └── shared-assets/        # Shared constants
│
└── docs/                     # Documentation
```

---

## 📡 API Endpoints Reference

### Base URL
- **Local:** `http://localhost:8085/api/v1`
- **Production:** `https://oneohm-epc-backend.fly.dev/api/v1`
- **Swagger Docs:** `http://localhost:8085/api-docs`

### Authentication

#### 1. Login (Email/Password)
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "ADMIN"
  }
}
```

#### 2. Request OTP
```http
POST /api/v1/auth/otp/request
Content-Type: application/json

{
  "phone": "+919876543210",
  "email": "user@example.com"  // Optional
}
```

#### 3. Verify OTP
```http
POST /api/v1/auth/otp/verify
Content-Type: application/json

{
  "phone": "+919876543210",
  "otp": "123456"
}
```

#### 4. Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 5. Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer <accessToken>
```

#### 6. Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <accessToken>
```

---

### Customers Module

**Base Path:** `/api/v1/customers`

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/customers` | Create new customer |
| GET | `/customers` | List all customers (paginated) |
| GET | `/customers/:id` | Get customer by ID |
| PATCH | `/customers/:id` | Update customer |
| PATCH | `/customers/:id/status` | Update customer status |
| DELETE | `/customers/:id` | Delete customer (soft) |
| GET | `/customers/check-availability` | Check phone/email availability |
| GET | `/customers/statistics/status` | Get status statistics |

**Query Parameters:**
- `organizationId` (required) - Query param or header `X-Organization-Id`
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `createdBy` - Filter by creator (`me` for current user)
- `search` - Search by name, phone, email, or city

**Example:**
```http
GET /api/v1/customers?organizationId=xxx&page=1&limit=20&search=john
Authorization: Bearer <token>
```

---

### Quotes Module

**Base Path:** `/api/v1/quotes`

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/quotes` | Create new quote |
| GET | `/quotes` | List all quotes (with filters) |
| GET | `/quotes/:id` | Get quote by ID |
| PATCH | `/quotes/:id` | Update quote (creates new version) |
| PATCH | `/quotes/:id/status` | Update quote status |
| DELETE | `/quotes/:id` | Delete quote |

**Query Parameters:**
- `organizationId` (required)
- `page`, `limit` - Pagination
- `status` - Filter by status (DRAFT, SENT, VIEWED, ACCEPTED, REJECTED, EXPIRED)
- `customerId` - Filter by customer
- `salesPersonId` - Filter by sales person
- `resellerId` - Filter by reseller
- `fromDate`, `toDate` - Date range filter
- `search` - Search in quote number or customer name

**Quote Calculator Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/quotes/calculate` | Calculate quote pricing |
| POST | `/quotes/calculate/subsidy` | Calculate subsidy amount |
| GET | `/quotes/products` | Get products for quote |
| GET | `/quotes/pricing-rules` | Get pricing rules |

**Example - Create Quote:**
```http
POST /api/v1/quotes?organizationId=xxx
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": "uuid",
  "propertyId": "uuid",
  "systemSizeKw": 5.0,
  "totalWattageWp": 5000,
  "projectType": "RESIDENTIAL",
  "systemType": "ON_GRID",
  "quoteDate": "2024-01-15",
  "validUntil": "2024-02-15",
  "lineItems": [
    {
      "productId": "uuid",
      "quantity": 10,
      "unitPrice": 50000
    }
  ],
  "isSubsidyApplicable": true
}
```

---

### Projects Module

**Base Path:** `/api/v1/projects`

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects` | Create new project |
| GET | `/projects` | List all projects (with filters) |
| GET | `/projects/:id` | Get project by ID |
| PATCH | `/projects/:id` | Update project |
| PATCH | `/projects/:id/status` | Update project status |
| DELETE | `/projects/:id` | Delete project |
| GET | `/projects/customer/:customerId` | Get projects by customer |
| POST | `/projects/convert-from-quote/:quoteId` | Convert quote to project |

**Query Parameters:**
- `organizationId` (required)
- `page`, `limit` - Pagination
- `status` - Filter by status
- `priority` - Filter by priority
- `customerId` - Filter by customer
- `projectType` - Filter by type
- `fromDate`, `toDate` - Date range
- `search` - Search by project number or name

**Project Tasks:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/:projectId/tasks` | Create task |
| GET | `/projects/:projectId/tasks` | List tasks |
| GET | `/projects/:projectId/tasks/:taskId` | Get task |
| PATCH | `/projects/:projectId/tasks/:taskId` | Update task |
| DELETE | `/projects/:projectId/tasks/:taskId` | Delete task |

**Project Milestones:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/:projectId/milestones` | Create milestone |
| GET | `/projects/:projectId/milestones` | List milestones |
| PATCH | `/projects/:projectId/milestones/:milestoneId` | Update milestone |

---

### Inventory Module

**Base Path:** `/api/v1/inventory-*`

#### Stock Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/inventory-stock/warehouse/:warehouseId/product/:productId` | Get stock by warehouse & product |
| GET | `/inventory-stock/warehouse/:warehouseId` | Get all stock for warehouse |
| GET | `/inventory-stock/product/:productId` | Get stock by product (all warehouses) |
| GET | `/inventory-stock/alerts/low-stock` | Get low stock alerts |
| POST | `/inventory-stock/update` | Update stock (add/remove) |
| POST | `/inventory-stock/transfer` | Transfer stock between warehouses |
| POST | `/inventory-stock/adjust` | Adjust stock (manual correction) |
| GET | `/inventory-stock/stats/total-value` | Get total stock value |
| GET | `/inventory-stock/stats/by-warehouse` | Get stock summary by warehouse |

#### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | List all products |
| GET | `/products/:id` | Get product by ID |
| POST | `/products` | Create product |
| PATCH | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |

#### Warehouses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/warehouses` | List warehouses |
| POST | `/warehouses` | Create warehouse |
| PATCH | `/warehouses/:id` | Update warehouse |

#### Purchase Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/purchase-orders` | List purchase orders |
| POST | `/purchase-orders` | Create purchase order |
| PATCH | `/purchase-orders/:id` | Update purchase order |
| POST | `/purchase-orders/:id/receive` | Receive purchase order |

---

### Payments Module

**Base Path:** `/api/v1/payments`

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments` | Create payment |
| GET | `/payments` | List all payments |
| GET | `/payments/:id` | Get payment by ID |
| PATCH | `/payments/:id` | Update payment |
| PATCH | `/payments/:id/status/:status` | Update payment status |
| POST | `/payments/:id/reconcile` | Reconcile payment |
| DELETE | `/payments/:id` | Delete payment |
| GET | `/payments/organization/:organizationId` | Get payments by organization |
| GET | `/payments/project/:projectId` | Get payments by project |
| GET | `/payments/milestone/:milestoneId` | Get payments by milestone |
| GET | `/payments/customer/:customerId` | Get payments by customer |
| GET | `/payments/status/:status` | Get payments by status |
| GET | `/payments/number/:paymentNumber` | Get payment by number |
| GET | `/payments/project/:projectId/summary` | Get payment summary for project |
| GET | `/payments/organization/:organizationId/stats` | Get payment statistics |
| GET | `/payments/organization/:organizationId/next-number` | Generate next payment number |

---

### Master Data Module

**Base Path:** `/api/v1/master-data`

#### Product Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/product-categories` | List categories |
| POST | `/product-categories` | Create category |
| GET | `/product-categories/:id` | Get category |
| PATCH | `/product-categories/:id` | Update category |

#### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | List products |
| POST | `/products` | Create product |
| GET | `/products/:id` | Get product |
| PATCH | `/products/:id` | Update product |

#### Pricing Rules

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pricing-rules` | List pricing rules |
| POST | `/pricing-rules` | Create pricing rule |
| GET | `/pricing-rules/:id` | Get pricing rule |
| PATCH | `/pricing-rules/:id` | Update pricing rule |

---

### IAM (Identity & Access Management)

**Base Path:** `/api/v1/iam`

#### Roles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/roles` | List roles |
| POST | `/roles` | Create role |
| GET | `/roles/:id` | Get role |
| PATCH | `/roles/:id` | Update role |
| DELETE | `/roles/:id` | Delete role |

#### Permissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/permissions` | List permissions |
| POST | `/permissions` | Create permission |
| GET | `/permissions/:id` | Get permission |

#### Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/features` | List features |
| POST | `/features` | Create feature |
| GET | `/features/:id` | Get feature |

#### User Roles

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/user-roles` | Assign role to user |
| DELETE | `/user-roles/:id` | Remove role from user |
| GET | `/user-roles/user/:userId` | Get user roles |

---

### Documents Module

**Base Path:** `/api/v1/documents`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/documents` | Upload document |
| GET | `/documents` | List documents |
| GET | `/documents/:id` | Get document |
| GET | `/documents/:id/download` | Download document |
| DELETE | `/documents/:id` | Delete document |

---

### Storage Module

**Base Path:** `/api/v1/storage`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/storage/upload-url` | Get pre-signed upload URL |
| GET | `/storage/download-url/:fileKey` | Get pre-signed download URL |
| DELETE | `/storage/:fileKey` | Delete file |

---

### Comments Module

**Base Path:** `/api/v1/comments`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/comments` | Create comment |
| GET | `/comments` | List comments (by entity) |
| GET | `/comments/:id` | Get comment |
| PATCH | `/comments/:id` | Update comment |
| DELETE | `/comments/:id` | Delete comment |

---

### Approvals Module

**Base Path:** `/api/v1/approvals`

#### Approval Requests

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/approval-requests` | Create approval request |
| GET | `/approval-requests` | List approval requests |
| GET | `/approval-requests/:id` | Get approval request |
| POST | `/approval-requests/:id/approve` | Approve request |
| POST | `/approval-requests/:id/reject` | Reject request |
| GET | `/approval-requests/:id/history` | Get approval history |

#### Approval Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/approval-templates` | List templates |
| POST | `/approval-templates` | Create template |
| GET | `/approval-templates/:id` | Get template |
| PATCH | `/approval-templates/:id` | Update template |

---

### Service & Maintenance

**Base Path:** `/api/v1/service-*`

#### Service Requests

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/service-requests` | Create service request |
| GET | `/service-requests` | List service requests |
| GET | `/service-requests/:id` | Get service request |
| PATCH | `/service-requests/:id` | Update service request |
| PATCH | `/service-requests/:id/status` | Update status |

---

### Compliance Module

**Base Path:** `/api/v1/compliance`

#### Subsidy Applications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/subsidy-applications` | Create subsidy application |
| GET | `/subsidy-applications` | List applications |
| GET | `/subsidy-applications/:id` | Get application |
| PATCH | `/subsidy-applications/:id` | Update application |
| POST | `/subsidy-applications/:id/submit` | Submit application |

---

### Organizations Module

**Base Path:** `/api/v1/organizations`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/organizations` | List organizations |
| POST | `/organizations` | Create organization |
| GET | `/organizations/:id` | Get organization |
| PATCH | `/organizations/:id` | Update organization |
| GET | `/organizations/:id/settings` | Get organization settings |
| PATCH | `/organizations/:id/settings` | Update settings |

---

## 🔄 Data Flow & API Calls

### Frontend API Client Setup

The frontend uses an Axios-based API client configured with JWT authentication:

**Location:** `apps/web/lib/api/client.ts`

```typescript
// API Client Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});
```

### Authentication Flow

1. **Login Request:**
   ```typescript
   // Frontend
   const response = await apiClient.post('/auth/login', {
     email: 'user@example.com',
     password: 'password'
   });
   
   // Tokens stored in cookies
   setTokens(response.data.accessToken, response.data.refreshToken);
   ```

2. **Automatic Token Injection:**
   - Request interceptor adds `Authorization: Bearer <token>` to all requests
   - Token retrieved from cookies automatically

3. **Token Refresh:**
   - On 401 error, automatically attempts token refresh
   - Queues failed requests and retries after refresh
   - Redirects to login if refresh fails

### API Call Example

```typescript
// Frontend Component
import { apiClient } from '@/lib/api/client';

// Fetch customers
const fetchCustomers = async (organizationId: string) => {
  const response = await apiClient.get('/customers', {
    params: {
      organizationId,
      page: 1,
      limit: 20
    }
  });
  return response.data;
};

// Create customer
const createCustomer = async (data: CreateCustomerDto) => {
  const response = await apiClient.post('/customers', data, {
    params: { organizationId: 'xxx' }
  });
  return response.data;
};
```

### Request Flow Diagram

```
User Action (Frontend)
    ↓
React Component
    ↓
API Call (apiClient)
    ↓
Request Interceptor (Add JWT Token)
    ↓
HTTP Request → Backend (NestJS)
    ↓
JWT Auth Guard (Validate Token)
    ↓
Controller (Route Handler)
    ↓
DTO Validation (class-validator)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (TypeORM)
    ↓
PostgreSQL Database
    ↓
Response flows back through layers
    ↓
Response Interceptor (Handle 401, refresh token)
    ↓
React Component (Update UI)
```

### Multi-Organization Context

All API calls require `organizationId`:
- **Query Parameter:** `?organizationId=xxx`
- **Header:** `X-Organization-Id: xxx`
- **Decorator:** `@OrganizationContext()` extracts it automatically

---

## 🔀 Functionality Flows

### 1. Customer Lead to Project Flow

```
1. Lead Capture (Field Worker)
   POST /customers
   → Creates CustomerProfile with status: LEAD
   
2. Site Visit
   POST /site-visits
   → Records site visit details
   
3. Create Quote
   POST /quotes
   → Generates quote with pricing
   → Calculates subsidy if applicable
   → Creates QuoteVersion and QuoteLineItems
   
4. Send Quote
   PATCH /quotes/:id/status
   → Status: DRAFT → SENT
   → Customer receives quote
   
5. Customer Accepts Quote
   PATCH /quotes/:id/status
   → Status: SENT → ACCEPTED
   → Requires signature/reason
   
6. Convert Quote to Project
   POST /projects/convert-from-quote/:quoteId
   → Creates Project from Quote
   → Links to CustomerProperty
   → Generates ProjectNumber
   
7. Project Execution
   - Create phases, tasks, milestones
   - Track progress
   - Update status: PLANNING → IN_PROGRESS → COMPLETED
   
8. Payment Collection
   POST /payments
   → Records payments against milestones
   → Updates payment status
   
9. Project Completion
   PATCH /projects/:id/status
   → Status: COMPLETED
   → Generate completion documents
```

### 2. Quote Calculation Flow

```
1. User Inputs System Details
   - System Size (kW)
   - Project Type (RESIDENTIAL/COMMERCIAL)
   - System Type (ON_GRID/OFF_GRID/HYBRID)
   
2. Select Products
   POST /quotes/calculate
   → Fetches products from master-data
   → Applies pricing rules
   → Calculates base price
   
3. Calculate GST
   → 12% GST on 70% of base
   → 18% GST on 30% of base
   → Total GST amount
   
4. Calculate Subsidy (if applicable)
   POST /quotes/calculate/subsidy
   → Residential: ₹30,000 per kW (max ₹78,000)
   → Commercial: Different rates
   → Subsidy amount
   
5. Calculate Final Price
   → Base Price + GST - Discount - Subsidy
   → Effective Price
   
6. Generate Payment Milestones
   → Down Payment (30%)
   → On Installation (40%)
   → On Commissioning (30%)
   
7. Create Quote
   POST /quotes
   → Saves quote with all calculations
   → Creates QuoteVersion
   → Creates QuoteLineItems
```

### 3. Inventory Management Flow

```
1. Product Master Data
   POST /products
   → Creates product with specifications
   → Sets minimum stock level
   
2. Warehouse Setup
   POST /warehouses
   → Creates warehouse
   → Sets location and type
   
3. Stock Updates
   POST /inventory-stock/update
   → Adds/removes stock
   → Creates StockMovement record
   → Updates InventoryStock quantity
   
4. Stock Transfer
   POST /inventory-stock/transfer
   → Transfers between warehouses
   → Creates two StockMovement records
   → Updates both warehouse stocks
   
5. Purchase Order
   POST /purchase-orders
   → Creates PO with line items
   → Status: PENDING
   
6. Receive Purchase Order
   POST /purchase-orders/:id/receive
   → Updates PO status: RECEIVED
   → Automatically updates stock
   → Creates StockMovement records
   
7. Low Stock Alerts
   GET /inventory-stock/alerts/low-stock
   → Checks stock < minimum level
   → Returns alert list
```

### 4. Payment Processing Flow

```
1. Create Payment
   POST /payments
   → Links to project/milestone
   → Sets amount and due date
   → Status: PENDING
   
2. Payment Received
   PATCH /payments/:id/status/PAID
   → Updates status to PAID
   → Records payment date
   → Updates project payment summary
   
3. Payment Reconciliation
   POST /payments/:id/reconcile
   → Matches payment with transaction
   → Updates reconciliation details
   → Status: RECONCILED
   
4. Payment Summary
   GET /payments/project/:projectId/summary
   → Total expected vs paid
   → Pending amount
   → Payment count
```

### 5. Approval Workflow Flow

```
1. Create Approval Request
   POST /approval-requests
   → Links to entity (quote/project)
   → Uses ApprovalTemplate
   → Creates ApprovalSteps
   → Status: PENDING
   
2. Approval Steps
   → Each step has approver and order
   → Sequential or parallel approval
   
3. Approve/Reject
   POST /approval-requests/:id/approve
   POST /approval-requests/:id/reject
   → Updates step status
   → Creates ApprovalHistory record
   → Moves to next step if approved
   
4. Complete Approval
   → All steps approved
   → Request status: APPROVED
   → Triggers next action (e.g., send quote)
```

---

## 🗄️ Database Structure

### Key Entities

#### Customer Management
- **CustomerProfile** - Customer/lead information
- **CustomerProperty** - Installation sites
- **SiteVisit** - Site visit records

#### Quote Management
- **Quote** - Quote header
- **QuoteVersion** - Quote versions (versioning)
- **QuoteLineItem** - Product line items

#### Project Management
- **Project** - Project header
- **ProjectPhase** - Project phases
- **ProjectTask** - Individual tasks
- **Milestone** - Project milestones
- **Material** - Material requirements

#### Inventory
- **Product** - Product master data
- **Warehouse** - Warehouse information
- **InventoryStock** - Stock levels
- **StockMovement** - Stock transactions
- **PurchaseOrder** - Purchase orders

#### Payments
- **Payment** - Payment records
- **PaymentSchedule** - Payment schedules

#### IAM
- **Role** - User roles
- **Permission** - Permissions
- **Feature** - Feature flags
- **UserRole** - User-role assignments

### Relationships

```
Organization
  ├── Customers
  │     └── CustomerProperties
  │           └── Projects (OneToOne)
  │                 ├── ProjectPhases
  │                 ├── ProjectTasks
  │                 └── Milestones
  ├── Quotes
  │     ├── QuoteVersions
  │     └── QuoteLineItems
  ├── Projects
  ├── Inventory
  │     ├── Products
  │     ├── Warehouses
  │     └── InventoryStock
  └── Payments
```

---

## 🔐 Authentication & Authorization

### JWT Token Structure

```typescript
// Access Token Payload
{
  sub: "user-id",
  email: "user@example.com",
  organizationId: "org-id",
  roles: ["ADMIN", "MANAGER"],
  iat: 1234567890,
  exp: 1234567890
}
```

### Guards

1. **JwtAuthGuard** - Validates JWT token
2. **RoleGuard** - Checks user roles
3. **PermissionGuard** - Checks permissions (IAM)
4. **SecurityRateLimitGuard** - Rate limiting

### Decorators

```typescript
// Get current user
@CurrentUser() user: CurrentUserType

// Get organization context
@OrganizationContext() organizationId: string

// Public endpoint (no auth)
@Public()

// Require role
@Roles('ADMIN', 'MANAGER')

// Require permission
@RequirePermission('customers:create')
```

---

## 🌐 Frontend-Backend Integration

### API Client Usage

```typescript
// apps/web/lib/api/client.ts
import apiClient from '@/lib/api/client';

// Example: Fetch customers
const customers = await apiClient.get('/customers', {
  params: { organizationId: 'xxx', page: 1, limit: 20 }
});
```

### React Query Integration

```typescript
// Using TanStack Query
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

// Query
const { data, isLoading } = useQuery({
  queryKey: ['customers', organizationId],
  queryFn: () => apiClient.get('/customers', {
    params: { organizationId }
  }).then(res => res.data)
});

// Mutation
const mutation = useMutation({
  mutationFn: (data) => apiClient.post('/customers', data),
  onSuccess: () => {
    queryClient.invalidateQueries(['customers']);
  }
});
```

### Environment Variables

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8085/api/v1
NEXT_PUBLIC_APP_NAME=OneOhm EPC
```

**Backend (.env):**
```env
PORT=8085
DATABASE_HOST=localhost
DATABASE_PORT=5436
JWT_SECRET=your-secret
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=oneohm-epc-files
```

---

## 🎯 Key Business Processes

### 1. Lead to Customer Conversion

1. Field worker captures lead → `POST /customers` (status: LEAD)
2. Site visit scheduled → `POST /site-visits`
3. Lead qualified → `PATCH /customers/:id/status` (status: PROSPECT)
4. Quote created → `POST /quotes`
5. Quote accepted → `PATCH /quotes/:id/status` (status: ACCEPTED)
6. Customer created → `PATCH /customers/:id/status` (status: ACTIVE)

### 2. Quote to Project Conversion

1. Quote accepted → `PATCH /quotes/:id/status` (status: ACCEPTED)
2. Convert to project → `POST /projects/convert-from-quote/:quoteId`
3. Project created → Status: PLANNING
4. Phases created → `POST /projects/:id/phases`
5. Tasks assigned → `POST /projects/:id/tasks`
6. Execution starts → Status: IN_PROGRESS

### 3. Inventory to Project Allocation

1. Material requirement → `POST /projects/:id/materials`
2. Check stock → `GET /inventory-stock/warehouse/:id/product/:id`
3. Allocate stock → `POST /inventory-stock/allocate`
4. Dispatch material → `POST /material-dispatch`
5. Update project → Material status: DISPATCHED

### 4. Payment Collection

1. Milestone created → `POST /projects/:id/milestones`
2. Payment scheduled → `POST /payments` (linked to milestone)
3. Payment received → `PATCH /payments/:id/status/PAID`
4. Reconcile → `POST /payments/:id/reconcile`
5. Update project → Payment summary updated

---

## 📝 Additional Resources

### API Documentation
- **Swagger UI:** `http://localhost:8085/api-docs`
- **OpenAPI Spec:** Available in Swagger UI

### Code Documentation
- **Backend README:** `apps/backend/README.md`
- **Web README:** `apps/web/README.md`
- **Main README:** `README.md`

### Development Commands

```bash
# Backend
npm run backend:dev        # Start backend (port 8085)
npm run backend:build      # Build backend
npm run migration:run       # Run migrations

# Frontend
npm run web:dev            # Start web app (port 3001)
npm run web:build          # Build web app

# Database
npm run seed               # Seed database
```

---

## 🔍 Quick Reference

### Common API Patterns

1. **List with Pagination:**
   ```
   GET /resource?page=1&limit=20&organizationId=xxx
   ```

2. **Create Resource:**
   ```
   POST /resource?organizationId=xxx
   Body: { ... }
   ```

3. **Update Resource:**
   ```
   PATCH /resource/:id?organizationId=xxx
   Body: { ... }
   ```

4. **Delete Resource:**
   ```
   DELETE /resource/:id?organizationId=xxx
   ```

5. **Get by ID:**
   ```
   GET /resource/:id?organizationId=xxx
   ```

### Response Format

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

---

## 🚀 Getting Started

1. **Clone Repository**
   ```bash
   git clone <repo-url>
   cd oneohm-epc
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Setup Environment**
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

4. **Start Database**
   ```bash
   docker compose up postgres -d
   ```

5. **Run Migrations**
   ```bash
   cd apps/backend
   npm run migration:run
   ```

6. **Start Services**
   ```bash
   # Terminal 1 - Backend
   npm run backend:dev
   
   # Terminal 2 - Frontend
   npm run web:dev
   ```

7. **Access Applications**
   - Backend API: `http://localhost:8085/api/v1`
   - Swagger Docs: `http://localhost:8085/api-docs`
   - Web App: `http://localhost:3001`

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Maintained By:** OneOhm Development Team






