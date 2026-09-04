/**
 * Inventory Management Interfaces
 * Module 13: Inventory Management
 *
 * Complex types and interfaces for inventory-related entities
 */

import type { BomAllocationStatus } from '../enums/inventory.enum';

/**
 * GPS Coordinates for warehouse location
 */
export interface WarehouseCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Bank details for vendor payments
 */
export interface VendorBankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
}

/**
 * Transport details for material dispatch
 */
export interface TransportDetails {
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  transportCompany?: string;
}

/**
 * Delivery confirmation details
 */
export interface DeliveryConfirmation {
  deliveredBy?: string;
  receivedBy?: string;
  receiverSignature?: string;
}

/**
 * Stock level summary for warehouse
 */
export interface StockLevelSummary {
  productId: string;
  productName: string;
  availableQuantity: number;
  reservedQuantity: number;
  inTransitQuantity: number;
  minimumStockLevel?: number;
  isLowStock: boolean;
}

/**
 * Purchase order financial summary
 */
export interface POFinancialSummary {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount?: number;
  pendingAmount?: number;
}

/**
 * Inventory transaction reference
 */
export interface TransactionReference {
  referenceType?: string;
  referenceId?: string;
}

/**
 * Batch and serial number tracking
 */
export interface BatchSerialInfo {
  batchNumber?: string;
  serialNumber?: string;
  serialNumbers?: string[];
}

/**
 * Stock reorder settings
 */
export interface ReorderSettings {
  minimumStockLevel?: number;
  reorderQuantity?: number;
  maximumStockLevel?: number;
}

/**
 * Vendor contract details for project
 */
export interface VendorContractDetails {
  contractValue?: number;
  contractStartDate?: Date | string;
  contractEndDate?: Date | string;
  vendorRole?: string;
}

/**
 * Inventory status for a product at a warehouse — used in QuoteCalculator output.
 */
export interface InventoryStatus {
  productId: string;
  warehouseId: string;
  availableQuantity: number;
  reservedQuantity: number;
  minimumStockLevel: number;
  isLowStock: boolean;
}

/**
 * Low stock alert — returned by /inventory-stock?filter=low-stock
 */
export interface LowStockAlert {
  stockId: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  availableQuantity: number;
  minimumStockLevel: number;
}

/**
 * Inventory dashboard stats
 */
export interface InventoryDashboardStats {
  totalStockValue: number;
  warehouseCount: number;
  lowStockItemCount: number;
  pendingPoCount: number;
  inTransitDispatchCount: number;
}

/**
 * Stock movement summary for dashboard
 */
export interface StockMovementSummary {
  transactionType: string;
  count: number;
  totalQuantity: number;
}

/**
 * How a BOM line got here.
 *
 * Enforced in the database by `chk_bom_items_source`.
 */
export type BomItemSource = 'quote' | 'site' | 'office';

/**
 * What `quantity` counts, snapshotted from the product type when the line was
 * added so a later edit to the type cannot reinterpret an existing line.
 *
 * Enforced in the database by `chk_bom_items_pricing_basis`.
 */
export type BomPricingBasis = 'per_unit' | 'per_watt' | 'per_kw';

/**
 * A line's movement against the baseline quote. Derived per request from
 * `quotedQuantity` vs `quantity`; nothing stores it.
 */
export type BomLineChangeState = 'unchanged' | 'added' | 'increased' | 'decreased' | 'removed';

/** Per-product stock reservation status for one line. */
export type BomItemAllocationStatus = 'allocated' | 'partial' | 'pending';

/** One physical unit's serial number. Lives in `bom_item_serials`, one row per unit. */
export interface BomItemSerial {
  id: string;
  serialNumber: string;
}

/**
 * A BOM line, as `GET /projects/:projectId/bom` returns it.
 *
 * Every catalog attribute is resolved through the `product_id` foreign key
 * rather than snapshotted onto the row — `productName`, `brandName` and
 * `productTypeCode` are joined, not stored. The copies that used to sit here
 * (`name`, `brand`, `specifications`, `warrantyYears`) drifted from the
 * catalog silently, and `itemType` carried values ('panel') that never matched
 * a `product_types.code` ('solar_panel').
 *
 * Money is paise, integer. Rupee floats are never used for a stored amount.
 */
export interface BomItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string | null;
  brandName: string | null;
  productTypeCode: string | null;
  unit: string;
  pricingBasis: BomPricingBasis;
  /** What the baseline quote said. Null means this line was never quoted — added after conversion. */
  quotedQuantity: number | null;
  /** What the project needs now. */
  quantity: number;
  /** Resolved once when the line was added, then never re-read from the catalog. */
  unitPricePaise: number;
  quotedTotalPaise: number;
  currentTotalPaise: number;
  variancePaise: number;
  source: BomItemSource;
  changeState: BomLineChangeState;
  /**
   * 'pending' also covers lines the allocation map has no entry for at all — a
   * per_kw/per_watt line (not a reservable unit) or a removed line (quantity 0).
   */
  allocationStatus: BomItemAllocationStatus;
  serials: BomItemSerial[];
  sortOrder: number;
}

/** Quoted vs current for the whole BOM, plus the change log's own claim about it. */
export interface BomTotals {
  quotedPaise: number;
  currentPaise: number;
  variancePaise: number;
  /** The change log's claim about variance from quote: SUM(cost_impact_paise) minus quotedPaise. */
  varianceFromLogPaise: number;
  /**
   * True when the items' current total and the change log's running total
   * agree — two independent computations of the same number. False means the
   * log and the items have drifted and nothing here can be trusted.
   */
  reconciles: boolean;
  lineCount: number;
  addedLineCount: number;
  removedLineCount: number;
  changedLineCount: number;
}

/**
 * A project's bill of materials, as `GET /projects/:projectId/bom` returns it.
 *
 * One BOM per project, addressed by `projectId`. The old polymorphic
 * (`entityType`, `entityId`) pair is gone: it only ever held 'project' and
 * 'quote_version', carried no foreign key in either direction, and quotations
 * no longer persist a BOM at all — a quotation's equipment comes from its own
 * calculation snapshot.
 *
 * The cached `status`, `totalItems` and `totalCost` columns are gone too;
 * `totals` is computed per request from the lines.
 */
export interface Bom {
  id: string;
  bomNumber: string;
  projectId: string;
  /** The quote version this BOM was seeded from — what "originally quoted" means here. */
  baselineQuoteVersionId: string | null;
  notes: string | null;
  /**
   * Aggregate stock-reservation status, derived per request from live
   * allocations. Never stored — the column that used to hold it was
   * recomputed and overwritten on every read.
   */
  allocationStatus: BomAllocationStatus;
  items: BomItem[];
  totals: BomTotals;
  /** ISO-8601. The API serialises these as strings over JSON. */
  createdAt: string;
  updatedAt: string;
}
