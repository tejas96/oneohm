# Task 7 Legacy IAM Cutover — Deletion Manifest

Execute only when `evaluateCutoverReadiness()` returns `ready: true` and staging sign-off is complete.

## Preconditions

- [ ] `GET/PUT /users/:id/roles` deployed
- [ ] `GET /users?role=<code>` deployed
- [ ] `/auth/me` returns canonical `roles[]`
- [ ] `oneohm-mobile` adapted
- [ ] Staging checklist signed off (`docs/superpowers/verification/fixed-multi-role-cutover-checklist.md`)

## Delete

- `apps/web/app/(dashboard)/admin/roles/**`
- `apps/web/app/(dashboard)/admin/permissions/**`
- `apps/web/components/features/admin/roles/**`
- `apps/web/components/features/admin/permissions/**`
- `apps/web/lib/hooks/resources/roles.ts`
- `apps/web/lib/hooks/resources/permissions.ts`
- `apps/web/components/features/admin/users/components/assign-role-modal.tsx`
- `apps/web/lib/access-control/legacy-compat.ts`
- `apps/web/lib/access-control/fixed-role-feature.ts` (flag helper)
- `NEXT_PUBLIC_FIXED_ROLES_ENABLED` from config

## Rewrite

- `use-filtered-navigation.ts` — remove legacy `hasAccess` branch
- `auth-provider.tsx` — remove `hasPermission` / `permissions[]` paths
- `navigation.ts` — remove `roles`/`permissions` on nav items
- All `isFixedRolesEnabled()` branches — keep fixed path only

## Verify

```bash
npm run typecheck:libs && npm run typecheck:web && npm run web:lint && npm run web:build
rg "hasPermission|PermissionGuard|useRoles|NEXT_PUBLIC_FIXED_ROLES" apps/web
```

Expected: zero matches outside docs and migration notes.
