import { Controller, Get, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { OrganizationContext } from '../../../common/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { PermissionGuard } from '../../iam/guards/permission.guard';
import {
  InventoryStockRepository,
  InventoryTransactionRepository,
  MaterialDispatchRepository,
  PurchaseOrderRepository,
  StockAllocationRepository,
  VendorRepository,
  WarehouseRepository,
} from '../repositories';
import {
  ALLOCATION_COLUMNS,
  DISPATCH_COLUMNS,
  PURCHASE_ORDER_COLUMNS,
  STOCK_COLUMNS,
  TRANSACTION_COLUMNS,
  VENDOR_COLUMNS,
  WAREHOUSE_COLUMNS,
} from '../services/helpers/csv-columns';
import { buildCsvStream, CSV_CHUNK_SIZE } from '../services/helpers/csv-stream';

/**
 * Streaming CSV exports for inventory resources.
 *
 * Each route reuses the existing repository.findAll() with the same filter
 * shape as the corresponding list endpoint, so CSV exports never disagree
 * with what's on screen. The shared csv-stream helper enforces:
 *   - 50,000 row hard cap (returns 413 with a hint to narrow filters)
 *   - 500 rows per DB page (memory-bounded)
 *   - RFC 4180 cell escaping
 *
 * Filename includes UTC date so users can re-export and keep both copies.
 */
function csvFilename(resource: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${resource}-${date}.csv`;
}

@ApiTags('Inventory - Export')
@ApiBearerAuth()
@Controller('inventory/export')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class InventoryExportController {
  constructor(
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly materialDispatchRepository: MaterialDispatchRepository,
    private readonly stockAllocationRepository: StockAllocationRepository,
    private readonly inventoryStockRepository: InventoryStockRepository,
    private readonly inventoryTransactionRepository: InventoryTransactionRepository,
    private readonly vendorRepository: VendorRepository,
    private readonly warehouseRepository: WarehouseRepository,
  ) {}

  @RequirePermission('inventory:export')
  @Get('purchase-orders.csv')
  @ApiOperation({ summary: 'Stream CSV export of purchase orders (max 50k rows)' })
  async exportPurchaseOrders(
    @OrganizationContext() organizationId: string,
    @Query() query: Record<string, string>,
  ): Promise<StreamableFile> {
    const filters = this.poFilters(query);
    const { total } = await this.purchaseOrderRepository.findAll(organizationId, 1, 1, filters);
    return buildCsvStream(
      {
        total,
        fetchPage: async (page, limit) => {
          const r = await this.purchaseOrderRepository.findAll(organizationId, page, limit, filters);
          return r.purchaseOrders;
        },
      },
      PURCHASE_ORDER_COLUMNS,
      csvFilename('purchase-orders'),
    );
  }

  @RequirePermission('inventory:export')
  @Get('material-dispatches.csv')
  @ApiOperation({ summary: 'Stream CSV export of material dispatches (max 50k rows)' })
  async exportDispatches(
    @OrganizationContext() organizationId: string,
    @Query() query: Record<string, string>,
  ): Promise<StreamableFile> {
    const filters = this.dispatchFilters(query);
    const { total } = await this.materialDispatchRepository.findAll(organizationId, 1, 1, filters);
    return buildCsvStream(
      {
        total,
        fetchPage: async (page, limit) => {
          const r = await this.materialDispatchRepository.findAll(
            organizationId,
            page,
            limit,
            filters,
          );
          return r.dispatches;
        },
      },
      DISPATCH_COLUMNS,
      csvFilename('material-dispatches'),
    );
  }

  @RequirePermission('inventory:export')
  @Get('stock-allocations.csv')
  @ApiOperation({ summary: 'Stream CSV export of stock allocations (max 50k rows)' })
  async exportAllocations(
    @OrganizationContext() organizationId: string,
    @Query() query: Record<string, string>,
  ): Promise<StreamableFile> {
    const filters = this.allocationFilters(query);
    const { total } = await this.stockAllocationRepository.findAll(organizationId, 1, 1, filters);
    return buildCsvStream(
      {
        total,
        fetchPage: async (page, limit) => {
          const r = await this.stockAllocationRepository.findAll(
            organizationId,
            page,
            limit,
            filters,
          );
          return r.allocations;
        },
      },
      ALLOCATION_COLUMNS,
      csvFilename('stock-allocations'),
    );
  }

  @RequirePermission('inventory:export')
  @Get('inventory-stock.csv')
  @ApiOperation({ summary: 'Stream CSV export of stock levels (max 50k rows)' })
  async exportStock(
    @OrganizationContext() organizationId: string,
    @Query() query: Record<string, string>,
  ): Promise<StreamableFile> {
    const filters = this.stockFilters(query);
    const { total } = await this.inventoryStockRepository.findAll(organizationId, 1, 1, filters);
    return buildCsvStream(
      {
        total,
        fetchPage: async (page, limit) => {
          const r = await this.inventoryStockRepository.findAll(
            organizationId,
            page,
            limit,
            filters,
          );
          return r.stocks;
        },
      },
      STOCK_COLUMNS,
      csvFilename('inventory-stock'),
    );
  }

  @RequirePermission('inventory:export')
  @Get('inventory-transactions.csv')
  @ApiOperation({ summary: 'Stream CSV export of inventory transactions (max 50k rows)' })
  async exportTransactions(
    @OrganizationContext() organizationId: string,
    @Query() query: Record<string, string>,
  ): Promise<StreamableFile> {
    const filters = this.txnFilters(query);
    const { total } = await this.inventoryTransactionRepository.findAll(
      organizationId,
      1,
      1,
      filters,
    );
    return buildCsvStream(
      {
        total,
        fetchPage: async (page, limit) => {
          const r = await this.inventoryTransactionRepository.findAll(
            organizationId,
            page,
            limit,
            filters,
          );
          return r.transactions;
        },
      },
      TRANSACTION_COLUMNS,
      csvFilename('inventory-transactions'),
    );
  }

  @RequirePermission('inventory:export')
  @Get('vendors.csv')
  @ApiOperation({ summary: 'Stream CSV export of vendors (max 50k rows)' })
  async exportVendors(
    @OrganizationContext() organizationId: string,
    @Query() query: Record<string, string>,
  ): Promise<StreamableFile> {
    const filters = this.vendorFilters(query);
    const { total } = await this.vendorRepository.findAll(organizationId, 1, 1, filters);
    return buildCsvStream(
      {
        total,
        fetchPage: async (page, limit) => {
          const r = await this.vendorRepository.findAll(organizationId, page, limit, filters);
          return r.vendors;
        },
      },
      VENDOR_COLUMNS,
      csvFilename('vendors'),
    );
  }

  @RequirePermission('inventory:export')
  @Get('warehouses.csv')
  @ApiOperation({ summary: 'Stream CSV export of warehouses (max 50k rows)' })
  async exportWarehouses(
    @OrganizationContext() organizationId: string,
    @Query() query: Record<string, string>,
  ): Promise<StreamableFile> {
    const filters = this.warehouseFilters(query);
    const { total } = await this.warehouseRepository.findAll(organizationId, 1, 1, filters);
    return buildCsvStream(
      {
        total,
        fetchPage: async (page, limit) => {
          const r = await this.warehouseRepository.findAll(organizationId, page, limit, filters);
          return r.warehouses;
        },
      },
      WAREHOUSE_COLUMNS,
      csvFilename('warehouses'),
    );
  }

  // ---------- Filter parsers (whitelist-only; ignore unknown keys) ----------

  private poFilters(q: Record<string, string>) {
    return {
      status: q.status,
      paymentStatus: q.paymentStatus,
      poType: q.poType,
      vendorId: q.vendorId,
      warehouseId: q.warehouseId,
      projectId: q.projectId,
      fromDate: q.fromDate,
      toDate: q.toDate,
      search: q.search,
    } as Parameters<PurchaseOrderRepository['findAll']>[3];
  }

  private dispatchFilters(q: Record<string, string>) {
    return {
      status: q.status,
      projectId: q.projectId,
      warehouseId: q.warehouseId,
      fromDate: q.fromDate,
      toDate: q.toDate,
      search: q.search,
    } as Parameters<MaterialDispatchRepository['findAll']>[3];
  }

  private allocationFilters(q: Record<string, string>) {
    return {
      status: q.status,
      projectId: q.projectId,
      warehouseId: q.warehouseId,
      productId: q.productId,
    } as Parameters<StockAllocationRepository['findAll']>[3];
  }

  private stockFilters(q: Record<string, string>) {
    return {
      warehouseId: q.warehouseId,
      productId: q.productId,
      lowStock: q.lowStock === 'true',
      search: q.search,
    } as Parameters<InventoryStockRepository['findAll']>[3];
  }

  private txnFilters(q: Record<string, string>) {
    return {
      transactionType: q.transactionType,
      warehouseId: q.warehouseId,
      productId: q.productId,
      fromDate: q.fromDate,
      toDate: q.toDate,
      referenceType: q.referenceType,
      referenceId: q.referenceId,
    } as Parameters<InventoryTransactionRepository['findAll']>[3];
  }

  private vendorFilters(q: Record<string, string>) {
    return {
      status: q.status,
      vendorType: q.vendorType,
      search: q.search,
    } as Parameters<VendorRepository['findAll']>[3];
  }

  private warehouseFilters(q: Record<string, string>) {
    return {
      status: q.status,
      warehouseType: q.warehouseType,
      warehouseManagerId: q.warehouseManagerId,
      search: q.search,
    } as Parameters<WarehouseRepository['findAll']>[3];
  }

  // Re-exported so it appears in coverage / introspection.
  static readonly CHUNK_SIZE = CSV_CHUNK_SIZE;
}
