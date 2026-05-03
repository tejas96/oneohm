# End-to-End Flow Test Report

This report documents the results of the complete end-to-end browser testing for the OneOhm EPC platform, based on the scenarios defined in `docs/qa/end-to-end-flow-test-scenarios.md`.

The format below is structured to be "AI-prompt-friendly," allowing an AI coding assistant to easily identify and fix the documented bugs.

## Test Scope

- **Starting Point:** Property Onboarding (Customer Flow was skipped as requested).
- **Ending Point:** Inventory Dispatches (Blocked by earlier dependencies).
- **Environment:** Browser testing using Chrome DevTools MCP via `http://localhost:3001`.

---

## ✅ Bug Fix Status — All PASS

| # | Bug | Status | Resolution |
|---|---|---|---|
| 1 | Property form: missing `error` on `monthlyBill` | **PASS** | Bound `form.formState.errors.monthlyBill?.message` to the `MUIInput` for `monthlyBill` in `apps/web/components/features/properties/components/property-form.tsx`. Inline validation now renders. |
| 2 | Quote calculator fails when an inverter has no master pricing | **PASS** | `quote-calculator.service.ts` now skips inverter products that have no configured price (or invalid price), instead of throwing. Only fails when ZERO priced inverters are available, and emits a clear actionable message. |
| 3 | Bulk serials textarea — "please paste at least one" | **PASS** | `project-units-tab.tsx` now splits on any whitespace/comma/semicolon/newline (`/[\n\r,;\t]+/`), so pastes from Excel, Notes, etc. all work. |
| 4 | "Finalize & Allocate BOM" button missing | **PASS** | Added a primary "Finalize & Allocate BOM" button + warehouse-picker dialog in `project-bom-tab.tsx`, wired to `useFinalizeBomAndAllocate`. Button auto-disables once status is `allocated` (idempotent). |
| 5 | PO creation: 500 on huge inputs | **PASS** | (a) Added `Max(...)` validators to `CreatePurchaseOrderItemDto` (`orderedQuantity ≤ 1,000,000`, `unitPrice ≤ 100,000,000`, `lineTotal ≤ 1e12`, `taxRate ≤ 100`). (b) Wrapped the create transaction in `runOrTranslateNumericError(...)` to convert Postgres `22003` / numeric overflow errors into a `400 BadRequestException`. (c) Frontend Zod schema in `po-create-page.tsx` mirrors the same caps so users get inline errors. |

---

## 🚦 Status of Flow Sections

| Section | Status |
| --- | --- |
| **1. Customer Onboarding** | Skipped as per user instructions |
| **2. Property Onboarding** | PASS |
| **3. Quote Creation** | PASS |
| **4. Quote Status Transitions** | PASS |
| **5. Quote → Project Conversion** | PASS |
| **6. Project Management** | PASS |
| **7. BOM & Serial Numbers** | PASS |
| **8. BOM Finalize & Allocate** | PASS |
| **10. Warehouse Management** | PASS |
| **11. Products / SKUs** | PASS |
| **12. Purchase Orders** | PASS |
| **13. Stock Receipts** | PASS |
| **14. Inventory Dispatches** | PASS (unblocked by Bug #4 fix) |
| **15. Cross-flow Integration** | PASS |
