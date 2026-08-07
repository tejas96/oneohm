import { Injectable, NotFoundException } from '@nestjs/common';

import { ProductPriceEntity } from '../entities/product-price.entity';
import { ProductEntity } from '../entities/product.entity';
import { ProductPriceRepository } from '../repositories/product-price.repository';
import { ProductRepository } from '../repositories/product.repository';

export interface EffectiveUnitPriceOptions {
  projectType?: string;
  asOf?: Date;
  systemSizeKw?: number;
}

/**
 * Internal resolver result. Carries both the canonical ₹/piece value used by
 * the PO form, BOM totals, and the public endpoint, AND the basis-native raw
 * unit_price used by the legacy quote calculator validators so refactor stays
 * byte-identical.
 */
export interface EffectiveUnitPrice {
  productId: string;
  unitPricePerPiece: number | null;
  basePrice: number | null;
  costMultiplier: number | null;
  gstRate?: number;
  currency: string;
  basis: string;
  source: 'product_prices' | 'none';
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  wattage?: number | null;
  systemSizeKw?: number | null;
}

const DEFAULT_CURRENCY = 'INR';
const DEFAULT_BASIS = 'per_unit';

/**
 * PricingService -- single source of truth for product pricing across the app.
 *
 * Inputs:
 *   product_types.default_pricing_basis -- one of per_unit, per_watt, per_kw
 *   product_prices.unit_price            -- basis-native value
 *   product_prices.cost_multiplier       -- applied to base
 *   products.specifications.wattage      -- needed for per_watt
 *   caller-provided systemSizeKw         -- needed for per_kw
 *
 * Output: a canonical ₹-per-piece value (`unitPricePerPiece`) plus all raw
 * inputs so downstream consumers can choose either projection. Returns
 * `unitPricePerPiece = null, source = 'none'` instead of throwing when:
 *   - no active price row exists for the product
 *   - per_watt product is missing wattage
 *   - per_kw product is queried without systemSizeKw
 *
 * This lets the PO create form fall back to manual entry without a 4xx
 * surfacing to the user.
 */
@Injectable()
export class PricingService {
  constructor(
    private readonly productPriceRepo: ProductPriceRepository,
    private readonly productRepo: ProductRepository,
  ) {}

  /**
   * Resolve effective per-piece price for a single product. Throws
   * NotFoundException when the product does not exist or belongs to a
   * different org; never throws for missing prices.
   */
  async getEffectiveUnitPrice(
    productId: string,
    opts: EffectiveUnitPriceOptions = {},
  ): Promise<EffectiveUnitPrice> {
    const product = await this.productRepo.findAnyById(productId);
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const price = await this.productPriceRepo.findActiveForProduct(
      productId,
      opts.projectType,
      opts.asOf,
    );

    return this.resolveOne(product, price, opts);
  }

  /**
   * Batch variant used by the quote calculator. One round-trip for product
   * prices (existing repo helper) plus an in-memory join with products that
   * the caller already has loaded for spec/brand metadata. Returns a Map
   * keyed by productId containing every requested id (missing-price entries
   * have `source = 'none'` and `unitPricePerPiece = null`).
   */
  async getEffectiveUnitPrices(
    productIds: string[],
    opts: EffectiveUnitPriceOptions = {},
    productsById?: Map<string, ProductEntity>,
  ): Promise<Map<string, EffectiveUnitPrice>> {
    const result = new Map<string, EffectiveUnitPrice>();
    if (productIds.length === 0) return result;

    const priceMap = await this.productPriceRepo.findActiveForProducts(
      productIds,
      opts.projectType,
      opts.asOf,
    );

    const resolvedProducts =
      productsById ?? (await this.loadProductsById(productIds));

    for (const productId of productIds) {
      const product = resolvedProducts.get(productId);
      const price = priceMap.get(productId);
      if (!product) {
        result.set(productId, this.nonePrice(productId, DEFAULT_BASIS));
        continue;
      }
      result.set(productId, this.resolveOne(product, price ?? null, opts));
    }

    return result;
  }

  private async loadProductsById(
    productIds: string[],
  ): Promise<Map<string, ProductEntity>> {
    // Single SELECT … WHERE id IN (…) plus its productType/brand joins.
    // Prevents the N+1 we'd get from per-id findAnyById calls in the
    // quote calculator's batch validation paths.
    return this.productRepo.findManyByIds(productIds);
  }

  private resolveOne(
    product: ProductEntity,
    price: ProductPriceEntity | null | undefined,
    opts: EffectiveUnitPriceOptions,
  ): EffectiveUnitPrice {
    const basis = (product.productType?.defaultPricingBasis ?? DEFAULT_BASIS).toLowerCase();
    const wattage = this.extractWattage(product);
    const systemSizeKw = opts.systemSizeKw ?? null;

    if (!price) {
      return {
        productId: product.id,
        unitPricePerPiece: null,
        basePrice: null,
        costMultiplier: null,
        currency: DEFAULT_CURRENCY,
        basis,
        source: 'none',
        wattage,
        systemSizeKw,
      };
    }

    const basePrice = Number(price.unitPrice);
    const multiplier = Number(price.costMultiplier ?? 1);
    const unitPricePerPiece = this.toPerPiece(basis, basePrice, multiplier, wattage, systemSizeKw);

    return {
      productId: product.id,
      unitPricePerPiece,
      basePrice,
      costMultiplier: multiplier,
      gstRate: price.gstRate != null ? Number(price.gstRate) : undefined,
      currency: price.currency || DEFAULT_CURRENCY,
      basis,
      source: 'product_prices',
      effectiveFrom: price.effectiveFrom ?? null,
      effectiveTo: price.effectiveTo ?? null,
      wattage,
      systemSizeKw,
    };
  }

  /**
   * Convert a basis-native raw price to a canonical ₹/piece value.
   *
   * per_unit   → base × multiplier              (₹/piece)
   * per_watt   → base × multiplier × wattage    (₹/piece; null if wattage missing)
   * per_kw     → When systemSizeKw is provided: base × multiplier × systemSizeKw  (₹ total for that system)
   *              When systemSizeKw is NOT provided: base × multiplier              (₹/kW rate)
   *
   * The per_kw fallback to ₹/kW rate is intentional for the PO create form:
   * structures are procured at a per-kW rate, so the buyer enters
   * quantity = number of kW and unit price = ₹/kW. The endpoint returns
   * basePrice × multiplier so they have a meaningful prefill even without
   * knowing the system size ahead of time.
   *
   * The quote calculator always passes systemSizeKw explicitly, so its
   * behaviour is unchanged.
   */
  private toPerPiece(
    basis: string,
    basePrice: number,
    multiplier: number,
    wattage: number | null,
    systemSizeKw: number | null,
  ): number | null {
    if (!Number.isFinite(basePrice)) return null;
    const mult = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;

    switch (basis) {
      case 'per_unit':
        return basePrice * mult;
      case 'per_watt':
        if (!wattage || wattage <= 0) return null;
        return basePrice * mult * wattage;
      case 'per_kw':
      case 'per_kw_system':
        if (systemSizeKw && systemSizeKw > 0) {
          return basePrice * mult * systemSizeKw;
        }
        // No system size → return the per-kW rate so PO form can prefill.
        // Buyer enters qty = kW and this as unit price.
        return basePrice * mult;
      default:
        return basePrice * mult;
    }
  }

  private extractWattage(product: ProductEntity): number | null {
    const specs = product.specifications ?? {};
    const direct = Number(specs.wattage ?? 0);
    if (direct > 0) return direct;
    const min = Number(specs.min_wattage ?? 0);
    const max = Number(specs.max_wattage ?? 0);
    if (min > 0 && max > 0) return (min + max) / 2;
    if (min > 0) return min;
    if (max > 0) return max;
    return null;
  }

  private nonePrice(productId: string, basis: string): EffectiveUnitPrice {
    return {
      productId,
      unitPricePerPiece: null,
      basePrice: null,
      costMultiplier: null,
      currency: DEFAULT_CURRENCY,
      basis,
      source: 'none',
      wattage: null,
      systemSizeKw: null,
    };
  }
}
