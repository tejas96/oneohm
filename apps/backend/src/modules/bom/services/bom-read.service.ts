import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BomAllocationStatus } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import { BomAllocationService } from '../../inventory/services/bom-allocation.service';
import {
  BomChangeResponseDto,
  BomItemResponseDto,
  BomResponseDto,
  BomTotalsDto,
} from '../dto/bom-response.dto';
import { BomChangeRepository } from '../repositories/bom-change.repository';
import { BomRepository } from '../repositories/bom.repository';

export type BomLineChangeState = 'unchanged' | 'added' | 'increased' | 'decreased' | 'removed';

export interface ProcurementItem {
  productId: string;
  name: string;
  unit: string;
  targetQty: number;
  spentQty: number;
  status: 'pending' | 'partial' | 'procured';
  over: boolean;
  remaining: number;
  unitPrice: number | null;
  targetSpend: number | null;
  actualSpend: number;
}

export interface ProcurementStatus {
  items: ProcurementItem[];
  totals: {
    totalProducts: number;
    pending: number;
    partial: number;
    procured: number;
    overProcuredProducts: number;
    targetSpend: number;
    actualSpend: number;
  };
}

@Injectable()
export class BomReadService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
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
      // `current === 0` is tested FIRST, before `quoted === null`. A line that
      // was added on site and then removed again has both properties, and the
      // state that matters to a reader is the one that survives: it is gone.
      // Testing `quoted === null` first labelled such a row "Added" while it
      // showed 0 pcs — the badge contradicted the quantity beside it. Money was
      // never affected (the line contributes 0 to both totals either way); only
      // the label and the added/removed counters were wrong.
      if (current === 0) {
        changeState = 'removed';
        removed += 1;
      } else if (quoted === null) {
        changeState = 'added';
        added += 1;
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

  /**
   * The project's BOM change log, newest first. Every mutation carries a
   * mandatory reason, so this reads as the "why" history of the bill of
   * materials rather than a diff nobody can explain.
   */
  async getChanges(projectId: string): Promise<BomChangeResponseDto[]> {
    const bom = await this.bomRepository.findByProject(projectId);
    if (!bom) throw new NotFoundException(`Project ${projectId} has no BOM yet`);

    const changes = await this.bomChangeRepository.findByBom(bom.id);
    return changes.map((change) => ({
      id: change.id,
      bomId: change.bomId,
      bomItemId: change.bomItemId ?? null,
      productId: change.productId,
      changeType: change.changeType,
      quantityBefore: change.quantityBefore === null ? null : Number(change.quantityBefore),
      quantityAfter: change.quantityAfter === null ? null : Number(change.quantityAfter),
      replacedProductId: change.replacedProductId ?? null,
      unitPricePaise: change.unitPricePaise,
      costImpactPaise: change.costImpactPaise,
      reason: change.reason,
      source: change.source,
      createdBy: change.createdBy,
      createdByName: change.createdByName,
      createdAt: change.createdAt,
    }));
  }

  // ============================================================
  // PROCUREMENT (plan §2.5 / §3.4)
  // ============================================================

  /**
   * Sum BOM-target quantities per product for a project. Returns a map
   * keyed by productId — products absent from the BOM are absent from
   * the map (caller must treat that as 0).
   *
   * Pulls only the requested productIds when supplied.
   */
  async getBomTargetsForProject(
    projectId: string,
    productIdsFilter?: string[],
  ): Promise<Map<string, number>> {
    const params: unknown[] = [projectId];
    let filterSql = '';
    if (productIdsFilter && productIdsFilter.length > 0) {
      params.push(productIdsFilter);
      filterSql = `AND bi.product_id = ANY($2::uuid[])`;
    }

    const rows = await this.dataSource.query(
      `SELECT bi.product_id AS product_id,
              COALESCE(SUM(bi.quantity), 0)::numeric AS target
         FROM bom b
         JOIN bom_items bi ON bi.bom_id = b.id
        WHERE b.project_id = $1::uuid
          AND bi.product_id IS NOT NULL
          ${filterSql}
        GROUP BY bi.product_id`,
      params,
    );

    const out = new Map<string, number>();
    for (const r of rows) out.set(r.product_id, Number(r.target));
    return out;
  }

  /**
   * Procurement status for a project (plan §3.4). Joins BOM items
   * (target qty + name + unit price for spend-budget) with the
   * already-spent qty pulled from `expense_product_links`. Status is
   * derived per row:
   *   procured  : spent >= target
   *   partial   : 0 < spent < target
   *   pending   : spent == 0
   * Rows where spent > target are flagged via the `over` boolean.
   *
   * Three columns this CTE used to read are gone or going:
   *
   * - `b.entity_type = 'project' AND b.entity_id = $1` is now `b.project_id`.
   *   entity_type is NULL on every BOM written since Task 11, so the old
   *   predicate matched nothing at all for a newly-created project.
   * - `MIN(bi.name)` is now `MIN(p.name)` off a products join. bom_items.name
   *   is unmapped legacy that Task 20 drops, and BomEditService leaves it
   *   blank, so a site-added line showed a nameless row.
   * - `MAX(bi.unit_price)` is now `MAX(bi.unit_price_paise) / 100.0`. Same
   *   story: bi.unit_price is NULL on every line written since Task 14, so
   *   those lines reported a blank target spend and silently contributed 0 to
   *   the totals.targetSpend a procurement manager budgets against.
   *
   * `bi.unit` survives — it is still a mapped column on the entity.
   */
  async getProcurementStatus(projectId: string): Promise<ProcurementStatus> {
    const rows = await this.dataSource.query(
      `WITH bom_targets AS (
         SELECT bi.product_id,
                MIN(p.name)                       AS name,
                MIN(bi.unit)                      AS unit,
                SUM(bi.quantity)                  AS target_qty,
                MAX(bi.unit_price_paise) / 100.0  AS unit_price
           FROM bom b
           JOIN bom_items bi ON bi.bom_id = b.id
           JOIN products p ON p.id = bi.product_id
          WHERE b.project_id = $1::uuid
            AND bi.product_id IS NOT NULL
          GROUP BY bi.product_id
       ),
       spent AS (
         SELECT epl.product_id,
                COALESCE(SUM(epl.quantity), 0) AS spent_qty,
                COALESCE(SUM(epl.quantity * COALESCE(epl.unit_price, 0)), 0) AS actual_spend
           FROM expense_product_links epl
           JOIN project_expenses pe ON pe.id = epl.expense_id
          WHERE pe.project_id = $1::uuid
            AND pe.deleted_at IS NULL
            AND epl.product_id IS NOT NULL
          GROUP BY epl.product_id
       )
       SELECT t.product_id,
              t.name,
              t.unit,
              t.target_qty,
              COALESCE(s.spent_qty, 0)        AS spent_qty,
              t.unit_price,
              COALESCE(s.actual_spend, 0)     AS actual_spend
         FROM bom_targets t
         LEFT JOIN spent s ON s.product_id = t.product_id
        ORDER BY t.name`,
      [projectId],
    );

    const items: ProcurementItem[] = rows.map(
      (r: {
        product_id: string;
        name: string;
        unit: string;
        target_qty: string;
        spent_qty: string;
        unit_price: string | null;
        actual_spend: string;
      }) => {
        const targetQty = Number(r.target_qty);
        const spentQty = Number(r.spent_qty);
        const unitPrice = r.unit_price === null ? null : Number(r.unit_price);
        const status: 'pending' | 'partial' | 'procured' =
          spentQty <= 0 ? 'pending' : spentQty >= targetQty ? 'procured' : 'partial';
        return {
          productId: r.product_id,
          name: r.name,
          unit: r.unit,
          targetQty,
          spentQty,
          status,
          over: spentQty > targetQty + 1e-6,
          remaining: Math.max(targetQty - spentQty, 0),
          unitPrice,
          targetSpend: unitPrice !== null ? unitPrice * targetQty : null,
          actualSpend: Number(r.actual_spend),
        };
      },
    );

    return {
      items,
      totals: {
        totalProducts: items.length,
        pending: items.filter((i) => i.status === 'pending').length,
        partial: items.filter((i) => i.status === 'partial').length,
        procured: items.filter((i) => i.status === 'procured').length,
        overProcuredProducts: items.filter((i) => i.over).length,
        targetSpend: items.reduce((s, i) => s + (i.targetSpend ?? 0), 0),
        actualSpend: items.reduce((s, i) => s + i.actualSpend, 0),
      },
    };
  }
}
