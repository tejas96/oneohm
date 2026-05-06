/**
 * ============================================
 * FINANCE ENUMS
 * ============================================
 * Shared finance domain enums covering payment terms (planned receivables),
 * receipts (cash inflow), and project expenses (cash outflow).
 */

/**
 * Lifecycle status for a planned payment term (receivable installment).
 * Auto-managed by aggregation of linked receipts; never user-edited directly
 * except via dedicated waive/cancel actions.
 */
export enum PaymentTermStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  WAIVED = 'waived',
  CANCELLED = 'cancelled',
}

/**
 * Source of a payment term row — distinguishes quote-snapshot terms from
 * manually-added ones.
 */
export enum PaymentTermSource {
  QUOTE_SNAPSHOT = 'quote_snapshot',
  MANUAL = 'manual',
}

/**
 * Project expense category. Food/refreshments fall under MISC (per plan §9a).
 */
export enum ExpenseCategory {
  MATERIALS = 'materials',
  LABOR = 'labor',
  TRAVEL = 'travel',
  EQUIPMENT = 'equipment',
  SUBCONTRACTOR = 'subcontractor',
  PERMITS = 'permits',
  MISC = 'misc',
}

/**
 * Who paid for an expense out-of-pocket.
 */
export enum ExpensePaidByType {
  COMPANY = 'company',
  EMPLOYEE = 'employee',
}

/**
 * Reimbursement lifecycle for employee-paid expenses.
 * Auto-set to NOT_APPLICABLE for company-paid expenses.
 */
export enum ReimbursementStatus {
  NOT_APPLICABLE = 'not_applicable',
  PENDING = 'pending',
  REIMBURSED = 'reimbursed',
}

/**
 * Numbering sequence scopes used by the finance subsystem.
 * Encoded into `numbering_sequences.sequence_key` as `{scope}-{FY}` (e.g.
 * `receipt-2026-27`, `expense-2026-27`).
 */
export enum FinanceSequenceScope {
  RECEIPT = 'receipt',
  EXPENSE = 'expense',
}
