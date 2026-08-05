# Fixed Multi-Role Access Design

## Goal

Replace customer-configurable RBAC in the OneOhm staff web application with a fixed, multi-role access system.

Users may hold any number of fixed roles. Frontend access is determined only from those role codes. The product will no longer expose custom roles, permission records, permission assignment, or permission-management screens.

The first implementation phase covers `apps/web`. It must define a clean adapter contract for a later backend replacement without pretending that role changes persist before that backend exists.

## Approved decisions

- The first implementation phase covers the web dashboard only.
- Permissions disappear entirely from the target frontend and backend authorization model.
- Access checks use fixed role codes and a central feature/action-to-roles registry.
- Multiple assigned roles grant the union of their access.
- `admin` and `super_admin` receive all product access.
- Only `super_admin` may grant or revoke owner roles.
- Users cannot remove their own owner role; the future backend must protect the final Superadmin.
- Guest is an authenticated, read-only observer role.
- Employee creation remains separate. After creation succeeds, the fixed-role picker opens immediately for Admin/Superadmin; HR instead receives an owner-assignment-required message.
- The fixed-role frontend is developed behind a cutover flag and an API adapter. The currently deployed IAM flow remains available until backend persistence exists.
- `oneohm-mobile` is outside the first implementation phase but must be migrated or adapted before backend cutover.

## Canonical role catalog

The fixed role codes and labels are:

- `guest` — Guest
- `field_worker` — Field Worker
- `store` — Store
- `reseller` — Reseller
- `admin` — Admin
- `super_admin` — Superadmin
- `liaisoning` — Liaisoning
- `designer` — Designer
- `finance` — Finance
- `execution` — Execution
- `ic_partner` — I & C Partner
- `sales` — Sales
- `marketing` — Marketing
- `service` — Service
- `hr` — HR
- `loan` — Loan
- `dispatch` — Dispatch

Role labels and descriptions are presentation metadata. Canonical codes are the contract used in state, adapters, route policies, and the future backend.

Unknown or legacy codes never grant access. During transition, user-management screens should display them as legacy data rather than silently dropping them.

`platform_admin` and other legacy aliases are not selectable fixed roles.

Legacy presentation must remain separate from authorization. The frontend may render a readable label for `platform_admin`, `sales_person`, `design_engineer`, or another old code, but it must not translate that code into fixed-role access.

## Role-named domain concepts that are not access roles

The migration must not conflate authorization with similarly named business fields:

- `profileKind: staff | reseller` and `profileType` select profile storage/fields; they do not assign the `reseller` access role.
- Project-team `roleName` and `isProjectManager` describe a member's responsibility inside one project; they are not fixed organization access roles.
- ARIA `role` attributes are accessibility semantics.
- Quote `resellerId` and customer reseller segments are business relationships, not access roles.

## Authorization model

### Fixed-role evaluation

The frontend stores only the authenticated user's canonical `roles[]` for authorization.

A central `FEATURE_ROLE_POLICY` maps each protected feature/action to an explicit list of allowed roles. Examples include:

- `customers.view`
- `customers.manage`
- `profile.manage`
- `quotes.view`
- `quotes.create`
- `projects.tasks.manage`
- `inventory.stock.manage`
- `inventory.procurement.view`
- `inventory.allocations.view`
- `inventory.dispatch.manage`
- `finance.ledger.manage`
- `admin.users.manage`
- `admin.userRoles.manage`
- `admin.ownerRoles.manage`

These keys are code-level feature identifiers, not database entities or customer-editable permissions.

Evaluation rules:

1. Unauthenticated users are denied.
2. Unknown or unregistered feature keys deny access before any owner bypass.
3. Owner-role governance is the exception: only `super_admin` may access owner-role assignment/removal.
4. `admin` and `super_admin` bypass normal rules for explicitly registered product features.
5. Otherwise, access is granted when at least one assigned role appears in the feature's allowed-role set.
6. Unknown roles are ignored.
7. Multi-role access is additive; there are no deny roles in the initial design.

Product code uses the evaluator rather than reading policy arrays directly, so the owner-governance exception and Admin/Superadmin bypass cannot be skipped.

### Frontend boundaries

Navigation, route protection, tabs, and actions use the same policy helper. Missing fixed-mode access metadata denies rather than becoming public. Implemented role-denied navigation and controls remain visible; unauthorized interactions are intercepted before navigation or API mutation and show a consistent role-access error.

Hiding a route or button is not a security boundary. Data ownership, organization scope, "own records," and "assigned records" can only be secured by the future backend.

### Owner governance

- `super_admin` may assign or remove any fixed role.
- `admin` may assign or remove non-owner roles.
- `admin` cannot grant or revoke `admin` or `super_admin`.
- Users cannot remove their own owner role.
- The future backend rejects any operation that would leave an organization without a Superadmin.

## Role responsibilities and initial feature mapping

### Guest

- Dashboard and profile only.
- Read-only observer.
- No CRM, quotation, project, inventory, finance, service, or administration mutations.

### Field Worker

- Assigned customers and properties.
- Lead capture and onboarding.
- Own or assigned quotations.
- Assigned projects, tasks, surveys, and documents.
- My Tasks.

Secure own/assigned filtering is deferred to backend enforcement.

### Store

- Stock, warehouses, vendors, and purchase orders.
- Allocations and inventory transactions.
- Read project material requirements.
- View dispatch records, but not manage dispatch workflows.

### Reseller

- Future workspace for own leads, customers, quotations, and commission context.
- Phase one exposes the role in assignment UI without inventing a dedicated portal.
- Existing reseller profile data remains separate from authorization.

### Admin

- All product features.
- Includes current DISCOM, catalog, configuration, and settings surfaces.
- Manage non-owner employee role assignments.
- Cannot grant or revoke owner roles.

### Superadmin

- All product features.
- Manage all role assignments and owner governance.
- Current DISCOM and platform-administration surfaces.

### Liaisoning

- Assigned projects and liaisoning tasks.
- Project documents and regulatory reports.
- Compliance, subsidy, inspection, net-metering, and commissioning coordination.

Some workflows currently exist only as backend APIs or task templates.

### Designer

- Assigned projects and design tasks.
- Surveys and project documents.
- System-layout context and BOM authoring.
- Read quotation/system context needed for design.

### Finance

- Cash ledger and receivables.
- Project finance, receipts, and expenses.
- Customer and property finance views.
- Read-only purchase-order context.

### Execution

- Assigned projects and installation tasks.
- Surveys, checklists, documents, and progress updates.
- Read BOM and inventory allocations.
- View dispatch status needed for delivery coordination, without managing dispatch workflows.

### I & C Partner

- Future partner workspace.
- Assigned installation and commissioning tasks.
- Checklists, surveys, and project documents.
- Read-only BOM and allocation context.

### Sales

- CRM, pipeline, customers, and properties.
- Onboarding and follow-ups.
- Quotations and quote builder.
- Pre-handover project visibility.
- Project creation, project deletion, and team assignment remain owner-only; Sales access does not imply project administration.

### Marketing

- Future marketing workspace.
- Initially dashboard plus read-only CRM and lead-source context.
- No campaign-management feature currently exists.

### Service

- Existing customer service history.
- Future service requests, maintenance tasks, AMC contracts, and customer feedback workspace.
- Current top-level service routes are configured but not implemented.

### HR

- Employee/user directory.
- Create, edit, activate, suspend, and maintain non-owner staff profiles.
- No product configuration or owner-role governance.
- The current invitation modal is unmounted and role-ID based; invitation capability is not part of this migration.

### Loan

- Financing context on customers, properties, and projects.
- Future loan-application tracking UI.
- Backend loan APIs exist, but dedicated web pages do not.

### Dispatch

- Dispatch list, create, detail, delivery, and status handling.
- Read stock, warehouses, allocations, and relevant project context.

## Frontend architecture

### Shared fixed-role contract

Add the canonical role type, metadata, groups, owner-role constants, and future-role markers under `libs/shared/src/`.

The web app imports this contract rather than redefining role strings in navigation, auth state, user menus, or components. The backend can import the same contract in its later phase.

### Central access-control package

Create a focused web access-control module under `apps/web/lib/access-control/`:

- `feature-policy.ts` — feature/action keys and allowed fixed roles.
- `access.ts` — pure `hasRole`, `hasAnyRole`, and `canAccessFeature` evaluators.
- `route-policy.ts` — protected route patterns mapped to feature/action keys.
- `index.ts` — public exports.

Add:

- A role-access hook for client components.
- A route guard for direct URL protection.
- A replacement for permission-based navigation filtering that annotates fixed-role access without hiding implemented destinations.
- A guarded-action wrapper and shared denied-access feedback function.

Auth state stops exposing `permissions`, `hasPermission`, `hasAnyPermission`, and `hasAllPermissions` after final cutover.

### Fixed-role assignment adapter

Define an adapter independent of the current IAM role IDs:

```ts
interface FixedUserRolesAdapter {
  getUserRoles(userId: string): Promise<FixedRoleCode[]>;
  replaceUserRoles(userId: string, roles: FixedRoleCode[]): Promise<FixedRoleCode[]>;
}
```

The target backend contract is:

- `GET /users/:id/roles`
- `PUT /users/:id/roles`
- Request body: `{ roles: FixedRoleCode[] }`
- Response body: `{ roles: FixedRoleCode[] }`

User-list role filtering uses canonical codes rather than IAM UUIDs:

- `GET /users?role=<FixedRoleCode>`

The adapter must report unsupported-backend, forbidden, conflict, and validation failures distinctly. It must never return success for unsaved data.

### Milestone A auth and adapter contract

When fixed-role mode is enabled in development/staging, authorization reads only canonical `roles: FixedRoleCode[]` from `/auth/me` or the equivalent auth response. Missing or legacy-only role data denies fixed-mode business access; the frontend never derives fixed roles from permissions, role IDs, profile kind, or aliases.

Until the target role endpoints exist, the adapter returns `unsupported`, role Save remains disabled with explicit copy, and the user-list fixed-role filter is omitted. It never stores assignments locally, calls legacy `/iam/user-roles`, or reports fake persistence. Live endpoint verification is a backend-cutover prerequisite, not a Milestone A assumption.

Auth roles refresh after self-role changes, access-related `403` responses, and stale-tab focus. Cross-tab synchronization must not automatically replay a denied mutation.

Milestone A manual QA uses non-production accounts and workflow fixtures that already emit exact canonical codes. If fixtures are unavailable, fixed mode remains deny-all for those flows; no client-side role override or legacy alias mapper is permitted.

### Cutover flag

The fixed-role experience is introduced behind a single frontend feature flag.

- Flag off: the deployed legacy IAM flow remains operational.
- Flag on in development/staging: fixed role catalog, policy registry, new guards, and new assignment UI are exercised through the adapter.
- Backend-ready cutover: connect the production adapter, enable fixed roles, remove legacy role and permission paths, and remove the temporary flag.

This is a migration control, not a permanent dual authorization system.

## Role assignment user experience

### Creation flow

The existing employee form remains focused on identity and profile details.

After create succeeds and returns a user ID:

1. Close or complete the employee form.
2. Immediately open the fixed-role picker for the new employee when the actor is Admin or Superadmin.
3. Save all selected roles in one atomic adapter call.
4. If the admin cancels, the employee remains without business access and the user list clearly shows "No roles assigned."

HR may create/edit employee identity and status but cannot assign access roles. After an HR-created employee succeeds, show that an owner must assign roles instead of opening an unauthorized picker.

Guest is selected explicitly; it is not an automatic fallback.

### Role picker

The picker follows the supplied visual direction:

- Two-column role cards on desktop and one column on narrow screens.
- Role name, concise responsibility, and toggle.
- Selected-state tint.
- Live "What this grants" summary based on all selected roles.
- Groups: Owner, Commercial, Project Delivery, Operations, and Support.
- "Coming soon" badge for roles whose dedicated workspace is not implemented.
- Visible owner cards; unauthorized toggles preserve the current selection and show the shared role-access error.
- Save and Cancel actions.

The same component powers post-create assignment and "Manage roles" on user detail.

The existing invitation modal is currently unmounted and still depends on a single dynamic `roleId`. It is not recreated in the fixed-role frontend. If it remains unused, it is removed at cutover. Reviving invitations requires a separately approved multi-role invitation contract.

### Role displays

User list, user detail, profile, and user menu display canonical role labels.

The profile header and project employee picker also use the catalog presentation helper. Project-local team roles remain visually and structurally separate.

All roles are represented. Compact surfaces show the first labels plus `+N`; detailed surfaces show the full set.

Legacy codes are visibly marked and do not grant access.

## Legacy frontend removal

At final cutover, remove:

- Custom role list/detail/create/edit/delete UI under `apps/web/components/features/admin/roles/`.
- Permission list/detail UI under `apps/web/components/features/admin/permissions/`.
- `/admin/roles` and `/admin/permissions` pages.
- Roles and Permissions entries from Admin navigation.
- Dynamic role and permission resource hooks.
- Permission constants, permission guards, `<Can permission>`, and resource-permission helpers.
- Role-ID-based user assignment UI and add/remove mutation loops.
- Permission display/grouping from the profile page.
- Hardcoded legacy role unions and duplicated admin-bypass arrays.
- Role-ID user filters and the unmounted role-ID invitation UI.

Existing product components that use permission helpers must be migrated to fixed feature/action checks before those helpers are deleted.

## Route and navigation behavior

- Navigation items reference a feature/action key rather than role and permission arrays.
- Implemented navigation entries remain visible in fixed mode and are annotated with their access decision.
- Clicking an unauthorized navigation item prevents navigation and shows: “Access denied. Your assigned roles do not allow this action. Contact a Superadmin if you need access.”
- Product action controls remain visible. Unauthorized clicks are intercepted before submission/mutation, preserve local form state, and show the same feedback.
- Direct visits to a denied route render one consistent Access Denied experience.
- Route policy and navigation policy use one explicit implemented-route manifest and are cross-checked during source audit.
- Unimplemented configured routes are omitted from navigation and deny direct access; assigning a future role must not expose broken links.

## Error handling

- Unsupported backend: fixed-role saving remains disabled in every environment, with explicit copy and no fake success.
- Client preflight denial: do not navigate or send an API request; preserve the current page/form state and show the shared access error.
- Backend `403`: show a consistent access error as a fallback for stale roles or server-side scope denial; refresh role state when the backend supports it.
- Forbidden owner change: preserve selections and show a specific governance message.
- Stale update/conflict: refetch current roles and ask the user to review changes.
- Invalid/legacy role from server: display it as legacy data, exclude it from access decisions, and do not silently resubmit it as canonical.
- Network error: preserve local selections and allow retry.
- Placeholder-only selection: show that the role is assigned but its dedicated workspace is not yet available.

## Future backend architecture

### Data model

Keep many-to-many user role assignment, but store fixed canonical role codes directly:

- `user_id`
- `organization_id`
- `role_code`
- `assigned_by`
- timestamps
- unique constraint on user, organization, and role code

Dynamic role, permission, and role-permission definitions are removed after migration.

### API authorization

- Backend uses the same fixed role enum and role sets.
- Guards resolve active organization role assignments and evaluate allowed roles.
- Admin and Superadmin bypass normal product feature rules.
- The API enforces organization isolation, owner governance, valid codes, and final-Superadmin protection.
- Auth responses return `roles[]`; `permissions[]` is removed.
- Role updates refresh frontend auth state so access is not stale.
- Role changes record organization, actor, target user, before/after roles, and timestamp.
- The backend returns stable forbidden/conflict codes and atomically protects the final Superadmin under concurrent updates.

### Legacy data migration

Proposed unambiguous mappings:

- `super_admin` to `super_admin`
- `admin` to `admin`
- `sales_executive` and `sales_person` to `sales`
- `accounts_manager` to `finance`
- `inventory_manager` to `store`
- `compliance_officer` to `liaisoning`
- `design_engineer` to `designer`
- `employee_basic`, `customer`, and `viewer` to `guest` where these are staff-dashboard users
- `field_worker`, `store`, `execution`, `loan`, and `reseller` remain unchanged

Ambiguous codes require a generated review report before migration:

- `manager`
- `project_manager`
- `telecaller`
- `platform_admin`
- string-only legacy assignments without a valid role relation

The migration must be idempotent, report unmapped assignments, and never silently elevate a user to Admin or Superadmin.

Production cutover uses a rehearsed migration rollback and retains legacy backend compatibility for one observation window. Dynamic role/permission endpoints and tables are removed only after the fixed web/mobile path and rollback criteria are satisfied.

### Mobile compatibility gate

Before backend cutover, `oneohm-mobile` must either:

- adopt the canonical fixed-role codes and remove its duplicated role mapping; or
- receive a temporary server/client compatibility adapter.

The consumer mobile app remains outside this migration because it uses customer ownership authorization rather than staff RBAC. Its auth endpoints must remain compatible.

## Verification strategy

No new unit or component test cases are part of this change.

### Compile-time and static verification

- `FixedRoleCode`, `FeatureAccessKey`, and the complete policy use strict TypeScript unions and `satisfies` checks.
- Adding a `FeatureAccessKey` without a `FEATURE_ROLE_POLICY` entry fails typecheck.
- The implemented-route manifest is cross-checked against dashboard `page.tsx` files.
- Navigation, route guards, command palette, action gates, and role displays are reviewed against the same policy matrix.
- Typecheck, lint, and production build must pass.

### Manual role-matrix verification

In development/staging, verify Guest, Sales, Store, Dispatch, Designer + Execution, Finance + Loan, HR, Admin, and Superadmin.

For each role set, inspect visible implemented navigation and command-palette entries, denied-click feedback, direct-route denial without mounting protected queries, product actions, role filtering, role assignment, profile/header/user-menu displays, and project employee matching.

Manually verify picker responsiveness, keyboard/focus behavior, grant summaries, Coming soon states, owner-role restrictions, create-then-assign behavior, API payloads, cross-tab/cache refresh, and unsupported/forbidden/conflict/validation/network errors. Record explicit evidence for Admin/Superadmin owner governance, self-removal, final-Superadmin concurrency, HR post-create behavior, Guest notification denial, legacy-only roles, unsupported filtering/saving, and unimplemented routes.

### Removal audit

At final cutover, static source searches verify:

- No permission-based guard/helper imports remain.
- No custom role or permission routes remain.
- No role-ID assignment calls remain.
- No legacy role aliases appear in active access policies.
- Every remaining read/display of `.roles`, `roleCode`, or role-like legacy string is either canonical access code or explicitly allowlisted as a non-access domain concept.

### Verification commands

- Role/permission source-audit `rg` commands from the implementation plan.
- `npm run typecheck:libs`
- `npm run typecheck:web`
- `npm run web:lint`
- `npm run web:build`

The later backend phase uses API contract checks, migration dry-runs, non-production authorization verification, and source audits rather than unit-test additions.

## Success criteria

- The web app has one canonical list of the 17 fixed roles.
- Users can be represented with multiple roles.
- Role access is additive, centralized, deny-by-default, and permission-free.
- Admin and Superadmin have all product access.
- Only Superadmin manages owner roles.
- The screenshot-inspired fixed-role picker works after employee creation and from user detail.
- Future roles are assignable without exposing broken screens.
- Dynamic role and permission management can be removed cleanly at backend-ready cutover.
- No frontend role operation claims persistence without a functioning backend adapter.
- The later backend and mobile migration requirements are explicit and verifiable.
