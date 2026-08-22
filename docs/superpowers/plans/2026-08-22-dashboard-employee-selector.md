# Admin Employee Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authorised manager open another employee's "My Work" dashboard, read-only, from a dropdown on the dashboard itself.

**Architecture:** One new permission code (`dashboard.employees.view`) in the web catalog and the `permissions` table. The endpoint gains an optional `userId` query parameter which is passed through a resolver — `resolveDashboardSubjectId` — that returns the caller's own id when they lack the grant. No guard, no `403`. The parameter never reaches `scope.sql.ts` raw. The web app hides the dropdown from anyone without the code and drops the one writing control while another employee is on screen.

**Tech Stack:** NestJS 11 + TypeORM + Postgres (backend), Next.js App Router + Tailwind + MUI-backed design system + TanStack Query (web), `@tejas96/shared` for types (resolved from local source — no publish).

**Spec:** `docs/superpowers/specs/2026-08-22-dashboard-employee-selector-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **NO NEW TEST FILES.** Standing owner instruction. Verify by running the app and walking the screen. Existing tests, typecheck and lint must stay green.
- **Regression gates:** `npm run typecheck`, `npm run lint`, `npm run test` — from the repo root, all green before the final commit.
- **There is no global auth guard.** `app.module.ts` registers only `ThrottlerGuard`. A controller without `@UseGuards(JwtAuthGuard)` is public. `DashboardController` already has it — do not remove it.
- **The backend listens on 8085**, not 3000.
- **`nx serve backend` does not hot-reload.** Restart it after every backend change.
- **`web:dev` cannot reach a route behind middleware** — it redirects to `/login` before Next compiles the page. Use `npm run web:build`, which prerenders every route and executes the component.
- **`noUncheckedIndexedAccess: true`** — `arr[i].prop` does not compile. Use `arr[i]?.prop` or a non-null assertion where the index is provably safe.
- **No backticks inside SQL comments** — the queries are template literals.
- **Never return a raw Postgres `date` from `dataSource.query()`.** Use `to_char(col, 'YYYY-MM-DD')`. (No new date columns are read in this plan; the rule stands for any you add.)
- **Four Tailwind names do not resolve.** Use `text-error`, `text-primary-dark`, `text-secondary`, `rounded-xl` — never `text-danger`, `text-accent-ink`, `text-link`, `rounded-r-sm`.
- **Never put `disabled` on a permission-gated control** — it swallows the click that opens the access dialog. Use `aria-disabled` plus visual muting.
- **Database access:** `docker exec -i oneohm-postgres psql -U root -d oneohm_epc -c "..."`. `psql` is not on the host PATH; the container, database and user all differ from defaults.
- **Migration commands live in `apps/backend/package.json`**, not the root. Run them from `apps/backend`.
- **A new grant needs a re-login.** Permissions are a login-time JWT snapshot. Granting the code changes nothing until the token is reissued.
- **Exact code string, used in three files:** `dashboard.employees.view`. A typo in the resolver fails closed (only admins pass), which is the safe direction, but it fails silently — copy, do not retype.

---

## File Structure

**Create (2):**

| File | Responsibility |
|---|---|
| `apps/backend/src/database/migrations/1855500000000-AddDashboardEmployeesViewPermission.ts` | Mirrors the new code into the `permissions` table |
| `apps/web/components/features/dashboard/components/employee-selector.tsx` | The dropdown, and the decision to render nothing |

**Modify (11):**

| File | Change |
|---|---|
| `apps/web/lib/rbac/catalog.ts` | 43rd code; three "42" self-references |
| `apps/backend/src/modules/iam/constants/admin-roles.ts` | `resolveDashboardSubjectId` |
| `apps/backend/src/modules/dashboard/controllers/dashboard.controller.ts` | `userId` param, resolver call, rewritten docblock |
| `apps/backend/src/modules/dashboard/services/scope.sql.ts` | Docblock only — one sentence becomes false |
| `apps/backend/src/modules/dashboard/services/dashboard.service.ts` | `DataSource` injection, `loadSubject`, `subject` in the response |
| `apps/backend/src/modules/dashboard/dto/dashboard-response.dto.ts` | `DashboardSubjectDto` |
| `libs/shared/src/types/interfaces/dashboard.interface.ts` | `DashboardSubject`, `MyWorkResponse.subject` |
| `apps/web/components/features/dashboard/hooks/dashboard-keys.ts` | Subject in the cache key |
| `apps/web/components/features/dashboard/hooks/use-my-work.ts` | Optional subject argument |
| `apps/web/components/features/employees/hooks/use-employees.ts` | Optional `profileKind` filter |
| `apps/web/components/features/dashboard/components/my-work-page.tsx` | Subject state, selector, banner, `readOnly` wiring |
| `apps/web/components/features/dashboard/components/dashboard-row.tsx` | `readOnly` prop hides the dialog action |
| `apps/web/components/features/dashboard/components/view-all-drawer.tsx` | `readOnly` pass-through |

**Deliberately NOT modified:**

- `apps/web/lib/rbac/route-map.ts` — `/` stays `ALWAYS_OPEN`. Gating the route would lock the dashboard away from the 40 people it was built for.
- `apps/web/components/features/dashboard/components/project-row.tsx` — its only action navigates, and navigation stays.
- Every provider and every CTE in `scope.sql.ts`. Swapping the subject is a change to what is bound to `$1`, nothing else.

---

## Task 1: The permission code

**Files:**
- Modify: `apps/web/lib/rbac/catalog.ts`
- Create: `apps/backend/src/database/migrations/1855500000000-AddDashboardEmployeesViewPermission.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the literal code string `'dashboard.employees.view'`, which Task 2 checks against and Task 4 passes to `can()`. The `PermissionCode` union widens from 42 to 43 members automatically — `as const satisfies` in `catalog.ts` already does that work; do not annotate `PERMISSIONS` with a type, which would widen `code` back to `string` and let every typo compile.

- [ ] **Step 1: Add the 43rd code to the catalog**

In `apps/web/lib/rbac/catalog.ts`, immediately after the closing `},` of the `service.manage` entry and before the line `] as const satisfies readonly PermissionMeta[];`:

```ts
  // ==================== Dashboard ====================
  {
    code: 'dashboard.employees.view',
    module: 'dashboard',
    name: 'View Employee Dashboards',
    description: "See another employee's My Work dashboard",
  },
```

`description` is user-facing — it is the sentence the access dialog shows someone who has been refused.

- [ ] **Step 2: Correct the three places the file states its own size**

The file counts itself three times and all three are now wrong. Change `42` to `43` at:

- `catalog.ts:5` — "of these 42 codes so the superadmin role builder has something to list"
- `catalog.ts:302` — "A union of the 42 literal codes."
- `catalog.ts:305` — "to its literal so this union is 42 strings"

- [ ] **Step 3: Verify the union actually widened**

Run: `npm run typecheck:web`
Expected: PASS. If `PERMISSIONS` had been annotated rather than `satisfies`-checked, this step would still pass while the union silently stayed `string` — that is why step 1 says not to annotate it.

- [ ] **Step 4: Write the migration**

Create `apps/backend/src/database/migrations/1855500000000-AddDashboardEmployeesViewPermission.ts`:

```ts
import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Adds `dashboard.employees.view` — the code that lets a manager open another
 * employee's "My Work" dashboard.
 *
 * The catalog was deliberately reset to 42 codes by
 * 1855000000000-ResetRbacCatalog. This is the 43rd. `apps/web/lib/rbac/catalog.ts`
 * is its mirror and the two are kept in step by hand.
 *
 * `admin` and `super_admin` are deliberately NOT granted this row. They hold no
 * rows in `role_permissions` at all and pass by bypass instead. Granting it to
 * them would begin exactly the drift the bypass exists to prevent.
 *
 * Reversible, unlike ResetRbacCatalog: `down()` deletes the row, and
 * `role_permissions` cascades from `permissions`, so any grants go with it.
 */
export class AddDashboardEmployeesViewPermission1855500000000 implements MigrationInterface {
  name = 'AddDashboardEmployeesViewPermission1855500000000';

  private readonly code = 'dashboard.employees.view';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO permissions (id, code, name, description, module, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())
       ON CONFLICT (code) DO NOTHING`,
      [
        this.code,
        'View Employee Dashboards',
        "See another employee's My Work dashboard",
        'dashboard',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM permissions WHERE code = $1`, [this.code]);
  }
}
```

`ON CONFLICT (code) DO NOTHING` is safe because `permissions.code` carries `UNIQUE CONSTRAINT permissions_code_key`. Re-running the migration is a no-op rather than an error.

- [ ] **Step 5: Confirm the table holds 42 rows before you run it**

Run:

```bash
docker exec -i oneohm-postgres psql -U root -d oneohm_epc -c "SELECT count(*) FROM permissions;"
```

Expected: `42`. If it is not 42, stop — the table and the catalog have already drifted and that is a different problem from this one.

- [ ] **Step 6: Run the migration**

Run:

```bash
cd apps/backend && npm run migration:run
```

Expected: the migration name appears in the output with no error.

- [ ] **Step 7: Confirm the row landed**

Run:

```bash
docker exec -i oneohm-postgres psql -U root -d oneohm_epc -c "SELECT code, module, name FROM permissions WHERE module = 'dashboard';"
```

Expected: exactly one row — `dashboard.employees.view | dashboard | View Employee Dashboards`.

- [ ] **Step 8: Confirm it is visible to the role builder**

Open `/admin` as `super_admin` and find the role editor. Expected: a new **Dashboard** group containing one checkbox, "View Employee Dashboards". This is the whole reason the `permissions` table exists — if the code is absent here, nobody can ever grant it.

- [ ] **Step 9: Commit**

```bash
git add apps/web/lib/rbac/catalog.ts apps/backend/src/database/migrations/1855500000000-AddDashboardEmployeesViewPermission.ts
git commit -m "feat(rbac): add dashboard.employees.view, the 43rd permission code

The catalog was deliberately reset to 42 by ResetRbacCatalog, so adding
one is a considered act. Named for what the data supports: there is no
manager or reports_to column on employee_profiles, so the grant is
org-wide and dashboard.team.view would have promised a scope that
cannot be built.

Admin roles are not granted the row. They hold zero grants and pass by
bypass."
```

---

## Task 2: Resolve the subject on the backend

**Files:**
- Modify: `apps/backend/src/modules/iam/constants/admin-roles.ts`
- Modify: `apps/backend/src/modules/dashboard/controllers/dashboard.controller.ts`
- Modify: `apps/backend/src/modules/dashboard/services/scope.sql.ts` (docblock only)

**Interfaces:**
- Consumes: the code string from Task 1; `hasAdminBypassRole(roles: string[]): boolean`, already exported from `admin-roles.ts`.
- Produces: `resolveDashboardSubjectId(roles: string[], permissions: string[], currentUserId: string, options?: { userId?: string }): string`. Nothing else consumes it — it is called once, from the controller.

- [ ] **Step 1: Add the resolver**

Append to `apps/backend/src/modules/iam/constants/admin-roles.ts`, below `resolveProjectListMemberId`:

```ts
/**
 * Whose dashboard is being read.
 *
 * Admins qualify by role; everyone else needs `dashboard.employees.view`. A
 * caller with neither gets their OWN id back and the `userId` they sent is
 * ignored — the same silent pin-to-self `resolveProjectListMemberId` applies to
 * the project list. There is deliberately no 403: the parameter is not an
 * authorization token, so an unauthorised caller is answered, not refused.
 *
 * Reading roles as well as permissions is load-bearing, not defensive. `admin`
 * and `super_admin` hold ZERO rows in `role_permissions` — they bypass rather
 * than hold grants — so `permissions.includes(...)` alone is false for every
 * admin and would lock out exactly the people this feature is for.
 *
 * The code string is duplicated from `apps/web/lib/rbac/catalog.ts` on purpose:
 * the backend does not import from the web app, and the migration is already
 * the backend's copy of the catalog.
 */
export function resolveDashboardSubjectId(
  roles: string[],
  permissions: string[],
  currentUserId: string,
  options: { userId?: string } = {},
): string {
  const canViewOthers =
    hasAdminBypassRole(roles) || permissions.includes('dashboard.employees.view');
  return canViewOthers && options.userId ? options.userId : currentUserId;
}
```

- [ ] **Step 2: Take the parameter in the controller**

Replace the imports at the top of `apps/backend/src/modules/dashboard/controllers/dashboard.controller.ts`:

```ts
import { Controller, Get, HttpStatus, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { resolveDashboardSubjectId } from '../../iam/constants/admin-roles';
import { MyWorkResponseDto } from '../dto/dashboard-response.dto';
import { DashboardService } from '../services/dashboard.service';
```

Then replace the whole `getMyWork` method and the docblock above it:

```ts
  /**
   * The subject is the token holder, UNLESS the caller both sent a `userId` and
   * holds `dashboard.employees.view` — or an admin role, which bypasses.
   *
   * `resolveDashboardSubjectId` makes that decision and it does not throw. A
   * caller without the grant gets their own dashboard back and the parameter is
   * ignored, exactly as `resolveProjectListMemberId` treats `memberId` on the
   * project list. Backend RBAC still does not exist; this is subject
   * resolution, not a guard, and `scope.sql.ts` never sees the raw parameter.
   */
  @Get('my-work')
  @ApiOperation({ summary: "Everything needing an employee's attention" })
  @ApiQuery({
    name: 'userId',
    required: false,
    description:
      'Whose dashboard to read. A USER id, not an employee_profiles id. Ignored unless the caller holds dashboard.employees.view or an admin role.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: MyWorkResponseDto })
  async getMyWork(
    @CurrentUser() currentUser: CurrentUserType,
    @Query('userId', new ParseUUIDPipe({ optional: true })) userId?: string,
  ): Promise<MyWorkResponseDto> {
    const subjectId = resolveDashboardSubjectId(
      currentUser.roles || [],
      currentUser.permissions || [],
      currentUser.id,
      { userId },
    );

    return this.dashboardService.getMyWork(subjectId);
  }
```

`ParseUUIDPipe` is not the security boundary — the resolver is. It exists so a typo returns `400` instead of an empty dashboard that looks like a real answer. `@CurrentUser()` moves above the `@Query` because a parameter with a default must come last.

- [ ] **Step 3: Replace the docblock sentence that is now false**

In `apps/backend/src/modules/dashboard/services/scope.sql.ts`, find:

```
 * `$1` is ALWAYS the subject user id, taken from the JWT. It is never a
 * parameter the caller can influence.
```

Replace with:

```
 * `$1` is ALWAYS the subject user id. It is the token holder unless the caller
 * both sent a `userId` AND passed `resolveDashboardSubjectId`
 * (`iam/constants/admin-roles.ts`), which requires `dashboard.employees.view`
 * or an admin role. It is never taken from the request raw.
```

Leaving the old sentence would be worse than having no comment at all: it tells the next reader that ownership is unreachable from outside when it is not.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck:backend`
Expected: PASS.

- [ ] **Step 5: Restart the backend and get two user ids**

Restart: `npm run backend:dev` (it does not hot-reload).

Run:

```bash
docker exec -i oneohm-postgres psql -U root -d oneohm_epc -c "SELECT u.id, u.first_name, u.last_name FROM users u JOIN employee_profiles e ON e.user_id = u.id WHERE e.profile_kind = 'staff' AND e.deleted_at IS NULL LIMIT 5;"
```

Keep two ids: one you will sign in as, one you will ask about.

- [ ] **Step 6: Prove the resolver honours the parameter for an admin**

Sign in as `super_admin`, take the bearer token, and run both:

```bash
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8085/api/v1/dashboard/my-work" | head -c 400
```

```bash
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8085/api/v1/dashboard/my-work?userId=<OTHER_USER_ID>" | head -c 400
```

Expected: the two `summary` blocks differ. If they are identical, either the parameter is not reaching the resolver or the two users genuinely have identical work — pick a different second user before concluding it works.

- [ ] **Step 7: Prove the resolver IGNORES the parameter for everyone else**

Sign in as a user holding no admin role and no grant. Run the same second command with their token.

Expected: **their own** data comes back — byte-identical to their no-parameter response. No `403`, no error. This is the security check for the whole feature.

- [ ] **Step 8: Prove a junk parameter is rejected**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" "http://localhost:8085/api/v1/dashboard/my-work?userId=not-a-uuid"
```

Expected: `400`.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/modules/iam/constants/admin-roles.ts apps/backend/src/modules/dashboard/controllers/dashboard.controller.ts apps/backend/src/modules/dashboard/services/scope.sql.ts
git commit -m "feat(dashboard): resolve the my-work subject from an optional userId

Copies resolveProjectListMemberId rather than inventing a guard: a
caller without dashboard.employees.view gets their own dashboard back
and the parameter is ignored. No 403, no PermissionGuard.

The check reads roles AND permissions. admin and super_admin hold zero
rows in role_permissions, so a permissions-only check would refuse
every admin.

scope.sql.ts said \$1 was 'never a parameter the caller can influence'.
That is no longer true, so the sentence is replaced rather than left to
mislead the next reader."
```

---

## Task 3: The response names its subject

**Files:**
- Modify: `libs/shared/src/types/interfaces/dashboard.interface.ts`
- Modify: `apps/backend/src/modules/dashboard/dto/dashboard-response.dto.ts`
- Modify: `apps/backend/src/modules/dashboard/services/dashboard.service.ts`

**Interfaces:**
- Consumes: `resolveDashboardSubjectId` from Task 2 (indirectly — the service receives the already-resolved id).
- Produces: `DashboardSubject { userId: string; name: string }` and `MyWorkResponse.subject: DashboardSubject`. Task 4 reads `data.subject.name`; Task 5 does not touch it.

- [ ] **Step 1: Add the shared type**

In `libs/shared/src/types/interfaces/dashboard.interface.ts`, add above `MyWorkResponse`:

```ts
/**
 * Whose work the response describes.
 *
 * Echoed back because the page must state the subject from data the SERVER
 * resolved, not from the picker's local state — those disagree during a
 * refetch, and the moment they do the page is lying about whose queue is on
 * screen.
 */
export interface DashboardSubject {
  userId: string;
  name: string;
}
```

Then add the field to `MyWorkResponse`, directly after `generatedAt`:

```ts
export interface MyWorkResponse {
  generatedAt: string;
  subject: DashboardSubject;
  summary: DashboardSummary;
  sections: {
    workflow: DashboardSection;
    followups: DashboardSection;
    service: DashboardSection;
    projects: DashboardSection;
    finance: DashboardSection;
  };
}
```

Web and backend both resolve `@tejas96/shared` from local source, so **no package publish is required**.

- [ ] **Step 2: Add the DTO**

In `apps/backend/src/modules/dashboard/dto/dashboard-response.dto.ts`, extend the type import and add the class above `MyWorkResponseDto`:

```ts
import type {
  DashboardSection,
  DashboardSubject,
  DashboardSummary,
  MyWorkResponse,
} from '@tejas96/shared/types';
```

```ts
class DashboardSubjectDto implements DashboardSubject {
  @ApiProperty({ example: '9f1c2e7a-4b3d-4a11-9c8e-0d5f6a7b8c9d' })
  userId!: string;

  @ApiProperty({ example: 'Priya Sharma' })
  name!: string;
}
```

Then add the property to `MyWorkResponseDto`, after `generatedAt`:

```ts
  @ApiProperty({
    type: DashboardSubjectDto,
    description:
      'Whose work this is. Echoes the RESOLVED subject, which is not always the requested one.',
  })
  subject!: DashboardSubjectDto;
```

- [ ] **Step 3: Give the service a DataSource and load the subject**

In `apps/backend/src/modules/dashboard/services/dashboard.service.ts`, extend the imports:

```ts
import { Injectable, Logger } from '@nestjs/common';
import type {
  DashboardSection,
  DashboardSubject,
  DashboardSummary,
  MyWorkResponse,
} from '@tejas96/shared/types';
import { DataSource } from 'typeorm';
```

Add `DataSource` as the first constructor parameter. It is injected exactly as the providers do it — `FollowupsProvider` takes `private readonly dataSource: DataSource` with no `TypeOrmModule.forFeature`, and this module deliberately has none:

```ts
  constructor(
    private readonly dataSource: DataSource,
    workflow: WorkflowProvider,
    followups: FollowupsProvider,
    service: ServiceProvider,
    projects: ProjectsProvider,
    finance: FinanceProvider,
  ) {
    this.providers = [workflow, followups, service, projects, finance];
  }
```

- [ ] **Step 4: Load the subject alongside the providers**

Replace the first line of `getMyWork` and the `return` block:

```ts
  async getMyWork(userId: string): Promise<MyWorkResponse> {
    // The name lookup runs WITH the providers, not before them. It is one
    // indexed primary-key read; making the five aggregates wait behind it would
    // add a round trip to the first screen after login for no benefit.
    const [subject, settled] = await Promise.all([
      this.loadSubject(userId),
      Promise.allSettled(this.providers.map((p) => p.load(userId))),
    ]);
```

The body between that and the `return` is unchanged. The `return` becomes:

```ts
    return {
      generatedAt: new Date().toISOString(),
      subject,
      summary: this.summarise(ok),
      sections,
    };
```

- [ ] **Step 5: Write the lookup**

Add as a private method on the service:

```ts
  /**
   * Whose dashboard this is, echoed back so the page can name the subject from
   * data the server resolved.
   *
   * The name lives on `users`. It is NOT on `employee_profiles` — that table
   * carries no name columns at all, so the obvious-sounding source does not
   * exist. `last_name` is nullable, hence the coalesce: without it a
   * single-named employee renders as "Priya null".
   *
   * A missing row is not an error. The id came from `resolveDashboardSubjectId`,
   * which either returned the token holder or a caller-supplied uuid that
   * matches no live user; the second case should show an empty dashboard with
   * an honest label, not a 500.
   */
  private async loadSubject(userId: string): Promise<DashboardSubject> {
    const rows: Array<{ name: string }> = await this.dataSource.query(
      `SELECT trim(u.first_name || ' ' || coalesce(u.last_name, '')) AS name
       FROM users u
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [userId],
    );

    return { userId, name: rows[0]?.name || 'Unknown employee' };
  }
```

`rows[0]?.name` rather than `rows[0].name` — `noUncheckedIndexedAccess` is on and the latter does not compile.

- [ ] **Step 6: Typecheck all three projects**

Run: `npm run typecheck`
Expected: PASS. The shared library, the backend and the web app all consume `MyWorkResponse`; a missed field surfaces here.

- [ ] **Step 7: Restart the backend and read the subject back**

Restart `npm run backend:dev`, then:

```bash
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8085/api/v1/dashboard/my-work" | python3 -c "import sys,json; print(json.load(sys.stdin)['subject'])"
```

Expected: your own `userId` and your own full name, correctly spaced — no trailing space, no "null".

- [ ] **Step 8: Read it back for someone else**

```bash
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8085/api/v1/dashboard/my-work?userId=<OTHER_USER_ID>" | python3 -c "import sys,json; print(json.load(sys.stdin)['subject'])"
```

Expected (as an admin): the other employee's id and name.

- [ ] **Step 9: Commit**

```bash
git add libs/shared/src/types/interfaces/dashboard.interface.ts apps/backend/src/modules/dashboard/dto/dashboard-response.dto.ts apps/backend/src/modules/dashboard/services/dashboard.service.ts
git commit -m "feat(dashboard): echo the resolved subject in the my-work response

The page must say whose work it shows from data the server resolved,
not from the picker's local state — those disagree during a refetch.

The name comes from users, not employee_profiles: that table has no
name columns at all. last_name is nullable and is coalesced away."
```

---

## Task 4: The selector

**Files:**
- Modify: `apps/web/components/features/dashboard/hooks/dashboard-keys.ts`
- Modify: `apps/web/components/features/dashboard/hooks/use-my-work.ts`
- Modify: `apps/web/components/features/employees/hooks/use-employees.ts`
- Create: `apps/web/components/features/dashboard/components/employee-selector.tsx`
- Modify: `apps/web/components/features/dashboard/components/my-work-page.tsx`

**Interfaces:**
- Consumes: `MyWorkResponse.subject` (Task 3); `'dashboard.employees.view'` (Task 1); `useEmployees` returning `Employee[]` where `Employee` has `userId: string` and `user?: { firstName: string; lastName?: string }`.
- Produces: `useMyWork(subjectUserId?: string)`; `dashboardKeys.myWork(subjectUserId?: string)`; `EmployeeSelector` with props `{ value: string | undefined; onChange: (userId: string | undefined) => void; selfUserId: string }`. Task 5 consumes the `viewingOther` boolean this task introduces in `my-work-page.tsx`.

- [ ] **Step 1: Put the subject in the cache key**

Replace the whole of `apps/web/components/features/dashboard/hooks/dashboard-keys.ts`:

```ts
/**
 * One root so completing a follow-up on the dashboard can invalidate the whole
 * screen in a single call. A card whose count survived the action it just
 * performed is the fastest way to make people stop trusting the page.
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  /**
   * The subject is part of the key, and that is load-bearing. Without it,
   * React Query serves the previously selected employee's cached dashboard
   * under the next employee's name — a leak that looks exactly like a working
   * feature, because the page renders and the numbers are real. They are just
   * the wrong person's.
   *
   * `undefined` collapses to 'me' rather than being left out, so the key shape
   * is constant and the common case stays a single stable entry.
   */
  myWork: (subjectUserId?: string) =>
    [...dashboardKeys.all, 'my-work', subjectUserId ?? 'me'] as const,
};
```

- [ ] **Step 2: Pass the subject from the hook**

In `apps/web/components/features/dashboard/hooks/use-my-work.ts`, replace the function (leave the file's existing docblock above it in place):

```ts
export function useMyWork(subjectUserId?: string): UseQueryResult<MyWorkResponse, AxiosError> {
  return useQuery({
    queryKey: dashboardKeys.myWork(subjectUserId),
    queryFn: async () => {
      const { data } = await apiClient.get<MyWorkResponse>('/dashboard/my-work', {
        params: subjectUserId ? { userId: subjectUserId } : undefined,
      });
      return data;
    },
  });
}
```

- [ ] **Step 3: Let `useEmployees` filter to staff**

In `apps/web/components/features/employees/hooks/use-employees.ts`, extend the import and the options interface:

```ts
import { EmployeeProfileKind, UserStatus } from '@tejas96/shared/types';
```

```ts
export interface UseEmployeesOptions {
  status?: UserStatus;
  limit?: number;
  enabled?: boolean;
  /**
   * Narrow to staff or to resellers. Omitting it returns both, which is the
   * existing behaviour every current caller relies on.
   */
  profileKind?: EmployeeProfileKind;
}
```

Then the hook body:

```ts
  const { status = UserStatus.ACTIVE, limit = 200, enabled = true, profileKind } = options;

  return useQuery({
    queryKey: employeeKeys.list({ status, limit, profileKind }),
    queryFn: async (): Promise<Employee[]> => {
      const params = new URLSearchParams();
      params.append('status', status);
      params.append('limit', String(limit));
      if (profileKind) params.append('profileKind', profileKind);

      const { data } = await apiClient.get<EmployeeListResponse>(`/employees?${params.toString()}`);
      return data.items;
    },
    enabled: enabled,
    // Employees don't change often — cache for 5 minutes
    staleTime: 5 * 60 * 1000,
  });
```

Adding `profileKind` to the query key does **not** bust the existing caller's cache: React Query hashes the filter object with `JSON.stringify`, which drops `undefined` values, so `{ status, limit, profileKind: undefined }` hashes identically to today's `{ status, limit }`.

- [ ] **Step 4: Verify the existing caller still works**

`MUIUserAssigneeSelector` is the current consumer of `useEmployees`. Open any screen that assigns a user — a follow-up or a task — and confirm the assignee list still populates.
Expected: unchanged behaviour. This is the only regression risk in Task 4.

- [ ] **Step 5: Write the selector**

Create `apps/web/components/features/dashboard/components/employee-selector.tsx`:

```tsx
'use client';

import { EmployeeProfileKind } from '@tejas96/shared/types';
import * as React from 'react';

import { useEmployees } from '@/components/features/employees/hooks/use-employees';
import { MUISelect, type MUISelectOption } from '@/components/ui';
import { useCan } from '@/lib/rbac';

/** The sentinel for "my own work". A real uuid can never collide with it. */
const MINE = '__mine__';

interface EmployeeSelectorProps {
  /** The selected subject, or `undefined` for your own work. */
  value: string | undefined;
  onChange: (userId: string | undefined) => void;
  /** The signed-in user, so they can be dropped from the list of others. */
  selfUserId: string;
}

/**
 * Pick whose "My Work" dashboard to read.
 *
 * HIDDEN when the gate is closed, not shown-and-blocked. `can.tsx` says
 * clickable controls stay visible and explain themselves, because a user who
 * cannot see a button cannot know to ask for it — and that rule is right for
 * the data-changing controls it was written for. This is a view switch that
 * reads across the whole organisation. Showing it to all 40 staff would
 * advertise an org-wide read to people who will never hold it. Decision 5 of
 * the design spec records this as the deliberate exception.
 */
export function EmployeeSelector({
  value,
  onChange,
  selfUserId,
}: EmployeeSelectorProps): React.JSX.Element | null {
  const { can } = useCan();
  const allowed = can('dashboard.employees.view');

  // `enabled` keeps the request from firing at all for the ~everyone case.
  const { data: employees } = useEmployees({
    profileKind: EmployeeProfileKind.STAFF,
    enabled: allowed,
  });

  const options: MUISelectOption[] = React.useMemo(() => {
    // Annotated: `MUISelectOption.label` is `React.ReactNode`, and leaving the
    // type to contextual inference risks `localeCompare` landing on a ReactNode.
    const others: Array<{ value: string; label: string }> = (employees ?? [])
      .filter((employee) => employee.userId !== selfUserId)
      .map((employee) => ({
        value: employee.userId,
        label:
          [employee.user?.firstName, employee.user?.lastName].filter(Boolean).join(' ') ||
          'Unnamed employee',
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: MINE, label: 'My work' }, ...others];
  }, [employees, selfUserId]);

  // After the hooks, never before them — an early return above `useMemo` would
  // change the hook count between renders.
  if (!allowed) return null;

  return (
    <MUISelect
      options={options}
      value={value ?? MINE}
      onChange={(event) => {
        const next = String(event.target.value);
        onChange(next === MINE ? undefined : next);
      }}
      size="small"
      aria-label="Whose work to show"
      sx={{ minWidth: 220 }}
    />
  );
}
```

- [ ] **Step 6: Hold the subject in the page**

In `apps/web/components/features/dashboard/components/my-work-page.tsx`, add the import:

```tsx
import { EmployeeSelector } from './employee-selector';
```

Replace the `useMyWork()` call and add the state directly above it:

```tsx
  const [subjectUserId, setSubjectUserId] = React.useState<string | undefined>(undefined);
  const { data, isPending, isError, refetch } = useMyWork(subjectUserId);
```

Then, immediately below the existing `const name = user?.firstName ?? '';` line:

```tsx
  const viewingOther = Boolean(subjectUserId);
```

- [ ] **Step 7: Put the selector and the banner in the greeting card**

Replace the greeting `<section>` — block 1, the one commented `{/* 1. Greeting */}` — with:

```tsx
        {/* 1. Greeting */}
        <section className="relative overflow-hidden rounded-xl bg-surface p-6 shadow-e2">
          <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-end justify-between gap-3">
            <div className="flex items-end gap-3">
              {/* Someone else's queue is not your morning, so the greeting gives
                  way to their name rather than sitting above their work. */}
              <Typography variant="h2">
                {viewingOther
                  ? data.subject.name
                  : `${mounted ? greeting(new Date().getHours()) : 'Welcome'}${name ? `, ${name}` : ''}`}
              </Typography>
              {/* Today's date anchors every relative date further down the page —
                  "due 26 Aug", "Mon 24 Aug". Static text, never a control. */}
              {mounted ? (
                <span className="pb-1 text-xs text-foreground-tertiary">
                  {new Date().toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </span>
              ) : null}
            </div>
            <EmployeeSelector
              value={subjectUserId}
              onChange={setSubjectUserId}
              selfUserId={user?.id ?? ''}
            />
          </div>
          <p className="relative mt-2 text-sm text-foreground-secondary">
            <span className="font-medium text-error">{summary.overdue} overdue</span>
            {` · ${summary.dueToday} due today · ${summary.dueThisWeek} more this week`}
          </p>
          {viewingOther ? (
            <p className="relative mt-2 text-sm text-foreground-secondary">
              {`You are viewing ${data.subject.name}'s work. Read only. `}
              <button
                type="button"
                onClick={() => setSubjectUserId(undefined)}
                className="text-secondary underline"
              >
                Back to my work
              </button>
            </p>
          ) : null}
        </section>
```

The name comes from `data.subject.name`, never from the dropdown's own option label — that is what Task 3 exists for.

- [ ] **Step 8: Typecheck and lint the web app**

Run: `npm run typecheck:web && npm run web:lint`
Expected: PASS.

- [ ] **Step 9: Build and walk it**

Run: `npm run web:build`, then open the dashboard.

- Signed in as `super_admin`: the dropdown is present and lists staff, without you in it.
- Pick someone: the heading becomes their name, the banner appears, and the counts change.
- **Switch A → B → A.** The counts and the heading must change on every switch. If the third view is instantly identical to the first with no refetch, the cache key is wrong — go back to step 1.
- Press **Back to my work**: your greeting and your own counts return.

- [ ] **Step 10: Confirm it is hidden without the grant**

Sign in as a user with no admin role and no grant.
Expected: no dropdown anywhere on the page, and no `/employees` request in the network tab — `enabled: allowed` should have suppressed it.

- [ ] **Step 11: Commit**

```bash
git add apps/web/components/features/dashboard apps/web/components/features/employees/hooks/use-employees.ts
git commit -m "feat(dashboard): the admin employee selector

Hidden rather than shown-and-blocked. can.tsx's rule that clickable
controls stay visible serves data-changing controls; this is a view
switch that reads org-wide, and advertising it to 40 staff invites the
wrong conversation. Decision 5.

The subject is part of the React Query key. Without it the cache serves
the previous employee's dashboard under the next employee's name.

useEmployees gains an optional profileKind. Passing undefined hashes
identically to today's key, so the existing assignee selector keeps its
cache."
```

---

## Task 5: Read-only while viewing another employee

**Files:**
- Modify: `apps/web/components/features/dashboard/components/dashboard-row.tsx`
- Modify: `apps/web/components/features/dashboard/components/view-all-drawer.tsx`
- Modify: `apps/web/components/features/dashboard/components/my-work-page.tsx`

**Interfaces:**
- Consumes: `viewingOther: boolean` from Task 4's `my-work-page.tsx`.
- Produces: `DashboardRowProps.readOnly?: boolean` and `ViewAllDrawerProps.readOnly?: boolean`. Nothing later consumes these.

**What "read-only" means here, exactly:** hide the **dialog-mode** action, which is `complete_followup` — the only control on this page that writes. **Navigate-mode** actions stay. They are deep links, they are already permission-gated, and a viewer who lacks `quotes.view` gets the same access dialog they would get on their own dashboard. `project-row.tsx` therefore needs no change: its only action navigates.

- [ ] **Step 1: Add the prop to the row**

In `apps/web/components/features/dashboard/components/dashboard-row.tsx`, extend the props interface:

```tsx
interface DashboardRowProps {
  item: DashboardItem;
  onCompleteFollowup: (item: DashboardItem) => void;
  /**
   * True while ANOTHER employee's dashboard is on screen.
   *
   * Hides the follow-up complete control — the only action here that writes.
   * Completing their follow-up would record YOU as the completer on a queue you
   * are only inspecting. Deep links are untouched: they navigate rather than
   * write, and they carry their own permission gate. Decision 4.
   */
  readOnly?: boolean;
}
```

And the signature:

```tsx
export function DashboardRow({
  item,
  onCompleteFollowup,
  readOnly = false,
}: DashboardRowProps): React.JSX.Element {
```

- [ ] **Step 2: Hide only the dialog action**

The action cell currently reads `{target.mode === 'navigate' && allowed ? (<Link .../>) : (<button .../>)}`. Wrap it so the dialog case disappears in read-only mode. Replace the opening of that ternary with:

```tsx
      {readOnly && target.mode === 'dialog' ? null : target.mode === 'navigate' && allowed ? (
```

Leave the `<Link>` and `<button>` branches exactly as they are.

`useGatedAction` stays above, called unconditionally — hooks must not become conditional. The grid is `grid-cols-[...auto_auto]`; dropping the last child leaves the fourth column at zero width, which is what you want.

- [ ] **Step 3: Pass it through the drawer**

In `apps/web/components/features/dashboard/components/view-all-drawer.tsx`, add to the props interface:

```tsx
  /** Forwarded to every row — see `DashboardRow`. */
  readOnly?: boolean;
```

Add `readOnly = false` to the destructured parameters, and forward it in `renderItem`:

```tsx
        return (
          <DashboardRow
            key={item.id}
            item={item}
            onCompleteFollowup={onCompleteFollowup}
            readOnly={readOnly}
          />
        );
```

The drawer draws the same row as the card, so without this the write control survives one click away from a screen that hides it.

- [ ] **Step 4: Wire both from the page**

In `my-work-page.tsx`, pass `readOnly` in `renderRows`:

```tsx
  const renderRows = (items: DashboardItem[]): React.ReactNode =>
    items.map((item) => (
      <DashboardRow
        key={item.id}
        item={item}
        onCompleteFollowup={setFollowupItem}
        readOnly={viewingOther}
      />
    ));
```

And on the `<ViewAllDrawer ... />` element near the bottom of the file, add:

```tsx
        readOnly={viewingOther}
```

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck:web && npm run web:lint`
Expected: PASS.

- [ ] **Step 6: Walk it**

Run `npm run web:build`, then:

- On **your own** dashboard, find a follow-up row. The **Complete** control is present. Click it — the dialog opens. Close it.
- Select another employee. The same kind of row now shows **no Complete control**.
- An **Open** / **View** deep link on the same row is still there and still navigates.
- Open a **View all** drawer while viewing that employee. No Complete control there either.
- Return to **My work**. The Complete control is back.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/features/dashboard/components
git commit -m "feat(dashboard): read-only rows while viewing another employee

Hides the follow-up complete control — the only action on this page
that writes. Completing their follow-up would record you as the
completer on a queue you are only inspecting.

Deep links stay: they navigate rather than write and carry their own
permission gate. project-row.tsx needs no change for the same reason.

The drawer draws the same row, so it takes the flag too — otherwise the
control survives one click away from the screen that hides it."
```

---

## Task 6: Full walk and regression gates

**Files:** none modified unless a check fails.

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: nothing. This task is the gate.

- [ ] **Step 1: Grant the code to a real, non-admin role**

Open `/admin` as `super_admin`, edit the `project_manager` role, tick **View Employee Dashboards**, save.

Confirm it landed:

```bash
docker exec -i oneohm-postgres psql -U root -d oneohm_epc -c "SELECT r.code AS role, p.code AS permission FROM role_permissions rp JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id WHERE p.code = 'dashboard.employees.view';"
```

Expected: one row, `project_manager | dashboard.employees.view`.

- [ ] **Step 2: Prove the grant needs a re-login**

Sign in as a `project_manager` user who was **already** signed in before step 1, without signing out.
Expected: **no dropdown.** Their JWT predates the grant. This is not a bug — it is Global Constraint "a new grant needs a re-login", and confirming it here stops it being reported as one later.

- [ ] **Step 3: Prove the grant works after a re-login**

Sign that user out and back in.
Expected: the dropdown appears. A non-admin, permission-only path now works — which is the whole point of Task 1.

- [ ] **Step 4: Run the eight spec checks**

Walk §7 of the spec end to end. Every row must pass:

| # | State | Must |
|---|---|---|
| 1 | `super_admin` (0 grants) | Dropdown appears — the role bypass, which a permissions-only check would fail |
| 2 | A role holding no grant | No dropdown anywhere |
| 3 | `project_manager` after re-login | Dropdown appears |
| 4 | `curl` as a non-holder with `?userId=<other>` | Your **own** data. No 403, no leak |
| 5 | Select an employee | The follow-up Complete control is gone; deep links still navigate |
| 6 | A → B → A | Counts and `subject.name` change every time |
| 7 | `?userId=` set to a non-UUID | `400` |
| 8 | Clear the selection | Own dashboard returns, Complete control returns |

- [ ] **Step 5: Confirm nothing else regressed**

The dashboard's own behaviour must be unchanged when no subject is selected:

- Complete a follow-up inline on your own dashboard. The row disappears and the count drops without a reload.
- One section still renders `Retry` on failure while the others draw.
- The assignee selector on a follow-up or task still populates (the `useEmployees` change).

- [ ] **Step 6: Run the regression gates**

Run each, from the repo root:

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm run test
```

Expected: all three PASS. The test suite stood at 434 passing across 44 suites before this work and no test files were added, so the count should be unchanged.

- [ ] **Step 7: Report honestly**

Write down any check that did not pass and why, rather than reporting completion. A check that could not be run — no account with the right data, no grantable role available — is **not** a pass; say which one and what was missing.

- [ ] **Step 8: Commit anything the walk fixed**

If steps 1–6 produced no changes, there is nothing to commit and the feature is done.

---

## Notes for the executor

- **PR #297 is open and unreviewed.** This work builds on that endpoint's subject resolution, which is the part a reviewer is most likely to question. If review reshapes it, Tasks 2 and 3 rebase onto shifted ground. Check the PR's state before starting.
- **Do not add `admin.*` codes.** `/admin` stays role-gated; `route-map.ts:15-17` records why.
- **Do not add a route gate for `/`.** The dashboard stays `ALWAYS_OPEN`.
- **Do not grant the new code to `admin` or `super_admin`.** They hold zero grants by design and pass by bypass.
