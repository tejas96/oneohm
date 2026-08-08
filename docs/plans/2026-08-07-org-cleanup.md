# Organization / Multi-Tenancy Removal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `organization_id` and every trace of multi-tenancy from the OneOhm backend, web app, shared library, and Postgres schema, replacing the one organization row with a hardcoded shared constant.

**Architecture:** Additive work lands first (company constants, PDF wiring, baseline capture). The destructive migration is then written and proven against a *restored copy* of the database, so the working database keeps running. Only after the code is fully clean does the migration run against the working database. The TypeScript compiler — not the test suite — is the instrument that finds all ~1,746 call sites; tasks 7–12 use `tsc` error counts and scoped greps as their gates.

**Tech Stack:** NestJS 11, TypeORM 0.3, Postgres 15, Next.js (App Router), React Query, Nx monorepo, Jest + ts-jest.

**Design doc:** [`docs/plans/2026-08-07-org-cleanup-design.md`](./2026-08-07-org-cleanup-design.md)

## Global Constraints

- **Single tenant.** No `organizationId` parameter, column, header, query param, JWT claim, or cache-key segment survives anywhere in `apps/backend`, `apps/web`, or `libs/shared`.
- **No compatibility shim.** Nothing is kept alive for the mobile apps.
- **Mobile breakage is accepted and expected.** `oneohm-mobile` and `oneohm-consumer-mobo-app` break on deploy. Do not add code to soften this.
- **GSTIN and PAN live in the constant but are never printed.** Receipts are payment acknowledgements, not tax invoices.
- **The migration must not move a rupee.** Ledger totals and per-project milestone balances are identical before and after.
- **Historical migrations are never edited.** Files under `apps/backend/src/database/migrations/` prior to this change keep their `organization_id` references forever.
- Run all commands from the repo root `/Volumes/works-space/oneohm/oneohm` unless a step says otherwise.

---

## File Structure

**Created:**
- `libs/shared/src/constants/company.ts` — the single source of company identity
- `libs/shared/src/constants/company.spec.ts` — pins the constant's values
- `apps/backend/src/database/migrations/sql/org-cleanup/01-assertions.sql.ts` — pre-flight uniqueness guards
- `apps/backend/src/database/migrations/sql/org-cleanup/02-drop-columns.sql.ts` — the 48 `DROP COLUMN` statements
- `apps/backend/src/database/migrations/sql/org-cleanup/03-indexes.sql.ts` — the 29 unique + 29 non-unique index rebuilds
- `apps/backend/src/database/migrations/sql/org-cleanup/04-views.sql.ts` — the 3 views, org-free
- `apps/backend/src/database/migrations/1852000000000-RemoveOrganizations.ts` — the migration
- `apps/backend/src/scripts/org-cleanup-baseline.ts` — captures and compares money checksums
- `apps/backend/src/modules/finance-common/services/sequence.service.spec.ts` — pins the numbering SQL

**Deleted:**
- `apps/backend/src/modules/organizations/` (entire directory)
- `apps/backend/src/common/decorators/organization-context.decorator.ts`
- `libs/shared/src/types/enums/organization.enum.ts`

**Modified:** 48 entities, 73 DTOs, 76 services, 69 controllers, 58 repositories, 4 seeds, and ~125 web files.

---

### Task 1: Company constants

**Files:**
- Create: `libs/shared/src/constants/company.ts`
- Modify: `libs/shared/src/constants/index.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `COMPANY` — a `const` object with keys `name, email, phone, address, city, state, country, pincode, gstin, pan, timezone, currency, dateFormat, defaultProjectTimelineWeeks, defaultQuoteValidityDays, maxQuoteVersions`. Tasks 2 and 11 import it as `import { COMPANY } from '@tejas96/shared/constants'` — the subpath, which is what `apps/web/jest.config.ts` maps.

> **Plan deviation, recorded during execution.** `libs/shared` has no jest config and no `test` target, so the originally-planned `company.spec.ts` could not run there. Adding a jest project to a library that has never had one is scope creep in a deletion PR. The value assertions moved into Task 2's web spec instead, where these values actually reach customers; the protection against a transcription typo is unchanged. Task 1's gate is therefore `typecheck`, not a test.

- [ ] **Step 1: Write the constant**

Create `libs/shared/src/constants/company.ts`:

```ts
/**
 * The company. Formerly the single row of the `organizations` table, which was
 * dropped when the app went single-tenant — see
 * docs/plans/2026-08-07-org-cleanup-design.md.
 *
 * This is the only source of company identity. Do not reintroduce a hardcoded
 * company block in a template; import from here.
 */
export const COMPANY = {
  name: 'OneOhm',
  email: 'sanjay@oneohm.com',
  phone: '+919850808484',
  address: 'Plot No.93, Vasantdada Industrial Estate, Sangli',
  city: 'sangli',
  state: 'Maharashtra',
  country: 'India',
  pincode: '416416',

  /**
   * Held for reference only. NOT printed on receipts: a receipt is a payment
   * acknowledgement and says so explicitly, not a tax invoice.
   */
  gstin: '27AABCU9603R1ZM',
  pan: 'AABCU9603R',

  timezone: 'Asia/Kolkata',
  currency: 'INR',
  dateFormat: 'DD-MM-YYYY',

  defaultProjectTimelineWeeks: 4,
  defaultQuoteValidityDays: 30,
  maxQuoteVersions: 3,
} as const;
```

- [ ] **Step 2: Export it**

Add to `libs/shared/src/constants/index.ts`, keeping alphabetical order with the existing exports:

```ts
export * from './company';
```

- [ ] **Step 3: Verify it compiles and is reachable**

```bash
npm run typecheck:libs
grep -n "company" libs/shared/src/constants/index.ts
```

Expected: typecheck clean, and the export present.

- [ ] **Step 4: Commit**

```bash
git add libs/shared/src/constants/company.ts libs/shared/src/constants/index.ts
git commit -m "feat(shared): add COMPANY constant to replace the organizations row"
```

---

### Task 2: PDF templates read COMPANY

**Files:**
- Modify: `apps/web/components/features/ledger/services/receipt-pdf.template.ts:55-77`
- Test: `apps/web/components/features/ledger/services/receipt-pdf.template.spec.ts` (create)

**Interfaces:**
- Consumes: `COMPANY` from Task 1
- Produces: `RECEIPT_DEFAULT_COMPANY` is **deleted**. Callers that referenced it now pass `COMPANY`-derived values, or omit the field so the template defaults to `COMPANY`.

This is a customer-visible change: the printed name becomes `OneOhm`, the email `sanjay@oneohm.com`, and the address the full Plot No.93 line.

- [ ] **Step 1: Find every caller of the deleted constant**

```bash
grep -rn "RECEIPT_DEFAULT_COMPANY" apps/web --exclude-dir=node_modules --exclude-dir=.next
```

Note each file — Step 4 updates them all.

- [ ] **Step 2: Write the failing test**

Create `apps/web/components/features/ledger/services/receipt-pdf.template.spec.ts`:

```ts
import { describe, it, expect } from '@jest/globals';
import { COMPANY } from '@tejas96/shared/constants';

import { RECEIPT_COMPANY } from './receipt-pdf.template';

describe('COMPANY', () => {
  it('carries the registered company identity', () => {
    expect(COMPANY.name).toBe('OneOhm');
    expect(COMPANY.email).toBe('sanjay@oneohm.com');
    expect(COMPANY.phone).toBe('+919850808484');
    expect(COMPANY.address).toBe('Plot No.93, Vasantdada Industrial Estate, Sangli');
    expect(COMPANY.pincode).toBe('416416');
  });

  it('carries the tax identifiers for reference', () => {
    expect(COMPANY.gstin).toBe('27AABCU9603R1ZM');
    expect(COMPANY.pan).toBe('AABCU9603R');
  });

  it('carries the business defaults that used to live on the organizations row', () => {
    expect(COMPANY.currency).toBe('INR');
    expect(COMPANY.timezone).toBe('Asia/Kolkata');
    expect(COMPANY.defaultQuoteValidityDays).toBe(30);
    expect(COMPANY.maxQuoteVersions).toBe(3);
    expect(COMPANY.defaultProjectTimelineWeeks).toBe(4);
  });
});

describe('RECEIPT_COMPANY', () => {
  it('is derived from the shared COMPANY constant, not hardcoded', () => {
    expect(RECEIPT_COMPANY.name).toBe(COMPANY.name);
    expect(RECEIPT_COMPANY.email).toBe(COMPANY.email);
    expect(RECEIPT_COMPANY.phone).toBe(COMPANY.phone);
  });

  it('prints a postal address assembled from COMPANY parts', () => {
    expect(RECEIPT_COMPANY.address).toContain(COMPANY.address);
    expect(RECEIPT_COMPANY.address).toContain(COMPANY.pincode);
  });

  it('never exposes tax identifiers — a receipt is not a tax invoice', () => {
    const printed = JSON.stringify(RECEIPT_COMPANY);
    expect(printed).not.toContain(COMPANY.gstin);
    expect(printed).not.toContain(COMPANY.pan);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx nx test web --testPathPatterns=receipt-pdf.template
```

Expected: FAIL — `RECEIPT_COMPANY` is not exported. The `COMPANY` describe block should already pass, since Task 1 created the constant.

- [ ] **Step 4: Replace the hardcoded block**

In `receipt-pdf.template.ts`, delete the `RECEIPT_DEFAULT_COMPANY` block (and its comment about following the quote PDF's precedent) and replace with:

```ts
import { COMPANY } from '@tejas96/shared/constants';

/**
 * The company block printed on receipts. Assembled from the shared COMPANY
 * constant — never hardcode these strings again. GSTIN and PAN are deliberately
 * absent: this document states it is not a tax invoice.
 */
export const RECEIPT_COMPANY: ReceiptPdfData['company'] = {
  name: COMPANY.name,
  address: `${COMPANY.address}, ${COMPANY.state} ${COMPANY.pincode}`,
  phone: COMPANY.phone,
  email: COMPANY.email,
};
```

Update every caller found in Step 1 to use `RECEIPT_COMPANY`.

- [ ] **Step 5: Run test to verify it passes**

```bash
npx nx test web --testPathPatterns=receipt-pdf.template
```

Expected: PASS, 6 tests.

- [ ] **Step 6: Do the same for the quote PDF**

```bash
grep -rn "OneOhm Energy\|info@oneohm.in" apps/web --exclude-dir=node_modules --exclude-dir=.next
```

Every hit is a hardcoded company block. Replace each with values read from `COMPANY`, matching the pattern above. When this grep returns nothing, the step is done.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/features/ledger/services/
git commit -m "refactor(web): read PDF company block from shared COMPANY constant"
```

---

### Task 3: Baseline capture

**Files:**
- Create: `apps/backend/src/scripts/org-cleanup-baseline.ts`

**Interfaces:**
- Consumes: nothing
- Produces: a JSON baseline file at `tmp/org-cleanup-baseline.json`, and a `--compare` mode that exits non-zero if any figure moved. Task 13 runs the comparison.

This is the guard that proves the migration did not move money.

- [ ] **Step 1: Write the script**

Create `apps/backend/src/scripts/org-cleanup-baseline.ts`:

```ts
/**
 * Money checksum around the organization-removal migration.
 *
 * Run with no arguments BEFORE the migration to write the baseline; run with
 * --compare AFTER it. Any difference means the migration moved money and the
 * deploy must be rolled back, not investigated afterwards.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

// ormconfig exports the DataSource as a default (required by the TypeORM CLI).
import AppDataSource from '../database/ormconfig';

const BASELINE_PATH = 'tmp/org-cleanup-baseline.json';

interface Baseline {
  ledgerEntryCount: number;
  ledgerSumPaise: string;
  allocationSumPaise: string;
  milestoneSumPaise: string;
  projectBalances: Array<{ project_id: string; outstanding_paise: string }>;
}

async function capture(): Promise<Baseline> {
  const ds = await AppDataSource.initialize();
  try {
    const [entries] = await ds.query(
      `SELECT COUNT(*)::text AS c, COALESCE(SUM(amount_paise), 0)::text AS s FROM ledger_entries`,
    );
    const [allocations] = await ds.query(
      `SELECT COALESCE(SUM(amount_paise), 0)::text AS s FROM ledger_allocations`,
    );
    const [milestones] = await ds.query(
      `SELECT COALESCE(SUM(amount_paise), 0)::text AS s FROM payment_milestones`,
    );
    const projectBalances = await ds.query(
      `SELECT project_id::text, outstanding_paise::text
         FROM v_project_balance ORDER BY project_id`,
    );
    return {
      ledgerEntryCount: Number(entries.c),
      ledgerSumPaise: entries.s,
      allocationSumPaise: allocations.s,
      milestoneSumPaise: milestones.s,
      projectBalances,
    };
  } finally {
    await ds.destroy();
  }
}

async function main(): Promise<void> {
  const compare = process.argv.includes('--compare');
  const current = await capture();

  if (!compare) {
    writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2));
    console.log(`Baseline written to ${BASELINE_PATH}`);
    console.log(`  ledger entries : ${current.ledgerEntryCount}`);
    console.log(`  ledger sum     : ${current.ledgerSumPaise} paise`);
    console.log(`  projects       : ${current.projectBalances.length}`);
    return;
  }

  if (!existsSync(BASELINE_PATH)) {
    throw new Error(`No baseline at ${BASELINE_PATH}. Run without --compare first.`);
  }
  const before = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;

  const diffs: string[] = [];
  if (before.ledgerEntryCount !== current.ledgerEntryCount) {
    diffs.push(`ledger entry count: ${before.ledgerEntryCount} -> ${current.ledgerEntryCount}`);
  }
  for (const key of ['ledgerSumPaise', 'allocationSumPaise', 'milestoneSumPaise'] as const) {
    if (before[key] !== current[key]) diffs.push(`${key}: ${before[key]} -> ${current[key]}`);
  }

  const beforeByProject = new Map(before.projectBalances.map((r) => [r.project_id, r.outstanding_paise]));
  for (const row of current.projectBalances) {
    const prev = beforeByProject.get(row.project_id);
    if (prev !== row.outstanding_paise) {
      diffs.push(`project ${row.project_id} outstanding: ${prev ?? 'absent'} -> ${row.outstanding_paise}`);
    }
  }
  if (before.projectBalances.length !== current.projectBalances.length) {
    diffs.push(`project count: ${before.projectBalances.length} -> ${current.projectBalances.length}`);
  }

  if (diffs.length > 0) {
    console.error('MONEY MOVED — do not proceed:');
    for (const d of diffs) console.error(`  ${d}`);
    process.exit(1);
  }
  console.log(`Money unchanged across ${current.projectBalances.length} projects.`);
}

void main();
```

- [ ] **Step 2: Confirm the data source export shape**

```bash
grep -n "export" apps/backend/src/database/ormconfig.ts
```

Expected: a single `export default new DataSource(...)` — already reflected in the import above. Verified during execution on 2026-08-07; re-check only if this fails.

- [ ] **Step 3: Run it against the local database**

```bash
cd apps/backend && npx ts-node -r tsconfig-paths/register src/scripts/org-cleanup-baseline.ts
```

Expected: writes `tmp/org-cleanup-baseline.json` and prints an entry count, a paise sum, and a project count. Non-zero numbers.

- [ ] **Step 4: Verify the compare path detects nothing when nothing changed**

```bash
cd apps/backend && npx ts-node -r tsconfig-paths/register src/scripts/org-cleanup-baseline.ts --compare
```

Expected: `Money unchanged across N projects.` and exit code 0.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/scripts/org-cleanup-baseline.ts
git commit -m "test(backend): add money checksum guard for the org-removal migration"
```

---

### Task 4: Migration SQL — assertions and column drops

**Files:**
- Create: `apps/backend/src/database/migrations/sql/org-cleanup/01-assertions.sql.ts`
- Create: `apps/backend/src/database/migrations/sql/org-cleanup/02-drop-columns.sql.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `ORG_CLEANUP_ASSERTIONS: string[]` and `ORG_CLEANUP_DROP_COLUMNS: string[]`, both imported by the migration class in Task 6.

- [ ] **Step 1: Write the assertions**

Create `01-assertions.sql.ts`:

```ts
/**
 * Pre-flight guards. Every composite unique index that currently leads with
 * `organization_id` becomes narrower once the column goes. With one tenant these
 * cannot collide — but "cannot" is exactly the assumption worth checking before
 * irreversible DDL, so each one fails loudly instead of silently deduplicating.
 */
const assertUnique = (table: string, cols: string, where = 'TRUE'): string => `
  DO $$
  DECLARE dupes INT;
  BEGIN
    SELECT COUNT(*) INTO dupes FROM (
      SELECT ${cols} FROM ${table} WHERE ${where}
      GROUP BY ${cols} HAVING COUNT(*) > 1
    ) d;
    IF dupes > 0 THEN
      RAISE EXCEPTION
        'org-cleanup: % rows in %(%) would violate uniqueness once organization_id is dropped',
        dupes, '${table}', '${cols}';
    END IF;
  END $$;
`;

export const ORG_CLEANUP_ASSERTIONS: string[] = [
  `DO $$
   DECLARE n INT;
   BEGIN
     SELECT COUNT(*) INTO n FROM organizations;
     IF n <> 1 THEN
       RAISE EXCEPTION 'org-cleanup: expected exactly 1 organization, found %', n;
     END IF;
   END $$;`,

  assertUnique('customer_profiles', 'user_id'),
  assertUnique('customer_profiles', 'lower(email)', 'deleted_at IS NULL AND email IS NOT NULL'),
  assertUnique('customer_profiles', 'phone', 'deleted_at IS NULL AND phone IS NOT NULL'),
  assertUnique('employee_profiles', 'user_id'),
  assertUnique('employee_profiles', 'employee_id'),
  assertUnique('employee_profiles', 'company_code', 'company_code IS NOT NULL'),
  assertUnique('numbering_sequences', 'sequence_key'),
  assertUnique('ledger_entries', 'entry_no'),
  assertUnique('payments', 'payment_number', 'deleted_at IS NULL'),
  assertUnique('project_expenses', 'expense_number', 'deleted_at IS NULL'),
  assertUnique('purchase_orders', 'po_number'),
  assertUnique('material_dispatches', 'dispatch_number'),
  assertUnique('brands', 'name'),
  assertUnique('products', 'code'),
  assertUnique('product_types', 'code'),
  assertUnique('vendors', 'code'),
  assertUnique('warehouses', 'code'),
  assertUnique('roles', 'code'),
  assertUnique('approval_templates', 'code, deleted_at'),
  assertUnique('workflow_steps', 'code, deleted_at'),
  assertUnique('workflow_steps', 'change_request_type', 'deleted_at IS NULL AND change_request_type IS NOT NULL'),
  assertUnique('integrations', 'provider, category'),
  assertUnique('installation_pricing', 'min_system_size_kw, max_system_size_kw'),
  assertUnique('subsidy_configurations', 'scheme_code', 'scheme_code IS NOT NULL'),
  assertUnique('saved_views', 'user_id, resource, name'),
  assertUnique('user_roles', 'user_id, role_id'),
  assertUnique('user_roles', 'user_id, role', 'role IS NOT NULL'),
  assertUnique('quote_configurations', 'is_active', 'is_active = TRUE'),
  assertUnique(
    'products',
    "product_type_id, (specifications ->> 'structure_type')",
    "status = 'active' AND deleted_at IS NULL AND (specifications ->> 'structure_type') IS NOT NULL AND (specifications ->> 'structure_type') <> ''",
  ),
];
```

- [ ] **Step 2: Run the assertions against the live local database**

They are read-only, so it is safe:

```bash
docker exec -i oneohm-postgres psql -U root -d oneohm_epc -v ON_ERROR_STOP=1 <<'SQL'
DO $$ DECLARE n INT; BEGIN
  SELECT COUNT(*) INTO n FROM (SELECT user_id FROM customer_profiles GROUP BY user_id HAVING COUNT(*) > 1) d;
  IF n > 0 THEN RAISE EXCEPTION 'customer_profiles.user_id would collide: %', n; END IF;
END $$;
SQL
```

Expected: `DO`, no exception. If it raises, stop — the data does not support single-tenant uniqueness and the design needs revisiting.

- [ ] **Step 3: Write the column drops**

Create `02-drop-columns.sql.ts`. All 48 tables; `organization_settings` is absent because Task 5 drops the whole table:

```ts
/**
 * `DROP COLUMN` cascades to dependent indexes and foreign key constraints, so
 * the 39 FKs and 90 indexes are not dropped by hand — only the indexes worth
 * keeping are rebuilt, in 03-indexes.sql.ts.
 *
 * The dropped organizations row, recorded for posterity:
 *   id      9f6d06b2-d7b6-48f6-ba38-66af76c4ca27
 *   name    OneOhm            code   ONEOHM_EPC
 *   email   sanjay@oneohm.com phone  +919850808484
 *   address Plot No.93, Vasantdada Industrial Estate, Sangli, Maharashtra 416416
 *   gstin   27AABCU9603R1ZM   pan    AABCU9603R
 *   timezone Asia/Kolkata     currency INR      date_format DD-MM-YYYY
 *   default_project_timeline_weeks 4  default_quote_validity_days 30
 *   max_quote_versions 3
 * These values now live in libs/shared/src/constants/company.ts.
 */
const TABLES = [
  'approval_requests', 'approval_templates', 'audit_logs', 'bom', 'brands',
  'comments', 'compliance_applications', 'customer_feedback', 'customer_profiles',
  'customer_properties', 'documents', 'employee_commissions', 'employee_profiles',
  'followups', 'inspections', 'installation_pricing', 'integrations',
  'inventory_stock', 'inventory_transactions', 'invitations', 'ledger_entries',
  'maintenance_tasks', 'material_dispatches', 'notifications', 'numbering_sequences',
  'payment_milestones', 'payments', 'product_prices', 'product_types', 'products',
  'project_expenses', 'project_maintenance_configs', 'project_payment_terms',
  'purchase_orders', 'quote_configurations', 'quotes', 'return_requests', 'roles',
  'saved_views', 'security_events', 'service_requests', 'stock_allocations',
  'subsidy_applications', 'subsidy_configurations', 'user_roles', 'vendors',
  'warehouses', 'workflow_steps',
];

export const ORG_CLEANUP_DROP_COLUMNS: string[] = TABLES.map(
  (t) => `ALTER TABLE ${t} DROP COLUMN organization_id`,
);
```

- [ ] **Step 4: Verify the table list matches the database exactly**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_epc -tAc "select table_name from information_schema.columns where column_name='organization_id' and table_schema='public' and table_name not in ('organizations','organization_settings') and table_name not like 'v\_%' order by 1;" | tr '\n' ' '
```

Expected: 48 names, matching `TABLES` exactly. A mismatch means a table was missed — fix the array, do not proceed.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/database/migrations/sql/org-cleanup/
git commit -m "feat(db): add org-cleanup pre-flight assertions and column drops"
```

---

### Task 5: Migration SQL — indexes and views

**Files:**
- Create: `apps/backend/src/database/migrations/sql/org-cleanup/03-indexes.sql.ts`
- Create: `apps/backend/src/database/migrations/sql/org-cleanup/04-views.sql.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `ORG_CLEANUP_INDEXES: string[]`, `ORG_CLEANUP_DROP_VIEWS: string[]`, `ORG_CLEANUP_CREATE_VIEWS: string[]`, imported by Task 6.

- [ ] **Step 1: Write the index rebuilds**

Create `03-indexes.sql.ts`. Every index below currently leads with `organization_id` and disappeared with the column in Task 4; these are the ones worth having back:

```ts
/**
 * Index rebuilds after organization_id was dropped.
 *
 * Of the 90 indexes that mentioned the column: 30 unique and 60 non-unique.
 * 29 uniques are rebuilt (the 30th belonged to organization_settings, which is
 * dropped), along with 29 non-uniques. The remaining 31 non-uniques are
 * deliberately NOT rebuilt — 24 indexed nothing but the org column itself, and
 * 7 became prefixes of a unique index rebuilt here.
 */
export const ORG_CLEANUP_INDEXES: string[] = [
  // ---- unique ----
  `CREATE UNIQUE INDEX uq_customer_profiles_user ON customer_profiles (user_id)`,
  `CREATE UNIQUE INDEX uq_customer_profiles_email ON customer_profiles (lower(email)) WHERE deleted_at IS NULL AND email IS NOT NULL`,
  `CREATE UNIQUE INDEX uq_customer_profiles_phone ON customer_profiles (phone) WHERE deleted_at IS NULL AND phone IS NOT NULL`,
  `CREATE UNIQUE INDEX uq_employee_profiles_user ON employee_profiles (user_id)`,
  `CREATE UNIQUE INDEX uq_employee_profiles_emp_id ON employee_profiles (employee_id)`,
  `CREATE UNIQUE INDEX uq_employee_profiles_company_code ON employee_profiles (company_code) WHERE company_code IS NOT NULL`,
  `CREATE UNIQUE INDEX uq_numbering_sequences_key ON numbering_sequences (sequence_key)`,
  `CREATE UNIQUE INDEX uq_ledger_entries_entry_no ON ledger_entries (entry_no)`,
  `CREATE UNIQUE INDEX uq_payments_number_active ON payments (payment_number) WHERE deleted_at IS NULL`,
  `CREATE UNIQUE INDEX uq_project_expenses_number_active ON project_expenses (expense_number) WHERE deleted_at IS NULL`,
  `CREATE UNIQUE INDEX uq_purchase_orders_po_number ON purchase_orders (po_number)`,
  `CREATE UNIQUE INDEX uq_material_dispatches_dispatch_number ON material_dispatches (dispatch_number)`,
  `CREATE UNIQUE INDEX uq_brands_name ON brands (name)`,
  `CREATE UNIQUE INDEX uq_products_code ON products (code)`,
  `CREATE UNIQUE INDEX uq_product_types_code ON product_types (code)`,
  `CREATE UNIQUE INDEX uq_vendors_code ON vendors (code)`,
  `CREATE UNIQUE INDEX uq_warehouses_code ON warehouses (code)`,
  `CREATE UNIQUE INDEX uq_roles_code ON roles (code)`,
  `CREATE UNIQUE INDEX uq_approval_templates_code ON approval_templates (code, deleted_at)`,
  `CREATE UNIQUE INDEX uq_task_templates_code ON workflow_steps (code, deleted_at)`,
  `CREATE UNIQUE INDEX uq_workflow_steps_change_request_type ON workflow_steps (change_request_type) WHERE deleted_at IS NULL AND change_request_type IS NOT NULL`,
  `CREATE UNIQUE INDEX uq_integrations_provider_category ON integrations (provider, category)`,
  `CREATE UNIQUE INDEX uq_ip_size_tier ON installation_pricing (min_system_size_kw, max_system_size_kw)`,
  `CREATE UNIQUE INDEX uq_subsidy_config_scheme_code ON subsidy_configurations (scheme_code) WHERE scheme_code IS NOT NULL`,
  `CREATE UNIQUE INDEX uq_saved_views_owner_name ON saved_views (user_id, resource, name)`,
  `CREATE UNIQUE INDEX uq_user_roles_user_role_id ON user_roles (user_id, role_id)`,
  `CREATE UNIQUE INDEX uq_user_roles_user_role ON user_roles (user_id, role) WHERE role IS NOT NULL`,
  `CREATE UNIQUE INDEX uq_products_active_structure_type ON products (product_type_id, ((specifications ->> 'structure_type'))) WHERE status = 'active' AND deleted_at IS NULL AND (specifications ->> 'structure_type') IS NOT NULL AND (specifications ->> 'structure_type') <> ''`,

  // "At most one active quote configuration" was UNIQUE (organization_id) WHERE
  // is_active. A unique index needs at least one column, so the single-tenant
  // equivalent is a unique index on a constant expression.
  `CREATE UNIQUE INDEX uq_quote_config_active ON quote_configurations ((TRUE)) WHERE is_active = TRUE`,

  // ---- non-unique ----
  `CREATE INDEX idx_customer_profiles_status ON customer_profiles (status, deleted_at)`,
  `CREATE INDEX idx_customer_profiles_assignee ON customer_profiles (assignee_id) WHERE deleted_at IS NULL`,
  `CREATE INDEX idx_customer_profiles_group ON customer_profiles (group_code) WHERE deleted_at IS NULL`,
  `CREATE INDEX idx_customer_properties_temperature ON customer_properties (lead_temperature, deleted_at)`,
  `CREATE INDEX idx_customer_properties_site_status ON customer_properties (site_status) WHERE deleted_at IS NULL`,
  `CREATE INDEX idx_customer_properties_customer ON customer_properties (customer_id)`,
  `CREATE INDEX idx_customer_properties_filter_lookup ON customer_properties (customer_id, property_type, connection_type, status, lead_temperature) WHERE deleted_at IS NULL`,
  `CREATE INDEX idx_customer_properties_status ON customer_properties (status, deleted_at)`,
  `CREATE INDEX idx_documents_property ON documents (property_id, deleted_at)`,
  `CREATE INDEX idx_documents_entity ON documents (entity_type, deleted_at)`,
  `CREATE INDEX idx_commissions_employee ON employee_commissions (employee_id, status)`,
  `CREATE INDEX idx_employee_profiles_kind_status ON employee_profiles (profile_kind, status, deleted_at)`,
  `CREATE INDEX idx_employee_profiles_status ON employee_profiles (status, deleted_at)`,
  `CREATE INDEX idx_followups_status ON followups (status, deleted_at)`,
  `CREATE INDEX idx_installation_pricing_active ON installation_pricing (is_active)`,
  `CREATE INDEX idx_ip_active_size ON installation_pricing (is_active, min_system_size_kw DESC)`,
  `CREATE INDEX idx_integrations_active ON integrations (is_active)`,
  `CREATE INDEX idx_inventory_stock_warehouse ON inventory_stock (warehouse_id)`,
  `CREATE INDEX idx_inventory_stock_product ON inventory_stock (product_id)`,
  `CREATE INDEX idx_inventory_transactions_date ON inventory_transactions (transaction_date DESC)`,
  `CREATE INDEX idx_ledger_entries_direction_value_date ON ledger_entries (direction, value_date)`,
  `CREATE INDEX idx_material_dispatches_status ON material_dispatches (status)`,
  `CREATE INDEX idx_products_status ON products (status, deleted_at)`,
  `CREATE INDEX idx_purchase_orders_status ON purchase_orders (status)`,
  `CREATE INDEX idx_purchase_orders_vendor ON purchase_orders (vendor_id)`,
  `CREATE INDEX idx_security_events_type_created ON security_events (event_type, created_at)`,
  `CREATE INDEX idx_stock_allocations_status ON stock_allocations (status)`,
  `CREATE INDEX idx_subsidy_config_project_active ON subsidy_configurations (project_type, is_active)`,
  `CREATE INDEX idx_user_roles_role ON user_roles (role_id) WHERE role_id IS NOT NULL`,
];
```

- [ ] **Step 2: Identify the current definition of each view**

Each view has been redefined more than once, and only the **latest** definition is live. Copying from a superseded file silently reverts columns that production depends on.

```bash
grep -rn "VIEW v_" apps/backend/src/database/migrations/sql/ledger/
```

Expected, and the authority for each view:

| View | Current definition | Superseded |
|---|---|---|
| `v_milestone_balance` | `06-views.sql.ts:25` | — |
| `v_milestone_completion` | `11-milestone-stage-mapping.sql.ts:74` | `08-task-completion.sql.ts:79` |
| `v_project_balance` | `12-contract-composition.sql.ts:20` | `06-views.sql.ts:79` |

- [ ] **Step 3: Copy the three current definitions into the new file**

Create `04-views.sql.ts` containing three exported template literals. Copy the SQL body of each view **verbatim** from the file named in the table above — do not retype it, and do not summarise it. Name them `CREATE_V_MILESTONE_BALANCE_V2`, `CREATE_V_MILESTONE_COMPLETION_V2`, and `CREATE_V_PROJECT_BALANCE_V2`, then add:

```ts
export const ORG_CLEANUP_DROP_VIEWS: string[] = [
  // v_project_balance selects from v_milestone_balance, so it goes first.
  `DROP VIEW IF EXISTS v_project_balance`,
  `DROP VIEW IF EXISTS v_milestone_completion`,
  `DROP VIEW IF EXISTS v_milestone_balance`,
];

export const ORG_CLEANUP_CREATE_VIEWS: string[] = [
  CREATE_V_MILESTONE_BALANCE_V2,
  CREATE_V_MILESTONE_COMPLETION_V2,
  CREATE_V_PROJECT_BALANCE_V2,
];
```

- [ ] **Step 4: Delete exactly four organization references from the copies**

In `CREATE_V_MILESTONE_BALANCE_V2`, delete the line:
```sql
    m.organization_id,
```

In `CREATE_V_PROJECT_BALANCE_V2`, delete the line:
```sql
    cp.organization_id,
```

In `CREATE_V_MILESTONE_COMPLETION_V2`, delete `pm.organization_id,` and `m.organization_id,` from the select lists, and remove `m.organization_id` from the trailing `GROUP BY` — leaving the other grouped columns in place:
```sql
  GROUP BY m.id, m.project_id, m.name, m.stage, m.work_stage_key
```

Nothing else in these definitions changes. Also fix the stale comment in `06-views.sql.ts` that reads *"Org and customer come via `customer_properties` because `projects` has no `organization_id` column of its own"* — only the customer half is true now.

- [ ] **Step 5: Verify you copied from the right files**

```bash
grep -c "quoted_paise\|change_order_paise" apps/backend/src/database/migrations/sql/org-cleanup/04-views.sql.ts
grep -c "organization_id" apps/backend/src/database/migrations/sql/org-cleanup/04-views.sql.ts
grep -c "work_stage_key" apps/backend/src/database/migrations/sql/org-cleanup/04-views.sql.ts
```

Expected: `2` or more, then `0`, then `1` or more.

A `0` on the first check means `v_project_balance` was copied from `06-views.sql.ts` instead of `12-contract-composition.sql.ts` — it would drop the contract-composition columns. A `0` on the third means `v_milestone_completion` came from the superseded `08-task-completion.sql.ts`.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/database/migrations/sql/org-cleanup/
git commit -m "feat(db): add org-cleanup index and view rebuilds"
```

---

### Task 6: The migration, proven on a restored copy

**Files:**
- Create: `apps/backend/src/database/migrations/1852000000000-RemoveOrganizations.ts`

**Interfaces:**
- Consumes: `ORG_CLEANUP_ASSERTIONS`, `ORG_CLEANUP_DROP_COLUMNS`, `ORG_CLEANUP_INDEXES`, `ORG_CLEANUP_DROP_VIEWS`, `ORG_CLEANUP_CREATE_VIEWS`
- Produces: migration `RemoveOrganizations1852000000000`

The migration is proven against a **copy** of the database so the working database keeps running while tasks 7–12 proceed.

- [ ] **Step 1: Write the migration**

```ts
import { type MigrationInterface, type QueryRunner } from 'typeorm';

import { ORG_CLEANUP_ASSERTIONS } from './sql/org-cleanup/01-assertions.sql';
import { ORG_CLEANUP_DROP_COLUMNS } from './sql/org-cleanup/02-drop-columns.sql';
import { ORG_CLEANUP_INDEXES } from './sql/org-cleanup/03-indexes.sql';
import {
  ORG_CLEANUP_CREATE_VIEWS,
  ORG_CLEANUP_DROP_VIEWS,
} from './sql/org-cleanup/04-views.sql';

/**
 * RemoveOrganizations — the app is single-tenant.
 *
 * One organization row ever existed. `organization_id` was carried by 49 tables
 * and ~1,096 query sites where it filtered nothing. This drops the column, the
 * 39 foreign keys and 90 indexes that depended on it (both cascade with the
 * column), and the organizations tables themselves.
 *
 * IRREVERSIBLE. `down()` throws: the column values cannot be reconstructed once
 * the organizations row is gone. Rollback is restore-from-snapshot — see
 * docs/plans/2026-08-07-org-cleanup-design.md §10.
 */
export class RemoveOrganizations1852000000000 implements MigrationInterface {
  name = 'RemoveOrganizations1852000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of ORG_CLEANUP_ASSERTIONS) {
      await queryRunner.query(statement);
    }
    for (const statement of ORG_CLEANUP_DROP_VIEWS) {
      await queryRunner.query(statement);
    }
    for (const statement of ORG_CLEANUP_DROP_COLUMNS) {
      await queryRunner.query(statement);
    }
    for (const statement of ORG_CLEANUP_INDEXES) {
      await queryRunner.query(statement);
    }
    await queryRunner.query(`DROP TABLE IF EXISTS organization_settings`);
    await queryRunner.query(`DROP TABLE IF EXISTS organizations`);
    for (const statement of ORG_CLEANUP_CREATE_VIEWS) {
      await queryRunner.query(statement);
    }
  }

  public async down(): Promise<void> {
    throw new Error(
      'RemoveOrganizations is irreversible. Restore from the pre-deploy snapshot.',
    );
  }
}
```

- [ ] **Step 2: Make a restored copy of the working database**

```bash
docker exec oneohm-postgres psql -U root -d postgres -c "DROP DATABASE IF EXISTS oneohm_orgtest;"
docker exec oneohm-postgres psql -U root -d postgres -c "CREATE DATABASE oneohm_orgtest TEMPLATE oneohm_epc;"
```

Expected: `CREATE DATABASE`. If it fails with "source database is being accessed", stop the backend dev server first.

- [ ] **Step 3: Run the migration against the copy**

```bash
cd apps/backend && DATABASE_NAME=oneohm_orgtest npm run migration:run
```

Expected: `Migration RemoveOrganizations1852000000000 has been executed successfully.`

If the env var name differs, read `apps/backend/src/database/ormconfig.ts` for the one it uses. Do not point this at `oneohm_epc`.

- [ ] **Step 4: Assert the schema is clean**

```bash
docker exec oneohm-postgres psql -U root -d oneohm_orgtest -tAc "
  select 'org columns: '   || count(*) from information_schema.columns where column_name='organization_id' and table_schema='public'
  union all
  select 'org tables: '    || count(*) from information_schema.tables  where table_schema='public' and table_name in ('organizations','organization_settings')
  union all
  select 'views: '         || count(*) from information_schema.views   where table_schema='public'
  union all
  select 'contract cols: ' || count(*) from information_schema.columns where table_name='v_project_balance' and column_name in ('quoted_paise','change_order_paise');
"
```

Expected exactly:
```
org columns: 0
org tables: 0
views: 3
contract cols: 2
```

Any other result fails the task.

- [ ] **Step 5: Assert money did not move**

```bash
cd apps/backend && DATABASE_NAME=oneohm_orgtest npx ts-node -r tsconfig-paths/register src/scripts/org-cleanup-baseline.ts --compare
```

Expected: `Money unchanged across N projects.`, exit 0. A non-zero exit means the view rebuild changed a balance — fix `04-views.sql.ts` before continuing.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/database/migrations/1852000000000-RemoveOrganizations.ts
git commit -m "feat(db): drop organization_id and the organizations tables"
```

---

### Task 7: Numbering sequences

**Files:**
- Modify: `apps/backend/src/modules/finance-common/services/sequence.service.ts:39-62`
- Modify: `apps/backend/src/modules/inventory/repositories/purchase-order.repository.ts:267-287`
- Create: `apps/backend/src/modules/finance-common/services/sequence.service.spec.ts`

**Interfaces:**
- Consumes: the `uq_numbering_sequences_key` index from Task 5
- Produces: `SequenceService.getNextNumber(scope: FinanceSequenceScope, manager?: EntityManager): Promise<string>` and `PurchaseOrderRepository.generatePoNumber(manager?: EntityManager): Promise<string>` — both lose their leading `organizationId` parameter. Tasks 8 and 9 call these signatures.

This is the highest-risk code change: an `ON CONFLICT` target that does not match a unique index throws at runtime, and a wrong one corrupts receipt and PO numbering under concurrency. It gets a real test.

- [ ] **Step 1: Write the failing test**

Create `sequence.service.spec.ts`:

```ts
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

import { SequenceService } from './sequence.service';

interface Recorded { sql: string; params: unknown[] }

describe('SequenceService.getNextNumber', () => {
  let recorded: Recorded[];
  let service: SequenceService;

  beforeEach(() => {
    recorded = [];
    const manager = {
      query: jest.fn(async (sql: string, params: unknown[]) => {
        recorded.push({ sql, params });
        return [{ last_value: 7 }];
      }),
    };
    service = new SequenceService({ manager } as never);
  });

  it('conflicts on sequence_key alone — the index no longer includes organization_id', async () => {
    await service.getNextNumber('receipt');
    expect(recorded[0].sql).toContain('ON CONFLICT (sequence_key)');
    expect(recorded[0].sql).not.toContain('organization_id');
  });

  it('passes only the sequence key as a parameter', async () => {
    await service.getNextNumber('receipt');
    expect(recorded[0].params).toHaveLength(1);
    expect(String(recorded[0].params[0])).toMatch(/^receipt-\d{4}-\d{2}$/);
  });

  it('formats the number with the scope prefix, financial year and zero padding', async () => {
    const result = await service.getNextNumber('receipt');
    expect(result).toMatch(/^RCP-\d{4}-\d{2}-000007$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx nx test backend --testPathPatterns=sequence.service
```

Expected: FAIL — the SQL still contains `organization_id`, and `getNextNumber` still expects two positional arguments.

- [ ] **Step 3: Update the service**

In `sequence.service.ts`, drop the `organizationId` parameter and change the statement:

```ts
  async getNextNumber(
    scope: FinanceSequenceScope,
    manager?: EntityManager,
  ): Promise<string> {
    const fy = this.computeFinancialYear(new Date());
    const sequenceKey = `${scope}-${fy}`;
    const prefix = this.getPrefix(scope);

    const exec = manager ?? this.dataSource.manager;
    const rows = await exec.query(
      `INSERT INTO numbering_sequences (sequence_key, last_value)
       VALUES ($1, 1)
       ON CONFLICT (sequence_key)
       DO UPDATE SET last_value = numbering_sequences.last_value + 1, updated_at = CURRENT_TIMESTAMP
       RETURNING last_value`,
      [sequenceKey],
    );

    const raw = rows[0]?.last_value;
    const seq = typeof raw === 'string' ? parseInt(raw, 10) : (raw ?? 1);

    return `${prefix}-${fy}-${String(seq).padStart(6, '0')}`;
  }
```

Update the JSDoc above it to drop the `@param organizationId` line.

- [ ] **Step 4: Apply the same change to the PO repository**

In `purchase-order.repository.ts`:

```ts
  async generatePoNumber(manager?: EntityManager): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const sequenceKey = `po-${year}-${month}`;
    const yyyymm = `${year}${month}`;

    const exec = manager ?? this.repository.manager;
    const result = await exec.query(
      `INSERT INTO numbering_sequences (sequence_key, last_value)
       VALUES ($1, 1)
       ON CONFLICT (sequence_key)
       DO UPDATE SET last_value = numbering_sequences.last_value + 1
       RETURNING last_value`,
      [sequenceKey],
    );

    const raw = result[0]?.last_value;
    const seq = typeof raw === 'string' ? parseInt(raw, 10) : (raw ?? 1);
    return `PO-${yyyymm}-${String(seq).padStart(4, '0')}`;
  }
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx nx test backend --testPathPatterns=sequence.service
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Confirm no numbering site still mentions org**

```bash
grep -rn "numbering_sequences" apps/backend/src --include="*.ts" | grep -v migrations | grep organization
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/finance-common/services/ apps/backend/src/modules/inventory/repositories/purchase-order.repository.ts
git commit -m "refactor(backend): key numbering sequences on sequence_key alone"
```

---

### Task 8: Entities and shared types

**Files:**
- Modify: 48 entity files under `apps/backend/src/modules/*/entities/`
- Delete: `libs/shared/src/types/enums/organization.enum.ts`
- Modify: `libs/shared/src/types/enums/index.ts`, and the shared interfaces listing `organizationId`
- Modify: `libs/shared/src/reports/report-context.ts:9`

**Interfaces:**
- Consumes: nothing
- Produces: entities with no `organizationId` property and no `OrganizationEntity` relation. This is what makes `tsc` enumerate the work for tasks 9–11.

After this task the backend **will not compile**. That is expected and is the point.

- [ ] **Step 1: List the entities to change**

```bash
grep -rl "organization_id" apps/backend/src --include="*.entity.ts" | sort
```

Expected: 48 paths (49 minus `organization-setting.entity.ts`, deleted with its module in Task 10).

- [ ] **Step 2: Strip the column and relation from each**

In every file from Step 1, delete:

```ts
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;
```

and, where present, the relation and its now-unused import:

```ts
  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;
```

Also delete any `@Index([...])` decorator on the class whose column list includes `'organizationId'`; where the index has other columns, keep those (e.g. `@Index(['organizationId', 'status', 'deletedAt'])` becomes `@Index(['status', 'deletedAt'])`). These must match the indexes built in Task 5.

- [ ] **Step 3: Delete the shared enum and interface fields**

```bash
rm libs/shared/src/types/enums/organization.enum.ts
grep -rn "organization" libs/shared/src --include="*.ts" | grep -v spec
```

Remove the `organization.enum` re-export from `types/enums/index.ts`, delete the `organizationId` field from each interface the grep reports, and delete `organizationId: string;` from `ReportEngineContext` in `reports/report-context.ts:9`.

- [ ] **Step 4: Verify shared compiles on its own**

```bash
npm run typecheck:libs
```

Expected: clean. `libs/shared` has no dependency on the backend, so it must pass now.

- [ ] **Step 5: Record the size of the remaining work**

```bash
npx tsc --noEmit -p apps/backend/tsconfig.json 2>&1 | grep -c "organizationId"
```

Expected: a large number, in the high hundreds. Write it down — Task 9 drives it to zero.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src libs/shared/src
git commit -m "refactor: remove organizationId from entities and shared types"
```

---

### Task 9: Repositories and services

**Files:**
- Modify: 58 repositories and 76 services under `apps/backend/src/modules/`

**Interfaces:**
- Consumes: the entities from Task 8, and the numbering signatures from Task 7
- Produces: repository and service methods with no `organizationId` parameter. Task 10's controllers call these.

- [ ] **Step 1: Get the worklist from the compiler**

```bash
npx tsc --noEmit -p apps/backend/tsconfig.json 2>&1 | grep "organizationId" | grep -E "repositories/|services/" | sort -u > /tmp/org-worklist.txt
wc -l /tmp/org-worklist.txt
```

- [ ] **Step 2: Work the list mechanically**

For each file, apply exactly these four edits and nothing else:

1. Drop `organizationId: string,` from the parameter list, and the matching `@param` JSDoc line.
2. Drop `organizationId` from `where` objects: `where: { id, organizationId, deletedAt: IsNull() }` becomes `where: { id, deletedAt: IsNull() }`.
3. Delete `.andWhere('x.organizationId = :organizationId', { organizationId })` and the `.andWhere('x.organization_id = :organizationId', …)` spelling. If the deletion leaves a `.where()` chain starting with `.andWhere`, promote the first `.andWhere` to `.where`.
4. Drop `organization_id = $N` from raw SQL and renumber the remaining placeholders and the parameter array.

Do **not** change behaviour beyond removing the org predicate. If a change looks like it needs more, it belongs to Step 3.

- [ ] **Step 3: Handle the two join-only sites**

`projects/repositories/project-task.repository.ts` and `customers/services/customer.service.ts` join to `customer_properties` purely to reach `property.organization_id`. Removing only the predicate leaves a pointless join.

In each, when the *only* reason for the `customer_properties` join was the org predicate, delete the join clause too. Where the join also supplies a selected column or another predicate, keep it. Check each of these:

```bash
grep -n "organization_id\|organizationId" apps/backend/src/modules/projects/repositories/project-task.repository.ts apps/backend/src/modules/customers/services/customer.service.ts
```

Also delete the ownership helper `ledger.repository.ts:305-330` (`Does this project belong to the caller's organization?`) and every call to it — with one tenant, a project id is sufficient proof of ownership.

- [ ] **Step 4: Delete the org existence checks**

At `customers/services/customer.service.ts:782` and `customers/services/customer-property.service.ts:146`, delete the `organizationRepository.findOneById(...)` lookups, the surrounding validation, and the injected `organizationRepository` constructor parameters.

- [ ] **Step 5: Verify the layer is clean**

```bash
npx tsc --noEmit -p apps/backend/tsconfig.json 2>&1 | grep "organizationId" | grep -cE "repositories/|services/"
```

Expected: `0`. Errors from controllers and DTOs are expected and belong to Task 10.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules
git commit -m "refactor(backend): drop organizationId from repositories and services"
```

---

### Task 10: Controllers, DTOs, auth, and the organizations module

**Files:**
- Delete: `apps/backend/src/modules/organizations/` (entire directory)
- Delete: `apps/backend/src/common/decorators/organization-context.decorator.ts`
- Modify: `apps/backend/src/common/decorators/index.ts`, `apps/backend/src/app.module.ts`
- Modify: 69 controllers, 73 DTOs
- Modify: `apps/backend/src/modules/auth/` — `auth.service.ts`, `jwt.strategy.ts`, `jwt-payload.type.ts`, `current-user.type.ts`, `profile-summary.dto.ts`, `otp.service.ts`, `auth.controller.ts:141`

**Interfaces:**
- Consumes: the services from Task 9
- Produces: an HTTP API with no org input anywhere, and a login response with no `organizationId`

- [ ] **Step 1: Delete the module and the decorator**

```bash
rm -rf apps/backend/src/modules/organizations
rm apps/backend/src/common/decorators/organization-context.decorator.ts
```

Remove the `OrganizationsModule` import and registration from `app.module.ts`, and the decorator's re-export from `common/decorators/index.ts`.

- [ ] **Step 2: Strip controllers**

```bash
npx tsc --noEmit -p apps/backend/tsconfig.json 2>&1 | grep "organizationId" | grep "controllers/" | sort -u
```

For each: delete the `@OrganizationContext() organizationId: string,` parameter and its import, and drop `organizationId` from the service call arguments.

- [ ] **Step 3: Strip DTOs**

```bash
grep -rln "organizationId" apps/backend/src --include="*.dto.ts"
```

Delete the `organizationId` property and its decorators (`@ApiProperty`, `@IsUUID`, `@IsOptional`) from each. Because the app runs `forbidNonWhitelisted: true`, removing it from a request DTO means a client still sending it gets a 400 — that is the intended, accepted outcome.

- [ ] **Step 4: Update auth**

- `jwt-payload.type.ts` and `current-user.type.ts` — delete the `organizationId?: string` field and its comment about multi-tenancy.
- `jwt.strategy.ts:41-44` — delete the `organizationId` line from the returned user object.
- `auth.service.ts:115,130 / 241,256 / 386,401` — delete `organizationId: primaryProfile?.organizationId,` from all three response builders. Keep `primaryProfile`: it still selects between a customer and an employee profile. Update its comment to say so.
- `auth.service.ts:670-720` — in `fetchUserProfiles`, drop `organizationId` from each mapped profile object.
- `profile-summary.dto.ts:25,85` and `auth.controller.ts:141` — delete the `organizationId` field and assignment.
- `otp.service.ts:64-104` — drop the optional `organizationId` from the params type and the persisted record.

- [ ] **Step 5: Verify the backend compiles**

```bash
npm run typecheck:backend
```

Expected: clean, zero errors. This is the task's gate.

- [ ] **Step 6: Verify nothing org-shaped is left**

```bash
grep -rniE "organi[sz]ation" apps/backend/src --exclude-dir=migrations | grep -v "\.spec\.ts"
```

Expected: no output. Hits under `migrations/` are historical and stay.

- [ ] **Step 7: Commit**

```bash
git add -A apps/backend/src
git commit -m "refactor(backend): remove the organizations module and all org API input"
```

---

### Task 11: Seeds

**Files:**
- Modify: `apps/backend/src/database/seeds/seed.ts`, `seed-inventory.ts`, `seed-quote-calculator.ts`, `platform-admin.seed.ts`

**Interfaces:**
- Consumes: `COMPANY` from Task 1 where a seed needs company details
- Produces: seeds that run against the post-migration schema

- [ ] **Step 1: Find the org references**

```bash
grep -n "organization" apps/backend/src/database/seeds/*.ts
```

- [ ] **Step 2: Remove them**

- `seed-quote-calculator.ts:661-663` — delete the `SELECT id FROM organizations LIMIT 1` lookup and the "No organizations found" guard, along with the variable it fed.
- `seed-inventory.ts` — every `FROM organizations org, users u` becomes `FROM users u`; drop `org.id` from the inserted column lists and `WHERE` clauses.
- `seed.ts` — delete the organization insert; keep the payment-terms JSON at line 441 untouched.
- `platform-admin.seed.ts` — drop the org assignment from the created admin.

- [ ] **Step 3: Prove the seeds run against the migrated copy**

```bash
docker exec oneohm-postgres psql -U root -d postgres -c "DROP DATABASE IF EXISTS oneohm_seedtest;"
docker exec oneohm-postgres psql -U root -d postgres -c "CREATE DATABASE oneohm_seedtest TEMPLATE oneohm_orgtest;"
cd apps/backend && DATABASE_NAME=oneohm_seedtest npm run seed:all
```

Expected: completes with no error mentioning `organization`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/database/seeds
git commit -m "refactor(backend): drop organization from database seeds"
```

---

### Task 12: Web

**Files:**
- Modify: ~125 files under `apps/web/components`, `apps/web/providers`, `apps/web/lib`

**Interfaces:**
- Consumes: the org-free API from Task 10
- Produces: a web app that never reads, sends, or caches an organization id

> **Scope correction, found during execution.** Most of the web's org plumbing funnels through one hook, `apps/web/lib/hooks/core/use-org-context.ts` — 21 lines returning `{ organizationId, orgHeaders, isReady }`, consumed by **48 files across 139 references**. Delete the hook first and the consumers follow; do not hand-edit headers file-by-file.
>
> Separately: `useOrgReceipts`, `useOrgOutstanding`, `useOrgProfitability`, `OrgReceiptListItem`, `OrgExpenseListItem`, `lib/hooks/resources/finance-org.ts` and similar `Org`-prefixed names mean **company-wide** (all receipts across the business, versus per-project). They are not tenancy and are **deliberately left untouched** — decided 2026-08-07. Do not rename them.

- [ ] **Step 1: Get the worklist**

```bash
grep -rln "organizationId\|X-Organization-Id\|useOrgContext\|orgHeaders" apps/web/app apps/web/components apps/web/lib apps/web/providers apps/web/types | sort
```

- [ ] **Step 2: Delete the central hook and its consumers**

```bash
rm apps/web/lib/hooks/core/use-org-context.ts
```

Remove its re-export from `apps/web/lib/hooks/core/index.ts:38`. Then, in each of the 48 consumers:

- Delete the `useOrgContext()` call and its destructuring.
- Delete `...orgHeaders` spreads from request header objects. Where that leaves `headers: {}`, delete the `headers` key; where it leaves an empty options object as the last argument, delete the argument.
- Delete `isReady` from `enabled:` expressions, keeping any other conditions. Where `isReady` was the only condition, delete the `enabled` key.

`use-resource-list.ts` and `use-infinite-resource-list.ts` are the two core hooks that consume it — do those first, since many features inherit their behaviour.

- [ ] **Step 3: Delete the remaining direct headers**

Remove every `'X-Organization-Id': organizationId` entry. Where that leaves an empty `headers: {}`, delete the `headers` key; where it leaves an empty options object as the last argument, delete the argument.

- [ ] **Step 4: Narrow the query keys**

`customerKeys.list(organizationId, filters)` becomes `customerKeys.list(filters)`. Update each key factory's signature and every call site together, so the key arity stays consistent — a factory updated without its callers produces silently colliding cache keys rather than a type error when the parameter is `unknown`.

- [ ] **Step 5: Delete the gates**

Remove `!!organizationId` from every `enabled:` expression. Where it was the only condition, delete the `enabled` key entirely. Where it was combined, keep the rest: `enabled: !!customerId && !!organizationId && options?.enabled !== false` becomes `enabled: !!customerId && options?.enabled !== false`.

Then delete the now-unused `const organizationId = user?.organizationId;` lines.

- [ ] **Step 6: Clean the provider and routes**

- `providers/auth-provider.tsx` — drop `organizationId` from the user type and anywhere it is read.
- `lib/config/routes.ts:172` — delete the unused `ORGANIZATIONS: '/organizations',` entry.

- [ ] **Step 7: Verify**

```bash
npm run typecheck:web
grep -rniE "organi[sz]ation" apps/web/app apps/web/components apps/web/lib apps/web/providers apps/web/types
```

Expected: typecheck clean; grep returns nothing.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "refactor(web): remove organization id from headers, query keys and gates"
```

---

### Task 13: Full verification

**Files:** none modified — this task proves the work.

- [ ] **Step 1: Typecheck, lint, and test everything**

```bash
npm run typecheck && npm run lint && npm run test
```

Expected: all clean. Any failure is a defect in tasks 1–12, not something to work around here.

- [ ] **Step 2: Prove no org reference survives**

```bash
grep -rniE "organi[sz]ation|useOrgContext|orgHeaders|X-Organization-Id" apps libs \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.next --exclude-dir=migrations
```

Expected: no output.

The second half of that pattern matters: `useOrgContext` and `orgHeaders` are the web's actual tenancy plumbing and **do not contain the string "organization"**, so a bare `organi[sz]ation` grep reports success while 139 references survive. That is the whole reason this gate is spelled out.

Historical migrations are excluded by design. The new migration under `sql/org-cleanup/` is reviewed by eye instead — it legitimately names the tables it drops.

- [ ] **Step 3: Confirm the deliberate survivors are still intact**

```bash
grep -rl "useOrgReceipts\|useOrgOutstanding\|useOrgProfitability" apps/web/lib apps/web/components | wc -l
```

Expected: a non-zero count. These company-wide finance hooks were deliberately kept (decision of 2026-08-07). A zero here means someone over-applied the cleanup and deleted working report code.

- [ ] **Step 4: Migrate the working database**

```bash
cd apps/backend && npx ts-node -r tsconfig-paths/register src/scripts/org-cleanup-baseline.ts
cd apps/backend && npm run migration:run
cd apps/backend && npx ts-node -r tsconfig-paths/register src/scripts/org-cleanup-baseline.ts --compare
```

Expected: baseline written, migration succeeds, comparison reports `Money unchanged across N projects.` and exits 0.

- [ ] **Step 5: Smoke the app end to end**

Start both apps, then walk this path in the browser and confirm each screen **renders** the expected data — a correct database row that nothing displays is a failed check:

1. Log in.
2. Customer list loads with rows (this is where a missed `enabled` gate shows up as an empty list).
3. Open a project's detail page; the Money tab shows a contract value and outstanding balance.
4. Create a quote.
5. Record a payment against a milestone.
6. Download the receipt PDF — confirm it shows `OneOhm`, `sanjay@oneohm.com`, the full Plot No.93 address, and **no** GSTIN or PAN.
7. Create a purchase order — confirm the PO number increments (this exercises the rewritten `ON CONFLICT` target).
8. Reload the project's Money tab and confirm the balance moved by the payment amount.

- [ ] **Step 6: Drop the scratch databases**

```bash
docker exec oneohm-postgres psql -U root -d postgres -c "DROP DATABASE IF EXISTS oneohm_orgtest;"
docker exec oneohm-postgres psql -U root -d postgres -c "DROP DATABASE IF EXISTS oneohm_seedtest;"
```

- [ ] **Step 7: Record what breaks and commit**

Append to the design doc's §12 the confirmed list of mobile call sites that will fail, so the follow-up repos have a checklist:

```bash
cd /Volumes/works-space/oneohm
grep -rn "?organizationId=\|&organizationId=" oneohm-mobile/src oneohm-consumer-mobo-app/src > oneohm/tmp/mobile-org-breakage.txt
wc -l oneohm/tmp/mobile-org-breakage.txt
```

Expected: 21 lines.

```bash
cd oneohm && git add -A && git commit -m "chore: verify organization removal end to end"
```

---

## Pre-Deploy Checklist

Not code — these gate the deploy itself, per design §10 and §11.

- [ ] A database snapshot has been taken **and restored once and row-counted**. A backup that has never been restored does not count.
- [ ] `org-cleanup-baseline.json` from production has been captured before the migration runs.
- [ ] Finance has been told that receipts now print `OneOhm` / `sanjay@oneohm.com` / the full address.
- [ ] Whoever supports the mobile apps knows they break on this deploy, and the follow-up cleanup is scheduled.
