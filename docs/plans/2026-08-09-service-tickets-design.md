# Service Tickets — Design

**Date:** 2026-08-09
**Status:** Approved, ready for implementation planning

## Problem

After a project completes, customers raise complaints, AMC queries, and general
issues. There is nowhere in the product to record, assign, or track them to
resolution. Staff working the CRM also cannot see, at a glance, which customers
or projects currently have something unresolved.

## Scope

Build a service ticket module from scratch: a dedicated screen under its own
rail-menu entry, ticket creation and status tracking, and visibility of open
work from the customer, property, and project surfaces.

The existing `service-maintenance` module is torn out first. Nothing in it is
reused.

## Decisions

| Decision | Choice |
|---|---|
| Cleanup depth | Wipe the whole `service-maintenance` module — all three tables, backend module, shared enums, web tab, AMC nav entry |
| Statuses | `open` → `in_progress` → `resolved` → `closed`. "Active" = `open` or `in_progress` |
| Transitions | Free movement between the first three; `closed` is terminal |
| Linkage | Customer and project both required; property derived through `project.property_id` |
| Assignee | Employee, optional at creation, via the existing `mui-user-assignee-selector` |
| Detail surface | Status history timeline + resolution note. No comment threads |
| Photos | Issue photos, up to 5, addable and removable until the ticket closes |
| Edit / delete | Fields editable while not closed; soft delete via `deleted_at` |
| CRM card | A tile in the customers-list KPI row |
| List indicator | One shared `ActiveTicketsChip` on both the customers list and the projects list |
| Detail tabs | Customer, property, and project each get a "Service Tickets" tab with a context-prefilled New Ticket button |
| Tests | No unit tests. Verification is by exercising the actual screens |

## Architecture decision: how lists learn "has active tickets"

**Chosen: join in the existing list query.** The customer-list and project-list
queries each gain a `LEFT JOIN LATERAL` count over `service_tickets`, backed by a
partial index on active, non-deleted rows. Lists return `activeTicketCount` per
row; the `hasActiveTickets` filter compiles to an `EXISTS`.

Rejected alternatives:

- **Denormalized counter columns** on `customer_profiles` and `projects`, bumped
  on every ticket write. Faster reads, but it puts ticket write-path complexity
  into two unrelated tables and invites drift — the chip reading "2" while the
  filtered list returns nothing.
- **A second endpoint the frontend calls to hydrate chips after the list loads.**
  Least invasive to the already-large `customer-profile.repository.ts`, but the
  `hasActiveTickets` *filter* must live in the main query regardless, so this
  means building the join anyway and then layering a second mechanism on top.

The filter requirement forces the join into the main query either way. Once it
is there, returning the count costs nothing.

---

## Phase 0 — Teardown

### Backend

- Delete `apps/backend/src/modules/service-maintenance/` (27 files: service
  requests, maintenance tasks, project maintenance configs).
- Unregister `ServiceMaintenanceModule` from `app.module.ts`.
- Delete `libs/shared/src/types/enums/service-maintenance.enum.ts` and its
  barrel export.
- New migration dropping `service_requests`, `maintenance_tasks`,
  `project_maintenance_configs`.
- Strip `hasServiceRequests` from the delete-blocker flags in
  `customer-profile.repository.ts` — five sites: two type literals, the query,
  the mapper branch, and its message string.

### Web

- Delete `customers/customer-detail/tabs/service-tab.tsx`, its dynamic import,
  its prefetch entry, and its render branch in `customer-detail-page.tsx`.
- Remove the "Open Service Tickets" card from the customer `overview-tab.tsx`.
- Remove the `useCustomerServiceRequests` hook.
- Remove `ROUTES.SERVICE.AMC` and the AMC nav section.
- Remove `openTickets` / `urgentTickets` from `lib/types/navigation-counts.ts`
  and the mock values in `lib/hooks/use-navigation-counts.ts`.

Neither mobile app references service requests, so teardown is contained to
backend and web.

---

## Phase 1 — Data model

### `service_tickets`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | via `BaseEntity` |
| `ticket_number` | varchar(50) unique | `TKT-ONEOHM-2026-0001` — `TKT-{COMPANY.code}-{year}-{seq}`, same generator pattern as `PRJ-` / `QT-`. The sequence counts every row for the year including soft-deleted ones, so numbers are never reused |
| `title` | varchar(255) | required |
| `description` | text | required |
| `priority` | varchar(20) | `low` \| `medium` \| `high` \| `urgent`, default `medium` |
| `status` | varchar(20) | `open` \| `in_progress` \| `resolved` \| `closed`, default `open` |
| `customer_id` | uuid FK | → `customer_profiles`, required |
| `project_id` | uuid FK | → `projects`, required |
| `assigned_to_employee_id` | uuid FK null | → `employee_profiles` |
| `assigned_at` | timestamptz null | stamped when an assignee is first applied |
| `photos` | jsonb null | array of `{ fileName, filePath, fileSize, mimeType }`, max 5 |
| `resolution_note` | text null | captured on the transition to `resolved` |
| `resolved_at` | timestamptz null | |
| `closed_at` | timestamptz null | |
| `created_by` | uuid FK null | → `users` |
| `updated_by` | uuid FK null | → `users` |
| `created_at` / `updated_at` | timestamptz | via `BaseEntity` |
| `deleted_at` | timestamptz null | soft delete |

**No `property_id` column.** Property derives through `project.property_id`,
which is `NOT NULL`. Storing a copy would go stale if a project were ever
re-pointed at a different property.

Indexes:

- `(customer_id)` partial, `WHERE status IN ('open','in_progress') AND deleted_at IS NULL` — drives the customer chip and CRM filter
- `(project_id)` partial, same predicate — drives the project chip and filter
- `(status)` `WHERE deleted_at IS NULL`
- `(assigned_to_employee_id)`

### `service_ticket_status_history`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `ticket_id` | uuid FK | → `service_tickets`, `ON DELETE CASCADE` |
| `from_status` | varchar(20) null | null on the creation row |
| `to_status` | varchar(20) | |
| `note` | text null | |
| `changed_by` | uuid FK | → `users` |
| `created_at` | timestamptz | |

Index on `(ticket_id, created_at)`.

### Shared enums

New `libs/shared/src/types/enums/service-ticket.enum.ts`:

```ts
export enum ServiceTicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum ServiceTicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export const ACTIVE_TICKET_STATUSES = [
  ServiceTicketStatus.OPEN,
  ServiceTicketStatus.IN_PROGRESS,
] as const;
```

`ACTIVE_TICKET_STATUSES` is the single definition of "active" — backend filters
and frontend chips both import it, so they cannot disagree.

---

## Phase 2 — API

New module `apps/backend/src/modules/service-tickets/`, following the existing
entities / dto / repositories / services / controllers layout.

```
POST   /service-tickets             create
GET    /service-tickets             paginated list
GET    /service-tickets/stats       counts by status + urgent count
GET    /service-tickets/:id         detail with status history
PATCH  /service-tickets/:id         edit fields
PATCH  /service-tickets/:id/status  transition
DELETE /service-tickets/:id         soft delete
```

**Create** validates that the project belongs to the selected customer,
generates the ticket number, and writes the `null → open` history row.

**List** filters: `status[]`, `priority[]`, `assigneeId`, `customerId`,
`projectId`, `propertyId` (joins through project), `createdBy`, `search` (title
or ticket number), and a created-date range.

**Edit** returns 409 when the ticket is `closed`.

**Status transition** accepts an optional note, requires a resolution note when
moving to `resolved`, rejects any change when the current status is `closed`,
stamps `resolved_at` / `closed_at`, and appends a history row.

### Touched repositories

- `customer-profile.repository.ts` — list query gains `activeTicketCount` and a
  `hasActiveTickets` boolean filter.
- `project.repository.ts` — the same two additions.

---

## Phase 3 — Web

### Routes and rail menu

`ROUTES.SERVICE` becomes `{ HOME: '/service', DETAIL: '/service/[id]' }`. The
nav section is retitled **Service** with a single **All Tickets** item pointing
at `/service`. The old "Open" nav item is dropped — status filtering is a chip
on the screen, not a second route.

### New screens

`app/(dashboard)/service/page.tsx` and `app/(dashboard)/service/[id]/page.tsx`,
thin wrappers per the existing convention.

**`/service`** — a stat-tile row (Open, In Progress, Resolved, Closed, Urgent)
styled off `customer-kpi-cards`. Tile counts are global and do not change as the
table below is filtered. Clicking one of the four status tiles sets the status
filter; clicking Urgent sets the *priority* filter to `urgent` and clears the
status filter, since urgency is a priority and not a status.
Below the tiles a `CrmTable` with columns: ticket number, title, customer, project,
priority chip, status chip, assignee avatar, created date. The toolbar carries
status quick-filter chips with counts, plus popover filters for priority,
assignee, and date range.

**`/service/[id]`** — header with ticket number, title, status and priority
chips; the detail block; photo gallery; a status-change action; and the status
history timeline.

### New feature directory

`apps/web/components/features/service-tickets/`

Two components carry the cross-surface work:

- **`entity-service-tickets-tab.tsx`** — one component, props
  `{ scope: 'customer' | 'property' | 'project', id }`. Renders that entity's
  ticket list, its empty state, and a **New Ticket** button that opens the form
  with the known context prefilled. All three detail tabs render this component;
  there is no per-entity copy.
- **`active-tickets-chip.tsx`** — `<ActiveTicketsChip count={n} />`, warning
  tone, returns `null` at zero. Used by both list screens so they cannot drift
  apart visually.

Also: `service-tickets-page.tsx`, `service-ticket-stat-tiles.tsx`,
`service-ticket-detail-page.tsx`, `service-ticket-form-dialog.tsx`,
`service-ticket-status-dialog.tsx`, `service-ticket-photos.tsx` (presigned S3
upload via the existing storage service, max 5, thumbnail grid),
`hooks/use-service-tickets.ts`, `constants.ts` (status and priority label and
tone maps), `schemas/` (zod form schema).

### Form fields

Title\* · Description\* · Customer\* (search select) · Project\* (search select,
scoped to the chosen customer, disabled until a customer is picked) · Priority\*
(default Medium) · Assignee (existing employee selector) · Photos (optional).

### Existing files touched

| File | Change |
|---|---|
| `customers/components/customer-list-page.tsx` | `ActiveTicketsChip` on the row; "Has active tickets" quick-filter chip with count; `hasActiveTickets` wired through `toCustomerFilters` |
| `customers/components/customer-kpi-cards.tsx` | new tile "Customers with active tickets" — counts *customers*, not tickets; clicking applies the `hasActiveTickets` filter |
| `customers/customer-detail/customer-detail-page.tsx`, customers `constants.ts` | rebuild the `service` tab as `EntityServiceTicketsTab scope="customer"` |
| `properties/property-detail/property-detail-page.tsx`, properties `constants.ts` | new Service Tickets tab, scope `property` |
| `projects/components/project-detail/project-detail-tabs.tsx`, projects `constants.ts` | add `{ value: 'service', label: 'Service Tickets' }` to `PROJECT_DETAIL_TABS` |
| `projects/components/project-list-page.tsx` | same chip and same "Has active tickets" quick filter |
| `lib/config/routes.ts` | SERVICE routes |
| `lib/config/navigation.ts` | Service rail section |

The tab is labelled **Service Tickets** on all three detail screens.

---

## Error handling

- Creating a ticket whose project does not belong to the selected customer → 400.
- Editing or transitioning a `closed` ticket → 409. The UI disables those
  controls rather than letting the call fail.
- Photo upload failures are per-file and non-blocking; the ticket saves without
  the failed file and the user is told which one did not upload.
- Every tab and list has a real empty state — "No service tickets for this
  customer / property / project."

## Verification

No unit tests. Each phase closes by exercising the actual screens:

- Create a ticket from `/service`, and from each of the three detail tabs, and
  confirm the context prefills correctly.
- Move a ticket through open → in_progress → resolved → closed and confirm the
  timeline records each hop with the right actor, and that a closed ticket's
  edit and transition controls are disabled.
- Confirm the chip appears on the customers list and the projects list for a
  customer/project with an active ticket, and disappears when the last active
  ticket is resolved.
- Confirm both "Has active tickets" filters return exactly the rows carrying a
  chip.
- Confirm the "Customers with active tickets" KPI tile count matches the number
  of customer rows returned once its filter is applied.
- Upload, view, and remove photos on an open ticket.

A correct database row that nothing renders is not a pass.

## Out of scope

- AMC contracts, maintenance scheduling, and recurring maintenance tasks.
- Comment threads on tickets.
- Customer-facing ticket submission from the consumer mobile app.
- SLA timers, escalation rules, and notifications.
- Chargeable tickets, cost tracking, and customer satisfaction ratings.
