# RBAC Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old 110-permission / 15-role system with 42 module+action permissions enforced on the frontend only, plus a superadmin role builder.

**Architecture:** A fixed permission catalog lives in TypeScript (`apps/web/lib/rbac/catalog.ts`) and is mirrored into the `permissions` table by one migration so the role builder has something to list. The backend loses all 163 permission decorators and keeps only a `super_admin` check on the 9 IAM write endpoints. The frontend gates four layers — routes, nav, tabs, buttons — and `permission` becomes a **required** field on nav and tab types so the compiler refuses incomplete work.

**Tech Stack:** Nx monorepo, NestJS + TypeORM (`apps/backend`), Next.js App Router + React + Zustand + TanStack Query (`apps/web`), PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-08-14-rbac-rework-design.md` — read it before starting. This plan argues from it.

**Branch:** `rbac-rework` (already created, spec already committed).

## Global Constraints

- **Write no new unit tests.** If an existing test breaks, fix it. Do not add test files. Verification is `npm run typecheck`, `npm run lint`, and the manual walkthrough in Task 19.
- **New permission codes use dots** (`quotes.view`). Old codes used colons (`quotes:read`). Never mix.
- **Role codes are unchanged:** `super_admin`, `admin`. Do not rename to `superadmin`. `platform_admin` is folded into `super_admin`.
- **Admin and superadmin hold zero rows in `role_permissions`.** They pass by bypass, never by grant.
- **Task 7 (the bypass) must land before Task 10 (route gating).** Reversing them locks the superadmin out of the app with no UI to recover.
- **`/admin` is gated by role, not by a permission code.** There are no `admin.*` permissions.
- **Migrations never import from app code.** The migration carries its own copy of the 42 codes. A migration is a snapshot of history; `catalog.ts` is live code that will change.
- **Always open to every logged-in user:** Dashboard, Profile, Help, and `/projects/my-tasks`. Never gate these.
- Run commands from the repo root `/Volumes/works-space/oneohm/oneohm`.
- Commit after every task. Use `feat:`, `refactor:`, `chore:` prefixes as appropriate.

---

## The 42 Permission Codes

This table is the single source for Task 1 and Task 2. `description` is user-facing — it is the sentence the access dialog shows.

| code | module | name | description |
|---|---|---|---|
| `customers.view` | customers | View Customers | See the customer list and customer details |
| `customers.create` | customers | Create Customers | Add a new customer |
| `customers.edit` | customers | Edit Customers | Change customer details |
| `customers.delete` | customers | Delete Customers | Remove a customer |
| `customers.assign` | customers | Assign Customers | Assign a customer to a team member |
| `properties.view` | properties | View Properties | See properties and site details |
| `properties.create` | properties | Create Properties | Add a new property |
| `properties.edit` | properties | Edit Properties | Change property details |
| `properties.delete` | properties | Delete Properties | Remove a property |
| `followups.view` | followups | View Follow-ups | See follow-ups |
| `followups.manage` | followups | Manage Follow-ups | Create, edit and complete follow-ups |
| `pipeline.view` | pipeline | View Pipeline | See the sales funnel |
| `quotes.view` | quotes | View Quotes | See quotations |
| `quotes.create` | quotes | Create Quotes | Create a new quotation |
| `quotes.edit` | quotes | Edit Quotes | Change a quotation |
| `quotes.delete` | quotes | Delete Quotes | Remove a quotation |
| `quotes.send` | quotes | Send Quotes | Send a quotation to the customer |
| `quotes.approve` | quotes | Approve Quotes | Accept or reject a quotation |
| `quotes.profitability` | quotes | View Profitability | See margins, costs and the full price breakdown |
| `projects.view` | projects | View Projects | See projects |
| `projects.create` | projects | Create Projects | Create a new project |
| `projects.edit` | projects | Edit Projects | Change project details |
| `projects.delete` | projects | Delete Projects | Remove a project |
| `projects.tasks.manage` | projects | Manage Project Tasks | Create, assign and update project tasks |
| `projects.team.manage` | projects | Manage Project Team | Add or remove project team members |
| `inventory.view` | inventory | View Inventory | See stock levels and inventory screens |
| `inventory.stock.manage` | inventory | Manage Stock | Adjust stock and record stock movements |
| `inventory.warehouses.manage` | inventory | Manage Warehouses | Create and change warehouses |
| `inventory.purchase_orders.view` | inventory | View Purchase Orders | See purchase orders |
| `inventory.purchase_orders.manage` | inventory | Manage Purchase Orders | Create and change purchase orders |
| `inventory.purchase_orders.approve` | inventory | Approve Purchase Orders | Approve or reject purchase orders |
| `inventory.vendors.manage` | inventory | Manage Vendors | Create and change vendors |
| `inventory.dispatches.manage` | inventory | Manage Dispatches | Create and update material dispatches |
| `inventory.allocations.manage` | inventory | Manage Allocations | Allocate stock to projects |
| `inventory.transactions.view` | inventory | View Transactions | See the stock transaction history |
| `finance.view` | finance | View Finance | See the finance section and the cash ledger |
| `finance.receivables.view` | finance | View Receivables | See customer receivables and outstanding amounts |
| `finance.payments.record` | finance | Record Payments | Record a customer payment |
| `finance.approvals.view` | finance | View Payment Approvals | See payment approval requests |
| `finance.approvals.process` | finance | Process Payment Approvals | Approve or reject payment requests |
| `service.view` | service | View Service | See service tickets |
| `service.manage` | service | Manage Service | Create and update service tickets |

---

## File Structure

**Created**

| Path | Responsibility |
|---|---|
| `apps/backend/src/database/migrations/1855000000000-ResetRbacCatalog.ts` | Wipe old catalog, slim `permissions`, insert 42 codes, fix system roles |
| `apps/backend/src/modules/iam/guards/super-admin.guard.ts` | The one surviving backend check |
| `apps/web/lib/rbac/catalog.ts` | The 42 codes + `PermissionCode` type. Source of truth |
| `apps/web/lib/rbac/route-map.ts` | URL pattern → permission code |
| `apps/web/lib/rbac/use-can.ts` | `useCan()` hook wrapping the store |
| `apps/web/lib/rbac/access-dialog.tsx` | Central dialog + provider + `useAccessDialog()` |
| `apps/web/lib/rbac/index.ts` | Barrel export |
| `apps/web/app/(dashboard)/denied/page.tsx` | Full-page deny screen for blocked URLs |

**Modified (major)**

| Path | Change |
|---|---|
| `apps/backend/src/modules/iam/controllers/*.ts` | Strip decorators; add `SuperAdminGuard`; trim permission writes |
| `apps/backend/src/database/seeds/platform-admin.seed.ts` | Rewritten — no blanket permission grant |
| `apps/web/lib/stores/auth-store.ts` | Add the admin bypass; drop the duplicate role array |
| `apps/web/middleware.ts` | Add the route permission check |
| `apps/web/lib/types/navigation.ts` | `permission` becomes required; delete `UserRole` |
| `apps/web/lib/config/navigation.ts` | Replace 8 `roles:` blocks with `permission:` |
| `apps/web/providers/auth-provider.tsx` | Real `refreshUser`; drop the duplicate role array |

**Deleted**

`apps/backend/src/modules/iam/guards/permission.guard.ts`, `.../guards/role.guard.ts`, `.../decorators/require-permission.decorator.ts`, `.../decorators/require-role.decorator.ts`, `apps/web/lib/constants/permissions.ts`.

---

## Task 1: Permission catalog in code

**Files:**
- Create: `apps/web/lib/rbac/catalog.ts`
- Create: `apps/web/lib/rbac/index.ts`

**Interfaces:**
- Produces: `PERMISSIONS` (readonly array of `PermissionMeta`), `type PermissionCode`, `type PermissionMeta`, `PERMISSION_BY_CODE` (a `Map<PermissionCode, PermissionMeta>`), `ALWAYS_OPEN` (the literal `'always-open'`), `SUPERADMIN_ONLY` (the literal `'superadmin-only'`), `type Gate = PermissionCode | typeof ALWAYS_OPEN | typeof SUPERADMIN_ONLY`.
- Every later frontend task consumes `PermissionCode` and `Gate`.

- [ ] **Step 1: Create the catalog file**

Transcribe all 42 rows from "The 42 Permission Codes" table above. Do not abbreviate, do not generate them from a loop — they are read by humans in code review.

```ts
// apps/web/lib/rbac/catalog.ts
export const ALWAYS_OPEN = 'always-open' as const;
export const SUPERADMIN_ONLY = 'superadmin-only' as const;

export interface PermissionMeta {
  readonly code: string;
  readonly module: string;
  readonly name: string;
  readonly description: string;
}

export const PERMISSIONS = [
  { code: 'customers.view',   module: 'customers', name: 'View Customers',   description: 'See the customer list and customer details' },
  { code: 'customers.create', module: 'customers', name: 'Create Customers', description: 'Add a new customer' },
  { code: 'customers.edit',   module: 'customers', name: 'Edit Customers',   description: 'Change customer details' },
  { code: 'customers.delete', module: 'customers', name: 'Delete Customers', description: 'Remove a customer' },
  { code: 'customers.assign', module: 'customers', name: 'Assign Customers', description: 'Assign a customer to a team member' },
  // ... all 42 rows, in the order of the table above
] as const satisfies readonly PermissionMeta[];

export type PermissionCode = (typeof PERMISSIONS)[number]['code'];
export type Gate = PermissionCode | typeof ALWAYS_OPEN | typeof SUPERADMIN_ONLY;

export const PERMISSION_BY_CODE = new Map<string, PermissionMeta>(
  PERMISSIONS.map((p) => [p.code, p]),
);
```

`as const satisfies` is load-bearing: `as const` narrows each `code` to a literal so `PermissionCode` is a union of 42 strings, and `satisfies` still checks the shape. Using `: readonly PermissionMeta[]` instead would widen `code` to `string` and every typo would compile.

- [ ] **Step 2: Create the barrel**

```ts
// apps/web/lib/rbac/index.ts
export * from './catalog';
```

- [ ] **Step 3: Verify the union resolved to 42 literals**

Add this line temporarily at the bottom of `catalog.ts`, run typecheck, then delete the line:

```ts
const _check: PermissionCode = 'customers.view';  // must compile
const _bad: PermissionCode = 'customers.veiw';    // must ERROR
```

Run: `npm run typecheck:web`
Expected: exactly one error, on the `_bad` line. If `_bad` compiles, the `as const` is missing or misplaced — fix before continuing.

- [ ] **Step 4: Remove the temporary check lines and re-run**

Run: `npm run typecheck:web`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/rbac/catalog.ts apps/web/lib/rbac/index.ts
git commit -m "feat(rbac): add the 42-code permission catalog"
```

---

## Task 2: Migration — reset the RBAC catalog

**Files:**
- Create: `apps/backend/src/database/migrations/1855000000000-ResetRbacCatalog.ts`

**Interfaces:**
- Consumes: nothing from Task 1 — the migration carries its own hardcoded copy of the 42 codes. Do **not** import `catalog.ts`.
- Produces: a `permissions` table holding exactly 42 rows with columns `id, code, name, description, module, is_active, created_at, updated_at`; `roles` rows for `admin` and `super_admin` with `is_system_role = true`; all other roles with `is_system_role = false`; an empty `role_permissions` table.

- [ ] **Step 1: Write the migration**

```ts
// apps/backend/src/database/migrations/1855000000000-ResetRbacCatalog.ts
import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Resets the RBAC catalog for the frontend-only permission model.
 *
 * ONE-WAY. down() restores the dropped columns and removes these 42 codes,
 * but it cannot restore the previous 110 codes or their grants — that data
 * is deleted permanently by up(). Do not rely on down() as a safety net.
 */
export class ResetRbacCatalog1855000000000 implements MigrationInterface {
  name = 'ResetRbacCatalog1855000000000';

  private readonly permissions: Array<{
    code: string; module: string; name: string; description: string;
  }> = [
    { code: 'customers.view', module: 'customers', name: 'View Customers', description: 'See the customer list and customer details' },
    // ... all 42 rows, transcribed from the plan's table
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1 + 2: wipe the old catalog and every grant.
    await queryRunner.query(`DELETE FROM role_permissions`);
    await queryRunner.query(`DELETE FROM permissions`);

    // 3: slim the table.
    for (const col of [
      'action', 'scope', 'conditions', 'permission_level',
      'show_in_menu', 'menu_label', 'depends_on_permission_ids',
      'is_system_permission',
    ]) {
      await queryRunner.query(`ALTER TABLE permissions DROP COLUMN IF EXISTS "${col}"`);
    }
    await queryRunner.query(
      `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS module VARCHAR(50) NOT NULL DEFAULT ''`,
    );

    // 4: insert the 42.
    for (const p of this.permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (id, code, name, description, module, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())`,
        [p.code, p.name, p.description, p.module],
      );
    }

    // 5: fold platform_admin into super_admin, then guarantee the two system roles.
    await queryRunner.query(
      `UPDATE user_roles SET role_id = (SELECT id FROM roles WHERE code = 'super_admin' LIMIT 1)
       WHERE role_id IN (SELECT id FROM roles WHERE code = 'platform_admin')
         AND EXISTS (SELECT 1 FROM roles WHERE code = 'super_admin')`,
    );
    await queryRunner.query(`DELETE FROM roles WHERE code = 'platform_admin'`);

    for (const r of [
      { code: 'super_admin', name: 'Superadmin', description: 'Full access, including the admin panel' },
      { code: 'admin',       name: 'Admin',      description: 'Full access except the admin panel' },
    ]) {
      await queryRunner.query(
        `INSERT INTO roles (id, code, name, description, is_system_role, level, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, true, 0, NOW(), NOW())
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           is_system_role = true,
           updated_at = NOW()`,
        [r.code, r.name, r.description],
      );
    }

    // 6: every other role becomes an ordinary editable shell.
    await queryRunner.query(
      `UPDATE roles SET is_system_role = false WHERE code NOT IN ('super_admin', 'admin')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM role_permissions`);
    await queryRunner.query(`DELETE FROM permissions`);
    await queryRunner.query(`ALTER TABLE permissions DROP COLUMN IF EXISTS module`);
    await queryRunner.query(`ALTER TABLE permissions ADD COLUMN IF NOT EXISTS action VARCHAR(50) NOT NULL DEFAULT 'read'`);
    await queryRunner.query(`ALTER TABLE permissions ADD COLUMN IF NOT EXISTS scope VARCHAR(50) NOT NULL DEFAULT 'all'`);
    await queryRunner.query(`ALTER TABLE permissions ADD COLUMN IF NOT EXISTS conditions JSONB`);
    await queryRunner.query(`ALTER TABLE permissions ADD COLUMN IF NOT EXISTS permission_level VARCHAR(50) NOT NULL DEFAULT 'standard'`);
    await queryRunner.query(`ALTER TABLE permissions ADD COLUMN IF NOT EXISTS show_in_menu BOOLEAN NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE permissions ADD COLUMN IF NOT EXISTS menu_label VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE permissions ADD COLUMN IF NOT EXISTS depends_on_permission_ids UUID[]`);
    await queryRunner.query(`ALTER TABLE permissions ADD COLUMN IF NOT EXISTS is_system_permission BOOLEAN NOT NULL DEFAULT true`);
  }
}
```

- [ ] **Step 2: Update the `PermissionEntity` to match the new table**

Modify `apps/backend/src/modules/iam/entities/permission.entity.ts`. Delete the `@Column` blocks for `action`, `scope`, `conditionsData`, `permissionLevel`, `showInMenu`, `menuLabel`, `dependsOnPermissionIds`, `isSystemPermission`, and the `@Index(['action'])` / `@Index(['scope'])` decorators. Add:

```ts
  @Column({ type: 'varchar', length: 50 })
  module!: string;
```

Leaving stale columns on the entity makes TypeORM select columns the database no longer has, and every permission query throws.

- [ ] **Step 3: Run the migration**

Run: `npm run migration:run` (check `package.json` for the exact script name if this fails)
Expected: migration applies with no error.

- [ ] **Step 4: Verify the data by hand**

```sql
SELECT COUNT(*) FROM permissions;                          -- expect 42
SELECT COUNT(*) FROM role_permissions;                     -- expect 0
SELECT code, is_system_role FROM roles ORDER BY code;      -- only super_admin + admin are true
SELECT COUNT(*) FROM roles WHERE code = 'platform_admin';  -- expect 0
SELECT module, COUNT(*) FROM permissions GROUP BY module ORDER BY module;
-- customers 5, followups 2, finance 5, inventory 10, pipeline 1,
-- projects 6, properties 4, quotes 7, service 2
```

- [ ] **Step 5: Verify the backend still boots**

Run: `npm run backend:dev`
Expected: starts with no TypeORM column errors. Stop it again.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/database/migrations/1855000000000-ResetRbacCatalog.ts apps/backend/src/modules/iam/entities/permission.entity.ts
git commit -m "feat(rbac): reset permission catalog to 42 codes"
```

---

## Task 3: Rewrite the platform-admin seed

**Files:**
- Modify: `apps/backend/src/database/seeds/platform-admin.seed.ts`

**Interfaces:**
- Consumes: the `super_admin` role row created by Task 2.
- Produces: a seeded superadmin **user** with the `super_admin` role and **zero** `role_permissions` rows.

- [ ] **Step 1: Read the current file end to end**

Run: `cat apps/backend/src/database/seeds/platform-admin.seed.ts`

Note the three things that must change: it creates a role with code `platform_admin` (line ~55), it assigns **every permission in the table** to that role (lines ~65-102), and it writes `role: platformAdminRole.code` into the legacy `user_roles.role` string column (line ~167).

- [ ] **Step 2: Rewrite it**

- Look up the existing `super_admin` role by code instead of creating `platform_admin`. If it is missing, throw with a clear message telling the operator to run migrations first — do not create it here, Task 2 owns that.
- **Delete the entire permission-assignment block.** Superadmin passes by bypass; granting it 42 rows would contradict the design and would silently miss code #43.
- Keep the user creation and the `user_roles` link. Keep writing `super_admin` into the legacy `role` string column — it is still `NOT NULL` in some environments.
- Update every log line that says `platform_admin` to say `super_admin`.

- [ ] **Step 3: Verify**

Run: `npm run typecheck:backend`
Expected: clean.

Then run the seed and check:

```sql
SELECT COUNT(*) FROM role_permissions;   -- must still be 0
SELECT u.email, r.code FROM users u
  JOIN user_roles ur ON ur.user_id = u.id
  JOIN roles r ON r.id = ur.role_id;     -- the seeded user has super_admin
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/database/seeds/platform-admin.seed.ts
git commit -m "refactor(rbac): seed super_admin without blanket permission grant"
```

---

## Task 4: Delete backend enforcement

**Files:**
- Delete: `apps/backend/src/modules/iam/guards/permission.guard.ts`
- Delete: `apps/backend/src/modules/iam/guards/role.guard.ts`
- Delete: `apps/backend/src/modules/iam/decorators/require-permission.decorator.ts`
- Delete: `apps/backend/src/modules/iam/decorators/require-role.decorator.ts`
- Modify: 19 controllers (list below), plus `iam.module.ts`, `inventory.module.ts`, `bom.module.ts`, `notifications.module.ts`, `saved-views.module.ts`

**Interfaces:**
- Produces: every endpoint outside IAM protected by `JwtAuthGuard` alone.

**Controllers and their decorator counts** — work top to bottom so the biggest ones are done while you are freshest:

| Count | File |
|---|---|
| 19 | `modules/inventory/controllers/purchase-order.controller.ts` |
| 15 | `modules/inventory/controllers/material-dispatch.controller.ts` |
| 13 | `modules/inventory/controllers/inventory-stock.controller.ts` |
| 12 | `modules/inventory/controllers/stock-allocation.controller.ts` |
| 10 | `modules/customers/controllers/customer.controller.ts` |
| 9 | `modules/inventory/controllers/project-vendor.controller.ts` |
| 8 | `modules/inventory/controllers/vendor.controller.ts` |
| 8 | `modules/iam/controllers/role.controller.ts` |
| 7 | `modules/inventory/controllers/warehouse.controller.ts` |
| 7 | `modules/inventory/controllers/inventory-export.controller.ts` |
| 6 | `modules/inventory/controllers/inventory-transaction.controller.ts` |
| 5 | `modules/saved-views/controllers/saved-view.controller.ts` |
| 5 | `modules/inventory/controllers/return-request.controller.ts` |
| 5 | `modules/iam/controllers/user-role.controller.ts` |
| 5 | `modules/iam/controllers/permission.controller.ts` |
| 4 | `modules/notifications/controllers/notification.controller.ts` |
| 3 | `modules/bom/controllers/bom.controller.ts` |
| 3 | `modules/bom/controllers/bom-items.controller.ts` |
| 1 | `modules/inventory/controllers/inventory-search.controller.ts` |

All paths are relative to `apps/backend/src/`.

- [ ] **Step 1: Strip the decorators**

In each file above: delete every `@RequirePermission(...)` and `@RequireRoles(...)` line, delete `PermissionGuard` / `RolesGuard` from any `@UseGuards(...)` list (keep `JwtAuthGuard`), and delete the now-unused imports.

If `@UseGuards(JwtAuthGuard, PermissionGuard)` becomes `@UseGuards(JwtAuthGuard)`, keep it — do not remove auth.

- [ ] **Step 2: Remove guard registrations from the modules**

In `iam.module.ts`, `inventory.module.ts`, `bom.module.ts`, `notifications.module.ts` and `saved-views.module.ts`, remove `PermissionGuard` and `RolesGuard` from `providers` and any `exports`.

- [ ] **Step 3: Delete the four files**

```bash
git rm apps/backend/src/modules/iam/guards/permission.guard.ts \
       apps/backend/src/modules/iam/guards/role.guard.ts \
       apps/backend/src/modules/iam/decorators/require-permission.decorator.ts \
       apps/backend/src/modules/iam/decorators/require-role.decorator.ts
```

Also fix `apps/backend/src/modules/iam/index.ts` and any `guards/index.ts` / `decorators/index.ts` barrels that re-export them.

- [ ] **Step 4: Confirm nothing references them**

Run: `rg "RequirePermission|RequireRoles|PermissionGuard|RolesGuard" apps/backend/src`
Expected: **no output.** Any hit is a missed reference — fix it.

- [ ] **Step 5: Confirm the two business-rule users are untouched**

Run: `rg -n "hasAdminBypassRole" apps/backend/src`
Expected: exactly two call sites remain — `modules/projects/guards/project-team.guard.ts` and `modules/inventory/services/low-stock-alert.service.ts`. These are business rules, not RBAC. If you deleted either, restore it.

- [ ] **Step 6: Verify**

Run: `npm run typecheck:backend && npm run backend:lint`
Expected: clean.

Run: `npm run backend:dev`
Expected: boots. Stop it again.

- [ ] **Step 7: Commit**

```bash
git add -A apps/backend/src
git commit -m "refactor(rbac): remove all backend permission enforcement"
```

---

## Task 5: The one surviving backend guard

**Files:**
- Create: `apps/backend/src/modules/iam/guards/super-admin.guard.ts`
- Modify: `apps/backend/src/modules/iam/controllers/role.controller.ts`
- Modify: `apps/backend/src/modules/iam/controllers/user-role.controller.ts`
- Modify: `apps/backend/src/modules/iam/controllers/permission.controller.ts`
- Modify: `apps/backend/src/modules/iam/services/iam.service.ts`
- Modify: `apps/backend/src/modules/iam/iam.module.ts`

**Interfaces:**
- Consumes: `request.user.roles` populated by `JwtStrategy`.
- Produces: `SuperAdminGuard`, exported from `modules/iam/guards/index.ts`.

- [ ] **Step 1: Write the guard**

```ts
// apps/backend/src/modules/iam/guards/super-admin.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * The only role check left in the backend.
 *
 * Permission enforcement is frontend-only for now, but the endpoints that
 * hand out roles are different in kind: without this, any logged-in user
 * could assign themselves super_admin and the escalation would be permanent
 * and invisible. Guards the 9 IAM write endpoints only.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: { roles?: string[] } }>();
    const roles = request.user?.roles ?? [];

    if (!roles.includes('super_admin')) {
      throw new ForbiddenException('Only a superadmin can change roles or role assignments.');
    }
    return true;
  }
}
```

- [ ] **Step 2: Apply it to the 9 write endpoints**

`role.controller.ts` — 6 endpoints: `@Post()`, `@Patch(':id')`, `@Delete(':id')`, `@Post(':id/permissions/sync')`, `@Post(':id/permissions/add')`, `@Delete(':id/permissions')`.

`user-role.controller.ts` — 3 endpoints: `@Post()`, `@Post('bulk')`, `@Delete(':id')`.

Add `@UseGuards(SuperAdminGuard)` to each of those 9 methods. Leave every `@Get` open.

- [ ] **Step 3: Remove the permission write endpoints**

In `permission.controller.ts`, delete the `@Post()`, `@Patch(':id')` and `@Delete(':id')` handlers and their DTO imports. Keep `@Get()` and `@Get(':id')`. Then delete the now-unused DTOs:

```bash
git rm apps/backend/src/modules/iam/dto/permissions/create-permission.dto.ts \
       apps/backend/src/modules/iam/dto/permissions/update-permission.dto.ts
```

Remove the matching service methods in `iam.service.ts` and any barrel exports referencing them.

- [ ] **Step 4: Refuse edits to the two system roles**

In `iam.service.ts`, in the update and delete role methods, add a check before the write:

```ts
const PROTECTED_ROLE_CODES = ['super_admin', 'admin'];

if (PROTECTED_ROLE_CODES.includes(role.code)) {
  throw new ForbiddenException(`The "${role.code}" role cannot be changed or deleted.`);
}
```

Hiding the buttons in the UI is not enough — the API is open to anyone with dev tools.

- [ ] **Step 5: Register the guard**

Add `SuperAdminGuard` to `providers` in `iam.module.ts` and export it from `modules/iam/guards/index.ts`.

- [ ] **Step 6: Verify by hand**

Start the backend. Log in as a non-superadmin and call:

```bash
curl -i -X POST http://localhost:3000/api/iam/roles \
  -H "Authorization: Bearer <non-superadmin token>" \
  -H "Content-Type: application/json" \
  -d '{"code":"hack","name":"Hack"}'
```

Expected: `403 Forbidden`. Repeat with a superadmin token: expect `201`.

Then confirm a read is still open: `GET /api/iam/permissions` with the non-superadmin token returns `200` and 42 rows.

- [ ] **Step 7: Commit**

```bash
git add -A apps/backend/src/modules/iam
git commit -m "feat(rbac): guard the 9 IAM write endpoints with SuperAdminGuard"
```

---

## Task 6: Frontend permission plumbing

**Files:**
- Modify: `apps/backend/src/modules/users/dto/user-response.dto.ts` (add `permissions`)
- Modify: `apps/backend/src/modules/auth/controllers/auth.controller.ts:131` (the `getCurrentUser` handler)
- Modify: `apps/web/lib/stores/auth-store.ts`
- Modify: `apps/web/providers/auth-provider.tsx:328` (the `refreshUser` callback)
- Create: `apps/web/lib/rbac/use-can.ts`

**Interfaces:**
- Consumes: `PermissionCode`, `Gate`, `ALWAYS_OPEN`, `SUPERADMIN_ONLY` from Task 1.
- Produces: `useCan(): { can(gate: Gate): boolean; isSuperAdmin: boolean }`, and a store whose `hasPermission` honours the admin bypass.

- [ ] **Step 1: Add the bypass to the store**

In `apps/web/lib/stores/auth-store.ts`, replace the `hasPermission` implementation:

```ts
export const FULL_ACCESS_ROLES = ['super_admin', 'admin'] as const;

// ... inside the store:
hasPermission: (code: string): boolean => {
  const user = get().user;
  if (!user) return false;
  const roles = user.roles ?? [];
  if (FULL_ACCESS_ROLES.some((r) => roles.includes(r))) return true;
  return (user.permissions ?? []).includes(code);
},
```

Apply the same bypass to `hasAnyPermission` and `hasAllPermissions` — a superadmin must pass those too.

Delete the local `ADMIN_BYPASS_ROLES` array on line 29; `FULL_ACCESS_ROLES` replaces it and is the only place these two names appear in the web app outside `middleware.ts`.

`platform_admin` is intentionally absent — Task 2 deleted that role.

- [ ] **Step 2: Write the hook**

```ts
// apps/web/lib/rbac/use-can.ts
'use client';

import { ALWAYS_OPEN, SUPERADMIN_ONLY, type Gate } from './catalog';

import { useAuthStore } from '@/lib/stores/auth-store';

export function useCan(): { can: (gate: Gate) => boolean; isSuperAdmin: boolean } {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const isSuperAdmin = (user?.roles ?? []).includes('super_admin');

  const can = (gate: Gate): boolean => {
    if (gate === ALWAYS_OPEN) return true;
    if (gate === SUPERADMIN_ONLY) return isSuperAdmin;
    return hasPermission(gate);
  };

  return { can, isSuperAdmin };
}
```

`SUPERADMIN_ONLY` deliberately does **not** accept `admin` — that is the whole point of the `/admin` rule.

- [ ] **Step 3: Fix `GET /auth/me` FIRST — it does not return permissions**

⚠️ **Do not skip this or reorder it.** `GET /auth/me` (`auth.controller.ts:131`) calls `userService.findById()`, which calls `findByIdWithRoles()` — roles only. And `UserResponseDto` (`apps/backend/src/modules/users/dto/user-response.dto.ts`) exposes `roles!: string[]` at line 42 but has **no `permissions` field at all**.

If you wire `refreshUser` to this endpoint as it stands, every non-admin user's permission list is overwritten with `undefined` on page load and they lose access to everything. Admin and superadmin would look fine, because they bypass — so this bug hides from exactly the accounts you test with.

Add the field to the DTO, next to `roles`:

```ts
  @Expose()
  @ApiProperty({ type: [String], description: 'Flattened permission codes from all roles' })
  permissions!: string[];
```

Then populate it in the handler:

```ts
  async getCurrentUser(@CurrentUser() user: CurrentUserType): Promise<UserResponseDto> {
    const fullUser = await this.userService.findById(user.id);
    const permissions = await this.iamService.getUserPermissions(user.id);

    return plainToInstance(
      UserResponseDto,
      { ...fullUser, permissions },
      { excludeExtraneousValues: true },
    );
  }
```

Inject `IamService` into `AuthController`. `AuthService` already depends on it, so the module wiring exists — check `auth.module.ts` imports `IamModule` and add it if not.

- [ ] **Step 4: Verify the endpoint returns permissions**

Run the backend, log in as a **non-admin** user, then:

```bash
curl -s http://localhost:3000/api/auth/me -H "Authorization: Bearer <token>" | jq '{roles, permissions}'
```

Expected: `permissions` is an array of dot-style codes, not `null` and not missing. For a superadmin it will be `[]` — that is correct, they bypass.

- [ ] **Step 5: Make `refreshUser` actually refetch**

`apps/web/providers/auth-provider.tsx:328` currently returns the cached user. Replace it with a real `GET /auth/me` call, passing the response through the `transformAuthUser` helper already in that file, then `setUser(...)`.

Then call `refreshUser()` once on mount, after `isInitialized` becomes true, so a permission change lands on the next page load.

Guard against a loop: `refreshUser` must not sit in its own effect's dependency array in a way that re-fires on every store write. Use a ref, the same pattern `initializingRef` already uses in that file.

- [ ] **Step 6: Export the hook**

Add `export * from './use-can';` to `apps/web/lib/rbac/index.ts`.

- [ ] **Step 7: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean. Use the full workspace targets here, not just `:web` — this task changed the backend too.

Manual, with **two** accounts, because the bypass hides bugs:

1. As the seeded **superadmin**: browser console, `JSON.parse(localStorage.getItem('auth-store')).state.user.permissions` → expect `[]`, and the app still renders everything. That proves the bypass works.
2. As a **non-admin** test user holding any role: the same command must return a **non-empty array** after a page reload. If it returns `[]` or `undefined`, Step 3 was not applied correctly — stop and fix it before Task 7.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/modules/users/dto/user-response.dto.ts apps/backend/src/modules/auth apps/web/lib/stores/auth-store.ts apps/web/providers/auth-provider.tsx apps/web/lib/rbac
git commit -m "feat(rbac): admin bypass, permissions on /auth/me, real refreshUser"
```

---

## Task 7: Delete the old frontend role code

**Files:**
- Modify: `apps/web/lib/types/navigation.ts` (delete `UserRole` at lines 17-28, `NAV_ADMIN_BYPASS_ROLES` at line 175, rewrite `hasAccess` / `filterByAccess` / `filterByRole`)
- Modify: `apps/web/providers/auth-provider.tsx:422`
- Modify: `apps/web/components/layout/user-menu.tsx:28-29`
- Modify: `apps/web/components/shared/guards/permission-guard.tsx`
- Delete: `apps/web/lib/constants/permissions.ts`
- Modify: the 5 files importing the old `PERMISSIONS` const (list below)

**Interfaces:**
- Consumes: `FULL_ACCESS_ROLES` from Task 6, `PermissionCode` from Task 1.
- Produces: a codebase where `super_admin` and `admin` appear only in `auth-store.ts` and `middleware.ts`.

The 5 old-`PERMISSIONS` importers:

```
apps/web/lib/hooks/resources/lookups.ts
apps/web/components/features/quotes/hooks/use-quote-permissions.ts
apps/web/components/features/quotes/components/quote-detail/tabs/quote-overview-tab.tsx
apps/web/components/features/quotes/components/quote-preview-panel.tsx
apps/web/components/features/quotes/components/quote-detail/tabs/overview/quote-sidebar.tsx
```

- [ ] **Step 1: Delete `UserRole` and the duplicate arrays**

In `apps/web/lib/types/navigation.ts`: delete the `UserRole` union (11 role names, lines 17-28) and `NAV_ADMIN_BYPASS_ROLES` (line 175). Rewrite `hasAccess` to take only a gate, with no role branch:

```ts
export function hasAccess(item: { permission: Gate }, can: (gate: Gate) => boolean): boolean {
  return can(item.permission);
}
```

Delete `filterByRole` outright — nothing should filter by role name any more. Update `filterByAccess` to the new signature. Fix every call site the compiler flags.

- [ ] **Step 2: Fix the third duplicate**

`apps/web/providers/auth-provider.tsx:422` — replace `hasAnyRole(['admin','super_admin','platform_admin'])` with a call using `FULL_ACCESS_ROLES` from the store.

- [ ] **Step 3: Fix the role labels**

`apps/web/components/layout/user-menu.tsx:28-29` hardcodes a role-name → display-name map. Replace it with the role's `name` from the user object. If the user has several roles, show the first, or `"N roles"` when there is more than one — do not resurrect a hardcoded list, because superadmin can now invent role names at runtime.

- [ ] **Step 4: Drop the `role` prop from `PermissionGuard`**

In `apps/web/components/shared/guards/permission-guard.tsx`, delete the `role` prop, the `hasRole` call and the role branch of `PermissionCheck`. Type `permission` as `Gate`. Fix the one call site in `apps/web/components/features/admin/discom/components/admin-discom-list-page.tsx`.

- [ ] **Step 5: Delete the old catalog and repoint its 5 importers**

```bash
git rm apps/web/lib/constants/permissions.ts
```

In each of the 5 files, replace old colon codes with new dot codes:

| Old | New |
|---|---|
| `quotes:read` | `quotes.view` |
| `quotes:create` | `quotes.create` |
| `quotes:update` | `quotes.edit` |
| `quotes:delete` | `quotes.delete` |
| `quotes:view_price_breakdown` | `quotes.profitability` |
| `lookups:read` / `lookups:*` | delete the check — lookups live under `/admin`, which is `SUPERADMIN_ONLY` |

Import from `@/lib/rbac` instead of `@/lib/constants/permissions`.

- [ ] **Step 6: Prove the cleanup is complete**

Run:

```bash
rg -n "UserRole|platform_admin|NAV_ADMIN_BYPASS_ROLES|lib/constants/permissions" apps/web
```

Expected: **no output.**

Run:

```bash
rg -ln "'super_admin'|'admin'" apps/web --glob '*.ts*'
```

Expected: only `apps/web/lib/stores/auth-store.ts`. `middleware.ts` joins it in Task 9.

- [ ] **Step 7: Verify**

Run: `npm run typecheck:web && npm run web:lint`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add -A apps/web
git commit -m "refactor(rbac): delete old role plumbing from the web app"
```

---

## Task 8: The access dialog

**Files:**
- Create: `apps/web/lib/rbac/access-dialog.tsx`
- Create: `apps/web/app/(dashboard)/denied/page.tsx`
- Modify: `apps/web/app/(dashboard)/layout.tsx` (mount the provider)

**Interfaces:**
- Consumes: `PERMISSION_BY_CODE`, `PermissionCode` from Task 1.
- Produces: `<AccessDialogProvider>`, `useAccessDialog(): { requestAccess(code: PermissionCode, subject?: string): void }`, and `<AccessDeniedContent code={...} subject={...} />` shared by the dialog and the full page.

- [ ] **Step 1: Build the shared content block**

One component renders the body for both the dialog and the full page, so the wording can never drift apart:

```tsx
export function AccessDeniedContent({
  code, subject,
}: { code: PermissionCode; subject?: string }): React.JSX.Element {
  const meta = PERMISSION_BY_CODE.get(code);
  return (
    <div className="text-center max-w-md">
      <Lock className="size-icon-xl text-warning mx-auto mb-4" />
      <h2 className="text-xl font-semibold mb-1">{subject ?? meta?.name ?? 'Access needed'}</h2>
      <p className="text-foreground-secondary text-sm mb-4">You do not have access to this.</p>

      <div className="rounded-md border border-border bg-background-secondary p-3 text-left mb-4">
        <p className="text-xs uppercase text-foreground-secondary mb-1">Permission needed</p>
        <code className="text-sm font-medium">{code}</code>
        {meta?.description && (
          <p className="text-sm text-foreground-secondary mt-1">{meta.description}</p>
        )}
      </div>

      <p className="text-sm text-foreground-secondary">
        Only a superadmin can grant this. Ask them to add it to one of your roles.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Build the provider and hook**

`AccessDialogProvider` holds `{ code, subject } | null` in state, renders the app's existing modal/dialog primitive around `<AccessDeniedContent>` with a single **Got it** button, and exposes `requestAccess(code, subject)` through context. Use the dialog component the app already has — check `apps/web/components/ui/` first rather than adding a new one.

- [ ] **Step 3: Build the full-page version**

```tsx
// apps/web/app/(dashboard)/denied/page.tsx — reads ?perm= and ?from=
```

Read `perm` from `useSearchParams()`, validate it against `PERMISSION_BY_CODE`, and render `<AccessDeniedContent>` centred in the viewport. If `perm` is missing or unknown, show a generic "You do not have access to this page" rather than crashing — the query string is user-editable.

Wrap the `useSearchParams()` usage in `<Suspense>`; Next.js App Router requires it and the build fails otherwise.

- [ ] **Step 4: Mount the provider**

Wrap the contents of `DashboardLayoutContent` in `apps/web/app/(dashboard)/layout.tsx` with `<AccessDialogProvider>`, inside `AuthGuard` so the user is known.

- [ ] **Step 5: Verify**

Run: `npm run typecheck:web && npm run web:build`
Expected: clean. The build step matters here — the `useSearchParams()` Suspense rule only fails at build time.

Manual: visit `/denied?perm=finance.view` and confirm the code, its description, and the superadmin line all render.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/rbac/access-dialog.tsx "apps/web/app/(dashboard)/denied" "apps/web/app/(dashboard)/layout.tsx"
git commit -m "feat(rbac): central access-denied dialog and page"
```

---

## Task 9: Route gating

**Files:**
- Create: `apps/web/lib/rbac/route-map.ts`
- Modify: `apps/web/middleware.ts`
- Modify: `apps/web/app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `Gate`, `ALWAYS_OPEN`, `SUPERADMIN_ONLY` from Task 1; `useCan` from Task 6; `AccessDeniedContent` from Task 8.
- Produces: `ROUTE_GATES: ReadonlyArray<{ pattern: RegExp; gate: Gate }>` and `gateForPath(pathname: string): Gate`.

- [ ] **Step 1: Write the route map**

Order matters — the **first** match wins, so specific patterns must come before general ones. `/admin` must precede everything, and `/projects/my-tasks` must precede `/projects`.

```ts
// apps/web/lib/rbac/route-map.ts
import { ALWAYS_OPEN, SUPERADMIN_ONLY, type Gate } from './catalog';

export const ROUTE_GATES: ReadonlyArray<{ pattern: RegExp; gate: Gate }> = [
  { pattern: /^\/admin(\/|$)/,               gate: SUPERADMIN_ONLY },

  { pattern: /^\/$/,                         gate: ALWAYS_OPEN },
  { pattern: /^\/profile(\/|$)/,             gate: ALWAYS_OPEN },
  { pattern: /^\/help(\/|$)/,                gate: ALWAYS_OPEN },
  { pattern: /^\/denied(\/|$)/,              gate: ALWAYS_OPEN },
  { pattern: /^\/projects\/my-tasks(\/|$)/,  gate: ALWAYS_OPEN },

  { pattern: /^\/customers(\/|$)/,           gate: 'customers.view' },
  { pattern: /^\/properties(\/|$)/,          gate: 'properties.view' },
  { pattern: /^\/onboarding(\/|$)/,          gate: 'properties.create' },
  { pattern: /^\/followups(\/|$)/,           gate: 'followups.view' },
  { pattern: /^\/pipeline(\/|$)/,            gate: 'pipeline.view' },
  { pattern: /^\/crm(\/|$)/,                 gate: 'customers.view' },

  { pattern: /^\/quotes\/new(\/|$)/,         gate: 'quotes.create' },
  { pattern: /^\/quotes(\/|$)/,              gate: 'quotes.view' },

  { pattern: /^\/projects\/new(\/|$)/,       gate: 'projects.create' },
  { pattern: /^\/projects(\/|$)/,            gate: 'projects.view' },

  { pattern: /^\/inventory\/purchase-orders(\/|$)/, gate: 'inventory.purchase_orders.view' },
  { pattern: /^\/inventory\/transactions(\/|$)/,    gate: 'inventory.transactions.view' },
  { pattern: /^\/inventory(\/|$)/,           gate: 'inventory.view' },
  { pattern: /^\/vendors(\/|$)/,             gate: 'inventory.view' },

  { pattern: /^\/finance\/receivables(\/|$)/, gate: 'finance.receivables.view' },
  { pattern: /^\/finance\/approvals(\/|$)/,   gate: 'finance.approvals.view' },
  { pattern: /^\/finance(\/|$)/,              gate: 'finance.view' },

  { pattern: /^\/service(\/|$)/,             gate: 'service.view' },
  { pattern: /^\/dev(\/|$)/,                 gate: SUPERADMIN_ONLY },
];

export function gateForPath(pathname: string): Gate {
  return ROUTE_GATES.find((r) => r.pattern.test(pathname))?.gate ?? ALWAYS_OPEN;
}
```

The `?? ALWAYS_OPEN` default is deliberate: an unmapped route should not silently lock people out of a page nobody remembered to map. Task 19 catches gaps by walking the app.

- [ ] **Step 2: Add the check to middleware**

In `apps/web/middleware.ts`, after the existing auth checks and before the final `NextResponse.next()`:

```ts
import { gateForPath } from '@/lib/rbac/route-map';
import { ALWAYS_OPEN, SUPERADMIN_ONLY } from '@/lib/rbac/catalog';

// ... inside middleware(), once we know there is an accessToken:
const gate = gateForPath(pathname);

if (gate !== ALWAYS_OPEN && accessToken) {
  const claims = decodeJwtPayload(accessToken);           // base64 decode only, no verify
  const roles = claims?.roles ?? [];
  const perms = claims?.permissions ?? [];

  const allowed =
    roles.includes('super_admin') ||
    (gate !== SUPERADMIN_ONLY && roles.includes('admin')) ||
    (gate !== SUPERADMIN_ONLY && perms.includes(gate));

  if (!allowed) {
    const url = new URL('/denied', request.url);
    if (gate !== SUPERADMIN_ONLY) url.searchParams.set('perm', gate);
    url.searchParams.set('from', pathname);
    return NextResponse.rewrite(url);
  }
}
```

Write `decodeJwtPayload` inline in `middleware.ts` — split on `.`, base64url-decode the second segment, `JSON.parse`, and return `null` inside a `try/catch`. **Do not verify the signature** and do not add a JWT library: middleware runs on the edge runtime, and verification would need the signing secret in the web app for no real gain while the API is open.

Note the `admin` clause: admin passes every permission gate but is refused `SUPERADMIN_ONLY`. That is the `/admin` rule.

- [ ] **Step 3: Add the client-side net**

In `apps/web/app/(dashboard)/layout.tsx`, inside the provider and around `<PageTransitionGuard>{children}</PageTransitionGuard>`, add a small component that reads `usePathname()`, calls `gateForPath`, and on failure renders `<AccessDeniedContent>` **instead of** `children`. Rendering the deny screen in place of the children is what stops the page mounting and firing its data hooks.

- [ ] **Step 4: Verify**

Run: `npm run typecheck:web && npm run web:build`
Expected: clean.

Manual, logged in as superadmin: every route loads. Then, in the browser console, temporarily blank the roles in the persisted store and reload `/finance` — expect the deny page and **no** `/api/finance` request in the Network tab.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/rbac/route-map.ts apps/web/middleware.ts "apps/web/app/(dashboard)/layout.tsx"
git commit -m "feat(rbac): gate routes in middleware and dashboard layout"
```

---

## Task 10: Navigation gating

**Files:**
- Modify: `apps/web/lib/types/navigation.ts` (make `permission` required)
- Modify: `apps/web/lib/config/navigation.ts` (every item; remove all 8 `roles:` blocks)
- Modify: `apps/web/lib/hooks/use-filtered-navigation.ts`
- Modify: `apps/web/components/layout/rail.tsx` and `apps/web/components/layout/panel.tsx` (grey instead of hide)

**Interfaces:**
- Consumes: `Gate` from Task 1, `useCan` from Task 6, `useAccessDialog` from Task 8.
- Produces: nav items that render greyed and open the dialog on click.

- [ ] **Step 1: Make `permission` required**

In `apps/web/lib/types/navigation.ts`:

```ts
export interface NavItem {
  id: string;
  label: string;
  href: string;
  permission: Gate;          // required — no `?`
  icon?: LucideIcon;
  // ... the rest unchanged
}
```

Add the same required `permission: Gate` to `NavSection`. `RailNavItem` inherits it from `NavItem`.

- [ ] **Step 2: Run typecheck to get your worklist**

Run: `npm run typecheck:web`
Expected: **one error per nav item missing a permission.** That error list *is* the checklist — this is why the field is required. Work through it until the count reaches zero.

- [ ] **Step 3: Fill in every gate**

Delete all 8 `roles: [...]` blocks in `apps/web/lib/config/navigation.ts` (lines 83, 126, 440, 464, 476, 500, 524, 536) and set `permission:` on every item.

**Rail top**

| id | gate |
|---|---|
| `home` | `ALWAYS_OPEN` |
| `crm` | `customers.view` |
| `quotes` | `quotes.view` |
| `projects` | `projects.view` |
| `inventory` | `inventory.view` |
| `finance` | `finance.view` |
| `service` | `service.view` |

**Rail bottom:** `help` → `ALWAYS_OPEN`, `admin` → `SUPERADMIN_ONLY`.

**Panels**

| panel | item ids | gate |
|---|---|---|
| dashboard | `dashboard`, `tasks`, `calendar`, `overview`, `activity` | `ALWAYS_OPEN` |
| crm | `customers` | `customers.view` |
| crm | `followups` | `followups.view` |
| crm | `pipeline` | `pipeline.view` |
| quotes | `quotes-dashboard`, `all-quotes`, and its children `drafts`, `sent`, `accepted` | `quotes.view` |
| quotes | `quote-builder` | `quotes.create` |
| projects | `projects-dashboard`, `all-projects` | `projects.view` |
| projects | `projects-my-tasks` | `ALWAYS_OPEN` |
| inventory | `inventory-dashboard`, `all-inventory`, `low-stock`, `warehouses`, `vendors`, `allocations`, `dispatches` | `inventory.view` |
| inventory | `purchase-orders` | `inventory.purchase_orders.view` |
| inventory | `transactions` | `inventory.transactions.view` |
| finance | `finance-cash` | `finance.view` |
| finance | `finance-receivables` | `finance.receivables.view` |
| finance | `finance-approvals` | `finance.approvals.view` |
| service | `all-service` | `service.view` |
| help | `documentation`, `support` | `ALWAYS_OPEN` |
| admin | **every** item and **every** section | `SUPERADMIN_ONLY` |

Nav gates are `.view`-level on purpose. Managing warehouses is gated at the *button*, not by hiding the warehouse list from someone who may legitimately read it.

- [ ] **Step 4: Switch filtering to greying**

`use-filtered-navigation.ts` currently **removes** inaccessible items. Per the design they must stay visible and greyed. Change it to return every item annotated instead:

```ts
export interface GatedNavItem extends NavItem { allowed: boolean }
```

Keep the panel-level rule that a panel with zero *allowed* items still renders — the user should see what exists.

- [ ] **Step 5: Render the greyed state**

In `rail.tsx` and `panel.tsx`: when `allowed` is false, render the item with reduced opacity, `aria-disabled="true"`, no `href` navigation, and an `onClick` that calls `requestAccess(item.permission, item.label)`. Pass `item.label` as the subject so the dialog says "Inventory", not the permission's generic name.

Do not render a `next/link` for a blocked item — a middleware round-trip on every misclick is wasteful and flashes the page.

- [ ] **Step 6: Verify**

Run: `npm run typecheck:web && npm run web:lint`
Expected: clean, and zero "missing permission" errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/types/navigation.ts apps/web/lib/config/navigation.ts apps/web/lib/hooks/use-filtered-navigation.ts apps/web/components/layout
git commit -m "feat(rbac): gate rail and panel navigation, grey instead of hide"
```

---

## Task 11: Tab gating

**Files:**
- Modify: `apps/web/components/features/customers/constants.ts:24` (`CUSTOMER_DETAIL_TABS`)
- Modify: `apps/web/components/features/properties/constants.ts:60` (`PROPERTY_DETAIL_TABS`)
- Modify: `apps/web/components/features/projects/constants.ts:384` (`PROJECT_DETAIL_TABS`)
- Modify: `apps/web/components/features/quotes/constants.ts:174` (`QUOTE_DETAIL_TABS`)
- Modify: `apps/web/components/features/customers/customer-detail/tab-rail.tsx`
- Modify: `apps/web/components/features/properties/property-detail/tab-rail.tsx`
- Modify: `apps/web/components/features/projects/components/project-detail/project-detail-tabs.tsx`
- Modify: `apps/web/components/features/quotes/components/quote-detail/quote-detail-tabs.tsx`
- Modify: `apps/web/components/features/inventory/components/warehouse-detail-page.tsx`
- Modify: `apps/web/components/features/inventory/components/vendor-detail-page.tsx`

**Interfaces:**
- Consumes: `Gate` from Task 1, `useCan` and `useAccessDialog`.
- Produces: 38 gated tabs.

**There are two tab systems.** Four detail pages define tabs as `*_TABS` constant arrays rendered through MUI `Tabs`/`Tab` in a tab-rail component. Two inventory pages and the admin quote-config page write `<TabsTrigger>` inline using the local `@/components/ui/tabs` primitive. Both must be handled; only the first can be made type-safe.

- [ ] **Step 1: Add a required `permission` to the four constant arrays**

Type each array `as const satisfies readonly { value: string; label: string; permission: Gate }[]`. The `satisfies` clause makes a missing `permission` a compile error — same trick as Task 10.

**CUSTOMER_DETAIL_TABS (9)**

| value | gate |
|---|---|
| `overview` | `customers.view` |
| `properties` | `properties.view` |
| `quotes` | `quotes.view` |
| `projects` | `projects.view` |
| `documents` | `customers.view` |
| `followups` | `followups.view` |
| `finance` | `finance.view` |
| `service` | `service.view` |
| `activity` | `customers.view` |

**PROPERTY_DETAIL_TABS (8)**

| value | gate |
|---|---|
| `overview` | `properties.view` |
| `quotes` | `quotes.view` |
| `documents` | `properties.view` |
| `finance` | `finance.view` |
| `project` | `projects.view` |
| `followups` | `followups.view` |
| `service` | `service.view` |
| `activity` | `properties.view` |

**PROJECT_DETAIL_TABS (10)**

| value | gate |
|---|---|
| `overview` | `projects.view` |
| `summary` | `projects.view` |
| `tasks` | `projects.view` |
| `documents` | `projects.view` |
| `finance` | `finance.view` |
| `bom` | `inventory.view` |
| `allocations` | `inventory.view` |
| `reports` | `projects.view` |
| `surveys` | `projects.view` |
| `service` | `service.view` |

**QUOTE_DETAIL_TABS (2)**

| value | gate |
|---|---|
| `overview` | `quotes.view` |
| `payments` | `finance.view` |

These cross-module gates are the point of this task. A customer-detail Finance tab that ignores `finance.view` is a hole straight through the finance gate, reachable from a page the user is allowed to open.

- [ ] **Step 2: Grey the blocked tabs in the four rail components**

In each of `customer-detail/tab-rail.tsx`, `property-detail/tab-rail.tsx`, `project-detail/project-detail-tabs.tsx` and `quote-detail/quote-detail-tabs.tsx`: call `useCan()`, and for a tab where `can(tab.permission)` is false render it `disabled` with an `onClick` calling `requestAccess(tab.permission, tab.label)`.

MUI's `<Tab disabled>` swallows click events, so put the handler on a wrapping element (or use `component="div"` with your own click handler) — otherwise the tab greys out but the dialog never opens.

- [ ] **Step 3: Guard the tab content too**

Changing the active tab is not only possible by clicking — these pages read the tab from URL state. In each page's content switch, if the resolved tab is not allowed, render `<AccessDeniedContent code={tab.permission} />` instead of the tab body.

- [ ] **Step 4: Gate the three inline-JSX tab sets**

`warehouse-detail-page.tsx` (3 tabs): `stock` → `inventory.view`, `transactions` → `inventory.transactions.view`, `allocations` → `inventory.view`.

`vendor-detail-page.tsx` (2 tabs): `pos` → `inventory.purchase_orders.view`, `projects` → `projects.view`.

`admin/quote-config/components/quote-config-page.tsx` (4 tabs: `general`, `gst`, `milestones`, `profit-margin`): **no per-tab gate needed.** The whole page sits under `/admin`, which Task 9 gates as `SUPERADMIN_ONLY`. Add a one-line comment saying so, so the next reader does not think it was forgotten.

- [ ] **Step 5: Verify**

Run: `npm run typecheck:web && npm run web:lint`
Expected: clean.

Manual, as superadmin: open a customer, a property, a project and a quote and confirm all tabs work as before. Real deny checks happen in Task 19.

- [ ] **Step 6: Commit**

```bash
git add -A apps/web/components/features
git commit -m "feat(rbac): gate all 38 detail-page tabs"
```

---

## Tasks 12-16: Button gating, module by module

These five tasks are the same shape. For each: find the data-changing buttons, wrap them, verify, commit.

**The rule.** Gate buttons that **change data** — create, edit, delete, send, approve, assign, record, convert, import. Do **not** gate Cancel, Close, Back, Filter, Sort, Search, pagination, export-to-CSV of data already on screen, or tab switches.

**How to gate.** Prefer disabling over hiding, so the dialog can teach:

```tsx
const { can } = useCan();
const { requestAccess } = useAccessDialog();

<Button
  disabled={!can('customers.create')}
  onClick={can('customers.create') ? handleCreate : () => requestAccess('customers.create')}
>
  Add Customer
</Button>
```

For a `MenuItem` inside a row-actions menu, do the same. For a whole panel of sensitive numbers, use `<Can permission="quotes.profitability">` from `apps/web/components/shared/guards/can.tsx` — update that component to accept `Gate` first.

**Finding them.** In each module directory run:

```bash
rg -n "<Button|<MenuItem" <dir> --glob '*.tsx'
```

Then open each file the command lists and decide, per button, whether it changes data. The file counts below tell you when you have finished.

---

### Task 12: Buttons — CRM

**Files:** `apps/web/components/features/customers` (13 files, 33 buttons), `.../properties` (10 files, 22), `.../followups` (7 files, 13), `.../onboarding` (4 files, 10).

**Action → gate**

| Action | Gate |
|---|---|
| Add / Create Customer, Import Customers | `customers.create` |
| Edit Customer, Change customer status | `customers.edit` |
| Delete Customer | `customers.delete` |
| Assign owner / Reassign customer | `customers.assign` |
| Add site, Add / Create Property, onboarding submit | `properties.create` |
| Edit Property | `properties.edit` |
| Delete Property | `properties.delete` |
| Create Quote (from a customer or property card) | `quotes.create` |
| Convert to Project | `projects.create` |
| Add / Edit / Complete / Snooze follow-up | `followups.manage` |

Known files needing edits, from the grep: `properties/components/property-row-actions-menu.tsx` (Edit Property, Create Quote, Delete Property), `customers/components/property-card.tsx` (Create Quote, Convert to Project), `customers/components/import-customers-modal.tsx` (Import Customer), `customers/components/customer-properties-expanded-row.tsx` (Add site, Delete Property), `properties/property-detail/header.tsx` (Create Quote).

- [ ] **Step 1: Update `Can` to accept `Gate`**

In `apps/web/components/shared/guards/can.tsx`, change the `permission` prop type from `string | string[]` to `Gate | Gate[]` and route the check through `useCan()`.

- [ ] **Step 2: Walk the four directories and gate every data-changing button**

- [ ] **Step 3: Verify**

Run: `npm run typecheck:web && npm run web:lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add -A apps/web/components/features/customers apps/web/components/features/properties apps/web/components/features/followups apps/web/components/features/onboarding apps/web/components/shared/guards
git commit -m "feat(rbac): gate CRM action buttons"
```

---

### Task 13: Buttons — Quotes

**Files:** `apps/web/components/features/quotes` (8 files, 28 buttons).

**Action → gate**

| Action | Gate |
|---|---|
| New Quote, Duplicate Quote | `quotes.create` |
| Edit Quote, Save Draft, Add/Remove line item, Change discount | `quotes.edit` |
| Delete Quote | `quotes.delete` |
| Send to Customer, Resend, Share link | `quotes.send` |
| Accept, Reject, Mark as accepted | `quotes.approve` |
| **Every margin, cost and price-breakdown block** | `quotes.profitability` |

- [ ] **Step 1: Wire `quotes.profitability` in the four known files**

`quote-detail/tabs/quote-overview-tab.tsx`, `quote-detail/tabs/overview/quote-sidebar.tsx`, `quote-preview-panel.tsx`, `quote-detail/quote-detail-header.tsx` already use `<Can>` with the old code — repoint them to `quotes.profitability`.

Then grep for others the old code missed:

```bash
rg -n "margin|Margin|cost|Cost|profit|Profit|breakdown|Breakdown" apps/web/components/features/quotes --glob '*.tsx'
```

Review every hit. This code **hides**, it does not grey — no placeholder, no blurred tease, per the design.

- [ ] **Step 2: Also check the PDF and preview paths**

Run: `rg -n "margin|cost|profit" apps/web/components/features/quotes --glob '*.ts'`

If a quote PDF or preview payload is assembled client-side and includes cost figures, gate that assembly too. A hidden panel is useless if the numbers ship inside a generated document.

- [ ] **Step 3: Gate the action buttons per the table**

- [ ] **Step 4: Verify**

Run: `npm run typecheck:web && npm run web:lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add -A apps/web/components/features/quotes
git commit -m "feat(rbac): gate quote actions and profitability blocks"
```

---

### Task 14: Buttons — Projects

**Files:** `apps/web/components/features/projects` (21 files, 36 buttons), `.../tasks` (2 files, 5 buttons).

**Action → gate**

| Action | Gate |
|---|---|
| New Project | `projects.create` |
| Edit Project, Change status, Edit milestone | `projects.edit` |
| Delete Project | `projects.delete` |
| Add / Edit / Assign / Complete task | `projects.tasks.manage` |
| Add / Remove team member, Change role on project | `projects.team.manage` |
| Anything on the BOM or Allocations tab that writes | `inventory.allocations.manage` |
| Record payment from a project finance tab | `finance.payments.record` |

- [ ] **Step 1: Walk both directories and gate every data-changing button**
- [ ] **Step 2: Verify** — `npm run typecheck:web && npm run web:lint`, expect clean
- [ ] **Step 3: Commit**

```bash
git add -A apps/web/components/features/projects apps/web/components/features/tasks
git commit -m "feat(rbac): gate project and task action buttons"
```

---

### Task 15: Buttons — Inventory

**Files:** `apps/web/components/features/inventory` (27 files, 53 buttons — the largest module).

**Action → gate**

| Action | Gate |
|---|---|
| Stock adjustment, Record movement, Stock in/out | `inventory.stock.manage` |
| Add / Edit / Delete Warehouse | `inventory.warehouses.manage` |
| New PO, Edit PO, Cancel PO, Add PO line | `inventory.purchase_orders.manage` |
| Approve PO, Reject PO | `inventory.purchase_orders.approve` |
| Add / Edit / Delete Vendor | `inventory.vendors.manage` |
| New Dispatch, Edit Dispatch, Mark delivered | `inventory.dispatches.manage` |
| Allocate stock, Release allocation | `inventory.allocations.manage` |
| Return request create / approve | `inventory.stock.manage` |

- [ ] **Step 1: Walk the directory and gate every data-changing button**

Note "Cancel PO" is in the table while plain "Cancel" is not — cancelling a purchase order changes data; closing a modal does not. Read the handler, not the label.

- [ ] **Step 2: Verify** — `npm run typecheck:web && npm run web:lint`, expect clean
- [ ] **Step 3: Commit**

```bash
git add -A apps/web/components/features/inventory
git commit -m "feat(rbac): gate inventory action buttons"
```

---

### Task 16: Buttons — Finance and Service

**Files:** `apps/web/components/features/ledger` (4 files, 16 buttons), `.../payment-approvals` (1 file, 3), `.../service-tickets` (5 files, 8).

**Action → gate**

| Action | Gate |
|---|---|
| Record Payment, Add ledger entry, Edit entry | `finance.payments.record` |
| Approve payment, Reject payment | `finance.approvals.process` |
| Send reminder / statement from receivables | `finance.receivables.view` |
| New / Edit ticket, Change ticket status, Assign engineer | `service.manage` |

- [ ] **Step 1: Walk the three directories and gate every data-changing button**
- [ ] **Step 2: Verify** — `npm run typecheck:web && npm run web:lint`, expect clean
- [ ] **Step 3: Commit**

```bash
git add -A apps/web/components/features/ledger apps/web/components/features/payment-approvals apps/web/components/features/service-tickets
git commit -m "feat(rbac): gate finance and service action buttons"
```

---

## Task 17: Superadmin role builder adjustments

**Files:**
- Modify: `apps/web/components/features/admin/roles/components/permission-selector.tsx:36`
- Modify: `apps/web/components/features/admin/permissions/components/admin-permissions-list-page.tsx`
- Modify: `apps/web/components/features/admin/roles/components/admin-roles-list-page.tsx`
- Modify: `apps/web/components/features/admin/roles/components/delete-role-modal.tsx`
- Modify: `apps/web/components/features/admin/roles/components/edit-role-modal.tsx`
- Modify: `apps/web/lib/hooks/resources/permissions.ts` (the `Permission` type gains `module`, loses the dropped fields)

**Interfaces:**
- Consumes: the `module` column added in Task 2.

- [ ] **Step 1: Fix the grouping bug**

`permission-selector.tsx:36` reads:

```ts
const feature = p.code.split(':')[0] || 'other';
```

The new codes have no colon, so `quotes.view` splits to `quotes.view` and all 42 land in groups of one — the picker looks shattered. Replace with:

```ts
const feature = p.module;
```

Update the `Permission` type in `apps/web/lib/hooks/resources/permissions.ts`: add `module: string`, and delete `action`, `scope`, `permissionLevel`, `showInMenu`, `menuLabel`, `dependsOnPermissionIds`, `isSystemPermission` — the API no longer returns them.

- [ ] **Step 2: Make the permissions page read-only**

In `admin-permissions-list-page.tsx`, remove the create, edit and delete buttons and their modals/handlers. Keep the list, the search, and `permission-detail-modal.tsx`. Add a short note at the top: permissions are fixed in code; create roles to combine them.

- [ ] **Step 3: Protect the two system roles**

In `admin-roles-list-page.tsx`, render a role whose `code` is `super_admin` or `admin` with a `Full access · locked` badge, no permission count, no edit control and no delete control. Do not render the 42-checkbox grid for them — it would be 42 empty boxes and read as broken.

In `delete-role-modal.tsx` and `edit-role-modal.tsx`, refuse those two codes with a clear message. The API refuses them too (Task 5, Step 4); this is the friendly half.

- [ ] **Step 4: Verify**

Run: `npm run typecheck:web && npm run web:lint`
Expected: clean.

Manual, as superadmin:
1. `/admin/permissions` lists 42 codes grouped into 9 modules, with no create/edit/delete.
2. `/admin/roles` shows Superadmin and Admin locked, and the 13 shells editable with 0 permissions.
3. Create a role, tick permissions from at least three module groups, save, reopen — the ticks persisted.

- [ ] **Step 5: Commit**

```bash
git add -A apps/web/components/features/admin apps/web/lib/hooks/resources/permissions.ts
git commit -m "feat(rbac): adapt role builder to the new catalog"
```

---

## Task 18: Full-app sweep for missed gates

**Files:** any file the sweep turns up.

The compiler covers nav and tabs. Nothing covers buttons, so this task is the deliberate manual pass the design promised instead of a coverage test.

- [ ] **Step 1: Find ungated mutation calls**

```bash
rg -n "useMutation|onSubmit=|handleDelete|handleCreate|handleApprove|handleSend" \
  apps/web/components/features --glob '*.tsx' -l
```

For each file, confirm the control that triggers the mutation is gated. Anything reachable without a permission check is a miss.

- [ ] **Step 2: Find leftover old-style codes**

```bash
rg -n "'[a-z-]+:[a-z_:-]+'" apps/web --glob '*.ts*' | rg -v 'http|https|data:|blob:'
```

Any colon-style permission code still present is a survivor from the old system. Convert or delete it.

- [ ] **Step 3: Confirm the role-name cleanup held**

```bash
rg -ln "'super_admin'|'admin'" apps/web --glob '*.ts*'
```

Expected: only `apps/web/lib/stores/auth-store.ts` and `apps/web/middleware.ts`.

- [ ] **Step 4: Confirm every catalog code is actually used**

For each of the 42 codes, run `rg -c "<code>" apps/web`. A code with only its `catalog.ts` definition and no consumer means a UI element was missed — find it or justify the gap in writing.

- [ ] **Step 5: Full verification**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all clean.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A apps/web
git commit -m "fix(rbac): close gaps found in the full-app sweep"
```

---

## Task 19: Manual walkthrough

**Files:** none — this is verification. Record the results in the PR description.

- [ ] **Step 1: Build the narrow test role**

As superadmin: `/admin/roles` → **+ New role** → name `QA Narrow` → tick **only** `customers.view` and `quotes.view` → Save.

- [ ] **Step 2: Assign it**

`/admin/users` → pick a test user → Assign role → `QA Narrow`. Confirm they hold no other role.

- [ ] **Step 3: Log in as that user and check the rail**

Expected: Dashboard, Sales & CRM and Quotations active. Projects, Inventory, Finance, Service, Admin greyed. Clicking a greyed item opens the dialog naming the right code.

- [ ] **Step 4: Check panels and tabs**

Open a customer. Expected: Overview, Quotes and Activity work; Properties, Projects, Follow-ups, Finance and Service tabs greyed, each opening the dialog with its own code — `properties.view`, `projects.view`, `followups.view`, `finance.view`, `service.view`.

- [ ] **Step 5: Check buttons**

On the customer list: **Add Customer** disabled (needs `customers.create`), clicking it opens the dialog. On a quote: **New Quote**, **Send**, **Edit** all disabled. **Every margin, cost and price-breakdown block is absent** — not greyed, not blurred, absent.

- [ ] **Step 6: Check direct URLs**

Type each of these into the address bar and confirm the deny page **and** that no matching API request appears in the Network tab:

```
/finance
/finance/receivables
/inventory/stock
/projects/list
/admin/roles
```

- [ ] **Step 7: Check the freshness fix**

Leave the test user logged in. As superadmin in another browser, add `finance.view` to `QA Narrow`. Back in the test user's browser, reload any page. Expected: Finance is now active in the rail, **without** logging out and in.

- [ ] **Step 8: Check admin**

Log in as a user holding only `admin`. Expected: every rail item active, every button enabled, margins visible — and `/admin` greyed. Typing `/admin/roles` shows the deny page.

- [ ] **Step 9: Check superadmin**

Log in as superadmin. Expected: everything open, including `/admin`. No dialog appears anywhere.

- [ ] **Step 10: Clean up and record**

Delete the `QA Narrow` role, or keep it if it is useful for future testing. Write the results of steps 3-9 into the PR description, including anything that failed and how it was fixed.

---

## Post-Implementation Notes

Carry these into the PR description:

- **This is a UI lock, not a security lock.** Every endpoint except the 9 IAM write endpoints is reachable by any logged-in user through the API. Backend RBAC is a separate upcoming task.
- **The migration is one-way.** The previous 110 permissions and their grants are gone permanently.
- **All 13 non-system roles have zero permissions** after deployment. Existing staff keep their role assignments but can do nothing until a superadmin fills those roles in. Plan the first hour after deploy accordingly.
- **There are no `admin.*` permission codes.** A future role that needs part of `/admin` requires a code change.
