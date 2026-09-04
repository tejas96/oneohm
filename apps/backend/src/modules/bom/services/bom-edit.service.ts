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

      let effectivePricePaise: number;
      let itemId: string;

      if (existing && wasQuoted) {
        // A previously-removed QUOTED line coming back. It keeps its stamped
        // price, so it needs no catalog lookup AT ALL — and must not do one.
        // Resolving a price here would throw "has no active price" whenever the
        // product's price has since lapsed, blocking a field worker from undoing
        // their own mis-removal of a line whose price this path never uses.
        //
        // Reuse the row so the unique index holds and the line's history stays
        // on one item id. quotedQuantity and source are left alone on purpose:
        // the line's provenance is what it always was, and the read service
        // should still show it against its quoted figure rather than reclassify
        // it as newly added.
        effectivePricePaise = existing.unitPricePaise;
        existing.quantity = String(dto.quantity);
        existing.updatedBy = userId;
        await itemRepo.save(existing);
        itemId = existing.id;
      } else {
        // Everything else genuinely takes a catalog price: a brand-new line, or
        // a never-quoted line coming back, which has no quoted baseline to
        // protect.
        const { unitPricePaise, pricingBasis, unit } = await this.resolvePrice(
          manager,
          dto.productId,
          projectId,
        );
        effectivePricePaise = unitPricePaise;

        if (existing) {
          existing.quantity = String(dto.quantity);
          existing.unitPricePaise = unitPricePaise;
          existing.pricingBasis = pricingBasis;
          existing.unit = unit;
          existing.updatedBy = userId;
          await itemRepo.save(existing);
          itemId = existing.id;
        } else {
          itemId = await this.insertItem(manager, {
            bomId: bom.id,
            productId: dto.productId,
            quantity: dto.quantity,
            unit,
            unitPricePaise,
            pricingBasis,
            source,
            sortOrder: await this.nextSortOrder(manager, bom.id),
            userId,
          });
        }
      }

      // Whether the row is new or a removed one coming back, its contribution
      // before this call was 0 — a removed line sits at quantity 0.
      const costImpactPaise = this.lineTotalPaise(dto.quantity, effectivePricePaise);

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

      // DO NOT simplify to ROUND((dto.quantity - before) * price). The two
      // are not equal when a quantity is fractional, and the items side is the
      // difference of two rounded totals — measured on this data's real per_kw
      // line, 3.420 -> 3.423 at 491228 paise, the shortcut writes 1474 where
      // the items move by 1473. bom_changes is append-only: that paisa could
      // never be taken back.
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

      // Loaded BEFORE resolving any price, because whether a catalog price is
      // needed at all depends on what is already on the BOM.
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

      // Resolve a catalog price ONLY when the target is actually going to take
      // one. A stamped-price target needs no lookup, and doing one anyway would
      // throw "has no active price" for a price this path never uses — the same
      // dead end addItem's revival path avoids.
      let effectivePricePaise: number;
      let resolved: { unitPricePaise: number; pricingBasis: string; unit: string } | null = null;

      if (target && targetKeepsItsPrice) {
        effectivePricePaise = target.unitPricePaise;
      } else {
        resolved = await this.resolvePrice(manager, dto.replaceWithProductId, projectId);
        effectivePricePaise = resolved.unitPricePaise;
      }

      const targetTotalBefore = target
        ? this.lineTotalPaise(targetBefore, target.unitPricePaise)
        : 0;
      const targetTotalAfter = this.lineTotalPaise(targetBefore + quantity, effectivePricePaise);

      old.quantity = '0';
      old.updatedBy = userId;
      await itemRepo.save(old);

      let newItemId: string;
      if (target) {
        target.quantity = String(targetBefore + quantity);
        if (resolved) {
          target.unitPricePaise = resolved.unitPricePaise;
          target.pricingBasis = resolved.pricingBasis;
          target.unit = resolved.unit;
        }
        target.updatedBy = userId;
        await itemRepo.save(target);
        newItemId = target.id;
      } else if (resolved) {
        newItemId = await this.insertItem(manager, {
          bomId: bom.id,
          productId: dto.replaceWithProductId,
          quantity,
          unit: resolved.unit,
          unitPricePaise: resolved.unitPricePaise,
          pricingBasis: resolved.pricingBasis,
          source,
          // The replacement sits where the line it replaces sat.
          sortOrder: old.sortOrder,
          userId,
        });
      } else {
        // Unreachable: with no target row targetKeepsItsPrice is false, so the
        // price above resolved. A typed guard rather than a non-null assertion.
        throw new Error('Replacement price was not resolved for a new BOM line');
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
   *
   * Every cost_impact_paise in this service is a difference of two of these,
   * never a delta-quantity multiplied by a price. That is what makes the log
   * reconstruct the items side EXACTLY, which is the invariant Task 19 asserts
   * in the database.
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
  ): Promise<{ unitPricePaise: number; pricingBasis: string; unit: string }> {
    // withDeleted, because ProductEntity.deletedAt is a @DeleteDateColumn:
    // without it TypeORM filters soft-deleted rows out of the query entirely
    // and the "has been deleted" message below is unreachable — a deleted
    // product would report as simply not found. PricingService is no help
    // either: its findAnyById passes no withDeleted, so it would raise its own
    // generic NotFoundException. Loading the row deleted-and-all is the only
    // way this method can tell a deleted product from a missing one.
    const product = await manager.getRepository(ProductEntity).findOne({
      where: { id: productId },
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
   * A plain entity insert. It was raw SQL until migration 1856760000000: two
   * unmapped legacy columns, item_type and name, were still NOT NULL with no
   * default, so an entity-shaped INSERT failed outright and the columns had to
   * be written by hand. That migration drops both NOT NULLs, which is where the
   * fix belongs — Task 20 drops the columns themselves, and a service that
   * names them would be a landmine for whoever does it.
   *
   * Worth knowing if you ever need to write an unmapped column: the query
   * builder cannot. `.into('bom_items')` resolves the table name back to
   * BomItemEntity and SILENTLY DROPS every key that is not a mapped property —
   * no error, just a row with bom_id, product_id and unit_price_paise null.
   * Only manager.query() reaches columns the entity does not know about.
   */
  private async insertItem(
    manager: EntityManager,
    row: {
      bomId: string;
      productId: string;
      quantity: number;
      unit: string;
      unitPricePaise: number;
      pricingBasis: string;
      source: BomChangeSource;
      sortOrder: number;
      userId: string;
    },
  ): Promise<string> {
    const itemRepo = manager.getRepository(BomItemEntity);
    const saved = await itemRepo.save(
      itemRepo.create({
        bomId: row.bomId,
        productId: row.productId,
        quantity: String(row.quantity),
        // NULL, not 0: this line was never quoted, and that is what makes
        // BomReadService classify it as 'added' rather than 'increased'.
        quotedQuantity: null,
        unit: row.unit,
        unitPricePaise: row.unitPricePaise,
        pricingBasis: row.pricingBasis,
        source: row.source,
        sortOrder: row.sortOrder,
        createdBy: row.userId,
        updatedBy: row.userId,
      }),
    );
    return saved.id;
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
