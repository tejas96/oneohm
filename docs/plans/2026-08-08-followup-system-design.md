# Follow-up System — Design

**Date:** 2026-08-08
**Status:** Approved design, ready for implementation planning
**Branch context:** `refactor/remove-organizations` (single-tenant)

---

## 1. Problem

Leads go cold silently. A customer or property can sit for weeks with nobody
owing it an action, and nothing in the system notices or complains.

The `followups` table already exists and is correctly shaped. The API exposes
`/my`, `/today` and `/overdue`. Two detail-page tabs can create and complete
followups. None of it is wired into a loop, so a follow-up is an optional log
entry rather than the heartbeat of an open lead.

Concretely, five gaps:

1. **Nothing forces a next follow-up to exist.** A lead with zero pending
   follow-ups is indistinguishable from a healthy one.
2. **Lead temperature does nothing.** `LeadTemperature`'s 3/10/15-day cadence
   lives in a code comment at `libs/shared/src/types/enums/customer.enum.ts:39`
   and is never applied.
3. **No cross-entity view.** `/followups/my`, `/today` and `/overdue` exist but
   no page consumes them. Nobody can answer "what do I do today?"
4. **Completing a follow-up is a dead end.** No outcome is captured and no next
   step is created.
5. **Onboarding leaks orphan leads.** The wizard persists the customer as soon
   as the customer steps validate
   (`apps/web/components/features/onboarding/components/onboarding-wizard/index.tsx:322`).
   An abandoned wizard leaves a customer with no property, no owner and no
   follow-up.

## 2. Goals and non-goals

**Goals**

- An open lead can never reach a state where nobody owes it an action.
- Follow-ups work at both customer level and property level, independently, for
  any reason.
- Any user can be assigned; any user can reassign.
- One page answers "what do I do today?"
- Capture *why* a lead was lost, at the moment someone knows it.

**Non-goals (deliberately deferred)**

- RBAC. Planned separately. Nothing here may assume roles.
- The combined "My Day" dashboard. This feature is built so the dashboard can
  compose it later without rework.
- Email, WhatsApp or push reminders. In-app surfaces only.
- Automation that creates follow-ups without a human deciding.

## 3. Core concept

**The follow-up is the ownership record.** No `lead_owner` column is added.
Whoever holds the next pending follow-up owns that lead right now. Reassigning
the follow-up reassigns the lead. One concept, not two kept in sync.

### Definitions

**Lead unit** — the thing that gets chased. Exactly two kinds:

| Kind | Definition |
|---|---|
| Customer lead unit | A customer with zero properties, status `lead` or `prospect` |
| Property lead unit | A property not yet `converted` or `lost`, with no accepted quote |

**Open** — a lead unit that has not reached a terminal state.

**Next follow-up** — the earliest pending follow-up on a lead unit. A **derived
value** (`MIN(scheduled_at) WHERE status = 'pending'`), never a stored column.
There is no `next_followup_id` to keep in sync.

### The one rule

> **Every open lead unit must have at least one pending follow-up.**

Multiple pending follow-ups on the same unit are allowed and expected — chase
documents, chase payment and chase the decision in parallel. Only the earliest
is displayed as "Next".

### Terminal states

| Lead unit | Ends when |
|---|---|
| Property | Its quote is `accepted`, **or** it is `converted` to a project, **or** it is marked `lost` |
| Customer | Their first property is created, **or** the customer is marked `lost` |

Reaching any terminal state auto-cancels that unit's pending follow-ups. A won
deal stops nagging without a second click.

### Enforcement

Three active gates plus one net:

| Point | Mechanism |
|---|---|
| Creation | Wizard's Review & Assign step requires a next follow-up (date + owner) |
| Completion | Cannot complete the **last** pending follow-up without scheduling the next one, or declaring terminal |
| Terminal | Accepted / converted / lost cancels pending follow-ups |
| **Net** | `Needs follow-up` bucket — open lead units with zero pending, attributed to last assignee, else `created_by` |

The net is deliberate, not a fallback for a weak design. Records arrive by
import and direct API calls that never touch the wizard. Rather than pretend
enforcement is airtight, anything that slips lands in a visible bucket with a
name attached.

### Cadence

`LeadTemperature`'s cadence moves out of the code comment into a shared
constant used to **prefill** the next follow-up date:

| Temperature | Prefill |
|---|---|
| `HOT` | +3 days |
| `WARM` | +10 days |
| `COLD` | +15 days |
| Customer lead unit (no temperature) | +3 days |

Prefill only. Always editable, never enforced, never auto-applied.

## 4. Schema changes

The existing one-to-many relationships are already correct and need no change:

```
CustomerProfile  ──1:N──▶  Followup     customer_id  NOT NULL
CustomerProperty ──1:N──▶  Followup     property_id  NULL-able
```

- `followup.entity.ts:29` — `@ManyToOne(() => CustomerProfileEntity)`
- `followup.entity.ts:37` — `@ManyToOne(() => CustomerPropertyEntity)`, nullable
- `customer-profile.entity.ts:44` — `@OneToMany(... followup.customer)`
- `customer-property.entity.ts:141` — `@OneToMany('FollowupEntity', 'property')`

### New columns

**`followups`**

| Column | Type | Notes |
|---|---|---|
| `outcome` | `varchar(30)` nullable | Set on completion |
| `completed_at` | `timestamptz` nullable | Needed for "done today" counts |

**`customer_properties`**

| Column | Type |
|---|---|
| `lost_reason` | `text` nullable |
| `lost_at` | `timestamptz` nullable |

**`customer_profiles`** — same two columns, so a property-less lead can die.

### Enum additions (no migration required)

Status columns are `varchar`, not Postgres enums, so these are code-only:

- `PropertyStatus.LOST = 'lost'`
- `CustomerStatus.LOST = 'lost'`

### New shared enum

`FollowupOutcome` in `libs/shared/src/types/enums/customer.enum.ts`:

```
not_reachable · call_back_later · interested · site_visit_done
documents_pending · negotiating · not_interested · other
```

`other` **requires** the notes field. Without a catch-all, users pick a
wrong-but-close option to get past the dialog, which corrupts data more quietly
than an honest "other". Requiring notes keeps the escape hatch honest and gives
a maintenance signal: if `other` exceeds roughly 10% of completions, read those
notes and promote a real value.

### New indexes

Single-tenant removed the org-prefixed composites, so the new queries need
their own. The `gaps` query is a `NOT EXISTS` over follow-ups and needs:

- `followups(property_id, status)` partial, `WHERE deleted_at IS NULL`
- `followups(customer_id, status)` partial, `WHERE deleted_at IS NULL`
- `customer_properties(status)` partial, `WHERE deleted_at IS NULL`

Existing `(assigned_to_user_id, scheduled_at)` and `(scheduled_at, status)`
already cover My / Today / Overdue.

## 5. Interaction design

### The complete dialog

This is the whole feature. One dialog, opened by "Complete" on any follow-up.

```
Complete follow-up ──────────────────────────────
  Property · Sharma Residence, Pune        [HOT]
  "Call about revised quote" · due 2 days ago

  What happened?   [ Negotiating          ▾ ]
  Notes            [ Wants 5% off, checking  ]   ← required if "Other"

  ─── Next follow-up ──────────────────────  required *
  Date             [ 10 Aug 2026 ]   ← prefilled: HOT = +3d
  Owner            [ Ravi Kumar    ▾ ]   ← defaults to current user
  Subject          [ Follow up on discount request ]

  [ Save & schedule next ]  [ Quote accepted ]  [ Mark lost ]

  * required only when this is the last pending follow-up — see below
```

Three exits, and only three:

- **Save & schedule next** — completes this one, creates the next, in one
  transaction. The loop continues.
- **Quote accepted** — terminal. Cancels the property's pending follow-ups.
- **Mark lost** — prompts for a reason, sets `lost_reason` / `lost_at`, cancels
  pending follow-ups.

**When the next block is required:** only when this is the **last pending
follow-up** on the lead unit. That is the exact condition under which completing
it would violate the one rule.

If other pending follow-ups remain on the unit, the block is still shown and
still prefilled, but skippable via a "No further follow-up needed" toggle. The
rule is already satisfied by the siblings, so forcing another one is friction
with no safety value — and it would make Journey 5 (two parallel chases)
absurd: completing the document chase would demand a second document chase while
the quote-decision follow-up sits open.

The header states which mode is active, so the requirement never feels arbitrary:

- Last pending → *"This is the only open follow-up — schedule the next one."*
- Others pending → *"2 other follow-ups are still open on this property."*

In the common case there is exactly one pending, so the block is required and
the loop is unbreakable. It costs one date field the user was going to think
about anyway.

Selecting `not_interested` pre-opens the Mark lost path — the natural next
action, not a separate hunt through the UI.

### Escape valves

If completion were the only way forward, users would cancel follow-ups to
escape. Two pressure releases:

- **Reschedule** — change the date on a pending follow-up. No outcome, no new
  record. For "he asked me to call Monday instead."
- **Cancel** — still allowed. If it leaves the unit with zero pending, the unit
  appears in `Needs follow-up` immediately. Cancelling doesn't make a lead
  disappear; it relocates it.

### Assignment

- Default assignee is **always the current logged-in user** — in the wizard, in
  the complete dialog, and in the ad-hoc drawer.
- Always a dropdown of active users. Never locked.
- **Reassign is a first-class action**, not only available while completing.
  Available from the row, the drawer, and in bulk from `/followups`.
- Any user can reassign any follow-up. `assigned_to_user_id` changes and
  `updated_by` records who did it. No history table.

### Visibility (no RBAC)

`/followups` defaults to **My follow-ups**. Anyone can switch to **All** and
filter by assignee. This is a default view, not a permission. When RBAC lands it
becomes a filter on the same query — nothing to rebuild.

## 6. API

Existing endpoints keep working. Added or changed:

| Endpoint | Change |
|---|---|
All action endpoints are `POST :id/<action>` — that is what the shared
`ApiAction` decorator generates (`api-action.decorator.ts:56`), and the existing
`complete`/`cancel` routes already use it.

| `POST /followups/:id/complete` | **Changed.** Takes `{ outcome, notes?, next?: { scheduledAt, assignedToUserId, subject, type, priority } }`. Completes and creates the next in one transaction. Rejects a missing `next` **only when this is the last pending follow-up on the unit**, unless the caller passes `terminal: 'accepted' \| 'lost'`. The server evaluates that condition itself — it never trusts the client's view of it. |
| `POST /followups/:id/reassign` | New. `{ assignedToUserId }`. Bulk variant is `POST /followups/reassign` with an id array. |
| `POST /followups/:id/reschedule` | New. `{ scheduledAt }`. No outcome, no new record. |
| `GET /followups/gaps` | New. Open lead units with zero pending follow-ups, both kinds, with attributed user. |
| `GET /followups/summary` | New. `{ overdue, today, upcoming, gaps }` counts for the nav badge and the future dashboard widget. |
| `POST /properties/:id/lost` | New. `{ reason }`. Sets status / `lost_reason` / `lost_at`, cancels pending follow-ups. |
| `POST /customers/:id/lost` | New. Same, for property-less leads. |

Quote acceptance and project conversion call the same cancel-pending routine.

No endpoint takes an organization parameter. `All` means literally all
follow-ups — there is no tenant scoping to reason about in `gaps` or `summary`.

### The gaps query

Two `NOT EXISTS` branches, unioned:

- **Properties** — `deleted_at IS NULL`, `status NOT IN ('converted','lost')`,
  no accepted quote for that property, and no pending follow-up.
- **Customers** — `deleted_at IS NULL`, `status IN ('lead','prospect')`, zero
  properties, and no pending follow-up.

Note `latestQuoteStatus` is computed in `customer-property.service.ts`, not a
column, so the accepted-quote check is a `NOT EXISTS` against `quotes`.

Attribution: most recently completed follow-up's assignee, falling back to
`created_by`.

## 7. UI surfaces

### Conventions

Per `.cursorrules:31` — **MUI is the primary design system** for all
interactive components, typography and icons; **Tailwind is layout only**
(flex, grid, spacing, responsive); icons from `@mui/icons-material`
exclusively.

### Reused as-is

| Need | Component |
|---|---|
| `/followups` table + bulk select | `CrmTable`, `CrmSelectionBar`, `CrmTableToolbar`, `CrmTablePagination` |
| Overdue / Today / Upcoming / Needs tabs | `shared/filters/filter-tabs.tsx` |
| Assignee picker | `MUIUserAssigneeSelector` |
| Next follow-up date | `MUIDatePicker` |
| Complete and Mark-lost dialogs | `MUIDialog` |
| Type and outcome selects | `MUISelect` |
| Priority | `priority-dropdown.tsx` |
| Status and temperature chips | `MUIStatusChip` |

`CrmSelectionBar` is why bulk reassign is nearly free — the selection plumbing
already exists.

### New shared components

In `apps/web/components/features/followups/`, consumed by the property tab, the
customer tab, `/followups`, and the future dashboard widget:

1. `FollowupCompleteDialog` — outcome, notes, required next block, three exits
2. `FollowupList` — the table; props-driven scope so one component serves all
   four surfaces
3. `NextFollowupChip` — "Next: Thu · Ravi", or a red "No follow-up scheduled"

### The `/followups` page

```
My follow-ups                              [ Mine ▾ ]  [ All ]

 Overdue (4)   Today (7)   Upcoming (12)   Needs follow-up (3)
 ───────────────────────────────────────────────────────────
  2d late  Sharma Residence      HOT   Call re: revised quote
           Pune · Ravi                      [Complete] [⋯]

  today    Mehta Industries      —     Collect electricity bill
           customer lead · Priya           [Complete] [⋯]
```

Filters: assignee, temperature, type, date range.
`⋯` — Reschedule / Reassign / Cancel / Open record.

`Needs follow-up` is the fourth tab, not a hidden report. Its rows have one
action: **Schedule**.

### Other surfaces

- **Nav badge** — overdue + today count, from `/summary` via a dedicated
  `useFollowupSummary()` hook. Note it must **not** go through
  `lib/hooks/use-navigation-counts.ts` — that hook returns hardcoded mock
  numbers behind a `TODO: Replace with actual API call` and is wired to no
  endpoint. Piggybacking on it would render an invented count.
- **Property and customer headers** — `NextFollowupChip`, or the red prompt
- **Existing follow-up tabs** — gain the outcome column and the new dialog
- **Later dashboard** — embeds `FollowupList` + `/summary`, with "View all"
  linking to `/followups`

### Consolidation

`property-detail/followup-drawer.tsx` and `customer-detail/followup-drawer.tsx`
are near-duplicates. Both hand-roll a raw `<Autocomplete>` over the employee
list and a `type="datetime-local"` `<TextField>` instead of using
`MUIUserAssigneeSelector` and `MUIDatePicker`.

They collapse into one `FollowupDrawer` taking an optional `propertyId` — which
is precisely the customer-level versus property-level distinction the schema
already models. Two files become one, and the controls match the rest of the app.

## 8. Blocking defect found during design

`apps/backend/src/modules/customers/repositories/customer-property.repository.ts:65`
still requests a relation the entity no longer has:

```ts
relations: ['customer', 'organization', ...]   // organization no longer exists
```

`CustomerPropertyEntity` has no `organization` member after the org removal.
TypeORM validates relation names against entity metadata at query-build time
and throws `EntityPropertyNotFoundError`.

`followup.service.create()` calls this method to validate the property
(`followup.service.ts:41`), so **creating any property-level follow-up fails
today** — the core path of this feature.

**Why the org cleanup missed it:** the cleanup plan relied on `tsc` to enumerate
the work (`docs/plans/2026-08-07-org-cleanup.md:1012`).
`relations: ['organization']` is a string literal and invisible to `tsc`. The
QA plan does not cover follow-ups.

The same pattern survives in 18 places across the `service-maintenance` module.
Out of scope here, tracked separately.

**Must be fixed and verified at runtime before any of this is built on top of.**

## 9. Single-tenant impact

Nothing in this design breaks. Follow-ups were never scoped by anything but
customer, property and assignee.

| Area | Effect |
|---|---|
| New endpoints | No org parameter |
| "All" toggle | Means literally all; no tenant-leak reasoning needed |
| Assignee dropdown | All active users |
| Migration | Purely additive; `LOST` needs no migration since statuses are `varchar` |
| Indexes | Harder, not easier — see §4 |

### Stale naming to fix in passing

Only in files this work already rewrites:

- `followupRepository.findByOrganization()` → `findAll()`
- Doc comments in `followup.repository.ts` lines 16, 26, 118, 221
- The orphaned `// ==== ORGANIZATION ====` comment block in `followup.entity.ts`

Leave `userRoleRepository.findByUserAndOrganization()` alone — 10 call sites
across unrelated modules.

## 10. Build order

| # | Step | Delivers |
|---|---|---|
| 0 | Fix the stale `'organization'` relation; verify property follow-up creation at runtime | Unblocks everything |
| 1 | Schema, enums, cadence constant, indexes, migration | Data foundation |
| 2 | Service layer: new complete semantics, reassign, reschedule, gaps, summary, terminal cancel hooks | The rule, enforced |
| 3 | `FollowupCompleteDialog`; wire into both existing tabs; consolidate the two drawers | The loop, usable |
| 4 | `/followups` page: tabs, filters, bulk reassign | "What do I do today?" |
| 5 | Wizard required next follow-up; `NextFollowupChip` on headers; nav badge | Impossible to skip |
| 6 | Mark lost: replace the stub dialog, wire both levels | Chains can end |

Steps 0–3 close the leak. Everything after is visibility.

## 11. Testing

**Unit — service layer**

- Complete without `next` and without `terminal`, when it is the last pending,
  is rejected
- Complete without `next` when siblings remain pending is **accepted**
- Complete with `next` creates exactly one pending follow-up, transactionally
- Complete with `terminal: 'accepted'` cancels all pending on that property
- `outcome: 'other'` without notes is rejected
- Reassign changes `assigned_to_user_id` and stamps `updated_by`
- Reschedule changes only `scheduled_at`; no new record, no outcome
- Cancelling the last pending makes the unit appear in `gaps`
- Creating a customer's first property removes it from `gaps`
- Property with an accepted quote is absent from `gaps`
- Multiple pending on one unit: `Next` resolves to the earliest

**Integration**

- Quote acceptance cancels pending follow-ups on that property
- Project conversion cancels pending follow-ups
- Marking one property lost leaves sibling properties' chains untouched

**UI**

- Wizard cannot submit without a next follow-up
- Complete dialog's next block cannot be bypassed
- `not_interested` opens the Mark lost path
- Bulk reassign moves every selected row
- Default assignee is the current user on all three entry points

**Regression guard for §8**

- A test that loads a property by id, so a stale relation name fails a test
  rather than a user's page load.

## 12. Journeys

**Phone enquiry, no property**
Wizard abandoned after customer steps → lands in `Needs follow-up` attributed
to its creator → scheduled → chased → property created → customer chain closes,
property chain takes over.

**Normal win**
Send quote → Interested (+3d, HOT) → Negotiating → Negotiating → Quote
accepted. Four touches, zero chances to forget.

**Loss**
Not reachable → Not reachable → Not interested → Mark lost, reason
"Competitor pricing". Reason captured when someone actually knows it.

**One customer, three sites**
Each property runs its own chain with its own owner and temperature. Losing one
leaves the others untouched and the customer active.

**Two reasons at once**
"Collect electricity bill" (Thu, Priya) and "Chase quote decision" (Mon, Ravi)
both pending. Header shows the earliest. Completing one leaves the other alone.

**Handoff**
`/followups` → All → assignee = Ravi → select all → Reassign to Priya.
Ownership moves with the follow-ups; no separate owner field to update.

**Gaming it**
Cancelling to clear a list drops the unit into `Needs follow-up`, attributed to
the person who cancelled.

## 13. Open assumption

"In-app now, web later, dashboard with View all" was read as: build the nav
badge and the `/followups` page now, and design `FollowupList` + `/summary` so
the dashboard widget is a composition rather than a rewrite. Email, WhatsApp and
push are out of scope. Correct this if the intent was different.
