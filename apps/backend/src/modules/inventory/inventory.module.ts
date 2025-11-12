import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  InventoryStockController,
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
  InventoryTransactionRepository,
  MaterialDispatchItemRepository,
  MaterialDispatchRepository,
  ProjectVendorRepository,
  PurchaseOrderItemRepository,
  PurchaseOrderRepository,
  StockAllocationRepository,
  VendorRepository,
  WarehouseRepository,
} from './repositories';
import {
  InventoryStockService,
  MaterialDispatchService,
  ProjectVendorService,
  PurchaseOrderService,
  StockAllocationService,
  VendorService,
  WarehouseService,
} from './services';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProductsModule } from '../products/products.module';
import { ProjectsModule } from '../projects/projects.module';

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
    ]),
    OrganizationsModule,
    ProductsModule,
    ProjectsModule,
  ],
  controllers: [
    WarehouseController,
    VendorController,
    PurchaseOrderController,
    InventoryStockController,
    StockAllocationController,
    MaterialDispatchController,
    ProjectVendorController,
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
    // Services
    WarehouseService,
    InventoryStockService,
    VendorService,
    ProjectVendorService,
    PurchaseOrderService,
    StockAllocationService,
    MaterialDispatchService,
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
    VendorService,
    ProjectVendorService,
    PurchaseOrderService,
    StockAllocationService,
    MaterialDispatchService,
  ],
})
export class InventoryModule {}

