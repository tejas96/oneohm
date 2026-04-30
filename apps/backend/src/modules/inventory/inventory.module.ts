import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  InventoryExportController,
  InventorySearchController,
  InventoryStockController,
  InventoryTransactionController,
  MaterialDispatchController,
  ProjectVendorController,
  PurchaseOrderController,
  StockAllocationController,
  VendorController,
  WarehouseController,
} from './controllers';
import {
  InventoryStockEntity,
  InventoryTransactionEntity,
  MaterialDispatchEntity,
  MaterialDispatchItemEntity,
  ProjectVendorEntity,
  PurchaseOrderEntity,
  PurchaseOrderItemEntity,
  StockAllocationEntity,
  VendorEntity,
  WarehouseEntity,
} from './entities';
import {
  InventoryStockRepository,
  InventoryStockStatsRepository,
  InventoryTransactionRepository,
  InventoryTransactionStatsRepository,
  MaterialDispatchItemRepository,
  MaterialDispatchRepository,
  MaterialDispatchStatsRepository,
  ProjectVendorRepository,
  PurchaseOrderItemRepository,
  PurchaseOrderRepository,
  PurchaseOrderStatsRepository,
  StockAllocationRepository,
  StockAllocationStatsRepository,
  VendorRepository,
  WarehouseRepository,
} from './repositories';
import {
  InventoryBulkService,
  InventorySearchService,
  InventoryStatsService,
  InventoryStockService,
  InventoryTransactionService,
  LowStockAlertService,
  MaterialDispatchService,
  ProjectVendorService,
  PurchaseOrderService,
  PurchaseOrderStatsService,
  ReservedStockService,
  StockAllocationService,
  StockTransferService,
  VendorService,
  WarehouseService,
} from './services';
import { PermissionGuard } from '../iam/guards/permission.guard';
import { ProductEntity } from '../master-data/entities/product.entity';
import { MasterDataModule } from '../master-data/master-data.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectEntity } from '../projects/entities/project.entity';
import { ProjectRepository } from '../projects/repositories/project.repository';

/**
 * Inventory Module
 * Manages warehouses, stock, vendors, purchase orders, allocations, and material dispatches
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Core entities
      WarehouseEntity,
      InventoryStockEntity,
      VendorEntity,
      ProjectVendorEntity,
      // Purchase order entities
      PurchaseOrderEntity,
      PurchaseOrderItemEntity,
      // Transaction entities
      InventoryTransactionEntity,
      StockAllocationEntity,
      // Dispatch entities
      MaterialDispatchEntity,
      MaterialDispatchItemEntity,
      // External entities needed by cross-module repositories
      ProjectEntity,
      ProductEntity,
    ]),
    OrganizationsModule,
    MasterDataModule,
    NotificationsModule,
  ],
  controllers: [
    WarehouseController,
    VendorController,
    PurchaseOrderController,
    InventoryStockController,
    InventoryTransactionController,
    StockAllocationController,
    MaterialDispatchController,
    ProjectVendorController,
    InventorySearchController,
    InventoryExportController,
  ],
  providers: [
    // Repositories
    WarehouseRepository,
    InventoryStockRepository,
    VendorRepository,
    ProjectVendorRepository,
    PurchaseOrderRepository,
    PurchaseOrderItemRepository,
    InventoryTransactionRepository,
    StockAllocationRepository,
    MaterialDispatchRepository,
    MaterialDispatchItemRepository,
    ProjectRepository,
    // Stats repositories (Part 10)
    PurchaseOrderStatsRepository,
    InventoryTransactionStatsRepository,
    StockAllocationStatsRepository,
    MaterialDispatchStatsRepository,
    InventoryStockStatsRepository,
    // Services
    LowStockAlertService,
    ReservedStockService,
    StockTransferService,
    WarehouseService,
    InventoryStockService,
    InventoryTransactionService,
    VendorService,
    ProjectVendorService,
    PurchaseOrderService,
    StockAllocationService,
    MaterialDispatchService,
    InventoryBulkService,
    InventorySearchService,
    // Stats services (Part 10)
    PurchaseOrderStatsService,
    InventoryStatsService,
    // Guards
    PermissionGuard,
  ],
  exports: [
    // Export repositories for cross-module usage
    WarehouseRepository,
    InventoryStockRepository,
    VendorRepository,
    ProjectVendorRepository,
    PurchaseOrderRepository,
    PurchaseOrderItemRepository,
    InventoryTransactionRepository,
    StockAllocationRepository,
    MaterialDispatchRepository,
    MaterialDispatchItemRepository,
    // Export services for cross-module usage
    WarehouseService,
    InventoryStockService,
    InventoryTransactionService,
    VendorService,
    ProjectVendorService,
    PurchaseOrderService,
    StockAllocationService,
    MaterialDispatchService,
  ],
})
export class InventoryModule {}
