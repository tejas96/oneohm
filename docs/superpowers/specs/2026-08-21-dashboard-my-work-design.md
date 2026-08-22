# Dashboard — "My Work" (Design)

- **Date:** 2026-08-21
- **Status:** Approved design. Implementation plan not yet written.
- **Repo:** `oneohm` (Nx monorepo)
- **Replaces:** the placeholder `DashboardOverview` at
  `apps/web/components/features/dashboard/components/dashboard-overview.tsx`

---

## 1. Purpose

Give the logged-in employee one page that answers, in order:

1. What needs my attention now?
2. What is overdue?
3. What is due soon?
4. Which workflow is stuck?
5. Which project, milestone or task needs me?
6. Which service request needs action?
7. Is there money-related work?

Every item must say **what it is**, **why it is shown**, and offer **one action**
that deep-links into the existing screen that performs it.

The dashboard is a **single page**. It creates no sub-pages.

---

## 2. Decisions locked

| # | Decision | Rationale |
|---|---|---|
| 1 | **"My Work" only in this spec.** Admin employee selector and Business Matrix are a follow-up spec. | Proves the attention engine before layering other people's data on it. |
| 2 | **Scope comes from the auth token.** The endpoint takes no identity parameter. | Makes the dashboard genuinely safe without waiting on the app-wide RBAC rework. The later admin selector adds one permission check on top. |
| 3 | **"Mine" walks up to the customer owner.** A record is mine if I created it, am assigned it, or own/am assigned the customer it hangs off. | Quotes have no assignee and properties have no general owner. Direct-link-only would hide exactly the stuck hand-offs this dashboard exists to catch. |
| 4 | **Each domain keeps its own due-soon horizon.** Counts are per section, never blended. | The dashboard then agrees exactly with every other screen. One blended number would mean three different things at once. |
| 5 | **Deep links, plus inline follow-up completion.** | `followup-complete-dialog.tsx` and its mutation hooks already exist. Completing a follow-up is the highest-frequency daily action. |
| 6 | **Critical items lift to the top block and leave their section.** Presentation only — see §5 and §6.1. | Resolves the contradiction between spec §27 (a Needs Attention block) and §25 (do not repeat information). Nothing appears twice; counts still sum. |
| 7 | **Verification is by walking the screens, not by new test files.** | Standing instruction from 2026-08-17. Existing tests, typecheck and lint must stay green. |

---

## 3. Discovery — what already exists

### Stack

| Layer | Location | Tech |
|---|---|---|
| Backend | `apps/backend` | NestJS, TypeORM, Postgres |
| Web | `apps/web` | Next.js App Router, Tailwind, MUI-backed design system |
| Shared types | `libs/shared` | published as `@tejas96/shared`; web and backend resolve local source |

### Current dashboard

`app/(dashboard)/page.tsx` renders `DashboardOverview` — 144 lines showing a greeting
and three quick-link cards. Its own copy says "coming soon". **This is a new build,
not a rewrite of existing logic.**

### Shell the dashboard renders inside

`app/(dashboard)/layout.tsx`: 48px `GlobalHeader`, 48px icon `Rail`, 200px collapsible
`Panel`, content in `MainContent` on `bg-background-secondary`. `RouteGate` already
applies the route's permission gate before children mount.

### Reusable assets

| Asset | Path | Use |
|---|---|---|
| Per-project attention rules | `modules/projects/services/project-attention.service.ts` | Copy the task/milestone rules verbatim so screens agree |
| Batched task counts (no N+1) | `modules/projects/repositories/project.repository.ts:452` | Project rows |
| `v_milestone_balance` view | used at `project-attention.service.ts:252` | The only definition of outstanding money |
| Follow-up summary with `mine` | `modules/customers/services/followup.service.ts` | Follow-up counts |
| `ACTIVE_TICKET_STATUSES` | `libs/shared/.../service-ticket.enum.ts` | The single definition of an active ticket |
| Follow-up complete dialog | `components/features/followups/components/followup-complete-dialog.tsx` | Inline action |
| Permission catalog, `useCan`, access dialog | `apps/web/lib/rbac/` | Gating actions |
| Central route map | `apps/web/lib/config/routes.ts` | All deep links |

### Ownership columns (verified)

| Record | Can belong to |
|---|---|
| Customer | `created_by`, `assignee_id` |
| Property | `created_by`, `site_visit_assignee`, `site_survey_assignee` |
| Quote | `created_by` **only** |
| Project | `created_by`, `project_team_members` |
| Task | `assigned_to_user_id`, `watcher_user_ids`, `created_by` |
| Follow-up | `assigned_to_user_id`, `created_by` |
| Service ticket | `assigned_to_employee_id` (an **employee_profile id**), `created_by` |

`employee_profiles.user_id` is uniquely indexed, so employee↔user is 1:1. Scoping
tickets by the token user requires that join.

### Statuses in use

- `QuoteStatus`: draft, sent, viewed, accepted, rejected, expired
- `TaskStatus`: backlog, in_progress, blocked, done — **blocked is supported**
- `ServiceTicketStatus`: open, in_progress, resolved, closed
- `FollowupStatus`: pending, completed, cancelled
- `ProjectStatus`: planning, active, completed, cancelled, on_hold
- `CustomerStatus`: lead, prospect, active, inactive, lost
- Property: `site_status`, `site_visit_done`, `survey_done` booleans + assignee/completion columns

### Existing due-soon horizons

- 7 days — `project-analytics.service.ts:16`, `project-attention.service.ts:25`
- 3 days — payment milestones, `project-attention.service.ts:26`
- Quotes — `valid_until` exists; **no expiring-soon rule anywhere**. This spec adds 7 days.
- Follow-ups — no due-soon rule; cadence constants are for scheduling, not attention.

---

## 4. Attention rules

Every rule maps to a real column. Severity is `critical`, `warning` or `info`.

### 4.1 Workflow: Lead → Project

| Kind | Fires when | Severity | Action |
|---|---|---|---|
| `property_missing` | customer status `lead`/`prospect` AND 0 non-deleted properties | warning | Add Property → onboarding wizard, `customerId` prefilled |
| `site_visit_unassigned` | `site_visit_assignee IS NULL` AND `site_visit_done = false` | warning | Open Property |
| `site_visit_pending` | assignee set AND `site_visit_done = false` | info | Open Property |
| `survey_pending` | `site_visit_done = true` AND `survey_done = false` | warning | Open Property |
| `quote_missing` | `survey_done = true` AND property has 0 non-deleted quotes | warning | Create Quote, `customerId` + `propertyId` prefilled |
| `quote_draft` | `status = draft` | info | Continue Quote |
| `quote_expiring` | `status IN (sent, viewed)` AND `valid_until` within 7 days | warning | Open Quote |
| `quote_lapsed` | `status IN (sent, viewed)` AND `valid_until` in the past | critical | Open Quote |
| `quote_accepted_no_project` | `status = accepted` AND no project row with that `quote_id` | critical | Convert to Project |

Only the **furthest-along incomplete step** for a property is emitted. A property never
produces both `site_visit_pending` and `survey_pending`.

**"Quote not sent" (spec §11) is deliberately omitted.** `draft` already means not sent;
there is no separate state. Emitting both would count one quote twice, which §23 forbids.

**Quotes never expire on their own.** `markExpiredQuotes()` exists and nothing calls it —
documented at `quote.service.ts:257`. Expiry is therefore computed from `valid_until`,
never read from `status`.

### 4.2 Follow-ups

`status = pending`, assigned to or created by the subject. Three buckets by `scheduled_at`:

- **Overdue** — before today's start (critical)
- **Today** (warning)
- **Next 7 days** (info)

Day boundaries use the existing single helper (see commit `5269faa8`).

### 4.3 Service requests

Active = `ACTIVE_TICKET_STATUSES` (open, in_progress). Buckets:

- **Overdue** — `due_date` in the past (critical)
- **Due today** (warning)
- **Due within 7 days** (info)
- **Open and unassigned** — `assigned_to_employee_id IS NULL` (warning)

`due_date` is nullable; a ticket with no due date only qualifies via the unassigned rule.

### 4.4 Project health

My projects = created by me OR I am in `project_team_members`, status `planning` or `active`.

Per project: overdue flag (`end_date` past), task counts (overdue / blocked / due in 7 days),
and a milestone rollup grouped by `project_tasks.milestone_name`.

Severities: `end_date` in the past is **critical**; any blocked or overdue task is
**warning**; due within 7 days is **info**.

Rules are copied from `ProjectAttentionService` so the two screens cannot disagree.

**Progress is reported as tasks done / total**, from `getTaskCountsForProjects()`.
The stored `progressPercentage` column is set by hand and can be stale; it is not used.

### 4.5 Finance

Single source: `v_milestone_balance`, filtered to my projects,
`status = 'active'`, `balance_paise >= 100`.

- **Overdue money** — `days_overdue > 0` (critical)
- **Due soon** — within 3 days, the existing rule (warning)

The seven legacy finance endpoints that still read pre-cutover tables are **not touched**.

---

## 5. API and data contract

### Endpoint

```
GET /api/dashboard/my-work
```

No identity parameter. The subject is resolved from `@CurrentUser()`.

### Response

```ts
{
  generatedAt: string;
  summary: { overdue: number; dueToday: number; dueThisWeek: number };
  sections: {
    workflow:  SectionResult;
    followups: SectionResult;
    service:   SectionResult;
    projects:  SectionResult;
    finance:   SectionResult;
  };
}

type SectionResult =
  | { status: 'ok';    counts: Record<string, number>; items: DashboardItem[]; total: number }
  | { status: 'error'; message: string };
```

The discriminated union forces the UI to handle a failed section.

### Counts

Each section runs **one CTE**. The count and the list both read from it:

```sql
WITH mine AS ( /* scope filter */ )
SELECT count(*) FROM mine;
SELECT * FROM mine ORDER BY severity, due_date LIMIT n;
```

Scope is applied **before** aggregation. Never count globally and filter after.

The three headline numbers are **Overdue**, **Due today** and **Due this week** —
disjoint sets, each meaning one thing. The earlier trio (Needs Attention · Overdue ·
Due Soon) was dropped when the artboard made its problem visible: "Needs attention"
merely restated the badge on the block directly beneath it, and because every overdue
item is critical, "Overdue" then covered almost the same records again. Two of three
numbers carried no information. The Needs Attention count now lives only on that
block's own badge.

`summary` is the sum of section counts computed in code — not a separate query — so the
three headline numbers cannot drift from the sections.

**The critical-lift of decision 6 is a rendering rule, not a query rule.** Every provider
counts and returns its full set. The web moves critical *items* into the Needs Attention
block and renders the remainder in their own section, which then states how many were
lifted. Section counts therefore always describe the full set, and never double-count.

### Links

Items carry an intent, not a URL:

```ts
{ entity: 'property', entityId: '…', action: 'add_property', params: { customerId: '…' } }
```

The web maps `action` → `ROUTES` in one small module. Routes are owned by
`apps/web/lib/config/routes.ts`; hard-coding paths in the backend (as
`ProjectAttentionService` does today) rots silently when a route changes.

Actions are gated with the existing catalog codes — `properties.create`,
`quotes.create`, `quotes.edit`, `projects.create`, `followups.manage`, `service.manage`.
A blocked action stays visible and opens the existing access dialog, matching the
convention already used by the quick-link cards.

### Failure isolation

Providers run under `Promise.allSettled`. A failing provider returns
`status: 'error'` for its own section only; the other four render. The real error is
logged server-side and a generic message is returned. The page fails wholesale only on auth failure.

### Performance

Five providers in parallel, 1–2 aggregate queries each — roughly ten queries total.
No per-project loops. No cache in v1: a stale attention list is worse than a slow one.
Add caching only against a measurement.

### Types

New file `libs/shared/src/types/interfaces/dashboard.interface.ts` exporting
`DashboardSection`, `DashboardItem`, `DashboardItemKind`.

The existing `AttentionKind` is **not widened**. `oneohm-mobile` keeps its own copy of
`AttentionItem` with an exhaustive label map at
`src/features/projectDetail/model/onSite.ts:17`; an unrecognised kind would render blank there.
Because web and backend resolve `@tejas96/shared` from local source, **no package publish is required**.

---

## 6. UX

### 6.1 A section never renders an "Overdue" bucket

Drawing the desktop artboard exposed this: every overdue follow-up, ticket and
milestone is `critical` by §4, and every critical item lifts. So a section's
Overdue bucket is **always empty by construction** — rendering one is dead UI.

Sections therefore start at their first non-critical bucket (Today, Due today,
Due soon), and the section header carries the lifted work as a count:

```
FOLLOW-UPS  8   2 overdue shown above
```

The full count stays on the badge, so the section still describes its whole set.

### 6.2 What the critical-lift does and does not touch

The lift applies only to the **item-shaped** sections: workflow, follow-ups, service and
finance. **Project health does not lift.** It is a per-project summary, not a list of
items, and removing an overdue project from it would leave the block describing only
healthy projects — the opposite of its purpose. An overdue project is therefore surfaced
twice on purpose: once as a critical item, once as a project row. This is the single
deliberate exception to spec §25.

### Page order

Two content columns, roughly 7:3. The navigation shell (48px header, 48px rail,
200px panel) is untouched; the dashboard owns the remaining ~1192px.

**Main column**

| # | Block | Weight |
|---|---|---|
| 1 | Greeting card — name, date, one sentence of state | quiet |
| 2 | **Needs Attention** — critical items only | loudest |
| 3 | **Workflow stuck** — Lead → Property → Survey → Quote → Project | loud |
| 4 | Follow-ups — bucketed | medium |
| 5 | Service Requests — bucketed | medium |
| 6 | Project health — one compact row per project | medium |

**Right column**

| # | Block | Weight |
|---|---|---|
| 7 | At a glance — Overdue · Due today · Due this week | medium |
| 8 | Money to chase | quiet |

Visual weight decreases down the main column. Urgent work dominates.

Follow-ups and Service Requests were a side-by-side pair in an earlier draft. They
stack in the main column now: the two-column page already spends its horizontal
budget on the right rail, and a bucketed list needs the width to hold its row grid.

### Row anatomy

```
(AV)   Survey pending · ABC Property         Site visit done 4 days ago.
       Bhosale Farmhouse                     Survey not started.        [ Complete → ]
```

- **No coloured edge bar, no row tint, no per-row status pill.** An earlier draft
  put a 3px coloured edge on every row. It was replaced after the owner supplied a
  reference design: urgency reads better carried by a small amount of coloured
  **text** — the section label and the reason line — against otherwise neutral
  rows. Colour on every row is colour nowhere.
- Leading element: an initials avatar for anything about a person; a small tinted
  rounded-square icon for a record (quote, ticket, project, payment).
- Line 1: what it is, and which record. Line 2: the place, person or reference.
- Reason: a plain sentence saying why this is on screen, in its own column, taking
  the urgency colour only when urgent.
- Right meta: dates, counts and money in **tabular numerals**, right-aligned.
- One action. Never three. Quiet by default, gaining emphasis on row hover.

### Colour

Design-system tokens only — no hard-coded hex in components.

| Meaning | Foreground token | Tint (badges only) |
|---|---|---|
| Critical / overdue | `danger` #DC2626 | `danger-bg` #FDECEC |
| Due soon / attention | `warning` #A16207 | `warning-bg` #FEF7E6 |
| Active / info | `info` #0369A1 | `info-bg` #E8F4FB |
| Healthy / complete | `success` #15803D | `success-bg` #EAFBEF |
| Accent / primary action | `accent` #76C044 | — |

Cards stay white on `background-secondary`, with no borders and no dividers between
rows. No red backgrounds, no tinted rows. The page should read as near-monochrome
with a few deliberate points of colour.

**Deviation from spec §25:** the design system has four semantic families, not five —
there is no separate orange and yellow. "Due soon" and "attention" share `warning`.
The design system wins.

### Density

| Block | Rows | Overflow |
|---|---|---|
| Needs Attention | 6 | `View all N →` |
| Workflow | 5 | `View all N →` |
| Follow-ups | 5 (non-critical only) | `Open follow-ups →` |
| Service | 5 (non-critical only) | `Open service →` |
| Projects | 4 | `Open projects →` |
| Finance | 3 | `Open finance →` |

### 6.3a The drawer holds what the response holds, and says so

Found 2026-08-22 while wiring the drawer. The backend caps items at five **per bucket**, so a
drawer opened from a section with 331 stalled items receives ten of them. A link reading
"View all 331" above a list of ten is precisely the count-vs-list dishonesty §7 check 15 exists
to catch.

**Resolution — the label stops promising, and the drawer states its own scope.** The overflow
link reads plain "View all"; the drawer's subtitle reads "Showing 10 of 331". Nothing claims
completeness it cannot deliver.

The alternative — lifting the cap for the drawer, or giving it its own paginated endpoint — is
a real feature and is deliberately not built here. A dashboard is a triage surface: the ten
most urgent of 331 is the actionable set, and someone who needs all 331 belongs in the module's
own list screen, not in a sheet over their home page.

### 6.3 Where "View all" goes

Four of the six overflow links resolve to an existing single-entity route:
`/followups`, `/service`, `/projects/list`, `/finance`.

**Needs Attention and Workflow Stuck do not.** Both are deliberately mixed — a quote,
a property, a follow-up, a ticket, a project and a payment in one list — and no route
in the app can render that mix. Creating one would breach §21 (do not invent routes)
and §24 (no dashboard sub-pages).

The resolution: **the list is mixed, but every row is not.** Each row already carries
its own entity, action and destination. The mixed list needs somewhere to live, not a
shared destination.

So those two links open the existing `DrillDownDrawer`
(`components/shared/drawers/drill-down-drawer.tsx`) — a Sheet with a title, a count,
built-in search and a `renderItem` hook that draws the same dashboard row. Rows inside
it keep their individual deep links.

A sheet is not navigation: the dashboard stays a single page, scroll position survives,
and search covers the day someone has forty stuck items rather than nine.

No task lists (spec §17). A project row shows counts and milestone health only:

```
Kitchen Renovation                            Due 12 Sep · 14/23 tasks done
Design ✓ 8/8   Production ◐ 12/16   Installation ⚠ 3/9 · 2 overdue
```

The worst milestone is marked; clicking opens that milestone's task filter
(`?tab=tasks&t_milestone=…`, the parameter the project page already reads).

### States

- **Loading** — skeleton rows matching real row heights, per section. No spinner, no layout shift.
- **Empty** — one quiet muted sentence. No icon, no illustration. e.g. *No follow-ups need attention.*
- **Broken** — one line plus Retry, inside that block only. The other six render normally.

### Responsive

**Not being built.** Confirmed by the owner 2026-08-22: this is a web-only product. The
two-column grid collapses to one column below `xl`, so a narrow window stays usable, and
that is the whole of the responsive story. The small-screen priority order this section
used to specify is removed rather than left as a promise nobody intends to keep.

---

## 7. Verification

By walking the screens in the running app, not by authoring test files (decision 7).
Every check pairs a state with what must render.

| # | State | Page must |
|---|---|---|
| 1 | Lead with no property | Show `property_missing`; action opens wizard with customer prefilled |
| 2 | Property, no site-visit assignee | Show `site_visit_unassigned` and **not** the survey item |
| 3 | Site visit done, survey not | Show `survey_pending` only — one action |
| 4 | Survey done, no quote | Show `quote_missing`; action prefills customer **and** property |
| 5 | Draft quote | Show `quote_draft` once; never also a "not sent" item |
| 6 | Quote past `valid_until`, status still `sent` | Show `quote_lapsed` |
| 7 | Accepted quote, no project | Show `quote_accepted_no_project` |
| 8 | Follow-ups overdue / today / next week | Land in the correct bucket |
| 9 | Complete a follow-up inline | Row disappears, count drops by one, no reload |
| 10 | Ticket overdue; ticket unassigned | Both appear, correctly separated |
| 11 | Project past `end_date` | Row marked overdue; worst milestone marked |
| 12 | Milestone with money owed | Finance block amount matches the project's Payments tab |
| 13 | **Sign in as a second user** | None of the first user's records appear anywhere, including counts |
| 14 | Force one provider to throw | That block shows Retry; the other six render |
| 15 | Every count on screen | Equals the list beneath it |

Checks 13 and 15 are the two that matter most: 13 is the security check, 15 the honesty check.

Regression gates: `npm run typecheck`, `npm run lint`, `npm run test` — all must stay green.

---

## 8. Known limitations

Recorded because spec §34 requires stating what could not be verified.

| # | Limitation | Consequence |
|---|---|---|
| 1 | RBAC enforcement is frontend-only app-wide (`apps/web/lib/rbac/catalog.ts:4`) | This endpoint guards itself; no other endpoint is fixed by this work |
| 2 | Nothing schedules `markExpiredQuotes()` | `QuoteStatus.EXPIRED` is never written; expiry is derived from `valid_until`. Adding the scheduler is separate work |
| 3 | Seven finance endpoints read pre-cutover tables | Avoided entirely; only `v_milestone_balance` is used |
| 4 | No "last worked on" signal on service tickets | "Not progressing" (§13) is implemented only as *unassigned*. Deriving it from `updated_at` would be an invented rule |
| 5 | `progressPercentage` is manually maintained | Not used. Tasks done/total is shown instead |
| 6 | Milestones are a string on tasks, not an entity | A milestone with no tasks does not exist; §16's assumption of a milestone table is wrong |
| 7 | The app was only observed at the login screen | Header and rail are reproduced from source, not from sight |
| 8 | Ticket assignee is an employee id, not a user id | Requires a join through `employee_profiles`; getting it wrong leaks other people's tickets (check 13) |
| 9 | ~~**Postgres runs in UTC; the business runs in IST.**~~ **FIXED 2026-08-22** — the connection now pins `timezone=Asia/Kolkata` (`database/datasource.ts`). Surveyed first across 120 date-boundary sites in 15 modules: 59 became correct, none broke. The original finding follows for the record. `SHOW timezone` returns UTC and nothing overrides it on the connection in `database/datasource.ts`, so `CURRENT_DATE` and `date_trunc('day', now())` resolve to the *UTC* day. Measured 2026-08-22: `CURRENT_DATE` read `2026-08-21` while the IST date was already the 22nd. | For the 5.5 hours between IST midnight and 05:29, the database's "today" is still yesterday, so every date bucket in the app — not only this dashboard — is off by one. **Deliberately not fixed here:** `followup.repository.ts:144-155` settled that the database owns the day boundary and every existing follow-up surface already behaves this way, so making this one screen use IST would recreate the drift that decision exists to prevent. The fix was one line on the pg connection, applied once app-wide. It also closed a split-brain nobody had named: `fly.toml:28` already set `TZ = 'Asia/Kolkata'` on the Node process, so the same overdue count came out one number from SQL and another from JavaScript for those 5.5 hours, depending only on which side computed it. |

---

## 9. Out of scope

Deferred to a follow-up spec:

### Admin / manager employee selector

Confirmed 2026-08-21, re-verified against the catalog and the route map:

- **No permission code covers "view another employee's work."** The catalog holds exactly
  42 codes and none of them is close.
- **There are deliberately no `admin.*` codes at all** — `route-map.ts:16` states it. The
  admin panel is gated by ROLE (`SUPERADMIN_ONLY`), not by permission.
- So the selector needs a **new code**: a catalog entry plus a migration mirroring it into
  the `permissions` table, against a catalog that was deliberately reset to 42.
- It also needs a backend query param, the permission check on it, and an employee list to
  populate the picker.

The retrofit is cheap by construction. Decision 2 put identity in the token specifically so
that the selector could later add one param and one check without reshaping the endpoint.
Nothing built for "My Work" gets rewritten.

### Business Matrix

Not blocked, only large. It would build on `analytics/domains/sales-pipeline`, which
already provides the funnel, stage conversion and the salesperson leaderboard.
`pipeline.view` already exists and is a plausible gate.

The binding constraint is honesty, not effort: only metrics backed by live data may appear.
Seven finance endpoints still read pre-cutover tables (see §8), so most finance-shaped
charts would be reporting frozen figures.

### Also deferred

- **Mobile / responsive layout — NOT BEING BUILT.** Confirmed by the owner 2026-08-22: this is a
  web-only product. The page collapses to a single column below `xl`, which keeps it usable on a
  narrow window, but no small-screen design is planned and §6's mobile priority order is dead
  text. Do not treat its absence as an outstanding task.
- App-wide backend RBAC enforcement
- A scheduler for quote expiry
