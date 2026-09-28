# Reseller Commissions and Partner Dashboard — Design

**Date:** 2026-09-28
**Branch:** `feat/reseller-commissions`
**Repos:** `oneohm` (backend, web, shared), `oneohm-mobile` (EPC app)
**Status:** approved for planning

## 1. What this is for

A reseller (partner) sends us customers. When a deal is won, he earns a commission.
Today the `employee_commissions` table exists, but nothing fills it and nothing shows it.

We build three things:

1. **The money.** A commission row is made when a quote is accepted. Admin approves it. It is
   paid through the existing finance approval queue.
2. **The partner app.** A reseller logs in to the EPC mobile app. He uses the app the same way
   staff do, but he sees projects in read-only mode. He also gets his own dashboard.
3. **The admin view.** Superadmin and admin see every partner, his performance and his money on
   the web.

We ship in two steps. Step 1 is backend + web. Step 2 is mobile. A partner never sees a number
that we have not first checked on the web.

## 2. Decisions (locked)

| # | Topic | Decision |
|---|---|---|
| D1 | Who uses the phone screens | The reseller himself. He sees only his own data. |
| D2 | When a commission is born | When the quote is **accepted**. One row per quote. |
| D3 | Commission base | `discountedBasePrice` = base price minus discount, **before GST**. Subsidy is never used anywhere. |
| D4 | Discount | A discount makes the commission smaller. |
| D5 | Paying | Paying writes an expense (category `commission`) on the project. |
| D6 | Sign-off on money out | The payout goes through the existing approval queue (`pending_ledger_entries`, new kind `commission`). |
| D7 | Deal dies after we paid | Flag and chase. No automatic netting against later payouts. |
| D8 | Lead attribution | New column `customer_profiles.reseller_id`. |
| D9 | Release | Step 1: backend + web. Step 2: mobile. |
| D10 | Reseller app access | Same features as staff, but **projects are view-only**. |
| D11 | Cost and margin on quotes | Always **hidden** from resellers. The server strips them from responses. |
| D12 | Where the dashboard opens | A money card at the top of My Day opens the full dashboard. The orb does not change. |

### Defaults chosen in this spec (change before planning if wrong)

| # | Default |
|---|---|
| X1 | A reseller **cannot use the web app**. He sees a "Use the mobile app" page. |
| X2 | If a returning customer gets a second roof, the partner tag carries over. Staff can remove the partner on the **draft** quote. |
| X3 | The first partner to add a customer owns that customer. Only staff can change the owner, on the web, and must give a reason. |
| X4 | Money that a reseller pays back is recorded on the commission row only. No ledger entry in v1 (see §9). |
| X5 | Deals accepted before launch get no automatic commission. They appear under "Before launch" in the Fix strip. Admin creates or dismisses each one. |
| X6 | No push notifications in v1. The reseller sees changes when he opens the app. |
| X7 | TDS is not handled. The amount is the gross commission. |
| X8 | The reseller cannot see project documents in v1 (they hold customer KYC and bills). |
| X9 | On the quote screen, the reseller sees "Your commission at this price". |

## 3. Who sees what

| Area | Staff | Reseller |
|---|---|---|
| My Day sections | His own work | His own work (same code). Usually empty. |
| My Day money card | — | Yes, at the top. It shows even when "Nothing assigned" shows. |
| Partner dashboard | — | Yes |
| Leads: list and detail | As his role allows | **Only customers where `reseller_id` = him** |
| Add lead | Picks a partner or leaves it blank | Partner is set to himself. He cannot change it. |
| Follow-ups, site visits, surveys | As assigned | As assigned, **only on his own customers** |
| Quotes: build, send, discount | Yes | Yes, only for his own customers. Partner = himself. |
| Quote cost and margin | As today | **Never.** The server removes these fields. |
| Projects: list | As his role allows | **Only projects whose quote has `reseller_id` = him** |
| Project detail | As his role allows | **Read-only.** No tasks, phases, team or document changes. No documents list. |
| Customer payment status on the project | Yes | Yes (what the customer still owes. Not our costs.) |
| Service tickets | As assigned | As assigned, only on his own customers |
| Other partners' anything | Admin only | Never |
| Bank account number and Aadhaar | Admin only | Last 4 digits of his own only |
| Web app | Yes | No (X1) |

**Rule:** every "only his own" and every "never" in this table is enforced **on the server**.
Hiding a button in the app is not security.

## 4. Data model

One forward-only migration in `oneohm`. Never test its rollback on the shared database.

### 4.1 `customer_profiles`

| Column | Type | Notes |
|---|---|---|
| `reseller_id` | uuid null → `employee_profiles(id)` ON DELETE RESTRICT | Index on `(reseller_id)` where not deleted |

### 4.2 `employee_commissions`

| Change | Detail |
|---|---|
| add `quote_id` | uuid NOT NULL → `quotes(id)` RESTRICT. **Unique** (one commission per quote). The migration first counts existing rows. If any exist without a quote, it stops with a clear error. Do not guess a quote. |
| rename `project_value` → `base_amount` | decimal(15,2). Frozen at birth. |
| add `base_source` | varchar: `discounted_base` / `derived` / `manual` / `missing` |
| add `rate_source` | varchar: `profile` / `manual` / `missing` |
| add `payout_request_id` | uuid null → `pending_ledger_entries(id)`. This is the live payout in the queue. |
| add `payout_rejected_reason` | text null. The last rejection from the queue. |
| add `expense_entry_id` | uuid null. The expense record that the payout approval creates. |
| add `recovered_amount` | decimal(15,2) null. See §9. |
| add `cancel_reason` | text null |
| drop `project_id` | The project is found through `projects.quote_id = employee_commissions.quote_id`. Nothing to sync, so nothing can go stale. The cancellation service moves to this join. |
| FK `employee_id` | change ON DELETE CASCADE → **RESTRICT**. Commission history must never disappear. |
| checks | `commission_percentage BETWEEN 0 AND 100`; `base_amount >= 0`; `commission_amount >= 0` |

`invoice_*`, `payment_mode`, `payment_reference`, `paid_at`, `paid_by`, `approved_*`, `recovered_at`
and `recovery_notes` stay.

### 4.3 `employee_profiles`

Drop the dead counters: `total_leads_generated`, `total_projects_converted`,
`total_revenue_generated` and `total_commission_earned`. Nothing writes the first three. The
last one is increased by hand at `employee-commission.service.ts:195` and drifts. All four are
computed live from now on. Also remove them from `employee-response.dto.ts` and the repository.

### 4.4 Enums (shared package)

- `ExpenseCategory.COMMISSION = 'commission'`, with its label in `EXPENSE_CATEGORY_LABELS`.
- `PendingKind` gets `'commission'`, and so do the `IsIn` lists in the approvals DTOs.

## 5. The amount

```
base   = snapshot.pricing.discountedBasePrice
      ?? snapshot.pricing.basePrice − snapshot.pricing.discountAmount      (base_source 'derived')
rate   = reseller.commission_percentage at the moment of acceptance
amount = round_half_up(base × rate / 100, 2)
```

- `snapshot` is the `quote_snapshot` of the quote's **current version** at acceptance. A quote
  cannot be edited after acceptance (`quote.service.ts:476`).
- If the snapshot is missing, or `basePrice` is missing: `base_amount = 0`,
  `base_source = 'missing'`.
- If the reseller's rate is NULL: `rate = 0`, `rate_source = 'missing'`.
- If the rate is exactly 0 (a partner with no commission): the row is born `cancelled` with
  `cancel_reason = 'Rate is 0%'`. The quote is then "handled", so it does not show in the Fix strip.
- `base`, `rate` and `amount` are frozen at birth. A later change to the rate, a change order
  or a subsidy change never moves them.
- In the database the amount is rupees with 2 decimals. The expense is written in paise:
  `amount × 100`, which is exact.

## 6. Lifecycle

### 6.1 Stored status and displayed state

The database keeps the four existing statuses. The screens show a state that is **derived**
from them:

| Displayed state | Rule | Reseller sees |
|---|---|---|
| Pending | `status = pending` | Pending |
| Needs amount | `pending` and (`base_source = missing` or `rate_source = missing`) | Pending |
| Waiting for project | `approved`, and no project exists for the quote yet | Approved |
| Approved | `approved`, project exists, no `payout_request_id` | Approved |
| Payment in review | `approved` and `payout_request_id` set | Approved |
| Paid | `paid`, deal alive | Paid on {date} · {reference} |
| To recover | `paid`, deal dead (§9), `recovered_at` null | Cancelled — owed back ₹X |
| Recovered | `paid`, `recovered_at` set | Cancelled — settled |
| Cancelled | `cancelled` | Cancelled |

"Deal dead" means the project is cancelled, or the quote is voided with no live project.

### 6.2 Transitions

Every transition is a conditional `UPDATE … WHERE id = $1 AND status = $expected`. If 0 rows
change, the caller gets **409 "This commission changed. Reload."**. This handles two admins
clicking at the same time.

| From | Action | To | Who | Guard |
|---|---|---|---|---|
| — | Quote accepted | pending | System | Quote has `reseller_id`; no commission exists for this quote |
| — | Fix strip "Create" | pending | Admin | Same guards. Uses the same creator function. |
| pending | Edit base or rate | pending | Admin | Reason required. Sets `base_source` / `rate_source` = `manual`. Amount is recomputed. |
| approved (not in review) | Edit base or rate | **pending** | Admin | Same as above. The row must be approved again. |
| pending | Approve | approved | Admin | `amount > 0`, no `missing` source |
| pending, approved | Cancel | cancelled | Admin | Reason required. Blocked while a payout is in review. |
| approved | Record payment | approved + payout_request_id | Admin | Project exists; payout_request_id is null; date, method and reference given |
| approved (in review) | Queue: approve | paid | Finance head | Commission is still `approved` with the same payout_request_id |
| approved (in review) | Queue: reject | approved | Finance head | Clears payout_request_id; stores the reason |
| approved (in review) | Queue: cancel (by the recorder) | approved | Admin | Clears payout_request_id |
| paid | Close recovery | paid + recovered_at | Admin | Deal is dead (§9) |

There is no delete. There is no manual "set status" endpoint. The only way to reach `paid` is
through the queue.

### 6.3 Birth at acceptance

Hook: the `ACCEPTED` branch in `quote.service.ts` (next to `leadClosureService.closeProperty`).
It is best-effort, like the lead closure: the acceptance has already saved, so a failure must not
look as if the acceptance failed. A failure is logged. The **Fix strip** (§10.3) is the safety net
that catches it.

The unique index on `quote_id` makes the creator idempotent. A second call is a no-op.

## 7. The reseller access wall (backend)

The backend has no permission guards today. Only `JwtAuthGuard` checks the token. Web middleware
does the real checks. A reseller has a real token, so he could call any GET route and see every
customer (`customer.service.ts` findAll is org-wide unless the app passes `mine`) and every
commission. So:

### 7.1 One global guard, with a deny-by-default rule for resellers

- `ResellerScopeGuard` runs after `JwtAuthGuard` on every route.
- It resolves "is this user a reseller?" from `employee_profiles.profile_kind` for the token's
  user. It never uses anything the client sends. The result is cached per user for 60 seconds.
- If the user is a reseller, the route must carry `@ResellerAllowed()`. If it does not, the
  answer is **403**. New routes are closed to resellers until someone opens them on purpose.
- Staff and admins are not affected at all.

### 7.2 Routes opened to resellers, and how each one is scoped

| Route group | Scoping for a reseller |
|---|---|
| `auth/*`, `employees/me` | Himself only. Bank account number and Aadhaar are masked to the last 4 digits. |
| customers / leads list, detail, create, update | `reseller_id = me` is forced. On create, `reseller_id = me` is set and any sent value is ignored. |
| properties under his customers | Through the customer |
| follow-ups, site visits, surveys | Assigned to him **and** on his own customer |
| quote calculator, quotes create / view / send | Only his own customers. `reseller_id = me` is forced. **Redacted** (7.3). |
| projects list, project detail, project payments (read) | Project's quote has `reseller_id = me`. **GET only.** |
| service tickets | Assigned to him and on his own customer |
| `commissions/me`, `commissions/me/summary` | Himself |
| master data needed by these screens (product lists and so on) | Read only. Must not include cost or price-config tables. |

Everything else is 403. That covers project writes, documents, inventory, finance, admin, other
employees, `/commissions` (the admin routes) and quote configuration (margin tiers).

### 7.3 Redaction on quote data

For a reseller, remove these fields at every depth of every quote and calculator response:
`profitabilityAmount`, `profitabilityPercent`, and any tier `marginPercent`. This includes
`quote_snapshot.calculation`. Line prices, GST and totals stay, because the customer sees
them on the PDF.

### 7.4 Assignment rules

- A reseller can only be assigned a follow-up, visit, survey or ticket on his own customer. The
  server rejects anything else, with a clear message for the staff user who tried.
- A reseller cannot be added to a project team (server rejects).
- A partner picker only lists **active** resellers.

### 7.5 Existing `/commissions` routes

`employee-commission.controller.ts` today lets any logged-in user create, update, set status,
delete and list every commission. Replace it:

- Remove `POST /commissions`, `DELETE /commissions/:id` and `PATCH /commissions/:id/status`.
- Keep list and detail for users with `finance.view` (or the admin bypass).
- Add the actions from §6.2 as explicit routes, each checked in the service.

### 7.6 Permission codes (from the existing 42-code catalog, nothing new)

| Action | Code |
|---|---|
| See `/resellers` pages, list commissions | `finance.view` |
| Approve, edit, cancel, record payment, close recovery, Fix strip | `finance.payments.record` |
| Approve or reject the payout in the queue | `finance.approvals.process` (already used by the queue) |
| Tag or change a lead's partner (staff) | `customers.assign` |

`admin` and `super_admin` pass by bypass, as they do today. The backend checks these in the
service, reading the permissions in the JWT, in the same way that `canViewAllProjects` does.

## 8. Paying (the queue)

1. On `/resellers/[id]`, admin selects one or more **Approved** rows and clicks
   **Record payment**. He enters the date, method, reference (UTR) and an optional invoice number.
2. For each row, one `pending_ledger_entries` row is created: kind `commission`, the project of
   the quote, amount = −amount in paise (money out), and payee = the reseller. The commission's
   `payout_request_id` is set in the **same transaction**, with `WHERE payout_request_id IS NULL`.
3. The rows appear in `/finance/approvals` with the label "Commission · {reseller}". The existing
   bulk-approve works on them.
4. **Approve** does what an approved expense does today: it writes the ledger entry and the
   expense record (category `commission`, payee = reseller). Then it sets the commission to
   `paid`, `paid_at`, `paid_by`, `payment_mode`, `payment_reference` and `expense_entry_id`, all
   in one transaction. Before that, it re-checks that the commission is still `approved` with
   the same payout_request_id. If the check fails, the request is rejected with "Commission was
   cancelled".
5. **Reject** keeps the commission `approved`, clears payout_request_id and stores the reason.
   The web row shows the reason until the next payment is recorded.

One bank transfer for three deals gives three queue rows with the same UTR. That is correct,
because each expense sits on its own project.

## 9. When a deal dies

| When it dies | Commission was | Result |
|---|---|---|
| Project cancelled (`project-cancellation.service.ts`) | pending / approved | `cancelled`, cancel_reason "Project {no} cancelled". **Any live payout request is cancelled in the same transaction.** |
| Project cancelled | paid | Stays `paid` → shows **To recover** |
| Quote voided after acceptance, no project yet | pending / approved | `cancelled` ("Quote voided") |
| Quote voided after acceptance, no project yet | paid | Cannot happen. Paying needs a project. |
| Roof reopened and a new quote accepted | — | A new commission for the new quote. The old row keeps its own state. |

The cancellation service already cancels pending and approved rows. It moves from `project_id` to
the quote join. It also gains the payout-request cancel. Its advisory count
`unrecovered_commissions` becomes correct, because `recovered_at` is now written.

**Close recovery** (admin, `finance.payments.record`) asks for: amount received (₹0 up to the
amount paid), date, and a note. It sets `recovered_amount`, `recovered_at` and `recovery_notes`.
An amount below what was paid means the rest is written off. The note says so. ₹0 means all of
it is written off.

**Known limit (X4):** in v1, money returned by a reseller does not reach the ledger. The
commission expense stays on the cancelled project. A queue `reversal` is the wrong tool, because
it reverses the full entry as if it were a mistake. If the owner wants returned money in the
books, that is a follow-up.

## 10. Web (Step 1)

### 10.1 `/resellers` (route exists in `routes.ts`, but no page was ever built)

- Add the route to `lib/rbac/route-map.ts` with `finance.view`. Add a nav entry under People.
- Period chips: **This month · This FY · All time**. They filter the funnel and the revenue.
  The money columns are always "right now".
- Table: Partner (name, code, status) · Rate · Funnel `leads → quoted → won` + win rate ·
  Revenue · Pending ₹ · Owed ₹ · Paid ₹ · To recover ₹ · `⋮` (always visible).
- `⋮`: Open · Edit partner (the existing user form).
- An inactive or blocked partner stays in the list, greyed out, if any money is still open.
- Empty state: "No partners yet" with a link to add a user with Profile Type = Reseller.

### 10.2 `/resellers/[id]`

- Header: name, code, rate, status, bank shown as last 4 digits only, GSTIN.
- Tiles: Leads · Won X of Y (win rate) · Revenue · Owed now · Paid lifetime · To recover.
- Commission table: Deal (customer + quote no.) · Base · Rate · Amount · State (§6.1) ·
  source badges (`manual`, `missing`) · `⋮`.
- `⋮` per state: Pending → Approve · Edit · Cancel. Approved → Record payment · Cancel.
  Payment in review → Open in approvals. Paid → Open expense · Open project.
  To recover → Close recovery. At most 4 items.
- Multi-select on Approved rows → Record payment (§8).
- The last payout rejection reason shows under the row.

### 10.3 The Fix strip (on `/resellers`)

Shown only when the count is above 0: *"N accepted deals have no commission row. [Review]"*.

- "Missing" = quote `accepted`, not voided, `reseller_id` set, no commission row.
- Two groups: **Since launch** (accepted on or after env `COMMISSIONS_LIVE_FROM`, an IST date) and
  **Before launch** (X5).
- Each row: **Create** (runs the §6.3 creator) or **Dismiss** (creates the row as `cancelled`,
  cancel_reason "Dismissed: {note}", so the unique index still holds).

### 10.4 Lead and quote forms

- Lead form (web onboarding wizard and CRM): a **Partner** picker (active resellers only),
  optional. It sets `customers.reseller_id`.
- Changing the partner on an existing customer needs `customers.assign` and a reason (audited).
  It changes **draft** quotes of that customer to the new partner. Sent and accepted quotes do
  not change.
- A new quote copies `reseller_id` from the customer. Staff can clear it on a **draft** quote
  only (X2).
- Legacy: customers with `lead_source = 'reseller'` and no `reseller_id` are counted as
  "Partner unknown" on `/resellers`, with a link to fix them.

### 10.5 Existing screens that change

- `/finance/approvals`: new kind label, and it links to the partner page.
- Project → Money tab: the commission expense appears there by itself (category label
  "Commission").
- Admin users form: `profile_kind` is locked once the profile has a tagged customer or a
  commission. You cannot turn a reseller into staff and lose his history.
- Web login for a reseller → a "Use the OneOhm EPC app" page (X1). `/auth/me` already reports
  profile type `reseller`.

## 11. Mobile (Step 2)

The app knows the user is a reseller from `/auth/me` (profile type `reseller`). This only
decides what to **draw**. The server has already decided what he can **get**.

### 11.1 My Day

- A money card sits at the top: **YOU ARE OWED ₹X** (Approved, including payment in review),
  and under it "₹Y pending approval". Tap → the Partner Dashboard.
- The card renders **above** the "Nothing assigned" state (`MyDayScreen.tsx:218`) and above
  the "everything failed" state. A reseller will hit these states often.
- If the card fails to load, it shows its own retry. The rest of My Day is not affected.
- Staff: no change at all.

### 11.2 Partner Dashboard (new screen)

- Top: Owed · Pending · Paid lifetime · To recover (only if > 0).
- Period chips: This month · This FY · All time. Funnel: `leads → quoted → won`, win rate,
  revenue.
- Deal list. Each row shows the customer, `₹base × rate% = ₹amount`, the state in reseller
  words (§6.1) and the project stage if the project exists. Tap → the project (read-only), or
  the lead if there is no project yet.
- "Updated {time}" line. Pull to refresh. Cached data shows offline with the time.
- Empty state: "Add your first lead" → the Add lead flow.

### 11.3 Other screens

- **Add lead:** no partner field. The server sets it.
- **Quote price screen:** the Cost and margin reveal (`priceSections.tsx:271`) does not render.
  The server does not send the data anyway. A new line shows **"Your commission at this price:
  ₹X"**, computed from the discounted base and his rate (X9).
- **Project detail:** read-only mode. Task actions, phase sheet edits, team edits, add document,
  and the documents list (X8) are all hidden. Payments block and phase strip stay.
- **Profile:** his own rate and his bank last 4 digits become visible. The note in
  `profile/model/types.ts` is updated to say why this applies to his own record only.

## 12. Performance numbers (exact definitions)

All numbers are computed live. No stored counters.

| Number | Definition |
|---|---|
| Leads | `customer_profiles` rows with `reseller_id = R`, not deleted, `created_at` in the period |
| Quoted | Of those leads: **properties** with at least one non-draft quote with `reseller_id = R`. Counted per property, so re-quotes on the same roof count once. |
| Won | Of those: properties with an accepted, not-voided quote with `reseller_id = R` |
| Win rate | Won ÷ Quoted. Show "—" when Quoted = 0, never 0% or NaN. |
| Revenue | Sum of `base_amount` of commissions not `cancelled`, with the quote's `accepted_at` in the period |
| Pending ₹ | Sum of amount, displayed state Pending or Needs amount |
| Owed ₹ | Sum of amount, displayed state Waiting for project, Approved or Payment in review |
| Paid lifetime ₹ | Sum of amount where `status = paid` (this includes To recover and Recovered, because that money did leave) |
| To recover ₹ | Sum of `amount` in the To recover state |

The funnel uses the **lead's** date. The money uses the **acceptance** date. The screen says so
under the chips.

## 13. Edge cases

Each one has an owner section. If a case is missing from this list, the plan must add it
before building. (Table names: "customers" in this section means `customer_profiles`.)

**Birth**
1. The quote has no reseller → no commission.
2. The same quote is accepted twice (double tap or retry) → the unique `quote_id` makes the second a no-op.
3. The acceptance hook fails → the Fix strip "Since launch" shows it (§10.3).
4. The quote is from before launch → only via the Fix strip "Before launch" (X5).
5. Snapshot or base is missing → `base_source = missing`, ₹0, Approve blocked until Edit (§5).
6. The reseller's rate is NULL → `rate_source = missing`, same as 5.
7. The rate is 0% → born `cancelled` "Rate is 0%" (§5).
8. The discount equals the whole base → base 0, amount 0, Approve blocked. Admin cancels it.
9. The reseller is inactive or blocked when the quote is accepted → the row is still made (the deal was his). The owed money is still payable.
10. The reseller profile is soft-deleted → FK RESTRICT stops a hard delete. Existing rows stay.

**Changes after birth**
11. The rate is changed on the profile → old rows do not move. Only new deals use it.
12. A change order adds money to the contract → the commission does not move (frozen). If the
    owner wants more for the partner, admin uses Edit while pending, with a reason.
13. The subsidy changes → it was never used.
14. Two admins act on the same row at once → 409 on the second (§6.2).
15. Edit after approval → allowed only while no payout is in review, and it sends the row back to Pending (§6.2). Once paid, the amount never changes. A cancelled row can never be re-created, because the quote is already "handled".

**Paying**
16. Approved, but the project is not created yet → "Waiting for project". Record payment is hidden.
17. Record payment clicked twice → `payout_request_id IS NULL` guard; the second gets 409.
18. The finance head rejects → back to Approved, with the reason shown.
19. The project is cancelled while the payout is in review → the request is cancelled in the same
    transaction (§9). If the finance head clicks approve in the gap → the §8 step 4 re-check rejects it.
20. The finance head approves a payout for a commission that was cancelled → rejected by the re-check.
21. One transfer for many deals → many queue rows with the same UTR (§8).
22. Partial payment of one commission → not supported. One commission is paid in one payment.
23. A reseller with no bank details → Record payment still works (cash and cheque exist). The
    partner page shows "No bank details" in the header.

**Deal death**
24. The project is cancelled, commission unpaid → cancelled.
25. The project is cancelled, commission paid → To recover. Close recovery handles full, partial
    or write-off (§9).
26. The quote is voided before a project exists → cancelled.
27. The roof is reopened and re-quoted → a new, separate commission.
28. A lead is marked lost → no quote accepted, so no commission. The funnel counts it as a lead only.

**Attribution**
29. A reseller adds a customer whose phone already exists → the existing "already exists" message.
    No other details are shown. He cannot claim the customer (X3).
30. Staff moves a customer to another partner → reason required, audited. Draft quotes follow.
    Sent and accepted quotes and their commissions stay with the original partner.
31. A returning customer with a new roof → the tag carries over. Staff can clear it on the draft quote (X2).
32. Legacy leads with `lead_source = reseller` and no `reseller_id` → "Partner unknown" count (§10.4).
33. A lead added by staff with no partner, and later a partner is set → the draft quotes pick up
    the partner. An already-accepted quote does not (use the Fix strip if the owner agrees).

**Access and privacy**
34. A reseller calls any route not on the allowlist → 403 (§7.1).
35. A reseller asks for another customer's, project's or commission's id directly → 404 (not 403,
    so he cannot learn that the id exists).
36. A reseller tries to write to a project → 403, even if he were on the team (he cannot be, §7.4).
37. A reseller reads a quote → cost and margin are removed at every depth (§7.3).
38. **The discount cap can be probed.** The server rejects a discount above 50% of the margin
    (`quote.service.ts:985`). By trying discounts, someone can guess the margin. v1: every
    rejected discount attempt by a reseller is written to the audit log. A future option is a fixed
    reseller discount cap instead.
39. A reseller logs in to the web → "Use the mobile app" page (X1). The server wall still applies.
40. Profile kind switched between staff and reseller → locked once history exists (§10.5).
41. A cached reseller flag after a profile change → at most 60 seconds stale. The kind rarely
    changes and is locked once history exists.
42. The token belongs to a user with a customer role only → the existing web rule still applies.
    No change.

**Display**
43. A win rate with 0 quoted → "—".
44. A period with no data → zeros with a one-line explanation, not an empty table.
45. Dates are in IST. The period boundaries (month, FY April to March) are in IST.
46. Old app versions (before Step 2) used by a reseller → the server wall still protects the data.
    Screens that call blocked routes show their normal error state. Step 2 raises the EPC
    minimum and recommended versions.
47. The phone is offline → the dashboard shows cached data with "Updated {time}".

## 14. Out of scope (v1)

- Netting a recovery against the next payout (D7).
- Returned money written to the ledger (X4).
- TDS and GST invoicing (X7, locked).
- Push or WhatsApp notifications to the reseller (X6).
- Slab or tier rates, bonuses, and per-product rates. There is one rate per reseller, and it
  can be edited per row while pending.
- Uploading reseller invoice files. We only keep the invoice number and date.
- Enforcing `quotes.profitability` for **staff**. Today it is not enforced anywhere. This spec
  only hides margin from resellers.

## 15. Verification

No new unit test files. Verify by running each screen.

**Money cross-foot (before each release):**

| Check | Must be |
|---|---|
| `round(base × rate / 100, 2) = amount` on every row | 0 mismatches |
| Accepted, not-voided quotes with a reseller vs commission rows | equal, apart from the listed Fix-strip rows |
| Every `paid` row has an `expense_entry_id` that exists | 0 orphans |
| Sum of `commission` expenses = sum of paid amounts | equal |
| Rows with `missing` sources that are approved or paid | 0 |

**Web walk (Step 1), through the UI only:** add a lead with partner Ramesh → build and accept a
quote → the row appears (Pending, correct base × rate) → `/resellers` numbers are correct →
Approve → create the project → Record payment → the row appears in `/finance/approvals` →
approve it as the finance head → the project Money tab shows the Commission expense and the
profit drops by exactly that amount → cancel another paid project → To recover → Close
recovery (partial) → the numbers update. Then reject a payout, cancel during review, and try a
double click.

**Wall check (Step 1):** mint JWTs (see the local-verification note) for a reseller user. Call
at least one route from every blocked group and expect 403. Call another reseller's customer,
project and commission ids and expect 404. Read a quote and confirm there is no profitability
field anywhere in the JSON.

**Mobile walk (Step 2):** a debug build on Android against local 8085, logged in as a reseller:
My Day card (also in the Nothing-assigned state) → dashboard → deal → project read-only →
quote screen shows "Your commission" and no margin → add lead → it appears only for him.
Then log in as staff and confirm nothing changed.

**Care:** local uploads go to the production bucket (do not upload invoice files). Local WhatsApp
and SMS reach real phones (use the approved test customer, and "Mark as sent" for quotes).

## 16. Release

**Step 1:** shared package (enums) published from `oneohm` first → backend + web PR → deploy
→ set `COMMISSIONS_LIVE_FROM` on Fly **before** the deploy goes live → run the cross-foot.
**Step 2:** mobile PR → release → raise the EPC **min and recommended** versions (Fly secrets on
`oneohm-epc-backend`).
