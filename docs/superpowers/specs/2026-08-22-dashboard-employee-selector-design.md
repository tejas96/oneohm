# Dashboard — Admin Employee Selector (Design)

- **Date:** 2026-08-22
- **Status:** Approved design. Implementation plan not yet written.
- **Repo:** `oneohm` (Nx monorepo)
- **Builds on:** `docs/superpowers/specs/2026-08-21-dashboard-my-work-design.md`,
  shipped on `feat/dashboard-my-work` ([oneohm#297](https://github.com/tejas96/oneohm/pull/297))
- **Scope:** the selector only. The Business Matrix is a separate spec.

---

## 1. Purpose

Let an authorised manager open another employee's "My Work" dashboard, read-only,
from the dashboard itself.

Decision 2 of the My Work spec deliberately put the subject in the auth token so
this could be added later "without reshaping anything". This spec is that
addition, and it is small by construction: one query parameter, one resolver, one
permission code, one dropdown. No provider, no CTE and no query is rewritten.

---

## 2. Decisions locked

| # | Decision | Rationale |
|---|---|---|
| 1 | **A grantable permission code, not a role gate.** | The feature is for managers. A manager is not an `admin`, and `/admin`-style role gating is the only alternative — it would reach nobody but admins. Only a grantable code reaches the intended user. |
| 2 | **The parameter is resolved, not guarded.** A caller without the grant gets their own dashboard back; the parameter is ignored. No `403`. | This is the pattern the projects list already ships (§3.2). A guard would rebuild the shape of `PermissionGuard`, which `iam.service.ts:20-22` records as removed on purpose. |
| 3 | **The parameter is a user id, named `userId`.** | `$1` in `scope.sql.ts` is a user id in five of its six CTEs. An `employee_profiles.id` passed there matches nothing and returns a silently empty dashboard. The name is the guard rail. |
| 4 | **Viewing another employee is read-only.** Row actions hide; deep links stay. | Completing Priya's follow-up from Priya's dashboard records *you* as the completer, on a queue you are only inspecting. That is a surprising write. It also avoids deep-linking into a screen the viewer's own permissions refuse. |
| 5 | **The selector is hidden from anyone who lacks the code.** | A deliberate exception to the `can.tsx` rule that clickable controls stay visible and explain themselves. That rule serves data-changing controls; this is a view switch. Advertising an org-wide read to all 40 staff invites the wrong conversation. The exception is commented at the call site. |
| 6 | **The grant is org-wide: view *any* employee's work.** | Not a preference. `employee_profiles` has no `manager_id` or `reports_to` column — only `department` and `designation`. "My team" has no relationship to read, and deriving one from `department` would be an invented rule. |
| 7 | **Verification is by walking the screens, not new test files.** | Standing instruction. Existing tests, typecheck and lint stay green. |

---

## 3. Discovery — verified 2026-08-22 against the codebase and the live database

### 3.1 What "frontend-only enforcement" actually means here

There is **no permission guard anywhere in the backend**. `apps/backend/src/modules/auth/guards/`
holds exactly three files: `jwt-auth.guard.ts`, `local-auth.guard.ts`, `otp-auth.guard.ts`.
Across every controller, guard usage is:

| Guard | Controllers |
|---|---|
| `JwtAuthGuard` | 65 |
| `SuperAdminGuard` | 9 |
| `SecurityRateLimitGuard` | 5 |
| `JwtAuthGuard, ProjectTeamGuard` | 3 |
| `JwtAuthGuard, CustomerOwnershipGuard` | 3 |

None of them checks a permission code.

**But the permission list is already on the request.** `JwtStrategy.validate()` returns
`{ id, roles, permissions }` (`jwt.strategy.ts:44`), and `@CurrentUser()` hands that to
every controller. Reading it is not reviving backend RBAC; the data is simply there.

### 3.2 The house pattern for this exact problem already exists

`apps/backend/src/modules/iam/constants/admin-roles.ts` solves "may this caller name
someone other than themselves?" for the projects list:

```ts
export function resolveProjectListMemberId(
  roles: string[], permissions: string[], currentUserId: string,
  options: { customerId?: string; memberId?: string } = {},
): string | undefined {
  const viewAll = canViewAllProjects(roles, permissions);
  ...
  if (viewAll || serviceCustomerLookup) return options.memberId;
  return currentUserId;
}
```

It does not throw. An unauthorised caller who passes someone else's `memberId` simply
gets their own list. The file's own docblock blesses this use:

> Permission enforcement moved to the web app, so this no longer gates endpoints. It
> survives for business rules that legitimately ask "is this an admin?"

`resolveProjectListMemberId` is called from `project.controller.ts:263` and
`project-chat.controller.ts:27`. This spec copies its shape rather than inventing one.

### 3.3 The admin bypass is real, not just a comment

`admin` and `super_admin` hold **zero** rows in `role_permissions` — confirmed in the
live database, not inferred:

| role | grants |
|---|---|
| `project_manager` | 10 |
| `store` | 3 |
| `service` | 2 |
| `admin` | **0** |
| `super_admin` | **0** |
| (12 others) | 0 |

`auth-store.ts:10-16` explains why: an explicit grant of all 42 codes would silently miss
the 43rd, and there would be a checkbox to untick by accident.

**Consequence, and the trap this spec exists to avoid:** a check written as
`permissions.includes(code)` is **false for every admin**. It would lock out precisely
the people the feature is for. Any check must read roles *and* permissions, exactly as
`hasAdminBypassRole(roles) || permissions.includes(code)` does.

### 3.4 Live database facts

| Fact | Value |
|---|---|
| Rows in `permissions` | 42 — the table and `catalog.ts` agree today |
| `permissions.code` | `UNIQUE CONSTRAINT permissions_code_key` — so `ON CONFLICT (code)` is available |
| `role_permissions` FK | `ON DELETE CASCADE` from `permissions` — deleting the code removes its grants |
| Active staff | 40 |
| Active resellers | 11 |
| `employee_profiles` manager column | **none.** Only `department`, `designation` |
| `employee_profiles.user_id` | uniquely indexed — employee ↔ user is 1:1 |

40 names is a plain dropdown. It needs no search, no pagination and no new endpoint.

### 3.5 The one line of ownership logic that changes

`apps/backend/src/modules/dashboard/services/scope.sql.ts` is the single definition of
"my work"; every provider composes it. Swapping the subject is a change to `$1` and
nothing else. No CTE, provider or query is edited.

---

## 4. The permission code

| | |
|---|---|
| `code` | `dashboard.employees.view` |
| `module` | `dashboard` — a new module, the first `dashboard.*` code |
| `name` | View Employee Dashboards |
| `description` | See another employee's My Work dashboard |

`description` is user-facing: it is the sentence the access dialog shows someone who has
been refused, so it is written for them.

**Not `dashboard.team.view`.** There is no team column (§3.4). That name would promise a
scope the database cannot deliver, and the first person to ask "why can I see everyone?"
would be right to.

**There are still no `admin.*` codes.** `route-map.ts:15-17` records that `/admin` is
gated by role, and this spec does not disturb it. This code gates a control on the
dashboard, not a route.

### 4.1 Two places, kept in step by hand

`catalog.ts:6-8` states the rule: add it here, add a row in a new migration.

1. **`apps/web/lib/rbac/catalog.ts`** — a new `// ==== Dashboard ====` block, 42 → 43
   entries. The `PermissionCode` union widens on its own: `as const satisfies` is
   load-bearing and already does this work. The file also states its own size three
   times — `catalog.ts:5`, `:302` and `:305` — and all three become 43.
2. **`apps/backend/src/database/migrations/1855500000000-AddDashboardEmployeesViewPermission.ts`**

```ts
await queryRunner.query(
  `INSERT INTO permissions (id, code, name, description, module, is_active, created_at, updated_at)
   VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())
   ON CONFLICT (code) DO NOTHING`,
  ['dashboard.employees.view', 'View Employee Dashboards',
   "See another employee's My Work dashboard", 'dashboard'],
);
```

`down()` deletes the row by code. Grants disappear with it through the cascade, so
`down()` is genuinely reversible here — unlike `ResetRbacCatalog`, which is one-way.

The timestamp `1855500000000` sorts after `1855400000000-RestrictTaskStatusesToFour`,
the current head.

---

## 5. Backend

### 5.1 The resolver

New export in `apps/backend/src/modules/iam/constants/admin-roles.ts`, beside
`resolveProjectListMemberId` — the same file, because that is where the precedent lives
and where the next person will look:

```ts
/**
 * Whose dashboard is being read.
 *
 * Admins qualify by role; everyone else needs `dashboard.employees.view`. A caller
 * without either gets their OWN id back and the `userId` they sent is ignored —
 * the same silent pin-to-self `resolveProjectListMemberId` applies to the project
 * list. There is no 403: the parameter is not an authorization token, so an
 * unauthorised caller is answered, not refused.
 */
export function resolveDashboardSubjectId(
  roles: string[],
  permissions: string[],
  currentUserId: string,
  options: { userId?: string } = {},
): string {
  const canViewOthers =
    hasAdminBypassRole(roles) || permissions.includes('dashboard.employees.view');
  return canViewOthers && options.userId ? options.userId : currentUserId;
}
```

The code string is duplicated from `catalog.ts` rather than imported. The backend does
not import from `apps/web`, and adding a shared re-export for one string is more
machinery than the risk warrants — the migration is the backend's copy of the catalog
already.

### 5.2 The controller

```
GET /api/v1/dashboard/my-work?userId=<uuid>
```

`@Query('userId', new ParseUUIDPipe({ optional: true })) userId?: string`

`ParseUUIDPipe` is not security — the resolver is. It exists so a typo returns `400`
rather than an empty dashboard that looks like a real answer.

The controller's existing docblock promised this change and named its condition:

> When the admin employee selector arrives it adds a parameter AND the permission check
> that governs it, together.

That paragraph is rewritten to describe what now happens, not what will.

### 5.3 The docblock that becomes false

`scope.sql.ts:16` currently reads:

> `$1` is ALWAYS the subject user id, taken from the JWT. It is never a parameter the
> caller can influence.

After this change the second sentence is untrue, and leaving it would be worse than
having no comment: it tells the next reader that ownership is unreachable from outside
when it is not. It is **replaced**, not deleted:

> `$1` is ALWAYS the subject user id. It is the token holder unless the caller both
> sent a `userId` and passed `resolveDashboardSubjectId` — it is never taken from the
> request raw.

### 5.4 Where the permission list comes from — and why not the token

Found while walking the screen, after the first implementation shipped the
obvious version.

`CurrentUserType.permissions` is baked into the JWT **at login**. The web app
does not use that list to gate the selector: `refreshUser` in
`auth-provider.tsx` calls `/auth/me` on mount and overwrites `roles` and
`permissions` from the database, precisely so "a change a superadmin makes"
reaches the user on their next page load rather than at token expiry.

So a resolver reading `currentUser.permissions` disagrees with the gate that
decides whether the control is even visible. Measured with a single token
minted before a grant: `/auth/me` returned 11 codes including the new one — the
dropdown would render — while `GET /dashboard/my-work?userId=…` still returned
the CALLER's own name and numbers, because the token carried 10. The user picks
a colleague and the page reports their own work under that selection. Never a
leak; the backend refuses correctly. Simply wrong on screen.

This is the first permission code the backend reads at all. Every other code is
gated frontend-only, where the fresh `/auth/me` list is the single source and
nothing can disagree with it. The mismatch is therefore new with this feature,
not pre-existing.

**Resolution.** The controller calls `IamService.getUserPermissions(userId)` —
the same function `/auth/me` uses — and passes that to the resolver.

It runs **only when a `userId` parameter is present**. A dashboard load with no
parameter returns before the lookup, so the common case, which is the first
screen after login for every employee, costs no extra query. Roles still come
from the token: role membership is not what changes here, and the admin bypass
must keep working for `super_admin`, who holds no grants at all.

`resolveDashboardSubjectId` carries a docblock forbidding callers from passing
`CurrentUserType.permissions` back in.

### 5.5 The response names its subject

`MyWorkResponse` gains:

```ts
subject: { userId: string; name: string };
```

Two reasons. The page must state whose work it is showing from data the server
returned, not from the dropdown's local state — those can disagree during a refetch.
And it is what makes check 6 in §7 provable by eye rather than by inference.

`name` is resolved once, in `dashboard.service.ts`, from `users.first_name` and
`users.last_name`. **Not** from the employee profile: `employee_profiles` carries no
name columns at all — verified against the live schema 2026-08-22 — so that source
does not exist. `first_name` is `NOT NULL`; `last_name` is nullable. Added to
`libs/shared/src/types/interfaces/dashboard.interface.ts`, which web and backend both
resolve from local source — **no package publish required**.

---

## 6. Frontend

| Change | File | Why |
|---|---|---|
| `useMyWork(subjectUserId?)` | `hooks/use-my-work.ts` | passes the parameter |
| `dashboardKeys.myWork(subjectUserId?)` | `hooks/dashboard-keys.ts` | **load-bearing** — see §6.1 |
| The selector | `components/my-work-page.tsx` | greeting card, right side |
| Subject banner + reset | `components/my-work-page.tsx` | states whose work, offers the way back |
| Dialog-mode action hidden when viewing another | `components/dashboard-row.tsx`, `components/view-all-drawer.tsx` | decision 4. `project-row.tsx` needs no change — its only action navigates |

### 6.1 The cache key is the one that bites

`dashboardKeys.myWork()` takes no argument today. Adding a subject without adding it to
the key means React Query serves the previous employee's cached dashboard under the new
employee's name — a data leak that looks exactly like a working feature. The key must
carry the subject, and `dashboardKeys.all` must stay the shared root so the existing
follow-up invalidation keeps working.

### 6.2 The selector

Rendered only when `can('dashboard.employees.view')` — hidden otherwise, with a comment
recording that this is the deliberate exception to `can.tsx`'s "clickable controls stay
visible" rule and why (decision 5).

Options come from the existing `GET /employees`:

```
GET /employees?profileKind=staff&status=active&limit=100
```

Resellers are excluded. They are commission-earning externals with GSTIN and bank
details, not holders of an internal work queue. 40 staff fit a plain select.

The option value is the employee's **`userId`**, not its profile id (decision 3). The
employee response already carries it, so no lookup is added.

### 6.3 The selected state

While a subject other than yourself is selected:

- A banner states whose work is on screen, from `response.subject.name`.
- A **Back to my work** control clears the selection.
- The greeting card drops the "Good morning, <you>" line — it is not your morning being
  described.
- The **dialog-mode** action is hidden — that is `complete_followup`, the only control on
  the dashboard that writes. **Navigate-mode** actions stay: they are deep links, and they
  are already permission-gated, so a viewer who lacks `quotes.view` gets the access dialog
  exactly as they would on their own dashboard.

### 6.4 Route gating is untouched

`/` stays `ALWAYS_OPEN` in `route-map.ts`. The page is still your own dashboard by
default, for everyone. The gate belongs on the control, not the route — gating the route
would lock the whole dashboard away from the 40 people it was built for.

---

## 7. Verification

By walking the running app (decision 7). Backend on **8085**. Use `npm run web:build`,
not `web:dev` — dev cannot reach a route behind middleware.

| # | State | Must |
|---|---|---|
| 1 | Signed in as `super_admin` (0 grants) | Dropdown appears. Proves the role bypass, which a `permissions.includes` check alone would fail |
| 2 | Signed in as a role holding no grant | No dropdown anywhere on the page |
| 3 | Grant the code to `project_manager` | Dropdown appears on that user's next page load, and the selector WORKS — no re-login needed (see §5.4) |
| 4 | `curl` the endpoint as a non-holder with `?userId=<someone else>` | Your **own** data returns. No 403, no leak |
| 5 | Select an employee | The follow-up **Complete** control is gone from every row; Open/View deep links still navigate |
| 6 | Select A, then B, then A again | Counts and `subject.name` change every time. Proves the cache key |
| 7 | `?userId=` set to a non-UUID | `400`, not an empty dashboard |
| 8 | Clear the selection | Own dashboard returns, actions come back |

Checks 1, 4 and 6 are the ones that matter: 1 catches the admin-bypass trap, 4 is the
security check, 6 is the cache leak.

Regression gates: `npm run typecheck`, `npm run lint`, `npm run test` — all stay green.

Database access for granting the code:
`docker exec -i oneohm-postgres psql -U root -d oneohm_epc -c "..."`

---

## 8. Known limitations

| # | Limitation | Consequence |
|---|---|---|
| 1 | ~~**Permissions are a login-time JWT snapshot.**~~ **RESOLVED 2026-08-22 — see §5.4.** The original limitation stated that a newly granted code would do nothing until the token refreshed. That is true of the JWT, but not of this feature: the web app already reads fresh permissions from `/auth/me`, and the resolver now reads the same source. A grant takes effect on the next page load. | None. The gate and the check cannot drift. |
| 2 | The grant is org-wide by necessity (decision 6). | Someone holding the code sees every employee, including admins. There is no column that would support narrowing it. |
| 3 | The code string is duplicated in three places — `catalog.ts`, the migration, and `admin-roles.ts`. | The existing catalog already accepts a two-place manual duplication as its model. This adds a third. A typo in the resolver fails closed (nobody but admins passes), which is the safe direction. |
| 4 | The selector reads `GET /employees`, which returns the full `EmployeeResponseDto`. | 40 rows of a heavy DTO to populate a dropdown. Acceptable at this size; if staff numbers grow past a few hundred this wants a light `id + name` endpoint. Not built now. |
| 5 | Read-only is enforced by hiding controls in the web app only. | Consistent with the app's frontend-only model. The endpoints those actions call are unchanged and unguarded, exactly as they are today. This spec does not make that better or worse. |
| 6 | PR #297 is open and unreviewed at the time of writing. | This work builds on that endpoint's subject resolution, which is the part a reviewer is most likely to question. If review reshapes it, this rebases onto shifted ground. |

---

## 9. Out of scope

- **The Business Matrix.** A separate spec. It does not touch this endpoint.
- **Backend RBAC enforcement app-wide.** Unchanged. This spec adds one resolver on one
  endpoint and copies an existing pattern; it is not a first step toward a guard.
- **New unit test files.** Standing instruction.
- **Any `admin.*` code.** `/admin` stays role-gated.
- **A "my team" scope.** No relationship exists to build it from (§3.4).
- **Editing another employee's records from their dashboard.** Decision 4.
