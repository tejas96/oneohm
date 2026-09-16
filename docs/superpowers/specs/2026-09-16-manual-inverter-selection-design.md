# Manual inverter selection

**Date:** 2026-09-16
**Repos:** `oneohm` (shared, backend, web), `oneohm-mobile` (EPC app)
**Branch:** `feat/manual-inverter-selection` in both

## Problem

A sales rep cannot choose which inverters go on a quote. Both the web calculator
and the EPC app offer one brand and one capacity, and the server picks the rest.
A real design is often a mix — 12 kW Sungrow plus 6 kW from another maker — and
there is no way to ask for it.

The API already accepts that mix. `CalculateQuoteDto.inverterOverrides` is an
array of `{ productId, quantity }`, mixed brands allowed, and
`calculateInvertersWithOverrides` has priced it since the calculator was built.
**No client has ever sent it.** The work is almost entirely UI.

## Decisions

| Question | Decision |
|---|---|
| Keep auto-select? | Yes. Auto and Manual, chosen by the rep. |
| The `+/-` inverter count stepper? | **Removed.** It is a weaker Manual, and the server already refuses it alongside overrides. Panel steppers stay. |
| How a row is picked | One list, sorted by capacity. Never a brand-then-capacity drill-down. |
| Capacity below system size | **Warn, never block.** An inverter smaller than the panel array is normal solar practice. |
| Government-form and project-screen bugs (A, B below) | Fixed in this PR. |

## What the rep sees

The inverter block gains a two-way switch.

**Auto** is today, unchanged: brand picker, capacity picker, server decides.

**Manual** is a list:

```
Inverters                          [ Auto ][ Manual ]
─────────────────────────────────────────────────────
  12 kW · Sungrow · SG12RT          [ − 1 + ]      ✕
   6 kW · Deye    · SUN-6K          [ − 1 + ]      ✕
─────────────────────────────────────────────────────
  + Add inverter
  Total 18 kW  ·  system is 12 kW
```

Under-capacity shows an amber line: *"Only 10 kW of inverters for a 12 kW
system. Output may be cut."* The rep can still price and save.

Web uses the existing `Select` idiom. Mobile uses the existing `OptionPicker`
bottom sheet. Neither invents a new control.

## Rules

| Case | Rule |
|---|---|
| Manual, no rows | Price button disabled. "Add at least one inverter." |
| Same inverter added twice | Merged into one row, quantity + 1. Never two rows. |
| Quantity | 1 to 20 per row, enforced on client and server. At most 10 rows, enforced on the client only — the server has no row cap and does not need one. |
| Phase changed (by the rep, or forced above 7 kW) | Rows **cleared**, rep told. A single-phase inverter on a three-phase site is wrong, not merely odd. |
| System size changed | Rows **kept**. The capacity warning re-runs. A chosen combination is a decision, not a guess. |
| Product went inactive or lost its price | The server says so; the client shows that message. Already works. |
| Product has no `capacity_kw` | Never offered. |
| Catalogue has no inverters | Manual is disabled with the existing empty-catalogue note. |
| Auto → Manual | Rows pre-fill from what Auto just priced. The response already carries `productId` per inverter. With no price yet, the list starts empty. |
| Manual → Auto | Rows dropped; brand and capacity return to auto. |

## Components

### `libs/shared` — one function

```ts
deriveInverterProductOptions(
  products: ProductOptionInput[],
  phaseType?: string,
): InverterProductOption[]
// { productId, capacityKw, brandName, name, label }, sorted by capacity descending
```

Skips products with no `capacity_kw`. Phase filter matches the **lenient** rule
already in `getInverterCapacities`: a product with no `phase_type` still
qualifies. Lives beside the other derivations in `utils/product-options.ts`.

Requires publishing `@tejas96/shared` as **1.13.0**. Mobile's `^1.12.0` range
accepts it. `oneohm` merges and publishes first; mobile installs after.

Also add `inverterOverrides?: Array<{ productId: string; quantity: number }>` to
`CalculatorInputs` in `types/interfaces/quote.interface.ts`.

### `apps/backend` — guards and two report fixes

In `calculateInvertersWithOverrides` ([quote-calculator.service.ts:1008](../../../apps/backend/src/modules/quotes/services/quote-calculator.service.ts)):

- **Gap D** — reject a `productId` whose `productType.code` is not `inverter`.
  Today a panel's id prices as a 0 kW inverter and lands in the BOM.
  `findById` already loads the `productType` relation, so this is one condition.
- **Gap F** — reject duplicate `productId`s in one request.
- New warning `INVERTER_PHASE_MISMATCH` (severity `warning`) when a chosen
  inverter's `phase_type` is set and differs from the quote's. It warns; it does
  not block. Overrides go through `findById`, which applies no phase filter.

In `validateOverrideConflicts`:

- **Gap G** — reject `preferredInverterBrand` or `preferredInverterCapacityKw`
  sent alongside `inverterOverrides`. They are silently dropped today, which
  hides a client bug behind a plausible price.

In `calculate-quote.dto.ts`:

- **Gap E** — `@Max(20)` on `InverterOverrideDto.quantity`, matching the cap the
  removed count field already had.

In `quote-calculator.controller.ts` (**Gap C**):

- Store `inverterOverrides` in `calculatorInputs`.
- Set `calculationMode` to `MANUAL` when overrides are present, instead of the
  hardcoded `AUTO` on line 196.
- No user-visible break today — nothing rebuilds a form from stored inputs — but
  the saved record currently contradicts what the rep did.

In the two report mappers (**Gap A**):

- `wcr.mapper.ts:16` and `annexure-proforma-a.mapper.ts:21` both read
  `inverters[0]`. A mixed quote prints only the first inverter on the MSEDCL
  work-completion report and the PM Surya Ghar Annexure Proforma A.
- `inverter_make_model` becomes every inverter joined:
  `"Sungrow SG12RT 12 kW × 1, Deye SUN-6K 6 kW × 1"`.
- `inverter_rating`, `inverter_capacity` and `inverter_capacity_kw` become the
  **total** capacity.
- `inverter_make` becomes the distinct brands joined.
- These forms carry one field per fact, so joining is the only honest fit.

The existing `INVERTER_CAPACITY_INSUFFICIENT` and `INVERTER_CAPACITY_OVERSIZED`
warnings are untouched.

### `apps/web`

- **New** `components/features/quotes/components/inverter-section.tsx` — the
  switch, the rows, the total line. Lifted out of `quote-builder.tsx`, which is
  1772 lines and is where this would otherwise land.
- `lib/hooks/resources/products.ts` (**Gap H**) — `useProductOptions` returns
  brands and capacities but not the product list. Add
  `getInverterProductOptions(phaseType?)`. The underlying query already filters
  `status: active` and `hasActivePrice: true`, so an unpriceable inverter is
  never offered.
- `constants.ts` — add `inverterOverrides` to `PRICING_AFFECTING_FIELDS`.
- `quote-preview-panel.tsx` — delete the inverter stepper, its two props and the
  `manualInverterCount` state in `quote-builder.tsx`.
- `hooks/use-quote-form-logic.ts` — switching mode clears the other mode's
  fields; `handlePhaseChange` and `handleSystemSizeChange` clear the rows
  (**Gap I** — size above 7 kW forces three-phase).
- `schemas/quote.schema.ts` — add the `inverterOverrides` field.

### `oneohm-mobile`

- `model/quoteForm.ts` — add `inverterMode: 'auto' | 'manual'` and
  `inverterOverrides`; delete `manualInverterCount`. Update
  `toCalculateRequest`.
- `api/types.ts` — same swap on the request type.
- `api/catalogue.api.ts` — expose `getInverterProductOptions(phaseType)`, backed
  by the new shared function. The fetch already filters `hasActivePrice: true`.
- `components/configSteps.tsx` — the switch, the rows and an "Add inverter"
  sheet built from `OptionPicker`.
- `screens/CreateQuoteRoute.tsx` — drop the `inverter` entry from
  `quantityLines`; route row edits through `guardedChange`, because a row is a
  concrete build change and must kill a stale price (a count was only a
  request); clear rows inside the phase rewrite.
- `model/pricing.ts` — drop `manualInverterCount` from `hasPendingQuantities`;
  clear rows in the above-7 kW phase rewrite (**Gap I**); add
  `INVERTER_PHASE_MISMATCH` to `SEVERE_CODES` (**Gap K**), or the warning
  renders as the quietest grey on the screen.
- `features/projectDetail/components/SystemBlock.tsx` (**Gap B**) —
  `inverterHeadline` prints `count × configs[0].capacityKw`. For 1×12 plus 1×6
  that reads "2 × 12 kW", stating 24 kW for an 18 kW system. Render one line per
  config, as the web project card already does.

## Verified clean — no change needed

BOM lines, backend and web · `project-response.dto` (`inverterConfigs` maps all,
`inverterCount` sums) · web project system card · web quote equipment card ·
consumer app quotation and project screens · mobile price sections · inventory
stock check (deduplicates ids) · net-metering and DCR reports carry no inverter
fields · no persisted quote drafts on web or mobile, so nothing to migrate · no
"revise from stored inputs" flow.

## Known, not fixed

The UI phase filter is lenient — a product with no `phase_type` passes — while
the backend's `findInvertersByPhase` is strict. Auto-select can therefore offer
a capacity the server cannot find. Pre-existing, affects Auto only, untouched
here.

## Verification

No new test files. Each screen is walked in the real app.

**Backend** — the existing `quote-calculator.service.spec.ts` must still pass.

**Web** (`3001`, API on `8085`): auto quote unchanged · switch to Manual and see
the rows pre-filled · add a second inverter of another brand · price and read
the combined figure · force under-capacity and read the amber line · raise the
size past 7 kW and confirm the rows clear · save, then open the quote detail and
the project and confirm both inverters appear · download the WCR and the
Annexure and confirm both inverters print.

**EPC app** (debug build, Metro running, backend on `8085`): the same walk
through the wizard, plus the project detail screen showing two inverter lines
rather than a false multiplied total.
