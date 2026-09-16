# Manual Inverter Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a sales rep hand-pick a combination of inverters of different capacities and brands on a quote, on both the web calculator and the EPC mobile app, while keeping auto-select.

**Architecture:** The API already accepts `inverterOverrides` — an array of `{ productId, quantity }` — and has priced it since the calculator was built. No client has ever sent it. So the work is a two-way Auto/Manual switch in both clients, one new derivation in the shared package, four safety guards on the override path, and two downstream display fixes where existing code reads only the first inverter.

**Tech Stack:** Nx monorepo · NestJS + TypeORM (backend) · Next.js + react-hook-form + TanStack Query (web) · React Native + TanStack Query (EPC app) · `@tejas96/shared` published to GitHub Packages.

**Spec:** [docs/superpowers/specs/2026-09-16-manual-inverter-selection-design.md](../specs/2026-09-16-manual-inverter-selection-design.md)

## Global Constraints

- **No new test files.** The user's standing rule: verification is running the app and walking each screen. Existing tests stay and must keep passing. Never author a new `__tests__` file or a new `*.spec.ts`.
- **Verify the feature, not the row.** A correct DB row or a green typecheck that nothing renders is a false pass. Every task ends on a screen someone looked at, or on a command whose output is quoted.
- **Branch:** `feat/manual-inverter-selection` exists in both `oneohm` and `oneohm-mobile`. The mobile branch also carries 8 unrelated modified files (login, gallery, lead record, shared UI states) that belong in the same PR. Do not revert them.
- **Publish order:** `oneohm` merges to `main` first. `.github/workflows/publish-shared.yml` publishes `@tejas96/shared` on any push to `main` touching `libs/shared/src/**`. It publishes the current version, and on a 409 it auto-bumps the **patch** and republishes. Current version is `1.12.3`, so the published version will be **`1.12.4`**. Do **not** hand-edit `libs/shared/package.json`. Mobile's `^1.12.0` range accepts it. Mobile cannot build until that publish lands.
- **Repo paths:** `oneohm` is `/Volumes/works-space/oneohm/oneohm`. `oneohm-mobile` is `/Volumes/works-space/oneohm/oneohm-mobile`.
- **Local servers:** web on `3001`, backend API on `8085`. `launch.json` is at the workspace root.
- **iOS builds** need `LANG=en_US.UTF-8` or CocoaPods fails with a misleading error.
- **Capacity rule:** inverter capacity below system size **warns, never blocks**. Do not add a blocking error for it anywhere.

---

## File Structure

### `oneohm` — `libs/shared`

| File | Responsibility |
|---|---|
| `libs/shared/src/utils/product-options.ts` | **Modify.** Gains `InverterProductOption` and `deriveInverterProductOptions`. Already exported wholesale by `utils/index.ts`. |
| `libs/shared/src/types/interfaces/quote.interface.ts` | **Modify.** `CalculatorInputs` gains `inverterOverrides`. |

### `oneohm` — `apps/backend`

| File | Responsibility |
|---|---|
| `apps/backend/src/modules/quotes/dto/calculator/calculate-quote.dto.ts` | **Modify.** `@Max(20)` on override quantity. |
| `apps/backend/src/modules/quotes/services/quote-calculator.service.ts` | **Modify.** Duplicate guard, product-type guard, phase-mismatch warning, brand/capacity conflict. |
| `apps/backend/src/modules/quotes/controllers/quote-calculator.controller.ts` | **Modify.** Persist `inverterOverrides`; stop hardcoding `calculationMode`. |
| `apps/backend/src/modules/reports/definitions/wcr/wcr.mapper.ts` | **Modify.** Report every inverter, not the first. |
| `apps/backend/src/modules/reports/definitions/annexure-proforma-a/annexure-proforma-a.mapper.ts` | **Modify.** Same. |

### `oneohm` — `apps/web`

| File | Responsibility |
|---|---|
| `apps/web/lib/hooks/resources/products.ts` | **Modify.** `useProductOptions` gains `getInverterProductOptions`. |
| `apps/web/components/features/quotes/components/inverter-section.tsx` | **Create.** The Auto/Manual switch, the manual rows, the capacity summary. Owns nothing else. |
| `apps/web/components/features/quotes/components/quote-builder.tsx` | **Modify.** Render the new section; hold `inverterMode` + `inverterOverrides` state; drop `manualInverterCount`. |
| `apps/web/components/features/quotes/components/quote-preview-panel.tsx` | **Modify.** Delete the inverter stepper and its three props. |
| `apps/web/components/features/quotes/hooks/use-quote-form-logic.ts` | **Modify.** Phase changes report that rows must clear. |
| `apps/web/components/features/quotes/types/calculator.types.ts` | **Modify.** Drop `manualInverterCount` from the request type. |

### `oneohm-mobile`

| File | Responsibility |
|---|---|
| `src/features/quotes/api/types.ts` | **Modify.** Request type: `inverterOverrides` in, `manualInverterCount` out. |
| `src/features/quotes/model/quoteForm.ts` | **Modify.** Form state and `toCalculateRequest`. |
| `src/features/quotes/model/pricing.ts` | **Modify.** Clear rows on phase change; drop the inverter from pending quantities; new severe warning code. |
| `src/features/quotes/model/validate.ts` | **Modify.** "Manual with no rows" becomes a price blocker. |
| `src/features/quotes/model/index.ts` | **Modify.** Re-export the new helpers. |
| `src/features/quotes/api/catalogue.api.ts` | **Modify.** Expose `getInverterProductOptions`. |
| `src/features/quotes/components/configSteps.tsx` | **Modify.** `EquipmentStep` gains the switch and the rows. |
| `src/features/quotes/screens/CreateQuoteRoute.tsx` | **Modify.** Wire the handlers; drop the inverter quantity line. |
| `src/features/projectDetail/components/SystemBlock.tsx` | **Modify.** Stop multiplying one capacity by the total count. |

---

## Task 1: Shared — inverter product options

**Files:**
- Modify: `libs/shared/src/utils/product-options.ts` (append after `getInverterCapacities`, which ends at line 213)
- Modify: `libs/shared/src/types/interfaces/quote.interface.ts:57` (inside `CalculatorInputs`)

**Interfaces:**
- Consumes: `ProductOptionInput`, the module-private `getBrandName` — both already in `product-options.ts`.
- Produces:
  - `InverterProductOption = { productId: string; capacityKw: number; brandName: string; name: string; label: string }`
  - `deriveInverterProductOptions(products: ProductOptionInput[], phaseType?: string): InverterProductOption[]`
  - `CalculatorInputs.inverterOverrides?: Array<{ productId: string; quantity: number }>`

- [ ] **Step 1: Add the option type**

In `libs/shared/src/utils/product-options.ts`, directly after the `InverterCapacityOption` interface (line 52-55):

```ts
export interface InverterProductOption {
  productId: string;
  capacityKw: number;
  brandName: string;
  name: string;
  /** "12 kW · Sungrow · SG12RT" — capacity first, because that is what a rep is sizing. */
  label: string;
}
```

- [ ] **Step 2: Add the derivation**

Append to the end of `libs/shared/src/utils/product-options.ts`:

```ts
/**
 * Every inverter a rep may pick by hand, one entry per product.
 *
 * The phase filter is deliberately the LENIENT one that `getInverterCapacities`
 * already uses — a product that states no `phase_type` still qualifies. The
 * backend's auto-select query is strict, so the two disagree for products with
 * no phase set; that disagreement is pre-existing and is not mirrored here,
 * because the override path does not run through that query at all. A real
 * mismatch is reported by the calculator as a warning instead.
 *
 * Sorted by capacity descending: a rep building a mix reaches for the big unit
 * first and fills the remainder underneath it.
 */
export function deriveInverterProductOptions(
  products: ProductOptionInput[],
  phaseType?: string,
): InverterProductOption[] {
  let filtered = products;

  if (phaseType) {
    filtered = filtered.filter(
      (p) => !p.specifications?.phase_type || p.specifications.phase_type === phaseType,
    );
  }

  const options: InverterProductOption[] = [];

  for (const product of filtered) {
    const capacityKw = product.specifications?.capacity_kw ?? 0;
    // A product with no capacity cannot be sized against a system, and pricing
    // it would put a 0 kW line on the quote. Never offered.
    if (capacityKw <= 0) continue;

    const brandName = getBrandName(product);
    options.push({
      productId: product.id,
      capacityKw,
      brandName,
      name: product.name,
      label: `${capacityKw} kW · ${brandName} · ${product.name}`,
    });
  }

  return options.sort(
    (a, b) => b.capacityKw - a.capacityKw || a.brandName.localeCompare(b.brandName),
  );
}
```

- [ ] **Step 3: Record the choice on the saved quote**

In `libs/shared/src/types/interfaces/quote.interface.ts`, inside `CalculatorInputs`, immediately after `manualInverterCount?: number;` (line 57):

```ts
  /**
   * The exact inverters a rep chose by hand. Present only on a manual quote.
   *
   * The priced result lives in the snapshot's `calculation`, so a quote reads
   * correctly without this — but without it the stored INPUT says the server
   * chose, which is not what happened.
   */
  inverterOverrides?: Array<{ productId: string; quantity: number }>;
```

- [ ] **Step 4: Typecheck the library**

```bash
cd /Volumes/works-space/oneohm/oneohm && npm run typecheck:libs
```

Expected: no errors.

- [ ] **Step 5: Build the library so the backend and web resolve the new export**

```bash
cd /Volumes/works-space/oneohm/oneohm && npx nx build shared
```

Expected: build succeeds, `libs/shared/dist` refreshed.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/works-space/oneohm/oneohm
git add libs/shared/src/utils/product-options.ts libs/shared/src/types/interfaces/quote.interface.ts
git commit -m "$(cat <<'EOF'
feat(shared): list inverters as pickable products

Both clients are about to let a rep choose a mix of inverters by hand.
Grouping products into brands and collapsing them into capacities are
already shared; listing the products themselves belongs beside them, or
web and mobile each grow their own copy and drift on the first change.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Backend — guard the override path

Four holes on a path no client has ever exercised. Once a rep can send it, each becomes reachable.

**Files:**
- Modify: `apps/backend/src/modules/quotes/dto/calculator/calculate-quote.dto.ts:57-64`
- Modify: `apps/backend/src/modules/quotes/services/quote-calculator.service.ts:351` (`validateOverrideConflicts`), `:916-923` (`calculateInverters` signature and dispatch), `:1008-1078` (`calculateInvertersWithOverrides`)

**Interfaces:**
- Consumes: `PRODUCT_TYPE_INVERTER` from `@tejas96/shared/constants` — already imported on line 2 of the service.
- Produces: warning code `INVERTER_PHASE_MISMATCH`, severity `'warning'`. Mobile Task 7 routes on this exact string.

- [ ] **Step 1: Cap the quantity on one row**

In `calculate-quote.dto.ts`, inside `InverterOverrideDto`, replace the `quantity` decorators:

```ts
  @ApiProperty({
    description: 'Number of inverters of this type',
    example: 2,
    minimum: 1,
    maximum: 20,
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(20)
  quantity!: number;
```

`Max` is already imported at the top of the file. No import change.

- [ ] **Step 2: Refuse a brand or capacity sent alongside overrides**

In `quote-calculator.service.ts`, inside `validateOverrideConflicts`, after the existing inverter-override conflict block (ends line 357):

```ts
    // Overrides name exact products, so `calculateInverters` never applies the
    // brand or capacity filter. Accepting both silently drops one of them and
    // returns a plausible price built from an input the caller did not send.
    if (
      input.inverterOverrides?.length &&
      (input.preferredInverterBrand || input.preferredInverterCapacityKw !== undefined)
    ) {
      throw new BadRequestException(
        'Cannot use inverterOverrides together with preferredInverterBrand or preferredInverterCapacityKw. ' +
          'Overrides name exact products, so a brand or capacity preference would be ignored.',
      );
    }
```

- [ ] **Step 3: Pass the phase into the override path**

In `quote-calculator.service.ts`, `calculateInverters` currently dispatches on line 920-923:

```ts
    if (overrides && overrides.length > 0) {
      return this.calculateInvertersWithOverrides(systemSizeKw, projectType, overrides, warnings);
    }
```

Replace with:

```ts
    if (overrides && overrides.length > 0) {
      return this.calculateInvertersWithOverrides(
        systemSizeKw,
        phaseType,
        projectType,
        overrides,
        warnings,
      );
    }
```

And change the signature of `calculateInvertersWithOverrides` (line 1008) from:

```ts
  private async calculateInvertersWithOverrides(
    systemSizeKw: number,
    projectType: ProjectType,
    overrides: InverterOverrideDto[],
    warnings: ValidationWarning[],
  ): Promise<CalculatedInverterConfig> {
```

to:

```ts
  private async calculateInvertersWithOverrides(
    systemSizeKw: number,
    phaseType: string,
    projectType: ProjectType,
    overrides: InverterOverrideDto[],
    warnings: ValidationWarning[],
  ): Promise<CalculatedInverterConfig> {
```

- [ ] **Step 4: Reject a product listed twice**

In `calculateInvertersWithOverrides`, immediately after the opening brace and before `const invertersWithPricing`:

```ts
    // Two rows of one product price as two identical BOM lines and read on the
    // quote as two different pieces of equipment. One row, one product.
    const seenProductIds = new Set<string>();
    for (const override of overrides) {
      if (seenProductIds.has(override.productId)) {
        throw new BadRequestException(
          `Inverter ${override.productId} is listed twice. Send one row per product with a combined quantity.`,
        );
      }
      seenProductIds.add(override.productId);
    }
```

- [ ] **Step 5: Reject a product that is not an inverter, and warn on a phase mismatch**

Still in `calculateInvertersWithOverrides`, inside the `for (const override of overrides)` loop. The existing code reads:

```ts
      if (!inverter) {
        throw new BadRequestException(`Inverter product ${override.productId} not found`);
      }

      const specs = inverter.specifications;
      if (!specs) {
        throw new BadRequestException(`Inverter ${inverter.name} has invalid specifications`);
      }

      const capacityKw = Number(specs.capacity_kw || 0);
```

Replace that block with:

```ts
      if (!inverter) {
        throw new BadRequestException(`Inverter product ${override.productId} not found`);
      }

      // `findById` looks up ANY product. Without this, a panel's id prices as a
      // 0 kW "inverter" and lands in the BOM under itemType 'inverter'.
      if (inverter.productType?.code !== PRODUCT_TYPE_INVERTER) {
        throw new BadRequestException(
          `${inverter.name} is not an inverter and cannot be used as one.`,
        );
      }

      const specs = inverter.specifications;
      if (!specs) {
        throw new BadRequestException(`Inverter ${inverter.name} has invalid specifications`);
      }

      // Overrides do not run through `findInvertersByPhase`, so nothing has
      // checked the phase. It warns rather than blocks, to match how the
      // capacity rule already behaves on this path.
      const specPhase = specs.phase_type;
      if (typeof specPhase === 'string' && specPhase && specPhase !== phaseType) {
        warnings.push({
          code: 'INVERTER_PHASE_MISMATCH',
          message: `${inverter.name} is a ${specPhase.replace(/_/g, ' ')} inverter on a ${phaseType.replace(/_/g, ' ')} system.`,
          severity: 'warning',
        });
      }

      const capacityKw = Number(specs.capacity_kw || 0);
```

- [ ] **Step 6: Typecheck and lint the backend**

```bash
cd /Volumes/works-space/oneohm/oneohm && npm run typecheck:backend && npm run backend:lint
```

Expected: no errors.

- [ ] **Step 7: Run the existing backend suite — it must still pass**

```bash
cd /Volumes/works-space/oneohm/oneohm && npm run backend:test
```

Expected: all tests pass. `quote-calculator.service.spec.ts` in particular. Do **not** add cases to it.

- [ ] **Step 8: Commit**

```bash
cd /Volumes/works-space/oneohm/oneohm
git add apps/backend/src/modules/quotes/dto/calculator/calculate-quote.dto.ts apps/backend/src/modules/quotes/services/quote-calculator.service.ts
git commit -m "$(cat <<'EOF'
fix(quotes): guard the inverter override path

Four holes on a path no client had ever sent, all reachable the moment a
rep can pick inverters by hand: any product id priced as an inverter
(a panel became a 0 kW line in the BOM), a product listed twice, no
quantity ceiling, and a brand or capacity silently dropped.

A phase that does not match now warns, matching how capacity already
behaves here. It does not block.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Backend — record what the rep actually chose

**Files:**
- Modify: `apps/backend/src/modules/quotes/controllers/quote-calculator.controller.ts:193-215`

**Interfaces:**
- Consumes: `CalculatorInputs.inverterOverrides` from Task 1.
- Produces: nothing other tasks read.

- [ ] **Step 1: Stop hardcoding the mode and store the rows**

In `quote-calculator.controller.ts`, in the `calculatorInputs` object literal, replace the line:

```ts
      calculationMode: QuoteCalculationMode.AUTO,
```

with:

```ts
      // Hardcoded AUTO until now, so every hand-picked quote recorded itself as
      // one the server chose. Nothing rebuilds a form from these inputs today,
      // so nothing was visibly wrong — the record was simply false.
      calculationMode: input.inverterOverrides?.length
        ? QuoteCalculationMode.MANUAL
        : QuoteCalculationMode.AUTO,
```

and immediately after `manualInverterCount: input.manualInverterCount,` add:

```ts
      inverterOverrides: input.inverterOverrides,
```

- [ ] **Step 2: Typecheck and lint**

```bash
cd /Volumes/works-space/oneohm/oneohm && npm run typecheck:backend && npm run backend:lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Volumes/works-space/oneohm/oneohm
git add apps/backend/src/modules/quotes/controllers/quote-calculator.controller.ts
git commit -m "$(cat <<'EOF'
fix(quotes): save the inverters a rep picked, and say the mode was manual

calculationMode was pinned to AUTO for every quote ever saved, and the
chosen rows were never written at all.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Backend — government forms must list every inverter

Both mappers read `inverters[0]`. A 12 kW Sungrow plus a 6 kW Deye prints as "Sungrow 12 kW" on the MSEDCL work-completion report and the PM Surya Ghar Annexure Proforma A. This already happens today — auto-select returns combinations too.

**Files:**
- Modify: `apps/backend/src/modules/reports/definitions/wcr/wcr.mapper.ts:16,39-44`
- Modify: `apps/backend/src/modules/reports/definitions/annexure-proforma-a/annexure-proforma-a.mapper.ts:21,44-47`

**Interfaces:**
- Consumes: `snapshot.calculation.inverters.inverters` — each entry has `brand`, `name`, `capacityKw`, `quantity`.
- Produces: nothing other tasks read.

- [ ] **Step 1: WCR — read the whole list**

In `wcr.mapper.ts`, replace line 16:

```ts
    const inverter = snapshot?.calculation?.inverters?.inverters?.[0];
```

with:

```ts
    const inverters = snapshot?.calculation?.inverters?.inverters ?? [];
```

- [ ] **Step 2: WCR — print every inverter and the real total**

Replace the block at lines 39-44:

```ts
    if (inverter) {
      const makeModel = [inverter.brand, inverter.name].filter(Boolean).join(' ');
      fields.inverter_make_model = makeModel;
      fields.inverter_rating = str(inverter.capacityKw);
      fields.inverter_capacity = str(inverter.capacityKw);
    }
```

with:

```ts
    /*
      The form carries one field per fact, so a mixed set is joined into it.
      Taking the first entry — which this did — printed a 12 kW Sungrow on a
      system that also carries a 6 kW Deye, and understated the rating by a
      third, on a document filed with the utility.
    */
    if (inverters.length > 0) {
      fields.inverter_make_model = inverters
        .map((inv) =>
          // str() rather than bare interpolation: a template literal stringifies a
          // nullish capacity as the text "null", and this field is filed with the
          // utility. The reduce below guards the same two fields for the same reason.
          `${[inv.brand, inv.name].filter(Boolean).join(' ')} ${str(inv.capacityKw)} kW × ${str(inv.quantity)}`.trim(),
        )
        .join(', ');
      const totalCapacityKw = inverters.reduce(
        (sum, inv) => sum + (inv.capacityKw ?? 0) * (inv.quantity ?? 0),
        0,
      );
      fields.inverter_rating = str(totalCapacityKw);
      fields.inverter_capacity = str(totalCapacityKw);
    }
```

- [ ] **Step 3: Annexure — read the whole list**

In `annexure-proforma-a.mapper.ts`, replace line 21:

```ts
    const inverter = snapshot?.calculation?.inverters?.inverters?.[0];
```

with:

```ts
    const inverters = snapshot?.calculation?.inverters?.inverters ?? [];
```

- [ ] **Step 4: Annexure — total capacity and every make**

Replace the block at lines 44-47:

```ts
    if (inverter) {
      fields.inverter_capacity_kw = str(inverter.capacityKw);
      fields.inverter_make = str(inverter.brand);
    }
```

with:

```ts
    // Same first-entry bug as the WCR: this form goes to the PM Surya Ghar
    // portal, so an understated capacity and a missing make are not cosmetic.
    if (inverters.length > 0) {
      const totalCapacityKw = inverters.reduce(
        (sum, inv) => sum + (inv.capacityKw ?? 0) * (inv.quantity ?? 0),
        0,
      );
      fields.inverter_capacity_kw = str(totalCapacityKw);
      fields.inverter_make = Array.from(
        new Set(inverters.map((inv) => inv.brand).filter(Boolean)),
      ).join(', ');
    }
```

- [ ] **Step 5: Typecheck, lint, existing suite**

```bash
cd /Volumes/works-space/oneohm/oneohm && npm run typecheck:backend && npm run backend:lint && npm run backend:test
```

Expected: no errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/works-space/oneohm/oneohm
git add apps/backend/src/modules/reports/definitions/wcr/wcr.mapper.ts apps/backend/src/modules/reports/definitions/annexure-proforma-a/annexure-proforma-a.mapper.ts
git commit -m "$(cat <<'EOF'
fix(reports): the WCR and Annexure A printed only the first inverter

Both mappers read inverters[0]. A system with a 12 kW and a 6 kW unit
filed a rating of 12 kW with the utility and named one of the two makes.
Auto-select already returns combinations, so this is live today.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Web — the Auto/Manual inverter picker

One task, because a picker component nothing renders is exactly the false pass this project has been burned by. It ends on a working screen.

**Files:**
- Modify: `apps/web/lib/hooks/resources/products.ts:103-138`
- Create: `apps/web/components/features/quotes/components/inverter-section.tsx`
- Modify: `apps/web/components/features/quotes/components/quote-builder.tsx:316-328, 425-450, 490-500, 700-710, 1329-1424`
- Modify: `apps/web/components/features/quotes/components/quote-preview-panel.tsx:62-97, 458-505`
- Modify: `apps/web/components/features/quotes/hooks/use-quote-form-logic.ts:64-77, 155-165`
- Modify: `apps/web/components/features/quotes/types/calculator.types.ts:56`

**Interfaces:**
- Consumes: `deriveInverterProductOptions`, `InverterProductOption` from Task 1.
- Produces:
  - `useProductOptions().getInverterProductOptions(phaseType?: string): InverterProductOption[]`
  - `<InverterSection />` with props exactly as declared in Step 2.
  - `InverterOverride = { productId: string; quantity: number }` held as `useState` in `quote-builder.tsx`, matching how `manualDcrPanelCount` is already held. **It is not a form field** — `quoteBuilderSchema` is shared with mobile and does not carry manual quantities either.

- [ ] **Step 1: Expose the product list from the catalogue hook**

In `apps/web/lib/hooks/resources/products.ts`:

Add to the import block from `@tejas96/shared/utils` (lines 3-11): `type InverterProductOption,` and `deriveInverterProductOptions,`.

Add to the re-export on line 18 so consumers get the type:

```ts
export type { PanelTechnologyVariant, InverterCapacityOption, InverterProductOption };
```

Inside `useProductOptions`, after the existing `getInverterCapacities` callback (ends line 128):

```ts
  /*
    The individual inverters, for the manual picker.

    `useAllInverterProducts` already filters `status: active` and
    `hasActivePrice: true`, so an inverter that cannot be priced is never
    offered — the same rule that stopped the capacity list showing three
    unpriceable DEYE units.
  */
  const getInverterProductOptions = useCallback(
    (phaseType?: string): InverterProductOption[] =>
      deriveInverterProductOptions(inverters.items, phaseType),
    [inverters.items],
  );
```

Add `getInverterProductOptions,` to the returned object.

- [ ] **Step 2: Create the section component**

Create `apps/web/components/features/quotes/components/inverter-section.tsx`:

```tsx
'use client';

import type { InverterProductOption } from '@tejas96/shared/utils';
import { AlertTriangle, Info, Plus, X } from 'lucide-react';
import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/lib/config/routes';
import { cn } from '@/lib/utils';

export interface InverterOverride {
  productId: string;
  quantity: number;
}

/** One row per product. Past this the list stops being a choice and starts being a form. */
const MAX_ROWS = 10;
/** Matches @Max(20) on InverterOverrideDto.quantity. */
const MAX_QUANTITY_PER_ROW = 20;

export interface InverterSectionProps {
  mode: 'auto' | 'manual';
  onModeChange: (mode: 'auto' | 'manual') => void;

  /** Auto mode */
  brandValue: string | undefined;
  onBrandChange: (value: string) => void;
  brandOptions: Array<{ value: string; label: string; capacityRange?: string }>;
  capacityValue: number | undefined;
  onCapacityChange: (value: number | undefined) => void;
  capacityOptions: Array<{ value: number; label: string }>;

  /** Manual mode */
  rows: InverterOverride[];
  onRowsChange: (rows: InverterOverride[]) => void;
  productOptions: InverterProductOption[];

  systemSizeKw: number;
  phaseType: string;
  isLoading: boolean;
}

export function InverterSection({
  mode,
  onModeChange,
  brandValue,
  onBrandChange,
  brandOptions,
  capacityValue,
  onCapacityChange,
  capacityOptions,
  rows,
  onRowsChange,
  productOptions,
  systemSizeKw,
  phaseType,
  isLoading,
}: InverterSectionProps): React.JSX.Element {
  const byId = new Map(productOptions.map((p) => [p.productId, p]));
  const totalCapacityKw = rows.reduce(
    (sum, row) => sum + (byId.get(row.productId)?.capacityKw ?? 0) * row.quantity,
    0,
  );

  /*
    Adding a product already on the list merges into its row.

    Two rows of one product are two identical lines on the quote and on the
    BOM, and the server refuses them outright — so the merge happens here
    rather than as an error the rep has to read and undo.
  */
  const addRow = useCallback(
    (productId: string) => {
      const existing = rows.find((row) => row.productId === productId);
      if (existing) {
        onRowsChange(
          rows.map((row) =>
            row.productId === productId
              ? { ...row, quantity: Math.min(MAX_QUANTITY_PER_ROW, row.quantity + 1) }
              : row,
          ),
        );
        return;
      }
      if (rows.length >= MAX_ROWS) return;
      onRowsChange([...rows, { productId, quantity: 1 }]);
    },
    [rows, onRowsChange],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      onRowsChange(
        rows.map((row) =>
          row.productId === productId
            ? { ...row, quantity: Math.min(MAX_QUANTITY_PER_ROW, Math.max(1, quantity)) }
            : row,
        ),
      );
    },
    [rows, onRowsChange],
  );

  const removeRow = useCallback(
    (productId: string) => onRowsChange(rows.filter((row) => row.productId !== productId)),
    [rows, onRowsChange],
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Inverters</Label>
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (brandOptions.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Inverters</Label>
        <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
          <AlertTriangle className="size-3.5 shrink-0 text-warning" />
          <p className="text-xs text-foreground-secondary">
            No active inverters found.{' '}
            <a href={ROUTES.ADMIN.PRODUCTS} className="font-medium text-primary hover:underline">
              Add inverters
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Inverters</Label>
        <div className="flex items-center overflow-hidden rounded-lg border border-border-light">
          {(['auto', 'manual'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onModeChange(option)}
              className={cn(
                'px-3 py-1 text-xs font-medium capitalize transition-colors duration-fast',
                mode === option
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground-secondary hover:bg-background-secondary',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {mode === 'auto' ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-foreground-secondary">Brand</Label>
            <Select
              value={brandValue || 'auto'}
              onValueChange={(v) => onBrandChange(v === 'auto' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Auto-select best available" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <span className="text-foreground-tertiary">Auto-select best available</span>
                </SelectItem>
                {brandOptions.map((brand) => (
                  <SelectItem key={brand.value} value={brand.value}>
                    {brand.label}
                    {brand.capacityRange && (
                      <span className="ml-2 text-foreground-secondary">{brand.capacityRange}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-foreground-secondary">Capacity</Label>
            {capacityOptions.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md bg-background-secondary px-3 py-2">
                <Info className="size-3.5 shrink-0 text-foreground-tertiary" />
                <p className="text-xs text-foreground-tertiary">
                  Nothing from this brand at {phaseType.replace(/_/g, ' ')}. Try another brand, or
                  leave it on auto.
                </p>
              </div>
            ) : (
              <Select
                value={capacityValue?.toString() ?? 'auto'}
                onValueChange={(v) => onCapacityChange(v === 'auto' ? undefined : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto-select optimal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <span className="text-foreground-tertiary">Auto-select optimal</span>
                  </SelectItem>
                  {capacityOptions.map((cap) => (
                    <SelectItem key={cap.value} value={cap.value.toString()}>
                      {cap.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.length === 0 && (
            <div className="flex items-center gap-2 rounded-md bg-background-secondary px-3 py-2">
              <Info className="size-3.5 shrink-0 text-foreground-tertiary" />
              <p className="text-xs text-foreground-tertiary">
                Add at least one inverter, or switch back to auto.
              </p>
            </div>
          )}

          {rows.map((row) => {
            const product = byId.get(row.productId);
            return (
              <div
                key={row.productId}
                className="flex items-center gap-2 rounded-lg border border-border-light px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {product ? `${product.capacityKw} kW · ${product.brandName}` : 'Unavailable'}
                  </p>
                  <p className="truncate text-2xs text-foreground-tertiary">
                    {product?.name ?? 'This inverter is no longer in the catalogue. Remove it.'}
                  </p>
                </div>
                <div className="flex items-center overflow-hidden rounded-lg bg-muted">
                  <button
                    type="button"
                    onClick={() => setQuantity(row.productId, row.quantity - 1)}
                    disabled={row.quantity <= 1}
                    className="px-2.5 py-1 text-sm text-foreground-secondary transition-colors duration-fast hover:bg-background-secondary disabled:opacity-40"
                  >
                    &minus;
                  </button>
                  <span className="min-w-6 px-1 text-center text-sm font-semibold">
                    {row.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(row.productId, row.quantity + 1)}
                    disabled={row.quantity >= MAX_QUANTITY_PER_ROW}
                    className="px-2.5 py-1 text-sm text-foreground-secondary transition-colors duration-fast hover:bg-background-secondary disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.productId)}
                  aria-label="Remove inverter"
                  className="rounded-md p-1 text-foreground-tertiary transition-colors duration-fast hover:bg-background-secondary hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}

          {rows.length < MAX_ROWS && (
            <Select value="" onValueChange={addRow}>
              <SelectTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="w-full justify-start">
                  <Plus className="mr-1.5 size-3.5" />
                  Add inverter
                </Button>
              </SelectTrigger>
              <SelectContent>
                {productOptions.map((product) => (
                  <SelectItem key={product.productId} value={product.productId}>
                    {product.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {rows.length > 0 && (
            <div
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-xs',
                totalCapacityKw < systemSizeKw
                  ? 'border border-warning/30 bg-warning/5 text-foreground-secondary'
                  : 'bg-background-secondary text-foreground-tertiary',
              )}
            >
              {totalCapacityKw < systemSizeKw ? (
                <>
                  <AlertTriangle className="size-3.5 shrink-0 text-warning" />
                  <span>
                    Only {totalCapacityKw} kW of inverters for a {systemSizeKw} kW system. Output may
                    be cut.
                  </span>
                </>
              ) : (
                <span>
                  Total {totalCapacityKw} kW · system is {systemSizeKw} kW
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Drop the dead field from the request type**

In `apps/web/components/features/quotes/types/calculator.types.ts`, delete line 56:

```ts
  manualInverterCount?: number;
```

`inverterOverrides?: InverterOverride[];` on line 55 already exists. Leave it.

- [ ] **Step 4: Delete the inverter stepper from the price panel**

In `apps/web/components/features/quotes/components/quote-preview-panel.tsx`:

- From `QuotePreviewPanelProps`, delete `manualInverterCount: number | undefined;` and `onManualInverterCountChange: (val: number | undefined) => void;`.
- From the destructured parameter list, delete `manualInverterCount,` and `onManualInverterCountChange,`.
- Delete the whole inverter row — the `<div className="flex items-center justify-between py-2.5">` block that renders the `Zap` icon, "Inverters", and the `&minus;` / `+` buttons (roughly lines 458-503). Replace it with a read-only line:

```tsx
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded-md bg-secondary/10">
                  <Zap className="size-3 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Inverters</p>
                  <p className="text-2xs text-foreground-tertiary">
                    {calculation.inverters.totalCapacityKw} kW total capacity
                  </p>
                </div>
              </div>
              {/*
                No stepper. A count was a weaker way of asking for what the
                Manual picker now asks for exactly, and the server refuses the
                two together. The inverters are chosen in the form.
              */}
              <span className="text-sm font-semibold">
                {calculation.inverters.inverters.reduce((s, i) => s + i.quantity, 0)}
              </span>
            </div>
```

- [ ] **Step 5: Clear the rows whenever the phase changes**

In `apps/web/components/features/quotes/hooks/use-quote-form-logic.ts`:

Add to `UseQuoteFormLogicOptions`:

```ts
  /** Called when the phase changes under the rep, so hand-picked inverters can be dropped. */
  onInverterSelectionInvalidated: () => void;
```

Add it to the hook's destructured parameters and to the dependency arrays of the two callbacks below.

In `handleSystemSizeChange`, inside the `if (value > 7)` branch, after `setValue('preferredInverterCapacityKw', undefined);`:

```ts
        // Crossing 7 kW rewrites the phase. A single-phase inverter on a
        // three-phase site is wrong, not merely oversized, so the hand-picked
        // rows go with it.
        onInverterSelectionInvalidated();
```

In `handlePhaseChange`, after `setValue('preferredInverterCapacityKw', undefined);`:

```ts
      onInverterSelectionInvalidated();
```

- [ ] **Step 6: Wire it into the builder**

In `apps/web/components/features/quotes/components/quote-builder.tsx`:

1. Import at the top: `import { InverterSection, type InverterOverride } from './inverter-section';`
2. Replace the state declaration on line 318:

```ts
  const [manualInverterCount, setManualInverterCount] = useState<number | undefined>();
```

with:

```ts
  const [inverterMode, setInverterMode] = useState<'auto' | 'manual'>('auto');
  const [inverterOverrides, setInverterOverrides] = useState<InverterOverride[]>([]);
```

3. In `onCalculationCleared`, replace `setManualInverterCount(undefined);` with nothing — the rows survive a cleared price on purpose. Leave the two panel-count resets alone.

4. Add, after `onCalculationCleared`:

```ts
  /*
    The rows die with the phase, and only with the phase.

    A size change leaves them standing: a chosen combination is a decision
    about this roof, and the capacity warning re-runs against the new size and
    says so. A phase change is different — the inverter itself becomes the
    wrong device.
  */
  const onInverterSelectionInvalidated = useCallback(() => {
    setInverterOverrides([]);
  }, []);
```

5. Pass it to the hook:

```ts
  const formLogic = useQuoteFormLogic({
    form: form as never,
    onCalculationCleared,
    onInverterSelectionInvalidated,
  });
```

6. In `buildCalculateRequest`, replace the inverter lines. The current body has:

```ts
      preferredInverterBrand: values.preferredInverterBrand || undefined,
      preferredInverterCapacityKw: values.preferredInverterCapacityKw || undefined,
```

and ends with `manualInverterCount,`. Replace the two lines with:

```ts
      // Never both: the server refuses a brand or capacity sent beside rows,
      // because it would silently ignore one of them.
      preferredInverterBrand:
        inverterMode === 'manual' ? undefined : values.preferredInverterBrand || undefined,
      preferredInverterCapacityKw:
        inverterMode === 'manual' ? undefined : values.preferredInverterCapacityKw || undefined,
      inverterOverrides: inverterMode === 'manual' ? inverterOverrides : undefined,
```

Delete the `manualInverterCount,` line, and change the dependency array to:

```ts
    [manualDcrPanelCount, manualNonDcrPanelCount, inverterMode, inverterOverrides],
```

7. In `handleCalculate`, inside the `if (options?.resetManualCounts)` block, delete `manualInverterCount: undefined,` from the spread and delete `setManualInverterCount(undefined);`.

8. Add the mode switch handler, after `onInverterSelectionInvalidated`:

```ts
  /*
    Switching to Manual starts from what Auto just priced rather than from
    nothing, so the rep edits a real combination instead of rebuilding one.
    With no price yet there is nothing to copy and the list starts empty.
  */
  const handleInverterModeChange = useCallback(
    (next: 'auto' | 'manual') => {
      setInverterMode(next);
      if (next === 'manual') {
        setInverterOverrides(
          calculation?.inverters.inverters.map((inv) => ({
            productId: inv.productId,
            quantity: inv.quantity,
          })) ?? [],
        );
      } else {
        setInverterOverrides([]);
      }
      onCalculationCleared();
    },
    [calculation, onCalculationCleared],
  );

  const handleInverterRowsChange = useCallback(
    (rows: InverterOverride[]) => {
      setInverterOverrides(rows);
      onCalculationCleared();
    },
    [onCalculationCleared],
  );
```

9. Replace the two JSX blocks `{/* Inverter Brand */}` and `{/* Inverter Capacity */}` (lines 1329-1424) with a single:

```tsx
              <InverterSection
                mode={inverterMode}
                onModeChange={handleInverterModeChange}
                brandValue={form.watch('preferredInverterBrand')}
                onBrandChange={formLogic.handleInverterBrandChange}
                brandOptions={config.inverterBrands}
                capacityValue={form.watch('preferredInverterCapacityKw')}
                onCapacityChange={(v) =>
                  formLogic.handleFieldChange('preferredInverterCapacityKw', v)
                }
                capacityOptions={config.getInverterCapacities(
                  form.watch('phaseType'),
                  form.watch('preferredInverterBrand'),
                )}
                rows={inverterOverrides}
                onRowsChange={handleInverterRowsChange}
                productOptions={config.getInverterProductOptions(form.watch('phaseType'))}
                systemSizeKw={form.watch('systemSizeKw')}
                phaseType={form.watch('phaseType')}
                isLoading={config.isLoading}
              />
```

10. In the `<QuotePreviewPanel ... />` props, delete `manualInverterCount={manualInverterCount}` and `onManualInverterCountChange={handleQuantityChange(setManualInverterCount)}`.

11. Block pricing on an empty manual list. In the `useMemo` that returns `{ isCalculateDisabled, missingFields, tooltipMessage }` (line 257), the body opens with:

```ts
    const missing = [];
    if (!structureType) missing.push('Structure Type');
```

Add one line directly beneath:

```ts
    if (inverterMode === 'manual' && inverterOverrides.length === 0) missing.push('Inverters');
```

Nothing else in that `useMemo` changes — `hasMissingFields` already disables the button and the tooltip already reads `Please select: Inverters`. Add `inverterMode` and `inverterOverrides` to its dependency array.

- [ ] **Step 7: Typecheck and lint the web app**

```bash
cd /Volumes/works-space/oneohm/oneohm && npm run typecheck:web && npm run web:lint
```

Expected: no errors. If `missing`/`message` are `const` in that `useMemo`, make them `let` first.

- [ ] **Step 8: Walk the screen**

Start the backend and the web app:

```bash
cd /Volumes/works-space/oneohm/oneohm && npm run backend:dev
```

```bash
cd /Volumes/works-space/oneohm/oneohm && npm run web:dev
```

Open `http://localhost:3001`, go to a new quote, and confirm each of these by looking at the screen. Restart the dev server before trusting any console error.

1. Auto mode looks and prices exactly as before.
2. Price a 12 kW quote on auto. Switch to Manual — the rows are pre-filled with what auto just picked, and the price is gone.
3. Add a second inverter of a different brand. Price it. The equipment list shows both lines and the total capacity is the real sum.
4. Add the same inverter again from the picker — it merges into the existing row as quantity 2. It does not create a second row.
5. Remove every row — the price button is disabled and names the reason.
6. Build an under-capacity set (say 10 kW on a 12 kW system) — the amber line appears and the quote still prices and still saves.
7. Raise the system size above 7 kW — the phase flips to three-phase and the rows clear.
8. Change the system size within one phase — the rows stay.
9. Switch back to Auto — rows drop, brand and capacity return to auto.
10. Save the quote. Open the quote detail: both inverters appear under equipment.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/works-space/oneohm/oneohm
git add apps/web/lib/hooks/resources/products.ts apps/web/components/features/quotes/
git commit -m "$(cat <<'EOF'
feat(quotes): pick a combination of inverters by hand on the web

A rep could name one brand and one capacity and let the server do the
rest. A real design is often a mix — 12 kW from one maker, 6 kW from
another — and there was no way to ask for it, though the API has
accepted exactly that since the calculator was built.

The price panel's inverter stepper goes with it: a count was a weaker
way of asking the same question, and the server refuses the two
together.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Publish the shared package

**Files:** none changed. This is a gate.

- [ ] **Step 1: Push the branch and open the PR**

```bash
cd /Volumes/works-space/oneohm/oneohm && git push -u origin feat/manual-inverter-selection
```

```bash
cd /Volumes/works-space/oneohm/oneohm && gh pr create --fill --title "Pick a combination of inverters by hand"
```

Append to the PR body:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- [ ] **Step 2: Merge after review, then wait for the publish**

`.github/workflows/publish-shared.yml` fires on the push to `main`. It publishes the current version, hits a 409 because `1.12.3` is taken, auto-bumps the patch and publishes **`1.12.4`**, then commits the bump back to `main` as `chore(shared): auto-bump version to 1.12.4 [skip ci]`.

```bash
cd /Volumes/works-space/oneohm/oneohm && gh run list --workflow=publish-shared.yml --limit 3
```

Expected: the newest run is green.

- [ ] **Step 3: Confirm the version actually published**

```bash
cd /Volumes/works-space/oneohm/oneohm && git fetch origin main && git log origin/main --oneline -3
```

Expected: an `auto-bump version to 1.12.4` commit. Note the exact version — Task 7 installs it. Do not hand-copy `node_modules` from anywhere; a copied build hides a broken one.

---

## Task 7: Mobile — the model layer

No UI in this task. It ends on a clean typecheck and lint, because there is no screen to look at yet — the screen arrives in Task 8 and is where the real verification happens.

**Files:**
- Modify: `oneohm-mobile/package.json` (dependency version only, via `npm install`)
- Modify: `src/features/quotes/api/types.ts:62-65`
- Modify: `src/features/quotes/model/quoteForm.ts:88-96, 100-140, 155-185`
- Modify: `src/features/quotes/model/pricing.ts:44-67, 254-280, 507`
- Modify: `src/features/quotes/model/validate.ts:125-170`
- Modify: `src/features/quotes/model/index.ts:19-32`

**Interfaces:**
- Consumes: `deriveInverterProductOptions`, `InverterProductOption` from `@tejas96/shared/utils` (Task 1, published in Task 6).
- Produces:
  - `QuoteForm.inverterMode: 'auto' | 'manual'`
  - `QuoteForm.inverterOverrides: InverterOverride[]` (always an array, never `undefined` — an empty list is a real state the price blocker reads)
  - `InverterOverride = { productId: string; quantity: number }` exported from `quoteForm.ts`
  - `applyInverterMode(form, mode, pricedInverters?): QuoteForm`
  - `applyInverterRows(form, rows): QuoteForm`
  - `MAX_INVERTER_ROWS = 10`, `MAX_INVERTER_QUANTITY = 20`

- [ ] **Step 1: Install the published shared package**

```bash
cd /Volumes/works-space/oneohm/oneohm-mobile && npm install @tejas96/shared@1.12.4
```

Expected: installs cleanly. The registry token is in `oneohm-mobile/.env`. If it 404s, Task 6 has not finished publishing.

- [ ] **Step 2: Swap the field on the request type**

In `src/features/quotes/api/types.ts`, inside `CalculateQuoteRequest`, delete:

```ts
  manualInverterCount?: number;
```

and add, after `manualNonDcrPanelCount?: number;`:

```ts
  /**
   * The exact inverters a rep chose, one entry per product.
   *
   * Unlike the panel counts above this is not a REQUEST — the server prices
   * precisely these and nothing else. Never sent alongside
   * `preferredInverterBrand` or `preferredInverterCapacityKw`; the server
   * refuses the combination rather than quietly dropping one.
   */
  inverterOverrides?: Array<{ productId: string; quantity: number }>;
```

- [ ] **Step 3: Put the mode and the rows in the form**

In `src/features/quotes/model/quoteForm.ts`:

Add near the other constants, after `SINGLE_PHASE_CEILING_KW`:

```ts
/** One row per product. Past this the list stops being a choice and starts being a form. */
export const MAX_INVERTER_ROWS = 10;
/** Matches @Max(20) on the server's InverterOverrideDto. */
export const MAX_INVERTER_QUANTITY = 20;

export type InverterOverride = { productId: string; quantity: number };
```

In the `QuoteForm` type, delete `manualInverterCount?: number;` and add, after `preferredInverterCapacityKw?: number;`:

```ts
  /**
   * Which way the inverter is chosen.
   *
   * 'auto' uses the brand and capacity above. 'manual' uses `inverterOverrides`
   * and the two above are not sent at all — the server refuses them together.
   */
  inverterMode: 'auto' | 'manual';

  /**
   * The exact inverters, on a manual quote.
   *
   * Always an array. An empty one is a real state a rep can reach by removing
   * the last row, and it blocks the price — so it must be distinguishable from
   * "manual was never chosen", which is what `inverterMode` carries.
   */
  inverterOverrides: InverterOverride[];
```

In `initialQuoteForm`, add after `dcrPreference: DcrPreference.DCR_ONLY,`:

```ts
    inverterMode: 'auto',
    inverterOverrides: [],
```

In `toCalculateRequest`, delete `manualInverterCount: form.manualInverterCount,` and replace the two inverter preference lines:

```ts
    preferredInverterBrand: form.preferredInverterBrand || undefined,
    preferredInverterCapacityKw: form.preferredInverterCapacityKw,
```

with:

```ts
    // On a manual quote the brand and capacity are not "also true" — the server
    // refuses them beside the rows, because it would ignore one of the two.
    preferredInverterBrand:
      form.inverterMode === 'manual' ? undefined : form.preferredInverterBrand || undefined,
    preferredInverterCapacityKw:
      form.inverterMode === 'manual' ? undefined : form.preferredInverterCapacityKw,
    inverterOverrides: form.inverterMode === 'manual' ? form.inverterOverrides : undefined,
```

- [ ] **Step 4: Clear the rows when the phase moves**

In `src/features/quotes/model/pricing.ts`, inside `applySystemSize`, after the `preferredInverterCapacityKw` consequence block and still inside the `if (systemSizeKw > SINGLE_PHASE_CEILING_KW && ...)` branch:

```ts
    if (form.inverterOverrides.length > 0) {
      next.inverterOverrides = [];
      consequences.push({
        field: 'inverterOverrides',
        message:
          'The inverters you picked are cleared. A single-phase inverter is the wrong device on a three-phase system, not just a small one.',
      });
    }
```

In `applyPhase`, replace the whole function body:

```ts
export function applyPhase(form: QuoteForm, phaseType: string): Applied {
  /*
    The phase card fires on every tap, including a tap on the phase already
    chosen. That is not a change, so it must not cost the rep the inverters
    they picked. (The capacity reset below is the old behaviour and is left
    exactly as it was.)
  */
  const phaseChanged = phaseType !== form.phaseType;

  const next: QuoteForm = {
    ...form,
    phaseType,
    preferredInverterCapacityKw: undefined,
    inverterOverrides: phaseChanged ? [] : form.inverterOverrides,
  };

  const consequences: Consequence[] = [];

  if (form.preferredInverterCapacityKw !== undefined) {
    consequences.push({
      field: 'preferredInverterCapacityKw',
      message: 'The inverter capacity is cleared — the options depend on the phase.',
    });
  }

  if (phaseChanged && form.inverterOverrides.length > 0) {
    consequences.push({
      field: 'inverterOverrides',
      message:
        'The inverters you picked are cleared — an inverter built for one phase is the wrong device on the other.',
    });
  }

  return { form: next, consequences };
}
```

- [ ] **Step 5: Add the mode and row helpers**

Append to `src/features/quotes/model/pricing.ts`, after `applyInverterBrand`:

```ts
/**
 * Switch between letting the server choose and choosing by hand.
 *
 * Going manual starts from what the server last priced rather than from
 * nothing, so a rep edits a real combination instead of rebuilding one.
 * `pricedInverters` is what the last calculation returned; with no price yet
 * there is nothing to copy and the list starts empty.
 */
export function applyInverterMode(
  form: QuoteForm,
  inverterMode: 'auto' | 'manual',
  pricedInverters?: readonly { productId: string; quantity: number }[],
): QuoteForm {
  // Choosing the mode already on is not a change. Without this, a second tap on
  // "Choose myself" copies the last price over rows the rep has edited — or,
  // once those edits have killed the price, empties the list outright.
  if (form.inverterMode === inverterMode) {
    return form;
  }
  if (inverterMode === 'auto') {
    return { ...form, inverterMode, inverterOverrides: [] };
  }
  return {
    ...form,
    inverterMode,
    inverterOverrides: (pricedInverters ?? []).map(inverter => ({
      productId: inverter.productId,
      quantity: inverter.quantity,
    })),
    preferredInverterBrand: undefined,
    preferredInverterCapacityKw: undefined,
  };
}

/**
 * Add, change or drop a row.
 *
 * Adding a product already on the list raises its quantity instead of adding a
 * second row: two rows of one product are two identical lines on the quote and
 * on the BOM, and the server refuses them outright.
 */
export function applyInverterRows(form: QuoteForm, rows: InverterOverride[]): QuoteForm {
  const merged: InverterOverride[] = [];
  for (const row of rows) {
    const existing = merged.find(candidate => candidate.productId === row.productId);
    const quantity = Math.min(MAX_INVERTER_QUANTITY, Math.max(1, row.quantity));
    if (existing) {
      existing.quantity = Math.min(MAX_INVERTER_QUANTITY, existing.quantity + quantity);
    } else if (merged.length < MAX_INVERTER_ROWS) {
      merged.push({ productId: row.productId, quantity });
    }
  }
  return { ...form, inverterOverrides: merged };
}
```

Add to the imports at the top of `pricing.ts`:

```ts
import {
  MAX_INVERTER_QUANTITY,
  MAX_INVERTER_ROWS,
  SINGLE_PHASE_CEILING_KW,
  type InverterOverride,
  type QuoteForm,
} from './quoteForm';
```

(replacing the existing `import { SINGLE_PHASE_CEILING_KW, type QuoteForm } from './quoteForm';` on line 7)

- [ ] **Step 6: Drop the inverter from pending quantities, and make the new warning loud**

In `hasPendingQuantities`, delete the `invertersPriced` computation and the third clause of the return, leaving:

```ts
  return (
    (form.manualDcrPanelCount !== undefined && form.manualDcrPanelCount !== dcrPriced) ||
    (form.manualNonDcrPanelCount !== undefined && form.manualNonDcrPanelCount !== nonDcrPriced)
  );
```

On line 507, add the new code to the severe set:

```ts
const SEVERE_CODES = new Set([
  'PANEL_CAPACITY_UNDERSIZED',
  'INVERTER_CAPACITY_INSUFFICIENT',
  'INVERTER_PHASE_MISMATCH',
]);
```

- [ ] **Step 7: Block the price on an empty manual list**

In `src/features/quotes/model/validate.ts`, inside `priceBlockers`, after the `structureType` blocker (ends line 157):

```ts
  /*
    Reachable only by removing the last row — the mode starts on auto and
    switching to manual copies whatever was last priced. It is still a state a
    rep can sit in, and a manual quote with nothing chosen has no answer to
    give the server.
  */
  if (input.form.inverterMode === 'manual' && input.form.inverterOverrides.length === 0) {
    blockers.push({
      owner: 'rep',
      title: 'No inverter is chosen',
      detail:
        'The inverter is set to manual and the list is empty. Add at least one, or put it back on auto.',
    });
  }
```

- [ ] **Step 8: Re-export the new helpers**

In `src/features/quotes/model/index.ts`:

Add to the `./quoteForm` export block: `MAX_INVERTER_ROWS,`, `MAX_INVERTER_QUANTITY,`, `type InverterOverride,`.

Add to the `./pricing` export block: `applyInverterMode,`, `applyInverterRows,`.

- [ ] **Step 9: Typecheck and lint**

```bash
cd /Volumes/works-space/oneohm/oneohm-mobile && npm run type-check && npm run lint
```

Expected: no errors. `CreateQuoteRoute.tsx` and `configSteps.tsx` will still reference `manualInverterCount` at this point and **will** fail — that is expected and is fixed in Task 8. If you want a clean gate here, do Steps 1-8 of Task 8 before running this.

- [ ] **Step 10: Commit**

```bash
cd /Volumes/works-space/oneohm/oneohm-mobile
git add package.json package-lock.json src/features/quotes/api/types.ts src/features/quotes/model/
git commit -m "$(cat <<'EOF'
feat(quotes): hold a hand-picked inverter combination in the form

The mode and the rows, the rules that clear them when the phase moves,
and the blocker for a manual quote with an empty list. No screen yet.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Mobile — the picker on the equipment step

**Files:**
- Modify: `src/features/quotes/api/catalogue.api.ts:1-12, 185-192, 137-152, 213-230`
- Modify: `src/features/quotes/components/OptionPicker.tsx:44-75, 90-100, 150-160` (one optional prop)
- Modify: `src/features/quotes/components/configSteps.tsx:1-10, 355-382, 464-505`
- Modify: `src/features/quotes/screens/CreateQuoteRoute.tsx:355-380, 455-485, 700-735, 1005-1026`

**Interfaces:**
- Consumes: everything Task 7 produces, plus `deriveInverterProductOptions` from Task 1.
- Produces:
  - `CatalogueState.getInverterProductOptions(phaseType?: string): InverterProductOption[]`
  - `EquipmentStep` props `inverterProducts`, `onInverterModeChange`, `onInverterRowsChange`.

- [ ] **Step 1: Expose the product list from the catalogue**

In `src/features/quotes/api/catalogue.api.ts`:

Add to the `@tejas96/shared/utils` import block: `deriveInverterProductOptions,` and `type InverterProductOption,`.

Add to the `CatalogueState` type, after `getInverterCapacityOptions`:

```ts
  /** Every inverter that can be picked by hand, for the manual mode. */
  getInverterProductOptions: (phaseType?: string) => InverterProductOption[];
```

Add the callback inside `useCatalogue`, after `getInverterCapacityOptions`:

```ts
  const getInverterProductOptions = useCallback(
    (phaseType?: string): InverterProductOption[] =>
      deriveInverterProductOptions(inverters.data ?? [], phaseType),
    [inverters.data],
  );
```

Add `getInverterProductOptions,` to the returned object.

- [ ] **Step 2: Take the new props on the equipment step**

In `src/features/quotes/components/configSteps.tsx`:

Add `InverterProductOption,` to the `@tejas96/shared/utils` type import block (lines 2-8).

Add to the `../model` import block (lines 15-26): `MAX_INVERTER_QUANTITY,`, `MAX_INVERTER_ROWS,`, `type InverterOverride,`.

Add to `EquipmentStep`'s destructured props and its type:

```ts
  inverterProducts,
  onInverterModeChange,
  onInverterRowsChange,
```

```ts
  /** Every inverter that can be picked by hand, sorted biggest first. */
  inverterProducts: readonly InverterProductOption[];
  onInverterModeChange: (mode: 'auto' | 'manual') => void;
  onInverterRowsChange: (rows: InverterOverride[]) => void;
```

Import `type InverterOverride` from `../model` at the top.

- [ ] **Step 3: Replace the inverter field group**

Replace the whole `<FieldGroup label="Inverter">…</FieldGroup>` block (lines 464-505) with:

```tsx
      <FieldGroup label="Inverter">
        <QuoteCard>
          <View style={styles.modeRow}>
            {(['auto', 'manual'] as const).map(mode => (
              <Pressable
                key={mode}
                style={[styles.modeChip, form.inverterMode === mode && styles.modeChipOn]}
                onPress={() => onInverterModeChange(mode)}
              >
                <Text
                  style={[styles.modeLabel, form.inverterMode === mode && styles.modeLabelOn]}
                >
                  {mode === 'auto' ? 'Auto' : 'Choose myself'}
                </Text>
              </Pressable>
            ))}
          </View>

          {form.inverterMode === 'auto' ? (
            <>
              <OptionPicker
                autoHint="The combination that meets the system size"
                label="Brand"
                options={inverterBrands.map(brand => ({
                  value: brand.value,
                  label: brand.label,
                  hint: brand.capacityRange,
                }))}
                sheetTitle="Which inverter brand?"
                value={form.preferredInverterBrand}
                onChange={onInverterBrandChange}
              />

              <View style={styles.subField}>
                <OptionPicker
                  alwaysField
                  autoHint="Sized to the system"
                  emptyNote={
                    inverterBrands.length === 0
                      ? 'No inverters are set up yet.'
                      : `Nothing from ${form.preferredInverterBrand ?? 'this brand'} at ${form.phaseType.replace('_', ' ')} — leave it on auto, or try another brand.`
                  }
                  label="Capacity"
                  options={inverterCapacities.map(capacity => ({
                    value: capacity.value,
                    label: capacity.label,
                  }))}
                  sheetTitle="Which capacity?"
                  value={form.preferredInverterCapacityKw}
                  onChange={onCapacityChange}
                />
              </View>
            </>
          ) : (
            <InverterRows
              form={form}
              products={inverterProducts}
              onRowsChange={onInverterRowsChange}
            />
          )}
        </QuoteCard>
      </FieldGroup>
```

- [ ] **Step 4: Let `OptionPicker` omit its "Auto" choice, then add the rows sub-component**

`OptionPicker` always renders an "Auto" choice — a chip on the inline path, a pre-ticked first row in the sheet — and shows `autoLabel` as the field's value while nothing is selected. For every existing caller that is right: `undefined` means "the server picks". For "Add inverter" it is wrong twice over: the field would read "Auto" inside the manual picker, and the sheet would open on a ticked "Auto" row that does nothing.

In `src/features/quotes/components/OptionPicker.tsx`, add one optional prop, defaulting to today's behaviour so no existing caller changes:

```ts
  /**
   * Offer "Auto" as a choice. On by default — for every picker that sets a
   * preference, `undefined` means the server picks.
   *
   * Off for a picker that ADDS something, where there is no server choice to
   * fall back to. `autoLabel` then serves only as the field's placeholder.
   */
  allowAuto?: boolean;
```

Destructure it as `allowAuto = true,`. Then wrap the auto `ValueChip` on the inline path and the auto `PickerRow` in the sheet, each in `{allowAuto ? ( … ) : null}`. Nothing else in the component changes.

Now add to `configSteps.tsx`, immediately before `EquipmentStep`:

```tsx
/**
 * The hand-picked inverters, one row per product.
 *
 * Adding a product already listed raises its quantity — `applyInverterRows`
 * merges — so the sheet never has to hide what is already chosen, and a rep
 * who taps the same thing twice gets the obvious result rather than a refusal.
 */
function InverterRows({
  form,
  products,
  onRowsChange,
}: {
  form: QuoteForm;
  products: readonly InverterProductOption[];
  onRowsChange: (rows: InverterOverride[]) => void;
}): React.JSX.Element {
  const byId = new Map(products.map(product => [product.productId, product]));
  const totalCapacityKw = form.inverterOverrides.reduce(
    (sum, row) => sum + (byId.get(row.productId)?.capacityKw ?? 0) * row.quantity,
    0,
  );
  const short = totalCapacityKw < form.systemSizeKw;

  const setQuantity = (productId: string, quantity: number) =>
    onRowsChange(
      form.inverterOverrides.map(row =>
        row.productId === productId ? { ...row, quantity } : row,
      ),
    );

  return (
    <View style={styles.optionColumn}>
      {form.inverterOverrides.length === 0 ? (
        <Text style={styles.emptyNote}>
          Nothing chosen yet. Add an inverter, or put it back on auto.
        </Text>
      ) : null}

      {form.inverterOverrides.map(row => {
        const product = byId.get(row.productId);
        return (
          <View key={row.productId} style={styles.inverterRow}>
            <View style={styles.inverterRowText}>
              <Text style={styles.inverterRowTitle}>
                {product ? `${product.capacityKw} kW · ${product.brandName}` : 'Unavailable'}
              </Text>
              <Text style={styles.inverterRowDetail}>
                {product?.name ?? 'No longer in the catalogue — remove it.'}
              </Text>
            </View>
            <QuantityStepper
              max={MAX_INVERTER_QUANTITY}
              value={row.quantity}
              onChange={next => setQuantity(row.productId, next)}
            />
            <Pressable
              hitSlop={8}
              onPress={() =>
                onRowsChange(form.inverterOverrides.filter(item => item.productId !== row.productId))
              }
            >
              <Text style={styles.removeMark}>✕</Text>
            </Pressable>
          </View>
        );
      })}

      {form.inverterOverrides.length < MAX_INVERTER_ROWS ? (
        <OptionPicker
          alwaysField
          allowAuto={false}
          autoLabel="Choose an inverter"
          emptyNote={
            products.length === 0
              ? `No inverters at ${form.phaseType.replace('_', ' ')} in the catalogue.`
              : undefined
          }
          label="Add inverter"
          options={products.map(product => ({
            value: product.productId,
            label: product.label,
          }))}
          sheetTitle="Which inverter?"
          value={undefined}
          onChange={productId => {
            if (!productId) {
              return;
            }
            onRowsChange([...form.inverterOverrides, { productId, quantity: 1 }]);
          }}
        />
      ) : null}

      {form.inverterOverrides.length > 0 ? (
        <Text style={[styles.totalNote, short && styles.totalNoteShort]}>
          {short
            ? `Only ${totalCapacityKw} kW of inverters for a ${form.systemSizeKw} kW system. Output may be cut.`
            : `Total ${totalCapacityKw} kW · system is ${form.systemSizeKw} kW`}
        </Text>
      ) : null}
    </View>
  );
}
```

`SizeStepper` from `quoteControls.tsx` is deliberately **not** reused: it is a full-width control with a large numeral, built for system size, floors and distance. A row quantity needs a compact one. Add it locally, immediately above `InverterRows`:

```tsx
/** The compact +/- for one row. `SizeStepper` is the full-width control and is wrong here. */
function QuantityStepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
}): React.JSX.Element {
  return (
    <View style={styles.qtyBox}>
      <Pressable
        disabled={value <= 1}
        hitSlop={6}
        style={styles.qtyButton}
        onPress={() => onChange(value - 1)}
      >
        <Text style={[styles.qtyMark, value <= 1 && styles.qtyMarkOff]}>−</Text>
      </Pressable>
      <Text style={styles.qtyValue}>{value}</Text>
      <Pressable
        disabled={value >= max}
        hitSlop={6}
        style={styles.qtyButton}
        onPress={() => onChange(value + 1)}
      >
        <Text style={[styles.qtyMark, value >= max && styles.qtyMarkOff]}>+</Text>
      </Pressable>
    </View>
  );
}
```

Add these keys to the `StyleSheet.create` at the bottom of `configSteps.tsx` (line 579). Every value uses tokens already imported in that file:

```ts
  modeRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  modeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceEdge,
  },
  modeChipOn: { backgroundColor: colors.accentSubtle, borderColor: colors.accentInk },
  modeLabel: { ...typography.label, color: colors.textSecondary },
  modeLabelOn: { color: colors.accentInk },

  inverterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  inverterRowText: { flex: 1, minWidth: 0 },
  inverterRowTitle: { ...typography.rowTitle },
  inverterRowDetail: { ...typography.helper, color: colors.textTertiary },
  removeMark: { ...typography.label, color: colors.textTertiary, paddingHorizontal: spacing.xs },

  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.canvasSunken,
  },
  qtyButton: { paddingHorizontal: spacing.sm, paddingVertical: 4 },
  qtyMark: { ...typography.rowTitle, color: colors.textSecondary },
  qtyMarkOff: { color: colors.textDisabled },
  qtyValue: { ...typography.rowTitle, minWidth: 20, textAlign: 'center' },

  emptyNote: { ...typography.helper, color: colors.textTertiary },
  totalNote: { ...typography.helper, color: colors.textTertiary, marginTop: spacing.xs },
  totalNoteShort: { color: colors.warning },
```

- [ ] **Step 5: Wire the handlers in the route**

In `src/features/quotes/screens/CreateQuoteRoute.tsx`:

Import `applyInverterMode`, `applyInverterRows` and `type InverterOverride` from `../model`.

In `killPrice`, delete `manualInverterCount` from both the guard condition and the reset object. Leave the two panel counts.

In the `handlers` object, delete `manualInverterCount` from the `quantity` handler:

```ts
      quantity: (key: 'dcr' | 'nonDcr', next?: number) => {
        setForm(current => ({
          ...current,
          ...(key === 'dcr' ? { manualDcrPanelCount: next } : {}),
          ...(key === 'nonDcr' ? { manualNonDcrPanelCount: next } : {}),
        }));
      },
```

Add two handlers after `capacity`:

```ts
      /*
        A row is a concrete change to the build, not a request against it — so
        unlike the panel counts it goes through `guardedChange` and takes the
        price with it.
      */
      inverterMode: (mode: 'auto' | 'manual') => {
        // A tap on the mode already showing changes nothing, so it must not
        // raise the kill-the-price sheet either.
        if (mode === form.inverterMode) {
          return;
        }
        guardedChange(() =>
          setForm(current =>
            applyInverterMode(current, mode, calculation?.inverters.inverters),
          ),
        );
      },
      inverterRows: (rows: InverterOverride[]) =>
        guardedChange(() => setForm(current => applyInverterRows(current, rows))),
```

Add `calculation` to that `useCallback`'s dependency array.

In `quantityLines`, delete the whole `inverter` entry (the object with `key: 'inverter'`, its `max: 20` and the comment above it) and narrow the cast:

```ts
    ].filter(Boolean) as Array<{
      key: 'dcr' | 'nonDcr';
      label: string;
      priced: number;
      requested?: number;
    }>;
```

Delete the now-unused `invertersPriced` computation just above it if nothing else reads it.

In the `<EquipmentStep … />` render, add three props:

```tsx
            inverterProducts={catalogue.getInverterProductOptions(form.phaseType)}
            onInverterModeChange={handlers.inverterMode}
            onInverterRowsChange={handlers.inverterRows}
```

- [ ] **Step 6: Typecheck and lint**

```bash
cd /Volumes/works-space/oneohm/oneohm-mobile && npm run type-check && npm run lint
```

Expected: no errors. Every `manualInverterCount` reference is gone.

- [ ] **Step 7: Run the existing mobile suite**

```bash
cd /Volumes/works-space/oneohm/oneohm-mobile && npm test
```

Expected: all tests pass. Do not add new ones.

- [ ] **Step 8: Walk the wizard**

Point the app at the local backend on `8085`, start Metro, and install the debug build.

```bash
cd /Volumes/works-space/oneohm/oneohm-mobile && npm start
```

```bash
cd /Volumes/works-space/oneohm/oneohm-mobile && npm run android
```

`npm run ios` needs `LANG=en_US.UTF-8`. Neither command leaves Metro running, so start it first. If nothing animates on Android, check `animator_duration_scale` before suspecting the code.

Walk the equipment step and confirm by looking:

1. Auto looks and prices as before.
2. Price a quote, switch to "Choose myself" — the rows are pre-filled from what was priced, and the confirm sheet warned that the price would die.
3. Add a second inverter of another brand. Price it. The equipment lines show both and the total is the real sum.
4. Add the same inverter again — the row's quantity goes to 2. No second row.
5. Remove every row — the price is blocked and the blocker names the reason.
6. Under-capacity shows the short-capacity line and still prices and still saves.
7. Raise the size above 7 kW — the phase flips and the consequence sheet says the inverters were cleared.
8. Change the size within one phase — the rows stay.
9. Back to Auto — the rows drop.
10. Pick a single-phase inverter on a three-phase quote if the catalogue allows it — the phase-mismatch warning renders in the **severe** block, not the quiet grey one.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/works-space/oneohm/oneohm-mobile
git add src/features/quotes/
git commit -m "$(cat <<'EOF'
feat(quotes): pick a combination of inverters by hand in the app

A rep on a terrace could name one brand and one capacity. A real design
is often a mix, and the API has accepted exactly that all along.

The inverter quantity stepper goes with it: a count asked the same
question less precisely, and the server refuses the two together.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Mobile — the project screen stated the wrong capacity

`inverterHeadline` multiplies the **total count** by the **first config's** capacity. One 12 kW plus one 6 kW renders "2 × 12 kW" — 24 kW claimed on an 18 kW system, to a technician standing under the array. Live today; manual selection makes it routine.

**Files:**
- Modify: `src/features/projectDetail/components/SystemBlock.tsx:42-54, 108-125`

**Interfaces:**
- Consumes: `project.inverterConfigs` — `Array<{ name, brand, capacityKw, quantity, productWarrantyYears? }>`, already correct on the API side.
- Produces: nothing other tasks read.

- [ ] **Step 1: Replace the two helpers with one that cannot lie**

In `src/features/projectDetail/components/SystemBlock.tsx`, replace `inverterHeadline` and `inverterDetail` (lines 42-54) with:

```ts
/**
 * One line per inverter model.
 *
 * This used to print `inverterCount × configs[0].capacityKw`, which multiplies
 * the TOTAL number of units by the FIRST model's capacity. A 12 kW beside a
 * 6 kW read as "2 × 12 kW" — 24 kW claimed on an 18 kW system, on the one
 * screen a technician under the array can check.
 */
function inverterLines(project: ProjectDetail): string[] {
  const configs = project.inverterConfigs ?? [];
  if (configs.length > 0) {
    return configs.map(config =>
      config.capacityKw
        ? `${config.quantity} × ${config.capacityKw} kW`
        : `${config.quantity} inverters`,
    );
  }
  // Converted projects often carry a count and no model at all.
  const count = project.inverterCount;
  return count ? [`${count} inverters`] : [];
}

/** Every distinct make on the roof. The phase is stated once, on its own line below. */
function inverterDetail(project: ProjectDetail): string | null {
  const brands = Array.from(
    new Set((project.inverterConfigs ?? []).map(config => config.brand).filter(Boolean)),
  );
  return brands.length > 0 ? brands.join(' · ') : null;
}
```

- [ ] **Step 2: Render every line**

Replace `const inverter = inverterHeadline(project);` with:

```ts
  const inverterLineList = inverterLines(project);
  const inverter = inverterLineList.length > 0;
```

In the JSX, the inverter column currently renders `{inverter}` inside a single `<Text style={styles.value}>`. Replace that `<Text>` with:

```tsx
              {inverterLineList.map((line, index) => (
                <Text key={`${line}-${index}`} style={styles.value}>
                  {line}
                </Text>
              ))}
```

The surrounding `{inverter ? ( … ) : null}` guard and the `inverterDetail` line beneath it stay as they are. The `if (!panels && !inverter && !structure && !phase)` early return still works, because `inverter` is now a boolean.

- [ ] **Step 3: Typecheck, lint, existing suite**

```bash
cd /Volumes/works-space/oneohm/oneohm-mobile && npm run type-check && npm run lint && npm test
```

Expected: no errors, all tests pass.

- [ ] **Step 4: Look at the screen**

Open the project created from the mixed quote saved in Task 8. The SYSTEM block must show two inverter lines — `1 × 12 kW` and `1 × 6 kW` — and both makes underneath. It must not show `2 × 12 kW`.

Also open a project converted from an old quote that has no inverter model. It must still show `N inverters`, not an empty column.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/works-space/oneohm/oneohm-mobile
git add src/features/projectDetail/components/SystemBlock.tsx
git commit -m "$(cat <<'EOF'
fix(projects): the system block multiplied the wrong two numbers

inverterHeadline took the TOTAL unit count and the FIRST model's
capacity. A 12 kW beside a 6 kW read as "2 × 12 kW" — 24 kW claimed on
an 18 kW system, on the one screen a technician under the array checks.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Push and open the mobile PR**

```bash
cd /Volumes/works-space/oneohm/oneohm-mobile && git push -u origin feat/manual-inverter-selection
```

```bash
cd /Volumes/works-space/oneohm/oneohm-mobile && gh pr create --fill --title "Pick a combination of inverters by hand"
```

The PR also carries the 8 unrelated files that were already in the working tree (login outcome, gallery, lead record, shared UI states). Say so in the body, and end it with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Deviations from the spec

Two, both found while reading the code to write this plan. Neither changes what a rep sees.

1. **Shared version is `1.12.4`, not `1.13.0`.** The spec assumed a manual minor bump. `publish-shared.yml` bumps the **patch** automatically on a 409, and hand-editing the version would fight it. Mobile's `^1.12.0` accepts either.

2. **Web holds the mode and rows as component state, not form fields.** The spec said to add `inverterOverrides` to `PRICING_AFFECTING_FIELDS` and to the shared `quoteBuilderSchema`. Neither is right: `manualInverterCount` was never a form field either — the manual quantities are plain `useState` in `quote-builder.tsx`, and `quoteBuilderSchema` is shared with mobile. Following the existing pattern means the rows clear the price by calling `onCalculationCleared()` directly, and the shared schema is untouched.
