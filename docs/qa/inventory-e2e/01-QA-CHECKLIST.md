# QA Manual Test Checklist — Inventory E2E

**Audience:** QA / manual testers running the suite by hand.
**Format:** every step `S-NN` is a section with checkboxes for each field, button, KPI tile, status chip, conditional control, and number-reconciliation rule.
**Cross-refs:** endpoints/DTOs in [`00-APPENDICES.md`](./00-APPENDICES.md) Appendix A; hazards in Appendix B; enums in Appendix C; log greps in Appendix D; seeding SQL in Appendix E.

---

## Preflight (do once before starting the run)

- [ ] Backend running (`npm run backend:dev:watch`); terminal log file accessible
- [ ] Web at `http://localhost:3001` loads, login as `sanjay.oneohm@gmail.com` / `test@123` works
- [ ] DB client connected to `localhost:5432` / `oneohm_epc`
- [ ] Run the FK-ordered TRUNCATE from plan §1.2 — confirm 0 rows in `projects`, `bom`, `bom_items`, `inventory_stock`, `stock_allocations`, `material_dispatches`, `purchase_orders`, `return_requests`, `inventory_transactions`
- [ ] Set quote back to `accepted` and property back to `active` (UPDATE statements in plan §1.2)
- [ ] Capture golden BOM (Appendix E.3) and paste result table here:

```
<paste golden BOM rows here — these are the source of truth for S-01 and S-04>
```

- [ ] Record test-user `organization_id` (used in Phase 9 reconciliation): `_______`

---

## Phase 1 — Conversion & project skeleton

### S-01 Convert quote → project

**Entry:** open `http://localhost:3001/quotes/97e88a3e-61d3-4f01-a342-04489a5d7221?tab=overview` → click **Convert to Project** in header.

Wizard URL becomes `/projects/new?quoteId=97e88a3e-…&customerId=…&propertyId=…&step=0`.

#### Step 0 — Source Selection
- [ ] Customer chip prefilled with quote's customer
- [ ] Property dropdown shows only properties of that customer; selected property pre-chosen
- [ ] Quote selector pre-chosen to the linked quote
- [ ] If property was already converted: warning alert visible ("property already converted") — **block conversion if so**
- [ ] If no accepted quotes for the customer: alert visible
- [ ] Quote summary grid renders: **Quote #**, **Actual System Size**, **Effective Price**
- [ ] Conditional req-vs-selected sub-line visible when sizes differ
- [ ] **Next** button enabled

#### Step 1 — Project Details
- [ ] **Project Name** prefilled (auto-generated chip visible when not manually edited)
- [ ] Edit name → "Auto-generated" chip disappears
- [ ] **From Quote** read-only block visible: Project Type, Actual System Size (with req/sel sub-line if differs), Estimated Cost
- [ ] **Priority** dropdown (low/medium/normal/high/urgent — all 5 values present)
- [ ] **Start Date** picker
- [ ] **End Date** picker — validate end > start
- [ ] **Description** multiline

#### Step 2 — Team Selection
- [ ] Employee list loads (no "Failed to load employees" error)
- [ ] Add at least one team member
- [ ] Toggle one as Project Manager
- [ ] Remove and re-add a member

#### Step 3 — Project Statuses
- [ ] Default statuses loaded (no Admin → Lookups warning)
- [ ] Each row shows color dot + label + remove icon
- [ ] Remove non-default status → row moves to "Removed — click to add back" chip
- [ ] Try to remove start status → warning displayed
- [ ] Try to remove last remaining status → remove icon disabled

#### Step 4 — Tasks & Milestones
- [ ] Workflow steps loaded
- [ ] Each task row has: exclude toggle, assignee select, milestone select
- [ ] If no team selected: warning alert visible
- [ ] **Add Milestone** button creates new milestone
- [ ] Rename and delete a milestone

#### Step 5 — Review & Confirm
- [ ] Source section: customer / property / quote shown correctly
- [ ] Project Details section reflects all entries
- [ ] Team chips render
- [ ] Task Statuses render with color dots
- [ ] Tasks & Milestones list with excluded count

#### Submit
- [ ] **Create Project** clicked
- [ ] Toast: **Project created successfully**
- [ ] Redirected to `/projects/:newId`
- [ ] Record new `projectId`: `_______`

#### DB asserts (run via SQL — Dev playbook S-01 has exact queries)
- [ ] `projects` row exists for new ID; `status='draft'`, `priority` matches
- [ ] `customer_property.status='converted'` for that property
- [ ] `quotes.status` STILL `accepted` (NOT changed — design)
- [ ] `bom` row exists with `entity_type='project'`, `entity_id=<newId>`
- [ ] `bom_items` count and per-row `quantity`/`unit_price`/`total_price` match the golden BOM
- [ ] Serialized items (panel/inverter/battery) with qty>1 exploded into multiple rows sharing `group_key`
- [ ] **Hazard #5 check:** if BOM missing, grep `terminals/1.txt` for `Failed to copy BOM from quote version` → file defect; remediate via `POST /projects/:id/sync-bom`

---

### S-02 Project Overview tab assertions

**URL:** `/projects/<newId>?tab=overview`

#### Header
- [ ] Breadcrumb: **Projects** → project name
- [ ] Project **name** (h1)
- [ ] **Status** badge ("Draft")
- [ ] **Priority** badge
- [ ] Subtitle: **projectNumber**, **SystemSizeDisplay** (system size kW), **projectType**, "Started <date>" if startDate set
- [ ] **Edit Project** button visible

#### Hero card (`overview-hero.tsx`)
- [ ] Customer initials/avatar + name (link to customer)
- [ ] Customer phone, email
- [ ] Quote link (clickable, → quote detail)
- [ ] Accepted date displayed
- [ ] Type badge
- [ ] **Progress ring** showing 0% (just created)
- [ ] **Health** badge (likely "on_track" — new project)
- [ ] Day-of-total timeline
- [ ] End date shown if set
- [ ] **Next Action** panel: skeleton flashes first, then resolves with a title/subtitle/CTA link

#### Insights strip (six tiles — each must be a clickable Link)
- [ ] **Tasks done** (x/y) → navigates to tasks tab
- [ ] **Overdue tasks** count
- [ ] **Days remaining** (computed from end_date)
- [ ] **Payment received** (%) → `?tab=finance`
- [ ] **Materials ready** (%) → `?tab=bom`
- [ ] **Documents** (generated/total) → `?tab=reports`
- [ ] Loading state: all six show skeletons during fetch

#### Energy impact (`overview-energy-impact.tsx`)
- [ ] Visible ONLY because systemSizeKw > 0 (quote-driven)
- [ ] Layout is 3/5 grid with site card (not full-width)

#### Site card (`overview-site-card.tsx`)
- [ ] Title: **Installation Site**
- [ ] Address lines from property
- [ ] Coords badge visible if lat/lng present
- [ ] **Open in Maps →** link (opens new tab to maps URL)
- [ ] Property-type label
- [ ] Estimated install cost label

#### System specs (`overview-system-specs.tsx`)
- [ ] Panel summary (count + wattage)
- [ ] Inverter summary
- [ ] BOM preview rows (up to MAX_BOM_PREVIEW)
- [ ] Material status badges per row
- [ ] Link to BOM tab
- [ ] Quote link (if present)

#### Financials (`overview-financials.tsx`)
- [ ] Payment terms visualization
- [ ] Totals
- [ ] Overdue count
- [ ] Links to finance/receipts sub-tabs
- [ ] Loading skeleton appears initially

#### Team / Milestones / Activity / Attention / Reports cards
- [ ] All five panels render without console errors

#### Number reconciliation
- [ ] Progress ring % == `projects.progress_percentage` (SQL)
- [ ] Materials ready % == procurement-status endpoint `(procured / total products) * 100`

---

### S-03 Set default warehouse on project

**Action:** in Overview or BOM tab, find **Default Warehouse** selector. Pick the first warehouse.

- [ ] Dropdown shows options formatted as `"<name> (<code>)"`
- [ ] Selection saves
- [ ] Toast: **Default warehouse updated**
- [ ] On API error, optimistic UI rolls back
- [ ] DB: `projects.default_warehouse_id` updated to selected warehouse UUID
- [ ] Record selected warehouse ID for later steps: `_______`

---

## Phase 2 — BOM, allocations, procurement (project-side)

> **Note:** Phase 2 is executed AFTER Phase 4 (PO + receive) so that `inventory_stock` has stock to reserve. If running purely manually, run the Appendix E seeding SQL now instead.

### S-04 BOM tab inspection

**URL:** `/projects/<newId>?tab=bom`

#### Default Warehouse selector (top)
- [ ] Renders with project's current `defaultWarehouseId` selected
- [ ] Help text mentions reservation

#### Conditional banners
- [ ] Initial state (no allocations): NO banners
- [ ] After partial Reserve in S-06: warning alert mentioning **Reserve Stock**
- [ ] After triggering over-dispatch in S-27: error alert listing over-dispatched product names

#### Toolbar
- [ ] **Serials** badge "assigned/total" visible only if serialized BOM items exist
- [ ] **Reserve Stock** button visible (initial state: not fully allocated && bom.id present)
- [ ] After reserve: button disabled and label changes; **Stock Reserved** badge appears when fully allocated

#### Table columns
- [ ] **Material** column (name + brand subline)
- [ ] **Qty** column (with unit)
- [ ] **Unit Price**
- [ ] **Total**
- [ ] **Status** column: per-row badge (Allocated / Over-dispatched / Partial / Pending) + optional serials x/y badge

#### Serialized row expansion
- [ ] Expand icon button visible only on serialized rows with multiple units
- [ ] Sub-rows labeled **Unit 1**, **Unit 2**, …, qty `1 <unit>`
- [ ] Serial number input field with placeholder **Enter serial number**
- [ ] Blur/Enter saves serial → toast on success
- [ ] On HTTP 404: warning toast **This unit was removed from the BOM; serial discarded.**

#### Procurement section (`ProcurementSection`)
- [ ] Loading skeletons render
- [ ] If no expenses: empty state **No procurement data yet**
- [ ] Hero stat cards: **Products**, **Pending**, **Partial**, **Procured**, **Spend** (actual / target), **N over target** chip if any
- [ ] Table columns: **Product**, **Target**, **Spent**, **Remaining**, **Progress** bar, **Spend** (actual/target subtext), **Status** chip + Over chip

---

### S-05 "Extra BOM items" 3 kW scenario

**UI gap:** BOM tab does NOT allow adding ad-hoc lines. Two test paths:

**Path 1 — Direct SQL insert** (simulates dev/finance backfill)
- [ ] Insert one extra `bom_items` row (e.g. extra wire roll) via SQL:
```sql
INSERT INTO bom_items (id, bom_id, item_type, name, quantity, unit, unit_price, total_price, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), b.id, 'accessory', 'TEST Extra DC Wire', 10, 'm', 25, 250, 999, now(), now()
FROM bom b
JOIN projects p ON p.id=b.entity_id AND b.entity_type='project'
WHERE p.quote_id='97e88a3e-61d3-4f01-a342-04489a5d7221';
```
- [ ] Reload BOM tab → row appears with **Pending** status badge
- [ ] Reserve Stock click in S-06 ignores it (no `product_id` → cannot allocate)

**Path 2 — Off-list material via Finance expenses**
- [ ] In `?tab=finance`, open an expense entry, attach an off-list material with quantity + unit_price (creates `expense_product_links` row)
- [ ] Back to BOM tab → Procurement section "Spend" totals increase by the new amount

---

### S-06 Reserve Stock

**Precondition:** `inventory_stock` rows must exist at default warehouse for every product on the BOM with `available_quantity > 0`. Run Appendix E seeding SQL if not already done.

- [ ] Click **Reserve Stock**
- [ ] Button shows **Reserving…** during request
- [ ] Toast on full success: **Stock reserved successfully**
- [ ] Toast on partial: **Stock partially reserved. N item(s) still pending.**
- [ ] Banner now shows partial-allocation warning
- [ ] **Stock Reserved** badge appears if everything covered

#### DB per-product asserts
- [ ] `inventory_stock.available_quantity` decreased by reserve amount
- [ ] `inventory_stock.reserved_quantity` increased by same amount
- [ ] New `stock_allocations` row(s) created with `bom_id`, `project_id`, `warehouse_id`, `product_id`, status `allocated`
- [ ] `inventory_transactions` row per product: `transaction_type='allocation'`, `reference_type='stock_allocation'`, `reference_id=<alloc_id>`
- [ ] `bom.allocation_status` updated to one of `pending`/`partial`/`fully_allocated`

#### Idempotency
- [ ] Click **Reserve Stock** a SECOND time immediately
- [ ] No duplicate `stock_allocations` rows created (partial unique index `uniq_stock_alloc_bom_product_active` enforces)
- [ ] No additional reservation movement (existing rows with sufficient `allocated_quantity` are short-circuited)

---

### S-07 Project Allocations tab

**URL:** `/projects/<newId>?tab=allocations`

- [ ] List matches `GET /stock-allocations?projectId=…` (count + per-row values)
- [ ] Columns visible: **Product** (name + code), **Warehouse**, **Status** chip, **Allocated**, **Dispatched**, **Returned**, view-icon action
- [ ] Row click navigates to `/inventory/allocations/<id>`
- [ ] **Create allocation** button opens dialog with `defaultProjectId` prefilled
- [ ] Create a manual allocation through dialog (Project, Warehouse, Product, Allocated qty, Source type, Notes)
- [ ] After save: row appears in list
- [ ] **Document hazard #8:** the new allocation has `bom_id IS NULL` in DB → won't roll up to BOM allocation status. Note it as expected behavior.
- [ ] On error: **Failed to load allocations** + Retry
- [ ] Empty: **No allocations for this project**

---

## Phase 3 — Warehouse management

### S-08 Inventory Dashboard `/inventory`

#### Permission gate
- [ ] If user lacks `inventory:read`: lock screen with "No access to inventory" — confirm with throwaway test role

#### Header
- [ ] Title **Inventory**
- [ ] TimeWindowPicker presets (7d, 30d, 90d, 365d, custom) all clickable
- [ ] Custom: **From date** + **To date** + **Apply**
- [ ] Inline validation: enter `2026-13-99` → error string **Enter a valid YYYY-MM-DD range…**

#### DashboardKpiStrip (8 tiles)
- [ ] **Total SKUs** → navigates `/inventory`
- [ ] **Low Stock** → `/inventory/alerts`
- [ ] **In Transit** → `/inventory/dispatches`
- [ ] **Pending POs** → `/inventory/purchase-orders`
- [ ] **PO Spend** (secondary: "in selected window")
- [ ] **Outstanding** (secondary: "across all open POs")
- [ ] **Active Allocations** → `/inventory/allocations`
- [ ] **Active Vendors** → `/inventory/vendors`

#### Operations section (4 charts)
- [ ] **Transactions by type**
- [ ] **Allocation funnel**
- [ ] **Dispatch funnel**
- [ ] **Top low-stock items**
- [ ] Each chart has loading skeleton + empty state + error state

#### Financial section (4 charts)
- [ ] **PO spend trend**
- [ ] **Top vendors by spend**
- [ ] **PO spend by warehouse**
- [ ] **Outstanding by vendor**

#### Recent activity rail
- [ ] **InventoryActivityTimeline** lists last 8 stock movements
- [ ] **View all** link → `/inventory/transactions?search=<productName>`
- [ ] Empty state: **No recent inventory activity**

---

### S-09 Warehouses list `/inventory/warehouses`

- [ ] Header: **Warehouses** + count line
- [ ] **Add Warehouse** button visible (requires `inventory:write`)
- [ ] **WarehouseKpiStrip**: Warehouses on page, Active, SKU rows, Inventory value (with "of total" secondary when paginated)
- [ ] **SavedViewsBar** (resource `warehouses`) — `?view=` query updates as views switched
- [ ] Hidden filters open: **Status**, **Type** dropdowns with all enum values
- [ ] Search input "Search by name or code…" filters list
- [ ] Columns: **Warehouse** (name+code), **Type**, **Location** (city/state/country), **Contact**, **SKU rows** (bar or "No stock yet"), **Status**, **actions** menu
- [ ] Actions menu items: **View detail**, **Open in new tab**, **Edit warehouse** (disabled+tooltip when no `inventory:write`)
- [ ] Export CSV downloads file (requires `inventory:export` or `inventory:read`)
- [ ] Row click → warehouse detail
- [ ] Empty states: no matches / no search results / **No warehouses yet**
- [ ] Error state: **Failed to load warehouses**

---

### S-10 Create warehouse

Click **Add Warehouse** → `WarehouseFormDialog`.

Fill every field:
- [ ] **Name** (required)
- [ ] **Code** (required) — try duplicate of an existing warehouse code → expect 409 error toast/inline
- [ ] **Warehouse type**: Own / Third Party radio or select
- [ ] **Status**: Active / Inactive
- [ ] **Address**
- [ ] **City**
- [ ] **State**
- [ ] **PIN code**
- [ ] **Contact person**
- [ ] **Phone**
- [ ] **Email** (try invalid → inline validation error)
- [ ] **Cancel** closes without save
- [ ] **Create warehouse** submits → toast success; new row appears at top of list
- [ ] DB: row in `warehouses` with all fields persisted; `organization_id` set; `deleted_at IS NULL`

Now create the **second warehouse** (`wh2`) needed for transfers in S-17.

---

### S-11 Warehouse detail `/inventory/warehouses/:id`

- [ ] States covered: missing id error / load error with Retry / loading skeletons / not found
- [ ] Header: back arrow, name, chips, address, **Edit** (if permitted)
- [ ] KPI tiles (from stats hook) render

#### Stock tab (default)
- [ ] Columns: **Product**, **Available**, **Reserved**, **Min level**, **Status**
- [ ] Status chips appear correctly: **Fully Reserved**, **Out of Stock**, **Low stock**, **In stock**
- [ ] Search "Search by product..." filters
- [ ] Numbers match `inventory_stock` rows for this warehouse

#### Transactions tab
- [ ] Columns: **Date**, **Type**, **Product**, **Quantity** (+/- colored), **Reference**
- [ ] Signed quantity coloring: greens for `purchase`/`transfer_in`/`return`, reds for `dispatch`/`transfer_out`, neutral for `adjustment`/`allocation`
- [ ] Search filters work

#### Allocations tab
- [ ] Columns: **Product**, **Project**, **Allocated**, **Dispatched**, **Status**
- [ ] Search filters work

---

## Phase 4 — Vendors & POs

### S-12 Create vendor

`/inventory/vendors` → **Add Vendor** → `VendorFormDialog`. Fill every section:

#### Basic Information
- [ ] **Vendor name** (required)
- [ ] **Vendor code** (required) — try duplicate → 409
- [ ] **Vendor type**: Supplier / Contractor / Service Provider
- [ ] **Status**: Active / Inactive / Blacklisted

#### Contact
- [ ] **Contact person**
- [ ] **Email** (invalid → inline error)
- [ ] **Phone**
- [ ] **Alternate phone**

#### Address
- [ ] **Street address**
- [ ] **City**
- [ ] **State**
- [ ] **PIN**
- [ ] **Country** (defaults `India`)

#### Tax
- [ ] **GSTIN** (15 chars)
- [ ] **PAN** (10 chars)

#### Payment Terms
- [ ] **Payment terms** multiline
- [ ] **Credit days** (integer)

#### Bank Details
- [ ] **Bank name**
- [ ] **IFSC**
- [ ] **Account number**

#### Additional
- [ ] **Vendor rating** (0–5)
- [ ] **Notes** multiline

#### Submit & verify
- [ ] Save → toast success → new row in list
- [ ] DB: `vendors` row persists all fields
- [ ] In list, change status via PATCH `/vendors/:id/status` (NOT update DTO) → toast **Vendor status updated**

#### Vendor list filters / columns
- [ ] Filters open: **Status**, **Type**
- [ ] Columns: **Vendor** (name+code), **Type**, **Contact** (person + email/phone), **Location**, **Rating** (stars 0–5), **Status**, actions

Record the new vendor ID: `_______`

---

### S-13 Create Purchase Order

`/inventory/purchase-orders/new` → `po-create-page.tsx`.

#### Vendor & routing
- [ ] **Vendor** picker — pick the vendor from S-12
- [ ] **Warehouse** picker — pick the default warehouse from S-03
- [ ] **PO type** select: switch to **Project specific**
- [ ] When project_specific: **Project** picker becomes REQUIRED — verify red asterisk / blocking validation
- [ ] Pick the new project; switch type back to **Stock** — project optional again

#### PO details
- [ ] **PO date** (required, defaults today)
- [ ] **Expected delivery**
- [ ] **Payment terms** (free text)

#### Line items (add a row per product on golden BOM)
- [ ] **Add line** appends row
- [ ] Each row: product picker, qty, unit price, tax %, notes
- [ ] **Remove** button visible only when >1 line
- [ ] Try duplicate product → schema rejection

#### Notes & terms
- [ ] **Notes**
- [ ] **Terms & conditions**

#### Summary footer
- [ ] Subtotal / tax / total auto-compute from lines
- [ ] **Note:** server recomputes — record what client UI shows vs persisted DB values (Phase 9 reconciliation)

#### Submit
- [ ] **Create PO** → navigates to detail
- [ ] On error: **Could not create PO** alert
- [ ] DB: `purchase_orders` row with `status='draft'`; `purchase_order_items` rows; financials match server recompute
- [ ] Record PO ID: `_______`

---

### S-14 PO lifecycle (submit → approve → send → receive → cancel)

Open `/inventory/purchase-orders/<id>` and use the **Actions** menu.

#### Submit (status `draft` → `pending_approval`)
- [ ] Click **Submit** → status badge changes; row also updated in list

#### Approve (status `pending_approval` → `approved`)
- [ ] Click **Approve** → status changes

#### Send (status `approved` → `sent`)
- [ ] Click **Send** → status changes

#### Receive — partial
- [ ] Click **Receive** → `PoReceiveDialog` opens
- [ ] **Receiving date** input (required) — leave blank, try submit → inline error
- [ ] Per-line **Qty receiving**; try qty > Remaining → inline error
- [ ] Try receiving 0 across all lines → inline error "at least one line qty > 0"
- [ ] Receive HALF the qty on each line → toast success
- [ ] DB: PO `status='partially_received'`; `purchase_order_items.received_quantity` increased; `actual_delivery_date` set; `inventory_stock.available_quantity` increased at PO warehouse; `inventory_transactions` row per item `transaction_type='purchase'`, `reference_type='purchase_order'`

#### Receive — remaining
- [ ] Open Receive dialog again, receive REMAINING quantity
- [ ] DB: PO `status='received'`; received_quantity caps at ordered

#### Cancel
- [ ] On a different PO in `draft` or `pending_approval`: open list, click **Cancel** action
- [ ] Confirm dialog text: `Cancel PO <poNumber>? This will release any reserved stock and cannot be undone.`
- [ ] Provide reason in modal (required)
- [ ] DB: PO `status='cancelled'`; if had stock allocations, they're released

---

## Phase 5 — Stock operations

### S-15 Stock list with low-stock deep link

- [ ] Open `/inventory/stock?filter=low-stock`
- [ ] Title becomes **Low stock items**
- [ ] Chip **Low stock filter active** visible
- [ ] `StockKpiStrip` renders correctly
- [ ] Saved views bar works (resource `inventory-stock`)
- [ ] Hidden filters: **Warehouse**, **Stock level**

#### Columns
- [ ] **Product**, **Warehouse**, **Available** (warning icon when low), **Reserved**, **In transit**, **vs Min level** bar (or "No threshold set"), **Status**, actions
- [ ] Actions menu: View, Open tab, Adjust (gated), Transfer (gated + disabled when available ≤ 0)

---

### S-16 Stock detail `/inventory/stock/:id`

Pick a row that received PO stock in S-14.

- [ ] Header back link → list
- [ ] Title + low/in-stock chip
- [ ] **Transfer** button (disabled if rules forbid)
- [ ] **Adjust** button

#### Tiles
- [ ] **Available** — matches `inventory_stock.available_quantity`
- [ ] **Reserved** — matches `inventory_stock.reserved_quantity`
- [ ] **In transit** — matches `inventory_stock.in_transit_quantity` (**Hazard #2:** likely 0 even after dispatch)
- [ ] **Min / Max**

#### Buffer-vs-minimum panel
- [ ] Visible ONLY when `min > 0`
- [ ] Explanatory text varies by ratio (low / within 50% / healthy)

#### Recent transactions card
- [ ] Lists recent ledger rows with type labels and signed-quantity coloring
- [ ] **View all** → `/inventory/transactions?productId=…&warehouseId=…`

---

### S-17 Transfer stock

Open Transfer dialog on the product seeded at `wh1`.

- [ ] **Destination warehouse** picker — pick `wh2`
- [ ] **Quantity** input — try qty > available → inline error
- [ ] **Notes** field
- [ ] **Transfer** submits
- [ ] On error: error toast (no success toast — UX known)
- [ ] DB: `wh1.available_quantity` decreased by qty
- [ ] DB: `wh2.available_quantity` increased by qty (row upserted)
- [ ] DB: TWO `inventory_transactions` rows — `transfer_out` at wh1 with `reference_id=wh2_id`, and `transfer_in` at wh2 with `reference_id=wh1_id`
- [ ] Numbers refresh on screen after transfer

---

### S-18 Adjust stock

Open Adjust dialog.

- [ ] Read-only **Available / Reserved / Min** values displayed
- [ ] **New quantity** input
- [ ] **Reason** (required, non-empty) — try empty submit → blocked
- [ ] **Adjust stock** submits
- [ ] DB: `inventory_stock.available_quantity` SET to `newQuantity`
- [ ] DB: one `inventory_transactions` row with `transaction_type='adjustment'`, `reference_type='manual_adjustment'`, notes contain `[REASON: <text>]`
- [ ] Quantity delta equals (newQuantity - oldAvailable) — sign preserved in human reading; ledger stores `abs(delta)`

---

### S-19 Transaction Ledger `/inventory/transactions`

- [ ] `TransactionKpiStrip` renders
- [ ] SavedViewsBar (resource `inventory-transactions`)
- [ ] Columns: **Date**, **Type**, **Product**, **Warehouse** (transfer rows: two-line from→to), **Quantity** (signed/colored), **Reference** with **Open reference** icon
- [ ] Reference icon routes correctly:
  - `purchase_order` → PO detail
  - `material_dispatch` → dispatch detail
  - `stock_allocation` → allocation detail
- [ ] Hidden filters: **Type** (all `InventoryTransactionType`), **Reference type** (PO / Allocation / Dispatch / Warehouse Transfer / Manual Adjustment), **Warehouse**
- [ ] Export CSV works

---

### S-20 Low Stock alerts `/inventory/alerts`

> Trigger low-stock condition first: dispatch enough qty (S-21–22) so `available_quantity <= minimum_stock_level` for at least one product.

- [ ] KPI tiles: **Items below minimum**, **Out of stock** (page), **Total deficit (page)**, **Warehouses affected (page)**
- [ ] **Create PO** toolbar button visible only when canCreatePo && rows>0
- [ ] **Hazard #6:** alerts page checks `purchaseOrder:write`; PO list checks `purchase-order:write`. Test with a role missing one but not the other → file defect if inconsistent
- [ ] Columns: **Product**, **Warehouse**, **Available** (warning), **Min level**, **Deficit**, **Reorder**, **Reserved**, actions
- [ ] **Create PO from this** row action → `/inventory/purchase-orders/new?warehouseId=…&productId=…&quantity=…&source=low-stock-alert`
- [ ] Toolbar **Create PO** navigates without prefill

---

## Phase 6 — Dispatch lifecycle (partial / full / return)

### S-21 Create dispatch `/inventory/dispatches/new`

- [ ] **Project** autocomplete — pick the test project
- [ ] **Warehouse** select — pick the default warehouse
- [ ] **From allocations** picker rows: each has **Allocation** select (filtered by project+warehouse) + **Quantity** + remove
- [ ] **Add line** button disabled until project+warehouse chosen
- [ ] If no allocations: helper text visible
- [ ] **Vehicle number**, **Transport company**, **Driver name**, **Driver phone**
- [ ] **Dispatch date** picker
- [ ] **Expected delivery** picker
- [ ] **Notes** multiline
- [ ] **Create dispatch** → toast success → list
- [ ] DB: `material_dispatches` row `status='prepared'`; `material_dispatch_items` rows with `stock_allocation_id` set
- [ ] Record dispatch ID: `_______`

---

### S-22 Mark dispatched

- [ ] Open dispatch detail, click **Mark dispatched**
- [ ] Confirm dialog "Mark <#> as dispatched?"
- [ ] Toast success
- [ ] DB: dispatch `status='in_transit'`
- [ ] DB per item: `inventory_stock.reserved_quantity` DECREASED by qty (via `deductReservedStock`)
- [ ] DB: linked allocation `dispatched_quantity` INCREASED; status moves to `partially_dispatched` or `dispatched`
- [ ] DB: `inventory_transactions` row per item: `transaction_type='dispatch'`, `reference_type='material_dispatch'`, `reference_id=<dispatch_id>`

---

### S-23 Mark delivered (full & partially_delivered)

- [ ] **Mark delivered** confirm dialog "Mark <#> as delivered today?"
- [ ] DB: dispatch `status='delivered'` (or `partially_delivered` if subset); `actual_delivery_date=today`; `received_by` stored
- [ ] DB: linked allocations advance to `completed` when `dispatched_quantity >= allocated_quantity`

Also test the `PATCH /material-dispatches/:id/status` body with `partially_delivered` for a different dispatch:
- [ ] Status only changes; no stock movement (this is the Hazard #4 surface area — see S-25)

---

### S-24 Cancel dispatch

On a dispatch in `in_transit`:
- [ ] Cancel via list action → prompt for reason → confirm
- [ ] DB: dispatch `status='cancelled'`
- [ ] DB: `inventory_stock.reserved_quantity` RESTORED (via `restoreReservedStock`)
- [ ] DB: linked allocation `dispatched_quantity` REVERTED; status returned to prior
- [ ] DB: `inventory_transactions` row `transaction_type='allocation'` with notes mentioning dispatch cancel

---

### S-25 Status-patch hazard test (Hazard #4)

- [ ] Create a fresh dispatch in `prepared`
- [ ] Call `PATCH /material-dispatches/:id/status` with body `{ status: "dispatched" }` directly (via network tab replay or curl)
- [ ] Observe: dispatch status changes BUT `inventory_stock.reserved_quantity` UNCHANGED → file defect: status-patch bypasses `deductReservedStock`
- [ ] Use bullet to remediate via `mark-dispatched` instead

---

### S-26 Return stock from allocation

Open `/inventory/allocations/<id>` for an allocation with `dispatched_quantity > 0`.

- [ ] **Return stock** button visible (status conditions met)
- [ ] Dialog: **Quantity** (max = dispatched - already returned), **Reason** (required)
- [ ] Submit → toast success
- [ ] DB: `inventory_stock.available_quantity` INCREASED by returned qty (row upserted if missing)
- [ ] DB: allocation `returned_quantity` INCREASED; `returned_at` set
- [ ] DB: `inventory_transactions` row `transaction_type='return'`, `reference_type='stock_allocation_return'`

---

### S-27 Return-requests workflow (BOM reconcile path)

Trigger by reducing BOM qty below already-dispatched qty (must edit via service / SQL since UI doesn't allow):
- [ ] UPDATE `bom_items` SET `quantity = quantity - 1` for a product that was dispatched
- [ ] Call `POST /projects/:id/sync-bom` OR re-run quote calc + persist
- [ ] DB: new `return_requests` row with `status='pending'`, `allocation_id`, `bom_id`, `quantity = dispatched - newRequired`
- [ ] DB: BOM item `specifications` JSONB now contains `{"overDispatched": true}`
- [ ] BOM tab now shows red banner listing the over-dispatched product name

#### Complete the return request
- [ ] `PATCH /inventory/return-requests/:id/complete`
- [ ] DB: request `status='completed'`, `completed_at`, `completed_by` set
- [ ] DB: `inventory_stock.available_quantity` increased (via `returnToStock`)
- [ ] DB: `inventory_transactions` row `transaction_type='return'`

#### Cancel a different request
- [ ] `PATCH /inventory/return-requests/:id/cancel`
- [ ] DB: `status='cancelled'`; `completed_by` reused to store the cancelling user (field-reuse — document)

---

## Phase 7 — Allocations module deep dive

### S-28 Allocations list `/inventory/allocations`

- [ ] No **Create** button on global list (allocations come from BOM/flows) — documented behavior
- [ ] KPI strip renders
- [ ] Filters: **Status**, **Warehouse**
- [ ] Columns: **Product**, **Project**, **Warehouse**, **Allocated**, **Dispatched** (progress bar), **Returned**, **Status**, actions
- [ ] Actions: View / Open new tab / Fulfill / Cancel (gated)

#### Inline Fulfill
- [ ] Click Fulfill on a row with remaining → `window.confirm` "Fulfill N units for <product>?"
- [ ] OK → `POST /stock-allocations/:id/fulfill` with `fulfilledQuantity` = remaining, `fulfillmentDate` = today
- [ ] DB: allocation `dispatched_quantity` increased, status advances
- [ ] DB: `inventory_stock.reserved_quantity` decreased; `inventory_transactions` row `dispatch`
- [ ] **Note:** Fulfill on allocation does NOT create a `material_dispatches` record — only `mark-dispatched` on a dispatch does

#### Inline Cancel
- [ ] Click Cancel → `window.prompt` for reason
- [ ] DB: `status='cancelled'`; if had undispatched qty, available restored

---

### S-29 Allocation detail `/inventory/allocations/:id` + Hazard #1 hunt

- [ ] Invalid ID → error message
- [ ] Loading skeletons
- [ ] Header actions: **Cancel** / **Fulfill** / **Return stock** (gated correctly)
- [ ] KPI cards
- [ ] Detail grid: **Source type**, **Allocated on**, **Last dispatched**, **Notes**

#### Dialogs (validate every field)
- [ ] Return stock: Quantity (max), Reason (required)
- [ ] Fulfill: Quantity (max remaining), Notes optional
- [ ] Cancel allocation: Reason required

#### Hazard #1 explicit test
- [ ] In browser devtools / curl: `PATCH /stock-allocations/:id` body `{"expectedDispatchDate": "2026-06-01"}`
- [ ] Observe response — service writes to a column that doesn't exist
- [ ] Check `terminals/1.txt` for `QueryFailedError` referencing `expectedDispatchDate`
- [ ] File defect: either add the entity column + migration OR drop the DTO field

---

## Phase 8 — Vendor & PO follow-through

### S-30 Vendor detail follow-through

`/inventory/vendors/<vendor_id_from_S-12>`.

#### Tabs: Purchase orders | Projects
- [ ] PO tab: search by PO #, columns **PO** / **Date** / **Total** / **Status**; row → PO detail
- [ ] Projects tab loads `GET /project-vendors/vendor/:id` → likely empty for new vendor
- [ ] Create a `project_vendors` row to link this vendor to the project:
  - via UI if available, or directly: `POST /project-vendors` with body `{projectId, vendorId, vendorRole, contractValue, …}`
- [ ] Projects tab now shows the link with columns **Project** (name+code), **Role**, **Contract value**, **Status**
- [ ] Row click → `/projects/:projectId`

---

### S-31 PO bulk operations

Create at least 3 POs in `pending_approval` for this test (re-use S-13 a few times).

#### Bulk approve
- [ ] Select 3 POs in list → bulk action **Approve** → `POST /purchase-orders/bulk/approve`
- [ ] Response: `BulkOperationResultDto` with `succeeded[]` and `failed[]` per-id
- [ ] Grep `terminals/1.txt`: `\[PO.bulkApprove\]` lines for any failures
- [ ] DB: all selected POs now `status='approved'`

#### Bulk cancel
- [ ] Select POs, provide reason → `POST /purchase-orders/bulk/cancel`
- [ ] Same `BulkOperationResultDto` shape
- [ ] Grep `\[PO.bulkCancel\]` for failures
- [ ] DB: all selected `status='cancelled'`

---

## Phase 9 — Cross-screen number reconciliation pass

For each pair, capture the UI number, run the SQL, assert equality (±0.001). Failures → Phase 10.

| # | UI surface | UI number | SQL (org-scoped) | Match? |
|---|-----------|-----------|------------------|--------|
| 9.1 | Inventory Dashboard | Total SKUs | `SELECT COUNT(*) FROM inventory_stock WHERE organization_id=:org` | [ ] |
| 9.2 | Inventory Dashboard | Low Stock count | `SELECT COUNT(*) FROM inventory_stock WHERE organization_id=:org AND minimum_stock_level IS NOT NULL AND minimum_stock_level > 0 AND available_quantity <= minimum_stock_level` | [ ] |
| 9.3 | Inventory Dashboard | Active Allocations | `SELECT COUNT(*) FROM stock_allocations WHERE organization_id=:org AND status NOT IN ('cancelled','completed')` | [ ] |
| 9.4 | Inventory Dashboard | In Transit | `SELECT COUNT(*) FROM material_dispatches WHERE organization_id=:org AND status IN ('in_transit','partially_delivered')` | [ ] |
| 9.5 | Warehouse detail | Inventory value | `SELECT SUM(s.available_quantity * pp.price) FROM inventory_stock s JOIN product_prices pp ON pp.product_id=s.product_id AND pp.organization_id IN (s.organization_id, NULL) AND CURRENT_DATE BETWEEN COALESCE(pp.effective_from,CURRENT_DATE) AND COALESCE(pp.effective_to,CURRENT_DATE) WHERE s.warehouse_id=:wh_id` | [ ] |
| 9.6 | Stock detail tiles | Available / Reserved / In transit | `SELECT available_quantity, reserved_quantity, in_transit_quantity FROM inventory_stock WHERE id=:stock_id` | [ ] |
| 9.7 | Project BOM Procurement | Spend actual per product | `SELECT product_id, SUM(quantity*unit_price) FROM expense_product_links epl JOIN project_expenses pe ON pe.id=epl.project_expense_id AND pe.deleted_at IS NULL WHERE pe.project_id=:project_id GROUP BY product_id` | [ ] |
| 9.8 | Allocation funnel chart | Counts per status | `SELECT status, COUNT(*) FROM stock_allocations WHERE organization_id=:org GROUP BY status` | [ ] |
| 9.9 | Dispatch funnel chart | Counts per status | `SELECT status, COUNT(*) FROM material_dispatches WHERE organization_id=:org GROUP BY status` | [ ] |
| 9.10 | Dispatch detail item qty | Per-product qty | `SELECT product_id, SUM(quantity) FROM material_dispatch_items WHERE dispatch_id=:d_id GROUP BY product_id` | [ ] |
| 9.11 | PO detail Received progress | per-item received_quantity | `SELECT product_id, received_quantity FROM purchase_order_items WHERE purchase_order_id=:po_id` | [ ] |
| 9.12 | BOM tab allocation status | `bom.allocation_status` | `SELECT allocation_status FROM bom WHERE id=:bom_id` | [ ] |

For each mismatch:
- Note the screen, the UI value, the SQL value, the difference
- Hand the case to the developer playbook (Phase 10)

---

## Phase 10 — Bug-fix loop (QA's role)

For every failed assertion above:

1. Capture evidence: screenshot of UI, response body from network tab, relevant `terminals/1.txt` excerpt
2. File a defect ticket using template:
   - Title: `[Inventory E2E][S-NN] <one-line summary>`
   - Steps to reproduce (link to this checklist section)
   - Expected vs actual
   - Hazard classification (1–8 from Appendix B, or "new")
   - SQL evidence
   - Log excerpt
3. After dev fix:
   - Re-run the failing S-NN
   - Re-run ALL downstream S-NN (because state may have changed)
   - Re-run Phase 9 reconciliation table fully
4. Mark all checkboxes green only when end-to-end run is clean

---

## Sign-off

- [ ] All steps S-01..S-31 completed
- [ ] Phase 9 reconciliation: all 12 rows match
- [ ] All hazards (Appendix B 1–8) explicitly tested and outcome recorded
- [ ] No unresolved defects open
- [ ] Run notes (date, tester, build SHA): `_______`
