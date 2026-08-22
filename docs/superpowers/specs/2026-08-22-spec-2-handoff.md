# Handoff — spec 2: admin employee selector and Business Matrix

Written 2026-08-22, at the end of the "My Work" dashboard build. Read this before starting
either feature so you argue from facts rather than re-deriving them.

**Start with `superpowers:brainstorming`.** Both features below are new work, not a continuation.

---

## Where things stand

| | |
|---|---|
| Branch | `feat/dashboard-my-work`, 55 commits, pushed |
| PR | [oneohm#297](https://github.com/tejas96/oneohm/pull/297) → `main`, **open and unreviewed** |
| Dashboard spec | `docs/superpowers/specs/2026-08-21-dashboard-my-work-design.md` |
| Plan (as built) | `docs/superpowers/plans/2026-08-21-dashboard-my-work.md` |
| Tests | 434 passing, 44 suites. **No new test files** — owner instruction, verify by running the app |

### Wait for #297 before starting the selector

The selector adds a query parameter to `GET /api/v1/dashboard/my-work` and the permission
check that guards it. That endpoint's subject resolution is the part a reviewer is most
likely to question, because backend RBAC does not exist and the endpoint's safety rests
entirely on taking identity from the token. If that changes in review, selector work built
on top of it rebases onto shifted ground.

The Business Matrix does not touch that endpoint and could start sooner.

---

## Split these into two specs

They look like one item on the roadmap and are not.

**The selector is mechanical.** A permission code, a catalog entry, a migration, a query
param, a check, an employee list, a dropdown. The hard thinking is already done — decision 2
of the dashboard spec deliberately put identity in the token so this could be added later
without reshaping anything.

**The Business Matrix is a design problem.** Not "which charts" but "which questions does a
manager actually need answered, and which of those does live data support". Half the obvious
finance charts cannot be built honestly (see below). That needs a real brainstorm.

---

## Facts for the employee selector

Verified 2026-08-22 against the codebase, not remembered.

- **No permission code covers "view another employee's work."** The catalog holds exactly 42
  codes (`apps/web/lib/rbac/catalog.ts`). The only two that come near by name —
  `projects.team.manage` and `inventory.allocations.manage` — are about something else.
- **There are deliberately no `admin.*` codes at all.** `apps/web/lib/rbac/route-map.ts:15-17`
  says so: `/admin` is gated by ROLE (`SUPERADMIN_ONLY`), not by permission, and `admin` is
  refused there while `super_admin` passes.
- So the selector needs a **new code**, which means a catalog entry **and** a migration
  mirroring it into the `permissions` table. The catalog was deliberately reset to 42 codes
  by migration `1855000000000-ResetRbacCatalog`; adding one is a considered act.
- **Backend RBAC enforcement does not exist.** `iam.service.ts:20-22` records that
  `PermissionGuard` and `hasPermission` were removed on purpose — enforcement is frontend-only.
  A query parameter naming another user would therefore be an unguarded "show me anyone's
  work" switch unless the check is written as part of the same change.
- The endpoint is `apps/backend/src/modules/dashboard/controllers/dashboard.controller.ts`.
  Its comment already names this future change and why the parameter and the check must land
  together.
- Ownership lives in one file: `apps/backend/src/modules/dashboard/services/scope.sql.ts`.
  Every provider composes it. Swapping the subject id is the only change needed there.

---

## Facts for the Business Matrix

- **Reuse, do not rebuild.** `apps/backend/src/modules/analytics/domains/sales-pipeline/`
  already provides the funnel, stage conversion and a salesperson leaderboard, with its own
  DTOs, helpers and constants. There is a matching web feature at
  `apps/web/components/features/pipeline/` including a funnel chart, trend chart, stage
  conversion panel and leaderboard.
- **`pipeline.view` already exists** as a permission code and already gates `/pipeline`
  (`route-map.ts:42`). It is the obvious gate rather than a new one.
- **The binding constraint is honesty, not effort.** Seven finance endpoints still read
  pre-cutover tables that stopped being written at cutover: `/dashboard`, `/receipts`,
  `/expenses`, `/outstanding`, `/customers/ar`, `/vendors/spend`,
  `/projects/profitability`. Any chart fed by those would report frozen figures. The
  ledger-backed and correct ones are `/kpis`, `/cash-flow`, `/entries`, `/receivables`, plus
  the `v_milestone_balance` view the dashboard uses.
- Charts have a house standard: `apps/web/lib/charts/palette.ts` re-exports an ordered,
  colourblind-safe ramp from the design tokens. Use it.

---

## Things that bit this build, and will bite the next one

Each cost a task or a review round. All are recorded as Global Constraints in the dashboard
plan; the short version:

1. **There is no global auth guard.** `app.module.ts` registers only `ThrottlerGuard`. A
   controller without `@UseGuards(JwtAuthGuard)` is public.
2. **`nx serve backend` does not hot-reload**, and **`web:dev` cannot reach a route behind
   middleware** — it redirects to `/login` before Next compiles the page. Use
   `npm run web:build`, which prerenders every route and executes the component.
3. **The backend listens on 8085**, not 3000.
4. **Never return a raw Postgres `date` from `dataSource.query()`.** Use
   `to_char(col, 'YYYY-MM-DD')`. The default node-postgres parser builds the Date in the
   process timezone and serialises a calendar day early. It is invisible in psql.
5. **`noUncheckedIndexedAccess: true`** — `arr[i].prop` does not compile.
6. **No backticks inside SQL comments** — the queries are template literals.
7. **Four Tailwind names do not resolve**: use `text-error`, `text-primary-dark`,
   `text-secondary`, `rounded-xl` — not `text-danger`, `text-accent-ink`, `text-link`,
   `rounded-r-sm`. The last is a real design-system collision: `--radius-r-sm` generates
   `.rounded-r-sm`, which Tailwind already owns as the right-corners utility, and the whole
   Expressive `r-*` family collides the same way. **Worth fixing at the token level.**
8. **Never put `disabled` on a permission-gated control** — it swallows the click that opens
   the access dialog. `aria-disabled` plus muting.
9. Database access: `docker exec -i oneohm-postgres psql -U root -d oneohm_epc -c "..."`.
   `psql` is not on the host PATH; the container, database and user all differ from defaults.

---

## Still unverified on the dashboard

Two screen checks were never walked, because the test account had neither the data nor the
permission:

- completing a follow-up from the dashboard
- comparing a finance figure against a project's Payments tab

Neither is a suspected defect — the data behind both is verified. They need an account with
follow-ups and `finance.view`.
