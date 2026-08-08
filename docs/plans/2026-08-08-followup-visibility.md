# Follow-up Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface unattended leads where people already work — the sidebar, the customer list, and the property header — so nobody has to visit `/followups` to discover a lead has gone dark.

**Architecture:** One SQL predicate defines "needs a follow-up" and is consumed by all three places that ask the question, so their numbers cannot drift. On top of it: a nav badge, a clickable property tile, a customer-list chip, and a dot on unattended sites.

**Tech Stack:** NestJS 11 · TypeORM · PostgreSQL 15 · Next.js 16 · React 19 · MUI 6 · Tailwind · TanStack Query · Jest

**Design spec:** `docs/plans/2026-08-08-followup-visibility-design.md` — read §3 (drift risk) before starting.

## Global Constraints

- **MUI is the primary design system**; **Tailwind is layout only**; icons from `@mui/icons-material` exclusively (`.cursorrules:31-33`).
- **No RBAC.** No role checks anywhere in this feature.
- **Single-tenant.** No `organizationId` on any query, DTO or hook.
- **One predicate, three consumers.** `findGaps()`, the customer-list filter, and the property enrichment must all read the same exported SQL fragment. Copying the condition is the specific failure this work exists to prevent.
- **"Next follow-up" stays derived** — `MIN(scheduled_at) WHERE status='pending'`. Never a stored column.
- **Never add a name to a TypeORM `relations: [...]` array that is not a declared relation** — `apps/backend/src/common/relation-names.spec.ts` fails the build if you do.
- Run `npx prettier --write` on touched files; Conventional Commits.

---

## File Structure

**Backend**
- Create `apps/backend/src/modules/customers/repositories/followup-predicates.ts` — the shared SQL fragments and their alias contract
- Create `apps/backend/src/modules/customers/repositories/followup-predicates.spec.ts`
- Modify `repositories/followup.repository.ts` — `findGaps()` consumes the fragments
- Modify `repositories/customer-profile.repository.ts` — `needsFollowup` filter + overview-stats count
- Modify `repositories/customer-property.repository.ts` — batch next-follow-up lookup
- Modify `services/customer-property.service.ts` — enrich `nextFollowupAt`
- Modify `dto/customer-query.dto.ts`, `dto/customer-property-response.dto.ts`

**Frontend**
- Modify `components/layout/panel.tsx` — nav badge
- Modify `components/features/customers/customer-detail/kpi-strip.tsx` — optional `onClick`
- Modify `components/features/properties/property-detail/property-detail-page.tsx` — clickable tile
- Modify `components/features/customers/components/customer-list-page.tsx` — chip row
- Modify `components/features/customers/hooks/use-customers.ts` — `needsFollowup` filter + stats field
- Modify `components/features/customers/components/customer-properties-expanded-row.tsx` — the dot
- Modify `components/features/customers/hooks/use-customer-properties.ts` — `nextFollowupAt` on the type

---

## Task 1: The shared predicate

**Files:**
- Create: `apps/backend/src/modules/customers/repositories/followup-predicates.ts`
- Create: `apps/backend/src/modules/customers/repositories/followup-predicates.spec.ts`
- Modify: `apps/backend/src/modules/customers/repositories/followup.repository.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `PROPERTY_NEEDS_FOLLOWUP(alias: string): string`, `CUSTOMER_LEAD_NEEDS_FOLLOWUP(alias: string): string`, `CUSTOMER_NEEDS_FOLLOWUP(alias: string): string`

- [ ] **Step 1: Write the failing test**

Create `followup-predicates.spec.ts`:

```typescript
/**
 * The predicate is the single definition of "needs a follow-up".
 *
 * Three places consume it — the /followups gaps tab, the customer-list chip,
 * and the per-property dot. If any of them hand-rolls the condition instead,
 * their counts drift and the UI starts contradicting itself. These tests pin
 * the shape; the consistency test in Task 3 pins that they agree on real data.
 */
import { describe, it, expect } from '@jest/globals';

import {
  CUSTOMER_LEAD_NEEDS_FOLLOWUP,
  CUSTOMER_NEEDS_FOLLOWUP,
  PROPERTY_NEEDS_FOLLOWUP,
} from './followup-predicates';

describe('PROPERTY_NEEDS_FOLLOWUP', () => {
  const sql = PROPERTY_NEEDS_FOLLOWUP('p');

  it('uses the alias it is given', () => {
    expect(sql).toContain('p.deleted_at IS NULL');
    expect(PROPERTY_NEEDS_FOLLOWUP('prop')).toContain('prop.deleted_at IS NULL');
  });

  it('excludes every terminal state', () => {
    expect(sql).toContain("'converted'");
    expect(sql).toContain("'lost'");
    expect(sql).toContain('quotes');
    expect(sql).toContain("'accepted'");
  });

  it('excludes anything with a pending followup', () => {
    expect(sql).toContain('followups');
    expect(sql).toContain("'pending'");
    expect(sql).toContain('NOT EXISTS');
  });
});

describe('CUSTOMER_LEAD_NEEDS_FOLLOWUP', () => {
  const sql = CUSTOMER_LEAD_NEEDS_FOLLOWUP('c');

  it('covers only leads and prospects with no property at all', () => {
    expect(sql).toContain("'lead'");
    expect(sql).toContain("'prospect'");
    expect(sql).toContain('customer_properties');
  });
});

describe('CUSTOMER_NEEDS_FOLLOWUP', () => {
  it('is satisfied by an unattended site OR by a property-less lead', () => {
    const sql = CUSTOMER_NEEDS_FOLLOWUP('c');
    expect(sql).toContain('OR');
    // The site branch must correlate back to the customer being tested.
    expect(sql).toContain('p.customer_id = c.id');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c apps/backend/jest.config.ts --rootDir apps/backend --testPathPatterns=followup-predicates`
Expected: FAIL — cannot find module `./followup-predicates`

- [ ] **Step 3: Write the predicates**

Create `followup-predicates.ts`:

```typescript
/**
 * The single definition of "this lead needs a follow-up".
 *
 * Three places ask that question — the /followups gaps tab, the customer-list
 * chip and its count, and the per-property dot. Each takes its condition from
 * here rather than writing its own NOT EXISTS, because a second copy is how a
 * chip that reads 41 ends up beside a list showing 37.
 *
 * Every fragment takes the caller's table alias so it can be dropped into an
 * existing query without renaming anything.
 */

/**
 * An open site with nobody owing it an action.
 *
 * @param alias table alias for `customer_properties`
 */
export function PROPERTY_NEEDS_FOLLOWUP(alias: string): string {
  return `
    ${alias}.deleted_at IS NULL
    AND ${alias}.status NOT IN ('converted', 'lost')
    AND NOT EXISTS (
      SELECT 1 FROM followups f
       WHERE f.property_id = ${alias}.id
         AND f.deleted_at IS NULL
         AND f.status = 'pending')
    AND NOT EXISTS (
      SELECT 1 FROM quotes q
       WHERE q.property_id = ${alias}.id
         AND q.deleted_at IS NULL
         AND q.status = 'accepted')
  `;
}

/**
 * An enquiry that never got a site and has nothing pending.
 *
 * @param alias table alias for `customer_profiles`
 */
export function CUSTOMER_LEAD_NEEDS_FOLLOWUP(alias: string): string {
  return `
    ${alias}.deleted_at IS NULL
    AND ${alias}.status IN ('lead', 'prospect')
    AND NOT EXISTS (
      SELECT 1 FROM customer_properties p
       WHERE p.customer_id = ${alias}.id
         AND p.deleted_at IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM followups f
       WHERE f.customer_id = ${alias}.id
         AND f.deleted_at IS NULL
         AND f.status = 'pending')
  `;
}

/**
 * A customer worth chasing: at least one unattended site, or a property-less
 * lead with nothing pending.
 *
 * Note this counts CUSTOMERS, while the gaps query counts LEAD UNITS — one
 * customer with three unattended sites is one row here and three there. The
 * two totals are meant to differ; see the design spec §7.
 *
 * @param alias table alias for `customer_profiles`
 */
export function CUSTOMER_NEEDS_FOLLOWUP(alias: string): string {
  return `
    ${alias}.deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM customer_properties p
         WHERE p.customer_id = ${alias}.id
           AND ${PROPERTY_NEEDS_FOLLOWUP('p')})
      OR (${CUSTOMER_LEAD_NEEDS_FOLLOWUP(alias)})
    )
  `;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest -c apps/backend/jest.config.ts --rootDir apps/backend --testPathPatterns=followup-predicates`
Expected: PASS, 6 tests

- [ ] **Step 5: Point `findGaps()` at the shared fragments**

In `followup.repository.ts`, replace the two inline `WHERE` bodies with the
imported fragments. The `SELECT` lists and the `UNION ALL` stay as they are —
only the conditions move:

```typescript
import { CUSTOMER_LEAD_NEEDS_FOLLOWUP, PROPERTY_NEEDS_FOLLOWUP } from './followup-predicates';
```

Property branch — replace everything from `WHERE p.deleted_at IS NULL` down to
the closing paren of the quotes `NOT EXISTS` with:

```
       WHERE ${PROPERTY_NEEDS_FOLLOWUP('p')}
```

Customer branch — replace everything from `WHERE c.deleted_at IS NULL` down to
the closing paren of the followups `NOT EXISTS` with:

```
       WHERE ${CUSTOMER_LEAD_NEEDS_FOLLOWUP('c')}
```

- [ ] **Step 6: Verify the refactor returned the same rows**

The gaps query must be unchanged in behaviour. Run it before and after against
the real database and compare the count:

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -tc "
SELECT count(*) FROM customer_properties p
 WHERE p.deleted_at IS NULL AND p.status NOT IN ('converted','lost')
   AND NOT EXISTS (SELECT 1 FROM followups f WHERE f.property_id=p.id AND f.deleted_at IS NULL AND f.status='pending')
   AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.property_id=p.id AND q.deleted_at IS NULL AND q.status='accepted');"
```

Note the number, restart the backend, then `GET /followups/gaps` and confirm the
property-kind rows match it.

- [ ] **Step 7: Run the suite and commit**

```bash
npm run typecheck:backend && npx jest -c apps/backend/jest.config.ts --rootDir apps/backend
npx prettier --write apps/backend/src/modules/customers/repositories/
git add apps/backend/src/modules/customers/repositories/
git commit -m "refactor(followups): extract the needs-follow-up predicate

Three places will now ask whether a lead needs chasing. Each takes its
condition from one exported fragment rather than writing its own NOT EXISTS,
because a second copy is how a chip reading 41 ends up beside a list of 37."
```

---

## Task 2: Nav badge

**Files:**
- Modify: `apps/web/components/layout/panel.tsx`

**Interfaces:**
- Consumes: `useFollowupSummary(mine: boolean)` from `@/components/features/followups`
- Produces: nothing

- [ ] **Step 1: Add the badge**

`panel.tsx` already builds `dynamicBadges` from `useMyTasksSummary`. Add the
follow-up summary alongside it, keyed by the nav item id `followups` (set in
`navigation.ts`):

```typescript
const { data: followupSummary } = useFollowupSummary(true);
```

Inside the existing `dynamicBadges` `useMemo`, after the tasks block:

```typescript
    // Overdue + due today: the work someone owes right now. Red only when
    // something is actually late, matching how My Tasks already reads.
    const followupsDue = (followupSummary?.overdue ?? 0) + (followupSummary?.today ?? 0);
    if (followupsDue > 0) {
      badges['followups'] = {
        value: followupsDue,
        variant: (followupSummary?.overdue ?? 0) > 0 ? 'error' : undefined,
      };
    }
```

Add `followupSummary` to the `useMemo` dependency array, and the import:

```typescript
import { useFollowupSummary } from '@/components/features/followups';
```

- [ ] **Step 2: Verify in the browser**

Start the preview, open any page, expand the Sales & CRM panel. With zero
overdue and zero due today the badge is absent. Create a follow-up dated today
from any property, reload, and confirm a neutral badge reading `1`. Change its
date to yesterday via Reschedule and confirm the badge turns red.

- [ ] **Step 3: Commit**

```bash
npm run typecheck:web && npx eslint --fix apps/web/components/layout/panel.tsx
npx prettier --write apps/web/components/layout/panel.tsx
git add apps/web/components/layout/panel.tsx
git commit -m "feat(web): show due follow-up count on the sidebar

Always visible, on every screen — the difference between remembering to check
and being told. Red only when something is actually late."
```

---

## Task 3: Customer-list chip and its count

**Files:**
- Modify: `apps/backend/src/modules/customers/dto/customer-query.dto.ts`
- Modify: `apps/backend/src/modules/customers/repositories/customer-profile.repository.ts`
- Modify: `apps/web/components/features/customers/hooks/use-customers.ts`
- Modify: `apps/web/components/features/customers/components/customer-list-page.tsx`
- Test: `apps/backend/src/modules/customers/repositories/followup-predicates.spec.ts` (extend)

**Interfaces:**
- Consumes: `CUSTOMER_NEEDS_FOLLOWUP(alias)` (Task 1)
- Produces: `CustomerQueryDto.needsFollowup?: boolean`, `CustomerOverviewStats.needsFollowup: number`

- [ ] **Step 1: Write the consistency test**

This is the test that fails if someone later edits one copy of the condition.
Append to `followup-predicates.spec.ts`:

```typescript
describe('customer and lead-unit counts are related, not equal', () => {
  it('documents that CUSTOMER_NEEDS_FOLLOWUP reuses the property fragment verbatim', () => {
    // If someone rewrites the site branch by hand, this fails — which is the
    // whole point of the extraction. One customer with three unattended sites
    // is one row here and three in findGaps(), and that difference is by
    // design; what must NOT differ is the definition of "unattended".
    const property = PROPERTY_NEEDS_FOLLOWUP('p').replace(/\s+/g, ' ').trim();
    const customer = CUSTOMER_NEEDS_FOLLOWUP('c').replace(/\s+/g, ' ').trim();
    expect(customer).toContain(property);
  });

  it('reuses the lead fragment verbatim too', () => {
    const lead = CUSTOMER_LEAD_NEEDS_FOLLOWUP('c').replace(/\s+/g, ' ').trim();
    const customer = CUSTOMER_NEEDS_FOLLOWUP('c').replace(/\s+/g, ' ').trim();
    expect(customer).toContain(lead);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx jest -c apps/backend/jest.config.ts --rootDir apps/backend --testPathPatterns=followup-predicates`
Expected: PASS, 8 tests. (It passes immediately because Task 1 composed the
fragments rather than duplicating them — the test exists to keep it that way.)

- [ ] **Step 3: Add the query flag**

In `customer-query.dto.ts`, alongside the other optional filters:

```typescript
  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Only customers with at least one open site that has no pending follow-up, or a property-less lead with none.',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  needsFollowup?: boolean;
```

Match the file's existing import style for `IsBoolean` and `Transform`.

- [ ] **Step 4: Apply the filter**

In `customer-profile.repository.ts`, inside `findWithFilters` where the other
`query.*` conditions are applied to the customer query builder:

```typescript
    if (query.needsFollowup) {
      qb.andWhere(`(${CUSTOMER_NEEDS_FOLLOWUP('customer')})`);
    }
```

`findWithFilters` (line 622) builds on `createQueryBuilder('customer')`, so
`'customer'` is the correct alias — there are two other query builders in this
file using different aliases, so do not copy from those.

Add the import:

```typescript
import { CUSTOMER_NEEDS_FOLLOWUP } from './followup-predicates';
```

- [ ] **Step 5: Add the count to overview stats**

In `getOverviewStats()`, the customer row query currently selects two columns.
Add a third so the chip's count costs no extra request:

```typescript
    const [customerRow] = await this.repository.manager.query<
      { customers: string; customersThisMonth: string; needsFollowup: string }[]
    >(
      `
      SELECT COUNT(*)                                     AS "customers",
             COUNT(*) FILTER (WHERE c.created_at >= $1)   AS "customersThisMonth",
             COUNT(*) FILTER (WHERE ${CUSTOMER_NEEDS_FOLLOWUP('c')}) AS "needsFollowup"
      FROM customer_profiles c WHERE c.deleted_at IS NULL
      `,
      [monthStart],
    );
```

Add to the returned object:

```typescript
      needsFollowup: Number(customerRow?.needsFollowup ?? 0),
```

And to the `CustomerOverviewStats` interface at the top of the file:

```typescript
  /** Customers with at least one open site nobody owes an action. */
  needsFollowup: number;
```

- [ ] **Step 6: Verify the count against the database**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -tc "
SELECT count(*) FROM customer_profiles c
 WHERE c.deleted_at IS NULL
   AND (EXISTS (SELECT 1 FROM customer_properties p
                 WHERE p.customer_id=c.id AND p.deleted_at IS NULL
                   AND p.status NOT IN ('converted','lost')
                   AND NOT EXISTS (SELECT 1 FROM followups f WHERE f.property_id=p.id AND f.deleted_at IS NULL AND f.status='pending')
                   AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.property_id=p.id AND q.deleted_at IS NULL AND q.status='accepted'))
        OR (c.status IN ('lead','prospect')
            AND NOT EXISTS (SELECT 1 FROM customer_properties p WHERE p.customer_id=c.id AND p.deleted_at IS NULL)
            AND NOT EXISTS (SELECT 1 FROM followups f WHERE f.customer_id=c.id AND f.deleted_at IS NULL AND f.status='pending')));"
```

Expected on current data: **901**. Restart the backend and confirm
`GET /api/v1/customers/statistics/overview` returns the same number in its
`needsFollowup` field.

- [ ] **Step 7: Wire the web types**

In `use-customers.ts`, add to `CustomerOverviewStats`:

```typescript
  needsFollowup: number;
```

and to the customer list filter type used by `useCustomers`:

```typescript
  needsFollowup?: boolean;
```

- [ ] **Step 8: Add the chip row**

In `customer-list-page.tsx`, beside the existing `quickFilters` memo:

```typescript
  /**
   * A second chip row CrmTable already supports and nothing used until now.
   * Selecting it turns the main CRM screen into a worklist.
   */
  const needsFollowupFilters = useMemo<CrmQuickFilter[]>(
    () => [
      {
        key: 'needs-followup',
        label: 'Needs follow-up',
        count: overviewStats?.needsFollowup,
        tone: 'danger',
        dot: true,
      },
    ],
    [overviewStats?.needsFollowup],
  );

  const [needsFollowupActive, setNeedsFollowupActive] = useState(false);
```

Pass to `CrmTable`:

```tsx
        secondaryQuickFilters={needsFollowupFilters}
        activeSecondaryQuickFilter={needsFollowupActive ? 'needs-followup' : ''}
        onSecondaryQuickFilterChange={(key) => setNeedsFollowupActive(key === 'needs-followup')}
```

and include `needsFollowup: needsFollowupActive || undefined` in the filters
object passed to `useCustomers` (the call at line ~1282).

For the count, add `useCustomerOverviewStats()` to this page:

```typescript
import { useCustomerOverviewStats } from '../hooks/use-customers';
...
const { data: overviewStats } = useCustomerOverviewStats();
```

This costs no extra request: `CustomerKpiCards`, rendered by this same page,
already calls the identical hook, and TanStack Query dedupes by key.

- [ ] **Step 9: Verify in the browser**

Open `/customers`. Confirm a second chip row showing `Needs follow-up · 901`.
Click it and confirm the list narrows and the row count is consistent with the
chip. Click again to clear and confirm the full list returns.

- [ ] **Step 10: Commit**

```bash
npm run typecheck:backend && npm run typecheck:web
npx jest -c apps/backend/jest.config.ts --rootDir apps/backend
npx eslint --fix apps/backend/src/modules/customers apps/web/components/features/customers
npx prettier --write apps/backend/src/modules/customers apps/web/components/features/customers
git add -A
git commit -m "feat: filter the customer list to leads nobody is chasing

Fills the secondaryQuickFilters row CrmTable already supported and nothing
used. The count rides on the overview-stats request the list already makes, so
the chip costs no extra round trip.

Counts customers, while the /followups tab counts lead units — one customer
with three unattended sites is one row here and three there. Both read the same
predicate, so the definition cannot drift even though the totals differ."
```

---

## Task 4: Clickable "None scheduled" tile

**Files:**
- Modify: `apps/web/components/features/customers/customer-detail/kpi-strip.tsx`
- Modify: `apps/web/components/features/properties/property-detail/property-detail-page.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: `KpiItem.onClick?: () => void`

- [ ] **Step 1: Make the tile optionally interactive**

In `kpi-strip.tsx`, extend the type:

```typescript
export interface KpiItem {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warning' | 'error';
  /**
   * Makes the tile a button. Set only where there is something to fix — a tile
   * that merely reports a value should not look actionable.
   */
  onClick?: () => void;
}
```

In the render, when `item.onClick` is set, give the card a pointer cursor, a
hover surface and button semantics; otherwise leave it exactly as today:

```tsx
              <Card
                key={item.label}
                onClick={item.onClick}
                role={item.onClick ? 'button' : undefined}
                tabIndex={item.onClick ? 0 : undefined}
                onKeyDown={
                  item.onClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          item.onClick?.();
                        }
                      }
                    : undefined
                }
                sx={{
                  ...(item.onClick && {
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }),
                }}
              >
```

Merge that `sx` with whatever the card already has rather than replacing it.

- [ ] **Step 2: Wire it on the property page**

In `property-detail-page.tsx`, the `Next Follow-up` KPI item already computes
`nextFollowup` and `isLeadClosed`. Add the handler only in the state that needs
fixing:

```typescript
      onClick:
        !nextFollowup && !isLeadClosed ? () => setFollowupDrawerOpen(true) : undefined,
```

- [ ] **Step 3: Verify in the browser**

Open a property with no pending follow-up. The tile reads "None scheduled" in
red; clicking it opens the schedule drawer. Open one that has a follow-up: the
tile shows a date, has no pointer cursor, and clicking does nothing. Tab to the
red tile and press Enter — the drawer opens.

- [ ] **Step 4: Commit**

```bash
npm run typecheck:web && npx eslint --fix apps/web/components/features
npx prettier --write apps/web/components/features
git add -A
git commit -m "feat(web): make the empty next-follow-up tile schedule one

The tile already shouted the problem in red but was inert, so seeing it meant
going hunting for the button that fixes it. Only interactive when something is
actually missing — a tile reporting a date has nothing to fix."
```

---

## Task 5: Dot on unattended sites

**Files:**
- Modify: `apps/backend/src/modules/customers/repositories/customer-property.repository.ts`
- Modify: `apps/backend/src/modules/customers/services/customer-property.service.ts`
- Modify: `apps/backend/src/modules/customers/dto/customer-property-response.dto.ts`
- Modify: `apps/web/components/features/customers/hooks/use-customer-properties.ts`
- Modify: `apps/web/components/features/customers/components/customer-properties-expanded-row.tsx`

**Interfaces:**
- Consumes: nothing
- Consumes: `PROPERTY_NEEDS_FOLLOWUP(alias)` (Task 1)
- Produces: `CustomerPropertyRepository.findFollowupStateByPropertyIds(ids: string[]): Promise<Map<string, { nextAt: Date | null; needsFollowup: boolean }>>`, `CustomerPropertyResponseDto.nextFollowupAt?: Date`, `CustomerPropertyResponseDto.needsFollowup: boolean`

- [ ] **Step 1: Add the batch lookup**

In `customer-property.repository.ts`, alongside `findProjectIdsByPropertyIds`:

```typescript
  /**
   * Next pending followup per property, and whether the site needs one.
   *
   * `needsFollowup` is evaluated with the SHARED predicate rather than derived
   * on the client from a null date. Deriving it would omit the accepted-quote
   * exclusion, so a site with a won quote that is not yet converted would show
   * a red dot while being absent from both the chip and the gaps tab — three
   * such sites exist on current data. The dot must not disagree with the
   * numbers beside it.
   *
   * Batched like the other enrichments here; a per-row query would be N+1
   * across a customer's whole portfolio. "Next" stays derived — nothing is
   * stored on the property.
   */
  async findFollowupStateByPropertyIds(
    propertyIds: string[],
  ): Promise<Map<string, { nextAt: Date | null; needsFollowup: boolean }>> {
    if (propertyIds.length === 0) return new Map();

    const rows: Array<{ id: string; next_at: Date | null; needs_followup: boolean }> =
      await this.repository.manager.query(
        `
      SELECT p.id,
             (SELECT MIN(f.scheduled_at) FROM followups f
               WHERE f.property_id = p.id AND f.deleted_at IS NULL AND f.status = 'pending')
               AS next_at,
             (${PROPERTY_NEEDS_FOLLOWUP('p')}) AS needs_followup
        FROM customer_properties p
       WHERE p.id = ANY($1::uuid[])
      `,
        [propertyIds],
      );

    return new Map(
      rows.map((row) => [row.id, { nextAt: row.next_at, needsFollowup: row.needs_followup }]),
    );
  }
```

Add the import:

```typescript
import { PROPERTY_NEEDS_FOLLOWUP } from './followup-predicates';
```

- [ ] **Step 2: Enrich the response**

In `customer-property.service.ts`, both `findAll` and `findByCustomer` batch
their enrichments the same way. In each, after the existing map lookups:

```typescript
    const followupStateMap =
      await this.propertyRepository.findFollowupStateByPropertyIds(propertyIds);
```

and inside the `.map(...)`:

```typescript
        nextFollowupAt: followupStateMap.get(property.id)?.nextAt ?? undefined,
        needsFollowup: followupStateMap.get(property.id)?.needsFollowup ?? false,
```

Add `nextFollowupAt?: Date` and `needsFollowup?: boolean` to the
`PropertyWithQuoteInfo` type in that file.

- [ ] **Step 3: Expose it on the DTO**

In `customer-property-response.dto.ts`:

```typescript
  /**
   * Earliest pending followup, or absent when nothing is scheduled.
   *
   * This DTO is @Exclude()-by-default, so a field without @Expose() is silently
   * dropped from every response.
   */
  @Expose()
  @ApiPropertyOptional({ description: 'Earliest pending followup for this site' })
  nextFollowupAt?: Date;

  /**
   * True when this open site has nobody owing it an action.
   *
   * Computed server-side with the shared predicate so the dot cannot disagree
   * with the chip count or the gaps tab.
   */
  @Expose()
  @ApiProperty({ description: 'Open site with no pending followup' })
  needsFollowup!: boolean;
```

- [ ] **Step 4: Verify the field reaches the client**

Restart the backend, open a customer detail page in the browser, and check the
network response for `/customer-properties?customerId=…` contains
`nextFollowupAt` on at least one row. If every row lacks it, the `@Expose()` is
missing or the enrichment did not run — do not proceed until it is present.

- [ ] **Step 5: Add the field to the web type**

In `use-customer-properties.ts`, on `CustomerPropertyResponse`:

```typescript
  nextFollowupAt?: string | null;
  needsFollowup?: boolean;
```

- [ ] **Step 6: Render the dot**

In `customer-properties-expanded-row.tsx`, where the site name is rendered,
prepend the marker. Import `Tooltip` from `@mui/material` and `formatDate` from
`@/lib/utils` if not already imported:

```tsx
{(() => {
  // Server-computed: do NOT re-derive from status + nextFollowupAt here, or the
  // dot drifts from the chip on sites with an accepted-but-unconverted quote.
  if (!property.needsFollowup && !property.nextFollowupAt) return null;
  return property.nextFollowupAt ? (
    <Tooltip title={`Next follow-up ${formatDate(property.nextFollowupAt)}`}>
      <Box
        component="span"
        sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main', flexShrink: 0 }}
      />
    </Tooltip>
  ) : (
    <Tooltip title="No follow-up scheduled">
      <Box
        component="span"
        aria-label="No follow-up scheduled"
        sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main', flexShrink: 0 }}
      />
    </Tooltip>
  );
})()}
```

Wrap the dot and the name in a flex row (`className="flex items-center gap-1.5"`)
so the dot sits before the name without disturbing the grid track.

- [ ] **Step 7: Verify in the browser**

Open `/customers`, expand a customer with several sites. Confirm a red dot on
sites with nothing pending and a green one on sites that have a follow-up, with
the date in the tooltip. Confirm converted or lost sites show no dot at all. Then check one of the three
sites that has an accepted quote but is not yet converted (find one with the SQL
in Task 6 Step 2): it must show **no red dot**, matching its absence from the
chip and the gaps tab. A red dot there means the client is re-deriving instead
of reading `needsFollowup`.

- [ ] **Step 8: Commit**

```bash
npm run typecheck:backend && npm run typecheck:web
npx jest -c apps/backend/jest.config.ts --rootDir apps/backend
npx eslint --fix apps/backend/src/modules/customers apps/web/components/features/customers
npx prettier --write apps/backend/src/modules/customers apps/web/components/features/customers
git add -A
git commit -m "feat: mark unattended sites in the expanded customer row

A dot rather than a tenth column — that row already carries nine, and pushing
it wider is what forced the primary action off-screen on the /followups grid.
The eye catches a dot faster than it reads a date anyway.

Closed sites show nothing: nobody owes a converted or lost site a chase."
```

---

## Task 6: Verification pass

**Files:** none — verification only

- [ ] **Step 1: Run everything**

```bash
npm run typecheck:backend && npm run typecheck:web && npm run typecheck:libs
npx jest -c apps/backend/jest.config.ts --rootDir apps/backend
npx jest -c libs/shared/jest.config.ts --rootDir libs/shared
npm run lint
```

Expected: zero type errors, all suites pass, zero lint errors.

- [ ] **Step 2: Confirm the three consumers agree**

The whole point of Task 1. Compare distinct customers on both sides — not the
raw totals, which are meant to differ:

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -tc "
WITH gaps AS (
  SELECT p.customer_id FROM customer_properties p
   WHERE p.deleted_at IS NULL AND p.status NOT IN ('converted','lost')
     AND NOT EXISTS (SELECT 1 FROM followups f WHERE f.property_id=p.id AND f.deleted_at IS NULL AND f.status='pending')
     AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.property_id=p.id AND q.deleted_at IS NULL AND q.status='accepted')
  UNION
  SELECT c.id FROM customer_profiles c
   WHERE c.deleted_at IS NULL AND c.status IN ('lead','prospect')
     AND NOT EXISTS (SELECT 1 FROM customer_properties p WHERE p.customer_id=c.id AND p.deleted_at IS NULL)
     AND NOT EXISTS (SELECT 1 FROM followups f WHERE f.customer_id=c.id AND f.deleted_at IS NULL AND f.status='pending'))
SELECT count(DISTINCT customer_id) FROM gaps;"
```

This must equal the chip's count. If it does not, one consumer is no longer
reading the shared predicate.

- [ ] **Step 3: Walk the four surfaces**

1. **Sidebar** — badge shows overdue + today; red only when overdue; gone at zero.
2. **Customer list** — chip narrows the list; count matches Step 2.
3. **Property header** — red tile opens the drawer; a dated tile does not.
4. **Expanded row** — red dot on unattended open sites, green with a date on
   attended ones, nothing on converted or lost.

- [ ] **Step 4: Leave the database as you found it**

Any follow-up created while verifying should be removed, and any property whose
status was changed restored. List what was touched, then clean it up — verifying
a feature must not leave fake rows in the CRM.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "test: verify follow-up visibility across all four surfaces"
```

---

## Deferred — explicitly not in this plan

- **Sorting by most-overdue** — needs a new sort field and backend support; the chip already produces the filtered set.
- **A count on the site-row dot** — a dot answers yes/no; a number there is noise.
- **A second "Overdue" chip on the customer list** — doubles the counts computed on a page that already loads a lot.
- **The combined My Day dashboard** — still deferred, as in the parent spec.
