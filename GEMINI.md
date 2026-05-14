# OneOhm EPC — Project Rules

Solar EPC platform — CRM, project management, quoting, and field ops for solar installation companies.

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | NestJS 10 · TypeORM · PostgreSQL |
| Web | Next.js 15 · React 19 · MUI 6 · Tailwind CSS · TanStack Query |
| Shared | `@oneohm-epc/shared` (`/types`, `/utils`, `/schemas`, `/constants`) |
| Monorepo | Nx |

---

## Core Principles

1. **Search before writing** — never duplicate code that already exists.
2. **Read related files first** — understand context and existing patterns before touching anything.
3. **Follow existing patterns exactly** — consistency beats personal preference.
4. **Repository pattern** — no direct TypeORM usage in services.
5. **Multi-org isolation** — every query filters by `organizationId`.
6. **Soft delete** — always check `deletedAt IS NULL`; never hard-delete.
7. **Pagination required** — never return unbounded result sets.
8. **Shared types** — cross-app types go in `@oneohm-epc/shared/types`; app-specific types stay in that app.

---

## GitHub Workflow

- **Always use GitHub MCP tools** for all GitHub operations (PRs, issues, reviews, comments).
- **Call `get_me` first** to get user context before any repo operation.
- **Never use `gh` CLI** unless the user explicitly requests it.
- Available MCP tools: `create_pull_request`, `list_pull_requests`, `search_issues`, `create_issue`, `add_comment_to_pending_review`, etc.

### Commit Messages

- Concise, imperative mood: "Add customer search" not "Added customer search".
- Focus on **why**, not what — the diff shows what changed.
- One logical change per commit.

### Pull Requests

When creating a PR:
1. Check `.github/PULL_REQUEST_TEMPLATE.md` and follow it if it exists.
2. Write a clear summary with bullet points describing what changed.
3. Include a test plan.
4. Use the GitHub MCP `create_pull_request` tool — never `gh pr create`.

### Branch Naming

- Feature: `feature/short-description`
- Bug fix: `fix/short-description`
- Refactor: `refactor/short-description`

---

## Post-Implementation Verification

**Only run when the user explicitly requests a PR** (mentions "raise PR", "create PR", or "submit PR"). Do NOT run after every implementation.

```bash
npm run lint:fix && npm run typecheck
```

- `lint:fix` — auto-fixes ESLint + Prettier. **Do not review its output.**
- `typecheck` — runs `tsc --noEmit`. **Review this output for errors.** Fix and re-run until zero errors.

---

## Quality — Always

### Before Writing Any Code

1. Search the codebase — verify the component, hook, util, or pattern does not already exist.
2. Read related files — understand the existing structure, naming, and conventions.
3. List scenarios — identify happy path, empty state, error state, edge cases, auth, and multi-tenancy concerns.
4. State what you will handle and what you are deferring. Deferred items get `// TODO:` comments.

### Code Review Self-Check

- [ ] No `any` types anywhere
- [ ] No `console.log` statements
- [ ] No dead/unused code
- [ ] No hardcoded values — use constants
- [ ] No duplicate code — reuse existing
- [ ] All imports from barrels, not deep paths
- [ ] All files under 500 lines
- [ ] All data states handled (loading, error, empty)
- [ ] All links/routes verified to work

### File Size Limit — 500 Lines Maximum

Every file must be under 500 lines. When a file approaches the limit:
- Extract sub-components into their own files
- Extract hooks into dedicated `use-*.ts` files
- Extract utility functions into `lib/utils/`
- Extract constants into `constants.ts`
- Split large services into focused sub-services or sub-controllers

### TypeScript Standards

- Strict mode — no implicit `any`, no `@ts-ignore` without justification.
- `unknown` over `any`; narrow with type guards.
- Explicit return types on all exported methods and functions.
- Prefix unused params with `_`.

### Clean Code

- Single responsibility — one function, one job.
- Meaningful names — `getUserById` not `getData`.
- Small functions — under 30 lines; extract if larger.
- Early returns — reduce nesting, fail fast.
- No magic numbers — use named constants.
- No `console.log` — use the appropriate logger.
- No dead code — delete immediately.
- No floating promises — use `void` or `await`.

---

## Scenario Checklist (Every Feature)

State which are handled and which are deferred before marking any feature complete.

**Data states:**
- Happy path — ideal flow works end to end
- Empty — no data, no results, null/undefined values
- Loading — spinner, skeleton, or progress indicator
- Error — API failure, validation error, network timeout

**Error codes (frontend):**
- 400 — field-level validation shown to user
- 401 — token refresh handled by interceptors; UI must not break
- 403 — "No permission" message, never blank screen
- 404 — user informed, graceful navigation
- 500 — generic error with retry option

**Boundaries:**
- Long text — truncated or wrapped
- Special characters — no injection, no breakage
- Rapid actions — debounced or disabled after first click
- Concurrent mutations — idempotent or queued

**Security (critical):**
- Organization isolation — every query filtered by org
- Role permissions — features gated by role
- Token expiry mid-action — handled without data loss
- Cross-org data leak — impossible by design

---

## Backend Rules (`apps/backend/**/*.ts`)

### Architecture

**Controller → Service → Repository** — strict layering, no shortcuts.

| Layer | Responsibility | Does NOT |
|-------|----------------|----------|
| Controller | HTTP handling, call service, return DTO | Business logic, database queries |
| Service | Business logic, validation, orchestration | Direct HTTP concerns, raw SQL |
| Repository | Database queries via TypeORM | Business decisions, error formatting |

### Module Structure

```
modules/[feature]/
├── [feature].module.ts
├── controllers/           ← One controller per resource
├── services/              ← Business logic
├── repositories/          ← TypeORM queries
├── entities/              ← TypeORM entity definitions
├── dto/                   ← Input DTOs + Response DTOs
├── types/                 ← Backend-only types (not shared)
└── index.ts               ← Barrel exports
```

### Multi-Tenant Security (CRITICAL)

Every endpoint MUST enforce organization isolation.

**Every query:**
- Filter by `organizationId` from `@OrganizationContext()`
- Filter by `deletedAt: IsNull()` — soft delete only

**Every mutation:**
- Override `organizationId` from context: `dto.organizationId = orgId`
- Track `createdBy` / `updatedBy` from `@CurrentUser()`
- Never trust client-supplied `organizationId`

**Every endpoint:**
- `@UseGuards(JwtAuthGuard)` — authentication required
- `@OrganizationContext()` — org isolation enforced

### DTOs

**Input DTOs:**
- Class-validator decorators + `@ApiProperty()` for Swagger
- Use `@IsDateString()` for JSON dates (not `@IsDate()`)
- Use `ParseUUIDPipe` on param/query UUID fields
- Never include `status` in update DTOs — use dedicated status endpoint

**Response DTOs:**
- `@Exclude()` on class, `@Expose()` on allowed fields
- Always transform via `toDto()` / `toDtoArray()` / `toPaginatedResponse()`
- Never return raw entities

**Status changes:**
- Dedicated `PATCH :id/status` endpoint with FSM validation
- Never allow status mutation through generic update

### Error Handling

| Scenario | Exception |
|----------|-----------|
| Not found | `NotFoundException('Resource not found')` |
| Duplicate | `ConflictException('Already exists')` |
| Invalid input | `BadRequestException('Validation failed')` |
| No permission | `ForbiddenException('Access denied')` |

- Never throw raw `Error()` or return `{ error: string }`.
- Catch specific exceptions; rethrow unexpected ones.
- Never swallow errors with generic `BadRequestException`.

### Reusable Patterns

```typescript
// Response transforms
toDto(DtoClass, entity)
toDtoArray(DtoClass, entities)
toPaginatedResponse(Dto, data, total, page, limit)

// Guards & decorators
@UseGuards(JwtAuthGuard)
@OrganizationContext()
@CurrentUser()

// Pagination — always use helper, never manual parseInt
const { page, limit } = parsePaginationParams(rawPage, rawLimit);

// Transactions — always use manager inside callback
await this.dataSource.transaction(async (manager) => {
  const repo = manager.getRepository(Entity);
  await repo.save(entity);
});

// Rate limiting
@UseGuards(SecurityRateLimitGuard)
@SecurityRateLimit({ eventType, trackBy: ['ipAddress'], limits: [...] })
```

### Data Integrity

- **Transactions:** Multi-entity writes MUST use `dataSource.transaction()` with `manager.getRepository()`. Never use `this.repository` inside a transaction callback.
- **Date columns:** Compare `DATE` type with `YYYY-MM-DD` using local date math. Never use `toISOString()` (timezone shift).
- **Sequence generation:** Always use `.withDeleted()` when querying for next number/code — soft-deleted rows still occupy the sequence.
- **Summary vs list:** Aggregate counts must come from independent queries, never computed from filtered list results.

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Entity | `{Name}Entity` | `CustomerProfileEntity` |
| Service | `{Name}Service` | `CustomerService` |
| Controller | `{Name}Controller` | `CustomerController` |
| Repository | `{Name}Repository` | `CustomerRepository` |
| Create DTO | `Create{Name}Dto` | `CreateCustomerDto` |
| Update DTO | `Update{Name}Dto` | `UpdateCustomerDto` |
| Response DTO | `{Name}ResponseDto` | `CustomerResponseDto` |

### Logging

- Use `this.logger.log()`, `this.logger.warn()`, `this.logger.error()`.
- Never use `console.log`.

### Backend Strict Prohibitions

| Never | Always |
|-------|--------|
| Skip org filter | `@UseGuards(JwtAuthGuard)` on all endpoints |
| Skip soft delete filter | `@OrganizationContext()` on all endpoints |
| Use `any` type | `deletedAt: IsNull()` in every query |
| Use `console.log` | `this.logger.log()` for logging |
| Return raw entities | `toDto()` for all responses |
| Hardcode values | Config/constants |
| Trust client input | Validate everything |
| Trust client `organizationId` | Override from `@OrganizationContext()` |
| Manual `parseInt` for pagination | `parsePaginationParams()` |
| Raw SQL status literals | Parameterized queries with enum values |
| `this.repository` in transactions | `manager.getRepository(Entity)` |
| Status via generic update | Dedicated `PATCH :id/status` with FSM |
| Files over 500 lines | Split into focused sub-services or sub-controllers |

---

## Frontend Rules (`apps/web/**/*.ts`, `apps/web/**/*.tsx`)

### Design System: MUI + Tailwind

MUI is the **primary** UI framework. Tailwind is **only** for layout and spacing.

| Concern | Use | Never Use |
|---------|-----|-----------|
| Layout & spacing | **Tailwind** — `flex`, `grid`, `gap-*`, `p-*`, `m-*`, `w-*`, `h-*` | `sx={{ display: 'flex' }}`, `<Box>` for layout |
| Responsive | **Tailwind** — `sm:`, `md:`, `lg:`, `xl:` breakpoints | MUI `sx` breakpoints for layout |
| Typography | **`MUITypography`** — semantic variants only | Raw `<Typography>` from MUI, Tailwind text classes |
| Interactive | **MUI** — `MUIInput`, `MUISelect`, `MUISwitch`, `MUIDialog`, `Button`, `Autocomplete` | Radix, shadcn, custom implementations |
| Icons | **`@mui/icons-material`** | `lucide-react`, inline SVGs |
| MUI overrides | **`sx` prop** — only for MUI internals (e.g. `'& .MuiInputBase-root'`) | `sx` for generic layout, padding, flexbox |
| Color tokens | **Tailwind** — `text-primary`, `bg-background-secondary`, `border-border-light` | Hardcoded `text-gray-500`, `bg-green-600` |

**Strict prohibitions:**
- Never use `sx` for layout/spacing. `sx={{ display: 'flex', gap: 2, mt: 1 }}` must be `className="flex gap-2 mt-1"`.
- Never use `<Box>` for layout wrappers. Use `<div className="...">`. Only use `<Box>` when `sx` is genuinely needed for MUI theme-aware overrides.
- Never use raw `<Typography>` from MUI. Always use `<MUITypography variant="...">`.
- Never add new Radix/shadcn primitives. MUI equivalents exist for everything.
- Never use `lucide-react` for icons. Use `@mui/icons-material`.
- Radix UI is deprecated — do not add new Radix primitives; migrate existing ones on touch.

### MUI Typography Variants

| Variant | Use For |
|---------|---------|
| `drawerTitle` | Page/drawer titles |
| `sectionTitle` | Card/section headers |
| `bodyPrimary` | Emphasized body text, labels |
| `body` | Standard body text, descriptions |
| `timestamp` | Dates, secondary info, captions |
| `finePrint` | Fine print, disclaimers |
| `alertTitle` | Alert/error titles |
| `placeholder` | Placeholder text |

### Existing MUI Components (`components/ui/`)

Search here BEFORE building anything new:

| Component | File | Use For |
|-----------|------|---------|
| `MUIInput` | `mui-input.tsx` | Text inputs, autocomplete, select mode |
| `MUISelect` | `mui-select.tsx` | Dropdowns / single-select |
| `MUIDialog` | `mui-dialog.tsx` | Modal dialogs with actions |
| `MUISwitch` | `mui-switch.tsx` | Toggle switches |
| `MUIDatePicker` | `mui-date-picker.tsx` | Date selection |
| `MUIAvatar` | `mui-avatar.tsx` | User/entity avatars |
| `MUITypography` | `mui-typography.tsx` | All text rendering |
| `MUIStatusChip` | `mui-status-chip.tsx` | Status badges |
| `MUIBreadcrumb` | `mui-breadcrumb.tsx` | Breadcrumb navigation |
| `MUIUserAssigneeSelector` | `mui-user-assignee-selector.tsx` | User assignment popover |
| `MUIFieldLabel` | `mui-shared.tsx` | Consistent field labels |

All exports are re-exported from `components/ui/index.ts` — import from `@/components/ui`.

### Project Structure

| Path | Purpose | Max Lines |
|------|---------|-----------|
| `app/` | Route wrappers only — delegate to feature components | 20 |
| `components/ui/` | Primitives — MUI wrappers, shared UI atoms | 500 |
| `components/shared/` | Composites — Alert, Stepper, EmptyState, DocumentManager | 500 |
| `components/features/[name]/` | Domain feature — components + hooks + schemas + constants | 500 per file |
| `components/layout/` | App shell — Rail, Panel, Header, MobileNav | 500 |
| `lib/api/` | API client, interceptors | 500 |
| `lib/config/` | Navigation, routes, app constants | 500 |
| `lib/hooks/` | Global hooks | 500 |
| `lib/hooks/core/` | FDAL core resource hooks | 500 |
| `lib/stores/` | Zustand stores (minimal) | 500 |
| `lib/types/` | Frontend-only types | 500 |
| `lib/utils/` | Helper functions | 500 |
| `providers/` | Context providers (Auth, Query, Layout, MUI Theme) | 500 |

### Feature Folder Convention

```
features/[name]/
├── index.ts          ← Barrel exports (REQUIRED)
├── components/       ← UI only — JSX rendering, no business logic
├── hooks/            ← Logic only — useQuery, useMutation, handlers
├── schemas/          ← Zod validation schemas
└── constants.ts      ← Static maps, labels, badge variants, filter options
```

**Strict separation**: UI renders, hooks compute. Never mix business logic into components or JSX into hooks.

### Data Fetching — FDAL Pattern

All data hooks MUST use the FDAL (Frontend Data Access Layer) system in `lib/hooks/core/`.

| Hook | Purpose |
|------|---------|
| `useResourceList` | Paginated list with filters, sort, search |
| `useResourceDetail` | Single entity with cache |
| `useResourceMutations` | CRUD + optimistic updates + toast |
| `useResourceSubList` | Child resource lists |
| `useResourceStats` | Aggregation endpoints |
| `useInfiniteResourceList` | Infinite scroll |
| `useQueryState` | Client-side filter/sort with URL sync |

Companions: `useDeleteConfirmation`, `useMutationWithToast`, `useModalForm`.

**Rules:**
- Never write raw `useQuery`/`useMutation` in feature hooks — compose from FDAL core.
- Query keys must include `organizationId` — prevents cross-org cache leaks.
- Define resources via `defineResource()` in `resource-registry.ts`.
- Import from `@/lib/hooks/core` barrel.

### Reusable Hooks

| Hook | Location | Use For |
|------|----------|---------|
| `useUrlFilters(defaults)` | `lib/hooks` | URL-synced filters for list pages |
| `useDebounce(value, ms)` | `lib/hooks` | Debounce search input (300ms default) |
| `useAuth()` | `providers/auth-provider` | Current user, org, permissions |

### State Management

| Kind | Tool |
|------|------|
| Server state | TanStack Query — always |
| Global UI state | Zustand — only when truly global (sidebar, theme) |
| Local component state | `useState` / `useReducer` |
| URL state | Query params via `useUrlFilters` |

### Forms

- Always: `react-hook-form` + Zod schema
- Zod schemas in `features/[name]/schemas/*.schema.ts`
- Use `z.nativeEnum(EnumType)` for backend enums, not `z.string()`
- Validate on the client; re-validate on the server

### Auth & Permissions

| Layer | Mechanism |
|-------|-----------|
| Server | `middleware.ts` — redirects before page loads |
| Client | `AuthGuard` — wraps protected layouts |
| Granular | `PermissionGuard` — checks role/permission |

Key hooks:
- `useAuth()` → user, org, `hasPermission()`, `hasRole()`
- `useFilteredNavigation()` → nav items filtered by access

Roles: `super_admin`, `platform_admin`, `admin`, `manager`, `sales`, `field_worker`, `viewer`.

**Rules:**
- Always check `isInitialized && isAuthenticated` before redirects.
- Use `router.replace()` for auth redirects, not `push`.
- Add roles/permissions to new nav items in `navigation.ts`.

### Routes & URLs

- Single source of truth: `lib/config/routes.ts` — use `ROUTES.*` constants.
- Navigation: `useRoutes()` hook.
- Never hardcode paths.
- Filters in query params: `/quotes?status=draft&sort=date`.
- Entities in path params: `/customers/[id]`.
- Tabs in query params: `/customers/[id]?tab=properties`.
- `replace()` for filter changes, `push()` for navigation.
- URL state must survive page refresh.

### File Conventions

- All files: kebab-case (e.g. `project-detail.tsx`)
- Hooks: `use-*.ts`
- Schemas: `*.schema.ts`
- Constants: `constants.ts`

### Imports

- Order: external → relative (`./`) → aliases (`@/`)
- Empty line between groups, no empty lines within a group
- Import from barrels: `@/components/ui`, `@/lib/hooks`, `../hooks`
- Never deep-import internal module files

### Tailwind Design Tokens

- Use `formatCurrency`, `formatDate`, `formatRelativeDate` from `lib/utils`
- Use design tokens: `text-foreground`, `bg-background`, `border-border-light`
- Font weights: `font-normal` (400), `font-medium` (500), `font-semibold` (600). Never `font-bold`.
- Border radius: `rounded-lg`. Never `rounded-xl/2xl/3xl`.
- Shadows: `shadow-sm` or `shadow-card`. Never `shadow-md/lg` in feature components.
- Padding: `p-4` standard. Avoid `p-5/p-6`.

### Frontend Edge Case Checklist

Before marking any feature complete:

- [ ] Loading state handled (skeleton or spinner)
- [ ] Error state handled (API fail, validation errors)
- [ ] Empty state handled (no data message)
- [ ] Success feedback shown (toast or inline)
- [ ] Form disabled during submit
- [ ] Auth/permission checks in place
- [ ] Mobile responsive
- [ ] Keyboard accessible
- [ ] URL state survives refresh

Unhandled items must be added as `// TODO:` comments.

### Frontend Strict Prohibitions

- Logic in page files — use feature components
- Recreating primitives — extend existing `components/ui/`
- Hardcoded colors — use Tailwind tokens
- `any` type — use `unknown` + narrowing
- Zustand for server data — use TanStack Query
- `z.string()` for enums — use `z.nativeEnum()`
- Functions in `constants.ts` — only static data; logic goes in `lib/utils/`
- Inline currency/date formatting — use `formatCurrency`, `formatDate`
- Query keys without `organizationId`

---

## Shared Libraries (`libs/**/*.ts`)

The `@oneohm-epc/shared` package contains code shared across backend, web, and mobile apps.

### Sub-path Imports

| Import Path | Contains | Example |
|-------------|----------|---------|
| `@oneohm-epc/shared/types` | Interfaces, enums, type guards | `ProjectStatus`, `UserRole`, `MilestoneStatus` |
| `@oneohm-epc/shared/utils` | Pure functions — no platform deps | `formatCurrency`, `parsePaginationParams`, `computeSolarImpact` |
| `@oneohm-epc/shared/schemas` | Zod schemas shared across apps | Validation schemas |
| `@oneohm-epc/shared/constants` | Static maps, config constants | `SOLAR_IMPACT_CONSTANTS`, label maps |

### Where Types Live

| Scope | Location |
|-------|----------|
| Shared across apps | `@oneohm-epc/shared/types` |
| Backend only | `apps/backend/src/modules/[feature]/types/` |
| Frontend only | `apps/web/lib/types/` |
| NestJS decorators | `apps/backend/src/common/decorators/` |
| Backend utils | `apps/backend/src/common/utils/` |

**Rule:** If frontend needs it → `@oneohm-epc/shared/types`. Always.

### Shared Library Rules

- **Cross-app types always go here.** If both frontend and backend need a type, it lives in `shared/types`.
- **No platform-specific code.** No React, no NestJS, no Node-only APIs. Pure TypeScript only.
- **No side effects.** Every export must be a pure function, type, or constant.
- **Barrel exports required.** Every sub-folder has an `index.ts` that re-exports everything.
- **Enums are the source of truth.** Backend, frontend, and mobile all import the same enums. Never duplicate.
- **Max 500 lines per file.** Split large type files by domain (e.g. `project.interface.ts`, `customer.interface.ts`).

### Adding to Shared

1. Add the type/util/constant to the appropriate sub-folder.
2. Export it from the sub-folder's `index.ts`.
3. Verify it has no platform-specific imports.
4. Run `npm run typecheck` to confirm all consumers compile.

---

## Database Migrations (`apps/backend/src/database/migrations/**/*.ts`)

### Migration Template

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColumnName1770300000000 implements MigrationInterface {
  name = 'AddColumnName1770300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "table_name"
      ADD COLUMN "column_name" varchar(50) DEFAULT 'value'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "table_name"
      DROP COLUMN "column_name"
    `);
  }
}
```

### Common SQL Patterns

```sql
-- Add column
ALTER TABLE "t" ADD COLUMN "c" type DEFAULT value;

-- Add index (partial for soft delete)
CREATE INDEX IF NOT EXISTS "idx_t_c" ON "t" ("c") WHERE deleted_at IS NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_t_updated_at
  BEFORE UPDATE ON "t"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Migration Rules

- DDL only — no data manipulation (INSERT/UPDATE/DELETE) in migrations.
- Always include `down()` — every migration must be reversible.
- Never modify existing migration files — create a new migration instead.
- Use `IF NOT EXISTS` for index creation — ensures idempotency.
- Use `IF EXISTS` in `down()` for drops — prevents errors on re-run.
- Hardcode no data — use seed scripts for data population.
- Use `.withDeleted()` in sequence generation queries — soft-deleted rows still occupy sequences.

---

## UX Principles (Web App)

- Prioritize **clarity over cleverness**.
- Reduce user cognitive load at every step.
- Assume users are **busy, distracted, and goal-oriented**.
- Default to **simple flows**, progressive disclosure for advanced options.
- Every screen must answer: What is this? What can I do here? What should I do next?

### Layout & Structure

- Clear visual hierarchy: Page title → Primary action → Supporting content.
- Use consistent spacing and alignment.
- Avoid dense screens; prefer scannable sections.

### Component Usage

- One primary CTA per screen.
- Disable actions instead of hiding them (with explanation).
- Forms: group related fields, inline validation (no modal errors), show examples inside inputs where useful.

### Copy & Microcopy

- Use **plain language**. Avoid system or developer terms.
- Errors should explain what went wrong AND how to fix it.
  - ❌ "Invalid request payload"
  - ✅ "This file format isn't supported. Upload a PDF or CSV."

### Accessibility

- All interactive elements must be keyboard accessible.
- Provide labels for icons.
- Maintain color contrast (WCAG AA minimum).
- Avoid relying on color alone to convey meaning.

### Style Guardrails

- Use sentence case for labels and buttons.
- Avoid emojis in professional products.
- Avoid animations that delay task completion.
- Prefer neutral, calm tone.

---

## Testing

### Test Credentials

```
Email: test.employe.1@gmail.com
Pass:  admin@123
```

### Mandatory Test Flow

1. **Auth** — Login succeeds with valid creds; fails gracefully with invalid creds.
2. **CRUD happy path** — Create → Read → Update → Delete → Refresh (data persists correctly?).
3. **Error scenarios** — empty required field, wrong format, expired token, unauthorized action, large payload.
4. **Edge cases** — empty states, min/max values, special characters, rapid double-click, refresh mid-mutation, slow network.
5. **Security** — user sees only their org's data; cross-org access blocked; role permissions enforced.
6. **UI states** — loading indicator, error message, empty state, success feedback, form disabled during submit.

### API Test Template

```bash
TOKEN=$(curl -s -X POST http://localhost:8085/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test.employe.1@gmail.com","password":"admin@123"}' \
  | jq -r '.accessToken')

curl -s http://localhost:8085/api/v1/[endpoint] \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Before Closing

- No `console.log` in code
- No debug/test code committed
- No hardcoded test data in production code
- No dev shortcuts or workarounds
