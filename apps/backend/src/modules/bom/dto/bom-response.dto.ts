import { BomAllocationStatus } from '@tejas96/shared/types';

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
