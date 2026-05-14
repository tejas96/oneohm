# AI Agent Executable Script — Inventory E2E

**Audience:** an AI agent (browser + shell + DB) driving the full inventory test end-to-end.
**Format:** every `S-NN` is a block with fixed schema: `PRECONDITION`, `UI ACTION`, `API ASSERT`, `DB ASSERT`, `LOG ASSERT`, `ON_FAIL`, `RETRY`. Each block is idempotent — re-running after a fix must not corrupt state.
**Cross-refs:** Appendix A (endpoints), B (hazards), C (enums), D (logs), E (seeding) in [`00-APPENDICES.md`](./00-APPENDICES.md).

---

## Globals (set once at the top of the agent run)

```
$WEB_BASE         = http://localhost:3001
$API_BASE         = http://localhost:3000/api/v1
$DB               = postgresql://root:root@localhost:5432/oneohm_epc
$LOG              = /Users/devtejas/.cursor/projects/Volumes-work-space-oneohm-mono/terminals/1.txt
$QUOTE_ID         = 97e88a3e-61d3-4f01-a342-04489a5d7221
$USER_EMAIL       = sanjay.oneohm@gmail.com
$USER_PASSWORD    = test@123
$ORG_ID           = (resolved in S-00.3)
$PROJECT_ID       = (set in S-01.5)
$BOM_ID           = (set in S-04.1)
$WH_ID            = (set in S-03)         # default warehouse
$WH2_ID           = (set in S-10)         # transfer destination
$VENDOR_ID        = (set in S-12)
$PO_ID            = (set in S-13)
$DISPATCH_ID      = (set in S-21)
$ALLOC_IDS        = (collected across S-06, S-07)
```

---

## S-00 Bootstrap

### S-00.1 Reset DB
```
EXEC psql $DB <<SQL
BEGIN;
TRUNCATE TABLE
  return_requests,
  material_dispatch_items, material_dispatches,
  stock_allocations,
  inventory_transactions, inventory_stock,
  purchase_order_items, purchase_orders,
  project_vendors,
  project_materials, project_tasks, project_team_members, projects,
  bom_items, bom
RESTART IDENTITY CASCADE;
UPDATE customer_property SET status='active'
  WHERE id IN (SELECT property_id FROM quotes WHERE id='$QUOTE_ID');
UPDATE quotes SET status='accepted' WHERE id='$QUOTE_ID';
COMMIT;
SQL
ASSERT exit_code == 0
```

### S-00.2 Capture golden BOM
```
EXEC psql $DB -At -F"|" -c "
SELECT bi.item_type, bi.product_id, bi.name, bi.brand, bi.quantity, bi.unit,
       bi.unit_price, bi.total_price, bi.group_key, bi.unit_index
FROM bom_items bi
JOIN bom b ON b.id = bi.bom_id
WHERE b.entity_type='quote_version'
  AND b.entity_id IN (SELECT id FROM quote_versions WHERE quote_id='$QUOTE_ID')
ORDER BY bi.sort_order, bi.item_type, bi.unit_index;"
STORE result AS $GOLDEN_BOM
ASSERT row_count > 0
```

### S-00.3 Resolve user + org
```
EXEC psql $DB -At -c "SELECT id, organization_id FROM users WHERE email='$USER_EMAIL';"
STORE $USER_ID, $ORG_ID
```

### S-00.4 Login (browser)
```
UI navigate $WEB_BASE/login
UI fill email=$USER_EMAIL password=$USER_PASSWORD
UI click "Sign in"
ASSERT URL contains "/dashboard" OR "/projects"
```

---

## S-01 Convert quote → project

### PRECONDITION
- $QUOTE_ID has status `accepted` and property `active` (S-00.1 ensures)
- $GOLDEN_BOM captured

### UI ACTION
```
UI navigate $WEB_BASE/quotes/$QUOTE_ID?tab=overview
UI click "Convert to Project"
ASSERT URL matches /projects/new\?quoteId=$QUOTE_ID/

# Step 0: Source (prefilled) — click Next
UI click "Next"

# Step 1: Details — accept defaults
UI click "Next"

# Step 2: Team — add 1 member if list available
TRY: UI pick first available employee → "Add"
UI click "Next"

# Step 3: Statuses — keep defaults
UI click "Next"

# Step 4: Tasks — accept defaults
UI click "Next"

# Step 5: Review → Create
UI click "Create Project"
WAIT_FOR toast text="Project created successfully" timeout=15s
WAIT_FOR URL matches /projects/[0-9a-f-]+/
$PROJECT_ID = url segment after /projects/
```

### API ASSERT
- Network tab shows `POST /api/v1/projects/convert-from-quote/$QUOTE_ID` → 200/201
- Response body has `id == $PROJECT_ID`

### DB ASSERT
```sql
-- project created
SELECT 1 FROM projects WHERE id='$PROJECT_ID' AND quote_id='$QUOTE_ID' AND status='draft';

-- property converted
SELECT status FROM customer_property
WHERE id=(SELECT property_id FROM quotes WHERE id='$QUOTE_ID');
-- expect: 'converted'

-- quote unchanged
SELECT status FROM quotes WHERE id='$QUOTE_ID';
-- expect: 'accepted'

-- BOM cloned
SELECT id FROM bom WHERE entity_type='project' AND entity_id='$PROJECT_ID';
-- expect: 1 row; STORE as $BOM_ID

-- BOM items 1:1 with golden
SELECT COUNT(*) FROM bom_items WHERE bom_id='$BOM_ID';
-- expect: == row_count($GOLDEN_BOM)
```

### LOG ASSERT
```bash
rg -n "Failed to copy BOM from quote version" $LOG
# expect: NO matches (or fail to Hazard #5)
```

### ON_FAIL
- If BOM missing → Hazard #5. Remediate: `POST $API_BASE/projects/$PROJECT_ID/sync-bom`; retry DB asserts.
- If conversion 400 with `property already converted` → S-00.1 reset failed; rerun bootstrap.
- For any other 4xx, refer to `02-DEV-BUGFIX-PLAYBOOK.md` S-01 failure-modes table.

### RETRY
Idempotent: S-00.1 reset returns to clean state before retry.

---

## S-02 Project Overview tab

### UI ACTION
```
UI navigate $WEB_BASE/projects/$PROJECT_ID?tab=overview
WAIT_FOR element selector="h1" containing-text=<project name>
```

### API ASSERT
- `GET /api/v1/projects/$PROJECT_ID` returns DTO with `systemSizeKw > 0`, `quoteNumber`, `projectType`, `estimatedCost`

### DB ASSERT
```sql
SELECT progress_percentage FROM projects WHERE id='$PROJECT_ID';
-- expect: 0 (fresh project)
```

### UI INSPECTION CHECKS (each must be present)
- hero-card visible with progress ring "0%"
- six insights tiles visible (Tasks done, Overdue, Days remaining, Payment received, Materials ready, Documents)
- system specs card lists panel count + inverter count derived from quote_versions snapshot
- site card present

### ON_FAIL
- Missing system size: re-run quote calculator persistence or inspect `quote_versions.system_size_kw`.
- Insights tile broken: confirm hook `useProjectAttention` returned 200.

---

## S-03 Set default warehouse

### PRECONDITION
- At least one warehouse exists with `deleted_at IS NULL` and `status='active'`

### UI ACTION
```
UI navigate $WEB_BASE/projects/$PROJECT_ID?tab=bom
SCROLL_INTO_VIEW selector="text=Default Warehouse"
UI select first option in dropdown
WAIT_FOR toast text="Default warehouse updated"
$WH_ID = the warehouse UUID selected
```

### API ASSERT
- `PATCH /api/v1/projects/$PROJECT_ID` body `{defaultWarehouseId:"$WH_ID"}` → 200

### DB ASSERT
```sql
SELECT default_warehouse_id FROM projects WHERE id='$PROJECT_ID';
-- expect: '$WH_ID'
```

### ON_FAIL
- No warehouses exist → run S-10 first; rerun S-03.

---

## S-08 Inventory Dashboard

### UI ACTION
```
UI navigate $WEB_BASE/inventory
WAIT_FOR all 8 KPI tiles visible
```

### DB COMPUTATION + UI COMPARE
```sql
-- Total SKUs
SELECT COUNT(*) FROM inventory_stock WHERE organization_id='$ORG_ID';
```
ASSERT UI tile "Total SKUs" value == SQL count (±0)

```sql
-- Low Stock
SELECT COUNT(*) FROM inventory_stock
WHERE organization_id='$ORG_ID'
  AND minimum_stock_level IS NOT NULL AND minimum_stock_level > 0
  AND available_quantity <= minimum_stock_level;
```
ASSERT UI tile "Low Stock" == SQL count

```sql
-- Active Allocations
SELECT COUNT(*) FROM stock_allocations
WHERE organization_id='$ORG_ID' AND status NOT IN ('cancelled','completed');
```
ASSERT UI tile "Active Allocations" == SQL count

```sql
-- In Transit
SELECT COUNT(*) FROM material_dispatches
WHERE organization_id='$ORG_ID' AND status IN ('in_transit','partially_delivered');
```
ASSERT UI tile "In Transit" == SQL count

### UI INSPECTION
- TimeWindowPicker: test custom range `from=2026-13-99` → ASSERT validation error "Enter a valid YYYY-MM-DD range"
- Operations section: 4 charts render
- Financial section: 4 charts render
- Recent activity rail: timeline visible or empty state "No recent inventory activity"

### ON_FAIL
- Per-tile mismatch → Phase 10 triangulation in dev playbook §10.2

---

## S-09 Warehouses list

### UI ACTION
```
UI navigate $WEB_BASE/inventory/warehouses
WAIT_FOR table rendered OR empty state
```

### API ASSERT
- `GET /api/v1/warehouses?page=1&limit=20` → 200

### UI INSPECTION
- Columns: Warehouse, Type, Location, Contact, SKU rows, Status, actions
- Filter Status/Type open and contain enum values
- Search input filters

---

## S-10 Create warehouse (run twice — wh1 default, wh2 for transfer)

### UI ACTION (warehouse 1: "QA Default")
```
UI click "Add Warehouse"
UI fill {
  Name: "QA Default WH",
  Code: "QA-DEFAULT",
  Warehouse type: "Own",
  Status: "Active",
  Address: "Test St 1",
  City: "Bengaluru",
  State: "Karnataka",
  PIN code: "560001",
  Contact person: "QA Person",
  Phone: "9999999999",
  Email: "qa@example.com"
}
UI click "Create warehouse"
WAIT_FOR toast success
$WH_ID = response.id  (capture; re-run S-03 with this if needed)
```

### Duplicate-code defect test
```
UI click "Add Warehouse"
UI fill { Name: "Dup", Code: "QA-DEFAULT", ... }
UI click "Create warehouse"
ASSERT inline or toast error mentions duplicate/conflict
```

### UI ACTION (warehouse 2)
```
UI click "Add Warehouse"
UI fill { Name: "QA Secondary WH", Code: "QA-SECONDARY", Warehouse type: "Own", Status: "Active", ... }
UI click "Create warehouse"
$WH2_ID = response.id
```

### DB ASSERT
```sql
SELECT id, name, code, warehouse_type, status FROM warehouses
WHERE code IN ('QA-DEFAULT','QA-SECONDARY') AND deleted_at IS NULL;
-- expect: 2 rows
```

---

## S-11 Warehouse detail tabs

### UI ACTION
```
UI navigate $WEB_BASE/inventory/warehouses/$WH_ID
WAIT_FOR header visible
```

### UI INSPECTION
- KPI tiles render
- Stock tab default: columns Product/Available/Reserved/Min level/Status; status chips: "Fully Reserved", "Out of Stock", "Low stock", "In stock" appear correctly per row
- Transactions tab: columns Date/Type/Product/Quantity/Reference; signed-quantity coloring present
- Allocations tab: columns Product/Project/Allocated/Dispatched/Status

### DB CROSS-CHECK
```sql
SELECT product_id, available_quantity, reserved_quantity FROM inventory_stock
WHERE warehouse_id='$WH_ID' LIMIT 5;
```
Compare to first 5 visible rows.

---

## S-12 Create vendor

### UI ACTION
```
UI navigate $WEB_BASE/inventory/vendors
UI click "Add Vendor"
UI fill {
  Vendor name: "QA Test Vendor",
  Vendor code: "QA-VEND-01",
  Vendor type: "Supplier",
  Status: "Active",
  Contact person: "Vendor Contact",
  Email: "vendor@example.com",
  Phone: "8888888888",
  Alternate phone: "7777777777",
  Street address: "Vendor St 1",
  City: "Bengaluru",
  State: "Karnataka",
  PIN: "560002",
  Country: "India",
  GSTIN: "29ABCDE1234F1Z5",
  PAN: "ABCDE1234F",
  Payment terms: "Net 30",
  Credit days: 30,
  Bank name: "Test Bank",
  IFSC: "TEST0001234",
  Account number: "1234567890",
  Vendor rating: 4.5,
  Notes: "QA test vendor"
}
UI click "Create vendor"
WAIT_FOR toast success
$VENDOR_ID = response.id
```

### DB ASSERT
```sql
SELECT id, name, code, vendor_type, status, gstin, pan, credit_days, rating
FROM vendors WHERE code='QA-VEND-01' AND deleted_at IS NULL;
-- expect: 1 row matching all fields
```

---

## S-13 Create PO

### UI ACTION
```
UI navigate $WEB_BASE/inventory/purchase-orders/new
UI pick Vendor = $VENDOR_ID
UI pick Warehouse = $WH_ID
UI pick PO type = "Project specific"
ASSERT Project picker now shows red required indicator
UI pick Project = $PROJECT_ID
UI pick PO date = today
UI pick Expected delivery = today + 7 days
UI fill "Payment terms" = "Net 30"

# Add a line per BOM product (use first 3 products with non-null product_id from $GOLDEN_BOM)
FOR each product in first 3 of $GOLDEN_BOM:
  UI click "Add line"
  UI pick Product = product.product_id
  UI fill Quantity = product.quantity   # full BOM qty
  UI fill Unit price = product.unit_price
  UI fill Tax rate = 18

# Duplicate-product defect test
UI click "Add line"
UI pick Product = first product (intentional duplicate)
ASSERT inline validation rejects duplicate

UI fill Notes = "QA PO"
UI fill Terms & conditions = "QA terms"
UI click "Create PO"
WAIT_FOR navigation to /inventory/purchase-orders/<id>
$PO_ID = url segment
```

### Server-recompute defect probe
```
INTERCEPT POST request before send → modify body subtotal=999999, totalAmount=999999
SUBMIT
```
DB ASSERT subtotal != 999999, totalAmount equals SUM(line_total) (+ tax). If DB shows 999999 → defect.

### DB ASSERT
```sql
SELECT po.subtotal, po.tax_amount, po.total_amount, po.status, po.payment_status
FROM purchase_orders po WHERE id='$PO_ID';
-- status='draft', payment_status='pending'

SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id='$PO_ID';
-- expect: 3
```

---

## S-14 PO lifecycle

### Step A — Submit
```
UI on PO detail click Actions → "Submit"
WAIT_FOR status badge becomes "Pending Approval"
```
DB: `SELECT status FROM purchase_orders WHERE id='$PO_ID';` → `pending_approval`

### Step B — Approve
```
UI click Actions → "Approve"
WAIT_FOR status → "Approved"
```
DB: `status='approved'`

### Step C — Send
```
UI click Actions → "Send"
WAIT_FOR status → "Sent"
```

### Step D — Receive partial (50%)
```
UI click Actions → "Receive"
UI fill Receiving date = today
FOR each line: fill Qty receiving = orderedQuantity / 2
UI click "Record receipt"
WAIT_FOR toast success
```
DB ASSERT:
```sql
SELECT status, actual_delivery_date FROM purchase_orders WHERE id='$PO_ID';
-- status='partially_received'

SELECT product_id, ordered_quantity, received_quantity FROM purchase_order_items
WHERE purchase_order_id='$PO_ID';
-- received == ordered / 2 (rounded as per UI rounding)

SELECT product_id, available_quantity FROM inventory_stock
WHERE warehouse_id='$WH_ID' AND product_id IN (...);
-- available increased by received_quantity

SELECT COUNT(*) FROM inventory_transactions
WHERE reference_type='purchase_order' AND reference_id='$PO_ID' AND transaction_type='purchase';
-- expect: 3 (one per line)
```

### Step E — Receive remaining
Repeat Receive with remaining quantities → PO `status='received'`.

### Step F — Cancel a different draft PO
```
# Create a second tiny PO in draft (re-use S-13 with 1 line)
$PO_ID2 = ...
UI on list click row actions → "Cancel"
UI confirm with reason "QA cancel test"
WAIT_FOR toast / list row updated
```
DB: `SELECT status FROM purchase_orders WHERE id='$PO_ID2';` → `cancelled`

---

## S-04 BOM tab inspection (now that stock exists from S-14)

### UI ACTION
```
UI navigate $WEB_BASE/projects/$PROJECT_ID?tab=bom
WAIT_FOR BOM table rendered
$BOM_ID = from network response or DB query
```

### UI INSPECTION
- Reserve Stock button visible
- Procurement section visible (likely Pending state for received-but-not-expensed products)
- Status column has Pending badges for all rows

### DB CROSS-CHECK
```sql
SELECT id, allocation_status FROM bom WHERE id='$BOM_ID';
-- expect: 'pending'
```

---

## S-05 Extra BOM items

### Path 1 — SQL insert
```
EXEC psql $DB <<SQL
INSERT INTO bom_items (id, bom_id, item_type, name, quantity, unit, unit_price, total_price, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), '$BOM_ID', 'accessory', 'TEST Extra DC Wire', 10, 'm', 25, 250, 999, now(), now());
SQL
```
UI refresh BOM tab → row "TEST Extra DC Wire" visible with Pending badge.

---

## S-06 Reserve Stock (after seeding stock from S-14)

### PRECONDITION
- For products on $GOLDEN_BOM that DID NOT come through PO receive, run Appendix E.1 seeding SQL with $ORG_ID, $WH_ID, $WH2_ID
- `inventory_stock.available_quantity > 0` for every BOM product at $WH_ID

### UI ACTION
```
UI on BOM tab click "Reserve Stock"
WAIT_FOR button label "Reserving…"
WAIT_FOR completion (button returns or banner appears)
ASSERT toast success OR partial toast
```

### DB ASSERT (per product on BOM)
```sql
WITH products AS (
  SELECT DISTINCT bi.product_id, bi.quantity AS bom_qty
  FROM bom_items bi WHERE bi.bom_id='$BOM_ID' AND bi.product_id IS NOT NULL
)
SELECT p.product_id, p.bom_qty,
       s.available_quantity, s.reserved_quantity,
       a.allocated_quantity, a.status, a.bom_id
FROM products p
LEFT JOIN inventory_stock s ON s.warehouse_id='$WH_ID' AND s.product_id=p.product_id
LEFT JOIN stock_allocations a ON a.bom_id='$BOM_ID' AND a.product_id=p.product_id AND a.status<>'cancelled';
-- expect: each row has an active allocation with allocated_quantity equal to MIN(bom_qty, stock-before-reserve)
-- AND inventory_stock.reserved_quantity has the same value;
-- AND inventory_stock.available_quantity decreased by that same value

SELECT * FROM inventory_transactions
WHERE reference_type='stock_allocation'
  AND reference_id IN (SELECT id FROM stock_allocations WHERE bom_id='$BOM_ID')
ORDER BY transaction_date DESC;
-- transaction_type='allocation' rows present

SELECT allocation_status FROM bom WHERE id='$BOM_ID';
-- 'partial' or 'fully_allocated'
```

### Idempotency probe
```
UI click "Reserve Stock" again
WAIT_FOR completion
```
DB assert: `SELECT COUNT(*) FROM stock_allocations WHERE bom_id='$BOM_ID' AND status<>'cancelled' GROUP BY product_id;` → no product has > 1 row.

### LOG ASSERT
```bash
rg -n "QueryFailedError" $LOG
# expect: no new entries
```

### ON_FAIL
- 400 "No default warehouse" → re-run S-03
- 409 "Active allocation in different warehouse" → cancel existing allocation or change $WH_ID

---

## S-07 Project Allocations tab + Hazard #8

### UI ACTION
```
UI navigate $WEB_BASE/projects/$PROJECT_ID?tab=allocations
WAIT_FOR list (rows from S-06)
```

### DB CROSS-CHECK
```sql
SELECT id, product_id, warehouse_id, allocated_quantity, dispatched_quantity, returned_quantity, status, bom_id
FROM stock_allocations WHERE project_id='$PROJECT_ID';
```
Compare to UI table 1:1.

### Create manual allocation (Hazard #8)
```
UI click "Create allocation"
UI fill {
  Project: $PROJECT_ID,
  Warehouse: $WH_ID,
  Product: pick any non-BOM product (or another BOM product),
  Allocated quantity: 1,
  Source type: "Own",
  Notes: "QA manual alloc"
}
UI click "Create"
WAIT_FOR row visible
```

### DB ASSERT (Hazard #8 confirmation)
```sql
SELECT id, product_id, bom_id FROM stock_allocations
WHERE project_id='$PROJECT_ID' AND notes='QA manual alloc';
-- expect: bom_id IS NULL
```

---

## S-15 Stock list with low-stock deep link

### UI ACTION
```
UI navigate $WEB_BASE/inventory/stock?filter=low-stock
ASSERT title == "Low stock items"
ASSERT chip "Low stock filter active" visible
```

### API ASSERT
- `GET /api/v1/inventory-stock?lowStock=true` returns list

### DB ASSERT
```sql
SELECT COUNT(*) FROM inventory_stock
WHERE organization_id='$ORG_ID'
  AND minimum_stock_level > 0
  AND available_quantity <= minimum_stock_level;
```
ASSERT == row count visible in UI table

---

## S-16 Stock detail

### UI ACTION
```
# Pick a stock row at $WH_ID with non-zero available
UI navigate $WEB_BASE/inventory/stock
UI click row for product where available > 0
$STOCK_ID = url segment
```

### DB ASSERT
```sql
SELECT available_quantity, reserved_quantity, in_transit_quantity, minimum_stock_level, maximum_stock_level
FROM inventory_stock WHERE id='$STOCK_ID';
```
ASSERT each tile on UI matches each column

### Hazard #2 explicit
```
ASSERT UI "In transit" tile == 0 (since no code path writes this column currently)
IF != 0: file defect referencing Hazard #2
```

---

## S-17 Transfer stock

### PRECONDITION
- $WH2_ID exists (S-10)
- Stock row at $WH_ID for chosen product has `available_quantity >= 1`

### UI ACTION
```
UI on stock detail click "Transfer"
UI pick Destination = $WH2_ID
UI fill Quantity = 1
UI fill Notes = "QA transfer"
UI click "Transfer"
```

### DB ASSERT
```sql
-- Source decreased
SELECT available_quantity FROM inventory_stock WHERE warehouse_id='$WH_ID' AND product_id='$PRODUCT_ID';

-- Dest increased (row may be new)
SELECT available_quantity FROM inventory_stock WHERE warehouse_id='$WH2_ID' AND product_id='$PRODUCT_ID';

-- Two ledger rows
SELECT transaction_type, warehouse_id, reference_id FROM inventory_transactions
WHERE reference_type='warehouse_transfer'
  AND (warehouse_id='$WH_ID' OR warehouse_id='$WH2_ID')
ORDER BY transaction_date DESC LIMIT 2;
-- expect: one transfer_out (warehouse_id=$WH_ID, reference_id=$WH2_ID)
-- and one transfer_in (warehouse_id=$WH2_ID, reference_id=$WH_ID)
```

---

## S-18 Adjust stock

### UI ACTION
```
UI on stock detail click "Adjust"
$OLD_AVAILABLE = current "Available" tile value
UI fill New quantity = $OLD_AVAILABLE + 5
UI fill Reason = "QA adjust +5"
UI click "Adjust stock"
```

### DB ASSERT
```sql
SELECT available_quantity FROM inventory_stock WHERE id='$STOCK_ID';
-- equals $OLD_AVAILABLE + 5

SELECT transaction_type, quantity, reference_type, notes FROM inventory_transactions
WHERE reference_type='manual_adjustment' AND reference_id='$STOCK_ID'
ORDER BY transaction_date DESC LIMIT 1;
-- transaction_type='adjustment', quantity=5, notes contains '[REASON: QA adjust +5]'
```

---

## S-19 Transaction Ledger

### UI ACTION
```
UI navigate $WEB_BASE/inventory/transactions
WAIT_FOR table
```

### UI INSPECTION
- Filter Type: pick "Transfer In" → only `transfer_in` rows shown
- Filter Type: pick "Transfer Out" → only `transfer_out` rows shown
- Filter Reference type: pick "Purchase Order" → only PO-linked rows
- "Open reference" icon on a `purchase_order` row → navigates to PO detail
- "Open reference" icon on a `material_dispatch` row → navigates to dispatch detail
- "Open reference" icon on a `stock_allocation` row → navigates to allocation detail

### DB CROSS-CHECK
```sql
SELECT COUNT(*) FROM inventory_transactions WHERE organization_id='$ORG_ID' AND transaction_type='transfer_in';
```
ASSERT == count visible after Type=Transfer In filter applied

---

## S-20 Low Stock alerts + Hazard #6

### PRECONDITION
- At least one product at $WH_ID has `available_quantity <= minimum_stock_level`
- Force this with a large dispatch (run after S-22) OR an adjust:
  ```sql
  UPDATE inventory_stock SET minimum_stock_level = available_quantity + 100
  WHERE id='$STOCK_ID';
  ```

### UI ACTION
```
UI navigate $WEB_BASE/inventory/alerts
WAIT_FOR KPI tiles
```

### UI INSPECTION
- KPI tiles populated
- "Create PO" toolbar button visible (only if user has `purchaseOrder:write`)
- Per-row "Create PO from this" action present

### Hazard #6 probe
```
# Inspect source code or run two roles:
# alerts page checks permission "purchaseOrder:write"
# PO list checks "purchase-order:write"
ASSERT both pages should use the SAME string (canonical: "purchase-order:write")
IF different: file defect referencing Hazard #6
```

### Per-row action test
```
UI click "Create PO from this" on first row
ASSERT URL contains warehouseId, productId, quantity, source=low-stock-alert
```

---

## S-21 Create dispatch

### PRECONDITION
- $PROJECT_ID has at least one allocation in `allocated` or `partially_dispatched` with remaining qty

### UI ACTION
```
UI navigate $WEB_BASE/inventory/dispatches/new
UI pick Project = $PROJECT_ID
UI pick Warehouse = $WH_ID
ASSERT "Add line" enabled
UI click "Add line"
UI pick Allocation = first available from picker
UI fill Quantity = 1
UI fill Vehicle number = "KA01TEST"
UI fill Transport company = "QA Transport"
UI fill Driver name = "QA Driver"
UI fill Driver phone = "9999900000"
UI fill Dispatch date = today
UI fill Expected delivery = today + 2 days
UI fill Notes = "QA dispatch"
UI click "Create dispatch"
WAIT_FOR list redirect
$DISPATCH_ID = pick newly created row id
```

### DB ASSERT
```sql
SELECT id, status, dispatch_number, vehicle_number FROM material_dispatches WHERE id='$DISPATCH_ID';
-- status='prepared'

SELECT product_id, stock_allocation_id, quantity FROM material_dispatch_items WHERE dispatch_id='$DISPATCH_ID';
```

---

## S-22 Mark dispatched

### UI ACTION
```
UI navigate $WEB_BASE/inventory/dispatches/$DISPATCH_ID
UI click "Mark dispatched"
UI confirm
WAIT_FOR status badge changes
```

### DB ASSERT
```sql
SELECT status FROM material_dispatches WHERE id='$DISPATCH_ID';
-- expect: 'in_transit'

-- per item
SELECT product_id, reserved_quantity FROM inventory_stock
WHERE warehouse_id='$WH_ID' AND product_id IN (SELECT product_id FROM material_dispatch_items WHERE dispatch_id='$DISPATCH_ID');
-- reserved decreased by dispatch line qty

SELECT id, allocated_quantity, dispatched_quantity, status FROM stock_allocations
WHERE id IN (SELECT stock_allocation_id FROM material_dispatch_items WHERE dispatch_id='$DISPATCH_ID' AND stock_allocation_id IS NOT NULL);
-- dispatched_quantity increased; status 'partially_dispatched' or 'dispatched'

SELECT COUNT(*) FROM inventory_transactions
WHERE reference_type='material_dispatch' AND reference_id='$DISPATCH_ID' AND transaction_type='dispatch';
-- expect: == material_dispatch_items count
```

---

## S-23 Mark delivered

### UI ACTION
```
UI click "Mark delivered"
UI confirm "Mark <#> as delivered today?"
WAIT_FOR status → "Delivered" or "Partially delivered"
```

### DB ASSERT
```sql
SELECT status, actual_delivery_date, received_by FROM material_dispatches WHERE id='$DISPATCH_ID';

-- allocation completion when all dispatched
SELECT status FROM stock_allocations WHERE id IN (...);
-- 'completed' when dispatched_quantity >= allocated_quantity
```

---

## S-24 Cancel dispatch

### PRECONDITION
- Create a second dispatch (re-run S-21 with another allocation+qty)
- Mark it dispatched (S-22) to put it `in_transit`

### UI ACTION
```
UI on list click row actions → "Cancel"
UI fill reason = "QA cancel"
UI confirm
```

### DB ASSERT
```sql
SELECT status FROM material_dispatches WHERE id='$DISPATCH_ID2';
-- 'cancelled'

-- reserved restored
SELECT reserved_quantity FROM inventory_stock WHERE warehouse_id='$WH_ID' AND product_id IN (...);
-- back to pre-dispatch value

-- allocation reverted
SELECT id, dispatched_quantity, status FROM stock_allocations WHERE id=...;

-- ledger
SELECT * FROM inventory_transactions
WHERE reference_id='$DISPATCH_ID2' AND transaction_type='allocation'
ORDER BY transaction_date DESC LIMIT 1;
```

---

## S-25 Status-patch hazard (Hazard #4)

### PRECONDITION
- Create a fresh dispatch in `prepared` (re-run S-21)
- $DISPATCH_ID3 captured
- Get auth token via login API (capture from S-00.4)

### EXEC
```
EXEC curl -X PATCH $API_BASE/material-dispatches/$DISPATCH_ID3/status \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"dispatched"}'
```

### DB ASSERT
```sql
SELECT status FROM material_dispatches WHERE id='$DISPATCH_ID3';
-- 'dispatched' (status patched)

SELECT reserved_quantity FROM inventory_stock WHERE warehouse_id='$WH_ID' AND product_id IN (...);
-- UNCHANGED from before this curl (defect proof)
```

### ON_FAIL (i.e. defect confirmed)
File defect referencing Hazard #4 with this exact reproduction.

---

## S-26 Return stock

### UI ACTION
```
# Pick an allocation with dispatched_quantity > 0
UI navigate $WEB_BASE/inventory/allocations/<alloc_id>
UI click "Return stock"
UI fill Quantity = 1
UI fill Reason = "QA return test"
UI click "Submit"
```

### DB ASSERT
```sql
SELECT allocated_quantity, dispatched_quantity, returned_quantity, returned_at, status
FROM stock_allocations WHERE id='<alloc_id>';
-- returned_quantity += 1, returned_at set

SELECT available_quantity FROM inventory_stock WHERE warehouse_id='$WH_ID' AND product_id=...;
-- increased by 1

SELECT * FROM inventory_transactions
WHERE reference_type='stock_allocation_return' AND reference_id='<alloc_id>'
ORDER BY transaction_date DESC LIMIT 1;
-- transaction_type='return'
```

---

## S-27 Return-requests workflow

### Trigger via BOM qty reduction
```
EXEC psql $DB <<SQL
-- Pick a product with positive dispatched_quantity
UPDATE bom_items
SET quantity = quantity - 1
WHERE id = (
  SELECT bi.id FROM bom_items bi
  JOIN stock_allocations sa ON sa.bom_id=bi.bom_id AND sa.product_id=bi.product_id
  WHERE bi.bom_id='$BOM_ID' AND sa.dispatched_quantity > 0
  LIMIT 1
);
SQL

EXEC curl -X POST $API_BASE/projects/$PROJECT_ID/sync-bom -H "Authorization: Bearer $TOKEN"
```

### DB ASSERT
```sql
SELECT id, allocation_id, bom_id, quantity, status FROM return_requests
WHERE bom_id='$BOM_ID' ORDER BY created_at DESC LIMIT 1;
-- status='pending'
$RETURN_REQ_ID = result.id

SELECT specifications FROM bom_items
WHERE bom_id='$BOM_ID' AND specifications->>'overDispatched'='true';
-- expect: at least 1 row
```

### Complete the request
```
EXEC curl -X PATCH $API_BASE/inventory/return-requests/$RETURN_REQ_ID/complete -H "Authorization: Bearer $TOKEN"
```

### DB ASSERT
```sql
SELECT status, completed_at, completed_by FROM return_requests WHERE id='$RETURN_REQ_ID';
-- 'completed'

-- inventory came back
SELECT available_quantity FROM inventory_stock WHERE …;
```

### Cancel a sibling request (test field-reuse)
- Create another return request via POST `/api/v1/inventory/return-requests`, then `PATCH …/cancel` and observe `completed_by` populated with cancelling user

---

## S-28 Allocations list inline ops

### UI ACTION
```
UI navigate $WEB_BASE/inventory/allocations
```

### Inline Fulfill probe
```
UI find row with remaining qty
UI click actions → "Fulfill"
WINDOW_CONFIRM accept
WAIT_FOR row refresh
```
DB ASSERT: allocation `dispatched_quantity` advanced; ledger row `dispatch` added.

### Inline Cancel probe
```
UI on a different allocation row click "Cancel"
WINDOW_PROMPT enter "QA cancel"
WAIT_FOR row refresh
```
DB ASSERT: `status='cancelled'`; if undispatched qty existed, `available_quantity` restored.

### Funnel reconciliation
```sql
SELECT status, COUNT(*) FROM stock_allocations WHERE organization_id='$ORG_ID' GROUP BY status;
```
Compare to UI funnel chart counts.

---

## S-29 Allocation detail + Hazard #1 hunt

### UI INSPECTION
```
UI navigate $WEB_BASE/inventory/allocations/<id>
ASSERT correct buttons visible per status
```

### Hazard #1 explicit
```
EXEC curl -X PATCH $API_BASE/stock-allocations/<id> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"expectedDispatchDate":"2026-06-01"}'
STORE response.status, response.body

EXEC rg -n "QueryFailedError|expectedDispatchDate" $LOG | tail -20
```
CLASSIFY per dev playbook S-29 outcomes table → file or close defect.

---

## S-30 Vendor follow-through

### UI ACTION
```
UI navigate $WEB_BASE/inventory/vendors/$VENDOR_ID
UI click "Purchase orders" tab
ASSERT PO from S-13 visible
UI click "Projects" tab
ASSERT empty OR linked project visible
```

### If empty: create link
```
EXEC curl -X POST $API_BASE/project-vendors \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"projectId":"$PROJECT_ID","vendorId":"$VENDOR_ID","vendorRole":"Solar Panel Supplier","contractValue":50000,"currency":"INR","status":"active"}'
```
UI refresh Projects tab → row visible → click → navigates to $PROJECT_ID.

---

## S-31 PO bulk operations

### PRECONDITION
- Create 3 POs in `pending_approval` (re-run S-13 + Submit)
- $PO_IDS = [id1, id2, id3]

### Bulk approve
```
EXEC curl -X POST $API_BASE/purchase-orders/bulk/approve \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"ids": $PO_IDS}'
STORE response as $RESULT
ASSERT $RESULT.succeeded.length + $RESULT.failed.length == 3

EXEC rg -n "\\[PO\\.bulkApprove\\]" $LOG | tail -5
```

### DB ASSERT
```sql
SELECT id, status FROM purchase_orders WHERE id = ANY('{id1,id2,id3}'::uuid[]);
-- expect: all 'approved' if no failures
```

### Bulk cancel
```
EXEC curl -X POST $API_BASE/purchase-orders/bulk/cancel \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"ids": $PO_IDS, "reason":"QA bulk cancel"}'
```
DB ASSERT: all in `cancelled`.

---

## Phase 9 — Number reconciliation pass

For each row of the Phase 9 table in `01-QA-CHECKLIST.md`:

```
FOR each reconciliation_check in [9.1, 9.2, ..., 9.12]:
  UI_VALUE = scrape from corresponding screen
  SQL_VALUE = run paired query (see Appendix E.4 or playbook §S-NN)
  ASSERT abs(UI_VALUE - SQL_VALUE) < 0.001
  ON FAIL: capture both values + screen URL + SQL + record as defect
```

Aggregate report at end of run:

```
echo "## Phase 9 Reconciliation Report"
FOR each check:
  echo "- $check_id: UI=$UI_VALUE  SQL=$SQL_VALUE  Match=$pass_or_fail"
```

---

## Phase 10 — Bug-fix loop (agent-driven)

```
WHILE has_open_defects:
  defect = next_open_defect
  classify_against_appendix_b(defect)
  IF known_hazard:
    apply_documented_fix(defect.hazard_id)
  ELSE:
    triangulate UI -> API -> DB -> Service per dev playbook §10.2
    propose_fix(file:line, code_change)

  APPLY_FIX (or queue PR if human review required)
  WAIT_FOR backend reload (terminals/1.txt last "Nest application successfully started")

  # Re-test
  re_run_step(defect.step_id)
  FOR downstream_step in dependents(defect.step_id):
    re_run_step(downstream_step)
  re_run_phase_9()

  IF all_green:
    mark defect resolved
  ELSE:
    add new findings to defect list

OUTPUT final_report:
  - steps_passed
  - steps_failed
  - defects_resolved
  - defects_open
  - hazards_confirmed (from Appendix B 1-8)
  - hazards_new_discovered
```

---

## Final report template

```
# Inventory E2E Run Report — <date>

## Summary
- Steps completed: NN/31
- Phase 9 reconciliation: NN/12 matched
- Hazards confirmed: [list of Appendix B numbers]
- New hazards: [if any]

## Defects
| ID | Step | Severity | Root cause | Status | Fix |
|----|------|----------|------------|--------|-----|
| ... | ... | ... | ... | ... | ... |

## Re-test log
| Iteration | Steps re-run | Phase 9 result |
|-----------|--------------|-----------------|
| 1 | S-NN, S-NN+1, ... | 11/12 |
| 2 | ... | 12/12 |

## Sign-off
- [ ] All 31 steps passed in single clean run
- [ ] All 12 reconciliation rows match
- [ ] All hazards explicitly tested
- [ ] All defects closed or accepted-with-ticket
```
