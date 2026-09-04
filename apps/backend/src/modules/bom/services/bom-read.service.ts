import { Injectable } from '@nestjs/common';
import { BomAllocationStatus } from '@tejas96/shared/types';

import { BomAllocationService } from '../../inventory/services/bom-allocation.service';
import { BomItemResponseDto, BomResponseDto, BomTotalsDto } from '../dto/bom-response.dto';
import { BomChangeRepository } from '../repositories/bom-change.repository';
import { BomRepository } from '../repositories/bom.repository';

export type BomLineChangeState = 'unchanged' | 'added' | 'increased' | 'decreased' | 'removed';

@Injectable()
export class BomReadService {
  constructor(
    private readonly bomRepository: BomRepository,
    private readonly bomChangeRepository: BomChangeRepository,
    private readonly allocationService: BomAllocationService,
  ) {}

  /**
   * The project's bill of materials: what was quoted, what is needed now, and
   * the difference — per line and in total.
   *
   * The quoted figure comes from bom_items.quoted_quantity, stamped at seeding
   * and immutable after it. It is deliberately NOT recomputed from the
   * baseline quote version on every read: a quote can legitimately be revised
   * after conversion, and re-deriving would silently move a signed project's
   * "originally quoted" number. baseline_quote_version_id records provenance;
   * quoted_quantity records the fact.
   */
  async getForProject(projectId: string): Promise<BomResponseDto | null> {
    const bom = await this.bomRepository.findByProject(projectId);
    if (!bom) return null;

    // Per-product allocation status lives in inventory (it reads
    // StockAllocation rows). Every BOM is project-scoped now (Task 11) — no
    // guard needed here, unlike the dead `bom.entityType === 'project'` check
    // this replaces in bom.service.ts's findByEntity, which is always false
    // today because `entityType` no longer exists on BomEntity.
    const productAllocationStatus = await this.allocationService.statusByProduct(bom.id);

    // Aggregate BOM-level status, derived from the same map. Two screens
    // (project-bom-tab.tsx, project-dashboard-page.tsx) read this exact
    // top-level field, so it is preserved even though it duplicates
    // information already on each line.
    const statuses = Object.values(productAllocationStatus);
    let allocationStatus: BomAllocationStatus = BomAllocationStatus.PENDING;
    if (statuses.length > 0) {
      if (statuses.every((status) => status === 'allocated')) {
        allocationStatus = BomAllocationStatus.FULLY_ALLOCATED;
      } else if (statuses.some((status) => status === 'allocated' || status === 'partial')) {
        allocationStatus = BomAllocationStatus.PARTIAL;
      }
    }

    let quotedPaise = 0;
    let currentPaise = 0;
    let added = 0;
    let removed = 0;
    let changed = 0;

    const items: BomItemResponseDto[] = (bom.items ?? []).map((item) => {
      const quoted =
        item.quotedQuantity === null || item.quotedQuantity === undefined
          ? null
          : Number(item.quotedQuantity);
      const current = Number(item.quantity);
      const price = item.unitPricePaise;

      // Both sides round per line, not per total: quantity is NUMERIC(12,3)
      // and unit_price_paise is BIGINT, so their product can land on a
      // fraction of a paisa. bom_changes.cost_impact_paise (also BIGINT) was
      // seeded the same way — see BomTotalsDto.reconciles below.
      const quotedTotalPaise = quoted === null ? 0 : Math.round(quoted * price);
      const currentTotalPaise = Math.round(current * price);

      quotedPaise += quotedTotalPaise;
      currentPaise += currentTotalPaise;

      let changeState: BomLineChangeState;
      if (quoted === null) {
        changeState = 'added';
        added += 1;
      } else if (current === 0) {
        changeState = 'removed';
        removed += 1;
      } else if (current > quoted) {
        changeState = 'increased';
        changed += 1;
      } else if (current < quoted) {
        changeState = 'decreased';
        changed += 1;
      } else {
        changeState = 'unchanged';
      }

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product?.name ?? '(product removed)',
        productCode: item.product?.code ?? null,
        brandName: item.product?.brand?.name ?? null,
        productTypeCode: item.product?.productType?.code ?? null,
        unit: item.unit,
        pricingBasis: item.pricingBasis,
        quotedQuantity: quoted,
        quantity: current,
        unitPricePaise: price,
        quotedTotalPaise,
        currentTotalPaise,
        variancePaise: currentTotalPaise - quotedTotalPaise,
        source: item.source,
        changeState,
        // Per-row status prefers the per-product map; a line whose product
        // has no entry (a per_kw/per_watt line, or nothing left to reserve)
        // falls back to 'pending', not to the BOM-level aggregate above.
        allocationStatus: productAllocationStatus[item.productId] ?? 'pending',
        serials: (item.serials ?? []).map((s) => ({
          id: s.id,
          serialNumber: s.serialNumber,
        })),
        sortOrder: item.sortOrder,
      };
    });

    // Two independent computations of the same number. Task 19 asserts they
    // agree in the database; surfacing `reconciles` here means a mismatch
    // shows up on screen rather than only in a migration.
    const logImpactPaise = await this.bomChangeRepository.sumImpact(bom.id);
    const variancePaise = currentPaise - quotedPaise;

    const totals: BomTotalsDto = {
      quotedPaise,
      currentPaise,
      variancePaise,
      varianceFromLogPaise: logImpactPaise - quotedPaise,
      reconciles: logImpactPaise === currentPaise,
      lineCount: items.length,
      addedLineCount: added,
      removedLineCount: removed,
      changedLineCount: changed,
    };

    return {
      id: bom.id,
      bomNumber: bom.bomNumber,
      projectId: bom.projectId,
      baselineQuoteVersionId: bom.baselineQuoteVersionId ?? null,
      notes: bom.notes ?? null,
      allocationStatus,
      items,
      totals,
      createdAt: bom.createdAt,
      updatedAt: bom.updatedAt,
    };
  }

  /**
   * Panel serial numbers for the project reports. Replaces the report
   * provider's own filter over bom.items[].serialNumber, which no longer
   * exists as a column.
   */
  async getPanelSerials(projectId: string): Promise<string[]> {
    const bom = await this.bomRepository.findByProject(projectId);
    if (!bom) return [];
    return (bom.items ?? [])
      .flatMap((item) => (item.serials ?? []).map((s) => s.serialNumber))
      .filter((s): s is string => Boolean(s?.trim()));
  }
}
