import { PaymentStatus } from '@tejas96/shared/types';

/**
 * Derive PO payment status from cumulative paid_amount vs total_amount.
 * Source of truth for paymentStatus going forward; recordPayment uses this
 * after each successful payment to keep the column in sync.
 */
export function derivePaymentStatus(paidAmount: number, totalAmount: number): PaymentStatus {
  if (paidAmount >= totalAmount) return PaymentStatus.PAID;
  if (paidAmount > 0) return PaymentStatus.PARTIAL;
  return PaymentStatus.PENDING;
}
