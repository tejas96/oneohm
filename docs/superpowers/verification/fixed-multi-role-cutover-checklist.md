# Fixed Multi-Role Cutover Checklist

Use this checklist during staging verification before Task 7 cutover.

## Environment

- [ ] Build ID / commit SHA recorded
- [ ] `NEXT_PUBLIC_FIXED_ROLES_ENABLED=true` in staging only
- [ ] Backend role endpoints deployed

## Role matrix (manual)

For each role set, record pass/fail with evidence:

| Role set | Nav visible | Denied click | Direct URL | Authorized actions | API 403 | Notes |
|----------|-------------|--------------|------------|-------------------|---------|-------|
| Guest | | | | | | |
| Sales | | | | | | |
| Store | | | | | | |
| Dispatch | | | | | | |
| Designer + Execution | | | | | | |
| Finance + Loan | | | | | | |
| HR | | | | | | |
| Admin | | | | | | |
| Superadmin | | | | | | |

## Governance scenarios

- [ ] Admin denied owner-role toggles
- [ ] Superadmin can manage owner roles
- [ ] Self owner-role removal blocked
- [ ] Last Superadmin removal blocked
- [ ] Concurrent role edit returns 409

## Edge cases

- [ ] Guest notification denial
- [ ] Unsupported adapter disables Save
- [ ] Stale tab refreshes roles on focus
- [ ] Legacy codes display without granting access
- [ ] Unimplemented routes remain unavailable
- [ ] HR create without role assignment

## Static audits

```bash
npm run typecheck:libs
npm run typecheck:web
npm run web:lint
npm run web:build
rg "hasPermission|PermissionGuard|<Can|useResourcePermissions" apps/web
```

## Sign-off

- Reviewer:
- Date:
- Approved for cutover: Yes / No
