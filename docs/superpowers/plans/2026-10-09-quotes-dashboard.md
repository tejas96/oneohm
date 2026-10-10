# Quotes Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/quotes` dashboard with a deal-based dashboard (5 stages, needs action, team, biggest deals, lead sources, 12-month trend) where every number opens the quote list filtered to exactly those deals.

**Architecture:** One SQL CTE (`DEAL_FACTS_CTE`) gives one row per deal (property). The new `GET /quotes/dashboard` endpoint and the new `GET /quotes` list filters both read it, so a card always equals the list it opens. The web page copies the `/projects` dashboard's look and motion; its generic pieces move to a shared kit. The quote list moves from `AdvancedTable` to `CrmTable` (house pattern) to carry filter-only fields.

**Tech Stack:** NestJS + TypeORM raw SQL (Postgres), Next.js 15 + React + MUI + Tailwind + Recharts, TanStack Query, shared TS lib `@tejas96/shared` (path alias to `libs/shared/src`).

**Spec:** `docs/superpowers/specs/2026-10-09-quotes-dashboard-design.md`

## Global Constraints

- Repo: `/Volumes/works-space/oneohm/oneohm`, branch `feat/quotes-dashboard` (already created from `origin/main`). Never create a worktree. Never `git stash`.
- **No new unit test files** (spec D10). Every task is verified by typecheck plus running it: `curl` against the local API and a read-only SQL cross-check, or the browser pane for web.
- Local services: web `http://localhost:3001`, API `http://localhost:8085`, Postgres container `oneohm-postgres` (`docker exec oneohm-postgres psql -U root -d oneohm_epc`). The backend runs with **no watch** — restart it after every backend edit (`preview_stop` + `preview_start` with name `backend`, launch config at `/Volumes/works-space/oneohm/.claude/launch.json`).
- psql sessions default to **UTC**; the app runs in IST. Every cross-check SQL starts with `SET timezone = 'Asia/Kolkata';`.
- API calls need a bearer token: sign in to the web app in the browser pane (credentials in memory `local-test-login`; never print the password), then read the `accessToken` cookie with `javascript_tool` (`document.cookie`).
- Temporary files go in the session scratchpad: `SCRATCH=/private/tmp/claude-501/-Volumes-works-space-oneohm/890894e6-764f-4806-bf0a-f6d3dbd59980/scratchpad` (never `/tmp`).
- SQL against the DB is **read-only**. No INSERT/UPDATE/DELETE, no migrations.
- Money in the quote domain is **rupees** (numbers), the same unit the quote list uses. Format on screen with `formatPaise(Math.round(rupees * 100), { compact: true })`.
- Visual system = `/projects` dashboard: cards `rounded-xl bg-surface p-5 shadow-e2`, numbers `text-foreground`, small lines `text-foreground-tertiary`, good = `primary` / `primary-light`, problem = `error`, neutral bars `var(--ds-neutral-300)`.
- One fact, one home: no figure appears twice on the page.
- Commit after each task with a `feat(quotes): …` / `refactor(…): …` message ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Typecheck commands: `npm run typecheck:libs`, `npm run typecheck:backend`, `npm run typecheck:web` (run from the repo root).

## File map

| File | Status | Responsibility |
|---|---|---|
| `libs/shared/src/types/quotes-dashboard.ts` | new | Response type and union types |
| `libs/shared/src/types/index.ts` | modify | export it |
| `libs/shared/src/utils/deal-stage.ts` | new | stage/attention key lists, labels, lead-source label |
| `libs/shared/src/utils/index.ts` | modify | export it |
| `apps/backend/src/common/utils/dashboard-period.ts` | moved from `modules/projects/utils/` | IST period ranges, shared by both dashboards |
| `apps/backend/src/modules/quotes/sql/deal-facts.sql.ts` | new | `DEAL_FACTS_CTE`, `DEAL_FACTS`, `buildDealFactsFilter` |
| `apps/backend/src/modules/quotes/dto/quotes/quote-query.dto.ts` | modify | new list filters |
| `apps/backend/src/modules/quotes/dto/quotes/quote-response.dto.ts` | modify | `dealStage` |
| `apps/backend/src/modules/quotes/repositories/quote.repository.ts` | modify | apply facts filter; `findDealStages` |
| `apps/backend/src/modules/quotes/services/quote.service.ts` | modify | attach `dealStage`; delete `markExpiredQuotes` |
| `apps/backend/src/modules/quotes/dto/dashboard/quotes-dashboard-query.dto.ts` | new | dashboard query validation |
| `apps/backend/src/modules/quotes/services/quote-dashboard.service.ts` | new | dashboard SQL + shaping |
| `apps/backend/src/modules/quotes/controllers/quote-dashboard.controller.ts` | new | `GET /quotes/dashboard` |
| `apps/backend/src/modules/quotes/controllers/index.ts`, `quotes.module.ts` | modify | register (before `QuoteController`) |
| `apps/web/components/features/dashboard/kit/*` | moved from projects | `AnimatedNumber`, motion, `BandError`, format, period+financing `FilterBar`, `useDashboardFilters` |
| `apps/web/lib/hooks/resources/quotes-dashboard.ts` | new | `useQuotesDashboard` |
| `apps/web/components/features/quotes/components/dashboard/*` | replaced | new bands + `links.ts` |
| `apps/web/components/features/quotes/components/quote-dashboard-page.tsx` | rewritten | thin orchestrator |
| `apps/web/components/features/quotes/components/quote-list-page.tsx` | rewritten | `CrmTable`, new filters, Stage column, no stat cards |
| `apps/web/lib/theme/tokens.ts` | modify | `col-quote-*` tracks |

---

### Task 1: Shared types and deal-stage constants

**Files:**
- Create: `libs/shared/src/types/quotes-dashboard.ts`
- Create: `libs/shared/src/utils/deal-stage.ts`
- Modify: `libs/shared/src/types/index.ts` (add one export line after `export * from './projects-dashboard';`)
- Modify: `libs/shared/src/utils/index.ts` (add one export line after `export * from './project-stage';`)

**Interfaces:**
- Produces: types `DealStage`, `DealStageFilter`, `DealAttention`, `DealMoney`, `QuotesDashboard`, `QuotesDashboardNeedsAction`, `QuotesDashboardTeamRow`, `QuotesDashboardBigDeal`, `QuotesDashboardSource`, `QuotesDashboardTrendMonth`; constants `DEAL_STAGES`, `DEAL_STAGE_FILTERS`, `DEAL_ATTENTIONS`, `DEAL_STAGE_LABELS`, `DEAL_ATTENTION_LABELS`, `LEAD_SOURCE_NOT_SET`; function `leadSourceLabel(value: string): string`.

- [ ] **Step 1: Write the types file**

`libs/shared/src/types/quotes-dashboard.ts`:

```ts
/**
 * Quotes dashboard (`GET /quotes/dashboard`) — request and response shapes.
 * A "deal" is one property with quotes, represented by one quote (the same
 * quote the quote list shows for that property). Definitions of every figure:
 * docs/superpowers/specs/2026-10-09-quotes-dashboard-design.md.
 * Money is rupees, the unit the quote list uses.
 */
import type { DashboardRange } from './projects-dashboard';

export type DealStage = 'drafting' | 'waiting' | 'quiet' | 'won' | 'lost';
/** A stage, `open` (drafting + waiting + quiet) or `pipeline` (waiting + quiet). */
export type DealStageFilter = DealStage | 'open' | 'pipeline';
export type DealAttention =
  | 'quiet_no_followup'
  | 'ends_this_week'
  | 'stale_draft'
  | 'won_no_project';

export interface DealMoney {
  count: number;
  valueRupees: number;
  /** Sum over deals with a known kW. */
  kw: number;
}

export interface QuotesDashboardNeedsAction {
  key: DealAttention;
  count: number;
  /** The two people with the most, most first. */
  owners: Array<{ personId: string; name: string; count: number }>;
  /** People beyond `owners`. */
  moreOwners: number;
}

export interface QuotesDashboardTeamRow {
  personId: string;
  name: string;
  drafting: number;
  waiting: number;
  quiet: number;
  open: number;
  /** Won in the period. */
  won: number;
}

export interface QuotesDashboardBigDeal {
  quoteId: string;
  customerName: string | null;
  kw: number | null;
  personName: string;
  stage: 'waiting' | 'quiet';
  /** Waiting: days until `valid_until`. Quiet: days since it. */
  days: number;
  valueRupees: number;
}

export interface QuotesDashboardSource {
  /** A `lead_source` value, `not_set`, or `other`. */
  key: string;
  label: string;
  count: number;
  /** Of `count`, deals that are Won now. */
  won: number;
  /** null when count < 3. */
  winPercent: number | null;
}

export interface QuotesDashboardTrendMonth {
  /** `YYYY-MM`. */
  month: string;
  newCount: number;
  newValueRupees: number;
  wonCount: number;
  wonValueRupees: number;
}

export interface QuotesDashboard {
  period: DashboardRange;
  /** Person picker options, sorted by name. Not filtered by person or financing. */
  people: Array<{ id: string; name: string }>;
  strip: {
    newDeals: { count: number; kw: number; cash: number; loan: number };
    wonValue: { valueRupees: number; kw: number; previousValueRupees: number };
    winRate: {
      newCount: number;
      wonOfNew: number;
      /** null when newCount is 0. */
      percent: number | null;
      /** Over deals won in the period; null when none. */
      medianDaysToWin: number | null;
    };
    pipeline: DealMoney;
  };
  stages: {
    drafting: DealMoney;
    waiting: DealMoney;
    quiet: DealMoney;
    /** Won in the period. */
    won: { count: number; kw: number };
    /** Lost in the period. */
    lost: { count: number; topReason: string | null };
  };
  /** Always 4 rows, in DEAL_ATTENTIONS order. */
  needsAction: QuotesDashboardNeedsAction[];
  /** First 8 people by open deals. */
  team: QuotesDashboardTeamRow[];
  teamMore: number;
  biggestOpen: QuotesDashboardBigDeal[];
  /** Up to 4 sources then `other` (only when non-zero). */
  sources: QuotesDashboardSource[];
  /** The source keys shown before `other`, so its link can exclude them. */
  topSourceKeys: string[];
  /** 12 months, oldest first. */
  trend: QuotesDashboardTrendMonth[];
}
```

- [ ] **Step 2: Write the constants file**

`libs/shared/src/utils/deal-stage.ts`:

```ts
import type { DealAttention, DealStage, DealStageFilter } from '../types/quotes-dashboard';

export const DEAL_STAGES: readonly DealStage[] = ['drafting', 'waiting', 'quiet', 'won', 'lost'];
export const DEAL_STAGE_FILTERS: readonly DealStageFilter[] = [...DEAL_STAGES, 'open', 'pipeline'];
export const DEAL_ATTENTIONS: readonly DealAttention[] = [
  'quiet_no_followup',
  'ends_this_week',
  'stale_draft',
  'won_no_project',
];

export const DEAL_STAGE_LABELS: Record<DealStageFilter, string> = {
  drafting: 'Drafting',
  waiting: 'Waiting',
  quiet: 'Gone quiet',
  won: 'Won',
  lost: 'Lost',
  open: 'Open (drafting, waiting, quiet)',
  pipeline: 'Waiting or gone quiet',
};

export const DEAL_ATTENTION_LABELS: Record<DealAttention, string> = {
  quiet_no_followup: 'Gone quiet, no follow-up',
  ends_this_week: 'Ends this week',
  stale_draft: 'Draft not sent 7+ days',
  won_no_project: 'Won, no project yet',
};

/** `customer_profiles.lead_source` empty or null, as one filterable value. */
export const LEAD_SOURCE_NOT_SET = 'not_set';

/** `walk_in` → "Walk in", `not_set` → "Not set", `Gharkul` → "Gharkul". */
export function leadSourceLabel(value: string): string {
  if (value === LEAD_SOURCE_NOT_SET) return 'Not set';
  const text = value.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
```

- [ ] **Step 3: Export both**

In `libs/shared/src/types/index.ts` add `export * from './quotes-dashboard';` directly after `export * from './projects-dashboard';`.
In `libs/shared/src/utils/index.ts` add `export * from './deal-stage';` directly after `export * from './project-stage';`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck:libs`
Expected: exit 0, no output errors.

- [ ] **Step 5: Commit**

```bash
git add libs/shared/src/types/quotes-dashboard.ts libs/shared/src/utils/deal-stage.ts libs/shared/src/types/index.ts libs/shared/src/utils/index.ts
git commit -m "feat(shared): quotes dashboard types and deal-stage constants

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Move the period helper to common

**Files:**
- Move: `apps/backend/src/modules/projects/utils/dashboard-period.ts` → `apps/backend/src/common/utils/dashboard-period.ts`
- Modify: `apps/backend/src/common/utils/index.ts`
- Modify: `apps/backend/src/modules/projects/controllers/project-dashboard.controller.ts:14`
- Modify: `apps/backend/src/modules/projects/services/project-dashboard.service.ts:14`

**Interfaces:**
- Produces: `istToday(now?: Date): string`, `addDaysIso(iso: string, n: number): string`, `resolveDashboardRange(period, from, to, today): DashboardRange` from `'../../../common/utils'`. Behavior unchanged.

- [ ] **Step 1: Move the file with git**

```bash
git mv apps/backend/src/modules/projects/utils/dashboard-period.ts apps/backend/src/common/utils/dashboard-period.ts
```

- [ ] **Step 2: Export it from common utils**

Append to `apps/backend/src/common/utils/index.ts`:

```ts
export * from './dashboard-period';
```

- [ ] **Step 3: Update the two importers**

In `project-dashboard.controller.ts` replace
`import { istToday, resolveDashboardRange } from '../utils/dashboard-period';`
with
`import { istToday, resolveDashboardRange } from '../../../common/utils';`

In `project-dashboard.service.ts` replace
`import { addDaysIso } from '../utils/dashboard-period';`
with
`import { addDaysIso } from '../../../common/utils';`

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck:backend`
Expected: exit 0. If `common/utils/index.ts` now has a name clash, the error names it; rename nothing — report it.

- [ ] **Step 5: Commit**

```bash
git add -A apps/backend/src/common/utils apps/backend/src/modules/projects
git commit -m "refactor(backend): share the dashboard period helper

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Deal facts SQL

**Files:**
- Create: `apps/backend/src/modules/quotes/sql/deal-facts.sql.ts`

**Interfaces:**
- Consumes: `systemSizeKwSqlRaw(alias)` from `'../../../common/utils/transform.util'`; `LEAD_SOURCE_NOT_SET` from `@tejas96/shared/utils`; types from Task 1.
- Produces:
  - `DEAL_FACTS_CTE: string` — CTE text (no `WITH`) ending in `deal_facts`, columns: `property_id, customer_id, quote_id, quote_status, voided, value_rupees, kw, person_id, wants_loan, lead_source, stage, new_at, won_at, lost_at, loss_reason, valid_until, quote_created_at, quiet_no_followup, ends_this_week, stale_draft, won_no_project`. `stage` is one of `drafting|waiting|quiet|won|lost|none`.
  - `DEAL_FACTS: Record<string, string>` predicate snippets on alias `df`.
  - `dealBetween(column: 'new_at' | 'won_at' | 'lost_at', fromSql: string, toSql: string): string`
  - `interface DealFactsFilters` and `buildDealFactsFilter(f): { sql: string; params: Record<string, unknown> } | null`

- [ ] **Step 1: Write the file**

```ts
import type { DealAttention, DealStageFilter } from '@tejas96/shared/types';
import { LEAD_SOURCE_NOT_SET } from '@tejas96/shared/utils';

import { systemSizeKwSqlRaw } from '../../../common/utils/transform.util';

/**
 * One row per DEAL — a customer property with at least one non-deleted quote —
 * with every fact the quotes dashboard and the quote list filters need.
 *
 * The deal's quote is the one the quote list already shows for the property
 * (`rank` in QuoteRepository.findWithFilters): a live accepted quote, else the
 * newest live quote, else the newest voided one. Keep the two in step.
 *
 * Stage, in order: won (live + accepted) → lost (rejected, or property lost) →
 * none (voided, property not lost; in no stage count) → drafting → waiting
 * (sent/viewed/expired, valid_until ≥ today) → quiet (past valid_until).
 * `viewed` and `expired` are never set reliably, so the date decides.
 *
 * Text, not a view: callers write `WITH ${DEAL_FACTS_CTE} SELECT … FROM deal_facts df`.
 * Dates and CURRENT_DATE use the session time zone, which the app sets to IST.
 * Spec: docs/superpowers/specs/2026-10-09-quotes-dashboard-design.md
 */
export const DEAL_FACTS_CTE = `
  df_quote AS (
    SELECT
      q.*,
      ROW_NUMBER() OVER (
        PARTITION BY q.property_id
        ORDER BY
          CASE WHEN q.voided_at IS NULL AND q.status = 'accepted' THEN 2
               WHEN q.voided_at IS NULL THEN 1
               ELSE 0 END DESC,
          q.created_at DESC,
          q.id DESC
      ) AS rn,
      MIN(q.created_at) OVER (PARTITION BY q.property_id) AS first_quote_at
    FROM quotes q
    WHERE q.deleted_at IS NULL AND q.property_id IS NOT NULL
  ),
  df_base AS (
    SELECT
      dq.property_id,
      dq.customer_id,
      dq.id AS quote_id,
      dq.status AS quote_status,
      (dq.voided_at IS NOT NULL) AS voided,
      COALESCE(qv.final_price, 0)::float AS value_rupees,
      (${systemSizeKwSqlRaw('qv')})::float AS kw,
      dq.created_by AS person_id,
      COALESCE(prop.wants_loan, false) AS wants_loan,
      COALESCE(NULLIF(btrim(cp.lead_source), ''), '${LEAD_SOURCE_NOT_SET}') AS lead_source,
      CASE
        WHEN dq.voided_at IS NULL AND dq.status = 'accepted' THEN 'won'
        WHEN dq.status = 'rejected' OR prop.status = 'lost' THEN 'lost'
        WHEN dq.voided_at IS NOT NULL THEN 'none'
        WHEN dq.status = 'draft' THEN 'drafting'
        WHEN dq.valid_until >= CURRENT_DATE THEN 'waiting'
        ELSE 'quiet'
      END AS stage,
      dq.first_quote_at AS new_at,
      dq.accepted_at,
      dq.updated_at AS quote_updated_at,
      prop.status AS property_status,
      prop.lost_at AS property_lost_at,
      prop.loss_reason,
      dq.valid_until,
      dq.created_at AS quote_created_at,
      EXISTS (
        SELECT 1 FROM followups f
        WHERE f.property_id = dq.property_id AND f.status = 'pending' AND f.deleted_at IS NULL
      ) AS has_pending_followup,
      EXISTS (
        SELECT 1 FROM projects p
        WHERE p.property_id = dq.property_id AND p.deleted_at IS NULL
      ) AS has_project
    FROM df_quote dq
    JOIN customer_properties prop ON prop.id = dq.property_id AND prop.deleted_at IS NULL
    LEFT JOIN customer_profiles cp ON cp.id = dq.customer_id
    LEFT JOIN LATERAL (
      SELECT v.final_price, v.total_wattage_wp
      FROM quote_versions v
      WHERE v.quote_id = dq.id
      ORDER BY v.created_at DESC, v.version_number DESC, v.id DESC
      LIMIT 1
    ) qv ON true
    WHERE dq.rn = 1
  ),
  deal_facts AS (
    SELECT
      b.property_id, b.customer_id, b.quote_id, b.quote_status, b.voided,
      b.value_rupees, b.kw, b.person_id, b.wants_loan, b.lead_source, b.stage,
      b.new_at,
      CASE WHEN b.stage = 'won' THEN b.accepted_at END AS won_at,
      CASE WHEN b.stage = 'lost' THEN
        CASE WHEN b.property_status = 'lost' AND b.property_lost_at IS NOT NULL
             THEN b.property_lost_at ELSE b.quote_updated_at END
      END AS lost_at,
      b.loss_reason,
      b.valid_until,
      b.quote_created_at,
      (b.stage = 'quiet' AND NOT b.has_pending_followup) AS quiet_no_followup,
      (b.stage = 'waiting' AND b.valid_until <= CURRENT_DATE + 6) AS ends_this_week,
      (b.stage = 'drafting' AND b.quote_created_at < now() - interval '7 days') AS stale_draft,
      (b.stage = 'won' AND NOT b.has_project) AS won_no_project
    FROM df_base b
  )
`;

/**
 * Every "which deals" rule the dashboard counts with and the list filters by.
 * Both embed these exact strings, so a card can never disagree with the list
 * it opens (spec D9). Alias is always `df`.
 */
export const DEAL_FACTS = {
  drafting: "df.stage = 'drafting'",
  waiting: "df.stage = 'waiting'",
  quiet: "df.stage = 'quiet'",
  won: "df.stage = 'won'",
  lost: "df.stage = 'lost'",
  open: "df.stage IN ('drafting', 'waiting', 'quiet')",
  pipeline: "df.stage IN ('waiting', 'quiet')",
  loan: 'df.wants_loan',
  cash: 'NOT df.wants_loan',
  quiet_no_followup: 'df.quiet_no_followup',
  ends_this_week: 'df.ends_this_week',
  stale_draft: 'df.stale_draft',
  won_no_project: 'df.won_no_project',
} as const satisfies Record<DealStageFilter | DealAttention | 'loan' | 'cash', string>;

/** `CAST` rather than `::date` so the same text works with `$3` and with TypeORM `:name`. */
export const dealBetween = (
  column: 'new_at' | 'won_at' | 'lost_at',
  fromSql: string,
  toSql: string,
): string =>
  `CAST(df.${column} AS date) BETWEEN CAST(${fromSql} AS date) AND CAST(${toSql} AS date)`;

export interface DealFactsFilters {
  stage?: DealStageFilter;
  person?: string;
  financing?: 'cash' | 'loan';
  attention?: DealAttention;
  leadSource?: string;
  /** Comma list of lead-source values to exclude (the dashboard's "Other" row). */
  leadSourceNotIn?: string;
  newFrom?: string;
  newTo?: string;
  wonFrom?: string;
  wonTo?: string;
  lostFrom?: string;
  lostTo?: string;
}

/**
 * The quote-list facts filter as a standalone query: `SELECT df.quote_id …`
 * with TypeORM `:name` parameters, or null when no facts filter is set (the
 * common list query stays untouched). The caller runs it once and narrows the
 * list to those quote ids — the deal's own quote — so the list's
 * one-row-per-property collapse returns exactly the deals the dashboard counted.
 */
export function buildDealFactsFilter(
  f: DealFactsFilters | undefined,
): { sql: string; params: Record<string, unknown> } | null {
  if (!f) return null;
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (f.stage) where.push(DEAL_FACTS[f.stage]);
  if (f.attention) where.push(DEAL_FACTS[f.attention]);
  if (f.financing) where.push(f.financing === 'loan' ? DEAL_FACTS.loan : DEAL_FACTS.cash);
  if (f.person) {
    where.push('df.person_id = :dfPerson');
    params.dfPerson = f.person;
  }
  if (f.leadSource) {
    where.push('df.lead_source = :dfLeadSource');
    params.dfLeadSource = f.leadSource;
  }
  if (f.leadSourceNotIn) {
    const excluded = f.leadSourceNotIn
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (excluded.length > 0) {
      where.push('df.lead_source NOT IN (:...dfLeadSourceNotIn)');
      params.dfLeadSourceNotIn = excluded;
    }
  }

  const range = (
    column: 'new_at' | 'won_at' | 'lost_at',
    from: string | undefined,
    to: string | undefined,
    key: string,
  ): void => {
    if (from) {
      where.push(`CAST(df.${column} AS date) >= CAST(:${key}From AS date)`);
      params[`${key}From`] = from;
    }
    if (to) {
      where.push(`CAST(df.${column} AS date) <= CAST(:${key}To AS date)`);
      params[`${key}To`] = to;
    }
  };
  range('new_at', f.newFrom, f.newTo, 'dfNew');
  range('won_at', f.wonFrom, f.wonTo, 'dfWon');
  range('lost_at', f.lostFrom, f.lostTo, 'dfLost');

  if (where.length === 0) return null;
  return {
    sql: `WITH ${DEAL_FACTS_CTE} SELECT df.quote_id FROM deal_facts df WHERE ${where
      .map((w) => `(${w})`)
      .join(' AND ')}`,
    params,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck:backend`
Expected: exit 0.

- [ ] **Step 3: Run the CTE against local data and compare with independent SQL**

Print the CTE text and run it (read-only):

```bash
cd /Volumes/works-space/oneohm/oneohm
npx ts-node -T -r tsconfig-paths/register -P apps/backend/tsconfig.json -e "process.stdout.write(require('./apps/backend/src/modules/quotes/sql/deal-facts.sql').DEAL_FACTS_CTE)" > "$SCRATCH/deal-facts.sql"
{ echo "SET timezone = 'Asia/Kolkata';"; echo "WITH"; cat "$SCRATCH/deal-facts.sql"; echo "SELECT stage, COUNT(*), COUNT(*) FILTER (WHERE quiet_no_followup) qnf, COUNT(*) FILTER (WHERE ends_this_week) etw, COUNT(*) FILTER (WHERE stale_draft) sd, COUNT(*) FILTER (WHERE won_no_project) wnp FROM deal_facts GROUP BY 1 ORDER BY 1;"; } | docker exec -i oneohm-postgres psql -U root -d oneohm_epc
```

(If `ts-node -e` cannot resolve the path alias, copy the template body from the file by hand into `"$SCRATCH/deal-facts.sql"`, replacing `${systemSizeKwSqlRaw('qv')}` with `CASE WHEN qv.total_wattage_wp > 0 THEN ROUND((qv.total_wattage_wp / 1000.0)::numeric, 2) ELSE NULL END` and `${LEAD_SOURCE_NOT_SET}` with `not_set`.)

Expected (local snapshot, 2026-10-09): roughly drafting 364, quiet 229, won 227, lost ≈ 17 (4 rejected-latest + property-lost deals incl. 13 fully voided), none ≈ 6; `wnp` ≈ 7. Exact numbers may move if data changed; what must hold: (a) the stage counts sum to the number of non-deleted properties with a non-deleted quote:

```sql
SELECT COUNT(DISTINCT q.property_id) FROM quotes q JOIN customer_properties p ON p.id = q.property_id AND p.deleted_at IS NULL WHERE q.deleted_at IS NULL;
```

and (b) every `quote_id` equals the quote the list picks. Check (b) by comparing with the list endpoint in Task 4.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/quotes/sql/deal-facts.sql.ts
git commit -m "feat(quotes): deal facts SQL — one row per deal, shared by dashboard and list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Quote list — deal filters and `dealStage`

**Files:**
- Modify: `apps/backend/src/modules/quotes/dto/quotes/quote-query.dto.ts` (add fields before `// ==================== Sorting`)
- Modify: `apps/backend/src/modules/quotes/repositories/quote.repository.ts` (`findWithFilters`, after the `toDate` block; new method `findDealStages`)
- Modify: `apps/backend/src/modules/quotes/dto/quotes/quote-response.dto.ts` (new `@Expose() dealStage`)
- Modify: `apps/backend/src/modules/quotes/services/quote.service.ts:214-217` (`findAll`)

**Interfaces:**
- Consumes: `buildDealFactsFilter`, `DEAL_FACTS_CTE` (Task 3); `DEAL_STAGE_FILTERS`, `DEAL_ATTENTIONS` (Task 1).
- Produces: `GET /quotes` accepts `stage, person, financing, attention, leadSource, leadSourceNotIn, newFrom, newTo, wonFrom, wonTo, lostFrom, lostTo`. Each item carries `dealStage: DealStage | null`.

- [ ] **Step 1: Add DTO fields**

Add to the imports of `quote-query.dto.ts`: `IsIn, Matches, MaxLength` (from `class-validator`), `import type { DealAttention, DealStageFilter } from '@tejas96/shared/types';` and `import { DEAL_ATTENTIONS, DEAL_STAGE_FILTERS } from '@tejas96/shared/utils';`. Above the class add `const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;`. Then add inside the class, before the Sorting section:

```ts
  // ==================== Deal filters (dashboard drill-downs) ====================
  // Applied through DEAL_FACTS_CTE, so they pin each property to its deal quote.

  @ApiPropertyOptional({ enum: DEAL_STAGE_FILTERS })
  @IsOptional()
  @IsIn(DEAL_STAGE_FILTERS)
  stage?: DealStageFilter;

  @ApiPropertyOptional({ description: 'User who made the deal quote (quotes.created_by)' })
  @IsOptional()
  @IsUUID()
  person?: string;

  @ApiPropertyOptional({ enum: ['cash', 'loan'] })
  @IsOptional()
  @IsIn(['cash', 'loan'])
  financing?: 'cash' | 'loan';

  @ApiPropertyOptional({ enum: DEAL_ATTENTIONS })
  @IsOptional()
  @IsIn(DEAL_ATTENTIONS)
  attention?: DealAttention;

  @ApiPropertyOptional({ example: 'referral', description: "A lead_source value, or 'not_set'" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  leadSource?: string;

  @ApiPropertyOptional({ example: 'referral,advertisement', description: 'Comma list to exclude' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  leadSourceNotIn?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'First quote on the property, from (IST day)' })
  @IsOptional()
  @Matches(ISO_DAY)
  newFrom?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @Matches(ISO_DAY)
  newTo?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Accepted date, from (IST day)' })
  @IsOptional()
  @Matches(ISO_DAY)
  wonFrom?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @Matches(ISO_DAY)
  wonTo?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Lost date, from (IST day)' })
  @IsOptional()
  @Matches(ISO_DAY)
  lostFrom?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @Matches(ISO_DAY)
  lostTo?: string;
```

- [ ] **Step 2: Apply the facts filter in the repository**

In `quote.repository.ts` add `import { buildDealFactsFilter, DEAL_FACTS_CTE } from '../sql/deal-facts.sql';` and `import type { DealStage } from '@tejas96/shared/types';` (merge into the existing `@tejas96/shared/types` import). Directly after the `if (query.toDate) { … }` block in `findWithFilters`, insert:

```ts
    // Dashboard drill-downs. Same SQL rules the dashboard counts with, so the number
    // on a card is the number of rows here. The CTE runs once, here, and narrows the
    // query to each deal's own quote — the collapse below then keeps exactly that one.
    const dealFilter = buildDealFactsFilter(query);
    if (dealFilter) {
      const [dealSql, dealParams] =
        this.repository.manager.connection.driver.escapeQueryWithParameters(
          dealFilter.sql,
          dealFilter.params,
          {},
        );
      const dealRows: { quote_id: string }[] = await this.repository.query(dealSql, dealParams);
      if (dealRows.length === 0) return [[], 0];
      qb.andWhere('quote.id IN (:...dfQuoteIds)', { dfQuoteIds: dealRows.map((r) => r.quote_id) });
    }
```

Add this method to the class (after `findWithFilters`):

```ts
  /**
   * The deal stage of each given quote, for quotes that are their property's
   * deal quote. Other quotes (an older version shown on one property's history)
   * are absent from the map.
   */
  async findDealStages(quoteIds: string[]): Promise<Map<string, DealStage | null>> {
    if (quoteIds.length === 0) return new Map();
    const rows: { quote_id: string; stage: string }[] = await this.repository.query(
      `WITH ${DEAL_FACTS_CTE} SELECT df.quote_id, df.stage FROM deal_facts df WHERE df.quote_id = ANY($1::uuid[])`,
      [quoteIds],
    );
    return new Map(
      rows.map((r) => [r.quote_id, r.stage === 'none' ? null : (r.stage as DealStage)]),
    );
  }
```

- [ ] **Step 3: Expose `dealStage` on the response DTO**

In `quote-response.dto.ts`, inside `QuoteResponseDto`, add (after the `voidReason` field; add `import type { DealStage } from '@tejas96/shared/types';` if not already importable from the existing types import):

```ts
  @ApiPropertyOptional({
    enum: ['drafting', 'waiting', 'quiet', 'won', 'lost'],
    nullable: true,
    description: 'The deal stage, when this quote is its property’s deal quote (list only)',
  })
  @Expose()
  dealStage?: DealStage | null;
```

(Use `ApiPropertyOptional` from `@nestjs/swagger`; add it to that import if missing.)

- [ ] **Step 4: Attach stages in the service**

Replace `QuoteService.findAll` (`quote.service.ts:214-217`) with:

```ts
  async findAll(query: QuoteQueryDto): Promise<{ data: QuoteEntity[]; total: number }> {
    const [data, total] = await this.quoteRepository.findWithFilters(query);
    const stages = await this.quoteRepository.findDealStages(data.map((q) => q.id));
    for (const quote of data) {
      (quote as QuoteEntity & { dealStage?: DealStage | null }).dealStage =
        stages.get(quote.id) ?? null;
    }
    return { data, total };
  }
```

Add `DealStage` to the file's `@tejas96/shared/types` import.

- [ ] **Step 5: Typecheck and restart**

Run: `npm run typecheck:backend` → exit 0. Restart the backend (`preview_stop` the backend server, `preview_start` name `backend`); wait until `curl -s -o /dev/null -w '%{http_code}' http://localhost:8085/` prints `404` (server up).

- [ ] **Step 6: Verify each filter against SQL**

With `TOKEN` = the `accessToken` cookie value:

```bash
for q in "stage=drafting" "stage=waiting" "stage=quiet" "stage=won" "stage=lost" "stage=open" "stage=pipeline" "attention=quiet_no_followup" "attention=won_no_project" "financing=loan" "leadSource=referral" "leadSource=not_set" "leadSourceNotIn=referral,not_set" "newFrom=2026-09-01&newTo=2026-09-30" "wonFrom=2026-09-01&wonTo=2026-09-30"; do
  printf "%-40s " "$q"; curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8085/quotes?limit=1&$q" | python3 -c "import sys,json; print(json.load(sys.stdin)['meta']['total'])"
done
```

For each, run the same rule in SQL (Step 3's `"$SCRATCH/deal-facts.sql"` with a `WHERE`), e.g.:

```bash
{ echo "SET timezone = 'Asia/Kolkata'; WITH"; cat "$SCRATCH/deal-facts.sql"; echo "SELECT COUNT(*) FROM deal_facts df WHERE df.stage IN ('waiting','quiet');"; } | docker exec -i oneohm-postgres psql -U root -d oneohm_epc -At
```

Expected: every API total equals its SQL count. Then check one page of rows carries the stage:

```bash
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8085/quotes?limit=3&stage=quiet" | python3 -c "import sys,json; print([(r['quoteNumber'], r.get('dealStage')) for r in json.load(sys.stdin)['data']])"
```

Expected: three rows, each `dealStage == 'quiet'`. And the plain list still works: `curl … /quotes?limit=5` returns 5 rows with `dealStage` set (or `null` for "no live quote" deals). Also check a bad value is refused: `curl … '/quotes?stage=bogus'` → HTTP 400.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/quotes
git commit -m "feat(quotes): deal filters and dealStage on the quote list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `GET /quotes/dashboard`

**Files:**
- Create: `apps/backend/src/modules/quotes/dto/dashboard/quotes-dashboard-query.dto.ts`
- Create: `apps/backend/src/modules/quotes/services/quote-dashboard.service.ts`
- Create: `apps/backend/src/modules/quotes/controllers/quote-dashboard.controller.ts`
- Modify: `apps/backend/src/modules/quotes/controllers/index.ts`
- Modify: `apps/backend/src/modules/quotes/quotes.module.ts:4,34`

**Interfaces:**
- Consumes: `DEAL_FACTS_CTE`, `DEAL_FACTS`, `dealBetween` (Task 3); `istToday`, `resolveDashboardRange` (Task 2); `DASHBOARD_PERIODS`, `DASHBOARD_FINANCING` from `../../projects/dto/dashboard/projects-dashboard-query.dto`; types (Task 1).
- Produces: `GET /quotes/dashboard?period&from&to&person&financing` → `QuotesDashboard`. Resellers get 403 (no `@ResellerAllowed()`).

- [ ] **Step 1: Query DTO**

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { DashboardFinancing, DashboardPeriod } from '@tejas96/shared/types';
import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';

import {
  DASHBOARD_FINANCING,
  DASHBOARD_PERIODS,
} from '../../../projects/dto/dashboard/projects-dashboard-query.dto';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export class QuotesDashboardQueryDto {
  @ApiPropertyOptional({ enum: DASHBOARD_PERIODS, default: 'this_month' })
  @IsOptional()
  @IsIn(DASHBOARD_PERIODS)
  period?: DashboardPeriod;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'Required when period=custom' })
  @IsOptional()
  @Matches(ISO_DAY)
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'Required when period=custom' })
  @IsOptional()
  @Matches(ISO_DAY)
  to?: string;

  @ApiPropertyOptional({ description: 'Only deals whose quote this user made' })
  @IsOptional()
  @IsUUID()
  person?: string;

  @ApiPropertyOptional({ enum: DASHBOARD_FINANCING, default: 'all' })
  @IsOptional()
  @IsIn(DASHBOARD_FINANCING)
  financing?: DashboardFinancing;
}
```

- [ ] **Step 2: Service**

`quote-dashboard.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import type {
  DashboardRange,
  DealAttention,
  QuotesDashboard,
  QuotesDashboardNeedsAction,
  QuotesDashboardSource,
} from '@tejas96/shared/types';
import { DEAL_ATTENTIONS, leadSourceLabel } from '@tejas96/shared/utils';
import { DataSource } from 'typeorm';

import { DEAL_FACTS, DEAL_FACTS_CTE, dealBetween } from '../sql/deal-facts.sql';

/** `$1` person (null = everyone), `$2` financing ('cash' | 'loan' | null). */
const SCOPED = `
  WITH ${DEAL_FACTS_CTE},
  scoped AS (
    SELECT df.* FROM deal_facts df
    WHERE ($1::uuid IS NULL OR df.person_id = $1::uuid)
      AND ($2::text IS NULL
           OR ($2::text = 'loan' AND ${DEAL_FACTS.loan})
           OR ($2::text = 'cash' AND ${DEAL_FACTS.cash}))
  )`;

const PERSON_NAME = `COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), 'Unknown')`;
const inPeriod = (c: 'new_at' | 'won_at' | 'lost_at'): string => dealBetween(c, '$3', '$4');

/** $3 from, $4 to, $5 previousFrom, $6 previousTo */
const STRIP_SQL = `${SCOPED}
  SELECT
    COUNT(*) FILTER (WHERE ${inPeriod('new_at')})::int AS "newCount",
    COALESCE(SUM(df.kw) FILTER (WHERE ${inPeriod('new_at')}), 0)::float AS "newKw",
    COUNT(*) FILTER (WHERE ${inPeriod('new_at')} AND ${DEAL_FACTS.loan})::int AS "newLoan",
    COUNT(*) FILTER (WHERE ${inPeriod('new_at')} AND ${DEAL_FACTS.won})::int AS "wonOfNew",
    COUNT(*) FILTER (WHERE ${inPeriod('won_at')})::int AS "wonCount",
    COALESCE(SUM(df.value_rupees) FILTER (WHERE ${inPeriod('won_at')}), 0)::float AS "wonValue",
    COALESCE(SUM(df.kw) FILTER (WHERE ${inPeriod('won_at')}), 0)::float AS "wonKw",
    COALESCE(SUM(df.value_rupees) FILTER (WHERE ${dealBetween('won_at', '$5', '$6')}), 0)::float AS "wonValuePrevious",
    percentile_cont(0.5) WITHIN GROUP (ORDER BY (CAST(df.won_at AS date) - CAST(df.new_at AS date)))
      FILTER (WHERE ${inPeriod('won_at')}) AS "medianDaysToWin",
    COUNT(*) FILTER (WHERE ${inPeriod('lost_at')})::int AS "lostCount",
    mode() WITHIN GROUP (ORDER BY df.loss_reason)
      FILTER (WHERE ${inPeriod('lost_at')} AND df.loss_reason IS NOT NULL) AS "topLossReason",
    COUNT(*) FILTER (WHERE ${DEAL_FACTS.drafting})::int AS "draftingCount",
    COALESCE(SUM(df.value_rupees) FILTER (WHERE ${DEAL_FACTS.drafting}), 0)::float AS "draftingValue",
    COALESCE(SUM(df.kw) FILTER (WHERE ${DEAL_FACTS.drafting}), 0)::float AS "draftingKw",
    COUNT(*) FILTER (WHERE ${DEAL_FACTS.waiting})::int AS "waitingCount",
    COALESCE(SUM(df.value_rupees) FILTER (WHERE ${DEAL_FACTS.waiting}), 0)::float AS "waitingValue",
    COALESCE(SUM(df.kw) FILTER (WHERE ${DEAL_FACTS.waiting}), 0)::float AS "waitingKw",
    COUNT(*) FILTER (WHERE ${DEAL_FACTS.quiet})::int AS "quietCount",
    COALESCE(SUM(df.value_rupees) FILTER (WHERE ${DEAL_FACTS.quiet}), 0)::float AS "quietValue",
    COALESCE(SUM(df.kw) FILTER (WHERE ${DEAL_FACTS.quiet}), 0)::float AS "quietKw"
  FROM scoped df`;

/** One row per (attention key, person) with a count. */
const NEEDS_SQL = `${SCOPED}
  SELECT k.key, df.person_id AS "personId", ${PERSON_NAME} AS "name", COUNT(*)::int AS "count"
  FROM scoped df
  CROSS JOIN LATERAL (VALUES
    ('quiet_no_followup', df.quiet_no_followup),
    ('ends_this_week', df.ends_this_week),
    ('stale_draft', df.stale_draft),
    ('won_no_project', df.won_no_project)
  ) AS k(key, hit)
  LEFT JOIN users u ON u.id = df.person_id
  WHERE k.hit
  GROUP BY k.key, df.person_id, u.first_name, u.last_name
  ORDER BY k.key, "count" DESC, "name"`;

/** $3 from, $4 to. People with open deals or wins in the period. */
const TEAM_SQL = `${SCOPED}
  SELECT df.person_id AS "personId", ${PERSON_NAME} AS "name",
    COUNT(*) FILTER (WHERE ${DEAL_FACTS.drafting})::int AS "drafting",
    COUNT(*) FILTER (WHERE ${DEAL_FACTS.waiting})::int AS "waiting",
    COUNT(*) FILTER (WHERE ${DEAL_FACTS.quiet})::int AS "quiet",
    COUNT(*) FILTER (WHERE ${DEAL_FACTS.open})::int AS "open",
    COUNT(*) FILTER (WHERE ${inPeriod('won_at')})::int AS "won"
  FROM scoped df
  LEFT JOIN users u ON u.id = df.person_id
  GROUP BY df.person_id, u.first_name, u.last_name
  HAVING COUNT(*) FILTER (WHERE ${DEAL_FACTS.open}) > 0
      OR COUNT(*) FILTER (WHERE ${inPeriod('won_at')}) > 0
  ORDER BY "open" DESC, "won" DESC, "name"`;

const BIGGEST_SQL = `${SCOPED}
  SELECT df.quote_id AS "quoteId",
    NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '') AS "customerName",
    df.kw, ${PERSON_NAME} AS "personName", df.stage,
    CASE WHEN df.stage = 'waiting' THEN (df.valid_until - CURRENT_DATE)
         ELSE (CURRENT_DATE - df.valid_until) END::int AS "days",
    df.value_rupees AS "valueRupees"
  FROM scoped df
  LEFT JOIN customer_profiles cp ON cp.id = df.customer_id
  LEFT JOIN users u ON u.id = df.person_id
  WHERE ${DEAL_FACTS.pipeline}
  ORDER BY df.value_rupees DESC, df.quote_created_at DESC
  LIMIT 5`;

/** $3 from, $4 to. New deals in the period by lead source. */
const SOURCES_SQL = `${SCOPED}
  SELECT df.lead_source AS "key", COUNT(*)::int AS "count",
    COUNT(*) FILTER (WHERE ${DEAL_FACTS.won})::int AS "won"
  FROM scoped df
  WHERE ${inPeriod('new_at')}
  GROUP BY 1
  ORDER BY 2 DESC, 1`;

/** $3 the IST today. */
const TREND_SQL = `${SCOPED},
  months AS (
    SELECT generate_series(
      date_trunc('month', $3::date) - interval '11 months',
      date_trunc('month', $3::date),
      interval '1 month'
    )::date AS m
  ),
  dated AS (
    SELECT df.value_rupees,
      date_trunc('month', df.new_at)::date AS new_month,
      date_trunc('month', df.won_at)::date AS won_month
    FROM scoped df
  )
  SELECT to_char(mo.m, 'YYYY-MM') AS "month",
    COUNT(*) FILTER (WHERE d.new_month = mo.m)::int AS "newCount",
    COALESCE(SUM(d.value_rupees) FILTER (WHERE d.new_month = mo.m), 0)::float AS "newValue",
    COUNT(*) FILTER (WHERE d.won_month = mo.m)::int AS "wonCount",
    COALESCE(SUM(d.value_rupees) FILTER (WHERE d.won_month = mo.m), 0)::float AS "wonValue"
  FROM months mo
  LEFT JOIN dated d ON d.new_month = mo.m OR d.won_month = mo.m
  GROUP BY mo.m
  ORDER BY mo.m`;

/** $1 the IST today. Everyone with an open deal or a deal new in the last 12 months. */
const PEOPLE_SQL = `WITH ${DEAL_FACTS_CTE}
  SELECT DISTINCT df.person_id AS "id", ${PERSON_NAME} AS "name"
  FROM deal_facts df
  LEFT JOIN users u ON u.id = df.person_id
  WHERE df.person_id IS NOT NULL
    AND (${DEAL_FACTS.open} OR CAST(df.new_at AS date) >= $1::date - interval '12 months')
  ORDER BY "name"`;

type Row = Record<string, unknown>;
const num = (v: unknown): number => Number(v ?? 0);
const TEAM_LIMIT = 8;
const SOURCE_LIMIT = 4;
const MIN_FOR_WIN_RATE = 3;

@Injectable()
export class QuoteDashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getDashboard(input: {
    range: DashboardRange;
    today: string;
    person: string | null;
    financing: 'cash' | 'loan' | null;
  }): Promise<QuotesDashboard> {
    const { range } = input;
    const base = [input.person, input.financing];
    const period = [...base, range.from, range.to];

    const [[s = {}], needsRows, teamRows, bigRows, sourceRows, trendRows, peopleRows] =
      await Promise.all([
        this.rows(STRIP_SQL, [...period, range.previousFrom, range.previousTo]),
        this.rows(NEEDS_SQL, base),
        this.rows(TEAM_SQL, period),
        this.rows(BIGGEST_SQL, base),
        this.rows(SOURCES_SQL, period),
        this.rows(TREND_SQL, [...base, input.today]),
        this.rows(PEOPLE_SQL, [input.today]),
      ]);

    const newCount = num(s.newCount);
    const newLoan = num(s.newLoan);
    const wonOfNew = num(s.wonOfNew);
    const money = (k: 'drafting' | 'waiting' | 'quiet') => ({
      count: num(s[`${k}Count`]),
      valueRupees: num(s[`${k}Value`]),
      kw: num(s[`${k}Kw`]),
    });
    const waiting = money('waiting');
    const quiet = money('quiet');
    const { sources, topSourceKeys } = this.shapeSources(sourceRows);

    return {
      period: range,
      people: peopleRows.map((r) => ({ id: String(r.id), name: String(r.name) })),
      strip: {
        newDeals: { count: newCount, kw: num(s.newKw), loan: newLoan, cash: newCount - newLoan },
        wonValue: {
          valueRupees: num(s.wonValue),
          kw: num(s.wonKw),
          previousValueRupees: num(s.wonValuePrevious),
        },
        winRate: {
          newCount,
          wonOfNew,
          percent: newCount > 0 ? Math.round((wonOfNew * 100) / newCount) : null,
          medianDaysToWin: s.medianDaysToWin == null ? null : Math.round(num(s.medianDaysToWin)),
        },
        pipeline: {
          count: waiting.count + quiet.count,
          valueRupees: waiting.valueRupees + quiet.valueRupees,
          kw: waiting.kw + quiet.kw,
        },
      },
      stages: {
        drafting: money('drafting'),
        waiting,
        quiet,
        won: { count: num(s.wonCount), kw: num(s.wonKw) },
        lost: {
          count: num(s.lostCount),
          topReason: s.topLossReason == null ? null : leadSourceLabel(String(s.topLossReason)),
        },
      },
      needsAction: DEAL_ATTENTIONS.map((key) => this.shapeNeeds(key, needsRows)),
      team: teamRows.slice(0, TEAM_LIMIT).map((r) => ({
        personId: String(r.personId),
        name: String(r.name),
        drafting: num(r.drafting),
        waiting: num(r.waiting),
        quiet: num(r.quiet),
        open: num(r.open),
        won: num(r.won),
      })),
      teamMore: Math.max(0, teamRows.length - TEAM_LIMIT),
      biggestOpen: bigRows.map((r) => ({
        quoteId: String(r.quoteId),
        customerName: (r.customerName as string | null) ?? null,
        kw: r.kw == null ? null : num(r.kw),
        personName: String(r.personName),
        stage: r.stage === 'waiting' ? 'waiting' : 'quiet',
        days: num(r.days),
        valueRupees: num(r.valueRupees),
      })),
      sources,
      topSourceKeys,
      trend: trendRows.map((r) => ({
        month: String(r.month),
        newCount: num(r.newCount),
        newValueRupees: num(r.newValue),
        wonCount: num(r.wonCount),
        wonValueRupees: num(r.wonValue),
      })),
    };
  }

  private shapeNeeds(key: DealAttention, rows: Row[]): QuotesDashboardNeedsAction {
    const mine = rows.filter((r) => r.key === key);
    return {
      key,
      count: mine.reduce((a, r) => a + num(r.count), 0),
      owners: mine.slice(0, 2).map((r) => ({
        personId: String(r.personId),
        name: String(r.name),
        count: num(r.count),
      })),
      moreOwners: Math.max(0, mine.length - 2),
    };
  }

  private shapeSources(rows: Row[]): {
    sources: QuotesDashboardSource[];
    topSourceKeys: string[];
  } {
    const row = (key: string, label: string, count: number, won: number): QuotesDashboardSource => ({
      key,
      label,
      count,
      won,
      winPercent: count >= MIN_FOR_WIN_RATE ? Math.round((won * 100) / count) : null,
    });
    const top = rows.slice(0, SOURCE_LIMIT);
    const rest = rows.slice(SOURCE_LIMIT);
    const sources = top.map((r) =>
      row(String(r.key), leadSourceLabel(String(r.key)), num(r.count), num(r.won)),
    );
    const restCount = rest.reduce((a, r) => a + num(r.count), 0);
    if (restCount > 0) {
      sources.push(
        row('other', 'Other', restCount, rest.reduce((a, r) => a + num(r.won), 0)),
      );
    }
    return { sources, topSourceKeys: top.map((r) => String(r.key)) };
  }

  /** `DataSource.query` returns `any`; this pins the row type once. */
  private async rows(sql: string, params: unknown[]): Promise<Row[]> {
    const result: Row[] = await this.dataSource.query(sql, params);
    return result;
  }
}
```

- [ ] **Step 3: Controller**

`quote-dashboard.controller.ts`:

```ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { QuotesDashboard } from '@tejas96/shared/types';

import { istToday, resolveDashboardRange } from '../../../common/utils';
import { JwtAuthGuard } from '../../auth/guards';
import { QuotesDashboardQueryDto } from '../dto/dashboard/quotes-dashboard-query.dto';
import { QuoteDashboardService } from '../services/quote-dashboard.service';

const toFinancing = (v: string | undefined): 'cash' | 'loan' | null =>
  v === 'cash' || v === 'loan' ? v : null;

/**
 * The /quotes deal dashboard. Its own controller, registered before
 * QuoteController, so `dashboard` is never read as a quote `:id`.
 * No @ResellerAllowed(): resellers have no web login and get 403 here.
 */
@ApiTags('Quotes & Quotations')
@ApiBearerAuth()
@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuoteDashboardController {
  constructor(private readonly dashboard: QuoteDashboardService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Quotes dashboard',
    description:
      'Deals (one per property) by stage, needs action, team, biggest open deals, lead sources ' +
      'and a 12-month trend — all from DEAL_FACTS_CTE, so each figure equals the quote list it links to.',
  })
  async getDashboard(@Query() query: QuotesDashboardQueryDto): Promise<QuotesDashboard> {
    const today = istToday();
    return this.dashboard.getDashboard({
      range: resolveDashboardRange(query.period ?? 'this_month', query.from, query.to, today),
      today,
      person: query.person ?? null,
      financing: toFinancing(query.financing),
    });
  }
}
```

- [ ] **Step 4: Register controller and service**

In `apps/backend/src/modules/quotes/controllers/index.ts` add `export * from './quote-dashboard.controller';`.
In `quotes.module.ts`: import `QuoteDashboardController` alongside the other controllers and `QuoteDashboardService` from `./services/quote-dashboard.service`; set `controllers: [QuoteDashboardController, QuoteController, QuoteCalculatorController]` (dashboard FIRST) and add `QuoteDashboardService` to `providers`.

- [ ] **Step 5: Typecheck and restart**

Run `npm run typecheck:backend` → exit 0. Restart the backend as in Task 4 Step 5.

- [ ] **Step 6: Verify the endpoint against SQL and the list**

```bash
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8085/quotes/dashboard?period=custom&from=2026-09-01&to=2026-09-30" | python3 -m json.tool | head -80
```

Expected: HTTP 200, JSON with every key of `QuotesDashboard`; `needsAction` has 4 rows in order; `trend` has 12 months ending with the current month.

Cross-check each number with the list endpoint (both read the same facts):

| Dashboard field | List call that must return the same `meta.total` |
|---|---|
| `stages.drafting.count` | `/quotes?limit=1&stage=drafting` |
| `stages.waiting.count` | `/quotes?limit=1&stage=waiting` |
| `stages.quiet.count` | `/quotes?limit=1&stage=quiet` |
| `strip.pipeline.count` | `/quotes?limit=1&stage=pipeline` |
| `stages.won.count` (Sep) | `/quotes?limit=1&stage=won&wonFrom=2026-09-01&wonTo=2026-09-30` |
| `strip.newDeals.count` (Sep) | `/quotes?limit=1&newFrom=2026-09-01&newTo=2026-09-30` |
| `strip.winRate.wonOfNew` | `/quotes?limit=1&stage=won&newFrom=2026-09-01&newTo=2026-09-30` |
| each `needsAction[i].count` | `/quotes?limit=1&attention=<key>` |
| `needsAction[0].owners[0].count` | `/quotes?limit=1&attention=quiet_no_followup&person=<personId>` |
| first `sources[i].count` | `/quotes?limit=1&leadSource=<key>&newFrom=…&newTo=…` |

Also: `?financing=loan` and `?person=<a personId from people>` change the numbers, and the list calls with the same `financing` / `person` still match. `?period=custom&from=2026-09-30&to=2026-09-01` → 400. A reseller token (if one exists locally; else skip and note) → 403.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/quotes
git commit -m "feat(quotes): GET /quotes/dashboard from deal facts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Backend cleanup — `markExpiredQuotes`

**Files:**
- Modify: `apps/backend/src/modules/quotes/services/quote.service.ts` (delete the `markExpiredQuotes` method, ~line 927)
- Modify: `apps/backend/src/modules/dashboard/providers/workflow.provider.ts:154-156` (comment)

- [ ] **Step 1: Confirm it is unused**

Run: `grep -rn "markExpiredQuotes" apps libs --include='*.ts' | grep -v '/dist/'`
Expected: only the definition in `quote.service.ts` and the comment in `workflow.provider.ts`.

- [ ] **Step 2: Delete the method** (its JSDoc too) from `quote.service.ts`. Remove any import that becomes unused (the typecheck/lint step shows it).

- [ ] **Step 3: Update the comment** in `workflow.provider.ts` lines 154-156 to:

```sql
  -- 7/8. Expiry is computed from valid_until, NEVER read from status: nothing
  -- sets 'expired', so a quote past its date still says 'sent'. See quote.service.ts.
```

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck:backend` → exit 0. Run: `npx nx lint backend` → no new errors.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/quotes/services/quote.service.ts apps/backend/src/modules/dashboard/providers/workflow.provider.ts
git commit -m "refactor(quotes): drop never-called markExpiredQuotes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Web dashboard kit (move from projects, no behavior change)

**Files:**
- Move (git mv) from `apps/web/components/features/projects/components/dashboard/` to `apps/web/components/features/dashboard/kit/`: `animated-number.tsx`, `motion.ts`, `format.ts`, `filter-bar.tsx`, `use-dashboard-filters.ts`
- Create: `apps/web/components/features/dashboard/kit/band-error.tsx` (cut `BandError` out of projects' `band-state.tsx`)
- Create: `apps/web/components/features/dashboard/kit/index.ts`
- Modify: projects dashboard files that imported the moved ones; `projects/components/dashboard/index.ts`
- Modify: `apps/web/lib/hooks/resources/projects-dashboard.ts` (`DashboardFilters.person`)

**Interfaces:**
- Produces (from `@/components/features/dashboard/kit`): `AnimatedNumber`, `ENTER`, `enterDelay`, `usePrefersReducedMotion`, `useCountUp`, `formatKw`, `formatCount`, `formatPaiseCompact`, `monthLabel`, `plural`, `BandError`, `FilterBar` (now with optional `children` rendered between the period picker and the Cash/Loan switch, and optional `financingLabel`), `useDashboardFilters`, `readDashboardFilters`, `DEFAULT_DASHBOARD_FILTERS`. `DashboardFilters` gains `person?: string`.

- [ ] **Step 1: Move files**

```bash
cd /Volumes/works-space/oneohm/oneohm/apps/web/components/features
mkdir -p dashboard/kit
for f in animated-number.tsx motion.ts format.ts filter-bar.tsx use-dashboard-filters.ts; do git mv projects/components/dashboard/$f dashboard/kit/$f; done
```

- [ ] **Step 2: Split `BandError` out**

Create `dashboard/kit/band-error.tsx` with the `BandError` function exactly as it is in `projects/components/dashboard/band-state.tsx` (imports: `RotateCw` from `lucide-react`, `* as React`; keep `'use client'`). Delete `BandError` (and the now-unused `RotateCw` import) from `band-state.tsx`, leaving `DashboardSkeleton` there.

- [ ] **Step 3: Kit barrel**

`dashboard/kit/index.ts`:

```ts
export { AnimatedNumber } from './animated-number';
export { BandError } from './band-error';
export { FilterBar } from './filter-bar';
export { formatCount, formatKw, formatPaiseCompact, monthLabel, plural } from './format';
export { ENTER, enterDelay, useCountUp, usePrefersReducedMotion } from './motion';
export {
  DEFAULT_DASHBOARD_FILTERS,
  readDashboardFilters,
  useDashboardFilters,
} from './use-dashboard-filters';
```

- [ ] **Step 4: Add `person` to filters**

In `lib/hooks/resources/projects-dashboard.ts`, add to `DashboardFilters`:

```ts
  /** Quotes dashboard only: deals whose quote this user made. */
  person?: string;
```

In `kit/use-dashboard-filters.ts`:
- add `const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;`
- in `readDashboardFilters`, read `const rawPerson = params.get('person'); const person = rawPerson && UUID.test(rawPerson) ? rawPerson : undefined;` and include `...(person ? { person } : {})` in every returned object (all three `return` statements);
- in `write`, after the financing line add `if (next.person) params.set('person', next.person);`
- change `isDefault` to `filters.period === 'this_month' && filters.financing === 'all' && !filters.person;`
- in `setFilters`, after the custom-date cleanup add `if (!next.person) delete next.person;`

In `kit/filter-bar.tsx`, change the props to:

```ts
export function FilterBar({
  filters,
  onChange,
  children,
  financingLabel = 'Cash or loan projects',
}: {
  filters: DashboardFilters;
  onChange: (patch: Partial<DashboardFilters>) => void;
  /** Extra controls between the period and the Cash/Loan switch. */
  children?: React.ReactNode;
  financingLabel?: string;
}): React.JSX.Element {
```

render `{children}` right before `<ToggleButtonGroup …>`, and use `aria-label={financingLabel}` on that group. Update its doc comment first line to "One period picker, optional extra controls, and one Cash/Loan switch."

- [ ] **Step 5: Fix projects imports**

In every file under `projects/components/dashboard/` and in `projects/components/project-dashboard-page.tsx`, replace imports of `./animated-number`, `./motion`, `./format`, `./filter-bar`, `./use-dashboard-filters`, and `BandError` from `./band-state`, with imports from `@/components/features/dashboard/kit`. Update `projects/components/dashboard/index.ts`:

```ts
export { DashboardSkeleton } from './band-state';
export { ComingUp } from './coming-up';
export { NeedsAction } from './needs-action';
export { OwnerStrip } from './owner-strip';
export { StagePanel } from './stage-panel';
export { StagePipeline } from './stage-pipeline';
export { StuckByTeam } from './stuck-by-team';
export { TrendChart } from './trend-chart';
```

and in `project-dashboard-page.tsx` import `BandError, FilterBar, useDashboardFilters` from `@/components/features/dashboard/kit` and the rest from `./dashboard`.

Find leftovers: `grep -rn "from './\(animated-number\|motion\|format\|filter-bar\|use-dashboard-filters\)'" components/features/projects` → no output.

- [ ] **Step 6: Typecheck**

Run (repo root): `npm run typecheck:web` → exit 0.

- [ ] **Step 7: Verify /projects is unchanged**

In the browser pane (`preview_start` name `web` if not running), set `resize_window` 1440×1000, open `http://localhost:3001/projects`, wait 3 s, screenshot. Expected: same page as before (5 strip cards, stage bars, needs action, trend). Change the period to "Last month" and the switch to "Loan": the URL becomes `/projects?period=last_month&type=loan` and numbers change. `read_console_messages` with `onlyErrors: true` → no new errors.

- [ ] **Step 8: Commit**

```bash
git add -A apps/web/components/features/dashboard apps/web/components/features/projects apps/web/lib/hooks/resources/projects-dashboard.ts
git commit -m "refactor(web): shared dashboard kit (from the projects dashboard)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Quotes dashboard data hook and link builder

**Files:**
- Create: `apps/web/lib/hooks/resources/quotes-dashboard.ts`
- Modify: `apps/web/lib/hooks/resources/index.ts` (export it next to the projects-dashboard export)
- Create: `apps/web/components/features/quotes/components/dashboard/links.ts` (the old folder's files are deleted in Task 9; create this file now)

**Interfaces:**
- Consumes: `DashboardFilters` (with `person`), `QuotesDashboard`.
- Produces: `useQuotesDashboard(filters: DashboardFilters): UseQueryResult<QuotesDashboard>`; `quoteListHref(filters: Record<string, unknown>): string`; `quoteLinks` object (below). The quote list reads these keys from `quotes_filters` JSON: `stage`, `attention`, `person`, `financing`, `leadSource`, `leadSourceNotIn`, `newDate {from,to}`, `wonDate {from,to}`, `lostDate {from,to}`.

- [ ] **Step 1: Hook**

```ts
'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { QuotesDashboard } from '@tejas96/shared/types';

import type { DashboardFilters } from './projects-dashboard';

import { apiClient } from '@/lib/api/client';

export const quotesDashboardKeys = {
  all: ['quotes-dashboard'] as const,
  summary: (f: DashboardFilters) => ['quotes-dashboard', 'summary', f] as const,
};

/** `keepPreviousData`: a filter change tweens old numbers to new ones, no skeleton flash. */
export function useQuotesDashboard(filters: DashboardFilters): UseQueryResult<QuotesDashboard> {
  return useQuery({
    queryKey: quotesDashboardKeys.summary(filters),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ period: filters.period, financing: filters.financing });
      if (filters.period === 'custom' && filters.from && filters.to) {
        params.set('from', filters.from);
        params.set('to', filters.to);
      }
      if (filters.person) params.set('person', filters.person);
      const { data } = await apiClient.get<QuotesDashboard>(`/quotes/dashboard?${params}`, {
        signal,
      });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
```

Add to `lib/hooks/resources/index.ts`: `export { quotesDashboardKeys, useQuotesDashboard } from './quotes-dashboard';`

- [ ] **Step 2: Links**

`components/features/quotes/components/dashboard/links.ts`:

```ts
import type { DashboardFilters } from '@/lib/hooks/resources';
import type { DealAttention, DealStageFilter } from '@tejas96/shared/types';

import { buildRoute, ROUTES } from '@/lib/config/routes';

type ListFilters = Record<string, unknown>;

/** The quote list keeps its filters as JSON under `quotes_filters` (`useTableUrlState`, prefix "quotes"). */
export function quoteListHref(filters: ListFilters): string {
  const params = new URLSearchParams();
  params.set('quotes_filters', JSON.stringify(filters));
  return `${ROUTES.QUOTES.LIST}?${params.toString()}`;
}

/** Person and Cash/Loan from the filter bar travel with every link. */
const scope = (f: DashboardFilters): ListFilters => ({
  ...(f.financing === 'all' ? {} : { financing: f.financing }),
  ...(f.person ? { person: f.person } : {}),
});

function monthBounds(month: string): { from: string; to: string } {
  const [y = 0, m = 1] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

export const quoteLinks = {
  newDeals: (from: string, to: string, f: DashboardFilters, financing?: 'cash' | 'loan'): string =>
    quoteListHref({ ...scope(f), ...(financing ? { financing } : {}), newDate: { from, to } }),
  won: (from: string, to: string, f: DashboardFilters): string =>
    quoteListHref({ ...scope(f), stage: 'won', wonDate: { from, to } }),
  wonOfNew: (from: string, to: string, f: DashboardFilters): string =>
    quoteListHref({ ...scope(f), stage: 'won', newDate: { from, to } }),
  lost: (from: string, to: string, f: DashboardFilters): string =>
    quoteListHref({ ...scope(f), stage: 'lost', lostDate: { from, to } }),
  stage: (stage: DealStageFilter, f: DashboardFilters): string =>
    quoteListHref({ ...scope(f), stage }),
  attention: (attention: DealAttention, f: DashboardFilters, person?: string): string =>
    quoteListHref({ ...scope(f), ...(person ? { person } : {}), attention }),
  personOpen: (person: string, f: DashboardFilters): string =>
    quoteListHref({ ...scope(f), person, stage: 'open' }),
  source: (
    key: string,
    topKeys: string[],
    from: string,
    to: string,
    f: DashboardFilters,
  ): string =>
    quoteListHref({
      ...scope(f),
      newDate: { from, to },
      ...(key === 'other' ? { leadSourceNotIn: topKeys.join(',') } : { leadSource: key }),
    }),
  month: (kind: 'new' | 'won', month: string, f: DashboardFilters): string => {
    const { from, to } = monthBounds(month);
    return kind === 'new'
      ? quoteListHref({ ...scope(f), newDate: { from, to } })
      : quoteListHref({ ...scope(f), stage: 'won', wonDate: { from, to } });
  },
  quote: (quoteId: string): string => buildRoute(ROUTES.QUOTES.DETAIL, { id: quoteId }),
};
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck:web` → exit 0 (the old dashboard still compiles; nothing uses these yet).

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/hooks/resources/quotes-dashboard.ts apps/web/lib/hooks/resources/index.ts apps/web/components/features/quotes/components/dashboard/links.ts
git commit -m "feat(web): quotes dashboard hook and link builder

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Dashboard page shell, filter bar, strip and deal flow

**Files:**
- Delete: `apps/web/components/features/quotes/components/dashboard/{action-required,conversion-funnel,high-value-quotes,kpi-grid,project-mix,revenue-trend}.tsx` and the old `dashboard/index.ts`
- Create: `.../quotes/components/dashboard/{person-picker,strip,deal-flow,skeleton,index}.tsx|ts`
- Rewrite: `.../quotes/components/quote-dashboard-page.tsx`

**Interfaces:**
- Consumes: kit (Task 7), `useQuotesDashboard`, `quoteLinks` (Task 8), `DEAL_ATTENTION_LABELS` etc. (Task 1).
- Produces: components `PersonPicker`, `QuotesStrip`, `DealFlow`, `QuotesDashboardSkeleton`, each `({ data: QuotesDashboard; filters: DashboardFilters }) => JSX` except `PersonPicker` (`{ people, value, onChange }`) and the skeleton. Format helper `formatRupees(rupees: number): string` in `strip.tsx`, exported for later bands.

- [ ] **Step 1: Delete the old parts**

```bash
cd /Volumes/works-space/oneohm/oneohm/apps/web/components/features/quotes/components/dashboard
git rm action-required.tsx conversion-funnel.tsx high-value-quotes.tsx kpi-grid.tsx project-mix.tsx revenue-trend.tsx index.ts
```

- [ ] **Step 2: Person picker**

`person-picker.tsx`:

```tsx
'use client';

import type { QuotesDashboard } from '@tejas96/shared/types';
import * as React from 'react';

import { MUISelect } from '@/components/ui';

const EVERYONE = '';

export function PersonPicker({
  people,
  value,
  onChange,
}: {
  people: QuotesDashboard['people'];
  value: string | undefined;
  onChange: (person: string | undefined) => void;
}): React.JSX.Element {
  const options = React.useMemo(
    () => [{ value: EVERYONE, label: 'Everyone' }, ...people.map((p) => ({ value: p.id, label: p.name }))],
    [people],
  );
  return (
    <MUISelect
      size="small"
      aria-label="Person"
      value={value ?? EVERYONE}
      options={options}
      onChange={(e) => {
        const next = String(e.target.value);
        onChange(next === EVERYONE ? undefined : next);
      }}
      sx={{ minWidth: 160 }}
    />
  );
}
```

- [ ] **Step 3: Strip**

`strip.tsx`:

```tsx
'use client';

import type { QuotesDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { quoteLinks } from './links';

import {
  AnimatedNumber,
  ENTER,
  enterDelay,
  formatKw,
  formatPaiseCompact,
} from '@/components/features/dashboard/kit';
import type { DashboardFilters } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

export const formatRupees = (rupees: number): string => formatPaiseCompact(Math.round(rupees * 100));

const BIG =
  'block text-2xl font-semibold tabular-nums text-foreground hover:text-primary-dark focus-visible:underline';
const SMALL = 'text-xs text-foreground-tertiary hover:text-primary-dark hover:underline';
const LINE = 'text-xs text-foreground-tertiary';

function Stat({
  label,
  tag,
  index,
  children,
}: {
  label: string;
  tag?: string;
  index: number;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-xl bg-surface p-4 shadow-e2 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none',
        ENTER,
      )}
      style={enterDelay(index)}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-2">
        <h2 className="truncate text-xs font-medium text-foreground-secondary">{label}</h2>
        {tag ? <span className="text-2xs text-foreground-tertiary">{tag}</span> : null}
      </header>
      {children}
    </section>
  );
}

export function QuotesStrip({
  data,
  filters,
}: {
  data: QuotesDashboard;
  filters: DashboardFilters;
}): React.JSX.Element {
  const { strip, period } = data;
  const delta = strip.wonValue.valueRupees - strip.wonValue.previousValueRupees;
  const rate = strip.winRate;

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Stat label="New deals" tag={period.label} index={0}>
        <Link href={quoteLinks.newDeals(period.from, period.to, filters)} className={BIG}>
          <AnimatedNumber value={strip.newDeals.count} />
        </Link>
        <span className={LINE}>{formatKw(strip.newDeals.kw)}</span>
        {filters.financing === 'all' ? (
          <span className={LINE}>
            <Link className={SMALL} href={quoteLinks.newDeals(period.from, period.to, filters, 'cash')}>
              {strip.newDeals.cash} cash
            </Link>
            {' · '}
            <Link className={SMALL} href={quoteLinks.newDeals(period.from, period.to, filters, 'loan')}>
              {strip.newDeals.loan} loan
            </Link>
          </span>
        ) : null}
      </Stat>

      <Stat label="Won value" tag={period.label} index={1}>
        <Link href={quoteLinks.won(period.from, period.to, filters)} className={BIG}>
          <AnimatedNumber value={strip.wonValue.valueRupees} format={formatRupees} />
        </Link>
        <span className={LINE}>{formatKw(strip.wonValue.kw)}</span>
        <span className={LINE}>
          <span className={cn('font-medium', delta > 0 && 'text-success', delta < 0 && 'text-error')}>
            {delta > 0 ? `+${formatRupees(delta)}` : delta < 0 ? `−${formatRupees(-delta)}` : 'Same'}
          </span>{' '}
          vs {period.previousLabel}
        </span>
      </Stat>

      <Stat label="Win rate" tag={period.label} index={2}>
        <Link href={quoteLinks.wonOfNew(period.from, period.to, filters)} className={BIG}>
          {rate.percent == null ? '—' : <AnimatedNumber value={rate.percent} format={(n) => `${Math.round(n)}%`} />}
        </Link>
        <span className={LINE}>
          {rate.wonOfNew} won of {rate.newCount} new
        </span>
        {rate.medianDaysToWin != null ? (
          <span className={LINE}>Median {rate.medianDaysToWin} days to win</span>
        ) : null}
      </Stat>

      <Stat label="Open pipeline" index={3}>
        <Link href={quoteLinks.stage('pipeline', filters)} className={BIG}>
          <AnimatedNumber value={strip.pipeline.valueRupees} format={formatRupees} />
        </Link>
        <span className={LINE}>{strip.pipeline.count} deals waiting or quiet</span>
        <span className={LINE}>{formatKw(strip.pipeline.kw)}</span>
      </Stat>
    </div>
  );
}
```

- [ ] **Step 4: Deal flow**

`deal-flow.tsx`:

```tsx
'use client';

import type { DealMoney, QuotesDashboard } from '@tejas96/shared/types';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { quoteLinks } from './links';
import { formatRupees } from './strip';

import { AnimatedNumber, ENTER, enterDelay, formatKw } from '@/components/features/dashboard/kit';
import type { DashboardFilters } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

const BLOCK =
  'relative block overflow-hidden rounded-[10px] bg-surface-alt p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none';

function Base({ color }: { color: string }): React.JSX.Element {
  return <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1" style={{ background: color }} />;
}

function OpenBlock({
  label,
  money,
  href,
  color,
  index,
}: {
  label: string;
  money: DealMoney;
  href: string;
  color: string;
  index: number;
}): React.JSX.Element {
  return (
    <Link href={href} className={cn(BLOCK, ENTER)} style={enterDelay(index)}>
      <span className="text-xs font-medium text-foreground-secondary">{label}</span>
      <span className="mt-1 block text-2xl font-semibold tabular-nums text-foreground">
        <AnimatedNumber value={money.count} />
      </span>
      <span className="block text-xs text-foreground-tertiary">{formatRupees(money.valueRupees)}</span>
      <span className="block text-xs text-foreground-tertiary">{formatKw(money.kw)}</span>
      <Base color={color} />
    </Link>
  );
}

function Arrow(): React.JSX.Element {
  return (
    <span aria-hidden="true" className="flex items-center justify-center text-foreground-tertiary">
      <ChevronRight className="size-4 rotate-90 lg:rotate-0" />
    </span>
  );
}

/** Drafting › Waiting › Gone quiet › Won / Lost. Problem counts live in Needs action only. */
export function DealFlow({
  data,
  filters,
}: {
  data: QuotesDashboard;
  filters: DashboardFilters;
}): React.JSX.Element {
  const { stages, period } = data;
  return (
    <section className={cn('rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(4)}>
      <header className="flex flex-wrap items-baseline justify-between gap-2 pb-3">
        <h2 className="text-sm font-semibold text-foreground">Where every deal is</h2>
        <span className="text-2xs text-foreground-tertiary">select a stage to see its deals</span>
      </header>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_16px_1fr_16px_1fr_16px_1fr]">
        <OpenBlock label="Drafting" money={stages.drafting} href={quoteLinks.stage('drafting', filters)} color="var(--ds-neutral-300)" index={5} />
        <Arrow />
        <OpenBlock label="Waiting" money={stages.waiting} href={quoteLinks.stage('waiting', filters)} color="var(--ds-primary-light)" index={6} />
        <Arrow />
        <OpenBlock label="Gone quiet" money={stages.quiet} href={quoteLinks.stage('quiet', filters)} color="var(--ds-danger)" index={7} />
        <Arrow />
        <div className="grid gap-2">
          <Link href={quoteLinks.won(period.from, period.to, filters)} className={cn(BLOCK, 'py-3', ENTER)} style={enterDelay(8)}>
            <span className="flex items-baseline justify-between text-xs font-medium text-foreground-secondary">
              Won <span className="text-2xs font-normal text-foreground-tertiary">{period.label}</span>
            </span>
            <span className="mt-0.5 flex items-baseline gap-2">
              <span className="text-lg font-semibold tabular-nums text-foreground">
                <AnimatedNumber value={stages.won.count} />
              </span>
              <span className="text-xs text-foreground-tertiary">{formatKw(stages.won.kw)}</span>
            </span>
            <Base color="var(--ds-primary)" />
          </Link>
          <Link href={quoteLinks.lost(period.from, period.to, filters)} className={cn(BLOCK, 'py-3', ENTER)} style={enterDelay(9)}>
            <span className="flex items-baseline justify-between text-xs font-medium text-foreground-secondary">
              Lost <span className="text-2xs font-normal text-foreground-tertiary">{period.label}</span>
            </span>
            <span className="mt-0.5 flex items-baseline gap-2">
              <span className="text-lg font-semibold tabular-nums text-foreground">
                <AnimatedNumber value={stages.lost.count} />
              </span>
              {stages.lost.topReason ? (
                <span className="truncate text-xs text-foreground-tertiary">mostly {stages.lost.topReason.toLowerCase()}</span>
              ) : null}
            </span>
            <Base color="var(--ds-neutral-300)" />
          </Link>
        </div>
      </div>
    </section>
  );
}
```

Before writing, confirm the CSS variables exist: `grep -n "\-\-ds-neutral-300\|\-\-ds-primary-light\|\-\-ds-danger\|\-\-ds-primary:" apps/web/app/globals.css apps/web/lib/theme/*.ts | head`. If one is missing, use the variable the projects dashboard uses for the same role (`trend-chart.tsx` uses `--ds-neutral-300` and `--ds-primary`; `stage-pipeline.tsx` uses the `bg-primary-light` / `bg-error` classes — use `className` with those instead of `style` if the variable is absent).

- [ ] **Step 5: Skeleton**

`skeleton.tsx`:

```tsx
'use client';

import Skeleton from '@mui/material/Skeleton';
import * as React from 'react';

/** Same shapes as the real bands, so nothing jumps when data lands. */
export function QuotesDashboardSkeleton(): React.JSX.Element {
  const card = 'rounded-xl bg-surface p-5 shadow-e2';
  return (
    <div className="flex flex-col gap-5" role="status" aria-busy="true">
      <span className="sr-only">Loading dashboard</span>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={card}>
            <Skeleton variant="text" width="50%" />
            <Skeleton variant="text" width="40%" height={36} />
            <Skeleton variant="text" width="70%" />
          </div>
        ))}
      </div>
      <div className={card}><Skeleton variant="rounded" height={150} /></div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className={`${card} lg:col-span-3`}><Skeleton variant="rounded" height={220} /></div>
        <div className={`${card} lg:col-span-2`}><Skeleton variant="rounded" height={220} /></div>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className={card}><Skeleton variant="rounded" height={200} /></div>
        <div className={card}><Skeleton variant="rounded" height={200} /></div>
      </div>
      <div className={card}><Skeleton variant="rounded" height={240} /></div>
    </div>
  );
}
```

- [ ] **Step 6: Barrel**

`dashboard/index.ts`:

```ts
export { DealFlow } from './deal-flow';
export { PersonPicker } from './person-picker';
export { QuotesDashboardSkeleton } from './skeleton';
export { formatRupees, QuotesStrip } from './strip';
```

- [ ] **Step 7: Page orchestrator**

Replace the whole of `quote-dashboard-page.tsx`:

```tsx
'use client';

import Add from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { DealFlow, PersonPicker, QuotesDashboardSkeleton, QuotesStrip } from './dashboard';

import { BandError, FilterBar, useDashboardFilters } from '@/components/features/dashboard/kit';
import { ROUTES } from '@/lib/config/routes';
import { useQuotesDashboard } from '@/lib/hooks/resources';
import { useGatedAction } from '@/lib/rbac';

/**
 * /quotes — where every deal is, what needs action and by whom, where the
 * money and the leads are. One request (`GET /quotes/dashboard`); every figure
 * links to the quote list of exactly the deals behind it. Spec:
 * docs/superpowers/specs/2026-10-09-quotes-dashboard-design.md
 */
export function QuoteDashboardPage(): React.JSX.Element {
  const router = useRouter();
  const { filters, setFilters, reset, isDefault } = useDashboardFilters();
  const { data, isLoading, isError, isFetching, refetch } = useQuotesDashboard(filters);
  const newQuote = useGatedAction('quotes.create', () => void router.push(ROUTES.QUOTES.NEW), 'New quote');
  const retry = (): void => void refetch();
  const refreshFailed = isError && !!data;

  const isEmpty =
    !!data &&
    data.strip.newDeals.count === 0 &&
    data.stages.drafting.count + data.stages.waiting.count + data.stages.quiet.count === 0 &&
    data.stages.won.count === 0 &&
    data.trend.every((t) => t.newCount === 0 && t.wonCount === 0);

  let body: React.ReactNode;
  if (isLoading && !data) {
    body = <QuotesDashboardSkeleton />;
  } else if (isError && !data) {
    body = (
      <div className="flex flex-col gap-5">
        <BandError what="the summary" onRetry={retry} />
        <BandError what="deals by stage" onRetry={retry} />
        <BandError what="what needs action" onRetry={retry} />
        <BandError what="the 12-month trend" onRetry={retry} />
      </div>
    );
  } else if (data && isEmpty) {
    body = (
      <section className="rounded-xl bg-surface p-10 text-center shadow-e2">
        <p className="text-sm text-foreground-secondary">
          {isDefault ? 'No deals yet.' : 'No deals match these filters.'}
        </p>
        {!isDefault ? (
          <button type="button" onClick={reset} className="mt-3 text-sm font-medium text-primary-dark hover:underline">
            Clear filters
          </button>
        ) : null}
      </section>
    );
  } else if (data) {
    body = (
      <div className="flex flex-col gap-5">
        <QuotesStrip data={data} filters={filters} />
        <DealFlow data={data} filters={filters} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-background p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Quotes</h1>
        <div className="flex flex-wrap items-center gap-2">
          <FilterBar filters={filters} onChange={setFilters} financingLabel="Cash or loan deals">
            <PersonPicker
              people={data?.people ?? []}
              value={filters.person}
              onChange={(person) => setFilters({ person })}
            />
          </FilterBar>
          <Button component={Link} href={ROUTES.QUOTES.LIST} variant="outlined" size="small">
            All quotes
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={newQuote.onGatedClick}
            aria-disabled={!newQuote.allowed}
            sx={{ opacity: newQuote.allowed ? 1 : 0.5 }}
          >
            New quote
          </Button>
        </div>
      </header>
      <p role="status" className={refreshFailed ? '-mt-2 text-xs text-foreground-secondary' : 'sr-only'}>
        {refreshFailed ? (
          <>
            Could not refresh ·{' '}
            <button type="button" onClick={retry} disabled={isFetching} className="font-medium text-primary-dark hover:underline disabled:opacity-60">
              Retry
            </button>
          </>
        ) : null}
      </p>
      {body}
    </div>
  );
}
```

- [ ] **Step 8: Typecheck and lint**

Run: `npm run typecheck:web` → exit 0. Run: `npx nx lint web` → no new errors in the touched files (about 40 pre-existing `error type acts as any` warnings are normal; count before/after).

- [ ] **Step 9: Verify in the browser**

Open `http://localhost:3001/quotes` at 1440×1000. Expected:
- header "Quotes" with Period, Person, ALL/CASH/LOAN, "All quotes", "New quote";
- 4 strip cards and the flow (Drafting › Waiting › Gone quiet › Won/Lost); numbers count up once;
- network: exactly one `GET /quotes/dashboard` per load (`read_network_requests` with `urlPattern: 'quotes/dashboard'`);
- pick a person → URL gains `person=<uuid>`, numbers change, one new request; pick Loan → `type=loan`;
- click "Drafting" → the quote list opens (its own look is updated in Task 11; for now confirm the URL carries `quotes_filters={"stage":"drafting"}`);
- Back returns to the same filters;
- console: no errors.

- [ ] **Step 10: Commit**

```bash
git add -A apps/web/components/features/quotes
git commit -m "feat(web): quotes dashboard shell, strip and deal flow

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Needs action, team, biggest deals, sources, trend

**Files:**
- Create: `.../quotes/components/dashboard/{needs-action,team,biggest-open,sources,trend-chart}.tsx`
- Modify: `.../quotes/components/dashboard/index.ts`, `quote-dashboard-page.tsx` (render the new bands)

**Interfaces:**
- Consumes: `quoteLinks`, `formatRupees`, kit, `DEAL_ATTENTION_LABELS`.
- Produces: `NeedsAction`, `Team`, `BiggestOpen`, `Sources`, `QuotesTrendChart`, each `({ data, filters }) => JSX`.

- [ ] **Step 1: Needs action**

`needs-action.tsx`:

```tsx
'use client';

import type { QuotesDashboard } from '@tejas96/shared/types';
import { DEAL_ATTENTION_LABELS } from '@tejas96/shared/utils';
import Link from 'next/link';
import * as React from 'react';

import { quoteLinks } from './links';

import { ENTER, enterDelay } from '@/components/features/dashboard/kit';
import type { DashboardFilters } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

export function NeedsAction({
  data,
  filters,
}: {
  data: QuotesDashboard;
  filters: DashboardFilters;
}): React.JSX.Element {
  const allClear = data.needsAction.every((n) => n.count === 0);
  return (
    <section className={cn('h-full rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(10)}>
      <header className="pb-2">
        <h2 className="text-sm font-semibold text-foreground">Needs action</h2>
      </header>
      {allClear ? (
        <p className="py-8 text-center text-sm text-foreground-secondary">Nothing waiting on anyone.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.needsAction.map((n, i) => (
            <li key={n.key} className={ENTER} style={enterDelay(i, 40)}>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={quoteLinks.attention(n.key, filters)} className="text-sm text-foreground hover:text-primary-dark hover:underline">
                    {DEAL_ATTENTION_LABELS[n.key]}
                  </Link>
                  {n.owners.length > 0 ? (
                    <p className="truncate text-xs text-foreground-tertiary">
                      {n.owners.map((o, j) => (
                        <React.Fragment key={o.personId}>
                          {j > 0 ? ' · ' : null}
                          <Link href={quoteLinks.attention(n.key, filters, o.personId)} className="hover:text-primary-dark hover:underline">
                            {o.name} {o.count}
                          </Link>
                        </React.Fragment>
                      ))}
                      {n.moreOwners > 0 ? ` · +${n.moreOwners} more` : null}
                    </p>
                  ) : null}
                </div>
                {n.count > 0 ? (
                  <Link href={quoteLinks.attention(n.key, filters)} className="shrink-0 text-sm font-semibold tabular-nums text-error hover:underline">
                    {n.count}
                  </Link>
                ) : (
                  <span className="shrink-0 text-xs text-foreground-tertiary">None</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Team**

`team.tsx`:

```tsx
'use client';

import type { QuotesDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { quoteLinks } from './links';

import { ENTER, enterDelay } from '@/components/features/dashboard/kit';
import type { DashboardFilters } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

const SEGMENTS = [
  { key: 'drafting', label: 'draft', color: 'var(--ds-neutral-300)' },
  { key: 'waiting', label: 'waiting', color: 'var(--ds-primary-light)' },
  { key: 'quiet', label: 'quiet', color: 'var(--ds-danger)' },
] as const;

export function Team({
  data,
  filters,
}: {
  data: QuotesDashboard;
  filters: DashboardFilters;
}): React.JSX.Element {
  const max = Math.max(1, ...data.team.map((t) => t.open));
  return (
    <section className={cn('h-full rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(11)}>
      <header className="flex flex-wrap items-baseline justify-between gap-2 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Team</h2>
        <span className="text-2xs text-foreground-tertiary">
          {SEGMENTS.map((s) => (
            <span key={s.key} className="ml-2 inline-flex items-center gap-1">
              <span aria-hidden="true" className="inline-block size-2 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </span>
      </header>
      {data.team.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-secondary">No open deals.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.team.map((t, i) => (
            <li key={t.personId} className={ENTER} style={enterDelay(i, 40)}>
              <Link
                href={quoteLinks.personOpen(t.personId, filters)}
                className="-mx-2 grid grid-cols-[minmax(0,88px)_minmax(0,1fr)_28px_52px] items-center gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-surface-alt"
                title={`${t.name}: ${t.drafting} drafting, ${t.waiting} waiting, ${t.quiet} quiet`}
              >
                <span className="truncate text-foreground">{t.name}</span>
                <span className="flex h-1.5 overflow-hidden rounded-full bg-surface-alt" style={{ width: `${(t.open / max) * 100}%` }}>
                  {SEGMENTS.map((s) =>
                    t[s.key] > 0 ? (
                      <span
                        key={s.key}
                        className="h-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
                        style={{ width: `${(t[s.key] / Math.max(1, t.open)) * 100}%`, background: s.color }}
                      />
                    ) : null,
                  )}
                </span>
                <span className="text-right tabular-nums text-foreground">{t.open}</span>
                <span className="text-right text-xs text-foreground-tertiary">{t.won} won</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {data.teamMore > 0 ? (
        <Link href={quoteLinks.stage('open', filters)} className="mt-2 inline-block text-xs font-medium text-primary-dark hover:underline">
          +{data.teamMore} more
        </Link>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 3: Biggest open deals**

`biggest-open.tsx`:

```tsx
'use client';

import type { QuotesDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { quoteLinks } from './links';
import { formatRupees } from './strip';

import { ENTER, enterDelay, formatKw } from '@/components/features/dashboard/kit';
import type { DashboardFilters } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

export function BiggestOpen({
  data,
  filters,
}: {
  data: QuotesDashboard;
  filters: DashboardFilters;
}): React.JSX.Element {
  return (
    <section className={cn('h-full rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(12)}>
      <header className="flex items-baseline justify-between gap-2 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Biggest open deals</h2>
        <Link href={quoteLinks.stage('pipeline', filters)} className="text-2xs text-foreground-tertiary hover:text-primary-dark hover:underline">
          waiting or quiet
        </Link>
      </header>
      {data.biggestOpen.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-secondary">No open deals.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.biggestOpen.map((d, i) => (
            <li key={d.quoteId} className={ENTER} style={enterDelay(i, 40)}>
              <Link href={quoteLinks.quote(d.quoteId)} className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 hover:bg-surface-alt">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground" title={d.customerName ?? undefined}>
                    {d.customerName ?? 'Unnamed customer'}
                  </span>
                  <span className="block truncate text-xs text-foreground-tertiary">
                    {d.kw != null ? `${formatKw(d.kw)} · ` : ''}
                    {d.personName} ·{' '}
                    {d.stage === 'quiet' ? (
                      <span className="text-error">quiet {d.days} d</span>
                    ) : d.days === 0 ? (
                      'ends today'
                    ) : (
                      `ends in ${d.days} d`
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatRupees(d.valueRupees)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Sources**

`sources.tsx`:

```tsx
'use client';

import type { QuotesDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import * as React from 'react';

import { quoteLinks } from './links';

import { ENTER, enterDelay } from '@/components/features/dashboard/kit';
import type { DashboardFilters } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

export function Sources({
  data,
  filters,
}: {
  data: QuotesDashboard;
  filters: DashboardFilters;
}): React.JSX.Element {
  const { period } = data;
  const max = Math.max(1, ...data.sources.map((s) => s.count));
  return (
    <section className={cn('h-full rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(13)}>
      <header className="flex items-baseline justify-between gap-2 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Where deals come from</h2>
        <span className="text-2xs text-foreground-tertiary">{period.label}</span>
      </header>
      {data.sources.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-secondary">No new deals in this period.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.sources.map((s, i) => (
            <li key={s.key} className={ENTER} style={enterDelay(i, 40)}>
              <Link
                href={quoteLinks.source(s.key, data.topSourceKeys, period.from, period.to, filters)}
                className="-mx-2 grid grid-cols-[minmax(0,96px)_minmax(0,1fr)_28px_60px] items-center gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-surface-alt"
              >
                <span className="truncate text-foreground">{s.label}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
                  <span
                    className="block h-full rounded-full bg-primary-light transition-[width] duration-700 ease-out motion-reduce:transition-none"
                    style={{ width: `${(s.count / max) * 100}%` }}
                  />
                </span>
                <span className="text-right tabular-nums text-foreground">{s.count}</span>
                <span className="text-right text-xs text-foreground-tertiary">
                  {s.winPercent == null ? '—' : `${s.winPercent}% win`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Trend chart**

`trend-chart.tsx` — same structure as `projects/components/dashboard/trend-chart.tsx` (Recharts `BarChart`, column click, sr-only link list), with these differences, written out in full:

```tsx
'use client';

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { QuotesDashboard } from '@tejas96/shared/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { quoteLinks } from './links';
import { formatRupees } from './strip';

import { ENTER, enterDelay, monthLabel, usePrefersReducedMotion } from '@/components/features/dashboard/kit';
import type { DashboardFilters } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

type Unit = 'deals' | 'value';

const CHART_MARGIN = { top: 8, right: 0, left: -16, bottom: 0 };
const Y_AXIS_WIDTH = 52;
const COLORS = {
  new: 'var(--ds-neutral-300)',
  won: 'var(--ds-primary)',
  grid: 'var(--ds-hairline)',
  axis: 'var(--ds-neutral-500)',
};

export function QuotesTrendChart({
  data,
  filters,
}: {
  data: QuotesDashboard;
  filters: DashboardFilters;
}): React.JSX.Element {
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const [unit, setUnit] = React.useState<Unit>('deals');

  const rows = data.trend.map((t) => ({
    month: t.month,
    label: monthLabel(t.month),
    new: unit === 'deals' ? t.newCount : t.newValueRupees,
    won: unit === 'deals' ? t.wonCount : t.wonValueRupees,
  }));

  const go = (kind: 'new' | 'won', month: string): void => router.push(quoteLinks.month(kind, month, filters));
  const openBar =
    (kind: 'new' | 'won') =>
    (entry: unknown, _index: number, event?: React.MouseEvent): void => {
      event?.stopPropagation();
      const month = (entry as { payload?: { month?: string } }).payload?.month;
      if (month) go(kind, month);
    };
  // A click anywhere in a month's column opens it (Recharts draws no bar for 0).
  const openColumn = (_state: unknown, event: React.MouseEvent): void => {
    const box = event.currentTarget.getBoundingClientRect();
    const plotLeft = CHART_MARGIN.left + Y_AXIS_WIDTH;
    const plotWidth = box.width - plotLeft - CHART_MARGIN.right;
    const x = event.clientX - box.left - plotLeft;
    if (rows.length === 0 || x < 0 || x >= plotWidth) return;
    const row = rows[Math.floor((x / plotWidth) * rows.length)];
    if (!row) return;
    go(row.new === 0 && row.won > 0 ? 'won' : 'new', row.month);
  };
  const fmt = (v: number): string => (unit === 'value' ? formatRupees(v) : String(v));

  return (
    <section className={cn('rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(14)}>
      <header className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Last 12 months</h2>
          <p className="text-2xs text-foreground-tertiary">
            <span aria-hidden="true" className="mr-1 inline-block size-2 rounded-sm align-middle" style={{ background: COLORS.new }} />
            new deals
            <span aria-hidden="true" className="ml-3 mr-1 inline-block size-2 rounded-sm align-middle" style={{ background: COLORS.won }} />
            won · select a bar to see its deals
          </p>
        </div>
        <ToggleButtonGroup exclusive size="small" value={unit} onChange={(_, next: Unit | null) => next && setUnit(next)} aria-label="Chart unit">
          <ToggleButton value="deals">Deals</ToggleButton>
          <ToggleButton value="value">₹</ToggleButton>
        </ToggleButtonGroup>
      </header>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 320, height: 220 }}>
          <BarChart data={rows} barGap={2} onClick={openColumn} style={{ cursor: 'pointer' }} margin={CHART_MARGIN}>
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: COLORS.axis }} />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={Y_AXIS_WIDTH}
              tick={{ fontSize: 11, fill: COLORS.axis }}
              tickFormatter={(v: number) => (unit === 'value' ? formatRupees(v) : String(v))}
            />
            <Tooltip cursor={{ fill: 'var(--ds-canvas-sunken)' }} formatter={(value, name) => [fmt(Number(value ?? 0)), String(name ?? '')]} />
            <Bar dataKey="new" name="New deals" fill={COLORS.new} radius={[3, 3, 0, 0]} isAnimationActive={!reduced} animationDuration={700} cursor="pointer" onClick={openBar('new')} />
            <Bar dataKey="won" name="Won" fill={COLORS.won} radius={[3, 3, 0, 0]} isAnimationActive={!reduced} animationDuration={700} animationBegin={150} cursor="pointer" onClick={openBar('won')} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only focus-within:not-sr-only focus-within:mt-3 focus-within:grid focus-within:grid-cols-2 focus-within:gap-x-6 focus-within:gap-y-1 focus-within:text-xs focus-within:text-foreground-secondary sm:focus-within:grid-cols-4">
        {data.trend.map((t) => (
          <li key={t.month}>
            {monthLabel(t.month)}:{' '}
            <Link className="hover:text-primary-dark hover:underline" href={quoteLinks.month('new', t.month, filters)}>
              {t.newCount} new
            </Link>
            ,{' '}
            <Link className="hover:text-primary-dark hover:underline" href={quoteLinks.month('won', t.month, filters)}>
              {t.wonCount} won
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 6: Barrel and page**

Add to `dashboard/index.ts`:

```ts
export { BiggestOpen } from './biggest-open';
export { NeedsAction } from './needs-action';
export { Sources } from './sources';
export { Team } from './team';
export { QuotesTrendChart } from './trend-chart';
```

In `quote-dashboard-page.tsx`, import them and replace the `data` branch body with:

```tsx
      <div className="flex flex-col gap-5">
        <QuotesStrip data={data} filters={filters} />
        <DealFlow data={data} filters={filters} />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <NeedsAction data={data} filters={filters} />
          </div>
          <div className="lg:col-span-2">
            <Team data={data} filters={filters} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <BiggestOpen data={data} filters={filters} />
          <Sources data={data} filters={filters} />
        </div>
        <QuotesTrendChart data={data} filters={filters} />
      </div>
```

- [ ] **Step 7: Typecheck, lint, browser**

Run `npm run typecheck:web` → exit 0; `npx nx lint web` → no new errors. In the browser at 1440×1000: all 5 bands render; rows fade in one by one; the trend switch Deals/₹ changes the axis; hovering a card lifts it; no console errors. Take one screenshot for the record.

- [ ] **Step 8: Commit**

```bash
git add -A apps/web/components/features/quotes
git commit -m "feat(web): needs action, team, biggest deals, sources and trend bands

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Quote list on `CrmTable` with deal filters and a Stage column

**Files:**
- Rewrite: `apps/web/components/features/quotes/components/quote-list-page.tsx`
- Modify: `apps/web/lib/hooks/resources/quotes.ts` (`QuoteListFilters`)
- Modify: `apps/web/components/features/quotes/hooks/use-quotes.ts` (`QuoteListItem.dealStage`; delete `useQuoteStatusCounts`), `hooks/index.ts` (drop its export)
- Modify: `apps/web/lib/theme/tokens.ts` (crm `col-quote-*` tracks, next to the other `col-*` entries ~line 361)

**Interfaces:**
- Consumes: deal filter keys written by `quoteLinks` (Task 8); API filters (Task 4); `DEAL_STAGE_LABELS`, `DEAL_ATTENTION_LABELS`, `leadSourceLabel`, `LEAD_SOURCE_NOT_SET`.
- Produces: `/quotes/list` reading `quotes_filters` keys `status, createdAt, stage, attention, person, financing, leadSource, leadSourceNotIn, newDate, wonDate, lostDate`.

- [ ] **Step 1: Filter type and item type**

In `lib/hooks/resources/quotes.ts` extend `QuoteListFilters`:

```ts
export interface QuoteListFilters extends BaseFilters {
  status?: QuoteStatus;
  customerId?: string;
  propertyId?: string;
  salesPersonId?: string;
  resellerId?: string;
  fromDate?: string;
  toDate?: string;
  // Deal filters (dashboard drill-downs) — see GET /quotes in the backend.
  stage?: DealStageFilter;
  attention?: DealAttention;
  person?: string;
  financing?: 'cash' | 'loan';
  leadSource?: string;
  leadSourceNotIn?: string;
  newFrom?: string;
  newTo?: string;
  wonFrom?: string;
  wonTo?: string;
  lostFrom?: string;
  lostTo?: string;
}
```

(import `DealAttention, DealStageFilter` types from `@tejas96/shared/types`.)

In `use-quotes.ts` add to `QuoteListItem`: `dealStage?: DealStage | null;` and delete the whole `useQuoteStatusCounts` function (lines ~204-227) plus any type used only by it; remove its export from `hooks/index.ts`. Run `grep -rn "useQuoteStatusCounts" apps/web` → only `quote-list-page.tsx` (fixed in Step 3).

- [ ] **Step 2: Column tracks**

In `lib/theme/tokens.ts`, in the crm block after `'col-actions': '40px',` add:

```ts
    'col-quote-number': '132px',
    'col-quote-property': 'minmax(120px,1fr)',
    'col-quote-system': '88px',
    'col-quote-value': '112px',
    'col-quote-stage': '112px',
    'col-quote-status': '136px',
    'col-quote-date': '108px',
```

- [ ] **Step 3: Rewrite the list page**

Rewrite `quote-list-page.tsx` on `CrmTable`, following `customers/components/customer-list-page.tsx` and `projects/components/project-list-page.tsx` (read both first; copy their `FilterAutocomplete`, `DateRangeFilter`, `formatDayRange`, `isRealDay`, `sanitizeUrlFilters` patterns). Keep:
- the `?status=` / `?toDate=` sidebar bridge (`initialFilters`) and `useTableUrlState({ prefix: 'quotes', defaultPageSize: 10, initialFilters })`;
- sort mapping (`COLUMN_TO_SORT_FIELD`, `toApiSortField`, `toApiSortOrder`), the `RowActionsMenu`, `QuoteStatusDropdown`, `VoidQuoteDialog`, delete flow, error banner, empty states and the header (title "Quotations", Export (disabled) and "Create Quote").

Remove: the 4 `StatsCard`s, `useQuoteStatusCounts`, `pendingCount`, `conversionRate`, the `StatsCard` and `FileText` imports, `BULK_ACTIONS` (its only action is a placeholder no-op).

Visible `CrmColumn<QuoteRow>[]` (`header`, `track`, `renderCell(row)`), same cell content as today's `COLUMNS`:

| field | header | track | sortable |
|---|---|---|---|
| quoteNumber | Quote # | `crm['col-quote-number']` | yes (stopPropagation on the link) |
| customerName | Customer | `crm['col-customer']` | yes |
| propertyName | Property | `crm['col-quote-property']` | no |
| systemSizeKw | System | `crm['col-quote-system']` | yes |
| finalPrice | Value | `crm['col-quote-value']` | yes, `align: 'right'` |
| dealStage | Stage | `crm['col-quote-stage']` | no |
| status | Status | `crm['col-quote-status']` | no, `stopPropagation` (dropdown) |
| createdAt | Created | `crm['col-quote-date']` | yes |
| validUntil | Valid until | `crm['col-quote-date']` | yes |
| actions | (empty) | `crm['col-actions']` | `hideable: false`, `stopPropagation` |

Stage cell:

```tsx
const STAGE_TONE: Record<DealStage, string> = {
  drafting: 'var(--ds-neutral-300)',
  waiting: 'var(--ds-primary-light)',
  quiet: 'var(--ds-danger)',
  won: 'var(--ds-primary)',
  lost: 'var(--ds-neutral-300)',
};

function StageCell({ stage }: { stage: DealStage | null | undefined }): JSX.Element {
  if (!stage) return <MUITypography variant="placeholder">-</MUITypography>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-foreground-secondary">
      <span aria-hidden="true" className="inline-block size-2 rounded-full" style={{ background: STAGE_TONE[stage] }} />
      {DEAL_STAGE_LABELS[stage]}
    </span>
  );
}
```

`FILTER_COLUMNS: ColumnConfig<QuoteRow>[]` (filter-only, passed as `filterColumns`):

```tsx
const STAGE_FILTER_OPTIONS = DEAL_STAGE_FILTERS.map((s) => ({ label: DEAL_STAGE_LABELS[s], value: s }));
const ATTENTION_OPTIONS = DEAL_ATTENTIONS.map((a) => ({ label: DEAL_ATTENTION_LABELS[a], value: a }));
const DAY_RANGE_KEYS: readonly string[] = ['newDate', 'wonDate', 'lostDate'];

const FILTER_COLUMNS: ColumnConfig<QuoteRow>[] = [
  { field: 'status', headerName: 'Quote status', filterable: true, filterType: 'select', filterOptions: STATUS_OPTIONS },
  { field: 'stage', headerName: 'Deal stage', filterable: true, filterType: 'select', filterOptions: STAGE_FILTER_OPTIONS },
  { field: 'attention', headerName: 'Needs action', filterable: true, filterType: 'select', filterOptions: ATTENTION_OPTIONS },
  { field: 'person', headerName: 'Made by', filterable: true, filterType: 'select', filterOptions: [] },
  {
    field: 'financing',
    headerName: 'Cash / loan',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Cash', value: 'cash' },
      { label: 'Loan', value: 'loan' },
    ],
  },
  { field: 'leadSource', headerName: 'Lead source', filterable: true, filterType: 'text', formatFilterValue: (v) => leadSourceLabel(String(v ?? '')) },
  { field: 'leadSourceNotIn', headerName: 'Lead source not', filterable: true, filterType: 'text', formatFilterValue: (v) => String(v ?? '').split(',').map(leadSourceLabel).join(', ') },
  { field: 'createdAt', headerName: 'Created on', filterable: true, filterType: 'date' },
  { field: 'newDate', headerName: 'New deal between', filterable: true, formatFilterValue: formatDayRange },
  { field: 'wonDate', headerName: 'Won between', filterable: true, formatFilterValue: formatDayRange },
  { field: 'lostDate', headerName: 'Lost between', filterable: true, formatFilterValue: formatDayRange },
];
```

In the component, fill `person` options from `useEmployees({ limit: 100 })` exactly as `project-list-page.tsx` builds `employeeOptions` (`value: emp.userId`), render it with `FilterAutocomplete`, and render the three day ranges with `DateRangeFilter` (same `useMemo` mapping as projects' `filterColumns`).

Sanitize the URL record exactly like `sanitizeUrlFilters` in `project-list-page.tsx` (select values must be one of their options — except `person`, which must match the UUID regex; day ranges keep only real days), and rewrite the URL once when something was dropped (same `useEffect`).

Extend `toQuoteFilters` to return, in addition to `status/fromDate/toDate`:

```ts
  const pick = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
    typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
  const text = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined;
  const range = (value: unknown): { from?: string; to?: string } => {
    const r = (value ?? {}) as { from?: unknown; to?: unknown };
    return { from: isRealDay(r.from) ? r.from : undefined, to: isRealDay(r.to) ? r.to : undefined };
  };
  const newDate = range(filters.newDate);
  const wonDate = range(filters.wonDate);
  const lostDate = range(filters.lostDate);
  // …spread into the returned object:
  //   stage: pick(filters.stage, DEAL_STAGE_FILTERS),
  //   attention: pick(filters.attention, DEAL_ATTENTIONS),
  //   person: typeof filters.person === 'string' && UUID.test(filters.person) ? filters.person : undefined,
  //   financing: pick(filters.financing, ['cash', 'loan'] as const),
  //   leadSource: text(filters.leadSource), leadSourceNotIn: text(filters.leadSourceNotIn),
  //   newFrom: newDate.from, newTo: newDate.to, wonFrom: wonDate.from, wonTo: wonDate.to,
  //   lostFrom: lostDate.from, lostTo: lostDate.to,
```

(Write these as real object properties in the returned literal; the comment above only lists them.)

Render:

```tsx
      <CrmTable<QuoteRow>
        columns={CRM_COLUMNS}
        rows={tableRows}
        getRowId={(row) => row.id}
        loading={isLoading}
        refetching={isFetching && !isLoading}
        initialSearch={urlState.state.search}
        onSearchChange={urlState.setSearch}
        searchPlaceholder="Search by quote #, customer, phone, property"
        filterColumns={filterColumns}
        filterModel={filters}
        onFilterChange={urlState.setFilters}
        sortModel={urlState.state.sortModel}
        onSortChange={urlState.setSortModel}
        page={urlState.state.page}
        pageSize={urlState.state.pageSize}
        totalRowCount={quoteData?.meta.total ?? 0}
        onPageChange={urlState.setPage}
        onPageSizeChange={urlState.setPageSize}
        onRowClick={(row) => void router.push(buildRoute(ROUTES.QUOTES.DETAIL, { id: row.id }))}
        itemLabel="quotes"
        renderEmptyState={renderEmptyState}
      />
```

- [ ] **Step 4: Typecheck and lint**

`npm run typecheck:web` → exit 0; `npx nx lint web` → no new errors; `grep -rn "useQuoteStatusCounts\|StatsCard" apps/web/components/features/quotes` → no output.

- [ ] **Step 5: Verify the list in the browser**

- `/quotes/list` opens with no stat cards, a Stage column, the search box and a Filters button; the total matches `GET /quotes?limit=1` `meta.total`.
- Open `/quotes/list?quotes_filters={"stage":"quiet"}` → a "Deal stage: Gone quiet" chip shows; total = dashboard's Gone quiet count; every visible row shows Stage "Gone quiet".
- Open `/quotes/list?quotes_filters={"stage":"bogus"}` → the chip is not shown and the URL is rewritten without it.
- Filters panel: pick Made by = a person, Cash / loan = Loan, Won between (2 dates): chips appear, totals change, "Clear all" resets.
- Old filters still work: `/quotes/list?status=draft` (sidebar bridge) shows only drafts.
- Row ⋮ menu is visible on every row; void/delete dialogs still open (do not confirm them).
- Console: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A apps/web/components/features/quotes apps/web/lib/hooks/resources/quotes.ts apps/web/lib/theme/tokens.ts
git commit -m "feat(web): quote list on CrmTable with deal filters and a Stage column

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Full verification pass

**Files:** none changed unless a check fails (then fix on this branch, re-run the failing check, and commit as `fix(quotes): …`).

- [ ] **Step 1: Static checks**

From the repo root:

```bash
npm run typecheck:libs && npm run typecheck:backend && npm run typecheck:web
npx nx run-many -t lint -p backend web shared
npx nx build web
npx knip
```

Expected: typechecks exit 0; lint shows no new errors (≈40 pre-existing web warnings); web build succeeds; knip shows no new unused files or exports from this branch (ignore the ~21 duplicated root deps).

- [ ] **Step 2: Click map (browser, admin login, period = Last month, Everyone, All)**

For each element, click it and check the list total (`meta.total` in the network response, or the table count) equals the number clicked:

New deals · "N cash" · "N loan" · Won value (opens won list; its count = Won block count) · Win rate (count = "won of new") · Open pipeline (count = "N deals waiting or quiet") · Drafting · Waiting · Gone quiet · Won · Lost · each Needs-action row · each owner name in it · each Team row (= that row's open count) · "+N more" (if shown) · each Biggest-deal row (opens `/quotes/<id>`) · each Source row incl. "Other" · two trend bars (one new, one won).

Repeat the strip checks for: This month × Cash; This quarter × Loan; This FY × one person. After any click, Back returns to `/quotes` with the same query string.

- [ ] **Step 3: SQL cross-check (read-only)**

Using `"$SCRATCH/deal-facts.sql"` from Task 3, run with `SET timezone = 'Asia/Kolkata';` and compare with the dashboard JSON for period=this_month, Everyone, All:

```sql
SELECT stage, COUNT(*), ROUND(SUM(value_rupees)) FROM deal_facts GROUP BY 1;
SELECT COUNT(*) FILTER (WHERE quiet_no_followup), COUNT(*) FILTER (WHERE ends_this_week),
       COUNT(*) FILTER (WHERE stale_draft), COUNT(*) FILTER (WHERE won_no_project) FROM deal_facts;
SELECT COUNT(*) FROM deal_facts WHERE CAST(new_at AS date) BETWEEN date_trunc('month', CURRENT_DATE)::date AND CURRENT_DATE;
SELECT COUNT(*) FROM deal_facts WHERE CAST(won_at AS date) BETWEEN date_trunc('month', CURRENT_DATE)::date AND CURRENT_DATE;
```

Expected: equal to `stages.*`, `needsAction[*].count`, `strip.newDeals.count`, `stages.won.count`.

Also spot-check the deal-quote rule on 3 properties that have more than one quote, one of them with an accepted quote and a newer draft:

```sql
SELECT property_id FROM quotes WHERE deleted_at IS NULL GROUP BY 1 HAVING COUNT(*) > 1
  AND bool_or(status = 'accepted' AND voided_at IS NULL) LIMIT 3;
```

For each, the dashboard's stage for that deal is Won, and `/quotes?propertyId=…` history shows the accepted one is the row the main list shows.

- [ ] **Step 4: Looks and motion**

- `resize_window` light and dark (`colorScheme`), at 1440×1000 and at 375×812: no horizontal scroll; at 375 the flow stacks vertically with the arrows turned down; long names truncate with a tooltip.
- First load: numbers count up, blocks fade in left to right, rows fade in one by one, trend bars rise. A filter change tweens numbers without replaying the entrance.
- Reduced motion: in `javascript_tool` you cannot set the OS setting; instead confirm every animation class carries `motion-reduce:` and that `usePrefersReducedMotion` gates Recharts (`isAnimationActive={!reduced}`) — read the code once more.
- Reset the viewport with `resize_window` preset `desktop` when done.

- [ ] **Step 5: /projects regression**

Open `/projects`: renders as before; Period + Cash/Loan still work; one `GET /projects/dashboard` per load.

- [ ] **Step 6: Report**

Write a short report in chat: what was checked, any mismatch found and fixed (with commit), and anything not checkable locally (e.g. reseller 403 if no reseller login exists). Do not open the PR until the user says so.
