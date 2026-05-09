# Inventory Module — End-to-End Demo & User Manual

> Real-world walkthrough using a **10 kW residential rooftop solar project for Mr. Rajesh Sharma, Andheri East, Mumbai**.
>
> Read top-to-bottom. Every step is an action you take in the UI. By the end you will have:
> a brand → a product → a warehouse → a vendor → stock received via PO → stock allocated to a project (via BOM) → material dispatched to site → and a full audit trail in transactions.
>
> App URL used in this guide: `http://localhost:3001`

---

## Contents

1. [What this module does (the mental model)](#1-what-this-module-does)
2. [How everything connects (one picture)](#2-how-everything-connects)
3. [Pre-flight: Admin Panel setup (Brands → Product Types → Products)](#3-pre-flight-admin-panel-setup)
4. [Inventory Step 1 — Create your Warehouse](#4-step-1--create-your-warehouse)
5. [Inventory Step 2 — Create your Vendor](#5-step-2--create-your-vendor)
6. [Inventory Step 3 — Raise a Purchase Order (PO) and receive stock](#6-step-3--purchase-order--receive-stock)
7. [Inventory Step 4 — Verify the Stock list](#7-step-4--verify-the-stock-list)
8. [Project side Step 5 — Sync BOM from Quote and Finalize & Allocate](#8-step-5--project-bom--finalize--allocate)
9. [Project side Step 6 — The Allocations tab on the project](#9-step-6--project-allocations-tab)
10. [Inventory Step 7 — Create a Material Dispatch (deliver to site)](#10-step-7--material-dispatch)
11. [Inventory Step 8 — Returns from site](#11-step-8--returns-from-site)
12. [Inventory Step 9 — Transactions ledger (the audit trail)](#12-step-9--transactions-ledger)
13. [Inventory Step 10 — Low Stock Alerts](#13-step-10--low-stock-alerts)
14. [Inventory Step 11 — The Dashboard (executive view)](#14-step-11--inventory-dashboard)
15. [Status reference (full state machines)](#15-status-reference)
16. [Demo script (suggested 20-minute client run)](#16-suggested-20-minute-client-demo-script)

---

## 1. What this module does

The Inventory module manages the physical material life-cycle for an EPC business:

> **Purchase from vendors → store in warehouses → reserve for a project → dispatch to site → return any leftovers → close out.**

Every quantity that moves is recorded as an **Inventory Transaction** so finance and ops can audit it later.

**Key entities (single-line each):**

| Entity | What it is |
|---|---|
| **Brand / Product Type / Product** | Master data (lives in Admin Panel). Inventory operates on Products. |
| **Warehouse** | A physical place that holds stock. |
| **Vendor** | A supplier you buy from (or a contractor / service provider). |
| **Purchase Order (PO)** | A document that promises money to a vendor in exchange for goods. When goods arrive, stock is added to a warehouse. |
| **Inventory Stock** | Per (warehouse, product) row showing **available**, **reserved**, **in-transit** quantities. |
| **Stock Allocation** | A reservation of stock for a specific project. Stock moves from `available` → `reserved`. |
| **Material Dispatch** | The physical despatch from warehouse to project site. When marked dispatched, `reserved` is consumed. |
| **Inventory Transaction** | Append-only ledger of every stock movement (purchase, allocation, dispatch, return, transfer, adjustment). |

---

## 2. How everything connects

```
Admin Panel                 Inventory Module                          Project Module
-----------                 ----------------                          --------------
Brand ──► Product           Warehouse  Vendor                         Project
                              │          │                              │
                              ▼          ▼                              │
                            Purchase Order (DRAFT → APPROVED → SENT)    │
                                  │                                     │
                                  ▼ Receive                             │
                            Inventory Stock                             │
                            (available ↑)                               │
                                  │                                     │
                                  └────── Finalize & Allocate ◄─────── BOM tab
                                                  │
                                                  ▼
                                          Stock Allocation
                                          (available ↓, reserved ↑)
                                                  │  appears in
                                                  ▼
                                              Project ► Allocations tab
                                                  │
                                                  ▼
                                          Material Dispatch
                                          (reserved ↓, leaves warehouse)
                                                  │
                                                  ▼
                                              Delivered on site

Every arrow above writes a row in **Inventory Transactions** (the ledger).
```

That's the whole mental model. The rest of this document is "what buttons to press, in order".

---

## 3. Pre-flight: Admin Panel setup

> **You said you only have products today.** Inventory cannot create products — it only consumes them. Products come from the Admin Panel and they require a Brand. So first confirm the chain is in place.

### 3.1 Open Admin Panel → Brands

URL: `/admin/brands`

A Brand is the manufacturer (e.g. *Tata Power Solar*, *Luminous*, *Microtek*). Every Product belongs to exactly one Brand.

**Create one Brand for the demo:**

1. Click **Add Brand**
2. Name: `Tata Power Solar`
3. (Optional) Description: `Tier-1 panel & inverter manufacturer`
4. Save.

> Repeat for any other brands you need (e.g. `Luminous` for batteries).

### 3.2 Admin Panel → Product Types

URL: `/admin/product-types`

A Product Type is the category (Panel, Inverter, Battery, Cable, Mounting Structure…). Used for grouping and reports.

For a 10 kW solar project you typically need: **Panel, Inverter, Battery, DC Cable, AC Cable, Earthing Kit, Mounting Structure**.

### 3.3 Admin Panel → Products

URL: `/admin/products`

This is the master where you actually create the SKUs you'll buy and stock.

**Create the products for our 10 kW demo. Click "Add Product" for each:**

| # | Name | Brand | Type | Unit | Unit Cost (₹) |
|---|---|---|---|---|---|
| 1 | TATA 540W Mono PERC Panel | Tata Power Solar | Panel | nos | 12,500 |
| 2 | TATA 10kW On-Grid Inverter | Tata Power Solar | Inverter | nos | 78,000 |
| 3 | Luminous 150Ah Lithium Battery | Luminous | Battery | nos | 45,000 |
| 4 | DC Cable 4 sq mm (Red) | Polycab | Cable | mtr | 65 |
| 5 | DC Cable 4 sq mm (Black) | Polycab | Cable | mtr | 65 |
| 6 | Galvanized Mounting Structure | (any) | Mounting | set | 22,000 |
| 7 | Earthing Kit | (any) | Accessory | set | 4,500 |

> **Tip:** Set a **Minimum Stock Level** on each product (e.g. Panel = 5, Cable = 50). This is what powers the **Low Stock Alerts** page later.

---

## 4. Step 1 — Create your Warehouse

URL: **`/inventory/warehouses`** → click **Add Warehouse** (top-right).

Fill the form (matches the actual `CreateWarehouseDto`):

| Field | Demo value |
|---|---|
| Name | `Main Warehouse Mumbai` |
| Code | `WH-MUM-001` (must be unique) |
| Type | `Own` (other option: `Third party`) |
| Address | `Plot 14, MIDC Industrial Estate, Andheri East` |
| City / State / Country / Pincode | `Mumbai / Maharashtra / India / 400069` |
| Warehouse Manager | (pick yourself) |
| Contact person / Phone / Email | `Rajesh Kumar / +91-9876543210 / wh@oneohm.demo` |
| Status | `Active` |

Save. The warehouse appears in the list. Open the detail page — note the tabs (Stock, Transactions, Activity). They are empty for now.

> **Demo line:** *"This is where physical material lives. We can have many warehouses; each PO and allocation must point at one."*

---

## 5. Step 2 — Create your Vendor

URL: **`/inventory/vendors`** → click **Add Vendor**.

| Field | Demo value |
|---|---|
| Name | `Tata Power Solar Distribution` |
| Code | `VEN-TPS-001` |
| Vendor type | `Supplier` |
| Contact person / Email / Phone | `Amit Sharma / sales@tatapower.demo / +91-9988776655` |
| Address | `Plot 123, MIDC, Mumbai, MH 400069` |
| GSTIN / PAN | `27AAACT1234A1Z5` / `AAACT1234A` |
| Payment terms / Credit days | `Net 30 days from invoice` / `30` |
| Bank Name / A/C / IFSC | `HDFC Bank / 50100123456789 / HDFC0001234` |
| Rating | `4.5` |
| Status | `Active` |

Save. (Vendor types: **Supplier**, **Contractor**, **Service Provider**.)

> **Demo line:** *"GSTIN, PAN, payment terms and bank details flow into PO printouts and the finance module."*

Repeat once more for **Luminous** (batteries) so the demo has two vendors.

---

## 6. Step 3 — Purchase Order & Receive Stock

This is the **only** way new stock enters the system in the demo. (Returns and adjustments also add stock, but PO is the primary path.)

### 6.1 Create the PO

URL: **`/inventory/purchase-orders`** → click **New PO** (or `/inventory/purchase-orders/new`).

Header:

| Field | Value |
|---|---|
| Vendor | `Tata Power Solar Distribution` |
| Warehouse | `Main Warehouse Mumbai` (REQUIRED to receive later) |
| Project (optional) | leave blank — this is **Stock PO**, not project-specific |
| PO Type | `Stock` |
| PO Date | today |
| Expected Delivery Date | today + 7 days |
| Payment Terms | `Net 30 days` |

Line items — add at least 2 rows:

| Product | Ordered Qty | Unit Price | Tax % |
|---|---|---|---|
| TATA 540W Mono PERC Panel | 20 | 12,500 | 18 |
| TATA 10kW On-Grid Inverter | 1 | 78,000 | 18 |

The form auto-calculates **Subtotal**, **Tax**, **Total**. Save.

> **System action:** PO is created in status **DRAFT**, with a unique **PO number** generated by the backend.

### 6.2 Walk it through the approval lifecycle

Open the PO detail page. You will see action buttons that follow this strict state machine:

```
DRAFT ─► PENDING_APPROVAL ─► APPROVED ─► SENT ─► (PARTIALLY_)RECEIVED
          │                                         │
          └──── CANCELLED ◄─────────────────────────┘  (can also cancel before stock receipt)
```

Click each button in order:

1. **Submit for Approval** — moves DRAFT → PENDING_APPROVAL.
2. **Approve** — moves PENDING_APPROVAL → APPROVED.
3. **Send to Vendor** — moves APPROVED → SENT. (In real life, a PDF would be emailed.)

> **Important:** The PO can only be edited while in `DRAFT` or `PENDING_APPROVAL`. Once APPROVED you can only Receive, Cancel, or Record Payment.

### 6.3 Receive the goods (the moment stock is born)

Click **Receive Stock**. A dialog opens with each line item.

For the demo, receive **partially** first to show the partial flow:

| Product | Received Now |
|---|---|
| TATA 540W Mono PERC Panel | 15 (out of 20) |
| TATA 10kW On-Grid Inverter | 1 (out of 1) |

Confirm.

**What just happened in the system (verified from the code):**

- PO status → `PARTIALLY_RECEIVED` (because panels are still short by 5).
- For each received line, **Inventory Stock** rows are created/updated:
  - `Main Warehouse Mumbai` × `TATA Panel` → `available_quantity = 15`
  - `Main Warehouse Mumbai` × `TATA Inverter` → `available_quantity = 1`
- Two **Inventory Transactions** of type `purchase` are written (one per line) referencing this PO.
- `actualDeliveryDate` on the PO is set to today.

Click **Receive Stock** again, take the remaining 5 panels. PO status flips to **RECEIVED**.

### 6.4 Record a vendor payment (optional but expected for a finance demo)

On the PO detail page click **Record Payment**:

- Amount: ₹1,00,000
- Notes: "Advance payment via NEFT"

Payment status: `PENDING` → `PARTIAL`. Pay the rest later → status becomes `PAID`.

> **Demo line:** *"Notice the PO can never have payments above its total, and you can't record a payment on a draft or cancelled PO. That's enforced server-side."*

---

## 7. Step 4 — Verify the Stock list

URL: **`/inventory/stock`**

You should now see:

| Warehouse | Product | Available | Reserved | In-transit |
|---|---|---|---|---|
| Main Warehouse Mumbai | TATA 540W Panel | 20 | 0 | 0 |
| Main Warehouse Mumbai | TATA 10kW Inverter | 1 | 0 | 0 |

Click any row → opens **Stock detail page**. You can see the full transaction history for that (warehouse × product) plus a quick-action menu (Adjust quantity, Transfer to another warehouse).

> **Demo line:** *"Three buckets — available is what we can sell/allocate, reserved is held for a project, in-transit is between warehouses."*

---

## 8. Step 5 — Project BOM → Finalize & Allocate

This is the **single most important link** between the project module and inventory. Pay attention.

### 8.1 Create the demo project

(Skip this section if you already have a project to demo.)

Open the **Customer module**, create customer **Mr. Rajesh Sharma** with site address in Andheri East. Create a **Project** under him called **"Sharma Residence – 10 kW Rooftop"**. Walk through your existing project create wizard. Add a **Quote** with the line items mirroring the products in §3.3.

### 8.2 Open the project → BOM tab

The BOM (Bill of Materials) tab is fed from the approved Quote.

If the BOM is empty, click **Sync BOM from Quote** — this reads the latest quote items and builds the BOM.

You'll see something like:

| Material | Qty | Unit Price | Total | Serials |
|---|---|---|---|---|
| TATA 540W Panel | 20 nos | ₹12,500 | ₹2,50,000 | 0/20 assigned |
| TATA 10kW Inverter | 1 no | ₹78,000 | ₹78,000 | 0/1 assigned |
| Luminous Battery | 4 nos | ₹45,000 | ₹1,80,000 | 0/4 assigned |
| DC Cable 4 sq mm Red | 60 mtr | ₹65 | ₹3,900 | (not required) |
| … | … | … | … | … |

Notice **"Serials" column**: panels, inverters, batteries are *serialised* item types — you can expand the row and enter a unique serial number per unit. Cables / mounting / earthing are not.

### 8.3 Click **Finalize & Allocate BOM**

A dialog appears asking for the **source warehouse**. Pick `Main Warehouse Mumbai`. Confirm.

**What the system does (from `bom.service.ts → finalizeAndAllocate`):**

1. Groups BOM lines by `productId` and sums required quantities.
2. For each product, checks if `available_quantity` in the chosen warehouse ≥ required.
3. If **anything is short**, returns a list of shortages and stops — no partial allocation.
4. If everything is sufficient, creates **one Stock Allocation per product**, all in a single transaction.
5. Updates the BOM status from `finalized` → `allocated`. The button now reads **"BOM Allocated"** and is disabled (idempotent).

Each allocation moves stock atomically:
- `available_quantity` ↓ by required qty
- `reserved_quantity` ↑ by required qty
- An **Inventory Transaction** of type `allocation` is logged

> **Demo line:** *"In one click we have just reserved every gram of material this project needs. If even one item is short, the system tells us exactly what to buy — it won't half-allocate."*

### 8.4 What if stock is short?

Try it: edit BOM to require 30 panels (we only have 20). Click **Finalize & Allocate** again. The dialog returns a shortage report:

> *Panels: required 30, available 20 — shortage 10*

Action: go raise a PO for the missing 10 panels (→ §6), receive them, come back, click **Finalize & Allocate** again. Now it succeeds.

---

## 9. Step 6 — Project Allocations tab

Still on the same project, switch to the **Allocations** tab. You see the allocations the BOM step just created — one row per product. Status: **ALLOCATED**.

Each row shows: product, warehouse, allocated qty, dispatched qty, returned qty, status.

You can also **manually create an allocation** here (the **+ New Allocation** button). Use this when you bypass the BOM (e.g. an emergency replacement part).

Click any allocation → opens **Allocation detail page** at `/inventory/allocations/[id]` with these actions:

| Button | What it does |
|---|---|
| Edit | Update notes / expected dispatch date only (qty changes blocked) |
| Cancel | Releases reserved stock back to available, status → CANCELLED |
| Return to Stock | After dispatch, accepts a return qty, adds back to available, writes a `return` transaction |

---

## 10. Step 7 — Material Dispatch

This is the moment material physically leaves the warehouse and goes to site.

URL: **`/inventory/dispatches`** → click **New Dispatch** (or `/inventory/dispatches/new`).

Header:

| Field | Value |
|---|---|
| Project | `Sharma Residence – 10 kW Rooftop` |
| Warehouse | `Main Warehouse Mumbai` |
| Dispatch Date | today |
| Expected Delivery Date | today |
| Vehicle Number | `MH-04-AB-1234` |
| Driver Name / Phone | `Suresh / +91-9000000000` |
| Transport Company | `Self / Local Tempo` |

**Line items** — link each line to the project's allocation:

| Product | Qty | Linked Allocation |
|---|---|---|
| TATA 540W Panel | 20 | (auto-suggested from project allocations) |
| TATA 10kW Inverter | 1 | … |
| … | … | … |

Save → dispatch is created in status **PREPARED**.

### 10.1 Dispatch state machine

Follow this exact order on the dispatch detail page:

```
PREPARED ─► DISPATCHED ─► IN_TRANSIT ─► DELIVERED
   │            │              │
   └────────────┴──────────────┴───► CANCELLED
```

Click each button:

1. **Mark Dispatched** — moves PREPARED → DISPATCHED **and**:
   - Deducts the qty from `reserved_quantity` for each line
   - Increments `dispatchedQuantity` on the linked allocation; allocation status updates to `PARTIALLY_DISPATCHED` or `DISPATCHED`
   - Writes a `dispatch` Inventory Transaction per line
2. **Mark In Transit** — DISPATCHED → IN_TRANSIT (paperwork only).
3. **Mark Delivered** — IN_TRANSIT → DELIVERED. Capture **Received By** (a user) and actual delivery date. The dispatch is now closed.

> **Demo line:** *"Notice that reserved stock is consumed only at the moment we mark dispatched — not when the allocation is created. This is what prevents double-booking."*

### 10.2 Partial deliveries

If the truck delivers only some of the load, set status **PARTIALLY_DELIVERED** and capture per-line received qty. Items short on delivery stay reserved until the next dispatch covers them.

---

## 11. Step 8 — Returns from site

Site found 2 panels damaged. Open the relevant **Allocation detail page**, click **Return to Stock**:

- Quantity: `2`
- Reason: `Damaged in transit / installation`

System action:
- `availableQuantity` += 2 (back into stock you can re-allocate)
- `returnedQuantity` on the allocation += 2
- Writes a `return` Inventory Transaction

> Cap: you can never return more than `dispatched - alreadyReturned`.

---

## 12. Step 9 — Transactions ledger

URL: **`/inventory/transactions`**

This is the **complete audit trail**. Every action above produced one row here. Filter by warehouse / product / type / date range.

The 8 transaction types you'll see (from `InventoryTransactionType`):

| Type | Triggered by |
|---|---|
| `purchase` | Receiving a PO |
| `allocation` | Creating or cancelling a Stock Allocation |
| `dispatch` | Marking a Material Dispatch as dispatched, OR fulfilling an allocation directly |
| `return` | "Return to Stock" on an allocation |
| `transfer_in` / `transfer_out` | Stock transfer between warehouses (Stock detail page → Transfer) |
| `adjustment` | Manual stock correction (e.g. damage write-off, cycle count delta) |
| `sale` | Reserved for direct sale flows |

Each row links back to its source — click a `purchase` row → jumps to the PO; click a `dispatch` row → jumps to the dispatch.

> **Demo line:** *"This is the page your auditor will live on. Nothing in stock can change without leaving a row here."*

---

## 13. Step 10 — Low Stock Alerts

URL: **`/inventory/alerts`**

Lists every (warehouse × product) where `available_quantity ≤ minimum_stock_level`. Each row has a **Create PO** button that deep-links to the PO create screen with vendor / warehouse / product / suggested quantity (= reorder qty, or deficit if reorder qty isn't set) **pre-filled**.

Try it now: bring panels down to 1 by allocating most of the stock, then refresh the alerts page — TATA Panel will appear with a one-click "Create PO" CTA.

---

## 14. Step 11 — Inventory Dashboard

URL: **`/inventory`** (the module landing page)

Four sections:

1. **Time-window picker** (top-right): "Last 7 / 30 / 90 days" or custom range. Every metric below honours it.
2. **KPI strip (8 tiles):**
   - Total SKUs
   - Low Stock count
   - In-transit qty (across all warehouses)
   - Pending POs
   - PO Spend (total ₹ in window)
   - Outstanding payable to vendors
   - Active Allocations
   - Active Vendors
3. **Operations grid:** transactions stacked-bar trend, Allocation funnel (Allocated → Partially Dispatched → Dispatched), Dispatch funnel (Prepared → Dispatched → Delivered), Top low-stock items.
4. **Financial grid:** PO spend trend, top vendors by spend, spend by warehouse, outstanding by vendor.
5. **Activity rail (right side):** last 20 inventory transactions, live.

> **Demo line:** *"This is the one screen a Head of Operations opens every morning."*

---

## 15. Status reference

### Purchase Order

```
DRAFT → PENDING_APPROVAL → APPROVED → SENT → CONFIRMED → PARTIALLY_RECEIVED → RECEIVED
   │                          │
   └──────────────────────► CANCELLED   (only allowed before stock has been received)
```

### Stock Allocation

```
ALLOCATED → PARTIALLY_DISPATCHED → DISPATCHED → COMPLETED
   │
   └──► CANCELLED (releases reserved stock back to available)
```

### Material Dispatch

```
PREPARED → DISPATCHED → IN_TRANSIT → DELIVERED
                                    └► PARTIALLY_DELIVERED → DELIVERED
   │            │             │
   └────────────┴─────────────┴───► CANCELLED
```

### BOM (project-side, controls the allocation gate)

```
DRAFT → FINALIZED → ALLOCATED → (CANCELLED)
```

---

## 16. Suggested 20-minute client demo script

Use this in front of the client. Each line has a corresponding action. Total ~20 minutes.

| # | Time | What you say | What you click |
|---|---|---|---|
| 1 | 0:00 | "Inventory in Oneohm starts and ends with the warehouse." | Open `/inventory` → show empty dashboard. |
| 2 | 1:00 | "Step one — define a warehouse." | `/inventory/warehouses` → Add → fill `Main Warehouse Mumbai`. |
| 3 | 3:00 | "Step two — define vendors." | `/inventory/vendors` → Add → fill `Tata Power Solar Distribution`. |
| 4 | 5:00 | "Step three — raise a PO. Notice the strict draft → approve → send → receive workflow, and the receive can be partial." | Create PO with 20 panels + 1 inverter → Submit → Approve → Send → Receive 15 panels (partial) → Receive remaining 5. |
| 5 | 9:00 | "Stock is now alive in the warehouse." | `/inventory/stock` → show available counts. |
| 6 | 10:00 | "Now let's link this stock to a real project." | Open `Sharma Residence – 10 kW` project → BOM tab → **Sync BOM** → **Finalize & Allocate** → pick warehouse. |
| 7 | 13:00 | "Stock just moved from available to reserved — atomically." | Back to `/inventory/stock` → highlight the change. |
| 8 | 14:00 | "Same allocations are visible on the project's Allocations tab." | Project → Allocations tab. |
| 9 | 15:00 | "Time to dispatch material to site." | `/inventory/dispatches/new` → fill → Save → **Mark Dispatched** → **In Transit** → **Delivered**. |
| 10 | 18:00 | "Site reports two damaged panels — return them." | Allocation detail → **Return to Stock** → 2 units. |
| 11 | 19:00 | "Every action above is on the ledger and the dashboard." | `/inventory/transactions` (show entries) → `/inventory` (show populated KPIs). |
| 12 | 19:30 | "And when stock dips below threshold, the system tells you what to buy." | `/inventory/alerts` → click **Create PO**. |
| 13 | 20:00 | Q&A | — |

---

## Appendix A — Quick FAQ

**Q. I want to add a new product directly from the inventory module — how?**
You can't, by design. Products are master data (Admin Panel → Products). This keeps SKUs consistent across quoting, BOM, inventory, and finance. Once a product exists, it shows up automatically in every dropdown across the system.

**Q. Can a PO be raised against a specific project (not just stock)?**
Yes. On the PO create screen pick a **Project** and set **PO Type = Project Specific**. The PO and the resulting receipts will be tagged to that project for cost tracking.

**Q. Can I transfer stock between two warehouses?**
Yes. Open the Stock detail page (`/inventory/stock/[id]`) → **Transfer**. This creates `transfer_out` (source) and `transfer_in` (destination) transactions and uses the `in_transit_quantity` bucket while the goods are moving.

**Q. What permissions are needed?**
- `inventory:read` — view dashboard, lists, details.
- `inventory:write` — create/update warehouses, vendors, allocations, dispatches, stock adjustments.
- `purchaseOrder:write` — create / approve / send / receive POs.

**Q. What if the BOM changes after allocation?**
You can no longer click Finalize & Allocate (it shows "BOM Allocated"). To re-allocate you must first cancel the affected allocations on the project's Allocations tab (releases reserved stock), edit the BOM, then finalize again.

---

*Document version: 1.0 — covers the inventory module on branches `feature/inventory-management-module` + `inventory-and-miner-feature-enhancement`.*
