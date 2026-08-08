# Organization / Multi-Tenancy Removal — Design

**Date:** 2026-08-07
**Status:** Approved for planning
**Scope:** `apps/backend`, `apps/web`, `libs/shared`, and the Postgres schema

---

## 1. Why

The product is single-tenant. There is exactly one organization row — `OneOhm / ONEOHM_EPC` —
and there will never be a second. `organization_id` is carried through 49 tables, 48 entities,
~1,096 query sites, and ~650 web references, where it filters nothing and costs every new
feature a parameter, a join condition, and a cache-key segment.

This removes it completely: code, schema, and API contract.

## 2. Measured footprint

| Surface | Count |
|---|---|
| Tables carrying `organization_id` | 49 (+3 views) |
| Foreign keys to `organizations` | 39 |
| Indexes mentioning `organization_id` | 90 (30 unique, 60 non-unique) |
| Backend entities | 48 |
| Backend DTOs / services / controllers / repositories | 73 / 76 / 69 / 58 |
| Backend query sites filtering on org | ~1,096 |
| Web references | ~650 across 125 files |
| Backend test specs mentioning org | 2 (of 12 total specs) |

## 3. Decisions taken

| Question | Decision |
|---|---|
| Depth | Full cleanup — code **and** database, in one change |
| Surfaces | Monorepo only (backend, web, shared). Mobile repos excluded. |
| Rollout | One PR, one deploy, one migration |
| Mobile compatibility | **No shim.** Mobile apps break until their own cleanup ships. |
| Org table data | Hardcoded into a shared constant (§5) |

## 4. End state

Removed entirely:

- `organizations` and `organization_settings` tables
- `apps/backend/src/modules/organizations/` — 3 controllers, 2 services, 2 entities, repositories, DTOs
- `organization_id` on all 49 tables and 48 entities, and every `@ManyToOne(() => OrganizationEntity)` relation
- `apps/backend/src/common/decorators/organization-context.decorator.ts`
- The `X-Organization-Id` header and the `?organizationId=` query parameter
- `organizationId` from the JWT payload, `CurrentUser`, `LoginUserDto`, the login / refresh / profile
  responses, and `ReportEngineContext`
- `OrganizationStatus` enum and the `organizationId` fields on shared interfaces in `libs/shared`

Unaffected: ledger semantics. Milestones, allocations, and balances are computed per *project*.
`organization_id` only ever appeared as a redundant predicate beside a project or property id.

Nothing of value is lost. `organization_settings` holds **zero rows** and has no consumer outside
its own module. The organization endpoints have no caller — no web page, no mobile call site.

## 5. Company constants

`organizations` holds real data that nothing currently reads. It moves to a new file,
`libs/shared/src/constants/company.ts`, exported through the existing `constants/index.ts`:

```ts
export const COMPANY = {
  name: 'OneOhm',
  email: 'sanjay@oneohm.com',
  phone: '+919850808484',
  address: 'Plot No.93, Vasantdada Industrial Estate, Sangli',
  city: 'sangli',
  state: 'Maharashtra',
  country: 'India',
  pincode: '416416',
  gstin: '27AABCU9603R1ZM', // held for reference; NOT printed — receipts are not tax invoices
  pan: 'AABCU9603R',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  dateFormat: 'DD-MM-YYYY',
  defaultProjectTimelineWeeks: 4,
  defaultQuoteValidityDays: 30,
  maxQuoteVersions: 3,
} as const;
```

The receipt and quote PDF templates today print their own hardcoded — and different — company
block (`OneOhm Energy`, `Sangli, Maharashtra, India`, `info@oneohm.in`), invented because the DB
values were never wired up. Those blocks are deleted, `RECEIPT_DEFAULT_COMPANY` included, and the
templates read `COMPANY`.

**This is a customer-visible change:** receipts and quotes will show `OneOhm`,
`sanjay@oneohm.com`, and the full Plot No.93 address. GSTIN and PAN remain unprinted.

## 6. Backend approach — compiler-driven

With 12 backend specs, tests cannot be the safety net. The **TypeScript compiler is**. The order
below exists so that `tsc` generates the worklist instead of grep:

1. Delete the organizations module, the `@OrganizationContext()` decorator, `OrganizationStatus`,
   and the `organizationId` fields on shared interfaces.
2. Strip the `organizationId` column and the `OrganizationEntity` relation from all 48 entities.
3. Run `tsc --noEmit`. Every affected site now fails to compile with a file and line.
4. Work that list mechanically: drop the parameter from signatures, drop `organizationId` from
   `where` objects, delete `.andWhere('x.organization_id = :organizationId')`.

### 6.1 Sites needing judgment, not mechanics

These four are reviewed individually and must not be batch-edited:

- **`modules/finance-common/services/sequence.service.ts:50`** and
  **`modules/inventory/repositories/purchase-order.repository.ts:277`** — raw SQL upserts using
  `ON CONFLICT (organization_id, sequence_key)`. These generate payment, receipt, and PO numbers
  under concurrency. The conflict target must become `(sequence_key)`, matching the rebuilt unique
  index. A mismatch here breaks numbering silently rather than loudly.
- **Joins that exist only to reach org.** `projects/repositories/project-task.repository.ts` and
  `customers/services/customer.service.ts` join through to `property.organization_id` purely to
  scope. The join is removed, not just its predicate.
- **`auth/services/auth.service.ts`** — `profiles.find(p => p.isPrimary) || profiles[0]` exists
  because a user could hold profiles across several orgs. Single-tenant means a user has at most
  one customer profile and one employee profile, so `primaryProfile` collapses to profile-*type*
  selection. `organizationId` leaves `LoginUserDto`, the JWT payload, and `CurrentUser`.
- **Org existence validation** at `customers/services/customer.service.ts:782` and
  `customers/services/customer-property.service.ts:146` — deleted outright.

### 6.2 Seeds

`seed.ts`, `seed-inventory.ts`, `seed-quote-calculator.ts`, and `platform-admin.seed.ts` stop
creating and looking up an organization row.

## 7. Migration

One migration, one transaction. `DROP COLUMN` cascades to dependent indexes and foreign keys, so
the 39 FKs and 90 indexes are **not** dropped by hand — only what must be *recreated* is enumerated.

Order:

1. **Drop the 3 views** — `v_project_balance`, `v_milestone_balance`, `v_milestone_completion`.
   They select `organization_id` and would otherwise block the column drops.
2. **Pre-flight assertions.** Before any DDL, assert every unique constraint still holds once org
   is removed — no two `customer_profiles` sharing a `user_id`, no two `payments` sharing a
   `payment_number`, and so on for each index in §7.1. With one org these cannot collide, but the
   migration must `RAISE EXCEPTION` rather than assume it.
3. **Archive the org row** as a comment block in the migration file (already captured in §5).
4. **`ALTER TABLE … DROP COLUMN organization_id`** across all 49 tables.
5. **Recreate the 30 unique indexes** without the org column (§7.1).
6. **Recreate the useful non-unique indexes** without the org column (§7.2).
7. **`DROP TABLE organization_settings`, then `organizations`.**
8. **Recreate the 3 views** without `organization_id`, from the definitions in
   `database/migrations/sql/ledger/06-views.sql.ts`.

### 7.1 Unique indexes to rebuild

Straight drop of the leading org column:

| Table | Was | Becomes |
|---|---|---|
| `customer_profiles` | `(user_id, organization_id)` | `(user_id)` |
| `customer_profiles` | `(organization_id, lower(email)) WHERE …` | `(lower(email)) WHERE …` |
| `customer_profiles` | `(organization_id, phone) WHERE …` | `(phone) WHERE …` |
| `employee_profiles` | `(user_id, organization_id)` | `(user_id)` |
| `employee_profiles` | `(organization_id, employee_id)` | `(employee_id)` |
| `employee_profiles` | `(organization_id, company_code) WHERE …` | `(company_code) WHERE …` |
| `numbering_sequences` | `(organization_id, sequence_key)` | `(sequence_key)` |
| `ledger_entries` | `(organization_id, entry_no)` | `(entry_no)` |
| `payments` | `(organization_id, payment_number) WHERE deleted_at IS NULL` | `(payment_number) WHERE …` |
| `project_expenses` | `(organization_id, expense_number) WHERE …` | `(expense_number) WHERE …` |
| `purchase_orders` | `(organization_id, po_number)` | `(po_number)` |
| `material_dispatches` | `(organization_id, dispatch_number)` | `(dispatch_number)` |
| `brands` | `(organization_id, name)` | `(name)` |
| `products` | `(organization_id, code)` | `(code)` |
| `product_types` | `(organization_id, code)` | `(code)` |
| `vendors` | `(organization_id, code)` | `(code)` |
| `warehouses` | `(organization_id, code)` | `(code)` |
| `roles` | `(organization_id, code)` | `(code)` |
| `approval_templates` | `(organization_id, code, deleted_at)` | `(code, deleted_at)` |
| `workflow_steps` | `(organization_id, code, deleted_at)` | `(code, deleted_at)` |
| `workflow_steps` | `(organization_id, change_request_type) WHERE …` | `(change_request_type) WHERE …` |
| `integrations` | `(organization_id, provider, category)` | `(provider, category)` |
| `installation_pricing` | `(organization_id, min_kw, max_kw)` | `(min_kw, max_kw)` |
| `subsidy_configurations` | `(organization_id, scheme_code) WHERE …` | `(scheme_code) WHERE …` |
| `saved_views` | `(organization_id, user_id, resource, name)` | `(user_id, resource, name)` |
| `products` | `(organization_id, product_type_id, specifications->>'structure_type') WHERE …` | drop org term, keep the rest |

Two need special handling:

- **`quote_configurations`** — `UNIQUE (organization_id) WHERE is_active = true` enforced one
  active config per org. A unique index needs at least one column, so the single-tenant equivalent
  is a unique index on a constant expression:
  `CREATE UNIQUE INDEX … ON quote_configurations ((true)) WHERE is_active = true`, enforcing at
  most one active configuration globally.
- **`user_roles`** — both indexes wrap the column in
  `COALESCE(organization_id, '00000000-…'::uuid)`. That wrapper disappears:
  `(user_id, role_id)` and `(user_id, role) WHERE role IS NOT NULL`.

`uq_organization_settings_org_key` is not rebuilt — the table is dropped.

Accounting: 26 in the table above + 3 special-cased (`quote_configurations`, `user_roles` ×2)
+ 1 dropped with its table = **30**, matching the measured count in §2.

### 7.2 Non-unique indexes

Sixty non-unique indexes lead with `organization_id` and vanish with the column. Each is reviewed:
recreated on the remaining columns where a query still needs it (e.g. `(organization_id, status,
deleted_at)` → `(status, deleted_at)`), and dropped where the remainder duplicates an existing
index. Skipping this review would silently regress list-page query plans.

The implementation plan must carry the explicit keep/drop decision for all sixty as a checked
list — "review each one" is not an executable step.

## 8. Web

~650 references across 125 files; all are removal, not rework.

- Delete `'X-Organization-Id'` from every request header object.
- Drop the `organizationId` segment from React Query keys —
  `customerKeys.list(organizationId, …)` → `customerKeys.list(…)`. Cache-key shape changes;
  harmless, since the cache is per-session.
- **Delete every `enabled: !!organizationId` gate.** These are a latent bug: a user whose primary
  profile lacks an org silently sees empty lists instead of an error. Removing them is a fix.
- `providers/auth-provider.tsx` drops `organizationId` from the user type.
- `lib/config/routes.ts` loses the unused `ORGANIZATIONS` route constant.

## 9. Verification

| Gate | What it proves |
|---|---|
| `npm run typecheck` (backend, web, libs) | Every call site was actually updated — ~1,096 backend plus ~650 web |
| `npm run lint` | No orphaned imports or unused parameters left behind |
| `grep -riE "organi[sz]ation" apps libs --exclude-dir={node_modules,dist,.next,migrations}` | Returns nothing. Historical migrations legitimately still mention org and are excluded; the new migration is reviewed by hand |
| Post-migration SQL asserts | 0 columns named `organization_id`, 0 FKs to `organizations`, both tables gone, 3 views restored |
| **Ledger checksum, before vs after** | `SUM(amount_paise)` over `ledger_entries` and per-project milestone balances identical pre/post — the migration must not move a rupee |
| Manual smoke on a prod clone | login → customer list → project detail → quote create → record payment → **receipt PDF** → **create PO** (exercises numbering sequences) → ledger balance |

The smoke pass checks the rendered feature, not merely that a row landed.

## 10. Rollback

One-shot deploy with destructive DDL means rollback is restore-from-snapshot. Required before
deploy: a **verified** database snapshot — restored once and row-counted — taken immediately
beforehand. A scheduled backup that has never been restored does not satisfy this.

## 11. Known breakage — accepted

Both mobile apps break the moment this deploys.

- **`oneohm-mobile`** — reads `user.organizationId` from the login response and gates screens on
  `enabled: !!organizationId`, so those screens go blank. Its 21 `?organizationId=` URLs return
  **400**, because the backend runs `forbidNonWhitelisted: true` and the parameter no longer exists
  on any DTO.
- **`oneohm-consumer-mobo-app`** — degrades more gently; its interceptor simply stops attaching a
  header.

## 12. Follow-up work

1. Strip ~579 organization references from `oneohm-mobile` (separate repo, separate release,
   app-store build). Should ship as close behind this as possible.
2. Remove the org injection from `oneohm-consumer-mobo-app/src/core/api/interceptors.ts`.
3. Re-point the PDF company block if the values in §5 turn out to be stale.

---

## 13. Execution record — 2026-08-08

Completed on branch `refactor/remove-organizations`.

**Migration applied to the working database** (`oneohm_epc`, a production clone:
221 projects, 1,485 quotes, 1,183 customers, ₹1,84,11,280 of ledger).

Before the irreversible DDL, a snapshot was taken **and verified** by restoring
it into a scratch database and comparing row counts — the plan's §10 requirement.
It lives at `oneohm_epc_presnapshot.sql` (20 MB) in the session scratch directory;
copy it somewhere durable if it is still wanted.

| Check | Result |
|---|---|
| Schema after migration | 0 org columns, 0 org tables, 0 FKs, 3 views, contract-composition columns intact |
| Money checksum | **Unchanged across 221 projects** |
| Row counts | projects/quotes/ledger/customers all identical pre and post |
| Endpoint probe | **145 of 148** parameterless GETs pass |
| Write path | receipt recorded (`RCP-2026-27-000215`), received +₹1,000, outstanding −₹1,000, then reversed; ledger sum back to 1841128000 |
| Numbering sequences | keyed on `sequence_key` alone; produced 215 then 216 |
| Append-only ledger | still enforced after migration (DELETE rejected) |
| Typecheck / tests / web build | clean; 157 backend + 77 web tests pass |

Two audit entries remain from the smoke test — `RCP-2026-27-000215` and its
reversal `RCP-2026-27-000216`, netting to zero. They cannot be deleted; the
ledger is append-only by design.

### Pre-existing failures, NOT caused by this work

Three endpoints return 500: `/approval-requests`, `/approval-templates`,
`/audit-logs`. Proven pre-existing by running the pre-cleanup code against the
unmigrated database — all three fail there too. Cause is a TypeORM
`orderBy('request.submitted_at')` snake_case reference in the distinct-pagination
path. Unrelated to organizations; needs its own fix.

`master-data.seed.ts` was separately repaired: its cleanup step used to delete
quotes and projects, which the append-only ledger now makes impossible and which
was never a prerequisite for seeding master data.

### Not verified

The **web UI has not been rendered**. It typechecks, builds for production, and
its 77 tests pass, but no page was loaded against the migrated backend — a second
Next dev server could not start alongside the running one. Verify by pointing the
web app at the migrated database and walking: customer list → project Money tab →
receipt PDF.

### Mobile — breaks now

Both apps are broken against the migrated backend, as accepted in §11.
`oneohm-mobile` has 572 references and 21 `?organizationId=` URLs (inventory in
`tmp/mobile-org-breakage.txt`); `oneohm-consumer-mobo-app` has 7.
