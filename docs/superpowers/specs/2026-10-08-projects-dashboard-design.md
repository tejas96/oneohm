# Projects dashboard — design

Date: 2026-10-08
Repo: `oneohm` (backend, web, `libs/shared`). Mobile is not touched.
Route: `/projects` (web). Replaces `ProjectDashboardPage` completely.

## Goal

A person opens `/projects` and, in a few seconds, knows:

1. **Where we are** — how many projects are live, how much kW, how much is late, how much money is open.
2. **Where every project is** — how many projects sit in each stage of the solar job.
3. **What needs action now** — which projects are late, at which step, with whom.
4. **Where we are heading** — onboarded vs meter-installed over 12 months, and meters due soon.

Every number is exact and every number is clickable. A click opens a screen
that lists exactly the projects (or rows) behind the number.

Audience: **operations first**, with a thin owner strip on top.

## Why the current page is replaced

Seen on local data on 2026-10-08:

- "Overall health 0%" averages 5 sample projects out of 223.
- "Project milestones" shows 1 project; its stage ticks are guessed from progress %.
- "Critical blockers" counts only `on_hold` projects (there are none).
- "Resource capacity matrix" lists 36 people ("198 active projects · 0% occupancy").
- "Project delivery velocity" is hard-coded sample data.
- It sends 8+ requests per load (incl. one BOM request per sampled project).
- Almost nothing is clickable.

## Decisions (locked with the user)

| # | Decision |
|---|---|
| D1 | Operations first, owner strip on top. |
| D2 | One filter bar at the top: **Period** and **Cash / Loan**. No per-card filters. |
| D3 | Cash / Loan = `customer_properties.wants_loan`, declared when the property is onboarded. Finance already uses this (`funding` on `/finance/receivables`). |
| D4 | A project's stage = **furthest reached** (rule below), not "first open step". Old steps left open are shown as a cleanup count. The project page uses the same rule. |
| D5 | Project `status` is not trusted for "done". Only `cancelled` is used from it. |
| D6 | A card's number must equal the row count of the list it opens. Dashboard and list share one SQL rule set. |
| D7 | No new unit test files. Verify by running each screen with real local data. |

## Definitions (the single source of truth)

All rules live in one place per layer: `libs/shared/src/utils/project-stage.ts`
(stage rule, pure TS) and `apps/backend/src/modules/projects/sql/project-facts.sql.ts`
(the same rule in SQL, used by both the dashboard endpoint and the list filters).

**Counted project.** `projects.deleted_at IS NULL AND status <> 'cancelled'`
(`is_counted` in the facts CTE). Cancelled projects are still rows in the facts CTE:
they count as **onboarded** and as **meter installed** (the work was done and the
money is real), and the list's `financing`, `onboarded*` and `meterInstalled*`
filters keep them. They never count as live, so they drop out of everything
"live" (live / not started / in progress, stages, phases, late, old and unstaged
steps, no stage, meter due and coming up, needs action, stuck by team, the stage
panel). Their open tasks are ignored there.

**Open step / done step.** A `project_tasks` row with `deleted_at IS NULL`;
done = `status = 'done'`, open = anything else.

**Live project.** Counted (not cancelled), and has at least one open step, or has no
steps at all.

**Closed project.** Counted, has steps, and every step is done. Not live.

**Not started.** Live, and no step is done (includes projects with no steps).
**In progress.** Live, and at least one step is done.

**Stage groups.** The 6 groups already written as comments in
`MILESTONE_LIFECYCLE_SEQUENCE` (`libs/shared/src/constants/milestone-lifecycle.ts`):

| Group key | Label | Phases (canonical names) |
|---|---|---|
| `design` | Survey & design | Planning, Site Survey & Design, Feasibility Study, Structural Assessment, Shading Analysis |
| `approvals` | Approvals | Permits & Approvals, DISCOM Application, Net Metering Application, Subsidy Application, Loan Processing |
| `material` | Material | Material Procurement, Equipment Delivery |
| `installation` | Installation | Civil & Structural Work, Electrical Work, Installation, Earthing & Lightning Protection |
| `meter` | Testing & meter | Inspection & Testing, Commissioning, Commissioning & Testing, DISCOM Inspection, Net Meter Installation |
| `handover` | Handover | Handover, Customer Training, Documentation, AMC / Warranty Registration |

The `Payment 1…5` labels and any name not in the sequence (including an empty
`milestone_name`) have no group ("steps without a stage"). Name matching uses the existing normaliser and
`MILESTONE_LIFECYCLE_ALIASES`.

**Side tracks.** A step is a side track when any of these is true:
its workflow step has `loan_only = true` (this catches `LOAN-002 Bank Account
Opening`, which sits in `Planning`); its phase is `Loan Processing` or
`Subsidy Application`; or its workflow code is `LIA-014` / `LIA-016` (subsidy
application and disbursement, which sit in `Commissioning & Testing`).
Side-track steps never decide the stage and are never "old steps".

**Stage (furthest reached).** Using only main-line steps with a known phase:

1. `F` = highest sequence index of a phase that has a done step.
2. If there is no `F` (nothing done): stage = phase of the lowest-index open step.
3. Else: stage = lowest-index phase with an open step **at index ≥ F**.
4. If no open main-line step at index ≥ F: stage = phase `F` (the project is
   wrapping up side tracks or old steps).
5. If the project has no main-line steps at all: stage = `none` ("No steps").

`currentPhase` = that phase name; `stageGroup` = its group.

**Old steps left open.** Open main-line steps whose phase index < `F`.

**Late step.** Open step with `end_date IS NOT NULL AND end_date < CURRENT_DATE`
(DB session time zone is IST). Steps with no due date are never late.
**Late project.** Live project with ≥ 1 late step (side tracks included —
a late loan step is still late work).

**Meter installed.** The project has a row in `v_project_commissioning` (any done
step in `Net Meter Installation`; same view Finance and Recovery use). Its date =
`meter_completed_at`, bucketed in IST. A row with no date (`meter_dated = false`,
1 project locally) counts as installed for the stage, but never in a period — the
same rule as the Finance KPI.

**Meter due.** Only for projects whose meter is not installed: the earliest
`end_date` of their open `Net Meter Installation` steps. Shown as "planned".

**kW.** `quote_versions.total_wattage_wp / 1000` of `projects.contract_quote_version_id`.
If null, fall back to nothing: the project counts, its kW is unknown, and the UI
says "N without kW". Never 0. (Local data today: 0 of 231 missing.)

**Onboarded date.** `projects.created_at` in IST. There is no import marker on
projects, so imported projects show on their import date. No guessing.

**To collect.** Exactly the receivables page headline:
`FinanceReportingService.getReceivables({ funding })` → `buckets.totalOutstandingPaise`
(active milestones with a balance; waived excluded).
**Meter in, still owed.** The same call with `scope: 'recovery'`. Both follow the
Cash/Loan switch through `funding`. Reusing the finance service is what makes the
card equal the page it opens.

**Department of a step.** `workflow_steps.default_department` via
`project_tasks.workflow_step_id` (the same source `/analytics/workload` groups by,
so the `/workload?department=` link lands on the same name). Missing → `Other`.

**Who sees which projects.** Exactly `resolveProjectListMemberId`
(`iam/constants/admin-roles.ts`): admins / `projects.view` see all; others see
projects they are a current team member of (a soft-deleted membership gives no access,
in the dashboard SQL as in the list). In practice the web route `/projects` already
needs `projects.view` (`lib/rbac/route-map.ts`), so everyone who reaches the page
sees all projects; the backend still applies the rule.

**Money visibility.** Money fields are sent only when the caller has `finance.view`
(or an admin role). Without it the "To collect" card is not rendered.

## Layout

One page, four bands, top to bottom. Desktop ≥ 1024 px as drawn; below that
every band stacks into one column.

### Header and filter bar

Left: page title "Projects". Right: Period picker, Cash/Loan switch, "All projects"
link, "New project" button (gated by `projects.create`, existing `useGatedAction`).

- Period: This month (default), Last month, This quarter, This financial year
  (Apr–Mar), Custom (from/to dates). Custom `to` cannot be before `from`; max
  range 3 years.
- Cash/Loan: All (default) · Cash · Loan.
- Both live in the URL: `/projects?period=this_month&type=all`
  (custom: `period=custom&from=2026-09-01&to=2026-09-30`). Bad values fall back
  to the defaults. Refresh, Back and shared links keep the filters.
- Cash/Loan applies to every band. Period applies only to cards marked with the
  period tag and nothing else.

### Band 1 — Owner strip (5 cards)

| Card | Big number | Small line | Follows period? |
|---|---|---|---|
| Onboarded | projects created in period, cancelled ones included | kW · "11 cash · 7 loan" (split hidden when the switch is not All) | Yes |
| Live now | live projects | "31 not started" / "183 in progress" (each line clickable) | No |
| Meter installed | meter installed in period, cancelled ones included | kW · change vs the previous period ("+3", "−2", "same"). When the period includes today, both sides are cut to the same number of days ("vs 1–8 Sep"), so a half-done month is never compared with a full one | Yes |
| Running late | late projects | "% of live" | No |
| To collect | ₹ open (L / Cr) | "₹42 L meter in" | No |

Period cards show the period name as a small tag ("Oct", "Oct–Dec", "FY 26-27", "1 Sep – 30 Sep").

### Band 2 — Where every project is (hero)

A 6-column bar chart, one bar per stage group, left to right in lifecycle order.
Each bar shows the live-project count; the red part at the base is the late
projects in that group. Under each bar: the label and kW.

Under the chart, small links only when non-zero:
"No stage yet: N" (no main-line steps) · "Steps without a stage: N" · "Old steps left open: N".

Clicking a bar opens a **right-side panel** (MUI `Drawer`, same shell as the house
`DrillDownDrawer`, which has no slot for the phase chips), fed by
`GET /projects/dashboard/stage-projects`, with:
- the group's phases and their counts as chips (a chip narrows the panel rows and the
  "Open in list" link to that phase);
- the first 10 projects in that group, most late first (row → project page);
- "Open all N in list" → project list filtered by stage group.

### Band 3 — What needs action now

Left (60%): **Needs action.** Up to 8 late projects, most days late first. Each row:
customer name (project number when there is none — the project name already
carries the kW, so it is not repeated), the oldest late step name, its department, its assignee
("Unassigned" in red when empty), and "14 d late". Row → that project's Tasks
tab with the step highlighted. Footer "See all N" → project list, Late steps filter.

Right (40%): **Stuck by team.** One row per department with late steps: name,
a small bar, count. Sorted by count. Row → `/workload?department=<name>`.
Departments with 0 late steps are not shown; when all are 0 the card says
"No late steps".

### Band 4 — Where we are heading

Left (2/3): **Last 12 months.** Grouped bars per month (current month last):
onboarded (grey) and meter installed (green). A small toggle switches the
unit: Projects / kW. Follows Cash/Loan, not Period. Clicking a bar → project
list filtered by that month's onboarded or meter-installed dates.

Right (1/3): **Coming up · 30 days (planned).** Count and kW of live projects
whose meter due date is today … today+30, plus "This week" and "Next week" rows.
Overdue meter steps are not here (they are in Running late). Each line →
project list with the meter-due filter.

## Click map

Every target either works today or is added in this work.

| Click | Target | Exists today? | Added |
|---|---|---|---|
| Onboarded | `/projects/list` onboarded between + type | No (`fromDate`/`toDate` filter `start_date`/`end_date`) | `onboardedFrom/To`, `financing` |
| Live now / Not started / In progress | `/projects/list` | No | `progress=live|not_started|in_progress` |
| Meter installed | `/projects/list` meter between | No | `meterInstalledFrom/To` |
| Running late | `/projects/list` | No (`health:delayed` uses project `end_date`) | `attention=late_steps` |
| To collect | `/finance/receivables?funding=…` | Page has no `funding` param (API does) | page reads `funding` from the URL |
| Meter in, still owed | `/finance/receivables?scope=recovery…` | Cash or Loan only | web scope `recovery` (all) |
| Stage bar | side panel | No | panel + `stage=<group>` on list |
| Phase in panel | `/projects/list` | Partly (`pendingWorkflowStepId` is per step) | `phase=<name>` |
| Old steps / No steps / Steps without a stage | `/projects/list` | No | `attention=old_steps`, `stage=none`, `attention=unstaged_steps` |
| Needs action row | `/projects/[id]?tab=tasks&t_task=<taskId>` | Tab yes, task no | `t_task` opens that task's drawer on load (works on any page of the task list) |
| See all late | `/projects/list` | No | `attention=late_steps` |
| Team row | `/workload?department=…` | Yes | — (that page lists all the team's open steps; the late ones are among them) |
| Month bar | `/projects/list` | No | uses onboarded / meter filters |
| Coming up | `/projects/list` | No | `meterDueFrom/To` |

List links use the list's existing URL state (`projects_filters=<json>` via
`useTableUrlState`). New filters appear as normal chips in the list's filter
panel, so a user can see and remove them. Finance links use `GatedLink` with
the destination's permission (house pattern), so a blocked user sees the access
dialog, not a dead link.

## Backend

### Shared rule — `libs/shared/src/utils/project-stage.ts`

- `STAGE_GROUPS` (table above), `SIDE_TRACK_PHASES`, `SIDE_TRACK_STEP_CODES`.
- `phaseToStageGroup(name)`.
- `deriveProjectStage(tasks: {milestoneName, status, workflowStepCode, loanOnly}[])` →
  `{ currentPhase, stageGroup, oldOpenStepCount }` (rule above).
- Exported from the shared index. Version bump follows the normal shared release.

### SQL facts — `apps/backend/src/modules/projects/sql/project-facts.sql.ts`

One CTE builder, `projectFactsCte({ projectIdsParam? })`, producing one row
per non-deleted project (cancelled ones included, flagged by `is_counted`):

`project_id, wants_loan, kw (nullable), created_at, step_count, done_steps,
open_steps, current_phase, stage_group, old_open_steps, unstaged_open_steps,
late_steps, meter_installed, meter_completed_at, meter_due_date, is_counted, is_live`
(`is_live` is false for cancelled projects; `meter_due_date` is null for them).
Exported as `PROJECT_FACTS_CTE` (= `projectFactsCte()`; CTE text, no `WITH`) and used by raw SQL and by
TypeORM `IN (WITH … SELECT …)` subqueries alike. The optional `projectIdsParam` (a `$n`
placeholder holding a uuid[]) narrows the CTE to those projects; callers otherwise
filter the `project_facts` rows.

The stage rule is written once in SQL here, mirroring `deriveProjectStage`.
Phase order comes from a `VALUES` list generated from `MILESTONE_LIFECYCLE_SEQUENCE`
at module load, so the SQL and TS orders cannot drift.

### New endpoint — `GET /projects/dashboard`

Query: `period` (`this_month|last_month|this_quarter|this_fy|custom`),
`from`, `to` (ISO dates, required for custom), `financing` (`all|cash|loan`).
Validated with class-validator; bad input → 400.

Response: the `ProjectsDashboard` type in `libs/shared/src/types/projects-dashboard.ts`
(all money in paise, kW as numbers, dates `YYYY-MM-DD` IST). It carries the period
(with the comparison window and labels), the strip, the 6 stages with their phases,
stage notes, the top 8 late projects with their total, late steps per department,
12 trend months, and the coming-up counts with the exact date bounds the links use.

- One request per page load. Every section reads the same facts CTE.
- Scope: `resolveProjectListMemberId` with the caller's roles/permissions.
- Weeks are Monday–Sunday IST.

### Stage panel — `GET /projects/dashboard/stage-projects`

Query: `stage` (group key or `none`), optional `phase`, `financing`. Returns
`{ total, rows: [{ projectId, projectNumber, name, kw, currentPhase, daysLate | null }] }`,
top 10, most days late first, then newest. Same scope and facts as the dashboard.

### Project list — new filters (`GET /projects`)

`financing` (`cash|loan`), `progress` (`live|not_started|in_progress`), `stage`,
`phase`, `attention` (`late_steps|old_steps|unstaged_steps`),
`onboardedFrom/To`, `meterInstalledFrom/To`, `meterDueFrom/To` (YYYY-MM-DD, IST). All join the
same facts CTE, so counts match the dashboard. Existing filters are unchanged.

`currentPhase` on list items switches to the facts CTE value. This also removes
the extra per-row query that `computeCurrentPhaseFromTasks` runs today.
`computeCurrentPhaseFromTasks` switches to `deriveProjectStage`, and
`GET /projects/:id` now returns `currentPhase`. The project page header rail and
the Journey card mark that phase as "now" instead of "first unfinished phase",
so they agree with the dashboard.

## Web

### Files

- Delete `apps/web/components/features/projects/components/dashboard/*` and
  rewrite `project-dashboard-page.tsx` as a thin orchestrator.
- New folder `components/features/projects/components/dashboard/`:
  `filter-bar.tsx`, `owner-strip.tsx`, `stage-pipeline.tsx`, `stage-panel.tsx`,
  `needs-action.tsx`, `stuck-by-team.tsx`, `trend-chart.tsx`, `coming-up.tsx`,
  `links.ts` (one builder per click target — the only place URLs are made),
  `use-count-up.ts`.
- Hooks `useProjectsDashboard` and `useStageProjects` in
  `lib/hooks/resources/projects-dashboard.ts`.
- Project list page: the new filters in its filter panel (date ranges use
  `MUIDateRangePicker`), sent through `useProjects`.
- Project tasks tab: `t_task` opens the task drawer.
- Project header rail + Journey card: use `project.currentPhase`.
- Receivables page: read `funding` from the URL; add the `recovery` (all) scope.

### States

- Loading: skeletons the same shape as each band (no layout jump).
- Error: the one request fails → each band shows "Could not load · Retry";
  the header and filter bar stay usable.
- Empty: zero projects for the filters → "No projects match" + "Clear filters".
- Refetch on filter change keeps old numbers on screen (no flash to skeleton).
- Long names truncate with "…" and show the full name on hover.

### Motion

No new library. CSS transitions + Recharts' built-in animation + a small
`useCountUp` hook.

- First load: numbers count up (600 ms); stage bars grow left to right with a
  60 ms stagger, so the eye follows the flow of work; trend bars rise; list rows
  fade in one by one (40 ms stagger).
- Filter change: numbers tween from the old value to the new one; bars resize.
  No replay of the entrance.
- Hover: cards and rows lift slightly; bars darken; a tooltip shows exact values.
- `prefers-reduced-motion: reduce` → no motion, values appear directly.

## Edge cases

| Case | Handling |
|---|---|
| Cancelled project | Counted as onboarded and as meter installed (strip, trend, cash/loan split, previous period) and kept by the list's cash/loan and date filters. Never live: absent from live, stages, late, meter due, needs action and every other "live" number. Its open steps are ignored. |
| Project with no steps (or only loan/subsidy steps) | Live; stage `none`; "No stage yet: N" note. |
| All steps done | Closed; not live; not in stage chart. |
| Meter in but old steps open | Stage = furthest reached; counted in "Old steps left open". |
| Open loan / subsidy step after install | Side track; does not move the stage; still counts as late if past due. |
| Empty or unknown phase name | Never decides the stage; "Steps without a stage: N" note. |
| Step with no due date | Never late. |
| Late step with no assignee | Shown as "Unassigned" in red. |
| Step with no department | Team row "Other". `/workload` drops these steps, so this row links to the project list with `lateSteps=true` instead. |
| No signed quote | Counted; kW unknown; "N without kW" shown; never 0. |
| Imported projects | Shown on `created_at`; no import marker exists. |
| Month / week edges | IST (DB session time zone). |
| Meter done but undated | Installed for the stage; in no period. |
| Meter step open but another meter step done | Installed (view rule); not in Coming up. |
| Previous period | Same length directly before; "same" when equal; no % on a zero base. |
| Custom range invalid | Picker blocks it; API returns 400 if forced via URL; page falls back to default. |
| Money | Paise integers; ₹ L / Cr formatting; refunds already net in the balance view. |
| No `finance.view` | Money is `null`; card not rendered; strip becomes 4 cards. |
| Blocked destination | `GatedLink` opens the access dialog. |
| Non-admin | Sees only own projects; dashboard and list match for that user. |
| Zero results | "No projects match" + "Clear filters". |
| API rate limit (100/min) | One request per load and per filter change; a custom range is applied only when both dates are set. |
| Slow / failed request | Band-level retry; filters stay usable. |
| Reduced motion | No animation. |
| Narrow screen | One column; chart keeps its labels. |

## Verification (no new unit test files)

1. `nx run-many -t lint,typecheck` and the web production build are clean.
2. In the browser pane on local data, as the admin test login:
   - every card, small line, bar, panel row, list row, team row, month bar and
     Coming-up line is clicked; the opened list's total equals the clicked number;
   - each filter combination (3 periods × All/Cash/Loan) is checked on the strip;
   - Back after a click returns to the same dashboard filters.
3. Read-only SQL cross-check of: live count, late count, meter installed this
   month, to collect, and the 6 stage counts.
4. The project page header and Journey card show the same stage as the dashboard
   for 5 sample projects, including one of the 14 "meter in, old steps open".
5. Repeat step 2 for a user without `finance.view` (minted JWT): the To collect
   card is gone and the strip has 4 cards.
6. Light and dark theme; 375 px and 1440 px widths; reduced motion on.

## Out of scope

- Per-person workload (the 36-person matrix is removed, not redesigned; `/workload` covers departments).
- Forecasting beyond planned due dates.
- Fixing the old open steps themselves (the dashboard only points at them).
- Mobile app changes.

## Release

One PR in `oneohm` from `feat/projects-dashboard`. Backend, shared and web ship
together. The shared version auto-bumps on merge; mobile picks up the stage rule
on its next shared update.
