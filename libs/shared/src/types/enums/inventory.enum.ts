/**
 * Inventory Management Enums
 * Module 13: Inventory Management
 */

/**
 * Warehouse Types
 */
export enum WarehouseType {
  OWN = 'own',
  THIRD_PARTY = 'third_party',
}

/**
 * Warehouse Status
 */
export enum WarehouseStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * Vendor Types
 */
export enum VendorType {
  SUPPLIER = 'supplier',
  CONTRACTOR = 'contractor',
  SERVICE_PROVIDER = 'service_provider',
}

/**
 * Vendor Status
 */
export enum VendorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLACKLISTED = 'blacklisted',
}

/**
 * Project Vendor Status
 */
export enum ProjectVendorStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
}

/**
 * Purchase Order Type
 */
export enum PurchaseOrderType {
  STOCK = 'stock',
  PROJECT_SPECIFIC = 'project_specific',
}

/**
 * Purchase Order Status
 */
export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  SENT = 'sent',
  CONFIRMED = 'confirmed',
  PARTIALLY_RECEIVED = 'partially_received',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

/**
 * Payment Status
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
}

/**
 * Inventory Transaction Types
 */
export enum InventoryTransactionType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  ADJUSTMENT = 'adjustment',
  ALLOCATION = 'allocation',
  DISPATCH = 'dispatch',
  RETURN = 'return',
}

/**
 * Stock Allocation Source Type
 */
export enum StockAllocationSourceType {
  OWN = 'own',
  THIRD_PARTY = 'third_party',
}

/**
 * Stock Allocation Status
 */
export enum StockAllocationStatus {
  ALLOCATED = 'allocated',
  PARTIALLY_DISPATCHED = 'partially_dispatched',
  DISPATCHED = 'dispatched',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Material Dispatch Status
 */
export enum MaterialDispatchStatus {
  PREPARED = 'prepared',
  DISPATCHED = 'dispatched',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  PARTIALLY_DELIVERED = 'partially_delivered',
  CANCELLED = 'cancelled',
}

/**
 * BOM Status (TS enum only — DB column stays VARCHAR + CHECK)
 */
export enum BomStatus {
  DRAFT = 'draft',
  FINALIZED = 'finalized',
  ALLOCATED = 'allocated',
  CANCELLED = 'cancelled',
}

/**
 * BOM Allocation Status — tracks per-BOM stock reservation progress.
 *
 * Derived per request by BomReadService from live stock_allocations, never
 * stored. It used to sit in a `bom.allocation_status` column, but every read
 * recomputed it and overwrote the loaded value before returning, so the stored
 * copy disagreed with every answer the API gave. The column is gone.
 *   pending          — no items have been reserved yet
 *   partial          — some items reserved, some still pending stock
 *   fully_allocated  — every product line is 100% reserved
 */
export enum BomAllocationStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  FULLY_ALLOCATED = 'fully_allocated',
}

/**
 * Product type codes whose units carry individual serial numbers.
 *
 * Matched against `product_types.code`. It replaced SERIALIZED_BOM_ITEM_TYPES,
 * which listed legacy `bom_items.item_type` values ('panel') that never
 * matched a real product type code ('solar_panel') — so the old check could
 * not identify a serialized panel at all. Both that constant and the column it
 * described are gone; a BOM line is a product FK, so eligibility is decided on
 * the product type.
 */
export const SERIALIZED_PRODUCT_TYPE_CODES = ['solar_panel', 'inverter', 'battery'] as const;

export type SerializedProductTypeCode = (typeof SERIALIZED_PRODUCT_TYPE_CODES)[number];
