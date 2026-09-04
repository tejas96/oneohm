import { BomAllocationStatus } from '@tejas96/shared/types';

import type { BomChangeSource, BomChangeType } from '../entities/bom-change.entity';
import type { BomLineChangeState } from '../services/bom-read.service';

export class BomItemSerialResponseDto {
  id!: string;
  serialNumber!: string;
}

export class BomItemResponseDto {
  id!: string;
  productId!: string;
  productName!: string;
  productCode!: string | null;
  brandName!: string | null;
  productTypeCode!: string | null;
  unit!: string;
  pricingBasis!: string;
  /** What the baseline said. Null means this line was never quoted — added after conversion. */
  quotedQuantity!: number | null;
  /** What the project needs now. */
  quantity!: number;
  unitPricePaise!: number;
  quotedTotalPaise!: number;
  currentTotalPaise!: number;
  variancePaise!: number;
  source!: string;
  changeState!: BomLineChangeState;
  /**
   * Per-product stock reservation status. 'pending' also covers lines the
   * allocation map has no entry for at all — a per_kw/per_watt line (not a
   * reservable unit) or a removed line (quantity 0).
   */
  allocationStatus!: 'allocated' | 'partial' | 'pending';
  serials!: BomItemSerialResponseDto[];
  sortOrder!: number;
}

export class BomTotalsDto {
  quotedPaise!: number;
  currentPaise!: number;
  variancePaise!: number;
  /** The change log's own claim about variance from quote: SUM(cost_impact_paise) minus quotedPaise. */
  varianceFromLogPaise!: number;
  /**
   * True when the items' current total and the change log's running total
   * agree — two independent computations of the same number, both rounded
   * per line before summing. Task 19 asserts this holds for every BOM at the
   * database level; false here means the log and the items have drifted.
   */
  reconciles!: boolean;
  lineCount!: number;
  addedLineCount!: number;
  removedLineCount!: number;
  changedLineCount!: number;

  /**
   * The generating capacity the panel lines add up to, as quoted and as the
   * bill now stands — watts-peak, summed from each panel product's rated
   * wattage times its quantity.
   *
   * These exist because a falling material cost means two opposite things and
   * money alone cannot tell them apart. Swapping to a cheaper structure leaves
   * the customer with exactly the system they signed for and the saving is the
   * contractor's. Dropping a panel does not: the customer signed for 6.1 kW and
   * is being handed 5.49 kW, and nothing on the project said so — the system
   * card reads its size from the quote snapshot and never looks at the bill, so
   * it kept advertising 10 panels while the BOM carried 9.
   *
   * Null when no line on the bill is a solar panel, or when the panels carry no
   * rated wattage: absent is not the same as zero, and a page must not report a
   * shortfall it cannot actually measure.
   */
  quotedSystemWp!: number | null;
  currentSystemWp!: number | null;
}

export class BomResponseDto {
  id!: string;
  bomNumber!: string;
  projectId!: string;
  baselineQuoteVersionId!: string | null;
  notes!: string | null;
  /**
   * Aggregate stock-reservation status derived from the same per-product map
   * that fills each line's `allocationStatus`: 'fully_allocated' when every
   * product line is fully reserved, 'partial' when some are, 'pending'
   * otherwise (including "nothing to reserve"). Duplicates information
   * already in `items[]`, kept anyway because `project-bom-tab.tsx` and
   * `project-dashboard-page.tsx` both read this exact top-level field and
   * would regress without it.
   */
  allocationStatus!: BomAllocationStatus;
  items!: BomItemResponseDto[];
  totals!: BomTotalsDto;
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * One row of the BOM change log.
 *
 * Numeric quantities come back as numbers even though the columns are
 * NUMERIC(12,3) (TypeORM hands those over as strings) — a client rendering a
 * quantity should not have to know that. Money stays in paise, integer, the
 * way it is stored: `costImpactPaise` is signed, and summing it over a BOM is
 * the log's own claim about that BOM's variance from its quote.
 */
export class BomChangeResponseDto {
  id!: string;
  bomId!: string;
  /** Null when the change is not about one particular row. */
  bomItemId!: string | null;
  productId!: string;
  changeType!: BomChangeType;
  quantityBefore!: number | null;
  quantityAfter!: number | null;
  /** What a 'replace' swapped out. Null on every other change type. */
  replacedProductId!: string | null;
  unitPricePaise!: number;
  costImpactPaise!: number;
  reason!: string;
  source!: BomChangeSource;
  createdBy!: string;
  /**
   * Resolved display name for `createdBy`, the same shape as the ledger's
   * `recordedByName`. Null when the user has no name on file, or when
   * `createdBy` no longer resolves to a row in `users` — never guessed.
   */
  createdByName!: string | null;
  createdAt!: Date;
}
