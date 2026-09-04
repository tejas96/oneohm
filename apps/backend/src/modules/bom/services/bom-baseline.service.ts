import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { BomEditService } from './bom-edit.service';
import { rupeesToPaise } from '../../ledger/domain/paise';
import { ProductEntity } from '../../master-data/entities/product.entity';
import { PricingService } from '../../master-data/services/pricing.service';
import type { CalculateQuoteResponseDto } from '../../quotes/dto/calculator/calculate-quote-response.dto';
import { QuoteVersionEntity } from '../../quotes/entities/quote-version.entity';
import { bomLinesFromCalculation } from '../../quotes/services/bom-lines-from-calculation';
import { BomChangeEntity } from '../entities/bom-change.entity';
import { BomItemEntity } from '../entities/bom-item.entity';
import { BomEntity } from '../entities/bom.entity';
import { BomChangeRepository } from '../repositories/bom-change.repository';
import { BomRepository } from '../repositories/bom.repository';

/** One proposed movement on one product. Nothing here has been applied. */
export interface PreviewLine {
  productId: string;
  productName: string;
  /** Current quantity. null on an add — there is no line yet. */
  from: number | null;
  /** Quantity after the change. null is never produced today; kept for symmetry. */
  to: number | null;
  /** Signed, in paise, measured the way BomEditService measures it. */
  impactPaise: number;
}

export interface RebaselinePreview {
  quoteVersionId: string;
  versionNumber: number;
  adds: PreviewLine[];
  increases: PreviewLine[];
  decreases: PreviewLine[];
  removes: PreviewLine[];
  /**
   * Site additions, listed so the operator can see what re-baselining is
   * KEEPING. They appear in no other bucket and are never applied against.
   */
  protectedSiteLines: PreviewLine[];
  netImpactPaise: number;
}

/**
 * One line of the quote version, resolved against the catalog.
 *
 * `unitPricePaise` is null when the product has no active price today. That is
 * not fatal: an existing BOM line carries its own stamped price and can still
 * be re-quantified, so a lapsed catalog price must not turn a line that IS in
 * the quote into a removal. Only a brand-new line genuinely needs a price.
 */
interface IncomingLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPricePaise: number | null;
  pricingBasis: string;
  unit: string;
}

/**
 * Where a project's bill of materials comes from, and how it is moved onto a
 * later quote version without destroying anything.
 *
 * Replaces two defective paths:
 *
 *   ProjectService.copyQuoteBomToProject cloned the quote version's OWN bom
 *   rows. Task 10 deleted every quote_version BOM, so that lookup has returned
 *   null ever since and its try/catch only logged a warning — every project
 *   created since then silently got an empty BOM. seedFromQuoteVersion builds
 *   from the version's calculation snapshot instead, which is the record.
 *
 *   BomService.reconcileFromCalculation built its product map from the quote
 *   calculation alone and DELETED any bom_items row whose product was absent,
 *   cancelling that row's stock allocation on the way out. The moment a field
 *   worker can add a line, the next sync destroys it. previewRebaseline and
 *   applyRebaseline replace it: the preview applies nothing, and a
 *   source = 'site' line is untouchable.
 *
 * THE INVARIANT: every write here puts its item change and its bom_changes row
 * in ONE transaction. bom_changes is append-only (an ENABLE ALWAYS trigger
 * rejects UPDATE and DELETE), so a mismatch can never be corrected, and Task 19
 * asserts at the database level that SUM(cost_impact_paise) reconstructs
 * SUM(ROUND(quantity × unit_price_paise)) per BOM. Seeding writes its items and
 * its log rows in one transaction; applying delegates to BomEditService, each of
 * whose four operations is already one transaction.
 */
@Injectable()
export class BomBaselineService {
  private readonly logger = new Logger(BomBaselineService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly bomRepository: BomRepository,
    private readonly bomChangeRepository: BomChangeRepository,
    private readonly bomEditService: BomEditService,
    private readonly pricingService: PricingService,
  ) {}

  /**
   * Seed a project's BOM from the quote version its contract was struck from.
   *
   * Writes a log row per line as well as the item. That is what makes
   * SUM(bom_changes.cost_impact_paise) equal the BOM's own total on a brand-new
   * project, which is the property Task 19 asserts — and it makes a new project
   * indistinguishable from one Task 8's backfill migrated.
   *
   * Only lines with a resolvable, priced product are seeded. A calculation line
   * with no productId, or a product with no active price, is reported by name
   * and skipped rather than stubbed at zero: under "physical items only" a BOM
   * line must be a real product, and a zero-priced line would corrupt every
   * total that reads it. A missing price must not block project creation, the
   * way copyQuoteBomToProject's try/catch did not — but a genuine failure now
   * throws instead of being swallowed, because a warning in a log is exactly
   * how the empty-BOM regression stayed invisible for a whole task cycle.
   */
  async seedFromQuoteVersion(
    projectId: string,
    quoteVersionId: string,
    userId: string,
  ): Promise<BomEntity> {
    const version = await this.loadVersion(quoteVersionId);
    const incoming = await this.buildIncoming(this.dataSource.manager, version, projectId);

    const bom = await this.bomRepository.createForProject({
      projectId,
      baselineQuoteVersionId: quoteVersionId,
      createdBy: userId,
    });

    await this.dataSource.transaction(async (manager) => {
      const itemRepo = manager.getRepository(BomItemEntity);
      const changes: Array<Partial<BomChangeEntity>> = [];
      let sortOrder = 0;

      for (const line of incoming) {
        if (line.unitPricePaise === null) {
          this.logger.warn(
            `Project ${projectId}: quote line "${line.productName}" has no active price ` +
              `and was NOT seeded. Set one in the product admin, then add it to the BOM.`,
          );
          continue;
        }

        const item = await itemRepo.save(
          itemRepo.create({
            bomId: bom.id,
            productId: line.productId,
            quantity: String(line.quantity),
            // Equal to quantity at seeding, and immutable after it. This is
            // what "originally quoted" means per line; BomReadService reads it
            // rather than re-deriving from the quote, so a later quote revision
            // cannot move a signed project's quoted figure.
            quotedQuantity: String(line.quantity),
            unit: line.unit,
            unitPricePaise: line.unitPricePaise,
            pricingBasis: line.pricingBasis,
            source: 'quote',
            sortOrder: sortOrder++,
            createdBy: userId,
            updatedBy: userId,
          }),
        );

        changes.push({
          bomId: bom.id,
          bomItemId: item.id,
          productId: line.productId,
          changeType: 'add',
          quantityBefore: null,
          quantityAfter: String(line.quantity),
          unitPricePaise: line.unitPricePaise,
          // A line's whole contribution, rounded exactly once — the same
          // ROUND(quantity * unit_price_paise) the reconciliation assertion
          // applies per row.
          costImpactPaise: this.lineTotalPaise(line.quantity, line.unitPricePaise),
          reason: `Seeded from quote version ${version.versionNumber}`,
          source: 'quote',
          createdBy: userId,
        });
      }

      if (changes.length > 0) {
        await this.bomChangeRepository.append(changes, manager);
      }
    });

    const seeded = await this.bomRepository.findById(bom.id);
    if (!seeded) throw new NotFoundException('BOM vanished after seeding');

    this.logger.log(
      `Project ${projectId}: seeded BOM ${seeded.bomNumber} with ${seeded.items?.length ?? 0} ` +
        `line(s) from quote version ${version.versionNumber} (${quoteVersionId}).`,
    );
    return seeded;
  }

  /**
   * What re-baselining onto a quote version WOULD change. Applies nothing.
   *
   * reconcileFromCalculation had no preview and deleted any line absent from
   * the calculation — including every site addition, cancelling its stock
   * allocation on the way out. Lines with source = 'site' are untouchable here
   * and are returned separately so the operator can see what is being kept.
   *
   * Shares buildIncoming and lineTotalPaise with applyRebaseline (which simply
   * runs this and hands each entry to BomEditService), so the preview cannot
   * drift away from what the apply does.
   */
  async previewRebaseline(projectId: string, quoteVersionId: string): Promise<RebaselinePreview> {
    const version = await this.loadVersion(quoteVersionId);

    const bom = await this.bomRepository.findByProject(projectId);
    if (!bom) throw new NotFoundException(`Project ${projectId} has no BOM yet`);

    const incoming = new Map<string, IncomingLine>();
    for (const line of await this.buildIncoming(this.dataSource.manager, version, projectId)) {
      incoming.set(line.productId, line);
    }

    const adds: PreviewLine[] = [];
    const increases: PreviewLine[] = [];
    const decreases: PreviewLine[] = [];
    const removes: PreviewLine[] = [];
    const protectedSiteLines: PreviewLine[] = [];

    const seen = new Set<string>();

    for (const item of bom.items ?? []) {
      // NUMERIC arrives from TypeORM as a string. Convert deliberately.
      const current = Number(item.quantity);
      const name = item.product?.name ?? item.productId;

      // Untouchable. reconcileFromCalculation deleted these; that is the bug
      // this whole method exists to remove.
      if (item.source === 'site') {
        seen.add(item.productId);
        protectedSiteLines.push({
          productId: item.productId,
          productName: name,
          from: current,
          to: current,
          impactPaise: 0,
        });
        continue;
      }

      seen.add(item.productId);
      const target = incoming.get(item.productId);
      const currentTotal = this.lineTotalPaise(current, item.unitPricePaise);

      if (!target) {
        if (current > 0) {
          removes.push({
            productId: item.productId,
            productName: name,
            from: current,
            to: 0,
            impactPaise: -currentTotal,
          });
        }
        continue;
      }

      if (target.quantity === current) continue;

      // The EXISTING line's stamped price, not the incoming one. Re-baselining
      // changes the plan, not the price a line was struck at — and the impact
      // is the difference of two ROUNDED line totals, never
      // ROUND(delta_quantity * price). The two disagree on fractional
      // quantities (this data's per_kw lines are 3-decimal), and bom_changes is
      // append-only, so a paisa of drift could never be taken back.
      const line: PreviewLine = {
        productId: item.productId,
        productName: name,
        from: current,
        to: target.quantity,
        impactPaise: this.lineTotalPaise(target.quantity, item.unitPricePaise) - currentTotal,
      };
      if (target.quantity > current) increases.push(line);
      else decreases.push(line);
    }

    for (const [productId, target] of incoming) {
      if (seen.has(productId)) continue;

      // An add is the only movement that takes a freshly resolved price, and
      // therefore the only one that needs one. Without a price it cannot be
      // proposed, because applyRebaseline could not carry it out.
      if (target.unitPricePaise === null) {
        this.logger.warn(
          `Project ${projectId}: quote line "${target.productName}" is new on this ` +
            `re-baseline but has no active price, so it is not being proposed. ` +
            `Set a price in the product admin, then add it to the BOM.`,
        );
        continue;
      }

      adds.push({
        productId,
        productName: target.productName,
        from: null,
        to: target.quantity,
        impactPaise: this.lineTotalPaise(target.quantity, target.unitPricePaise),
      });
    }

    const netImpactPaise = [...adds, ...increases, ...decreases, ...removes].reduce(
      (sum, l) => sum + l.impactPaise,
      0,
    );

    return {
      quoteVersionId,
      versionNumber: version.versionNumber,
      adds,
      increases,
      decreases,
      removes,
      protectedSiteLines,
      netImpactPaise,
    };
  }

  /**
   * Carry out the preview.
   *
   * Every movement goes through BomEditService with source = 'office', so an
   * office-driven re-baseline is distinguishable from a site edit in the log
   * and nothing bypasses the change log. Each of those calls is its own
   * transaction that writes the item and its log row together.
   *
   * Deliberately does NOT move bom.baseline_quote_version_id or any line's
   * quoted_quantity. Those two record what the contract was struck at, and
   * BomReadService derives every "originally quoted" figure from
   * quoted_quantity — moving the pointer while leaving the quantities would
   * make the BOM claim a provenance its own numbers do not support. Variance
   * against the quote is exactly what a re-baseline is meant to surface.
   */
  async applyRebaseline(
    projectId: string,
    quoteVersionId: string,
    userId: string,
    reason: string,
  ): Promise<{ applied: number }> {
    const trimmed = (reason ?? '').trim();
    if (trimmed.length < 3) {
      throw new BadRequestException('Give a reason of at least 3 characters for re-baselining');
    }

    const preview = await this.previewRebaseline(projectId, quoteVersionId);

    const bom = await this.bomRepository.findByProject(projectId);
    if (!bom) throw new NotFoundException(`Project ${projectId} has no BOM yet`);

    // PreviewLine names a product, not a row; BomEditService's quantity and
    // removal operations address a row.
    const itemIdByProduct = new Map<string, string>();
    for (const item of bom.items ?? []) itemIdByProduct.set(item.productId, item.id);

    const auditReason = `${trimmed} (re-baselined onto quote version ${preview.versionNumber})`;
    let applied = 0;

    for (const line of preview.adds) {
      await this.bomEditService.addItem(
        projectId,
        { productId: line.productId, quantity: line.to ?? 0, reason: auditReason },
        userId,
        'office',
      );
      applied += 1;
    }

    for (const line of [...preview.increases, ...preview.decreases]) {
      const itemId = itemIdByProduct.get(line.productId);
      if (!itemId) {
        this.logger.warn(
          `Project ${projectId}: no BOM row for "${line.productName}" when applying a ` +
            `quantity change; skipping.`,
        );
        continue;
      }
      const to = line.to ?? 0;
      // A target of zero is a REMOVAL, so the log says 'remove' rather than a
      // quantity change to nothing. bomLinesFromCalculation never emits zero
      // today, so this is a guard rather than a live path.
      if (to <= 0) {
        await this.bomEditService.removeItem(
          projectId,
          itemId,
          { reason: auditReason },
          userId,
          'office',
        );
      } else {
        await this.bomEditService.changeQuantity(
          projectId,
          itemId,
          { quantity: to, reason: auditReason },
          userId,
          'office',
        );
      }
      applied += 1;
    }

    for (const line of preview.removes) {
      const itemId = itemIdByProduct.get(line.productId);
      if (!itemId) {
        this.logger.warn(
          `Project ${projectId}: no BOM row for "${line.productName}" when applying a ` +
            `removal; skipping.`,
        );
        continue;
      }
      // Sets quantity to 0 and keeps the row. Nothing is deleted, so a removed
      // quoted line stays visible and stock_allocations.bom_id cannot dangle.
      await this.bomEditService.removeItem(
        projectId,
        itemId,
        { reason: auditReason },
        userId,
        'office',
      );
      applied += 1;
    }

    this.logger.log(
      `Project ${projectId}: re-baselined onto quote version ${preview.versionNumber} — ` +
        `${applied} change(s) applied, ${preview.protectedSiteLines.length} site line(s) kept.`,
    );

    return { applied };
  }

  /**
   * The quote version's own lines, resolved against the catalog, one entry per
   * product. Shared by seeding and by preview/apply so the three can never
   * disagree about what a version says.
   */
  private async buildIncoming(
    manager: EntityManager,
    version: QuoteVersionEntity,
    projectId: string,
  ): Promise<IncomingLine[]> {
    const lines = bomLinesFromCalculation(
      version.quoteSnapshot?.calculation as CalculateQuoteResponseDto,
    );

    const byProduct = new Map<string, IncomingLine>();

    for (const line of lines) {
      if (!line.productId) {
        this.logger.warn(
          `Project ${projectId}: quote line "${line.name}" has no product and was skipped.`,
        );
        continue;
      }

      const priced = await this.resolveSeedPrice(manager, line.productId, projectId);
      if (!priced) {
        this.logger.warn(
          `Project ${projectId}: quote line "${line.name}" names product ${line.productId}, ` +
            `which is missing or deleted; skipped.`,
        );
        continue;
      }

      // A per_kw line's quantity IS its kW, matching the purchase-order form's
      // convention and the price resolved for it (rupees per kW).
      const isPerKw = priced.pricingBasis === 'per_kw' || priced.pricingBasis === 'per_kw_system';
      const quantity = isPerKw ? this.systemSizeKw(version) : line.quantity;

      const existing = byProduct.get(line.productId);
      if (!existing) {
        byProduct.set(line.productId, {
          productId: line.productId,
          productName: priced.productName || line.name,
          quantity,
          unitPricePaise: priced.unitPricePaise,
          pricingBasis: priced.pricingBasis,
          unit: priced.unit,
        });
        continue;
      }

      // bom_items is UNIQUE (bom_id, product_id), so a calculation naming the
      // same product twice has to collapse to one line or the insert fails.
      // Counted quantities add up; a per_kw quantity is the system size and is
      // the same number both times, so it does not.
      if (!isPerKw) existing.quantity += quantity;
    }

    return [...byProduct.values()];
  }

  /**
   * The price to stamp on a seeded line, and the basis that says what its
   * quantity counts. Mirrors BomEditService.resolvePrice, with one difference:
   * a product with no active price returns a null price rather than throwing,
   * so a lapsed catalog price neither blocks project creation nor — because an
   * existing line keeps its own stamped price — turns a quoted line into a
   * removal on a re-baseline.
   *
   * Returns null only when the product itself is gone.
   */
  private async resolveSeedPrice(
    manager: EntityManager,
    productId: string,
    projectId: string,
  ): Promise<{
    unitPricePaise: number | null;
    pricingBasis: string;
    unit: string;
    productName: string;
  } | null> {
    // withDeleted, because ProductEntity.deletedAt is a @DeleteDateColumn:
    // without it a soft-deleted product is filtered out of the query entirely
    // and reports as simply missing.
    const product = await manager.getRepository(ProductEntity).findOne({
      where: { id: productId },
      withDeleted: true,
    });
    if (!product || product.deletedAt) return null;

    const projectType = await this.resolveProjectType(manager, projectId);
    const price = await this.pricingService.getEffectiveUnitPrice(productId, { projectType });

    return {
      // rupeesToPaise, not Math.round(x * 100): the house helper normalises
      // through toFixed(6) first, so 1.005 does not round down to 100 paise.
      unitPricePaise:
        price.unitPricePerPiece === null ? null : rupeesToPaise(price.unitPricePerPiece),
      // Present even when there is no price row — the basis comes from the
      // product type, which is what preview needs to read a quantity.
      pricingBasis: price.basis,
      unit: product.unitOfMeasure,
      productName: product.name,
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

  private async loadVersion(quoteVersionId: string): Promise<QuoteVersionEntity> {
    const version = await this.dataSource
      .getRepository(QuoteVersionEntity)
      .findOne({ where: { id: quoteVersionId } });
    if (!version) throw new NotFoundException(`Quote version ${quoteVersionId} not found`);
    if (!version.quoteSnapshot?.calculation) {
      throw new BadRequestException(
        'That quote version has no calculation snapshot. Re-calculate the quote first.',
      );
    }
    return version;
  }

  /** kW from the version's own wattage — never from today's latest version. */
  private systemSizeKw(version: QuoteVersionEntity): number {
    return Math.max(Number(version.totalWattageWp ?? 0) / 1000, 0.001);
  }

  /**
   * A line's contribution to the BOM total, rounded exactly the way the
   * reconciliation assertion rounds it: per line, before summing. Identical to
   * BomEditService.lineTotalPaise and BomReadService's per-line rounding, which
   * is what makes preview, apply and read agree to the paisa.
   */
  private lineTotalPaise(quantity: number, unitPricePaise: number): number {
    return Math.round(quantity * unitPricePaise);
  }
}
