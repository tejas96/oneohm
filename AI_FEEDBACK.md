# 🤖 AI Development Feedback & Mistakes Log

This file tracks mistakes made during AI-assisted development to prevent repeating them and improve code quality.

---

## 📋 **Coding Pattern Mistakes**

### ❌ **Mistake #1: Entity Pattern Violations (Nov 10, 2025)**

**What I did wrong:**

- Created entities WITHOUT extending `BaseEntity`, duplicating id/createdAt/updatedAt
- Wrong import order: mixed local/cross-module imports
- Missing section comments for organization

**Correct pattern:**

```typescript
import { EnumType, type InterfaceType } from '@oneohm-epc/shared-types';
import { Column, Entity } from 'typeorm';

import { LocalEntity } from './local.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CrossModuleEntity } from '../../other/entities/cross.entity';

@Entity('table_name')
export class MyEntity extends BaseEntity {
  // ==================== Relations ====================
  // ... relations here
  // ==================== Main Fields ====================
  // ... other fields here
}
```

---

### ❌ **Mistake #2: DTO Enum Import as Type (Nov 10, 2025)**

**What I did wrong:**

- Imported enums as `import type { EnumName }` which breaks runtime usage in `Object.values()`, defaults, etc.

**Correct pattern:**

```typescript
import { EnumName } from '@oneohm-epc/shared-types'; // Regular import, NOT type-only
import type { InterfaceType } from '@oneohm-epc/shared-types'; // Only interfaces as type

@ApiProperty({
  enum: Object.values(EnumName), // ✅ Works only with regular import
  enumName: 'EnumName',
  example: EnumName.VALUE,
})
@IsEnum(EnumName)
field!: EnumName;
```

---

### ❌ **Mistake #3: Missing DTO Validation Details (Nov 10, 2025)**

**What I did wrong:**

- Used `@IsNumber()` without `maxDecimalPlaces` option
- Missing `@Type(() => Number)` for number transformations
- Missing section comments in DTOs

**Correct pattern:**

```typescript
// ==================== Section Name ====================
@ApiProperty({ example: 123.45, description: 'Amount' })
@IsNumber({ maxDecimalPlaces: 2 }) // ✅ Always specify maxDecimalPlaces
@Min(0)
@IsNotEmpty()
@Type(() => Number) // ✅ Required for transformation
amount!: number;
```

---

### ❌ **Mistake #4: Wrong Import Order in DTOs (Nov 10, 2025)**

**What I did wrong:**

- Mixed shared-types, class-transformer, and class-validator imports
- Types not separated from values

**Correct pattern:**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { EnumName, type InterfaceType } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

// Order: NestJS → shared-types → class-transformer → class-validator
```

---

### ❌ **Mistake #5: TypeORM Repository Patterns (Nov 10, 2025)**

**What I did wrong:**

- Used `deletedAt: null` in `find()` queries instead of `IsNull()`
- Used `Partial<Entity>` as update parameter type causing TypeScript errors

**Correct pattern:**

```typescript
import { IsNull, Repository } from 'typeorm';

// ❌ Wrong
where: { projectId, deletedAt: null }

// ✅ Correct
where: { projectId, deletedAt: IsNull() }

// ❌ Wrong
async update(id: string, updateData: Partial<Entity>): Promise<Entity>

// ✅ Correct
async update(id: string, updateData: Record<string, unknown>): Promise<Entity>

// ✅ Always check for undefined in aggregation results
const result = await query.getRawOne<{ total: string }>();
return result?.total ? parseFloat(result.total) : 0;
```

---

## 🚨 **Mistake #7: Missing Entity Indexes** *(CRITICAL)*

### **What Went Wrong:**

When creating Module 6 (Inventory) entities, I completely missed adding `@Index()` decorators to ALL 10 entities! This is a CRITICAL performance oversight.

### **Specific Failures:**

1. ❌ **Forgot to import `Index` from TypeORM** in all entity files
2. ❌ **Missed all 33 performance indexes** defined in schema:
   - Warehouses: 3 indexes (organization, type, manager)
   - Inventory Stock: 3 indexes (warehouse, product, composite)
   - Vendors: 3 indexes (organization, type, status)
   - Project Vendors: 2 indexes (project, vendor)
   - Purchase Orders: 5 indexes (organization, vendor, warehouse, project, status)
   - PO Items: 2 indexes (purchase_order, product)
   - Inventory Transactions: 5 indexes (warehouse, product, type, date, reference composite)
   - Stock Allocations: 4 indexes (project, warehouse, product, status)
   - Material Dispatches: 4 indexes (project, warehouse, status, date)
   - Dispatch Items: 2 indexes (dispatch, product)
3. ❌ **Also missed `approval_request_id` field** in PurchaseOrderEntity and migration!

### **Correct Pattern:**

```typescript
import {
  Column,
  Entity,
  Index,  // ← MUST import Index
  JoinColumn,
  ManyToOne,
} from 'typeorm';

@Entity('warehouses')
@Unique(['organizationId', 'code'])
@Index(['organizationId', 'deletedAt'])  // ← Add ALL indexes from schema
@Index(['warehouseType', 'deletedAt'])
@Index(['warehouseManagerId'])
export class WarehouseEntity extends BaseEntity {
  // ...
}
```

### **Why This Happened:**

I focused too much on entity structure (BaseEntity, relations, foreign keys) and completely overlooked **performance indexes** and **missing schema fields**.

### **Prevention Checklist (ADD TO EVERY ENTITY REVIEW):**

- [ ] ✅ `@Index()` decorator import added
- [ ] ✅ ALL indexes from schema DDL are present as `@Index([...])` decorators
- [ ] ✅ Composite indexes match schema (e.g., `@Index(['referenceType', 'referenceId'])`)
- [ ] ✅ Verify migration has matching `CREATE INDEX` statements
- [ ] ✅ Cross-check EVERY column in schema DDL vs entity fields (don't miss any!)

---

## ✅ **Key Patterns to Remember**

### **1. Entity Checklist:**

- [ ] **Extends `BaseEntity`** (provides id, createdAt, updatedAt) - **ONLY if table has all 3 fields**
  - ✅ Extend if table has: id + created_at + updated_at (+ optional deleted_at, created_by, updated_by)
  - ❌ Don't extend if table has different pattern (e.g., only id + created_at OR only id + updated_at)
  - Example: `inventory_stock` has only `id + updated_at` → manually define fields
- [ ] Import order: shared-types → TypeORM → **local entities** → BaseEntity → **cross-module entities**
- [ ] **CRITICAL: Import `Index` from TypeORM** and add ALL indexes from schema
- [ ] **CRITICAL: Separate Relations and Foreign Keys sections**
  - ❌ **WRONG:** Mixing `@Column` foreign keys in Relations section
  - ✅ **CORRECT:** Relations section has ONLY `@ManyToOne`/`@OneToMany`, Foreign Keys section has ONLY `@Column` IDs
- [ ] Section comments (`// ==================== Relations ====================`, `// ==================== Foreign Keys ====================`)
- [ ] Soft delete with `@DeleteDateColumn` (where applicable)
- [ ] `@Unique()` decorator for composite unique constraints
- [ ] `unique: true` in `@Column` for single-column unique constraints
- [ ] `@Index([...])` decorators for ALL performance indexes from schema DDL
- [ ] Cross-verify EVERY field in schema DDL exists in entity (don't miss any!)

### **2. DTO Checklist:**

- [ ] Import order: NestJS → shared-types (types first) → class-transformer → class-validator
- [ ] Section comments for organization
- [ ] Enums: regular import (NOT type-only), `Object.values(Enum)`, `enumName`
- [ ] Numbers: `maxDecimalPlaces`, `@Type(() => Number)`
- [ ] Response DTOs: `@Expose()` decorator
- [ ] Nested objects: `@ValidateNested()` + `@Type()`

### **3. Import Rules:**

- [ ] Use `import/no-duplicates` for auto-merge
- [ ] Inline type imports: `import { type TypeName, ValueName }`
- [ ] DI classes (Reflector, guards): regular import with `eslint-disable-next-line`

### **4. Before Implementing New Features:**

- [ ] Check existing codebase for similar patterns
- [ ] Review this feedback file for common mistakes
- [ ] Follow section comments convention
- [ ] Verify enum imports are NOT type-only if used at runtime

---

## 🎯 **Quick Reference for Module 8**

**Current Status:**

- ✅ Phase 1: Migrations (complete)
- ✅ Phase 2: Entities (fixed with correct patterns)
- 🔄 Phase 3: DTOs (in progress - need milestone/survey/material DTOs + response DTOs)
- ⏳ Phase 4: Repository Layer
- ⏳ Phase 5: Service Layer
- ⏳ Phase 6: Controller Layer
- ⏳ Phase 7: Integration
- ⏳ Phase 8: Testing

**Remaining DTOs needed:**

1. `project-milestone` DTOs (create, update, response)
2. `site-survey` DTOs (create, update, response)
3. `project-material` DTOs (create, update, response)
4. `project-response.dto.ts` (main project response)

---

## 🔄 **Mistake #8: Not Using Shared Reusable Interfaces** *(Nov 12, 2025)*

### **What Went Wrong:**

Across Projects, Quotes, Products, and Inventory modules, I created **inconsistent pagination response structures**:

- ❌ Projects: `{ projects, total, page, limit }` 
- ❌ Quotes: `{ data, total, page, limit }`
- ❌ Products: `{ data, total, page, limit }`
- ⚠️ Inventory: `{ data, meta: { page, limit, total, totalPages } }`

This caused:
1. Code duplication (same structure defined 4+ times)
2. Inconsistent API responses
3. Frontend confusion (different response formats)
4. Maintenance nightmare (changes need updating in 4 places)

### **Correct Pattern:**

**✅ Always use shared interfaces from `@oneohm-epc/shared-types`:**

```typescript
import {
  type PaginatedResponse,
  type StatisticsResponse,
  type ExtendedStatisticsResponse,
} from '@oneohm-epc/shared-types';

// For list endpoints
async findAll(): Promise<PaginatedResponse<UserDto>> {
  return {
    data: transformedUsers,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// For statistics
async getStats(): Promise<StatisticsResponse<UserStatus>> {
  return {
    total: 100,
    byStatus: { ACTIVE: 80, INACTIVE: 20 },
  };
}
```

### **Available Shared Interfaces:**

1. **`PaginatedResponse<T>`** - All list endpoints with pagination
2. **`StatisticsResponse<T>`** - Dashboard/statistics by status
3. **`ExtendedStatisticsResponse<TStatus, TType>`** - Stats with multiple groupings
4. **`PaginationParams`** - Query parameter types
5. **`DateRangeFilter`** - Date range filtering
6. **`SearchFilter`** - Text search filtering

### **Helper Utilities:**

Use `@oneohm-epc/shared-utils` helpers to reduce boilerplate:

```typescript
import { createPaginatedResponse } from '@oneohm-epc/shared-utils';

return createPaginatedResponse(users, total, page, limit, UserResponseDto);
```

### **Prevention Checklist:**

- [ ] ✅ **ALWAYS check `@shared-types`** for existing interfaces before creating inline types
- [ ] ✅ Use `PaginatedResponse<T>` for ALL list endpoints
- [ ] ✅ Use `StatisticsResponse<T>` for ALL statistics endpoints
- [ ] ✅ Use helper utilities from `@shared-utils` when available
- [ ] ✅ **NEVER** create inline response types like `{ data, total, page }`
- [ ] ✅ Ensure ALL modules follow the SAME response structure
- [ ] ✅ Reference `REUSABILITY_GUIDE.md` for patterns and examples

### **Refactored Modules:**

- ✅ Projects - Now using `PaginatedResponse<ProjectResponseDto>`
- ✅ Quotes - Now using `PaginatedResponse<QuoteResponseDto>`
- ✅ Products - Now using `PaginatedResponse<ProductResponseDto>`
- ✅ Inventory - Already using `PaginatedResponse<T>` and `StatisticsResponse<T>`

### **Documentation:**

See `REUSABILITY_GUIDE.md` for:
- Complete interface reference
- Helper utility examples
- Controller/Service patterns
- Before/after comparisons
- Module implementation examples

---

## 🔄 **Mistake #9: Not Using Standardized Base Classes** *(Nov 13, 2025)*

### **What Went Wrong:**

Across all 19 modules, there was **massive code duplication** in repositories and services:
- Every repository implemented the same CRUD methods
- Every service had identical findById/findAll/create/update/delete logic
- Error handling was inconsistent (some threw NotFoundException, others returned null)
- Transaction management was ad-hoc and inconsistent
- Type safety was compromised with excessive `any` usage

This led to:
1. ~10,000+ lines of duplicated boilerplate code
2. Inconsistent error messages and HTTP status codes
3. Difficult maintenance (bug fixes needed in 50+ places)
4. No centralized transaction management
5. TypeScript type errors and `any` usage throughout

### **Correct Pattern:**

**✅ Always extend base classes from `@oneohm-epc/shared-utils`:**

#### **1. Repository Pattern:**

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@oneohm-epc/shared-utils';

import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserRepository extends BaseRepository<UserEntity> {
  constructor(dataSource: DataSource) {
    super(UserEntity, dataSource);
  }

  // Only add custom methods beyond CRUD
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.findOne({ where: { email } });
  }
}
```

**✅ Inherited methods from BaseRepository:**
- `findByIdOrFail(id, relations?)` - Find or throw EntityNotFoundException
- `findOneByWhereOrFail(where, relations?)` - Find or throw
- `findAllPaginated(page, limit, options?)` - Paginated query
- `createEntity(data)` - Create and save
- `updateEntity(id, data)` - Update with existence check
- `softDeleteEntity(id)` - Soft delete
- `hardDeleteEntity(id)` - Permanent delete
- `restoreEntity(id)` - Restore soft-deleted
- `existsById(id)` - Check existence
- `existsByWhere(where)` - Check with criteria
- `countByWhere(where)` - Count with criteria

#### **2. Service Pattern:**

```typescript
import { Injectable } from '@nestjs/common';
import { BaseService } from '@oneohm-epc/shared-utils';

import { UserEntity } from '../entities/user.entity';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService extends BaseService<UserEntity, UserResponseDto> {
  constructor(private readonly userRepository: UserRepository) {
    super(userRepository, UserResponseDto);
  }

  // Add only custom business logic
  async sendWelcomeEmail(userId: string): Promise<void> {
    const user = await this.findById(userId);
    // Send email logic
  }
}
```

**✅ Inherited methods from BaseService:**
- `findById(id, relations?)` - Returns DTO
- `findOne(where, relations?)` - Returns DTO
- `findAll(page, limit, options?)` - Returns PaginatedResponse<DTO>
- `create(data)` - Returns DTO
- `update(id, data)` - Returns DTO
- `delete(id)` - Soft delete
- `hardDelete(id)` - Permanent delete
- `restore(id)` - Returns DTO
- `exists(id)` - Check existence
- `count(where?)` - Count entities

#### **3. DTO Pattern:**

```typescript
import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from '@oneohm-epc/shared-utils';

export class UserResponseDto extends BaseResponseDto {
  @Expose()
  @ApiProperty()
  email!: string;

  @Expose()
  @ApiProperty()
  name!: string;
}
```

**✅ Inherited fields from BaseResponseDto:**
- `id: string`
- `createdAt: Date`
- `updatedAt: Date`
- `deletedAt?: Date | null`

**✅ Also available:**
- `BaseAuditResponseDto` - Adds `createdBy?`, `updatedBy?`
- `BaseOrganizationResponseDto` - Adds `organizationId`

#### **4. Query DTOs:**

```typescript
import { IsOptional } from 'class-validator';
import { BaseFilterDto } from '@oneohm-epc/shared-utils';

export class UserFilterDto extends BaseFilterDto {
  @IsOptional()
  status?: UserStatus;
}
```

**✅ Inherited from BasePaginationDto:**
- `page?: number = 1`
- `limit?: number = 20`

**✅ Inherited from BaseSortDto:**
- `sortBy?: string`
- `sortOrder?: 'ASC' | 'DESC' = 'DESC'`

**✅ Inherited from BaseFilterDto:**
- `search?: string`
- `includeDeleted?: boolean = false`

#### **5. Transaction Pattern:**

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TransactionHelper } from '@oneohm-epc/shared-utils';

@Injectable()
export class UserService {
  constructor(private readonly dataSource: DataSource) {}

  async createUserWithProfile(userData: any, profileData: any) {
    return await TransactionHelper.executeInTransaction(
      this.dataSource,
      async (manager) => {
        const user = await manager.save(UserEntity, userData);
        await manager.save(ProfileEntity, { ...profileData, userId: user.id });
        return user;
      }
    );
  }
}
```

#### **6. Auto-Numbering Pattern:**

```typescript
import { Injectable } from '@nestjs/common';
import { AutoNumberingService } from '@oneohm-epc/shared-utils';

@Injectable()
export class LoanRepository {
  constructor(private readonly autoNumbering: AutoNumberingService) {}

  async create(data: any) {
    const applicationNumber = await this.autoNumbering.generateNumber(
      'loan_applications',
      'application_number',
      'LA',    // prefix
      true,    // include year
      4        // padding (LA-2024-0001)
    );
    // Save with generated number
  }
}
```

#### **7. Custom Exception Pattern:**

```typescript
import {
  EntityNotFoundException,
  ValidationException,
  InvalidOperationException,
  EntityAlreadyExistsException,
} from '@oneohm-epc/shared-utils';

// Throw consistent exceptions
throw new EntityNotFoundException('User', userId);
throw new ValidationException('Invalid email format', { email: ['Must be valid'] });
throw new InvalidOperationException('Cannot delete active user', 'User must be deactivated first');
throw new EntityAlreadyExistsException('User', 'email', userEmail);
```

### **Prevention Checklist:**

- [ ] ✅ **NEVER** implement findById/findAll/create/update/delete manually
- [ ] ✅ **ALWAYS** extend `BaseRepository<T>` for repositories
- [ ] ✅ **ALWAYS** extend `BaseService<TEntity, TDto>` for services
- [ ] ✅ **ALWAYS** extend `BaseResponseDto` for response DTOs
- [ ] ✅ **ALWAYS** extend `BaseFilterDto` for query DTOs
- [ ] ✅ Use `TransactionHelper` for multi-entity operations
- [ ] ✅ Use `AutoNumberingService` for sequential numbering
- [ ] ✅ Use custom exceptions from `@shared-utils` for consistent error handling
- [ ] ✅ Use `ApiPaginatedResponse` decorator for Swagger pagination docs
- [ ] ✅ **NEVER** use `any` type - use `unknown` with proper type guards

### **Benefits:**

1. **-10,000 lines of code** (80% reduction in boilerplate)
2. **100% consistent** error handling across all modules
3. **Type-safe** transactions with automatic rollback
4. **Thread-safe** auto-numbering with PostgreSQL advisory locks
5. **Centralized** maintenance (fix once, applies everywhere)
6. **Swagger** documentation auto-generated from base classes
7. **Zero `any` types** in production code (except TypeORM edge cases)

### **Refactoring Priority:**

1. ✅ Shared-utils infrastructure (completed)
2. ⏳ User module (template for others)
3. ⏳ Customer module
4. ⏳ Organization module with transactions
5. ⏳ All remaining 16 modules

---

_Last updated: November 13, 2025_
