/**
 * Reseller Status Enum
 * Represents the operational status of a reseller partner
 */
export enum ResellerStatus {
  ACTIVE = 'active', // Actively generating leads
  INACTIVE = 'inactive', // Temporarily inactive
  SUSPENDED = 'suspended', // Suspended due to policy violation
  BLOCKED = 'blocked', // Permanently blocked
}

/**
 * Commission Status Enum
 * Represents the payment lifecycle of reseller commissions
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
