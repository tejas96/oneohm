# Routine Maintenance — design

Date: 2026-09-17
Branch: `feat/routine-maintenance` in `oneohm` and `oneohm-mobile` (both cut from `main`; no worktree)

## Goal

After a project is completed, the system makes a checkup service ticket every
3 months, for 5 years (20 visits). The engineer fills a fixed inspection
checklist on mobile or web. The customer gets a WhatsApp message when the
checkup ticket opens and when it is done.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Scheduler | One new `@Cron` job in the NestJS backend (`@nestjs/schedule`, already set up). Not Next.js. No queue. |
| Link to project tasks | None. Checkups are service tickets. They do not touch tasks or project progress. |
| Storage | New columns on `service_tickets`. No new table. |
| Ticket creation | Lazy: the job makes only the next visit, 14 days before it is due. Never 20 tickets up front. |
| Existing completed projects | Included. They get their next future visit, never past ones. |
| WhatsApp recipient | Customer only. |
| Checklist | Fixed list in `libs/shared`. Not editable in Settings. |
| Where the checklist is filled | Web and mobile, shipped together. |
| Tests | No new unit tests. Verify on the real screens. |

## 1. Backend

### 1.1 Migration (`service_tickets`)

| Column | Type | Notes |
|---|---|---|
| `kind` | `varchar(20)` NOT NULL DEFAULT `'issue'` | `issue` or `maintenance`. All existing rows become `issue`. |
| `visit_number` | `smallint` NULL | 1–20. Set only when `kind = 'maintenance'`. |
| `checklist` | `jsonb` NULL | Answers and readings. Set only on maintenance tickets. |
| `customer_whatsapp` | `jsonb` NULL | `{ opened?: SendRecord, closed?: SendRecord }` |

- Unique partial index on `(project_id, visit_number) WHERE kind = 'maintenance'`.
  The same visit can never be made twice, even if two instances run the job.
- CHECK: `kind = 'maintenance'` ⇔ `visit_number IS NOT NULL`.
- The existing `due_date` column holds the visit due date. No new date column.
- `created_by` is already nullable. Job-made tickets leave it NULL.

`SendRecord` has the same shape as `project_tasks.customer_whatsapp`:
`status` (`sending` | `sent` | `delivered` | `read` | `failed` | `skipped`),
`providerMessageId`, `sentAt`, `phone`, `reason`.

### 1.2 Shared types (`libs/shared`)

- `ServiceTicketKind` enum: `ISSUE = 'issue'`, `MAINTENANCE = 'maintenance'`.
- `MAINTENANCE_CHECKLIST`: the fixed groups and items, each item with a stable
  `key` (for example `panels.cleaned`). Keys never change once shipped; labels may.
- `MAINTENANCE_READINGS`: `generationKwh`, `netMeterReading`.
- `MaintenanceChecklist` (stored answers):

```ts
interface MaintenanceChecklist {
  items: Record<string, { result: 'ok' | 'issue'; note?: string | null }>;
  readings: { generationKwh: number | null; netMeterReading: number | null };
}
```

- `isMaintenanceChecklistComplete(list)`: true when every item key in
  `MAINTENANCE_CHECKLIST` has a result and both readings are numbers.
  Backend, web and mobile all use this one function.

Release order: `oneohm` publishes the shared package first, then mobile
installs it (see the shared-package release rule).

### 1.3 The checklist

**Panels**
- `panels.cleaned` — Panels cleaned
- `panels.no_cracks` — No cracked or broken glass
- `panels.no_hotspots` — No burn marks, brown spots, or hot spots
- `panels.no_new_shade` — No new shade (trees, new buildings, water tank)
- `panels.no_birds` — No bird nests or droppings under panels

**Structure**
- `structure.no_rust` — No rust on mounting structure
- `structure.bolts_tight` — Bolts and clamps tight
- `structure.no_roof_leak` — No roof leak near the structure legs

**DC side**
- `dc.connectors` — MC4 connectors: no heat or burn marks
- `dc.cables` — DC cables: no cuts, no rat damage, tied properly
- `dc.dcdb` — DCDB fuses and surge protector OK

**Inverter**
- `inverter.no_errors` — No error code on display or app
- `inverter.vents_clean` — Vents and fan clean
- `inverter.monitoring_online` — Monitoring app is online

**AC side and safety**
- `ac.acdb` — ACDB MCB and surge protector OK
- `ac.earthing` — Earthing connections tight, no rust
- `ac.lightning_arrester` — Lightning arrester connected
- `ac.warning_stickers` — Warning stickers present

**Readings**
- `generationKwh` — Total generation (kWh)
- `netMeterReading` — Net meter reading

### 1.4 Visit schedule

- Visit *n* (1–20) is due on `project.end_date` + 3×*n* calendar months.
  If the day does not exist in that month, use the last day of the month
  (30 Nov + 3 months = 28/29 Feb).
- "Today" is the date in `Asia/Kolkata`.
- The next visit for a project is the smallest *n* whose due date is today or later.
- A ticket is made when that due date is within 14 days of today and no
  maintenance ticket exists for that project and *n*.
- The job keeps trying every hour for those 14 days, so a server outage does
  not lose a visit.
- A project done 13 months ago: visit 4 was due 1 month ago, so the next visit
  is 5. Visits 1–4 are never made.
- After visit 20, nothing more is made.

Eligible projects: `status = 'completed'` and `end_date IS NOT NULL` and
`end_date` + 60 months ≥ today. A project that leaves `completed` gets no new
visits; its existing tickets stay.

Ticket values: title `Routine checkup {n} of 20`, priority `medium`, status
`open`, `project_id` and `customer_id` from the project, `due_date` = visit due
date, no assignee, `checklist` = empty answers, `created_by` NULL. A normal
status-history row is written.

### 1.5 The job

New `MaintenanceTicketService` in `modules/service-tickets/services/`, with
constants in `modules/service-tickets/constants/maintenance.constants.ts`.

`@Cron('0 * * * *', { name: 'service-tickets:maintenance', timeZone: 'Asia/Kolkata' })`

Each run does 3 steps, in order. One step failing is logged and does not stop the next.

1. **Make tickets** (1.4). Insert with `ON CONFLICT DO NOTHING` on the unique index.
2. **Send "opened"** for maintenance tickets where `customer_whatsapp.opened` is
   empty and the ticket was created after `MAINTENANCE_WHATSAPP_SINCE`.
3. **Send "closed"** for maintenance tickets where `customer_whatsapp.closed` is
   empty, status is `resolved` or `closed`, and that happened after
   `MAINTENANCE_WHATSAPP_SINCE`. "Done" means the first of `resolved_at` or
   `closed_at`. The ticket is reopened and closed again → no second message.

Send rules — copied from `task-whatsapp.service.ts`:
- Sends happen only from 09:00 to 19:59 India time. Ticket creation still runs
  every hour. A message waiting overnight goes out at 9 am.
- Runs only when `NODE_ENV === 'production'` or `TASK_WHATSAPP_ALLOW_LOCAL === 'true'`
  (the local DB is a production copy with real phone numbers).
- Atomic claim: set the record to `sending` in one UPDATE … WHERE empty, so two
  instances cannot send the same message.
- Records stuck in `sending` for 10 minutes become `failed`. Never retried.
- Skip (record `skipped` + reason) if: project cancelled, invalid phone, or the
  event is older than 48 hours.
- Failure → `failed` + provider error text. Never retried.
- Delivery updates: extend `whatsapp-status.listener.ts` to also match
  `service_tickets.customer_whatsapp` by `providerMessageId`.

`MAINTENANCE_WHATSAPP_SINCE` is an env var (ISO date-time). If it is not set,
steps 2 and 3 do nothing. It is set on Fly only after Meta approves both templates.

### 1.6 WhatsApp templates

`en`, UTILITY, `parameter_format: NAMED` (same as `project_step_update`).

- `maintenance_visit_opened` — `customer_name`, `project_name`, `due_date`.
  Text idea: "Hi {{customer_name}}, the routine solar checkup for {{project_name}}
  is due on {{due_date}}. Our team will call you to fix a time."
- `maintenance_visit_closed` — `customer_name`, `project_name`, `visit_date`.
  Text idea: "Hi {{customer_name}}, the routine solar checkup for {{project_name}}
  was done on {{visit_date}}. Thank you."

### 1.7 API

- `GET /service-tickets` and `GET /service-tickets/stats`: new optional `kind` query.
- `PATCH /service-tickets/:id/checklist`: body is a partial `MaintenanceChecklist`
  (merge by item key; readings replace). 400 if the ticket is not maintenance.
  Unknown item keys → 400.
- `POST /service-tickets`: always makes `kind = 'issue'`. `kind` is not in the DTO.
- `PATCH /service-tickets/:id/status` to `resolved` or `closed` on a maintenance
  ticket: 400 with a clear message listing what is missing if the checklist is
  not complete.
- `DELETE /service-tickets/:id` on a maintenance ticket: 400
  ("Checkup tickets cannot be deleted").
- The ticket response includes `kind`, `visitNumber`, `checklist`, `customerWhatsapp`.

## 2. Web (`apps/web`)

**Service dashboard** (`app/(dashboard)/service/page.tsx`,
`components/features/service-tickets/components/service-tickets-page.tsx`)
- Two tabs at the top: **Issues** and **Routine Maintenance**. The tab is kept in
  the URL state. Each tab is the same table filtered by `kind`. Stat tiles follow the tab.
- No extra columns. The title already says `Routine checkup 5 of 20`, and the
  table already has a **Due** column with the overdue style.
- **New ticket** is shown on the Issues tab only.
- Web has no delete button today, so only the server guard is needed.

**Ticket detail** (`service-ticket-detail-page.tsx`)
- New **Inspection checklist** card, maintenance tickets only.
- Each group: title, **All OK** button, items. Each item: **OK** / **Issue**.
  **Issue** shows a note box. Two number fields for the readings.
- Every change saves at once through `PATCH …/checklist`.
- Header line: `14 of 20 done` (18 items + 2 readings).
- WhatsApp line: opened / closed status and reason, same look as the task drawer.
- Status dialog: the server's "not complete" message is shown as it comes.

**Project page**: the existing service tickets tab lists checkups with no change
beyond the visit label.

## 3. Mobile (`oneohm-mobile`)

- List (`features/serviceTickets/list`): maintenance rows show a plain
  `Checkup` badge (the title already carries the visit number). The filter sheet gets **Type** (All / Issues / Checkups).
- Detail (`features/serviceTickets/detail`): the same checklist card as web,
  with large tap targets, **All OK** per group, OK/Issue per item, note on
  Issue, number inputs for readings. Each change saves at once.
- Status sheet: the server's "not complete" message is shown.
- After release: raise the EPC app min and recommended version on Fly
  (`oneohm-epc-backend`), so engineers update.

## 4. Rollout

1. Merge backend (`oneohm`), publish shared package.
2. Merge mobile, release Android, raise min + recommended version.
3. Submit both WhatsApp templates to Meta.
4. Tickets start being made at once. No WhatsApp goes out yet.
5. When Meta approves both, set `MAINTENANCE_WHATSAPP_SINCE` on Fly to that moment.

First run: only projects whose next visit is within 14 days get a ticket
(roughly 1 in 6 eligible projects).

Before launch, count completed projects with `end_date IS NULL` and report it.
Those projects get no checkups until an end date is set.

## 5. Verification

- Local WhatsApp stays off unless `TASK_WHATSAPP_ALLOW_LOCAL=true`; remove it after testing.
- Test project A: set end date to about 3 months ago on the project edit screen.
  Run the job. Visit 1 shows on the web Routine Maintenance tab and in the mobile list.
- Test project B: end date 13 months ago → visit 5, not visit 1.
- Run the job twice → still one ticket per visit.
- Fill the checklist on mobile → the same answers show on web.
- Try to resolve with one item empty → the message lists it, on web and mobile.
- Try to delete a checkup ticket → blocked.
- Issues tab and **New ticket** still work as before.
- After Meta approval: one real opened and one real closed message to a test phone.
- `nx typecheck`, `nx lint`, knip, existing tests pass in both repos.
- Put local test data back afterwards.

## 6. Not in scope

- Customer opt-out or AMC contracts.
- A reminder message before the visit day.
- Checkups in the consumer app.
- A checklist editable in Settings.
- Photos per checklist item (the ticket's existing photos still work).
