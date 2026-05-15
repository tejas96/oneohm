# Developer Bug-Fix Playbook — Inventory E2E

**Audience:** developers triaging defects from `01-QA-CHECKLIST.md` or `03-AI-AGENT-SCRIPT.md`.
**Format:** every `S-NN` lists (1) the API contract, (2) verification SQL, (3) log greps, (4) known hazards and file:line pointers, (5) root-cause recipe when the assertion fails.
**Cross-refs:** endpoints/DTOs in [`00-APPENDICES.md`](./00-APPENDICES.md) Appendix A; hazards in Appendix B.

---

## How to use this playbook

For every failing assertion the QA checklist reports:

1. **Reproduce** with the SQL + curl snippets in this file
2. **Classify** against Appendix B hazards (each `S-NN` lists which apply)
3. **Locate root cause** via the file:line pointers
4. **Fix at root level** — entity + DTO + migration (preferred); OR controller guard; OR service alignment; never patch at the UI
5. **Re-run** the failing `S-NN` plus all downstream steps
6. **Document** the fix in the defect ticket; update Appendix B if a new hazard is found

---

## S-01 Convert quote → project

**Endpoint:** `POST /api/v1/projects/convert-from-quote/97e88a3e-61d3-4f01-a342-04489a5d7221`
**Controller:** [oneohm/apps/backend/src/modules/projects/controllers/project.controller.ts](../../../apps/backend/src/modules/projects/controllers/project.controller.ts) lines 226–247
**Service:** [oneohm/apps/backend/src/modules/projects/services/project.service.ts](../../../apps/backend/src/modules/projects/services/project.service.ts)

### Verification SQL

```sql
-- 1. Project row created
SELECT id, project_number, name, status, priority, property_id, quote_id, default_warehouse_id, created_at
FROM projects WHERE quote_id='97e88a3e-61d3-4f01-a342-04489a5d7221';

-- 2. Property flipped to converted
SELECT id, status FROM customer_property
WHERE id = (SELECT property_id FROM quotes WHERE id='97e88a3e-61d3-4f01-a342-04489a5d7221');

-- 3. Quote status preserved as 'accepted' (intentional)
SELECT id, status FROM quotes WHERE id='97e88a3e-61d3-4f01-a342-04489a5d7221';

-- 4. Project BOM created
SELECT b.id, b.bom_number, b.entity_type, b.entity_id, b.total_items, b.total_cost, b.allocation_status
FROM bom b JOIN projects p ON p.id=b.entity_id AND b.entity_type='project'
WHERE p.quote_id='97e88a3e-61d3-4f01-a342-04489a5d7221';

-- 5. BOM items match golden BOM 1:1
SELECT item_type, product_id, name, quantity, unit, unit_price, total_price, group_key, unit_index
FROM bom_items
WHERE bom_id = (SELECT b.id FROM bom b JOIN projects p ON p.id=b.entity_id AND b.entity_type='project' WHERE p.quote_id='97e88a3e-61d3-4f01-a342-04489a5d7221')
ORDER BY sort_order, item_type, unit_index;
-- Compare to Appendix E.3 golden BOM
```

### Log greps

```bash
rg -n "Failed to copy BOM from quote version|Skipping payment-term snapshot|QueryFailedError" terminals/1.txt
```

### Hazards in play

- **Hazard #5** — `BomService.copyQuoteBomToProject` swallows errors. If query #4 returns 0 rows, conversion succeeded but BOM is missing.

### Root-cause recipe (BOM missing after conversion)

1. Grep `Failed to copy BOM from quote version` in `terminals/1.txt` — the message includes the underlying error
2. Inspect [`project.service.ts` lines 1063–1068](../../../apps/backend/src/modules/projects/services/project.service.ts) — the try/catch swallows the error
3. **Workaround:** call `POST /projects/:id/sync-bom` (will reconcile from latest quote calculation)
4. **Permanent fix options:**
   - Move `copyQuoteBomToProject` INTO the conversion transaction (`orchestrateProjectCreation`) so failure rolls back the project
   - OR throw to the caller and let it 500 (rare/loud failure preferred over silent partial success)
   - OR keep silent-fail but emit a domain event so an out-of-band reconciler creates the BOM

### Failure modes (expected 4xx)

| Condition | HTTP | Where |
|-----------|------|-------|
| `quote.status !== ACCEPTED` | 400 | service preconditions |
| Property missing | 404 | property load |
| `property.status === CONVERTED` | 400 | property guard |
| Project already exists for property | 400 | findOneByPropertyId |
| Duplicate `workflowStepId` in `taskAssignments` | 400 | task assignment validator |
| Assignee not in team | 400 | task assignment validator |

---

## S-02 Project Overview tab

**Primary endpoint:** `GET /api/v1/projects/:id`
**Computed fields source:** `ProjectResponseDto` `@Transform` from latest `quote_versions`

### Verification SQL

```sql
-- Confirm derived fields source
SELECT p.progress_percentage,
       qv.system_size_kw, qv.project_type, qv.final_price
FROM projects p
LEFT JOIN LATERAL (
  SELECT * FROM quote_versions WHERE quote_id=p.quote_id
  ORDER BY created_at DESC, version_number DESC LIMIT 1
) qv ON TRUE
WHERE p.id=:project_id;
```

### Failure ⇒ root cause

| Symptom | Likely root cause | Fix |
|---------|-------------------|-----|
| System size missing | Latest quote_version has `system_size_kw IS NULL` | Inspect calculator persistence; re-run quote calc |
| Materials % shows 0 always | Procurement endpoint not loaded or no `expense_product_links` | Confirm `useBomProcurementStatus(projectId)` resolved; seed expenses |
| Progress ring stuck at 0 | `recomputeProgress` not triggered after task status changes | Inspect `project.service.ts` `recomputeProgressFromTasks` callers |
| Next Action panel never resolves from skeleton | `useProjectAttention` or `useProjectReceiptSummary` errored | Network tab for 4xx; check guard permissions |

---

## S-03 Set default warehouse

**Endpoint:** `PATCH /api/v1/projects/:id` body `{ "defaultWarehouseId": "<uuid>" }`

### Verification SQL

```sql
SELECT id, default_warehouse_id FROM projects WHERE id=:project_id;
```

### Hazards

- If FK invalid → SQL FK constraint error. `ON DELETE SET NULL` ensures deleting the warehouse later just nulls this column, not the project.

---

## S-04 BOM tab inspection

**Endpoints:**
- `GET /api/v1/bom?entityType=project&entityId=:projectId`
- `GET /api/v1/bom/project/:projectId/procurement-status`

### Verification SQL

```sql
-- Allocation status rollup
SELECT id, allocation_status, total_items, total_cost FROM bom
WHERE entity_type='project' AND entity_id=:project_id;

-- Over-dispatched flag check
SELECT id, name, product_id, quantity, specifications
FROM bom_items
WHERE bom_id=:bom_id AND specifications->>'overDispatched'='true';
```

### Hazards

- Hazard #7: `bom_id`, `returned_at` not exposed on allocation list responses — be aware when correlating UI to DB

---

## S-05 Extra BOM items (3 kW scenario)

**Important:** UI does NOT have a control to add ad-hoc BOM lines. Insertion must happen via SQL or via re-running quote calc with bumped quantities.

### SQL for Path 1 (direct insert)

```sql
INSERT INTO bom_items (id, bom_id, item_type, name, quantity, unit, unit_price, total_price, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), b.id, 'accessory', 'TEST Extra DC Wire', 10, 'm', 25, 250, 999, now(), now()
FROM bom b
JOIN projects p ON p.id=b.entity_id AND b.entity_type='project'
WHERE p.quote_id='97e88a3e-61d3-4f01-a342-04489a5d7221';
```

### Failure ⇒ root cause

| Symptom | Cause |
|---------|-------|
| Ad-hoc line doesn't reserve | Has `product_id IS NULL` → `allocateForProduct` skips |
| Procurement section unchanged after expense | `expense_product_links` row missing or `pe.deleted_at IS NOT NULL` |

---

## S-06 Reserve Stock

**Endpoint:** `POST /api/v1/bom/:bomId/allocate-pending` (permission `bom:finalize`)
**Service:** [`bom.service.ts` `allocatePending` / `allocateForProduct`](../../../apps/backend/src/modules/bom/services/bom.service.ts) lines ~578–697

### Verification SQL (run per product)

```sql
-- Stock movement
SELECT warehouse_id, product_id, available_quantity, reserved_quantity, in_transit_quantity, updated_at
FROM inventory_stock
WHERE warehouse_id=:wh_id AND product_id=:product_id;

-- Allocation row
SELECT id, bom_id, project_id, warehouse_id, product_id, allocated_quantity, dispatched_quantity, returned_quantity, status, allocated_at
FROM stock_allocations
WHERE bom_id=:bom_id AND product_id=:product_id AND status<>'cancelled';

-- Ledger row
SELECT * FROM inventory_transactions
WHERE reference_type='stock_allocation' AND reference_id=:allocation_id
ORDER BY transaction_date DESC LIMIT 5;

-- BOM rollup
SELECT id, allocation_status FROM bom WHERE id=:bom_id;
```

### Failure modes

| HTTP | Reason | Service file:line |
|------|--------|--------------------|
| 404 | BOM id unknown | `bom.service.ts` findById |
| 400 | BOM not `entity_type='project'` | guard |
| 400 | No BOM items | guard |
| 400 | `projects.default_warehouse_id` NULL | `bom.service.ts` lines ~507–510 |
| 409 | Active allocation exists at DIFFERENT warehouse | partial unique index + service check |

### Hazards

- **Hazard #7**: response DTO hides `bom_id`, `returned_at`. If automation needs them, query DB.

### Root-cause recipe (numbers off after reserve)

1. Compute expected delta: `min(BOM_required - already_allocated, available_quantity)`
2. Compare to actual `available_quantity` and `reserved_quantity` delta
3. If lock contention suspected: check service uses `setLock('pessimistic_write')` on inventory_stock; if not, race condition possible
4. If second click DOES create duplicate allocation row → migration index `uniq_stock_alloc_bom_product_active` missing; verify migration `1831000000000-RestructureBomAllocationLinking` ran:

```sql
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename='stock_allocations' AND indexname='uniq_stock_alloc_bom_product_active';
```

---

## S-07 Project Allocations tab

**Endpoints:**
- `GET /api/v1/stock-allocations/project/:projectId` and `?projectId=…` variant
- `POST /api/v1/stock-allocations` (CreateStockAllocationDto)

### Hazard #8

`CreateStockAllocationDto` has no `bomId` field. Confirm with:

```sql
-- Manual allocations are orphan from BOM rollup
SELECT id, project_id, product_id, bom_id, status FROM stock_allocations
WHERE project_id=:project_id AND bom_id IS NULL;
```

### Root-cause recipe (if BOM allocation_status doesn't include manual allocation)

By design — `recomputeAllocationStatus` queries `WHERE bom_id=:bom_id`. The fix at root level:

1. Add `bomId` to `CreateStockAllocationDto` (optional UUID)
2. Wire controller to accept it and pass to service
3. Update UI Create Allocation dialog to optionally pick a BOM line

---

## S-08 Inventory Dashboard

**Endpoints:** mostly `/inventory-stock/stats/*`, `/purchase-orders/stats/*`, `/stock-allocations/stats/*`, `/material-dispatches/stats/*`, `/inventory-transactions/recent`

### Reconciliation SQL — see Phase 9 (this playbook §9)

### Common defect (TimeWindowPicker)

- Custom range with `fromDate > toDate` should fail validation client-side; if it submits → fix in `TimeWindowPicker` validation
- All `/stats/*` endpoints respect `fromDate`/`toDate` query params; if window doesn't change numbers → check repo layer applies filter

---

## S-09..S-11 Warehouses

### Verification

```sql
-- After create (S-10)
SELECT * FROM warehouses WHERE code=:code AND deleted_at IS NULL;

-- Duplicate code: must 409 from DB unique constraint
SELECT conname, contype FROM pg_constraint
WHERE conrelid='warehouses'::regclass AND contype='u';
```

### Hazards none specific; standard CRUD

---

## S-12 Create vendor

**Endpoint:** `POST /api/v1/vendors`
**Service:** `vendor.service.ts`

### Verification

```sql
SELECT id, name, code, vendor_type, status, gstin, pan, credit_days, rating
FROM vendors WHERE code=:code AND deleted_at IS NULL;
```

### Defect — status not persisting

If status select changes but `vendors.status` unchanged: confirm UI uses `PATCH /vendors/:id/status` (NOT `PATCH /vendors/:id` — `UpdateVendorDto` has no `status` field). Fix at UI: route status changes through the dedicated endpoint.

---

## S-13 Create PO

**Endpoint:** `POST /api/v1/purchase-orders`
**Service:** [`purchase-order.service.ts`](../../../apps/backend/src/modules/inventory/services/purchase-order.service.ts)

### Verification SQL

```sql
SELECT po.id, po.po_number, po.vendor_id, po.warehouse_id, po.project_id, po.po_type,
       po.subtotal, po.tax_amount, po.total_amount, po.status, po.payment_status
FROM purchase_orders po WHERE po.id=:po_id;

SELECT product_id, ordered_quantity, received_quantity, unit_price, tax_rate, line_total
FROM purchase_order_items WHERE purchase_order_id=:po_id;
```

### Server recompute check

Client may send `subtotal`, `taxAmount`, `totalAmount` but service ignores them and recomputes from items. Manufactured defect test:

```bash
curl -X POST .../purchase-orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"vendorId":"...","subtotal":999999,"totalAmount":999999,"items":[{"productId":"...","orderedQuantity":2,"unitPrice":100,"lineTotal":200}]}'
```

DB row must show `subtotal=200`, `totalAmount=200` (plus tax) — NOT 999999.

### Conditional validation

When `poType='project_specific'`, `projectId` must be present. Schema enforces server-side; verify by sending null projectId with `project_specific` → 400.

---

## S-14 PO lifecycle

**Endpoints:** `submit`, `approve`, `send`, `receive`, `cancel`, `record-payment`

### Receive SQL verification

```sql
-- PO status + dates after partial receive
SELECT id, status, actual_delivery_date FROM purchase_orders WHERE id=:po_id;
-- expect: status='partially_received' OR 'received', actual_delivery_date set

-- Items received cap
SELECT id, ordered_quantity, received_quantity FROM purchase_order_items WHERE purchase_order_id=:po_id;
-- received <= ordered always

-- Stock added
SELECT * FROM inventory_stock WHERE warehouse_id=:wh_id AND product_id=:product_id;
-- available_quantity increased

-- Ledger
SELECT * FROM inventory_transactions
WHERE reference_type='purchase_order' AND reference_id=:po_id
ORDER BY transaction_date DESC;
-- transaction_type='purchase', quantity=received_quantity_this_call
```

### Receive failure modes

| HTTP | Reason |
|------|--------|
| 400 | PO status not in `approved`/`sent`/`confirmed`/`partially_received` |
| 400 | `warehouseId` missing on PO |
| 400 | `receivingDate` missing |
| 400 | All items have qty 0 |

---

## S-15..S-16 Stock list & detail

### Hazard #2 explicit query

```sql
-- in_transit_quantity should be 0 if no manual seeding, even after dispatches
SELECT product_id, available_quantity, reserved_quantity, in_transit_quantity
FROM inventory_stock WHERE warehouse_id=:wh_id;
```

If UI shows non-zero In Transit anywhere: confirm via `git grep` that no code writes `inTransitQuantity`. Either:
- **Fix forward:** add increment in `markDispatched` and decrement in `markDelivered` (touches `material-dispatch.service.ts`)
- **Fix backward:** drop the column from API/DTO; reflect "in transit" only via `material_dispatches.status` aggregates

---

## S-17 Transfer stock

**Endpoint:** `POST /api/v1/inventory-stock/transfer`
**Service:** [`stock-transfer.service.ts`](../../../apps/backend/src/modules/inventory/services/stock-transfer.service.ts) `transferStock`

### Verification SQL

```sql
-- Source delta
SELECT available_quantity FROM inventory_stock WHERE warehouse_id=:from_wh AND product_id=:product_id;

-- Dest delta (row may have been upserted)
SELECT available_quantity, minimum_stock_level, maximum_stock_level
FROM inventory_stock WHERE warehouse_id=:to_wh AND product_id=:product_id;

-- Two ledger rows
SELECT transaction_type, warehouse_id, from_warehouse_id, to_warehouse_id, quantity, reference_type, reference_id
FROM inventory_transactions
WHERE reference_type='warehouse_transfer'
  AND (warehouse_id=:from_wh OR warehouse_id=:to_wh)
ORDER BY transaction_date DESC LIMIT 2;
-- Expect: one transfer_out (warehouse_id=from, reference_id=to_wh)
-- and one transfer_in (warehouse_id=to, reference_id=from_wh)
```

### Defect — missing success toast

By design (hook). If product wants success toast, edit `useStockMutations` → `transfer.onSuccess` to call `showToast.success('Stock transferred')`.

---

## S-18 Adjust stock

**Endpoint:** `POST /api/v1/inventory-stock/adjust`

### Verification

```sql
SELECT available_quantity FROM inventory_stock WHERE id=:stock_id;
-- equals StockAdjustmentDto.newQuantity

SELECT transaction_type, quantity, reference_type, reference_id, notes
FROM inventory_transactions
WHERE reference_type='manual_adjustment' AND reference_id=:stock_id
ORDER BY transaction_date DESC LIMIT 1;
-- transaction_type='adjustment'
-- notes LIKE '%[REASON: ...]%'
-- quantity = ABS(newQuantity - oldAvailable)
```

---

## S-19 Transaction Ledger

**Endpoint:** `GET /api/v1/inventory-transactions?…filters`

### Reference-routing test

```sql
-- Each reference_type should map to an existing parent row
SELECT DISTINCT reference_type FROM inventory_transactions WHERE organization_id=:org;
```

Expect values: `purchase_order`, `stock_allocation`, `material_dispatch`, `warehouse_transfer`, `manual_adjustment`, `stock_allocation_return`. Any other value → upstream wrote an unknown reference_type and UI can't route → defect.

---

## S-20 Low Stock alerts — Hazard #6

### Reproduce

1. Create two test roles: one with `purchaseOrder:write` only, one with `purchase-order:write` only
2. Login as each
3. On `/inventory/alerts`: alert page button visible if role has `purchaseOrder:write`
4. On `/inventory/purchase-orders`: create button visible if role has `purchase-order:write`
5. Inconsistent → file defect

### Fix

Pick the canonical permission name (recommend `purchase-order:write`, kebab matches rest) and update [`inventory-alerts-page.tsx`](../../../apps/web/components/features/inventory/inventory-alerts-page.tsx) to use it. Add a unit test asserting both pages read the same constant.

---

## S-21 Create dispatch

**Endpoint:** `POST /api/v1/material-dispatches`

### Verification

```sql
SELECT id, dispatch_number, project_id, warehouse_id, status, dispatch_date, vehicle_number, driver_name
FROM material_dispatches WHERE id=:dispatch_id;
-- status='prepared'

SELECT product_id, stock_allocation_id, quantity, batch_number, serial_numbers
FROM material_dispatch_items WHERE dispatch_id=:dispatch_id;
```

---

## S-22 Mark dispatched

**Endpoint:** `POST /api/v1/material-dispatches/:id/mark-dispatched`
**Service:** [`material-dispatch.service.ts` `markDispatched`](../../../apps/backend/src/modules/inventory/services/material-dispatch.service.ts)

### Verification (per item)

```sql
-- Dispatch status moved
SELECT status FROM material_dispatches WHERE id=:d_id;
-- expect: 'in_transit'

-- Reserved decreased
SELECT reserved_quantity FROM inventory_stock
WHERE warehouse_id=:wh_id AND product_id=:product_id;

-- Allocation dispatched_quantity advanced
SELECT id, allocated_quantity, dispatched_quantity, returned_quantity, status
FROM stock_allocations WHERE id=:alloc_id;

-- Ledger
SELECT * FROM inventory_transactions
WHERE reference_type='material_dispatch' AND reference_id=:d_id;
-- transaction_type='dispatch'
```

### Hazard #4 contrast test

Compare against `PATCH /material-dispatches/:id/status` body `{ status: "dispatched" }` — the status-patch path does NOT mutate `inventory_stock` or `stock_allocations` (see S-25).

---

## S-23 Mark delivered

**Endpoint:** `POST /api/v1/material-dispatches/:id/mark-delivered`

### Verification

```sql
SELECT status, actual_delivery_date, received_by FROM material_dispatches WHERE id=:d_id;
-- received_by stores UUID as string (field type is varchar(255))

-- Allocation completion
SELECT id, status, allocated_quantity, dispatched_quantity FROM stock_allocations
WHERE id IN (SELECT stock_allocation_id FROM material_dispatch_items WHERE dispatch_id=:d_id AND stock_allocation_id IS NOT NULL);
-- expect: status='completed' WHERE dispatched_quantity >= allocated_quantity
```

---

## S-24 Cancel dispatch

**Endpoint:** `POST /api/v1/material-dispatches/:id/cancel` body `{reason}`

### Verification

```sql
-- Reserved restored
SELECT warehouse_id, product_id, available_quantity, reserved_quantity
FROM inventory_stock WHERE warehouse_id=:wh_id AND product_id IN (...);

-- Allocation reverted
SELECT id, dispatched_quantity, status FROM stock_allocations WHERE id IN (...);

-- Ledger
SELECT * FROM inventory_transactions
WHERE notes ILIKE '%dispatch cancel%'
ORDER BY transaction_date DESC LIMIT 5;
```

---

## S-25 Status-patch hazard (Hazard #4) — explicit defect surface

### Reproduce

```bash
# Get auth token, then:
curl -X PATCH http://localhost:3000/api/v1/material-dispatches/<d_id>/status \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"dispatched"}'
```

### SQL evidence

```sql
-- Before: snapshot
SELECT id, status FROM material_dispatches WHERE id=:d_id;
SELECT warehouse_id, product_id, reserved_quantity FROM inventory_stock WHERE warehouse_id=:wh_id;

-- After: status changed BUT reserved unchanged → defect confirmed
```

### Fix

Move the inventory side-effects out of `markDispatched` / `cancel` into reusable handlers triggered by status transitions in [`dispatch-status-machine.ts`](../../../apps/backend/src/modules/inventory/services/helpers/dispatch-status-machine.ts) so that **any** path producing a status change runs the right effects. Either:

1. Have `MaterialDispatchService.updateStatus` call the same internal helpers as `markDispatched` / `cancel` based on the new state, OR
2. Lock down `PATCH /:id/status` to non-stock-affecting transitions only (e.g. `prepared` → `cancelled` is fine; `prepared` → `dispatched` blocked, must use `/mark-dispatched`)

---

## S-26 Return stock

**Endpoint:** `POST /api/v1/stock-allocations/:id/return`
**Service:** `stock-allocation.service.ts` `returnToStock`

### Verification

```sql
SELECT id, allocated_quantity, dispatched_quantity, returned_quantity, returned_at, status
FROM stock_allocations WHERE id=:alloc_id;

SELECT * FROM inventory_transactions
WHERE reference_type='stock_allocation_return' AND reference_id=:alloc_id
ORDER BY transaction_date DESC LIMIT 1;
-- transaction_type='return'

SELECT available_quantity FROM inventory_stock WHERE warehouse_id=:wh_id AND product_id=:product_id;
-- increased
```

---

## S-27 Return-requests workflow

**Trigger:** BOM reconcile when required qty < dispatched qty → `bom.service.ts` lines ~420–458 inserts `return_requests` row.

**Endpoints:** `POST /api/v1/inventory/return-requests`, `PATCH …/:id/complete`, `PATCH …/:id/cancel`

### Verification

```sql
-- After triggering
SELECT id, allocation_id, bom_id, quantity, reason, status, completed_at, completed_by, created_by
FROM return_requests WHERE bom_id=:bom_id ORDER BY created_at DESC;

-- BOM item flag
SELECT id, name, specifications FROM bom_items
WHERE bom_id=:bom_id AND specifications->>'overDispatched'='true';

-- After complete: stock comes back
SELECT available_quantity, reserved_quantity FROM inventory_stock WHERE …;
```

### Field reuse note

`return_requests.completed_by` is overloaded — on `cancel` action, the `cancelledBy` user id is stored there. This is a documented hazard; cleanest fix:

1. Add `cancelled_by uuid NULLABLE` and `cancelled_at timestamptz NULLABLE` columns via migration
2. Update `ReturnRequestService.cancel` to write the new fields instead of overloading `completed_by`

---

## S-28 Allocations list

**Endpoint:** `GET /api/v1/stock-allocations?…`

### Inline fulfill verification

```sql
-- Before
SELECT id, allocated_quantity, dispatched_quantity, status FROM stock_allocations WHERE id=:alloc_id;
-- After fulfill: dispatched_quantity += confirmed amount, status advanced
```

### Funnel reconciliation

```sql
SELECT status, COUNT(*) FROM stock_allocations
WHERE organization_id=:org_id GROUP BY status;
-- compare to /stock-allocations/stats/funnel response
```

---

## S-29 Allocation detail + Hazard #1 hunt

**Endpoint:** `PATCH /api/v1/stock-allocations/:id` body `EditAllocationDetailsDto`

### Hazard #1 reproduce

```bash
curl -X PATCH http://localhost:3000/api/v1/stock-allocations/<id> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"expectedDispatchDate":"2026-06-01"}'
```

### Expected outcomes (each pathological)

| Outcome | Diagnosis | Fix |
|---------|-----------|-----|
| 500 with `QueryFailedError: column "expectedDispatchDate" does not exist` | TypeORM strict mode | Add column via migration + entity decorator + expose in response DTO |
| 200 but DB unchanged | TypeORM silently drops unknown property | Same fix — add column |
| 200 and DB has new column | Schema was added later — playbook out of date | Update Appendix B to drop Hazard #1 |

### Permanent fix (preferred)

1. Create migration: `ALTER TABLE stock_allocations ADD COLUMN expected_dispatch_date date NULL;`
2. Add `@Column({ name: 'expected_dispatch_date', type: 'date', nullable: true }) expectedDispatchDate?: Date;` to `StockAllocationEntity`
3. Add `@Expose() expectedDispatchDate?: Date;` to `StockAllocationResponseDto`
4. Add migration `1832000000000-AddExpectedDispatchDateToAllocation.ts`

---

## S-30 Vendor follow-through

### Verification

```sql
-- Project-vendor link
SELECT * FROM project_vendors WHERE vendor_id=:vendor_id;

-- Vendor PO history
SELECT po.id, po.po_number, po.total_amount, po.status
FROM purchase_orders po
WHERE po.vendor_id=:vendor_id AND po.deleted_at IS NULL;
```

---

## S-31 PO bulk operations

**Endpoints:**
- `POST /api/v1/purchase-orders/bulk/approve` body `BulkIdsDto`
- `POST /api/v1/purchase-orders/bulk/cancel` body `BulkCancelDto`

### Verification

```sql
SELECT id, status FROM purchase_orders WHERE id = ANY(:ids::uuid[]);
```

### Log inspection

```bash
rg -n "\\[PO\\.bulkApprove\\]|\\[PO\\.bulkCancel\\]" terminals/1.txt
# Each failed id has a line: [PO.bulkApprove] id=<uuid> failed: <reason>
```

### Response shape

```json
{
  "succeeded": ["uuid1", "uuid2"],
  "failed": [{ "id": "uuid3", "reason": "PO must be in pending_approval" }]
}
```

If UI swallows the `failed` array → file UX defect: show partial-failure toast or list.

---

## Phase 9 — Reconciliation queries (full SQL set)

See [`00-APPENDICES.md`](./00-APPENDICES.md) §E.4 for the canonical queries. Run all 12 and record results in `01-QA-CHECKLIST.md` Phase 9 table.

---

## Phase 10 — Bug-fix loop (developer methodology)

### 10.1 Triage funnel

```
Defect arrives
   ↓
Reproduce via SQL + curl in this playbook
   ↓
Classify against Appendix B hazards
   ↓
   ├─ Known hazard #N → apply documented fix recipe
   └─ New hazard → root-cause via file:line trace, add to Appendix B
```

### 10.2 Root-cause triangulation pattern

For data-integrity defects (UI number ≠ DB number):

1. **UI**: open browser devtools → network tab → capture API response JSON
2. **API**: response DTO `@Expose` set determines which fields ship; check the corresponding `*-response.dto.ts`
3. **DB**: run the entity-level SELECT from this playbook
4. **Service**: read the service method that wrote the row (file:line in §A pointers)

Walk: **UI value comes from API field X → API field X comes from `plainToInstance(Dto, entity)` → entity field comes from service method Y → service method Y was called from controller endpoint Z**. The mismatch lives at exactly one of those arrows.

### 10.3 Schema-drift fixes (preferred order)

1. Entity column missing for DTO field → add migration + `@Column` + expose in response DTO (Hazard #1)
2. DTO field missing for entity column → add `@Expose` to response DTO + optional `@Column` decorator in request DTO (Hazard #7)
3. Service writes to inconsistent state machine → align with helper (Hazard #4)
4. Permission string typo → centralize in a constants module so a typo wouldn't compile (Hazard #6)

### 10.4 Re-test policy after fix

1. Re-run the failing `S-NN`
2. Re-run every `S-NN` that has the failing one as a precondition (per the execution order in README)
3. Re-run Phase 9 reconciliation fully
4. Mark fix complete only when all 12 reconciliation rows + all 31 steps pass in one clean run

### 10.5 Regression test addition

For every novel root cause found:

- Add an integration test under `oneohm/apps/backend/test/inventory/` reproducing the defect (red), then asserting the fix (green)
- Add or expand a Cypress E2E test for the UI surface
- Add the new hazard to [`00-APPENDICES.md`](./00-APPENDICES.md) Appendix B
