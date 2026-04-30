/**
 * Inventory Management Interfaces
 * Module 13: Inventory Management
 *
 * Complex types and interfaces for inventory-related entities
 */

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
