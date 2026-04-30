import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProductEntity } from '../../master-data/entities/product.entity';
import { MaterialDispatchEntity } from '../entities/material-dispatch.entity';
import { PurchaseOrderEntity } from '../entities/purchase-order.entity';
import { VendorEntity } from '../entities/vendor.entity';
import { WarehouseEntity } from '../entities/warehouse.entity';

export type InventorySearchType =
  | 'product'
  | 'vendor'
  | 'warehouse'
  | 'purchase-order'
  | 'dispatch';

export const INVENTORY_SEARCH_TYPES: readonly InventorySearchType[] = [
  'product',
  'vendor',
  'warehouse',
  'purchase-order',
  'dispatch',
] as const;

export interface InventorySearchHit {
  type: InventorySearchType;
  id: string;
  label: string;
  sublabel?: string;
  status?: string;
  href: string;
}

export interface InventorySearchResponse {
  q: string;
  types: InventorySearchType[];
  results: Record<InventorySearchType, InventorySearchHit[]>;
  /** Buckets that timed out or errored — clients render a small "partial results" hint. */
  degraded: InventorySearchType[];
  totalHits: number;
  durationMs: number;
}

const PER_BUCKET_LIMIT = 8;
const PER_BUCKET_TIMEOUT_MS = 2000;

/**
 * Federated search across products, vendors, warehouses, purchase orders, and
 * material dispatches.
 *
 * Design:
 *   - Each bucket is a parallel query against its trigram-indexed column
 *     (see migration 1824000000000-AddInventorySearchTrigramIndexes). The
 *     predicate uses lower(col) LIKE lower('%q%') to hit the GIN index.
 *   - Per-bucket limit 8 keeps the response tiny; the Cmd+K palette only
 *     shows the top few per group anyway.
 *   - Per-bucket timeout 2s via Promise.race: a slow bucket NEVER blocks the
 *     others. Timed-out buckets land in `degraded` so the UI can hint
 *     "Some results may be missing".
 *   - Soft-delete is enforced where applicable (products, vendors,
 *     warehouses, POs); allocations and dispatches have no deletedAt
 *     column. Org isolation is mandatory on every query.
 *   - Caller is gated by inventory:search permission at the controller.
 */
@Injectable()
export class InventorySearchService {
  private readonly logger = new Logger(InventorySearchService.name);

  constructor(
    @InjectRepository(ProductEntity) private readonly products: Repository<ProductEntity>,
    @InjectRepository(VendorEntity) private readonly vendors: Repository<VendorEntity>,
    @InjectRepository(WarehouseEntity) private readonly warehouses: Repository<WarehouseEntity>,
    @InjectRepository(PurchaseOrderEntity)
    private readonly purchaseOrders: Repository<PurchaseOrderEntity>,
    @InjectRepository(MaterialDispatchEntity)
    private readonly dispatches: Repository<MaterialDispatchEntity>,
  ) {}

  async search(
    organizationId: string,
    q: string,
    types: InventorySearchType[],
  ): Promise<InventorySearchResponse> {
    const start = Date.now();
    const requested = types.length > 0 ? types : [...INVENTORY_SEARCH_TYPES];
    const results: Record<InventorySearchType, InventorySearchHit[]> = {
      product: [],
      vendor: [],
      warehouse: [],
      'purchase-order': [],
      dispatch: [],
    };
    const degraded: InventorySearchType[] = [];

    const runners: Record<InventorySearchType, () => Promise<InventorySearchHit[]>> = {
      product: () => this.searchProducts(organizationId, q),
      vendor: () => this.searchVendors(organizationId, q),
      warehouse: () => this.searchWarehouses(organizationId, q),
      'purchase-order': () => this.searchPurchaseOrders(organizationId, q),
      dispatch: () => this.searchDispatches(organizationId, q),
    };

    await Promise.all(
      requested.map(async (type) => {
        try {
          results[type] = await this.withTimeout(runners[type](), type);
        } catch (err) {
          const reason = err instanceof Error ? err.message : 'unknown';
          this.logger.warn(`bucket=${type} q="${q}" failed/timed-out: ${reason}`);
          degraded.push(type);
        }
      }),
    );

    const totalHits = Object.values(results).reduce((s, arr) => s + arr.length, 0);
    return {
      q,
      types: requested,
      results,
      degraded,
      totalHits,
      durationMs: Date.now() - start,
    };
  }

  private withTimeout<T>(p: Promise<T>, type: InventorySearchType): Promise<T> {
    return Promise.race<T>([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`bucket ${type} timed out`)), PER_BUCKET_TIMEOUT_MS),
      ),
    ]);
  }

  private async searchProducts(orgId: string, q: string): Promise<InventorySearchHit[]> {
    const rows = await this.products
      .createQueryBuilder('p')
      .where('p.organizationId = :orgId', { orgId })
      .andWhere('p.deletedAt IS NULL')
      .andWhere('lower(p.name) LIKE lower(:q)', { q: `%${q}%` })
      .orderBy('p.name', 'ASC')
      .limit(PER_BUCKET_LIMIT)
      .getMany();
    return rows.map((r) => ({
      type: 'product',
      id: r.id,
      label: r.name,
      sublabel: r.code,
      status: r.status,
      href: `/inventory/products/${r.id}`,
    }));
  }

  private async searchVendors(orgId: string, q: string): Promise<InventorySearchHit[]> {
    const rows = await this.vendors
      .createQueryBuilder('v')
      .where('v.organizationId = :orgId', { orgId })
      .andWhere('v.deletedAt IS NULL')
      .andWhere('lower(v.name) LIKE lower(:q)', { q: `%${q}%` })
      .orderBy('v.name', 'ASC')
      .limit(PER_BUCKET_LIMIT)
      .getMany();
    return rows.map((r) => ({
      type: 'vendor',
      id: r.id,
      label: r.name,
      sublabel: r.code,
      href: `/inventory/vendors/${r.id}`,
    }));
  }

  private async searchWarehouses(orgId: string, q: string): Promise<InventorySearchHit[]> {
    const rows = await this.warehouses
      .createQueryBuilder('w')
      .where('w.organizationId = :orgId', { orgId })
      .andWhere('w.deletedAt IS NULL')
      .andWhere('lower(w.name) LIKE lower(:q)', { q: `%${q}%` })
      .orderBy('w.name', 'ASC')
      .limit(PER_BUCKET_LIMIT)
      .getMany();
    return rows.map((r) => ({
      type: 'warehouse',
      id: r.id,
      label: r.name,
      sublabel: r.code,
      href: `/inventory/warehouses/${r.id}`,
    }));
  }

  private async searchPurchaseOrders(orgId: string, q: string): Promise<InventorySearchHit[]> {
    const rows = await this.purchaseOrders
      .createQueryBuilder('po')
      .where('po.organizationId = :orgId', { orgId })
      .andWhere('po.deletedAt IS NULL')
      .andWhere('lower(po.poNumber) LIKE lower(:q)', { q: `%${q}%` })
      .orderBy('po.poDate', 'DESC')
      .limit(PER_BUCKET_LIMIT)
      .getMany();
    return rows.map((r) => ({
      type: 'purchase-order',
      id: r.id,
      label: r.poNumber,
      status: r.status,
      href: `/inventory/purchase-orders/${r.id}`,
    }));
  }

  private async searchDispatches(orgId: string, q: string): Promise<InventorySearchHit[]> {
    const rows = await this.dispatches
      .createQueryBuilder('d')
      .where('d.organizationId = :orgId', { orgId })
      .andWhere('lower(d.dispatchNumber) LIKE lower(:q)', { q: `%${q}%` })
      .orderBy('d.dispatchDate', 'DESC')
      .limit(PER_BUCKET_LIMIT)
      .getMany();
    return rows.map((r) => ({
      type: 'dispatch',
      id: r.id,
      label: r.dispatchNumber,
      status: r.status,
      href: `/inventory/dispatches/${r.id}`,
    }));
  }
}
