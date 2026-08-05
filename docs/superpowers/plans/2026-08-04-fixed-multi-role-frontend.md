# Fixed Multi-Role Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the web dashboard's dynamic permission-driven RBAC with a fixed, multi-role frontend and screenshot-inspired role assignment flow, while keeping production on the legacy path until the new backend role API exists.

**Architecture:** A shared immutable role catalog feeds a web-only feature/action-to-roles policy. Access helpers evaluate the additive union of fixed roles, with Admin and Superadmin bypass. A feature flag selects the new frontend path, and a typed adapter isolates the future atomic user-role API.

**Tech Stack:** TypeScript, Next.js 16, React 19, Zustand, TanStack Query, Zod, existing OneOhm UI primitives.

## Global Constraints

- First implementation scope is `apps/web` plus the shared fixed-role contract under `libs/shared`; do not modify backend or mobile behavior.
- Canonical roles are `guest`, `field_worker`, `store`, `reseller`, `admin`, `super_admin`, `liaisoning`, `designer`, `finance`, `execution`, `ic_partner`, `sales`, `marketing`, `service`, `hr`, `loan`, and `dispatch`.
- The target authorization model contains no permission records or customer-editable role definitions.
- Multiple roles grant additive access; unknown roles and unknown features deny by default.
- Admin and Superadmin receive all product access.
- Only Superadmin may manage owner roles; self-removal is blocked in the UI.
- Employee creation remains separate. After success, Admin/Superadmin immediately enter role assignment; HR receives the owner-assignment-required message instead.
- `profileKind`/`profileType` and project-team `roleName`/`isProjectManager` are domain concepts, not access roles; do not rewrite them as fixed-role authorization.
- Legacy access codes such as `platform_admin`, `superadmin`, `sales_person`, `design_engineer`, and `accounts_manager` may be displayed for migration diagnosis but never grant fixed-mode access.
- Implemented navigation items and action controls remain visible in fixed mode. Unauthorized interaction is intercepted before navigation/API mutation and shows a consistent role-access error.
- Do not claim role persistence when the fixed-role API is unavailable.
- Fixed-mode authorization reads only canonical codes from auth `roles[]`; missing, invalid, or legacy-only role data denies access rather than falling back to `permissions[]`.
- Product code must call `canAccessFeature`; it must not inspect `FEATURE_ROLE_POLICY` membership directly, because owner exceptions and Admin/Superadmin bypass are evaluator rules.
- Unregistered feature keys and missing fixed-mode route/navigation/resource metadata deny before the Admin/Superadmin bypass. Admin/Superadmin bypass applies only after a feature is explicitly registered.
- Every future protected feature change must add its `FeatureAccessKey`, policy entry, route/navigation/resource/action wiring, and manual role-matrix evidence in the same review.
- Run every verification command from the monorepo root `/Volumes/works-space/oneohm/oneohm`.
- Do not remove the production legacy path until the backend-readiness gate in Task 7 is satisfied.
- Do not create commits unless the user explicitly requests them.

---



## Milestone A: Frontend-ready fixed-role system behind a flag



### Task 1: Canonical Role Catalog and Policy Core

**Files:**

- Create: `libs/shared/src/constants/fixed-roles.ts`
- Modify: `libs/shared/src/constants/index.ts`
- Create: `apps/web/lib/access-control/feature-policy.ts`
- Create: `apps/web/lib/access-control/access.ts`
- Create: `apps/web/lib/access-control/index.ts`

**Interfaces:**

- Produces: `FixedRoleCode`, `FixedRoleDefinition`, `FIXED_ROLES`, `FIXED_ROLE_CODES`, `OWNER_ROLES`, `isFixedRoleCode`, `getRolePresentation`.
- Produces: `FeatureAccessKey`, `FEATURE_ROLE_POLICY`, `hasRole`, `hasAnyRole`, and `canAccessFeature(roles: readonly string[], feature: FeatureAccessKey): boolean`.
- Consumed by every later task.

- [ ] **Step 1: Add the immutable role catalog**

Use one `as const` role-definition array as the source of truth, derive `FixedRoleCode` from it, and derive `FIXED_ROLE_CODES` by mapping it. Do not duplicate the codes in a second handwritten union/tuple. Each definition contains:

```ts
interface FixedRoleDefinitionShape {
  code: string;
  label: string;
  shortDescription: string;
  group: 'owner' | 'commercial' | 'project_delivery' | 'operations' | 'support';
  availability: 'available' | 'coming_soon';
}

export const FIXED_ROLES = [
  // all 17 definitions
] as const satisfies readonly FixedRoleDefinitionShape[];

export type FixedRoleCode = (typeof FIXED_ROLES)[number]['code'];
export type FixedRoleDefinition =
  Omit<FixedRoleDefinitionShape, 'code'> & { code: FixedRoleCode };
```

Mark `reseller`, `ic_partner`, `marketing`, `service`, and `loan` as `coming_soon` when their dedicated web workspace is absent. HR is available because employee-directory and staff-management features already exist. Do not use availability to grant access.

- [ ] **Step 2: Add explicit feature/action keys and the approved role matrix**

Cover the implemented surfaces:

```ts
type FeatureAccessKey =
  | 'dashboard.view'
  | 'profile.view'
  | 'profile.manage'
  | 'notifications.view'
  | 'customers.view'
  | 'customers.manage'
  | 'customers.delete'
  | 'properties.view'
  | 'properties.manage'
  | 'properties.delete'
  | 'onboarding.manage'
  | 'pipeline.view'
  | 'quotes.view'
  | 'quotes.create'
  | 'quotes.manage'
  | 'quotes.delete'
  | 'quotes.priceBreakdown.view'
  | 'projects.view'
  | 'projects.create'
  | 'projects.update'
  | 'projects.delete'
  | 'projects.team.manage'
  | 'projects.tasks.manage'
  | 'projects.design.manage'
  | 'projects.documents.manage'
  | 'projects.reports.view'
  | 'projects.bom.view'
  | 'projects.bom.manage'
  | 'inventory.stock.view'
  | 'inventory.stock.manage'
  | 'inventory.procurement.view'
  | 'inventory.procurement.manage'
  | 'inventory.allocations.view'
  | 'inventory.allocations.manage'
  | 'inventory.dispatch.view'
  | 'inventory.dispatch.manage'
  | 'inventory.transactions.view'
  | 'inventory.export'
  | 'inventory.search'
  | 'finance.view'
  | 'finance.project.view'
  | 'finance.ledger.manage'
  | 'service.view'
  | 'service.manage'
  | 'admin.users.view'
  | 'admin.users.manage'
  | 'admin.users.delete'
  | 'admin.userRoles.manage'
  | 'admin.ownerRoles.manage'
  | 'admin.catalog.manage'
  | 'admin.settings.manage'
  | 'admin.discom.manage';
```

Populate `FEATURE_ROLE_POLICY` exactly from this matrix:

```ts
const ALL_NON_OWNER_ROLES = [
  'guest', 'field_worker', 'store', 'reseller', 'liaisoning', 'designer',
  'finance', 'execution', 'ic_partner', 'sales', 'marketing', 'service',
  'hr', 'loan', 'dispatch',
] as const;

const OPERATIONAL_NON_OWNER_ROLES = ALL_NON_OWNER_ROLES.filter((role) => role !== 'guest');

const FEATURE_ROLE_POLICY = {
  'dashboard.view': ALL_NON_OWNER_ROLES,
  'profile.view': ALL_NON_OWNER_ROLES,
  'profile.manage': OPERATIONAL_NON_OWNER_ROLES,
  'notifications.view': OPERATIONAL_NON_OWNER_ROLES,
  'customers.view': [
    'field_worker', 'reseller', 'liaisoning', 'finance', 'sales',
    'marketing', 'service', 'loan',
  ],
  'customers.manage': ['field_worker', 'sales'],
  'customers.delete': [],
  'properties.view': [
    'field_worker', 'reseller', 'liaisoning', 'designer', 'finance',
    'execution', 'sales', 'service', 'loan',
  ],
  'properties.manage': ['field_worker', 'sales'],
  'properties.delete': [],
  'onboarding.manage': ['field_worker', 'sales'],
  'pipeline.view': ['reseller', 'sales', 'marketing'],
  'quotes.view': ['field_worker', 'reseller', 'designer', 'finance', 'sales', 'loan'],
  'quotes.create': ['field_worker', 'reseller', 'sales'],
  'quotes.manage': ['field_worker', 'reseller', 'sales'],
  'quotes.delete': [],
  'quotes.priceBreakdown.view': ['finance', 'sales'],
  'projects.view': [
    'field_worker', 'store', 'liaisoning', 'designer', 'finance', 'execution',
    'ic_partner', 'sales', 'service', 'loan', 'dispatch',
  ],
  'projects.create': [],
  'projects.update': [],
  'projects.delete': [],
  'projects.team.manage': [],
  'projects.tasks.manage': [
    'field_worker', 'liaisoning', 'designer', 'execution', 'ic_partner', 'service',
  ],
  'projects.design.manage': ['designer'],
  'projects.documents.manage': [
    'field_worker', 'liaisoning', 'designer', 'execution', 'ic_partner', 'service',
  ],
  'projects.reports.view': ['liaisoning', 'designer', 'finance', 'execution', 'service'],
  'projects.bom.view': ['store', 'designer', 'execution', 'ic_partner', 'dispatch'],
  'projects.bom.manage': ['designer'],
  'inventory.stock.view': ['store', 'finance', 'execution', 'dispatch'],
  'inventory.stock.manage': ['store'],
  'inventory.procurement.view': ['store', 'finance'],
  'inventory.procurement.manage': ['store'],
  'inventory.allocations.view': ['store', 'execution', 'ic_partner', 'dispatch'],
  'inventory.allocations.manage': ['store'],
  'inventory.dispatch.view': ['store', 'execution', 'dispatch'],
  'inventory.dispatch.manage': ['dispatch'],
  'inventory.transactions.view': ['store', 'finance', 'dispatch'],
  'inventory.export': ['store', 'finance'],
  'inventory.search': ['store', 'finance', 'execution', 'dispatch'],
  'finance.view': ['finance'],
  'finance.project.view': ['finance', 'loan'],
  'finance.ledger.manage': ['finance'],
  'service.view': ['service'],
  'service.manage': ['service'],
  'admin.users.view': ['hr'],
  'admin.users.manage': ['hr'],
  'admin.users.delete': [],
  'admin.userRoles.manage': [],
  'admin.ownerRoles.manage': ['super_admin'],
  'admin.catalog.manage': [],
  'admin.settings.manage': [],
  'admin.discom.manage': [],
} satisfies Record<FeatureAccessKey, readonly FixedRoleCode[]>;
```

Guest intentionally does not receive `notifications.view`; its phase-one scope is dashboard and profile only.

`canAccessFeature` evaluates in this order: unauthenticated/empty-role deny; unknown/unregistered feature deny; `admin.ownerRoles.manage` Superadmin-only exception; Admin/Superadmin product bypass; explicit additive role-policy lookup. Admin bypasses every explicitly registered product feature, including destructive customer/property/user/quote actions, DISCOM, and catalog/settings. HR may manage user identity/profile/status but cannot delete users or assign access roles.

`getRolePresentation(code)` returns canonical catalog metadata when the code is fixed and `{ label, isLegacy: true }` for unknown strings. Presentation normalization must not feed `canAccessFeature`; there is no frontend alias-to-access conversion.

- [ ] **Step 3: Review catalog and policy integrity**

Confirm from the source definitions that `FEATURE_ROLE_POLICY satisfies Record<FeatureAccessKey, ...>` so adding a key without a role mapping fails typecheck; every policy role passes `isFixedRoleCode`; every role has non-empty label/description; owner roles are exactly Admin/Superadmin; all coming-soon roles remain selectable; Admin reaches every registered product feature except owner-role governance; and Superadmin reaches every registered feature.

- [ ] **Step 4: Run shared and web typechecks**

```bash
npm run typecheck:libs
npm run typecheck:web
```



Expected: both typechecks pass.

### Task 2: Feature Flag and Fixed-Role API Adapter

**Files:**

- Modify: `apps/web/lib/config/config.interface.ts`
- Modify: `apps/web/lib/config/config.ts`
- Create: `apps/web/lib/access-control/fixed-role-feature.ts`
- Create: `apps/web/lib/hooks/resources/fixed-user-roles.ts`
- Modify: `apps/web/lib/hooks/resources/index.ts`
- Modify: `apps/web/providers/auth-provider.tsx`
- Modify: `apps/web/lib/stores/auth-store.ts`

**Interfaces:**

- Consumes: `FixedRoleCode`.
- Produces: `config.features.fixedRolesEnabled`.
- Produces: `FixedUserRolesAdapter`, `FixedRolesAdapterError`, `fixedUserRolesAdapter`, `useFixedUserRoles`, `useReplaceFixedUserRoles`.
- Produces: `refreshUserFromServer()` and canonical fixed-mode auth-role selection.

- [ ] **Step 1: Add the single cutover flag**

Extend `WebConfiguration`, `loadConfig()`, and `WebConfigService` with:

```ts
features: {
  fixedRolesEnabled: process.env.NEXT_PUBLIC_FIXED_ROLES_ENABLED === 'true',
}
```

Default it to `false`. Do not add a second authorization-mode flag.

- [ ] **Step 2: Implement the target API adapter**

```ts
interface FixedUserRolesAdapter {
  getUserRoles(userId: string): Promise<FixedRoleCode[]>;
  replaceUserRoles(userId: string, roles: FixedRoleCode[]): Promise<FixedRoleCode[]>;
}
```

Validate every returned code with `isFixedRoleCode`. Preserve error kinds:

```ts
type FixedRolesAdapterErrorKind =
  | 'unsupported'
  | 'forbidden'
  | 'conflict'
  | 'validation'
  | 'not_found'
  | 'server'
  | 'network';
```

The real adapter targets `GET /users/:id/roles` and atomic `PUT /users/:id/roles`. Treat only an explicit unsupported/route-missing code, 405, or 501 as `unsupported`; distinguish user `not_found` from a missing endpoint. When the backend is absent, return `unsupported`, disable Save, and display that role persistence is unavailable; never use local storage, an in-memory mutation, `/iam/user-roles`, or a fake successful response. Move live endpoint verification to the Task 7 readiness gate.

- [ ] **Step 3: Add React Query hooks**

Use query key `['fixed-user-roles', userId]`. Disable the mutation while unsupported or pending. On replacement success, refetch `GET /users/:id/roles`, validate every returned code, then update that cache and invalidate `['users']`; do not trust an optimistic-only result. On `409`, refetch current roles and require the actor to review before retrying.

- [ ] **Step 4: Define fixed-mode auth freshness**

Replace the existing cached-only `refreshUser()` behavior with `refreshUserFromServer()` backed by `/auth/me`. Fixed-mode access selects only `roles.filter(isFixedRoleCode)` from the server response; it never derives access from legacy aliases, role IDs, profile kind, or `permissions[]`. If `/auth/me` has no canonical role data, fixed mode denies business features and exposes a non-production migration warning.

Refresh auth after a successful self-role update, after an access-related API `403`, and when a stale tab regains focus. Synchronize persisted auth changes across tabs with the existing storage mechanism or a `BroadcastChannel`; do not automatically retry denied mutations.

Milestone A role-matrix QA uses non-production accounts whose existing `/auth/me` payload already contains exact canonical codes. If those fixtures are unavailable, fixed mode remains deny-all and role-matrix QA waits; do not add a client-side role override or alias mapper.

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck:web
```

Expected: typecheck passes with the flag off by default.

### Task 3: Fixed-Role Runtime, Navigation, and Route Protection

**Files:**

- Create: `apps/web/lib/access-control/route-policy.ts`
- Create: `apps/web/lib/hooks/use-feature-access.ts`
- Create: `apps/web/lib/access-control/access-feedback.ts`
- Create: `apps/web/components/shared/guards/role-access-guard.tsx`
- Create: `apps/web/components/shared/guards/guarded-feature-action.tsx`
- Modify: `apps/web/components/shared/guards/index.ts`
- Modify: `apps/web/lib/types/navigation.ts`
- Modify: `apps/web/lib/config/navigation.ts`
- Modify: `apps/web/lib/config/routes.ts`
- Modify: `apps/web/lib/hooks/use-filtered-navigation.ts`
- Modify: `apps/web/components/shared/command-palette/use-command-palette-commands.ts`
- Modify: `apps/web/components/layout/rail.tsx`
- Modify: `apps/web/components/layout/panel.tsx`
- Modify: `apps/web/components/layout/mobile-nav.tsx`
- Modify: `apps/web/lib/api/client.ts`
- Modify: `apps/web/app/(dashboard)/layout.tsx`

**Interfaces:**

- Consumes: `FeatureAccessKey`, `canAccessFeature`, and the feature flag.
- Produces: `getRouteFeature(pathname)`, `useFeatureAccess(feature)`, `RoleAccessGuard`, `GuardedFeatureAction`, `showFeatureAccessDenied`.

- [ ] **Step 1: Build the complete route-policy manifest**

Map customer details to `customers.view`, quote creation to `quotes.create`, project creation to `projects.create`, dispatch creation to `inventory.dispatch.manage`, and Admin Users to `admin.users.view`. Keep legacy Admin Roles/Permissions outside the fixed manifest.

Create a checked route-inventory artifact alongside `IMPLEMENTED_ROUTE_POLICIES` and cross-check it against every actual `apps/web/app/(dashboard)/**/page.tsx`. Every protected implemented page must map to one feature key. Explicitly cover `/`, the `/dashboard` alias behavior, all customer/property create/edit/detail paths, onboarding, quotes, projects, the complete inventory and ledger-backed finance trees, and all non-legacy Admin pages. Explicitly exclude `dev/table` as development-only and verify it is unavailable in production. Unregistered protected routes deny by default.

- [ ] **Step 2: Replace navigation authorization metadata**

Add `feature?: FeatureAccessKey` and an internal evaluated `isAllowed` state to navigation items and sections. Populate feature keys for every implemented destination. In fixed mode, an implemented item missing `feature` evaluates `isAllowed: false`; it never becomes public. Do not filter role-denied implemented items or style them as disabled: rail, panel, mobile nav, and command palette keep them visible, and denied clicks show feedback. Do not expose configured-but-missing Service, Help, Calendar, Activity, Dashboard Tasks, Notifications, or Admin Settings pages. The current notification bell must not navigate to the missing `/notifications` page. Remove the command palette's independent `IMPLEMENTED_ROUTES` filter or derive it from `IMPLEMENTED_ROUTE_POLICIES`.

While the flag is off, retain the legacy `roles`/`permissions` filtering behavior. While it is on, annotate access from `feature` plus `canAccessFeature` without hiding implemented entries.

- [ ] **Step 3: Add route policy and guard**

Use ordered exact/prefix/dynamic matchers. The dashboard layout keeps authentication guard first and fixed-role route guard second. Under fixed-role mode:

- registered allowed route: render;
- registered denied route: render one Access Denied state;
- profile/dashboard common route: allow according to policy;
- unregistered protected route: deny rather than silently allow.

The guard resolves access before mounting denied page children, so denied routes cannot start page queries or effects.

- [ ] **Step 4: Add the feature access hook**

```ts
export function useFeatureAccess(feature: FeatureAccessKey): boolean {
  const roles = useAuthStore((state) => state.user?.roles ?? []);
  return canAccessFeature(roles, feature);
}
```

- [ ] **Step 5: Add consistent denied-interaction feedback**

`GuardedFeatureAction` keeps its child control visible. On unauthorized interaction it prevents navigation/submission/mutation, preserves current form state, and calls `showFeatureAccessDenied({ feature, label })`. Use concise copy: “Access denied. Your assigned roles do not allow this action. Contact a Superadmin if you need access.”

Direct URL access still renders the full Access Denied state. Normalize API `403` responses into a typed access error, show one generic access message, refresh `/auth/me` once, and never automatically retry a mutation. Keep domain-specific 403/404 rendering where the backend indicates record scope or missing data, and prevent duplicate global/local toasts. This remains a fallback, not a replacement for backend authorization.

- [ ] **Step 6: Run typecheck and build**

```bash
npm run typecheck:web
npm run web:build
```

Expected: typecheck and build pass with legacy mode still available.

### Task 4: Screenshot-Inspired Fixed Role Picker

**Files:**

- Create: `apps/web/components/features/admin/users/components/fixed-role-card.tsx`
- Create: `apps/web/components/features/admin/users/components/fixed-role-picker.tsx`
- Create: `apps/web/components/features/admin/users/components/fixed-role-grant-summary.tsx`
- Create: `apps/web/components/features/admin/users/components/fixed-role-assignment-modal.tsx`
- Create: `apps/web/components/features/admin/users/utils/fixed-role-picker-state.ts`

**Interfaces:**

- Consumes: role catalog, owner constants, feature policy, and fixed-role hooks.
- Produces: `FixedRolePicker` and `FixedRoleAssignmentModal`.

- [ ] **Step 1: Implement focused view-model helpers**

Keep toggle, grouping, owner-governance, legacy display, deduplication, placeholder-only selection, and grant-summary calculations pure. The React components should render these results rather than reimplement policy logic.

- [ ] **Step 2: Build the role cards and picker**

Match the supplied direction:

- responsive two-column cards;
- toggle on the right;
- selected tint and border;
- role name plus one-line responsibility;
- Owner, Commercial, Project Delivery, Operations, and Support sections;
- Coming soon badge;
- owner cards remain visible; unauthorized toggles keep state unchanged and show the standard access error;
- live grant summary below the cards.

Use existing `Dialog`, `Button`, `Badge`, and switch/toggle primitives. Do not introduce a new visual framework.

- [ ] **Step 3: Perform manual picker and accessibility review**

In the browser, verify one-column/two-column responsive behavior, toggling multiple cards, Coming soon badges, live grant summary updates, denied owner-role clicks with unchanged state, keyboard interaction, visible focus, and accessible labels for every toggle.

- [ ] **Step 4: Build atomic modal behavior**

Load current roles once, keep draft selection local, and call `replaceUserRoles` only on Save. If the adapter is unsupported, keep the picker reviewable but disable Save with explicit backend-unavailable copy. Exclude displayed legacy codes from access decisions and the PUT payload. Preserve the draft on failure, translate error kinds into specific messages, and never close the modal on a failed save. After success, use the server-refetched role list as the source of truth.

- [ ] **Step 5: Run lint and typecheck**

```bash
npm run web:lint
npm run typecheck:web
```

Expected: lint and typecheck pass.

### Task 5: Employee Creation, User Detail, and Role Displays

**Files:**

- Modify: `apps/web/components/features/admin/users/components/user-form-modal.tsx`
- Modify: `apps/web/components/features/admin/users/components/admin-users-list-page.tsx`
- Modify: `apps/web/components/features/admin/users/components/admin-user-detail-page.tsx`
- Modify: `apps/web/components/features/admin/users/components/assign-role-modal.tsx`
- Create: `apps/web/components/features/admin/users/components/fixed-role-badges.tsx`
- Modify: `apps/web/components/features/profile/components/roles-permissions-section.tsx`
- Modify: `apps/web/components/features/profile/components/profile-header.tsx`
- Modify: `apps/web/lib/hooks/resources/profile.ts`
- Modify: `apps/web/components/layout/user-menu.tsx`
- Modify: `apps/web/lib/hooks/resources/users.ts`

**Interfaces:**

- Consumes: `FixedRoleAssignmentModal`, `FixedRoleCode`, and feature flag.
- Produces: `UserFormModal.onCreated(user: AdminUser)`.

- [ ] **Step 1: Implement the post-create role-flow state**

Handle successful creation, cancel, successful role save, reopening Manage Roles, a roleless employee, preservation of an existing employee when assignment is cancelled, and an HR-created employee whose actor lacks `admin.userRoles.manage`.

- [ ] **Step 2: Return the created user from the form**

Add:

```ts
onCreated?: (user: AdminUser) => void;
```

Call it only after `createUser.mutateAsync` succeeds. Editing must not open role assignment.

- [ ] **Step 3: Auto-open role assignment**

In `admin-users-list-page.tsx`, when fixed-role mode is enabled, close the create modal and set the newly created user as the fixed-role modal target only when the actor has `admin.userRoles.manage`. If the actor is HR, show “Employee created; an owner must assign access roles.” If the picker is cancelled, retain the created user and refresh the list with “No roles assigned.” Keep create/edit/status/delete/role actions visible; guard interactions with `admin.users.manage`, `admin.users.delete`, and `admin.userRoles.manage`.

- [ ] **Step 4: Switch detail assignment by feature flag**

The existing `AssignRoleModal`, `useUserRoles` table, per-row remove actions, and add-role flow remain exclusively in the flag-off path. In fixed mode, replace the entire Assigned Roles table with canonical `FixedRoleBadges` plus one visible “Manage roles” action. Unauthorized clicks show the standard access error; authorized clicks open the atomic fixed modal. Owner-role controls use the current user's roles and target user ID. No fixed-mode render or effect may call `/iam/user-roles`.

- [ ] **Step 5: Migrate the user-list role filter from IDs to canonical codes**

Keep `roleId` only in the flag-off request type. In fixed mode, options come from `FIXED_ROLES` and the users query sends `role=<FixedRoleCode>`. Do not fetch `/iam/roles`. Add `GET /users?role=<code>` to the backend-readiness gate; if the endpoint is not available, omit the fixed-mode filter rather than silently filtering one paginated page.

Manual acceptance must confirm that the filter is absent while unsupported and appears only when server-side canonical filtering is available.

- [ ] **Step 6: Centralize every user/profile role display**

Render canonical labels from the catalog, mark unknown codes as Legacy role, and collapse compact displays to the first roles plus `+N`. Use the same component in the user list, user detail, `profile-header.tsx`, `roles-permissions-section.tsx`, and `user-menu.tsx`. Replace the profile's permission accordion with assigned roles and a role-derived responsibility summary. Type `EmployeeProfile.roles` as canonical-or-legacy display input during migration.

- [ ] **Step 7: Preserve profile and project-domain boundaries**

Keep user `profileKind: staff | reseller` and `profileType` payload behavior unchanged. Do not infer the `reseller` access role from profile kind. Keep project-team `roleName` and `isProjectManager` separate from fixed roles.

- [ ] **Step 8: Run lint and typecheck**

```bash
npm run web:lint
npm run typecheck:web
```

Expected: lint and typecheck pass.

### Task 6: Migrate Every Role Consumer and Product UI Gate

Execute this umbrella migration as four independently reviewable subtasks. Do not combine 6A–6D into one review-sized change.

**Files:**

- Modify: `apps/web/providers/auth-provider.tsx`
- Modify: `apps/web/lib/stores/auth-store.ts`
- Modify: `apps/web/lib/types/auth.ts`
- Create: `apps/web/lib/hooks/core/use-resource-access.ts`
- Modify: `apps/web/lib/hooks/core/types.ts`
- Modify: `apps/web/lib/hooks/core/resource-registry.ts`
- Modify: `apps/web/lib/hooks/core/index.ts`
- Modify permission-gated resource hooks:
  - `apps/web/lib/hooks/resources/users.ts`
  - `apps/web/lib/hooks/resources/products-admin.ts`
  - `apps/web/lib/hooks/resources/subsidy-config.ts`
  - `apps/web/lib/hooks/resources/workflow-steps.ts`
  - `apps/web/lib/hooks/resources/lookups.ts`
  - `apps/web/lib/hooks/resources/installation-pricing.ts`
  - `apps/web/lib/hooks/resources/product-types.ts`
  - `apps/web/lib/hooks/resources/brands.ts`
  - `apps/web/lib/hooks/resources/saved-views.ts`
  - `apps/web/lib/hooks/resources/profile.ts`
  - `apps/web/lib/hooks/resources/quotes.ts`
  - `apps/web/lib/hooks/resources/projects.ts`
  - `apps/web/lib/hooks/resources/bom.ts`
  - `apps/web/lib/hooks/resources/notifications.ts`
  - `apps/web/lib/hooks/resources/warehouses.ts`
  - `apps/web/lib/hooks/resources/vendors.ts`
  - `apps/web/lib/hooks/resources/purchase-orders.ts`
  - `apps/web/lib/hooks/resources/material-dispatches.ts`
  - `apps/web/lib/hooks/resources/stock-allocations.ts`
  - `apps/web/lib/hooks/resources/inventory-stock.ts`
  - `apps/web/lib/hooks/resources/inventory-transactions.ts`
  - `apps/web/lib/hooks/resources/employees.ts`
  - `apps/web/lib/hooks/resources/properties.ts`
  - `apps/web/lib/hooks/resources/quote-config.ts`
  - `apps/web/lib/hooks/resources/product-prices.ts`
  - `apps/web/lib/hooks/resources/ledger.ts`
  - `apps/web/lib/hooks/resources/finance-org.ts`
  - `apps/web/lib/hooks/resources/project-expenses.ts`
  - `apps/web/lib/hooks/resources/bom-procurement.ts`
- Modify permission-gated feature components found by the removal-audit search:
  - `apps/web/components/features/inventory/**`
  - `apps/web/components/shared/inventory/**`
  - `apps/web/components/features/quotes/**`
  - `apps/web/components/features/admin/discom/**`
  - `apps/web/components/features/admin/workflow-steps/**`
  - `apps/web/components/shared/command-palette/use-inventory-palette-search.ts`
  - `apps/web/components/shared/command-palette/use-command-palette-commands.ts`
  - `apps/web/components/layout/global-header.tsx`
  - `apps/web/components/features/ledger/**`
  - `apps/web/components/features/customers/customer-detail/tabs/finance-tab.tsx`
  - `apps/web/components/features/properties/property-detail/tabs/finance-tab.tsx`
  - `apps/web/components/features/properties/property-detail/tabs/overview-tab.tsx`
  - `apps/web/components/features/projects/components/project-detail/tabs/overview/overview-financials.tsx`
  - `apps/web/components/features/projects/components/project-detail/tabs/project-bom-tab.tsx`
  - `apps/web/components/features/projects/components/procurement/procurement-section.tsx`
  - `apps/web/components/features/projects/components/project-detail/tabs/project-documents-tab.tsx`
  - `apps/web/components/features/projects/components/project-status-dropdown.tsx`
- Modify direct role-gated CRM/property components:
  - `apps/web/components/features/properties/utils/delete-eligibility.ts`
  - `apps/web/components/features/customers/components/customer-list-page.tsx`
  - `apps/web/components/features/customers/components/customer-properties-expanded-row.tsx`
  - `apps/web/components/features/customers/customer-detail/customer-detail-page.tsx`
  - `apps/web/components/features/customers/customer-detail/header.tsx`
  - `apps/web/components/features/properties/property-detail/property-detail-page.tsx`
  - `apps/web/components/features/properties/components/property-row-actions-menu.tsx`
- Modify project role readers and workflow matching:
  - `apps/web/components/features/projects/utils.ts`
  - `apps/web/components/features/projects/hooks/use-employees.ts`
  - `apps/web/components/features/projects/hooks/types.ts`
  - `apps/web/components/features/projects/components/project-create-wizard/components/available-employees-list.tsx`
  - `apps/web/components/features/projects/components/project-create-wizard/components/employee-row.tsx`
  - `apps/web/components/features/projects/components/project-create-wizard/components/selected-team-list.tsx`
  - `apps/web/components/features/projects/components/project-create-wizard/components/review-team-chips.tsx`
  - `apps/web/components/features/projects/components/project-create-wizard/components/team-split-panel.tsx`
  - `apps/web/components/features/projects/components/project-create-wizard/steps/step-5-tasks-milestones.tsx`
  - `apps/web/components/features/projects/components/project-create-wizard/hooks/use-project-create-submit.ts`
  - `apps/web/components/features/projects/components/project-create-wizard/components/task-row-wizard.tsx`
  - `apps/web/components/features/projects/components/edit-project-modal.tsx`
  - `apps/web/components/features/projects/components/project-dashboard-page.tsx`
  - `apps/web/components/features/projects/components/project-list-page.tsx`
  - `apps/web/components/features/projects/components/project-detail/project-detail-content.tsx`
  - `apps/web/components/features/projects/components/project-detail/project-detail-header.tsx`
- Modify fixed-role workflow defaults:
  - `apps/web/components/features/admin/workflow-steps/components/admin-workflow-steps-page.tsx`
  - `apps/web/components/features/admin/workflow-steps/utils/workflow-step-payload.ts`
  - `libs/shared/src/schemas/workflow-step.schema.ts`
- Modify Admin CRUD components so action buttons use resource/feature access:
  - `apps/web/components/features/admin/brands/**`
  - `apps/web/components/features/admin/product-types/**`
  - `apps/web/components/features/admin/products/**`
  - `apps/web/components/features/admin/installation-pricing/**`
  - `apps/web/components/features/admin/quote-config/**`
  - `apps/web/components/features/admin/subsidy-config/**`
  - `apps/web/components/features/admin/lookups/**`
  - `apps/web/components/features/admin/workflow-steps/**`
- Review/remove role-specific generic formatting:
  - `apps/web/lib/utils/format.ts`
  - `apps/web/lib/utils/index.ts`
  - `apps/web/lib/utils.ts`
  - `libs/shared/src/utils/formatters.ts`
- Modify stale exports and error presentation:
  - `apps/web/lib/stores/index.ts`
  - `apps/web/components/shared/index.ts`
  - `apps/web/lib/utils/error.ts`
  - `libs/shared/src/utils/error.ts`

**Interfaces:**

- Consumes: `FeatureAccessKey`, `useFeatureAccess`.
- Produces: `ResourceAccessConfig`, `useResourceAccess`.

#### Task 6A: Fail-Closed Resource Access and Registrations

- [ ] **Step 1: Introduce feature-key resource access**

Replace `ResourcePermissionConfig`, `ResourceConfig.permissions`, and `getResourcePermissions()` with fixed feature-key equivalents. `ResourceAccessConfig` values are `FeatureAccessKey`. Preserve the existing result shape (`canView`, `canCreate`, `canUpdate`, `canDelete`, `canArchive`, `canBulkDelete`) so product components need minimal structural change. Missing resource/action metadata denies by default in fixed mode; the current fail-open “undefined config means all true” behavior must not survive.

Manually review Store versus Dispatch, Finance, Sales, HR, customer/property destructive actions, quote price breakdown, and owner bypass against the approved matrix.

- [ ] **Step 2: Migrate resource registrations**

Replace strings such as `users:read` with approved feature keys such as `admin.users.view`. Include `quotes.ts`, `projects.ts`, `bom.ts`, `notifications.ts`, and `saved-views.ts`, not only Admin resources. Map legacy checks without broadening them:

- `quotes:read` → `quotes.view`
- quote-create routes/actions → `quotes.create`
- `quotes:update` → `quotes.manage`
- `quotes:delete` → `quotes.delete`
- `quotes:view_price_breakdown` → `quotes.priceBreakdown.view`
- warehouse/vendor/stock reads → `inventory.stock.view`
- purchase-order reads → `inventory.procurement.view`
- allocation reads → `inventory.allocations.view`
- dispatch reads → `inventory.dispatch.view`
- `inventory:write`, `stock:adjust`, `stock:transfer` → `inventory.stock.manage`
- `purchase-order:write`, `purchase-order:approve` → `inventory.procurement.manage`
- `allocation:write` → `inventory.allocations.manage`
- `dispatch:write` → `inventory.dispatch.manage`
- `inventory:export` → `inventory.export`
- `inventory:search` → `inventory.search`
- `notifications:read` → `notifications.view`
- `projects:read` → `projects.view`
- `projects:create` → `projects.create`
- `projects:update` → `projects.update`
- `projects:delete` → `projects.delete`
- project-team assignment → `projects.team.manage`
- organization cash/receivables display → `finance.view`
- project/customer/property finance display → `finance.project.view`
- ledger receipt/expense/payment mutations → `finance.ledger.manage`
- BOM view/edit → `projects.bom.view` / `projects.bom.manage`
- project documents read/write → `projects.view` / `projects.documents.manage`
- `users:read` → `admin.users.view`
- user create/update/status → `admin.users.manage`
- user delete → `admin.users.delete`
- product, brand, product-type, lookup, quote-config, pricing, and installation configuration mutations → `admin.catalog.manage`
- own-profile reads in `profile.ts` → `profile.view`; own-profile updates → `profile.manage`, keeping Guest mutation-free
- project-wizard employee directory reads in `employees.ts` → `projects.team.manage`; never map the organization employee list to `profile.view`
- workflow/subsidy settings → `admin.settings.manage`
- saved-view actions inherit the feature key of the host module rather than creating a cross-module access grant

Dynamic IAM role/permission resources stay legacy-only until Task 7.

- [ ] **Step 3: Verify Task 6A**

Run `npm run typecheck:web` and source-audit every `defineResource` registration. Fixed-mode resources with absent access metadata must be deny-all, not allow-all.

#### Task 6B: Inventory, Quotes, Finance, and Admin Action Gates

- [ ] **Step 4: Migrate direct checks by domain**

Replace each `hasPermission`, `PermissionGuard`, `<Can permission>`, quote/inventory-specific permission hook, `ORG_ADMIN_ROLES`, and product-level `useIsAdmin` branch with `useFeatureAccess`, `RoleAccessGuard`, or `GuardedFeatureAction`. Product controls remain visible; denied interactions show feedback before any request.

Review every list/detail/create/dialog path under the Inventory and Quotes globs, including quote Create/Delete/price-breakdown/equipment pricing, PO create/receive, allocation fulfill/return/cancel, dispatch create, and stock adjust/transfer. Gate organization cash/receivables and top-level ledger routes with `finance.view`; gate embedded project/customer/property finance snapshots with `finance.project.view`; gate receipt/expense/payment/change-order/reversal mutations with `finance.ledger.manage`. A denied tab remains visible but must not become selected, mount protected content, or start a query.

Replace the workflow-steps page's hardcoded `{ canView/canCreate/canUpdate/canDelete: true }` stub. Document and manually verify the intentional DISCOM change from legacy Superadmin-only to Admin/Superadmin, matching the approved owner full-access rule. Guard admin catalog resource hooks and UI actions, not only page routes.

Because `/notifications` has no implemented page, suppress its navigation action rather than exposing a dead link. If the unread-count query remains, gate its `enabled` state with `notifications.view`.

- [ ] **Step 5: Verify Task 6B**

Run `npm run typecheck:web`, `npm run web:lint`, and manually confirm denied controls send no queries or mutations.

#### Task 6C: CRM, Projects, Workflow Roles, and Role Presentation

- [ ] **Step 6: Migrate CRM and project action gates**

Map customer/property delete actions to `customers.delete` / `properties.delete`, not broader manage keys, including shared row/header action components. Guard every New Project CTA with `projects.create`; project Edit/status/team entry points with `projects.update` / `projects.team.manage`; project BOM/procurement/document actions with their specific feature keys. Replace the project-dashboard `useIsAdmin()` behavior with the smallest explicit feature key rather than an owner-role check.

- [ ] **Step 7: Migrate project employee filtering and workflow role matching**



Source project employee filter options from `FIXED_ROLES`, not `useRoles()`. Type employee `roles[]` as canonical codes plus visible legacy strings during transition. Match task `defaultRoleCode` only against canonical codes. A legacy workflow default remains visibly unmapped and never aliases to a fixed role; Milestone A workflow QA requires canonical non-production fixtures. Update workflow-step editing and shared Zod validation to accept fixed role codes; keep project-local `roleName` and `isProjectManager` unchanged.

- [ ] **Step 8: Remove duplicate role-label logic**

Replace `projects/utils.ts` `ROLE_LABELS`, user-list `formatRoleCode`, profile `toReadableRole`, and user-menu priority labels with `getRolePresentation`. Retain the shared generic snake-case formatter only if non-role callers still use it.

- [ ] **Step 9: Isolate the unused invitation flow**

Verify `InviteUserModal` still has no mounted call site. Do not port dead `roleId` functionality into fixed mode. Keep it legacy-only while the flag is off and add the modal, schema, invitation `roleId` contract, and exports to Task 7 deletion. If product scope revives invitations before cutover, require a separately approved `roles: FixedRoleCode[]` API contract.

Remove “invite” from HR-facing copy and acceptance expectations in this migration; HR uses the active create/edit employee flow.

- [ ] **Step 10: Verify Task 6C**

Run `npm run typecheck:libs`, `npm run typecheck:web`, and `npm run web:lint`. Manually verify canonical workflow-role matching and that project-local roles remain unchanged.

#### Task 6D: Compatibility Isolation and Exhaustive Audit

- [ ] **Step 11: Keep legacy auth data only as a compatibility field**

While the feature flag is off, retain current permission helpers and API `permissions[]`. While fixed-role mode is on, no new path may consult them. Mark compatibility exports as deprecated and isolate them so Task 7 can delete them without touching product components again.

- [ ] **Step 12: Document the role-surface audit allowlist**

Scan active web/shared source for `.roles`, `roleId`, `roleCode`, `roleName`, `hasRole`, `hasAnyRole`, `useRoles`, `ADMIN_BYPASS`, `ORG_ADMIN_ROLES`, and known legacy codes. Maintain an explicit review allowlist for canonical access code, flag-off IAM compatibility, ARIA `role=`, inventory vendor business fields such as `vendorRole`, profile kind, project-local role names, and the route-policy manifest.

- [ ] **Step 13: Run exhaustive migration searches**

```bash
rg "hasPermission|hasAnyPermission|hasAllPermissions|PermissionGuard|<Can|useResourcePermissions" apps/web
rg "roleId|roleCode|hasAnyRole|hasRole|useRoles|ADMIN_BYPASS|ORG_ADMIN_ROLES|platform_admin|superadmin|sales_person|design_engineer|accounts_manager" apps/web libs/shared/src
rg "permissions:|users:read|employees:read|inventory:read|quotes:read|projects:read|saved-view:" apps/web/lib/hooks apps/web/components
```

Expected after Milestone A: matches exist only in the fixed-role catalog/policy, explicitly allowlisted project/profile concepts, and flag-off legacy compatibility/IAM screens.

- [ ] **Step 14: Run full frontend verification**

```bash
npm run typecheck:web
npm run web:lint
npm run web:build
```

Expected: typecheck, lint, and build pass with the flag defaulting off.

## Milestone B: Backend-ready frontend cutover



### Task 7: Remove Dynamic IAM and Permission Compatibility

**Gate:** Execute only after `GET /users/:id/roles`, atomic `PUT /users/:id/roles`, `GET /users?role=<FixedRoleCode>`, canonical auth/employee `roles[]`, canonical workflow `defaultRoleCode`, organization/record-scope enforcement, stable 403/409 error codes, owner governance including concurrent last-Superadmin protection, role-change audit events, reviewed legacy-role migration, and auth-role refresh are deployed and verified in a non-production environment. The backend must retain a tested rollback path and legacy compatibility for at least one release window.

**Files:**

- Delete: `apps/web/app/(dashboard)/admin/roles/**`
- Delete: `apps/web/app/(dashboard)/admin/permissions/**`
- Delete: `apps/web/components/features/admin/roles/**`
- Delete: `apps/web/components/features/admin/permissions/**`
- Delete: `apps/web/lib/hooks/resources/roles.ts`
- Delete: `apps/web/lib/hooks/resources/permissions.ts`
- Delete: `apps/web/lib/hooks/resources/user-roles.ts`
- Delete: `apps/web/lib/constants/permissions.ts`
- Delete: `apps/web/lib/hooks/core/use-resource-permissions.ts`
- Delete: `apps/web/components/shared/guards/permission-guard.tsx`
- Delete: `apps/web/components/shared/guards/can.tsx`
- Delete: `apps/web/components/features/quotes/hooks/use-quote-permissions.ts`
- Modify: `apps/web/lib/hooks/resources/index.ts`
- Modify: `apps/web/lib/hooks/core/index.ts`
- Modify: `apps/web/components/shared/guards/index.ts`
- Modify: `apps/web/lib/config/navigation.ts`
- Modify: `apps/web/lib/config/routes.ts`
- Modify: `apps/web/lib/types/navigation.ts`
- Modify: `apps/web/lib/stores/auth-store.ts`
- Modify: `apps/web/providers/auth-provider.tsx`
- Modify: `apps/web/lib/types/auth.ts`
- Modify: `apps/web/components/features/admin/users/components/admin-users-list-page.tsx`
- Modify: `apps/web/components/features/admin/users/components/admin-user-detail-page.tsx`
- Delete: `apps/web/components/features/admin/users/components/assign-role-modal.tsx`
- Delete: `apps/web/components/features/admin/users/components/invite-user-modal.tsx` if it remains unmounted
- Delete: `apps/web/components/features/admin/users/schemas/invite-user.schema.ts` if it remains unmounted
- Modify: `apps/web/components/features/admin/users/index.ts`
- Modify: `apps/web/components/features/admin/index.ts`
- Modify/Delete: `apps/web/lib/hooks/resources/invitations.ts` according to remaining non-role invitation usage

**Interfaces:**

- Fixed-role interfaces from Tasks 1–6 become the only authorization path.

- [ ] **Step 1: Run the legacy-removal source audit**

```bash
rg "hasPermission|hasAnyPermission|hasAllPermissions|PermissionGuard|useResourcePermissions|/iam/roles|/iam/permissions|/iam/user-roles|roleId|platform_admin|superadmin|ORG_ADMIN_ROLES" apps/web libs/shared/src
```

Review each remaining match against the documented non-access allowlist. Active legacy authorization matches block cutover.

- [ ] **Step 2: Remove Admin Roles and Permissions navigation/routes**

Keep Users under Identity & Access. Remove role and permission route constants, panel links, pages, and command-palette entries.

- [ ] **Step 3: Remove dynamic IAM hooks and screens**

Delete role CRUD, permission CRUD, role-permission sync, role-ID assignment/filtering/invitations, and separate add/remove mutation loops. Remove stale barrel exports. The fixed atomic adapter becomes the only access-role assignment path.

- [ ] **Step 4: Remove permission state and helpers**

Remove `permissions[]` from frontend `User`/`AuthUser` target contracts after backend auth no longer returns it. Delete compatibility helpers and duplicated bypass arrays. `hasRole`, `hasAnyRole`, and `canAccessFeature` remain.

- [ ] **Step 5: Remove the temporary dual path**

After the fixed path has passed the signed role matrix in production-like staging, make fixed roles the default and only frontend path, then remove `NEXT_PUBLIC_FIXED_ROLES_ENABLED` and all web flag branches. Keep backend rollback compatibility for the agreed observation window; remove legacy backend endpoints/tables only in the later backend cleanup after rollback is no longer required.

- [ ] **Step 6: Run the audit and full verification**

```bash
npm run typecheck:libs
npm run typecheck:web
npm run web:lint
npm run web:build
```

Expected: typecheck, lint, and build pass; the source audit reports zero forbidden active references.

### Task 8: Cutover Acceptance and Handoff

**Files:**

- Modify: `apps/web/README.md`
- Modify: `docs/superpowers/specs/2026-08-04-fixed-multi-role-access-design.md` only if implementation decisions differ from the approved design.
- Create: `docs/superpowers/verification/fixed-multi-role-cutover-checklist.md`

**Interfaces:**

- Documents the canonical role contract and future backend/mobile dependencies.

- [ ] **Step 1: Document operator-facing configuration and behavior**

Record the fixed role codes, additive access rule, owner governance, role assignment endpoints, denied-route behavior, and the fact that access is no longer client-configurable.

- [ ] **Step 2: Verify backend and mobile cutover prerequisites**

Confirm:

- backend atomic replacement endpoint is deployed;
- login and `/auth/me` return canonical roles;
- owner safeguards are server-enforced;
- organization and own/assigned record scopes are server-enforced;
- role replacement emits who/when/before/after audit data;
- role changes refresh web auth state;
- user-list filtering accepts canonical role codes;
- employee lists and workflow defaults return canonical role codes;
- `platform_admin` and all ambiguous legacy roles have a reviewed, non-elevating migration result;
- `../oneohm-mobile/src/types/rbac.types.ts`, its `useRBAC` hooks, and staff project/task role readers use canonical mapping or an approved compatibility adapter;
- consumer mobile ownership checks remain unchanged.
- rollback of the web release and legacy-role migration has been rehearsed against a non-production snapshot.

- [ ] **Step 3: Perform acceptance checks**

Manually verify these role combinations in a non-production environment:

- Guest;
- Sales;
- Store;
- Dispatch;
- Designer + Execution;
- Finance + Loan;
- HR;
- Admin;
- Superadmin.

For each, verify rail/panel/mobile navigation and command palette remain visible, denied clicks show the standard role-access error without navigating or sending a query/mutation, denied routes never mount page data hooks, authorized actions work, API `403` fallback is understandable and does not retry mutations, and role displays remain consistent in user list, user detail, profile header, profile access section, user menu, and project employee picker.

Also record explicit pass/fail evidence for: Guest notification denial; Admin denied owner-role toggles; Superadmin owner-role changes; self-owner-role removal; final-Superadmin and concurrent-edit rejection; a user with only Coming soon roles; unsupported adapter Save/filter behavior; a stale tab after a role change; legacy-code display without access; every unimplemented configured route remaining unavailable; HR create-without-assignment; and DISCOM access for both Admin and Superadmin. Store reviewer, environment/build, role payload, route/action, expected result, actual result, and evidence link in the cutover checklist.

- [ ] **Step 4: Run final repository checks**

```bash
npm run typecheck:libs
npm run typecheck:web
npm run web:lint
npm run web:build
rg "hasPermission|hasAnyPermission|hasAllPermissions|PermissionGuard|<Can|useResourcePermissions|/iam/roles|/iam/permissions|/iam/user-roles" apps/web
rg "roleId|useRoles|ADMIN_BYPASS|ORG_ADMIN_ROLES|platform_admin|superadmin|sales_person|design_engineer|accounts_manager" apps/web libs/shared/src
```

Expected: typecheck, lint, and build pass; final searches return no active legacy authorization references. Any remaining `roleName` or ARIA `role` occurrence is listed in the role-surface audit allowlist with its non-access purpose.

## Execution checkpoints

- Checkpoint 1 after Task 1: approve the canonical role and feature matrix before UI work.
- Checkpoint 2 after Task 3: review fixed-role navigation and denied-route behavior.
- Checkpoint 3 after Task 5: review the role picker and post-create flow against the screenshot.
- Checkpoint 4 after Task 6: Milestone A is complete and production remains on legacy mode.
- Checkpoint 5 before Task 7: verify backend and staff-mobile readiness.
- Checkpoint 6 after Task 8: approve the permanent cutover.

