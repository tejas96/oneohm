# Inventory End-to-End Test & Bug-Fix Plan

Three artifacts, one source of truth. All share step IDs `S-01`..`S-31`.

| File | Audience | What it is |
|------|----------|------------|
| [`01-QA-CHECKLIST.md`](./01-QA-CHECKLIST.md) | QA / manual testers | Human-runnable checklist — every screen, every field (visible + hidden), every button, every KPI, with expected results |
| [`02-DEV-BUGFIX-PLAYBOOK.md`](./02-DEV-BUGFIX-PLAYBOOK.md) | Developers | Paired SQL verification, log greps, expected API contracts, known schema-drift hazards, root-cause recipes |
| [`03-AI-AGENT-SCRIPT.md`](./03-AI-AGENT-SCRIPT.md) | AI agent / automation | Ordered, idempotent prompt blocks: preconditions → UI action → DB assertion → log assertion → on-failure file:line hint → retry |
| [`00-APPENDICES.md`](./00-APPENDICES.md) | All three | Shared reference: endpoint × DTO catalog, hazard list, enum tables, log grep patterns, seeding SQL |

## Run order at a glance

```
Reset DB → Capture golden BOM
   ↓
S-01..S-03   Convert quote → project, Overview tab, default warehouse
S-08..S-11   Inventory Dashboard, Warehouses
S-12         Vendor
S-13..S-14   PO create + receive (seeds stock)
S-04..S-07   BOM tab, extras, Reserve Stock, project allocations
S-15..S-20   Stock list/detail, Transfer, Adjust, Ledger, Low-stock alerts
S-21..S-25   Dispatch lifecycle (prepare → dispatch → deliver → cancel + status-patch hazard)
S-26..S-27   Return stock + return requests
S-28..S-29   Allocations module (list + detail)
S-30..S-31   Vendor follow-through + PO bulk ops
   ↓
Phase 9      Cross-screen number reconciliation
Phase 10     Bug-fix loop until all green
```

## Environment

- Backend running via `npm run backend:dev:watch`; logs at `terminals/1.txt`
- Web at `http://localhost:3001`
- Test user: `sanjay.oneohm@gmail.com` / `test@123`
- DB: `localhost:5432` / `oneohm_epc` / `root`:`root` (from [oneohm/apps/backend/.env](../../../apps/backend/.env) lines 18-22)
- Target quote for conversion: `97e88a3e-61d3-4f01-a342-04489a5d7221`
