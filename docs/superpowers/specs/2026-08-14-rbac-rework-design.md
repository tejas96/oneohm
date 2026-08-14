# RBAC Rework — Design

**Date:** 2026-08-14
**Status:** Approved, ready for implementation plan
**Scope:** `apps/backend`, `apps/web`, `libs/shared`

---

## 1. Goal

Replace the existing role and permission system entirely.

- Delete the old catalog: 110 permission codes, 15 roles.
- Delete all permission enforcement from the backend.
- Enforce access **on the frontend only**. Backend enforcement is a separate, later task.
- Define a new, small permission catalog derived from the rail menu, tabs and action buttons.
- Ship two roles with power: `admin` and `super_admin`. Superadmin builds every other role from the admin panel.
- Every rail item, panel item, tab and data-changing button is gated.
- A user denied access sees a central dialog naming the permission they need and telling them to ask a superadmin.

---

## 2. Locked decisions

These were each decided during brainstorming. Do not re-open them during implementation.

| # | Decision | Detail |
|---|---|---|
| 1 | **Granularity: per module + action** | ~42 codes, not ~200. Several UI elements may share one code. |
| 2 | **Deny UX: show it, greyed, click opens dialog** | Rail items, tabs and buttons stay visible but disabled. Sensitive data blocks hide silently instead. |
| 3 | **Old roles become empty shells** | Migration wipes all `role_permissions` but keeps the 15 role rows and every `user_roles` link. No re-assigning of people. |
| 4 | **Admin loses the whole `/admin` section** | All 12 admin pages are superadmin-only. Admin has full access to everything else with no blockers. |
| 5 | **Permissions reach users through roles only** | No per-user permission overrides. No new tables. A user with many roles gets the union. |
| 6 | **One superadmin guard survives on the backend** | The 9 IAM write endpoints keep a `super_admin` role check. Everything else is `JwtAuthGuard` only. |
| 7 | **No new unit tests** | Fix existing tests if they break. Write none. Enforcement comes from the TypeScript type system, not from a test. |
| 8 | **Frontend role code is cleaned out and rebuilt** | Not a retrofit onto the existing role plumbing. |

### 2.1 Naming

New codes use **dots**: `quotes.view`. Old codes used **colons**: `quotes:read`. The break is deliberate — a grep tells you instantly which system a code belongs to, and no old code can collide with a new one.

Role codes keep their existing form. `super_admin` is **not** renamed to `superadmin`: it already exists in the database, in live JWTs, and in `ADMIN_BYPASS_ROLES`. Renaming would break logged-in sessions and buy nothing. `platform_admin` is folded into `super_admin`.

---

## 3. Non-goals and stated limits

**This is a UI lock, not a security lock.** Say this out loud in any handover.

Backend permission enforcement is deleted by this work. Every endpoint except the 9 IAM write endpoints is reachable by any logged-in user. Someone with browser dev tools can call the API directly and read or change data the UI hides from them. That is the accepted trade-off of a frontend-only phase; backend RBAC is a separate upcoming task.

Also out of scope:

- Per-user permission overrides.
- `admin.*` permission codes. The `/admin` section is gated by **role**, not permission. Consequence: a future "Product Manager" who can edit `/admin/products` but nothing else requires a code change, not a UI click.
- Verifying the JWT signature inside `middleware.ts`. It would need the signing secret in the web app and buys nothing while the API is open.
- Fetching a real superadmin's name or contact for the dialog. Generic wording only. A config constant can be added later if wanted.

---

## 4. The permission catalog — 42 codes

**Always open to every logged-in user, no code required:** Dashboard, Profile, Help. This guarantees nobody is ever stranded with a blank app.

| Module | Count | Codes |
|---|---|---|
| Customers | 5 | `customers.view` `customers.create` `customers.edit` `customers.delete` `customers.assign` |
| Properties | 4 | `properties.view` `properties.create` `properties.edit` `properties.delete` |
| Follow-ups | 2 | `followups.view` `followups.manage` |
| Pipeline | 1 | `pipeline.view` |
| Quotes | 7 | `quotes.view` `quotes.create` `quotes.edit` `quotes.delete` `quotes.send` `quotes.approve` `quotes.profitability` |
| Projects | 6 | `projects.view` `projects.create` `projects.edit` `projects.delete` `projects.tasks.manage` `projects.team.manage` |
| Inventory | 10 | `inventory.view` `inventory.stock.manage` `inventory.warehouses.manage` `inventory.purchase_orders.view` `inventory.purchase_orders.manage` `inventory.purchase_orders.approve` `inventory.vendors.manage` `inventory.dispatches.manage` `inventory.allocations.manage` `inventory.transactions.view` |
| Finance | 5 | `finance.view` `finance.receivables.view` `finance.payments.record` `finance.approvals.view` `finance.approvals.process` |
| Service | 2 | `service.view` `service.manage` |

### 4.1 `quotes.profitability`

One code covers every margin, cost and price-breakdown block anywhere in the app. Hold it and you see all of them. Miss it and every one hides — hidden, not greyed, so there is no number to guess at.

Known call sites to cover (non-exhaustive, the plan enumerates the rest):

- `apps/web/components/features/quotes/components/quote-detail/tabs/quote-overview-tab.tsx`
- `apps/web/components/features/quotes/components/quote-detail/tabs/overview/quote-sidebar.tsx`
- `apps/web/components/features/quotes/components/quote-preview-panel.tsx`
- `apps/web/components/features/quotes/components/quote-detail/quote-detail-header.tsx`

### 4.2 Adding a 43rd code later

Add it to `apps/web/lib/rbac/catalog.ts`, then add a migration row. Admin and superadmin get it for free because they bypass rather than hold grants.

---

## 5. Database

**One migration:** `apps/backend/src/database/migrations/1855000000000-ResetRbacCatalog.ts`
(latest existing migration is `1854600000000`.)

### 5.1 Steps, in order

1. `DELETE FROM role_permissions` — every row. This is what turns the 15 old roles into empty shells.
2. `DELETE FROM permissions` — all 110 old codes.
3. Slim the `permissions` table. Drop 8 dead columns: `action`, `scope`, `conditions`, `permission_level`, `show_in_menu`, `menu_label`, `depends_on_permission_ids`, `is_system_permission`. Add `module` (varchar).
4. Insert the 42 new codes with `code`, `name`, `description`, `module`.
5. Upsert `admin` and `super_admin` with `is_system_role = true`. Fold any `platform_admin` row into `super_admin`.
6. Set `is_system_role = false` on the other 13 roles so superadmin can rename or delete them from the UI.

### 5.2 Table shape after

```
permissions
  id  code  name  description  module  is_active  created_at  updated_at
```

`description` is functional, not decoration — it is the sentence the access dialog shows the user.

### 5.3 What does not change

`roles`, `role_permissions` and `user_roles` keep their shape. No new tables. `organization_id` was already dropped from `roles` and `user_roles` by the org-cleanup migration, so there is nothing to do there.

`user_roles.role` (the deprecated string column, made nullable by migration `1782000000000`) is left alone. `role_id` is the real link.

### 5.4 Admin and superadmin hold zero grants

Neither role gets rows in `role_permissions`. They pass every check by **bypass**:

```ts
if (roles.includes('super_admin') || roles.includes('admin')) return true;
```

Rationale: an explicit grant of all 42 would silently miss code #43 added later. A bypass never drifts, and there is no checkbox to untick by accident, so lockout is impossible.

Their JWT carries `permissions: []`. That is expected and correct.

### 5.5 Rollback is one-way

`down()` restores the 8 dropped columns and removes the 42 new codes. It does **not** restore the old 110 codes or their grants — that data is gone permanently. State this in the migration's own comment block.

### 5.6 The seed trap

`apps/backend/src/database/seeds/platform-admin.seed.ts` creates a `platform_admin` role and assigns it **every permission in the table**. Seeds re-run. Left as-is it would hand all 42 new codes to a role that no longer exists. This file must be rewritten as part of this work.

---

## 6. Backend

There is **no global permission guard** — all checks are per-controller, so this is deletion, not surgery.

### 6.1 Delete

| Target | Count |
|---|---|
| `apps/backend/src/modules/iam/guards/permission.guard.ts` | 1 file |
| `apps/backend/src/modules/iam/guards/role.guard.ts` | 1 file |
| `apps/backend/src/modules/iam/decorators/require-permission.decorator.ts` | 1 file |
| `apps/backend/src/modules/iam/decorators/require-role.decorator.ts` | 1 file |
| `@RequirePermission` / `@RequireRoles` call sites | **163**, across 23 controllers |
| Matching `@UseGuards(PermissionGuard)` lines | all |

### 6.2 Keep

- All three IAM entities and all repositories.
- `iam.service.ts`, in particular `getUserPermissions()` — it fills the JWT and is load-bearing.
- `role.controller.ts` — 7 endpoints. This is the role builder's backend.
- `user-role.controller.ts` — 5 endpoints. Assigns roles to people.
- `apps/backend/src/modules/iam/constants/admin-roles.ts`.

### 6.3 Change

- `permission.controller.ts` — drop `POST`, `PATCH`, `DELETE`. Permissions are fixed in code; nothing should create them at runtime. Keep `GET` and `GET /:id`.
- `platform-admin.seed.ts` — rewritten (§5.6).

### 6.4 The one surviving guard

A small `SuperAdminGuard` (~15 lines) on these 9 endpoints only — 6 from `role.controller.ts`, 3 from `user-role.controller.ts`. The 3 write endpoints on `permission.controller.ts` are deleted outright (§6.3), not guarded.

```
POST   /iam/roles
PATCH  /iam/roles/:id
DELETE /iam/roles/:id
POST   /iam/roles/:id/permissions/sync
POST   /iam/roles/:id/permissions/add
DELETE /iam/roles/:id/permissions
POST   /iam/user-roles
POST   /iam/user-roles/bulk
DELETE /iam/user-roles/:id
```

This is not "RBAC in the backend". It is 42 permission codes ignored everywhere, and one role name checked on the door that hands out roles.

Without it, any logged-in user could `POST /iam/user-roles` and assign themselves `super_admin` — a permanent, invisible privilege escalation, categorically worse than reading data they should not see.

The API must also refuse to delete or edit the `admin` and `super_admin` roles, not only hide the buttons.

### 6.5 Not RBAC — leave alone

Two things use `hasAdminBypassRole` but are **business rules**, not permissions. Deleting them would break unrelated features:

- `apps/backend/src/modules/projects/guards/project-team.guard.ts` — "are you on this project's team".
- `apps/backend/src/modules/inventory/services/low-stock-alert.service.ts` — who receives the alert notification.

---

## 7. Frontend

### 7.1 Starting point

Gating is barely present today, so this is ~95% fresh wiring rather than a retrofit:

- `<Can>` is used in **8 places**, all in Quotes.
- `PermissionGuard` wraps **1 page** (discom).
- The old `PERMISSIONS` const is imported by **5 files**.
- **0** existing web tests and **0** existing backend tests reference permissions, so nothing breaks.

### 7.2 Clean out the old role code

The same admin-role array is hardcoded in **three separate places** and can drift:

| File | Line | What |
|---|---|---|
| `apps/web/lib/stores/auth-store.ts` | 29 | `ADMIN_BYPASS_ROLES = ['platform_admin','super_admin','admin']` |
| `apps/web/lib/types/navigation.ts` | 175 | `NAV_ADMIN_BYPASS_ROLES` — the same array again |
| `apps/web/providers/auth-provider.tsx` | 422 | `hasAnyRole(['admin','super_admin','platform_admin'])` — again |

These collapse into one constant. Full removal list:

- `UserRole` type — a union of 11 role names, `apps/web/lib/types/navigation.ts:17-28`. Deleted.
- **8 `roles: [...]` blocks** in `apps/web/lib/config/navigation.ts` at lines 83, 126, 440, 464, 476, 500, 524, 536. All replaced by `permission:`.
- `hasAccess`, `filterByAccess`, `filterByRole` in `apps/web/lib/types/navigation.ts` — rewritten permission-only, no role branch.
- The `role` prop on `apps/web/components/shared/guards/permission-guard.tsx`.
- Role-name labels at `apps/web/components/layout/user-menu.tsx:28-29` — read the DB role name instead of a hardcoded map.
- `apps/web/lib/constants/permissions.ts` and its 5 importers.

**Exit condition:** after this step, `super_admin` and `admin` appear in exactly one file in the web app.

### 7.3 New files

```
apps/web/lib/rbac/
  catalog.ts         42 codes + label + description + module   <- source of truth
  route-map.ts       URL pattern -> permission code
  use-can.ts         hasPermission with the admin bypass
  access-dialog.tsx  the central dialog + its provider
```

The database receives the same 42 codes via migration, but **code is the source of truth**. The DB copy exists so the role builder has something to list.

### 7.4 Enforcement via the type system, not a test

No test is written. `permission` becomes a **required** field on the nav and tab types, and `npm run typecheck` already exists as a script:

```ts
export interface NavItem {
  id: string;
  label: string;
  href: string;
  permission: PermissionCode | 'always-open';   // required — no `?`
}
```

`PermissionCode` is a union derived from `catalog.ts`.

| Mistake | Result |
|---|---|
| New rail item with no permission | typecheck fails |
| Typo, e.g. `quotes.veiw` | typecheck fails |
| Code not present in the catalog | typecheck fails |

**What types cannot catch**, and therefore becomes a per-module checklist plus one manual walkthrough in the plan:

- A missing `<Can>` on a button.
- A `route-map.ts` entry pointing at a page file that no longer exists.
- A permission defined in the catalog but never used anywhere.

### 7.5 Four gating layers

| Layer | Count | Mechanism |
|---|---|---|
| Routes | 66 pages | `middleware.ts` + dashboard layout, driven by `route-map.ts` |
| Rail + panel nav | 47 items | required `permission` field in `navigation.ts` |
| Tabs | 34 triggers | required `permission` field on tab definitions |
| Buttons | ~130 of 401 | `<Can>` wrapper, or `useCan()` for `disabled` |

Buttons that **change data** are gated: create, edit, delete, send, approve, assign, record payment. Not Cancel, Close, Filter, Sort, Next page — gating those is noise.

`/admin` is gated by **role** (`super_admin`), not by a permission code.

### 7.6 Blocking direct URL access

Tokens are stored in **cookies** (`apps/web/lib/api/client.ts:39`, via `js-cookie`), `apps/web/middleware.ts` already exists, and the JWT already carries `permissions: string[]`. So the check runs server-side before any HTML is sent:

```ts
// apps/web/middleware.ts — added to the existing auth logic
const perms  = decodeJwt(accessToken).permissions;
const needed = ROUTE_PERMISSIONS[matchRoute(pathname)];

if (needed && !perms.includes(needed)) {
  return NextResponse.rewrite(
    new URL(`/denied?perm=${needed}&from=${pathname}`, request.url)
  );
}
```

The real page never renders, its data hooks never mount, and no API call goes out.

A second check in the dashboard layout covers soft client-side navigation. On failure the layout renders the deny screen **instead of `children`**, so the page component never mounts.

### 7.7 The bypass lives in exactly two places

`hasPermission` is not implemented in the auth provider — it lives in the Zustand store and the provider forwards it. So:

```ts
// apps/web/lib/stores/auth-store.ts
hasPermission: (code) => {
  const { roles = [], permissions = [] } = get().user ?? {};
  if (roles.includes('super_admin') || roles.includes('admin')) return true;
  return permissions.includes(code);
}
```

Plus the same two lines in `middleware.ts`, which cannot reach the store.

**Two places, and no more.** Missing the middleware copy means a superadmin typing a URL gets denied. Treat both as a single step.

### 7.8 Permission freshness

`apps/web/providers/auth-provider.tsx:328` — `refreshUser` does not refetch. It returns the cached user:

```ts
const refreshUser = useCallback((): Promise<User | null> => {
  // Since login response has full user data, refreshUser can just return cached user
```

So today, changing a role reaches nobody already logged in.

Fix, two parts:

1. Make `refreshUser` actually call the profile endpoint and write the result to the store.
2. Call it once on app mount.

A permission change then lands on the user's **next page load** rather than their next token refresh (`JWT_EXPIRES_IN`, env-driven).

---

## 8. Superadmin role builder

The UI already exists. It is adjusted, not rebuilt.

```
apps/web/components/features/admin/roles/components/
  admin-roles-list-page.tsx   admin-role-detail-page.tsx
  create-role-modal.tsx       edit-role-modal.tsx
  delete-role-modal.tsx       permission-selector.tsx
  role-permissions-panel.tsx
apps/web/components/features/admin/users/components/assign-role-modal.tsx
apps/web/components/features/admin/permissions/components/
  admin-permissions-list-page.tsx  permission-detail-modal.tsx
```

### 8.1 Required changes

**1. `permission-selector.tsx:36` — a real bug if missed.**

```ts
const feature = p.code.split(':')[0] || 'other';   // 'quotes:read' -> 'quotes'
```

New codes contain no colon. `quotes.view` splits to `quotes.view`, so all 42 would land in groups of one and the picker would look shattered. Replace with:

```ts
const feature = p.module;
```

**2. `admin-permissions-list-page.tsx` → read-only.** Remove create, edit and delete. It becomes a reference list of the 42 codes and what each unlocks. Keep the detail modal.

**3. `admin-roles-list-page.tsx` + `delete-role-modal.tsx` → protect the system roles.** `admin` and `super_admin` render as `Full access · locked` with no checkbox grid (42 empty boxes would look broken), no edit and no delete. The API refuses these operations too (§6.4).

**4. `/admin` section gated to `super_admin`** — see §7.5.

### 8.2 Already correct

`assign-role-modal.tsx` already assigns **many roles to one user** — it holds an array of role ids and loops. The "single user can have many roles" requirement needs no work.

### 8.3 Superadmin's flow

```
1. Admin > Roles > + New role
2. Name it, e.g. "Sales Executive"
3. Tick permissions, grouped by module
4. Save
5. Admin > Users > <person> > Assign role
```

---

## 9. The access dialog

One component, three shapes, all reading from `catalog.ts`.

| Situation | Presentation |
|---|---|
| Click a greyed rail item, panel item, tab or button | Central dialog |
| Type a blocked URL directly | Full-page version of the same content |
| Sensitive data (margins, price breakdown) | Hidden silently — no dialog, no placeholder |

Content:

```
Access needed

  <Permission label>

  You do not have access to this.

  Permission needed
    <permission code>
    <permission description from catalog.ts>

  Only a superadmin can grant this.
  Ask them to add it to one of your roles.

  [ Got it ]
```

The description line is why §5.2 keeps that column — it tells the user what they are asking for, not just a code string.

Wording names "a superadmin" generically. No name or contact is fetched.

---

## 10. Build order

The order is load-bearing, not cosmetic.

| # | Step | App state after |
|---|---|---|
| 1 | Migration `1855000000000-ResetRbacCatalog` | Works. Nothing gated yet |
| 2 | Rewrite `platform-admin.seed.ts` | Works |
| 3 | Backend: delete 163 decorators + 4 files | Works, fully open |
| 4 | Backend: `SuperAdminGuard` on the 9 IAM write endpoints | Works |
| 5 | **`hasPermission` bypass for admin + superadmin** | Works |
| 6 | Frontend role cleanup (§7.2) | Works |
| 7 | `catalog.ts`, `route-map.ts`, `access-dialog.tsx` | Works |
| 8 | Route gating + `middleware.ts` | **Gating live** |
| 9 | Nav gating — types force completeness | Gating live |
| 10 | Tab gating | Gating live |
| 11 | Button gating, module by module | Gating live |
| 12 | Admin UI adjustments (§8) | Done |
| 13 | Manual walkthrough (§11) | Done |

**Step 5 must land before step 8.** If gating goes live before the bypass exists, the superadmin holds zero permissions, is locked out of the admin panel, and has no UI left to grant themselves anything. Recovery would require manual SQL.

Steps 1–7 change nothing a user can see. The app stays fully usable throughout. Gating switches on at step 8.

---

## 11. Verification

No unit tests are written. Verification is a manual walkthrough, written into the implementation plan as explicit steps:

1. Superadmin creates a role `QA Narrow` holding **only** `customers.view` and `quotes.view`.
2. Assign it to a test user and log in as them.
3. Walk every rail item, every panel item, every tab and every gated button.
4. Confirm: greyed where expected, dialog fires with the right code, margins hidden.
5. Type at least 5 blocked URLs directly. Confirm the deny page and that no API request fires.
6. Log in as `admin` — everything open **except** `/admin`.
7. Log in as `super_admin` — everything open.

`npm run typecheck` must pass; it is the mechanical half of the coverage guarantee (§7.4).

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Lockout during build | Build order §10, step 5 before step 8 |
| `permission-selector.tsx:36` colon split silently breaks the picker | Called out explicitly in §8.1 |
| `platform-admin.seed.ts` re-grants all 42 codes on next seed | Rewritten in step 2, before gating goes live |
| Middleware bypass forgotten → superadmin denied on typed URLs | §7.7 treats both copies as one step |
| A button gets missed | Types cannot catch it; per-module checklist + walkthrough §11 |
| Someone assumes data is now protected | §3 states the limit plainly; repeat it at handover |
| Migration rollback expected to restore old data | §5.5 states it is one-way, in the migration's own comments |
