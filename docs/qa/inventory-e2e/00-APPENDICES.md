# Appendices (shared by all three artifacts)

## Appendix A — Endpoint × DTO reference

All paths are relative to `/api/v1/`. Every endpoint uses `JwtAuthGuard` + `PermissionGuard` and is organization-scoped via `@OrganizationContext()`.

### A.1 Warehouses — `/warehouses`

| Method | Path | Permission |
|--------|------|------------|
| GET | `warehouses/stats/summary` | `inventory:read` |
| POST | `warehouses` | `inventory:write` |
| GET | `warehouses?page&limit&status&warehouseType&warehouseManagerId&search` | `inventory:read` |
| GET | `warehouses/:id` | `inventory:read` |
| PATCH | `warehouses/:id` | `inventory:write` |
| DELETE | `warehouses/:id` | `inventory:write` |
| PATCH | `warehouses/:id/status` body `{status}` | `inventory:write` |

**`CreateWarehouseDto`** — required: `name`, `code`. Optional: `address`, `city`, `state`, `country`, `pincode`, `coordinates`, `warehouseType`, `warehouseManagerId`, `contactPerson`, `phone`, `email`, `status`.

**`UpdateWarehouseDto`** — all optional EXCEPT no `status` (use `/status` route).

### A.2 Vendors — `/vendors`

| Method | Path | Permission |
|--------|------|------------|
| GET | `vendors/stats/summary` | `inventory:read` |
| POST | `vendors` | `inventory:write` |
| GET | `vendors?page&limit&status&vendorType&search` | `inventory:read` |
| GET | `vendors/:id` | `inventory:read` |
| PATCH | `vendors/:id` | `inventory:write` |
| DELETE | `vendors/:id` | `inventory:write` |
| PATCH | `vendors/:id/status` body `{status}` | `inventory:write` |
| PATCH | `vendors/:id/rating` body `{rating}` | `inventory:write` |

**`CreateVendorDto`** — required: `name`, `code`. Optional: `vendorType`, `contactPerson`, `email`, `phone`, `alternatePhone`, `address`, `city`, `state`, `country`, `pincode`, `gstin`, `pan`, `paymentTerms`, `creditDays`, `bankName`, `accountNumber`, `ifscCode`, `status`, `rating`, `notes`.

### A.3 Purchase Orders — `/purchase-orders`

| Method | Path | Permission |
|--------|------|------------|
| POST | `purchase-orders/bulk/approve` body `BulkIdsDto` | `purchase-order:approve` |
| POST | `purchase-orders/bulk/cancel` body `BulkCancelDto` | `purchase-order:write` |
| GET | `purchase-orders/stats/{summary,spend-trend,top-vendors,spend-by-warehouse,outstanding-by-vendor}` | `inventory:read` |
| GET | `purchase-orders/overdue/list` | `inventory:read` |
| POST | `purchase-orders` | `purchase-order:write` |
| GET | `purchase-orders?...filters` | `inventory:read` |
| GET | `purchase-orders/:id` | `inventory:read` |
| PATCH | `purchase-orders/:id` | `purchase-order:write` |
| DELETE | `purchase-orders/:id` | `purchase-order:write` |
| POST | `purchase-orders/:id/submit` | `purchase-order:submit` |
| POST | `purchase-orders/:id/approve` | `purchase-order:approve` |
| POST | `purchase-orders/:id/send` | `purchase-order:send` |
| POST | `purchase-orders/:id/receive` body `ReceivePurchaseOrderDto` | `purchase-order:receive` |
| POST | `purchase-orders/:id/record-payment` body `RecordPaymentDto` | `purchase-order:write` |
| POST | `purchase-orders/:id/cancel` body `{reason}` | `purchase-order:write` |

**`CreatePurchaseOrderDto`** — required: `vendorId`, `subtotal`, `totalAmount`, `items[]`. Optional: `warehouseId`, `projectId`, `poDate`, `poType`, `expectedDeliveryDate`, `taxAmount`, `paymentTerms`, `paymentStatus`, `notes`, `termsConditions`.
**Note:** server recomputes financials and IGNORES client-sent subtotal/taxAmount/totalAmount.

**`CreatePurchaseOrderItemDto`** — required: `productId`, `orderedQuantity`, `unitPrice`, `lineTotal`. Optional: `taxRate`, `notes`.

**`ReceivePurchaseOrderDto`** — required: `items[]`, `receivingDate`. Optional: `grnNumber`, `notes`.
**`ReceiveItemDto`** — required: `itemId`, `quantityReceived`. Optional: `quantityRejected`, `notes`.

### A.4 Inventory Stock — `/inventory-stock`

| Method | Path | Permission |
|--------|------|------------|
| GET | `inventory-stock?page&limit&warehouseId&productId&lowStock&search&sortBy&sortOrder` | `inventory:read` |
| GET | `inventory-stock/warehouse/:warehouseId/product/:productId` | `inventory:read` |
| GET | `inventory-stock/warehouse/:warehouseId?page&limit&lowStock&search` | `inventory:read` |
| GET | `inventory-stock/product/:productId` | `inventory:read` |
| GET | `inventory-stock/alerts/low-stock` | `inventory:read` |
| POST | `inventory-stock/update` body `UpdateStockDto` | `inventory:write` |
| POST | `inventory-stock/transfer` body `StockTransferDto` | `stock:transfer` |
| POST | `inventory-stock/adjust` body `StockAdjustmentDto` | `stock:adjust` |
| GET | `inventory-stock/stats/{total-value,by-warehouse,top-low-stock}` | `inventory:read` |
| GET | `inventory-stock/:id` | `inventory:read` |

**`StockTransferDto`** — required: `fromWarehouseId`, `toWarehouseId`, `productId`, `quantity`. Optional: `notes`.

**`StockAdjustmentDto`** — required: `warehouseId`, `productId`, `newQuantity`, `reason`.

### A.5 Inventory Transactions (read-only) — `/inventory-transactions`

| Method | Path | Permission |
|--------|------|------------|
| GET | `inventory-transactions/stats/{summary,by-type-trend}` | `inventory:read` |
| GET | `inventory-transactions/recent` | `inventory:read` |
| GET | `inventory-transactions/product/:productId/history?page&limit` | `inventory:read` |
| GET | `inventory-transactions?page&limit&transactionType&warehouseId&productId&fromDate&toDate&referenceType&referenceId` | `inventory:read` |
| GET | `inventory-transactions/:id` | `inventory:read` |

### A.6 Stock Allocations — `/stock-allocations`

| Method | Path | Permission |
|--------|------|------------|
| POST | `stock-allocations/bulk/cancel` body `BulkCancelDto` | `allocation:write` |
| GET | `stock-allocations/stats/{summary,funnel}` | `inventory:read` |
| GET | `stock-allocations/pending/list` | `inventory:read` |
| GET | `stock-allocations/project/:projectId` | `inventory:read` |
| POST | `stock-allocations` body `CreateStockAllocationDto` | `allocation:write` |
| GET | `stock-allocations?page&limit&status&projectId&warehouseId&productId` | `inventory:read` |
| GET | `stock-allocations/:id` | `inventory:read` |
| PATCH | `stock-allocations/:id` body `EditAllocationDetailsDto` | `allocation:write` |
| POST | `stock-allocations/:id/fulfill` body `FulfillStockAllocationDto` | `allocation:write` |
| POST | `stock-allocations/:id/cancel` body `{reason}` | `allocation:write` |
| POST | `stock-allocations/:id/return` body `{quantity, reason}` | `allocation:write` |

**`CreateStockAllocationDto`** — required: `projectId`, `warehouseId`, `productId`, `allocatedQuantity`. Optional: `sourceType`, `status`, `notes`. **No `bomId` field** — manual allocations cannot be linked to BOM via REST (Hazard #8).

**`EditAllocationDetailsDto`** — optional: `notes`, `expectedDispatchDate`. **`expectedDispatchDate` has NO entity column** (Hazard #1).

**`FulfillStockAllocationDto`** — required: `fulfilledQuantity`, `fulfillmentDate`. Optional: `notes`.

### A.7 Material Dispatches — `/material-dispatches`

| Method | Path | Permission |
|--------|------|------------|
| POST | `material-dispatches/bulk/cancel` body `BulkCancelDto` | `dispatch:write` |
| GET | `material-dispatches/stats/{summary,funnel}` | `inventory:read` |
| GET | `material-dispatches/{in-transit,pending}/list` | `inventory:read` |
| GET | `material-dispatches/project/:projectId` | `inventory:read` |
| POST | `material-dispatches` body `CreateMaterialDispatchDto` | `dispatch:write` |
| GET | `material-dispatches?...filters` | `inventory:read` |
| GET | `material-dispatches/:id` | `inventory:read` |
| PATCH | `material-dispatches/:id` body `UpdateMaterialDispatchDto` | `dispatch:write` |
| PATCH | `material-dispatches/:id/status` body `UpdateMaterialDispatchStatusDto` | `dispatch:write` |
| POST | `material-dispatches/:id/mark-dispatched` | `dispatch:write` |
| POST | `material-dispatches/:id/mark-delivered` body `{actualDeliveryDate?, receivedById?}` | `dispatch:write` |
| POST | `material-dispatches/:id/cancel` body `{reason}` | `dispatch:write` |
| DELETE | `material-dispatches/:id` | `dispatch:write` |

**`CreateMaterialDispatchDto`** — required: `projectId`, `warehouseId`, `items[]`. Optional: `dispatchDate`, `expectedDeliveryDate`, `vehicleNumber`, `driverName`, `driverPhone`, `transportCompany`, `notes`.

**`CreateMaterialDispatchItemDto`** — required: `productId`, `quantity`. Optional: `stockAllocationId`, `batchNumber`, `serialNumbers[]`, `notes`.

### A.8 Return Requests — `/inventory/return-requests`

| Method | Path | Permission |
|--------|------|------------|
| POST | `inventory/return-requests` body `CreateReturnRequestDto` | `inventory:write` |
| GET | `inventory/return-requests?status&bomId&allocationId` | `inventory:read` |
| GET | `inventory/return-requests/:id` | `inventory:read` |
| PATCH | `inventory/return-requests/:id/complete` | `inventory:write` |
| PATCH | `inventory/return-requests/:id/cancel` | `inventory:write` |

**`CreateReturnRequestDto`** — required: `allocationId`, `bomId`, `quantity`, `reason`.

### A.9 Project Vendors — `/project-vendors`

| Method | Path | Permission |
|--------|------|------------|
| GET | `project-vendors/project/:projectId{,/active,/contract-value}` | `inventory:read` |
| GET | `project-vendors/vendor/:vendorId?page&limit&status` | `inventory:read` |
| POST | `project-vendors` body `CreateProjectVendorDto` | `inventory:write` |
| GET | `project-vendors/:id` | `inventory:read` |
| PATCH | `project-vendors/:id` body `UpdateProjectVendorDto` | `inventory:write` |
| DELETE | `project-vendors/:id` | `inventory:write` |
| PATCH | `project-vendors/:id/status` body `{status}` | `inventory:write` |

### A.10 BOM — `/bom` (and project conversion)

| Method | Path | Permission |
|--------|------|------------|
| POST | `projects/convert-from-quote/:quoteId` body `ConvertFromQuoteDto` | (Jwt only) |
| POST | `projects/:id/sync-bom` | per project module |
| GET | `bom?entityType&entityId` | per BOM module |
| POST | `bom/:id/allocate-pending` | `bom:finalize` |
| GET | `bom/project/:projectId/procurement-status` | per BOM module |
| PATCH | `bom-items/:id/serial` body `{serialNumber}` | per BOM module |
| PATCH | `bom-items/bulk-serials` | per BOM module |

### A.11 CSV Export — `/inventory/export/*.csv`

All require `inventory:export`. Endpoints: `purchase-orders`, `material-dispatches`, `stock-allocations`, `inventory-stock`, `inventory-transactions`, `vendors`, `warehouses`. Filters mirror corresponding list endpoints.

### A.12 Federated Search — `/inventory/search?q&types`

Requires `inventory:search`. `q` length 2–100.

---

## Appendix B — Hazard list (file:line)

| # | Hazard | Evidence file:line | Detection step |
|---|--------|---------------------|----------------|
| 1 | `StockAllocationService.update()` writes `expectedDispatchDate` but `StockAllocationEntity` has no such column | `oneohm/apps/backend/src/modules/inventory/services/stock-allocation.service.ts` (update method) + `…/entities/stock-allocation.entity.ts` | S-29 |
| 2 | `inventory_stock.in_transit_quantity` exposed in API and DTOs but never updated by any write path | `…/entities/inventory-stock.entity.ts`; grep services for `inTransitQuantity` writes (none) | S-16, S-22 |
| 3 | `POST /inventory-stock/update` accepts any client `transactionType`; service only mutates `availableQuantity`, writes `Math.abs(qty)` to ledger | `…/services/inventory-stock.service.ts#updateStock` | Phase 10 audit |
| 4 | `PATCH /material-dispatches/:id/status` bypasses stock logic (no `deductReservedStock` / `restoreReservedStock`) vs `mark-dispatched`/`cancel` | `…/services/helpers/dispatch-status-machine.ts` + dispatch service | S-25 |
| 5 | `BomService.copyQuoteBomToProject` runs outside conversion txn and swallows errors → project can exist without BOM | `oneohm/apps/backend/src/modules/projects/services/project.service.ts` lines 1063–1068 | S-01 |
| 6 | Permission string mismatch: alerts page uses `purchaseOrder:write`, PO list uses `purchase-order:write` | `oneohm/apps/web/.../inventory-alerts-page.tsx` vs `inventory-purchase-orders-page.tsx` | S-20 |
| 7 | Response DTOs hide `bom_id`, `returned_at` (and any future `expectedDispatchDate`) on allocations though present in DB | `…/dto/stock-allocations/stock-allocation-response.dto.ts` | S-06, S-29 |
| 8 | `StockAllocationController.create` does not set `bomId` — REST-created allocations are orphan from BOM rollup | `…/controllers/stock-allocation.controller.ts` + `CreateStockAllocationDto` | S-07 |

---

## Appendix C — Enum value tables

(Source: `oneohm/libs/shared/src/types/enums/inventory.enum.ts`, `…/project.enum.ts`, `…/quote.enum.ts`, `…/customer.enum.ts`)

**`WarehouseType`** — `own`, `third_party`
**`WarehouseStatus`** — `active`, `inactive`
**`VendorType`** — `supplier`, `contractor`, `service_provider`
**`VendorStatus`** — `active`, `inactive`, `blacklisted`
**`ProjectVendorStatus`** — `active`, `completed`, `terminated`
**`PurchaseOrderType`** — `stock`, `project_specific`
**`PurchaseOrderStatus`** — `draft`, `pending_approval`, `approved`, `sent`, `confirmed`, `partially_received`, `received`, `cancelled`
**`PaymentStatus`** — `pending`, `partial`, `paid`
**`InventoryTransactionType`** — `purchase`, `sale`, `transfer_in`, `transfer_out`, `adjustment`, `allocation`, `dispatch`, `return`
**`StockAllocationSourceType`** — `own`, `third_party`
**`StockAllocationStatus`** — `allocated`, `partially_dispatched`, `dispatched`, `completed`, `cancelled`
**`MaterialDispatchStatus`** — `prepared`, `dispatched`, `in_transit`, `delivered`, `partially_delivered`, `cancelled`
**`BomAllocationStatus`** (on `bom.allocation_status`) — `pending`, `partial`, `fully_allocated`
**`ReturnRequestStatus`** — `pending`, `completed`, `cancelled`
**`ProjectStatus`** — `draft`, `planning`, `approved`, `in_progress`, `testing`, `completed`, `cancelled`, `on_hold`
**`ProjectPriority`** — `low`, `medium`, `normal`, `high`, `urgent`
**`QuoteStatus`** — `draft`, `sent`, `viewed`, `accepted`, `rejected`, `expired`
**`PropertyStatus`** — `active`, `inactive`, `pending_verification`, `converted`

### Dispatch status transition machine

- `prepared` → `dispatched`, `cancelled`
- `dispatched` → `in_transit`, `cancelled`
- `in_transit` → `delivered`, `partially_delivered`, `cancelled`
- `partially_delivered` → `delivered`, `cancelled`
- `delivered` → (terminal)
- `cancelled` → (terminal)

---

## Appendix D — Log grep patterns (run against `terminals/1.txt`)

| Grep pattern | Source / meaning |
|--------------|------------------|
| `\[PO.bulkApprove\]` | Bulk approve PO partial failures |
| `\[PO.bulkCancel\]` | Bulk cancel PO partial failures |
| `\[Allocation.bulkCancel\]` | Bulk cancel allocation partial failures |
| `\[Dispatch.bulkCancel\]` | Bulk cancel dispatch partial failures |
| `Low-stock notification failed` | `low-stock-alert.service.ts` notification error |
| `Failed to copy BOM from quote version` | Hazard #5 fired (conversion BOM copy failure) |
| `Skipping payment-term snapshot` | Payment terms already existed (idempotency hit) |
| `QueryFailedError` | Any TypeORM SQL error (use to catch Hazard #1) |
| `bucket=.* failed/timed-out` | Federated search bucket failure |

Recommended one-liner:

```bash
rg -n "QueryFailedError|Failed to copy BOM|Low-stock notification failed|\[(PO|Allocation|Dispatch)\.bulk" terminals/1.txt
```

---

## Appendix E — Seeding helper SQL

After clean-slate reset and `S-01` (project conversion), seed `inventory_stock` rows for golden-BOM products at the project's default warehouse so Reserve Stock, Low-Stock, Transfer, and Adjust flows behave deterministically.

```sql
-- Variables to set first:
--   :org_id  = SELECT organization_id FROM users WHERE email='sanjay.oneohm@gmail.com';
--   :wh_id   = the warehouse you set as default_warehouse_id on the new project
--   :wh2_id  = a SECOND warehouse to use for transfers (create via S-10 if needed)

-- E.1 Insert/update controlled stock for every product on the project BOM
-- Seed: available = 2x BOM qty (so Reserve uses half; Transfer half of the rest)
--       reserved = 0
--       minimum_stock_level = ceil(0.25 * BOM qty)  (drives low-stock alert after dispatch)
INSERT INTO inventory_stock (
  id, organization_id, warehouse_id, product_id,
  available_quantity, reserved_quantity, in_transit_quantity,
  minimum_stock_level, reorder_quantity, maximum_stock_level,
  updated_at
)
SELECT
  gen_random_uuid(),
  :org_id,
  :wh_id,
  bi.product_id,
  bi.quantity * 2,
  0,
  0,
  CEIL(bi.quantity * 0.25),
  bi.quantity,
  bi.quantity * 5,
  now()
FROM bom_items bi
JOIN bom b ON b.id = bi.bom_id
JOIN projects p ON p.id = b.entity_id AND b.entity_type='project'
WHERE p.quote_id='97e88a3e-61d3-4f01-a342-04489a5d7221'
  AND bi.product_id IS NOT NULL
ON CONFLICT (warehouse_id, product_id) DO UPDATE
SET available_quantity = EXCLUDED.available_quantity,
    reserved_quantity = 0,
    minimum_stock_level = EXCLUDED.minimum_stock_level,
    reorder_quantity = EXCLUDED.reorder_quantity,
    maximum_stock_level = EXCLUDED.maximum_stock_level,
    updated_at = now();

-- E.2 Create empty rows at the SECOND warehouse so Transfer can move stock into them
INSERT INTO inventory_stock (
  id, organization_id, warehouse_id, product_id,
  available_quantity, reserved_quantity, in_transit_quantity,
  minimum_stock_level, updated_at
)
SELECT gen_random_uuid(), :org_id, :wh2_id, bi.product_id, 0, 0, 0, 0, now()
FROM bom_items bi
JOIN bom b ON b.id = bi.bom_id
JOIN projects p ON p.id = b.entity_id AND b.entity_type='project'
WHERE p.quote_id='97e88a3e-61d3-4f01-a342-04489a5d7221'
  AND bi.product_id IS NOT NULL
ON CONFLICT (warehouse_id, product_id) DO NOTHING;
```

### E.3 Golden-BOM snapshot query (re-run any time to compare against UI)

```sql
SELECT bi.item_type, bi.product_id, bi.name, bi.brand, bi.quantity, bi.unit,
       bi.unit_price, bi.total_price, bi.group_key, bi.unit_index, bi.serial_number
FROM bom_items bi
JOIN bom b ON b.id = bi.bom_id
WHERE b.entity_type='quote_version'
  AND b.entity_id IN (
    SELECT id FROM quote_versions
     WHERE quote_id='97e88a3e-61d3-4f01-a342-04489a5d7221'
  )
ORDER BY bi.sort_order, bi.item_type, bi.unit_index;
```

### E.4 Useful aggregates (used by Phase 9 reconciliation)

```sql
-- Total SKU count for dashboard
SELECT COUNT(*) FROM inventory_stock WHERE organization_id=:org_id;

-- Low-stock count (matches inventory-stock.repository.ts low-stock filter)
SELECT COUNT(*) FROM inventory_stock
WHERE organization_id=:org_id
  AND minimum_stock_level IS NOT NULL AND minimum_stock_level > 0
  AND available_quantity <= minimum_stock_level;

-- Allocation funnel
SELECT status, COUNT(*) FROM stock_allocations
WHERE organization_id=:org_id GROUP BY status;

-- Dispatch funnel
SELECT status, COUNT(*) FROM material_dispatches
WHERE organization_id=:org_id GROUP BY status;

-- Procurement spend (per project)
SELECT epl.product_id, SUM(epl.quantity) AS spent_qty,
       SUM(epl.quantity * epl.unit_price) AS spent_value
FROM expense_product_links epl
JOIN project_expenses pe ON pe.id = epl.project_expense_id AND pe.deleted_at IS NULL
WHERE pe.project_id = :project_id
GROUP BY epl.product_id;
```
