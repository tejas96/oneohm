# @oneohm-epc/shared-utils

Shared utilities and reusable decorators for the OneOhm EPC platform.

## 📦 Purpose

This library provides common utilities, decorators, and helpers used across the entire OneOhm EPC application. It promotes code reusability, consistency, and reduces boilerplate in controllers and services.

## 🎯 What's Inside

### API Decorators

Reusable NestJS decorators that combine common patterns for REST API endpoints:

| Decorator     | HTTP Method      | Use Case                           |
| ------------- | ---------------- | ---------------------------------- |
| `@ApiCreate`  | POST /           | Create new resources               |
| `@ApiReadAll` | GET /            | List all resources with pagination |
| `@ApiReadOne` | GET /:id         | Get single resource by ID          |
| `@ApiUpdate`  | PUT/PATCH /:id   | Update existing resource           |
| `@ApiDelete`  | DELETE /:id      | Delete resource (soft/hard)        |
| `@ApiAction`  | POST /:id/action | Custom resource actions            |
| `@ApiGet`     | GET /custom-path | Any custom GET endpoint            |

## 🚀 Usage Examples

### Basic CRUD Operations

```typescript
import { Controller } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Role } from '@oneohm-epc/shared-auth';
import { ApiCreate, ApiReadAll, ApiReadOne, ApiUpdate, ApiDelete } from '@oneohm-epc/shared-utils';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerController {
  // Create
  @ApiCreate({
    summary: 'Create a new customer',
    description: 'Creates a new customer in the system',
    responseType: CustomerResponseDto,
    roles: [Role.ADMIN, Role.MANAGER],
  })
  async create(@Body() dto: CreateCustomerDto) {
    return this.service.create(dto);
  }

  // Read All
  @ApiReadAll({
    summary: 'Get all customers',
    responseType: CustomerResponseDto,
    roles: [Role.ADMIN],
  })
  async findAll() {
    return this.service.findAll();
  }

  // Read One
  @ApiReadOne({
    summary: 'Get customer by ID',
    responseType: CustomerResponseDto,
    roles: [Role.ADMIN],
  })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // Update
  @ApiUpdate({
    summary: 'Update customer',
    responseType: CustomerResponseDto,
    roles: [Role.ADMIN],
  })
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.service.update(id, dto);
  }

  // Delete
  @ApiDelete({
    summary: 'Delete customer',
    roles: [Role.ADMIN],
  })
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
```

### Custom Actions

```typescript
// Activate/Deactivate endpoints
@ApiAction({
  path: 'activate',
  summary: 'Activate customer account',
  responseType: CustomerResponseDto,
  roles: [Role.ADMIN],
})
async activate(@Param('id') id: string) {
  return this.service.activate(id);
}

@ApiAction({
  path: 'status',
  summary: 'Update customer status',
  responseType: CustomerResponseDto,
  roles: [Role.ADMIN],
})
async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
  return this.service.updateStatus(id, dto);
}
```

### Generic GET Endpoints

```typescript
// Statistics
@ApiGet({
  path: 'statistics/status',
  summary: 'Get customer status statistics',
  description: 'Returns count of customers grouped by status',
  roles: [Role.ADMIN, Role.MANAGER],
})
async getStatistics() {
  return this.service.getStatistics();
}

// Search with query parameters
@ApiGet({
  path: 'search',
  summary: 'Search customers',
  responseType: CustomerResponseDto,
  responseIsArray: true,
  queries: [
    { name: 'q', required: true, type: String, description: 'Search term' },
    { name: 'status', required: false, enum: ['active', 'inactive'] },
  ],
  roles: [Role.ADMIN],
})
async search(@Query('q') query: string, @Query('status') status?: string) {
  return this.service.search(query, status);
}

// Export/Download
@ApiGet({
  path: 'export/csv',
  summary: 'Export customers to CSV',
  responseType: String,
  roles: [Role.ADMIN],
})
async exportCsv() {
  return this.service.exportToCsv();
}
```

### Additional Error Responses

```typescript
@ApiCreate({
  summary: 'Create customer',
  responseType: CustomerResponseDto,
  roles: [Role.ADMIN],
  additionalErrors: [
    {
      status: HttpStatus.CONFLICT,
      description: 'Customer with same email already exists',
    },
  ],
})
async create(@Body() dto: CreateCustomerDto) {
  return this.service.create(dto);
}
```

## 🛠️ Building Custom Decorators

### Structure

All decorators follow this pattern:

```typescript
import { applyDecorators, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Roles, type Role } from '@oneohm-epc/shared-auth';

export function MyCustomDecorator(options: {
  summary: string;
  roles?: Role[];
  // ... other options
}) {
  const decorators = [
    Post(), // HTTP method
    HttpCode(HttpStatus.CREATED), // Status code
    ...(options.roles ? [Roles(...options.roles)] : []), // Roles guard
    ApiOperation({ summary: options.summary }), // Swagger operation
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Success response',
    }), // Swagger responses
  ];

  return applyDecorators(...decorators);
}
```

### Best Practices

1. **Type Safety**: Use TypeScript generics for response types
2. **Optional Roles**: Make role guards optional with conditional spreading
3. **Swagger Integration**: Always include `ApiOperation` and `ApiResponse`
4. **Common Errors**: Include standard error responses (401, 403, etc.)
5. **Flexibility**: Allow additional configurations through options

## 📚 Available Options

### Common Options (All Decorators)

```typescript
{
  summary: string;              // Brief description (required)
  description?: string;         // Detailed description (optional)
  responseType?: Type<T>;       // Response DTO class
  roles?: Role[];              // Required roles for authorization
}
```

### ApiReadAll Specific

```typescript
{
  additionalQueries?: Array<{  // Extra query parameters
    name: string;
    required?: boolean;
    type?: Type<unknown>;
    description?: string;
    enum?: string[] | number[];
  }>;
}
```

### ApiCreate/ApiUpdate Specific

```typescript
{
  additionalErrors?: Array<{   // Extra error responses
    status: HttpStatus;
    description: string;
  }>;
}
```

### ApiGet Specific

```typescript
{
  path: string;                // Custom path (required)
  responseIsArray?: boolean;   // Response is array
  responseSchema?: object;     // Custom response schema
  params?: Array<{             // Path parameters
    name: string;
    type?: Type<unknown>;
    description?: string;
  }>;
  queries?: Array<{            // Query parameters
    name: string;
    required?: boolean;
    type?: Type<unknown>;
    description?: string;
    enum?: string[] | number[];
  }>;
}
```

## 🏗️ Development

### Building the Library

```bash
# Build once
npx nx build shared-utils

# Build with watch mode
npx nx build shared-utils --watch

# Build without cache
npx nx build shared-utils --skip-nx-cache
```

### Testing Changes

After making changes to decorators:

1. **Rebuild**: `npx nx build shared-utils`
2. **Verify Types**: Check that TypeScript compilation passes
3. **Test Usage**: Use the decorator in a controller
4. **Check Swagger**: Run the app and verify OpenAPI docs at `/api`

### Adding New Decorators

1. Create new file in `libs/shared-utils/src/decorators/`
2. Export from `libs/shared-utils/src/decorators/index.ts`
3. Build the library
4. Use in your application

## 📋 What Each Decorator Does

### @ApiCreate

- Sets HTTP method to `POST`
- Returns `201 Created` status
- Includes standard error responses (400, 401, 403)
- Perfect for resource creation endpoints

### @ApiReadAll

- Sets HTTP method to `GET`
- Includes pagination query parameters (limit, offset)
- Returns array response structure
- Ideal for listing resources

### @ApiReadOne

- Sets HTTP method to `GET /:id`
- Includes ID path parameter
- Returns single resource
- Adds 404 Not Found error

### @ApiUpdate

- Sets HTTP method to `PUT /:id` or `PATCH /:id`
- Includes ID path parameter
- Returns updated resource
- Perfect for resource updates

### @ApiDelete

- Sets HTTP method to `DELETE /:id`
- Includes ID path parameter
- Returns 204 No Content
- Handles soft/hard deletes

### @ApiAction

- Sets HTTP method to `POST /:id/{action}`
- Flexible path for custom actions
- Returns resource or custom response
- Use for: activate, deactivate, approve, reject, etc.

### @ApiGet

- Sets HTTP method to `GET /{custom-path}`
- Most flexible decorator
- Supports path params, query params, custom responses
- Use for: statistics, search, export, analytics, etc.

## 💡 Tips

1. **Consistency**: Always use these decorators instead of manual decorator stacking
2. **Swagger**: Decorators automatically generate OpenAPI documentation
3. **Type Safety**: Provide `responseType` for better type inference
4. **Roles**: Always specify required roles for secure endpoints
5. **Descriptions**: Add descriptions for better API documentation

## 🔗 Related Libraries

- `@oneohm-epc/shared-auth` - Authentication guards and decorators
- `@oneohm-epc/shared-types` - Shared TypeScript types and enums

## 📝 Notes

- All decorators include automatic Swagger documentation
- Standard error responses (401, 403) are included by default
- Role-based access control is optional but recommended
- Response types should be DTOs with Swagger decorators
