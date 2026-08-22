# Department Workload — design

- **Date:** 2026-08-22
- **Status:** Design. Not built. **Two questions for the client block a build** (§8).
- **Source:** client CSV, "Oneohm App New fields - Dashboard"
- **Relation to shipped work:** a third dashboard feature. Neither My Work nor Business mode
  covers any of it.

---

## 1. What the client actually asked for

The CSV reads as four department columns, each listing tasks, each wanting three metrics:

> **Pending · Completed · Average Time Taken to complete the Task (standard vs Actual)**

Decoded against the schema, it is **not** about milestones. It maps onto `workflow_steps`,
grouped by `default_department`:

| CSV column | Table value | Steps |
|---|---|---|
| EXECUTION | `Execution Department` | 12 |
| LIASIONING | `Liaisoning Department` | 13 |
| Loan | `Loan Department` | 7 |
| Store | `Store Department` | 7 |

The names confirm it: "Loan Documents Collection" → `Loan Document Collection`, "Panels Dispatch"
→ `Panel Dispatch`, "Reverse Pick Up" → `Reverse Pickup`, "RTS Portal Documents Upload" →
`Upload Documents on RTS portal`. All 7 Loan rows and 7 of 8 Store rows match exactly.

So the ask is a **department × workflow-step grid of throughput and cycle time**.

---

## 2. The blocking finding: "time taken" cannot mean what it says

Measured 2026-08-22 across 10,087 tasks:

| Signal | Coverage |
|---|---|
| Tasks completed | 4,932 |
| …with `completed_at` | 4,930 |
| …with **both** `start_date` and `completed_at` | **21 (0.4%)** |
| Tasks that ever logged a move into `in_progress` | **31 (0.6%)** |

**There is no record of when work on a task began.** Tasks are generated for the whole project at
once and move straight from `backlog` to `done`; `start_date` is a schedule field, populated by
`project.service.ts:1009` from `effort_days`, not a fact about when anyone started.

So "average time from task start to task finish" is not computable, now or retrospectively. Any
figure built on `start_date` would describe 0.4% of the work and be presented as if it described
all of it.

### What IS computable, and is arguably the better metric

**Stage lead time** — the gap between a step completing and the previous step completing in the
same project. It answers "how long does this stage add to a job", which is what an operations
manager means by how long a stage takes.

Measured, 4,744 usable transitions:

| Department | Measurable | Avg actual (days) | Avg standard (`effort_days`) |
|---|---|---|---|
| Liaisoning Department | 1,258 | 1.6 | 0.9 |
| Execution Department | 1,127 | 1.4 | 1.1 |
| Loan Department | 928 | 0.3 | 0.9 |
| Store Department | 838 | 1.6 | 1.0 |
| Design Engineering | 280 | 1.3 | 1.0 |
| **Execution Engineering** | 139 | **10.2** | 1.0 |

It works, and it already surfaces something: DSS Work runs roughly ten times its standard.

**The standard exists and is unused.** `workflow_steps.effort_days` is populated on all 44
departmental steps and is referenced in exactly one place — setting a task's `endDate` at
creation. Nothing has ever compared it to an outcome.

---

## 3. The department field needs normalising first

The CSV has four columns. The data has **eight** department strings plus blank:

```
Execution Department (12)   Liaisoning Department (13)   Loan Department (7)   Store Department (7)
Design Engineering (2)      Execution Engineering (1)    Loan (1)              Execution (1)
(none) (6)
```

`Execution`, `Execution Engineering` and `Execution Department` are three spellings that a
manager reads as one team. `Loan` and `Loan Department` likewise. Grouped as-is, the screen shows
eight columns where the client asked for four, and splits DSS Work away from the execution team
it belongs to.

**This is a data fix, not a display fix.** Normalising in the query hides the inconsistency and
leaves the next feature to rediscover it. A migration should collapse the strays, and
`workflow_steps.default_department` should become a constrained set.

The six steps with **no** department — Consumer Name Change, New Connection, New EV Meter, Load
Change, Property Type Change, Consumer Name Spelling Correction — are change-request types rather
than pipeline stages, and belong outside the grid.

---

## 4. Row-by-row reconciliation of the CSV

**Matches cleanly (30 of 38).** All 7 Loan rows, 7 of 8 Store rows, 9 of 11 Liaisoning rows, and
7 of 12 Execution rows.

**No workflow step exists (2):**

| CSV row | Note |
|---|---|
| **Service Call** (Execution) | Nothing matches. Service work lives in `service_tickets`, a separate module — this may be asking for ticket counts inside a project grid |
| **Vendor Agreement Upload** (Liaisoning) | Nothing matches, and no near name |

**Filed under a different department than the CSV expects (4):**

| CSV row | Step | Data says |
|---|---|---|
| DSS (Execution) | `DSS Work` | Execution **Engineering** |
| Net Meter Installation (Execution) | `Net Meter Installation` | `Execution` |
| Jan Samarth Application (Liaisoning) | `Jan Samarth Portal Registration` | **Loan** |
| DCR Certificates (Store) | `DCR - Certificate Generation` | **Liaisoning** |

Three of these are the naming problem in §3. **Jan Samarth is a genuine disagreement** about which
team owns the step, and only the client can settle it.

**Ambiguous (4):**

| CSV row | Candidates |
|---|---|
| MSECL QC | `Quality Control` or `QC Inspection` — both exist in Execution Department |
| Name Change | `New Change Application`, `New Changes Documentation`, `New Changes Updated Status` |
| Civil Work | `Block Work`? Nothing else is close |
| PM Suryaghar Application **and** MSEDCL Solar Application | Only one `Solar PV Application` exists for the two of them |

**Steps the CSV omits (8):** `Quality Control` / `QC Inspection` (whichever is not MSECL QC),
`Block Work`, `Project Run / System Information`, `Commissioning`, `New Changes Documentation`,
`New Changes Updated Status`, `Load Extension`, and both Design Engineering steps. They will still
appear in the data; the screen should show them rather than silently drop work nobody listed.

---

## 5. Where it goes — a card AND a screen

**Not a single card.** Four departments × 44 steps × 3 metrics is a table. Business mode exists to
be read in ninety seconds between site visits, and a 44-row grid is the opposite of that.

**In Business mode: a four-row summary card, "Department workload".** One row per department:
pending, completed this period, and actual-vs-standard as a single variance. Four rows sit
comfortably beside the funnel, and the variance column is what makes someone look closer.

**A new screen at `/workload` holds the grid.** One row per workflow step, grouped by department,
columns: Pending · Completed · Avg actual · Standard · Variance. This is where the CSV's
"Filters Required" belongs — the summary card carries no filters.

The card links to the screen; a department row links to that department pre-filtered. This is the
same shape the sales panels already use with `/pipeline`.

**Gate:** a new code, `workload.view`. Not `dashboard.business.view` — the screen is its own
route and must gate independently, and not `projects.view`, which is about individual projects
rather than organisation-wide team performance.

---

## 6. Data contract

One new endpoint. Nothing else exists that aggregates this way.

```
GET /api/v1/analytics/workload?fromDate&toDate&department&stepId
```

```ts
{
  fromDate: string; toDate: string;
  departments: Array<{
    department: string;
    pending: number;             // tasks not done, org-wide
    completed: number;           // completed_at within range
    avgActualDays: number | null;   // stage lead time, null when unmeasurable
    avgStandardDays: number | null; // mean effort_days across the department's steps
    measurableCount: number;        // how many transitions the average rests on
    steps: Array<{
      stepId: string; stepName: string;
      pending: number; completed: number;
      avgActualDays: number | null; standardDays: number | null;
      measurableCount: number;
    }>;
  }>;
}
```

`measurableCount` is not decoration. A 10.2-day average over 139 transitions and one over 3 are
different claims, and the screen must be able to say which it is holding.

`avgActualDays` is **null**, never 0, where no transition can be measured — a step that is always
first in its project has no predecessor to measure from.

---

## 7. Verification

By walking the screen. No new test files.

| # | Check | Must |
|---|---|---|
| 1 | Sum of per-step pending | Equals the department row's pending |
| 2 | A department with one measurable step | States its `measurableCount`, does not imply a trend |
| 3 | A step never yet completed | Shows pending, and `—` for actual, not `0 days` |
| 4 | Date range change | Completed counts move; pending does not (pending is as-of-now) |
| 5 | Without `workload.view` | No card, no route, and no request fires |
| 6 | Department filter from the card | Screen opens pre-filtered, same numbers |
| 7 | Steps absent from the client CSV | Still appear |

---

## 8. Blocking questions for the client

Both change what gets built.

1. **"Average time taken" cannot mean task start to task finish** — that is recorded for 0.4% of
   completed work (§2). Is **stage lead time** the right substitute, or does the business want
   task start times captured going forward, accepting that the metric is empty until enough data
   accrues? Capturing them is a small change — stamp `start_date` on the move to `in_progress` —
   but it produces nothing for weeks.
2. **The four CSV rows in §4 that do not resolve** — Service Call and Vendor Agreement Upload have
   no step at all; MSECL QC, Name Change, Civil Work and the two Suryaghar/MSEDCL rows are
   ambiguous. Each needs naming against a real workflow step, or creating.

Non-blocking but worth raising: **should Jan Samarth sit under Loan or Liaisoning?** The data says
Loan, the CSV says Liaisoning.
