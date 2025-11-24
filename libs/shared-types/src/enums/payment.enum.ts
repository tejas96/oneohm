/**
 * Payment Method Enum
 * Defines supported payment methods
 */
export enum PaymentMethod {
  ONLINE = 'online',
  CHEQUE = 'cheque',
  CASH = 'cash',
  NEFT = 'neft',
  RTGS = 'rtgs',
  IMPS = 'imps',
  UPI = 'upi',
  DEMAND_DRAFT = 'demand_draft',
}

/**
 * Payment Transaction Status Enum
 * Tracks payment transaction lifecycle from pending to cleared/refunded
 * Different from PurchaseOrderPaymentStatus which tracks PO payment status
 */
export enum PaymentTransactionStatus {
  PENDING = 'pending',
  RECEIVED = 'received',
  VERIFIED = 'verified',
  CLEARED = 'cleared',
  BOUNCED = 'bounced',
  REFUNDED = 'refunded',
}
