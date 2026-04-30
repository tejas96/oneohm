import type { CsvColumn } from './csv-stream';
import type { InventoryStockEntity } from '../../entities/inventory-stock.entity';
import type { InventoryTransactionEntity } from '../../entities/inventory-transaction.entity';
import type { MaterialDispatchEntity } from '../../entities/material-dispatch.entity';
import type { PurchaseOrderEntity } from '../../entities/purchase-order.entity';
import type { StockAllocationEntity } from '../../entities/stock-allocation.entity';
import type { VendorEntity } from '../../entities/vendor.entity';
import type { WarehouseEntity } from '../../entities/warehouse.entity';

/**
 * Per-resource CSV column whitelists.
 *
 * Rules:
 *   - No internal audit fields (created_by/updated_by user UUIDs, deletedAt).
 *   - Foreign key UUIDs only when the joined display name is unavailable in
 *     the loaded entity (e.g. createdBy is just a uuid, so we omit it).
 *   - Joined display names (vendor.name, warehouse.name, project.name) when
 *     the repository's findAll already left-joins them.
 *   - Computed/derived columns are added explicitly (outstandingAmount).
 *   - Order is the order users will read it in: identifiers, then status,
 *     then dates, then quantities/amounts, then notes.
 */

export const PURCHASE_ORDER_COLUMNS: CsvColumn<PurchaseOrderEntity>[] = [
  { header: 'PO Number', pick: (r) => r.poNumber },
  { header: 'Status', pick: (r) => r.status },
  { header: 'Payment Status', pick: (r) => r.paymentStatus },
  { header: 'PO Type', pick: (r) => r.poType },
  { header: 'PO Date', pick: (r) => r.poDate },
  { header: 'Expected Delivery', pick: (r) => r.expectedDeliveryDate },
  { header: 'Actual Delivery', pick: (r) => r.actualDeliveryDate },
  { header: 'Vendor', pick: (r) => r.vendor?.name },
  { header: 'Warehouse', pick: (r) => r.warehouse?.name },
  { header: 'Project', pick: (r) => r.project?.name },
  { header: 'Subtotal', pick: (r) => r.subtotal },
  { header: 'Tax Amount', pick: (r) => r.taxAmount },
  { header: 'Total Amount', pick: (r) => r.totalAmount },
  { header: 'Paid Amount', pick: (r) => r.paidAmount },
  {
    header: 'Outstanding Amount',
    pick: (r) => Math.max(0, Number(r.totalAmount) - Number(r.paidAmount ?? 0)),
  },
  { header: 'Payment Terms', pick: (r) => r.paymentTerms },
  { header: 'Notes', pick: (r) => r.notes },
  { header: 'Created At', pick: (r) => r.createdAt },
];

export const DISPATCH_COLUMNS: CsvColumn<MaterialDispatchEntity>[] = [
  { header: 'Dispatch Number', pick: (r) => r.dispatchNumber },
  { header: 'Status', pick: (r) => r.status },
  { header: 'Dispatch Date', pick: (r) => r.dispatchDate },
  { header: 'Expected Delivery', pick: (r) => r.expectedDeliveryDate },
  { header: 'Actual Delivery', pick: (r) => r.actualDeliveryDate },
  { header: 'Warehouse', pick: (r) => r.warehouse?.name },
  { header: 'Project', pick: (r) => r.project?.name },
  { header: 'Vehicle Number', pick: (r) => r.vehicleNumber },
  { header: 'Driver Name', pick: (r) => r.driverName },
  { header: 'Driver Phone', pick: (r) => r.driverPhone },
  { header: 'Transport Company', pick: (r) => r.transportCompany },
  { header: 'Delivered By', pick: (r) => r.deliveredBy },
  { header: 'Received By', pick: (r) => r.receivedBy },
  { header: 'Notes', pick: (r) => r.notes },
];

export const ALLOCATION_COLUMNS: CsvColumn<StockAllocationEntity>[] = [
  { header: 'Allocation ID', pick: (r) => r.id },
  { header: 'Status', pick: (r) => r.status },
  { header: 'Source Type', pick: (r) => r.sourceType },
  { header: 'Project', pick: (r) => r.project?.name },
  { header: 'Warehouse', pick: (r) => r.warehouse?.name },
  { header: 'Product', pick: (r) => r.product?.name },
  { header: 'Product Code', pick: (r) => r.product?.code },
  { header: 'Allocated Qty', pick: (r) => r.allocatedQuantity },
  { header: 'Dispatched Qty', pick: (r) => r.dispatchedQuantity },
  { header: 'Returned Qty', pick: (r) => r.returnedQuantity },
  { header: 'Allocated At', pick: (r) => r.allocatedAt },
  { header: 'Dispatched At', pick: (r) => r.dispatchedAt },
  { header: 'Returned At', pick: (r) => r.returnedAt },
  { header: 'Notes', pick: (r) => r.notes },
];

export const STOCK_COLUMNS: CsvColumn<InventoryStockEntity>[] = [
  { header: 'Warehouse', pick: (r) => r.warehouse?.name },
  { header: 'Warehouse Code', pick: (r) => r.warehouse?.code },
  { header: 'Product', pick: (r) => r.product?.name },
  { header: 'Product Code', pick: (r) => r.product?.code },
  { header: 'Available Qty', pick: (r) => r.availableQuantity },
  { header: 'Reserved Qty', pick: (r) => r.reservedQuantity },
  { header: 'In-Transit Qty', pick: (r) => r.inTransitQuantity },
  { header: 'Min Stock Level', pick: (r) => r.minimumStockLevel },
  { header: 'Reorder Qty', pick: (r) => r.reorderQuantity },
  { header: 'Max Stock Level', pick: (r) => r.maximumStockLevel },
  { header: 'Last Stock In', pick: (r) => r.lastStockInDate },
  { header: 'Last Stock Out', pick: (r) => r.lastStockOutDate },
  { header: 'Updated At', pick: (r) => r.updatedAt },
];

export const TRANSACTION_COLUMNS: CsvColumn<InventoryTransactionEntity>[] = [
  { header: 'Transaction Date', pick: (r) => r.transactionDate },
  { header: 'Type', pick: (r) => r.transactionType },
  { header: 'Warehouse', pick: (r) => r.warehouse?.name },
  { header: 'Product', pick: (r) => r.product?.name },
  { header: 'Product Code', pick: (r) => r.product?.code },
  { header: 'Quantity', pick: (r) => r.quantity },
  { header: 'From Warehouse', pick: (r) => r.fromWarehouse?.name },
  { header: 'To Warehouse', pick: (r) => r.toWarehouse?.name },
  { header: 'Reference Type', pick: (r) => r.referenceType },
  { header: 'Reference ID', pick: (r) => r.referenceId },
  { header: 'Batch Number', pick: (r) => r.batchNumber },
  { header: 'Serial Number', pick: (r) => r.serialNumber },
  { header: 'Notes', pick: (r) => r.notes },
];

export const VENDOR_COLUMNS: CsvColumn<VendorEntity>[] = [
  { header: 'Code', pick: (r) => r.code },
  { header: 'Name', pick: (r) => r.name },
  { header: 'Vendor Type', pick: (r) => r.vendorType },
  { header: 'Status', pick: (r) => r.status },
  { header: 'Contact Person', pick: (r) => r.contactPerson },
  { header: 'Email', pick: (r) => r.email },
  { header: 'Phone', pick: (r) => r.phone },
  { header: 'Alternate Phone', pick: (r) => r.alternatePhone },
  { header: 'Address', pick: (r) => r.address },
  { header: 'City', pick: (r) => r.city },
  { header: 'State', pick: (r) => r.state },
  { header: 'Country', pick: (r) => r.country },
  { header: 'Pincode', pick: (r) => r.pincode },
  { header: 'GSTIN', pick: (r) => r.gstin },
  { header: 'PAN', pick: (r) => r.pan },
];

export const WAREHOUSE_COLUMNS: CsvColumn<WarehouseEntity>[] = [
  { header: 'Code', pick: (r) => r.code },
  { header: 'Name', pick: (r) => r.name },
  { header: 'Warehouse Type', pick: (r) => r.warehouseType },
  { header: 'Status', pick: (r) => r.status },
  { header: 'Contact Person', pick: (r) => r.contactPerson },
  { header: 'Phone', pick: (r) => r.phone },
  { header: 'Address', pick: (r) => r.address },
  { header: 'City', pick: (r) => r.city },
  { header: 'State', pick: (r) => r.state },
  { header: 'Country', pick: (r) => r.country },
  { header: 'Pincode', pick: (r) => r.pincode },
];
