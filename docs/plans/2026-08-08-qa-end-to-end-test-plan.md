# OneOhm — End-to-End QA Test Plan

**Purpose:** Validate the full customer-to-report lifecycle after the organization / multi-tenancy removal, before merging `refactor/remove-organizations` into `main`.

**Audience:** An autonomous agent (Antigravity) driving the web UI and reading the database.

**Deliverable:** A single markdown report, written to `docs/qa/2026-08-08-qa-run-report.md`, using the template in §9. That report is fed back to the developer, who will fix anything it finds. **Write the report even if you abort early.**

---

## 0. Ground rules — read before anything else

### 0.1 The database is READ-ONLY. This is not negotiable.

You may read the database freely to verify what the UI claims. You must **never** write to it. Do not INSERT, UPDATE, DELETE, TRUNCATE, ALTER, DROP, or run migrations or seeds.

Use this exact command shape for every query. The `PGOPTIONS` flag makes the session read-only at the server, so a stray write fails instead of corrupting data:

```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres \
  psql -U root -d oneohm_epc -tAc "SELECT count(*) FROM projects;"
```

Confirm the guard is active before you start — this **must** error:

```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres \
  psql -U root -d oneohm_epc -tAc "UPDATE projects SET name = name WHERE false;"
# expected: ERROR: cannot execute UPDATE in a read-only transaction
```

If that command does **not** error, stop and report it as a BLOCKER. Do not proceed.

All data changes must happen **through the web UI**, never through SQL. The point of the run is to prove the app writes correctly.

### 0.2 This database contains real production-shaped data

221 projects, 1,485 quotes, 1,183 customers, ₹1.84 crore of ledger history. Everything you create is additive and clearly marked (§0.4). **Never edit or delete pre-existing records.** If a step seems to require modifying existing data, skip it and note it in the report.

### 0.3 The ledger is append-only

Payments and expenses cannot be deleted, only reversed by posting a reversing entry. This is deliberate. Do not try to clean up money records — leave your test entries in place and list them in §9.5 so the developer can see them.

### 0.4 Tag everything you create

Every record you create must be identifiable. Use the marker `QA-0808` in a name, reference, or notes field wherever the form allows one.

Suggested test identity (adjust if a collision occurs, and note the change):

| Field | Value |
|---|---|
| Customer name | `QA-0808 Test Customer` |
| Phone | `+919000000808` |
| Email | `qa0808@example.com` |
| Site / property name | `QA-0808 Test Site` |

Before creating, check the phone and email are unused:

```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT count(*) FROM customer_profiles WHERE phone = '+919000000808' OR lower(email) = 'qa0808@example.com';"
# expected: 0
```

---

## 1. Environment

| Thing | Value |
|---|---|
| Web UI | http://localhost:3001 |
| Backend API | http://localhost:8085/api/v1 |
| Database | Docker container `oneohm-postgres`, database `oneohm_epc`, user `root` |
| Branch under test | `refactor/remove-organizations` |

**Login:**

| | |
|---|---|
| Email | `sanjay.oneohm@gmail.com` |
| Password | `test@123` |

This account holds `super_admin`, so no permission should ever block you. **If you hit a permission error, that is a bug — record it, do not work around it.**

### 1.1 Pre-flight

Run these before test execution and record the results in §9.1.

1. Web responds: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/` → expect `200` or `307`
2. API responds: `curl -s -o /dev/null -w '%{http_code}' http://localhost:8085/api/v1/customers` → expect `401` (unauthenticated, so the API is alive)
3. Read-only guard active (§0.1)
4. **No organization remnants** — the whole point of the change under test:

```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT
   (SELECT count(*) FROM information_schema.columns WHERE column_name='organization_id' AND table_schema='public') AS org_columns,
   (SELECT count(*) FROM information_schema.tables  WHERE table_schema='public' AND table_name LIKE 'organization%') AS org_tables;"
# expected: 0|0
```

5. **Baseline money figures** — capture now, compare at the end:

```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT 'entries='||count(*)||' sum='||coalesce(sum(amount_paise),0) FROM ledger_entries;"
```

Record the exact numbers. Pre-existing projects' money must not move because of your test.

---

## 2. How to run each test

For every test case below:

1. **Do it through the UI.** Click, type, submit — as a user would.
2. **Confirm the UI shows the result.** A silent success is a failure. If a list should now contain your record, see it in the list. If a total should change, see the new total on screen.
3. **Then confirm the database agrees.** Run the verification query given.
4. **Record the outcome** — PASS / FAIL / BLOCKED — with a screenshot for any UI assertion and the query output for any DB assertion.

A step only passes when **all three** agree: the UI accepted it, the UI displays it, and the database matches.

> **Critical:** a correct database row that the UI does not render is a **FAIL**, not a pass. Report it as such. This has bitten this codebase before.

If a step blocks the rest of the flow, mark it BLOCKED, skip forward to the independent sections (§7 edge cases that don't depend on it), and say clearly in the report which coverage was lost.

---

## 3. Main flow — the happy path

Run these in order. Each depends on the one before.

### TC-01 — Login

1. Open http://localhost:3001
2. Log in with the credentials in §1.

**UI expectations:** lands on a dashboard/home; no console errors; user menu shows the logged-in user.

**Why this matters:** login previously depended on an `organizationId` that no longer exists. If the app loads but every list is empty, that is the classic symptom — check §3 TC-02 carefully.

---

### TC-02 — Customer list renders

1. Navigate to **Sales & CRM → All Customers** (`/customers`).

**UI expectations:** the table has rows and the KPI cards show non-zero counts.

**DB check:**
```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT count(*) FROM customer_profiles WHERE deleted_at IS NULL;"
```
The customer count on screen should match this number.

**FAIL if:** the table is empty or shows a spinner forever while the DB has rows. That means a query is still gated on something removed.

---

### TC-03 — Customer onboarding

1. Go to **onboarding** (`/onboarding/new`) — or the "Add customer" button on the customer list.
2. Create the customer from §0.4.
3. Complete every required field; let the wizard guide you.

**UI expectations:** wizard submits; you land on the new customer (or a success state); the customer appears in the list.

**DB check:**
```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT id, customer_code, first_name, last_name, phone, email, status
   FROM customer_profiles WHERE phone='+919000000808';"
```

**Assert specifically:** `customer_code` matches `CUST-ONEOHM_EPC-<year>-<4 digits>`.

> This prefix is a **high-risk area** in the change under test. Generated codes embed `ONEOHM_EPC`, and the generator finds the next number by scanning for that exact prefix. If the code is missing, malformed, or restarts at `0001` when other customers already have higher numbers, **report it as a CRITICAL bug** with the value you saw.

Record the customer id and code — later steps need them.

---

### TC-04 — Property / site creation

1. From the customer, add a property/site (the onboarding wizard may already cover this — if so, verify rather than re-create).
2. Give it the site name from §0.4. Fill address, consumer number, connection type, sanctioned load.

**UI expectations:** the site appears nested under the customer on the CRM list (expand the customer row).

**DB check:**
```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT p.id, p.property_code, p.property_name, p.status, p.customer_id
   FROM customer_properties p
   JOIN customer_profiles c ON c.id = p.customer_id
  WHERE c.phone='+919000000808';"
```

**Assert:** `property_code` matches `PROP-ONEOHM_EPC-<year>-<4 digits>`. Same CRITICAL rule as TC-03.

Record the property id.

---

### TC-05 — Quote creation

1. Go to **Quotations → New** (`/quotes/new`), or create a quote from the property.
2. Select the QA customer/site.
3. Build a quote: choose panel, inverter, structure; set system size (use **3 kW**); let pricing calculate.
4. Save the quote.

**UI expectations:** the calculator produces a non-zero total; subsidy (if shown) is display-only; the quote saves and appears in the quotes list.

**DB check:**
```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT q.id, q.quote_number, q.status, v.version_number, v.final_price
   FROM quotes q
   LEFT JOIN quote_versions v ON v.quote_id = q.id
   JOIN customer_properties p ON p.id = q.property_id
   JOIN customer_profiles c ON c.id = p.customer_id
  WHERE c.phone='+919000000808'
  ORDER BY v.version_number DESC;"
```

**Assert:**
- `quote_number` matches `QT-ONEOHM_EPC-<year>-<4 digits>` (CRITICAL rule as above)
- `final_price` equals the total shown in the UI
- exactly one version exists at this point

Record the quote id, number, and `final_price`.

---

### TC-06 — Quote acceptance

1. Open the quote and move it to accepted (the status control or an "Accept" action).

**UI expectations:** status visibly becomes accepted/approved; the change persists after a page refresh.

**DB check:**
```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT quote_number, status FROM quotes WHERE quote_number = '<QUOTE NUMBER FROM TC-05>';"
```

---

### TC-07 — Project creation from the quote

1. Convert the accepted quote into a project (a "Convert to project" action on the quote, or **Projects → New**).
2. Set a project manager and start date if asked.

**UI expectations:** you land on the new project's detail page; it shows the customer, site, and a contract value.

**DB check:**
```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT pr.id, pr.project_number, pr.status, pr.quote_id, pr.contract_quote_version_id
   FROM projects pr
   JOIN customer_properties p ON p.id = pr.property_id
   JOIN customer_profiles c ON c.id = p.customer_id
  WHERE c.phone='+919000000808';"
```

**Assert:** `project_number` matches `PRJ-ONEOHM_EPC-<year>-<4 digits>` (CRITICAL rule). `contract_quote_version_id` is **not null** — the project must be pinned to the quote version it was created from.

Record the project id — most remaining steps use it.

---

### TC-08 — Payment milestones generated

1. Open the project → **Finance** tab (the "Money" tab).

**UI expectations:** a payment schedule with milestones; the milestone percentages sum to the contract; Contract / Received / Outstanding cards are shown, with Received ₹0.00 initially.

**DB check:**
```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT display_order, name, stage, amount_paise, status
   FROM payment_milestones WHERE project_id = '<PROJECT ID>' ORDER BY display_order;"
```

**Assert — the money invariant:**
```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT contract_paise, quoted_paise, change_order_paise,
        (quoted_paise + change_order_paise = contract_paise) AS composition_holds
   FROM v_project_balance WHERE project_id = '<PROJECT ID>';"
```
`composition_holds` must be `t`. The sum of milestone `amount_paise` must equal `contract_paise` **exactly** — no rounding drift. Report any mismatch, however small, as CRITICAL.

---

### TC-09 — Record a partial payment

1. On the Finance tab, click **Record payment**.
2. Enter an amount **smaller than the first milestone** (e.g. ₹5,000), method `cash`, reference `QA-0808-PAY1`.

**UI expectations:** Received increases by exactly ₹5,000; Outstanding decreases by exactly ₹5,000; Contract is unchanged; the first milestone shows as partially paid; the entry appears in "Money in & out".

**DB check:**
```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT entry_no, entry_type, direction, amount_paise, payment_method, reference
   FROM ledger_entries WHERE project_id='<PROJECT ID>' ORDER BY created_at;"
```

**Assert:** `entry_no` matches `RCP-<FY>-<6 digits>` (e.g. `RCP-2026-27-000217`), `direction` is `in`, `amount_paise` is `500000`.

**Also assert the allocation landed on the right milestone:**
```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT m.display_order, m.name, a.amount_paise
   FROM ledger_allocations a JOIN payment_milestones m ON m.id = a.milestone_id
  WHERE a.project_id = '<PROJECT ID>' ORDER BY m.display_order;"
```
The money must land on the **earliest unpaid milestone first** (waterfall).

---

### TC-10 — Complete the payment

1. Record further payments until Outstanding reaches **₹0.00**. Use references `QA-0808-PAY2`, `PAY3`, …

**UI expectations:** Outstanding hits exactly ₹0.00; every milestone shows Paid; nothing goes negative.

**DB check:**
```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT contract_paise, received_paise, outstanding_paise, unallocated_paise
   FROM v_project_balance WHERE project_id = '<PROJECT ID>';"
```

**Assert:** `outstanding_paise = 0`, `received_paise = contract_paise`, `unallocated_paise = 0`.

---

### TC-11 — Add an expense

1. On the Finance tab, click **Record expense**.
2. Amount ₹2,000, pick a category, notes `QA-0808 expense`.

**UI expectations:** Spent increases by ₹2,000. **Contract, Received and Outstanding must NOT change.**

> This is a deliberate product rule: **an expense never changes what the customer owes.** If recording an expense moves Outstanding, that is a **CRITICAL** bug.

**DB check:**
```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT entry_no, direction, amount_paise, category
   FROM ledger_entries WHERE project_id='<PROJECT ID>' AND direction='out';"
```

**Assert:** `entry_no` matches `EXP-<FY>-<6 digits>`. Money out is stored **negative** — a positive `amount_paise` on an `out` entry is a bug.

Re-run the TC-10 balance query and confirm `outstanding_paise` is still `0`.

---

### TC-12 — Generate a receipt

1. In "Money in & out", use the **Receipt** action on one of your payment entries.
2. Let it generate and download/open the PDF.

**UI expectations:** a PDF renders showing entry number, amount, date, customer, site, and the milestone allocation breakdown.

**Assert the company block** — this changed in the work under test. The PDF must show:

| Field | Expected |
|---|---|
| Name | `OneOhm` |
| Email | `sanjay@oneohm.com` |
| Address | `Plot No.93, Vasantdada Industrial Estate, Sangli` + `Maharashtra 416416` |

It must **NOT** show `OneOhm Energy` or `info@oneohm.in` (the old hardcoded values), and must **NOT** print GSTIN or PAN (a receipt is not a tax invoice). Report any of those as a bug, and paste what you actually saw.

**DB check (if the receipt is filed against the project):**
```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT id, entity_type, file_name, document_type FROM documents
  WHERE entity_id = '<PROJECT ID>' ORDER BY created_at DESC LIMIT 5;"
```

---

### TC-13 — WCR report generation

1. Open the project → **Reports** tab.
2. Choose the **WCR** (Work Completion Report), report id `wcr`.
3. Fill any required fields, **Preview**, then **Save** it to the project.

**UI expectations:** preview renders with project, customer, site and equipment details populated from the project — not blank placeholders. Save succeeds and the report appears under the project's Documents.

**Assert:** the company details on the report match TC-12's expectations. Note any field that renders empty when the data clearly exists.

**DB check:**
```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT file_name, document_type, created_at FROM documents
  WHERE entity_id = '<PROJECT ID>' ORDER BY created_at DESC LIMIT 5;"
```

---

## 4. Cross-cutting checks

### TC-14 — Company-wide finance reflects the test

Go to **Finance** (`/finance`).

**Assert:** Received/Outstanding figures include your project's activity, and the ledger list contains your `QA-0808` entries. Switch the period selector (Today / This Month / This Quarter / This FY / This Year) — each must load without error and give plausible numbers.

### TC-15 — Receivables

Go to **Finance → Receivables**. It must load and paginate. Your project should **not** appear once fully paid (TC-10).

### TC-16 — Cross-check the code prefixes in one query

```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT 'customer', customer_code FROM customer_profiles WHERE phone='+919000000808'
 UNION ALL SELECT 'property', property_code FROM customer_properties WHERE property_name LIKE 'QA-0808%'
 UNION ALL SELECT 'quote', quote_number FROM quotes WHERE id='<QUOTE ID>'
 UNION ALL SELECT 'project', project_number FROM projects WHERE id='<PROJECT ID>';"
```

Every value must contain `ONEOHM_EPC`. Any that doesn't is CRITICAL.

---

## 5. Regression — pre-existing data must be untouched

Re-run the §1.1 baseline query.

**Assert:** `sum` changed by **exactly** the net of the entries you created (payments minus the negative expense), and by nothing else. Pick any two pre-existing projects and confirm their `outstanding_paise` in `v_project_balance` is unchanged from what you'd expect (spot-check via the UI too).

Also re-confirm no organization remnants reappeared (§1.1 item 4).

---

## 6. Broad page sweep

Visit each and record load status, whether data renders, and any console errors:

`/dashboard` · `/customers` · `/properties` · `/quotes/list` · `/projects/list` · `/projects/my-tasks` · `/finance` · `/finance/receivables` · `/inventory/stock` · `/pipeline` · `/admin` · `/profile`

**FAIL any page that:** shows an error, renders an empty state while the DB has matching rows, or logs a console error that isn't dev-server HMR noise.

---

## 7. Edge cases

Attempt each; record actual behaviour. For validation cases the **expected** result is a clear, friendly error — a 500, a silent no-op, or a stack trace is a bug.

| # | Case | Expected |
|---|---|---|
| EC-01 | Create a customer with the **same phone** as the QA customer | Rejected with a clear duplicate message |
| EC-02 | Create a customer with the **same email** (different phone) | Rejected with a clear duplicate message |
| EC-03 | Submit the customer form with **required fields blank** | Inline validation, no submit |
| EC-04 | Enter an **invalid phone** (`12345`) | Inline validation |
| EC-05 | Record a payment of **0** | Rejected — "amount must be greater than zero" |
| EC-06 | Record a payment with a **negative** amount | Rejected |
| EC-07 | Record a payment with **decimals** (e.g. `100.567`) | Either rejected or rounded to paise — must not store a fractional paise |
| EC-08 | **Overpay**: record more than Outstanding | Accepted, and the excess shows as **unapplied credit** — not as negative outstanding |
| EC-09 | **Reverse** one of your payments | Creates a reversing entry; balances return to their prior values; the original is marked Reversed and is NOT deleted |
| EC-10 | Try to record a payment on a project with **no milestones** (if you can find/create one) | Handled gracefully |
| EC-11 | **Waive** a milestone (use one on the QA project only) | Outstanding drops by the waived amount; already-received money is NOT re-credited elsewhere |
| EC-12 | **Add a change order** on the QA project | Contract increases; a new milestone appears; `quoted + change_order = contract` still holds (TC-08 query) |
| EC-13 | Very **long text** (300+ chars) in a name field | Truncated or rejected cleanly, no crash |
| EC-14 | **Unicode / emoji** in customer name (e.g. `QA-0808 ग्राहक 🌞`) | Stored and displayed correctly |
| EC-15 | **Double-submit**: click Record payment twice rapidly | Exactly ONE entry created — no duplicate |
| EC-16 | **Browser refresh** mid-wizard | Either resumes or restarts cleanly, no partial/orphaned record |
| EC-17 | Navigate directly to a **non-existent project** (`/projects/00000000-0000-0000-0000-000000000000`) | Clean not-found, not a crash |
| EC-18 | **Back button** after creating a record | No duplicate submission |
| EC-19 | Generate a receipt for a **reversed** entry | Either blocked or clearly marked as reversed |
| EC-20 | WCR report with **required fields left blank** | Clear validation, no blank/broken PDF |

**EC-15 DB check (duplicate detection):**
```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT reference, count(*) FROM ledger_entries WHERE project_id='<PROJECT ID>'
  GROUP BY reference HAVING count(*) > 1;"
# expected: no rows
```

**Numbering-sequence integrity** (after all payments — this is the mechanism most at risk in the change under test):
```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' oneohm-postgres psql -U root -d oneohm_epc -tAc \
"SELECT sequence_key, last_value FROM numbering_sequences ORDER BY sequence_key;
 SELECT entry_no, count(*) FROM ledger_entries GROUP BY entry_no HAVING count(*) > 1;"
# expected: sequence values sane and increasing; NO duplicate entry_no rows
```

---

## 8. Severity definitions

Use these exactly.

| Severity | Meaning |
|---|---|
| **CRITICAL** | Money is wrong, data is lost or corrupted, a generated code/number is wrong or duplicated, or the flow cannot complete at all |
| **HIGH** | A feature is broken or a page fails to render its data, but there is a workaround |
| **MEDIUM** | Wrong behaviour with limited impact — bad validation message, wrong formatting, confusing state |
| **LOW** | Cosmetic — spacing, copy, alignment |

---

## 9. Report template

Write to `docs/qa/2026-08-08-qa-run-report.md`. Follow this structure — the developer reads it directly to decide what to fix.

```markdown
# OneOhm E2E QA Run — <date/time>

Branch: refactor/remove-organizations
Executed by: Antigravity

## 1. Pre-flight
| Check | Result |
|---|---|
| Web reachable | |
| API reachable | |
| DB read-only guard active | |
| org_columns / org_tables | |
| Baseline ledger entries / sum | |

## 2. Summary
- Total cases run / passed / failed / blocked:
- CRITICAL: n | HIGH: n | MEDIUM: n | LOW: n
- **Merge recommendation: GO / NO-GO** — and why, in one sentence.

## 3. Main flow results
| ID | Case | Result | Notes |
|----|------|--------|-------|
| TC-01 | Login | | |
| … one row per case through TC-16 … |

## 4. Edge case results
| ID | Case | Expected | Actual | Result | Severity |
|----|------|----------|--------|--------|----------|
| EC-01 | … | | | | |

## 5. Records created (for developer cleanup awareness)
| Type | Identifier | Note |
|---|---|---|
| Customer | CUST-… | |
| Property | PROP-… | |
| Quote | QT-… | |
| Project | PRJ-… | |
| Ledger entries | RCP-… / EXP-… | append-only, cannot be deleted |
| Documents | receipt / WCR file names | |

## 6. Bugs found
Repeat this block per bug, most severe first.

### BUG-01 — <one-line title>
- **Severity:** CRITICAL | HIGH | MEDIUM | LOW
- **Where:** page URL and/or API endpoint
- **Steps to reproduce:** numbered, minimal
- **Expected:**
- **Actual:**
- **Evidence:** screenshot path, console error, and/or DB query + output
- **Blast radius:** does this affect existing data or only new records?

## 7. Money integrity
| Check | Expected | Actual | Result |
|---|---|---|---|
| quoted + change_order = contract | | | |
| outstanding = 0 after full payment | | | |
| expense did not change outstanding | | | |
| overpayment became unapplied credit | | | |
| reversal restored prior balances | | | |
| no duplicate entry_no | | | |
| pre-existing ledger sum moved only by test entries | | | |

## 8. Page sweep
| Page | Loads | Data renders | Console errors |
|---|---|---|---|

## 9. Coverage not achieved
Anything skipped or blocked, and why.
```

---

## 10. Rules for the agent

1. **Never write to the database.** Every mutation goes through the UI.
2. **Never modify or delete pre-existing records.**
3. **Do not fix bugs.** Record them. The developer fixes them.
4. **Do not stop at the first failure** — mark it, then continue with everything not blocked by it.
5. **Screenshot every UI assertion**, and every failure without exception.
6. **Quote actual values**, never "looks correct". Write the number you saw.
7. **If the UI and the database disagree, that is a bug** — report it with both sides shown.
8. **If you are unsure whether something is a bug, report it** with what you observed. A false positive costs a minute; a missed money bug costs far more.
