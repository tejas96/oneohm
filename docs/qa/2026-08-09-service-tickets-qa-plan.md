# Service Tickets — End-to-End QA Plan

**Feature branch:** `feat/service-tickets` (15 commits)
**Date:** 2026-08-09
**Scope:** the service ticket module and every surface it touches.

Each case carries a status:

- **[VERIFIED]** — executed during the build against the prod-synced local DB; result recorded.
- **[TO RUN]** — not yet executed; needs a human pass.

---

## Environment — already set up, nothing to do

Migrations are applied, both servers are running on their normal ports
(`:8085` API, `:3001` web, per `apps/web/.env.local`), and the fixtures below
are seeded. **Start at section 1.**

### Seeded fixtures

Referenced by ticket number and name throughout the plan.

| Customer | Active | Covers |
|---|---|---|
| **Vjay Chipade** | 2 | **Two properties, each with its own project and one ticket** — the property-derivation cases. `TKT-…-0009` on property *Sangli / PRJ-…-0122*, `TKT-…-0010` on property *Sangli / PRJ-…-0138* |
| **Hanmant Kharade** | 3 | Plural chip wording; a project (`PRJ-…-0221`) carrying multiple tickets |
| **Dudheshwar Hingalje** | 1 | Singular chip wording; pre-assigned; **urgent** priority; use for "resolve the last active ticket" |
| **QA-0809 Test Customer** | 0 | Closed tickets only (`0001`, `0007`) — one carries a photo |
| **QA-0808 Test Customer** / **Pandurang Naikwadi** | 0 | Resolved tickets only |
| ~1,180 others | 0 | Empty states and the negative filter |

Every status is represented: **open 5, in progress 1, resolved 2, closed 2**,
with 1 urgent. One ticket is soft-deleted (`TKT-…-0002`) for the delete cases.

> **Migration numbering.** These are `1854…`, not `1853…` — an unmerged branch
> (commit `52ba0a30`) already uses `1853000000000` for
> `AddFollowupOutcomeAndLostTracking`. If that branch merges, check no third
> migration collides.

---

## 1. Happy path — the full lifecycle

**HP-1 Create from the Service screen** — [VERIFIED]
Rail → Service → All Tickets → **New Ticket**. Fill title, description, pick a
customer, pick its project, leave priority at Medium, submit.
*Expect:* toast naming a `TKT-ONEOHM_EPC-<year>-NNNN` number, dialog closes,
ticket at the top of the table, **Open** tile increments by one.

**HP-2 Ticket number sequence** — [VERIFIED]
Create a second ticket.
*Expect:* the number increments by exactly one.

**HP-3 Open the detail screen** — [VERIFIED]
Click the ticket number.
*Expect:* title, number, status and priority pills, Issue card, Details
(customer / project / property / assignee / raised by / raised on, all three
entity names linking correctly), and a **Status history** showing `Created`.

**HP-4 Assign** — [VERIFIED at API; UI TO RUN]
Edit → pick an assignee → save. `TKT-…-0011` is already assigned if you want a
starting point.
*Expect:* assignee shows on the detail screen, in the list's Assignee column,
and in the entity tabs. `assigned_at` is stamped, and the `assigneeId` filter
returns the ticket — both confirmed at the API.

**HP-5 Open → In Progress** — [VERIFIED]
Change Status → In Progress, add a note.
*Expect:* pill updates, a timeline entry `Open → In Progress` with your name,
date and note. The list's In Progress tile increments and Open decrements.

**HP-6 In Progress → Resolved** — [VERIFIED]
Change Status → Resolved with a resolution note.
*Expect:* pill turns green, a **Resolution** card appears with the note,
`resolved_at` set, timeline entry added.

**HP-7 Resolved → Closed** — [VERIFIED]
Change Status → Closed.
*Expect:* the finality warning shows before you confirm; afterwards the pill is
neutral, `closed_at` set, and **Edit** and **Change Status** are both disabled
with the tooltip "Closed tickets cannot be modified."

**HP-8 Photos** — [VERIFIED via API + UI]
Attach up to five photos on create; open Edit and confirm the thumbnail grid,
the × remove control and the `(n/5)` counter. Click a photo on the detail
screen.
*Expect:* opens the full image in a new tab. Uploads land under
`service/issue-photo/…` in storage.

**HP-9 The three entity tabs** — [VERIFIED]
Open the **Service Tickets** tab on the customer, the property and the project.
*Expect:* each lists the right tickets; row click opens the ticket; the header
count matches the rows.

**HP-10 Context-prefilled create** — [VERIFIED]
**New Ticket** from each tab.
*Expect:* customer tab hides the customer field; project tab hides **both**
customer and project; property tab hides customer and (when the property has a
project) the project too. Creating updates the tab count with no reload.

---

## 2. Negative cases — the API must refuse these

All [VERIFIED] unless noted.

| # | Case | Expected |
|---|---|---|
| N-1 | Create with a project belonging to a **different customer** | **400** "The selected project does not belong to the selected customer." |
| N-2 | Resolve **without** a resolution note | **400** — and the UI blocks it before the request |
| N-3 | Any status change on a **closed** ticket | **409** |
| N-4 | Edit any field on a **closed** ticket | **409** |
| N-5 | Create with **no title** | 400 |
| N-6 | Create with an invalid `priority` | 400 |
| N-7 | Create with `status` in the body | 400 — status is not settable at creation |
| N-8 | Create with **six** photos | 400 |
| N-9 | Filter with an invalid `status` value | 400 |
| N-10 | `limit=500` (max 100) | 400 |
| N-11 | Malformed uuid in the path | 400 |
| N-12 | Unknown ticket id | 404 |
| N-13 | Soft-deleted ticket fetched by id | 404 |
| N-14 | Assign a **non-existent employee** | **404** (was a 500 — fixed on this branch) |
| N-15 | No auth token | 401 |
| N-16 | Delete a customer who has tickets | Blocked: "Cannot delete: customer has service tickets" |

**N-17 Expired session mid-form** — [TO RUN]
Open the New Ticket dialog, let the token expire (or clear the `accessToken`
cookie), submit.
*Expect:* a clear error and the typed values preserved — the dialog must not
close and discard the work.

**N-18 Backend down** — [TO RUN]
Stop the API, then submit the form.
*Expect:* an error toast, dialog stays open, no white screen.

---

## 3. Edge cases

### 3.1 Numbering and soft delete

**E-1 Deleted numbers are never reused** — [VERIFIED]
Create tickets, delete the most recent, create another.
*Expect:* the sequence continues past the deleted number (…0002 deleted → next
is 0003, never 0002 again).

**E-2 Soft-deleted tickets vanish everywhere** — [VERIFIED for list/detail]
Delete a ticket, then check: the Service list, the stat tiles, all three entity
tabs, the customers chip/count, the projects chip/count. — tabs and chips
are [TO RUN].

**E-3 Year rollover** — [TO RUN]
The number embeds the year (`TKT-ONEOHM_EPC-2026-0001`). On 1 January the
sequence restarts at 0001 for the new year. Worth a note rather than a test:
confirm the prefix scan is year-scoped so a new year does not collide.

### 3.2 Counts and pluralisation

**E-4 Singular vs plural chip** — [VERIFIED]
**Dudheshwar Hingalje** (1) → "1 active ticket". **Vjay Chipade** (2) → "2
active tickets". **Hanmant Kharade** (3) → "3 active tickets".

**E-5 Zero renders nothing** — [VERIFIED]
A customer or project with no active tickets shows **no chip at all**, not a
"0" chip.

**E-6 Resolved and closed do not count as active** — [VERIFIED]
Resolve **Dudheshwar Hingalje**'s only ticket (`TKT-…-0011`).
*Expect:* chip disappears, KPI tile decrements 3 → 2, the customer leaves the
"Has active tickets" filter. Same for closing. Verified previously on another
customer with the counts moving in lockstep.

**E-7 Counts are per-entity, not global** — [VERIFIED]
A customer with 2 tickets on one project shows "2 active tickets" on both the
customer row and that project row.

### 3.3 Filters — the partition property

This is the highest-value check: the chip and the filter must never disagree.

**E-8 Customers partition** — [VERIFIED]
`hasActiveTickets=true` count + `hasActiveTickets=false` count == total
customers. Measured **3 + 1185 = 1188** with the seeded fixtures.

**E-9 Projects partition** — [VERIFIED]
Measured **4 + 220 = 224** with the seeded fixtures.

**E-10 No violations in either direction** — [VERIFIED]
Every row in the `true` set has `activeTicketCount > 0`; every row in the
`false` set has exactly `0`.

**E-11 Filter survives pagination and sort** — [TO RUN]
Apply the ticket filter, then page forward and change sort.
*Expect:* the filter stays applied and the result set stays correct.

**E-12 Filter combines with other filters** — [TO RUN]
Combine "Has active tickets" with a status chip, a city filter and a search
term.
*Expect:* an AND of all of them; the count reflects the intersection.

**E-13 Multi-value status filter** — [VERIFIED]
Both `?status=open,in_progress` and `?status=open&status=closed` work.

**E-14 Urgent tile is a priority, not a status** — [VERIFIED]
Click Urgent.
*Expect:* the status filter clears, priority becomes `urgent`, the status chips
return to "All". Clicking it again clears it.

**E-15 Tile and chip stay in sync** — [VERIFIED]
Click the Open tile → the Open chip shows `aria-pressed="true"`. Click the Open
chip → the Open tile shows selected.

### 3.4 Property derivation

**E-16 Property tab excludes other properties** — [VERIFIED]
Use **Vjay Chipade**, who owns two properties each with its own project and one
ticket.
*Expect:* the customer tab shows **both** (2); each property tab shows **only
its own** (1) — property *PRJ-…-0122* shows `TKT-…-0009`, property *PRJ-…-0138*
shows `TKT-…-0010`. This is the derived `project.property_id` join; if a
property tab showed both, the derivation would be broken. Confirmed at both the
API and the rendered tab.

**E-17 Creating from a property tab stays on that property** — [TO RUN]
**New Ticket** from Vjay Chipade's *PRJ-…-0122* property tab.
*Expect:* the project is locked to that property's project (no project field
shown), so the ticket cannot land on the other property and vanish from the tab
you created it in.

### 3.5 Form behaviour

**E-18 Project select is gated on customer** — [VERIFIED]
*Expect:* disabled with "Choose a customer first" until a customer is chosen.

**E-19 Project options are scoped to the customer** — [VERIFIED]
*Expect:* only that customer's projects (verified: 1 of 224 shown).

**E-20 Changing customer clears the project** — [VERIFIED]

**E-21 Customer with no projects** — [TO RUN]
Pick a customer who has none.
*Expect:* the project select enables but is empty, with a sensible empty
message — and submit is blocked because project is required. **Confirm this
does not look like a broken screen.**

**E-22 Customer search needs 2+ characters** — [TO RUN]
Type one character.
*Expect:* the default (unsearched) list, no error.

**E-23 Long values** — [TO RUN]
A 255-character title (the max) and a very long multi-paragraph description.
*Expect:* saved intact; the list truncates with ellipsis rather than breaking
the grid; the detail screen preserves line breaks.

**E-24 Title over 255 characters** — [TO RUN]
*Expect:* client-side validation message, no request sent.

**E-25 Whitespace-only title or description** — [TO RUN]
*Expect:* rejected — the form trims before validating.

**E-26 Unicode / emoji in title and note** — [TO RUN]
*Expect:* stored and rendered correctly (Devanagari and emoji are realistic here).

**E-27 Edit does not offer customer or project** — [VERIFIED]
*Expect:* both hidden in edit mode; they are immutable after creation.

### 3.6 Photos

**E-28 Sixth photo is refused client-side** — [TO RUN]
Select six files at once.
*Expect:* five accepted, a toast explaining the rest were skipped, counter
reads 5/5, the Add tile disappears.

**E-29 One failed upload does not lose the others** — [TO RUN]
Select several files where one will fail (e.g. a non-image renamed `.jpg`, or
kill the network mid-upload).
*Expect:* a per-file error toast naming the file; the successful ones remain
attached.

**E-30 Non-image rejected** — [TO RUN]
*Expect:* the picker filters to `image/*`; a PDF forced through is rejected by
the storage service (category `service` allows images only).

**E-31 Oversized file** — [TO RUN]
A file above 10MB.
*Expect:* rejected with a clear message.

**E-32 Remove a photo, then save** — [TO RUN]
*Expect:* removal persists after reload.

**E-33 Photos on a closed ticket** — [TO RUN]
*Expect:* not editable (Edit is disabled), but still viewable on the detail screen.

### 3.7 Status history

**E-34 Every hop is recorded with actor and time** — [VERIFIED]
*Expect:* newest-first, `Created` last, notes shown where given.

**E-35 Re-selecting the current status is a no-op** — [TO RUN]
The API returns the ticket unchanged and adds **no** history row. The dialog
does not offer the current status, so this needs an API call to reach.

**E-36 Backwards transitions are allowed** — [VERIFIED]
`resolved → in_progress` works and is recorded.

**E-37 Resolution note is preserved after reopening** — [TO RUN]
Resolve with a note, reopen to In Progress, resolve again with a different note.
*Expect:* the Resolution card shows the **latest** note; both appear in the
timeline.

### 3.8 Concurrency

**E-38 Two people closing at once** — [TO RUN]
Open the same ticket in two tabs, close it in one, then act in the other.
*Expect:* the second gets a 409 with a clear message, not a silent failure or a
500.

**E-39 Simultaneous creates** — [TO RUN]
Fire several creates at once (`for i in 1 2 3 4 5; do curl … & done`).
*Expect:* five distinct sequential numbers, no unique-constraint 500. The
generator takes a pessimistic lock inside a transaction for exactly this.

### 3.9 Permissions and visibility

**E-40 Non-admin project scoping** — [TO RUN — important]
The projects list scopes to team membership for non-admins
(`effectiveMemberId`). Log in as a basic employee.
*Expect:* the Service list still shows tickets for projects they cannot see in
the projects list. **Decide whether that is intended.** There is no RBAC on
tickets by design, but confirm it matches your expectation.

**E-41 Every role can reach the Service rail item** — [TO RUN]
The nav entry has no role restriction. Confirm that is intended.

### 3.10 Empty and loading states

**E-42 No tickets at all** — [TO RUN]
The fixtures deliberately leave tickets in place, so reach this by filtering to
a status with no matches, or point at an empty database.
*Expect:* Service list shows "No service tickets yet.", all tiles read 0, no
crash.

**E-43 Entity tabs with no tickets** — [TO RUN]
*Expect:* the scope-specific wording — "No service tickets for this
customer / property / project."

**E-44 Loading states** — [TO RUN]
Throttle the network.
*Expect:* skeletons/spinners rather than flashes of empty content; the table
keeps rows while refetching.

### 3.11 Responsive

**E-45 Narrow viewport** — [TO RUN]
At 375px and 768px: the stat tiles reflow (2 / 3 / 5 columns), the ticket table
scrolls horizontally rather than crushing, the detail screen stacks the
timeline below the main column, and the dialogs remain usable.

---

## 4. Cross-screen consistency

**C-1 One create updates every surface** — [PARTIALLY VERIFIED]
Create a ticket, then without reloading check: Service tiles, the customer row
chip, the customers KPI tile, the project row chip, and all three entity tabs.
*Expect:* all update — mutations invalidate the `customers` and `projects`
caches for exactly this reason.

**C-2 Resolving the last active ticket** — [VERIFIED]
*Expect:* KPI tile, chip count and filtered row count all move together
(measured 2 → 1 in lockstep).

**C-3 The chip is visually identical on both lists** — [VERIFIED]
Same `ActiveTicketsChip` component. Compare side by side — any difference means
someone forked it.

**C-4 Service tickets appear in the customer Activity timeline** — [VERIFIED]
*Expect:* interleaved chronologically with quotes and receipts, tagged
"Service".

---

## 5. Regression — areas touched but not part of the feature

These were modified while building the feature and deserve a pass.

**R-1 `hasProperty` filter on the customers list** — [VERIFIED]
This had a **pre-existing bug**: `hasProperty=false` returned the same rows as
`true` (1097 for both). Fixed on this branch.
*Expect:* true + false now partitions the total — measured 1097 + 91 = 1188.
**Re-test the "no sites" view on the customers screen specifically.**

**R-2 Customer delete blockers** — [VERIFIED]
The old `hasServiceRequests` blocker was removed with the module and re-added as
`hasServiceTickets`.
*Expect:* deleting a customer still reports every other blocker (properties,
projects, quotes, payments, loans, subsidies, feedback) plus service tickets.

**R-3 Customer Overview tab** — [VERIFIED]
The "Open Service Tickets" card was removed and "Upcoming Follow-ups" made full
width.
*Expect:* the tab renders correctly with no gap where the card was.

**R-4 Customer Activity tab** — [VERIFIED]
*Expect:* follow-ups, quotes, receipts and service tickets all appear.

**R-5 Projects list** — [TO RUN]
The status/priority chip row now wraps.
*Expect:* no layout regression on rows **without** a ticket chip.

**R-6 Customers KPI row** — [VERIFIED]
Now five explicit columns instead of auto-fit.
*Expect:* no wrap at desktop widths; sensible reflow when the side panel opens
and at tablet/mobile.

**R-7 Rail navigation** — [VERIFIED]
*Expect:* "Service" (not "Service & AMC"), one item, **no AMC Contracts** entry;
`/service/amc` no longer exists.

**R-8 Project detail tab bar** — [TO RUN]
A tenth tab was added.
*Expect:* the tab strip scrolls or wraps correctly and no existing tab is
pushed off-screen unreachably.

**R-9 Nothing references the deleted module** — [VERIFIED]
```bash
grep -rn "service-maintenance\|ServiceRequest\|maintenance_tasks" apps/backend/src apps/web/app apps/web/components apps/web/lib libs/shared/src
```
*Expect:* no output (historical migration files aside).

---

## 6. Data integrity spot-checks

Run against the database directly.

**D-1 No orphaned tickets**
```sql
SELECT COUNT(*) FROM service_tickets t
LEFT JOIN customer_profiles c ON c.id = t.customer_id
LEFT JOIN projects p ON p.id = t.project_id
WHERE c.id IS NULL OR p.id IS NULL;
```
*Expect:* 0.

**D-2 Every ticket's project belongs to its customer**
```sql
SELECT t.ticket_number FROM service_tickets t
JOIN projects p ON p.id = t.project_id
JOIN customer_properties cp ON cp.id = p.property_id
WHERE cp.customer_id <> t.customer_id;
```
*Expect:* no rows. This is the invariant the API enforces.

**D-3 Every ticket has a creation history row**
```sql
SELECT t.ticket_number FROM service_tickets t
WHERE NOT EXISTS (
  SELECT 1 FROM service_ticket_status_history h
  WHERE h.ticket_id = t.id AND h.from_status IS NULL
);
```
*Expect:* no rows.

**D-4 Resolved tickets carry a resolution note**
```sql
SELECT ticket_number FROM service_tickets
WHERE status = 'resolved' AND (resolution_note IS NULL OR resolution_note = '');
```
*Expect:* no rows.

**D-5 Timestamps agree with status**
```sql
SELECT ticket_number, status, resolved_at, closed_at FROM service_tickets
WHERE (status = 'closed' AND closed_at IS NULL)
   OR (status IN ('open','in_progress') AND closed_at IS NOT NULL);
```
*Expect:* no rows.

**D-6 Ticket numbers are unique including soft-deleted**
```sql
SELECT ticket_number, COUNT(*) FROM service_tickets
GROUP BY ticket_number HAVING COUNT(*) > 1;
```
*Expect:* no rows.

**D-7 Partial indexes exist and are partial**
```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'service_tickets';
```
*Expect:* `idx_service_tickets_customer_active` and
`idx_service_tickets_project_active` each carry
`WHERE status IN ('open','in_progress') AND deleted_at IS NULL`. Without the
predicate the CRM filters degrade to sequential scans.

---

## 7. Performance

**P-1 Customers list with the ticket count** — [TO RUN]
The list gained a `loadRelationCountAndMap`. With 1188 customers, compare page
load before and after this branch.
*Expect:* no material regression. If there is one, the partial index is the
first thing to check (D-7).

**P-2 Service list at volume** — [TO RUN]
Seed a few thousand tickets and page through.
*Expect:* stable response times; sorting and filtering stay responsive.

---

## 8. Known limitations — by design, not defects

These were explicitly scoped out. They are listed so QA does not raise them as
bugs.

- **No RBAC on tickets.** Anyone who can sign in can see and edit any ticket.
- **No AMC contracts, maintenance schedules or recurring tasks.** The old
  module was removed and not replaced.
- **No comment threads.** The status history is the only discussion record.
- **No SLA timers, escalation or notifications.** Nothing chases an ageing
  ticket.
- **No customer-facing submission.** Tickets are raised by staff only; the
  consumer mobile app is untouched.
- **No chargeable tickets, cost tracking or satisfaction ratings.**
- **Customer and project are immutable after creation.** Fix a mistake by
  deleting and re-raising.
- **Closing is irreversible.** There is no reopen.
- **Property is derived, not stored.** A ticket has no property of its own; it
  follows its project.
