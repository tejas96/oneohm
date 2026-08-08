# Follow-up System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a scheduled follow-up the mandatory heartbeat of every open lead, so no customer or property can sit with nobody owing it an action.

**Architecture:** The `followups` table and its one-to-many relationships already exist and are correctly shaped — this work adds the *rule* on top. Completing a follow-up becomes a transaction that captures an outcome and creates the next one, unless the lead reaches a terminal state (quote accepted, converted, or marked lost). A `gaps` query catches anything that slips past the UI gates. The follow-up's assignee doubles as the lead's owner, so no `lead_owner` column is introduced.

**Tech Stack:** NestJS 11 · TypeORM · PostgreSQL 15 · Next.js 16 (App Router) · React 19 · MUI 6 · Tailwind · TanStack Query · Jest · Nx monorepo

**Design spec:** `docs/plans/2026-08-08-followup-system-design.md` — read §3 (rules) and §5 (interaction) before starting.

## Global Constraints

- **MUI is the primary design system** — all interactive components, typography, icons. **Tailwind is layout only** (flex, grid, spacing, responsive). Icons from `@mui/icons-material` exclusively, never `lucide-react` in new code. (`.cursorrules:31-33`)
- **No RBAC.** No role checks anywhere in this feature. "My follow-ups" is a default view, not a permission. Anyone may view, assign, and reassign anything.
- **Single-tenant.** No `organizationId` parameter on any new endpoint, DTO, query, or hook.
- **Assignee always defaults to the current logged-in user** and is always changeable.
- **Action endpoints are `POST :id/<action>`** — that is what the shared `ApiAction` decorator generates (`apps/backend/src/common/decorators/api-action.decorator.ts:56`).
- **Never add a name to a TypeORM `relations: [...]` array that is not a declared relation.** `apps/backend/src/common/relation-names.spec.ts` fails the build if you do.
- Status columns are `varchar`, not Postgres enums — adding an enum value is a code-only change.
- Prettier printWidth is enforced; run `npx prettier --write` on touched files before committing.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`).

**Build order note:** Step 0 of the design's build order (fixing the stale `'organization'` TypeORM relation that broke property follow-up creation) is **already complete** — see the working tree diff on `refactor/remove-organizations`. Do not redo it.

---

## File Structure

**Shared (`libs/shared/src/types/`)**
- Modify `enums/customer.enum.ts` — add `FollowupOutcome`, `PropertyStatus.LOST`, `CustomerStatus.LOST`
- Create `constants/followup-cadence.ts` — temperature → days, and the next-date helper

**Backend (`apps/backend/src/modules/customers/`)**
- Modify `entities/followup.entity.ts` — `outcome`, `completedAt`; drop the orphaned org comment block
- Modify `entities/customer-property.entity.ts` — `lostReason`, `lostAt`
- Modify `entities/customer-profile.entity.ts` — `lostReason`, `lostAt`
- Modify `repositories/followup.repository.ts` — rename `findByOrganization` → `findAll`; add `countPendingForUnit`, `findGaps`, `summaryCounts`, `cancelPendingFor`
- Modify `services/followup.service.ts` — new complete semantics, `reassign`, `reschedule`, `gaps`, `summary`
- Create `services/lead-closure.service.ts` — the one place that cancels pending follow-ups when a lead goes terminal
- Modify `controllers/followup.controller.ts` — new action routes
- Create `dto/complete-followup.dto.ts`, `dto/reassign-followup.dto.ts`, `dto/reschedule-followup.dto.ts`, `dto/followup-gap-response.dto.ts`, `dto/followup-summary-response.dto.ts`, `dto/mark-lost.dto.ts`
- Create `services/followup.service.spec.ts`, `repositories/followup.repository.spec.ts`

**Backend — terminal hooks**
- Modify `modules/quotes/services/quote.service.ts:568` — accepted → close chain
- Modify `modules/projects/services/project.service.ts:845` — converted → close chain
- Modify `modules/customers/services/customer-property.service.ts` — `markLost`
- Modify `modules/customers/services/customer.service.ts` — `markLost`

**Web (`apps/web/components/features/followups/`)** — new feature folder
- `hooks/followup-keys.ts`, `hooks/use-followups.ts`, `hooks/use-followup-summary.ts`, `hooks/use-followup-mutations.ts`, `hooks/index.ts`
- `components/followup-complete-dialog.tsx`
- `components/followup-list.tsx`
- `components/next-followup-chip.tsx`
- `components/followup-drawer.tsx` — replaces the two duplicated drawers
- `components/mark-lost-dialog.tsx`
- `components/followups-page.tsx`
- `constants.ts`, `index.ts`

**Web — call sites**
- Create `app/(dashboard)/followups/page.tsx`
- Modify `lib/config/routes.ts` — `ROUTES.FOLLOWUPS`
- Modify `lib/config/navigation.ts` — nav entry
- Delete `components/features/properties/property-detail/followup-drawer.tsx` and `components/features/customers/customer-detail/followup-drawer.tsx`
- Modify both `tabs/followups-tab.tsx` files, both `property-detail-page.tsx` / `customer-detail-page.tsx`, `properties/property-detail/mark-as-lost-dialog.tsx`
- Modify `components/features/onboarding/.../steps/step-review-assign.tsx` and `onboarding-wizard/index.tsx`

---

## Task 1: Shared enums and cadence constant

**Files:**
- Modify: `libs/shared/src/types/enums/customer.enum.ts`
- Create: `libs/shared/src/types/constants/followup-cadence.ts`
- Test: `libs/shared/src/types/constants/followup-cadence.spec.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `FollowupOutcome` enum, `PropertyStatus.LOST`, `CustomerStatus.LOST`, `LEAD_TEMPERATURE_CADENCE_DAYS: Record<LeadTemperature, number>`, `CUSTOMER_LEAD_CADENCE_DAYS: number`, `nextFollowupDate(from: Date, temperature?: LeadTemperature | null): Date`

- [ ] **Step 1: Write the failing test**

Create `libs/shared/src/types/constants/followup-cadence.spec.ts`:

```typescript
import { describe, it, expect } from '@jest/globals';

import { LeadTemperature } from '../enums/customer.enum';
import { nextFollowupDate, LEAD_TEMPERATURE_CADENCE_DAYS } from './followup-cadence';

describe('nextFollowupDate', () => {
  const from = new Date('2026-08-08T10:30:00.000Z');

  it('adds 3 days for HOT', () => {
    expect(nextFollowupDate(from, LeadTemperature.HOT).toISOString()).toBe(
      '2026-08-11T10:30:00.000Z',
    );
  });

  it('adds 10 days for WARM', () => {
    expect(nextFollowupDate(from, LeadTemperature.WARM).toISOString()).toBe(
      '2026-08-18T10:30:00.000Z',
    );
  });

  it('adds 15 days for COLD', () => {
    expect(nextFollowupDate(from, LeadTemperature.COLD).toISOString()).toBe(
      '2026-08-23T10:30:00.000Z',
    );
  });

  it('adds 3 days when there is no temperature (customer lead unit)', () => {
    expect(nextFollowupDate(from, null).toISOString()).toBe('2026-08-11T10:30:00.000Z');
    expect(nextFollowupDate(from, undefined).toISOString()).toBe('2026-08-11T10:30:00.000Z');
  });

  it('does not mutate the input date', () => {
    const original = new Date('2026-08-08T10:30:00.000Z');
    nextFollowupDate(original, LeadTemperature.HOT);
    expect(original.toISOString()).toBe('2026-08-08T10:30:00.000Z');
  });

  it('exposes the documented cadence table', () => {
    expect(LEAD_TEMPERATURE_CADENCE_DAYS).toEqual({ hot: 3, warm: 10, cold: 15 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c libs/shared/jest.config.ts --rootDir libs/shared --testPathPatterns=followup-cadence`
Expected: FAIL — `Cannot find module './followup-cadence'`

If `libs/shared` has no jest config, run instead: `npx jest --testPathPatterns=followup-cadence` from the repo root.

- [ ] **Step 3: Add the enum values**

In `libs/shared/src/types/enums/customer.enum.ts`, add `LOST` to `CustomerStatus`:

```typescript
export enum CustomerStatus {
  LEAD = 'lead',
  PROSPECT = 'prospect',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOST = 'lost', // Enquiry died before any property was created
}
```

Add `LOST` to `PropertyStatus`:

```typescript
export enum PropertyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_VERIFICATION = 'pending_verification',
  CONVERTED = 'converted',
  LOST = 'lost',
}
```

Add the new outcome enum after `FollowupPriority`:

```typescript
/**
 * Followup Outcome Enum
 * What actually happened on a follow-up, captured at completion.
 *
 * `OTHER` requires notes. Without a catch-all users pick a wrong-but-close
 * value to get past the dialog, which corrupts the data more quietly than an
 * honest "other". If OTHER exceeds ~10% of completions, read those notes and
 * promote a real value here.
 */
export enum FollowupOutcome {
  NOT_REACHABLE = 'not_reachable',
  CALL_BACK_LATER = 'call_back_later',
  INTERESTED = 'interested',
  SITE_VISIT_DONE = 'site_visit_done',
  DOCUMENTS_PENDING = 'documents_pending',
  NEGOTIATING = 'negotiating',
  NOT_INTERESTED = 'not_interested',
  OTHER = 'other',
}
```

- [ ] **Step 4: Write the cadence constant**

Create `libs/shared/src/types/constants/followup-cadence.ts`:

```typescript
import { LeadTemperature } from '../enums/customer.enum';

/**
 * How many days ahead the next follow-up is prefilled, by lead temperature.
 *
 * Prefill only — always editable, never enforced. Changing a property's
 * temperature does not move follow-ups that are already scheduled.
 */
export const LEAD_TEMPERATURE_CADENCE_DAYS: Record<LeadTemperature, number> = {
  [LeadTemperature.HOT]: 3,
  [LeadTemperature.WARM]: 10,
  [LeadTemperature.COLD]: 15,
};

/**
 * A customer with no property yet has no temperature. It is a fresh enquiry and
 * the goal is to capture a site quickly, so it is chased on the HOT rhythm.
 */
export const CUSTOMER_LEAD_CADENCE_DAYS = 3;

/** Returns a new Date; never mutates the input. */
export function nextFollowupDate(from: Date, temperature?: LeadTemperature | null): Date {
  const days = temperature
    ? LEAD_TEMPERATURE_CADENCE_DAYS[temperature]
    : CUSTOMER_LEAD_CADENCE_DAYS;
  const next = new Date(from.getTime());
  next.setDate(next.getDate() + days);
  return next;
}
```

- [ ] **Step 5: Export from the barrel**

Add to `libs/shared/src/types/index.ts` (match the existing export style in that file):

```typescript
export * from './constants/followup-cadence';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest --testPathPatterns=followup-cadence`
Expected: PASS, 6 tests

- [ ] **Step 7: Build shared and typecheck**

Run: `npx nx build shared && npm run typecheck:backend && npm run typecheck:web`
Expected: all pass. `libs/shared` is consumed as `@tejas96/shared/types`, so it must be rebuilt before the apps see the new exports.

- [ ] **Step 8: Commit**

```bash
git add libs/shared/src/types/enums/customer.enum.ts libs/shared/src/types/constants/followup-cadence.ts libs/shared/src/types/constants/followup-cadence.spec.ts libs/shared/src/types/index.ts
git commit -m "feat(shared): add FollowupOutcome, LOST statuses and lead cadence constants"
```

---

## Task 2: Schema migration and entity columns

**Files:**
- Create: `apps/backend/src/database/migrations/1853000000000-AddFollowupOutcomeAndLostTracking.ts`
- Modify: `apps/backend/src/modules/customers/entities/followup.entity.ts`
- Modify: `apps/backend/src/modules/customers/entities/customer-property.entity.ts`
- Modify: `apps/backend/src/modules/customers/entities/customer-profile.entity.ts`

**Interfaces:**
- Consumes: `FollowupOutcome` (Task 1)
- Produces: `FollowupEntity.outcome?: FollowupOutcome`, `FollowupEntity.completedAt?: Date`, `CustomerPropertyEntity.lostReason?: string`, `CustomerPropertyEntity.lostAt?: Date`, `CustomerProfileEntity.lostReason?: string`, `CustomerProfileEntity.lostAt?: Date`

- [ ] **Step 1: Write the migration**

Create `apps/backend/src/database/migrations/1853000000000-AddFollowupOutcomeAndLostTracking.ts`:

```typescript
import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * AddFollowupOutcomeAndLostTracking — makes a follow-up the heartbeat of a lead.
 *
 * Completing a follow-up now records what happened (`outcome`, `completed_at`)
 * and a lead can be explicitly closed as lost with a reason, at property level
 * or — for an enquiry that never got a site — at customer level.
 *
 * Purely additive and nullable, so existing rows are untouched and nothing
 * changes behaviour until the new complete flow ships. The `lost` status values
 * need no DDL: status columns are varchar, not Postgres enums.
 */
export class AddFollowupOutcomeAndLostTracking1853000000000 implements MigrationInterface {
  name = 'AddFollowupOutcomeAndLostTracking1853000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE followups
        ADD COLUMN IF NOT EXISTS outcome VARCHAR(30),
        ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ
    `);

    await queryRunner.query(`
      ALTER TABLE customer_properties
        ADD COLUMN IF NOT EXISTS lost_reason TEXT,
        ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ
    `);

    await queryRunner.query(`
      ALTER TABLE customer_profiles
        ADD COLUMN IF NOT EXISTS lost_reason TEXT,
        ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ
    `);

    // Backfill completed_at for rows already completed, so "done today" counts
    // and any future reporting are not silently missing history. updated_at is
    // the closest available proxy for when the completion happened.
    await queryRunner.query(`
      UPDATE followups
         SET completed_at = updated_at
       WHERE status = 'completed'
         AND completed_at IS NULL
    `);

    // The gaps query is a NOT EXISTS over pending follow-ups per lead unit.
    // Without these it degrades to a sequential scan of the whole table.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_followups_property_status
        ON followups (property_id, status)
        WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_followups_customer_status
        ON followups (customer_id, status)
        WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_properties_status
        ON customer_properties (status)
        WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_customer_properties_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_followups_customer_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_followups_property_status`);
    await queryRunner.query(`
      ALTER TABLE customer_profiles
        DROP COLUMN IF EXISTS lost_at,
        DROP COLUMN IF EXISTS lost_reason
    `);
    await queryRunner.query(`
      ALTER TABLE customer_properties
        DROP COLUMN IF EXISTS lost_at,
        DROP COLUMN IF EXISTS lost_reason
    `);
    await queryRunner.query(`
      ALTER TABLE followups
        DROP COLUMN IF EXISTS completed_at,
        DROP COLUMN IF EXISTS outcome
    `);
  }
}
```

- [ ] **Step 2: Add the columns to `FollowupEntity`**

In `apps/backend/src/modules/customers/entities/followup.entity.ts`:

Delete the orphaned comment block left by the org removal:

```typescript
  // ==================== ORGANIZATION ====================
```

Add `FollowupOutcome` to the existing import from `@tejas96/shared/types`, then add these two columns immediately after the `notes` column:

```typescript
  // ==================== COMPLETION ====================
  /** What happened. Set when the followup is completed; null while pending. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  outcome?: FollowupOutcome;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;
```

- [ ] **Step 3: Add lost tracking to both lead-unit entities**

In `apps/backend/src/modules/customers/entities/customer-property.entity.ts`, after the `status` column:

```typescript
  // ==================== LOST TRACKING ====================
  /** Set together with status = LOST. Captured at the moment someone knows why. */
  @Column({ name: 'lost_reason', type: 'text', nullable: true })
  lostReason?: string;

  @Column({ name: 'lost_at', type: 'timestamptz', nullable: true })
  lostAt?: Date;
```

Add the identical block to `apps/backend/src/modules/customers/entities/customer-profile.entity.ts` after its `status` column.

- [ ] **Step 4: Run the migration**

Run: `npx nx run backend:migration:run` (check `apps/backend/project.json` for the exact target name; fall back to `npx typeorm-ts-node-commonjs migration:run -d apps/backend/src/database/ormconfig.ts`)
Expected: `AddFollowupOutcomeAndLostTracking1853000000000` reported as applied.

- [ ] **Step 5: Verify the columns and indexes landed**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "\d followups" | grep -E "outcome|completed_at"
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "\di idx_followups_property_status idx_followups_customer_status idx_customer_properties_status"
```

Expected: both columns listed; three indexes listed.

- [ ] **Step 6: Typecheck and run the relation guard**

Run: `npm run typecheck:backend && npx jest -c apps/backend/jest.config.ts --rootDir apps/backend --testPathPatterns="relation-names|orderby"`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/database/migrations/1853000000000-AddFollowupOutcomeAndLostTracking.ts apps/backend/src/modules/customers/entities/
git commit -m "feat(followups): add outcome, completed_at and lost tracking columns"
```

---

## Task 3: Repository queries — gaps, summary, pending counts

**Files:**
- Modify: `apps/backend/src/modules/customers/repositories/followup.repository.ts`
- Test: `apps/backend/src/modules/customers/repositories/followup.repository.spec.ts` (create)

**Interfaces:**
- Consumes: `FollowupEntity` (Task 2)
- Produces:
  - `findAll(page?: number, limit?: number): Promise<[FollowupEntity[], number]>` — renamed from `findByOrganization`
  - `countPendingForUnit(customerId: string, propertyId: string | null, excludeId?: string): Promise<number>`
  - `findGaps(): Promise<FollowupGapRow[]>` where `interface FollowupGapRow { kind: 'customer' | 'property'; customerId: string; propertyId: string | null; name: string; leadTemperature: string | null; attributedUserId: string | null }`
  - `summaryCounts(userId: string | null): Promise<{ overdue: number; today: number; upcoming: number }>`
  - `cancelPendingFor(customerId: string, propertyId: string | null, updatedBy: string, manager?: EntityManager): Promise<number>`

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/customers/repositories/followup.repository.spec.ts`:

```typescript
/**
 * FollowupRepository unit tests
 *
 * The gaps and pending-count queries are the enforcement backbone: if they are
 * wrong, leads silently vanish from the Needs follow-up bucket. These pin the
 * SQL shape rather than the results, which is all a mocked repository can honestly assert.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FollowupStatus } from '@tejas96/shared/types';

import { FollowupRepository } from './followup.repository';
import { FollowupEntity } from '../entities/followup.entity';

interface MockFn {
  (...args: unknown[]): unknown;
  mockReturnValue: (v: unknown) => MockFn;
  mockResolvedValue: (v: unknown) => MockFn;
  mock: { calls: unknown[][] };
}

const mockFn = (): MockFn => jest.fn() as unknown as MockFn;

describe('FollowupRepository', () => {
  let repo: FollowupRepository;
  let count: MockFn;
  let query: MockFn;

  beforeEach(async () => {
    count = mockFn().mockResolvedValue(0);
    query = mockFn().mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        FollowupRepository,
        {
          provide: getRepositoryToken(FollowupEntity),
          useValue: {
            count,
            manager: { query },
            query,
          },
        },
      ],
    }).compile();

    repo = moduleRef.get(FollowupRepository);
  });

  describe('countPendingForUnit', () => {
    it('counts only pending, undeleted followups for a property unit', async () => {
      await repo.countPendingForUnit('cust-1', 'prop-1');

      const where = (count.mock.calls[0] as [{ where: Record<string, unknown> }])[0].where;
      expect(where.customerId).toBe('cust-1');
      expect(where.propertyId).toBe('prop-1');
      expect(where.status).toBe(FollowupStatus.PENDING);
      expect(where.deletedAt).toBeDefined();
    });

    it('excludes a given followup id so a completing row does not count itself', async () => {
      await repo.countPendingForUnit('cust-1', 'prop-1', 'followup-9');

      const where = (count.mock.calls[0] as [{ where: Record<string, unknown> }])[0].where;
      expect(where.id).toBeDefined();
    });
  });

  describe('findGaps', () => {
    it('runs a single query returning both customer and property lead units', async () => {
      query.mockResolvedValue([]);
      await repo.findGaps();

      const sql = String((query.mock.calls[0] as [string])[0]);
      expect(sql).toContain('NOT EXISTS');
      expect(sql).toContain('customer_properties');
      expect(sql).toContain('customer_profiles');
      // Terminal states must be excluded or closed leads nag forever.
      expect(sql).toContain('converted');
      expect(sql).toContain('lost');
      // A property whose quote was accepted is closed too.
      expect(sql).toContain('quotes');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c apps/backend/jest.config.ts --rootDir apps/backend --testPathPatterns=followup.repository`
Expected: FAIL — `repo.countPendingForUnit is not a function`

- [ ] **Step 3: Implement the repository methods**

In `apps/backend/src/modules/customers/repositories/followup.repository.ts`:

Rename `findByOrganization` to `findAll` and fix its doc comment (it currently says "for an organization"). Also fix the stale org wording on the comments at lines 16, 118 and 221.

Add the exported row type at the top of the file, after the imports:

```typescript
export interface FollowupGapRow {
  kind: 'customer' | 'property';
  customerId: string;
  propertyId: string | null;
  name: string;
  leadTemperature: string | null;
  attributedUserId: string | null;
}
```

Add these methods to the class:

```typescript
  /**
   * How many pending followups a lead unit still has.
   *
   * `excludeId` lets a followup that is mid-completion avoid counting itself,
   * which is how the service decides whether a next followup is mandatory.
   */
  async countPendingForUnit(
    customerId: string,
    propertyId: string | null,
    excludeId?: string,
  ): Promise<number> {
    return this.repository.count({
      where: {
        customerId,
        propertyId: propertyId === null ? IsNull() : propertyId,
        status: FollowupStatus.PENDING,
        deletedAt: IsNull(),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });
  }

  /**
   * Open lead units with zero pending followups.
   *
   * Two branches unioned: properties that are still open, and customers who
   * have no property at all. Attribution falls back from the most recently
   * completed followup's assignee to whoever created the record, so every gap
   * has a name against it.
   */
  async findGaps(): Promise<FollowupGapRow[]> {
    return this.repository.manager.query(`
      SELECT 'property' AS kind,
             p.customer_id AS "customerId",
             p.id          AS "propertyId",
             COALESCE(NULLIF(p.property_name, ''), p.city, 'Unnamed property') AS name,
             p.lead_temperature AS "leadTemperature",
             COALESCE(
               (SELECT f.assigned_to_user_id
                  FROM followups f
                 WHERE f.property_id = p.id
                   AND f.deleted_at IS NULL
                   AND f.status = 'completed'
                 ORDER BY f.completed_at DESC NULLS LAST
                 LIMIT 1),
               p.created_by
             ) AS "attributedUserId"
        FROM customer_properties p
       WHERE p.deleted_at IS NULL
         AND p.status NOT IN ('converted', 'lost')
         AND NOT EXISTS (
               SELECT 1 FROM followups f
                WHERE f.property_id = p.id
                  AND f.deleted_at IS NULL
                  AND f.status = 'pending')
         AND NOT EXISTS (
               SELECT 1 FROM quotes q
                WHERE q.property_id = p.id
                  AND q.deleted_at IS NULL
                  AND q.status = 'accepted')

      UNION ALL

      SELECT 'customer' AS kind,
             c.id  AS "customerId",
             NULL  AS "propertyId",
             TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) AS name,
             NULL  AS "leadTemperature",
             COALESCE(
               (SELECT f.assigned_to_user_id
                  FROM followups f
                 WHERE f.customer_id = c.id
                   AND f.deleted_at IS NULL
                   AND f.status = 'completed'
                 ORDER BY f.completed_at DESC NULLS LAST
                 LIMIT 1),
               c.created_by
             ) AS "attributedUserId"
        FROM customer_profiles c
       WHERE c.deleted_at IS NULL
         AND c.status IN ('lead', 'prospect')
         AND NOT EXISTS (
               SELECT 1 FROM customer_properties p
                WHERE p.customer_id = c.id
                  AND p.deleted_at IS NULL)
         AND NOT EXISTS (
               SELECT 1 FROM followups f
                WHERE f.customer_id = c.id
                  AND f.deleted_at IS NULL
                  AND f.status = 'pending')
    `);
  }

  /**
   * Counts for the nav badge. `userId` null means everyone's followups.
   */
  async summaryCounts(userId: string | null): Promise<{
    overdue: number;
    today: number;
    upcoming: number;
  }> {
    const rows: Array<{ overdue: string; today: string; upcoming: string }> =
      await this.repository.manager.query(
        `
      SELECT
        COUNT(*) FILTER (WHERE f.scheduled_at < date_trunc('day', now()))        AS overdue,
        COUNT(*) FILTER (WHERE f.scheduled_at >= date_trunc('day', now())
                           AND f.scheduled_at <  date_trunc('day', now()) + interval '1 day') AS today,
        COUNT(*) FILTER (WHERE f.scheduled_at >= date_trunc('day', now()) + interval '1 day') AS upcoming
      FROM followups f
      WHERE f.deleted_at IS NULL
        AND f.status = 'pending'
        AND ($1::uuid IS NULL OR f.assigned_to_user_id = $1::uuid)
    `,
        [userId],
      );

    const row = rows[0];
    return {
      overdue: Number(row?.overdue ?? 0),
      today: Number(row?.today ?? 0),
      upcoming: Number(row?.upcoming ?? 0),
    };
  }

  /**
   * Cancels every pending followup on a lead unit. Called when the unit reaches
   * a terminal state, so a won or dead deal stops nagging without a second click.
   */
  async cancelPendingFor(
    customerId: string,
    propertyId: string | null,
    updatedBy: string,
    manager?: EntityManager,
  ): Promise<number> {
    const repo = manager ? manager.getRepository(FollowupEntity) : this.repository;
    const result = await repo
      .createQueryBuilder()
      .update(FollowupEntity)
      .set({ status: FollowupStatus.CANCELLED, updatedBy })
      .where('customer_id = :customerId', { customerId })
      .andWhere(propertyId === null ? 'property_id IS NULL' : 'property_id = :propertyId', {
        propertyId,
      })
      .andWhere('status = :pending', { pending: FollowupStatus.PENDING })
      .andWhere('deleted_at IS NULL')
      .execute();

    return result.affected ?? 0;
  }
```

Add `Not` and `EntityManager` to the existing `typeorm` import.

- [ ] **Step 4: Update the one caller of the renamed method**

In `apps/backend/src/modules/customers/services/followup.service.ts`, `findAll` currently calls `this.followupRepository.findByOrganization(page, limit)`. Change it to `this.followupRepository.findAll(page, limit)` and fix its `Find all followups for an organization` doc comment to `Find all followups`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest -c apps/backend/jest.config.ts --rootDir apps/backend --testPathPatterns=followup.repository`
Expected: PASS, 3 tests

- [ ] **Step 6: Verify the gaps SQL against the real database**

The mocked test pins the SQL shape but cannot prove Postgres accepts it. Run it for real:

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "
SELECT count(*) FROM customer_properties p
 WHERE p.deleted_at IS NULL
   AND p.status NOT IN ('converted','lost')
   AND NOT EXISTS (SELECT 1 FROM followups f WHERE f.property_id = p.id AND f.deleted_at IS NULL AND f.status='pending')
   AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.property_id = p.id AND q.deleted_at IS NULL AND q.status='accepted');"
```

Expected: a number, no SQL error. On current data this should be close to the total property count, since no follow-ups exist yet.

- [ ] **Step 7: Typecheck and commit**

```bash
npm run typecheck:backend
npx prettier --write apps/backend/src/modules/customers/repositories/followup.repository.ts apps/backend/src/modules/customers/repositories/followup.repository.spec.ts
git add apps/backend/src/modules/customers/repositories/ apps/backend/src/modules/customers/services/followup.service.ts
git commit -m "feat(followups): add gaps, summary and pending-count queries"
```

---

## Task 4: Complete-with-outcome service logic

**Files:**
- Modify: `apps/backend/src/modules/customers/services/followup.service.ts`
- Create: `apps/backend/src/modules/customers/dto/complete-followup.dto.ts`
- Test: `apps/backend/src/modules/customers/services/followup.service.spec.ts` (create)

**Interfaces:**
- Consumes: `countPendingForUnit`, `cancelPendingFor` (Task 3), `FollowupOutcome` (Task 1)
- Produces: `FollowupService.complete(id: string, dto: CompleteFollowupDto, userId: string): Promise<FollowupEntity>` — returns the *completed* followup, and `CompleteFollowupDto { outcome: FollowupOutcome; notes?: string; next?: NextFollowupDto; terminal?: 'accepted' | 'lost'; lostReason?: string }`

- [ ] **Step 1: Write the DTO**

Create `apps/backend/src/modules/customers/dto/complete-followup.dto.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FollowupOutcome, FollowupPriority, FollowupType } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class NextFollowupDto {
  @ApiProperty({ example: '2026-08-11T10:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  assignedToUserId!: string;

  @ApiProperty({ example: 'Follow up on discount request' })
  @IsString()
  @MaxLength(255)
  subject!: string;

  @ApiPropertyOptional({ enum: FollowupType, default: FollowupType.TASK })
  @IsOptional()
  @IsEnum(FollowupType)
  type?: FollowupType;

  @ApiPropertyOptional({ enum: FollowupPriority, default: FollowupPriority.NORMAL })
  @IsOptional()
  @IsEnum(FollowupPriority)
  priority?: FollowupPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompleteFollowupDto {
  @ApiProperty({ enum: FollowupOutcome })
  @IsEnum(FollowupOutcome)
  outcome!: FollowupOutcome;

  @ApiPropertyOptional({ description: 'Required when outcome is "other".' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    type: NextFollowupDto,
    description:
      'Required when this is the last pending followup on the lead unit, unless terminal is set.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NextFollowupDto)
  next?: NextFollowupDto;

  @ApiPropertyOptional({
    enum: ['accepted', 'lost'],
    description: 'Closes the chain instead of scheduling a next followup.',
  })
  @IsOptional()
  @IsEnum(['accepted', 'lost'])
  terminal?: 'accepted' | 'lost';

  @ApiPropertyOptional({ description: 'Required when terminal is "lost".' })
  @IsOptional()
  @IsString()
  lostReason?: string;
}
```

- [ ] **Step 2: Write the failing test**

Create `apps/backend/src/modules/customers/services/followup.service.spec.ts`:

```typescript
/**
 * FollowupService.complete — the enforcement point.
 *
 * The one rule is "every open lead unit keeps at least one pending followup".
 * These tests pin the exact condition under which a next followup is mandatory,
 * because getting it wrong either lets leads go dark or nags people for a
 * second followup they do not need.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FollowupOutcome, FollowupStatus } from '@tejas96/shared/types';

import { FollowupService } from './followup.service';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerPropertyRepository } from '../repositories/customer-property.repository';
import { FollowupRepository } from '../repositories/followup.repository';
import { UserRoleRepository } from '../../users/repositories/user-role.repository';

const anyFn = (): any => jest.fn();

const PENDING_FOLLOWUP = {
  id: 'followup-1',
  customerId: 'cust-1',
  propertyId: 'prop-1',
  status: FollowupStatus.PENDING,
};

const VALID_NEXT = {
  scheduledAt: '2026-08-11T10:00:00.000Z',
  assignedToUserId: '11111111-1111-1111-1111-111111111111',
  subject: 'Call back',
};

describe('FollowupService.complete', () => {
  let service: FollowupService;
  let followupRepo: any;
  let propertyRepo: any;

  beforeEach(async () => {
    followupRepo = {
      findById: anyFn().mockResolvedValue(PENDING_FOLLOWUP),
      update: anyFn().mockResolvedValue({ ...PENDING_FOLLOWUP, status: FollowupStatus.COMPLETED }),
      create: anyFn().mockResolvedValue({ id: 'followup-2' }),
      countPendingForUnit: anyFn().mockResolvedValue(0),
      cancelPendingFor: anyFn().mockResolvedValue(1),
      repository: { manager: { transaction: async (cb: any) => cb({}) } },
    };
    propertyRepo = {
      findById: anyFn().mockResolvedValue({ id: 'prop-1', customerId: 'cust-1' }),
      markLost: anyFn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FollowupService,
        { provide: FollowupRepository, useValue: followupRepo },
        { provide: CustomerProfileRepository, useValue: { findById: anyFn(), markLost: anyFn() } },
        { provide: CustomerPropertyRepository, useValue: propertyRepo },
        { provide: UserRoleRepository, useValue: { findByUserAndOrganization: anyFn().mockResolvedValue([{ id: 'r' }]) } },
      ],
    }).compile();

    service = moduleRef.get(FollowupService);
  });

  it('rejects completion with no next followup when it is the last pending one', async () => {
    followupRepo.countPendingForUnit.mockResolvedValue(0);

    await expect(
      service.complete('followup-1', { outcome: FollowupOutcome.INTERESTED }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows completion with no next followup when siblings are still pending', async () => {
    followupRepo.countPendingForUnit.mockResolvedValue(2);

    await expect(
      service.complete('followup-1', { outcome: FollowupOutcome.INTERESTED }, 'user-1'),
    ).resolves.toBeDefined();

    expect(followupRepo.create.mock.calls.length).toBe(0);
  });

  it('creates exactly one next followup when next is supplied', async () => {
    followupRepo.countPendingForUnit.mockResolvedValue(0);

    await service.complete(
      'followup-1',
      { outcome: FollowupOutcome.NEGOTIATING, next: VALID_NEXT },
      'user-1',
    );

    expect(followupRepo.create.mock.calls.length).toBe(1);
    const created = followupRepo.create.mock.calls[0][0];
    expect(created.customerId).toBe('cust-1');
    expect(created.propertyId).toBe('prop-1');
    expect(created.status).toBe(FollowupStatus.PENDING);
  });

  it('rejects outcome "other" without notes', async () => {
    followupRepo.countPendingForUnit.mockResolvedValue(2);

    await expect(
      service.complete('followup-1', { outcome: FollowupOutcome.OTHER }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts outcome "other" with notes', async () => {
    followupRepo.countPendingForUnit.mockResolvedValue(2);

    await expect(
      service.complete(
        'followup-1',
        { outcome: FollowupOutcome.OTHER, notes: 'Customer relocating' },
        'user-1',
      ),
    ).resolves.toBeDefined();
  });

  it('terminal "accepted" cancels pending followups and creates none', async () => {
    followupRepo.countPendingForUnit.mockResolvedValue(0);

    await service.complete(
      'followup-1',
      { outcome: FollowupOutcome.INTERESTED, terminal: 'accepted' },
      'user-1',
    );

    expect(followupRepo.cancelPendingFor.mock.calls.length).toBe(1);
    expect(followupRepo.create.mock.calls.length).toBe(0);
  });

  it('terminal "lost" requires a reason', async () => {
    followupRepo.countPendingForUnit.mockResolvedValue(0);

    await expect(
      service.complete(
        'followup-1',
        { outcome: FollowupOutcome.NOT_INTERESTED, terminal: 'lost' },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to complete an already-completed followup', async () => {
    followupRepo.findById.mockResolvedValue({
      ...PENDING_FOLLOWUP,
      status: FollowupStatus.COMPLETED,
    });

    await expect(
      service.complete('followup-1', { outcome: FollowupOutcome.INTERESTED }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest -c apps/backend/jest.config.ts --rootDir apps/backend --testPathPatterns=followup.service`
Expected: FAIL — `service.complete is not a function`

- [ ] **Step 4: Implement `complete`**

In `apps/backend/src/modules/customers/services/followup.service.ts`, add the imports (`FollowupOutcome`, `CompleteFollowupDto`) and this method. Leave the existing `markAsCompleted` in place for now — Task 7 removes its route.

```typescript
  /**
   * Complete a followup and, unless the lead is closing, open the next one.
   *
   * The next followup is mandatory only when this is the LAST pending followup
   * on the lead unit — that is precisely when completing it would leave the lead
   * with nobody owing it an action. With siblings still pending the rule is
   * already satisfied, and demanding another would make parallel chases absurd.
   *
   * The check is made server-side against the database; the client's opinion
   * about how many siblings exist is never trusted.
   */
  async complete(
    id: string,
    dto: CompleteFollowupDto,
    userId: string,
  ): Promise<FollowupEntity> {
    const followup = await this.findById(id);

    if (followup.status !== FollowupStatus.PENDING) {
      throw new BadRequestException(`Followup is already ${followup.status}`);
    }

    if (dto.outcome === FollowupOutcome.OTHER && !dto.notes?.trim()) {
      throw new BadRequestException('Notes are required when the outcome is "other"');
    }

    if (dto.terminal === 'lost' && !dto.lostReason?.trim()) {
      throw new BadRequestException('A reason is required when marking a lead lost');
    }

    const propertyId = followup.propertyId ?? null;

    if (!dto.terminal && !dto.next) {
      const siblings = await this.followupRepository.countPendingForUnit(
        followup.customerId,
        propertyId,
        id,
      );
      if (siblings === 0) {
        throw new BadRequestException(
          'This is the only open follow-up. Schedule the next one, or close the lead as won or lost.',
        );
      }
    }

    return this.followupRepository.repository.manager.transaction(async (manager) => {
      const completed = await this.followupRepository.update(
        id,
        {
          status: FollowupStatus.COMPLETED,
          outcome: dto.outcome,
          completedAt: new Date(),
          notes: dto.notes?.trim() || followup.notes,
          updatedBy: userId,
        },
        manager,
      );
      if (!completed) {
        throw new NotFoundException('Followup not found');
      }

      if (dto.terminal) {
        await this.followupRepository.cancelPendingFor(
          followup.customerId,
          propertyId,
          userId,
          manager,
        );
        if (dto.terminal === 'lost') {
          if (propertyId) {
            await this.propertyRepository.markLost(propertyId, dto.lostReason!, userId, manager);
          } else {
            await this.customerRepository.markLost(
              followup.customerId,
              dto.lostReason!,
              userId,
              manager,
            );
          }
        }
        return completed;
      }

      if (dto.next) {
        await this.followupRepository.create(
          {
            customerId: followup.customerId,
            propertyId: propertyId ?? undefined,
            type: dto.next.type ?? FollowupType.TASK,
            subject: dto.next.subject.trim(),
            scheduledAt: new Date(dto.next.scheduledAt),
            assignedToUserId: dto.next.assignedToUserId,
            priority: dto.next.priority ?? FollowupPriority.NORMAL,
            notes: dto.next.notes,
            status: FollowupStatus.PENDING,
            createdBy: userId,
          },
          manager,
        );
      }

      return completed;
    });
  }
```

- [ ] **Step 5: Add `manager` support to the repository methods this uses**

`FollowupRepository.update` and `.create` must accept an optional `EntityManager` so the transaction is real rather than decorative. Update both signatures:

```typescript
  async create(data: Partial<FollowupEntity>, manager?: EntityManager): Promise<FollowupEntity> {
    const repo = manager ? manager.getRepository(FollowupEntity) : this.repository;
    const followup = repo.create(data);
    return repo.save(followup);
  }

  async update(
    id: string,
    updates: Partial<FollowupEntity>,
    manager?: EntityManager,
  ): Promise<FollowupEntity | null> {
    const repo = manager ? manager.getRepository(FollowupEntity) : this.repository;
    await repo.update({ id, deletedAt: IsNull() }, updates);
    return repo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['customer', 'property', 'assignedToUser'],
    });
  }
```

Keep the existing behaviour identical when `manager` is omitted, so current callers are unaffected.

- [ ] **Step 6: Add `markLost` to both lead-unit repositories**

In `apps/backend/src/modules/customers/repositories/customer-property.repository.ts`:

```typescript
  async markLost(
    id: string,
    reason: string,
    updatedBy: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(CustomerPropertyEntity) : this.repository;
    await repo.update(id, {
      status: PropertyStatus.LOST,
      lostReason: reason,
      lostAt: new Date(),
      updatedBy,
    });
  }
```

Add the equivalent to `customer-profile.repository.ts` using `CustomerStatus.LOST` and `CustomerProfileEntity`.

- [ ] **Step 7: Run test to verify it passes**

Run: `npx jest -c apps/backend/jest.config.ts --rootDir apps/backend --testPathPatterns=followup.service`
Expected: PASS, 8 tests

- [ ] **Step 8: Typecheck and commit**

```bash
npm run typecheck:backend
npx prettier --write apps/backend/src/modules/customers/
git add apps/backend/src/modules/customers/
git commit -m "feat(followups): complete captures outcome and opens the next followup"
```

---

## Task 5: Reassign, reschedule and read endpoints

**Files:**
- Modify: `apps/backend/src/modules/customers/services/followup.service.ts`
- Create: `apps/backend/src/modules/customers/dto/reassign-followup.dto.ts`
- Create: `apps/backend/src/modules/customers/dto/reschedule-followup.dto.ts`
- Modify: `apps/backend/src/modules/customers/services/followup.service.spec.ts`

**Interfaces:**
- Consumes: `FollowupRepository` (Task 3)
- Produces: `reassign(id, assignedToUserId, userId)`, `reassignMany(ids, assignedToUserId, userId)`, `reschedule(id, scheduledAt, userId)`, `gaps()`, `summary(userId)`

- [ ] **Step 1: Write the failing tests**

Append to `followup.service.spec.ts`:

```typescript
describe('FollowupService.reassign and reschedule', () => {
  let service: FollowupService;
  let followupRepo: any;

  beforeEach(async () => {
    followupRepo = {
      findById: anyFn().mockResolvedValue(PENDING_FOLLOWUP),
      update: anyFn().mockResolvedValue(PENDING_FOLLOWUP),
      countPendingForUnit: anyFn().mockResolvedValue(1),
      repository: { manager: { transaction: async (cb: any) => cb({}) } },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FollowupService,
        { provide: FollowupRepository, useValue: followupRepo },
        { provide: CustomerProfileRepository, useValue: { findById: anyFn() } },
        { provide: CustomerPropertyRepository, useValue: { findById: anyFn() } },
        {
          provide: UserRoleRepository,
          useValue: { findByUserAndOrganization: anyFn().mockResolvedValue([{ id: 'r' }]) },
        },
      ],
    }).compile();

    service = moduleRef.get(FollowupService);
  });

  it('reassign changes only the assignee and stamps updatedBy', async () => {
    await service.reassign('followup-1', '22222222-2222-2222-2222-222222222222', 'user-1');

    const updates = followupRepo.update.mock.calls[0][1];
    expect(updates.assignedToUserId).toBe('22222222-2222-2222-2222-222222222222');
    expect(updates.updatedBy).toBe('user-1');
    expect(updates.scheduledAt).toBeUndefined();
    expect(updates.status).toBeUndefined();
  });

  it('reassign rejects a user with no role', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        FollowupService,
        { provide: FollowupRepository, useValue: followupRepo },
        { provide: CustomerProfileRepository, useValue: { findById: anyFn() } },
        { provide: CustomerPropertyRepository, useValue: { findById: anyFn() } },
        {
          provide: UserRoleRepository,
          useValue: { findByUserAndOrganization: anyFn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    await expect(
      moduleRef
        .get(FollowupService)
        .reassign('followup-1', '22222222-2222-2222-2222-222222222222', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reschedule changes only the date, with no outcome and no new record', async () => {
    await service.reschedule('followup-1', '2026-09-01T09:00:00.000Z', 'user-1');

    const updates = followupRepo.update.mock.calls[0][1];
    expect(updates.scheduledAt).toBeInstanceOf(Date);
    expect(updates.outcome).toBeUndefined();
    expect(updates.status).toBeUndefined();
  });

  it('reschedule refuses a followup that is not pending', async () => {
    followupRepo.findById.mockResolvedValue({
      ...PENDING_FOLLOWUP,
      status: FollowupStatus.COMPLETED,
    });

    await expect(
      service.reschedule('followup-1', '2026-09-01T09:00:00.000Z', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c apps/backend/jest.config.ts --rootDir apps/backend --testPathPatterns=followup.service`
Expected: FAIL — `service.reassign is not a function`

- [ ] **Step 3: Write the DTOs**

Create `apps/backend/src/modules/customers/dto/reassign-followup.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ReassignFollowupDto {
  @ApiProperty({ format: 'uuid', description: 'Any active user. No role restriction.' })
  @IsUUID()
  assignedToUserId!: string;
}

export class ReassignFollowupsBulkDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids!: string[];

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  assignedToUserId!: string;
}
```

Create `apps/backend/src/modules/customers/dto/reschedule-followup.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class RescheduleFollowupDto {
  @ApiProperty({ example: '2026-09-01T09:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;
}
```

- [ ] **Step 4: Implement the service methods**

Add to `FollowupService`:

```typescript
  /**
   * Move a followup to a different owner.
   *
   * Ownership of a lead IS the assignee of its pending followup, so this is how
   * a lead changes hands. Deliberately unrestricted: no RBAC in this feature.
   */
  async reassign(id: string, assignedToUserId: string, userId: string): Promise<FollowupEntity> {
    await this.findById(id);
    await this.assertUserExists(assignedToUserId);

    const updated = await this.followupRepository.update(id, {
      assignedToUserId,
      updatedBy: userId,
    });
    if (!updated) throw new NotFoundException('Followup not found');
    return updated;
  }

  /** Bulk variant for the handoff case — one person going on leave. */
  async reassignMany(
    ids: string[],
    assignedToUserId: string,
    userId: string,
  ): Promise<{ updated: number }> {
    await this.assertUserExists(assignedToUserId);

    let updated = 0;
    for (const id of ids) {
      const result = await this.followupRepository.update(id, {
        assignedToUserId,
        updatedBy: userId,
      });
      if (result) updated += 1;
    }
    return { updated };
  }

  /**
   * Move the date without completing. The escape valve that stops people
   * cancelling followups just to get them off today's list.
   */
  async reschedule(id: string, scheduledAt: string, userId: string): Promise<FollowupEntity> {
    const followup = await this.findById(id);
    if (followup.status !== FollowupStatus.PENDING) {
      throw new BadRequestException(`Cannot reschedule a ${followup.status} followup`);
    }

    const updated = await this.followupRepository.update(id, {
      scheduledAt: new Date(scheduledAt),
      updatedBy: userId,
    });
    if (!updated) throw new NotFoundException('Followup not found');
    return updated;
  }

  /** Open lead units with nobody owing them an action. */
  async gaps(): Promise<FollowupGapRow[]> {
    return this.followupRepository.findGaps();
  }

  /** Badge counts. Pass null for everyone. */
  async summary(userId: string | null): Promise<{
    overdue: number;
    today: number;
    upcoming: number;
    gaps: number;
  }> {
    const [counts, gapRows] = await Promise.all([
      this.followupRepository.summaryCounts(userId),
      this.followupRepository.findGaps(),
    ]);
    return { ...counts, gaps: gapRows.length };
  }

  /**
   * The assigned user must exist in the system. `findByUserAndOrganization` is
   * an org-era name that now just checks the user has any role — left alone
   * because it has 10 callers across unrelated modules.
   */
  private async assertUserExists(userId: string): Promise<void> {
    const roles = await this.userRoleRepository.findByUserAndOrganization(userId);
    if (roles.length === 0) {
      throw new BadRequestException('Assigned user not found');
    }
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest -c apps/backend/jest.config.ts --rootDir apps/backend --testPathPatterns=followup.service`
Expected: PASS, 12 tests total

- [ ] **Step 6: Commit**

```bash
npm run typecheck:backend
npx prettier --write apps/backend/src/modules/customers/
git add apps/backend/src/modules/customers/
git commit -m "feat(followups): add reassign, reschedule, gaps and summary"
```

---

## Task 6: Terminal hooks — accepted, converted, lost

**Files:**
- Create: `apps/backend/src/modules/customers/services/lead-closure.service.ts`
- Modify: `apps/backend/src/modules/customers/customers.module.ts`
- Modify: `apps/backend/src/modules/quotes/services/quote.service.ts:568`
- Modify: `apps/backend/src/modules/projects/services/project.service.ts:845`
- Modify: `apps/backend/src/modules/customers/services/customer-property.service.ts`
- Modify: `apps/backend/src/modules/customers/services/customer.service.ts`
- Test: `apps/backend/src/modules/customers/services/lead-closure.service.spec.ts`

**Interfaces:**
- Consumes: `FollowupRepository.cancelPendingFor` (Task 3), `markLost` (Task 4)
- Produces: `LeadClosureService.closeProperty(propertyId: string, customerId: string, userId: string, manager?: EntityManager): Promise<number>`, `LeadClosureService.markPropertyLost(propertyId: string, customerId: string, reason: string, userId: string): Promise<void>`, `LeadClosureService.markCustomerLost(customerId: string, reason: string, userId: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/customers/services/lead-closure.service.spec.ts`:

```typescript
/**
 * LeadClosureService — the single place a lead's chain is ended.
 *
 * Centralised so quote acceptance, project conversion and mark-lost cannot
 * drift apart: a won deal that keeps nagging is the fastest way to make people
 * distrust the whole follow-up list.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test } from '@nestjs/testing';

import { LeadClosureService } from './lead-closure.service';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerPropertyRepository } from '../repositories/customer-property.repository';
import { FollowupRepository } from '../repositories/followup.repository';

const anyFn = (): any => jest.fn();

describe('LeadClosureService', () => {
  let service: LeadClosureService;
  let followupRepo: any;
  let propertyRepo: any;
  let customerRepo: any;

  beforeEach(async () => {
    followupRepo = { cancelPendingFor: anyFn().mockResolvedValue(2) };
    propertyRepo = { markLost: anyFn().mockResolvedValue(undefined) };
    customerRepo = { markLost: anyFn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        LeadClosureService,
        { provide: FollowupRepository, useValue: followupRepo },
        { provide: CustomerPropertyRepository, useValue: propertyRepo },
        { provide: CustomerProfileRepository, useValue: customerRepo },
      ],
    }).compile();

    service = moduleRef.get(LeadClosureService);
  });

  it('closeProperty cancels that property\'s pending followups', async () => {
    await service.closeProperty('prop-1', 'cust-1', 'user-1');

    expect(followupRepo.cancelPendingFor.mock.calls[0][0]).toBe('cust-1');
    expect(followupRepo.cancelPendingFor.mock.calls[0][1]).toBe('prop-1');
  });

  it('closeProperty never touches customer-level followups', async () => {
    await service.closeProperty('prop-1', 'cust-1', 'user-1');

    // propertyId is always passed, so the null-propertyId customer chain is untouched.
    expect(followupRepo.cancelPendingFor.mock.calls.every((c: unknown[]) => c[1] !== null)).toBe(
      true,
    );
  });

  it('markPropertyLost records the reason and closes the chain', async () => {
    await service.markPropertyLost('prop-1', 'cust-1', 'Competitor pricing', 'user-1');

    expect(propertyRepo.markLost.mock.calls[0][1]).toBe('Competitor pricing');
    expect(followupRepo.cancelPendingFor.mock.calls.length).toBe(1);
  });

  it('markCustomerLost closes the customer chain with a null propertyId', async () => {
    await service.markCustomerLost('cust-1', 'Never reachable', 'user-1');

    expect(customerRepo.markLost.mock.calls[0][1]).toBe('Never reachable');
    expect(followupRepo.cancelPendingFor.mock.calls[0][1]).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest -c apps/backend/jest.config.ts --rootDir apps/backend --testPathPatterns=lead-closure`
Expected: FAIL — cannot find module `./lead-closure.service`

- [ ] **Step 3: Implement the service**

Create `apps/backend/src/modules/customers/services/lead-closure.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { type EntityManager } from 'typeorm';

import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerPropertyRepository } from '../repositories/customer-property.repository';
import { FollowupRepository } from '../repositories/followup.repository';

/**
 * Ends a lead's followup chain.
 *
 * Every terminal path routes through here — quote accepted, converted to
 * project, marked lost — so they cannot drift apart. Property-level closure
 * always passes a propertyId, which leaves sibling properties and the
 * customer-level chain alone.
 */
@Injectable()
export class LeadClosureService {
  private readonly logger = new Logger(LeadClosureService.name);

  constructor(
    private readonly followupRepository: FollowupRepository,
    private readonly propertyRepository: CustomerPropertyRepository,
    private readonly customerRepository: CustomerProfileRepository,
  ) {}

  /** Quote accepted or converted to project: stop chasing this site. */
  async closeProperty(
    propertyId: string,
    customerId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const cancelled = await this.followupRepository.cancelPendingFor(
      customerId,
      propertyId,
      userId,
      manager,
    );
    if (cancelled > 0) {
      this.logger.log(`Closed ${cancelled} pending followup(s) for property ${propertyId}`);
    }
    return cancelled;
  }

  async markPropertyLost(
    propertyId: string,
    customerId: string,
    reason: string,
    userId: string,
  ): Promise<void> {
    await this.propertyRepository.markLost(propertyId, reason, userId);
    await this.closeProperty(propertyId, customerId, userId);
  }

  /** For an enquiry that never got a site. propertyId is null by definition. */
  async markCustomerLost(customerId: string, reason: string, userId: string): Promise<void> {
    await this.customerRepository.markLost(customerId, reason, userId);
    await this.followupRepository.cancelPendingFor(customerId, null, userId);
  }
}
```

- [ ] **Step 4: Register in the module**

In `apps/backend/src/modules/customers/customers.module.ts`, add `LeadClosureService` to both `providers` and `exports`, and import it at the top.

- [ ] **Step 5: Hook quote acceptance**

In `apps/backend/src/modules/quotes/services/quote.service.ts`, inject `LeadClosureService` (the `CustomersModule` is already wired via `forwardRef` in both directions — use `@Inject(forwardRef(() => LeadClosureService))` if Nest reports a circular dependency).

After the `updateStatus` result at line ~577, add:

```typescript
    // A won deal must stop nagging without anyone clicking twice.
    if (statusDto.status === QuoteStatus.ACCEPTED && quote.propertyId && quote.customerId) {
      await this.leadClosureService.closeProperty(quote.propertyId, quote.customerId, updatedBy);
    }
```

- [ ] **Step 6: Hook project conversion**

In `apps/backend/src/modules/projects/services/project.service.ts`, immediately after the `updateStatusById(propertyId, PropertyStatus.CONVERTED, manager)` call at line ~845, add:

```typescript
      // Project tasks take over from here; the sales chase is finished.
      await this.leadClosureService.closeProperty(
        propertyId,
        property.customerId,
        createdBy,
        manager,
      );
```

Inject `LeadClosureService` into `ProjectService` and add `CustomersModule` to `ProjectsModule` imports if it is not already there.

- [ ] **Step 7: Route `complete`'s terminal branch through this service**

Task 4 implemented the terminal branch inline, calling `cancelPendingFor` and
`markLost` directly, because `LeadClosureService` did not exist yet. Now that it
does, there must be exactly one place that ends a chain — otherwise quote
acceptance and dialog-driven closure will drift apart.

In `FollowupService`, inject `LeadClosureService` and replace the terminal
branch inside the transaction with:

```typescript
      if (dto.terminal) {
        if (dto.terminal === 'lost') {
          if (propertyId) {
            await this.leadClosureService.markPropertyLost(
              propertyId,
              followup.customerId,
              dto.lostReason!,
              userId,
            );
          } else {
            await this.leadClosureService.markCustomerLost(
              followup.customerId,
              dto.lostReason!,
              userId,
            );
          }
        } else {
          await this.leadClosureService.closeProperty(
            propertyId!,
            followup.customerId,
            userId,
            manager,
          );
        }
        return completed;
      }
```

The existing Task 4 tests still pass — they assert on the observable outcome
(pending followups cancelled, no next created), not on which collaborator did it.
Update the test module to provide a `LeadClosureService` mock with
`closeProperty`, `markPropertyLost` and `markCustomerLost`, and assert against
that mock instead of `followupRepo.cancelPendingFor` in the two terminal tests.

- [ ] **Step 8: Run tests**

Run: `npx jest -c apps/backend/jest.config.ts --rootDir apps/backend`
Expected: all suites PASS

- [ ] **Step 9: Commit**

```bash
npm run typecheck:backend
npx prettier --write apps/backend/src/modules/
git add apps/backend/src/modules/
git commit -m "feat(followups): close the chain on accepted, converted and lost"
```

---

## Task 7: Controller routes

**Files:**
- Modify: `apps/backend/src/modules/customers/controllers/followup.controller.ts`
- Create: `apps/backend/src/modules/customers/dto/followup-gap-response.dto.ts`
- Create: `apps/backend/src/modules/customers/dto/followup-summary-response.dto.ts`
- Modify: `apps/backend/src/modules/customers/controllers/customer-property.controller.ts`
- Modify: `apps/backend/src/modules/customers/controllers/customer.controller.ts`
- Create: `apps/backend/src/modules/customers/dto/mark-lost.dto.ts`

**Interfaces:**
- Consumes: everything from Tasks 4–6
- Produces: `POST /followups/:id/complete`, `POST /followups/:id/reassign`, `POST /followups/reassign`, `POST /followups/:id/reschedule`, `GET /followups/gaps`, `GET /followups/summary`, `POST /customer-properties/:id/lost`, `POST /customers/:id/lost`

- [ ] **Step 1: Write the response DTOs**

Create `apps/backend/src/modules/customers/dto/followup-summary-response.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class FollowupSummaryResponseDto {
  @ApiProperty({ description: 'Pending followups scheduled before today' })
  overdue!: number;

  @ApiProperty({ description: 'Pending followups scheduled today' })
  today!: number;

  @ApiProperty({ description: 'Pending followups scheduled after today' })
  upcoming!: number;

  @ApiProperty({ description: 'Open lead units with no pending followup at all' })
  gaps!: number;
}
```

Create `apps/backend/src/modules/customers/dto/followup-gap-response.dto.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FollowupGapResponseDto {
  @ApiProperty({ enum: ['customer', 'property'] })
  kind!: 'customer' | 'property';

  @ApiProperty({ format: 'uuid' })
  customerId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  propertyId!: string | null;

  @ApiProperty({ description: 'Property name, or the customer full name' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, description: 'Null for customer lead units' })
  leadTemperature!: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Last completed assignee, else the record creator',
  })
  attributedUserId!: string | null;
}
```

Create `apps/backend/src/modules/customers/dto/mark-lost.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class MarkLostDto {
  @ApiProperty({ example: 'Competitor pricing' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
```

- [ ] **Step 2: Replace the complete route and add the new ones**

In `apps/backend/src/modules/customers/controllers/followup.controller.ts`, replace the body-less `markAsCompleted` handler with:

```typescript
  /**
   * Complete a followup and open the next one
   */
  @ApiAction({
    path: 'complete',
    summary: 'Complete a followup',
    description:
      'Records the outcome and creates the next followup. A next followup is required when this is the last pending one on the lead unit, unless terminal is set.',
    responseType: FollowupResponseDto,
  })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteFollowupDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<FollowupResponseDto> {
    const followup = await this.followupService.complete(id, dto, currentUser.id);
    return toDto(FollowupResponseDto, followup);
  }

  @ApiAction({
    path: 'reassign',
    summary: 'Reassign a followup',
    description: 'Moves ownership of the lead. Any user may reassign to any user.',
    responseType: FollowupResponseDto,
  })
  async reassign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReassignFollowupDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<FollowupResponseDto> {
    const followup = await this.followupService.reassign(id, dto.assignedToUserId, currentUser.id);
    return toDto(FollowupResponseDto, followup);
  }

  @ApiAction({
    path: 'reschedule',
    summary: 'Reschedule a followup',
    description: 'Moves the date without completing it. No outcome, no new record.',
    responseType: FollowupResponseDto,
  })
  async reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleFollowupDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<FollowupResponseDto> {
    const followup = await this.followupService.reschedule(id, dto.scheduledAt, currentUser.id);
    return toDto(FollowupResponseDto, followup);
  }
```

Add the bulk-reassign, gaps and summary routes. **These must be declared before any `@Get(':id')` route**, or Nest matches `gaps` and `summary` as an id:

```typescript
  @Post('reassign')
  @ApiOperation({ summary: 'Reassign many followups at once' })
  async reassignMany(
    @Body() dto: ReassignFollowupsBulkDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<{ updated: number }> {
    return this.followupService.reassignMany(dto.ids, dto.assignedToUserId, currentUser.id);
  }

  @Get('gaps')
  @ApiOperation({
    summary: 'Open lead units with no pending followup',
    description:
      'The safety net. Records created by import or direct API call never pass through the UI gates, so anything that slipped appears here with a name against it.',
  })
  @ApiOkResponse({ type: [FollowupGapResponseDto] })
  async gaps(): Promise<FollowupGapResponseDto[]> {
    return this.followupService.gaps();
  }

  @Get('summary')
  @ApiOperation({ summary: 'Badge counts' })
  @ApiQuery({ name: 'mine', required: false, type: Boolean })
  @ApiOkResponse({ type: FollowupSummaryResponseDto })
  async summary(
    @CurrentUser() currentUser: CurrentUserType,
    @Query('mine') mine?: string,
  ): Promise<FollowupSummaryResponseDto> {
    return this.followupService.summary(mine === 'false' ? null : currentUser.id);
  }
```

Add `Post`, `ApiOperation` and `ApiOkResponse` to the imports.

- [ ] **Step 3: Add the mark-lost routes**

In `customer-property.controller.ts`:

```typescript
  @ApiAction({
    path: 'lost',
    summary: 'Mark a property as lost',
    description:
      'Sets status LOST with a reason and cancels its pending followups. Sibling properties and the customer are unaffected.',
    responseType: CustomerPropertyResponseDto,
  })
  async markLost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkLostDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto> {
    const property = await this.customerPropertyService.markLost(id, dto.reason, currentUser.id);
    return toDto(CustomerPropertyResponseDto, property);
  }
```

Add the equivalent `lost` route to `customer.controller.ts` calling `customerService.markLost`. Both service methods delegate to `LeadClosureService`.

- [ ] **Step 4: Verify the routes respond**

Restart the backend, then:

```bash
curl -s -o /dev/null -w "gaps:    %{http_code}\n" http://localhost:8085/api/v1/followups/gaps
curl -s -o /dev/null -w "summary: %{http_code}\n" http://localhost:8085/api/v1/followups/summary
```

Expected: `401` for both — proving the routes exist and are guarded. A `404` means the `@Get('gaps')` declaration is sitting below a `:id` route and Nest is swallowing it.

- [ ] **Step 5: Check the Swagger document builds**

Open `http://localhost:8085/api/docs` and confirm the Followups tag lists `complete`, `reassign`, `reschedule`, `gaps` and `summary`.

- [ ] **Step 6: Commit**

```bash
npm run typecheck:backend && npx jest -c apps/backend/jest.config.ts --rootDir apps/backend
npx prettier --write apps/backend/src/modules/customers/
git add apps/backend/src/modules/customers/
git commit -m "feat(followups): expose complete, reassign, reschedule, gaps, summary and lost routes"
```

---

## Task 8: Web data layer

**Files:**
- Create: `apps/web/components/features/followups/hooks/followup-keys.ts`
- Create: `apps/web/components/features/followups/hooks/use-followups.ts`
- Create: `apps/web/components/features/followups/hooks/use-followup-summary.ts`
- Create: `apps/web/components/features/followups/hooks/use-followup-mutations.ts`
- Create: `apps/web/components/features/followups/hooks/index.ts`
- Create: `apps/web/components/features/followups/constants.ts`
- Create: `apps/web/components/features/followups/index.ts`

**Interfaces:**
- Consumes: the Task 7 endpoints
- Produces: `FollowupResponse` type, `followupKeys`, `useFollowups(filters)`, `useFollowupGaps()`, `useFollowupSummary(mine)`, `useCompleteFollowup()`, `useReassignFollowup()`, `useReassignFollowupsBulk()`, `useRescheduleFollowup()`, `useCreateFollowup()`, `OUTCOME_LABELS`

- [ ] **Step 1: Write the query keys and constants**

Create `apps/web/components/features/followups/hooks/followup-keys.ts`:

```typescript
/**
 * One key factory for every followup surface, so a completion invalidates the
 * property tab, the customer tab, the /followups page and the nav badge at once.
 */
export const followupKeys = {
  all: ['followups'] as const,
  lists: () => [...followupKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...followupKeys.lists(), filters] as const,
  byProperty: (propertyId: string) => [...followupKeys.all, 'property', propertyId] as const,
  byCustomer: (customerId: string) => [...followupKeys.all, 'customer', customerId] as const,
  gaps: () => [...followupKeys.all, 'gaps'] as const,
  summary: (mine: boolean) => [...followupKeys.all, 'summary', mine] as const,
};
```

Create `apps/web/components/features/followups/constants.ts`:

```typescript
import { FollowupOutcome } from '@tejas96/shared/types';

/** Sentence-case labels. Keep in sync with FollowupOutcome. */
export const OUTCOME_LABELS: Record<FollowupOutcome, string> = {
  [FollowupOutcome.NOT_REACHABLE]: 'Not reachable',
  [FollowupOutcome.CALL_BACK_LATER]: 'Call back later',
  [FollowupOutcome.INTERESTED]: 'Interested',
  [FollowupOutcome.SITE_VISIT_DONE]: 'Site visit done',
  [FollowupOutcome.DOCUMENTS_PENDING]: 'Documents pending',
  [FollowupOutcome.NEGOTIATING]: 'Negotiating',
  [FollowupOutcome.NOT_INTERESTED]: 'Not interested',
  [FollowupOutcome.OTHER]: 'Other',
};

export type FollowupScope = 'overdue' | 'today' | 'upcoming' | 'gaps';

export const SCOPE_LABELS: Record<FollowupScope, string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Upcoming',
  gaps: 'Needs follow-up',
};
```

- [ ] **Step 2: Write the read hooks**

Create `apps/web/components/features/followups/hooks/use-followups.ts`:

```typescript
'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  type FollowupOutcome,
  type FollowupPriority,
  type FollowupStatus,
  type FollowupType,
} from '@tejas96/shared/types';

import { followupKeys } from './followup-keys';

import { apiClient } from '@/lib/api/client';

export interface FollowupResponse {
  id: string;
  customerId: string;
  propertyId?: string | null;
  type: FollowupType;
  subject: string;
  scheduledAt: string;
  assignedToUserId: string;
  status: FollowupStatus;
  priority: FollowupPriority;
  notes?: string | null;
  outcome?: FollowupOutcome | null;
  completedAt?: string | null;
  customer?: { id: string; firstName?: string; lastName?: string };
  property?: { id: string; propertyName?: string; city?: string; leadTemperature?: string };
  assignedToUser?: { id: string; firstName?: string; lastName?: string };
}

export interface FollowupGap {
  kind: 'customer' | 'property';
  customerId: string;
  propertyId: string | null;
  name: string;
  leadTemperature: string | null;
  attributedUserId: string | null;
}

export interface FollowupFilters {
  status?: FollowupStatus;
  assignedToUserId?: string;
  customerId?: string;
  propertyId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function useFollowups(
  filters: FollowupFilters,
  options?: { enabled?: boolean },
): UseQueryResult<{ data: FollowupResponse[]; meta?: { total: number } }> {
  return useQuery({
    queryKey: followupKeys.list(filters as Record<string, unknown>),
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.set(key, String(value));
      });
      const { data } = await apiClient.get(`/followups?${params.toString()}`);
      return data;
    },
  });
}

export function useFollowupGaps(options?: { enabled?: boolean }): UseQueryResult<FollowupGap[]> {
  return useQuery({
    queryKey: followupKeys.gaps(),
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const { data } = await apiClient.get<FollowupGap[]>('/followups/gaps');
      return data;
    },
  });
}
```

Create `apps/web/components/features/followups/hooks/use-followup-summary.ts`:

```typescript
'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { followupKeys } from './followup-keys';

import { apiClient } from '@/lib/api/client';

export interface FollowupSummary {
  overdue: number;
  today: number;
  upcoming: number;
  gaps: number;
}

/**
 * Badge counts.
 *
 * Deliberately NOT routed through lib/hooks/use-navigation-counts.ts — that
 * hook returns hardcoded mock numbers behind a "TODO: Replace with actual API
 * call" and is wired to no endpoint, so using it would render an invented count.
 */
export function useFollowupSummary(mine = true): UseQueryResult<FollowupSummary> {
  return useQuery({
    queryKey: followupKeys.summary(mine),
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await apiClient.get<FollowupSummary>(`/followups/summary?mine=${mine}`);
      return data;
    },
  });
}
```

- [ ] **Step 3: Write the mutation hooks**

Create `apps/web/components/features/followups/hooks/use-followup-mutations.ts`:

```typescript
'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { type FollowupOutcome, type FollowupPriority, type FollowupType } from '@tejas96/shared/types';

import { followupKeys } from './followup-keys';
import { type FollowupResponse } from './use-followups';

import { apiClient } from '@/lib/api/client';

export interface NextFollowupInput {
  scheduledAt: string;
  assignedToUserId: string;
  subject: string;
  type?: FollowupType;
  priority?: FollowupPriority;
  notes?: string;
}

export interface CompleteFollowupInput {
  id: string;
  outcome: FollowupOutcome;
  notes?: string;
  next?: NextFollowupInput;
  terminal?: 'accepted' | 'lost';
  lostReason?: string;
}

/** Invalidates every followup surface plus the badge. */
function useInvalidateFollowups(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: followupKeys.all });
  };
}

export function useCompleteFollowup(): UseMutationResult<
  FollowupResponse,
  Error,
  CompleteFollowupInput
> {
  const invalidate = useInvalidateFollowups();
  return useMutation({
    mutationFn: async ({ id, ...body }: CompleteFollowupInput) => {
      const { data } = await apiClient.post<FollowupResponse>(`/followups/${id}/complete`, body);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useRescheduleFollowup(): UseMutationResult<
  FollowupResponse,
  Error,
  { id: string; scheduledAt: string }
> {
  const invalidate = useInvalidateFollowups();
  return useMutation({
    mutationFn: async ({ id, scheduledAt }) => {
      const { data } = await apiClient.post<FollowupResponse>(`/followups/${id}/reschedule`, {
        scheduledAt,
      });
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useReassignFollowup(): UseMutationResult<
  FollowupResponse,
  Error,
  { id: string; assignedToUserId: string }
> {
  const invalidate = useInvalidateFollowups();
  return useMutation({
    mutationFn: async ({ id, assignedToUserId }) => {
      const { data } = await apiClient.post<FollowupResponse>(`/followups/${id}/reassign`, {
        assignedToUserId,
      });
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useReassignFollowupsBulk(): UseMutationResult<
  { updated: number },
  Error,
  { ids: string[]; assignedToUserId: string }
> {
  const invalidate = useInvalidateFollowups();
  return useMutation({
    mutationFn: async (body) => {
      const { data } = await apiClient.post<{ updated: number }>('/followups/reassign', body);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useCreateFollowup(): UseMutationResult<
  FollowupResponse,
  Error,
  {
    customerId: string;
    propertyId?: string;
    type: FollowupType;
    subject: string;
    scheduledAt: string;
    assignedToUserId: string;
    priority?: FollowupPriority;
    notes?: string;
  }
> {
  const invalidate = useInvalidateFollowups();
  return useMutation({
    mutationFn: async (body) => {
      const { data } = await apiClient.post<FollowupResponse>('/followups', body);
      return data;
    },
    onSuccess: invalidate,
  });
}
```

- [ ] **Step 4: Write the barrels**

`apps/web/components/features/followups/hooks/index.ts`:

```typescript
export * from './followup-keys';
export * from './use-followups';
export * from './use-followup-summary';
export * from './use-followup-mutations';
```

`apps/web/components/features/followups/index.ts`:

```typescript
export * from './constants';
export * from './hooks';
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck:web`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
npx prettier --write apps/web/components/features/followups/
git add apps/web/components/features/followups/
git commit -m "feat(web): add followup data layer"
```

---

## Task 9: The complete dialog

**Files:**
- Create: `apps/web/components/features/followups/components/followup-complete-dialog.tsx`
- Modify: `apps/web/components/features/followups/index.ts`

**Interfaces:**
- Consumes: `useCompleteFollowup` (Task 8), `nextFollowupDate` (Task 1), `MUIDatePicker`, `MUIUserAssigneeSelector`, `MUISelect`, `useEmployees`, `useAuth`
- Produces: `<FollowupCompleteDialog open followup onClose pendingSiblings />`

- [ ] **Step 1: Build the dialog**

Create `apps/web/components/features/followups/components/followup-complete-dialog.tsx`:

```tsx
'use client';

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { FollowupOutcome, FollowupType, LeadTemperature, nextFollowupDate } from '@tejas96/shared/types';
import { useEffect, useMemo, useState, type JSX } from 'react';

import { OUTCOME_LABELS } from '../constants';
import { useCompleteFollowup } from '../hooks';
import { type FollowupResponse } from '../hooks/use-followups';

import { useEmployees } from '@/components/features/employees';
import { showToast } from '@/components/ui';
import { MUIDatePicker } from '@/components/ui/mui-date-picker';
import { MUIUserAssigneeSelector } from '@/components/ui/mui-user-assignee-selector';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

interface FollowupCompleteDialogProps {
  open: boolean;
  followup: FollowupResponse | null;
  /** Pending followups on the same lead unit, EXCLUDING this one. */
  pendingSiblings: number;
  onClose: () => void;
  onMarkLost?: () => void;
}

const OUTCOMES = Object.values(FollowupOutcome);

export function FollowupCompleteDialog({
  open,
  followup,
  pendingSiblings,
  onClose,
  onMarkLost,
}: FollowupCompleteDialogProps): JSX.Element {
  const { user } = useAuth();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees({ enabled: open });
  const completeMutation = useCompleteFollowup();

  const [outcome, setOutcome] = useState<FollowupOutcome>(FollowupOutcome.CALL_BACK_LATER);
  const [notes, setNotes] = useState('');
  const [scheduleNext, setScheduleNext] = useState(true);
  const [nextDate, setNextDate] = useState<Date | null>(null);
  const [nextOwner, setNextOwner] = useState<string | null>(null);
  const [nextSubject, setNextSubject] = useState('');

  // The next block is mandatory only when completing this one would leave the
  // lead unit with nothing pending. With siblings open the rule already holds.
  const nextRequired = pendingSiblings === 0;

  const temperature = (followup?.property?.leadTemperature as LeadTemperature | undefined) ?? null;

  useEffect(() => {
    if (!open) return;
    setOutcome(FollowupOutcome.CALL_BACK_LATER);
    setNotes('');
    setScheduleNext(true);
    setNextDate(nextFollowupDate(new Date(), temperature));
    setNextOwner(user?.id ?? null);
    setNextSubject('');
  }, [open, temperature, user?.id]);

  const notesRequired = outcome === FollowupOutcome.OTHER;
  const wantsNext = nextRequired || scheduleNext;

  const canSubmit = useMemo(() => {
    if (notesRequired && !notes.trim()) return false;
    if (wantsNext && (!nextDate || !nextOwner || !nextSubject.trim())) return false;
    return true;
  }, [notesRequired, notes, wantsNext, nextDate, nextOwner, nextSubject]);

  const handleSubmit = (terminal?: 'accepted'): void => {
    if (!followup) return;

    completeMutation.mutate(
      {
        id: followup.id,
        outcome,
        notes: notes.trim() || undefined,
        ...(terminal
          ? { terminal }
          : wantsNext && nextDate && nextOwner
            ? {
                next: {
                  scheduledAt: nextDate.toISOString(),
                  assignedToUserId: nextOwner,
                  subject: nextSubject.trim(),
                  type: FollowupType.TASK,
                },
              }
            : {}),
      },
      {
        onSuccess: () => {
          showToast.success(terminal ? 'Quote accepted — follow-ups closed' : 'Follow-up completed');
          onClose();
        },
        onError: (error) => showToast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Complete follow-up</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {followup && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                {followup.property?.propertyName ?? 'Customer lead'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {followup.subject}
              </Typography>
            </Box>
          )}

          <TextField
            select
            fullWidth
            size="small"
            label="What happened?"
            value={outcome}
            onChange={(event) => setOutcome(event.target.value as FollowupOutcome)}
          >
            {OUTCOMES.map((value) => (
              <MenuItem key={value} value={value}>
                {OUTCOME_LABELS[value]}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            label={notesRequired ? 'Notes (required)' : 'Notes'}
            required={notesRequired}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            helperText={notesRequired ? 'Tell us what "other" means, so it can be counted later.' : ''}
          />

          {outcome === FollowupOutcome.NOT_INTERESTED && onMarkLost && (
            <Alert severity="info" action={<Button onClick={onMarkLost}>Mark lost</Button>}>
              Not interested usually means this lead is dead.
            </Alert>
          )}

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Next follow-up {nextRequired && '(required)'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {nextRequired
                ? 'This is the only open follow-up — schedule the next one.'
                : `${pendingSiblings} other follow-up${pendingSiblings === 1 ? '' : 's'} still open on this lead.`}
            </Typography>
          </Box>

          {!nextRequired && (
            <FormControlLabel
              control={
                <Switch
                  checked={scheduleNext}
                  onChange={(event) => setScheduleNext(event.target.checked)}
                />
              }
              label="Schedule another follow-up"
            />
          )}

          {wantsNext && (
            <Stack spacing={2}>
              <MUIDatePicker
                fieldLabel="Date"
                required
                value={nextDate}
                onChange={setNextDate}
                fullWidth
              />
              <MUIUserAssigneeSelector
                value={nextOwner}
                onChange={setNextOwner}
                employees={employees}
                optionsLoading={employeesLoading}
              />
              <TextField
                fullWidth
                size="small"
                label="Subject"
                required
                value={nextSubject}
                onChange={(event) => setNextSubject(event.target.value)}
              />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Box sx={{ flex: 1 }} />
        {onMarkLost && (
          <Button color="error" onClick={onMarkLost}>
            Mark lost
          </Button>
        )}
        {followup?.propertyId && (
          <Button
            color="success"
            onClick={() => handleSubmit('accepted')}
            disabled={completeMutation.isPending}
          >
            Quote accepted
          </Button>
        )}
        <Button
          variant="contained"
          onClick={() => handleSubmit()}
          disabled={!canSubmit || completeMutation.isPending}
        >
          Save &amp; schedule next
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 2: Export it**

Add to `apps/web/components/features/followups/index.ts`:

```typescript
export * from './components/followup-complete-dialog';
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck:web && npx eslint apps/web/components/features/followups/`
Expected: PASS. If `useEmployees` or `showToast` import paths differ, fix them to match the existing usage in `apps/web/components/features/properties/property-detail/followup-drawer.tsx`.

- [ ] **Step 4: Commit**

```bash
npx prettier --write apps/web/components/features/followups/
git add apps/web/components/features/followups/
git commit -m "feat(web): add followup complete dialog"
```

---

## Task 10: Wire the dialog into both existing tabs and consolidate the drawers

**Files:**
- Create: `apps/web/components/features/followups/components/followup-drawer.tsx`
- Modify: `apps/web/components/features/properties/property-detail/tabs/followups-tab.tsx`
- Modify: `apps/web/components/features/customers/customer-detail/tabs/followups-tab.tsx`
- Modify: `apps/web/components/features/properties/property-detail/property-detail-page.tsx`
- Modify: `apps/web/components/features/customers/customer-detail/customer-detail-page.tsx`
- Delete: `apps/web/components/features/properties/property-detail/followup-drawer.tsx`
- Delete: `apps/web/components/features/customers/customer-detail/followup-drawer.tsx`

**Interfaces:**
- Consumes: `FollowupCompleteDialog` (Task 9), `useCreateFollowup` (Task 8)
- Produces: `<FollowupDrawer open customerId propertyId? onClose />` — one drawer serving both levels

- [ ] **Step 1: Build the unified drawer**

Create `apps/web/components/features/followups/components/followup-drawer.tsx`. Port the existing property drawer, with three changes: take `propertyId?: string` so it serves both levels; replace the hand-rolled `<Autocomplete>` over employees with `MUIUserAssigneeSelector`; replace the `type="datetime-local"` `<TextField>` with `MUIDatePicker`.

```tsx
'use client';

import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FollowupPriority, FollowupType } from '@tejas96/shared/types';
import { useEffect, useState, type JSX } from 'react';

import { useCreateFollowup } from '../hooks';

import { useEmployees } from '@/components/features/employees';
import { showToast } from '@/components/ui';
import { MUIDatePicker } from '@/components/ui/mui-date-picker';
import { MUIUserAssigneeSelector } from '@/components/ui/mui-user-assignee-selector';
import { getErrorMessage, toTitleLabel } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

interface FollowupDrawerProps {
  open: boolean;
  customerId: string;
  /** Omit for a customer-level followup (a lead with no property yet). */
  propertyId?: string;
  onClose: () => void;
}

const FOLLOWUP_TYPES = Object.values(FollowupType);

export function FollowupDrawer({
  open,
  customerId,
  propertyId,
  onClose,
}: FollowupDrawerProps): JSX.Element {
  const { user } = useAuth();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees({ enabled: open });
  const createMutation = useCreateFollowup();

  const [type, setType] = useState<FollowupType>(FollowupType.TASK);
  const [subject, setSubject] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [assignedToUserId, setAssignedToUserId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setType(FollowupType.TASK);
    setSubject('');
    setScheduledAt(null);
    setNotes('');
    setAssignedToUserId(user?.id ?? null);
  }, [open, user?.id]);

  const handleSubmit = (): void => {
    if (!subject.trim() || !scheduledAt || !assignedToUserId) return;

    createMutation.mutate(
      {
        customerId,
        propertyId,
        type,
        subject: subject.trim(),
        scheduledAt: scheduledAt.toISOString(),
        assignedToUserId,
        priority: FollowupPriority.NORMAL,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          showToast.success('Follow-up scheduled');
          onClose();
        },
        onError: (error) => showToast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, maxWidth: '100vw' } }}
    >
      <Box className="flex items-center justify-between" sx={{ px: 2.5, py: 1.75, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Log follow-up
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Stack spacing={2.5} sx={{ p: 2.5 }}>
        <TextField
          select
          fullWidth
          size="small"
          label="Type"
          value={type}
          onChange={(event) => setType(event.target.value as FollowupType)}
        >
          {FOLLOWUP_TYPES.map((value) => (
            <MenuItem key={value} value={value}>
              {toTitleLabel(value)}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          size="small"
          label="Subject"
          required
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />

        <MUIDatePicker
          fieldLabel="Scheduled for"
          required
          value={scheduledAt}
          onChange={setScheduledAt}
          fullWidth
        />

        <MUIUserAssigneeSelector
          value={assignedToUserId}
          onChange={setAssignedToUserId}
          employees={employees}
          optionsLoading={employeesLoading}
        />

        <TextField
          fullWidth
          multiline
          minRows={3}
          size="small"
          label="Notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!subject.trim() || !scheduledAt || !assignedToUserId || createMutation.isPending}
        >
          Schedule
        </Button>
      </Stack>
    </Drawer>
  );
}
```

- [ ] **Step 2: Update both followups tabs**

In each `followups-tab.tsx`, add an `Outcome` column to the table head and body, and replace the plain complete button with one that opens `FollowupCompleteDialog`. The tab needs the sibling count, which it can compute from the list it already has:

```tsx
const pendingSiblings = followups.filter(
  (f) => f.status === FollowupStatus.PENDING && f.id !== selectedFollowup?.id,
).length;
```

Render the dialog at the bottom of the component:

```tsx
<FollowupCompleteDialog
  open={Boolean(selectedFollowup)}
  followup={selectedFollowup}
  pendingSiblings={pendingSiblings}
  onClose={() => setSelectedFollowup(null)}
  onMarkLost={() => setMarkLostOpen(true)}
/>
```

Add the outcome cell:

```tsx
<TableCell>{followup.outcome ? OUTCOME_LABELS[followup.outcome] : '—'}</TableCell>
```

- [ ] **Step 3: Swap the drawer imports and delete the old files**

In `property-detail-page.tsx` and `customer-detail-page.tsx`, change the `FollowupDrawer` import to `@/components/features/followups` and pass `customerId` plus `propertyId` (property page) or `customerId` only (customer page).

```bash
git rm apps/web/components/features/properties/property-detail/followup-drawer.tsx
git rm apps/web/components/features/customers/customer-detail/followup-drawer.tsx
```

Remove their re-exports from the two `index.ts` barrels.

- [ ] **Step 4: Delete the now-superseded hooks**

`use-property-followups.ts` and `use-customer-followups.ts` duplicate what `useFollowups` now provides. Point their consumers at `useFollowups({ propertyId })` / `useFollowups({ customerId })` and delete both files. Grep first so nothing is orphaned:

```bash
grep -rn "usePropertyFollowups\|useCustomerFollowups\|useCompletePropertyFollowup\|useCreatePropertyFollowup" apps/web
```

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck:web && npx eslint apps/web/components/features/followups apps/web/components/features/properties apps/web/components/features/customers`
Expected: PASS, no unresolved imports

- [ ] **Step 6: Verify in the browser**

Start the web preview, open a property detail page, go to the Follow-ups tab, click **Log Follow-up**, and schedule one for today. Then click **Complete** and confirm:
- the outcome dropdown lists 8 options
- the next-follow-up block says "This is the only open follow-up"
- **Save & schedule next** is disabled until a date, owner and subject are set
- after saving, the tab shows one completed row with an outcome and one new pending row

- [ ] **Step 7: Commit**

```bash
npx prettier --write apps/web/components/features/
git add -A apps/web/components/features/
git commit -m "feat(web): unify followup drawer and wire the complete dialog into both tabs"
```

---

## Task 11: The `/followups` page

**Files:**
- Create: `apps/web/components/features/followups/components/followup-list.tsx`
- Create: `apps/web/components/features/followups/components/followups-page.tsx`
- Create: `apps/web/app/(dashboard)/followups/page.tsx`
- Modify: `apps/web/lib/config/routes.ts`
- Modify: `apps/web/lib/config/navigation.ts`

**Interfaces:**
- Consumes: `useFollowups`, `useFollowupGaps`, `useFollowupSummary`, `useReassignFollowupsBulk` (Task 8), `FollowupCompleteDialog` (Task 9), `CrmTable`, `FilterTabs`
- Produces: `<FollowupList scope filters onComplete />`, `ROUTES.FOLLOWUPS.LIST`

- [ ] **Step 1: Add the route**

In `apps/web/lib/config/routes.ts`, after the `PIPELINE` block:

```typescript
  // Follow-ups
  FOLLOWUPS: {
    LIST: '/followups',
  },
```

- [ ] **Step 2: Build the list component**

Create `apps/web/components/features/followups/components/followup-list.tsx` using `CrmTable`. Columns: Due (relative — "2d late", "today"), Lead (property name or customer name, with the customer/property kind beneath), Temperature (`MUIStatusChip`), Subject, Owner, Actions.

Pass `bulkActions` so `CrmSelectionBar` provides bulk reassign:

```tsx
const bulkActions = [
  {
    id: 'reassign',
    label: 'Reassign',
    onAction: (rows: FollowupResponse[]) => setReassignTarget(rows.map((r) => r.id)),
  },
];
```

Use `selectionLabel={(count) => `${count} follow-up${count === 1 ? '' : 's'} selected`}`.

- [ ] **Step 3: Build the page shell**

Create `apps/web/components/features/followups/components/followups-page.tsx`:

- `FilterTabs` with the four scopes, counts from `useFollowupSummary`
- A Mine / All toggle — a plain MUI `ToggleButtonGroup`, **not** a role check
- Filters: assignee (`MUIUserAssigneeSelector`), temperature, type
- `overdue` / `today` / `upcoming` render `FollowupList`; `gaps` renders the gap rows with a single **Schedule** action per row that opens `FollowupDrawer`

Derive the date filters from the scope:

```typescript
const now = new Date();
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const startOfTomorrow = new Date(startOfToday.getTime() + 86_400_000);

const dateFilters =
  scope === 'overdue'
    ? { to: startOfToday.toISOString() }
    : scope === 'today'
      ? { from: startOfToday.toISOString(), to: startOfTomorrow.toISOString() }
      : { from: startOfTomorrow.toISOString() };
```

- [ ] **Step 4: Add the route page**

Create `apps/web/app/(dashboard)/followups/page.tsx`:

```tsx
import { FollowupsPage } from '@/components/features/followups';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function FollowupsRoute(): React.JSX.Element {
  return <FollowupsPage />;
}
```

- [ ] **Step 5: Add the nav entry**

In `apps/web/lib/config/navigation.ts`, add a "Follow-ups" item under the Sales & CRM section, after "All Customers":

```typescript
            {
              id: 'followups',
              icon: EventNoteOutlined,
              label: 'Follow-ups',
              href: ROUTES.FOLLOWUPS.LIST,
              // badge: overdue + today, via useFollowupSummary in the nav component
            },
```

Import `EventNoteOutlined` from `@mui/icons-material`.

- [ ] **Step 6: Verify in the browser**

Navigate to `/followups`. Confirm:
- four tabs render with counts
- **Needs follow-up** lists open leads with no pending follow-up (should be a large number on current data, since no follow-ups exist yet)
- selecting rows shows the selection bar; bulk reassign moves them
- the Mine / All toggle changes the row count

- [ ] **Step 7: Commit**

```bash
npm run typecheck:web && npx eslint apps/web/components/features/followups apps/web/app
npx prettier --write apps/web/components/features/followups apps/web/app apps/web/lib/config
git add -A apps/web
git commit -m "feat(web): add the /followups page"
```

---

## Task 12: Next-follow-up chip and the wizard gate

**Files:**
- Create: `apps/web/components/features/followups/components/next-followup-chip.tsx`
- Modify: `apps/web/components/features/properties/property-detail/property-detail-page.tsx`
- Modify: `apps/web/components/features/customers/customer-detail/kpi-strip.tsx`
- Modify: `apps/web/components/features/onboarding/components/onboarding-wizard/steps/step-review-assign.tsx`
- Modify: `apps/web/components/features/onboarding/components/onboarding-wizard/index.tsx`
- Modify: `apps/web/components/features/onboarding/schemas/onboarding.schema.ts`

**Interfaces:**
- Consumes: `useFollowups`, `useCreateFollowup` (Task 8), `nextFollowupDate` (Task 1)
- Produces: `<NextFollowupChip customerId propertyId? />`

- [ ] **Step 1: Build the chip**

Create `apps/web/components/features/followups/components/next-followup-chip.tsx`. It queries pending follow-ups for the unit, takes the earliest, and renders either `Next: Thu · Ravi` or a red `No follow-up scheduled` prompt. "Next" is derived here — there is no stored column.

```tsx
const next = useMemo(
  () =>
    (data?.data ?? [])
      .filter((f) => f.status === FollowupStatus.PENDING)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0],
  [data],
);
```

- [ ] **Step 2: Fill the existing NEXT FOLLOW-UP tile**

The property page header already renders a `NEXT FOLLOW-UP` KPI tile showing `—`. Replace its value with `<NextFollowupChip customerId={property.customerId} propertyId={property.id} />`. Add the same tile to the customer KPI strip for property-less customers.

- [ ] **Step 3: Add the required next-follow-up block to the wizard**

In `onboarding.schema.ts`, add to the schema used by the create and create-site modes:

```typescript
  nextFollowupDate: z.date({ required_error: 'Schedule the first follow-up' }),
  nextFollowupAssignee: z.string().min(1, 'Pick who owns this lead'),
```

In `step-review-assign.tsx`, render an `MUIDatePicker` and `MUIUserAssigneeSelector` under a "First follow-up" heading, defaulting to `nextFollowupDate(new Date(), leadTemperature)` and the current user.

In `onboarding-wizard/index.tsx`, add `'nextFollowupDate'` and `'nextFollowupAssignee'` to the `review-assign` step's `fields` array in `constants.ts` so `form.trigger` blocks submission, add both keys to `WIZARD_ONLY_KEYS` so they never reach the property API, and create the follow-up in `submitCreate` after the property is created:

```typescript
      await createFollowupMutation.mutateAsync({
        customerId: resolvedCustomerId!,
        propertyId: created.id,
        type: FollowupType.TASK,
        subject: 'First follow-up',
        scheduledAt: form.getValues('nextFollowupDate').toISOString(),
        assignedToUserId: form.getValues('nextFollowupAssignee'),
      });
```

- [ ] **Step 4: Verify in the browser**

Run the onboarding wizard end to end. Confirm the Review step will not submit without a follow-up date and owner, and that the created property's header shows the chip with that date.

- [ ] **Step 5: Commit**

```bash
npm run typecheck:web && npx eslint apps/web/components/features
npx prettier --write apps/web/components/features
git add -A apps/web
git commit -m "feat(web): show next followup and require one at onboarding"
```

---

## Task 13: Mark lost

**Files:**
- Rewrite: `apps/web/components/features/properties/property-detail/mark-as-lost-dialog.tsx`
- Create: `apps/web/components/features/followups/hooks/use-mark-lost.ts`
- Modify: `apps/web/components/features/followups/hooks/index.ts`

**Interfaces:**
- Consumes: `POST /customer-properties/:id/lost`, `POST /customers/:id/lost` (Task 7)
- Produces: `useMarkPropertyLost()`, `useMarkCustomerLost()`

- [ ] **Step 1: Write the mutation hooks**

Create `apps/web/components/features/followups/hooks/use-mark-lost.ts`:

```typescript
'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { followupKeys } from './followup-keys';

import { apiClient } from '@/lib/api/client';

export function useMarkPropertyLost(): UseMutationResult<
  unknown,
  Error,
  { propertyId: string; reason: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyId, reason }) => {
      const { data } = await apiClient.post(`/customer-properties/${propertyId}/lost`, { reason });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: followupKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

export function useMarkCustomerLost(): UseMutationResult<
  unknown,
  Error,
  { customerId: string; reason: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerId, reason }) => {
      const { data } = await apiClient.post(`/customers/${customerId}/lost`, { reason });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: followupKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
```

- [ ] **Step 2: Replace the stub dialog**

The current dialog says "This action is not wired yet" and its save button is a no-op. Rewrite it to call `useMarkPropertyLost`, show the real consequence in the copy, and close on success:

```tsx
<DialogContentText sx={{ mb: 2 }}>
  Marking <strong>{propertyName}</strong> as lost cancels its pending follow-ups. Other
  properties for this customer are unaffected.
</DialogContentText>
```

Wire the submit:

```tsx
const markLost = useMarkPropertyLost();

const handleSubmit = (): void => {
  markLost.mutate(
    { propertyId, reason: reason.trim() },
    {
      onSuccess: () => {
        showToast.success('Property marked as lost');
        onClose();
      },
      onError: (error) => showToast.error(getErrorMessage(error)),
    },
  );
};
```

Add a `propertyId` prop and pass it from `property-detail-page.tsx`.

- [ ] **Step 3: Verify in the browser**

On a property with a pending follow-up, mark it lost with a reason. Confirm: the property status becomes Lost, the follow-up disappears from `/followups`, and the property does **not** appear in the `Needs follow-up` tab.

Confirm the sibling rule with SQL:

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "
SELECT id, status, lost_reason FROM customer_properties
 WHERE customer_id = (SELECT customer_id FROM customer_properties WHERE status='lost' LIMIT 1);"
```

Expected: only the one property is `lost`; siblings keep their previous status.

- [ ] **Step 4: Commit**

```bash
npm run typecheck:web && npx eslint apps/web/components/features
npx prettier --write apps/web/components/features
git add -A apps/web
git commit -m "feat(web): wire mark-as-lost to the API"
```

---

## Task 14: Full verification pass

**Files:** none — verification only

- [ ] **Step 1: Run everything**

```bash
npm run typecheck:backend && npm run typecheck:web
npx jest -c apps/backend/jest.config.ts --rootDir apps/backend
npm run lint
```

Expected: all pass, including `relation-names.spec.ts` and `orderby-property-paths.spec.ts`.

- [ ] **Step 2: Walk the journeys from spec §12**

With the app running, confirm each end to end:

1. **Phone enquiry** — create a customer, abandon before the property. It appears in `Needs follow-up`. Schedule one, complete it, create the property. The customer unit disappears from `gaps`; the property unit takes over.
2. **Normal win** — complete three follow-ups in a chain, then use **Quote accepted**. Pending follow-ups are cancelled and the property leaves `gaps`.
3. **Loss** — complete with `not_interested`, take the Mark lost path, give a reason. Status is `lost`, reason stored.
4. **Three sites** — one customer with three properties. Mark one lost; confirm the other two keep their own pending follow-ups and owners.
5. **Two reasons at once** — two pending on one property. Complete one; the "next" block is optional and the sibling is untouched.
6. **Handoff** — bulk-reassign several follow-ups on `/followups`; confirm all move.
7. **Gaming it** — cancel the last pending follow-up; confirm the unit appears in `Needs follow-up` attributed to whoever cancelled.

- [ ] **Step 3: Confirm the gaps query performs**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -c "
EXPLAIN ANALYZE SELECT 1 FROM customer_properties p
 WHERE p.deleted_at IS NULL AND p.status NOT IN ('converted','lost')
   AND NOT EXISTS (SELECT 1 FROM followups f WHERE f.property_id = p.id AND f.deleted_at IS NULL AND f.status='pending');"
```

Expected: the plan uses `idx_followups_property_status`, not a sequential scan on `followups`.

- [ ] **Step 4: Commit any fixes and open the PR**

```bash
git add -A
git commit -m "test: verify followup system end to end"
```

---

## Deferred — explicitly not in this plan

Named so they are not mistaken for oversights:

- **RBAC** — planned separately. `/followups` "All" is a default view, not a permission.
- **The combined My Day dashboard** — `FollowupList` and `/summary` are built so it composes them later with a "View all" link.
- **Email, WhatsApp and push reminders** — in-app surfaces only.
- **Outcome-driven temperature suggestions** — temperature stays manually set.
- **Auto-rescheduling on temperature change** — a new cadence only affects the next follow-up created.
- **Stale org remnants in `apps/backend/src/scripts/`** — `migrate-users-to-iam.ts` and `validate-installation-pricing.ts` still query dropped `organization_id` columns. One-off scripts, not on a request path.
- **`useOrgContext` references in `apps/web/lib/hooks/core/README.md`** and comments in `projects.ts` / `quotes.ts` — documentation drift.
- **`userRoleRepository.findByUserAndOrganization()`** — stale name, 10 callers across unrelated modules.
