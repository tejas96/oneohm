# 🔄 Reusability Patterns & Best Practices Guide

## 📋 Table of Contents

- [Overview](#overview)
- [Shared Interfaces](#shared-interfaces)
- [Helper Utilities](#helper-utilities)
- [Controller Patterns](#controller-patterns)
- [Service Patterns](#service-patterns)
- [Examples](#examples)
- [Checklist](#checklist)

---

## 🎯 Overview

This guide documents the reusable patterns established in the OneOhm EPC codebase to maintain consistency, reduce duplication, and improve maintainability across all modules.

**Core Principles:**

1. ✅ DRY (Don't Repeat Yourself) - Use shared interfaces and utilities
2. ✅ Consistency - All modules follow the same patterns
3. ✅ Type Safety - Leverage TypeScript for strong typing
4. ✅ Maintainability - Changes propagate automatically through shared code

---

## 📦 Shared Interfaces

### Location

```
libs/shared-types/src/interfaces/common.interface.ts
```

### Available Interfaces

#### 1. **PaginatedResponse<T>**

Standard response format for all paginated endpoints.

```typescript
interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

**Usage:**

```typescript
// Controller
async findAll(): Promise<PaginatedResponse<UserDto>> {
  const { users, total } = await this.service.findAll(page, limit);

  return {
    data: plainToInstance(UserDto, users, { excludeExtraneousValues: true }),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

#### 2. **StatisticsResponse<T>**

Standard response for dashboard/statistics endpoints.

```typescript
interface StatisticsResponse<T extends string = string> {
  total: number;
  byStatus: Record<T, number>;
}
```

**Usage:**

```typescript
// Controller
async getStatistics(): Promise<StatisticsResponse<UserStatus>> {
  return this.service.getStatistics(organizationId);
}

// Service
async getStatistics(organizationId: string): Promise<StatisticsResponse<UserStatus>> {
  const byStatus = await this.repository.countByStatus(organizationId);

  return {
    total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
    byStatus,
  };
}
```

#### 3. **ExtendedStatisticsResponse<TStatus, TType>**

For statistics with multiple groupings.

```typescript
interface ExtendedStatisticsResponse<
  TStatus extends string = string,
  TType extends string = string,
> {
  total: number;
  byStatus: Record<TStatus, number>;
  byType: Record<TType, number>;
}
```

**Usage:**

```typescript
async getStatistics(): Promise<ExtendedStatisticsResponse<VendorStatus, VendorType>> {
  const [byStatus, byType] = await Promise.all([
    this.repository.countByStatus(organizationId),
    this.repository.countByType(organizationId),
  ]);

  return {
    total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
    byStatus,
    byType,
  };
}
```

#### 4. **Filter Interfaces**

```typescript
// Date range filtering
interface DateRangeFilter {
  fromDate?: string;
  toDate?: string;
}

// Text search
interface SearchFilter {
  search?: string;
}

// Status filtering
interface StatusFilter<T = string> {
  status?: T;
}

// Combined common filters
interface CommonFilters extends DateRangeFilter, SearchFilter {
  [key: string]: unknown; // Allow additional filters
}
```

#### 5. **Audit Trail Interfaces**

```typescript
interface AuditTrail {
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt: Date;
  deletedBy?: string;
  deletedAt?: Date;
}
```

#### 6. **Location & Contact Interfaces**

```typescript
interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface ContactInfo {
  email?: string;
  phone?: string;
  mobile?: string;
}
```

---

## 🛠️ Helper Utilities

### Location

```
libs/shared-utils/src/helpers/pagination.helper.ts
```

### Available Helpers

#### 1. **createPaginatedResponse()**

Quick helper to create paginated responses with automatic DTO transformation.

```typescript
// Without DTO transformation
return createPaginatedResponse(users, total, page, limit);

// With DTO transformation
return createPaginatedResponse(users, total, page, limit, UserResponseDto);
```

#### 2. **createPaginationMeta()**

Create just the pagination metadata.

```typescript
const meta = createPaginationMeta(100, 1, 20);
// Returns: { page: 1, limit: 20, total: 100, totalPages: 5 }
```

#### 3. **parsePaginationParams()**

Parse and validate pagination query parameters.

```typescript
const { page, limit } = parsePaginationParams(
  query.page, // Can be string or number
  query.limit, // Can be string or number
  1, // Default page
  20, // Default limit
  100, // Max limit
);
```

#### 4. **calculateSkip()**

Calculate database skip value for pagination.

```typescript
const skip = calculateSkip(page, limit);
// For page 2, limit 20: returns 20
```

---

## 🎮 Controller Patterns

### Standard List Endpoint Pattern

```typescript
@Get()
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
@ApiReadAll({
  summary: 'Get all users',
  description: 'Retrieve all users with pagination',
  responseType: UserResponseDto,
  roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
})
@ApiQuery({ name: 'page', required: false, type: Number })
@ApiQuery({ name: 'limit', required: false, type: Number })
@ApiQuery({ name: 'status', required: false, enum: Object.values(UserStatus) })
async findAll(
  @CurrentUser() currentUser: CurrentUserType,
  @Query('page') page?: number,
  @Query('limit') limit?: number,
  @Query('status') status?: UserStatus,
): Promise<PaginatedResponse<UserResponseDto>> {
  const { users, total } = await this.userService.findAll(
    currentUser.organizationId,
    page ?? 1,
    limit ?? 20,
    { status },
  );

  return {
    data: plainToInstance(UserResponseDto, users, {
      excludeExtraneousValues: true,
    }),
    meta: {
      page: page ?? 1,
      limit: limit ?? 20,
      total,
      totalPages: Math.ceil(total / (limit ?? 20)),
    },
  };
}
```

### Standard Statistics Endpoint Pattern

```typescript
@Get('stats/summary')
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
@ApiOperation({
  summary: 'Get user statistics',
  description: 'Get user count by status',
})
async getStatistics(
  @CurrentUser() currentUser: CurrentUserType,
): Promise<StatisticsResponse<UserStatus>> {
  return this.userService.getStatistics(currentUser.organizationId);
}
```

---

## 🔧 Service Patterns

### Standard findAll Pattern

```typescript
async findAll(
  organizationId: string,
  page = 1,
  limit = 20,
  filters?: {
    status?: UserStatus;
    search?: string;
  },
): Promise<{ users: UserEntity[]; total: number }> {
  return this.userRepository.findAll(organizationId, page, limit, filters);
}
```

### Standard Statistics Pattern

```typescript
async getStatistics(
  organizationId: string,
): Promise<StatisticsResponse<UserStatus>> {
  const byStatus = await this.userRepository.countByStatus(organizationId);

  return {
    total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
    byStatus,
  };
}
```

---

## 📚 Examples

### Complete Example: User Module

#### Controller

```typescript
import {
  type PaginatedResponse,
  type StatisticsResponse,
  UserStatus,
} from '@oneohm-epc/shared-types';
import { createPaginatedResponse } from '@oneohm-epc/shared-utils';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const { users, total } = await this.userService.findAll(
      currentUser.organizationId,
      page ?? 1,
      limit ?? 20,
    );

    // Option 1: Manual
    return {
      data: plainToInstance(UserResponseDto, users, {
        excludeExtraneousValues: true,
      }),
      meta: {
        page: page ?? 1,
        limit: limit ?? 20,
        total,
        totalPages: Math.ceil(total / (limit ?? 20)),
      },
    };

    // Option 2: Using helper (recommended)
    return createPaginatedResponse(users, total, page ?? 1, limit ?? 20, UserResponseDto);
  }

  @Get('stats/summary')
  async getStatistics(
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<StatisticsResponse<UserStatus>> {
    return this.userService.getStatistics(currentUser.organizationId);
  }
}
```

---

## ✅ Refactoring Checklist

When creating a new module or refactoring an existing one, use this checklist:

### Imports

- [ ] Import `PaginatedResponse<T>` for list endpoints
- [ ] Import `StatisticsResponse<T>` for stats endpoints
- [ ] Import `ExtendedStatisticsResponse<TStatus, TType>` if needed
- [ ] Import relevant filter interfaces if applicable

### Controllers

- [ ] Use `PaginatedResponse<DtoType>` for all `findAll()` methods
- [ ] Return `{ data, meta }` structure (not `{ items, total, page, limit }`)
- [ ] Use `StatisticsResponse<EnumType>` for statistics endpoints
- [ ] Use `?? ` (nullish coalescing) instead of `||` for defaults
- [ ] Add proper TypeScript return types to all methods

### Services

- [ ] Return consistent structures matching controller expectations
- [ ] Use shared filter interfaces
- [ ] Implement statistics methods that return `StatisticsResponse<T>`

### Response Structure

- [ ] `data` - Array of items
- [ ] `meta.page` - Current page number
- [ ] `meta.limit` - Items per page
- [ ] `meta.total` - Total item count
- [ ] `meta.totalPages` - Calculated total pages

### Documentation

- [ ] Add JSDoc comments for public methods
- [ ] Document query parameters with `@ApiQuery`
- [ ] Use Swagger decorators (`@ApiReadAll`, `@ApiOperation`, etc.)

---

## 🚀 Benefits

### Before Refactoring ❌

```typescript
// Inconsistent - Projects
{ projects: ProjectDto[], total, page, limit }

// Inconsistent - Quotes
{ data: QuoteDto[], total, page, limit }

// Inconsistent - Products
{ data: ProductDto[], total, page, limit }

// Inconsistent - Inventory
{ data: InventoryDto[], meta: { page, limit, total, totalPages } }
```

### After Refactoring ✅

```typescript
// Consistent everywhere
PaginatedResponse<DtoType> = {
  data: DtoType[],
  meta: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

### Advantages:

1. ✅ **Consistency** - Same structure across all modules
2. ✅ **Type Safety** - TypeScript catches mismatches
3. ✅ **Maintainability** - Changes in one place affect all modules
4. ✅ **Frontend Integration** - Predictable API responses
5. ✅ **Documentation** - Self-documenting through types
6. ✅ **Less Code** - Reusable utilities reduce boilerplate

---

## 📝 Notes

### For Future Modules:

1. **ALWAYS** check `@shared-types` for existing interfaces first
2. **ALWAYS** use `PaginatedResponse<T>` for list endpoints
3. **ALWAYS** use `StatisticsResponse<T>` for statistics
4. **ALWAYS** use helper utilities when available
5. **NEVER** create inline types that could be shared
6. **NEVER** use different response structures for the same purpose

### Code Review Checklist:

- Are shared interfaces being used?
- Are response structures consistent?
- Are helper utilities being leveraged?
- Is TypeScript strict mode satisfied?
- Are there no duplicate type definitions?

---

## 🔗 Related Files

- **Shared Interfaces**: `libs/shared-types/src/interfaces/common.interface.ts`
- **Helper Utilities**: `libs/shared-utils/src/helpers/pagination.helper.ts`
- **Example Implementations**:
  - `apps/backend/src/modules/inventory/controllers/*.controller.ts`
  - `apps/backend/src/modules/projects/controllers/project.controller.ts`
  - `apps/backend/src/modules/quotes/controllers/quote.controller.ts`
  - `apps/backend/src/modules/products/controllers/product.controller.ts`

---

**Last Updated:** December 2024  
**Maintained By:** OneOhm EPC Team  
**Status:** ✅ Active & Enforced
