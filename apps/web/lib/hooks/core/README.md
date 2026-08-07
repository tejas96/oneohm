# FDAL -- Frontend Data Access Layer

Generic hook system built on TanStack Query v5. One resource file per backend entity, zero boilerplate in UI components.

## Features

- Paginated lists with search, filters, sorting, debounce, URL sync, and page prefetching
- Single record detail fetch with abort support and hover prefetching
- Full CRUD mutations with auto cache invalidation and toast notifications
- Bulk delete and status change mutations
- Custom action mutations (archive, restore, sync, etc.)
- Optimistic updates with automatic rollback on error
- Infinite scroll lists via `useInfiniteQuery`
- Nested/child resource lists (sub-resources)
- Resource statistics and aggregate endpoints
- Field uniqueness/availability checks with AbortController
- RBAC permission flags per resource (`canView`, `canCreate`, `canUpdate`, `canDelete`)
- Centralized resource registry (`defineResource` -- endpoint, defaults, permissions in one place)
- Resource event system for cross-module reactivity (mutation broadcasts)
- Multi-tenant org context via `X-Organization-Id` header (automatic)
- Stable query key hashing for reliable cache identity
- Auto-detected response format normalization (3 API shapes supported)
- Centralized error normalization (Axios errors to consistent `NormalizedError` shape)
- Configurable stale times, gc times, retry logic, and refetch strategies
- Query param mapping for backend inconsistencies (`limit` vs `pageSize`)
- Filter persistence to `localStorage` across navigation
- Companion hooks: `useDeleteConfirmation`, `useModalForm`, `useMutationWithToast`
- All queries use `AbortController` via TanStack Query's `signal`
- `keepPreviousData` enabled by default (no flicker on page/filter change)

## Folder Structure

```
lib/hooks/core/                        ← FDAL engine (never edit for new resources)
  index.ts                               barrel — all exports
  types.ts                               all interfaces (ResourceConfig, MutationConfig, etc.)
  resource-registry.ts                   defineResource, getResourceConfig, getResourcePermissions
  resource-events.ts                     ResourceEventEmitter (cross-module mutation events)
  query-keys.ts                          stableHash, createResourceKeys
  query-builder.ts                       buildQueryParams (filters → URLSearchParams)
  query-defaults.ts                      RESOURCE_QUERY_DEFAULTS, RESOURCE_MUTATION_DEFAULTS, STALE_TIMES
  response-adapter.ts                    defaultResponseAdapter (normalizes 3 API formats)
  error-adapter.ts                       normalizeApiError (Axios → NormalizedError)
  use-org-context.ts                     useOrgContext ()
  use-query-state.ts                     useQueryState (search, filters, pagination, sorting, URL sync)
  use-resource-list.ts                   useResourceList (paginated list hook)
  use-resource-detail.ts                 useResourceDetail, prefetchResourceDetail
  use-resource-mutations.ts              useResourceMutations (CRUD + bulk + status + custom)
  use-resource-sub-list.ts               useResourceSubList (child resources)
  use-resource-stats.ts                  useResourceStats, mapStatsToFilterTabs
  use-infinite-resource-list.ts          useInfiniteResourceList (infinite scroll)
  use-resource-permissions.ts            useResourcePermissions (RBAC flags)
  use-field-availability.ts              useFieldAvailability (uniqueness checks)
  companions/
    index.ts                             barrel
    use-delete-confirmation.ts           useDeleteConfirmation (delete flow state)
    use-modal-form.ts                    useModalForm (form + mutation wiring)
    use-mutation-with-toast.ts           useMutationWithToast (wrap any mutation with toast)
  __tests__/
    query-keys.test.ts
    query-builder.test.ts
    response-adapter.test.ts
    error-adapter.test.ts
    resource-events.test.ts

lib/hooks/resources/                   ← one file per backend entity (thin wrappers)
  users.ts                               @Controller('users')
  roles.ts                               @Controller('iam/roles')
  permissions.ts                         @Controller('iam/permissions')
  user-roles.ts                          @Controller('iam/user-roles')
  invitations.ts                         @Controller('invitations')
  index.ts                               barrel
```

---

## Quick Start -- Add a New Resource in 2 Minutes

**1. Create `lib/hooks/resources/projects.ts`:**

```typescript
import {
  defineResource,
  getResourceConfig,
  getResourcePermissions,
  useResourceList,
  useResourceDetail,
  useResourceMutations,
  useResourcePermissions,
  type ResourceConfig,
  type BaseFilters,
} from '@/lib/hooks/core';

// Types
export interface Project {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export interface ProjectFilters extends BaseFilters {
  status?: string;
}

// Register once
defineResource<Project>(
  'projects',
  {
    endpoint: '/projects',
    defaultPageSize: 20,
    syncToUrl: true,
    defaultSort: { field: 'createdAt', order: 'DESC' },
    paramMapping: { limit: 'pageSize' },
  },
  {
    view: 'projects:read',
    create: 'projects:create',
    update: 'projects:update',
    delete: 'projects:delete',
  },
);

// Hooks
export function useProjects() {
  const config = getResourceConfig('projects') as ResourceConfig<Project, ProjectFilters>;
  return useResourceList<Project, ProjectFilters>(config);
}

export function useProject(id: string) {
  return useResourceDetail<Project>({ resource: 'projects', endpoint: '/projects', id });
}

export function useProjectMutations() {
  return useResourceMutations<Project>({
    resource: 'projects',
    endpoint: '/projects',
    toast: {
      create: { success: 'Project created' },
      update: { success: 'Project updated' },
      delete: { success: 'Project deleted' },
    },
  });
}

export function useProjectPermissions() {
  return useResourcePermissions(getResourcePermissions('projects'));
}
```

**2. Export from `lib/hooks/resources/index.ts`:**

```typescript
export * from './projects';
```

**3. Use in any component:**

```tsx
import { useProjects, useProjectMutations, useProjectPermissions } from '@/lib/hooks/resources';

function ProjectsPage() {
  const {
    items,
    meta,
    isEmpty,
    search,
    setSearch,
    clearSearch,
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    pagination,
    sorting,
    isLoading,
    isFetching,
    isError,
    error,
  } = useProjects();

  const mutations = useProjectMutations();
  const permissions = useProjectPermissions();

  return (
    <>
      <SearchInput value={search} onChange={setSearch} />
      <FilterTabs value={filters.status} onChange={(v) => setFilter('status', v)} />
      <Table data={items} loading={isLoading}>
        <SortableHeader field="name" {...sorting} />
      </Table>
      <Pagination {...pagination} />
      {permissions.canCreate && (
        <Button onClick={() => mutations.create.mutate(payload)}>New</Button>
      )}
    </>
  );
}
```

No `useState`, no `useEffect`, no `useDebounce`, no URL sync code, no query keys.

---

## Core Hooks

### `useResourceList<T, F>(config, options?)`

Paginated list with search, filters, sorting, debounce, URL sync, and prefetching.

**Config (`ResourceConfig<T, F>`):**

| Field                  | Type                      | Default     | Purpose                                                            |
| ---------------------- | ------------------------- | ----------- | ------------------------------------------------------------------ |
| `resource`             | `string`                  | required    | Cache key namespace                                                |
| `endpoint`             | `string`                  | required    | API base path (e.g. `/projects`)                                   |
| `defaultPageSize`      | `number`                  | `10`        | Items per page                                                     |
| `defaultSort`          | `{ field, order }`        | none        | Initial sort column and direction                                  |
| `defaultFilters`       | `Partial<F>`              | none        | Initial filter values                                              |
| `syncToUrl`            | `boolean`                 | `true`      | Sync page/search/sort/filters to browser URL                       |
| `persistFilters`       | `boolean`                 | `false`     | Persist filters to `localStorage` across navigation                |
| `searchDebounceMs`     | `number`                  | `550`       | Debounce delay for search input (ms)                               |
| `minSearchLength`      | `number`                  | `2`         | Min characters before search query fires                           |
| `paramMapping`         | `Record<string, string>`  | none        | Rename query params sent to backend (e.g. `{ limit: 'pageSize' }`) |
| `requiresOrg`          | `boolean`                 | `true`      | Send `X-Organization-Id` header                                    |
| `staleTime`            | `number`                  | `60_000`    | How long data is considered fresh (ms)                             |
| `gcTime`               | `number`                  | `300_000`   | How long unused cache is kept (ms)                                 |
| `refetchInterval`      | `number \| false`         | `false`     | Polling interval (ms), `false` to disable                          |
| `refetchOnWindowFocus` | `boolean`                 | `false`     | Refetch when browser tab regains focus                             |
| `responseAdapter`      | `(raw) => { data, meta }` | auto-detect | Custom response normalizer (rarely needed)                         |

**Options (2nd argument):**

| Field     | Type          | Purpose                                                     |
| --------- | ------------- | ----------------------------------------------------------- |
| `select`  | `(data) => R` | Transform/select data before returning (reduces re-renders) |
| `enabled` | `boolean`     | Conditionally enable/disable the query                      |

**Returns (`UseResourceListReturn<T, F>`):**

```typescript
{
  // Data
  items: T[];
  meta: { page, limit, total, totalPages } | undefined;
  isEmpty: boolean;

  // Search (debounced internally)
  search: string;
  setSearch: (value: string) => void;
  debouncedSearch: string;
  clearSearch: () => void;

  // Filters (auto-resets page to 1 on change)
  filters: Partial<F>;
  setFilter: (key, value) => void;
  setFilters: (updates: Partial<F>) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;

  // Pagination
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  // Sorting
  sorting: {
    sortBy: string | undefined;
    sortOrder: 'ASC' | 'DESC';
    setSorting: (field: string, order?: 'ASC' | 'DESC') => void;
    toggleSort: (field: string) => void;
    clearSort: () => void;
  };

  // Query state
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: NormalizedError | null;
  refetch: () => void;
  prefetchPage: (page: number) => void;
  queryKeys: ResourceKeys;
}
```

---

### `useResourceDetail<T>(config)`

Single record fetch with abort support.

**Config:**

| Field         | Type             | Default   | Purpose                                            |
| ------------- | ---------------- | --------- | -------------------------------------------------- |
| `resource`    | `string`         | required  | Cache key namespace                                |
| `endpoint`    | `string`         | required  | API base path                                      |
| `id`          | `string`         | required  | Record ID (appended to endpoint: `/projects/{id}`) |
| `requiresOrg` | `boolean`        | `true`    | Send `X-Organization-Id` header                    |
| `enabled`     | `boolean`        | `true`    | Conditionally enable/disable                       |
| `staleTime`   | `number`         | `60_000`  | Cache freshness (ms)                               |
| `gcTime`      | `number`         | `300_000` | Cache retention (ms)                               |
| `select`      | `(data: T) => T` | identity  | Transform data before returning                    |

**Returns:** Full TanStack Query result + `error: NormalizedError | null`.

```typescript
const { data, isLoading, isError, error, refetch } = useResourceDetail<Project>({
  resource: 'projects',
  endpoint: '/projects',
  id: projectId,
});
```

**Prefetch on hover** (makes detail page navigation instant):

```typescript
import { prefetchResourceDetail } from '@/lib/hooks/core';

const handleHover = (id: string) => {
  prefetchResourceDetail(queryClient, {
    resource: 'projects',
    endpoint: '/projects',
    id,
  });
};
```

---

### `useResourceMutations<T>(config)`

CRUD + status change + bulk delete + custom actions. Auto-invalidates cache, emits resource events, shows toast notifications.

**Config (`MutationConfig<T>`):**

| Field               | Type                                                                  | Purpose                                             |
| ------------------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| `resource`          | `string`                                                              | Cache key namespace (used for invalidation)         |
| `endpoint`          | `string`                                                              | API base path                                       |
| `requiresOrg`       | `boolean`                                                             | Send `X-Organization-Id` header (default `true`)    |
| `endpoints`         | `{ create?, update?, delete?, archive?, bulkDelete?, statusChange? }` | Override individual endpoint paths                  |
| `customActions`     | `Record<string, { method, path }>`                                    | Define extra actions beyond CRUD                    |
| `optimistic`        | `{ create?, update?, delete? }`                                       | Optimistic update functions (see below)             |
| `toast`             | `MutationToastConfig`                                                 | Success/error toast messages per operation          |
| `invalidateRelated` | `string[]`                                                            | Other resource caches to invalidate on any mutation |

**Returns:**

```typescript
{
  create: UseMutationResult; // POST   /endpoint
  update: UseMutationResult; // PATCH  /endpoint/:id
  remove: UseMutationResult; // DELETE /endpoint/:id
  archive: UseMutationResult; // POST   /endpoint/:id/archive
  bulkDelete: UseMutationResult; // POST   /endpoint/bulk-delete
  statusChange: UseMutationResult; // POST   /endpoint/:id/status
  action: (name: string, id: string, payload?: unknown) => Promise<T>;
  getError: (mutation: string) => NormalizedError | null;
}
```

**Usage:**

```typescript
const m = useResourceMutations<Project>({
  resource: 'projects',
  endpoint: '/projects',
  customActions: {
    archive: { method: 'POST', path: (id) => `/projects/${id}/archive` },
  },
  invalidateRelated: ['tasks'],
  toast: {
    create: { success: 'Project created' },
    delete: { success: 'Project deleted' },
    archive: { success: 'Project archived' },
  },
});

m.create.mutate(payload); // POST   /projects
m.update.mutate({ id, ...data }); // PATCH  /projects/:id
m.remove.mutateAsync(id); // DELETE /projects/:id
m.statusChange.mutate({ id, status: 'active' }); // POST   /projects/:id/status
m.bulkDelete.mutate(['id1', 'id2']); // POST   /projects/bulk-delete
m.action('archive', id); // POST   /projects/:id/archive (custom)
```

**Optimistic updates:**

```typescript
useResourceMutations<Project>({
  resource: 'projects',
  endpoint: '/projects',
  optimistic: {
    create: (newItem, list) => [newItem as Project, ...list],
    update: (id, payload, list) => list.map((p) => (p.id === id ? { ...p, ...payload } : p)),
    delete: (id, list) => list.filter((p) => p.id !== id),
  },
});
```

On error, the cache automatically rolls back to the previous state.

---

### `useResourceSubList<T>(config, parentId, filters?)`

Child resources under a parent entity.

**Config (`SubResourceConfig<T, F>`):**

| Field            | Type      | Purpose                                           |
| ---------------- | --------- | ------------------------------------------------- |
| `resource`       | `string`  | Cache key namespace                               |
| `endpoint`       | `string`  | API path (with optional `{parentId}` placeholder) |
| `parentResource` | `string`  | Parent entity name (for cache structure)          |
| `parentIdInPath` | `boolean` | Replace `{parentId}` in endpoint with actual ID   |
| `parentIdParam`  | `string`  | Send parent ID as this query param instead        |
| `requiresOrg`    | `boolean` | Send org header (default `true`)                  |

**Returns:** `{ items, meta, isLoading, isFetching, isError, error, refetch }`

```typescript
const { items, isLoading } = useResourceSubList<Task>(
  {
    resource: 'project-tasks',
    endpoint: '/projects/{parentId}/tasks',
    parentResource: 'projects',
    parentIdInPath: true,
  },
  projectId,
);
```

Handles flat array responses automatically -- wraps `T[]` into `{ data: T[], meta }`.

---

### `useInfiniteResourceList<T, F>(config, filters?)`

Infinite scroll lists via TanStack Query's `useInfiniteQuery`. Uses the same `ResourceConfig` as `useResourceList`.

**Returns:**

```typescript
{
  items: T[];                     // all loaded items across all pages (flattened)
  meta: PaginationMeta;           // meta from last loaded page
  totalLoaded: number;            // items.length
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;      // call to load next page
  isError: boolean;
  error: NormalizedError | null;
  refetch: () => void;
}
```

```typescript
const { items, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteResourceList<LogEntry>(
  { resource: 'logs', endpoint: '/logs', defaultPageSize: 50 },
  { status: 'error' },
);

// In component:
<InfiniteScroll onLoadMore={fetchNextPage} hasMore={hasNextPage} loading={isFetchingNextPage}>
  {items.map((log) => <LogRow key={log.id} log={log} />)}
</InfiniteScroll>
```

---

### `useResourceStats<T>(config)`

Aggregate/count endpoint for dashboard cards or filter tab counts.

**Config (`StatsConfig<T>`):**

| Field         | Type         | Purpose                               |
| ------------- | ------------ | ------------------------------------- |
| `resource`    | `string`     | Cache key namespace                   |
| `endpoint`    | `string`     | Stats API path                        |
| `requiresOrg` | `boolean`    | Send org header (default `true`)      |
| `staleTime`   | `number`     | Cache freshness (default 60s)         |
| `transform`   | `(raw) => T` | Transform raw response to typed stats |

**Returns:** `{ stats: T | undefined, isLoading, isError, error, refetch }`

```typescript
const { stats } = useResourceStats<{ total: number; active: number }>({
  resource: 'projects',
  endpoint: '/projects/stats',
});
```

`mapStatsToFilterTabs(stats, tabs)` utility maps stats counts to filter tab badges.

---

### `useFieldAvailability(config, excludeId?)`

Debounced uniqueness check with per-field AbortController. Cancels in-flight requests when a new value is typed.

**Config (`FieldAvailabilityConfig`):**

| Field            | Type     | Purpose                                                     |
| ---------------- | -------- | ----------------------------------------------------------- |
| `endpoint`       | `string` | Availability check API path                                 |
| `excludeIdParam` | `string` | Query param name to exclude current record (for edit forms) |

**Returns:**

```typescript
{
  errors: Record<string, string | null>;   // field → error message (null = available)
  isChecking: Record<string, boolean>;     // field → currently checking
  checkField: (field: string, value: string) => void;
  clearErrors: () => void;
  hasErrors: boolean;
  isAnyChecking: boolean;
}
```

```typescript
const { errors, isChecking, checkField, hasErrors } = useFieldAvailability(
  {
    endpoint: '/users/check-availability',
    excludeIdParam: 'excludeUserId',
  },
  editingUserId,
);

// On input change:
checkField('email', 'user@example.com');

// Read:
if (errors.email) showError(errors.email);
if (isChecking.email) showSpinner();
```

---

### `useResourcePermissions(config?)`

RBAC flags derived from the authenticated user's permissions.

**Returns:** `{ canView, canCreate, canUpdate, canDelete, canArchive, canBulkDelete }` -- all booleans.

When no config is passed, all permissions default to `true`.

```typescript
import { getResourcePermissions, useResourcePermissions } from '@/lib/hooks/core';

const { canCreate, canDelete } = useResourcePermissions(getResourcePermissions('projects'));

{canCreate && <Button>New Project</Button>}
{canDelete && <Button variant="destructive">Delete</Button>}
```

---

## Companion Hooks

### `useDeleteConfirmation<T>(options)`

State machine for delete confirmation flow. You render your own dialog using the returned state.

**Options:** `{ mutation, getId, entityName, onSuccess? }`

**Returns:** `{ target, isOpen, isPending, requestDelete, confirm, cancel }`

```typescript
const del = useDeleteConfirmation<Project>({
  mutation: mutations.remove,
  getId: (item) => item.id,
  entityName: 'project',
});

// Trigger:
<Button onClick={() => del.requestDelete(item)}>Delete</Button>

// Dialog:
<AlertDialog open={del.isOpen}>
  <AlertDialogContent>
    <AlertDialogTitle>Delete {del.target?.name}?</AlertDialogTitle>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={del.cancel}>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={del.confirm} disabled={del.isPending}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### `useModalForm<TForm, TPayload>(options)`

Wires react-hook-form to a mutation. Handles submit, toast, form reset, and modal close.

**Options:** `{ form, mutation, transformPayload?, successMessage?, onSuccess?, onOpenChange }`

- `form` is a pre-built `UseFormReturn` from `useForm()` -- the hook does NOT accept `schema`

**Returns:** `{ handleSubmit, handleClose, isSubmitting, isError }`

```typescript
const form = useForm<FormValues>({ resolver: zodResolver(schema) });

const { handleSubmit, handleClose, isSubmitting } = useModalForm({
  form,
  mutation: mutations.create,
  successMessage: 'Created successfully',
  onOpenChange: setOpen,
  transformPayload: (data) => ({ ...data, }),
});

<form onSubmit={handleSubmit}>
  {/* fields */}
  <Button type="submit" disabled={isSubmitting}>Save</Button>
</form>
```

### `useMutationWithToast<TData, TVariables>(options)`

Wraps any TanStack mutation with toast notifications. Useful for one-off mutations outside the CRUD pattern.

**Options:** `{ mutation, successMessage?, errorMessage?, onSuccess?, onError? }`

**Returns:** `{ execute, isPending, isError, error }`

```typescript
const { execute, isPending } = useMutationWithToast({
  mutation: someCustomMutation,
  successMessage: 'Export started',
  errorMessage: 'Export failed',
});

<Button onClick={() => execute(params)} disabled={isPending}>Export</Button>
```

---

## Resource Registry

Register resource config and permissions once, retrieve anywhere.

```typescript
import { defineResource, getResourceConfig, getResourcePermissions } from '@/lib/hooks/core';

// Registration (called at module load time):
defineResource<Project>(
  'projects',
  {
    endpoint: '/projects',
    defaultPageSize: 20,
    paramMapping: { limit: 'pageSize' },
  },
  {
    view: 'projects:read',
    create: 'projects:create',
    update: 'projects:update',
    delete: 'projects:delete',
  },
);

// Retrieval:
const config = getResourceConfig('projects'); // → ResourceConfig<Project>
const perms = getResourcePermissions('projects'); // → { view, create, update, delete } strings
```

---

## Resource Event System

Mutations automatically emit events. Other modules can listen and react.

```typescript
import { resourceEvents } from '@/lib/hooks/core';

// Listen to a specific resource:
const unsubscribe = resourceEvents.on('projects', (event) => {
  // event: { resource, type, data?, id?, ids?, timestamp }
  // type: 'created' | 'updated' | 'deleted' | 'archived' | 'bulkDeleted'
  console.log(`Project ${event.type}:`, event.id);
});

// Listen to ALL resources:
const unsub = resourceEvents.onAny((event) => {
  analytics.track(`${event.resource}.${event.type}`);
});

// Cleanup:
unsubscribe();
```

Events are emitted automatically by `useResourceMutations` after successful mutations. No manual emit needed.

---

## Multi-Tenant Org Context

`useOrgContext()` provides the authenticated user's organization info. All core hooks use it internally.

```typescript

// : string | undefined
// : { 'X-Organization-Id': string } | {}
// : boolean (true when org is available)
```

Queries with `requiresOrg: true` (default) are disabled until `` is `true`.

---

## Error Normalization

All query and mutation errors are normalized via `normalizeApiError`:

```typescript
interface NormalizedError {
  message: string; // human-readable message
  code?: string; // error code from backend
  status?: number; // HTTP status (401, 404, 500, etc.)
  validationErrors?: Array<{
    // field-level validation errors
    field: string;
    message: string;
  }>;
  raw: unknown; // original error object
}
```

Handles Axios errors, generic `Error` instances, and unknown errors. Extracts `message` from `response.data.message` (string or array) or `response.data.error`.

---

## Response Format Handling

`defaultResponseAdapter` auto-detects 3 API response shapes:

| Format | Response Shape                                            | Detected by             |
| ------ | --------------------------------------------------------- | ----------------------- |
| A      | `{ data: T[], meta: { page, limit, total, totalPages } }` | Has `meta` + `data`     |
| B      | `{ items: T[], total, page, limit }`                      | Has `items`             |
| C      | `{ data: T[], total, page, pageSize }`                    | Has `data` + `pageSize` |

All normalized to `{ data: T[], meta: PaginationMeta }`. Custom `responseAdapter` in config only needed for non-standard formats.

---

## Query Utilities

### `buildQueryParams(filters, options?)`

Converts filter object to `URLSearchParams`. Auto-skips `undefined`, `null`, empty strings, and values in `skipValues` (default: `['all']`).

```typescript
import { buildQueryParams } from '@/lib/hooks/core';

const params = buildQueryParams(
  { page: 1, limit: 10, search: 'test', status: 'all' },
  { minSearchLength: 2, skipValues: ['all'] },
);
// → "page=1&limit=10&search=test"  (status='all' skipped)
```

### `stableHash(obj)`

Recursive stable JSON serialization for objects. Ensures consistent cache keys regardless of property insertion order.

### `createResourceKeys(resource)`

Generates a namespaced query key factory:

```typescript
const keys = createResourceKeys('projects');
keys.all(); // ['projects']
keys.lists(); // ['projects', 'list']
keys.list(filters); // ['projects', 'list', stableHash(filters)]
keys.details(); // ['projects', 'detail']
keys.detail(id); // ['projects', 'detail', id]
keys.stats(); // ['projects', 'stats']
keys.infinite(filters); // ['projects', 'infinite', stableHash(filters)]
```

---

## Cache Defaults

| Setting                | Value               | Override                      |
| ---------------------- | ------------------- | ----------------------------- |
| `staleTime`            | 60s                 | `config.staleTime`            |
| `gcTime`               | 5 min               | `config.gcTime`               |
| `refetchOnWindowFocus` | `false`             | `config.refetchOnWindowFocus` |
| `refetchOnReconnect`   | `true`              | --                            |
| Query retry            | 1 attempt           | --                            |
| Mutation retry         | 1 attempt, skip 4xx | --                            |
| `keepPreviousData`     | `true`              | --                            |

**Preset stale times:**

```typescript
import { STALE_TIMES } from '@/lib/hooks/core';

STALE_TIMES.realtime; // 0       — always refetch
STALE_TIMES.fast; // 15s     — frequently changing data
STALE_TIMES.standard; // 60s     — default
STALE_TIMES.slow; // 5 min   — rarely changing data
STALE_TIMES.static; // 30 min  — near-static data (permission lists, etc.)
```

---

## File Organization Rule

**One file per backend controller/table** in `lib/hooks/resources/`.

Ask one question: **does this hook call the backend?**

- **Yes** -- `lib/hooks/resources/{entity}.ts`
- **No** -- feature folder (UI/component logic only)

Each resource file contains: `defineResource` + all hooks for that entity (list, detail, mutations, permissions, availability). No splitting by operation type.

```
lib/hooks/resources/
  users.ts          → @Controller('users')
  roles.ts          → @Controller('iam/roles')
  permissions.ts    → @Controller('iam/permissions')
  projects.ts       → @Controller('projects')
  customers.ts      → @Controller('customers')
  index.ts          → barrel
```

---

## Import Convention

```typescript
// Resource hooks — always from the barrel
import { useProjects, useProjectMutations, type Project } from '@/lib/hooks/resources';

// Core utilities — only when needed directly (rare)
import { STALE_TIMES, prefetchResourceDetail, resourceEvents } from '@/lib/hooks/core';
```

---

## Do / Don't

**Do:**

- Use `defineResource` for any entity with list + detail views
- Use `paramMapping` when the backend expects a different param name than `limit`
- Use `invalidateRelated` to keep related caches in sync
- Use `select` option to reduce component re-renders
- Use `useResourcePermissions` to guard UI actions
- Export all entity types from resource files

**Don't:**

- Write raw `useQuery` / `useMutation` in feature hooks -- compose from core hooks
- Put data access hooks in feature folders -- they belong in `lib/hooks/resources/`
- Create separate files for list, detail, and mutations of the same entity -- one file per entity
- Hardcode query keys -- use `createResourceKeys`
- Manually build `URLSearchParams` -- use `buildQueryParams`
