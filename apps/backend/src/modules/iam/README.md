# IAM Module (Identity and Access Management)

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-v10-red.svg)](https://nestjs.com/)
[![TypeORM](https://img.shields.io/badge/TypeORM-v0.3-orange.svg)](https://typeorm.io/)

A comprehensive, production-ready Identity and Access Management system for NestJS applications with dynamic role-based access control (RBAC), granular permissions, and organization-level isolation.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Installation & Setup](#installation--setup)
- [Core Concepts](#core-concepts)
- [Usage Guide](#usage-guide)
  - [Protecting Routes](#protecting-routes)
  - [Service Layer](#service-layer)
  - [Role Management](#role-management)
  - [Permission Management](#permission-management)
- [API Reference](#api-reference)
- [Migration Guide](#migration-guide)
- [Testing](#testing)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What is IAM?

The IAM (Identity and Access Management) module replaces hardcoded role enums with a **database-driven**, **organization-specific**, and **fully dynamic** access control system.

### Key Features

✅ **Dynamic Roles** - Create and manage roles per organization without code changes  
✅ **Granular Permissions** - Feature-level and action-level access control  
✅ **Scope Support** - `all`, `own`, `department`, `assigned`, `custom` scopes  
✅ **JWT-Based Guards** - Fast, stateless permission checking (no DB lookups on every request)  
✅ **Organization Isolation** - Roles and permissions are organization-specific  
✅ **Type-Safe** - Full TypeScript support with strict typing  
✅ **RESTful API** - Complete CRUD operations for roles, permissions, and features  
✅ **Swagger Documented** - Auto-generated API documentation

### Why Replace Enum-Based Roles?

| **Old System (Enum)**       | **New System (IAM)**         |
| --------------------------- | ---------------------------- |
| ❌ Hardcoded in code        | ✅ Stored in database        |
| ❌ Same for all orgs        | ✅ Organization-specific     |
| ❌ Requires code deployment | ✅ Real-time updates via API |
| ❌ Limited flexibility      | ✅ Unlimited customization   |
| ❌ Binary permissions       | ✅ Granular scopes           |

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT REQUEST                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    JwtAuthGuard                              │
│  • Validates JWT token                                       │
│  • Extracts user + permissions from JWT payload              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              PermissionGuard / FeatureGuard                  │
│  • Checks if user.permissions includes required permission   │
│  • Fast O(n) array lookup (NO DATABASE QUERY)                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Controller Method                         │
│  • Execute business logic                                    │
│  • Access @CurrentUser() decorator for user context          │
└─────────────────────────────────────────────────────────────┘
```

### JWT Payload Structure

```typescript
{
  sub: "user-uuid",              // User ID
  organizationId: "org-uuid",    // Organization ID
  roles: ["admin", "manager"],   // Role codes (for reference)
  permissions: [                 // ✨ Embedded permissions (key feature!)
    "customers:create",
    "customers:read",
    "customers:update",
    "customers:delete",
    "iam:roles:read",
    "iam:permissions:read"
  ],
  iat: 1234567890,
  exp: 1234567890
}
```

**Why embed permissions in JWT?**

- ⚡ **Performance**: No DB lookup on every request
- 🔒 **Stateless**: Works with load balancers and microservices
- 🎯 **Simple**: Direct array includes check

---

## Database Schema

### Minimal IAM (4 Tables)

```sql
┌─────────────────┐
│    features     │  ← Application features (e.g., "customers", "inventory")
├─────────────────┤
│ id              │
│ code            │  "customers"
│ name            │  "Customer Management"
│ feature_type    │  "module" | "sub_feature" | "component" | "workflow"
│ is_active       │
│ ...             │
└─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│  permissions    │  ← Granular permissions (e.g., "customers:create")
├─────────────────┤
│ id              │
│ code            │  "customers:create"
│ feature_id      │  → features.id
│ action          │  "create" | "read" | "update" | "delete"
│ scope           │  "all" | "own" | "department" | "assigned"
│ is_active       │
│ ...             │
└─────────────────┘
         │
         │ N:M
         ▼
┌─────────────────┐
│role_permissions │  ← Many-to-many mapping
├─────────────────┤
│ id              │
│ role_id         │  → roles.id
│ permission_id   │  → permissions.id
│ created_by      │
│ ...             │
└─────────────────┘
         │
         │ N:1
         ▼
┌─────────────────┐
│     roles       │  ← Dynamic roles per organization
├─────────────────┤
│ id              │
│ organization_id │  → organizations.id
│ code            │  "admin" | "manager" | "sales" (unique per org)
│ name            │  "Administrator"
│ level           │  Hierarchy level
│ is_system_role  │  Protected system roles
│ deleted_at      │  Soft delete support
│ ...             │
└─────────────────┘
```

### Entity Relationships

```
Organization (1) ───< (N) Roles (N) ───< (M) RolePermissions (M) >──── (N) Permissions (N) >──── (1) Features
```

---

## Installation & Setup

### 1. Prerequisites

Ensure these modules are imported in your `AppModule`:

```typescript
@Module({
  imports: [
    TypeOrmModule.forRoot(/* ... */),
    OrganizationsModule,
    UsersModule,
    IamModule, // ← Import IAM Module
  ],
})
export class AppModule {}
```

### 2. Run Migrations

```bash
cd apps/backend
npm run migration:run
```

This creates the 4 IAM tables: `features`, `permissions`, `roles`, `role_permissions`.

### 3. Seed IAM Data

#### Option A: Seed Customer Module (Recommended for testing)

```bash
npm run seed:iam-customers
```

This creates:

- **1 Feature**: "customers"
- **5 Permissions**: `customers:create`, `customers:read`, `customers:update`, `customers:update-status`, `customers:delete`
- **4 Roles**: Super Admin, Admin, Manager, Sales (with appropriate permissions)

#### Option B: Seed Test Users

```bash
npm run seed:test-users-iam
```

Creates 4 test users with different roles:

- `superadmin@test.com` - All IAM + customer permissions
- `admin@test.com` - All customer permissions
- `manager@test.com` - Create, Read, Update customers
- `sales@test.com` - Read customers only

**Password for all:** `Test@123`

### 4. (Optional) Migrate Existing Users

If you have existing users with old enum-based roles:

```bash
npm run migrate:users-to-iam
```

This script:

1. Reads existing `user_roles` table (enum-based)
2. Maps old role enum → new IAM role ID
3. Updates `user_roles.role_id` column
4. Preserves backward compatibility

---

## Core Concepts

### 1. Features

A **feature** represents an application module or capability.

**Examples:**

- `customers` - Customer management
- `inventory` - Inventory management
- `projects` - Project management
- `iam` - IAM administration

**Hierarchy:**

```
customers (module)
  ├── customer_details (sub_feature)
  ├── customer_notes (sub_feature)
  └── customer_history (sub_feature)
```

### 2. Permissions

A **permission** is a granular action within a feature.

**Format:** `<feature>:<action>[:<scope>]`

**Examples:**

```typescript
'customers:create'; // Create any customer
'customers:read'; // Read all customers
'customers:read:own'; // Read only own customers
'customers:update'; // Update any customer
'customers:delete'; // Delete any customer
```

**Permission Scopes:**

| Scope        | Description                       | Example                         |
| ------------ | --------------------------------- | ------------------------------- |
| `all`        | Access to all resources (default) | View all customers              |
| `own`        | Access to user's own resources    | View customers I created        |
| `department` | Access to department resources    | View customers in my department |
| `assigned`   | Access to assigned resources      | View customers assigned to me   |
| `custom`     | Custom conditions (JSONB)         | Complex business rules          |

### 3. Roles

A **role** is a collection of permissions assigned to users.

**Characteristics:**

- ✅ Organization-specific (each org can have different roles)
- ✅ Hierarchical (parent-child relationships)
- ✅ Dynamic (create/update via API)
- ✅ Soft-deletable (safe removal)

**Example Role Hierarchy:**

```
Super Admin (level 0)
  ├── Admin (level 1)
  │   ├── Manager (level 2)
  │   │   └── Employee (level 3)
  │   └── Sales Manager (level 2)
  │       └── Sales Rep (level 3)
```

### 4. Role-Permission Mapping

Many-to-many relationship between roles and permissions.

**Example:**

```
Admin Role
  ├── customers:create
  ├── customers:read
  ├── customers:update
  └── customers:delete

Manager Role
  ├── customers:create
  ├── customers:read
  └── customers:update

Sales Role
  └── customers:read
```

---

## Usage Guide

### Protecting Routes

#### Method 1: Permission-Based Protection (Recommended)

```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, CurrentUserType } from '@tejas96/shared-auth';
import { RequirePermission } from '../iam/decorators/require-permission.decorator';
import { PermissionGuard } from '../iam/guards/permission.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionGuard) // ← Apply guards
export class CustomerController {
  /**
   * Only users with 'customers:create' permission can access
   */
  @Post()
  @RequirePermission('customers:create') // ← Require permission
  async create(
    @Body() createDto: CreateCustomerDto,
    @CurrentUser() user: CurrentUserType, // ← Get current user
  ) {
    return this.customerService.create(createDto, user.organizationId);
  }

  /**
   * Only users with 'customers:read' permission can access
   */
  @Get()
  @RequirePermission('customers:read')
  async findAll(@CurrentUser() user: CurrentUserType) {
    return this.customerService.findAll(user.organizationId);
  }

  /**
   * Scope-based: Only users with 'customers:update:own' can update their own customers
   */
  @Patch(':id')
  @RequirePermission('customers:update', 'own') // ← With scope
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomerDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    // Additional ownership check in service layer
    return this.customerService.update(id, updateDto, user.id);
  }
}
```

#### Method 2: Feature-Based Protection

```typescript
import { RequireFeature } from '../iam/decorators/require-feature.decorator';
import { FeatureGuard } from '../iam/guards/feature.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard, FeatureGuard) // ← Feature guard
@RequireFeature('customers') // ← Require feature access
export class CustomerController {
  // All methods require 'customers' feature access
  // (user must have ANY permission for this feature)
}
```

#### Method 3: Controller-Level Protection

```typescript
@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('customers:manage') // ← Applied to all methods
export class CustomerController {
  // All methods require 'customers:manage' permission

  @Get()
  findAll() {
    // Still requires 'customers:manage'
  }

  @Post()
  @RequirePermission('customers:create') // ← Override controller-level
  create() {
    // Requires 'customers:create' instead
  }
}
```

### Service Layer

#### Checking Permissions Programmatically

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { IamService } from '../iam/services/iam.service';

@Injectable()
export class CustomerService {
  constructor(private readonly iamService: IamService) {}

  async findOne(id: string, userId: string): Promise<Customer> {
    // Check permission at runtime
    const canRead = await this.iamService.hasPermission(userId, 'customers:read');

    if (!canRead) {
      throw new ForbiddenException('You do not have permission to read customers');
    }

    return this.customerRepository.findOne(id);
  }

  /**
   * Check ownership for 'own' scope
   */
  async update(id: string, updateDto: UpdateDto, userId: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne(id);

    // Check permission with scope and ownership
    const canUpdate = await this.iamService.hasPermission(
      userId,
      'customers:update',
      'own',
      id,
      customer.createdBy, // ← Resource owner ID
    );

    if (!canUpdate) {
      throw new ForbiddenException('You can only update your own customers');
    }

    return this.customerRepository.update(id, updateDto);
  }

  /**
   * Get all user permissions
   */
  async getUserDashboard(userId: string): Promise<DashboardDto> {
    const permissions = await this.iamService.getUserPermissions(userId);

    return {
      canCreateCustomers: permissions.includes('customers:create'),
      canManageInventory: permissions.includes('inventory:manage'),
      canViewReports: permissions.includes('reports:read'),
    };
  }
}
```

#### Checking Feature Access

```typescript
async checkFeatureAccess(userId: string): Promise<boolean> {
  return this.iamService.hasFeatureAccess(userId, 'customers');
}
```

#### Getting User Roles

```typescript
async getUserRoles(userId: string): Promise<string[]> {
  return this.iamService.getUserRoleIds(userId);
}
```

### Role Management

#### Creating a New Role

```typescript
// Via API
POST /iam/roles
{
  "name": "Project Manager",
  "code": "project_manager",
  "description": "Manages projects and team members",
  "level": 2
}

// Via Service
await this.roleRepository.create({
  organizationId: 'org-uuid',
  name: 'Project Manager',
  code: 'project_manager',
  level: 2,
  isSystemRole: false,
  createdBy: 'user-uuid',
});
```

#### Assigning Permissions to Role

```typescript
// Via API
POST /iam/roles/:roleId/permissions
{
  "permissionIds": [
    "perm-uuid-1",
    "perm-uuid-2",
    "perm-uuid-3"
  ]
}

// Via Service
await this.iamService.assignPermissionsToRole(
  'role-uuid',
  ['perm-uuid-1', 'perm-uuid-2'],
  'admin-user-uuid',
);
```

#### Syncing Role Permissions (Replace All)

```typescript
// Replaces ALL existing permissions with new set
await this.iamService.syncRolePermissions(
  'role-uuid',
  ['perm-uuid-1', 'perm-uuid-2'], // ← Only these will remain
  'admin-user-uuid',
);
```

#### Assigning Role to User

```typescript
// Via UserRoleRepository
await this.userRoleRepository.create({
  userId: 'user-uuid',
  roleId: 'role-uuid', // ← New IAM role ID
  organizationId: 'org-uuid',
  createdBy: 'admin-uuid',
});
```

### Permission Management

#### Creating a Permission

```typescript
POST /iam/permissions
{
  "featureId": "feature-uuid",
  "name": "Create Customer",
  "code": "customers:create",
  "action": "create",
  "scope": "all",
  "description": "Allows creating new customers"
}
```

#### Getting Permissions by Feature

```typescript
GET /iam/permissions?featureId=feature-uuid

// Returns all permissions for the specified feature
```

---

## API Reference

### Role Endpoints

| Method   | Endpoint                     | Permission Required | Description                       |
| -------- | ---------------------------- | ------------------- | --------------------------------- |
| `POST`   | `/iam/roles`                 | `iam:roles:create`  | Create new role                   |
| `GET`    | `/iam/roles`                 | `iam:roles:read`    | List all roles (paginated)        |
| `GET`    | `/iam/roles/:id`             | `iam:roles:read`    | Get role details with permissions |
| `PATCH`  | `/iam/roles/:id`             | `iam:roles:update`  | Update role                       |
| `DELETE` | `/iam/roles/:id`             | `iam:roles:delete`  | Soft delete role                  |
| `POST`   | `/iam/roles/:id/permissions` | `iam:roles:update`  | Assign permissions to role        |

### Permission Endpoints

| Method   | Endpoint               | Permission Required      | Description                  |
| -------- | ---------------------- | ------------------------ | ---------------------------- |
| `POST`   | `/iam/permissions`     | `iam:permissions:create` | Create permission            |
| `GET`    | `/iam/permissions`     | `iam:permissions:read`   | List permissions (paginated) |
| `GET`    | `/iam/permissions/:id` | `iam:permissions:read`   | Get permission details       |
| `PATCH`  | `/iam/permissions/:id` | `iam:permissions:update` | Update permission            |
| `DELETE` | `/iam/permissions/:id` | `iam:permissions:delete` | Delete permission            |

### Feature Endpoints

| Method   | Endpoint            | Permission Required   | Description               |
| -------- | ------------------- | --------------------- | ------------------------- |
| `POST`   | `/iam/features`     | `iam:features:create` | Create feature            |
| `GET`    | `/iam/features`     | `iam:features:read`   | List features (paginated) |
| `GET`    | `/iam/features/:id` | `iam:features:read`   | Get feature details       |
| `PATCH`  | `/iam/features/:id` | `iam:features:update` | Update feature            |
| `DELETE` | `/iam/features/:id` | `iam:features:delete` | Delete feature            |

### Common Query Parameters

```typescript
?page=1           // Page number (default: 1)
?pageSize=10      // Items per page (default: 10)
?activeOnly=true  // Filter active only (for features/permissions)
?featureId=uuid   // Filter by feature (for permissions)
```

---

## Migration Guide

### From Enum-Based Roles to IAM

#### Step 1: Map Old Roles to New Roles

```typescript
// Old system
enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

// New system (database-driven)
// Each organization can have custom roles with same codes
```

#### Step 2: Run Migration Script

```bash
npm run migrate:users-to-iam
```

**What it does:**

1. Reads `user_roles` table where `role` column has enum values
2. Finds corresponding IAM role in `roles` table by `code` and `organization_id`
3. Updates `user_roles.role_id` with new UUID
4. Preserves `role` column for backward compatibility

#### Step 3: Update Guards

**Before:**

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class CustomerController {}
```

**After:**

```typescript
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('customers:read')
export class CustomerController {}
```

#### Step 4: Update Service Checks

**Before:**

```typescript
if (user.roles.includes(Role.ADMIN)) {
  // Allow action
}
```

**After:**

```typescript
const hasPermission = await this.iamService.hasPermission(user.id, 'customers:update');
if (hasPermission) {
  // Allow action
}
```

---

## Testing

### 1. Test Users Setup

```bash
npm run seed:test-users-iam
```

Creates:

- `superadmin@test.com` - All permissions
- `admin@test.com` - All customer permissions
- `manager@test.com` - Create, Read, Update customers
- `sales@test.com` - Read customers only

### 2. Manual Testing with cURL

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Test@123"
  }'

# Save token
TOKEN="<access_token_from_response>"

# Test permission (should succeed for admin)
curl -X GET http://localhost:3000/customers \
  -H "Authorization: Bearer $TOKEN"

# Test with sales user (should succeed - read only)
curl -X GET http://localhost:3000/customers \
  -H "Authorization: Bearer $SALES_TOKEN"

# Try to create (should fail for sales)
curl -X POST http://localhost:3000/customers \
  -H "Authorization: Bearer $SALES_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Customer"}'
# Expected: 403 Forbidden
```

### 3. Unit Testing

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { IamService } from './iam.service';

describe('IamService', () => {
  let service: IamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IamService,
        // Mock repositories
      ],
    }).compile();

    service = module.get<IamService>(IamService);
  });

  it('should check permission correctly', async () => {
    const hasPermission = await service.hasPermission('user-id', 'customers:read');
    expect(hasPermission).toBe(true);
  });
});
```

### 4. E2E Testing

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('IAM E2E', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    // Setup app
    // Login and get token
  });

  it('should allow admin to create role', () => {
    return request(app.getHttpServer())
      .post('/iam/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Role',
        code: 'test_role',
      })
      .expect(201);
  });

  it('should deny non-admin from creating role', () => {
    return request(app.getHttpServer())
      .post('/iam/roles')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Test Role',
        code: 'test_role',
      })
      .expect(403);
  });
});
```

---

## Best Practices

### 1. Permission Naming Convention

Use consistent naming:

```typescript
// ✅ Good
'customers:create';
'customers:read';
'customers:update';
'customers:delete';
'customers:export';

// ❌ Bad
'createCustomer';
'customer-read';
'UPDATE_CUSTOMER';
```

### 2. Granular Permissions

Prefer granular over coarse permissions:

```typescript
// ✅ Good - Granular control
'customers:create';
'customers:read';
'customers:update';
'customers:delete';

// ❌ Bad - Too coarse
'customers:manage'; // What does "manage" include?
```

### 3. Use Scopes Wisely

```typescript
// ✅ Good - Clear scope
@RequirePermission('customers:update', 'own')

// ✅ Good - Default scope (all)
@RequirePermission('customers:read')

// ⚠️ Careful - Implement ownership checks in service
async update(id: string, userId: string) {
  const customer = await this.find(id);
  if (customer.createdBy !== userId) {
    throw new ForbiddenException();
  }
}
```

### 4. System Roles Protection

Mark critical roles as system roles:

```typescript
await this.roleRepository.create({
  name: 'Super Admin',
  code: 'super_admin',
  isSystemRole: true, // ← Cannot be deleted via API
});
```

### 5. Soft Delete Roles

Always use soft delete for roles to maintain audit history:

```typescript
// ✅ Good - Soft delete
await this.roleRepository.softDelete(roleId);

// ❌ Bad - Hard delete
await this.roleRepository.delete(roleId); // Avoid!
```

### 6. Cache Permissions in JWT

Always include permissions in JWT payload:

```typescript
// AuthService.login()
const permissions = await this.iamService.getUserPermissions(user.id);

return {
  access_token: this.jwtService.sign({
    sub: user.id,
    organizationId: user.organizationId,
    permissions, // ← Essential for PermissionGuard
  }),
};
```

### 7. Validate Permission Codes

Use enum or constants:

```typescript
// ✅ Good
export enum CustomerPermissions {
  CREATE = 'customers:create',
  READ = 'customers:read',
  UPDATE = 'customers:update',
  DELETE = 'customers:delete',
}

@RequirePermission(CustomerPermissions.CREATE)
create() {}

// ❌ Bad - Magic strings
@RequirePermission('customers:create') // Easy to typo
```

### 8. Test Permission Checks

Always test both positive and negative cases:

```typescript
describe('Customer Controller', () => {
  it('should allow admin to create customer', async () => {
    // Test with admin token
  });

  it('should deny sales from creating customer', async () => {
    // Test with sales token - expect 403
  });
});
```

---

## Troubleshooting

### Issue 1: "Access denied: Missing permission 'X'"

**Cause:** User's role doesn't have the required permission.

**Solution:**

1. Check user's roles: `SELECT * FROM user_roles WHERE user_id = ?`
2. Check role's permissions: `SELECT * FROM role_permissions WHERE role_id = ?`
3. Assign permission to role via API or directly:
   ```sql
   INSERT INTO role_permissions (role_id, permission_id, created_by)
   VALUES ('role-uuid', 'permission-uuid', 'admin-uuid');
   ```

### Issue 2: Permissions not in JWT

**Cause:** JWT was issued before permissions were loaded.

**Solution:**

1. Re-login to get new JWT with updated permissions
2. Or implement token refresh with updated permissions:
   ```typescript
   // In AuthService
   async refresh(userId: string) {
     const permissions = await this.iamService.getUserPermissions(userId);
     return this.generateTokens({ userId, permissions });
   }
   ```

### Issue 3: "User not authenticated" despite valid token

**Cause:** Guards order is incorrect.

**Solution:**

```typescript
// ✅ Correct order
@UseGuards(JwtAuthGuard, PermissionGuard)
//         ^^^^^^^^^^^^  Must be first!

// ❌ Wrong order
@UseGuards(PermissionGuard, JwtAuthGuard)
//         PermissionGuard needs user from JWT
```

### Issue 4: Permission check in service returns false

**Cause:** Using stale data or checking wrong permission code.

**Solution:**

```typescript
// Debug
const permissions = await this.iamService.getUserPermissions(userId);
console.log('User permissions:', permissions);
console.log('Checking for:', 'customers:create');

// Verify permission exists
const permission = await this.permissionRepository.findByCode('customers:create');
console.log('Permission:', permission);
```

### Issue 5: Role soft-deleted but still appears

**Cause:** Query not filtering soft-deleted roles.

**Solution:**

```typescript
// ✅ Always use IsNull() for deletedAt
where: {
  deletedAt: IsNull();
}

// ❌ Don't use null directly
where: {
  deletedAt: null;
} // TypeORM error
```

### Issue 6: Organization isolation not working

**Cause:** Forgot to filter by `organization_id`.

**Solution:**

```typescript
// ✅ Always include organizationId in role queries
const roles = await this.roleRepository.findByOrganization(organizationId);

// ❌ Bad - returns roles from all orgs
const roles = await this.roleRepository.find();
```

### Issue 7: Database migration fails

**Cause:** Tables already exist or foreign key violations.

**Solution:**

```bash
# Check migration status
npm run migration:show

# Revert last migration
npm run migration:revert

# Re-run migration
npm run migration:run

# Or reset (⚠️ development only!)
npm run schema:drop
npm run migration:run
```

---

## Architecture Decisions

### Why JWT-Based Guards?

**Pros:**

- ⚡ **Fast**: No DB lookup on every request
- 🔒 **Stateless**: Works with load balancers
- 🎯 **Simple**: Direct array check

**Cons:**

- ⏱️ **Stale data**: Permissions only updated on re-login (mitigate with short JWT expiry + refresh tokens)

**Alternative Considered:** Database-based checks

- Would require DB query on every request (slower)
- Good for: Real-time permission changes
- Our choice: JWT for performance, use short expiry (15 min) + refresh

### Why Minimal IAM (4 Tables)?

**Original design:** 7 tables (features, permissions, roles, role_permissions, organization_feature_config, role_feature_access, permission_conditions)

**Simplified to 4 tables:**

- ✅ Easier to understand and maintain
- ✅ Covers 90% of use cases
- ✅ Can extend later if needed

**Removed tables:**

- `organization_feature_config` → Use feature.is_active + permission checks
- `role_feature_access` → Derived from role_permissions + permission.feature_id
- `permission_conditions` → Use permission.conditions (JSONB) for future ABAC

---

## Performance Considerations

### 1. JWT Payload Size

**Current:**

- Average: 200-500 bytes per permission
- For 50 permissions: ~10-25 KB
- JWT limit: Typically 8 KB (headers) - 64 KB (cookies)

**Optimization:**

```typescript
// ✅ Good - Use short permission codes
'customers:read';

// ❌ Bad - Long codes increase JWT size
'customer_management_module:read_all_customers_in_organization';
```

### 2. Permission Check Performance

```typescript
// ✅ Fast - O(n) array includes
user.permissions.includes('customers:read');

// ❌ Slow - Database query on every request
await this.iamService.hasPermission(userId, 'customers:read');
```

Use `IamService.hasPermission()` only in service layer for complex checks, not in guards.

### 3. Database Indexes

Ensure these indexes exist (created by migration):

```sql
-- roles table
CREATE INDEX idx_roles_org_code ON roles(organization_id, code);
CREATE INDEX idx_roles_org_deleted ON roles(organization_id, deleted_at);

-- permissions table
CREATE INDEX idx_permissions_code ON permissions(code);
CREATE INDEX idx_permissions_feature ON permissions(feature_id);

-- role_permissions table
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
```

---

## Future Enhancements

### Planned Features

1. **Advanced ABAC** - Attribute-based access control with conditions
2. **Permission Dependencies** - `customers:delete` requires `customers:read`
3. **Time-Based Permissions** - Temporary access grants
4. **IP-Based Restrictions** - Limit access by IP range
5. **Audit Logging** - Track all permission checks and changes
6. **Permission Groups** - Bundle related permissions
7. **Role Templates** - Predefined role configurations
8. **Bulk Operations** - Assign/revoke permissions in bulk

---

## Contributing

### Adding a New Module

1. **Create Feature:**

   ```typescript
   POST /iam/features
   {
     "code": "inventory",
     "name": "Inventory Management",
     "featureType": "module"
   }
   ```

2. **Create Permissions:**

   ```typescript
   POST /iam/permissions
   {
     "featureId": "feature-uuid",
     "code": "inventory:create",
     "action": "create",
     "scope": "all"
   }
   ```

3. **Assign to Roles:**

   ```typescript
   POST /iam/roles/:roleId/permissions
   {
     "permissionIds": ["perm-uuid-1", "perm-uuid-2"]
   }
   ```

4. **Protect Routes:**
   ```typescript
   @Controller('inventory')
   @UseGuards(JwtAuthGuard, PermissionGuard)
   export class InventoryController {
     @Post()
     @RequirePermission('inventory:create')
     create() {}
   }
   ```

---

## License

This IAM module is part of the OneOhm EPC project and follows the project's licensing terms.

---

## Support

For questions or issues:

1. Check [Troubleshooting](#troubleshooting) section
2. Review API documentation at `/api/docs` (Swagger)
3. Contact the development team

---

**Last Updated:** 2024
**Module Version:** 1.0.0
**Maintained By:** OneOhm EPC Development Team
