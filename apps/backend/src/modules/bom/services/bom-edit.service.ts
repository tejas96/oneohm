import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { rupeesToPaise } from '../../ledger/domain/paise';
import { ProductEntity } from '../../master-data/entities/product.entity';
import { PricingService } from '../../master-data/services/pricing.service';
import {
  AddBomItemDto,
  ChangeBomQuantityDto,
  RemoveBomItemDto,
  ReplaceBomItemDto,
} from '../dto/bom-edit.dto';
import { BomChangeSource } from '../entities/bom-change.entity';
import { BomItemEntity } from '../entities/bom-item.entity';
import { BomEntity } from '../entities/bom.entity';
import { BomChangeRepository } from '../repositories/bom-change.repository';

/**
 * The four things a field worker does to a project's bill of materials: add a
 * line, change its quantity, swap the product, take it off.
 *
 * THE INVARIANT, and the reason every method here is one transaction: each
 * operation writes its item change AND its bom_changes row together, or
 * neither lands. bom_changes is append-only at the database level (an ENABLE
 * ALWAYS trigger rejects UPDATE and DELETE), so a log row written without its
 * item change — or an item change without its log row — can never be
 * corrected. Task 19 asserts at the database level that
 * SUM(cost_impact_paise) reconstructs SUM(ROUND(quantity × unit_price_paise))
 * for every BOM.
 *
 * That assertion is also why every cost_impact_paise here is computed as the
 * difference of two ROUNDED line totals (see lineTotalPaise) rather than as
 * `delta_quantity × price`. The two agree whenever the quantities are whole,
 * but quantity is NUMERIC(12,3): at price 1 paise, going 0.5 → 1.0 rounds to
 * an impact of 1 the first way and 0 the second, and the log would be
 * permanently one paisa away from the items. Measuring the movement instead
 * of predicting it makes the invariant hold by construction.
 */
@Injectable()
export class BomEditService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly bomChangeRepository: BomChangeRepository,
    private readonly pricingService: PricingService,
  ) {}

  async addItem(
    projectId: string,
    dto: AddBomItemDto,
    userId: string,
    source: BomChangeSource = 'site',
  ): Promise<{ itemId: string; costImpactPaise: number }> {
    return this.dataSource.transaction(async (manager) => {
      const bom = await this.lockBom(manager, projectId);
      const itemRepo = manager.getRepository(BomItemEntity);

      // UNIQUE (bom_id, product_id): adding a product already on the list is a
      // quantity change, not a second row. Say so rather than 500ing on the index.
      const existing = await itemRepo.findOne({
        where: { bomId: bom.id, productId: dto.productId },
      });
      if (existing && Number(existing.quantity) > 0) {
        throw new ConflictException(
          `This product is already on the BOM. Change its quantity instead.`,
        );
      }

      const { product, unitPricePaise, pricingBasis, unit } = await this.resolvePrice(
        manager,
        dto.productId,
        projectId,
      );

      // A line that was quoted keeps the price its quote was struck at, even
      // when it is coming back from a removal. bom-item.entity.ts states the
      // rule: "Resolved once through PricingService when the line was added,
      // then never re-read. A catalog price change must not move a signed
      // project's figures." Re-pricing here would do exactly that, because
      // BomReadService derives quotedTotalPaise from the line's CURRENT unit
      // price — re-stamping a revived quoted line was measured moving one
      // project's quotedPaise from 12,080,000 to 12,315,200. It also keeps
      // revival consistent with changeQuantity, which never re-prices: the
      // same end state must not depend on the route taken to it.
      const wasQuoted = existing?.quotedQuantity !== null && existing?.quotedQuantity !== undefined;
      const effectivePricePaise = existing && wasQuoted ? existing.unitPricePaise : unitPricePaise;

      // Whether the row is new or a removed one coming back, its contribution
      // before this call was 0 — a removed line sits at quantity 0.
      const costImpactPaise = this.lineTotalPaise(dto.quantity, effectivePricePaise);

      let itemId: string;
      if (existing) {
        // A previously-removed line coming back. Reuse the row so the unique
        // index holds and the line's history stays on one item id.
        //
        // quotedQuantity and source are left alone on purpose: the line's
        // provenance is what it always was, and if it was quoted, the read
        // service should still show it against its quoted figure rather than
        // reclassify it as newly added.
        existing.quantity = String(dto.quantity);
        if (!wasQuoted) {
          existing.unitPricePaise = unitPricePaise;
          existing.pricingBasis = pricingBasis;
          existing.unit = unit;
        }
        existing.updatedBy = userId;
        await itemRepo.save(existing);
        itemId = existing.id;
      } else {
        itemId = await this.insertItem(manager, {
          bomId: bom.id,
          product,
          quantity: dto.quantity,
          unit,
          unitPricePaise,
          pricingBasis,
          source,
          sortOrder: await this.nextSortOrder(manager, bom.id),
          userId,
        });
      }

      await this.bomChangeRepository.append(
        [
          {
            bomId: bom.id,
            bomItemId: itemId,
            productId: dto.productId,
            changeType: 'add',
            quantityBefore: null,
            quantityAfter: String(dto.quantity),
            unitPricePaise: effectivePricePaise,
            costImpactPaise,
            reason: dto.reason,
            source,
            createdBy: userId,
          },
        ],
        manager,
      );

      return { itemId, costImpactPaise };
    });
  }

  async changeQuantity(
    projectId: string,
    itemId: string,
    dto: ChangeBomQuantityDto,
    userId: string,
    source: BomChangeSource = 'site',
  ): Promise<{ costImpactPaise: number }> {
    return this.dataSource.transaction(async (manager) => {
      const bom = await this.lockBom(manager, projectId);
      const itemRepo = manager.getRepository(BomItemEntity);
      const item = await itemRepo.findOne({ where: { id: itemId, bomId: bom.id } });
      if (!item) throw new NotFoundException(`BOM item ${itemId} not found on this project`);

      const before = Number(item.quantity);
      if (before === dto.quantity) {
        // Nothing moved, so nothing to log. A log row here would claim a
        // change that never happened, and it could not be taken back.
        return { costImpactPaise: 0 };
      }

      const costImpactPaise =
        this.lineTotalPaise(dto.quantity, item.unitPricePaise) -
        this.lineTotalPaise(before, item.unitPricePaise);

      item.quantity = String(dto.quantity);
      item.updatedBy = userId;
      await itemRepo.save(item);

      await this.bomChangeRepository.append(
        [
          {
            bomId: bom.id,
            bomItemId: item.id,
            productId: item.productId,
            changeType: 'quantity',
            quantityBefore: String(before),
            quantityAfter: String(dto.quantity),
            unitPricePaise: item.unitPricePaise,
            costImpactPaise,
            reason: dto.reason,
            source,
            createdBy: userId,
          },
        ],
        manager,
      );

      return { costImpactPaise };
    });
  }

  async removeItem(
    projectId: string,
    itemId: string,
    dto: RemoveBomItemDto,
    userId: string,
    source: BomChangeSource = 'site',
  ): Promise<{ costImpactPaise: number }> {
    return this.dataSource.transaction(async (manager) => {
      const bom = await this.lockBom(manager, projectId);
      const itemRepo = manager.getRepository(BomItemEntity);
      const item = await itemRepo.findOne({ where: { id: itemId, bomId: bom.id } });
      if (!item) throw new NotFoundException(`BOM item ${itemId} not found on this project`);

      const before = Number(item.quantity);
      // Already removed. Idempotent, and deliberately writes no second log
      // row: the line is already at 0, so there is no movement to record.
      if (before === 0) return { costImpactPaise: 0 };

      const costImpactPaise = -this.lineTotalPaise(before, item.unitPricePaise);

      // Never deleted. A removed quoted line must stay visible and struck
      // through, and stock_allocations.bom_id must never dangle.
      item.quantity = '0';
      item.updatedBy = userId;
      await itemRepo.save(item);

      await this.bomChangeRepository.append(
        [
          {
            bomId: bom.id,
            bomItemId: item.id,
            productId: item.productId,
            changeType: 'remove',
            quantityBefore: String(before),
            quantityAfter: '0',
            unitPricePaise: item.unitPricePaise,
            costImpactPaise,
            reason: dto.reason,
            source,
            createdBy: userId,
          },
        ],
        manager,
      );

      return { costImpactPaise };
    });
  }

  async replaceItem(
    projectId: string,
    itemId: string,
    dto: ReplaceBomItemDto,
    userId: string,
    source: BomChangeSource = 'site',
  ): Promise<{ newItemId: string; costImpactPaise: number }> {
    return this.dataSource.transaction(async (manager) => {
      const bom = await this.lockBom(manager, projectId);
      const itemRepo = manager.getRepository(BomItemEntity);
      const old = await itemRepo.findOne({ where: { id: itemId, bomId: bom.id } });
      if (!old) throw new NotFoundException(`BOM item ${itemId} not found on this project`);
      if (old.productId === dto.replaceWithProductId) {
        throw new BadRequestException('That is the same product');
      }

      const quantity = Number(old.quantity);
      if (quantity === 0) {
        throw new BadRequestException('This line was already removed; add the new product instead');
      }

      const oldTotalPaise = this.lineTotalPaise(quantity, old.unitPricePaise);
      const { product, unitPricePaise, pricingBasis, unit } = await this.resolvePrice(
        manager,
        dto.replaceWithProductId,
        projectId,
      );

      old.quantity = '0';
      old.updatedBy = userId;
      await itemRepo.save(old);

      const target = await itemRepo.findOne({
        where: { bomId: bom.id, productId: dto.replaceWithProductId },
      });

      const targetBefore = target ? Number(target.quantity) : 0;

      // An existing target line keeps the price it already carries when it
      // still has quantity (re-stamping would re-value quantity the user never
      // touched, with no log row accounting for the movement) or when it was
      // quoted (re-stamping would move the project's quoted baseline, since
      // BomReadService derives quotedTotalPaise from the current unit price).
      // Only a never-quoted line sitting at 0 is genuinely new here, and it
      // takes today's price — the same rule addItem's revival path follows.
      const targetWasQuoted =
        target?.quotedQuantity !== null && target?.quotedQuantity !== undefined;
      const targetKeepsItsPrice = !!target && (targetBefore > 0 || targetWasQuoted);
      const effectivePricePaise =
        target && targetKeepsItsPrice ? target.unitPricePaise : unitPricePaise;
      const targetTotalBefore = target
        ? this.lineTotalPaise(targetBefore, target.unitPricePaise)
        : 0;
      const targetTotalAfter = this.lineTotalPaise(targetBefore + quantity, effectivePricePaise);

      let newItemId: string;
      if (target) {
        target.quantity = String(targetBefore + quantity);
        if (!targetKeepsItsPrice) {
          target.unitPricePaise = unitPricePaise;
          target.pricingBasis = pricingBasis;
          target.unit = unit;
        }
        target.updatedBy = userId;
        await itemRepo.save(target);
        newItemId = target.id;
      } else {
        newItemId = await this.insertItem(manager, {
          bomId: bom.id,
          product,
          quantity,
          unit,
          unitPricePaise,
          pricingBasis,
          source,
          // The replacement sits where the line it replaces sat.
          sortOrder: old.sortOrder,
          userId,
        });
      }

      // Measured, not predicted: what the two touched lines actually moved by.
      const costImpactPaise = targetTotalAfter - targetTotalBefore - oldTotalPaise;

      // ONE change row, not a remove plus an add. A replacement is one decision
      // and must read as one on screen.
      await this.bomChangeRepository.append(
        [
          {
            bomId: bom.id,
            bomItemId: newItemId,
            productId: dto.replaceWithProductId,
            changeType: 'replace',
            quantityBefore: String(quantity),
            quantityAfter: String(quantity),
            replacedProductId: old.productId,
            unitPricePaise: effectivePricePaise,
            costImpactPaise,
            reason: dto.reason,
            source,
            createdBy: userId,
          },
        ],
        manager,
      );

      return { newItemId, costImpactPaise };
    });
  }

  /**
   * A line's contribution to the BOM total, rounded exactly the way the
   * reconciliation assertion rounds it: per line, before summing. quantity is
   * NUMERIC(12,3) and unit_price_paise is BIGINT, so their product can land on
   * a fraction of a paisa. BomReadService rounds identically.
   */
  private lineTotalPaise(quantity: number, unitPricePaise: number): number {
    return Math.round(quantity * unitPricePaise);
  }

  /**
   * Resolve the price to stamp on a line, and the basis that says what its
   * quantity counts.
   *
   * Goes through PricingService because that is the only place that knows how
   * per_unit, per_watt and per_kw differ. For per_kw it is called WITHOUT
   * systemSizeKw on purpose: that returns rupees per kW, and the line's
   * quantity is then the kW itself — matching the purchase-order form's
   * convention. Passing systemSizeKw would return a whole-system total and
   * make the quantity meaningless.
   */
  private async resolvePrice(
    manager: EntityManager,
    productId: string,
    projectId: string,
  ): Promise<{
    product: ProductEntity;
    unitPricePaise: number;
    pricingBasis: string;
    unit: string;
  }> {
    // withDeleted, because ProductEntity.deletedAt is a @DeleteDateColumn:
    // without it TypeORM filters soft-deleted rows out of the query and the
    // "has been deleted" message below is unreachable — a deleted product
    // would report as simply not found. PricingService resolves through
    // findAnyById, which does see deleted products, so this check has to be
    // the one that catches them.
    const product = await manager.getRepository(ProductEntity).findOne({
      where: { id: productId },
      relations: ['productType', 'brand'],
      withDeleted: true,
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);
    if (product.deletedAt) {
      throw new BadRequestException(`${product.name} has been deleted and cannot be added`);
    }

    const projectType = await this.resolveProjectType(manager, projectId);

    const price = await this.pricingService.getEffectiveUnitPrice(productId, { projectType });

    if (price.unitPricePerPiece === null) {
      throw new BadRequestException(
        `${product.name} has no active price. Set one in the product admin before adding it to a BOM.`,
      );
    }

    return {
      product,
      // rupeesToPaise, not Math.round(x * 100): the house helper normalises
      // through toFixed(6) first, so a price like 1.005 does not round down
      // to 100 paise on the nearest-double representation.
      unitPricePaise: rupeesToPaise(price.unitPricePerPiece),
      pricingBasis: price.basis,
      unit: product.unitOfMeasure,
    };
  }

  /** The project's own project type, so pricing picks the right tier. */
  private async resolveProjectType(
    manager: EntityManager,
    projectId: string,
  ): Promise<string | undefined> {
    const rows: Array<{ project_type: string }> = await manager.query(
      `SELECT qv.project_type
         FROM projects p
         JOIN quote_versions qv ON qv.id = p.contract_quote_version_id
        WHERE p.id = $1`,
      [projectId],
    );
    return rows[0]?.project_type;
  }

  /** Lock the BOM row first — the lock order the allocation service depends on. */
  private async lockBom(manager: EntityManager, projectId: string): Promise<BomEntity> {
    const bom = await manager
      .getRepository(BomEntity)
      .createQueryBuilder('bom')
      .where('bom.project_id = :projectId', { projectId })
      .setLock('pessimistic_write')
      .getOne();
    if (!bom) {
      throw new NotFoundException(`Project ${projectId} has no BOM yet`);
    }
    return bom;
  }

  /**
   * Insert a BOM line.
   *
   * Written as raw SQL rather than itemRepo.save() because bom_items still
   * carries legacy columns that BomItemEntity deliberately no longer maps —
   * and two of them, item_type and name, are NOT NULL with no default. An
   * entity-shaped INSERT therefore fails outright:
   *
   *   null value in column "item_type" of relation "bom_items"
   *     violates not-null constraint
   *
   * The query builder is no use here either: .into('bom_items') resolves the
   * table name back to BomItemEntity and silently DROPS every key that is not
   * a mapped property, so the same insert arrives with bom_id, product_id and
   * unit_price_paise all null. Raw SQL is the only form that writes columns
   * the entity does not know about.
   *
   * Task 20 drops these columns and this method goes back to itemRepo.save().
   * Until then they are populated from the product rather than stubbed,
   * following Task 7's ruling that the legacy money columns be restated on
   * rows the new code writes: the pre-Task-16 read path still displays
   * name/brand/item_type and sums total_price.
   *
   * The legacy money columns are NOT kept in sync by the three update paths
   * above, which go through itemRepo.save() and so touch mapped columns only.
   * Nothing reads them but bom.service.ts's own recomputeBomTotals, which is
   * only reachable from the legacy write path that Tasks 15 and 16 delete.
   */
  private async insertItem(
    manager: EntityManager,
    row: {
      bomId: string;
      product: ProductEntity;
      quantity: number;
      unit: string;
      unitPricePaise: number;
      pricingBasis: string;
      source: BomChangeSource;
      sortOrder: number;
      userId: string;
    },
  ): Promise<string> {
    const rows: Array<{ id: string }> = await manager.query(
      `INSERT INTO bom_items
         (bom_id, product_id, quantity, quoted_quantity, unit, unit_price_paise,
          pricing_basis, source, sort_order, created_by, updated_by,
          item_type, name, brand, unit_price, total_price)
       VALUES
         -- quoted_quantity is NULL, not 0: this line was never quoted, and that
         -- is what makes BomReadService classify it as 'added', not 'increased'.
         ($1, $2, $3, NULL, $4, $5, $6, $7, $8, $9, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        row.bomId,
        row.product.id,
        row.quantity,
        row.unit,
        row.unitPricePaise,
        row.pricingBasis,
        row.source,
        row.sortOrder,
        row.userId,
        // Legacy columns, dropped by Task 20 — see the comment above.
        row.product.productType?.code ?? 'other',
        row.product.name,
        row.product.brand?.name ?? null,
        row.unitPricePaise / 100,
        this.lineTotalPaise(row.quantity, row.unitPricePaise) / 100,
      ],
    );

    const insertedId = rows[0]?.id;
    if (!insertedId) {
      throw new Error('Inserting a BOM line returned no id');
    }
    return insertedId;
  }

  /** Next free sort position on this BOM, so a new line lands at the bottom. */
  private async nextSortOrder(manager: EntityManager, bomId: string): Promise<number> {
    const maxSort = await manager
      .getRepository(BomItemEntity)
      .createQueryBuilder('i')
      .select('COALESCE(MAX(i.sort_order), -1)', 'max')
      .where('i.bom_id = :bomId', { bomId })
      .getRawOne<{ max: string }>();
    return Number(maxSort?.max ?? -1) + 1;
  }
}
