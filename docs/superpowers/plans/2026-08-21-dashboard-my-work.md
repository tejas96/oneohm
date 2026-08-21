# "My Work" Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder dashboard with a single-page operational screen that tells the logged-in employee what needs them now, why, and where to click.

**Architecture:** One new NestJS module (`dashboard`) exposes one endpoint. It resolves the subject employee from the JWT — never from a parameter — and runs five independent providers under `Promise.allSettled`, each of which owns one CTE so its count and its list can never disagree. The Next.js page renders eight blocks in two columns from that single response, lifting critical items into a top block and mapping each item's `action` code onto the existing `ROUTES` table.

**Tech Stack:** NestJS 11 + TypeORM (raw SQL via `DataSource.query` for aggregates), Postgres, Next.js App Router, TanStack Query v5, Tailwind + the OneOhm design system.

**Spec:** `docs/superpowers/specs/2026-08-21-dashboard-my-work-design.md`

**Design reference:** Claude Design project *Solar EPC workload app*, artboard `My Work.dc.html`.

---

## Global Constraints

Every task's requirements implicitly include this section.

1. **DO NOT WRITE NEW UNIT TEST FILES.** Standing instruction from the owner, 2026-08-17. Verification is by running the app and looking at the screen. Do not create `__tests__/`, `*.spec.ts` or `*.test.tsx` for anything in this plan. Existing tests stay and must keep passing.
2. **Every task ends with a screen check**, in this order: build → run → look → say what you saw → commit. A green build is not a pass. A correct database row that nothing renders is not a pass.
3. **Regression gates, run before every commit:**
   ```bash
   npm run typecheck && npm run lint
   ```
   And before the final task: `npm run test`. All must be green.
4. **There is no global auth guard in this backend.** `app.module.ts:113` registers only `ThrottlerGuard`. Every controller must carry `@UseGuards(JwtAuthGuard)` explicitly or it is public.
5. **The global route prefix is `api/v1`** (`main.ts`). The endpoint's full path is `/api/v1/dashboard/my-work`.
6. **There is no response envelope and no global exception filter.** A controller's return value *is* the JSON body. Errors are Nest's default `{ statusCode, message, error }`.
7. **`ValidationPipe` runs with `whitelist: true, forbidNonWhitelisted: true`.** Any query parameter not declared on a DTO is a 400.
8. **`CurrentUserType` is exactly `{ id: string; roles: string[]; permissions: string[] }`.** There is no `employeeId` and no `organizationId`. Service tickets are assigned to an `employee_profiles.id`, so scoping them needs a join through `employee_profiles.user_id`.
9. **Scope comes from the token only.** The endpoint accepts no identity parameter. Never read a user id from the query string.
10. **Scope before aggregation.** Every provider defines its scoped set once in a CTE, then counts and lists from that same CTE. Never count globally and filter afterwards.
11. **No hard-coded hex in components.** Use the design-system Tailwind tokens (`bg-surface`, `text-foreground-secondary`, `text-danger`, …). The one exception already in the codebase is chart colours, which we do not use here.
12. **Never put `disabled` on a permission-gated control.** `use-gated-action.ts:21-27` explains why: a disabled button swallows the click, so the access dialog never opens. Use `aria-disabled` plus visual muting.
13. **Do not widen the existing `AttentionKind` union** in `libs/shared/src/types/interfaces/project.interface.ts`. `oneohm-mobile` keeps its own copy with an exhaustive label map and would render blanks for a new kind.
14. **Database access.** The local Postgres is a production clone running as the container
    `oneohm-postgres`. `psql` is NOT on the host PATH. The only working invocation is:
    ```bash
    docker exec -i oneohm-postgres psql -U root -d oneohm_epc -c "SELECT 1;"
    ```
    The database is `oneohm_epc` and the user is `root` — both differ from the defaults.
    Real user ids for scope testing: `2af0dc8a-cf57-4a5c-a552-792b06488ef7`,
    `652ec31f-1896-4d7d-894a-4372c6504ae5`, `e8106020-78bf-43a3-83ca-576f01ef36e6`.
15. **`noUncheckedIndexedAccess: true`** is set in `tsconfig.base.json:21`. Indexing an array
    yields `T | undefined`, so `arr[i].prop` does not compile. Use `arr[i]!.prop` where the
    index is provably in range, or narrow it. Several code blocks in this plan index arrays
    and will need that.
16. **The backend listens on port 8085**, not 3000 — `BACKEND_PORT=8085` in `apps/backend/.env`.
    Every curl in this plan uses `http://localhost:8085/api/v1/...`.
17. **Backend RBAC does not exist and this plan does not add it.** Permission gating is frontend-only, by design (`iam.service.ts:20-22`). The endpoint's safety comes from constraint 9, not from a guard.

---

## File Structure

### Backend — all new, under `apps/backend/src/modules/dashboard/`

| File | Responsibility |
|---|---|
| `dashboard.module.ts` | Wiring. Registers the controller, the service and the five providers. |
| `controllers/dashboard.controller.ts` | One `GET`. Applies `JwtAuthGuard`, reads `@CurrentUser()`, returns the service's result unchanged. |
| `services/dashboard.service.ts` | Runs the five providers under `allSettled`, shapes each into `ok` or `error`, computes `summary`. Owns no SQL. |
| `services/scope.sql.ts` | The single definition of "mine". Exported SQL fragments every provider composes. Nothing else in the codebase may redefine this. |
| `providers/workflow.provider.ts` | The nine Lead → Project stall kinds. |
| `providers/followups.provider.ts` | Three buckets by `scheduled_at`. |
| `providers/service.provider.ts` | Four buckets, including the `employee_profiles` join. |
| `providers/projects.provider.ts` | Per-project health plus the milestone rollup. |
| `providers/finance.provider.ts` | `v_milestone_balance` only. |
| `dto/dashboard-response.dto.ts` | Swagger-annotated response classes. |

### Shared

| File | Responsibility |
|---|---|
| `libs/shared/src/types/interfaces/dashboard.interface.ts` | `DashboardItem`, `DashboardSection`, `DashboardItemKind`, `DashboardAction`, `MyWorkResponse`. New names — the existing `AttentionKind` is untouched. |

### Web — under `apps/web/components/features/dashboard/`

| File | Responsibility |
|---|---|
| `hooks/dashboard-keys.ts` | Query-key factory, following the `followupKeys` convention. |
| `hooks/use-my-work.ts` | The one fetch. |
| `lib/action-routes.ts` | Maps an item's `action` + `params` onto `ROUTES`. The only place a dashboard URL is constructed. |
| `components/dashboard-row.tsx` | One row. Used by every block and by the drawer, unchanged. |
| `components/section-card.tsx` | Card shell: label, count, aside, rows, overflow link, and the three states. |
| `components/blocks/*.tsx` | One file per block — greeting, needs-attention, workflow, follow-ups, service, projects, at-a-glance, money. |
| `components/my-work-page.tsx` | The two-column composition and the critical lift. |
| `components/view-all-drawer.tsx` | Wraps `DrillDownDrawer` with our row renderer. |
| `index.ts` | Barrel. Replaces the current `DashboardOverview` export. |

---

## Task 1: Shared dashboard types

**Files:**
- Create: `libs/shared/src/types/interfaces/dashboard.interface.ts`
- Modify: `libs/shared/src/types/interfaces/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `DashboardSeverity`, `DashboardItemKind`, `DashboardAction`, `DashboardItem`, `DashboardSection`, `DashboardSummary`, `MyWorkResponse`. Every later task imports these from `@tejas96/shared/types`.

- [ ] **Step 1: Create the types file**

```ts
// libs/shared/src/types/interfaces/dashboard.interface.ts

/**
 * Types for the single-page "My Work" dashboard.
 *
 * Deliberately separate from `AttentionItem` / `AttentionKind` in
 * `project.interface.ts`. That union is consumed by `oneohm-mobile`, which keeps
 * its own copy and maps it with an EXHAUSTIVE label record — a new kind would
 * render as a blank there. These names never collide with it.
 */

export type DashboardSeverity = 'critical' | 'warning' | 'info';

/** Every kind the dashboard can emit. Each maps to a real database state. */
export type DashboardItemKind =
  // workflow
  | 'property_missing'
  | 'site_visit_unassigned'
  | 'site_visit_pending'
  | 'survey_pending'
  | 'quote_missing'
  | 'quote_draft'
  | 'quote_expiring'
  | 'quote_lapsed'
  | 'quote_accepted_no_project'
  // follow-ups
  | 'followup_overdue'
  | 'followup_today'
  | 'followup_upcoming'
  // service
  | 'service_overdue'
  | 'service_due_today'
  | 'service_due_soon'
  | 'service_unassigned'
  // projects
  | 'project_overdue'
  | 'project_at_risk'
  | 'project_on_track'
  // finance
  | 'payment_overdue'
  | 'payment_due_soon';

/**
 * What to open, never where.
 *
 * Routes are owned by `apps/web/lib/config/routes.ts`. The backend emitting a
 * URL string (as `ProjectAttentionService` does today) rots silently when a
 * route moves, so it emits an intent and the web resolves it.
 */
export type DashboardAction =
  | 'add_property'
  | 'open_property'
  | 'complete_survey'
  | 'create_quote'
  | 'open_quote'
  | 'convert_to_project'
  | 'complete_followup'
  | 'open_service'
  | 'open_project'
  | 'open_payments';

export interface DashboardItem {
  /** Stable within a response. Shape: `<kind>:<entityId>`. */
  id: string;
  kind: DashboardItemKind;
  severity: DashboardSeverity;
  /** Line 1 — what it is and which record. */
  title: string;
  /** Line 2 — the place, person or reference number. */
  subtitle?: string;
  /** Why this is on screen, as a sentence. Never a status code. */
  reason: string;
  /** Right-hand meta, already formatted for display. */
  meta?: string;
  metaSecondary?: string;
  /** ISO date this item hangs off, when it has one. */
  dueDate?: string;
  action: DashboardAction;
  /** Everything the web needs to build the target URL. */
  params: Record<string, string>;
  /** The permission code this action needs, or null when it is always open. */
  gate: string | null;
}

/** One bucket inside a section, e.g. `Today · 3`. */
export interface DashboardBucket {
  key: string;
  label: string;
  /** The bucket's TRUE total, which may exceed `items.length`. */
  count: number;
  items: DashboardItem[];
}

export type DashboardSection =
  | {
      status: 'ok';
      /** The section's full count, including items the web lifts away. */
      total: number;
      /** How many of `total` are critical. The web lifts exactly these. */
      criticalCount: number;
      buckets: DashboardBucket[];
    }
  | { status: 'error'; message: string };

export interface DashboardSummary {
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
}

export interface MyWorkResponse {
  generatedAt: string;
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

- [ ] **Step 2: Export it from the interfaces barrel**

Open `libs/shared/src/types/interfaces/index.ts` and add a line alongside the existing exports, keeping alphabetical order if the file is ordered:

```ts
export * from './dashboard.interface';
```

- [ ] **Step 3: Confirm the types resolve from both apps**

Run:

```bash
npm run typecheck
```

Expected: PASS. Web and backend both resolve `@tejas96/shared` to local source via tsconfig paths, so **no package publish is needed**.

- [ ] **Step 4: Commit**

```bash
git add libs/shared/src/types/interfaces/dashboard.interface.ts libs/shared/src/types/interfaces/index.ts
git commit -m "feat(shared): types for the My Work dashboard

Separate from AttentionItem on purpose: oneohm-mobile keeps its own copy
of that union with an exhaustive label map, so widening it would render
blanks there."
```

---

## Task 2: The scope SQL — the single definition of "mine"

**Files:**
- Create: `apps/backend/src/modules/dashboard/services/scope.sql.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `MY_CUSTOMERS_CTE`, `MY_PROPERTIES_CTE`, `MY_QUOTES_CTE`, `MY_PROJECTS_CTE`, `MY_EMPLOYEE_CTE` — all `string` constants. Every provider composes these; **no provider may write its own ownership predicate.**

**Why this is its own task:** it is the security boundary. If it is wrong, every section leaks. It gets its own reviewer gate.

- [ ] **Step 1: Create the file**

```ts
// apps/backend/src/modules/dashboard/services/scope.sql.ts

/**
 * The single definition of "my work". Every provider composes these; none may
 * write its own ownership predicate.
 *
 * The rule (design decision 3): a record is mine if I created it, or I am
 * assigned to it, OR I own / am assigned the CUSTOMER it hangs off.
 *
 * The walk up to the customer is not convenience. Quotes have no assignee
 * column at all and properties have no general owner — only a site-visit and a
 * survey assignee. Without the walk, a rep would not see "quote required" on
 * their own lead the moment a colleague created the property, and stuck
 * hand-offs are the entire reason this dashboard exists.
 *
 * `$1` is ALWAYS the subject user id, taken from the JWT. It is never a
 * parameter the caller can influence.
 */

/** Customers I created or am assigned. */
export const MY_CUSTOMERS_CTE = `
  my_customers AS (
    SELECT c.id
    FROM customer_profiles c
    WHERE c.deleted_at IS NULL
      AND (c.created_by = $1 OR c.assignee_id = $1)
  )
`;

/** Properties I touch directly, plus every property of a customer of mine. */
export const MY_PROPERTIES_CTE = `
  my_properties AS (
    SELECT p.id, p.customer_id
    FROM customer_properties p
    WHERE p.deleted_at IS NULL
      AND (
        p.created_by = $1
        OR p.site_visit_assignee = $1
        OR p.site_survey_assignee = $1
        OR p.customer_id IN (SELECT id FROM my_customers)
      )
  )
`;

/** Quotes I created, plus every quote of a customer of mine. Quotes have no assignee. */
export const MY_QUOTES_CTE = `
  my_quotes AS (
    SELECT q.id, q.customer_id, q.property_id, q.status, q.valid_until, q.quote_number
    FROM quotes q
    WHERE q.deleted_at IS NULL
      AND (q.created_by = $1 OR q.customer_id IN (SELECT id FROM my_customers))
  )
`;

/** Projects I created or am a team member of. */
export const MY_PROJECTS_CTE = `
  my_projects AS (
    SELECT pr.id, pr.name, pr.end_date, pr.status, pr.property_id, pr.quote_id
    FROM projects pr
    WHERE pr.deleted_at IS NULL
      AND (
        pr.created_by = $1
        OR EXISTS (
          -- `deleted_at IS NULL` is load-bearing: removing someone from a
          -- project team is how their access is taken away, and without this
          -- they keep seeing the project for ever.
          SELECT 1 FROM project_team_members tm
          WHERE tm.project_id = pr.id AND tm.user_id = $1 AND tm.deleted_at IS NULL
        )
      )
  )
`;

/** Follow-ups I raised or am assigned, plus every follow-up of a customer of mine. */
export const MY_FOLLOWUPS_CTE = `
  my_followups AS (
    SELECT f.id, f.customer_id, f.property_id
    FROM followups f
    WHERE f.deleted_at IS NULL
      AND (
        f.created_by = $1
        OR f.assigned_to_user_id = $1
        OR f.customer_id IN (SELECT id FROM my_customers)
      )
  )
`;

/**
 * My employee profile id.
 *
 * Service tickets are assigned to an `employee_profiles.id`, NOT a user id, and
 * `CurrentUserType` carries no employeeId. Comparing the JWT id straight to
 * `assigned_to_employee_id` silently matches nothing — or worse, matches the
 * wrong person. `employee_profiles.user_id` is uniquely indexed, so this is 1:1.
 */
export const MY_EMPLOYEE_CTE = `
  my_employee AS (
    SELECT e.id
    FROM employee_profiles e
    WHERE e.user_id = $1
      -- The unique index on user_id is global, not partial on deleted_at, so a
      -- deactivated profile still resolves here and drags its tickets in.
      AND e.deleted_at IS NULL
  )
`;

/** Compose a WITH clause from the fragments a provider needs, in order. */
export function withCtes(...ctes: string[]): string {
  return `WITH ${ctes.join(',\n')}`;
}
```

- [ ] **Step 2: Sanity-check the SQL against the real database**

The local database is a production clone. Run this directly to confirm the CTEs parse and return plausible rows. Replace `<A_REAL_USER_UUID>` with an id from `SELECT id FROM users LIMIT 5;`.

```bash
docker exec -i oneohm-postgres psql -U root -d oneohm_epc -c "
WITH my_customers AS (
  SELECT c.id FROM customer_profiles c
  WHERE c.deleted_at IS NULL AND (c.created_by = '<A_REAL_USER_UUID>' OR c.assignee_id = '<A_REAL_USER_UUID>')
)
SELECT count(*) AS my_customer_count FROM my_customers;"
```

Expected: a number, no SQL error. If the connection details differ, use whatever the project's usual psql access is — the point is that the SQL parses against the real schema.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/dashboard/services/scope.sql.ts
git commit -m "feat(dashboard): one definition of whose work this is

Quotes have no assignee and properties have no general owner, so the
scope walks up to the customer. Service tickets hang off an employee
profile id, not a user id, which is the join that silently returns
nothing if you skip it."
```

---

## Task 3: Module, endpoint and the failure-isolation shell

**Files:**
- Create: `apps/backend/src/modules/dashboard/dashboard.module.ts`
- Create: `apps/backend/src/modules/dashboard/controllers/dashboard.controller.ts`
- Create: `apps/backend/src/modules/dashboard/services/dashboard.service.ts`
- Create: `apps/backend/src/modules/dashboard/dto/dashboard-response.dto.ts`
- Create: `apps/backend/src/modules/dashboard/providers/provider.types.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**
- Consumes: `MyWorkResponse`, `DashboardSection` from Task 1.
- Produces: the `DashboardProvider` interface every provider in Tasks 4–8 implements:
  ```ts
  interface DashboardProvider {
    readonly key: 'workflow' | 'followups' | 'service' | 'projects' | 'finance';
    load(userId: string): Promise<OkSection>;
  }
  type OkSection = Extract<DashboardSection, { status: 'ok' }>;
  ```
  Also produces `DashboardService.getMyWork(userId: string): Promise<MyWorkResponse>`.

- [ ] **Step 1: Create the provider contract**

```ts
// apps/backend/src/modules/dashboard/providers/provider.types.ts
import type { DashboardSection } from '@tejas96/shared/types';

export type OkSection = Extract<DashboardSection, { status: 'ok' }>;

export type DashboardSectionKey = 'workflow' | 'followups' | 'service' | 'projects' | 'finance';

/**
 * One section of the dashboard.
 *
 * A provider MAY throw. The service catches it and degrades that section only —
 * see `DashboardService.getMyWork`. Providers must not swallow their own errors,
 * because a section that silently returns zero rows is indistinguishable from a
 * section that genuinely has no work, and those mean opposite things.
 */
export interface DashboardProvider {
  readonly key: DashboardSectionKey;
  load(userId: string): Promise<OkSection>;
}
```

- [ ] **Step 2: Create the response DTO**

```ts
// apps/backend/src/modules/dashboard/dto/dashboard-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import type { DashboardSection, DashboardSummary, MyWorkResponse } from '@tejas96/shared/types';

class DashboardSummaryDto implements DashboardSummary {
  @ApiProperty({ example: 7 })
  overdue!: number;

  @ApiProperty({ example: 5 })
  dueToday!: number;

  @ApiProperty({ example: 9 })
  dueThisWeek!: number;
}

class DashboardSectionsDto {
  @ApiProperty({ description: 'Lead to project stalls' })
  workflow!: DashboardSection;

  @ApiProperty()
  followups!: DashboardSection;

  @ApiProperty()
  service!: DashboardSection;

  @ApiProperty()
  projects!: DashboardSection;

  @ApiProperty({ description: 'Outstanding payment milestones' })
  finance!: DashboardSection;
}

export class MyWorkResponseDto implements MyWorkResponse {
  @ApiProperty({ example: '2026-08-21T09:00:00.000Z' })
  generatedAt!: string;

  @ApiProperty({ type: DashboardSummaryDto })
  summary!: DashboardSummaryDto;

  @ApiProperty({
    type: DashboardSectionsDto,
    description:
      'Each section is either { status: "ok", total, criticalCount, buckets } or { status: "error", message }.',
  })
  sections!: DashboardSectionsDto;
}
```

- [ ] **Step 3: Create the service, with failure isolation and the summary**

```ts
// apps/backend/src/modules/dashboard/services/dashboard.service.ts
import { Injectable, Logger } from '@nestjs/common';
import type { DashboardSection, DashboardSummary, MyWorkResponse } from '@tejas96/shared/types';

import { FinanceProvider } from '../providers/finance.provider';
import { FollowupsProvider } from '../providers/followups.provider';
import { ProjectsProvider } from '../providers/projects.provider';
import type { DashboardProvider, OkSection } from '../providers/provider.types';
import { ServiceProvider } from '../providers/service.provider';
import { WorkflowProvider } from '../providers/workflow.provider';

/**
 * Bucket keys that mean "past its date". The summary counts these, and only
 * these, as overdue — the three headline numbers must stay disjoint sets.
 */
const OVERDUE_BUCKETS = new Set(['overdue', 'lapsed', 'payment_overdue']);
const TODAY_BUCKETS = new Set(['today', 'due_today']);
const THIS_WEEK_BUCKETS = new Set(['upcoming', 'due_soon', 'payment_due_soon']);

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly providers: DashboardProvider[];

  constructor(
    workflow: WorkflowProvider,
    followups: FollowupsProvider,
    service: ServiceProvider,
    projects: ProjectsProvider,
    finance: FinanceProvider,
  ) {
    this.providers = [workflow, followups, service, projects, finance];
  }

  async getMyWork(userId: string): Promise<MyWorkResponse> {
    const settled = await Promise.allSettled(this.providers.map((p) => p.load(userId)));

    const sections = {} as MyWorkResponse['sections'];
    const ok: OkSection[] = [];

    settled.forEach((result, index) => {
      const key = this.providers[index].key;
      if (result.status === 'fulfilled') {
        sections[key] = result.value;
        ok.push(result.value);
        return;
      }
      // Log the real cause; hand the browser a sentence a person can read.
      this.logger.error(`Dashboard section "${key}" failed`, result.reason);
      sections[key] = {
        status: 'error',
        message: 'This section could not be loaded.',
      } satisfies DashboardSection;
    });

    return {
      generatedAt: new Date().toISOString(),
      summary: this.summarise(ok),
      sections,
    };
  }

  /**
   * The three headline numbers are SUMMED FROM the sections, never queried
   * separately, so they cannot drift from the lists beneath them.
   *
   * A section that failed contributes nothing rather than a zero — the numbers
   * describe what we can actually see.
   */
  private summarise(sections: OkSection[]): DashboardSummary {
    const tally = (match: Set<string>): number =>
      sections.reduce(
        (sum, section) =>
          sum +
          section.buckets
            .filter((bucket) => match.has(bucket.key))
            .reduce((bucketSum, bucket) => bucketSum + bucket.count, 0),
        0,
      );

    return {
      overdue: tally(OVERDUE_BUCKETS),
      dueToday: tally(TODAY_BUCKETS),
      dueThisWeek: tally(THIS_WEEK_BUCKETS),
    };
  }
}
```

- [ ] **Step 4: Create the controller**

```ts
// apps/backend/src/modules/dashboard/controllers/dashboard.controller.ts
import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { MyWorkResponseDto } from '../dto/dashboard-response.dto';
import { DashboardService } from '../services/dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
// There is NO global auth guard in this app — app.module.ts registers only
// ThrottlerGuard. Without this line the endpoint is public.
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * The subject is the token holder. FULL STOP.
   *
   * This endpoint deliberately takes no employee/user parameter. Backend RBAC
   * does not exist in this app yet, so a parameter here would be an unguarded
   * "show me anyone's work" switch. When the admin employee selector arrives it
   * adds a parameter AND the permission check that governs it, together.
   */
  @Get('my-work')
  @ApiOperation({ summary: "Everything needing the signed-in employee's attention" })
  @ApiResponse({ status: HttpStatus.OK, type: MyWorkResponseDto })
  async getMyWork(@CurrentUser() currentUser: CurrentUserType): Promise<MyWorkResponseDto> {
    return this.dashboardService.getMyWork(currentUser.id);
  }
}
```

- [ ] **Step 5: Create the module**

```ts
// apps/backend/src/modules/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';

import { DashboardController } from './controllers/dashboard.controller';
import { FinanceProvider } from './providers/finance.provider';
import { FollowupsProvider } from './providers/followups.provider';
import { ProjectsProvider } from './providers/projects.provider';
import { ServiceProvider } from './providers/service.provider';
import { WorkflowProvider } from './providers/workflow.provider';
import { DashboardService } from './services/dashboard.service';

/**
 * Reads across many domains and owns none of them.
 *
 * No TypeOrmModule.forFeature here on purpose: every provider aggregates with
 * raw SQL through the shared DataSource. Pulling one row per project through
 * the ORM would be an N+1 across five domains on the first screen after login.
 */
@Module({
  controllers: [DashboardController],
  providers: [
    DashboardService,
    WorkflowProvider,
    FollowupsProvider,
    ServiceProvider,
    ProjectsProvider,
    FinanceProvider,
  ],
})
export class DashboardModule {}
```

- [ ] **Step 6: Create five stub providers so the module boots**

Create each of these now, returning an empty section. Tasks 4–8 replace the bodies.

```ts
// apps/backend/src/modules/dashboard/providers/workflow.provider.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { DashboardProvider, OkSection } from './provider.types';

@Injectable()
export class WorkflowProvider implements DashboardProvider {
  readonly key = 'workflow' as const;

  constructor(private readonly dataSource: DataSource) {}

  async load(_userId: string): Promise<OkSection> {
    return { status: 'ok', total: 0, criticalCount: 0, buckets: [] };
  }
}
```

Repeat verbatim for the other four, changing only the class name and `key`:
`FollowupsProvider` / `'followups'` in `followups.provider.ts`,
`ServiceProvider` / `'service'` in `service.provider.ts`,
`ProjectsProvider` / `'projects'` in `projects.provider.ts`,
`FinanceProvider` / `'finance'` in `finance.provider.ts`.

- [ ] **Step 7: Register the module**

In `apps/backend/src/app.module.ts`, add the import alongside the other module imports and add `DashboardModule` to the `imports` array, next to the other feature modules:

```ts
import { DashboardModule } from './modules/dashboard/dashboard.module';
```

- [ ] **Step 8: Run the backend and hit the endpoint**

```bash
npm run backend:dev
```

Then, with a valid access token from a browser session:

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8085/api/v1/dashboard/my-work | jq
```

Expected: HTTP 200 and a body with `generatedAt`, a `summary` of three zeros, and five sections each `{"status":"ok","total":0,"criticalCount":0,"buckets":[]}`.

Then confirm the guard is really on:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8085/api/v1/dashboard/my-work
```

Expected: `401`. **If this prints 200, the guard is missing and every later task leaks data.** Fix before continuing.

- [ ] **Step 9: Commit**

```bash
npm run typecheck && npm run lint
git add apps/backend/src/modules/dashboard apps/backend/src/app.module.ts
git commit -m "feat(dashboard): endpoint shell that degrades one section at a time

Providers run under allSettled so a single broken query costs one card
rather than the whole first screen after login. The summary is summed
from the sections it can see, never queried separately, so the headline
numbers cannot drift from the lists under them."
```

---

## The one query pattern every provider uses

Read this before Tasks 4–8. All five providers follow it, so it is stated once.

A provider issues **one** query. Inside it, the scoped set is built as a CTE, and then
window functions give the bucket total and the rank in the same pass:

```sql
SELECT
  s.*,
  COUNT(*)     OVER (PARTITION BY s.bucket)                                   AS bucket_total,
  ROW_NUMBER() OVER (PARTITION BY s.bucket ORDER BY s.rank, s.due_date NULLS LAST) AS rn
FROM scoped s
```

The count and the list therefore come from the *same* rows, in the *same* statement. There is
no second query to drift. TypeScript then keeps `rn <= cap` for display while reading
`bucket_total` for the badge — which is exactly spec §7 check 15, made structurally impossible
to fail.

`$1` is always the subject user id.

---

## Task 4: Workflow provider — the nine Lead → Project stalls

**Files:**
- Create: `apps/backend/src/modules/dashboard/providers/section-shaping.ts`
- Modify: `apps/backend/src/modules/dashboard/providers/workflow.provider.ts`

**Interfaces:**
- Consumes: `MY_CUSTOMERS_CTE`, `MY_PROPERTIES_CTE`, `MY_QUOTES_CTE`, `withCtes` (Task 2); `DashboardProvider`, `OkSection` (Task 3).
- Produces: buckets keyed `lapsed`, `blocked`, `stalled`, `due_soon`. Also produces the shared shaping used by **every** later provider:
  ```ts
  interface ProviderRow { kind: string; severity: 'critical'|'warning'|'info'; bucket: string;
    entity_id: string; title: string; subtitle: string|null; reason: string; meta: string|null;
    meta_secondary?: string|null; due_date: string|null; action: string;
    customer_id: string|null; property_id: string|null; project_id?: string|null;
    bucket_total: string; rn: string; }
  function toSection(rows: ProviderRow[], cap: number, labels: Record<string,string>): OkSection
  const GATE_FOR_ACTION: Record<string, string|null>
  ```

- [ ] **Step 0: Create the shared shaping first**

```ts
// apps/backend/src/modules/dashboard/providers/section-shaping.ts
import type { DashboardBucket, DashboardItem } from '@tejas96/shared/types';

import type { OkSection } from './provider.types';

/** The row shape every provider's SQL must return. */
export interface ProviderRow {
  kind: string;
  severity: 'critical' | 'warning' | 'info';
  bucket: string;
  entity_id: string;
  title: string;
  subtitle: string | null;
  reason: string;
  meta: string | null;
  meta_secondary?: string | null;
  due_date: string | null;
  action: string;
  customer_id: string | null;
  property_id: string | null;
  project_id?: string | null;
  /** From COUNT(*) OVER (PARTITION BY bucket). Postgres returns bigint as string. */
  bucket_total: string;
  /** From ROW_NUMBER() OVER (PARTITION BY bucket ...). */
  rn: string;
}

/**
 * The permission each action needs, mirrored from the frontend catalog
 * (`apps/web/lib/rbac/catalog.ts`). The backend only REPORTS this — it does not
 * enforce it, because backend RBAC does not exist in this app. The web mutes
 * the control and opens the access dialog.
 */
export const GATE_FOR_ACTION: Record<string, string | null> = {
  add_property: 'properties.create',
  open_property: 'properties.view',
  complete_survey: 'properties.edit',
  create_quote: 'quotes.create',
  open_quote: 'quotes.view',
  convert_to_project: 'projects.create',
  complete_followup: 'followups.manage',
  open_service: 'service.view',
  open_project: 'projects.view',
  open_payments: 'finance.view',
};

/**
 * Turn window-function rows into a section.
 *
 * `count` comes from `bucket_total` — the total across the WHOLE scoped set —
 * while `items` is capped. That is the point: the badge always describes the
 * full set even when the card shows five of it.
 */
export function toSection(
  rows: ProviderRow[],
  cap: number,
  labels: Record<string, string>,
): OkSection {
  const byBucket = new Map<string, DashboardBucket>();

  for (const row of rows) {
    let bucket = byBucket.get(row.bucket);
    if (!bucket) {
      bucket = {
        key: row.bucket,
        label: labels[row.bucket] ?? row.bucket,
        count: Number(row.bucket_total),
        items: [],
      };
      byBucket.set(row.bucket, bucket);
    }
    if (Number(row.rn) > cap) continue;

    const params: Record<string, string> = { id: row.entity_id };
    if (row.customer_id) params.customerId = row.customer_id;
    if (row.property_id) params.propertyId = row.property_id;
    if (row.project_id) params.projectId = row.project_id;

    bucket.items.push({
      id: `${row.kind}:${row.entity_id}`,
      kind: row.kind as DashboardItem['kind'],
      severity: row.severity,
      title: row.title,
      subtitle: row.subtitle ?? undefined,
      reason: row.reason,
      meta: row.meta ?? undefined,
      metaSecondary: row.meta_secondary ?? undefined,
      dueDate: row.due_date ?? undefined,
      action: row.action as DashboardItem['action'],
      params,
      gate: GATE_FOR_ACTION[row.action] ?? null,
    });
  }

  const buckets = [...byBucket.values()];
  return {
    status: 'ok',
    total: buckets.reduce((sum, b) => sum + b.count, 0),
    criticalCount: rows.filter((r) => r.severity === 'critical').length,
    buckets,
  };
}
```

- [ ] **Step 1: Replace the file**

```ts
// apps/backend/src/modules/dashboard/providers/workflow.provider.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { MY_CUSTOMERS_CTE, MY_PROPERTIES_CTE, MY_QUOTES_CTE, withCtes } from '../services/scope.sql';
import type { DashboardProvider, OkSection } from './provider.types';
import { type ProviderRow, toSection } from './section-shaping';

/** Rows shown per bucket. The badge still reports the true total. */
const CAP = 5;

/** Quotes carry no expiry job, so "expiring" is a window on valid_until. */
const QUOTE_EXPIRY_DAYS = 7;

const BUCKET_LABELS: Record<string, string> = {
  lapsed: 'Lapsed',
  blocked: 'Blocked',
  stalled: 'Stalled',
  due_soon: 'Expiring soon',
};

@Injectable()
export class WorkflowProvider implements DashboardProvider {
  readonly key = 'workflow' as const;

  constructor(private readonly dataSource: DataSource) {}

  async load(userId: string): Promise<OkSection> {
    const rows: ProviderRow[] = await this.dataSource.query(this.sql(), [userId]);
    return toSection(rows, CAP, BUCKET_LABELS);
  }

  private sql(): string {
    return `
${withCtes(MY_CUSTOMERS_CTE, MY_PROPERTIES_CTE, MY_QUOTES_CTE)},

/**
 * The furthest-along incomplete step per property, and only that one.
 * Showing a property under both "site visit pending" and "survey pending"
 * would double-count one problem and offer two buttons for one next action.
 */
property_stage AS (
  SELECT
    p.id                AS property_id,
    p.customer_id,
    p.property_name,
    p.site_visit_assignee,
    p.site_visit_done,
    p.survey_done,
    p.site_visit_completed_at,
    p.site_survey_completed_at,
    EXISTS (SELECT 1 FROM my_quotes q WHERE q.property_id = p.id) AS has_quote
  FROM customer_properties p
  WHERE p.id IN (SELECT id FROM my_properties)
    AND p.deleted_at IS NULL
),

stalls AS (
  -- 1. Lead onboarded, no property yet.
  SELECT
    'property_missing'::text AS kind, 'warning'::text AS severity, 'stalled'::text AS bucket,
    c.id::text AS entity_id,
    COALESCE(NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), ''), 'Customer') AS title,
    'Lead'::text AS subtitle,
    'Onboarded ' || GREATEST((CURRENT_DATE - c.created_at::date), 0)::text || ' days ago, no property added' AS reason,
    NULL::text AS meta,
    NULL::date AS due_date,
    'add_property'::text AS action,
    c.id::text AS customer_id, NULL::text AS property_id,
    2 AS rank
  FROM customer_profiles c
  WHERE c.id IN (SELECT id FROM my_customers)
    AND c.status IN ('lead', 'prospect')
    AND NOT EXISTS (
      SELECT 1 FROM customer_properties cp WHERE cp.customer_id = c.id AND cp.deleted_at IS NULL
    )

  UNION ALL
  -- 2/3. Site visit: unassigned, or assigned and not done.
  SELECT
    CASE WHEN ps.site_visit_assignee IS NULL THEN 'site_visit_unassigned' ELSE 'site_visit_pending' END,
    CASE WHEN ps.site_visit_assignee IS NULL THEN 'warning' ELSE 'info' END,
    'stalled',
    ps.property_id::text,
    ps.property_name,
    'Property',
    CASE WHEN ps.site_visit_assignee IS NULL
         THEN 'Nobody is assigned to visit this property yet'
         ELSE 'Site visit assigned but not completed' END,
    NULL, NULL, 'open_property',
    ps.customer_id::text, ps.property_id::text,
    CASE WHEN ps.site_visit_assignee IS NULL THEN 2 ELSE 3 END
  FROM property_stage ps
  WHERE ps.site_visit_done = false

  UNION ALL
  -- 4. Site visit done, survey not started.
  SELECT
    'survey_pending', 'warning', 'stalled',
    ps.property_id::text, ps.property_name, 'Property',
    'Site visit completed '
      || GREATEST((CURRENT_DATE - ps.site_visit_completed_at::date), 0)::text
      || ' days ago, survey not started',
    NULL, NULL, 'complete_survey',
    ps.customer_id::text, ps.property_id::text, 2
  FROM property_stage ps
  WHERE ps.site_visit_done = true AND ps.survey_done = false

  UNION ALL
  -- 5. Survey done, no quote on the property.
  SELECT
    'quote_missing', 'warning', 'stalled',
    ps.property_id::text, ps.property_name, 'Property',
    'Survey done '
      || GREATEST((CURRENT_DATE - ps.site_survey_completed_at::date), 0)::text
      || ' days ago, no quote created',
    NULL, NULL, 'create_quote',
    ps.customer_id::text, ps.property_id::text, 2
  FROM property_stage ps
  WHERE ps.survey_done = true AND ps.has_quote = false

  UNION ALL
  -- 6. Draft quote. NOTE: draft already MEANS not sent; there is no separate
  -- "unsent" state, and emitting both would count one quote twice.
  SELECT
    'quote_draft', 'info', 'stalled',
    q.id::text, COALESCE(cp.property_name, 'Quote'), q.quote_number,
    'Drafted ' || GREATEST((CURRENT_DATE - qq.created_at::date), 0)::text || ' days ago, never sent',
    q.quote_number, NULL, 'open_quote',
    q.customer_id::text, q.property_id::text, 3
  FROM my_quotes q
  JOIN quotes qq ON qq.id = q.id
  LEFT JOIN customer_properties cp ON cp.id = q.property_id
  WHERE q.status = 'draft'

  UNION ALL
  -- 7/8. Expiry is computed from valid_until, NEVER read from status:
  -- markExpiredQuotes() exists and nothing schedules it, so a quote past its
  -- date still says 'sent'. See quote.service.ts:257.
  SELECT
    CASE WHEN q.valid_until < CURRENT_DATE THEN 'quote_lapsed' ELSE 'quote_expiring' END,
    CASE WHEN q.valid_until < CURRENT_DATE THEN 'critical' ELSE 'warning' END,
    CASE WHEN q.valid_until < CURRENT_DATE THEN 'lapsed' ELSE 'due_soon' END,
    q.id::text, COALESCE(cp.property_name, 'Quote'), q.quote_number,
    CASE WHEN q.valid_until < CURRENT_DATE
         THEN 'Quote lapsed ' || (CURRENT_DATE - q.valid_until)::text || ' days ago, still marked sent'
         ELSE 'Quote expires in ' || (q.valid_until - CURRENT_DATE)::text || ' days' END,
    q.quote_number, q.valid_until, 'open_quote',
    q.customer_id::text, q.property_id::text,
    CASE WHEN q.valid_until < CURRENT_DATE THEN 1 ELSE 2 END
  FROM my_quotes q
  LEFT JOIN customer_properties cp ON cp.id = q.property_id
  WHERE q.status IN ('sent', 'viewed')
    AND q.valid_until <= CURRENT_DATE + ${QUOTE_EXPIRY_DAYS}

  UNION ALL
  -- 9. Accepted, but no project was ever created from it.
  SELECT
    'quote_accepted_no_project', 'critical', 'blocked',
    q.id::text, COALESCE(cp.property_name, 'Quote'), 'Accepted quote',
    'Accepted ' || GREATEST((CURRENT_DATE - qq.updated_at::date), 0)::text
      || ' days ago, project never created',
    q.quote_number, NULL, 'convert_to_project',
    q.customer_id::text, q.property_id::text, 1
  FROM my_quotes q
  JOIN quotes qq ON qq.id = q.id
  LEFT JOIN customer_properties cp ON cp.id = q.property_id
  WHERE q.status = 'accepted'
    AND NOT EXISTS (
      SELECT 1 FROM projects pr WHERE pr.quote_id = q.id AND pr.deleted_at IS NULL
    )
)

SELECT
  s.*,
  COUNT(*)     OVER (PARTITION BY s.bucket)                                       AS bucket_total,
  ROW_NUMBER() OVER (PARTITION BY s.bucket ORDER BY s.rank, s.due_date NULLS LAST) AS rn
FROM stalls s
ORDER BY s.rank, s.due_date NULLS LAST
`;
  }
}

```

- [ ] **Step 2: Run it and read the numbers**

Restart the backend, then:

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8085/api/v1/dashboard/my-work \
  | jq '.sections.workflow'
```

Expected: `status: "ok"`, one or more buckets, and for each bucket `count >= items | length`, with `items | length <= 5`.

- [ ] **Step 3: Prove the count matches the list**

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8085/api/v1/dashboard/my-work \
  | jq '.sections.workflow.buckets[] | {key, count, shown: (.items | length)}'
```

Expected: every `shown` is `min(count, 5)`. If any `shown > count`, the window functions are wrong — stop and fix.

- [ ] **Step 4: Prove a lapsed quote is found by date, not status**

```bash
docker exec -i oneohm-postgres psql -U root -d oneohm_epc -c "
SELECT status, count(*) FROM quotes
WHERE deleted_at IS NULL AND valid_until < CURRENT_DATE GROUP BY status;"
```

Expected: rows with `status = 'sent'` or `'viewed'` and a non-zero count — that is the population this provider must catch, and it proves `status = 'expired'` would have missed them. If the count is zero for those statuses, note it and move on; the rule is still right.

- [ ] **Step 5: Commit**

```bash
npm run typecheck && npm run lint
git add apps/backend/src/modules/dashboard/providers/workflow.provider.ts
git commit -m "feat(dashboard): the nine ways a lead stalls on its way to a project

Only the furthest-along incomplete step is emitted per property, so one
problem never shows twice with two different buttons. Quote expiry is
computed from valid_until because nothing schedules markExpiredQuotes,
so a lapsed quote still reads as sent in the status column."
```

---

## Task 5: Follow-ups provider

**Files:**
- Modify: `apps/backend/src/modules/dashboard/providers/followups.provider.ts`

**Interfaces:**
- Consumes: `MY_CUSTOMERS_CTE`, `MY_FOLLOWUPS_CTE`, `withCtes` (Task 2); `ProviderRow`, `toSection` (Task 4);
  `DashboardProvider`, `OkSection` (Task 3).
- Produces: buckets keyed `overdue`, `today`, `upcoming`.

**The day boundary is computed by the DATABASE, never by Node.** `followup.repository.ts:144-155`
records why: the API runs in IST and Postgres in UTC, so a `new Date()` boundary made
`/followups/summary` and `/followups/today` disagree by five and a half hours — a count of 2
above a list of 1. Use `date_trunc('day', now())`, the same basis as every other follow-up
surface, or the dashboard reintroduces that bug.

- [ ] **Step 1: Replace the file**

```ts
// apps/backend/src/modules/dashboard/providers/followups.provider.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { MY_CUSTOMERS_CTE, MY_FOLLOWUPS_CTE, withCtes } from '../services/scope.sql';
import type { DashboardProvider, OkSection } from './provider.types';
import { type ProviderRow, toSection } from './section-shaping';

const CAP = 5;
const UPCOMING_DAYS = 7;

const BUCKET_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Next 7 days',
};

@Injectable()
export class FollowupsProvider implements DashboardProvider {
  readonly key = 'followups' as const;

  constructor(private readonly dataSource: DataSource) {}

  async load(userId: string): Promise<OkSection> {
    const rows: ProviderRow[] = await this.dataSource.query(SQL, [userId]);
    return toSection(rows, CAP, BUCKET_LABELS);
  }
}

const SQL = `
${withCtes(MY_CUSTOMERS_CTE, MY_FOLLOWUPS_CTE)},
scoped AS (
  SELECT
    CASE
      WHEN f.scheduled_at <  date_trunc('day', now())                        THEN 'followup_overdue'
      WHEN f.scheduled_at <  date_trunc('day', now()) + interval '1 day'     THEN 'followup_today'
      ELSE 'followup_upcoming'
    END AS kind,
    CASE
      WHEN f.scheduled_at <  date_trunc('day', now())                    THEN 'critical'
      WHEN f.scheduled_at <  date_trunc('day', now()) + interval '1 day' THEN 'warning'
      ELSE 'info'
    END AS severity,
    CASE
      WHEN f.scheduled_at <  date_trunc('day', now())                    THEN 'overdue'
      WHEN f.scheduled_at <  date_trunc('day', now()) + interval '1 day' THEN 'today'
      ELSE 'upcoming'
    END AS bucket,
    f.id::text AS entity_id,
    COALESCE(NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), ''), 'Customer') AS title,
    f.subject AS subtitle,
    CASE
      WHEN f.scheduled_at < date_trunc('day', now())
        THEN 'Due ' || EXTRACT(DAY FROM (date_trunc('day', now()) - f.scheduled_at))::int::text
             || ' days ago'
      ELSE f.subject
    END AS reason,
    to_char(f.scheduled_at, 'HH24:MI') AS meta,
    NULL::text AS meta_secondary,
    f.scheduled_at::date AS due_date,
    'complete_followup'::text AS action,
    f.customer_id::text AS customer_id,
    f.property_id::text  AS property_id,
    NULL::text AS project_id,
    f.scheduled_at AS sort_at
  FROM followups f
  JOIN customer_profiles c ON c.id = f.customer_id
  WHERE f.deleted_at IS NULL
    AND f.status = 'pending'
    -- Ownership lives in scope.sql, like every other section's.
    AND f.id IN (SELECT id FROM my_followups)
    AND f.scheduled_at < date_trunc('day', now()) + interval '${UPCOMING_DAYS + 1} days'
)
SELECT
  s.*,
  COUNT(*)     OVER (PARTITION BY s.bucket)                        AS bucket_total,
  ROW_NUMBER() OVER (PARTITION BY s.bucket ORDER BY s.sort_at ASC) AS rn
FROM scoped s
ORDER BY s.sort_at ASC
`;
```

- [ ] **Step 2: Confirm the dashboard agrees with the existing summary endpoint**

This is the whole reason the boundary rule exists. Compare the two:

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8085/api/v1/followups/summary?mine=true | jq
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8085/api/v1/dashboard/my-work \
  | jq '.sections.followups.buckets[] | {key, count}'
```

Expected: the dashboard's `overdue` and `today` counts match `/followups/summary`'s `overdue`
and `today`. They may differ if the summary scopes on assignee only while we also include
`created_by` — if so, note the difference and confirm it is that, not a timezone drift, by
re-running both after changing nothing.

- [ ] **Step 3: Commit**

```bash
npm run typecheck && npm run lint
git add apps/backend/src/modules/dashboard/providers/followups.provider.ts
git commit -m "feat(dashboard): follow-ups in three buckets on the database's clock

date_trunc('day', now()) is the one basis every follow-up surface uses.
Building the boundary in Node instead is what made summary and today
disagree by five and a half hours."
```

---

## Task 6: Service requests provider

**Files:**
- Modify: `apps/backend/src/modules/dashboard/providers/service.provider.ts`

**Interfaces:**
- Consumes: `MY_EMPLOYEE_CTE`, `MY_PROJECTS_CTE`, `MY_CUSTOMERS_CTE`, `withCtes` (Task 2); `ProviderRow`, `toSection` (Task 4).
- Produces: buckets keyed `overdue`, `due_today`, `unassigned`, `due_soon`.

**The trap:** `service_tickets.assigned_to_employee_id` is an `employee_profiles.id`, **not** a
user id, and `CurrentUserType` carries no employee id. Comparing the JWT id to it directly
matches nothing, silently. This is verification check 13.

- [ ] **Step 1: Replace the file**

```ts
// apps/backend/src/modules/dashboard/providers/service.provider.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import {
  MY_CUSTOMERS_CTE,
  MY_EMPLOYEE_CTE,
  MY_PROJECTS_CTE,
  withCtes,
} from '../services/scope.sql';
import type { DashboardProvider, OkSection } from './provider.types';
import { type ProviderRow, toSection } from './section-shaping';

const CAP = 5;
const DUE_SOON_DAYS = 7;

const BUCKET_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  due_today: 'Due today',
  unassigned: 'Nobody assigned',
  due_soon: 'Due in 7 days',
};

@Injectable()
export class ServiceProvider implements DashboardProvider {
  readonly key = 'service' as const;

  constructor(private readonly dataSource: DataSource) {}

  async load(userId: string): Promise<OkSection> {
    const rows: ProviderRow[] = await this.dataSource.query(this.sql(), [userId]);
    return toSection(rows, CAP, BUCKET_LABELS);
  }

  private sql(): string {
    return `
${withCtes(MY_CUSTOMERS_CTE, MY_PROJECTS_CTE, MY_EMPLOYEE_CTE)},

scoped AS (
  SELECT
    CASE
      WHEN t.due_date IS NOT NULL AND t.due_date <  CURRENT_DATE THEN 'service_overdue'
      WHEN t.due_date =  CURRENT_DATE                            THEN 'service_due_today'
      WHEN t.assigned_to_employee_id IS NULL                     THEN 'service_unassigned'
      ELSE 'service_due_soon'
    END AS kind,
    CASE
      WHEN t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE THEN 'critical'
      WHEN t.due_date = CURRENT_DATE                            THEN 'warning'
      WHEN t.assigned_to_employee_id IS NULL                    THEN 'warning'
      ELSE 'info'
    END AS severity,
    CASE
      WHEN t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE THEN 'overdue'
      WHEN t.due_date = CURRENT_DATE                            THEN 'due_today'
      WHEN t.assigned_to_employee_id IS NULL                    THEN 'unassigned'
      ELSE 'due_soon'
    END AS bucket,
    t.id::text AS entity_id,
    t.title,
    t.ticket_number || ' · '
      || COALESCE(NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), ''), 'Customer') AS subtitle,
    CASE
      WHEN t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE
        THEN (CURRENT_DATE - t.due_date)::text || ' days overdue, still ' || REPLACE(t.status, '_', ' ')
      WHEN t.due_date = CURRENT_DATE THEN 'Due today'
      WHEN t.assigned_to_employee_id IS NULL THEN 'Nobody is assigned to this yet'
      ELSE 'Due ' || to_char(t.due_date, 'DD Mon')
    END AS reason,
    CASE WHEN t.due_date IS NULL THEN '—' ELSE to_char(t.due_date, 'DD Mon') END AS meta,
    INITCAP(t.priority) AS meta_secondary,
    t.due_date AS due_date,
    'open_service'::text AS action,
    t.customer_id::text AS customer_id,
    NULL::text AS property_id,
    t.project_id::text AS project_id,
    CASE
      WHEN t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE THEN 1
      WHEN t.due_date = CURRENT_DATE THEN 2
      WHEN t.assigned_to_employee_id IS NULL THEN 3
      ELSE 4
    END AS rank
  FROM service_tickets t
  JOIN customer_profiles c ON c.id = t.customer_id
  WHERE t.deleted_at IS NULL
    -- The single definition of an active ticket, mirrored from
    -- ACTIVE_TICKET_STATUSES in libs/shared. Do not inline a different list.
    AND t.status IN ('open', 'in_progress')
    AND (
      -- Assigned to ME. The join through employee_profiles is mandatory:
      -- assigned_to_employee_id is an employee id, not a user id.
      t.assigned_to_employee_id IN (SELECT id FROM my_employee)
      OR t.created_by = $1
      OR t.project_id  IN (SELECT id FROM my_projects)
      OR t.customer_id IN (SELECT id FROM my_customers)
    )
    AND (
      t.due_date IS NULL
      OR t.due_date <= CURRENT_DATE + ${DUE_SOON_DAYS}
    )
)
SELECT
  s.*,
  COUNT(*)     OVER (PARTITION BY s.bucket)                                     AS bucket_total,
  ROW_NUMBER() OVER (PARTITION BY s.bucket ORDER BY s.due_date NULLS LAST, s.entity_id) AS rn
FROM scoped s
ORDER BY s.rank, s.due_date NULLS LAST
`;
  }
}
```

- [ ] **Step 2: Prove the employee join actually matches**

```bash
docker exec -i oneohm-postgres psql -U root -d oneohm_epc -c "
SELECT count(*) FILTER (WHERE assigned_to_employee_id IS NOT NULL) AS assigned,
       count(*) FILTER (WHERE assigned_to_employee_id IS NULL)     AS unassigned
FROM service_tickets WHERE deleted_at IS NULL AND status IN ('open','in_progress');"
```

Then confirm your own employee profile exists:

```bash
docker exec -i oneohm-postgres psql -U root -d oneohm_epc -c \
  "SELECT id, user_id FROM employee_profiles WHERE user_id = '<YOUR_USER_UUID>';"
```

Expected: one row. **If it returns nothing, the service section will be empty for you and that
is not a bug in the provider** — note it, and test with a user who has a profile.

- [ ] **Step 3: Commit**

```bash
npm run typecheck && npm run lint
git add apps/backend/src/modules/dashboard/providers/service.provider.ts
git commit -m "feat(dashboard): service requests, joined through employee_profiles

assigned_to_employee_id is an employee id and the JWT carries a user id.
Comparing them directly matches nothing and fails silently, which is why
that join is in the scope file rather than left to each caller."
```

---

## Task 7: Project health provider

**Files:**
- Modify: `apps/backend/src/modules/dashboard/providers/projects.provider.ts`

**Interfaces:**
- Consumes: `MY_PROJECTS_CTE`, `withCtes` (Task 2); `ProviderRow`, `toSection` (Task 4).
- Produces: buckets keyed `overdue`, `at_risk`, `on_track`. Each item carries a `milestones`
  array on `metaSecondary` as JSON — see step 1.

**Two rules from the spec:**
- **Never list individual tasks.** Counts and milestone health only (§17).
- **`progress_percentage` is not used.** It is a stored column updated by hand
  (`project.repository.ts:524`) and can be stale. Tasks done / total is derived live.

Milestones are **not a table**. They are `project_tasks.milestone_name` — a string grouping.
A milestone with no tasks does not exist.

- [ ] **Step 1: Replace the file**

```ts
// apps/backend/src/modules/dashboard/providers/projects.provider.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { MY_PROJECTS_CTE, withCtes } from '../services/scope.sql';
import type { DashboardProvider, OkSection } from './provider.types';
import { type ProviderRow, toSection } from './section-shaping';

const CAP = 4;
const DUE_SOON_DAYS = 7;

const BUCKET_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  at_risk: 'At risk',
  on_track: 'On track',
};

@Injectable()
export class ProjectsProvider implements DashboardProvider {
  readonly key = 'projects' as const;

  constructor(private readonly dataSource: DataSource) {}

  async load(userId: string): Promise<OkSection> {
    const rows: (ProviderRow & { balance_paise: string })[] = await this.dataSource.query(
      this.sql(),
      [userId],
    );

    // Substitute the formatted amount before shaping. The SQL emits a literal
    // '{amount}' placeholder so the money string is built in exactly one place.
    const formatted = rows.map((row) => {
      const amount = formatInr(Number(row.balance_paise) / 100);
      return {
        ...row,
        meta: (row.meta ?? '').replace('{amount}', amount),
        reason: row.reason.replace('{amount}', amount),
      };
    });

    return toSection(formatted, CAP, BUCKET_LABELS);
  }

  private sql(): string {
    return `
${withCtes(MY_PROJECTS_CTE)},

/**
 * Task counts per project. Live, not the stored progress_percentage column —
 * that one is written by hand via ProjectRepository.updateProgress and drifts.
 */
task_rollup AS (
  SELECT
    t.project_id,
    COUNT(*)                                              AS total_tasks,
    COUNT(*) FILTER (WHERE t.status = 'done')             AS done_tasks,
    COUNT(*) FILTER (WHERE t.status = 'blocked')          AS blocked_tasks,
    COUNT(*) FILTER (
      WHERE t.status <> 'done' AND t.end_date IS NOT NULL AND t.end_date < CURRENT_DATE
    )                                                     AS overdue_tasks,
    COUNT(*) FILTER (
      WHERE t.status <> 'done' AND t.end_date IS NOT NULL
        AND t.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ${DUE_SOON_DAYS}
    )                                                     AS due_soon_tasks
  FROM project_tasks t
  WHERE t.deleted_at IS NULL
    AND t.project_id IN (SELECT id FROM my_projects)
  GROUP BY t.project_id
),

/**
 * Milestone health, grouped by the NAME written on each task. There is no
 * milestone table — MilestoneDisplayStatus replaced the old entity — so a
 * milestone with no tasks simply does not exist here.
 */
milestone_rollup AS (
  SELECT
    m.project_id,
    json_agg(
      json_build_object(
        'name',    m.milestone_name,
        'done',    m.done_count,
        'total',   m.total_count,
        'overdue', m.overdue_count,
        'blocked', m.blocked_count,
        'state',   CASE
                     WHEN m.overdue_count > 0 OR m.blocked_count > 0 THEN 'risk'
                     WHEN m.done_count = m.total_count               THEN 'complete'
                     WHEN m.done_count > 0                           THEN 'progress'
                     ELSE 'none'
                   END
      )
      ORDER BY m.min_order NULLS LAST, m.milestone_name
    ) AS milestones
  FROM (
    SELECT
      t.project_id,
      t.milestone_name,
      MIN(t.milestone_order)                         AS min_order,
      COUNT(*)                                       AS total_count,
      COUNT(*) FILTER (WHERE t.status = 'done')      AS done_count,
      COUNT(*) FILTER (WHERE t.status = 'blocked')   AS blocked_count,
      COUNT(*) FILTER (
        WHERE t.status <> 'done' AND t.end_date IS NOT NULL AND t.end_date < CURRENT_DATE
      )                                              AS overdue_count
    FROM project_tasks t
    WHERE t.deleted_at IS NULL
      AND t.milestone_name IS NOT NULL
      AND t.project_id IN (SELECT id FROM my_projects)
    GROUP BY t.project_id, t.milestone_name
  ) m
  -- Group by the SUBQUERY's project_id. Re-joining project_tasks here would
  -- multiply each milestone by the project's task count, so json_agg would
  -- repeat every milestone dozens of times.
  GROUP BY m.project_id
),

scoped AS (
  SELECT
    CASE
      WHEN p.end_date IS NOT NULL AND p.end_date < CURRENT_DATE THEN 'project_overdue'
      WHEN COALESCE(tr.overdue_tasks, 0) > 0
        OR COALESCE(tr.blocked_tasks, 0) > 0                    THEN 'project_at_risk'
      ELSE 'project_on_track'
    END AS kind,
    CASE
      WHEN p.end_date IS NOT NULL AND p.end_date < CURRENT_DATE THEN 'critical'
      WHEN COALESCE(tr.overdue_tasks, 0) > 0
        OR COALESCE(tr.blocked_tasks, 0) > 0                    THEN 'warning'
      ELSE 'info'
    END AS severity,
    CASE
      WHEN p.end_date IS NOT NULL AND p.end_date < CURRENT_DATE THEN 'overdue'
      WHEN COALESCE(tr.overdue_tasks, 0) > 0
        OR COALESCE(tr.blocked_tasks, 0) > 0                    THEN 'at_risk'
      ELSE 'on_track'
    END AS bucket,
    p.id::text AS entity_id,
    p.name AS title,
    COALESCE(cp.property_name, 'Project') AS subtitle,
    CASE
      WHEN p.end_date IS NOT NULL AND p.end_date < CURRENT_DATE
        THEN 'Deadline was ' || to_char(p.end_date, 'DD Mon') || ', '
             || (COALESCE(tr.total_tasks, 0) - COALESCE(tr.done_tasks, 0))::text || ' tasks open'
      WHEN COALESCE(tr.overdue_tasks, 0) > 0
        THEN COALESCE(tr.overdue_tasks, 0)::text || ' tasks overdue'
      WHEN COALESCE(tr.blocked_tasks, 0) > 0
        THEN COALESCE(tr.blocked_tasks, 0)::text || ' tasks blocked'
      WHEN p.end_date IS NOT NULL THEN 'Due ' || to_char(p.end_date, 'DD Mon')
      ELSE 'No deadline set'
    END AS reason,
    COALESCE(tr.done_tasks, 0)::text || ' / ' || COALESCE(tr.total_tasks, 0)::text AS meta,
    COALESCE(mr.milestones, '[]'::json)::text AS meta_secondary,
    p.end_date AS due_date,
    'open_project'::text AS action,
    NULL::text AS customer_id,
    p.property_id::text AS property_id,
    p.id::text AS project_id,
    CASE
      WHEN p.end_date IS NOT NULL AND p.end_date < CURRENT_DATE THEN 1
      WHEN COALESCE(tr.overdue_tasks, 0) > 0 THEN 2
      ELSE 3
    END AS rank
  FROM my_projects p
  LEFT JOIN task_rollup      tr ON tr.project_id = p.id
  LEFT JOIN milestone_rollup mr ON mr.project_id = p.id
  LEFT JOIN customer_properties cp ON cp.id = p.property_id
  WHERE p.status IN ('planning', 'active')
)
SELECT
  s.*,
  COUNT(*)     OVER (PARTITION BY s.bucket)                                        AS bucket_total,
  ROW_NUMBER() OVER (PARTITION BY s.bucket ORDER BY s.rank, s.due_date NULLS LAST) AS rn
FROM scoped s
ORDER BY s.rank, s.due_date NULLS LAST
`;
  }
}
```

- [ ] **Step 2: Check the milestone JSON and the task maths**

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8085/api/v1/dashboard/my-work \
  | jq '.sections.projects.buckets[].items[] | {title, meta, milestones: (.metaSecondary | fromjson)}'
```

Expected: `meta` reads `"14 / 23"`, and `milestones` is an array of objects with
`name/done/total/overdue/blocked/state`. Confirm that for at least one project the `done`
values across milestones do not exceed the project's `total` in `meta`.

- [ ] **Step 3: Confirm no task list leaked**

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8085/api/v1/dashboard/my-work \
  | jq '.sections.projects' | grep -ci '"taskId"\|"tasks":\s*\[' || echo "no task list — correct"
```

Expected: `no task list — correct`. Spec §17 forbids shipping individual tasks to this screen.

- [ ] **Step 4: Commit**

```bash
npm run typecheck && npm run lint
git add apps/backend/src/modules/dashboard/providers/projects.provider.ts
git commit -m "feat(dashboard): project health from live task counts

progress_percentage is written by hand and drifts, so done/total is
derived. Milestones are the name written on each task, not a table, so a
milestone with no tasks correctly does not appear."
```

---

## Task 8: Finance provider

**Files:**
- Modify: `apps/backend/src/modules/dashboard/providers/finance.provider.ts`

**Interfaces:**
- Consumes: `MY_PROJECTS_CTE`, `withCtes` (Task 2); `ProviderRow`, `toSection` (Task 4).
- Produces: buckets keyed `payment_overdue`, `payment_due_soon`.

**Only `v_milestone_balance` may be read.** Seven finance endpoints still query pre-cutover
tables that stopped being written at cutover — `/dashboard`, `/receipts`, `/expenses`,
`/outstanding`, `/customers/ar`, `/vendors/spend`, `/projects/profitability`. Do not call any
of them and do not query `payments`, `project_payment_terms` or `project_expenses`.

The view's 15 columns are fixed: `milestone_id, project_id, display_order, name, stage, status,
payer_type, due_date, expected_paise, allocated_paise, balance_paise, over_allocated_paise,
derived_status, days_overdue, entry_count`. There is **no** `customer_id` and no
`organization_id` on it, so the project join is how you reach a name.

- [ ] **Step 1: Replace the file**

```ts
// apps/backend/src/modules/dashboard/providers/finance.provider.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { MY_PROJECTS_CTE, withCtes } from '../services/scope.sql';
import type { DashboardProvider, OkSection } from './provider.types';
import { type ProviderRow, toSection } from './section-shaping';

const CAP = 3;

/** The existing payment due-soon horizon. Deliberately 3, not 7 — see the spec. */
const MILESTONE_DUE_SOON_DAYS = 3;

/**
 * Below one rupee is rounding residue, not a debt.
 *
 * A schedule splits a contract by percentage, so the final milestone regularly
 * lands a few paise out. `project-attention.service.ts:50` sets the same floor
 * for the same reason: a warning reading "₹0 short" teaches people to stop
 * reading the section it sits in.
 */
const MIN_OUTSTANDING_PAISE = 100;

const BUCKET_LABELS: Record<string, string> = {
  payment_overdue: 'Overdue',
  payment_due_soon: 'Due soon',
};

/** Same formatter, same options as project-attention.service.ts:287. */
function formatInr(rupees: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

@Injectable()
export class FinanceProvider implements DashboardProvider {
  readonly key = 'finance' as const;

  constructor(private readonly dataSource: DataSource) {}

  async load(userId: string): Promise<OkSection> {
    const rows: (ProviderRow & { balance_paise: string })[] = await this.dataSource.query(
      this.sql(),
      [userId],
    );

    // Substitute the formatted amount before shaping. The SQL emits a literal
    // '{amount}' placeholder so the money string is built in exactly one place.
    const formatted = rows.map((row) => {
      const amount = formatInr(Number(row.balance_paise) / 100);
      return {
        ...row,
        meta: (row.meta ?? '').replace('{amount}', amount),
        reason: row.reason.replace('{amount}', amount),
      };
    });

    return toSection(formatted, CAP, BUCKET_LABELS);
  }

  private sql(): string {
    return `
${withCtes(MY_PROJECTS_CTE)},

scoped AS (
  SELECT
    CASE WHEN v.days_overdue > 0 THEN 'payment_overdue' ELSE 'payment_due_soon' END AS kind,
    CASE WHEN v.days_overdue > 0 THEN 'critical' ELSE 'warning' END                 AS severity,
    CASE WHEN v.days_overdue > 0 THEN 'payment_overdue' ELSE 'payment_due_soon' END AS bucket,
    v.milestone_id::text AS entity_id,
    p.name AS title,
    v.name || ' milestone' AS subtitle,
    -- Money is formatted in TypeScript, below. '₹' is not a to_char token, and
    -- Indian digit grouping is not one either — Intl.NumberFormat('en-IN') does
    -- both, and it is what project-attention.service.ts:287 already uses, so the
    -- dashboard and the project page render the same figure identically.
    CASE
      WHEN v.days_overdue > 0
        THEN '{amount} short, ' || v.days_overdue::text || ' days overdue'
      ELSE 'Due in ' || GREATEST((v.due_date - CURRENT_DATE), 0)::text || ' days'
    END AS reason,
    '{amount}' AS meta,
    v.balance_paise,
    NULL::text AS meta_secondary,
    v.due_date,
    'open_payments'::text AS action,
    NULL::text AS customer_id,
    NULL::text AS property_id,
    v.project_id::text AS project_id,
    CASE WHEN v.days_overdue > 0 THEN 1 ELSE 2 END AS rank
  FROM v_milestone_balance v
  JOIN my_projects p ON p.id = v.project_id
  WHERE v.status = 'active'
    AND v.balance_paise >= ${MIN_OUTSTANDING_PAISE}
    AND (
      v.days_overdue > 0
      OR (v.due_date IS NOT NULL AND v.due_date <= CURRENT_DATE + ${MILESTONE_DUE_SOON_DAYS})
    )
)
SELECT
  s.*,
  COUNT(*)     OVER (PARTITION BY s.bucket)                                                   AS bucket_total,
  ROW_NUMBER() OVER (PARTITION BY s.bucket ORDER BY s.rank, s.due_date NULLS LAST)            AS rn
FROM scoped s
ORDER BY s.rank, s.due_date NULLS LAST
`;
  }
}
```

- [ ] **Step 2: Cross-check one amount against the project's own Finance tab**

Pick a milestone the endpoint returns:

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8085/api/v1/dashboard/my-work \
  | jq -r '.sections.finance.buckets[].items[] | "\(.params.projectId) \(.title) \(.meta)"'
```

Then open that project in the browser at `http://localhost:3001/projects/<projectId>?tab=payments`
and confirm the outstanding figure matches to the rupee.

**This is the check that matters most in this task.** A finance figure that looks right in JSON
and disagrees with the screen the customer is shown is the exact failure this module already
had once.

- [ ] **Step 3: Confirm no dead table was touched**

```bash
grep -nE "payments|project_payment_terms|project_expenses" \
  apps/backend/src/modules/dashboard/providers/finance.provider.ts \
  | grep -v payment_milestones | grep -v open_payments || echo "clean — only the view is read"
```

Expected: `clean — only the view is read`.

- [ ] **Step 4: Commit**

```bash
npm run typecheck && npm run lint
git add apps/backend/src/modules/dashboard/providers/finance.provider.ts
git commit -m "feat(dashboard): money to chase, from the ledger view only

v_milestone_balance is the single definition of what is still owed. The
seven endpoints still reading pre-cutover tables are untouched, so no
frozen figure reaches this screen. Sub-rupee balances are excluded: they
are rounding residue and render as a meaningless zero."
```

---

## Task 9: Web data layer — query keys and the one fetch

**Files:**
- Create: `apps/web/components/features/dashboard/hooks/dashboard-keys.ts`
- Create: `apps/web/components/features/dashboard/hooks/use-my-work.ts`
- Create: `apps/web/components/features/dashboard/hooks/index.ts`

**Interfaces:**
- Consumes: `MyWorkResponse` from `@tejas96/shared/types` (Task 1).
- Produces: `dashboardKeys.myWork()`, and
  `useMyWork(): UseQueryResult<MyWorkResponse, AxiosError>`.

The house convention for a hand-written feature hook is in
`components/features/followups/hooks/use-followup-summary.ts` — `'use client'`, an explicit
`UseQueryResult<T, AxiosError>` return annotation, `apiClient.get<T>` directly. `apiClient`
already carries the `api/v1` base and attaches the bearer token from the cookie, so the path
here is `/dashboard/my-work`.

- [ ] **Step 1: Create the key factory**

```ts
// apps/web/components/features/dashboard/hooks/dashboard-keys.ts

/**
 * One root so completing a follow-up on the dashboard can invalidate the whole
 * screen in a single call. A card whose count survived the action it just
 * performed is the fastest way to make people stop trusting the page.
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  myWork: () => [...dashboardKeys.all, 'my-work'] as const,
};
```

- [ ] **Step 2: Create the hook**

```ts
// apps/web/components/features/dashboard/hooks/use-my-work.ts
'use client';

import type { MyWorkResponse } from '@tejas96/shared/types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { dashboardKeys } from './dashboard-keys';

import { apiClient } from '@/lib/api/client';

/**
 * The whole dashboard, in one request.
 *
 * Deliberately not five calls: this is the first screen after login, and five
 * round trips is five chances to show a half-drawn page. The backend already
 * degrades one section at a time, so a single request loses nothing.
 *
 * No `staleTime` override — the provider default of 60s is right here. A stale
 * "needs attention" list is worse than a slow one, and we do not cache further.
 */
export function useMyWork(): UseQueryResult<MyWorkResponse, AxiosError> {
  return useQuery({
    queryKey: dashboardKeys.myWork(),
    queryFn: async () => {
      const { data } = await apiClient.get<MyWorkResponse>('/dashboard/my-work');
      return data;
    },
  });
}
```

- [ ] **Step 3: Create the hooks barrel**

```ts
// apps/web/components/features/dashboard/hooks/index.ts
export { dashboardKeys } from './dashboard-keys';
export { useMyWork } from './use-my-work';
```

- [ ] **Step 4: Commit**

```bash
npm run typecheck && npm run lint
git add apps/web/components/features/dashboard/hooks
git commit -m "feat(dashboard): one query for the whole screen"
```

---

## Task 10: Action → route map

**Files:**
- Create: `apps/web/components/features/dashboard/lib/action-routes.ts`

**Interfaces:**
- Consumes: `DashboardItem`, `DashboardAction` (Task 1); `ROUTES` from `@/lib/config/routes`.
- Produces: `resolveAction(item: DashboardItem): ActionTarget`, where
  ```ts
  type ActionTarget =
    | { mode: 'navigate'; href: string; label: string }
    | { mode: 'dialog'; dialog: 'followup'; label: string };
  ```

**This is the only place a dashboard URL is built.** Routes live in `lib/config/routes.ts`; the
backend deliberately sends an intent rather than a path so a moved route cannot rot a string
buried in a SQL file.

Two facts to respect, both verified: there is **no `ROUTES.PROPERTIES.LIST`**, and there is
**no `ROUTES.FOLLOWUPS.DETAIL`** — only `FOLLOWUPS.LIST`.

- [ ] **Step 1: Create the file**

```ts
// apps/web/components/features/dashboard/lib/action-routes.ts
import type { DashboardItem } from '@tejas96/shared/types';

import { ROUTES } from '@/lib/config/routes';

export type ActionTarget =
  | { mode: 'navigate'; href: string; label: string }
  | { mode: 'dialog'; dialog: 'followup'; label: string };

const LABELS: Record<DashboardItem['action'], string> = {
  add_property: 'Add property',
  open_property: 'Open property',
  complete_survey: 'Complete survey',
  create_quote: 'Create quote',
  open_quote: 'Open quote',
  convert_to_project: 'Convert to project',
  complete_followup: 'Complete',
  open_service: 'Open request',
  open_project: 'Open project',
  open_payments: 'Open payments',
};

function withId(template: string, id: string): string {
  return template.replace('[id]', id);
}

/**
 * Where an item's single action goes.
 *
 * `complete_followup` is the one action that does not navigate: completing a
 * follow-up needs an outcome and usually a next follow-up, so it opens the
 * dialog the followups feature already owns.
 */
export function resolveAction(item: DashboardItem): ActionTarget {
  const label = LABELS[item.action];
  const { params } = item;

  switch (item.action) {
    case 'add_property':
      // The onboarding wizard switches to "create-site" mode when it is given a
      // customerId, which is exactly the missing-property case.
      return {
        mode: 'navigate',
        href: `${ROUTES.ONBOARDING.NEW}?customerId=${encodeURIComponent(params.customerId ?? '')}`,
        label,
      };

    case 'open_property':
    case 'complete_survey':
      return {
        mode: 'navigate',
        href: withId(ROUTES.PROPERTIES.DETAIL, params.propertyId ?? params.id),
        label,
      };

    case 'create_quote': {
      const search = new URLSearchParams();
      if (params.customerId) search.set('customerId', params.customerId);
      if (params.propertyId) search.set('propertyId', params.propertyId);
      return { mode: 'navigate', href: `${ROUTES.QUOTES.NEW}?${search.toString()}`, label };
    }

    case 'open_quote':
      return { mode: 'navigate', href: withId(ROUTES.QUOTES.DETAIL, params.id), label };

    case 'convert_to_project':
      // There is no dedicated convert screen. The quote page owns the action, so
      // this opens the quote rather than inventing a route.
      return { mode: 'navigate', href: withId(ROUTES.QUOTES.DETAIL, params.id), label };

    case 'open_service':
      return { mode: 'navigate', href: withId(ROUTES.SERVICE.DETAIL, params.id), label };

    case 'open_project':
      return { mode: 'navigate', href: withId(ROUTES.PROJECTS.DETAIL, params.id), label };

    case 'open_payments':
      return {
        mode: 'navigate',
        href: `${withId(ROUTES.PROJECTS.DETAIL, params.projectId ?? params.id)}?tab=payments`,
        label,
      };

    case 'complete_followup':
      return { mode: 'dialog', dialog: 'followup', label };
  }
}

/** Where a section's overflow link goes. The two mixed sections open a drawer instead. */
export const SECTION_OVERFLOW: Record<
  string,
  { kind: 'route'; href: string; label: string } | { kind: 'drawer'; label: string }
> = {
  workflow: { kind: 'drawer', label: 'View all' },
  needsAttention: { kind: 'drawer', label: 'View all' },
  followups: { kind: 'route', href: ROUTES.FOLLOWUPS.LIST, label: 'Open follow-ups' },
  service: { kind: 'route', href: ROUTES.SERVICE.HOME, label: 'Open service' },
  projects: { kind: 'route', href: ROUTES.PROJECTS.LIST, label: 'Open projects' },
  finance: { kind: 'route', href: ROUTES.FINANCE.HOME, label: 'Open finance' },
};
```

- [ ] **Step 2: Confirm every route referenced exists**

```bash
cd apps/web && grep -nE "ONBOARDING|PROPERTIES|QUOTES|SERVICE|PROJECTS|FOLLOWUPS|FINANCE" \
  lib/config/routes.ts | grep -E "NEW:|DETAIL:|HOME:|LIST:"
```

Expected: every constant used above appears. **`PROPERTIES` has only `DETAIL` and `EDIT`** — if
you reached for `PROPERTIES.LIST`, it does not exist.

- [ ] **Step 3: Commit**

```bash
npm run typecheck && npm run lint
git add apps/web/components/features/dashboard/lib/action-routes.ts
git commit -m "feat(dashboard): resolve an item's intent against the real route table

The backend sends what to open, not where. Paths live in routes.ts, so a
moved route is a compile error here rather than a dead link discovered by
a customer."
```

---

## Task 11: The row and the section card

**Files:**
- Create: `apps/web/components/features/dashboard/components/dashboard-row.tsx`
- Create: `apps/web/components/features/dashboard/components/project-row.tsx`
- Create: `apps/web/components/features/dashboard/components/section-card.tsx`

**Interfaces:**
- Consumes: `DashboardItem`, `DashboardSection` (Task 1); `resolveAction` (Task 10);
  `useGatedAction` from `@/lib/rbac`.
- Produces:
  ```tsx
  function DashboardRow(props: { item: DashboardItem; onCompleteFollowup: (item: DashboardItem) => void }): React.JSX.Element
  function SectionCard(props: {
    label: string; section: DashboardSection; aside?: string;
    overflow?: { label: string; onClick?: () => void; href?: string };
    emptyMessage: string; skeletonRows: number;
    children: (items: DashboardItem[]) => React.ReactNode;
  }): React.JSX.Element
  ```

**Design rules this must honour** (all verified against the approved artboard):
- **No borders on cards. No dividers between rows. No coloured edge bar. No row tint at rest.**
  Urgency is carried by the section label and the reason text, nothing else.
- Rows separate by spacing and weight only. Hover changes background, never layout.
- Money, counts, dates and times use tabular numerals.
- **Never `disabled` on a gated button.** `use-gated-action.ts:21-27`: a disabled button
  swallows the click, so the access dialog never opens. `aria-disabled` plus muting.

- [ ] **Step 1: Create the row**

```tsx
// apps/web/components/features/dashboard/components/dashboard-row.tsx
'use client';

import type { DashboardItem } from '@tejas96/shared/types';
import { ArrowRight, Lock } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { resolveAction } from '../lib/action-routes';

import { ALWAYS_OPEN, useGatedAction, type Gate } from '@/lib/rbac';
import { cn } from '@/lib/utils';

const SEVERITY_TEXT: Record<DashboardItem['severity'], string> = {
  critical: 'text-danger',
  warning: 'text-warning',
  info: 'text-foreground-secondary',
};

interface DashboardRowProps {
  item: DashboardItem;
  onCompleteFollowup: (item: DashboardItem) => void;
}

/**
 * One row, used unchanged by every block AND by the drawer.
 *
 * There is no coloured edge bar and no row tint. An earlier draft had both; the
 * approved design carries urgency in the section label and the reason line only,
 * because colour on every row is colour nowhere.
 */
export function DashboardRow({ item, onCompleteFollowup }: DashboardRowProps): React.JSX.Element {
  const target = resolveAction(item);
  const gate = (item.gate ?? ALWAYS_OPEN) as Gate;

  const performAction = React.useCallback(() => {
    if (target.mode === 'dialog') {
      onCompleteFollowup(item);
    }
  }, [target, item, onCompleteFollowup]);

  const { allowed, onGatedClick } = useGatedAction(gate, performAction, target.label);

  const body = (
    <>
      <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
      {item.subtitle ? (
        <span className="mt-0.5 truncate text-xs text-foreground-tertiary">{item.subtitle}</span>
      ) : null}
    </>
  );

  return (
    <div className="group grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-background-tertiary">
      <div className="flex min-w-0 flex-col">{body}</div>

      <p className={cn('min-w-0 text-xs leading-snug', SEVERITY_TEXT[item.severity])}>
        {item.reason}
      </p>

      <div className="text-right tabular-nums">
        {item.meta ? (
          <div className="text-xs text-foreground-secondary">{item.meta}</div>
        ) : null}
        {item.metaSecondary && item.kind.startsWith('service') ? (
          <div className="mt-0.5 text-2xs uppercase tracking-wide text-foreground-tertiary">
            {item.metaSecondary}
          </div>
        ) : null}
      </div>

      {/* A blocked action stays VISIBLE and clickable — it opens the dialog that
          names the permission. `disabled` would swallow that click. */}
      {target.mode === 'navigate' && allowed ? (
        <Link
          href={target.href}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-pill px-3 text-xs font-medium text-foreground-secondary transition-colors group-hover:bg-accent-subtle group-hover:text-accent-ink"
        >
          {target.label}
          <ArrowRight className="size-3" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={onGatedClick}
          aria-disabled={!allowed}
          className={cn(
            'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-pill px-3 text-xs font-medium transition-colors',
            allowed
              ? 'text-foreground-secondary group-hover:bg-accent-subtle group-hover:text-accent-ink'
              : 'cursor-not-allowed bg-background-tertiary text-foreground-secondary',
          )}
        >
          {!allowed ? <Lock className="size-3" /> : null}
          {target.label}
          {allowed ? <ArrowRight className="size-3" /> : null}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the section card, with all three states**

```tsx
// apps/web/components/features/dashboard/components/section-card.tsx
'use client';

import type { DashboardItem, DashboardSection } from '@tejas96/shared/types';
import { RotateCw } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

type Tone = 'critical' | 'warning' | 'info' | 'neutral';

const LABEL_TONE: Record<Tone, string> = {
  critical: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
  neutral: 'text-foreground-secondary',
};

interface SectionCardProps {
  label: string;
  tone?: Tone;
  section: DashboardSection;
  /** e.g. "2 overdue shown above". */
  aside?: string;
  overflow?: { label: string; href?: string; onClick?: () => void };
  emptyMessage: string;
  skeletonRows: number;
  onRetry?: () => void;
  children: (items: DashboardItem[]) => React.ReactNode;
}

export function SectionCard({
  label,
  tone = 'neutral',
  section,
  aside,
  overflow,
  emptyMessage,
  skeletonRows,
  onRetry,
  children,
}: SectionCardProps): React.JSX.Element {
  const total = section.status === 'ok' ? section.total : 0;
  const items =
    section.status === 'ok' ? section.buckets.flatMap((bucket) => bucket.items) : [];

  return (
    <section className="rounded-r-sm bg-surface p-5 shadow-e2">
      <header className="flex items-baseline gap-2.5 pb-2">
        <h2
          className={cn(
            'text-section font-semibold uppercase tracking-wide',
            LABEL_TONE[tone],
          )}
        >
          {label}
          {section.status === 'ok' ? ` · ${total}` : ''}
        </h2>
        {aside ? (
          <span className="ml-auto text-2xs text-foreground-tertiary">{aside}</span>
        ) : null}
      </header>

      {/* BROKEN — this card only. Every other card on the page still draws. */}
      {section.status === 'error' ? (
        <div className="flex items-center gap-3 py-4">
          <p className="text-sm text-foreground-secondary">
            {label} could not be loaded. Nothing else on this page is affected.
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-7 items-center gap-1.5 rounded-pill bg-accent-subtle px-3 text-xs font-medium text-accent-ink"
            >
              <RotateCw className="size-3" />
              Retry
            </button>
          ) : null}
        </div>
      ) : items.length === 0 ? (
        /* EMPTY — quiet. An empty section is good news, not an alarm. */
        <p className="py-4 text-sm text-foreground-tertiary">{emptyMessage}</p>
      ) : (
        <>
          <div className="flex flex-col gap-0.5">{children(items)}</div>
          {overflow ? (
            <div className="pt-2">
              {overflow.href ? (
                <Link href={overflow.href} className="text-xs font-medium text-link">
                  {overflow.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={overflow.onClick}
                  className="text-xs font-medium text-link"
                >
                  {overflow.label}
                </button>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

/**
 * LOADING — skeleton rows that match the real row grid exactly, so nothing on
 * the page moves when the data lands.
 */
export function SectionSkeleton({ rows }: { rows: number }): React.JSX.Element {
  return (
    <section className="rounded-r-sm bg-surface p-5 shadow-e2">
      <Skeleton className="h-3 w-32" />
      <div className="mt-4 flex flex-col gap-0.5">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-3"
          >
            <div>
              <Skeleton className="h-3 w-36" />
              <Skeleton className="mt-2 h-2.5 w-24" />
            </div>
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-7 w-24 rounded-pill" />
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2b: Create the project row — the milestone chips**

`ProjectsProvider` puts the milestone rollup in `metaSecondary` as JSON. `DashboardRow` renders
`metaSecondary` only for service kinds, so **without this file the milestone chips never
appear** — and "see which milestone is in trouble without opening anything" is the whole point
of the project block.

```tsx
// apps/web/components/features/dashboard/components/project-row.tsx
'use client';

import type { DashboardItem } from '@tejas96/shared/types';
import { ArrowRight, Check, CircleDashed, Clock, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { resolveAction } from '../lib/action-routes';

import { cn } from '@/lib/utils';

interface Milestone {
  name: string;
  done: number;
  total: number;
  overdue: number;
  blocked: number;
  state: 'complete' | 'progress' | 'risk' | 'none';
}

const CHIP: Record<Milestone['state'], { cls: string; Icon: typeof Check }> = {
  complete: { cls: 'bg-success/10 text-success', Icon: Check },
  progress: { cls: 'bg-info/10 text-info', Icon: Clock },
  risk: { cls: 'bg-warning/10 text-warning', Icon: TriangleAlert },
  none: { cls: 'bg-background-tertiary text-foreground-secondary', Icon: CircleDashed },
};

/** Tolerant of a malformed payload: a broken chip row must not blank the card. */
function parseMilestones(raw: string | undefined): Milestone[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Milestone[]) : [];
  } catch {
    return [];
  }
}

export function ProjectRow({ item }: { item: DashboardItem }): React.JSX.Element {
  const target = resolveAction(item);
  const milestones = parseMilestones(item.metaSecondary);

  return (
    <div className="group flex flex-col gap-2 rounded-lg px-3 py-3 transition-colors hover:bg-background-tertiary">
      <div className="flex items-baseline gap-3">
        <span className="flex-1 truncate text-sm font-medium text-foreground">{item.title}</span>
        <span
          className={cn(
            'text-xs',
            item.severity === 'critical'
              ? 'text-danger'
              : item.severity === 'warning'
                ? 'text-warning'
                : 'text-foreground-secondary',
          )}
        >
          {item.reason}
        </span>
        <span className="text-xs tabular-nums text-foreground-secondary">
          {item.meta} tasks done
        </span>
        {target.mode === 'navigate' ? (
          <Link
            href={target.href}
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-pill px-3 text-xs font-medium text-foreground-secondary transition-colors group-hover:bg-accent-subtle group-hover:text-accent-ink"
          >
            Open
            <ArrowRight className="size-3" />
          </Link>
        ) : null}
      </div>

      {milestones.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {milestones.map((milestone) => {
            const { cls, Icon } = CHIP[milestone.state] ?? CHIP.none;
            const trouble =
              milestone.overdue > 0
                ? ` · ${milestone.overdue} overdue`
                : milestone.blocked > 0
                  ? ` · ${milestone.blocked} blocked`
                  : '';
            return (
              <span
                key={milestone.name}
                className={cn('inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-2xs font-medium', cls)}
              >
                <Icon className="size-3" />
                {`${milestone.name} ${milestone.done}/${milestone.total}${trouble}`}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Confirm the design-system class names exist**

Some of the classes above are only valid if the token bridge defines them. Check:

```bash
cd apps/web && grep -nE "'r-sm'|rounded-pill|accent-subtle|accent-ink|background-tertiary|text-section|text-2xs|shadow-e2|foreground-tertiary|text-link|text-danger|text-warning|text-info" tailwind.config.ts lib/theme/tokens.ts | head -30
```

For any class that does **not** resolve, substitute the nearest one that does and note the
substitution in the commit message. Do **not** add a raw hex value.

- [ ] **Step 4: Commit**

```bash
npm run typecheck && npm run lint
git add apps/web/components/features/dashboard/components/dashboard-row.tsx apps/web/components/features/dashboard/components/section-card.tsx
git commit -m "feat(dashboard): the row and the card, with all three states

No borders, no dividers, no edge bars, no row tints — urgency is the
section label and the reason line, which is what makes the page scannable.
A blocked action keeps its click so the access dialog can explain itself."
```

---

## Task 12: The critical lift and the page

**Files:**
- Create: `apps/web/components/features/dashboard/lib/lift.ts`
- Create: `apps/web/components/features/dashboard/components/my-work-page.tsx`
- Modify: `apps/web/components/features/dashboard/index.ts`
- Modify: `apps/web/app/(dashboard)/page.tsx`
- Delete: `apps/web/components/features/dashboard/components/dashboard-overview.tsx`

**Interfaces:**
- Consumes: everything from Tasks 9–11.
- Produces: `liftCritical(sections)` returning
  `{ critical: DashboardItem[]; rest: Record<SectionKey, DashboardSection>; liftedBySection: Record<SectionKey, number> }`,
  and `MyWorkPage`.

**The lift, and its one exception.** Critical items move to the Needs Attention block and leave
their own section, so nothing appears twice (spec §6.2). **Project health does not lift** — it is
a per-project summary, and removing the overdue projects from it would leave a block that only
ever describes healthy ones. That is the single deliberate repeat on the page.

**Counts are not affected.** Every section's badge keeps its full `total`; only the *rendering*
moves. The aside says how many were lifted.

- [ ] **Step 1: Create the lift**

```ts
// apps/web/components/features/dashboard/lib/lift.ts
import type { DashboardItem, DashboardSection, MyWorkResponse } from '@tejas96/shared/types';

export type SectionKey = keyof MyWorkResponse['sections'];

/** Project health keeps its critical rows. See the block comment below. */
const DOES_NOT_LIFT: ReadonlySet<SectionKey> = new Set<SectionKey>(['projects']);

export interface LiftResult {
  critical: DashboardItem[];
  rest: Record<SectionKey, DashboardSection>;
  liftedBySection: Record<SectionKey, number>;
}

/**
 * Move critical items into the top block.
 *
 * This is a RENDERING rule, not a query rule. Every section's `total` is left
 * exactly as the backend reported it, so a badge always describes the whole set
 * even when the card beneath it shows what is left after the lift.
 *
 * `projects` is exempt: it is a per-project health summary rather than a list of
 * items, and lifting its overdue projects away would leave a block that only
 * ever shows projects that are fine — the opposite of its purpose. An overdue
 * project therefore appears twice on purpose, and the block says so.
 */
export function liftCritical(sections: MyWorkResponse['sections']): LiftResult {
  const critical: DashboardItem[] = [];
  const rest = {} as Record<SectionKey, DashboardSection>;
  const liftedBySection = {} as Record<SectionKey, number>;

  (Object.keys(sections) as SectionKey[]).forEach((key) => {
    const section = sections[key];
    liftedBySection[key] = 0;

    if (section.status !== 'ok' || DOES_NOT_LIFT.has(key)) {
      rest[key] = section;
      return;
    }

    let lifted = 0;
    const buckets = section.buckets
      .map((bucket) => {
        const keep = bucket.items.filter((item) => {
          if (item.severity !== 'critical') return true;
          critical.push(item);
          lifted += 1;
          return false;
        });
        return { ...bucket, items: keep };
      })
      // A bucket whose every item lifted is empty BY CONSTRUCTION — every
      // overdue item is critical — so rendering its header would be dead UI.
      .filter((bucket) => bucket.items.length > 0);

    liftedBySection[key] = lifted;
    rest[key] = { ...section, buckets };
  });

  const order = { critical: 0, warning: 1, info: 2 } as const;
  critical.sort((a, b) => {
    const bySeverity = order[a.severity] - order[b.severity];
    if (bySeverity !== 0) return bySeverity;
    const aDue = a.dueDate ? Date.parse(a.dueDate) : Number.POSITIVE_INFINITY;
    const bDue = b.dueDate ? Date.parse(b.dueDate) : Number.POSITIVE_INFINITY;
    return aDue - bDue;
  });

  return { critical, rest, liftedBySection };
}

/** "2 overdue shown above" — or nothing, when none were lifted. */
export function liftedAside(count: number, noun = 'critical'): string | undefined {
  if (count === 0) return undefined;
  return `${count} ${noun} shown above`;
}
```

- [ ] **Step 2: Create the page**

```tsx
// apps/web/components/features/dashboard/components/my-work-page.tsx
'use client';

import type { DashboardItem } from '@tejas96/shared/types';
import { AlertCircle, CalendarCheck, CalendarDays } from 'lucide-react';
import * as React from 'react';

import { useMyWork } from '../hooks';
import { liftCritical, liftedAside } from '../lib/lift';
import { SECTION_OVERFLOW } from '../lib/action-routes';
import { DashboardRow } from './dashboard-row';
import { ProjectRow } from './project-row';
import { SectionCard, SectionSkeleton } from './section-card';

import { Typography } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

const CAP = { attention: 6, workflow: 5, followups: 5, service: 5, projects: 4, money: 3 };

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function MyWorkPage(): React.JSX.Element {
  const { user } = useAuth();
  const { data, isPending, isError, refetch } = useMyWork();
  const [followupItem, setFollowupItem] = React.useState<DashboardItem | null>(null);

  // Rendered only after mount so the server and client agree on the greeting —
  // the same guard the old DashboardOverview used.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (isPending) {
    return (
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_304px]">
        <div className="flex flex-col gap-4">
          <SectionSkeleton rows={6} />
          <SectionSkeleton rows={5} />
          <SectionSkeleton rows={5} />
        </div>
        <div className="flex flex-col gap-4">
          <SectionSkeleton rows={3} />
          <SectionSkeleton rows={3} />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-r-sm bg-surface p-6 shadow-e2">
        <Typography variant="body">
          Your dashboard could not be loaded.{' '}
          <button type="button" onClick={() => void refetch()} className="text-link underline">
            Try again
          </button>
        </Typography>
      </div>
    );
  }

  const { critical, rest, liftedBySection } = liftCritical(data.sections);
  const { summary } = data;
  const name = user?.firstName ?? '';

  const renderRows =
    (cap: number) =>
    (items: DashboardItem[]): React.ReactNode =>
      items
        .slice(0, cap)
        .map((item) => (
          <DashboardRow key={item.id} item={item} onCompleteFollowup={setFollowupItem} />
        ));

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_304px]">
      <div className="flex flex-col gap-4">
        {/* 1. Greeting */}
        <section className="relative overflow-hidden rounded-r-sm bg-surface p-6 shadow-e2">
          <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-end gap-3">
            <Typography variant="h2">
              {mounted ? greeting(new Date().getHours()) : 'Welcome'}
              {name ? `, ${name}` : ''}
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
          <p className="relative mt-2 text-sm text-foreground-secondary">
            <span className="font-medium text-danger">{summary.overdue} overdue</span>
            {` · ${summary.dueToday} due today · ${summary.dueThisWeek} more this week`}
          </p>
        </section>

        {/* 2. Needs attention — critical only, gathered from every section */}
        <SectionCard
          label="Needs attention"
          tone="critical"
          section={{
            status: 'ok',
            total: critical.length,
            criticalCount: critical.length,
            buckets: [{ key: 'critical', label: 'Critical', count: critical.length, items: critical }],
          }}
          emptyMessage="Nothing critical right now."
          skeletonRows={6}
          overflow={
            critical.length > CAP.attention
              ? { label: `View all ${critical.length}` }
              : undefined
          }
        >
          {renderRows(CAP.attention)}
        </SectionCard>

        {/* 3. Workflow stuck */}
        <SectionCard
          label="Workflow stuck"
          tone="warning"
          section={rest.workflow}
          aside={liftedAside(liftedBySection.workflow)}
          emptyMessage="No leads are stuck."
          skeletonRows={5}
          onRetry={() => void refetch()}
          overflow={SECTION_OVERFLOW.workflow.kind === 'drawer' ? { label: 'View all' } : undefined}
        >
          {renderRows(CAP.workflow)}
        </SectionCard>

        {/* 4. Follow-ups */}
        <SectionCard
          label="Follow-ups"
          tone="info"
          section={rest.followups}
          aside={liftedAside(liftedBySection.followups, 'overdue')}
          emptyMessage="No follow-ups need attention."
          skeletonRows={5}
          onRetry={() => void refetch()}
          overflow={{ label: 'Open follow-ups', href: SECTION_OVERFLOW.followups.kind === 'route' ? SECTION_OVERFLOW.followups.href : undefined }}
        >
          {renderRows(CAP.followups)}
        </SectionCard>

        {/* 5. Service requests */}
        <SectionCard
          label="Service requests"
          tone="info"
          section={rest.service}
          aside={liftedAside(liftedBySection.service, 'overdue')}
          emptyMessage="No service requests need you."
          skeletonRows={5}
          onRetry={() => void refetch()}
          overflow={{ label: 'Open service', href: SECTION_OVERFLOW.service.kind === 'route' ? SECTION_OVERFLOW.service.href : undefined }}
        >
          {renderRows(CAP.service)}
        </SectionCard>

        {/* 6. Project health — does NOT lift; overdue projects appear here AND above */}
        <SectionCard
          label="Project health"
          section={rest.projects}
          aside="overdue projects also appear above"
          emptyMessage="Every project is on track."
          skeletonRows={4}
          onRetry={() => void refetch()}
          overflow={{ label: 'Open projects', href: SECTION_OVERFLOW.projects.kind === 'route' ? SECTION_OVERFLOW.projects.href : undefined }}
        >
          {(items) =>
            items.slice(0, CAP.projects).map((item) => <ProjectRow key={item.id} item={item} />)
          }
        </SectionCard>
      </div>

      <div className="flex flex-col gap-4">
        {/* 7. At a glance — three DISJOINT numbers, summed from the sections */}
        <section className="rounded-r-sm bg-surface p-5 shadow-e2">
          <h2 className="pb-2 text-section font-semibold uppercase tracking-wide text-foreground-secondary">
            At a glance
          </h2>
          {[
            { label: 'Overdue', value: summary.overdue, Icon: AlertCircle, tint: 'bg-danger/10 text-danger' },
            { label: 'Due today', value: summary.dueToday, Icon: CalendarCheck, tint: 'bg-warning/10 text-warning' },
            { label: 'Due this week', value: summary.dueThisWeek, Icon: CalendarDays, tint: 'bg-info/10 text-info' },
          ].map(({ label, value, Icon, tint }) => (
            <div key={label} className="flex min-h-12 items-center gap-3">
              <span className={`flex size-8 items-center justify-center rounded-full ${tint}`}>
                <Icon className="size-4" />
              </span>
              <span className="flex-1 text-sm">{label}</span>
              <span className="text-base font-medium tabular-nums">{value}</span>
            </div>
          ))}
        </section>

        {/* 8. Money to chase */}
        <SectionCard
          label="Money to chase"
          tone="warning"
          section={rest.finance}
          aside={liftedAside(liftedBySection.finance, 'overdue')}
          emptyMessage="No payments are due."
          skeletonRows={3}
          onRetry={() => void refetch()}
          overflow={{ label: 'Open finance', href: SECTION_OVERFLOW.finance.kind === 'route' ? SECTION_OVERFLOW.finance.href : undefined }}
        >
          {renderRows(CAP.money)}
        </SectionCard>
      </div>

      {/* Wired in Task 13. */}
      {followupItem ? null : null}
    </div>
  );
}
```

- [ ] **Step 3: Swap the page over and delete the placeholder**

```ts
// apps/web/components/features/dashboard/index.ts
export { MyWorkPage } from './components/my-work-page';
```

```tsx
// apps/web/app/(dashboard)/page.tsx
import { MyWorkPage } from '@/components/features/dashboard';

/**
 * Dashboard Home Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function DashboardPage(): React.JSX.Element {
  return <MyWorkPage />;
}
```

```bash
git rm apps/web/components/features/dashboard/components/dashboard-overview.tsx
grep -rn "DashboardOverview" apps/web --include='*.ts' --include='*.tsx' | grep -v node_modules
```

Expected: the grep returns nothing. If it finds a reference, update it before continuing.

- [ ] **Step 4: LOOK AT THE PAGE**

```bash
npm run web:dev
```

Open `http://localhost:3001`, sign in, and check by eye:

1. Two columns on a wide window; one column below `xl`.
2. Greeting reads "Good morning, <name>" with the overdue count in red.
3. **The three At-a-glance numbers equal the greeting sentence.** They come from the same
   `summary`, so a mismatch means a rendering bug.
4. **Every section badge is ≥ the rows shown beneath it.**
5. No section shows an "Overdue" bucket header.
6. Cards have no borders and rows have no dividers.
7. Hovering a row changes only its background — nothing moves.
8. **Project health shows milestone chips** under each project, with the worst one marked. If
   the chips are missing, `ProjectRow` is not wired up — the generic row does not draw them.

Report what you actually saw for each of the seven.

- [ ] **Step 5: Commit**

```bash
npm run typecheck && npm run lint
git add -A apps/web/components/features/dashboard apps/web/app/\(dashboard\)/page.tsx
git commit -m "feat(dashboard): the page, and the lift that stops work showing twice

Critical rows gather into the top block and leave their own section, so
the same problem is never offered two buttons. Project health is the one
exception: lifting its overdue projects away would leave a block that only
ever shows healthy ones."
```

---

## Task 13: The drawer and inline follow-up completion

**Files:**
- Create: `apps/web/components/features/dashboard/components/view-all-drawer.tsx`
- Create: `apps/web/components/features/dashboard/hooks/use-followup-for-item.ts`
- Modify: `apps/web/components/features/dashboard/components/my-work-page.tsx`
- Modify: `apps/web/components/features/dashboard/hooks/index.ts`

**Interfaces:**
- Consumes: `DrillDownDrawer` from `@/components/shared/drawers`; `FollowupCompleteDialog` and
  `useFollowups` from `@/components/features/followups`; `DashboardRow` (Task 11);
  `dashboardKeys` (Task 9).
- Produces: `ViewAllDrawer`, and
  `useFollowupForItem(item: DashboardItem | null): { followup: FollowupResponse | null; pendingSiblings: number }`.

**Why the drawer exists.** Four overflow links go to a real screen. The two on *Needs attention*
and *Workflow stuck* cannot: both lists deliberately mix a quote, a property, a follow-up, a
ticket, a project and a payment, and no route renders that mix. The list is mixed but **no row
is** — each already carries its own destination — so the mixed list needs somewhere to live,
not a shared destination. A sheet is not navigation, so the single-page rule holds.

**Why the extra fetch.** `FollowupCompleteDialog` takes a full `FollowupResponse` plus a
`pendingSiblings` count; a dashboard item carries only ids and display strings. Rather than
bloat every dashboard response with full follow-up records, fetch the one record on click.

- [ ] **Step 1: Create the follow-up lookup**

```ts
// apps/web/components/features/dashboard/hooks/use-followup-for-item.ts
'use client';

import type { DashboardItem } from '@tejas96/shared/types';

import { useFollowups, type FollowupResponse } from '@/components/features/followups';

export interface FollowupForItem {
  followup: FollowupResponse | null;
  pendingSiblings: number;
  isLoading: boolean;
}

/**
 * Fetch the one follow-up a dashboard row refers to, plus its pending siblings.
 *
 * Scoped to the row's customer so a single request answers both questions, which
 * is how `followups-page` derives the same number. Its own comment notes the
 * count can undercount and that the API re-checks before enforcing, so the worst
 * case is a dialog that offers an optional next follow-up the server then
 * insists on — never a lead going dark.
 */
export function useFollowupForItem(item: DashboardItem | null): FollowupForItem {
  const customerId = item?.params.customerId;
  const query = useFollowups(
    { customerId, status: 'pending', limit: 100 },
    { enabled: Boolean(item && customerId) },
  );

  const rows = query.data?.items ?? [];
  const followupId = item?.params.id;
  const followup = rows.find((row) => row.id === followupId) ?? null;

  return {
    followup,
    pendingSiblings: followup ? Math.max(rows.length - 1, 0) : 0,
    isLoading: query.isPending && Boolean(item),
  };
}
```

Add to `hooks/index.ts`:

```ts
export { useFollowupForItem, type FollowupForItem } from './use-followup-for-item';
```

- [ ] **Step 2: Create the drawer**

```tsx
// apps/web/components/features/dashboard/components/view-all-drawer.tsx
'use client';

import type { DashboardItem } from '@tejas96/shared/types';
import * as React from 'react';

import { DashboardRow } from './dashboard-row';

import { DrillDownDrawer, type DrillDownItem } from '@/components/shared/drawers';

interface ViewAllDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: DashboardItem[];
  onCompleteFollowup: (item: DashboardItem) => void;
}

/**
 * Every row of one section, over the dashboard.
 *
 * `renderItem` draws OUR row unchanged, so the drawer and the card cannot drift
 * apart. Search is left to the drawer's own client-side filter — we pass no
 * `onSearch`, which is what tells it to filter on title and subtitle itself.
 */
export function ViewAllDrawer({
  open,
  onOpenChange,
  title,
  items,
  onCompleteFollowup,
}: ViewAllDrawerProps): React.JSX.Element {
  const byId = React.useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  const drillItems: DrillDownItem[] = React.useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: `${item.subtitle ? `${item.subtitle} · ` : ''}${item.reason}`,
      })),
    [items],
  );

  return (
    <DrillDownDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      subtitle={`${items.length} items`}
      items={drillItems}
      searchPlaceholder="Search this list..."
      renderItem={(drill) => {
        const item = byId.get(drill.id);
        if (!item) return null;
        return (
          <DashboardRow key={item.id} item={item} onCompleteFollowup={onCompleteFollowup} />
        );
      }}
      emptyContent={<p className="p-6 text-sm text-foreground-tertiary">Nothing here.</p>}
    />
  );
}
```

- [ ] **Step 3: Wire both into the page**

In `my-work-page.tsx`, add the imports and state, replace the two `overflow` props that need a
drawer, and replace the placeholder at the bottom.

```tsx
import { useFollowupForItem } from '../hooks';
import { ViewAllDrawer } from './view-all-drawer';
import { FollowupCompleteDialog } from '@/components/features/followups';
import { useQueryClient } from '@tanstack/react-query';
import { dashboardKeys } from '../hooks';
```

```tsx
const queryClient = useQueryClient();
const [drawer, setDrawer] = React.useState<{ title: string; items: DashboardItem[] } | null>(null);
const { followup, pendingSiblings } = useFollowupForItem(followupItem);
```

Needs Attention overflow becomes:

```tsx
overflow={
  critical.length > CAP.attention
    ? {
        label: `View all ${critical.length}`,
        onClick: () => setDrawer({ title: 'Needs attention', items: critical }),
      }
    : undefined
}
```

Workflow overflow becomes:

```tsx
overflow={
  rest.workflow.status === 'ok' && rest.workflow.total > CAP.workflow
    ? {
        label: `View all ${rest.workflow.total}`,
        onClick: () =>
          setDrawer({
            title: 'Workflow stuck',
            items: rest.workflow.status === 'ok'
              ? rest.workflow.buckets.flatMap((b) => b.items)
              : [],
          }),
      }
    : undefined
}
```

And the bottom placeholder becomes:

```tsx
{drawer ? (
  <ViewAllDrawer
    open
    onOpenChange={(next) => { if (!next) setDrawer(null); }}
    title={drawer.title}
    items={drawer.items}
    onCompleteFollowup={setFollowupItem}
  />
) : null}

<FollowupCompleteDialog
  open={Boolean(followup)}
  followup={followup}
  pendingSiblings={pendingSiblings}
  onClose={() => {
    setFollowupItem(null);
    // The row that was just completed must leave the page immediately. A count
    // that survives the action it just performed is how people stop trusting
    // the screen.
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  }}
/>
```

- [ ] **Step 4: Try both, in the browser**

With `npm run web:dev` running, at `http://localhost:3001`:

1. Click **View all** on Needs attention. A sheet opens over the page. The dashboard is still
   behind it and has not scrolled.
2. The rows in the sheet look **identical** to the rows on the card.
3. Type in the search box — the list narrows.
4. Confirm the mix is visible: rows for different entity types, each with a **different**
   button.
5. Close it. Click **Complete** on a follow-up row. The completion dialog opens with the right
   subject.
6. Complete it. The dialog closes, the row disappears, and the **count on the card drops by
   one** without a page reload.

Report what happened at each step, especially 6.

- [ ] **Step 5: Commit**

```bash
npm run typecheck && npm run lint
git add apps/web/components/features/dashboard
git commit -m "feat(dashboard): a drawer for the two lists no route can render

Needs attention and workflow mix six entity types, and no screen shows
that mix. The list is mixed but no row is, so it needed somewhere to live
rather than a shared destination. Completing a follow-up invalidates the
whole dashboard so no count outlives the action that changed it."
```

---

## Task 14: The verification walk

**Files:** none. This task produces evidence, not code.

This is spec §7 in full. **Do not skip a row because it looks obviously fine.** Checks 13 and 15
are the two that matter: 13 is the security check, 15 the honesty check.

- [ ] **Step 1: Run the regression gates**

```bash
npm run typecheck && npm run lint && npm run test
```

Expected: all green. **No new test files were added by this plan** — if `npm run test` reports a
higher test count than before Task 1, someone added tests against the standing instruction.
Remove them.

- [ ] **Step 2: Walk all fifteen states**

For each row, produce the state, open `http://localhost:3001`, and write down what you saw.

| # | Make this state | The page must |
|---|---|---|
| 1 | A lead with no property | Show "Property required"; the button opens the wizard with the customer prefilled |
| 2 | A property with no site-visit assignee | Show "Site visit unassigned" and **not** the survey item for the same property |
| 3 | Site visit done, survey not | Show "Survey pending" only — one action |
| 4 | Survey done, no quote | Show "Quote required"; the button prefills customer **and** property |
| 5 | A draft quote | Show it once. Never also a "not sent" item |
| 6 | A quote past `valid_until` whose status is still `sent` | Show it as lapsed |
| 7 | An accepted quote with no project | Show "Convert to project" |
| 8 | Follow-ups overdue / today / next week | Land in the correct bucket |
| 9 | Complete a follow-up from the dashboard | Row goes, count drops by one, no reload |
| 10 | A ticket overdue and a ticket unassigned | Both appear, in the right buckets |
| 11 | A project past `end_date` | Appear as overdue, with the worst milestone marked |
| 12 | A milestone with money owed | The finance amount matches the project's Payments tab **to the rupee** |
| 13 | **Sign in as a second user** | None of the first user's records appear anywhere, including in counts |
| 14 | Force one provider to throw | That card shows Retry; the other seven draw normally |
| 15 | Every count on screen | Equal the list beneath it |

For **check 14**, temporarily add `throw new Error('forced');` as the first line of
`ServiceProvider.load`, reload, confirm only that card degrades, then remove it.

For **check 13**, this is the one to do slowly. Note two user ids, sign in as each, and compare
the JSON:

```bash
curl -s -H "Authorization: Bearer $TOKEN_A" http://localhost:8085/api/v1/dashboard/my-work \
  | jq -r '[.. | .id? // empty] | sort | unique' > /tmp/user-a-ids.json
curl -s -H "Authorization: Bearer $TOKEN_B" http://localhost:8085/api/v1/dashboard/my-work \
  | jq -r '[.. | .id? // empty] | sort | unique' > /tmp/user-b-ids.json
comm -12 /tmp/user-a-ids.json /tmp/user-b-ids.json
```

Overlap is not automatically a bug — two people can legitimately share a customer — but **every
overlapping id must be explainable** by the scope rule. If you cannot explain one, it is a leak.

For **check 15**, mechanically:

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8085/api/v1/dashboard/my-work \
  | jq '[.sections | to_entries[] | select(.value.status=="ok") |
         {section: .key, total: .value.total,
          bucketSum: ([.value.buckets[].count] | add // 0)}]'
```

Expected: `total == bucketSum` for every section.

- [ ] **Step 3: Take a screenshot and hand it over**

Capture the finished dashboard and give it to the owner along with your notes from step 2.
State plainly which of the fifteen you verified and which you could not produce data for.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore(dashboard): verification walk complete

Fifteen states walked on the running app. Notes and screenshot handed to
the owner, including which states there was no data to produce."
```

---

## Notes for whoever executes this

**Deliberate omissions, so nobody 'fixes' them:**

- **No employee selector and no Business Matrix.** Both are spec 2. The selector needs a new
  permission code that does not exist yet — see the spec's §9.
- **No responsive/mobile layout.** The page collapses to one column below `xl`, which is
  correct but not designed. That is the next pass.
- **No backend RBAC.** This endpoint is safe because it takes identity from the token, not
  because a guard checks a permission. Do not add a guard and assume it works — none exists.
- **No new tests.** See constraint 1.

**Known drift between the approved artboard and the shipped design system**, to resolve in
favour of the system while building:

- The artboard hard-codes 13.5 / 12.5 / 11.5px type. The app's scale is 11 / 12 / 13 / 14.
  Use the app's.
- The artboard uses weight 500 on body text; the system permits 500 for buttons and headers
  only. Use 400, or 600 for a row title.
- The artboard hand-rolls cards, rows, buttons and chips. `Card`, `ListRow`, `Button`, `Chip`
  and `EmptyState` exist in the design-system bundle — prefer them where they fit.
