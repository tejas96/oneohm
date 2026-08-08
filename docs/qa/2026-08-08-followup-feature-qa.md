# Follow-up Feature — End-to-End QA Test Note

**Feature:** Follow-up system + visibility surfaces
**Branch:** `feat/followup-system`
**Date:** 2026-08-08
**Estimated run time:** 3–4 hours for a full pass

---

## 1. What this feature is meant to do

One sentence: **an open lead can never sit with nobody owing it an action.**

Everything else follows from that. A "lead unit" is either a **property** that
is still in play, or a **customer who has no property yet**. Each open lead unit
must have at least one pending follow-up, and the only ways out are:

- the quote is **accepted**
- the property is **converted** to a project
- the lead is explicitly **marked lost**, with a reason

The follow-up also *is* the ownership record — whoever holds the next pending
follow-up owns that lead. There is no separate owner field.

If a test result contradicts that sentence, it is a bug regardless of what any
other document says.

---

## 2. Environment and accounts

| | |
|---|---|
| Web | `http://localhost:3001` |
| API | `http://localhost:8085/api/v1` |
| Swagger | `http://localhost:8085/api/docs` |
| Database | `docker exec oneohm-postgres psql -U root -d oneohm_epc` |

**Test account:** `sanjay.oneohm@gmail.com` — password supplied separately.

> Password deliberately not written into this file: it is committed to git and
> may be pushed to a remote. Keep it in your password manager or ask the team
> lead. This is not a comment on the account's importance — repos leak.

**Second account needed.** Several cases require *two* users to prove that
ownership moves and that "Mine" vs "All" behave differently. Ask for a second
login, or use two browsers with different sessions.

### Before you start

Record the baseline so you can tell your changes from pre-existing data:

```sql
SELECT (SELECT count(*) FROM followups WHERE deleted_at IS NULL) AS followups,
       (SELECT count(*) FROM customer_properties WHERE deleted_at IS NULL AND status NOT IN ('converted','lost')) AS open_sites,
       (SELECT count(*) FROM customer_properties WHERE status = 'lost') AS lost_sites;
```

Write those three numbers at the top of your report.

---

## 3. How to report

Use the template in §10. For every failure record:

1. **Test ID** (e.g. `B-04`)
2. **What you did** — exact clicks, exact values typed
3. **What you expected** vs **what happened**
4. **Screenshot** — always, for anything visual
5. **Severity**, using these definitions:

| Severity | Means | Example |
|---|---|---|
| **Blocker** | The core rule is violated; a lead can go dark | Completing the last follow-up without scheduling another succeeds |
| **Major** | Feature works but data is wrong or invisible | A count disagrees with the list beneath it |
| **Minor** | Cosmetic or annoying, work still completes | Column misaligned, inconsistent spacing |
| **Query** | You are unsure whether it is a bug | Wording reads oddly |

Do not fix anything. Record and move on.

---

## 4. Section A — Happy paths

### A-01 · Schedule a follow-up from a property

1. Open any property detail page → **Follow-ups** tab → **Log Follow-up**.
2. Fill Subject, leave the date as prefilled, pick an Owner, Schedule.

**Expected:** toast "Follow-up scheduled"; the row appears in the tab; the
header tile **NEXT FOLLOW-UP** updates to that date without a page refresh.

### A-02 · The prefilled date matches the lead temperature

Repeat A-01 on three properties, one of each temperature.

**Expected:** the date field prefills to today **+3 days** for HOT,
**+10** for WARM, **+15** for COLD. Change the property's temperature and
reopen the drawer — the prefill must follow the new temperature.

### A-03 · Complete a follow-up and open the next (the core loop)

On a property with exactly **one** pending follow-up, click **Complete**.

**Expected:**
- Dialog reads **"Next follow-up (required)"** and *"This is the only open
  follow-up — schedule the next one, or close the lead."*
- **Save & schedule next** is disabled until date, owner and subject are set.
- On save: the original row shows **Completed** with the outcome you chose, and
  a **new pending row** appears. Both, from one click.

### A-04 · Customer-level follow-up (lead with no site)

Open a customer with **no properties** → Follow-ups tab → schedule one, leaving
the property picker empty.

**Expected:** it saves and shows Scope **"Customer-level"**.

### A-05 · Onboarding requires a first follow-up

Run the onboarding wizard for a new site. On **Review & assign**, leave the
Owner empty and submit.

**Expected:** submission is **blocked**, Owner shows "Required". Fill it and
submit — the created site has a follow-up at the temperature-appropriate date.

### A-06 · Reschedule without completing

`/followups` → row `⋯` → **Reschedule** → pick a new date.

**Expected:** the date moves; **no outcome is recorded**; status stays Pending;
no second follow-up is created.

### A-07 · Reassign, single and bulk

`/followups` → `⋯` → **Reassign**. Then select several rows via checkbox and use
the **Reassign** button in the selection bar.

**Expected:** owner changes on every selected row; toast reports the count.

---

## 5. Section B — The enforcement rule

This section is the reason the feature exists. **Any failure here is a Blocker.**

### B-01 · Cannot complete the last follow-up without a successor

Property with exactly one pending follow-up → Complete → try to save with the
next-follow-up block empty.

**Expected:** cannot. The block is mandatory and the button stays disabled.

### B-02 · Can complete when siblings remain

Give one property **two** pending follow-ups. Complete one.

**Expected:** heading reads **"Next follow-up"** *without* "(required)", the
subtext says *"1 other follow-up still open on this lead"*, a toggle
**"Schedule another follow-up"** appears and can be switched **off**, and the
button changes to **"Save"**. Saving completes only that one; the sibling is
untouched.

### B-03 · The server enforces it, not just the UI

With one pending follow-up on a lead, call the API directly:

```bash
curl -X POST http://localhost:8085/api/v1/followups/<id>/complete \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"outcome":"interested"}'
```

**Expected:** **400**, message about scheduling the next one or closing the
lead. A UI-only guard is a Blocker — anyone can bypass it.

### B-04 · Outcome "Other" demands notes

Complete a follow-up choosing outcome **Other**, notes empty.

**Expected:** blocked; label reads "Notes (required)". Also try via API — the
server must reject it too.

### B-05 · Cancelling relocates rather than hides

Note the `/followups` **Needs follow-up** count. Cancel the **last** pending
follow-up on a lead.

**Expected:** the count goes **up by one** and the lead appears in that tab.
Cancelling must not make a lead disappear.

### B-06 · Every open lead is accounted for

```sql
SELECT count(*) FROM customer_properties p
 WHERE p.deleted_at IS NULL AND p.status NOT IN ('converted','lost')
   AND NOT EXISTS (SELECT 1 FROM followups f WHERE f.property_id=p.id AND f.deleted_at IS NULL AND f.status='pending')
   AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.property_id=p.id AND q.deleted_at IS NULL AND q.status='accepted');
```

**Expected:** this number plus property-less leads equals the **Needs
follow-up** tab count on `/followups`.

---

## 6. Section C — Terminal states

### C-01 · Quote accepted closes the chain
Property with pending follow-ups → accept its quote.
**Expected:** pending follow-ups become Cancelled; the property leaves the
Needs-follow-up tab; the header tile no longer demands one.

### C-02 · Convert to project closes the chain
Same, via **Convert to Project**.

### C-03 · Mark lost, per property
Customer with **two or more** open sites → mark **one** lost with a reason.
**Expected:** only that site becomes Lost; its follow-ups cancel; **sibling
sites and the customer stay active**. Verify:
```sql
SELECT property_name, status, lost_reason FROM customer_properties WHERE customer_id='<id>';
```

### C-04 · Mark lost requires a reason
**Expected:** the button stays disabled while the reason is empty.

### C-05 · "Not interested" offers the lost path
Complete with outcome **Not interested**.
**Expected:** a **Mark lost** action surfaces inline — you should not have to
hunt for it.

### C-06 · Closed leads stop nagging
For a converted, lost, and quote-accepted property: the header tile shows a
plain **"—"**, not red "None scheduled", and no red dot appears in the
customer's expanded row.

---

## 7. Section D — Visibility surfaces

### D-01 · Sidebar badge
**Expected:** absent when nothing of yours is due; a neutral count when
something is due today; **red** when anything is overdue. It must reflect
*your* follow-ups, not the company's.

### D-02 · Customer-list chip
**Expected:** `Needs follow-up · N` appears in the filter row. Clicking it
narrows the list, and the total under the table (`Showing 1–10 of N`) **equals
the chip's number**.

### D-03 · Chip resets pagination
Go to a **high page** (e.g. page 100) of the unfiltered list, then click the
chip.
**Expected:** you land on **page 1** with rows visible. An empty table here is a
Major bug.

### D-04 · Chip survives reload
With the chip active, copy the URL, reload, and press Back.
**Expected:** the filter persists on reload and clears on Back.

### D-05 · Dot on unattended sites
Expand a customer row.
**Expected:** **red** dot on open sites with nothing pending (tooltip *"No
follow-up scheduled"*); **green** dot with the date when one exists; **no dot**
on converted or lost sites.

### D-06 · The empty tile is clickable
On a property with nothing scheduled, click the red **"None scheduled"** tile.
**Expected:** the schedule drawer opens. On a property that *has* a follow-up,
the tile shows a date and is **not** clickable. Also reachable by Tab + Enter.

### D-07 · The four tabs
`/followups` → Overdue / Today / Upcoming / Needs follow-up.
**Expected:** each tab's count matches its row count; **Mine** and **All**
change both.

---

## 8. Section E — Edge cases and negative tests

| ID | Case | Expected |
|---|---|---|
| E-01 | Subject of 255 characters | Saves, or is limited with a clear message — never a silent truncation |
| E-02 | Subject of only spaces | Rejected |
| E-03 | Date in the **past** for a new follow-up | Allowed (back-dating is legitimate) and shown as overdue |
| E-04 | Date years in the future | Allowed, appears under Upcoming |
| E-05 | Complete an already-completed follow-up (two tabs open, click Complete in both) | Second attempt fails cleanly with a message, not a crash or a duplicate |
| E-06 | Cancel an already-cancelled one | Same |
| E-07 | Reschedule a **completed** follow-up | Rejected |
| E-08 | Delete the property while its follow-up drawer is open | No crash; a clear error |
| E-09 | Assign to a **deactivated** user | Rejected, or the user is absent from the picker |
| E-10 | Customer with **20+** sites, expand the row | All dots render; no visible lag |
| E-11 | Property with **20+** follow-ups | Table paginates or scrolls; page stays usable |
| E-12 | Two users complete the *same* follow-up simultaneously | One wins; the other gets a clear error; **exactly one** successor is created |
| E-13 | Session expires mid-dialog, then save | Redirect to login or a clear error — never silent data loss |
| E-14 | Network offline, then save | Error toast; the dialog stays open with your input intact |
| E-15 | Timezone: set the machine to UTC+13, view Overdue/Today near midnight | Buckets follow **local** calendar days |
| E-16 | Customer whose only site is lost | Does not appear in Needs follow-up |
| E-17 | Lead with no property, status `active` (not lead/prospect) | Does **not** appear in Needs follow-up |
| E-18 | Re-quote a property after its quote was accepted | Check the header tile and the dot still agree with the chip |

---

## 9. Section F — UI and visual checks

Run these on **every** follow-up surface: the two Follow-ups tabs (property and
customer), `/followups`, the Complete dialog, the Schedule drawer, the Mark-lost
dialog.

### F-01 · Columns and data
- [ ] Every column header lines up with its cells
- [ ] **You can see who each follow-up is assigned to** — see Known Issue K-01
- [ ] Long subjects do not break the layout
- [ ] Empty values show a consistent placeholder (`—`), never blank or `null`
- [ ] Dates use one format throughout

### F-02 · Rows and spacing
- [ ] **All rows in a table are the same height**, whether or not they have an action button — see K-02
- [ ] Padding is consistent between the property tab and `/followups`
- [ ] Action buttons are aligned in a single vertical line
- [ ] Table edges align with the card that contains them

### F-03 · Actions
- [ ] The same actions are offered for the same row state across surfaces — see K-03
- [ ] Buttons that cannot apply are hidden or disabled, never present-but-broken
- [ ] Every destructive action asks first
- [ ] Buttons show a pending state while saving and cannot be double-clicked

### F-04 · Feedback
- [ ] Every save shows a toast; every failure shows the reason
- [ ] Lists refresh after an action without a manual reload
- [ ] Loading states appear instead of a blank flash

### F-05 · Responsive
Check at **1440px, 1024px, 768px, 375px**:
- [ ] No horizontal scrollbar on the page body
- [ ] Wide tables scroll **inside their own container**
- [ ] The primary action stays reachable without horizontal scrolling
- [ ] Dialogs and drawers fit the viewport; buttons stay on screen

### F-06 · Keyboard and screen reader
- [ ] Tab order follows visual order
- [ ] Every control is reachable and activatable by keyboard
- [ ] Focus is visible
- [ ] Dialogs trap focus and close on Escape
- [ ] Dots and icon-only buttons have text alternatives

### F-07 · Copy
- [ ] No placeholder text, no "TODO", no "not wired yet"
- [ ] Terminology is consistent — pick one of "follow-up"/"followup" and one of "site"/"property"
- [ ] Error messages say what to do next, not just what failed

---

## 10. Known issues — ALL FIXED

All five were fixed after the first QA pass. **Re-test each and confirm the new
behaviour**; report only if it differs from the "Now" column.

| ID | Was | Now |
|---|---|---|
| **K-01** | No Owner column on either Follow-ups tab | Owner column present, showing the assignee |
| **K-02** | Rows 42px without an action button, 50px with one | Uniformly 50px — every row carries the menu |
| **K-03** | Tabs offered only Complete | Complete + Reschedule / Reassign / Cancel, same as /followups |
| **K-04** | Priority column read "Normal" on every row | Removed; Owner uses the width |
| **K-05** | Long subjects wrapped and grew the row | Truncated with ellipsis, full text in tooltip |

Two further defects were found and fixed in the same pass — **re-test these
explicitly, neither was in the original plan**:

| ID | Issue | Now |
|---|---|---|
| **K-06** | The complete dialog's "Not interested → Mark lost" action was **dead code** — nothing passed `onMarkLost`, so it could never render. The first QA pass recorded C-05 as passing by quoting a different element. | Wired from both tabs. Re-run **C-05** and confirm a **Mark lost** button appears in the dialog footer and opens the real dialog. |
| **K-07** | Dialog titles had **zero padding** and form fields sat 6px apart instead of 20px, because the app theme's rules collide with raw MUI primitives. | All dialogs use the house MUIDialog kit. Measured: header/footer `16px 24px`, body `24px`, field gaps a uniform 20px. |

### Known issues from the original pass, superseded

The list below is kept for history only — all are fixed above.

| ID | Issue | Severity | Where |
|---|---|---|---|
| **K-01** | **The Follow-ups tab does not show who a follow-up is assigned to.** The API returns `assignedToUser`, but neither the property nor the customer tab renders an Owner column. Since the assignee *is* the lead's owner, this hides the single most important field. | **Major** | `properties/property-detail/tabs/followups-tab.tsx`, `customers/customer-detail/tabs/followups-tab.tsx` |
| **K-02** | **Row heights are inconsistent — 42px without an action button, 50px with one.** Rows with a Complete button are 8px taller, so the table looks ragged. Measured on a real 8-row table. | Minor | Both Follow-ups tabs |
| **K-03** | **Action parity gap.** `/followups` offers Complete, Reschedule, Reassign and Cancel via a `⋯` menu. The Follow-ups tabs offer **only Complete** — you cannot reschedule or reassign from where you are looking at the lead. | **Major** | Both Follow-ups tabs |
| **K-04** | **The Priority column is dead weight.** It reads "Normal" on effectively every row, nothing sorts or filters by it, and it occupies width that Owner needs. | Minor | Both Follow-ups tabs |
| **K-05** | **Subject cells wrap instead of truncating** (`white-space: normal`, no ellipsis), so one long subject makes its row taller than the rest — compounding K-02. | Minor | Both Follow-ups tabs |

---

## 11. Report template

Copy this into a new file, `docs/qa/reports/YYYY-MM-DD-followup-qa-report.md`.

```markdown
# Follow-up QA Report — <date>

**Tester:** <name>
**Build:** <branch> @ <commit sha>
**Environment:** local / staging
**Baseline counts:** followups=<n>, open sites=<n>, lost sites=<n>

## Summary

| | Passed | Failed | Blocked | Not run |
|---|---|---|---|---|
| A — Happy paths (7) | | | | |
| B — Enforcement (6) | | | | |
| C — Terminal states (6) | | | | |
| D — Visibility (7) | | | | |
| E — Edge cases (18) | | | | |
| F — UI/visual (7 groups) | | | | |
| **Total** | | | | |

**Verdict:** Ship / Ship with fixes / Do not ship
**One-line reason:**

## Failures

### <Test ID> — <one-line title>
- **Severity:** Blocker / Major / Minor / Query
- **Steps:** 1… 2… 3…
- **Expected:**
- **Actual:**
- **Screenshot:** <path>
- **Notes:**

_(repeat per failure)_

## Known issues re-tested

| ID | Still present? | Notes |
|---|---|---|
| K-01 | | |
| K-02 | | |
| K-03 | | |
| K-04 | | |
| K-05 | | |

## Data left behind

List anything you created and did not remove, so the next tester is not
confused by it.

## Time spent
```

---

## 12. Cleaning up after yourself

QA on a shared database leaves debris that looks like real leads. Before you
finish, remove what you created:

```sql
-- Review first, delete second.
SELECT id, subject, created_at FROM followups
 WHERE created_at > '<when you started>' ORDER BY created_at;
```

Restore any property whose status you changed, and note in the report anything
you deliberately left in place.
