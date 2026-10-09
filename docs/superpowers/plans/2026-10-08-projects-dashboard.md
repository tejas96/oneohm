# Projects Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/projects` with a calm, exact, fully clickable portfolio dashboard (owner strip, stage pipeline, needs-action, stuck-by-team, 12-month trend, coming up), backed by one shared rule set so every number equals the list it opens.

**Architecture:** One stage rule in `libs/shared` (TS) and its SQL twin (`PROJECT_FACTS_CTE`) in the backend. A new `GET /projects/dashboard` (+ `/stage-projects`) reads the facts in one request; the existing `GET /projects` list gains filters built from the same SQL predicates. The web page is a thin orchestrator over small band components; motion is CSS + Recharts + a count-up hook.

**Tech Stack:** NestJS + TypeORM + raw SQL (Postgres), Next.js 15 app router, MUI 7, Tailwind, TanStack Query v5, Recharts 3.

**Spec:** `docs/superpowers/specs/2026-10-08-projects-dashboard-design.md` — read it first. Every definition (live, stage, late, meter installed, kW, to collect) is there.

## Global Constraints

- **No new unit test files** (user rule). Existing tests must keep passing. Verify by running SQL, the API, and each screen in the browser pane.
- Branch: `feat/projects-dashboard` in `/Volumes/works-space/oneohm/oneohm` (already created, spec committed). **No worktrees.** Never push to `main`.
- Never run `migration:revert`, `docker volume rm`, `compose down -v` or any reset on the shared local DB. All SQL in this plan is read-only.
- Backend `nx serve backend` has **no watch**: after backend edits, restart it (`preview_stop` + `preview_start` with name `backend`).
- Web on `http://localhost:3001`, API on `:8085`. Local login: `sanjay.oneohm@gmail.com` (password in memory `local-test-login`; never paste it in chat).
- DB session time zone for the app is IST (`apps/backend/src/database/datasource.ts:53`). In a `psql` shell, run `SET timezone = 'Asia/Kolkata';` first or dates will differ.
- API limit: 100 requests/min per client. Keep scripts under it.
- Copy rules: sentence case, plain words, no emoji, one fact per screen (memory `one-fact-one-home`).
- Row action menus stay visible (memory `ui-less-control-more-actions`) — this page has none, but do not add hover-only controls.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

- `<scratchpad>` below means the session scratchpad: `/private/tmp/claude-501/-Volumes-works-space-oneohm/584a2467-8b30-49e9-aa5f-b934404afe40/scratchpad` (throwaway scripts; never committed). In a new session use that session's scratchpad.
- The API is served under `/api/v1` (`apps/backend/src/main.ts:34`): `http://localhost:8085/api/v1/...`.

### Useful commands (used by many tasks)

```bash
# Typecheck
cd /Volumes/works-space/oneohm/oneohm && npm run typecheck:libs && npm run typecheck:backend && npm run typecheck:web
# Lint one project
cd /Volumes/works-space/oneohm/oneohm && npx nx lint backend && npx nx lint web && npx nx lint shared
# Read-only SQL in IST
docker exec -i oneohm-postgres psql -U root -d oneohm_epc -At -F' | '
# Mint a 1-hour admin token for API checks (sub must be a real active user id)
cd /Volumes/works-space/oneohm/oneohm/apps/backend && node -e "require('dotenv').config({quiet:true});const jwt=require('jsonwebtoken');console.log(jwt.sign({sub:process.argv[1],roles:process.argv[2].split(',').filter(Boolean),permissions:process.argv[3].split(',').filter(Boolean)},process.env.JWT_SECRET,{expiresIn:'1h'}))" "<userId>" "super_admin" ""
```

Get the test user's id with:
`echo "select id from users where email='sanjay.oneohm@gmail.com';" | docker exec -i oneohm-postgres psql -U root -d oneohm_epc -At`

---

## File map

| File | Responsibility |
|---|---|
| `libs/shared/src/types/projects-dashboard.ts` (new) | Dashboard request/response types, `StageGroupKey`, filter unions |
| `libs/shared/src/utils/project-stage.ts` (new) | `STAGE_GROUPS`, side-track rules, `deriveProjectStage` |
| `libs/shared/src/utils/milestone.ts` (modify) | export `normalizeMilestoneName`, add `canonicalMilestoneName` |
| `apps/backend/src/modules/projects/sql/project-facts.sql.ts` (new) | `PROJECT_FACTS_CTE`, `FACTS` predicates, `buildProjectFactsFilter` |
| `apps/backend/src/modules/projects/utils/dashboard-period.ts` (new) | IST period → date ranges + labels |
| `apps/backend/src/modules/projects/dto/dashboard/projects-dashboard-query.dto.ts` (new) | Validated query DTOs |
| `apps/backend/src/modules/projects/services/project-dashboard.service.ts` (new) | Dashboard + stage-projects SQL |
| `apps/backend/src/modules/projects/controllers/project-dashboard.controller.ts` (new) | `GET /projects/dashboard`, `GET /projects/dashboard/stage-projects` |
| `apps/backend/src/modules/projects/repositories/project.repository.ts` (modify) | facts filters on the list; `getCurrentPhases` |
| `apps/backend/src/modules/projects/services/project.service.ts` (modify) | filter pass-through; batch `currentPhase`; detail rule |
| `apps/backend/src/modules/projects/controllers/project.controller.ts` (modify) | parse new list params; `currentPhase` on `GET :id` |
| `apps/backend/src/modules/projects/dto/projects/project-response.dto.ts` (modify) | `currentPhase` field |
| `apps/backend/src/modules/projects/projects.module.ts` (modify) | wire controller, service, `FinanceModule` |
| `apps/web/lib/hooks/resources/projects-dashboard.ts` (new) | `useProjectsDashboard`, `useStageProjects` |
| `apps/web/components/features/projects/components/dashboard/*` (replace) | band components, links, format, motion, URL filters |
| `apps/web/components/features/projects/components/project-dashboard-page.tsx` (rewrite) | page orchestrator |
| `apps/web/components/features/projects/components/project-list-page.tsx` (modify) | new filters |
| `apps/web/components/features/projects/hooks/use-projects.ts` (modify) | send new filters |
| `apps/web/components/features/projects/components/project-detail/tabs/project-tasks-tab.tsx` + `../../constants.ts` (modify) | `t_task` deep link |
| `apps/web/components/features/projects/components/project-detail/lib/derive.ts`, `project-detail-header.tsx`, `tabs/overview/journey-card.tsx`, `hooks/types.ts` (modify) | "now" phase from `project.currentPhase` |
| `apps/web/components/features/ledger/finance-receivables-page.tsx` (modify) | `funding` URL param, `recovery` (all) scope |

---

### Task 1: Shared stage rule and dashboard types

**Files:**
- Create: `libs/shared/src/types/projects-dashboard.ts`
- Create: `libs/shared/src/utils/project-stage.ts`
- Modify: `libs/shared/src/utils/milestone.ts:20-50`
- Modify: `libs/shared/src/types/index.ts` (append export), `libs/shared/src/utils/index.ts` (append export)

**Interfaces:**
- Produces (types, `@tejas96/shared/types`): `StageGroupKey`, `DashboardPeriod`, `DashboardFinancing`, `ProjectProgress`, `ProjectAttention`, `DashboardRange`, `DashboardKwCount`, `NeedsActionRow`, `ProjectsDashboard`, `StageProjectRow`, `StageProjects`.
- Produces (utils, `@tejas96/shared/utils`): `normalizeMilestoneName(name: string): string`, `canonicalMilestoneName(name: string): string | undefined`, `STAGE_GROUPS`, `STAGE_GROUP_KEYS`, `SIDE_TRACK_PHASES`, `SIDE_TRACK_STEP_CODES`, `NET_METER_PHASE`, `phaseToStageGroup(name)`, `isSideTrackStep(task)`, `deriveProjectStage(tasks): ProjectStage`, types `StageTaskInput`, `ProjectStage`, `StageGroup`.

- [ ] **Step 1: Create the types file**

`libs/shared/src/types/projects-dashboard.ts`:

```ts
/**
 * Projects dashboard (`GET /projects/dashboard`) — request and response shapes.
 * Definitions of every figure live in
 * docs/superpowers/specs/2026-10-08-projects-dashboard-design.md.
 */

export type StageGroupKey =
  | 'design'
  | 'approvals'
  | 'material'
  | 'installation'
  | 'meter'
  | 'handover';

export type DashboardPeriod = 'this_month' | 'last_month' | 'this_quarter' | 'this_fy' | 'custom';
export type DashboardFinancing = 'all' | 'cash' | 'loan';
export type ProjectProgress = 'live' | 'not_started' | 'in_progress';
export type ProjectAttention = 'late_steps' | 'old_steps' | 'unstaged_steps';

/** All dates are IST calendar days, `YYYY-MM-DD`, inclusive. */
export interface DashboardRange {
  from: string;
  to: string;
  /** The comparison window. Cut to the same number of days when the period includes today. */
  previousFrom: string;
  previousTo: string;
  /** "Oct", "Oct–Dec", "FY 26-27", "1 Sep – 30 Sep". */
  label: string;
  /** "Sep", or "1–8 Sep" when cut. */
  previousLabel: string;
}

export interface DashboardKwCount {
  count: number;
  /** Sum over the projects whose kW is known. */
  kw: number;
  /** Projects in `count` with no signed-quote kW. Never folded into `kw` as 0. */
  kwUnknown: number;
}

export interface NeedsActionRow {
  projectId: string;
  projectNumber: string;
  customerName: string | null;
  taskId: string;
  stepName: string;
  department: string | null;
  assigneeName: string | null;
  daysLate: number;
}

export interface ProjectsDashboard {
  period: DashboardRange;
  strip: {
    onboarded: DashboardKwCount & { cash: number; loan: number };
    live: DashboardKwCount & { notStarted: number; inProgress: number };
    meterInstalled: DashboardKwCount & { previousCount: number };
    late: { count: number; percentOfLive: number };
    /** null when the caller lacks `finance.view` (and is not an admin). */
    money: { toCollectPaise: number; meterInStillOwedPaise: number } | null;
  };
  stages: Array<{
    key: StageGroupKey;
    label: string;
    count: number;
    lateCount: number;
    kw: number;
    phases: Array<{ name: string; count: number }>;
  }>;
  stageNotes: { noStage: number; unstagedSteps: number; oldStepsOpen: number };
  needsAction: { total: number; rows: NeedsActionRow[] };
  teams: Array<{ department: string; lateSteps: number }>;
  /** 12 months, oldest first, current month last. `month` is `YYYY-MM`. */
  trend: Array<{
    month: string;
    onboarded: number;
    onboardedKw: number;
    meterInstalled: number;
    meterKw: number;
  }>;
  comingUp: {
    count: number;
    kw: number;
    thisWeek: number;
    nextWeek: number;
    /** Window bounds, so links open exactly these rows. */
    from: string;
    to: string;
    thisWeekTo: string;
    nextWeekFrom: string;
    nextWeekTo: string;
  };
}

export interface StageProjectRow {
  projectId: string;
  projectNumber: string;
  customerName: string | null;
  kw: number | null;
  currentPhase: string | null;
  daysLate: number | null;
}

export interface StageProjects {
  total: number;
  rows: StageProjectRow[];
}
```

Append to `libs/shared/src/types/index.ts`:

```ts
export * from './projects-dashboard';
```

- [ ] **Step 2: Export the name helpers in `milestone.ts`**

In `libs/shared/src/utils/milestone.ts`, change `function normalizeMilestoneName` to `export function normalizeMilestoneName` (keep the body), and add below `canonicalMilestoneOrder`:

```ts
/** Catalog spelling of a known work-stage name (aliases resolved), or undefined if custom. */
export function canonicalMilestoneName(name: string): string | undefined {
  const order = canonicalMilestoneOrder(name);
  return order === undefined ? undefined : MILESTONE_LIFECYCLE_SEQUENCE[order - 1];
}
```

- [ ] **Step 3: Create the stage rule**

`libs/shared/src/utils/project-stage.ts`:

```ts
import { MILESTONE_LIFECYCLE_SEQUENCE } from '../constants/milestone-lifecycle';
import type { StageGroupKey } from '../types/projects-dashboard';

import { canonicalMilestoneName, canonicalMilestoneOrder } from './milestone';

/**
 * Where a project is, in six stages a person can read at a glance.
 *
 * The groups are the comments already written over MILESTONE_LIFECYCLE_SEQUENCE.
 * `Payment 1…5` and custom names belong to no group: a step under them never
 * decides the stage (it shows up as "steps without a stage" instead).
 */
export interface StageGroup {
  key: StageGroupKey;
  label: string;
  phases: readonly string[];
}

export const STAGE_GROUPS: readonly StageGroup[] = [
  {
    key: 'design',
    label: 'Survey & design',
    phases: [
      'Planning',
      'Site Survey & Design',
      'Feasibility Study',
      'Structural Assessment',
      'Shading Analysis',
    ],
  },
  {
    key: 'approvals',
    label: 'Approvals',
    phases: [
      'Permits & Approvals',
      'DISCOM Application',
      'Net Metering Application',
      'Subsidy Application',
      'Loan Processing',
    ],
  },
  { key: 'material', label: 'Material', phases: ['Material Procurement', 'Equipment Delivery'] },
  {
    key: 'installation',
    label: 'Installation',
    phases: [
      'Civil & Structural Work',
      'Electrical Work',
      'Installation',
      'Earthing & Lightning Protection',
    ],
  },
  {
    key: 'meter',
    label: 'Testing & meter',
    phases: [
      'Inspection & Testing',
      'Commissioning',
      'Commissioning & Testing',
      'DISCOM Inspection',
      'Net Meter Installation',
    ],
  },
  {
    key: 'handover',
    label: 'Handover',
    phases: ['Handover', 'Customer Training', 'Documentation', 'AMC / Warranty Registration'],
  },
];

export const STAGE_GROUP_KEYS: readonly StageGroupKey[] = STAGE_GROUPS.map((g) => g.key);

/**
 * Loan and subsidy run beside the job, not in front of it: a bank's final
 * disbursement routinely lands after the meter is in. Their steps never decide
 * the stage and are never "old steps left open". Loan steps are found by the
 * workflow step's `loan_only` flag, because one of them (LOAN-002 Bank Account
 * Opening) sits in Planning.
 */
export const SIDE_TRACK_PHASES: readonly string[] = ['Loan Processing', 'Subsidy Application'];
/** Subsidy application + disbursement, which sit inside Commissioning & Testing. */
export const SIDE_TRACK_STEP_CODES: readonly string[] = ['LIA-014', 'LIA-016'];

export const NET_METER_PHASE = 'Net Meter Installation';

const GROUP_BY_PHASE: ReadonlyMap<string, StageGroupKey> = new Map(
  STAGE_GROUPS.flatMap((g) => g.phases.map((phase) => [phase, g.key] as const)),
);

export function phaseToStageGroup(name: string | null | undefined): StageGroupKey | null {
  if (!name) return null;
  const canonical = canonicalMilestoneName(name);
  return canonical ? (GROUP_BY_PHASE.get(canonical) ?? null) : null;
}

export interface StageTaskInput {
  milestoneName: string | null | undefined;
  done: boolean;
  workflowStepCode: string | null | undefined;
  loanOnly: boolean;
}

export interface ProjectStage {
  /** Catalog spelling of the phase the project is in; null when it has no main-line steps. */
  currentPhase: string | null;
  stageGroup: StageGroupKey | null;
  /** Open main-line steps in phases BEFORE the furthest phase with done work. */
  oldOpenStepCount: number;
}

export function isSideTrackStep(
  task: Pick<StageTaskInput, 'milestoneName' | 'workflowStepCode' | 'loanOnly'>,
): boolean {
  if (task.loanOnly) return true;
  if (task.workflowStepCode && SIDE_TRACK_STEP_CODES.includes(task.workflowStepCode)) return true;
  const canonical = task.milestoneName ? canonicalMilestoneName(task.milestoneName) : undefined;
  return canonical !== undefined && SIDE_TRACK_PHASES.includes(canonical);
}

/**
 * Furthest reached, not first open.
 *
 * Staff often finish a site without ticking an earlier step (a dispatch, a
 * permit). "First open step" then files a project whose meter is already in
 * under Material. So: find the furthest phase with done work, and the project
 * is at the first phase from there on that still has open work. Earlier open
 * steps are counted as old steps left open, for someone to clean up.
 *
 * The SQL twin of this function is PROJECT_FACTS_CTE in
 * apps/backend/src/modules/projects/sql/project-facts.sql.ts. Change both.
 */
export function deriveProjectStage(tasks: readonly StageTaskInput[]): ProjectStage {
  const main = tasks.flatMap((t) => {
    if (isSideTrackStep(t)) return [];
    const phase = t.milestoneName ? canonicalMilestoneName(t.milestoneName) : undefined;
    if (!phase || !GROUP_BY_PHASE.has(phase)) return [];
    return [{ index: canonicalMilestoneOrder(phase) as number, phase, done: t.done }];
  });
  if (main.length === 0) return { currentPhase: null, stageGroup: null, oldOpenStepCount: 0 };

  const doneIndexes = main.filter((s) => s.done).map((s) => s.index);
  const furthest = doneIndexes.length > 0 ? Math.max(...doneIndexes) : null;
  const open = main.filter((s) => !s.done);
  const earliest = (steps: typeof open): (typeof open)[number] | undefined =>
    steps.reduce<(typeof open)[number] | undefined>(
      (best, s) => (best === undefined || s.index < best.index ? s : best),
      undefined,
    );

  let phase: string;
  if (furthest === null) {
    phase = (earliest(open) as (typeof open)[number]).phase;
  } else {
    phase =
      earliest(open.filter((s) => s.index >= furthest))?.phase ??
      MILESTONE_LIFECYCLE_SEQUENCE[furthest - 1];
  }

  return {
    currentPhase: phase,
    stageGroup: GROUP_BY_PHASE.get(phase) ?? null,
    oldOpenStepCount: furthest === null ? 0 : open.filter((s) => s.index < furthest).length,
  };
}
```

Append to `libs/shared/src/utils/index.ts`:

```ts
export * from './project-stage';
```

- [ ] **Step 4: Typecheck and lint the shared lib**

Run: `cd /Volumes/works-space/oneohm/oneohm && npm run typecheck:libs && npx nx lint shared`
Expected: no errors.

- [ ] **Step 5: Run a throwaway check (not committed)**

Create `<scratchpad>/stage-check.ts` (the session scratchpad directory, never the repo):

```ts
import { deriveProjectStage } from '/Volumes/works-space/oneohm/oneohm/libs/shared/src/utils/project-stage';

const t = (milestoneName: string, done: boolean, code = 'X', loanOnly = false) => ({
  milestoneName, done, workflowStepCode: code, loanOnly,
});
const cases: Array<[string, ReturnType<typeof deriveProjectStage>]> = [
  ['nothing done', deriveProjectStage([t('Site Survey & Design', false), t('Installation', false)])],
  ['meter in, dispatch never ticked', deriveProjectStage([
    t('Equipment Delivery', false), t('Installation', true), t('Net Meter Installation', true), t('Handover', false),
  ])],
  ['only loan step open after install', deriveProjectStage([
    t('Installation', true), t('Loan Processing', false, 'LOAN-006', true),
  ])],
  ['loan step in Planning is a side track', deriveProjectStage([t('Planning', false, 'LOAN-002', true)])],
  ['unknown phase only', deriveProjectStage([t('Payment 1', false), t('', false)])],
];
for (const [name, r] of cases) console.log(name, JSON.stringify(r));
```

Run: `cd /Volumes/works-space/oneohm/oneohm && TS_NODE_PROJECT=apps/backend/tsconfig.json npx ts-node -r tsconfig-paths/register --transpile-only <scratchpad>/stage-check.ts`

Expected output:
```
nothing done {"currentPhase":"Site Survey & Design","stageGroup":"design","oldOpenStepCount":0}
meter in, dispatch never ticked {"currentPhase":"Handover","stageGroup":"handover","oldOpenStepCount":1}
only loan step open after install {"currentPhase":"Installation","stageGroup":"installation","oldOpenStepCount":0}
loan step in Planning is a side track {"currentPhase":null,"stageGroup":null,"oldOpenStepCount":0}
unknown phase only {"currentPhase":null,"stageGroup":null,"oldOpenStepCount":0}
```

If any line differs, fix `deriveProjectStage` and rerun.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/works-space/oneohm/oneohm
git add libs/shared/src/types/projects-dashboard.ts libs/shared/src/types/index.ts libs/shared/src/utils/project-stage.ts libs/shared/src/utils/milestone.ts libs/shared/src/utils/index.ts
git commit -m "feat(shared): project stage rule (furthest reached) and dashboard types

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Project facts SQL, list filters, and one stage everywhere

**Files:**
- Create: `apps/backend/src/modules/projects/sql/project-facts.sql.ts`
- Modify: `apps/backend/src/modules/projects/repositories/project.repository.ts` (`findAll` filter type ~line 165, filter block before `isSmartSort` ~line 377; new method `getCurrentPhases`)
- Modify: `apps/backend/src/modules/projects/services/project.service.ts` (`findAll` filter type ~line 105, enrichment loop ~line 207, `computeCurrentPhaseFromTasks` ~line 738)
- Modify: `apps/backend/src/modules/projects/controllers/project.controller.ts` (`findAll` params ~line 232, `findOne` ~line 449)
- Modify: `apps/backend/src/modules/projects/dto/projects/project-response.dto.ts`

**Interfaces:**
- Consumes: Task 1 utils/types.
- Produces: `PROJECT_FACTS_CTE: string`, `FACTS` (predicate strings over alias `pf`), `factsBetween(column, fromSql, toSql): string`, `ProjectFactsFilters`, `buildProjectFactsFilter(f, projectIdColumn?): { sql: string; params: Record<string, unknown> } | null`. Columns of `project_facts`: `project_id, created_at, wants_loan, kw, step_count, done_steps, open_steps, is_live, current_phase, stage_group, old_open_steps, unstaged_open_steps, late_steps, meter_installed, meter_completed_at, meter_due_date`. CTE `pf_task` columns: `project_id, task_id, done, end_date, assigned_to_user_id, department, step_name, idx, phase, stage_group, is_meter_step, side_track`.
- Produces: list query params `financing, progress, stage, phase, attention, onboardedFrom, onboardedTo, meterInstalledFrom, meterInstalledTo, meterDueFrom, meterDueTo`; `currentPhase` on `GET /projects/:id`.

- [ ] **Step 1: Create the facts SQL**

`apps/backend/src/modules/projects/sql/project-facts.sql.ts`:

```ts
import {
  MILESTONE_LIFECYCLE_ALIASES,
  MILESTONE_LIFECYCLE_SEQUENCE,
} from '@tejas96/shared/constants';
import type {
  ProjectAttention,
  ProjectProgress,
  StageGroupKey,
} from '@tejas96/shared/types';
import {
  NET_METER_PHASE,
  SIDE_TRACK_PHASES,
  SIDE_TRACK_STEP_CODES,
  canonicalMilestoneName,
  normalizeMilestoneName,
  phaseToStageGroup,
} from '@tejas96/shared/utils';

import { systemSizeKwSqlRaw } from '../../../common/utils/transform.util';

/**
 * One row per counted project (not deleted, not cancelled) with every fact the
 * projects dashboard and the project list filters need.
 *
 * This is the SQL twin of `deriveProjectStage` (libs/shared/src/utils/project-stage.ts).
 * The phase table is generated from MILESTONE_LIFECYCLE_SEQUENCE at module load,
 * so the order here can never drift from the TS order. Change both together.
 *
 * Text, not a view: callers write `WITH ${PROJECT_FACTS_CTE} SELECT … FROM project_facts pf`.
 * It takes no parameters, so raw `$n` SQL and TypeORM `:name` SQL can both embed it.
 * Status is not trusted for "done" (spec D5) — only `cancelled` is read from it.
 */

const lit = (value: string): string => `'${value.replace(/'/g, "''")}'`;
const list = (values: readonly string[]): string => values.map(lit).join(', ');

/** Same steps as normalizeMilestoneName: trim, lower, & → and, non-alphanumerics → space, trim. */
const normalizedSql = (column: string): string =>
  `btrim(regexp_replace(replace(lower(btrim(COALESCE(${column}, ''))), '&', 'and'), '[^a-z0-9]+', ' ', 'g'))`;

const PHASE_NAME_ROWS = ((): string => {
  const rows = new Map<string, number>();
  for (const name of [...MILESTONE_LIFECYCLE_SEQUENCE, ...Object.keys(MILESTONE_LIFECYCLE_ALIASES)]) {
    const canonical = canonicalMilestoneName(name);
    if (!canonical) continue;
    rows.set(normalizeMilestoneName(name), MILESTONE_LIFECYCLE_SEQUENCE.indexOf(canonical) + 1);
  }
  return [...rows].map(([norm, idx]) => `(${lit(norm)}, ${idx})`).join(',\n    ');
})();

const PHASE_ROWS = MILESTONE_LIFECYCLE_SEQUENCE.map((phase, i) => {
  const group = phaseToStageGroup(phase);
  return `(${i + 1}, ${lit(phase)}, ${group ? lit(group) : 'NULL::text'})`;
}).join(',\n    ');

export const PROJECT_FACTS_CTE = `
  pf_phase_name(norm_name, idx) AS (
    VALUES
    ${PHASE_NAME_ROWS}
  ),
  pf_phase(idx, phase, stage_group) AS (
    VALUES
    ${PHASE_ROWS}
  ),
  pf_task AS (
    SELECT
      t.project_id,
      t.id AS task_id,
      (t.status = 'done') AS done,
      t.end_date,
      t.assigned_to_user_id,
      ws.default_department AS department,
      COALESCE(t.name_override, ws.name, t.name, t.code) AS step_name,
      ph.idx,
      ph.phase,
      ph.stage_group,
      (ph.phase = ${lit(NET_METER_PHASE)}) IS TRUE AS is_meter_step,
      (
        COALESCE(ws.loan_only, false)
        OR (COALESCE(ws.code, t.code) IN (${list(SIDE_TRACK_STEP_CODES)})) IS TRUE
        OR (ph.phase IN (${list(SIDE_TRACK_PHASES)})) IS TRUE
      ) AS side_track
    FROM project_tasks t
    LEFT JOIN workflow_steps ws ON ws.id = t.workflow_step_id
    LEFT JOIN pf_phase_name pn ON pn.norm_name = ${normalizedSql('t.milestone_name')}
    LEFT JOIN pf_phase ph ON ph.idx = pn.idx
    WHERE t.deleted_at IS NULL
  ),
  pf_task_ranked AS (
    SELECT
      pt.*,
      (NOT pt.side_track AND pt.stage_group IS NOT NULL) AS main_line,
      MAX(pt.idx) FILTER (WHERE pt.done AND NOT pt.side_track AND pt.stage_group IS NOT NULL)
        OVER (PARTITION BY pt.project_id) AS furthest_idx
    FROM pf_task pt
  ),
  pf_agg AS (
    SELECT
      r.project_id,
      COUNT(*) AS step_count,
      COUNT(*) FILTER (WHERE r.done) AS done_steps,
      COUNT(*) FILTER (WHERE NOT r.done) AS open_steps,
      COUNT(*) FILTER (WHERE r.main_line) AS main_steps,
      MAX(r.furthest_idx) AS furthest_idx,
      MIN(r.idx) FILTER (WHERE r.main_line AND NOT r.done) AS first_open_idx,
      MIN(r.idx) FILTER (WHERE r.main_line AND NOT r.done AND r.idx >= r.furthest_idx) AS next_open_idx,
      COUNT(*) FILTER (WHERE r.main_line AND NOT r.done AND r.idx < r.furthest_idx) AS old_open_steps,
      COUNT(*) FILTER (WHERE NOT r.done AND NOT r.side_track AND r.stage_group IS NULL) AS unstaged_open_steps,
      COUNT(*) FILTER (WHERE NOT r.done AND r.end_date < CURRENT_DATE) AS late_steps,
      MIN(r.end_date) FILTER (WHERE NOT r.done AND r.is_meter_step) AS meter_due_date
    FROM pf_task_ranked r
    GROUP BY r.project_id
  ),
  project_facts AS (
    SELECT
      p.id AS project_id,
      p.created_at,
      COALESCE(prop.wants_loan, false) AS wants_loan,
      (${systemSizeKwSqlRaw('qv')})::float AS kw,
      COALESCE(a.step_count, 0)::int AS step_count,
      COALESCE(a.done_steps, 0)::int AS done_steps,
      COALESCE(a.open_steps, 0)::int AS open_steps,
      (COALESCE(a.open_steps, 0) > 0 OR COALESCE(a.step_count, 0) = 0) AS is_live,
      stage.phase AS current_phase,
      stage.stage_group,
      COALESCE(a.old_open_steps, 0)::int AS old_open_steps,
      COALESCE(a.unstaged_open_steps, 0)::int AS unstaged_open_steps,
      COALESCE(a.late_steps, 0)::int AS late_steps,
      (com.project_id IS NOT NULL) AS meter_installed,
      com.meter_completed_at,
      CASE WHEN com.project_id IS NULL THEN a.meter_due_date END AS meter_due_date
    FROM projects p
    JOIN customer_properties prop ON prop.id = p.property_id
    LEFT JOIN quote_versions qv ON qv.id = p.contract_quote_version_id
    LEFT JOIN pf_agg a ON a.project_id = p.id
    LEFT JOIN v_project_commissioning com ON com.project_id = p.id
    LEFT JOIN pf_phase stage ON stage.idx = CASE
      WHEN COALESCE(a.main_steps, 0) = 0 THEN NULL
      WHEN a.furthest_idx IS NULL THEN a.first_open_idx
      ELSE COALESCE(a.next_open_idx, a.furthest_idx)
    END
    WHERE p.deleted_at IS NULL
      AND p.status <> 'cancelled'
  )
`;

/**
 * Every "which projects" rule the dashboard counts with and the list filters by.
 * Both sides embed these exact strings, so a card can never disagree with the
 * list it opens (spec D6). Alias is always `pf`.
 */
export const FACTS = {
  live: 'pf.is_live',
  notStarted: 'pf.is_live AND pf.done_steps = 0',
  inProgress: 'pf.is_live AND pf.done_steps > 0',
  late: 'pf.is_live AND pf.late_steps > 0',
  oldSteps: 'pf.is_live AND pf.old_open_steps > 0',
  unstagedSteps: 'pf.is_live AND pf.unstaged_open_steps > 0',
  noStage: 'pf.is_live AND pf.stage_group IS NULL',
  loan: 'pf.wants_loan',
  cash: 'NOT pf.wants_loan',
} as const;

/** `CAST` rather than `::date` so the same text works with `$3` and with TypeORM `:name`. */
export const factsBetween = (
  column: 'created_at' | 'meter_completed_at' | 'meter_due_date',
  fromSql: string,
  toSql: string,
): string =>
  `CAST(pf.${column} AS date) BETWEEN CAST(${fromSql} AS date) AND CAST(${toSql} AS date)`;

export interface ProjectFactsFilters {
  financing?: 'cash' | 'loan';
  progress?: ProjectProgress;
  stage?: StageGroupKey | 'none';
  phase?: string;
  attention?: ProjectAttention;
  onboardedFrom?: string;
  onboardedTo?: string;
  meterInstalledFrom?: string;
  meterInstalledTo?: string;
  meterDueFrom?: string;
  meterDueTo?: string;
}

/**
 * TypeORM `andWhere` clause for the project list. Returns null when no facts
 * filter is set, so the common list query is untouched.
 */
export function buildProjectFactsFilter(
  f: ProjectFactsFilters | undefined,
  projectIdColumn = 'project.id',
): { sql: string; params: Record<string, unknown> } | null {
  if (!f) return null;
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (f.financing) where.push(f.financing === 'loan' ? FACTS.loan : FACTS.cash);
  if (f.progress === 'live') where.push(FACTS.live);
  if (f.progress === 'not_started') where.push(FACTS.notStarted);
  if (f.progress === 'in_progress') where.push(FACTS.inProgress);
  if (f.stage === 'none') where.push(FACTS.noStage);
  else if (f.stage) {
    where.push(`${FACTS.live} AND pf.stage_group = :pfStage`);
    params.pfStage = f.stage;
  }
  if (f.phase) {
    where.push(`${FACTS.live} AND pf.current_phase = :pfPhase`);
    params.pfPhase = f.phase;
  }
  if (f.attention === 'late_steps') where.push(FACTS.late);
  if (f.attention === 'old_steps') where.push(FACTS.oldSteps);
  if (f.attention === 'unstaged_steps') where.push(FACTS.unstagedSteps);

  const range = (
    column: 'created_at' | 'meter_completed_at' | 'meter_due_date',
    from: string | undefined,
    to: string | undefined,
    key: string,
  ): void => {
    if (from) {
      where.push(`CAST(pf.${column} AS date) >= CAST(:${key}From AS date)`);
      params[`${key}From`] = from;
    }
    if (to) {
      where.push(`CAST(pf.${column} AS date) <= CAST(:${key}To AS date)`);
      params[`${key}To`] = to;
    }
  };
  range('created_at', f.onboardedFrom, f.onboardedTo, 'pfOnboarded');
  range('meter_completed_at', f.meterInstalledFrom, f.meterInstalledTo, 'pfMeter');
  if (f.meterDueFrom || f.meterDueTo) where.push(FACTS.live);
  range('meter_due_date', f.meterDueFrom, f.meterDueTo, 'pfMeterDue');

  if (where.length === 0) return null;
  return {
    sql: `${projectIdColumn} IN (WITH ${PROJECT_FACTS_CTE} SELECT pf.project_id FROM project_facts pf WHERE ${where
      .map((w) => `(${w})`)
      .join(' AND ')})`,
    params,
  };
}
```

- [ ] **Step 2: Print the CTE and check it against the database (read-only)**

Create `<scratchpad>/facts-check.ts`:

```ts
import { PROJECT_FACTS_CTE } from '/Volumes/works-space/oneohm/oneohm/apps/backend/src/modules/projects/sql/project-facts.sql';

console.log(`SET timezone = 'Asia/Kolkata';
WITH ${PROJECT_FACTS_CTE}
SELECT 'counted', count(*) FROM project_facts
UNION ALL SELECT 'live', count(*) FROM project_facts pf WHERE pf.is_live
UNION ALL SELECT 'meter installed', count(*) FROM project_facts pf WHERE pf.meter_installed
UNION ALL SELECT 'late', count(*) FROM project_facts pf WHERE pf.is_live AND pf.late_steps > 0
UNION ALL SELECT 'old steps', count(*) FROM project_facts pf WHERE pf.is_live AND pf.old_open_steps > 0
UNION ALL SELECT 'stage ' || COALESCE(pf.stage_group, 'none'), count(*) FROM project_facts pf WHERE pf.is_live GROUP BY pf.stage_group;
WITH ${PROJECT_FACTS_CTE}
SELECT pf.stage_group, count(*) FROM project_facts pf WHERE pf.meter_installed AND pf.is_live GROUP BY 1 ORDER BY 1;`);
```

Run:
```bash
cd /Volumes/works-space/oneohm/oneohm && TS_NODE_PROJECT=apps/backend/tsconfig.json npx ts-node -r tsconfig-paths/register --transpile-only <scratchpad>/facts-check.ts | docker exec -i oneohm-postgres psql -U root -d oneohm_epc -At -F' | '
```

Expected (local data on 2026-10-08; small drift is fine if people used the app since):
- `counted | 231`, `meter installed | 43` (42 if you exclude the one with a blank milestone; the view says 43).
- Every live meter-installed project is in `meter` or `handover` (the second query must show no `design`, `approvals`, `material`, `installation` rows). This is the 14-project bug the rule fixes.
- `old steps` is ≥ 14.

Cross-check one project by hand: pick a `project_id` from `SELECT … WHERE pf.old_open_steps > 0 LIMIT 1`, list its tasks (`select milestone_name, status from project_tasks where project_id = '<id>' and deleted_at is null order by milestone_order`) and confirm the stage matches the rule in the spec.

- [ ] **Step 3: Add the facts filters to the list repository**

In `project.repository.ts`:

1. Import: `import { PROJECT_FACTS_CTE, buildProjectFactsFilter, type ProjectFactsFilters } from '../sql/project-facts.sql';`
2. Change the `findAll` filter parameter type from `filters?: { … }` to `filters?: { …existing fields… } & ProjectFactsFilters`.
3. Directly before `const isSmartSort = filters?.sortBy === 'smartSort';` add:

```ts
    // Dashboard drill-downs (and the matching list filters). Same SQL rules the
    // dashboard counts with, so the number on a card is the number of rows here.
    const factsFilter = buildProjectFactsFilter(filters);
    if (factsFilter) {
      query.andWhere(factsFilter.sql, factsFilter.params);
    }
```

4. Add a method to the class (next to `getTaskCounts`):

```ts
  /**
   * Current phase for a page of projects in ONE query — the furthest-reached
   * rule from PROJECT_FACTS_CTE. Replaces a per-row task fetch.
   */
  async getCurrentPhases(projectIds: string[]): Promise<Map<string, string | null>> {
    if (projectIds.length === 0) return new Map();
    const rows: Array<{ projectId: string; currentPhase: string | null }> =
      await this.repository.query(
        `WITH ${PROJECT_FACTS_CTE}
         SELECT pf.project_id AS "projectId", pf.current_phase AS "currentPhase"
         FROM project_facts pf
         WHERE pf.project_id = ANY($1::uuid[])`,
        [projectIds],
      );
    return new Map(rows.map((r) => [r.projectId, r.currentPhase]));
  }
```

- [ ] **Step 4: Service — pass filters through, batch the phase, new detail rule**

In `project.service.ts`:

1. Import `type ProjectFactsFilters` from `'../sql/project-facts.sql'` and `deriveProjectStage` from `'@tejas96/shared/utils'`.
2. `findAll` filter parameter type: `filters?: { …existing… } & ProjectFactsFilters`.
3. After `const taskCountMap = await this.projectRepository.getTaskCounts(projectIds);` add:
   `const phaseMap = await this.projectRepository.getCurrentPhases(projectIds);`
4. In the `projects.map(async (project) => {` block replace
   `const currentPhase = await this.computeCurrentPhaseFromTasks(project.id);`
   with `const currentPhase = phaseMap.get(project.id) ?? null;`
5. Replace the body of `computeCurrentPhaseFromTasks` (and its doc comment) with:

```ts
  /**
   * The phase a project is in — furthest reached (spec D4). Same rule as
   * PROJECT_FACTS_CTE; used for a single project's detail response.
   */
  async computeCurrentPhaseFromTasks(projectId: string): Promise<string | null> {
    const allTasks = await this.taskRepository.findAllForBoard(projectId);
    return deriveProjectStage(
      allTasks.map((t) => ({
        milestoneName: t.milestoneName,
        done: t.status === TaskStatus.DONE,
        workflowStepCode: t.workflowStep?.code ?? t.code,
        loanOnly: t.workflowStep?.loanOnly ?? false,
      })),
    ).currentPhase;
  }
```

If `compareMilestoneSequence` becomes unused in the file, remove it from the import.

- [ ] **Step 5: Controller — parse the new list params and send `currentPhase` on detail**

In `project.controller.ts`:

1. Add these imports: `STAGE_GROUP_KEYS` from `'@tejas96/shared/utils'`, and `type ProjectFactsFilters` from `'../sql/project-facts.sql'`.
2. Add module-level helpers above the class:

```ts
/** A stale bookmarked value means "no filter", never a 400 — same as healthStatus. */
function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

function isoDay(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function parseFactsFilters(q: Record<string, unknown>): ProjectFactsFilters {
  return {
    financing: oneOf(q.financing, ['cash', 'loan'] as const),
    progress: oneOf(q.progress, ['live', 'not_started', 'in_progress'] as const),
    stage: oneOf(q.stage, [...STAGE_GROUP_KEYS, 'none'] as const),
    phase: typeof q.phase === 'string' && q.phase.length <= 100 ? q.phase : undefined,
    attention: oneOf(q.attention, ['late_steps', 'old_steps', 'unstaged_steps'] as const),
    onboardedFrom: isoDay(q.onboardedFrom),
    onboardedTo: isoDay(q.onboardedTo),
    meterInstalledFrom: isoDay(q.meterInstalledFrom),
    meterInstalledTo: isoDay(q.meterInstalledTo),
    meterDueFrom: isoDay(q.meterDueFrom),
    meterDueTo: isoDay(q.meterDueTo),
  };
}
```

3. In `findAll`, add one parameter after `@ResellerScope() resellerId?: string,`:
   `@Query() rawQuery: Record<string, unknown> = {},`
   (Nest passes the whole query object; the existing named `@Query('x')` params keep working.)
4. Add `@ApiQuery` entries for the 11 new params, matching the existing style (each `required: false`, type `String`, one-line description from the spec).
5. In the `this.projectService.findAll(pageNum, limitNum, { … })` object add `...parseFactsFilters(rawQuery),` as the last entry.
6. `findOne`: replace the return with

```ts
    const currentPhase = await this.projectService.computeCurrentPhaseFromTasks(id);
    return plainToInstance(ProjectResponseDto, Object.assign(project, { currentPhase }), {
      excludeExtraneousValues: true,
    });
```

In `project-response.dto.ts`, after `progressPercentage`, add:

```ts
  @ApiPropertyOptional({
    example: 'Net Meter Installation',
    nullable: true,
    description: 'Phase the project is in — furthest reached; null when it has no main-line steps',
  })
  @Expose()
  currentPhase?: string | null;
```

- [ ] **Step 6: Typecheck, lint, existing backend tests**

Run: `cd /Volumes/works-space/oneohm/oneohm && npm run typecheck:backend && npx nx lint backend && npx nx test backend`
Expected: no type or lint errors; the existing suite passes. If an existing spec mocks `computeCurrentPhaseFromTasks` or `findAll` of the repository, update that mock for the new `getCurrentPhases` call (do not add new test files).

- [ ] **Step 7: Restart the backend and check the list against the facts**

Restart: `preview_stop` the `backend` server, then `preview_start` `{name: "backend"}`.

Mint an admin token (see Global Constraints) into `$TOKEN`, then for each filter compare the list total with the SQL count:

```bash
for q in "progress=live" "progress=not_started" "progress=in_progress" "attention=late_steps" "attention=old_steps" "stage=material" "stage=none" "financing=loan" "meterInstalledFrom=2026-10-01&meterInstalledTo=2026-10-31"; do
  printf '%s -> ' "$q"
  curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8085/api/v1/projects?limit=1&$q" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).meta.total))"
done
```

Expected: each total equals the matching SQL count from Step 2 (same predicate, e.g. `WHERE pf.is_live AND pf.done_steps = 0`). Also `curl …/projects?limit=5` still works with no new params and every row has a `currentPhase`. `curl …/projects/<id>` returns `currentPhase`.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/works-space/oneohm/oneohm
git add apps/backend/src/modules/projects/sql/project-facts.sql.ts apps/backend/src/modules/projects/repositories/project.repository.ts apps/backend/src/modules/projects/services/project.service.ts apps/backend/src/modules/projects/controllers/project.controller.ts apps/backend/src/modules/projects/dto/projects/project-response.dto.ts
git commit -m "feat(projects): project facts SQL, list filters, furthest-reached current phase

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Dashboard and stage-projects endpoints

**Files:**
- Create: `apps/backend/src/modules/projects/utils/dashboard-period.ts`
- Create: `apps/backend/src/modules/projects/dto/dashboard/projects-dashboard-query.dto.ts`
- Create: `apps/backend/src/modules/projects/services/project-dashboard.service.ts`
- Create: `apps/backend/src/modules/projects/controllers/project-dashboard.controller.ts`
- Modify: `apps/backend/src/modules/projects/projects.module.ts`, `services/index.ts`, `controllers/index.ts`

**Interfaces:**
- Consumes: `PROJECT_FACTS_CTE`, `FACTS`, `factsBetween` (Task 2); shared types (Task 1); `FinanceReportingService.getReceivables(opts)` → `{ buckets: { totalOutstandingPaise } }`; `resolveProjectListMemberId`, `hasAdminBypassRole` from `../../iam/constants`.
- Produces: `GET /projects/dashboard?period&from&to&financing` → `ProjectsDashboard`; `GET /projects/dashboard/stage-projects?stage&phase&financing` → `StageProjects`; `istToday()`, `resolveDashboardRange()`, `addDaysIso()`.

- [ ] **Step 1: Period helper**

`apps/backend/src/modules/projects/utils/dashboard-period.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import type { DashboardPeriod, DashboardRange } from '@tejas96/shared/types';

/**
 * Dashboard periods as IST calendar days. Everything works on `YYYY-MM-DD`
 * strings and UTC-midnight Dates, so the host clock's zone never moves a day.
 * Quarters and years are Indian financial ones (Apr–Mar).
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86_400_000;
const MAX_CUSTOM_DAYS = 1096; // 3 years

export function istToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

const parse = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fmt = (d: Date): string => d.toISOString().slice(0, 10);
const monthStart = (y: number, m: number): Date => new Date(Date.UTC(y, m, 1));
const monthEnd = (y: number, m: number): Date => new Date(Date.UTC(y, m + 1, 0));
const days = (a: Date, b: Date): number => Math.round((b.getTime() - a.getTime()) / DAY_MS);
const dayMonth = (d: Date): string => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;

export function addDaysIso(iso: string, n: number): string {
  return fmt(new Date(parse(iso).getTime() + n * DAY_MS));
}

function spanLabel(from: Date, to: Date): string {
  if (from.getUTCFullYear() !== to.getUTCFullYear()) {
    return `${dayMonth(from)} ${String(from.getUTCFullYear()).slice(2)} – ${dayMonth(to)} ${String(to.getUTCFullYear()).slice(2)}`;
  }
  if (from.getUTCMonth() === to.getUTCMonth()) {
    return `${from.getUTCDate()}–${to.getUTCDate()} ${MONTHS[to.getUTCMonth()]}`;
  }
  return `${dayMonth(from)} – ${dayMonth(to)}`;
}

export function resolveDashboardRange(
  period: DashboardPeriod,
  customFrom: string | undefined,
  customTo: string | undefined,
  todayIso: string,
): DashboardRange {
  const today = parse(todayIso);
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();

  let from: Date;
  let to: Date;
  let prevFrom: Date;
  let prevTo: Date;
  let label: string;
  let prevLabel: string;

  switch (period) {
    case 'last_month': {
      from = monthStart(y, m - 1);
      to = monthEnd(y, m - 1);
      prevFrom = monthStart(y, m - 2);
      prevTo = monthEnd(y, m - 2);
      label = MONTHS[from.getUTCMonth()];
      prevLabel = MONTHS[prevFrom.getUTCMonth()];
      break;
    }
    case 'this_quarter': {
      const qStart = m - ((m + 9) % 3); // Apr, Jul, Oct, Jan
      from = monthStart(y, qStart);
      to = monthEnd(y, qStart + 2);
      prevFrom = monthStart(y, qStart - 3);
      prevTo = monthEnd(y, qStart - 1);
      label = `${MONTHS[from.getUTCMonth()]}–${MONTHS[to.getUTCMonth()]}`;
      prevLabel = `${MONTHS[prevFrom.getUTCMonth()]}–${MONTHS[prevTo.getUTCMonth()]}`;
      break;
    }
    case 'this_fy': {
      const fy = m >= 3 ? y : y - 1;
      from = new Date(Date.UTC(fy, 3, 1));
      to = new Date(Date.UTC(fy + 1, 2, 31));
      prevFrom = new Date(Date.UTC(fy - 1, 3, 1));
      prevTo = new Date(Date.UTC(fy, 2, 31));
      label = `FY ${String(fy).slice(2)}-${String(fy + 1).slice(2)}`;
      prevLabel = `FY ${String(fy - 1).slice(2)}-${String(fy).slice(2)}`;
      break;
    }
    case 'custom': {
      if (!customFrom || !customTo) {
        throw new BadRequestException('A custom period needs both from and to');
      }
      from = parse(customFrom);
      to = parse(customTo);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        throw new BadRequestException('from and to must be YYYY-MM-DD dates');
      }
      if (to < from) throw new BadRequestException('to cannot be before from');
      if (days(from, to) + 1 > MAX_CUSTOM_DAYS) {
        throw new BadRequestException('A custom period can be at most 3 years');
      }
      const length = days(from, to) + 1;
      prevTo = new Date(from.getTime() - DAY_MS);
      prevFrom = new Date(prevTo.getTime() - (length - 1) * DAY_MS);
      label = spanLabel(from, to);
      prevLabel = spanLabel(prevFrom, prevTo);
      break;
    }
    case 'this_month':
    default: {
      from = monthStart(y, m);
      to = monthEnd(y, m);
      prevFrom = monthStart(y, m - 1);
      prevTo = monthEnd(y, m - 1);
      label = MONTHS[m];
      prevLabel = MONTHS[prevFrom.getUTCMonth()];
    }
  }

  // A half-done period is compared with the same number of days before it.
  if (today >= from && today <= to) {
    const cut = new Date(prevFrom.getTime() + days(from, today) * DAY_MS);
    if (cut < prevTo) {
      prevTo = cut;
      prevLabel = spanLabel(prevFrom, prevTo);
    }
  }

  return {
    from: fmt(from),
    to: fmt(to),
    previousFrom: fmt(prevFrom),
    previousTo: fmt(prevTo),
    label,
    previousLabel: prevLabel,
  };
}
```

Throwaway check (scratchpad, not committed): run `resolveDashboardRange` with today `2026-10-08` for each period and confirm:
- `this_month` → `2026-10-01..2026-10-31`, previous `2026-09-01..2026-09-08`, labels `Oct` / `1–8 Sep`.
- `last_month` → `2026-09-01..2026-09-30`, previous `2026-08-01..2026-08-31`, `Sep` / `Aug`.
- `this_quarter` → `2026-10-01..2026-12-31`, previous `2026-07-01..2026-07-08`, `Oct–Dec`.
- `this_fy` → `2026-04-01..2027-03-31`, previous `2025-04-01..2025-10-08`, `FY 26-27`.
- `custom 2026-09-01..2026-09-30` → previous `2026-08-02..2026-08-31`.
- `custom` with `to < from` throws.

Run it the same way as Task 1 Step 5.

- [ ] **Step 2: Query DTOs**

`apps/backend/src/modules/projects/dto/dashboard/projects-dashboard-query.dto.ts`:

```ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import type { DashboardFinancing, DashboardPeriod } from '@tejas96/shared/types';
import { STAGE_GROUP_KEYS } from '@tejas96/shared/utils';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export const DASHBOARD_PERIODS: readonly DashboardPeriod[] = [
  'this_month',
  'last_month',
  'this_quarter',
  'this_fy',
  'custom',
];
export const DASHBOARD_FINANCING: readonly DashboardFinancing[] = ['all', 'cash', 'loan'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export class ProjectsDashboardQueryDto {
  @ApiPropertyOptional({ enum: DASHBOARD_PERIODS, default: 'this_month' })
  @IsOptional()
  @IsIn(DASHBOARD_PERIODS)
  period?: DashboardPeriod;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'Required when period=custom' })
  @IsOptional()
  @Matches(ISO_DAY)
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'Required when period=custom' })
  @IsOptional()
  @Matches(ISO_DAY)
  to?: string;

  @ApiPropertyOptional({ enum: DASHBOARD_FINANCING, default: 'all' })
  @IsOptional()
  @IsIn(DASHBOARD_FINANCING)
  financing?: DashboardFinancing;
}

export class StageProjectsQueryDto {
  @ApiProperty({ enum: [...STAGE_GROUP_KEYS, 'none'] })
  @IsIn([...STAGE_GROUP_KEYS, 'none'])
  stage!: string;

  @ApiPropertyOptional({ example: 'Equipment Delivery' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  phase?: string;

  @ApiPropertyOptional({ enum: DASHBOARD_FINANCING, default: 'all' })
  @IsOptional()
  @IsIn(DASHBOARD_FINANCING)
  financing?: DashboardFinancing;
}
```

- [ ] **Step 3: Service**

`apps/backend/src/modules/projects/services/project-dashboard.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import type {
  DashboardRange,
  NeedsActionRow,
  ProjectsDashboard,
  StageGroupKey,
  StageProjects,
} from '@tejas96/shared/types';
import { STAGE_GROUPS } from '@tejas96/shared/utils';
import { DataSource } from 'typeorm';

import { FinanceReportingService } from '../../finance/services/finance-reporting.service';
import { FACTS, PROJECT_FACTS_CTE, factsBetween } from '../sql/project-facts.sql';
import { addDaysIso } from '../utils/dashboard-period';

/**
 * `$1` member pin (null = all projects), `$2` financing ('cash' | 'loan' | null).
 * Same member rule as the project list (`resolveProjectListMemberId`), same
 * financing rule as Finance (`customer_properties.wants_loan`).
 */
const SCOPED = `
  WITH ${PROJECT_FACTS_CTE},
  scoped AS (
    SELECT pf.* FROM project_facts pf
    WHERE ($1::uuid IS NULL OR pf.project_id IN (
            SELECT tm.project_id FROM project_team_members tm WHERE tm.user_id = $1::uuid))
      AND ($2::text IS NULL
           OR ($2::text = 'loan' AND ${FACTS.loan})
           OR ($2::text = 'cash' AND ${FACTS.cash}))
  )`;

const inPeriod = (column: 'created_at' | 'meter_completed_at') => factsBetween(column, '$3', '$4');

/** $3 from, $4 to, $5 previousFrom, $6 previousTo, $7 comingFrom, $8 comingTo, $9 thisWeekTo, $10 nextWeekFrom, $11 nextWeekTo */
const STRIP_SQL = `${SCOPED}
  SELECT
    COUNT(*) FILTER (WHERE ${inPeriod('created_at')})::int AS "onboarded",
    COALESCE(SUM(pf.kw) FILTER (WHERE ${inPeriod('created_at')}), 0)::float AS "onboardedKw",
    COUNT(*) FILTER (WHERE ${inPeriod('created_at')} AND pf.kw IS NULL)::int AS "onboardedKwUnknown",
    COUNT(*) FILTER (WHERE ${inPeriod('created_at')} AND ${FACTS.loan})::int AS "onboardedLoan",
    COUNT(*) FILTER (WHERE ${FACTS.live})::int AS "live",
    COALESCE(SUM(pf.kw) FILTER (WHERE ${FACTS.live}), 0)::float AS "liveKw",
    COUNT(*) FILTER (WHERE ${FACTS.live} AND pf.kw IS NULL)::int AS "liveKwUnknown",
    COUNT(*) FILTER (WHERE ${FACTS.notStarted})::int AS "notStarted",
    COUNT(*) FILTER (WHERE ${FACTS.inProgress})::int AS "inProgress",
    COUNT(*) FILTER (WHERE ${inPeriod('meter_completed_at')})::int AS "meterInstalled",
    COALESCE(SUM(pf.kw) FILTER (WHERE ${inPeriod('meter_completed_at')}), 0)::float AS "meterKw",
    COUNT(*) FILTER (WHERE ${inPeriod('meter_completed_at')} AND pf.kw IS NULL)::int AS "meterKwUnknown",
    COUNT(*) FILTER (WHERE ${factsBetween('meter_completed_at', '$5', '$6')})::int AS "meterInstalledPrevious",
    COUNT(*) FILTER (WHERE ${FACTS.late})::int AS "late",
    COUNT(*) FILTER (WHERE ${FACTS.noStage})::int AS "noStage",
    COUNT(*) FILTER (WHERE ${FACTS.unstagedSteps})::int AS "unstagedSteps",
    COUNT(*) FILTER (WHERE ${FACTS.oldSteps})::int AS "oldStepsOpen",
    COUNT(*) FILTER (WHERE ${FACTS.live} AND ${factsBetween('meter_due_date', '$7', '$8')})::int AS "comingUp",
    COALESCE(SUM(pf.kw) FILTER (WHERE ${FACTS.live} AND ${factsBetween('meter_due_date', '$7', '$8')}), 0)::float AS "comingUpKw",
    COUNT(*) FILTER (WHERE ${FACTS.live} AND ${factsBetween('meter_due_date', '$7', '$9')})::int AS "comingThisWeek",
    COUNT(*) FILTER (WHERE ${FACTS.live} AND ${factsBetween('meter_due_date', '$10', '$11')})::int AS "comingNextWeek"
  FROM scoped pf`;

const STAGES_SQL = `${SCOPED}
  SELECT pf.stage_group AS "stageGroup", pf.current_phase AS "phase",
         COUNT(*)::int AS "count",
         COUNT(*) FILTER (WHERE pf.late_steps > 0)::int AS "late",
         COALESCE(SUM(pf.kw), 0)::float AS "kw"
  FROM scoped pf
  WHERE ${FACTS.live} AND pf.stage_group IS NOT NULL
  GROUP BY 1, 2`;

const CUSTOMER_NAME = `NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '')`;

/** One row per late project: its oldest late step. */
const NEEDS_ACTION_SQL = `${SCOPED},
  late_step AS (
    SELECT DISTINCT ON (t.project_id)
      t.project_id, t.task_id, t.step_name, t.department, t.assigned_to_user_id,
      (CURRENT_DATE - t.end_date)::int AS days_late
    FROM pf_task t
    JOIN scoped pf ON pf.project_id = t.project_id AND ${FACTS.late}
    WHERE NOT t.done AND t.end_date < CURRENT_DATE
    ORDER BY t.project_id, t.end_date ASC, t.task_id
  )
  SELECT ls.project_id AS "projectId", p.project_number AS "projectNumber",
         ${CUSTOMER_NAME} AS "customerName",
         ls.task_id AS "taskId", ls.step_name AS "stepName", ls.department,
         NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), '') AS "assigneeName",
         ls.days_late AS "daysLate",
         COUNT(*) OVER ()::int AS "total"
  FROM late_step ls
  JOIN projects p ON p.id = ls.project_id
  JOIN customer_properties prop ON prop.id = p.property_id
  LEFT JOIN customer_profiles cp ON cp.id = prop.customer_id
  LEFT JOIN users u ON u.id = ls.assigned_to_user_id
  ORDER BY ls.days_late DESC, p.project_number
  LIMIT 8`;

const TEAMS_SQL = `${SCOPED}
  SELECT COALESCE(t.department, 'Other') AS "department", COUNT(*)::int AS "lateSteps"
  FROM pf_task t
  JOIN scoped pf ON pf.project_id = t.project_id AND ${FACTS.live}
  WHERE NOT t.done AND t.end_date < CURRENT_DATE
  GROUP BY 1
  ORDER BY 2 DESC, 1`;

const TREND_SQL = `${SCOPED},
  months AS (
    SELECT generate_series(
      date_trunc('month', CURRENT_DATE) - interval '11 months',
      date_trunc('month', CURRENT_DATE),
      interval '1 month'
    )::date AS m
  )
  SELECT to_char(mo.m, 'YYYY-MM') AS "month",
    COUNT(pf.project_id) FILTER (WHERE date_trunc('month', pf.created_at)::date = mo.m)::int AS "onboarded",
    COALESCE(SUM(pf.kw) FILTER (WHERE date_trunc('month', pf.created_at)::date = mo.m), 0)::float AS "onboardedKw",
    COUNT(pf.project_id) FILTER (WHERE date_trunc('month', pf.meter_completed_at)::date = mo.m)::int AS "meterInstalled",
    COALESCE(SUM(pf.kw) FILTER (WHERE date_trunc('month', pf.meter_completed_at)::date = mo.m), 0)::float AS "meterKw"
  FROM months mo
  LEFT JOIN scoped pf
    ON date_trunc('month', pf.created_at)::date = mo.m
    OR date_trunc('month', pf.meter_completed_at)::date = mo.m
  GROUP BY mo.m
  ORDER BY mo.m`;

/** $3 stage key or 'none', $4 phase or null. */
const STAGE_PROJECTS_SQL = `${SCOPED},
  picked AS (
    SELECT pf.* FROM scoped pf
    WHERE CASE WHEN $3::text = 'none' THEN ${FACTS.noStage}
               ELSE ${FACTS.live} AND pf.stage_group = $3::text END
      AND ($4::text IS NULL OR pf.current_phase = $4::text)
  ),
  worst AS (
    SELECT t.project_id, MAX(CURRENT_DATE - t.end_date)::int AS days_late
    FROM pf_task t
    JOIN picked pk ON pk.project_id = t.project_id
    WHERE NOT t.done AND t.end_date < CURRENT_DATE
    GROUP BY t.project_id
  )
  SELECT pk.project_id AS "projectId", p.project_number AS "projectNumber",
         ${CUSTOMER_NAME} AS "customerName",
         pk.kw, pk.current_phase AS "currentPhase", w.days_late AS "daysLate",
         COUNT(*) OVER ()::int AS "total"
  FROM picked pk
  JOIN projects p ON p.id = pk.project_id
  JOIN customer_properties prop ON prop.id = p.property_id
  LEFT JOIN customer_profiles cp ON cp.id = prop.customer_id
  LEFT JOIN worst w ON w.project_id = pk.project_id
  ORDER BY w.days_late DESC NULLS LAST, p.created_at DESC
  LIMIT 10`;

type Row = Record<string, unknown>;
const num = (v: unknown): number => Number(v ?? 0);

/** Monday-based weeks, IST. */
function comingUpWindow(today: string): {
  from: string;
  to: string;
  thisWeekTo: string;
  nextWeekFrom: string;
  nextWeekTo: string;
} {
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon = 0
  const monday = addDaysIso(today, -weekday);
  return {
    from: today,
    to: addDaysIso(today, 30),
    thisWeekTo: addDaysIso(monday, 6),
    nextWeekFrom: addDaysIso(monday, 7),
    nextWeekTo: addDaysIso(monday, 13),
  };
}

@Injectable()
export class ProjectDashboardService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly finance: FinanceReportingService,
  ) {}

  async getDashboard(input: {
    range: DashboardRange;
    today: string;
    financing: 'cash' | 'loan' | null;
    memberId: string | null;
    includeMoney: boolean;
  }): Promise<ProjectsDashboard> {
    const { range, financing, memberId } = input;
    const base = [memberId, financing];
    const coming = comingUpWindow(input.today);

    const [[s], stageRows, needsRows, teamRows, trendRows, money] = await Promise.all([
      this.dataSource.query(STRIP_SQL, [
        ...base,
        range.from,
        range.to,
        range.previousFrom,
        range.previousTo,
        coming.from,
        coming.to,
        coming.thisWeekTo,
        coming.nextWeekFrom,
        coming.nextWeekTo,
      ]) as Promise<Row[]>,
      this.dataSource.query(STAGES_SQL, base) as Promise<Row[]>,
      this.dataSource.query(NEEDS_ACTION_SQL, base) as Promise<Row[]>,
      this.dataSource.query(TEAMS_SQL, base) as Promise<Row[]>,
      this.dataSource.query(TREND_SQL, base) as Promise<Row[]>,
      input.includeMoney ? this.getMoney(financing) : Promise.resolve(null),
    ]);

    const live = num(s.live);
    const onboarded = num(s.onboarded);
    const onboardedLoan = num(s.onboardedLoan);

    return {
      period: range,
      strip: {
        onboarded: {
          count: onboarded,
          kw: num(s.onboardedKw),
          kwUnknown: num(s.onboardedKwUnknown),
          loan: onboardedLoan,
          cash: onboarded - onboardedLoan,
        },
        live: {
          count: live,
          kw: num(s.liveKw),
          kwUnknown: num(s.liveKwUnknown),
          notStarted: num(s.notStarted),
          inProgress: num(s.inProgress),
        },
        meterInstalled: {
          count: num(s.meterInstalled),
          kw: num(s.meterKw),
          kwUnknown: num(s.meterKwUnknown),
          previousCount: num(s.meterInstalledPrevious),
        },
        late: {
          count: num(s.late),
          percentOfLive: live > 0 ? Math.round((num(s.late) * 100) / live) : 0,
        },
        money,
      },
      stages: STAGE_GROUPS.map((g) => {
        const rows = stageRows.filter((r) => r.stageGroup === g.key);
        return {
          key: g.key as StageGroupKey,
          label: g.label,
          count: rows.reduce((a, r) => a + num(r.count), 0),
          lateCount: rows.reduce((a, r) => a + num(r.late), 0),
          kw: rows.reduce((a, r) => a + num(r.kw), 0),
          phases: g.phases.flatMap((name) => {
            const row = rows.find((r) => r.phase === name);
            return row ? [{ name, count: num(row.count) }] : [];
          }),
        };
      }),
      stageNotes: {
        noStage: num(s.noStage),
        unstagedSteps: num(s.unstagedSteps),
        oldStepsOpen: num(s.oldStepsOpen),
      },
      needsAction: {
        total: needsRows.length > 0 ? num(needsRows[0].total) : 0,
        rows: needsRows.map(
          (r): NeedsActionRow => ({
            projectId: String(r.projectId),
            projectNumber: String(r.projectNumber),
            customerName: (r.customerName as string | null) ?? null,
            taskId: String(r.taskId),
            stepName: String(r.stepName),
            department: (r.department as string | null) ?? null,
            assigneeName: (r.assigneeName as string | null) ?? null,
            daysLate: num(r.daysLate),
          }),
        ),
      },
      teams: teamRows.map((r) => ({ department: String(r.department), lateSteps: num(r.lateSteps) })),
      trend: trendRows.map((r) => ({
        month: String(r.month),
        onboarded: num(r.onboarded),
        onboardedKw: num(r.onboardedKw),
        meterInstalled: num(r.meterInstalled),
        meterKw: num(r.meterKw),
      })),
      comingUp: {
        count: num(s.comingUp),
        kw: num(s.comingUpKw),
        thisWeek: num(s.comingThisWeek),
        nextWeek: num(s.comingNextWeek),
        ...coming,
      },
    };
  }

  async getStageProjects(input: {
    stage: StageGroupKey | 'none';
    phase: string | null;
    financing: 'cash' | 'loan' | null;
    memberId: string | null;
  }): Promise<StageProjects> {
    const rows: Row[] = await this.dataSource.query(STAGE_PROJECTS_SQL, [
      input.memberId,
      input.financing,
      input.stage,
      input.phase,
    ]);
    return {
      total: rows.length > 0 ? num(rows[0].total) : 0,
      rows: rows.map((r) => ({
        projectId: String(r.projectId),
        projectNumber: String(r.projectNumber),
        customerName: (r.customerName as string | null) ?? null,
        kw: r.kw == null ? null : num(r.kw),
        currentPhase: (r.currentPhase as string | null) ?? null,
        daysLate: r.daysLate == null ? null : num(r.daysLate),
      })),
    };
  }

  /**
   * The receivables page's own headline, so the card equals the page it opens.
   * `limit: 1` — only the buckets are read.
   */
  private async getMoney(
    financing: 'cash' | 'loan' | null,
  ): Promise<{ toCollectPaise: number; meterInStillOwedPaise: number }> {
    const [all, recovery] = await Promise.all([
      this.finance.getReceivables({ page: 1, limit: 1, funding: financing }),
      this.finance.getReceivables({ page: 1, limit: 1, scope: 'recovery', funding: financing }),
    ]);
    return {
      toCollectPaise: num(all.buckets.totalOutstandingPaise),
      meterInStillOwedPaise: num(recovery.buckets.totalOutstandingPaise),
    };
  }
}
```

Add `export * from './project-dashboard.service';` to `services/index.ts`.

- [ ] **Step 4: Controller**

`apps/backend/src/modules/projects/controllers/project-dashboard.controller.ts`:

```ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ProjectsDashboard, StageGroupKey, StageProjects } from '@tejas96/shared/types';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { hasAdminBypassRole, resolveProjectListMemberId } from '../../iam/constants';
import {
  ProjectsDashboardQueryDto,
  StageProjectsQueryDto,
} from '../dto/dashboard/projects-dashboard-query.dto';
import { ProjectDashboardService } from '../services/project-dashboard.service';
import { istToday, resolveDashboardRange } from '../utils/dashboard-period';

const toFinancing = (v: string | undefined): 'cash' | 'loan' | null =>
  v === 'cash' || v === 'loan' ? v : null;

/**
 * The /projects portfolio dashboard. Its own controller, registered before
 * ProjectController, so `dashboard` is never read as a project `:id`.
 */
@ApiTags('Projects & Installation')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectDashboardController {
  constructor(private readonly dashboard: ProjectDashboardService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Projects dashboard',
    description:
      'Owner strip, projects by stage, needs action, late steps by team, 12-month trend and ' +
      'meters due — all from PROJECT_FACTS_CTE, so each figure equals the project list it links to.',
  })
  async getDashboard(
    @CurrentUser() user: CurrentUserType,
    @Query() query: ProjectsDashboardQueryDto,
  ): Promise<ProjectsDashboard> {
    const today = istToday();
    const roles = user.roles ?? [];
    const permissions = user.permissions ?? [];
    return this.dashboard.getDashboard({
      range: resolveDashboardRange(query.period ?? 'this_month', query.from, query.to, today),
      today,
      financing: toFinancing(query.financing),
      memberId: resolveProjectListMemberId(roles, permissions, user.id) ?? null,
      includeMoney: hasAdminBypassRole(roles) || permissions.includes('finance.view'),
    });
  }

  @Get('dashboard/stage-projects')
  @ApiOperation({ summary: 'Top 10 projects in one stage, most late first' })
  async getStageProjects(
    @CurrentUser() user: CurrentUserType,
    @Query() query: StageProjectsQueryDto,
  ): Promise<StageProjects> {
    return this.dashboard.getStageProjects({
      stage: query.stage as StageGroupKey | 'none',
      phase: query.phase ?? null,
      financing: toFinancing(query.financing),
      memberId:
        resolveProjectListMemberId(user.roles ?? [], user.permissions ?? [], user.id) ?? null,
    });
  }
}
```

Add `export * from './project-dashboard.controller';` to `controllers/index.ts` (check its style first).

- [ ] **Step 5: Wire the module**

In `projects.module.ts`:
- `import { FinanceModule } from '../finance/finance.module';` and add `FinanceModule` to `imports`.
- Import `ProjectDashboardController` and put it in `controllers` **directly after `ProjectAttentionController` and before `ProjectController`**, with the comment `// static 'dashboard' segments must resolve before ':id'`.
- Import `ProjectDashboardService` and add it to `providers` under `// Services`.

- [ ] **Step 6: Typecheck, lint, existing tests**

Run: `cd /Volumes/works-space/oneohm/oneohm && npm run typecheck:backend && npx nx lint backend && npx nx test backend`
Expected: clean.

- [ ] **Step 7: Restart the backend and check the endpoint against SQL**

Restart the backend (preview_stop + preview_start `backend`). With an admin `$TOKEN`:

```bash
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8085/api/v1/projects/dashboard" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s);console.log(JSON.stringify({period:d.period,strip:d.strip,stages:d.stages.map(x=>[x.key,x.count,x.lateCount]),notes:d.stageNotes,needs:d.needsAction.total,teams:d.teams,coming:d.comingUp},null,1))})"
```

Expected:
- `strip.live.count` = SQL `live`; `strip.late.count` = SQL `late` = `needsAction.total`; sum of `stages[].count` + `stageNotes.noStage` = `strip.live.count`.
- `strip.money.toCollectPaise` = `buckets.totalOutstandingPaise` from `curl …/api/v1/finance/receivables?limit=1`.
- `period.from` = `2026-10-01` (or the current month).
- `trend` has 12 entries, last = current month.

Then:
- `…/projects/dashboard?financing=loan` — every count ≤ the `all` count; `strip.onboarded.cash` = 0.
- `…/projects/dashboard?period=custom&from=2026-09-30&to=2026-09-01` → HTTP 400.
- `…/projects/dashboard/stage-projects?stage=material` → `total` = the `material` stage count; `?stage=bogus` → 400.
- A token with `roles=""` and `permissions="projects.view"` → `strip.money` is `null`.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/works-space/oneohm/oneohm
git add apps/backend/src/modules/projects/utils/dashboard-period.ts apps/backend/src/modules/projects/dto/dashboard apps/backend/src/modules/projects/services/project-dashboard.service.ts apps/backend/src/modules/projects/services/index.ts apps/backend/src/modules/projects/controllers/project-dashboard.controller.ts apps/backend/src/modules/projects/controllers/index.ts apps/backend/src/modules/projects/projects.module.ts
git commit -m "feat(projects): GET /projects/dashboard and stage-projects

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Web data layer — hooks, URL filters, links, format, motion

**Files:**
- Create: `apps/web/lib/hooks/resources/projects-dashboard.ts`
- Modify: `apps/web/lib/hooks/resources/index.ts` (export)
- Create in `apps/web/components/features/projects/components/dashboard/`: `use-dashboard-filters.ts`, `links.ts`, `format.ts`, `motion.ts`

**Interfaces:**
- Consumes: shared types (Task 1), endpoints (Task 3).
- Produces: `useProjectsDashboard(filters: DashboardFilters)`, `useStageProjects(params: StageProjectsParams | null)`, `DashboardFilters`, `useDashboardFilters(): { filters; setFilters(patch); reset() }`, `dashboardLinks.*`, `projectListHref(filters)`, `formatKw`, `formatCount`, `formatPaiseCompact`, `monthLabel`, `ENTER`, `enterDelay(i, stepMs?)`, `usePrefersReducedMotion()`, `useCountUp(target, durationMs?)`.

- [ ] **Step 1: Data hooks**

`apps/web/lib/hooks/resources/projects-dashboard.ts`:

```ts
'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type {
  DashboardFinancing,
  DashboardPeriod,
  ProjectsDashboard,
  StageGroupKey,
  StageProjects,
} from '@tejas96/shared/types';

import { apiClient } from '@/lib/api/client';

export interface DashboardFilters {
  period: DashboardPeriod;
  /** Only with period 'custom'. */
  from?: string;
  to?: string;
  financing: DashboardFinancing;
}

export interface StageProjectsParams {
  stage: StageGroupKey | 'none';
  phase?: string;
  financing: DashboardFinancing;
}

export const projectsDashboardKeys = {
  all: ['projects-dashboard'] as const,
  summary: (f: DashboardFilters) => ['projects-dashboard', 'summary', f] as const,
  stage: (p: StageProjectsParams) => ['projects-dashboard', 'stage', p] as const,
};

/**
 * `keepPreviousData`: a filter change keeps the old numbers on screen and
 * tweens them to the new ones, instead of flashing back to skeletons.
 */
export function useProjectsDashboard(
  filters: DashboardFilters,
): UseQueryResult<ProjectsDashboard> {
  return useQuery({
    queryKey: projectsDashboardKeys.summary(filters),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ period: filters.period, financing: filters.financing });
      if (filters.period === 'custom' && filters.from && filters.to) {
        params.set('from', filters.from);
        params.set('to', filters.to);
      }
      const { data } = await apiClient.get<ProjectsDashboard>(`/projects/dashboard?${params}`, {
        signal,
      });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useStageProjects(
  params: StageProjectsParams | null,
): UseQueryResult<StageProjects> {
  return useQuery({
    queryKey: params
      ? projectsDashboardKeys.stage(params)
      : [...projectsDashboardKeys.all, 'stage', 'closed'],
    queryFn: async ({ signal }) => {
      const p = params as StageProjectsParams;
      const search = new URLSearchParams({ stage: p.stage, financing: p.financing });
      if (p.phase) search.set('phase', p.phase);
      const { data } = await apiClient.get<StageProjects>(
        `/projects/dashboard/stage-projects?${search}`,
        { signal },
      );
      return data;
    },
    enabled: params !== null,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
```

Add to `apps/web/lib/hooks/resources/index.ts` (match the file's export style):

```ts
export {
  useProjectsDashboard,
  useStageProjects,
  projectsDashboardKeys,
  type DashboardFilters,
  type StageProjectsParams,
} from './projects-dashboard';
```

- [ ] **Step 2: URL filters**

`dashboard/use-dashboard-filters.ts`:

```ts
'use client';

import type { DashboardFinancing, DashboardPeriod } from '@tejas96/shared/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import type { DashboardFilters } from '@/lib/hooks/resources';

const PERIODS: readonly DashboardPeriod[] = [
  'this_month',
  'last_month',
  'this_quarter',
  'this_fy',
  'custom',
];
const FINANCING: readonly DashboardFinancing[] = ['all', 'cash', 'loan'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  period: 'this_month',
  financing: 'all',
};

/** Bad or half-filled values fall back to the defaults — a stale link must still open. */
export function readDashboardFilters(params: URLSearchParams): DashboardFilters {
  const rawPeriod = params.get('period');
  const rawType = params.get('type');
  const financing = FINANCING.includes(rawType as DashboardFinancing)
    ? (rawType as DashboardFinancing)
    : 'all';
  const period = PERIODS.includes(rawPeriod as DashboardPeriod)
    ? (rawPeriod as DashboardPeriod)
    : 'this_month';
  if (period !== 'custom') return { period, financing };

  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  if (!ISO_DAY.test(from) || !ISO_DAY.test(to) || from > to) {
    return { ...DEFAULT_DASHBOARD_FILTERS, financing };
  }
  return { period, from, to, financing };
}

export function useDashboardFilters(): {
  filters: DashboardFilters;
  setFilters: (patch: Partial<DashboardFilters>) => void;
  reset: () => void;
  isDefault: boolean;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => readDashboardFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const write = useCallback(
    (next: DashboardFilters) => {
      const params = new URLSearchParams();
      if (next.period !== 'this_month') params.set('period', next.period);
      if (next.period === 'custom' && next.from && next.to) {
        params.set('from', next.from);
        params.set('to', next.to);
      }
      if (next.financing !== 'all') params.set('type', next.financing);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const setFilters = useCallback(
    (patch: Partial<DashboardFilters>) => {
      const next = { ...filters, ...patch };
      if (next.period !== 'custom') {
        delete next.from;
        delete next.to;
      }
      write(next);
    },
    [filters, write],
  );

  const reset = useCallback(() => write(DEFAULT_DASHBOARD_FILTERS), [write]);
  const isDefault = filters.period === 'this_month' && filters.financing === 'all';

  return { filters, setFilters, reset, isDefault };
}
```

- [ ] **Step 3: Links — the only place dashboard URLs are built**

`dashboard/links.ts`:

```ts
import type {
  DashboardFinancing,
  ProjectAttention,
  StageGroupKey,
} from '@tejas96/shared/types';

import { ROUTES } from '@/lib/config/routes';

type ListFilters = Record<string, unknown>;

/**
 * The project list keeps its filters as JSON under `projects_filters`
 * (`useTableUrlState`, prefix "projects"). `status: 'all'` is explicit: the
 * dashboard counts every non-cancelled project whatever its status field says
 * (spec D5), and the list otherwise opens on Active only.
 */
export function projectListHref(filters: ListFilters): string {
  const params = new URLSearchParams();
  params.set('projects_filters', JSON.stringify({ status: 'all', ...filters }));
  return `${ROUTES.PROJECTS.LIST}?${params.toString()}`;
}

const fin = (f: DashboardFinancing): ListFilters => (f === 'all' ? {} : { financing: f });

function monthBounds(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

export const dashboardLinks = {
  onboarded: (from: string, to: string, f: DashboardFinancing) =>
    projectListHref({ ...fin(f), onboarded: { from, to } }),
  live: (f: DashboardFinancing) => projectListHref({ ...fin(f), progress: 'live' }),
  notStarted: (f: DashboardFinancing) => projectListHref({ ...fin(f), progress: 'not_started' }),
  inProgress: (f: DashboardFinancing) => projectListHref({ ...fin(f), progress: 'in_progress' }),
  meterInstalled: (from: string, to: string, f: DashboardFinancing) =>
    projectListHref({ ...fin(f), meterInstalled: { from, to } }),
  attention: (a: ProjectAttention, f: DashboardFinancing) =>
    projectListHref({ ...fin(f), attention: a }),
  stage: (stage: StageGroupKey | 'none', f: DashboardFinancing, phase?: string) =>
    projectListHref({ ...fin(f), ...(phase ? { phase } : { stage }) }),
  meterDue: (from: string, to: string, f: DashboardFinancing) =>
    projectListHref({ ...fin(f), meterDue: { from, to } }),
  month: (kind: 'onboarded' | 'meterInstalled', month: string, f: DashboardFinancing) => {
    const { from, to } = monthBounds(month);
    return projectListHref({ ...fin(f), [kind]: { from, to } });
  },
  project: (projectId: string) => `/projects/${projectId}`,
  task: (projectId: string, taskId: string) =>
    `/projects/${projectId}?${new URLSearchParams({ tab: 'tasks', t_task: taskId })}`,
  workload: (department: string) =>
    `/workload?${new URLSearchParams({ department })}`,
  receivables: (f: DashboardFinancing) =>
    f === 'all' ? ROUTES.FINANCE.RECEIVABLES : `${ROUTES.FINANCE.RECEIVABLES}?funding=${f}`,
  recovery: (f: DashboardFinancing) =>
    `${ROUTES.FINANCE.RECEIVABLES}?scope=${f === 'all' ? 'recovery' : `recovery-${f}`}`,
};
```

Check `ROUTES.FINANCE.RECEIVABLES` is the key name in `apps/web/lib/config/routes.ts` (line ~140 shows `RECEIVABLES: '/finance/receivables'`; confirm its parent key) and adjust the two references if the parent is named differently.

Note on `stage(..., phase)`: a phase link sends only `phase`, because the phase already implies its stage; sending both would be redundant, not wrong.

- [ ] **Step 4: Format + motion helpers**

`dashboard/format.ts`:

```ts
import { formatNumber, formatSystemSize } from '@tejas96/shared/utils';

import { formatPaise } from '@/lib/utils/paise';

/** "842 kW" for big totals, "46.5 kW" below 100. */
export function formatKw(kw: number): string {
  if (kw >= 100) return `${formatNumber(Math.round(kw))} kW`;
  return `${formatSystemSize(Math.round(kw * 10) / 10)} kW`;
}

export function formatCount(n: number): string {
  return formatNumber(Math.round(n));
}

/** Same compact form the receivables page uses, so the two screens read alike. */
export function formatPaiseCompact(paise: number): string {
  return formatPaise(Math.round(paise), { compact: true });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Oct", or "Jan 26" so the year change is visible on the axis. */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `Jan ${String(y).slice(2)}` : MONTHS[m - 1];
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}
```

`dashboard/motion.ts`:

```ts
'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';

/** Entrance: fade + rise once. `motion-reduce` turns it off. */
export const ENTER = 'animate-fade-in motion-reduce:animate-none';

export function enterDelay(index: number, stepMs = 60): CSSProperties {
  return { animationDelay: `${index * stepMs}ms`, animationFillMode: 'both' };
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (): void => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/**
 * Counts up from 0 on first render, then tweens from the shown value to each
 * new target — a filter change slides the number instead of replaying the
 * entrance. Returns a float; format it at the call site.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  const shown = useRef(0);

  useEffect(() => {
    if (reduced) {
      shown.current = target;
      setValue(target);
      return undefined;
    }
    const from = shown.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number): void => {
      const p = Math.min(1, (now - start) / durationMs);
      const next = from + (target - from) * (1 - (1 - p) ** 3);
      shown.current = next;
      setValue(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduced]);

  return value;
}
```

The old dashboard files stay untouched in this task (the old page still imports them); Task 5 deletes them. Do not edit `dashboard/index.ts` here.

- [ ] **Step 5: Typecheck, lint, commit**

Run: `cd /Volumes/works-space/oneohm/oneohm && npm run typecheck:web && npx nx lint web`
Expected: clean (the new files are not imported yet; the old page still builds).

```bash
cd /Volumes/works-space/oneohm/oneohm
git add apps/web/lib/hooks/resources/projects-dashboard.ts apps/web/lib/hooks/resources/index.ts apps/web/components/features/projects/components/dashboard/use-dashboard-filters.ts apps/web/components/features/projects/components/dashboard/links.ts apps/web/components/features/projects/components/dashboard/format.ts apps/web/components/features/projects/components/dashboard/motion.ts
git commit -m "feat(web): projects dashboard data hooks, URL filters, links, motion helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Dashboard UI

**Files:**
- Create in `apps/web/components/features/projects/components/dashboard/`: `animated-number.tsx`, `band-state.tsx`, `filter-bar.tsx`, `owner-strip.tsx`, `stage-pipeline.tsx`, `stage-panel.tsx`, `needs-action.tsx`, `stuck-by-team.tsx`, `trend-chart.tsx`, `coming-up.tsx`; rewrite `index.ts`
- Rewrite: `apps/web/components/features/projects/components/project-dashboard-page.tsx`
- Delete: `dashboard/{critical-alerts,kpi-grid,progress-trend,project-milestones,worker-matrix}.tsx`

**Interfaces:**
- Consumes: everything from Task 4; `GatedLink` (`@/components/features/dashboard/business/components/gated-link`), `useGatedAction` (`@/lib/rbac`), `MUISelect`, `MUIDateRangePicker` (`@/components/ui`).
- Produces: the `/projects` page.

Styling rules for every band (house pattern from `features/dashboard/components/section-card.tsx`): card `rounded-xl bg-surface p-5 shadow-e2`; title `text-sm font-semibold text-foreground`; aside `text-2xs text-foreground-tertiary`; secondary text `text-foreground-secondary`; links hover `text-primary-dark`; late = `text-error` / `bg-error`.

- [ ] **Step 1: Small shared pieces**

`dashboard/animated-number.tsx`:

```tsx
'use client';

import * as React from 'react';

import { formatCount } from './format';
import { useCountUp } from './motion';

export function AnimatedNumber({
  value,
  format = formatCount,
}: {
  value: number;
  format?: (n: number) => string;
}): React.JSX.Element {
  const shown = useCountUp(value);
  // Screen readers get the real value, not every frame of the tween.
  return (
    <>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
```

`dashboard/band-state.tsx`:

```tsx
'use client';

import Skeleton from '@mui/material/Skeleton';
import { RotateCw } from 'lucide-react';
import * as React from 'react';

export function BandError({ what, onRetry }: { what: string; onRetry: () => void }): React.JSX.Element {
  return (
    <section className="rounded-xl bg-surface p-5 shadow-e2">
      <p className="text-sm text-foreground-secondary">Could not load {what}.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-pill bg-accent-subtle px-3 text-xs font-medium text-primary-dark"
      >
        <RotateCw className="size-3" aria-hidden="true" />
        Retry
      </button>
    </section>
  );
}

/** Same shapes as the real bands, so nothing jumps when data lands. */
export function DashboardSkeleton(): React.JSX.Element {
  const card = 'rounded-xl bg-surface p-5 shadow-e2';
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={card}>
            <Skeleton variant="text" width="50%" />
            <Skeleton variant="text" width="40%" height={36} />
            <Skeleton variant="text" width="70%" />
          </div>
        ))}
      </div>
      <div className={card}>
        <Skeleton variant="rounded" height={190} />
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        <div className={`${card} lg:col-span-3`}>
          <Skeleton variant="rounded" height={260} />
        </div>
        <div className={`${card} lg:col-span-2`}>
          <Skeleton variant="rounded" height={260} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Filter bar**

`dashboard/filter-bar.tsx`:

```tsx
'use client';

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { DashboardFinancing, DashboardPeriod } from '@tejas96/shared/types';
import * as React from 'react';

import { MUIDateRangePicker, MUISelect } from '@/components/ui';
import type { DashboardFilters } from '@/lib/hooks/resources';

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'this_fy', label: 'This financial year' },
  { value: 'custom', label: 'Custom dates' },
];

const MAX_DAYS = 1096;

function toIsoDay(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * One period picker and one Cash/Loan switch for the whole page (spec D2).
 * A custom range is applied only once both dates are set and valid, so half a
 * range never fires a request.
 */
export function FilterBar({
  filters,
  onChange,
}: {
  filters: DashboardFilters;
  onChange: (patch: Partial<DashboardFilters>) => void;
}): React.JSX.Element {
  const [customOpen, setCustomOpen] = React.useState(filters.period === 'custom');
  const [draft, setDraft] = React.useState<{ from?: string; to?: string }>({
    from: filters.from,
    to: filters.to,
  });
  const [error, setError] = React.useState<string | null>(null);

  const applyDraft = (next: { from?: string; to?: string }): void => {
    setDraft(next);
    if (!next.from || !next.to) return setError(null);
    if (next.from > next.to) return setError('"To" is before "From".');
    const span = (Date.parse(next.to) - Date.parse(next.from)) / 86_400_000 + 1;
    if (span > MAX_DAYS) return setError('Pick 3 years or less.');
    setError(null);
    onChange({ period: 'custom', from: next.from, to: next.to });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MUISelect
        size="small"
        aria-label="Period"
        value={customOpen ? 'custom' : filters.period}
        options={PERIOD_OPTIONS}
        onChange={(e) => {
          const value = e.target.value as DashboardPeriod;
          if (value === 'custom') {
            setCustomOpen(true);
            return;
          }
          setCustomOpen(false);
          setError(null);
          onChange({ period: value });
        }}
        sx={{ minWidth: 168 }}
      />
      {customOpen ? (
        <div className="flex flex-col">
          <MUIDateRangePicker
            fromDate={draft.from ?? null}
            toDate={draft.to ?? null}
            onFromChange={(d) => applyDraft({ ...draft, from: d ? toIsoDay(d) : undefined })}
            onToChange={(d) => applyDraft({ ...draft, to: d ? toIsoDay(d) : undefined })}
          />
          {error ? (
            <p role="alert" className="mt-1 text-xs text-error">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
      <ToggleButtonGroup
        exclusive
        size="small"
        value={filters.financing}
        onChange={(_, next: DashboardFinancing | null) => {
          // MUI returns null when the active button is clicked again.
          if (next) onChange({ financing: next });
        }}
        aria-label="Cash or loan projects"
      >
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="cash">Cash</ToggleButton>
        <ToggleButton value="loan">Loan</ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
}
```

If `MUISelect`'s `onChange` type differs (check `components/ui/mui-select.tsx` props — it extends MUI `SelectProps`), adapt the handler signature only; keep the behaviour.

- [ ] **Step 3: Owner strip**

`dashboard/owner-strip.tsx`:

```tsx
'use client';

import type { DashboardFinancing, ProjectsDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { AnimatedNumber } from './animated-number';
import { formatKw, formatPaiseCompact } from './format';
import { dashboardLinks } from './links';
import { ENTER, enterDelay } from './motion';

import { GatedLink } from '@/components/features/dashboard/business/components/gated-link';
import { cn } from '@/lib/utils';

const BIG =
  'block text-2xl font-semibold tabular-nums text-foreground hover:text-primary-dark focus-visible:underline';
const SMALL = 'text-xs text-foreground-tertiary hover:text-primary-dark hover:underline';

function Stat({
  label,
  tag,
  index,
  children,
}: {
  label: string;
  tag?: string;
  index: number;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-xl bg-surface p-4 shadow-e2 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none',
        ENTER,
      )}
      style={enterDelay(index)}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="truncate text-xs font-medium text-foreground-secondary">{label}</h2>
        {tag ? <span className="shrink-0 text-2xs text-foreground-tertiary">{tag}</span> : null}
      </header>
      {children}
    </section>
  );
}

function kwLine(kw: number, unknown: number): string {
  return unknown > 0 ? `${formatKw(kw)} · ${unknown} without kW` : formatKw(kw);
}

export function OwnerStrip({
  data,
  financing,
}: {
  data: ProjectsDashboard;
  financing: DashboardFinancing;
}): React.JSX.Element {
  const { strip, period } = data;
  const delta = strip.meterInstalled.count - strip.meterInstalled.previousCount;
  const money = strip.money;

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 md:grid-cols-3',
        money ? 'xl:grid-cols-5' : 'xl:grid-cols-4',
      )}
    >
      <Stat label="Onboarded" tag={period.label} index={0}>
        <Link href={dashboardLinks.onboarded(period.from, period.to, financing)} className={BIG}>
          <AnimatedNumber value={strip.onboarded.count} />
        </Link>
        <span className="text-xs text-foreground-tertiary">
          {kwLine(strip.onboarded.kw, strip.onboarded.kwUnknown)}
        </span>
        {financing === 'all' ? (
          <span className="text-xs text-foreground-tertiary">
            <Link
              className={SMALL}
              href={dashboardLinks.onboarded(period.from, period.to, 'cash')}
            >
              {strip.onboarded.cash} cash
            </Link>
            {' · '}
            <Link
              className={SMALL}
              href={dashboardLinks.onboarded(period.from, period.to, 'loan')}
            >
              {strip.onboarded.loan} loan
            </Link>
          </span>
        ) : null}
      </Stat>

      <Stat label="Live now" index={1}>
        <Link href={dashboardLinks.live(financing)} className={BIG}>
          <AnimatedNumber value={strip.live.count} />
        </Link>
        <Link href={dashboardLinks.notStarted(financing)} className={SMALL}>
          {strip.live.notStarted} not started
        </Link>
        <Link href={dashboardLinks.inProgress(financing)} className={SMALL}>
          {strip.live.inProgress} in progress
        </Link>
        <span className="text-xs text-foreground-tertiary">
          {kwLine(strip.live.kw, strip.live.kwUnknown)} in work
        </span>
      </Stat>

      <Stat label="Meter installed" tag={period.label} index={2}>
        <Link
          href={dashboardLinks.meterInstalled(period.from, period.to, financing)}
          className={BIG}
        >
          <AnimatedNumber value={strip.meterInstalled.count} />
        </Link>
        <span className="text-xs text-foreground-tertiary">
          <span
            className={cn(
              'font-medium',
              delta > 0 && 'text-success',
              delta < 0 && 'text-error',
            )}
          >
            {delta > 0 ? `+${delta}` : delta < 0 ? `−${Math.abs(delta)}` : 'Same'}
          </span>{' '}
          vs {period.previousLabel}
        </span>
        <span className="text-xs text-foreground-tertiary">
          {kwLine(strip.meterInstalled.kw, strip.meterInstalled.kwUnknown)}
        </span>
      </Stat>

      <Stat label="Running late" index={3}>
        <Link
          href={dashboardLinks.attention('late_steps', financing)}
          className={cn(BIG, strip.late.count > 0 && 'text-error')}
        >
          <AnimatedNumber value={strip.late.count} />
        </Link>
        <span className="text-xs text-foreground-tertiary">
          {strip.late.percentOfLive}% of live projects
        </span>
      </Stat>

      {money ? (
        <Stat label="To collect" index={4}>
          <GatedLink
            href={dashboardLinks.receivables(financing)}
            gate="finance.receivables.view"
            subject="Receivables"
            className={BIG}
          >
            <AnimatedNumber value={money.toCollectPaise} format={formatPaiseCompact} />
          </GatedLink>
          <GatedLink
            href={dashboardLinks.recovery(financing)}
            gate="finance.receivables.view"
            subject="Recovery"
            className={SMALL}
          >
            {formatPaiseCompact(money.meterInStillOwedPaise)} with meter in
          </GatedLink>
        </Stat>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Stage pipeline and its panel**

`dashboard/stage-pipeline.tsx`:

```tsx
'use client';

import type { DashboardFinancing, ProjectsDashboard, StageGroupKey } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { AnimatedNumber } from './animated-number';
import { formatKw } from './format';
import { dashboardLinks } from './links';
import { ENTER, enterDelay } from './motion';

import { cn } from '@/lib/utils';

/**
 * The hero: where every live project is, left to right in lifecycle order.
 * Bars grow from zero once, staggered, so the eye follows the flow of work;
 * after that they only resize. The red base of each bar is its late projects.
 */
export function StagePipeline({
  data,
  financing,
  onOpenStage,
}: {
  data: ProjectsDashboard;
  financing: DashboardFinancing;
  onOpenStage: (key: StageGroupKey) => void;
}): React.JSX.Element {
  const [grown, setGrown] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const max = Math.max(1, ...data.stages.map((s) => s.count));
  const totalLive = data.stages.reduce((a, s) => a + s.count, 0);
  const notes = [
    {
      n: data.stageNotes.noStage,
      label: 'No stage yet',
      href: dashboardLinks.stage('none', financing),
    },
    {
      n: data.stageNotes.unstagedSteps,
      label: 'Steps without a stage',
      href: dashboardLinks.attention('unstaged_steps', financing),
    },
    {
      n: data.stageNotes.oldStepsOpen,
      label: 'Old steps left open',
      href: dashboardLinks.attention('old_steps', financing),
    },
  ].filter((note) => note.n > 0);

  return (
    <section className={cn('rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(5)}>
      <header className="flex flex-wrap items-baseline justify-between gap-2 pb-4">
        <h2 className="text-sm font-semibold text-foreground">Where every project is</h2>
        <span className="text-2xs text-foreground-tertiary">
          <span
            aria-hidden="true"
            className="mr-1 inline-block size-2 rounded-sm bg-error align-middle"
          />
          late · select a stage to see its projects
        </span>
      </header>

      {totalLive === 0 && data.stageNotes.noStage === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-secondary">No live projects.</p>
      ) : (
        <ol className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {data.stages.map((s, i) => {
            const height = grown ? (s.count / max) * 100 : 0;
            const latePct = s.count > 0 ? (s.lateCount / s.count) * 100 : 0;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => onOpenStage(s.key)}
                  disabled={s.count === 0}
                  aria-label={`${s.label}: ${s.count} projects, ${s.lateCount} late. Show projects.`}
                  className="group flex w-full flex-col gap-2 rounded-lg p-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default"
                >
                  <span className="text-center text-sm font-semibold tabular-nums text-foreground">
                    <AnimatedNumber value={s.count} />
                  </span>
                  <span className="flex h-32 flex-col justify-end overflow-hidden rounded-md bg-surface-alt">
                    <span
                      className="flex w-full flex-col justify-end overflow-hidden rounded-md bg-primary-light transition-[height] duration-700 ease-out group-hover:brightness-95 motion-reduce:transition-none"
                      style={{ height: `${height}%`, transitionDelay: grown ? `${i * 60}ms` : '0ms' }}
                    >
                      <span className="w-full bg-error" style={{ height: `${latePct}%` }} />
                    </span>
                  </span>
                  <span className="block truncate text-center text-xs text-foreground-secondary">
                    {s.label}
                  </span>
                  <span className="block text-center text-2xs text-foreground-tertiary">
                    {s.lateCount > 0 ? `${s.lateCount} late · ` : ''}
                    {formatKw(s.kw)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {notes.length > 0 ? (
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs">
          {notes.map((note) => (
            <Link
              key={note.label}
              href={note.href}
              className="text-foreground-secondary hover:text-primary-dark hover:underline"
            >
              {note.label}: {note.n}
            </Link>
          ))}
        </p>
      ) : null}
    </section>
  );
}
```

`dashboard/stage-panel.tsx`:

```tsx
'use client';

import Drawer from '@mui/material/Drawer';
import Skeleton from '@mui/material/Skeleton';
import type { DashboardFinancing, ProjectsDashboard, StageGroupKey } from '@tejas96/shared/types';
import { X } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { BandError } from './band-state';
import { dashboardLinks } from './links';

import { useStageProjects } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

/**
 * The projects behind one stage bar. Phase chips narrow both the rows and the
 * "Open in list" link. MUI Drawer with the DrillDownDrawer shell, which has no
 * slot for the chips.
 */
export function StagePanel({
  stageKey,
  data,
  financing,
  onClose,
}: {
  stageKey: StageGroupKey | null;
  data: ProjectsDashboard;
  financing: DashboardFinancing;
  onClose: () => void;
}): React.JSX.Element {
  const [phase, setPhase] = React.useState<string | undefined>(undefined);
  React.useEffect(() => setPhase(undefined), [stageKey]);

  const stage = data.stages.find((s) => s.key === stageKey);
  const query = useStageProjects(stageKey ? { stage: stageKey, phase, financing } : null);
  const total = query.data?.total ?? 0;

  return (
    <Drawer
      anchor="right"
      open={stageKey !== null}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 440 } } }}
    >
      {stage ? (
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">{stage.label}</h2>
              <p className="text-xs text-foreground-secondary">
                {stage.count} projects{stage.lateCount > 0 ? ` · ${stage.lateCount} late` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-foreground-tertiary hover:bg-surface-alt"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </header>

          {stage.phases.length > 1 ? (
            <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
              {stage.phases.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  aria-pressed={phase === p.name}
                  onClick={() => setPhase((cur) => (cur === p.name ? undefined : p.name))}
                  className={cn(
                    'rounded-pill px-3 py-1 text-xs',
                    phase === p.name
                      ? 'bg-primary text-white'
                      : 'bg-accent-subtle text-primary-dark hover:brightness-95',
                  )}
                >
                  {p.name} · {p.count}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto">
            {query.isError ? (
              <div className="p-5">
                <BandError what="these projects" onRetry={() => void query.refetch()} />
              </div>
            ) : query.isLoading ? (
              <div className="flex flex-col gap-3 p-5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} variant="rounded" height={44} />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {(query.data?.rows ?? []).map((row) => (
                  <li key={row.projectId}>
                    <Link
                      href={dashboardLinks.project(row.projectId)}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-alt"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-foreground" title={row.customerName ?? row.projectNumber}>
                          {row.customerName ?? row.projectNumber}
                        </span>
                        <span className="block truncate text-xs text-foreground-tertiary">
                          {row.projectNumber}
                          {row.currentPhase ? ` · ${row.currentPhase}` : ''}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'shrink-0 text-xs tabular-nums',
                          row.daysLate ? 'text-error' : 'text-foreground-tertiary',
                        )}
                      >
                        {row.daysLate ? `${row.daysLate} d late` : 'On time'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-border p-5 text-xs">
            <span className="text-foreground-tertiary">
              {total > 10 ? `Showing 10 of ${total}` : `${total} projects`}
            </span>
            <Link
              href={dashboardLinks.stage(stage.key, financing, phase)}
              className="font-medium text-primary-dark hover:underline"
            >
              Open all {total} in list →
            </Link>
          </footer>
        </div>
      ) : null}
    </Drawer>
  );
}
```

- [ ] **Step 5: Needs action, stuck by team, trend, coming up**

`dashboard/needs-action.tsx`:

```tsx
'use client';

import type { DashboardFinancing, ProjectsDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { dashboardLinks } from './links';
import { ENTER, enterDelay } from './motion';

import { cn } from '@/lib/utils';

export function NeedsAction({
  data,
  financing,
}: {
  data: ProjectsDashboard;
  financing: DashboardFinancing;
}): React.JSX.Element {
  const { rows, total } = data.needsAction;
  return (
    <section className={cn('rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(6)}>
      <header className="flex items-baseline justify-between gap-2 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Needs action</h2>
        <span className="text-2xs text-foreground-tertiary">most late first</span>
      </header>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-secondary">Nothing is late.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row, i) => (
            <li key={row.taskId} className={ENTER} style={enterDelay(i, 40)}>
              <Link
                href={dashboardLinks.task(row.projectId, row.taskId)}
                className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 hover:bg-surface-alt"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground" title={row.customerName ?? row.projectNumber}>
                    {row.customerName ?? row.projectNumber}
                  </span>
                  <span className="block truncate text-xs text-foreground-tertiary">
                    {row.stepName}
                    {row.department ? ` · ${row.department.replace(/ Department$/, '')}` : ''}
                    {' · '}
                    {row.assigneeName ?? <span className="text-error">Unassigned</span>}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium tabular-nums text-error">
                  {row.daysLate} d late
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {total > rows.length ? (
        <Link
          href={dashboardLinks.attention('late_steps', financing)}
          className="mt-3 inline-block text-xs font-medium text-primary-dark hover:underline"
        >
          See all {total} →
        </Link>
      ) : null}
    </section>
  );
}
```

`dashboard/stuck-by-team.tsx`:

```tsx
'use client';

import type { DashboardFinancing, ProjectsDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { dashboardLinks } from './links';
import { ENTER, enterDelay } from './motion';

import { cn } from '@/lib/utils';

/**
 * Late steps per department. "Other" (steps with no department) links to the
 * project list instead: /workload drops those steps, so it would show nothing.
 */
export function StuckByTeam({
  data,
  financing,
}: {
  data: ProjectsDashboard;
  financing: DashboardFinancing;
}): React.JSX.Element {
  const max = Math.max(1, ...data.teams.map((t) => t.lateSteps));
  return (
    <section className={cn('rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(7)}>
      <header className="flex items-baseline justify-between gap-2 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Stuck by team</h2>
        <span className="text-2xs text-foreground-tertiary">late steps</span>
      </header>
      {data.teams.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-secondary">No late steps.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.teams.map((team) => (
            <li key={team.department}>
              <Link
                href={
                  team.department === 'Other'
                    ? dashboardLinks.attention('late_steps', financing)
                    : dashboardLinks.workload(team.department)
                }
                className="-mx-2 grid grid-cols-[minmax(0,1fr)_96px_32px] items-center gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-surface-alt"
              >
                <span className="truncate text-foreground">
                  {team.department.replace(/ Department$/, '')}
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
                  <span
                    className="block h-full rounded-full bg-error transition-[width] duration-700 ease-out motion-reduce:transition-none"
                    style={{ width: `${(team.lateSteps / max) * 100}%` }}
                  />
                </span>
                <span className="text-right tabular-nums text-foreground">{team.lateSteps}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

`dashboard/trend-chart.tsx`:

```tsx
'use client';

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { DashboardFinancing, ProjectsDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatKw, monthLabel } from './format';
import { dashboardLinks } from './links';
import { ENTER, enterDelay, usePrefersReducedMotion } from './motion';

import { cn } from '@/lib/utils';

type Unit = 'projects' | 'kw';

const COLORS = {
  onboarded: 'var(--ds-neutral-300)',
  meter: 'var(--ds-primary)',
  grid: 'var(--ds-hairline)',
  axis: 'var(--ds-neutral-500)',
};

export function TrendChart({
  data,
  financing,
}: {
  data: ProjectsDashboard;
  financing: DashboardFinancing;
}): React.JSX.Element {
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const [unit, setUnit] = React.useState<Unit>('projects');

  const rows = data.trend.map((t) => ({
    month: t.month,
    label: monthLabel(t.month),
    onboarded: unit === 'projects' ? t.onboarded : Math.round(t.onboardedKw * 10) / 10,
    meter: unit === 'projects' ? t.meterInstalled : Math.round(t.meterKw * 10) / 10,
  }));

  const open = (kind: 'onboarded' | 'meterInstalled') => (entry: unknown) => {
    const month = (entry as { payload?: { month?: string } }).payload?.month;
    if (month) router.push(dashboardLinks.month(kind, month, financing));
  };
  const fmt = (v: number): string => (unit === 'kw' ? formatKw(v) : String(v));

  return (
    <section className={cn('rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(8)}>
      <header className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Last 12 months</h2>
          <p className="text-2xs text-foreground-tertiary">
            <span aria-hidden="true" className="mr-1 inline-block size-2 rounded-sm align-middle" style={{ background: COLORS.onboarded }} />
            onboarded
            <span aria-hidden="true" className="ml-3 mr-1 inline-block size-2 rounded-sm align-middle" style={{ background: COLORS.meter }} />
            meter installed · select a bar to see its projects
          </p>
        </div>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={unit}
          onChange={(_, next: Unit | null) => next && setUnit(next)}
          aria-label="Chart unit"
        >
          <ToggleButton value="projects">Projects</ToggleButton>
          <ToggleButton value="kw">kW</ToggleButton>
        </ToggleButtonGroup>
      </header>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} barGap={2} margin={{ top: 8, right: 0, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: COLORS.axis }} />
            <YAxis allowDecimals={unit === 'kw'} tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: COLORS.axis }} />
            <Tooltip
              cursor={{ fill: 'var(--ds-canvas-sunken)' }}
              formatter={(value: number, name: string) => [fmt(value), name]}
            />
            <Bar dataKey="onboarded" name="Onboarded" fill={COLORS.onboarded} radius={[3, 3, 0, 0]} isAnimationActive={!reduced} animationDuration={700} cursor="pointer" onClick={open('onboarded')} />
            <Bar dataKey="meter" name="Meter installed" fill={COLORS.meter} radius={[3, 3, 0, 0]} isAnimationActive={!reduced} animationDuration={700} animationBegin={150} cursor="pointer" onClick={open('meterInstalled')} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Keyboard and screen-reader route to the same lists the bars open. */}
      <ul className="sr-only">
        {data.trend.map((t) => (
          <li key={t.month}>
            {monthLabel(t.month)}:{' '}
            <Link href={dashboardLinks.month('onboarded', t.month, financing)}>{t.onboarded} onboarded</Link>,{' '}
            <Link href={dashboardLinks.month('meterInstalled', t.month, financing)}>{t.meterInstalled} meters installed</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

If Recharts 3 types reject the `formatter` or `onClick` signatures, widen the parameter types to what `recharts` exports (`Formatter`, `BarProps['onClick']`) — do not change behaviour.

`dashboard/coming-up.tsx`:

```tsx
'use client';

import type { DashboardFinancing, ProjectsDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { AnimatedNumber } from './animated-number';
import { formatKw } from './format';
import { dashboardLinks } from './links';
import { ENTER, enterDelay } from './motion';

import { cn } from '@/lib/utils';

/** Meters due in 30 days. Due dates are schedule estimates, so the card says "planned". */
export function ComingUp({
  data,
  financing,
}: {
  data: ProjectsDashboard;
  financing: DashboardFinancing;
}): React.JSX.Element {
  const c = data.comingUp;
  return (
    <section className={cn('rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(9)}>
      <header className="flex items-baseline justify-between gap-2 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Coming up · 30 days</h2>
        <span className="text-2xs text-foreground-tertiary">planned</span>
      </header>
      <Link
        href={dashboardLinks.meterDue(c.from, c.to, financing)}
        className="block text-2xl font-semibold tabular-nums text-foreground hover:text-primary-dark"
      >
        <AnimatedNumber value={c.count} />
      </Link>
      <p className="text-xs text-foreground-tertiary">meters due · {formatKw(c.kw)}</p>
      <ul className="mt-3 divide-y divide-border text-sm">
        <li>
          <Link href={dashboardLinks.meterDue(c.from, c.thisWeekTo, financing)} className="flex justify-between py-2 hover:text-primary-dark">
            <span className="text-foreground-secondary">This week</span>
            <span className="tabular-nums">{c.thisWeek}</span>
          </Link>
        </li>
        <li>
          <Link href={dashboardLinks.meterDue(c.nextWeekFrom, c.nextWeekTo, financing)} className="flex justify-between py-2 hover:text-primary-dark">
            <span className="text-foreground-secondary">Next week</span>
            <span className="tabular-nums">{c.nextWeek}</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
```

`dashboard/index.ts`:

```ts
export { BandError, DashboardSkeleton } from './band-state';
export { ComingUp } from './coming-up';
export { FilterBar } from './filter-bar';
export { NeedsAction } from './needs-action';
export { OwnerStrip } from './owner-strip';
export { StagePanel } from './stage-panel';
export { StagePipeline } from './stage-pipeline';
export { StuckByTeam } from './stuck-by-team';
export { TrendChart } from './trend-chart';
export { useDashboardFilters } from './use-dashboard-filters';
```

- [ ] **Step 6: The page**

Rewrite `project-dashboard-page.tsx`:

```tsx
'use client';

import Add from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import type { StageGroupKey } from '@tejas96/shared/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import {
  BandError,
  ComingUp,
  DashboardSkeleton,
  FilterBar,
  NeedsAction,
  OwnerStrip,
  StagePanel,
  StagePipeline,
  StuckByTeam,
  TrendChart,
  useDashboardFilters,
} from './dashboard';

import { ROUTES } from '@/lib/config/routes';
import { useProjectsDashboard } from '@/lib/hooks/resources';
import { useGatedAction } from '@/lib/rbac';

/**
 * /projects — where the portfolio is, what needs action, where it is heading.
 * One request (`GET /projects/dashboard`); every figure links to the list of
 * exactly the projects behind it. Spec:
 * docs/superpowers/specs/2026-10-08-projects-dashboard-design.md
 */
export function ProjectDashboardPage(): React.JSX.Element {
  const router = useRouter();
  const { filters, setFilters, reset, isDefault } = useDashboardFilters();
  const { data, isLoading, isError, refetch } = useProjectsDashboard(filters);
  const [openStage, setOpenStage] = React.useState<StageGroupKey | null>(null);
  const newProject = useGatedAction(
    'projects.create',
    () => void router.push(ROUTES.PROJECTS.NEW),
    'New project',
  );
  const retry = (): void => void refetch();

  const isEmpty =
    !!data &&
    data.strip.live.count === 0 &&
    data.strip.onboarded.count === 0 &&
    data.strip.meterInstalled.count === 0 &&
    data.trend.every((t) => t.onboarded === 0 && t.meterInstalled === 0);

  let body: React.ReactNode;
  if (isLoading && !data) {
    body = <DashboardSkeleton />;
  } else if (isError && !data) {
    body = (
      <div className="flex flex-col gap-5">
        <BandError what="the summary" onRetry={retry} />
        <BandError what="projects by stage" onRetry={retry} />
        <BandError what="what needs action" onRetry={retry} />
        <BandError what="the 12-month trend" onRetry={retry} />
      </div>
    );
  } else if (data && isEmpty) {
    body = (
      <section className="rounded-xl bg-surface p-10 text-center shadow-e2">
        <p className="text-sm text-foreground-secondary">
          {isDefault ? 'No projects yet.' : 'No projects match these filters.'}
        </p>
        {!isDefault ? (
          <button type="button" onClick={reset} className="mt-3 text-sm font-medium text-primary-dark hover:underline">
            Clear filters
          </button>
        ) : null}
      </section>
    );
  } else if (data) {
    body = (
      <div className="flex flex-col gap-5">
        <OwnerStrip data={data} financing={filters.financing} />
        <StagePipeline data={data} financing={filters.financing} onOpenStage={setOpenStage} />
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <NeedsAction data={data} financing={filters.financing} />
          </div>
          <div className="lg:col-span-2">
            <StuckByTeam data={data} financing={filters.financing} />
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TrendChart data={data} financing={filters.financing} />
          </div>
          <ComingUp data={data} financing={filters.financing} />
        </div>
        <StagePanel
          stageKey={openStage}
          data={data}
          financing={filters.financing}
          onClose={() => setOpenStage(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-background p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Projects</h1>
        <div className="flex flex-wrap items-center gap-2">
          <FilterBar filters={filters} onChange={setFilters} />
          <Button component={Link} href={ROUTES.PROJECTS.LIST} variant="outlined" size="small">
            All projects
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={newProject.onGatedClick}
            aria-disabled={!newProject.allowed}
            sx={{ opacity: newProject.allowed ? 1 : 0.5 }}
          >
            New project
          </Button>
        </div>
      </header>
      {body}
    </div>
  );
}
```

- [ ] **Step 7: Delete the old dashboard parts**

```bash
cd /Volumes/works-space/oneohm/oneohm/apps/web/components/features/projects/components/dashboard
git rm critical-alerts.tsx kpi-grid.tsx progress-trend.tsx project-milestones.tsx worker-matrix.tsx
```

- [ ] **Step 8: Typecheck, lint, no leftovers**

Run:
```bash
cd /Volumes/works-space/oneohm/oneohm && npm run typecheck:web && npx nx lint web
grep -rn "CriticalAlerts\|KPIGrid\|ProgressTrend\|ProjectMilestones\|WorkerMatrix" apps/web --include=*.ts --include=*.tsx
```
Expected: typecheck and lint clean; the grep prints nothing.

- [ ] **Step 9: See it in the browser**

`preview_start {name: "web"}` (and `backend` if not running). `resize_window` 1440×900. Sign in if asked (memory `local-test-login`). Open `http://localhost:3001/projects`.

Check with `get_page_text` and a screenshot:
- Five strip cards with numbers equal to Task 3 Step 7's `curl` output.
- Six stage bars, numbers equal to `stages[].count`.
- Needs action rows, Stuck by team rows, 12 month bars, Coming up.
- `read_console_messages` with `onlyErrors: true` is empty (restart the web server and use a new tab before trusting an error — memory `web-local-verification`).
- Click Cash, then Loan, then This quarter: the URL changes (`?type=loan&period=this_quarter`), numbers slide to new values, no skeleton flash.
- Click a stage bar: the panel opens with the same count as the bar; click a phase chip: rows narrow.
- `resize_window` preset `mobile`: one column, no sideways scroll.
- `resize_window` `colorScheme: dark`: text readable, chart colours visible.

- [ ] **Step 10: Commit**

```bash
cd /Volumes/works-space/oneohm/oneohm
git add apps/web/components/features/projects/components/dashboard apps/web/components/features/projects/components/project-dashboard-page.tsx
git commit -m "feat(web): new /projects dashboard — strip, stages, needs action, trend

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Project list — the filters the dashboard links to

**Files:**
- Modify: `apps/web/components/features/projects/hooks/use-projects.ts` (`ProjectFilters` ~line 18, query params ~line 141)
- Modify: `apps/web/components/features/projects/components/project-list-page.tsx` (`toProjectFilters` ~line 180, `FILTER_COLUMNS` ~line 748, `filterColumns` memo ~line 949)

**Interfaces:**
- Consumes: list API params (Task 2), shared `STAGE_GROUPS`, `STAGE_GROUP_KEYS`, `SIDE_TRACK_PHASES`; URL shape from `dashboard/links.ts` (`financing`, `progress`, `stage`, `phase`, `attention`, `onboarded:{from,to}`, `meterInstalled:{from,to}`, `meterDue:{from,to}`).

- [ ] **Step 1: `ProjectFilters` and the request**

In `use-projects.ts`, add to `ProjectFilters`:

```ts
  /** Dashboard drill-downs — see apps/backend/src/modules/projects/sql/project-facts.sql.ts. */
  financing?: 'cash' | 'loan';
  progress?: ProjectProgress;
  stage?: StageGroupKey | 'none';
  phase?: string;
  attention?: ProjectAttention;
  onboardedFrom?: string;
  onboardedTo?: string;
  meterInstalledFrom?: string;
  meterInstalledTo?: string;
  meterDueFrom?: string;
  meterDueTo?: string;
```

(import the three types from `@tejas96/shared/types`), and in `useProjects`'s `queryFn`, after the existing `params.append` lines:

```ts
      const factsKeys = [
        'financing',
        'progress',
        'stage',
        'phase',
        'attention',
        'onboardedFrom',
        'onboardedTo',
        'meterInstalledFrom',
        'meterInstalledTo',
        'meterDueFrom',
        'meterDueTo',
      ] as const;
      for (const key of factsKeys) {
        const value = queryFilters[key];
        if (value) params.append(key, value);
      }
```

- [ ] **Step 2: Map URL filters → API filters**

In `project-list-page.tsx`, import `STAGE_GROUP_KEYS` from `@tejas96/shared/utils`, then add at the end of `toProjectFilters`, before `return result;`:

```ts
  // Dashboard drill-downs. Unknown values are dropped, like every filter above.
  const pick = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
    typeof value === 'string' && (allowed as readonly string[]).includes(value)
      ? (value as T)
      : undefined;
  result.financing = pick(raw.financing, ['cash', 'loan'] as const);
  result.progress = pick(raw.progress, ['live', 'not_started', 'in_progress'] as const);
  result.stage = pick(raw.stage, [...STAGE_GROUP_KEYS, 'none'] as const);
  if (typeof raw.phase === 'string' && raw.phase) result.phase = raw.phase;
  result.attention = pick(raw.attention, ['late_steps', 'old_steps', 'unstaged_steps'] as const);

  const day = (value: unknown): string | undefined =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
  const range = (value: unknown): { from?: string; to?: string } => {
    const r = (value ?? {}) as { from?: unknown; to?: unknown };
    return { from: day(r.from), to: day(r.to) };
  };
  const onboarded = range(raw.onboarded);
  result.onboardedFrom = onboarded.from;
  result.onboardedTo = onboarded.to;
  const meterInstalled = range(raw.meterInstalled);
  result.meterInstalledFrom = meterInstalled.from;
  result.meterInstalledTo = meterInstalled.to;
  const meterDue = range(raw.meterDue);
  result.meterDueFrom = meterDue.from;
  result.meterDueTo = meterDue.to;
```

- [ ] **Step 3: The filters in the panel**

Import `STAGE_GROUPS`, `SIDE_TRACK_PHASES` from `@tejas96/shared/utils` and `MUIDateRangePicker` from `@/components/ui`. Append to `FILTER_COLUMNS` (after the `address` entry):

```ts
  {
    field: 'financing',
    headerName: 'Cash / loan',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Cash', value: 'cash' },
      { label: 'Loan', value: 'loan' },
    ],
  },
  {
    field: 'progress',
    headerName: 'Progress',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Live (open work)', value: 'live' },
      { label: 'Not started', value: 'not_started' },
      { label: 'In progress', value: 'in_progress' },
    ],
  },
  {
    field: 'stage',
    headerName: 'Stage',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      ...STAGE_GROUPS.map((g) => ({ label: g.label, value: g.key })),
      { label: 'No stage yet', value: 'none' },
    ],
  },
  {
    field: 'phase',
    headerName: 'Phase',
    filterable: true,
    filterType: 'select',
    filterOptions: STAGE_GROUPS.flatMap((g) => g.phases)
      .filter((p) => !SIDE_TRACK_PHASES.includes(p))
      .map((p) => ({ label: p, value: p })),
  },
  {
    field: 'attention',
    headerName: 'Needs attention',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Late steps', value: 'late_steps' },
      { label: 'Old steps left open', value: 'old_steps' },
      { label: 'Steps without a stage', value: 'unstaged_steps' },
    ],
  },
  { field: 'onboarded', headerName: 'Onboarded between', filterable: true },
  { field: 'meterInstalled', headerName: 'Meter installed between', filterable: true },
  { field: 'meterDue', headerName: 'Meter due between', filterable: true },
```

Add a module-level component next to the other sub-components:

```tsx
function DateRangeFilter({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}): JSX.Element {
  const range = (value ?? {}) as { from?: string; to?: string };
  const toDay = (d: Date | null): string | undefined => {
    if (!d) return undefined;
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  return (
    <MUIDateRangePicker
      fromDate={range.from ?? null}
      toDate={range.to ?? null}
      onFromChange={(d) => onChange({ ...range, from: toDay(d) })}
      onToChange={(d) => onChange({ ...range, to: toDay(d) })}
    />
  );
}
```

In the `filterColumns` memo, before `return col;`:

```tsx
      if (col.field === 'onboarded' || col.field === 'meterInstalled' || col.field === 'meterDue') {
        return {
          ...col,
          renderFilter: ({ value, onChange }) => <DateRangeFilter value={value} onChange={onChange} />,
        };
      }
```

- [ ] **Step 4: Typecheck and lint**

Run: `cd /Volumes/works-space/oneohm/oneohm && npm run typecheck:web && npx nx lint web`
Expected: clean.

- [ ] **Step 5: Every strip/stage link opens a list with the same total**

In the browser pane on `/projects`, for each of these, click it, then read the list's total row count (`get_page_text` — the table footer shows the total) and compare with the number clicked:

Onboarded · cash line · loan line · Live now · not started · in progress · Meter installed · Running late · each stage bar's "Open all N in list" · each "No stage yet / Steps without a stage / Old steps left open" note · a trend month bar (onboarded and meter) · Coming up · This week · Next week · "See all N" under Needs action.

Expected: every pair is equal. The list's filter panel shows the applied filter (so a user can see and remove it). Back returns to the dashboard with the same Period and Cash/Loan.

If a pair differs, stop and find out why before going on (common cause: the list's own `status` chip or `memberId` pin — `status: 'all'` must be in the link).

- [ ] **Step 6: Commit**

```bash
cd /Volumes/works-space/oneohm/oneohm
git add apps/web/components/features/projects/hooks/use-projects.ts apps/web/components/features/projects/components/project-list-page.tsx
git commit -m "feat(web): project list filters for dashboard drill-downs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Destinations — task deep link, project page stage, receivables

**Files:**
- Modify: `apps/web/components/features/projects/constants.ts:282` (`TASK_LIST_FILTER_DEFAULTS`)
- Modify: `apps/web/components/features/projects/components/project-detail/tabs/project-tasks-tab.tsx` (~line 127 drawer state, ~line 184 close handler)
- Modify: `apps/web/components/features/projects/hooks/types.ts:65` (`ProjectDetail`)
- Modify: `apps/web/components/features/projects/components/project-detail/lib/derive.ts:177` (`currentPhaseIndex`)
- Modify: `apps/web/components/features/projects/components/project-detail/project-detail-header.tsx` (~line 302 `PhaseRail`, ~line 854 its use)
- Modify: `apps/web/components/features/projects/components/project-detail/tabs/overview/journey-card.tsx:93`
- Modify: `apps/web/components/features/ledger/finance-receivables-page.tsx` (~lines 50-75, 153-215)

**Interfaces:**
- Consumes: `currentPhase` on `GET /projects/:id` (Task 2); `t_task` and `funding`/`scope=recovery` URLs from `dashboard/links.ts` (Task 4).

- [ ] **Step 1: `t_task` opens the task**

In `constants.ts`, add `t_task: '',` to `TASK_LIST_FILTER_DEFAULTS` (after `t_view`).

In `project-tasks-tab.tsx`, after `handleOpenTask` add:

```ts
    // Deep link from the projects dashboard (`?t_task=<id>`): open that step's
    // drawer, whatever page of the list it sits on.
    useEffect(() => {
      if (!isActive || !filters.t_task) return;
      setOpenTaskId(filters.t_task);
      setDrawerOpen(true);
    }, [isActive, filters.t_task]);
```

and change `handleCloseDrawer` to also drop the param, so a refresh does not reopen it:

```ts
    const handleCloseDrawer = useCallback(() => {
      setDrawerOpen(false);
      if (filters.t_task) setFilter('t_task', '');
    }, [filters.t_task, setFilter]);
```

(`useEffect` may need adding to the React import.)

- [ ] **Step 2: The project page shows the same stage as the dashboard**

`hooks/types.ts` → `ProjectDetail`: add `currentPhase?: string | null;`.

`derive.ts` → replace `currentPhaseIndex`:

```ts
/**
 * The phase the project is in. The server's `currentPhase` (furthest reached,
 * the dashboard's rule) wins; without it, the first phase not finished.
 * −1 when nothing matches.
 */
export function currentPhaseIndex(
  sorted: MilestoneAggregateItem[],
  currentPhase?: string | null,
): number {
  if (currentPhase) {
    const target = canonicalMilestoneName(currentPhase) ?? currentPhase;
    const i = sorted.findIndex((m) => (canonicalMilestoneName(m.name) ?? m.name) === target);
    if (i >= 0) return i;
  }
  return sorted.findIndex((m) => m.status !== 'completed');
}
```

(import `canonicalMilestoneName` from `@tejas96/shared/utils`.)

`project-detail-header.tsx`: give `PhaseRail` a `currentPhase?: string | null` prop, call `currentPhaseIndex(phases, currentPhase)`, and at its use pass `currentPhase={project.currentPhase}`.

`journey-card.tsx`: `const nowIndex = currentPhaseIndex(phases, project.currentPhase);`

- [ ] **Step 3: Receivables — `funding` param and "Recovery — All"**

In `finance-receivables-page.tsx`:

```ts
type Scope = 'all' | 'recovery' | 'recovery-cash' | 'recovery-loan';

function toScope(value: string | null): Scope {
  return value === 'recovery' || value === 'recovery-cash' || value === 'recovery-loan'
    ? value
    : 'all';
}

const SCOPE_OPTIONS: ReadonlyArray<{ value: Scope; label: string }> = [
  { value: 'all', label: 'All open' },
  { value: 'recovery', label: 'Recovery — All' },
  { value: 'recovery-cash', label: 'Recovery — Cash' },
  { value: 'recovery-loan', label: 'Recovery — Loan' },
];
```

Add to `SCOPE_INTRO`:

```ts
  recovery:
    'Meter installed, job delivered, money still owed — cash and loan jobs together, one row per project. Open a row to see its milestones. Waived amounts are excluded.',
```

Next to `const scope = toScope(...)`:

```ts
  // `?funding=cash|loan` narrows "All open" — the projects dashboard links here
  // with its Cash/Loan switch, and the total must match the card it came from.
  const fundingParam = searchParams.get('funding');
  const funding = fundingParam === 'cash' || fundingParam === 'loan' ? fundingParam : undefined;
```

- `useReceivables({...})`: add `funding,`.
- `useRecovery({...})`: replace `funding: scope === 'recovery-loan' ? 'loan' : 'cash',` with
  `funding: scope === 'recovery-loan' ? 'loan' : scope === 'recovery-cash' ? 'cash' : undefined,`.
- `setScope`: add `params.delete('funding');` before building `qs` (a scope change starts clean).
- Show the narrowing so it is never invisible: below the scope intro text, when `scope === 'all' && funding`, render

```tsx
        <p className="text-xs text-foreground-secondary">
          {funding === 'cash' ? 'Cash' : 'Loan'} jobs only.{' '}
          <button
            type="button"
            className="font-medium text-primary-dark hover:underline"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete('funding');
              const qs = params.toString();
              router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
            }}
          >
            Show all
          </button>
        </p>
```

- The `scope === 'recovery-loan' && recovery.data…missingLenderProjects` banner: change the condition to `(scope === 'recovery-loan' || scope === 'recovery') && …` so the warning is not lost in the combined view.

Check `useReceivables`'s filter type already has `funding` (`lib/hooks/resources/ledger.ts:368` — yes) and that its `queryFn` sends it; if it does not append `funding` to the request, add `if (filters.funding) params.set('funding', filters.funding);` there.

- [ ] **Step 4: Typecheck and lint**

Run: `cd /Volumes/works-space/oneohm/oneohm && npm run typecheck:web && npx nx lint web`
Expected: clean.

- [ ] **Step 5: Check the destinations in the browser**

- Click a Needs action row → the project's Tasks tab opens with that step's drawer open; close it → URL loses `t_task`; refresh → drawer stays closed.
- Open one of the "old steps left open" projects (from Task 2 Step 2): the header rail and the Journey card mark the same phase the dashboard's stage panel shows for it.
- To collect (switch on All) → receivables "Open milestones" total equals the card. Switch Cash → card → page says "Cash jobs only" and the total equals the card. "with meter in" line → Recovery scope; its total equals the card's small line (All, Cash and Loan each).
- A user without `finance.receivables.view` but with `finance.view`: clicking To collect opens the access dialog, not a dead page (mint the token; verify via API that `money` is present, and in the UI only if a second account is available — otherwise note it as API-verified).

- [ ] **Step 6: Commit**

```bash
cd /Volumes/works-space/oneohm/oneohm
git add apps/web/components/features/projects/constants.ts apps/web/components/features/projects/components/project-detail apps/web/components/features/projects/hooks/types.ts apps/web/components/features/ledger/finance-receivables-page.tsx apps/web/lib/hooks/resources/ledger.ts
git commit -m "feat(web): dashboard destinations — task deep link, shared stage, receivables funding

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Full verification, then the PR

**Files:** none new. Fix anything found in the files above.

- [ ] **Step 1: Full checks**

Run:
```bash
cd /Volumes/works-space/oneohm/oneohm && npm run typecheck && npm run lint && npx nx test backend && npx nx test web && npx nx test shared && npx nx build web
```
Expected: all green. Report any failure with its output; do not skip.

- [ ] **Step 2: SQL cross-check of the headline numbers (read-only)**

Using the Task 2 Step 2 script pattern, print and run, in IST:
- live, late, meter installed this month (`meter_completed_at` in the current month), onboarded this month, the 6 stage counts;
- `SELECT SUM(balance_paise) …` is not needed — To collect is checked against the receivables API instead.

Compare each with the dashboard API and the screen. All must be equal.

- [ ] **Step 3: Click-map walk**

Walk every row of the spec's "Click map" table in the browser on these filter sets: (This month, All), (This quarter, Cash), (Last month, Loan), (Custom 1 Sep – 30 Sep, All). For each click, the destination total equals the clicked number. Write results as you go into `<scratchpad>/click-map-results.md` (memory `qa-runs-time-box`: append as you go, max 2 retries per item, never clear dates via UI).

- [ ] **Step 4: People and devices**

- Token with `permissions=projects.view` and no admin role: `strip.money` is `null` (API), so the page shows 4 strip cards.
- `resize_window` 375×812 and 1440×900; `colorScheme` dark and light; macOS "Reduce motion" can't be toggled from the pane, so check `prefers-reduced-motion` via `javascript_tool`: `matchMedia('(prefers-reduced-motion: reduce)').matches` and read `motion.ts` behaviour by forcing it (temporarily `return true` locally, look, revert — do not commit).
- `read_console_messages onlyErrors` is empty on `/projects`, `/projects/list?...`, a project page, and receivables.
- Network: one `GET /projects/dashboard` per load and per filter change (`read_network_requests urlPattern=dashboard`).

- [ ] **Step 5: Screenshot proof**

Take full-page screenshots of `/projects` (desktop light, desktop dark, mobile) and the stage panel open. Keep them in the scratchpad to show the user.

- [ ] **Step 6: Push and open the PR (ask the user first)**

Ask the user before pushing. On a yes:

```bash
cd /Volumes/works-space/oneohm/oneohm
git push -u origin feat/projects-dashboard
gh pr create --base main --title "Projects dashboard redesign" --body "$(cat <<'EOF'
## What
`/projects` is rebuilt: owner strip (onboarded, live, meter installed, running late, to collect), projects by stage, needs action, late steps by team, 12-month trend, meters due. One Period picker and one Cash/Loan switch drive the page. Every number opens a list of exactly the projects behind it.

## Why
The old page averaged 5 sample projects, guessed stages from %, showed hard-coded sample charts, and had almost nothing clickable.

## How
- `libs/shared`: stage rule "furthest reached" (`deriveProjectStage`) + dashboard types.
- Backend: `PROJECT_FACTS_CTE` (SQL twin of the rule), `GET /projects/dashboard`, `GET /projects/dashboard/stage-projects`, new list filters built from the same SQL, `currentPhase` on `GET /projects/:id`; list `currentPhase` is now one query per page.
- Web: new dashboard bands + motion (CSS, Recharts, count-up; off under reduced motion), list filters, task deep link, project page stage, receivables `funding` + "Recovery — All".

Spec: docs/superpowers/specs/2026-10-08-projects-dashboard-design.md
Plan: docs/superpowers/plans/2026-10-08-projects-dashboard.md

## Verified
- Every click-map link: destination total = clicked number (4 filter sets).
- SQL cross-check of headline numbers.
- No-finance user, mobile and dark mode, console clean, one request per load.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Then follow the session's PR rules (bind the PR with the ccd_pr tools, read CI, offer Auto-fix).
```

- [ ] **Step 7: Save what was learned**

Update memory: add a `projects-dashboard-pr.md` memory (PR number, merge order notes, the furthest-reached rule and where its two copies live) and a line in `MEMORY.md`.
