# Fixed Multi-Role Backend API Contract

This document defines the backend endpoints required before frontend cutover (Task 7).

## Endpoints

### `GET /users/:id/roles`

Returns canonical fixed role codes for a user.

```json
{ "roles": ["sales", "field_worker"] }
```

### `PUT /users/:id/roles`

Atomically replaces all roles for a user.

Request:
```json
{ "roles": ["sales", "field_worker"] }
```

Response:
```json
{ "roles": ["sales", "field_worker"] }
```

### `GET /users?role=<FixedRoleCode>`

Filters users by canonical role code (org-scoped).

### `GET /auth/me`

Must return canonical `roles: FixedRoleCode[]` without relying on legacy permission arrays for authorization.

## Error codes

| Status | Meaning |
|--------|---------|
| 403 | Forbidden (owner governance, org scope) |
| 404 | User not found |
| 409 | Conflict (stale concurrent update) |
| 422 | Invalid role code |

## Owner governance (server-side)

- Only `super_admin` may grant/revoke `admin` and `super_admin`
- Users cannot remove their own owner role
- Organization must retain at least one `super_admin`

## Data model

```
user_role_assignments (
  user_id,
  organization_id,
  role_code,      -- canonical FixedRoleCode
  assigned_by,
  created_at,
  updated_at,
  UNIQUE(user_id, organization_id, role_code)
)
```

## Migration

Map legacy roles per design spec. Ambiguous codes require manual review before cutover.

## Mobile

`oneohm-mobile` must adopt canonical codes or use a compatibility adapter before backend cutover.
