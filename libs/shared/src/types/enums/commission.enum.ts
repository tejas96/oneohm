/**
 * Commission Status Enum
 * Represents the payment lifecycle of employee/reseller commissions
 */
export enum CommissionStatus {
  PENDING = 'pending', // Commission calculated, awaiting approval
  APPROVED = 'approved', // Approved by admin, pending payment
  PAID = 'paid', // Payment completed
  CANCELLED = 'cancelled', // Commission cancelled (e.g., project cancelled)
}

/**
 * Payment Mode Enum
 * Methods of commission payment
 */
export enum PaymentMode {
  BANK_TRANSFER = 'bank_transfer',
  CHEQUE = 'cheque',
  UPI = 'upi',
  CASH = 'cash',
  OTHER = 'other',
}
