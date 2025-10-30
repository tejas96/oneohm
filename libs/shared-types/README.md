# Shared Types

Common TypeScript types and interfaces shared across all OneOhm EPC applications.

## Usage

```typescript
import { User, ApiResponse, UserRole } from '@oneohm-epc/shared-types';

const response: ApiResponse<User> = {
  success: true,
  data: {
    id: '123',
    email: 'user@example.com',
    name: 'John Doe',
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};
```

## What's Included

- **ApiResponse**: Standard API response format
- **User**: User entity type
- **UserRole**: User role enum
- **PaginatedResponse**: Paginated API responses
- And more...

## Adding New Types

Add new shared types to `src/index.ts` and export them.
