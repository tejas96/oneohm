# Follow-up Visibility — Design

**Date:** 2026-08-08
**Status:** Approved design, ready for implementation planning
**Builds on:** `docs/plans/2026-08-08-followup-system-design.md`

---

## 1. Problem

The follow-up system works, but it is a **destination**. It only helps someone
who thinks to open `/followups`.

The people who need it are working elsewhere — the customer list is the main CRM
screen, and the property detail page is where a site gets worked. Neither says
anything about a lead being unattended. On current data that is 933 open leads
nobody owes an action, invisible unless you navigate somewhere specific.

The property header does already show a red "None scheduled", but it is inert
text: you see the problem, then go hunting for the button that fixes it.

## 2. Principle

**Put the signal where the eyes already are, and make the fix one click from the
signal.** Never make someone navigate to discover something is wrong.

## 3. The drift risk this design exists to prevent

After this change, three places answer the question *"does this lead need a
follow-up?"*:

1. `FollowupRepository.findGaps()` — the `/followups` Needs-follow-up tab
2. The customer-list `needsFollowup` filter and its chip count
3. The per-property `nextFollowupAt` enrichment behind the site-row dot

If each hand-rolls its own `NOT EXISTS`, they will disagree — a chip reading 41
beside a list showing 37. That exact class of bug already occurred once in this
feature, where `/followups/summary` counted all gaps while the list scoped them
by user.

**So: one exported SQL predicate, consumed by all three.** This is the spine of
the design, not an implementation detail.

### The shared predicate

A property needs a follow-up when it is open and has nothing pending:

```sql
p.deleted_at IS NULL
AND p.status NOT IN ('converted', 'lost')
AND NOT EXISTS (SELECT 1 FROM followups f
                 WHERE f.property_id = p.id
                   AND f.deleted_at IS NULL
                   AND f.status = 'pending')
AND NOT EXISTS (SELECT 1 FROM quotes q
                 WHERE q.property_id = p.id
                   AND q.deleted_at IS NULL
                   AND q.status = 'accepted')
```

A customer needs a follow-up when **any** of their sites does, or — for a lead
that never got a site — when they themselves have nothing pending. That is
exactly the two branches `findGaps()` already unions, so `findGaps()` is
refactored to consume the extracted fragment rather than a second copy being
written beside it.

Home: `apps/backend/src/modules/customers/repositories/followup-predicates.ts`,
exported as string constants with documented alias requirements (`p` for
`customer_properties`, `c` for `customer_profiles`).

## 4. The four changes

### 4.1 Nav badge

An always-visible count beside "Follow-ups" in the sidebar: overdue + due today.
Works on every screen without anyone navigating anywhere — the difference
between remembering to check and being told.

`panel.tsx` already does exactly this for project tasks
(`useMyTasksSummary` → `badges['projects-my-tasks']`, red variant when overdue).
Follow-ups follow the same shape:

```ts
const { data: followups } = useFollowupSummary(true);
if (followups && followups.overdue + followups.today > 0) {
  badges['followups'] = {
    value: followups.overdue + followups.today,
    variant: followups.overdue > 0 ? 'error' : undefined,
  };
}
```

Red only when something is late; neutral when it is just today's work. The same
grammar My Tasks already uses, so it needs no explaining.

**Cost:** frontend only. No backend — `/followups/summary` exists.

### 4.2 Clickable "None scheduled" tile

`KpiItem` gains an optional `onClick`. When present the tile renders as a
button; otherwise it renders exactly as today.

The property page passes the drawer opener **only when there is nothing
scheduled**. A tile showing a date stays inert — there is nothing to fix, and a
button that does nothing useful teaches people to ignore buttons.

**Cost:** frontend only. The drawer already exists on that page.

### 4.3 Chip row on the customer list

Fills `secondaryQuickFilters` — a second chip row `CrmTable` already supports
and nothing currently uses. One chip: `Needs follow-up · 41`.

- **Filter:** `CustomerQueryDto.needsFollowup?: boolean`, applied via the shared
  predicate.
- **Count:** a `needsFollowup` field added to `CustomerOverviewStats`. The list
  already fetches that endpoint for its KPI cards, so the chip costs no extra
  request.
- **Semantics:** customer has at least one open site with no pending follow-up,
  or is a property-less lead with none.

Selecting the chip narrows the list to those customers, turning the main CRM
screen into a worklist.

**Cost:** one DTO field, one repository predicate application, one stats
subquery, one `useMemo` on the page.

### 4.4 Red dot in the expanded site row

The expanded site row under a customer already carries nine columns, so a tenth
would push it toward the horizontal-scroll problem that already bit the
`/followups` grid. Instead: a small red dot beside the site name.

- Dot shown when the site is open and has nothing pending.
- Tooltip: *"No follow-up scheduled"*.
- When a follow-up does exist, no dot, and the tooltip on the name shows its
  date.

**Backend:** `nextFollowupAt: string | null` on `CustomerPropertyResponseDto`,
computed where `latestQuoteStatus` is already enriched in
`customer-property.service.ts`. Derived per property as
`MIN(scheduled_at) WHERE status = 'pending'` — the same "next" definition the
rest of the feature uses, still never stored.

**Cost:** one response field, one enrichment join, one dot in the row.

## 5. Deliberately excluded

Named so they are not mistaken for oversights:

- **Sorting by most-overdue** — needs a new sort field and backend support, and
  the chip already produces the filtered set.
- **A count on the site-row dot** — a dot answers a yes/no question; a number
  there is noise.
- **A second "Overdue" chip on the customer list** — doubles the counts computed
  on a page that already loads a lot. Trivial to add later if the first chip
  earns its place.
- **A combined My Day dashboard** — still deferred, as in the parent spec.

## 6. Testing

**Unit — the shared predicate**

- A converted property is excluded
- A lost property is excluded
- A property with an accepted quote is excluded
- A property with a pending follow-up is excluded
- A property with only a completed follow-up is **included**
- A customer with one unattended site and one attended site is included
- A property-less `lead`/`prospect` customer with nothing pending is included
- A property-less `active` customer is excluded

**Consistency — the anti-drift check**

- The customer-list `needsFollowup` count and the set of distinct customers in
  `findGaps()` agree. This is the test that fails if someone later edits one
  copy of the condition, and is the reason the predicate is extracted.

**UI**

- Badge shows overdue + today, red only when overdue > 0, hidden at zero
- The tile is a button only when nothing is scheduled
- Selecting the chip narrows the list; the count matches the resulting rows
- The dot appears only on open, unattended sites

## 7. Two counts that legitimately differ

The chip counts **customers**; the `/followups` Needs-follow-up tab counts
**lead units** (each open property, plus each property-less customer). On
current data those are **901** and **933** — verified, not estimated. They
differ because one customer with three unattended sites is one chip row and
three gaps.

This will be reported as a bug by whoever notices it first, so both labels must
make their unit explicit: the chip reads `Needs follow-up` on a list of
customers, and the tab already sits above a list of sites and leads. The §6
consistency test compares distinct customers on both sides, not the raw totals —
comparing 901 against 933 would be comparing different things.

## 8. Rollout note

The chip will read ~900 on first release. That is accurate rather than
alarming — it is the backlog the feature was built to surface, and it will fall
as people work it. Worth saying out loud to whoever sees it first, so it reads
as a worklist rather than a fault.
